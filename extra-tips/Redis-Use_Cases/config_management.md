# Redis Configuration Management: From Beginner to Advanced

## What is Configuration Management?

**Beginner Level:** Configuration management is about storing and managing settings for your application. Like having a central place where you keep all the configuration values that your app needs to run, such as database connections, API keys, feature flags, etc.

**Intermediate Level:** Configuration management involves storing, versioning, and distributing application settings across multiple environments and instances. Redis provides fast, reliable storage for configuration data with real-time updates.

## Why Redis for Configuration Management?

- **Fast Access:** Sub-millisecond configuration retrieval
- **Real-Time Updates:** Instant configuration changes across all instances
- **Versioning:** Track configuration changes over time
- **Environment Support:** Different configs for dev/staging/production
- **Feature Flags:** Dynamic feature toggling
- **Scalability:** Handle thousands of configuration keys

## Basic Configuration Management

### Beginner Example: Simple Configuration Storage

```javascript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

class SimpleConfigManager {
    constructor(redisClient, namespace = 'config') {
        this.client = redisClient;
        this.namespace = namespace;
    }

    async setConfig(key, value, ttl = null) {
        const configKey = `${this.namespace}:${key}`;

        // Store as JSON to support complex objects
        const serializedValue = JSON.stringify({
            value,
            updated_at: new Date().toISOString(),
            type: typeof value
        });

        if (ttl) {
            await this.client.setEx(configKey, ttl, serializedValue);
        } else {
            await this.client.set(configKey, serializedValue);
        }
    }

    async getConfig(key, defaultValue = null) {
        const configKey = `${this.namespace}:${key}`;
        const data = await this.client.get(configKey);

        if (!data) return defaultValue;

        try {
            const parsed = JSON.parse(data);
            return parsed.value;
        } catch (error) {
            console.warn(`Failed to parse config for key ${key}:`, error);
            return defaultValue;
        }
    }

    async getAllConfig() {
        const pattern = `${this.namespace}:*`;
        const keys = await this.client.keys(pattern);

        const config = {};
        for (const key of keys) {
            const configKey = key.replace(`${this.namespace}:`, '');
            config[configKey] = await this.getConfig(configKey);
        }

        return config;
    }

    async deleteConfig(key) {
        const configKey = `${this.namespace}:${key}`;
        return await this.client.del(configKey);
    }

    async existsConfig(key) {
        const configKey = `${this.namespace}:${key}`;
        return await this.client.exists(configKey);
    }
}

// Example usage
const config = new SimpleConfigManager(client);

// Store application configuration
await config.setConfig('database_url', 'postgresql://localhost:5432/myapp');
await config.setConfig('redis_url', 'redis://localhost:6379');
await config.setConfig('api_key', 'sk-1234567890abcdef');
await config.setConfig('debug_mode', true);
await config.setConfig('max_connections', 100);

// Temporary configuration (expires in 1 hour)
await config.setConfig('maintenance_mode', true, 3600);

// Retrieve configuration
const dbUrl = await config.getConfig('database_url');
const debugMode = await config.getConfig('debug_mode');
const apiKey = await config.getConfig('api_key');

console.log('Database URL:', dbUrl);
console.log('Debug mode:', debugMode);
console.log('API Key exists:', await config.existsConfig('api_key'));

// Get all configuration
const allConfig = await config.getAllConfig();
console.log('All config:', allConfig);
```

### Intermediate Example: Environment-Based Configuration

```javascript
class EnvironmentConfigManager {
    constructor(redisClient) {
        this.client = redisClient;
        this.environments = ['development', 'staging', 'production'];
        this.currentEnv = process.env.NODE_ENV || 'development';
    }

    async setConfig(key, value, environment = null, ttl = null) {
        const targetEnv = environment || this.currentEnv;

        if (!this.environments.includes(targetEnv)) {
            throw new Error(`Invalid environment: ${targetEnv}`);
        }

        const configKey = `config:${targetEnv}:${key}`;

        const configData = {
            value,
            environment: targetEnv,
            updated_at: new Date().toISOString(),
            updated_by: process.env.USER || 'system',
            type: typeof value
        };

        const serializedValue = JSON.stringify(configData);

        if (ttl) {
            await this.client.setEx(configKey, ttl, serializedValue);
        } else {
            await this.client.set(configKey, serializedValue);
        }

        // Update global config index
        await this.client.sAdd(`config_index:${targetEnv}`, key);
    }

    async getConfig(key, environment = null) {
        const targetEnv = environment || this.currentEnv;
        const configKey = `config:${targetEnv}:${key}`;

        const data = await this.client.get(configKey);

        if (data) {
            const parsed = JSON.parse(data);
            return parsed.value;
        }

        // Fallback to default environment if not found
        if (targetEnv !== 'development') {
            return await this.getConfig(key, 'development');
        }

        return null;
    }

    async getEnvironmentConfig(environment = null) {
        const targetEnv = environment || this.currentEnv;
        const configKeys = await this.client.sMembers(`config_index:${targetEnv}`);

        const config = {};
        for (const key of configKeys) {
            config[key] = await this.getConfig(key, targetEnv);
        }

        return config;
    }

    async copyConfig(fromEnv, toEnv, keys = null) {
        const sourceKeys = keys || await this.client.sMembers(`config_index:${fromEnv}`);

        for (const key of sourceKeys) {
            const value = await this.getConfig(key, fromEnv);
            if (value !== null) {
                await this.setConfig(key, value, toEnv);
            }
        }
    }

    async compareEnvironments(env1, env2) {
        const config1 = await this.getEnvironmentConfig(env1);
        const config2 = await this.getEnvironmentConfig(env2);

        const differences = {
            onlyInEnv1: [],
            onlyInEnv2: [],
            different: []
        };

        const allKeys = new Set([...Object.keys(config1), ...Object.keys(config2)]);

        for (const key of allKeys) {
            const value1 = config1[key];
            const value2 = config2[key];

            if (value1 === undefined) {
                differences.onlyInEnv2.push({ key, value: value2 });
            } else if (value2 === undefined) {
                differences.onlyInEnv1.push({ key, value: value1 });
            } else if (JSON.stringify(value1) !== JSON.stringify(value2)) {
                differences.different.push({ key, env1Value: value1, env2Value: value2 });
            }
        }

        return differences;
    }

    async promoteConfig(fromEnv, toEnv, keys = null) {
        // Copy configuration from one environment to another (e.g., staging to production)
        await this.copyConfig(fromEnv, toEnv, keys);

        // Log the promotion
        const promotionLog = {
            from: fromEnv,
            to: toEnv,
            keys: keys || 'all',
            timestamp: new Date().toISOString(),
            promoted_by: process.env.USER || 'system'
        };

        await this.client.zAdd('config_promotions', [{
            score: Date.now(),
            value: JSON.stringify(promotionLog)
        }]);
    }
}

// Example usage
const envConfig = new EnvironmentConfigManager(client);

// Set development configuration
await envConfig.setConfig('database_url', 'postgresql://localhost:5432/dev_db', 'development');
await envConfig.setConfig('api_timeout', 5000, 'development');
await envConfig.setConfig('feature_x_enabled', true, 'development');

// Set production configuration
await envConfig.setConfig('database_url', 'postgresql://prod-server:5432/prod_db', 'production');
await envConfig.setConfig('api_timeout', 30000, 'production');
await envConfig.setConfig('feature_x_enabled', false, 'production');

// Get current environment config
const currentConfig = await envConfig.getEnvironmentConfig();
console.log('Current environment config:', currentConfig);

// Compare environments
const comparison = await envConfig.compareEnvironments('development', 'production');
console.log('Environment differences:', comparison);

// Promote staging to production
await envConfig.promoteConfig('staging', 'production');
```

## Advanced Configuration Management

### Configuration Versioning and Rollback

```javascript
class VersionedConfigManager {
    constructor(redisClient) {
        this.client = redisClient;
        this.maxVersions = 50; // Keep last 50 versions
    }

    async setConfig(key, value, author = 'system', comment = '') {
        const timestamp = Date.now();
        const version = `v${timestamp}`;

        // Get current value for comparison
        const currentValue = await this.getConfig(key);

        // Create version entry
        const versionData = {
            key,
            value,
            version,
            timestamp,
            author,
            comment,
            previous_value: currentValue
        };

        // Store version
        await this.client.set(`config_version:${key}:${version}`, JSON.stringify(versionData));

        // Update version history
        await this.client.zAdd(`config_history:${key}`, [{
            score: timestamp,
            value: version
        }]);

        // Set current value
        await this.setCurrentConfig(key, value, version);

        // Clean up old versions
        await this.cleanupOldVersions(key);

        return version;
    }

    async setCurrentConfig(key, value, version) {
        const currentData = {
            value,
            version,
            updated_at: new Date().toISOString()
        };

        await this.client.set(`config:current:${key}`, JSON.stringify(currentData));
    }

    async getConfig(key) {
        const data = await this.client.get(`config:current:${key}`);
        return data ? JSON.parse(data).value : null;
    }

    async getConfigWithMetadata(key) {
        const data = await this.client.get(`config:current:${key}`);
        return data ? JSON.parse(data) : null;
    }

    async rollbackConfig(key, targetVersion, author = 'system') {
        // Get the target version data
        const versionData = await this.client.get(`config_version:${key}:${targetVersion}`);

        if (!versionData) {
            throw new Error(`Version ${targetVersion} not found for key ${key}`);
        }

        const parsedVersion = JSON.parse(versionData);

        // Create rollback version
        const rollbackComment = `Rolled back to version ${targetVersion}`;
        await this.setConfig(key, parsedVersion.value, author, rollbackComment);

        return parsedVersion.value;
    }

    async getVersionHistory(key, limit = 10) {
        const versions = await this.client.zRange(
            `config_history:${key}`,
            -limit,
            -1,
            { WITHSCORES: true, REV: true }
        );

        const history = [];
        for (const [version, score] of versions) {
            const versionData = await this.client.get(`config_version:${key}:${version}`);
            if (versionData) {
                history.push(JSON.parse(versionData));
            }
        }

        return history;
    }

    async compareVersions(key, version1, version2) {
        const v1Data = await this.client.get(`config_version:${key}:${version1}`);
        const v2Data = await this.client.get(`config_version:${key}:${version2}`);

        if (!v1Data || !v2Data) {
            throw new Error('One or both versions not found');
        }

        const v1 = JSON.parse(v1Data);
        const v2 = JSON.parse(v2Data);

        return {
            key,
            version1: { version: version1, value: v1.value, timestamp: v1.timestamp },
            version2: { version: version2, value: v2.value, timestamp: v2.timestamp },
            changed: JSON.stringify(v1.value) !== JSON.stringify(v2.value)
        };
    }

    async cleanupOldVersions(key) {
        const versionCount = await this.client.zCard(`config_history:${key}`);

        if (versionCount > this.maxVersions) {
            // Remove oldest versions
            const versionsToRemove = await this.client.zRange(
                `config_history:${key}`,
                0,
                versionCount - this.maxVersions - 1
            );

            for (const version of versionsToRemove) {
                await this.client.del(`config_version:${key}:${version}`);
            }

            await this.client.zRemRangeByRank(`config_history:${key}`, 0, versionCount - this.maxVersions - 1);
        }
    }

    async exportConfig(keys = null) {
        const targetKeys = keys || await this.client.keys('config:current:*');
        const exportData = {
            exported_at: new Date().toISOString(),
            configs: {}
        };

        for (const key of targetKeys) {
            const configKey = key.replace('config:current:', '');
            const configData = await this.getConfigWithMetadata(configKey);

            if (configData) {
                exportData.configs[configKey] = configData;
            }
        }

        return exportData;
    }

    async importConfig(exportData, author = 'system') {
        for (const [key, configData] of Object.entries(exportData.configs)) {
            await this.setConfig(key, configData.value, author, 'Imported configuration');
        }
    }
}

// Example usage with versioning
const versionedConfig = new VersionedConfigManager(client);

// Set configuration with versioning
const v1 = await versionedConfig.setConfig('max_connections', 100, 'admin', 'Initial configuration');
const v2 = await versionedConfig.setConfig('max_connections', 150, 'admin', 'Increased for higher load');
const v3 = await versionedConfig.setConfig('max_connections', 200, 'admin', 'Further increase');

// Get current value
const currentValue = await versionedConfig.getConfig('max_connections');
console.log('Current max connections:', currentValue);

// Get version history
const history = await versionedConfig.getVersionHistory('max_connections');
console.log('Version history:', history.map(h => ({ version: h.version, value: h.value, comment: h.comment })));

// Rollback to previous version
await versionedConfig.rollbackConfig('max_connections', v2, 'admin');
console.log('After rollback:', await versionedConfig.getConfig('max_connections'));

// Compare versions
const comparison = await versionedConfig.compareVersions('max_connections', v1, v3);
console.log('Version comparison:', comparison);
```

### Real-Time Configuration Updates

```javascript
class RealTimeConfigManager {
    constructor(redisClient) {
        this.client = redisClient;
        this.subscribers = new Map();
        this.localCache = new Map();
        this.cacheTTL = 30000; // 30 seconds
    }

    async subscribeToConfigUpdates(configKeys, callback) {
        // Note: In production, you'd use Redis pub/sub
        // For this example, we'll use polling

        const subscriptionId = `sub_${Date.now()}_${Math.random()}`;

        const checkForUpdates = async () => {
            const updates = {};

            for (const key of configKeys) {
                const currentValue = await this.getConfig(key);
                const cachedValue = this.localCache.get(key);

                if (JSON.stringify(currentValue) !== JSON.stringify(cachedValue)) {
                    updates[key] = currentValue;
                    this.localCache.set(key, currentValue);
                }
            }

            if (Object.keys(updates).length > 0) {
                try {
                    await callback(updates);
                } catch (error) {
                    console.error('Config update callback error:', error);
                }
            }
        };

        // Initial check
        await checkForUpdates();

        // Set up polling
        const interval = setInterval(checkForUpdates, 5000); // Check every 5 seconds

        this.subscribers.set(subscriptionId, {
            keys: configKeys,
            callback,
            interval
        });

        return subscriptionId;
    }

    async unsubscribeFromConfigUpdates(subscriptionId) {
        const subscription = this.subscribers.get(subscriptionId);
        if (subscription) {
            clearInterval(subscription.interval);
            this.subscribers.delete(subscriptionId);
        }
    }

    async setConfig(key, value, notify = true) {
        const configData = {
            value,
            updated_at: new Date().toISOString(),
            version: Date.now().toString()
        };

        await this.client.set(`config:current:${key}`, JSON.stringify(configData));

        if (notify) {
            // In production, publish to Redis channel
            // await this.client.publish(`config_updates:${key}`, JSON.stringify(configData));
        }

        // Update local cache
        this.localCache.set(key, value);

        return configData.version;
    }

    async getConfig(key, useCache = true) {
        // Check local cache first
        if (useCache) {
            const cached = this.localCache.get(key);
            if (cached !== undefined) {
                return cached;
            }
        }

        const data = await this.client.get(`config:current:${key}`);
        if (!data) return null;

        const parsed = JSON.parse(data);
        const value = parsed.value;

        // Update cache
        if (useCache) {
            this.localCache.set(key, value);
        }

        return value;
    }

    async watchConfig(key, callback) {
        // Watch for changes to a specific config key
        return await this.subscribeToConfigUpdates([key], (updates) => {
            if (updates[key] !== undefined) {
                callback(key, updates[key]);
            }
        });
    }

    async getConfigWithVersion(key) {
        const data = await this.client.get(`config:current:${key}`);
        return data ? JSON.parse(data) : null;
    }

    async forceRefresh(keys = null) {
        const targetKeys = keys || Array.from(this.localCache.keys());

        for (const key of targetKeys) {
            this.localCache.delete(key);
            await this.getConfig(key, true); // Refresh cache
        }
    }
}

// Example usage with real-time updates
const realtimeConfig = new RealTimeConfigManager(client);

// Set initial configuration
await realtimeConfig.setConfig('feature_flag_new_ui', false);
await realtimeConfig.setConfig('maintenance_mode', false);

// Subscribe to configuration updates
const subscriptionId = await realtimeConfig.subscribeToConfigUpdates(
    ['feature_flag_new_ui', 'maintenance_mode'],
    (updates) => {
        console.log('Configuration updated:', updates);

        if (updates.feature_flag_new_ui) {
            console.log('New UI feature is now enabled!');
        }

        if (updates.maintenance_mode) {
            console.log('System is entering maintenance mode...');
        }
    }
);

// Watch a specific config
const watchId = await realtimeConfig.watchConfig('feature_flag_new_ui', (key, value) => {
    console.log(`Feature flag ${key} changed to:`, value);
});

// Simulate configuration changes
setTimeout(async () => {
    console.log('Enabling new UI feature...');
    await realtimeConfig.setConfig('feature_flag_new_ui', true);
}, 2000);

setTimeout(async () => {
    console.log('Entering maintenance mode...');
    await realtimeConfig.setConfig('maintenance_mode', true);
}, 4000);

setTimeout(async () => {
    console.log('Exiting maintenance mode...');
    await realtimeConfig.setConfig('maintenance_mode', false);
}, 6000);

// Cleanup after 10 seconds
setTimeout(async () => {
    await realtimeConfig.unsubscribeFromConfigUpdates(subscriptionId);
    await realtimeConfig.unsubscribeFromConfigUpdates(watchId);
    console.log('Unsubscribed from config updates');
}, 10000);
```

### Feature Flags and A/B Testing

```javascript
class FeatureFlagManager {
    constructor(redisClient) {
        this.client = redisClient;
        this.flags = new Map();
    }

    async createFeatureFlag(flagName, config) {
        const flagConfig = {
            name: flagName,
            enabled: config.enabled || false,
            rollout_percentage: config.rollout_percentage || 0,
            conditions: config.conditions || {},
            created_at: new Date().toISOString(),
            ...config
        };

        await this.client.set(`feature_flag:${flagName}`, JSON.stringify(flagConfig));
        this.flags.set(flagName, flagConfig);

        return flagConfig;
    }

    async isFeatureEnabled(flagName, userContext = {}) {
        const flag = await this.getFeatureFlag(flagName);
        if (!flag) return false;

        if (!flag.enabled) return false;

        // Check rollout percentage
        if (flag.rollout_percentage < 100) {
            const userId = userContext.userId || 'anonymous';
            const hash = this.simpleHash(userId + flagName);
            const userPercentage = (hash % 100) + 1;

            if (userPercentage > flag.rollout_percentage) {
                return false;
            }
        }

        // Check custom conditions
        if (flag.conditions) {
            return this.evaluateConditions(flag.conditions, userContext);
        }

        return true;
    }

    async getFeatureFlag(flagName) {
        if (this.flags.has(flagName)) {
            return this.flags.get(flagName);
        }

        const data = await this.client.get(`feature_flag:${flagName}`);
        if (!data) return null;

        const flag = JSON.parse(data);
        this.flags.set(flagName, flag);
        return flag;
    }

    async updateFeatureFlag(flagName, updates) {
        const currentFlag = await this.getFeatureFlag(flagName);
        if (!currentFlag) {
            throw new Error(`Feature flag ${flagName} not found`);
        }

        const updatedFlag = {
            ...currentFlag,
            ...updates,
            updated_at: new Date().toISOString()
        };

        await this.client.set(`feature_flag:${flagName}`, JSON.stringify(updatedFlag));
        this.flags.set(flagName, updatedFlag);

        return updatedFlag;
    }

    async deleteFeatureFlag(flagName) {
        await this.client.del(`feature_flag:${flagName}`);
        this.flags.delete(flagName);
    }

    async listFeatureFlags() {
        const keys = await this.client.keys('feature_flag:*');
        const flags = [];

        for (const key of keys) {
            const flagName = key.replace('feature_flag:', '');
            const flag = await this.getFeatureFlag(flagName);
            if (flag) {
                flags.push(flag);
            }
        }

        return flags;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    evaluateConditions(conditions, userContext) {
        // Simple condition evaluation (can be extended)
        for (const [key, expectedValue] of Object.entries(conditions)) {
            const actualValue = userContext[key];

            if (Array.isArray(expectedValue)) {
                if (!expectedValue.includes(actualValue)) {
                    return false;
                }
            } else if (actualValue !== expectedValue) {
                return false;
            }
        }

        return true;
    }

    async createABTest(testName, config) {
        const testConfig = {
            name: testName,
            variants: config.variants || ['control', 'treatment'],
            traffic_distribution: config.traffic_distribution || [50, 50],
            conditions: config.conditions || {},
            metrics: config.metrics || [],
            start_date: config.start_date || new Date().toISOString(),
            end_date: config.end_date,
            status: 'active',
            ...config
        };

        // Validate traffic distribution
        const total = testConfig.traffic_distribution.reduce((a, b) => a + b, 0);
        if (total !== 100) {
            throw new Error('Traffic distribution must sum to 100');
        }

        await this.client.set(`ab_test:${testName}`, JSON.stringify(testConfig));
        return testConfig;
    }

    async getVariant(testName, userId) {
        const test = await this.getABTest(testName);
        if (!test || test.status !== 'active') {
            return 'control'; // Default variant
        }

        // Check if user meets conditions
        if (test.conditions && !this.evaluateConditions(test.conditions, { userId })) {
            return 'control';
        }

        // Assign variant based on user ID hash
        const hash = this.simpleHash(userId + testName);
        const percentage = (hash % 100) + 1;

        let cumulative = 0;
        for (let i = 0; i < test.variants.length; i++) {
            cumulative += test.traffic_distribution[i];
            if (percentage <= cumulative) {
                return test.variants[i];
            }
        }

        return test.variants[0]; // Fallback
    }

    async getABTest(testName) {
        const data = await this.client.get(`ab_test:${testName}`);
        return data ? JSON.parse(data) : null;
    }

    async trackMetric(testName, variant, metricName, value, userId) {
        const timestamp = Date.now();
        const metricKey = `ab_metric:${testName}:${variant}:${metricName}`;

        // Store individual metric values
        await this.client.zAdd(metricKey, [{
            score: timestamp,
            value: JSON.stringify({ value, userId, timestamp })
        }]);

        // Update aggregate statistics
        const statsKey = `ab_stats:${testName}:${variant}:${metricName}`;
        const currentStats = await this.client.hGetAll(statsKey);

        const count = (parseInt(currentStats.count) || 0) + 1;
        const sum = (parseFloat(currentStats.sum) || 0) + value;
        const min = Math.min(parseFloat(currentStats.min) || Infinity, value);
        const max = Math.max(parseFloat(currentStats.max) || -Infinity, value);

        await this.client.hSet(statsKey, {
            count: count.toString(),
            sum: sum.toString(),
            min: min.toString(),
            max: max.toString(),
            avg: (sum / count).toString(),
            last_updated: new Date().toISOString()
        });
    }

    async getABTestResults(testName) {
        const test = await this.getABTest(testName);
        if (!test) return null;

        const results = {
            test: testName,
            variants: {}
        };

        for (const variant of test.variants) {
            results.variants[variant] = {};

            for (const metric of test.metrics) {
                const statsKey = `ab_stats:${testName}:${variant}:${metric}`;
                const stats = await this.client.hGetAll(statsKey);

                if (Object.keys(stats).length > 0) {
                    results.variants[variant][metric] = {
                        count: parseInt(stats.count),
                        average: parseFloat(stats.avg),
                        min: parseFloat(stats.min),
                        max: parseFloat(stats.max),
                        sum: parseFloat(stats.sum)
                    };
                }
            }
        }

        return results;
    }
}

// Example usage with feature flags and A/B testing
const featureManager = new FeatureFlagManager(client);

// Create feature flags
await featureManager.createFeatureFlag('new_checkout_flow', {
    enabled: true,
    rollout_percentage: 25, // 25% of users
    conditions: { user_type: 'premium' }
});

await featureManager.createFeatureFlag('dark_mode', {
    enabled: true,
    rollout_percentage: 100 // All users
});

// Check if features are enabled for users
const user1 = { userId: 'user123', user_type: 'premium' };
const user2 = { userId: 'user456', user_type: 'basic' };

console.log('User 1 new checkout:', await featureManager.isFeatureEnabled('new_checkout_flow', user1));
console.log('User 2 new checkout:', await featureManager.isFeatureEnabled('new_checkout_flow', user2));
console.log('User 1 dark mode:', await featureManager.isFeatureEnabled('dark_mode', user1));

// Create A/B test
await featureManager.createABTest('homepage_design', {
    variants: ['original', 'redesign'],
    traffic_distribution: [70, 30],
    metrics: ['conversion_rate', 'time_on_page'],
    conditions: { country: ['US', 'CA'] }
});

// Get variant for users
console.log('User 1 variant:', await featureManager.getVariant('homepage_design', 'user123'));
console.log('User 2 variant:', await featureManager.getVariant('homepage_design', 'user456'));

// Track metrics
await featureManager.trackMetric('homepage_design', 'original', 'conversion_rate', 0.05, 'user123');
await featureManager.trackMetric('homepage_design', 'redesign', 'conversion_rate', 0.08, 'user456');
await featureManager.trackMetric('homepage_design', 'original', 'time_on_page', 120, 'user123');
await featureManager.trackMetric('homepage_design', 'redesign', 'time_on_page', 150, 'user456');

// Get test results
const results = await featureManager.getABTestResults('homepage_design');
console.log('A/B test results:', results);
```

## Configuration Security and Access Control

### Secure Configuration Management

```javascript
class SecureConfigManager {
    constructor(redisClient) {
        this.client = redisClient;
        this.encryptionKey = process.env.CONFIG_ENCRYPTION_KEY;
    }

    async setSecureConfig(key, value, sensitivity = 'low') {
        const configData = {
            value,
            sensitivity,
            encrypted: sensitivity === 'high',
            created_at: new Date().toISOString()
        };

        if (configData.encrypted) {
            configData.value = this.encrypt(value);
        }

        await this.client.set(`secure_config:${key}`, JSON.stringify(configData));

        // Log access for audit
        await this.logAccess(key, 'write', process.env.USER || 'system');
    }

    async getSecureConfig(key, userRole = 'user') {
        const data = await this.client.get(`secure_config:${key}`);
        if (!data) return null;

        const configData = JSON.parse(data);

        // Check access permissions
        if (!this.hasAccess(configData.sensitivity, userRole)) {
            throw new Error(`Access denied for config key: ${key}`);
        }

        let value = configData.value;
        if (configData.encrypted) {
            value = this.decrypt(value);
        }

        // Log access for audit
        await this.logAccess(key, 'read', process.env.USER || 'system');

        return value;
    }

    hasAccess(sensitivity, userRole) {
        const accessMatrix = {
            'low': ['user', 'admin'],
            'medium': ['admin'],
            'high': ['admin']
        };

        return accessMatrix[sensitivity]?.includes(userRole) || false;
    }

    encrypt(text) {
        // Simple XOR encryption (use proper encryption in production!)
        if (!this.encryptionKey) {
            throw new Error('Encryption key not configured');
        }

        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length));
        }
        return Buffer.from(result).toString('base64');
    }

    decrypt(encryptedText) {
        // Simple XOR decryption
        if (!this.encryptionKey) {
            throw new Error('Encryption key not configured');
        }

        const text = Buffer.from(encryptedText, 'base64').toString();
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length));
        }
        return result;
    }

    async logAccess(key, action, user) {
        const logEntry = {
            key,
            action,
            user,
            timestamp: new Date().toISOString(),
            ip: 'system' // In production, get from request
        };

        await this.client.zAdd('config_access_log', [{
            score: Date.now(),
            value: JSON.stringify(logEntry)
        }]);

        // Keep only last 1000 log entries
        await this.client.zRemRangeByRank('config_access_log', 0, -1001);
    }

    async getAccessLog(key = null, limit = 50) {
        let logEntries = await this.client.zRange(
            'config_access_log',
            -limit,
            -1,
            { REV: true }
        );

        let parsedEntries = logEntries.map(entry => JSON.parse(entry));

        if (key) {
            parsedEntries = parsedEntries.filter(entry => entry.key === key);
        }

        return parsedEntries;
    }

    async rotateEncryptionKey(newKey) {
        // Get all encrypted configs
        const keys = await this.client.keys('secure_config:*');

        for (const key of keys) {
            const data = await this.client.get(key);
            const configData = JSON.parse(data);

            if (configData.encrypted) {
                // Decrypt with old key and re-encrypt with new key
                const decryptedValue = this.decrypt(configData.value);
                configData.value = this.encryptWithKey(decryptedValue, newKey);
                configData.key_rotated_at = new Date().toISOString();

                await this.client.set(key, JSON.stringify(configData));
            }
        }

        this.encryptionKey = newKey;
    }

    encryptWithKey(text, key) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return Buffer.from(result).toString('base64');
    }
}

// Example usage with secure configuration
const secureConfig = new SecureConfigManager(client);

// Set secure configurations
await secureConfig.setSecureConfig('api_secret', 'sk-1234567890abcdef', 'high');
await secureConfig.setSecureConfig('db_password', 'super_secret_password', 'high');
await secureConfig.setSecureConfig('public_api_key', 'pk-abcdef123456', 'low');

// Access configurations with different roles
try {
    const secret = await secureConfig.getSecureConfig('api_secret', 'admin');
    console.log('API Secret:', secret);
} catch (error) {
    console.error('Access denied:', error.message);
}

try {
    const publicKey = await secureConfig.getSecureConfig('public_api_key', 'user');
    console.log('Public API Key:', publicKey);
} catch (error) {
    console.error('Access denied:', error.message);
}

// View access logs
const accessLog = await secureConfig.getAccessLog();
console.log('Access log:', accessLog.slice(0, 3));
```

## Best Practices

### Configuration Validation and Schema

```javascript
class ValidatedConfigManager {
    constructor(redisClient) {
        this.client = redisClient;
        this.schemas = new Map();
    }

    defineSchema(configType, schema) {
        this.schemas.set(configType, schema);
    }

    async setValidatedConfig(key, value, configType) {
        const schema = this.schemas.get(configType);
        if (!schema) {
            throw new Error(`No schema defined for config type: ${configType}`);
        }

        // Validate configuration
        const validation = this.validateConfig(value, schema);
        if (!validation.valid) {
            throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
        }

        // Store with type information
        const configData = {
            value,
            type: configType,
            validated_at: new Date().toISOString(),
            schema_version: schema.version || '1.0'
        };

        await this.client.set(`validated_config:${key}`, JSON.stringify(configData));
    }

    async getValidatedConfig(key) {
        const data = await this.client.get(`validated_config:${key}`);
        return data ? JSON.parse(data).value : null;
    }

    validateConfig(value, schema) {
        const errors = [];

        // Type validation
        if (schema.type && typeof value !== schema.type) {
            errors.push(`Expected type ${schema.type}, got ${typeof value}`);
        }

        // Required fields
        if (schema.required) {
            for (const field of schema.required) {
                if (value[field] === undefined) {
                    errors.push(`Required field missing: ${field}`);
                }
            }
        }

        // Field validations
        if (schema.properties) {
            for (const [field, fieldSchema] of Object.entries(schema.properties)) {
                const fieldValue = value[field];

                if (fieldValue !== undefined) {
                    if (fieldSchema.type && typeof fieldValue !== fieldSchema.type) {
                        errors.push(`Field ${field}: expected ${fieldSchema.type}, got ${typeof fieldValue}`);
                    }

                    if (fieldSchema.min !== undefined && fieldValue < fieldSchema.min) {
                        errors.push(`Field ${field}: value ${fieldValue} below minimum ${fieldSchema.min}`);
                    }

                    if (fieldSchema.max !== undefined && fieldValue > fieldSchema.max) {
                        errors.push(`Field ${field}: value ${fieldValue} above maximum ${fieldSchema.max}`);
                    }

                    if (fieldSchema.enum && !fieldSchema.enum.includes(fieldValue)) {
                        errors.push(`Field ${field}: value ${fieldValue} not in allowed values ${fieldSchema.enum.join(', ')}`);
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    async migrateConfig(key, newSchema) {
        const currentData = await this.client.get(`validated_config:${key}`);
        if (!currentData) return;

        const configData = JSON.parse(currentData);

        // Apply migration transformations (simplified)
        if (newSchema.migrations && newSchema.migrations[configData.schema_version]) {
            const migration = newSchema.migrations[configData.schema_version];
            configData.value = migration(configData.value);
            configData.schema_version = newSchema.version || '1.0';
        }

        // Re-validate with new schema
        const validation = this.validateConfig(configData.value, newSchema);
        if (!validation.valid) {
            throw new Error(`Migration failed validation: ${validation.errors.join(', ')}`);
        }

        configData.migrated_at = new Date().toISOString();
        await this.client.set(`validated_config:${key}`, JSON.stringify(configData));
    }
}

// Example usage with validation
const validatedConfig = new ValidatedConfigManager(client);

// Define configuration schemas
validatedConfig.defineSchema('database_config', {
    type: 'object',
    required: ['host', 'port', 'database'],
    properties: {
        host: { type: 'string' },
        port: { type: 'number', min: 1, max: 65535 },
        database: { type: 'string' },
        max_connections: { type: 'number', min: 1, max: 1000 },
        ssl: { type: 'boolean' }
    }
});

validatedConfig.defineSchema('api_config', {
    type: 'object',
    required: ['base_url', 'timeout'],
    properties: {
        base_url: { type: 'string' },
        timeout: { type: 'number', min: 100, max: 300000 },
        retries: { type: 'number', min: 0, max: 10 },
        headers: { type: 'object' }
    }
});

// Set validated configurations
try {
    await validatedConfig.setValidatedConfig('prod_database', {
        host: 'prod-db.example.com',
        port: 5432,
        database: 'myapp',
        max_connections: 100,
        ssl: true
    }, 'database_config');

    console.log('Database config set successfully');
} catch (error) {
    console.error('Database config validation failed:', error.message);
}

try {
    await validatedConfig.setValidatedConfig('api_settings', {
        base_url: 'https://api.example.com',
        timeout: 30000,
        retries: 3,
        headers: { 'Authorization': 'Bearer token' }
    }, 'api_config');

    console.log('API config set successfully');
} catch (error) {
    console.error('API config validation failed:', error.message);
}

// Retrieve validated configurations
const dbConfig = await validatedConfig.getValidatedConfig('prod_database');
const apiConfig = await validatedConfig.getValidatedConfig('api_settings');

console.log('Database config:', dbConfig);
console.log('API config:', apiConfig);
```

## Conclusion

Redis configuration management enables centralized, real-time configuration for distributed applications. Start with basic key-value storage, then add environment support, versioning, and security features for production use.

**Beginner Tip:** Use JSON serialization to store complex configuration objects in Redis strings.

**Advanced Tip:** Implement configuration versioning and rollback capabilities for zero-downtime configuration updates.
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