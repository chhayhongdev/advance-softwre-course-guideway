# Redis ML Feature Store: From Beginner to Advanced

## What is a Feature Store?

**Beginner Level:** A feature store is like a smart storage system for machine learning. It keeps all the data that machine learning models need to make predictions. Instead of preparing the same data over and over, you store it once and reuse it for training and predictions.

**Intermediate Level:** A feature store is a centralized repository for machine learning features that serves both training and inference. It provides consistent feature access, versioning, and real-time feature serving capabilities.

## Why Redis for ML Feature Store?

- **Low Latency:** Sub-millisecond feature retrieval for real-time inference
- **High Throughput:** Handle millions of feature requests per second
- **Feature Versioning:** Store multiple versions of features
- **Real-Time Features:** Update features in real-time
- **Scalability:** Handle large feature sets and high concurrency
- **Data Types:** Support for various data types (numerical, categorical, embeddings)

## Basic Feature Store Operations

### Beginner Example: Simple Feature Storage

```javascript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

class SimpleFeatureStore {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async storeFeatures(entityId, features, version = 'latest') {
        const key = `features:${entityId}:${version}`;

        // Store features as hash
        await this.client.hSet(key, features);

        // Set expiration (optional)
        await this.client.expire(key, 24 * 60 * 60); // 24 hours

        // Update latest version pointer
        if (version !== 'latest') {
            await this.client.set(`latest:${entityId}`, version);
        }
    }

    async getFeatures(entityId, version = 'latest') {
        let key;

        if (version === 'latest') {
            const latestVersion = await this.client.get(`latest:${entityId}`);
            key = latestVersion ? `features:${entityId}:${latestVersion}` : `features:${entityId}:latest`;
        } else {
            key = `features:${entityId}:${version}`;
        }

        const features = await this.client.hGetAll(key);
        return this.convertFeatureTypes(features);
    }

    async getMultipleFeatures(entityIds, version = 'latest') {
        const pipeline = this.client.multi();

        for (const entityId of entityIds) {
            if (version === 'latest') {
                const latestVersion = await this.client.get(`latest:${entityId}`);
                const key = latestVersion ? `features:${entityId}:${latestVersion}` : `features:${entityId}:latest`;
                pipeline.hGetAll(key);
            } else {
                pipeline.hGetAll(`features:${entityId}:${version}`);
            }
        }

        const results = await pipeline.exec();
        return results.map(result => this.convertFeatureTypes(result));
    }

    convertFeatureTypes(features) {
        const converted = {};

        for (const [key, value] of Object.entries(features)) {
            // Try to convert to number if possible
            const numValue = parseFloat(value);
            converted[key] = isNaN(numValue) ? value : numValue;
        }

        return converted;
    }

    async deleteFeatures(entityId, version = 'latest') {
        const key = version === 'latest' ?
            `features:${entityId}:latest` :
            `features:${entityId}:${version}`;

        await this.client.del(key);

        if (version !== 'latest') {
            // Check if this was the latest version
            const latestVersion = await this.client.get(`latest:${entityId}`);
            if (latestVersion === version) {
                await this.client.del(`latest:${entityId}`);
            }
        }
    }
}

// Example usage
const featureStore = new SimpleFeatureStore(client);

// Store user features
await featureStore.storeFeatures('user123', {
    age: '25',
    income: '75000',
    credit_score: '720',
    purchase_history_length: '12',
    avg_order_value: '89.50'
});

// Get features for prediction
const userFeatures = await featureStore.getFeatures('user123');
console.log('User features:', userFeatures);

// Get features for multiple users (batch)
const userIds = ['user123', 'user456', 'user789'];
const batchFeatures = await featureStore.getMultipleFeatures(userIds);
console.log('Batch features:', batchFeatures);
```

### Intermediate Example: Feature Engineering Pipeline

```javascript
class FeatureEngineeringStore {
    constructor(redisClient) {
        this.client = redisClient;
        this.transformations = new Map();
    }

    async registerTransformation(name, transformFunction) {
        this.transformations.set(name, transformFunction);

        // Store transformation metadata
        await this.client.hSet(`transformation:${name}`, {
            name,
            type: 'function',
            created_at: new Date().toISOString()
        });
    }

    async applyTransformation(entityId, transformationName, inputFeatures) {
        const transform = this.transformations.get(transformationName);
        if (!transform) {
            throw new Error(`Transformation ${transformationName} not found`);
        }

        const transformedFeatures = await transform(inputFeatures);

        // Store transformed features
        await this.storeFeatures(`${entityId}:${transformationName}`, transformedFeatures);

        return transformedFeatures;
    }

    async createDerivedFeatures(entityId, baseFeatures) {
        const derivedFeatures = {};

        // Age groups
        const age = parseInt(baseFeatures.age);
        derivedFeatures.age_group = age < 25 ? 'young' : age < 35 ? 'young_adult' : age < 55 ? 'adult' : 'senior';

        // Income categories
        const income = parseFloat(baseFeatures.income);
        derivedFeatures.income_category = income < 30000 ? 'low' : income < 70000 ? 'medium' : 'high';

        // Credit score categories
        const creditScore = parseInt(baseFeatures.credit_score);
        derivedFeatures.credit_category = creditScore < 580 ? 'poor' : creditScore < 670 ? 'fair' : creditScore < 740 ? 'good' : 'excellent';

        // Purchase behavior features
        const purchaseHistory = parseInt(baseFeatures.purchase_history_length);
        const avgOrderValue = parseFloat(baseFeatures.avg_order_value);
        derivedFeatures.purchase_frequency = purchaseHistory > 24 ? 'frequent' : purchaseHistory > 12 ? 'regular' : 'occasional';
        derivedFeatures.spending_level = avgOrderValue > 100 ? 'high' : avgOrderValue > 50 ? 'medium' : 'low';

        // Store derived features
        await this.storeFeatures(`${entityId}:derived`, derivedFeatures);

        return derivedFeatures;
    }

    async getFeatureVector(entityId, includeDerived = true) {
        const baseFeatures = await this.getFeatures(entityId);
        if (!includeDerived) return baseFeatures;

        const derivedFeatures = await this.getFeatures(`${entityId}:derived`);
        return { ...baseFeatures, ...derivedFeatures };
    }

    async storeFeatures(entityId, features) {
        const key = `features:${entityId}:latest`;
        await this.client.hSet(key, features);
        await this.client.expire(key, 24 * 60 * 60); // 24 hours
    }

    async getFeatures(entityId) {
        const key = `features:${entityId}:latest`;
        const features = await this.client.hGetAll(key);
        return this.convertFeatureTypes(features);
    }

    convertFeatureTypes(features) {
        const converted = {};

        for (const [key, value] of Object.entries(features)) {
            const numValue = parseFloat(value);
            converted[key] = isNaN(numValue) ? value : numValue;
        }

        return converted;
    }
}

// Example usage with feature engineering
const engineeringStore = new FeatureEngineeringStore(client);

// Register custom transformations
await engineeringStore.registerTransformation('normalize_income', async (features) => {
    const income = parseFloat(features.income);
    const normalized = (income - 30000) / (200000 - 30000); // Min-max normalization
    return { normalized_income: Math.max(0, Math.min(1, normalized)) };
});

// Store base features
await engineeringStore.storeFeatures('user123', {
    age: '28',
    income: '65000',
    credit_score: '710',
    purchase_history_length: '18',
    avg_order_value: '75.50'
});

// Create derived features
const derived = await engineeringStore.createDerivedFeatures('user123', {
    age: '28',
    income: '65000',
    credit_score: '710',
    purchase_history_length: '18',
    avg_order_value: '75.50'
});

console.log('Derived features:', derived);

// Apply custom transformation
const normalized = await engineeringStore.applyTransformation('user123', 'normalize_income', {
    income: '65000'
});

console.log('Normalized features:', normalized);

// Get complete feature vector
const featureVector = await engineeringStore.getFeatureVector('user123');
console.log('Complete feature vector:', featureVector);
```

## Advanced Feature Store Patterns

### Feature Versioning and Time Travel

```javascript
class VersionedFeatureStore {
    constructor(redisClient) {
        this.client = redisClient;
        this.retentionDays = 30;
    }

    async storeFeatures(entityId, features, version = null) {
        const timestamp = Date.now();
        version = version || `v${timestamp}`;

        const key = `features:${entityId}:${version}`;

        // Store features with metadata
        const featureData = {
            ...features,
            _version: version,
            _timestamp: timestamp.toISOString(),
            _entity_id: entityId
        };

        await this.client.hSet(key, featureData);

        // Update version history
        await this.client.zAdd(`versions:${entityId}`, [{
            score: timestamp,
            value: version
        }]);

        // Update latest version pointer
        await this.client.set(`latest:${entityId}`, version);

        // Set expiration
        await this.client.expire(key, this.retentionDays * 24 * 60 * 60);

        return version;
    }

    async getFeatures(entityId, version = 'latest') {
        let key;

        if (version === 'latest') {
            version = await this.client.get(`latest:${entityId}`);
            if (!version) return null;
            key = `features:${entityId}:${version}`;
        } else if (version.startsWith('time:')) {
            // Time travel query
            const timestamp = parseInt(version.replace('time:', ''));
            key = await this.getFeatureKeyAtTime(entityId, timestamp);
        } else {
            key = `features:${entityId}:${version}`;
        }

        if (!key) return null;

        const features = await this.client.hGetAll(key);
        return this.cleanMetadata(features);
    }

    async getFeatureKeyAtTime(entityId, timestamp) {
        // Find the version that was active at the given timestamp
        const versions = await this.client.zRangeByScore(
            `versions:${entityId}`,
            0,
            timestamp,
            { LIMIT: { offset: 0, count: 1 }, REV: true }
        );

        if (versions.length === 0) return null;

        return `features:${entityId}:${versions[0]}`;
    }

    async getVersionHistory(entityId, limit = 10) {
        const versions = await this.client.zRange(
            `versions:${entityId}`,
            -limit,
            -1,
            { WITHSCORES: true, REV: true }
        );

        const history = [];
        for (const [version, score] of versions) {
            const key = `features:${entityId}:${version}`;
            const features = await this.client.hGetAll(key);

            history.push({
                version,
                timestamp: parseInt(score),
                featureCount: Object.keys(this.cleanMetadata(features)).length
            });
        }

        return history;
    }

    async compareVersions(entityId, version1, version2) {
        const features1 = await this.getFeatures(entityId, version1);
        const features2 = await this.getFeatures(entityId, version2);

        if (!features1 || !features2) {
            return { error: 'One or both versions not found' };
        }

        const changes = {
            added: [],
            removed: [],
            modified: []
        };

        const allKeys = new Set([...Object.keys(features1), ...Object.keys(features2)]);

        for (const key of allKeys) {
            const value1 = features1[key];
            const value2 = features2[key];

            if (value1 === undefined) {
                changes.added.push({ key, newValue: value2 });
            } else if (value2 === undefined) {
                changes.removed.push({ key, oldValue: value1 });
            } else if (value1 !== value2) {
                changes.modified.push({ key, oldValue: value1, newValue: value2 });
            }
        }

        return changes;
    }

    cleanMetadata(features) {
        const cleaned = { ...features };
        delete cleaned._version;
        delete cleaned._timestamp;
        delete cleaned._entity_id;
        return this.convertFeatureTypes(cleaned);
    }

    convertFeatureTypes(features) {
        const converted = {};

        for (const [key, value] of Object.entries(features)) {
            if (key.startsWith('_')) continue; // Skip metadata

            const numValue = parseFloat(value);
            converted[key] = isNaN(numValue) ? value : numValue;
        }

        return converted;
    }
}

// Example usage with versioning
const versionedStore = new VersionedFeatureStore(client);

// Store initial features
const v1 = await versionedStore.storeFeatures('user123', {
    age: '25',
    income: '50000',
    score: '650'
});

console.log('Version 1:', v1);

// Update features (creates new version)
const v2 = await versionedStore.storeFeatures('user123', {
    age: '25',
    income: '55000', // Income increased
    score: '680'     // Score improved
});

console.log('Version 2:', v2);

// Get latest features
const latest = await versionedStore.getFeatures('user123');
console.log('Latest features:', latest);

// Get specific version
const oldFeatures = await versionedStore.getFeatures('user123', v1);
console.log('Version 1 features:', oldFeatures);

// Time travel - get features as they were 1 hour ago
const oneHourAgo = Date.now() - (60 * 60 * 1000);
const historical = await versionedStore.getFeatures('user123', `time:${oneHourAgo}`);
console.log('Historical features:', historical);

// Compare versions
const comparison = await versionedStore.compareVersions('user123', v1, v2);
console.log('Version comparison:', comparison);

// Get version history
const history = await versionedStore.getVersionHistory('user123');
console.log('Version history:', history);
```

### Real-Time Feature Updates

```javascript
class RealTimeFeatureStore {
    constructor(redisClient) {
        this.client = redisClient;
        this.updateChannels = new Map();
    }

    async subscribeToUpdates(entityId, callback) {
        const channel = `feature_updates:${entityId}`;

        // Note: In production, you'd use Redis pub/sub
        // For this example, we'll simulate with polling
        const interval = setInterval(async () => {
            const latestUpdate = await this.client.get(`last_update:${entityId}`);
            if (latestUpdate) {
                const features = await this.getFeatures(entityId);
                callback(features);
            }
        }, 1000); // Check every second

        this.updateChannels.set(entityId, interval);
    }

    async unsubscribeFromUpdates(entityId) {
        const interval = this.updateChannels.get(entityId);
        if (interval) {
            clearInterval(interval);
            this.updateChannels.delete(entityId);
        }
    }

    async updateFeature(entityId, featureName, newValue) {
        const key = `features:${entityId}:latest`;

        // Update the specific feature
        await this.client.hSet(key, featureName, newValue.toString());

        // Record the update
        await this.client.set(`last_update:${entityId}`, Date.now().toString());

        // Publish update event (in real implementation)
        // await this.client.publish(`feature_updates:${entityId}`, JSON.stringify({
        //     entityId,
        //     feature: featureName,
        //     value: newValue,
        //     timestamp: Date.now()
        // }));
    }

    async batchUpdateFeatures(entityId, updates) {
        const key = `features:${entityId}:latest`;
        const pipeline = this.client.multi();

        // Update all features
        for (const [feature, value] of Object.entries(updates)) {
            pipeline.hSet(key, feature, value.toString());
        }

        // Record the update
        pipeline.set(`last_update:${entityId}`, Date.now().toString());

        await pipeline.exec();
    }

    async getFeatures(entityId) {
        const key = `features:${entityId}:latest`;
        const features = await this.client.hGetAll(key);
        return this.convertFeatureTypes(features);
    }

    convertFeatureTypes(features) {
        const converted = {};

        for (const [key, value] of Object.entries(features)) {
            const numValue = parseFloat(value);
            converted[key] = isNaN(numValue) ? value : numValue;
        }

        return converted;
    }

    async getFeatureStats(entityId) {
        const features = await this.getFeatures(entityId);
        const stats = {
            totalFeatures: Object.keys(features).length,
            numericFeatures: 0,
            categoricalFeatures: 0,
            lastUpdate: await this.client.get(`last_update:${entityId}`)
        };

        for (const value of Object.values(features)) {
            if (typeof value === 'number') {
                stats.numericFeatures++;
            } else {
                stats.categoricalFeatures++;
            }
        }

        return stats;
    }
}

// Example usage with real-time updates
const realtimeStore = new RealTimeFeatureStore(client);

// Store initial features
await realtimeStore.batchUpdateFeatures('user123', {
    clicks: '0',
    impressions: '0',
    conversions: '0',
    last_activity: new Date().toISOString()
});

// Subscribe to updates
await realtimeStore.subscribeToUpdates('user123', (features) => {
    console.log('Real-time feature update:', features);
});

// Simulate real-time updates
setTimeout(async () => {
    await realtimeStore.updateFeature('user123', 'clicks', '1');
}, 2000);

setTimeout(async () => {
    await realtimeStore.updateFeature('user123', 'impressions', '5');
}, 4000);

setTimeout(async () => {
    await realtimeStore.batchUpdateFeatures('user123', {
        clicks: '2',
        conversions: '1',
        last_activity: new Date().toISOString()
    });
}, 6000);

// Get stats
setTimeout(async () => {
    const stats = await realtimeStore.getFeatureStats('user123');
    console.log('Feature stats:', stats);

    // Cleanup
    await realtimeStore.unsubscribeFromUpdates('user123');
}, 8000);
```

### Feature Embeddings and Vector Features

```javascript
class EmbeddingFeatureStore {
    constructor(redisClient) {
        this.client = redisClient;
        this.vectorDimension = 128; // Default embedding dimension
    }

    async storeEmbedding(entityId, embedding, modelName = 'default') {
        const key = `embedding:${entityId}:${modelName}`;

        if (!Array.isArray(embedding)) {
            throw new Error('Embedding must be an array');
        }

        if (embedding.length !== this.vectorDimension) {
            throw new Error(`Embedding dimension must be ${this.vectorDimension}`);
        }

        // Store as JSON string
        await this.client.set(key, JSON.stringify({
            vector: embedding,
            model: modelName,
            dimension: embedding.length,
            created_at: new Date().toISOString()
        }));

        // Set expiration
        await this.client.expire(key, 7 * 24 * 60 * 60); // 7 days
    }

    async getEmbedding(entityId, modelName = 'default') {
        const key = `embedding:${entityId}:${modelName}`;
        const data = await this.client.get(key);

        if (!data) return null;

        const embeddingData = JSON.parse(data);
        return embeddingData.vector;
    }

    async findSimilarEmbeddings(queryEmbedding, modelName = 'default', limit = 10) {
        // Simple cosine similarity search (in production, use Redisearch or specialized vector DB)
        const allEmbeddings = await this.client.keys(`embedding:*:${modelName}`);

        const similarities = [];

        for (const key of allEmbeddings) {
            const data = await this.client.get(key);
            if (!data) continue;

            const embeddingData = JSON.parse(data);
            const similarity = this.cosineSimilarity(queryEmbedding, embeddingData.vector);

            const entityId = key.split(':')[1];
            similarities.push({
                entityId,
                similarity,
                embedding: embeddingData.vector
            });
        }

        // Sort by similarity (descending)
        similarities.sort((a, b) => b.similarity - a.similarity);

        return similarities.slice(0, limit);
    }

    cosineSimilarity(vec1, vec2) {
        if (vec1.length !== vec2.length) return 0;

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i];
            norm1 += vec1[i] * vec1[i];
            norm2 += vec2[i] * vec2[i];
        }

        if (norm1 === 0 || norm2 === 0) return 0;

        return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    }

    async storeTextEmbedding(text, embedding, modelName = 'text-embedding') {
        // Create a hash of the text for deduplication
        const textHash = this.hashString(text);
        const entityId = `text_${textHash}`;

        await this.storeEmbedding(entityId, embedding, modelName);

        // Store text metadata
        await this.client.hSet(`text_metadata:${entityId}`, {
            text: text.substring(0, 500), // Store first 500 chars
            hash: textHash,
            model: modelName,
            created_at: new Date().toISOString()
        });

        return entityId;
    }

    async findSimilarTexts(queryText, queryEmbedding, modelName = 'text-embedding', limit = 5) {
        const similarEmbeddings = await this.findSimilarEmbeddings(queryEmbedding, modelName, limit);

        // Enrich with text data
        const results = [];
        for (const item of similarEmbeddings) {
            const metadata = await this.client.hGetAll(`text_metadata:${item.entityId}`);
            results.push({
                ...item,
                text: metadata.text,
                similarity: item.similarity
            });
        }

        return results;
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    async createFeatureVector(entityId, includeEmbeddings = true) {
        const features = await this.getFeatures(entityId);
        const featureVector = { ...features };

        if (includeEmbeddings) {
            const embedding = await this.getEmbedding(entityId);
            if (embedding) {
                // Add embedding as individual features
                for (let i = 0; i < embedding.length; i++) {
                    featureVector[`embedding_${i}`] = embedding[i];
                }
            }
        }

        return featureVector;
    }

    async getFeatures(entityId) {
        const key = `features:${entityId}:latest`;
        const features = await this.client.hGetAll(key);
        return this.convertFeatureTypes(features);
    }

    convertFeatureTypes(features) {
        const converted = {};

        for (const [key, value] of Object.entries(features)) {
            const numValue = parseFloat(value);
            converted[key] = isNaN(numValue) ? value : numValue;
        }

        return converted;
    }
}

// Example usage with embeddings
const embeddingStore = new EmbeddingFeatureStore(client);

// Store user embedding (simulated 128-dimensional vector)
const userEmbedding = Array.from({ length: 128 }, () => Math.random() - 0.5);
await embeddingStore.storeEmbedding('user123', userEmbedding, 'user-profile-v1');

// Store text embeddings
const text1 = "The user frequently purchases electronics and gadgets";
const text2 = "Customer shows interest in books and educational content";
const text3 = "User prefers luxury items and high-end products";

const embedding1 = Array.from({ length: 128 }, () => Math.random() - 0.5);
const embedding2 = Array.from({ length: 128 }, () => Math.random() - 0.5);
const embedding3 = Array.from({ length: 128 }, () => Math.random() - 0.5);

await embeddingStore.storeTextEmbedding(text1, embedding1);
await embeddingStore.storeTextEmbedding(text2, embedding2);
await embeddingStore.storeTextEmbedding(text3, embedding3);

// Find similar users
const similarUsers = await embeddingStore.findSimilarEmbeddings(userEmbedding, 'user-profile-v1', 3);
console.log('Similar users:', similarUsers);

// Find similar texts
const queryText = "Customer likes technology products";
const queryEmbedding = Array.from({ length: 128 }, () => Math.random() - 0.5);
const similarTexts = await embeddingStore.findSimilarTexts(queryText, queryEmbedding);
console.log('Similar texts:', similarTexts);

// Create complete feature vector
const featureVector = await embeddingStore.createFeatureVector('user123');
console.log('Feature vector length:', Object.keys(featureVector).length);
```

## Feature Store Management and Monitoring

### Feature Quality Monitoring

```javascript
class FeatureQualityMonitor {
    constructor(redisClient) {
        this.client = redisClient;
        this.metricsKey = 'feature_quality';
    }

    async recordFeatureAccess(entityId, featureName, value) {
        const timestamp = Date.now();

        // Record access
        await this.client.zAdd(`${this.metricsKey}:access:${featureName}`, [{
            score: timestamp,
            value: JSON.stringify({ entityId, value, timestamp })
        }]);

        // Keep only recent access records
        await this.client.zRemRangeByScore(
            `${this.metricsKey}:access:${featureName}`,
            0,
            timestamp - (24 * 60 * 60 * 1000) // Last 24 hours
        );
    }

    async detectDataDrift(featureName, baselineWindow = 7 * 24 * 60 * 60 * 1000) {
        const now = Date.now();
        const baselineStart = now - baselineWindow;

        // Get recent values
        const recentValues = await this.client.zRangeByScore(
            `${this.metricsKey}:access:${featureName}`,
            baselineStart,
            now
        );

        if (recentValues.length < 10) return null;

        const values = recentValues.map(record => {
            const data = JSON.parse(record);
            return parseFloat(data.value);
        }).filter(v => !isNaN(v));

        if (values.length < 10) return null;

        // Calculate statistics
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        // Get historical baseline (simplified - in practice you'd store baseline stats)
        const baselineMean = mean; // Simplified
        const baselineStdDev = stdDev; // Simplified

        // Calculate drift score (z-score of current mean vs baseline)
        const driftScore = Math.abs(mean - baselineMean) / baselineStdDev;

        return {
            feature: featureName,
            currentMean: mean,
            currentStdDev: stdDev,
            driftScore,
            isDrifting: driftScore > 3.0, // 3 standard deviations
            sampleSize: values.length
        };
    }

    async getFeatureHealthReport() {
        const featureKeys = await this.client.keys(`${this.metricsKey}:access:*`);
        const report = {
            totalFeatures: featureKeys.length,
            healthyFeatures: 0,
            driftingFeatures: [],
            timestamp: new Date().toISOString()
        };

        for (const key of featureKeys) {
            const featureName = key.replace(`${this.metricsKey}:access:`, '');
            const driftAnalysis = await this.detectDataDrift(featureName);

            if (driftAnalysis) {
                if (driftAnalysis.isDrifting) {
                    report.driftingFeatures.push(driftAnalysis);
                } else {
                    report.healthyFeatures++;
                }
            }
        }

        return report;
    }

    async validateFeatureValues(entityId, features) {
        const validationResults = {
            valid: true,
            errors: [],
            warnings: []
        };

        for (const [featureName, value] of Object.entries(features)) {
            // Check for null/undefined values
            if (value == null) {
                validationResults.errors.push(`${featureName}: null or undefined value`);
                validationResults.valid = false;
                continue;
            }

            // Type validation
            if (typeof value === 'number') {
                if (isNaN(value) || !isFinite(value)) {
                    validationResults.errors.push(`${featureName}: invalid number`);
                    validationResults.valid = false;
                }

                // Range checks (example)
                if (featureName.includes('age') && (value < 0 || value > 150)) {
                    validationResults.warnings.push(`${featureName}: age out of expected range`);
                }
            }

            // String validation
            if (typeof value === 'string') {
                if (value.trim().length === 0) {
                    validationResults.warnings.push(`${featureName}: empty string`);
                }
            }
        }

        return validationResults;
    }
}

// Enhanced feature store with quality monitoring
class MonitoredFeatureStore extends SimpleFeatureStore {
    constructor(redisClient) {
        super(redisClient);
        this.qualityMonitor = new FeatureQualityMonitor(redisClient);
    }

    async storeFeatures(entityId, features) {
        // Validate features before storing
        const validation = await this.qualityMonitor.validateFeatureValues(entityId, features);

        if (!validation.valid) {
            throw new Error(`Feature validation failed: ${validation.errors.join(', ')}`);
        }

        if (validation.warnings.length > 0) {
            console.warn('Feature validation warnings:', validation.warnings);
        }

        // Store features
        await super.storeFeatures(entityId, features);

        // Record access for monitoring
        for (const [featureName, value] of Object.entries(features)) {
            await this.qualityMonitor.recordFeatureAccess(entityId, featureName, value);
        }
    }

    async getFeatures(entityId) {
        const features = await super.getFeatures(entityId);

        // Record access for monitoring
        if (features) {
            for (const [featureName, value] of Object.entries(features)) {
                await this.qualityMonitor.recordFeatureAccess(entityId, featureName, value);
            }
        }

        return features;
    }

    async getQualityReport() {
        return await this.qualityMonitor.getFeatureHealthReport();
    }
}
```

### Feature Store Performance Optimization

```javascript
class OptimizedFeatureStore {
    constructor(redisClient) {
        this.client = redisClient;
        this.cache = new Map(); // In-memory cache for hot features
        this.cacheSize = 10000;
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    }

    async storeFeatures(entityId, features, useCompression = false) {
        const key = `features:${entityId}:latest`;

        let dataToStore = features;

        if (useCompression) {
            dataToStore = this.compressFeatures(features);
        }

        // Use pipeline for atomic operation
        const pipeline = this.client.multi();
        pipeline.hSet(key, dataToStore);
        pipeline.expire(key, 24 * 60 * 60); // 24 hours

        await pipeline.exec();

        // Update cache
        this.updateCache(entityId, features);
    }

    async getFeatures(entityId, useCache = true) {
        // Check cache first
        if (useCache) {
            const cached = this.getFromCache(entityId);
            if (cached) return cached;
        }

        const key = `features:${entityId}:latest`;
        const features = await this.client.hGetAll(key);

        if (Object.keys(features).length === 0) return null;

        const decompressed = this.decompressFeatures(features);

        // Update cache
        if (useCache) {
            this.updateCache(entityId, decompressed);
        }

        return decompressed;
    }

    async getMultipleFeatures(entityIds, useCache = true) {
        const results = new Map();
        const uncachedIds = [];

        // Check cache first
        if (useCache) {
            for (const entityId of entityIds) {
                const cached = this.getFromCache(entityId);
                if (cached) {
                    results.set(entityId, cached);
                } else {
                    uncachedIds.push(entityId);
                }
            }
        } else {
            uncachedIds.push(...entityIds);
        }

        // Fetch uncached features in batch
        if (uncachedIds.length > 0) {
            const pipeline = this.client.multi();

            for (const entityId of uncachedIds) {
                pipeline.hGetAll(`features:${entityId}:latest`);
            }

            const batchResults = await pipeline.exec();

            for (let i = 0; i < uncachedIds.length; i++) {
                const entityId = uncachedIds[i];
                const features = batchResults[i];

                if (Object.keys(features).length > 0) {
                    const decompressed = this.decompressFeatures(features);
                    results.set(entityId, decompressed);

                    // Update cache
                    if (useCache) {
                        this.updateCache(entityId, decompressed);
                    }
                } else {
                    results.set(entityId, null);
                }
            }
        }

        // Return results in original order
        return entityIds.map(id => results.get(id));
    }

    updateCache(entityId, features) {
        this.cache.set(entityId, {
            data: features,
            timestamp: Date.now()
        });

        // Evict old entries if cache is full
        if (this.cache.size > this.cacheSize) {
            const oldestKey = Array.from(this.cache.entries())
                .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0][0];
            this.cache.delete(oldestKey);
        }
    }

    getFromCache(entityId) {
        const cached = this.cache.get(entityId);
        if (!cached) return null;

        // Check if cache entry is expired
        if (Date.now() - cached.timestamp > this.cacheTTL) {
            this.cache.delete(entityId);
            return null;
        }

        return cached.data;
    }

    compressFeatures(features) {
        // Simple compression: convert numbers to strings with reduced precision
        const compressed = {};

        for (const [key, value] of Object.entries(features)) {
            if (typeof value === 'number') {
                // Reduce precision for floating point numbers
                compressed[key] = Number(value.toFixed(4)).toString();
            } else {
                compressed[key] = value.toString();
            }
        }

        return compressed;
    }

    decompressFeatures(features) {
        const decompressed = {};

        for (const [key, value] of Object.entries(features)) {
            const numValue = parseFloat(value);
            decompressed[key] = isNaN(numValue) ? value : numValue;
        }

        return decompressed;
    }

    async preloadHotFeatures(entityIds) {
        // Preload frequently accessed features into cache
        const features = await this.getMultipleFeatures(entityIds, false);

        for (let i = 0; i < entityIds.length; i++) {
            if (features[i]) {
                this.updateCache(entityIds[i], features[i]);
            }
        }
    }

    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.cacheSize,
            hitRate: this.calculateHitRate()
        };
    }

    calculateHitRate() {
        // Simplified hit rate calculation
        // In production, you'd track cache hits/misses
        return this.cache.size / this.cacheSize;
    }
}

// Example usage with optimization
const optimizedStore = new OptimizedFeatureStore(client);

// Store features with compression
await optimizedStore.storeFeatures('user123', {
    age: 25.123456,
    income: 75000.987654,
    score: 720.5,
    category: 'premium'
}, true);

// Get features (will use cache on subsequent calls)
const features = await optimizedStore.getFeatures('user123');
console.log('Retrieved features:', features);

// Batch retrieval with caching
const userIds = ['user123', 'user456', 'user789'];
const batchFeatures = await optimizedStore.getMultipleFeatures(userIds);
console.log('Batch features:', batchFeatures);

// Preload hot features
await optimizedStore.preloadHotFeatures(['user123', 'user456']);

// Get cache stats
const cacheStats = optimizedStore.getCacheStats();
console.log('Cache stats:', cacheStats);
```

## Best Practices

### Feature Store Architecture

```javascript
class ProductionFeatureStore {
    constructor(redisClient) {
        this.client = redisClient;
        this.layers = {
            raw: new SimpleFeatureStore(redisClient),
            processed: new FeatureEngineeringStore(redisClient),
            optimized: new OptimizedFeatureStore(redisClient),
            monitored: new MonitoredFeatureStore(redisClient)
        };
    }

    async ingestRawData(entityId, rawData) {
        // Layer 1: Raw data ingestion
        await this.layers.raw.storeFeatures(`${entityId}:raw`, rawData);

        // Layer 2: Feature engineering
        const processedFeatures = await this.layers.processed.createDerivedFeatures(entityId, rawData);
        await this.layers.processed.storeFeatures(`${entityId}:processed`, processedFeatures);

        // Layer 3: Optimization and caching
        const completeFeatures = { ...rawData, ...processedFeatures };
        await this.layers.optimized.storeFeatures(entityId, completeFeatures, true);

        // Layer 4: Monitoring
        await this.layers.monitored.storeFeatures(entityId, completeFeatures);
    }

    async getFeaturesForInference(entityId, layer = 'optimized') {
        return await this.layers[layer].getFeatures(entityId);
    }

    async getBatchFeaturesForTraining(entityIds, layer = 'processed') {
        return await this.layers[layer].getMultipleFeatures(entityIds);
    }

    async getQualityReport() {
        return await this.layers.monitored.getQualityReport();
    }

    async getPerformanceStats() {
        const stats = {
            raw: await this.layers.raw.getStats(),
            optimized: this.layers.optimized.getCacheStats(),
            quality: await this.getQualityReport()
        };

        return stats;
    }
}

// Example production usage
const productionStore = new ProductionFeatureStore(client);

// Ingest raw user data
await productionStore.ingestRawData('user123', {
    age: 28,
    income: 65000,
    transactions: 45,
    last_login: '2024-01-15',
    device_type: 'mobile'
});

// Get features for real-time inference
const inferenceFeatures = await productionStore.getFeaturesForInference('user123');
console.log('Inference features:', inferenceFeatures);

// Get batch features for model training
const trainingData = await productionStore.getBatchFeaturesForTraining(['user123', 'user456']);
console.log('Training data:', trainingData);

// Monitor quality and performance
const qualityReport = await productionStore.getQualityReport();
const performanceStats = await productionStore.getPerformanceStats();

console.log('Quality report:', qualityReport);
console.log('Performance stats:', performanceStats);
```

## Conclusion

Redis feature stores enable fast, scalable feature serving for machine learning applications. Start with basic feature storage, then add versioning, real-time updates, and monitoring for production use.

**Beginner Tip:** Use hashes to store feature dictionaries and sets for categorical features.

**Advanced Tip:** Implement multi-layer architecture with raw data ingestion, feature engineering, optimization, and monitoring for production ML systems.
class TimeSeriesManager {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async addDataPoint(metric, value, timestamp = Date.now(), tags = {}) {
        const key = `metric:${metric}`;

        // Store data point with metadata
        const dataPoint = {
            value,
            timestamp,
            tags: JSON.stringify(tags)
        };

        await this.client.zAdd(key, [{
            score: timestamp,
            value: JSON.stringify(dataPoint)
        }]);

        // Maintain data retention (keep last 10,000 points)
        await this.client.zRemRangeByRank(key, 0, -10001);

        // Update metadata
        await this.updateMetricMetadata(metric, timestamp);
    }

    async getDataPoints(metric, startTime, endTime, limit = 1000) {
        const key = `metric:${metric}`;
        const dataPoints = await this.client.zRangeByScore(
            key,
            startTime,
            endTime,
            { LIMIT: { offset: 0, count: limit } }
        );

        return dataPoints.map(point => JSON.parse(point));
    }

    async getLatestValue(metric) {
        const key = `metric:${metric}`;
        const latest = await this.client.zRange(key, -1, -1);

        if (latest.length === 0) return null;

        return JSON.parse(latest[0]);
    }

    async updateMetricMetadata(metric, timestamp) {
        const metaKey = `meta:${metric}`;
        await this.client.hSet(metaKey, {
            lastUpdate: timestamp.toString(),
            updatedAt: new Date().toISOString()
        });
    }

    async getMetricStats(metric) {
        const key = `metric:${metric}`;
        const count = await this.client.zCard(key);

        if (count === 0) return null;

        const dataPoints = await this.client.zRange(key, 0, -1);
        const values = dataPoints.map(point => JSON.parse(point).value);

        return {
            count,
            min: Math.min(...values),
            max: Math.max(...values),
            average: values.reduce((a, b) => a + b, 0) / values.length,
            latest: values[values.length - 1]
        };
    }
}
```

## Advanced Time Series Patterns

### Downsampling and Aggregation

```javascript
class TimeSeriesAggregator {
    constructor(redisClient) {
        this.client = redisClient;
        this.resolutions = {
            '1m': 60 * 1000,      // 1 minute
            '5m': 5 * 60 * 1000,  // 5 minutes
            '1h': 60 * 60 * 1000, // 1 hour
            '1d': 24 * 60 * 60 * 1000 // 1 day
        };
    }

    async addDataPoint(metric, value, timestamp = Date.now()) {
        // Store raw data
        await this.addRawDataPoint(metric, value, timestamp);

        // Update aggregations for all resolutions
        for (const [resolution, interval] of Object.entries(this.resolutions)) {
            await this.updateAggregation(metric, resolution, value, timestamp, interval);
        }
    }

    async addRawDataPoint(metric, value, timestamp) {
        const key = `raw:${metric}`;
        await this.client.zAdd(key, [{
            score: timestamp,
            value: value.toString()
        }]);

        // Keep raw data for 24 hours
        const cutoff = timestamp - (24 * 60 * 60 * 1000);
        await this.client.zRemRangeByScore(key, 0, cutoff);
    }

    async updateAggregation(metric, resolution, value, timestamp, interval) {
        const bucket = Math.floor(timestamp / interval) * interval;
        const aggKey = `agg:${metric}:${resolution}:${bucket}`;

        // Get existing aggregation or initialize
        const existing = await this.client.hGetAll(aggKey);
        const current = existing.count ? JSON.parse(existing.data) : {
            count: 0,
            sum: 0,
            min: Infinity,
            max: -Infinity,
            first: value,
            last: value
        };

        // Update aggregation
        current.count += 1;
        current.sum += value;
        current.min = Math.min(current.min, value);
        current.max = Math.max(current.max, value);
        current.last = value;

        await this.client.hSet(aggKey, {
            data: JSON.stringify(current),
            timestamp: bucket.toString()
        });

        // Set expiration (keep aggregations for 30 days)
        await this.client.expire(aggKey, 30 * 24 * 60 * 60);
    }

    async getAggregatedData(metric, resolution, startTime, endTime) {
        const interval = this.resolutions[resolution];
        const startBucket = Math.floor(startTime / interval) * interval;
        const endBucket = Math.floor(endTime / interval) * interval;

        const results = [];

        for (let bucket = startBucket; bucket <= endBucket; bucket += interval) {
            const aggKey = `agg:${metric}:${resolution}:${bucket}`;
            const data = await this.client.hGet(aggKey, 'data');

            if (data) {
                const aggregation = JSON.parse(data);
                results.push({
                    timestamp: bucket,
                    ...aggregation,
                    average: aggregation.sum / aggregation.count
                });
            }
        }

        return results;
    }

    async getRawData(metric, startTime, endTime, limit = 1000) {
        const key = `raw:${metric}`;
        const dataPoints = await this.client.zRangeByScore(
            key,
            startTime,
            endTime,
            { LIMIT: { offset: 0, count: limit } }
        );

        return dataPoints.map(point => ({
            timestamp: parseInt(point.split(':')[0]),
            value: parseFloat(point.split(':')[1])
        }));
    }
}
```

### Time Series with Compression

```javascript
class CompressedTimeSeries {
    constructor(redisClient) {
        this.client = redisClient;
        this.compressionThreshold = 1000; // Compress after 1000 points
    }

    async addDataPoint(metric, value, timestamp = Date.now()) {
        const rawKey = `raw:${metric}`;
        const compressedKey = `compressed:${metric}`;

        // Add to raw data
        await this.client.zAdd(rawKey, [{
            score: timestamp,
            value: value.toString()
        }]);

        // Check if we need to compress
        const rawCount = await this.client.zCard(rawKey);
        if (rawCount >= this.compressionThreshold) {
            await this.compressData(metric);
        }
    }

    async compressData(metric) {
        const rawKey = `raw:${metric}`;
        const compressedKey = `compressed:${metric}`;

        // Get all raw data
        const rawData = await this.client.zRange(rawKey, 0, -1, { WITHSCORES: true });

        if (rawData.length < 2) return;

        // Simple delta encoding compression
        const compressed = this.deltaEncode(rawData);

        // Store compressed data
        await this.client.set(compressedKey, JSON.stringify(compressed));

        // Clear raw data
        await this.client.del(rawKey);
    }

    deltaEncode(data) {
        const values = data.map(([value, score]) => ({
            value: parseFloat(value),
            timestamp: parseInt(score)
        }));

        const compressed = {
            baseValue: values[0].value,
            baseTimestamp: values[0].timestamp,
            deltas: []
        };

        for (let i = 1; i < values.length; i++) {
            compressed.deltas.push({
                valueDelta: values[i].value - values[i-1].value,
                timeDelta: values[i].timestamp - values[i-1].timestamp
            });
        }

        return compressed;
    }

    async getDataPoints(metric, startTime, endTime) {
        const compressedKey = `compressed:${metric}`;
        const compressedData = await this.client.get(compressedKey);

        if (!compressedData) {
            // No compressed data, check raw
            return await this.getRawData(metric, startTime, endTime);
        }

        const compressed = JSON.parse(compressedData);
        const decompressed = this.deltaDecode(compressed);

        // Filter by time range
        return decompressed.filter(point =>
            point.timestamp >= startTime && point.timestamp <= endTime
        );
    }

    deltaDecode(compressed) {
        const points = [{
            value: compressed.baseValue,
            timestamp: compressed.baseTimestamp
        }];

        let currentValue = compressed.baseValue;
        let currentTime = compressed.baseTimestamp;

        for (const delta of compressed.deltas) {
            currentValue += delta.valueDelta;
            currentTime += delta.timeDelta;

            points.push({
                value: currentValue,
                timestamp: currentTime
            });
        }

        return points;
    }

    async getRawData(metric, startTime, endTime) {
        const rawKey = `raw:${metric}`;
        const data = await this.client.zRangeByScore(rawKey, startTime, endTime);

        return data.map(point => ({
            timestamp: parseInt(point.split(':')[0]),
            value: parseFloat(point.split(':')[1])
        }));
    }
}
```

## Real-Time Analytics and Alerting

### Threshold-Based Alerting

```javascript
class TimeSeriesAlertManager {
    constructor(redisClient) {
        this.client = redisClient;
        this.alerts = new Map();
    }

    async setAlert(metric, condition, threshold, callback, windowMinutes = 5) {
        const alertKey = `alert:${metric}`;
        const alert = {
            condition, // 'above', 'below', 'equals'
            threshold,
            callback,
            windowMinutes,
            active: true,
            createdAt: new Date().toISOString()
        };

        await this.client.set(alertKey, JSON.stringify(alert));

        // Start monitoring
        this.startMonitoring(metric);
    }

    async startMonitoring(metric) {
        if (this.alerts.has(metric)) return;

        const monitor = setInterval(async () => {
            await this.checkAlert(metric);
        }, 60000); // Check every minute

        this.alerts.set(metric, monitor);
    }

    async checkAlert(metric) {
        const alertKey = `alert:${metric}`;
        const alertData = await this.client.get(alertKey);

        if (!alertData) return;

        const alert = JSON.parse(alertData);
        if (!alert.active) return;

        // Get recent data
        const endTime = Date.now();
        const startTime = endTime - (alert.windowMinutes * 60 * 1000);

        const dataPoints = await this.getDataPoints(metric, startTime, endTime);

        if (dataPoints.length === 0) return;

        // Check condition
        const shouldAlert = this.checkCondition(dataPoints, alert);

        if (shouldAlert) {
            try {
                await alert.callback({
                    metric,
                    condition: alert.condition,
                    threshold: alert.threshold,
                    currentValue: dataPoints[dataPoints.length - 1].value,
                    dataPoints,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Alert callback error:', error);
            }
        }
    }

    checkCondition(dataPoints, alert) {
        const values = dataPoints.map(p => p.value);
        const avgValue = values.reduce((a, b) => a + b, 0) / values.length;

        switch (alert.condition) {
            case 'above':
                return avgValue > alert.threshold;
            case 'below':
                return avgValue < alert.threshold;
            case 'equals':
                return Math.abs(avgValue - alert.threshold) < 0.01;
            default:
                return false;
        }
    }

    async removeAlert(metric) {
        const alertKey = `alert:${metric}`;
        await this.client.del(alertKey);

        if (this.alerts.has(metric)) {
            clearInterval(this.alerts.get(metric));
            this.alerts.delete(metric);
        }
    }

    async getDataPoints(metric, startTime, endTime) {
        const key = `metric:${metric}`;
        const dataPoints = await this.client.zRangeByScore(key, startTime, endTime);

        return dataPoints.map(point => JSON.parse(point));
    }
}
```

### Anomaly Detection

```javascript
class AnomalyDetector {
    constructor(redisClient) {
        this.client = redisClient;
        this.baselineWindow = 24 * 60 * 60 * 1000; // 24 hours
        this.sensitivity = 2.0; // Standard deviations
    }

    async detectAnomalies(metric, currentValue, timestamp = Date.now()) {
        // Get baseline data
        const baselineStart = timestamp - this.baselineWindow;
        const baselineData = await this.getDataPoints(metric, baselineStart, timestamp);

        if (baselineData.length < 10) {
            return { isAnomaly: false, reason: 'insufficient_baseline_data' };
        }

        // Calculate statistics
        const values = baselineData.map(p => p.value);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        // Check if current value is anomalous
        const zScore = Math.abs(currentValue - mean) / stdDev;
        const isAnomaly = zScore > this.sensitivity;

        return {
            isAnomaly,
            zScore,
            mean,
            stdDev,
            threshold: this.sensitivity,
            currentValue,
            timestamp
        };
    }

    async monitorMetric(metric, callback) {
        // Set up continuous monitoring
        const monitorKey = `monitor:${metric}`;
        await this.client.set(monitorKey, JSON.stringify({
            active: true,
            callback: callback.toString(),
            startedAt: new Date().toISOString()
        }));

        // Start monitoring loop (in production, use a job scheduler)
        setInterval(async () => {
            const latest = await this.getLatestValue(metric);
            if (!latest) return;

            const anomaly = await this.detectAnomalies(metric, latest.value, latest.timestamp);

            if (anomaly.isAnomaly) {
                try {
                    await callback(anomaly);
                } catch (error) {
                    console.error('Anomaly callback error:', error);
                }
            }
        }, 60000); // Check every minute
    }

    async getDataPoints(metric, startTime, endTime) {
        const key = `metric:${metric}`;
        const dataPoints = await this.client.zRangeByScore(key, startTime, endTime);

        return dataPoints.map(point => JSON.parse(point));
    }

    async getLatestValue(metric) {
        const key = `metric:${metric}`;
        const latest = await this.client.zRange(key, -1, -1);

        if (latest.length === 0) return null;

        return JSON.parse(latest[0]);
    }
}
```

## Advanced Time Series Features

### Multi-Metric Analysis

```javascript
class MultiMetricAnalyzer {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async correlateMetrics(metrics, startTime, endTime, windowSize = 60 * 1000) {
        const correlations = {};

        // Get data for all metrics
        const metricData = {};
        for (const metric of metrics) {
            metricData[metric] = await this.getDataPoints(metric, startTime, endTime);
        }

        // Calculate correlations between each pair
        for (let i = 0; i < metrics.length; i++) {
            for (let j = i + 1; j < metrics.length; j++) {
                const metric1 = metrics[i];
                const metric2 = metrics[j];

                const correlation = this.calculateCorrelation(
                    metricData[metric1],
                    metricData[metric2],
                    windowSize
                );

                correlations[`${metric1}:${metric2}`] = correlation;
            }
        }

        return correlations;
    }

    calculateCorrelation(data1, data2, windowSize) {
        // Align data points by time windows
        const alignedData = this.alignTimeSeries(data1, data2, windowSize);

        if (alignedData.length < 2) return 0;

        const values1 = alignedData.map(d => d.value1);
        const values2 = alignedData.map(d => d.value2);

        // Calculate Pearson correlation coefficient
        const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
        const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;

        let numerator = 0;
        let sumSq1 = 0;
        let sumSq2 = 0;

        for (let i = 0; i < alignedData.length; i++) {
            const diff1 = values1[i] - mean1;
            const diff2 = values2[i] - mean2;

            numerator += diff1 * diff2;
            sumSq1 += diff1 * diff1;
            sumSq2 += diff2 * diff2;
        }

        const denominator = Math.sqrt(sumSq1 * sumSq2);

        return denominator === 0 ? 0 : numerator / denominator;
    }

    alignTimeSeries(data1, data2, windowSize) {
        const aligned = [];
        const map2 = new Map(data2.map(d => [Math.floor(d.timestamp / windowSize), d]));

        for (const point1 of data1) {
            const window = Math.floor(point1.timestamp / windowSize);
            const point2 = map2.get(window);

            if (point2) {
                aligned.push({
                    timestamp: window * windowSize,
                    value1: point1.value,
                    value2: point2.value
                });
            }
        }

        return aligned;
    }

    async findOutliers(metrics, startTime, endTime, threshold = 3.0) {
        const outliers = {};

        for (const metric of metrics) {
            const data = await this.getDataPoints(metric, startTime, endTime);
            const values = data.map(d => d.value);

            if (values.length < 2) continue;

            // Calculate IQR for outlier detection
            const sorted = [...values].sort((a, b) => a - b);
            const q1 = sorted[Math.floor(sorted.length * 0.25)];
            const q3 = sorted[Math.floor(sorted.length * 0.75)];
            const iqr = q3 - q1;
            const lowerBound = q1 - (threshold * iqr);
            const upperBound = q3 + (threshold * iqr);

            outliers[metric] = data.filter(d => d.value < lowerBound || d.value > upperBound);
        }

        return outliers;
    }

    async getDataPoints(metric, startTime, endTime) {
        const key = `metric:${metric}`;
        const dataPoints = await this.client.zRangeByScore(key, startTime, endTime);

        return dataPoints.map(point => JSON.parse(point));
    }
}
```

## Time Series Storage Optimization

### Memory-Efficient Storage

```javascript
class OptimizedTimeSeries {
    constructor(redisClient) {
        this.client = redisClient;
        this.chunkSize = 1000; // Points per chunk
        this.compressionEnabled = true;
    }

    async addDataPoint(metric, value, timestamp = Date.now()) {
        const chunkId = Math.floor(timestamp / (24 * 60 * 60 * 1000)); // Daily chunks
        const chunkKey = `chunk:${metric}:${chunkId}`;

        // Add to current chunk
        await this.client.zAdd(chunkKey, [{
            score: timestamp,
            value: value.toString()
        }]);

        // Compress old chunks
        if (this.compressionEnabled) {
            await this.compressOldChunks(metric, chunkId);
        }

        // Update metadata
        await this.updateMetadata(metric, timestamp);
    }

    async compressOldChunks(metric, currentChunkId) {
        // Compress chunks older than 7 days
        const cutoffChunkId = currentChunkId - 7;

        for (let chunkId = cutoffChunkId - 30; chunkId < cutoffChunkId; chunkId++) {
            const chunkKey = `chunk:${metric}:${chunkId}`;
            const compressedKey = `compressed:${chunkKey}`;

            // Check if already compressed
            const exists = await this.client.exists(compressedKey);
            if (exists) continue;

            // Get chunk data
            const data = await this.client.zRange(chunkKey, 0, -1, { WITHSCORES: true });
            if (data.length === 0) continue;

            // Compress using simple delta encoding
            const compressed = this.compressChunk(data);

            // Store compressed version
            await this.client.set(compressedKey, JSON.stringify(compressed));

            // Remove original chunk
            await this.client.del(chunkKey);

            // Set expiration on compressed data (keep for 90 days)
            await this.client.expire(compressedKey, 90 * 24 * 60 * 60);
        }
    }

    compressChunk(data) {
        const points = data.map(([value, score]) => ({
            value: parseFloat(value),
            timestamp: parseInt(score)
        }));

        // Simple delta encoding
        const compressed = {
            baseValue: points[0].value,
            baseTimestamp: points[0].timestamp,
            deltas: []
        };

        for (let i = 1; i < points.length; i++) {
            compressed.deltas.push({
                valueDelta: points[i].value - points[i-1].value,
                timeDelta: points[i].timestamp - points[i-1].timestamp
            });
        }

        return compressed;
    }

    async getDataPoints(metric, startTime, endTime) {
        const startChunk = Math.floor(startTime / (24 * 60 * 60 * 1000));
        const endChunk = Math.floor(endTime / (24 * 60 * 60 * 1000));

        let allPoints = [];

        for (let chunkId = startChunk; chunkId <= endChunk; chunkId++) {
            const chunkKey = `chunk:${metric}:${chunkId}`;
            const compressedKey = `compressed:chunk:${metric}:${chunkId}`;

            let points = [];

            // Try uncompressed chunk first
            const uncompressedData = await this.client.zRangeByScore(chunkKey, startTime, endTime);
            if (uncompressedData.length > 0) {
                points = uncompressedData.map(value => ({
                    value: parseFloat(value),
                    timestamp: parseInt(value.split(':')[1])
                }));
            } else {
                // Try compressed chunk
                const compressedData = await this.client.get(compressedKey);
                if (compressedData) {
                    const decompressed = this.decompressChunk(JSON.parse(compressedData));
                    points = decompressed.filter(p => p.timestamp >= startTime && p.timestamp <= endTime);
                }
            }

            allPoints.push(...points);
        }

        return allPoints.sort((a, b) => a.timestamp - b.timestamp);
    }

    decompressChunk(compressed) {
        const points = [{
            value: compressed.baseValue,
            timestamp: compressed.baseTimestamp
        }];

        let currentValue = compressed.baseValue;
        let currentTime = compressed.baseTimestamp;

        for (const delta of compressed.deltas) {
            currentValue += delta.valueDelta;
            currentTime += delta.timeDelta;

            points.push({
                value: currentValue,
                timestamp: currentTime
            });
        }

        return points;
    }

    async updateMetadata(metric, timestamp) {
        const metaKey = `meta:${metric}`;
        await this.client.hSet(metaKey, {
            lastUpdate: timestamp.toString(),
            totalChunks: await this.getChunkCount(metric)
        });
    }

    async getChunkCount(metric) {
        const pattern = `chunk:${metric}:*`;
        const keys = await this.client.keys(pattern);
        return keys.length;
    }
}
```

## Best Practices

### Data Retention Policies

```javascript
class DataRetentionManager {
    constructor(redisClient) {
        this.client = redisClient;
        this.policies = {
            'raw': 24 * 60 * 60 * 1000,      // 24 hours
            '1m': 7 * 24 * 60 * 60 * 1000,   // 7 days
            '5m': 30 * 24 * 60 * 60 * 1000,  // 30 days
            '1h': 90 * 24 * 60 * 60 * 1000,  // 90 days
            '1d': 365 * 24 * 60 * 60 * 1000   // 1 year
        };
    }

    async applyRetentionPolicy(metric, resolution = 'raw') {
        const cutoff = Date.now() - this.policies[resolution];
        const key = resolution === 'raw' ? `metric:${metric}` : `agg:${metric}:${resolution}`;

        if (resolution === 'raw') {
            // For raw data, remove old points
            await this.client.zRemRangeByScore(key, 0, cutoff);
        } else {
            // For aggregations, remove old aggregation keys
            const aggKeys = await this.client.keys(`${key}:*`);
            for (const aggKey of aggKeys) {
                const timestamp = parseInt(aggKey.split(':').pop());
                if (timestamp < cutoff) {
                    await this.client.del(aggKey);
                }
            }
        }
    }

    async cleanupOldData() {
        // Run periodically to clean up old time series data
        const metrics = await this.client.keys('meta:*');

        for (const metaKey of metrics) {
            const metric = metaKey.replace('meta:', '');
            await this.applyRetentionPolicy(metric, 'raw');
            await this.applyRetentionPolicy(metric, '1m');
            await this.applyRetentionPolicy(metric, '5m');
            await this.applyRetentionPolicy(metric, '1h');
            await this.applyRetentionPolicy(metric, '1d');
        }
    }
}
```

### Performance Monitoring

```javascript
class TimeSeriesMonitor {
    constructor(redisClient) {
        this.client = redisClient;
        this.metricsKey = 'timeseries_metrics';
    }

    async recordOperation(operation, metric, duration, dataPoints = 0) {
        const timestamp = Date.now();

        await this.client.hIncrBy(`${this.metricsKey}:operations`, operation, 1);
        await this.client.zAdd(`${this.metricsKey}:performance`, [{
            score: timestamp,
            value: JSON.stringify({ operation, metric, duration, dataPoints })
        }]);

        // Keep only last 1000 performance records
        await this.client.zRemRangeByRank(`${this.metricsKey}:performance`, 0, -1001);
    }

    async getPerformanceStats() {
        const operations = await this.client.hGetAll(`${this.metricsKey}:operations`);
        const performance = await this.client.zRange(`${this.metricsKey}:performance`, -100, -1);

        const stats = {
            totalOperations: Object.values(operations).reduce((sum, count) => sum + parseInt(count), 0),
            operationBreakdown: Object.fromEntries(
                Object.entries(operations).map(([op, count]) => [op, parseInt(count)])
            ),
            recentPerformance: performance.map(p => JSON.parse(p))
        };

        // Calculate averages
        if (stats.recentPerformance.length > 0) {
            const avgDuration = stats.recentPerformance.reduce((sum, p) => sum + p.duration, 0) /
                              stats.recentPerformance.length;
            stats.averageOperationTime = avgDuration;
        }

        return stats;
    }

    async getStorageStats() {
        const info = await this.client.info('memory');
        const keys = await this.client.keys('*:*');

        const keyTypes = {};
        for (const key of keys) {
            const type = await this.client.type(key);
            keyTypes[type] = (keyTypes[type] || 0) + 1;
        }

        return {
            memoryUsage: info.used_memory_human,
            totalKeys: keys.length,
            keyDistribution: keyTypes
        };
    }
}
```

## Conclusion

Redis time series capabilities enable efficient storage and analysis of temporal data. Start with basic sorted set operations for time-ordered data, then add aggregations, compression, and alerting for production systems.

**Beginner Tip:** Use sorted sets with timestamps as scores for basic time series storage.

**Advanced Tip:** Implement downsampling, compression, and retention policies to manage large-scale time series data efficiently.</content>
<parameter name="filePath">/Users/chhayhong/Desktop/Redis_University/time_series.md