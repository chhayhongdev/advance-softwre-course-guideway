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

// Configuration Management example - storing and managing application configuration
class ConfigManager {
    constructor(redisClient, appName = 'default') {
        this.client = redisClient;
        this.appName = appName;
        this.configKey = `config:${appName}`;
        this.historyKey = `config:${appName}:history`;
        this.versionsKey = `config:${appName}:versions`;
    }

    // Set configuration value
    async setConfig(key, value, metadata = {}) {
        const configKey = `${this.configKey}:${key}`;

        const configData = {
            key,
            value: JSON.stringify(value),
            type: typeof value,
            updatedAt: new Date().toISOString(),
            updatedBy: metadata.user || 'system',
            version: Date.now().toString(),
            ...metadata
        };

        // Store current value
        await this.client.hSet(configKey, configData);

        // Add to history
        await this.client.zAdd(this.historyKey, [
            { score: Date.now(), value: JSON.stringify(configData) }
        ]);

        // Keep only last 100 history entries
        await this.client.zRemRangeByRank(this.historyKey, 0, -101);

        // Add to versions index
        await this.client.sAdd(this.versionsKey, configData.version);

        console.log(`Set config: ${key} = ${JSON.stringify(value)}`);
    }

    // Get configuration value
    async getConfig(key, defaultValue = null) {
        const configKey = `${this.configKey}:${key}`;
        const data = await this.client.hGetAll(configKey);

        if (!data.value) {
            return defaultValue;
        }

        try {
            return JSON.parse(data.value);
        } catch (error) {
            // If JSON parsing fails, return as string
            return data.value;
        }
    }

    // Get all configuration
    async getAllConfig() {
        const pattern = `${this.configKey}:*`;
        const keys = await this.client.keys(pattern);
        const config = {};

        for (const key of keys) {
            const configKey = key.replace(`${this.configKey}:`, '');
            const value = await this.getConfig(configKey);
            if (value !== null) {
                config[configKey] = value;
            }
        }

        return config;
    }

    // Set multiple configuration values
    async setBulkConfig(configObject, metadata = {}) {
        const pipeline = this.client.multi();

        for (const [key, value] of Object.entries(configObject)) {
            const configKey = `${this.configKey}:${key}`;

            const configData = {
                key,
                value: JSON.stringify(value),
                type: typeof value,
                updatedAt: new Date().toISOString(),
                updatedBy: metadata.user || 'system',
                version: Date.now().toString(),
                ...metadata
            };

            pipeline.hSet(configKey, configData);
            pipeline.zAdd(this.historyKey, [{ score: Date.now(), value: JSON.stringify(configData) }]);
            pipeline.sAdd(this.versionsKey, configData.version);
        }

        const results = await pipeline.exec();
        console.log(`Set ${Object.keys(configObject).length} configuration values`);
        return results.length;
    }

    // Delete configuration key
    async deleteConfig(key) {
        const configKey = `${this.configKey}:${key}`;

        // Get current value before deletion for history
        const currentData = await this.client.hGetAll(configKey);
        if (currentData.value) {
            const deleteRecord = {
                key,
                value: null,
                type: 'deletion',
                updatedAt: new Date().toISOString(),
                updatedBy: 'system',
                version: Date.now().toString(),
                deleted: true
            };

            await this.client.zAdd(this.historyKey, [
                { score: Date.now(), value: JSON.stringify(deleteRecord) }
            ]);
        }

        const deleted = await this.client.del(configKey);
        console.log(`Deleted config: ${key}`);
        return deleted > 0;
    }

    // Get configuration history
    async getConfigHistory(key, limit = 10) {
        const history = await this.client.zRevRangeWithScores(this.historyKey, 0, limit - 1);

        return history
            .map(item => JSON.parse(item.value))
            .filter(record => record.key === key)
            .slice(0, limit);
    }

    // Create configuration snapshot
    async createSnapshot(name, description = '') {
        const allConfig = await this.getAllConfig();
        const snapshot = {
            name,
            description,
            config: allConfig,
            createdAt: new Date().toISOString(),
            version: Date.now().toString()
        };

        const snapshotKey = `config:${this.appName}:snapshot:${name}`;
        await this.client.set(snapshotKey, JSON.stringify(snapshot));

        // Add to snapshots index
        await this.client.sAdd(`config:${this.appName}:snapshots`, name);

        console.log(`Created configuration snapshot: ${name}`);
        return snapshot;
    }

    // Load configuration from snapshot
    async loadSnapshot(name) {
        const snapshotKey = `config:${this.appName}:snapshot:${name}`;
        const snapshotData = await this.client.get(snapshotKey);

        if (!snapshotData) {
            throw new Error(`Snapshot ${name} not found`);
        }

        const snapshot = JSON.parse(snapshotData);
        await this.setBulkConfig(snapshot.config, {
            user: 'system',
            source: `snapshot:${name}`
        });

        console.log(`Loaded configuration from snapshot: ${name}`);
        return snapshot;
    }

    // Get configuration by environment
    async setEnvironmentConfig(environment, config) {
        const envKey = `config:${this.appName}:env:${environment}`;
        await this.client.set(envKey, JSON.stringify(config));
        console.log(`Set configuration for environment: ${environment}`);
    }

    async getEnvironmentConfig(environment) {
        const envKey = `config:${this.appName}:env:${environment}`;
        const configData = await this.client.get(envKey);

        if (!configData) {
            return null;
        }

        return JSON.parse(configData);
    }

    // Validate configuration against schema
    async validateConfig(schema) {
        const config = await this.getAllConfig();
        const errors = [];

        for (const [key, rules] of Object.entries(schema)) {
            const value = config[key];

            // Check required fields
            if (rules.required && (value === undefined || value === null)) {
                errors.push(`Missing required configuration: ${key}`);
                continue;
            }

            if (value !== undefined && value !== null) {
                // Type validation
                if (rules.type && typeof value !== rules.type) {
                    errors.push(`Invalid type for ${key}: expected ${rules.type}, got ${typeof value}`);
                }

                // Range validation for numbers
                if (rules.type === 'number') {
                    if (rules.min !== undefined && value < rules.min) {
                        errors.push(`${key} must be >= ${rules.min}`);
                    }
                    if (rules.max !== undefined && value > rules.max) {
                        errors.push(`${key} must be <= ${rules.max}`);
                    }
                }

                // Enum validation
                if (rules.enum && !rules.enum.includes(value)) {
                    errors.push(`${key} must be one of: ${rules.enum.join(', ')}`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Watch configuration changes (using pub/sub)
    async watchConfig(callback) {
        // This would require setting up pub/sub notifications
        // For demo purposes, we'll simulate with polling
        console.log('Configuration watching started (simulated)');

        const watcher = setInterval(async () => {
            // In a real implementation, you'd use Redis keyspace notifications
            // or pub/sub to get real-time updates
            const config = await this.getAllConfig();
            callback(config);
        }, 5000); // Check every 5 seconds

        return {
            stop: () => {
                clearInterval(watcher);
                console.log('Configuration watching stopped');
            }
        };
    }

    // Get configuration statistics
    async getStats() {
        const [
            totalKeys,
            historyEntries,
            snapshots,
            versions
        ] = await Promise.all([
            this.client.keys(`${this.configKey}:*`).then(keys => keys.length),
            this.client.zCard(this.historyKey),
            this.client.sCard(`config:${this.appName}:snapshots`),
            this.client.sCard(this.versionsKey)
        ]);

        return {
            totalConfigKeys: totalKeys,
            historyEntries,
            snapshots,
            versions
        };
    }
}

// Demo the configuration management functionality
async function demoConfigManagement() {
    const config = new ConfigManager(client, 'myapp');

    console.log('=== Redis Configuration Management Demo ===\n');

    // Set individual configuration values
    console.log('1. Setting individual config values:');
    await config.setConfig('database.host', 'localhost', { user: 'admin' });
    await config.setConfig('database.port', 5432, { user: 'admin' });
    await config.setConfig('cache.enabled', true, { user: 'admin' });
    await config.setConfig('api.rate_limit', 1000, { user: 'admin' });
    await config.setConfig('logging.level', 'info', { user: 'admin' });
    console.log();

    // Get configuration values
    console.log('2. Getting config values:');
    const dbHost = await config.getConfig('database.host');
    const apiLimit = await config.getConfig('api.rate_limit');
    const logLevel = await config.getConfig('logging.level');
    console.log(`Database host: ${dbHost}`);
    console.log(`API rate limit: ${apiLimit}`);
    console.log(`Log level: ${logLevel}`);
    console.log();

    // Set bulk configuration
    console.log('3. Setting bulk configuration:');
    await config.setBulkConfig({
        'email.smtp_host': 'smtp.gmail.com',
        'email.smtp_port': 587,
        'email.use_tls': true,
        'features.new_ui': false,
        'features.beta_features': true
    }, { user: 'deploy_script' });
    console.log();

    // Get all configuration
    console.log('4. Getting all configuration:');
    const allConfig = await config.getAllConfig();
    console.log('Total config keys:', Object.keys(allConfig).length);
    Object.entries(allConfig).slice(0, 5).forEach(([key, value]) => {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
    });
    console.log('...');
    console.log();

    // Update configuration
    console.log('5. Updating configuration:');
    await config.setConfig('api.rate_limit', 2000, { user: 'admin', reason: 'increased load' });
    const newLimit = await config.getConfig('api.rate_limit');
    console.log(`Updated API rate limit: ${newLimit}`);
    console.log();

    // Get configuration history
    console.log('6. Configuration history for api.rate_limit:');
    const history = await config.getConfigHistory('api.rate_limit', 5);
    history.forEach(entry => {
        console.log(`  ${entry.updatedAt}: ${JSON.parse(entry.value)} (by ${entry.updatedBy})`);
    });
    console.log();

    // Create configuration snapshot
    console.log('7. Creating configuration snapshot:');
    await config.createSnapshot('production_v1.2.0', 'Production configuration before v1.2.0 deployment');
    console.log();

    // Set environment-specific configuration
    console.log('8. Setting environment-specific configuration:');
    await config.setEnvironmentConfig('production', {
        'database.host': 'prod-db.example.com',
        'cache.enabled': true,
        'logging.level': 'warn'
    });

    await config.setEnvironmentConfig('staging', {
        'database.host': 'staging-db.example.com',
        'cache.enabled': false,
        'logging.level': 'debug'
    });
    console.log();

    // Get environment configuration
    console.log('9. Getting production environment config:');
    const prodConfig = await config.getEnvironmentConfig('production');
    console.log('Production config:', prodConfig);
    console.log();

    // Validate configuration
    console.log('10. Validating configuration:');
    const schema = {
        'database.port': { type: 'number', min: 1000, max: 65535, required: true },
        'api.rate_limit': { type: 'number', min: 0, max: 10000 },
        'logging.level': { enum: ['debug', 'info', 'warn', 'error'], required: true },
        'cache.enabled': { type: 'boolean' }
    };

    const validation = await config.validateConfig(schema);
    console.log('Configuration valid:', validation.valid);
    if (!validation.valid) {
        console.log('Validation errors:', validation.errors);
    }
    console.log();

    // Delete configuration
    console.log('11. Deleting configuration:');
    await config.deleteConfig('features.beta_features');
    const deletedValue = await config.getConfig('features.beta_features');
    console.log(`Deleted config value: ${deletedValue}`);
    console.log();

    // Get configuration statistics
    console.log('12. Configuration statistics:');
    const stats = await config.getStats();
    console.log('Stats:', stats);

    await client.disconnect();
    console.log('\nConfiguration management demo completed!');
}

demoConfigManagement().catch(console.error);