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

// API Response Caching example - caching API responses to reduce backend load
class APICacheManager {
    constructor(redisClient, defaultTTL = 300) {
        this.client = redisClient;
        this.defaultTTL = defaultTTL; // 5 minutes default
        this.cacheKey = 'api:cache';
        this.statsKey = 'api:cache:stats';
    }

    // Generate cache key from request details
    generateCacheKey(method, url, queryParams = {}, headers = {}) {
        // Create a deterministic key from request details
        const keyParts = [
            method.toUpperCase(),
            url,
            JSON.stringify(this.sortObject(queryParams)),
            JSON.stringify(this.sortObject(this.getCacheRelevantHeaders(headers)))
        ];

        return `${this.cacheKey}:${this.hashString(keyParts.join('|'))}`;
    }

    // Sort object keys for consistent hashing
    sortObject(obj) {
        const sorted = {};
        Object.keys(obj).sort().forEach(key => {
            sorted[key] = obj[key];
        });
        return sorted;
    }

    // Extract cache-relevant headers
    getCacheRelevantHeaders(headers) {
        const relevantHeaders = ['accept', 'accept-language', 'user-agent'];
        const result = {};

        for (const header of relevantHeaders) {
            if (headers[header]) {
                result[header] = headers[header];
            }
        }

        return result;
    }

    // Simple string hashing for cache keys
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    // Cache API response
    async cacheResponse(method, url, queryParams, headers, response, ttl = null) {
        const cacheKey = this.generateCacheKey(method, url, queryParams, headers);

        const cacheData = {
            response: JSON.stringify(response),
            cachedAt: new Date().toISOString(),
            ttl: ttl || this.defaultTTL,
            method,
            url,
            queryParams: JSON.stringify(queryParams),
            headers: JSON.stringify(headers)
        };

        await this.client.setEx(cacheKey, ttl || this.defaultTTL, JSON.stringify(cacheData));

        // Update cache statistics
        await this.updateCacheStats('hit', false); // This is a cache write, not a hit

        console.log(`Cached response for ${method} ${url}`);
        return cacheKey;
    }

    // Get cached response
    async getCachedResponse(method, url, queryParams = {}, headers = {}) {
        const cacheKey = this.generateCacheKey(method, url, queryParams, headers);
        const cachedData = await this.client.get(cacheKey);

        if (!cachedData) {
            await this.updateCacheStats('miss');
            return null;
        }

        try {
            const cacheEntry = JSON.parse(cachedData);
            const response = JSON.parse(cacheEntry.response);

            // Update access time
            cacheEntry.lastAccessed = new Date().toISOString();
            await this.client.setEx(cacheKey, cacheEntry.ttl, JSON.stringify(cacheEntry));

            await this.updateCacheStats('hit');
            console.log(`Cache hit for ${method} ${url}`);
            return {
                ...response,
                _cached: true,
                _cachedAt: cacheEntry.cachedAt,
                _cacheKey: cacheKey
            };
        } catch (error) {
            console.error('Error parsing cached response:', error);
            await this.client.del(cacheKey);
            return null;
        }
    }

    // Invalidate cache for specific URL pattern
    async invalidateCache(urlPattern) {
        const pattern = `${this.cacheKey}:*`;
        const keys = await this.client.keys(pattern);
        let invalidated = 0;

        for (const key of keys) {
            const cachedData = await this.client.get(key);
            if (cachedData) {
                try {
                    const cacheEntry = JSON.parse(cachedData);
                    if (cacheEntry.url.includes(urlPattern)) {
                        await this.client.del(key);
                        invalidated++;
                    }
                } catch (error) {
                    // Invalid cache entry, remove it
                    await this.client.del(key);
                }
            }
        }

        console.log(`Invalidated ${invalidated} cache entries matching pattern: ${urlPattern}`);
        return invalidated;
    }

    // Clear all cache
    async clearAllCache() {
        const pattern = `${this.cacheKey}:*`;
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
            await this.client.del(keys);
        }
        console.log(`Cleared ${keys.length} cache entries`);
        return keys.length;
    }

    // Update cache statistics
    async updateCacheStats(type, increment = true) {
        const now = new Date();
        const hour = now.getHours();
        const day = now.toISOString().split('T')[0];

        const statsKey = `${this.statsKey}:${day}:${hour}`;

        if (type === 'hit') {
            await this.client.hIncrBy(statsKey, 'hits', increment ? 1 : 0);
        } else if (type === 'miss') {
            await this.client.hIncrBy(statsKey, 'misses', increment ? 1 : 0);
        }

        // Set expiration (keep stats for 30 days)
        await this.client.expire(statsKey, 30 * 24 * 60 * 60);
    }

    // Get cache statistics
    async getCacheStats(hours = 24) {
        const now = new Date();
        const stats = { totalHits: 0, totalMisses: 0, hourlyStats: [] };

        for (let i = 0; i < hours; i++) {
            const date = new Date(now);
            date.setHours(date.getHours() - i);
            const hour = date.getHours();
            const day = date.toISOString().split('T')[0];

            const statsKey = `${this.statsKey}:${day}:${hour}`;
            const hourStats = await this.client.hGetAll(statsKey);

            const hits = parseInt(hourStats.hits) || 0;
            const misses = parseInt(hourStats.misses) || 0;

            stats.totalHits += hits;
            stats.totalMisses += misses;

            stats.hourlyStats.push({
                timestamp: date.toISOString(),
                hits,
                misses,
                total: hits + misses,
                hitRate: hits + misses > 0 ? (hits / (hits + misses) * 100).toFixed(2) : 0
            });
        }

        const total = stats.totalHits + stats.totalMisses;
        stats.overallHitRate = total > 0 ? (stats.totalHits / total * 100).toFixed(2) : 0;

        return stats;
    }

    // Simulate API call with caching
    async callAPI(method, url, queryParams = {}, headers = {}, forceRefresh = false) {
        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cachedResponse = await this.getCachedResponse(method, url, queryParams, headers);
            if (cachedResponse) {
                return cachedResponse;
            }
        }

        // Simulate API call delay
        console.log(`Making API call: ${method} ${url}`);
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200)); // 100-300ms delay

        // Simulate API response based on URL
        let response;
        if (url.includes('/users')) {
            response = {
                status: 200,
                data: {
                    users: [
                        { id: 1, name: 'Alice', email: 'alice@example.com' },
                        { id: 2, name: 'Bob', email: 'bob@example.com' }
                    ],
                    total: 2,
                    page: queryParams.page || 1
                },
                headers: { 'content-type': 'application/json' }
            };
        } else if (url.includes('/products')) {
            response = {
                status: 200,
                data: {
                    products: [
                        { id: 1, name: 'Laptop', price: 999.99 },
                        { id: 2, name: 'Mouse', price: 29.99 }
                    ],
                    total: 2,
                    category: queryParams.category || 'all'
                },
                headers: { 'content-type': 'application/json' }
            };
        } else {
            response = {
                status: 200,
                data: { message: 'Hello from API', timestamp: new Date().toISOString() },
                headers: { 'content-type': 'application/json' }
            };
        }

        // Cache the response
        await this.cacheResponse(method, url, queryParams, headers, response);

        return response;
    }

    // Warm up cache with common requests
    async warmupCache(requests) {
        console.log('Warming up cache...');
        for (const request of requests) {
            await this.callAPI(
                request.method || 'GET',
                request.url,
                request.queryParams || {},
                request.headers || {},
                true // Force refresh to ensure fresh data
            );
        }
        console.log(`Cache warmup completed for ${requests.length} requests`);
    }
}

// Demo the API caching functionality
async function demoAPICaching() {
    const cacheManager = new APICacheManager(client, 60); // 1 minute TTL

    console.log('=== Redis API Response Caching Demo ===\n');

    // Warm up cache with common requests
    console.log('1. Warming up cache:');
    await cacheManager.warmupCache([
        { method: 'GET', url: '/api/users', queryParams: { page: 1 } },
        { method: 'GET', url: '/api/products', queryParams: { category: 'electronics' } },
        { method: 'GET', url: '/api/status' }
    ]);
    console.log();

    // Test cache hits
    console.log('2. Testing cache hits:');
    console.log('First call (cache miss):');
    let response = await cacheManager.callAPI('GET', '/api/users', { page: 1 });
    console.log('Response:', response.data);

    console.log('Second call (cache hit):');
    response = await cacheManager.callAPI('GET', '/api/users', { page: 1 });
    console.log('Response cached:', response._cached);
    console.log();

    // Test different parameters (cache miss)
    console.log('3. Testing different parameters:');
    response = await cacheManager.callAPI('GET', '/api/users', { page: 2 });
    console.log('Different page (cache miss):', !response._cached);
    console.log();

    // Test cache invalidation
    console.log('4. Testing cache invalidation:');
    console.log('Before invalidation:');
    response = await cacheManager.callAPI('GET', '/api/users', { page: 1 });
    console.log('Cached:', response._cached);

    await cacheManager.invalidateCache('/users');

    console.log('After invalidation:');
    response = await cacheManager.callAPI('GET', '/api/users', { page: 1 });
    console.log('Cached:', response._cached);
    console.log();

    // Test force refresh
    console.log('5. Testing force refresh:');
    response = await cacheManager.callAPI('GET', '/api/products', { category: 'electronics' }, {}, true);
    console.log('Force refresh (cache miss):', !response._cached);
    console.log();

    // Simulate multiple requests to build statistics
    console.log('6. Simulating multiple requests:');
    const requests = [
        { method: 'GET', url: '/api/users', params: { page: 1 } },
        { method: 'GET', url: '/api/products', params: { category: 'electronics' } },
        { method: 'GET', url: '/api/status' },
        { method: 'GET', url: '/api/users', params: { page: 1 } }, // Cache hit
        { method: 'GET', url: '/api/products', params: { category: 'books' } }, // Cache miss
        { method: 'GET', url: '/api/users', params: { page: 1 } }, // Cache hit
    ];

    for (const req of requests) {
        await cacheManager.callAPI(req.method, req.url, req.params || {});
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
    }
    console.log();

    // Get cache statistics
    console.log('7. Cache statistics:');
    const stats = await cacheManager.getCacheStats(1); // Last hour
    console.log('Cache stats for last hour:');
    console.log(`  Total requests: ${stats.totalHits + stats.totalMisses}`);
    console.log(`  Cache hits: ${stats.totalHits}`);
    console.log(`  Cache misses: ${stats.totalMisses}`);
    console.log(`  Hit rate: ${stats.overallHitRate}%`);
    console.log();

    // Show hourly breakdown
    console.log('Hourly breakdown:');
    stats.hourlyStats.slice(0, 1).forEach(hour => {
        console.log(`  ${hour.timestamp}: ${hour.hits} hits, ${hour.misses} misses (${hour.hitRate}% hit rate)`);
    });
    console.log();

    // Clear cache
    console.log('8. Clearing cache:');
    const cleared = await cacheManager.clearAllCache();
    console.log(`Cleared ${cleared} cache entries`);
    console.log();

    // Verify cache is cleared
    console.log('9. Verifying cache is cleared:');
    response = await cacheManager.callAPI('GET', '/api/users', { page: 1 });
    console.log('After clear (cache miss):', !response._cached);

    await client.disconnect();
    console.log('\nAPI Response Caching demo completed!');
}

demoAPICaching().catch(console.error);