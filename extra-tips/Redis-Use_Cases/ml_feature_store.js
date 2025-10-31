import { createClient } from 'redis';

const client = createClient({
    username: 'default',
    password: 'gX94CVL0mRXXi7hligXMmMavy4lr55PV',
    socket: {
        host: 'redis-12372.c54.ap-northeast-1-2.ec2.redns.redis-cloud.com',
        port: 12372
    }
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();

// ML Feature Store example - storing and retrieving machine learning model features
class MLFeatureStore {
    constructor(redisClient) {
        this.client = redisClient;
        this.featuresKey = 'ml:features';
        this.modelsKey = 'ml:models';
        this.datasetsKey = 'ml:datasets';
    }

    // Store feature vector for an entity
    async storeFeatureVector(entityId, featureName, featureVector, metadata = {}) {
        const key = `${this.featuresKey}:${featureName}:${entityId}`;

        // Store feature vector as hash
        const featureData = {
            entityId,
            featureName,
            vector: JSON.stringify(featureVector),
            dimensions: featureVector.length,
            createdAt: new Date().toISOString(),
            version: '1.0',
            ...metadata
        };

        await this.client.hSet(key, featureData);

        // Add to feature index
        await this.client.sAdd(`${this.featuresKey}:index:${featureName}`, entityId);

        // Add to global feature index
        await this.client.sAdd(`${this.featuresKey}:all`, `${featureName}:${entityId}`);

        console.log(`Stored feature vector: ${featureName} for ${entityId} (${featureVector.length} dimensions)`);
    }

    // Retrieve feature vector
    async getFeatureVector(entityId, featureName) {
        const key = `${this.featuresKey}:${featureName}:${entityId}`;
        const data = await this.client.hGetAll(key);

        if (!data.vector) {
            return null;
        }

        return {
            entityId: data.entityId,
            featureName: data.featureName,
            vector: JSON.parse(data.vector),
            dimensions: parseInt(data.dimensions),
            createdAt: data.createdAt,
            metadata: { ...data }
        };
    }

    // Store multiple feature vectors in batch
    async storeBatchFeatures(featureName, featureBatch, metadata = {}) {
        const pipeline = this.client.multi();

        for (const item of featureBatch) {
            const { entityId, vector, ...itemMetadata } = item;
            const key = `${this.featuresKey}:${featureName}:${entityId}`;

            const featureData = {
                entityId,
                featureName,
                vector: JSON.stringify(vector),
                dimensions: vector.length,
                createdAt: new Date().toISOString(),
                version: '1.0',
                ...metadata,
                ...itemMetadata
            };

            pipeline.hSet(key, featureData);
            pipeline.sAdd(`${this.featuresKey}:index:${featureName}`, entityId);
            pipeline.sAdd(`${this.featuresKey}:all`, `${featureName}:${entityId}`);
        }

        const results = await pipeline.exec();
        console.log(`Stored ${featureBatch.length} feature vectors for ${featureName}`);
        return results.length;
    }

    // Get feature vectors for multiple entities
    async getBatchFeatureVectors(entityIds, featureName) {
        const pipeline = this.client.multi();

        for (const entityId of entityIds) {
            const key = `${this.featuresKey}:${featureName}:${entityId}`;
            pipeline.hGetAll(key);
        }

        const results = await pipeline.exec();

        return results.map((result, index) => {
            const data = result[1]; // Pipeline returns [error, result]
            if (!data.vector) {
                return null;
            }

            return {
                entityId: entityIds[index],
                featureName,
                vector: JSON.parse(data.vector),
                dimensions: parseInt(data.dimensions),
                createdAt: data.createdAt,
                metadata: { ...data }
            };
        }).filter(item => item !== null);
    }

    // Store model metadata and weights
    async storeModel(modelId, modelData) {
        const key = `${this.modelsKey}:${modelId}`;

        const modelInfo = {
            id: modelId,
            name: modelData.name,
            type: modelData.type,
            framework: modelData.framework || 'custom',
            version: modelData.version || '1.0',
            createdAt: new Date().toISOString(),
            inputFeatures: JSON.stringify(modelData.inputFeatures || []),
            outputShape: JSON.stringify(modelData.outputShape || []),
            accuracy: modelData.accuracy || 0,
            status: 'active',
            ...modelData.metadata
        };

        await this.client.hSet(key, modelInfo);

        // Store model weights if provided (as compressed/serialized data)
        if (modelData.weights) {
            await this.client.set(`${key}:weights`, JSON.stringify(modelData.weights));
        }

        // Add to models index
        await this.client.sAdd(`${this.modelsKey}:index`, modelId);

        console.log(`Stored model: ${modelId} (${modelData.name})`);
    }

    // Get model information
    async getModel(modelId) {
        const key = `${this.modelsKey}:${modelId}`;
        const modelInfo = await this.client.hGetAll(key);

        if (!modelInfo.id) {
            return null;
        }

        // Get weights if they exist
        const weights = await this.client.get(`${key}:weights`);

        return {
            ...modelInfo,
            inputFeatures: JSON.parse(modelInfo.inputFeatures || '[]'),
            outputShape: JSON.parse(modelInfo.outputShape || '[]'),
            weights: weights ? JSON.parse(weights) : null
        };
    }

    // Store dataset metadata
    async storeDataset(datasetId, datasetData) {
        const key = `${this.datasetsKey}:${datasetId}`;

        const datasetInfo = {
            id: datasetId,
            name: datasetData.name,
            description: datasetData.description,
            size: datasetData.size || 0,
            features: JSON.stringify(datasetData.features || []),
            createdAt: new Date().toISOString(),
            version: datasetData.version || '1.0',
            format: datasetData.format || 'json',
            ...datasetData.metadata
        };

        await this.client.hSet(key, datasetInfo);
        await this.client.sAdd(`${this.datasetsKey}:index`, datasetId);

        console.log(`Stored dataset: ${datasetId} (${datasetData.name})`);
    }

    // Calculate feature statistics
    async calculateFeatureStats(featureName) {
        const entityIds = await this.client.sMembers(`${this.featuresKey}:index:${featureName}`);

        if (entityIds.length === 0) {
            return null;
        }

        const vectors = [];
        for (const entityId of entityIds) {
            const feature = await this.getFeatureVector(entityId, featureName);
            if (feature) {
                vectors.push(feature.vector);
            }
        }

        if (vectors.length === 0) {
            return null;
        }

        const dimensions = vectors[0].length;
        const stats = {
            featureName,
            count: vectors.length,
            dimensions,
            means: [],
            variances: [],
            mins: [],
            maxs: []
        };

        // Calculate statistics for each dimension
        for (let dim = 0; dim < dimensions; dim++) {
            const values = vectors.map(v => v[dim]);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);

            stats.means.push(Math.round(mean * 1000) / 1000);
            stats.variances.push(Math.round(variance * 1000) / 1000);
            stats.mins.push(Math.round(min * 1000) / 1000);
            stats.maxs.push(Math.round(max * 1000) / 1000);
        }

        // Cache statistics (expire in 1 hour)
        const statsKey = `${this.featuresKey}:stats:${featureName}`;
        await this.client.setEx(statsKey, 3600, JSON.stringify(stats));

        return stats;
    }

    // Get cached feature statistics
    async getFeatureStats(featureName) {
        const statsKey = `${this.featuresKey}:stats:${featureName}`;
        const cached = await this.client.get(statsKey);

        if (cached) {
            return JSON.parse(cached);
        }

        return await this.calculateFeatureStats(featureName);
    }

    // Find similar entities using cosine similarity
    async findSimilarEntities(entityId, featureName, limit = 5) {
        const targetFeature = await this.getFeatureVector(entityId, featureName);
        if (!targetFeature) {
            return [];
        }

        const entityIds = await this.client.sMembers(`${this.featuresKey}:index:${featureName}`);
        const similarities = [];

        for (const otherEntityId of entityIds) {
            if (otherEntityId === entityId) continue;

            const otherFeature = await this.getFeatureVector(otherEntityId, featureName);
            if (otherFeature) {
                const similarity = this.cosineSimilarity(targetFeature.vector, otherFeature.vector);
                similarities.push({
                    entityId: otherEntityId,
                    similarity: Math.round(similarity * 1000) / 1000
                });
            }
        }

        // Sort by similarity (descending) and return top results
        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }

    // Cosine similarity calculation
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    // Get feature store statistics
    async getStats() {
        const [
            totalFeatures,
            totalModels,
            totalDatasets
        ] = await Promise.all([
            this.client.sCard(`${this.featuresKey}:all`),
            this.client.sCard(`${this.modelsKey}:index`),
            this.client.sCard(`${this.datasetsKey}:index`)
        ]);

        // Get feature types
        const featureKeys = await this.client.keys(`${this.featuresKey}:index:*`);
        const featureTypes = featureKeys.map(key => key.replace(`${this.featuresKey}:index:`, ''));

        return {
            totalFeatures,
            totalModels,
            totalDatasets,
            featureTypes: featureTypes.length
        };
    }
}

// Demo the ML feature store functionality
async function demoMLFeatureStore() {
    const featureStore = new MLFeatureStore(client);

    console.log('=== Redis ML Feature Store Demo ===\n');

    // Store user behavior features
    console.log('1. Storing user behavior features:');
    const userFeatures = [
        { entityId: 'user1', vector: [0.8, 0.6, 0.9, 0.3, 0.7] },
        { entityId: 'user2', vector: [0.2, 0.8, 0.4, 0.9, 0.1] },
        { entityId: 'user3', vector: [0.7, 0.5, 0.8, 0.4, 0.6] },
        { entityId: 'user4', vector: [0.1, 0.9, 0.2, 0.8, 0.3] },
        { entityId: 'user5', vector: [0.6, 0.7, 0.5, 0.6, 0.8] }
    ];

    await featureStore.storeBatchFeatures('user_behavior', userFeatures, {
        description: 'User engagement and preference features',
        normalized: true
    });
    console.log();

    // Store product features
    console.log('2. Storing product features:');
    const productFeatures = [
        { entityId: 'product1', vector: [0.9, 0.8, 0.7, 1.0, 0.6], category: 'electronics' },
        { entityId: 'product2', vector: [0.3, 0.9, 0.4, 0.2, 0.8], category: 'books' },
        { entityId: 'product3', vector: [0.7, 0.6, 0.8, 0.5, 0.9], category: 'clothing' }
    ];

    for (const product of productFeatures) {
        await featureStore.storeFeatureVector(
            product.entityId,
            'product_attributes',
            product.vector,
            { category: product.category }
        );
    }
    console.log();

    // Retrieve specific feature vectors
    console.log('3. Retrieving feature vectors:');
    const user1Features = await featureStore.getFeatureVector('user1', 'user_behavior');
    console.log('User1 features:', user1Features?.vector);

    const product1Features = await featureStore.getFeatureVector('product1', 'product_attributes');
    console.log('Product1 features:', product1Features?.vector);
    console.log();

    // Batch retrieval
    console.log('4. Batch feature retrieval:');
    const userIds = ['user1', 'user2', 'user3'];
    const batchFeatures = await featureStore.getBatchFeatureVectors(userIds, 'user_behavior');
    console.log(`Retrieved ${batchFeatures.length} user feature vectors`);
    batchFeatures.forEach(feature => {
        console.log(`  ${feature.entityId}: [${feature.vector.slice(0, 3).join(', ')}...]`);
    });
    console.log();

    // Calculate feature statistics
    console.log('5. Feature statistics:');
    const userStats = await featureStore.getFeatureStats('user_behavior');
    console.log('User behavior stats:', {
        count: userStats?.count,
        dimensions: userStats?.dimensions,
        mean_first_dimension: userStats?.means[0]
    });
    console.log();

    // Find similar entities
    console.log('6. Finding similar users:');
    const similarUsers = await featureStore.findSimilarEntities('user1', 'user_behavior', 3);
    console.log('Users similar to user1:');
    similarUsers.forEach(user => {
        console.log(`  ${user.entityId}: similarity ${user.similarity}`);
    });
    console.log();

    // Store model information
    console.log('7. Storing ML model:');
    await featureStore.storeModel('recommendation_v1', {
        name: 'User-Product Recommendation Model',
        type: 'collaborative_filtering',
        framework: 'tensorflow',
        version: '1.2.0',
        inputFeatures: ['user_behavior', 'product_attributes'],
        outputShape: [1],
        accuracy: 0.85,
        metadata: {
            trained_on: '2024-01-15',
            training_samples: 10000
        }
    });
    console.log();

    // Get model information
    console.log('8. Retrieving model information:');
    const model = await featureStore.getModel('recommendation_v1');
    console.log('Model info:', {
        name: model?.name,
        type: model?.type,
        accuracy: model?.accuracy,
        inputFeatures: model?.inputFeatures
    });
    console.log();

    // Store dataset metadata
    console.log('9. Storing dataset metadata:');
    await featureStore.storeDataset('user_product_interactions', {
        name: 'User-Product Interaction Dataset',
        description: 'Historical user interactions with products for recommendation training',
        size: 50000,
        features: ['user_id', 'product_id', 'interaction_type', 'timestamp'],
        format: 'parquet',
        metadata: {
            source: 'production_logs',
            last_updated: '2024-01-20'
        }
    });
    console.log();

    // Get feature store statistics
    console.log('10. Feature store statistics:');
    const stats = await featureStore.getStats();
    console.log('Feature store stats:', stats);

    await client.disconnect();
    console.log('\nML Feature Store demo completed!');
}

demoMLFeatureStore().catch(console.error);