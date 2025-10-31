# Redis API Caching: From Beginner to Advanced

## What is API Caching?

**Beginner Level:** API caching is like keeping a copy of API responses so you don't have to call the API every time. It's like remembering the answer to a question so you don't have to look it up again. This makes your application faster and reduces load on the API server.

**Intermediate Level:** API caching involves storing API responses in a fast, distributed cache to reduce response times and server load. Redis provides the speed and features needed for effective API caching with TTL, cache invalidation, and cache warming capabilities.

## Why Redis for API Caching?

- **Sub-millisecond response times** for cached data
- **Automatic expiration** with TTL (Time To Live)
- **Cache invalidation** strategies (write-through, write-behind)
- **Memory efficiency** with compression options
- **Distributed caching** across multiple instances
- **Rich data types** for complex API responses

## Basic API Caching

### Beginner Example: Simple Response Caching

```javascript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

class SimpleAPICache {
    constructor(redisClient, defaultTTL = 300) { // 5 minutes default
        this.client = redisClient;
        this.defaultTTL = defaultTTL;
    }

    async getCachedResponse(endpoint, params = {}) {
        const cacheKey = this.generateCacheKey(endpoint, params);
        const cached = await this.client.get(cacheKey);

        if (cached) {
            console.log(`Cache hit for ${endpoint}`);
            return JSON.parse(cached);
        }

        return null;
    }

    async setCachedResponse(endpoint, params = {}, response, ttl = null) {
        const cacheKey = this.generateCacheKey(endpoint, params);
        const serializedResponse = JSON.stringify(response);
        const expirationTime = ttl || this.defaultTTL;

        await this.client.setEx(cacheKey, expirationTime, serializedResponse);
        console.log(`Cached response for ${endpoint} with TTL ${expirationTime}s`);
    }

    async cacheApiCall(endpoint, params = {}, apiCallFunction, ttl = null) {
        // Try to get from cache first
        let response = await this.getCachedResponse(endpoint, params);

        if (!response) {
            // Cache miss - call the actual API
            console.log(`Cache miss for ${endpoint}, calling API`);
            response = await apiCallFunction();

            // Cache the response
            await this.setCachedResponse(endpoint, params, response, ttl);
        }

        return response;
    }

    generateCacheKey(endpoint, params = {}) {
        // Create a deterministic cache key from endpoint and parameters
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}:${params[key]}`)
            .join('|');

        return `api_cache:${endpoint}:${sortedParams ? sortedParams : 'no_params'}`;
    }

    async invalidateCache(endpoint, params = {}) {
        const cacheKey = this.generateCacheKey(endpoint, params);
        await this.client.del(cacheKey);
        console.log(`Invalidated cache for ${endpoint}`);
    }

    async clearAllCache() {
        const keys = await this.client.keys('api_cache:*');
        if (keys.length > 0) {
            await this.client.del(keys);
            console.log(`Cleared ${keys.length} cache entries`);
        }
    }

    async getCacheStats() {
        const keys = await this.client.keys('api_cache:*');
        return {
            totalEntries: keys.length,
            memoryUsage: await this.getMemoryUsage(keys)
        };
    }

    async getMemoryUsage(keys) {
        let totalSize = 0;
        for (const key of keys.slice(0, 10)) { // Sample first 10 keys
            const size = await this.client.memory('USAGE', key);
            totalSize += size || 0;
        }
        return totalSize * (keys.length / Math.min(10, keys.length)); // Estimate
    }
}

// Example usage
const apiCache = new SimpleAPICache(client);

// Simulate API functions
async function getUserData(userId) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return { id: userId, name: `User ${userId}`, email: `user${userId}@example.com` };
}

async function getProducts(category) {
    await new Promise(resolve => setTimeout(resolve, 150));
    return [
        { id: 1, name: `Product 1 (${category})`, price: 29.99 },
        { id: 2, name: `Product 2 (${category})`, price: 39.99 }
    ];
}

// Cache API calls
const userData = await apiCache.cacheApiCall('user', { id: 123 }, () => getUserData(123));
console.log('User data:', userData);

const products = await apiCache.cacheApiCall('products', { category: 'electronics' }, () => getProducts('electronics'));
console.log('Products:', products);

// Second call should be from cache (faster)
const cachedUserData = await apiCache.cacheApiCall('user', { id: 123 }, () => getUserData(123));
console.log('Cached user data:', cachedUserData);

// Invalidate specific cache entry
await apiCache.invalidateCache('user', { id: 123 });

// Get cache statistics
const stats = await apiCache.getCacheStats();
console.log('Cache stats:', stats);
```

### Intermediate Example: Advanced Caching Strategies

```javascript
class AdvancedAPICache {
    constructor(redisClient) {
        this.client = redisClient;
        this.strategies = {
            'write-through': this.writeThroughStrategy.bind(this),
            'write-behind': this.writeBehindStrategy.bind(this),
            'cache-aside': this.cacheAsideStrategy.bind(this)
        };
    }

    async cacheWithStrategy(endpoint, params, strategy, options = {}) {
        const strategyFn = this.strategies[strategy];
        if (!strategyFn) {
            throw new Error(`Unknown caching strategy: ${strategy}`);
        }

        return await strategyFn(endpoint, params, options);
    }

    async writeThroughStrategy(endpoint, params, options) {
        // Write to cache and database simultaneously
        const { apiCall, ttl = 300 } = options;

        const response = await apiCall();
        await this.setCachedResponse(endpoint, params, response, ttl);

        return response;
    }

    async writeBehindStrategy(endpoint, params, options) {
        // Write to cache immediately, update database asynchronously
        const { apiCall, ttl = 300 } = options;

        // Try cache first
        let response = await this.getCachedResponse(endpoint, params);

        if (!response) {
            response = await apiCall();
            await this.setCachedResponse(endpoint, params, response, ttl);

            // Asynchronously update any other systems (simulated)
            setTimeout(async () => {
                console.log(`Async update for ${endpoint}`);
                // Here you would update databases, search indices, etc.
            }, 100);
        }

        return response;
    }

    async cacheAsideStrategy(endpoint, params, options) {
        // Lazy loading - only cache on read
        const { apiCall, ttl = 300 } = options;

        let response = await this.getCachedResponse(endpoint, params);

        if (!response) {
            response = await apiCall();
            await this.setCachedResponse(endpoint, params, response, ttl);
        }

        return response;
    }

    async getCachedResponse(endpoint, params = {}) {
        const cacheKey = this.generateCacheKey(endpoint, params);
        const cached = await this.client.get(cacheKey);

        if (cached) {
            // Update access time for LRU
            await this.client.zAdd('cache_access', [{
                score: Date.now(),
                value: cacheKey
            }]);
            return JSON.parse(cached);
        }

        return null;
    }

    async setCachedResponse(endpoint, params = {}, response, ttl = 300) {
        const cacheKey = this.generateCacheKey(endpoint, params);
        const serializedResponse = JSON.stringify(response);

        await this.client.setEx(cacheKey, ttl, serializedResponse);

        // Track cache entry
        await this.client.zAdd('cache_entries', [{
            score: Date.now(),
            value: cacheKey
        }]);
    }

    generateCacheKey(endpoint, params = {}) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}:${JSON.stringify(params[key])}`)
            .join('|');

        return `api_cache:${endpoint}:${sortedParams || 'no_params'}`;
    }

    async conditionalCache(endpoint, params, conditionFn, options) {
        // Only cache if condition is met
        const shouldCache = await conditionFn();

        if (shouldCache) {
            return await this.cacheAsideStrategy(endpoint, params, options);
        } else {
            // Call API directly without caching
            return await options.apiCall();
        }
    }

    async cacheWithFallback(endpoint, params, primaryApiCall, fallbackApiCall, options) {
        try {
            return await this.cacheAsideStrategy(endpoint, params, {
                ...options,
                apiCall: primaryApiCall
            });
        } catch (error) {
            console.warn(`Primary API failed for ${endpoint}, using fallback`);
            // Don't cache fallback responses
            return await fallbackApiCall();
        }
    }

    async getCacheHitRate() {
        const totalRequests = await this.client.zCard('cache_access');
        const cacheHits = await this.client.zCount('cache_access', Date.now() - 3600000, Date.now()); // Last hour

        // This is a simplified calculation
        return totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
    }
}

// Example usage with different strategies
const advancedCache = new AdvancedAPICache(client);

// Write-through caching
const userProfile = await advancedCache.cacheWithStrategy('user_profile', { id: 123 }, 'write-through', {
    apiCall: async () => {
        console.log('Fetching user profile from database...');
        await new Promise(resolve => setTimeout(resolve, 100));
        return { id: 123, name: 'John Doe', email: 'john@example.com' };
    },
    ttl: 600
});

// Cache-aside (lazy loading)
const productList = await advancedCache.cacheWithStrategy('products', { category: 'electronics' }, 'cache-aside', {
    apiCall: async () => {
        console.log('Fetching products from API...');
        await new Promise(resolve => setTimeout(resolve, 150));
        return [{ id: 1, name: 'Laptop', price: 999 }, { id: 2, name: 'Mouse', price: 25 }];
    },
    ttl: 300
});

// Conditional caching (only cache if response is not empty)
const searchResults = await advancedCache.conditionalCache('search', { q: 'redis' },
    async () => {
        const results = [{ title: 'Redis Tutorial' }, { title: 'Redis Guide' }];
        return results.length > 0; // Only cache if we have results
    },
    {
        apiCall: async () => {
            console.log('Performing search...');
            await new Promise(resolve => setTimeout(resolve, 200));
            return [{ title: 'Redis Tutorial' }, { title: 'Redis Guide' }];
        },
        ttl: 180
    }
);

// Cache with fallback
const weatherData = await advancedCache.cacheWithFallback('weather', { city: 'NYC' },
    async () => {
        // Primary API (might fail)
        throw new Error('Primary weather API down');
    },
    async () => {
        // Fallback API
        console.log('Using fallback weather API...');
        await new Promise(resolve => setTimeout(resolve, 50));
        return { temperature: 72, condition: 'sunny' };
    },
    { ttl: 600 }
);

console.log('Weather data:', weatherData);

// Get cache hit rate
const hitRate = await advancedCache.getCacheHitRate();
console.log(`Cache hit rate: ${hitRate.toFixed(2)}%`);
```

## Advanced API Caching Patterns

### Cache Invalidation Strategies

```javascript
class CacheInvalidationManager {
    constructor(redisClient) {
        this.client = redisClient;
        this.invalidationStrategies = {
            'immediate': this.immediateInvalidation.bind(this),
            'delayed': this.delayedInvalidation.bind(this),
            'selective': this.selectiveInvalidation.bind(this)
        };
    }

    async invalidate(strategy, pattern, options = {}) {
        const strategyFn = this.invalidationStrategies[strategy];
        if (!strategyFn) {
            throw new Error(`Unknown invalidation strategy: ${strategy}`);
        }

        return await strategyFn(pattern, options);
    }

    async immediateInvalidation(pattern, options) {
        // Immediately delete matching cache entries
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
            await this.client.del(keys);
            console.log(`Immediately invalidated ${keys.length} cache entries matching ${pattern}`);
        }
        return keys.length;
    }

    async delayedInvalidation(pattern, options) {
        const { delay = 5000 } = options; // 5 seconds delay

        // Schedule invalidation
        setTimeout(async () => {
            await this.immediateInvalidation(pattern, options);
        }, delay);

        console.log(`Scheduled invalidation of pattern ${pattern} in ${delay}ms`);
        return true;
    }

    async selectiveInvalidation(pattern, options) {
        const { condition } = options;

        const keys = await this.client.keys(pattern);
        const keysToDelete = [];

        for (const key of keys) {
            const shouldDelete = await condition(key);
            if (shouldDelete) {
                keysToDelete.push(key);
            }
        }

        if (keysToDelete.length > 0) {
            await this.client.del(keysToDelete);
            console.log(`Selectively invalidated ${keysToDelete.length} cache entries`);
        }

        return keysToDelete.length;
    }

    async invalidateByTags(tags, strategy = 'immediate') {
        // Invalidate cache entries by tags
        const tagKeys = tags.map(tag => `tag:${tag}`);
        const cacheKeys = new Set();

        for (const tagKey of tagKeys) {
            const keys = await this.client.sMembers(tagKey);
            keys.forEach(key => cacheKeys.add(key));
        }

        if (cacheKeys.size > 0) {
            await this.invalidate(strategy, Array.from(cacheKeys), {});
            console.log(`Invalidated ${cacheKeys.size} entries by tags: ${tags.join(', ')}`);
        }

        return cacheKeys.size;
    }

    async invalidateByDependency(resourceId, dependencyGraph) {
        // Invalidate cache entries based on resource dependencies
        const affectedKeys = new Set();
        const visited = new Set();

        const traverseDependencies = async (currentId) => {
            if (visited.has(currentId)) return;
            visited.add(currentId);

            // Find cache keys that depend on this resource
            const dependentKeys = await this.client.sMembers(`depends_on:${currentId}`);
            dependentKeys.forEach(key => affectedKeys.add(key));

            // Recursively check dependencies
            if (dependencyGraph[currentId]) {
                for (const depId of dependencyGraph[currentId]) {
                    await traverseDependencies(depId);
                }
            }
        };

        await traverseDependencies(resourceId);

        if (affectedKeys.size > 0) {
            await this.invalidate('immediate', Array.from(affectedKeys), {});
            console.log(`Invalidated ${affectedKeys.size} entries due to dependency on ${resourceId}`);
        }

        return affectedKeys.size;
    }

    async setupCacheTags(endpoint, params, tags) {
        // Associate cache entry with tags for later invalidation
        const cacheKey = this.generateCacheKey(endpoint, params);

        for (const tag of tags) {
            await this.client.sAdd(`tag:${tag}`, cacheKey);
        }
    }

    async setupCacheDependencies(cacheKey, dependencies) {
        // Set up dependency relationships
        for (const depId of dependencies) {
            await this.client.sAdd(`depends_on:${depId}`, cacheKey);
        }
    }

    generateCacheKey(endpoint, params = {}) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}:${JSON.stringify(params[key])}`)
            .join('|');

        return `api_cache:${endpoint}:${sortedParams || 'no_params'}`;
    }
}

// Example usage with cache invalidation
const invalidationManager = new CacheInvalidationManager(client);

// Set up cache with tags
await invalidationManager.setupCacheTags('user_profile', { id: 123 }, ['user', 'profile', 'user_123']);
await invalidationManager.setupCacheTags('user_posts', { userId: 123 }, ['user', 'posts', 'user_123']);

// Set up dependencies
await invalidationManager.setupCacheDependencies(
    invalidationManager.generateCacheKey('user_profile', { id: 123 }),
    ['user_123']
);

// Immediate invalidation
await invalidationManager.invalidate('immediate', 'api_cache:user_profile:*');

// Invalidate by tags
await invalidationManager.invalidateByTags(['user_123']);

// Delayed invalidation
await invalidationManager.invalidate('delayed', 'api_cache:products:*', { delay: 10000 });

// Selective invalidation (only delete entries older than 1 hour)
await invalidationManager.invalidate('selective', 'api_cache:*', {
    condition: async (key) => {
        const ttl = await client.ttl(key);
        return ttl < 3600; // Less than 1 hour remaining
    }
});

// Dependency-based invalidation
const dependencyGraph = {
    'user_123': ['profile_data', 'preferences'],
    'profile_data': ['basic_info']
};

await invalidationManager.invalidateByDependency('user_123', dependencyGraph);
```

### Cache Warming and Preloading

```javascript
class CacheWarmer {
    constructor(redisClient) {
        this.client = redisClient;
        this.warmingJobs = new Map();
    }

    async warmCache(endpoints, options = {}) {
        const {
            concurrency = 5,
            onProgress = null,
            onComplete = null
        } = options;

        const jobId = `warm_${Date.now()}_${Math.random()}`;
        const job = {
            id: jobId,
            status: 'running',
            total: endpoints.length,
            completed: 0,
            startedAt: new Date().toISOString()
        };

        this.warmingJobs.set(jobId, job);

        // Process endpoints with controlled concurrency
        const semaphore = new Semaphore(concurrency);

        const promises = endpoints.map(async (endpointConfig) => {
            await semaphore.acquire();

            try {
                await this.warmEndpoint(endpointConfig);
                job.completed++;

                if (onProgress) {
                    onProgress(job);
                }
            } finally {
                semaphore.release();
            }
        });

        try {
            await Promise.all(promises);
            job.status = 'completed';
            job.completedAt = new Date().toISOString();

            if (onComplete) {
                onComplete(job);
            }
        } catch (error) {
            job.status = 'failed';
            job.error = error.message;
            throw error;
        } finally {
            this.warmingJobs.delete(jobId);
        }

        return job;
    }

    async warmEndpoint({ endpoint, params = {}, apiCall, ttl = 300, tags = [] }) {
        try {
            // Call the API to get fresh data
            const response = await apiCall();

            // Cache the response
            const cacheKey = this.generateCacheKey(endpoint, params);
            await this.client.setEx(cacheKey, ttl, JSON.stringify(response));

            // Set up tags for invalidation
            for (const tag of tags) {
                await this.client.sAdd(`tag:${tag}`, cacheKey);
            }

            console.log(`Warmed cache for ${endpoint}`);
            return true;
        } catch (error) {
            console.error(`Failed to warm cache for ${endpoint}:`, error.message);
            return false;
        }
    }

    async warmCacheFromPatterns(patterns, options = {}) {
        // Extract cache keys matching patterns and warm them
        const endpoints = [];

        for (const pattern of patterns) {
            const keys = await this.client.keys(pattern);

            for (const key of keys) {
                // Extract endpoint and params from key
                const parts = key.replace('api_cache:', '').split(':');
                const endpoint = parts[0];
                const params = this.parseParamsFromKey(parts.slice(1).join(':'));

                endpoints.push({
                    endpoint,
                    params,
                    apiCall: options.apiCall || (async () => {
                        // Default: return cached data (for refresh warming)
                        const cached = await this.client.get(key);
                        return cached ? JSON.parse(cached) : null;
                    }),
                    ttl: options.ttl || 300
                });
            }
        }

        return await this.warmCache(endpoints, options);
    }

    async scheduleCacheWarming(cronExpression, endpoints, options = {}) {
        // Simplified scheduling (use a proper job scheduler in production)
        const interval = options.interval || 3600000; // 1 hour default

        const job = setInterval(async () => {
            console.log('Running scheduled cache warming...');
            await this.warmCache(endpoints, options);
        }, interval);

        return {
            jobId: `scheduled_${Date.now()}`,
            stop: () => clearInterval(job)
        };
    }

    async predictiveWarming(historicalData, options = {}) {
        // Warm cache based on historical access patterns
        const { timeWindow = 24 * 60 * 60 * 1000, topN = 100 } = options;

        const cutoff = Date.now() - timeWindow;
        const accessPatterns = await this.client.zRangeByScore(
            'cache_access',
            cutoff,
            Date.now(),
            { WITHSCORES: true }
        );

        // Count access frequency
        const accessCount = {};
        accessPatterns.forEach(([key]) => {
            accessCount[key] = (accessCount[key] || 0) + 1;
        });

        // Get top N most accessed keys
        const topKeys = Object.entries(accessCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, topN)
            .map(([key]) => key);

        // Warm these keys
        const endpoints = topKeys.map(key => ({
            endpoint: key.replace('api_cache:', '').split(':')[0],
            params: this.parseParamsFromKey(key),
            apiCall: async () => {
                const cached = await this.client.get(key);
                return cached ? JSON.parse(cached) : null;
            }
        }));

        return await this.warmCache(endpoints, {
            ...options,
            onComplete: (job) => {
                console.log(`Predictive warming completed: ${job.completed}/${job.total} entries`);
            }
        });
    }

    generateCacheKey(endpoint, params = {}) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}:${JSON.stringify(params[key])}`)
            .join('|');

        return `api_cache:${endpoint}:${sortedParams || 'no_params'}`;
    }

    parseParamsFromKey(paramString) {
        if (paramString === 'no_params') return {};

        const params = {};
        const pairs = paramString.split('|');

        for (const pair of pairs) {
            const [key, value] = pair.split(':');
            try {
                params[key] = JSON.parse(value);
            } catch {
                params[key] = value;
            }
        }

        return params;
    }

    getWarmingJob(jobId) {
        return this.warmingJobs.get(jobId);
    }

    getAllWarmingJobs() {
        return Array.from(this.warmingJobs.values());
    }
}

// Semaphore for concurrency control
class Semaphore {
    constructor(maxConcurrent) {
        this.maxConcurrent = maxConcurrent;
        this.currentConcurrent = 0;
        this.waitQueue = [];
    }

    async acquire() {
        if (this.currentConcurrent < this.maxConcurrent) {
            this.currentConcurrent++;
            return;
        }

        return new Promise((resolve) => {
            this.waitQueue.push(resolve);
        });
    }

    release() {
        this.currentConcurrent--;

        if (this.waitQueue.length > 0) {
            const resolve = this.waitQueue.shift();
            this.currentConcurrent++;
            resolve();
        }
    }
}

// Example usage with cache warming
const cacheWarmer = new CacheWarmer(client);

// Define endpoints to warm
const endpointsToWarm = [
    {
        endpoint: 'user_profile',
        params: { id: 123 },
        apiCall: async () => {
            console.log('Fetching user profile...');
            await new Promise(resolve => setTimeout(resolve, 100));
            return { id: 123, name: 'John Doe', email: 'john@example.com' };
        },
        ttl: 600,
        tags: ['user', 'profile']
    },
    {
        endpoint: 'products',
        params: { category: 'electronics', limit: 10 },
        apiCall: async () => {
            console.log('Fetching products...');
            await new Promise(resolve => setTimeout(resolve, 150));
            return [{ id: 1, name: 'Laptop', price: 999 }];
        },
        ttl: 300,
        tags: ['products', 'electronics']
    }
];

// Warm cache with progress tracking
const warmingJob = await cacheWarmer.warmCache(endpointsToWarm, {
    concurrency: 2,
    onProgress: (job) => {
        console.log(`Warming progress: ${job.completed}/${job.total}`);
    },
    onComplete: (job) => {
        console.log(`Cache warming completed in ${(new Date(job.completedAt) - new Date(job.startedAt)) / 1000}s`);
    }
});

console.log('Warming job:', warmingJob);

// Schedule periodic cache warming
const scheduledJob = await cacheWarmer.scheduleCacheWarming('0 */6 * * *', endpointsToWarm, {
    onComplete: (job) => {
        console.log('Scheduled warming completed');
    }
});

// Predictive warming based on access patterns
await cacheWarmer.predictiveWarming({}, { topN: 50 });

// Stop scheduled warming after some time
setTimeout(() => {
    scheduledJob.stop();
    console.log('Stopped scheduled cache warming');
}, 30000);
```

## Cache Performance Monitoring

### Cache Metrics and Analytics

```javascript
class CacheMetricsCollector {
    constructor(redisClient) {
        this.client = redisClient;
        this.metricsKey = 'cache_metrics';
    }

    async recordCacheHit(endpoint, params, responseTime) {
        const timestamp = Date.now();
        const cacheKey = this.generateCacheKey(endpoint, params);

        await this.client.hIncrBy(`${this.metricsKey}:hits`, 'total', 1);
        await this.client.hIncrBy(`${this.metricsKey}:hits:${endpoint}`, 'count', 1);

        // Record response time
        await this.client.zAdd(`${this.metricsKey}:response_times`, [{
            score: timestamp,
            value: JSON.stringify({ endpoint, cacheKey, responseTime, hit: true })
        }]);

        // Keep only recent metrics
        await this.client.zRemRangeByScore(`${this.metricsKey}:response_times`, 0, timestamp - 3600000);
    }

    async recordCacheMiss(endpoint, params, responseTime) {
        const timestamp = Date.now();

        await this.client.hIncrBy(`${this.metricsKey}:misses`, 'total', 1);
        await this.client.hIncrBy(`${this.metricsKey}:misses:${endpoint}`, 'count', 1);

        await this.client.zAdd(`${this.metricsKey}:response_times`, [{
            score: timestamp,
            value: JSON.stringify({ endpoint, params, responseTime, hit: false })
        }]);

        await this.client.zRemRangeByScore(`${this.metricsKey}:response_times`, 0, timestamp - 3600000);
    }

    async getCacheStats(timeWindow = 3600000) {
        const now = Date.now();
        const start = now - timeWindow;

        const [hits, misses] = await Promise.all([
            this.client.hGet(`${this.metricsKey}:hits`, 'total'),
            this.client.hGet(`${this.metricsKey}:misses`, 'total')
        ]);

        const totalHits = parseInt(hits || '0');
        const totalMisses = parseInt(misses || '0');
        const totalRequests = totalHits + totalMisses;

        // Calculate response time statistics
        const responseTimes = await this.client.zRangeByScore(
            `${this.metricsKey}:response_times`,
            start,
            now
        );

        const times = responseTimes.map(record => {
            const data = JSON.parse(record);
            return data.responseTime;
        });

        const avgResponseTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
        const p95ResponseTime = this.percentile(times, 95);

        return {
            totalRequests,
            totalHits,
            totalMisses,
            hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
            missRate: totalRequests > 0 ? (totalMisses / totalRequests) * 100 : 0,
            averageResponseTime: avgResponseTime,
            p95ResponseTime,
            timeWindowMinutes: timeWindow / (60 * 1000)
        };
    }

    async getEndpointStats() {
        const hitKeys = await this.client.keys(`${this.metricsKey}:hits:*`);
        const missKeys = await this.client.keys(`${this.metricsKey}:misses:*`);

        const endpointStats = {};

        for (const hitKey of hitKeys) {
            const endpoint = hitKey.replace(`${this.metricsKey}:hits:`, '');
            const hits = parseInt(await this.client.hGet(hitKey, 'count') || '0');

            if (!endpointStats[endpoint]) {
                endpointStats[endpoint] = { hits: 0, misses: 0 };
            }
            endpointStats[endpoint].hits = hits;
        }

        for (const missKey of missKeys) {
            const endpoint = missKey.replace(`${this.metricsKey}:misses:`, '');
            const misses = parseInt(await this.client.hGet(missKey, 'count') || '0');

            if (!endpointStats[endpoint]) {
                endpointStats[endpoint] = { hits: 0, misses: 0 };
            }
            endpointStats[endpoint].misses = misses;
        }

        // Calculate rates
        for (const [endpoint, stats] of Object.entries(endpointStats)) {
            const total = stats.hits + stats.misses;
            stats.hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
            stats.totalRequests = total;
        }

        return endpointStats;
    }

    async getSlowRequests(threshold = 1000, limit = 10) {
        const responseTimes = await this.client.zRange(`${this.metricsKey}:response_times`, 0, -1);

        const slowRequests = responseTimes
            .map(record => JSON.parse(record))
            .filter(data => data.responseTime > threshold)
            .sort((a, b) => b.responseTime - a.responseTime)
            .slice(0, limit);

        return slowRequests;
    }

    async getCacheSizeStats() {
        const cacheKeys = await this.client.keys('api_cache:*');
        let totalSize = 0;

        // Sample size calculation
        for (const key of cacheKeys.slice(0, Math.min(100, cacheKeys.length))) {
            const size = await this.client.memory('USAGE', key);
            totalSize += size || 0;
        }

        const estimatedTotalSize = totalSize * (cacheKeys.length / Math.min(100, cacheKeys.length));

        return {
            totalKeys: cacheKeys.length,
            estimatedMemoryUsage: estimatedTotalSize,
            averageKeySize: cacheKeys.length > 0 ? estimatedTotalSize / cacheKeys.length : 0
        };
    }

    percentile(arr, p) {
        if (arr.length === 0) return 0;

        const sorted = arr.sort((a, b) => a - b);
        const index = (p / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);

        if (lower === upper) return sorted[lower];

        return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
    }

    generateCacheKey(endpoint, params = {}) {
        const sortedParams = Object.keys(params)
            .sort()
            .map(key => `${key}:${JSON.stringify(params[key])}`)
            .join('|');

        return `api_cache:${endpoint}:${sortedParams || 'no_params'}`;
    }
}

// Enhanced cache with metrics
class MonitoredAPICache extends SimpleAPICache {
    constructor(redisClient) {
        super(redisClient);
        this.metrics = new CacheMetricsCollector(redisClient);
    }

    async cacheApiCall(endpoint, params = {}, apiCallFunction, ttl = null) {
        const startTime = Date.now();

        // Try cache first
        const cachedResponse = await this.getCachedResponse(endpoint, params);

        if (cachedResponse) {
            const responseTime = Date.now() - startTime;
            await this.metrics.recordCacheHit(endpoint, params, responseTime);
            return cachedResponse;
        }

        // Cache miss - call API
        try {
            const response = await apiCallFunction();
            const responseTime = Date.now() - startTime;

            await this.metrics.recordCacheMiss(endpoint, params, responseTime);
            await this.setCachedResponse(endpoint, params, response, ttl);

            return response;
        } catch (error) {
            const responseTime = Date.now() - startTime;
            await this.metrics.recordCacheMiss(endpoint, params, responseTime);
            throw error;
        }
    }

    async getCacheStats(timeWindow = 3600000) {
        return await this.metrics.getCacheStats(timeWindow);
    }

    async getEndpointStats() {
        return await this.metrics.getEndpointStats();
    }

    async getSlowRequests(threshold = 1000) {
        return await this.metrics.getSlowRequests(threshold);
    }
}

// Example usage with monitoring
const monitoredCache = new MonitoredAPICache(client);

// Make some cached API calls
await monitoredCache.cacheApiCall('weather', { city: 'NYC' }, async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { temperature: 72, condition: 'sunny' };
});

await monitoredCache.cacheApiCall('weather', { city: 'NYC' }, async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return { temperature: 72, condition: 'sunny' }; // Should be cached
});

// Get cache statistics
const stats = await monitoredCache.getCacheStats();
console.log('Cache stats:', stats);

// Get endpoint-specific stats
const endpointStats = await monitoredCache.getEndpointStats();
console.log('Endpoint stats:', endpointStats);

// Get slow requests
const slowRequests = await monitoredCache.getSlowRequests(150);
console.log('Slow requests:', slowRequests);
```

## Best Practices

### Cache Key Design

```javascript
class CacheKeyGenerator {
    static generateKey(endpoint, params = {}, options = {}) {
        const {
            version = 'v1',
            includeHeaders = false,
            userId = null
        } = options;

        // Base key
        let key = `api:${version}:${endpoint}`;

        // Add user-specific caching if needed
        if (userId) {
            key += `:user_${userId}`;
        }

        // Sort and stringify parameters
        if (Object.keys(params).length > 0) {
            const sortedParams = Object.keys(params)
                .sort()
                .map(k => `${k}=${JSON.stringify(params[k])}`)
                .join('&');

            key += `?${sortedParams}`;
        }

        // Add headers if specified
        if (includeHeaders && options.headers) {
            const headerString = Object.keys(options.headers)
                .sort()
                .map(h => `${h}=${options.headers[h]}`)
                .join('&');

            key += `#${headerString}`;
        }

        return key;
    }

    static generateBulkKeys(endpoint, paramSets, options = {}) {
        return paramSets.map(params => this.generateKey(endpoint, params, options));
    }

    static parseKey(cacheKey) {
        // Parse cache key back to components
        const parts = cacheKey.split(':');

        if (parts.length < 3) return null;

        const version = parts[1];
        const endpoint = parts[2];
        const userPart = parts[3]?.startsWith('user_') ? parts[3] : null;

        let params = {};
        let headers = {};

        const queryPart = parts.slice(userPart ? 4 : 3).join(':');
        if (queryPart) {
            const [queryString, headerString] = queryPart.split('#');

            if (queryString) {
                params = this.parseQueryString(queryString);
            }

            if (headerString) {
                headers = this.parseQueryString(headerString);
            }
        }

        return {
            version,
            endpoint,
            userId: userPart ? userPart.replace('user_', '') : null,
            params,
            headers
        };
    }

    static parseQueryString(queryString) {
        const params = {};

        if (!queryString || queryString === '?') return params;

        const pairs = queryString.replace('?', '').split('&');

        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            try {
                params[key] = JSON.parse(value);
            } catch {
                params[key] = value;
            }
        }

        return params;
    }

    static generateTagBasedKeys(tags, baseKey) {
        // Generate keys for tag-based invalidation
        return tags.map(tag => `tag:${tag}:${baseKey}`);
    }

    static generatePatternKeys(endpoint, paramPatterns) {
        // Generate keys for pattern-based operations
        const keys = [];

        for (const pattern of paramPatterns) {
            const key = this.generateKey(endpoint, pattern);
            keys.push(key.replace(/\*/g, '*')); // Mark wildcards
        }

        return keys;
    }
}

// Usage examples
const cacheKey1 = CacheKeyGenerator.generateKey('users', { id: 123, fields: ['name', 'email'] });
console.log('Cache key:', cacheKey1);

const cacheKey2 = CacheKeyGenerator.generateKey('products', { category: 'electronics', limit: 10 }, {
    version: 'v2',
    userId: 'user456'
});
console.log('User-specific cache key:', cacheKey2);

const parsed = CacheKeyGenerator.parseKey(cacheKey2);
console.log('Parsed key:', parsed);

const bulkKeys = CacheKeyGenerator.generateBulkKeys('users', [
    { id: 1 },
    { id: 2 },
    { id: 3 }
]);
console.log('Bulk keys:', bulkKeys);
```

## Conclusion

Redis API caching enables fast, scalable API responses with intelligent invalidation and monitoring. Start with simple response caching, then add invalidation strategies, cache warming, and performance monitoring for production use.

**Beginner Tip:** Use consistent cache key naming and set appropriate TTL values based on data freshness requirements.

**Advanced Tip:** Implement cache warming for frequently accessed data and use metrics to monitor cache performance and optimize hit rates.
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