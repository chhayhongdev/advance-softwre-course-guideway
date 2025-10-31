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

// Caching example - simulating database queries with Redis cache
class CacheManager {
    constructor(redisClient) {
        this.client = redisClient;
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    // Simulate expensive database operation
    async getUserFromDatabase(userId) {
        console.log(`Fetching user ${userId} from database...`);
        // Simulate database delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
            id: userId,
            name: `User ${userId}`,
            email: `user${userId}@example.com`,
            lastLogin: new Date().toISOString()
        };
    }

    // Get user with caching
    async getUser(userId) {
        const cacheKey = `user:${userId}`;

        try {
            // Check cache first
            const cachedUser = await this.client.get(cacheKey);
            if (cachedUser) {
                this.cacheHits++;
                console.log(`Cache HIT for user ${userId}`);
                return JSON.parse(cachedUser);
            }

            // Cache miss - fetch from database
            this.cacheMisses++;
            console.log(`Cache MISS for user ${userId}`);
            const user = await this.getUserFromDatabase(userId);

            // Store in cache with 5-minute expiration
            await this.client.setEx(cacheKey, 300, JSON.stringify(user));

            return user;
        } catch (error) {
            console.error('Cache error:', error);
            // Fallback to database
            return await this.getUserFromDatabase(userId);
        }
    }

    // Invalidate cache for a user
    async invalidateUserCache(userId) {
        const cacheKey = `user:${userId}`;
        await this.client.del(cacheKey);
        console.log(`Cache invalidated for user ${userId}`);
    }

    // Get cache statistics
    getStats() {
        const total = this.cacheHits + this.cacheMisses;
        const hitRate = total > 0 ? (this.cacheHits / total * 100).toFixed(2) : 0;
        return {
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            hitRate: `${hitRate}%`
        };
    }
}

// Demo the caching functionality
async function demoCaching() {
    const cache = new CacheManager(client);

    console.log('=== Redis Caching Demo ===\n');

    // First request - cache miss
    console.log('1. First request (cache miss):');
    let user = await cache.getUser(1);
    console.log('User:', user);
    console.log();

    // Second request - cache hit
    console.log('2. Second request (cache hit):');
    user = await cache.getUser(1);
    console.log('User:', user);
    console.log();

    // Third request - still cache hit
    console.log('3. Third request (cache hit):');
    user = await cache.getUser(1);
    console.log('User:', user);
    console.log();

    // Different user - cache miss
    console.log('4. Different user (cache miss):');
    user = await cache.getUser(2);
    console.log('User:', user);
    console.log();

    // Invalidate cache
    console.log('5. Invalidating cache for user 1:');
    await cache.invalidateUserCache(1);
    console.log();

    // Request invalidated user - cache miss
    console.log('6. Request invalidated user (cache miss):');
    user = await cache.getUser(1);
    console.log('User:', user);
    console.log();

    // Show cache statistics
    console.log('7. Cache Statistics:');
    console.log(cache.getStats());

    await client.disconnect();
}

demoCaching().catch(console.error);