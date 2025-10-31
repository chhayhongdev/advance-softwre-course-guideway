# Redis Caching: From Beginner to Advanced

## What is Caching?

**Beginner Level:** Think of caching like keeping your favorite snacks in a kitchen cabinet instead of going to the store every time. When you need something, you check the cabinet first - if it's there, great! If not, you go to the store and maybe put some in the cabinet for next time.

**Intermediate Level:** Caching is a technique to store frequently accessed data in fast storage (memory) to reduce the time and resources needed to fetch it from slower storage (disk/database). Redis acts as this fast "cabinet" between your application and the database.

## Why Use Redis for Caching?

- **Speed:** Redis stores data in memory, making it 100-1000x faster than disk-based databases
- **Data Structures:** Beyond simple key-value, Redis supports complex data types
- **Persistence:** Optional disk persistence for cache survival across restarts
- **TTL (Time To Live):** Automatic expiration of cached data
- **Atomic Operations:** Thread-safe operations

## Basic Caching Pattern

### Beginner Example: Simple Key-Value Cache

```javascript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

// Store user data
await client.set('user:123', JSON.stringify({
    id: 123,
    name: 'Alice',
    email: 'alice@example.com'
}));

// Retrieve user data
const userData = await client.get('user:123');
const user = JSON.parse(userData);
console.log(user); // { id: 123, name: 'Alice', ... }
```

### Intermediate Example: Cache with Expiration

```javascript
// Cache with automatic expiration (TTL)
await client.setEx('user:123', 300, JSON.stringify(userData)); // Expires in 5 minutes

// Check if key exists
const exists = await client.exists('user:123');
if (exists) {
    console.log('Cache hit!');
} else {
    console.log('Cache miss - fetch from database');
}
```

## Cache-Aside Pattern (Most Common)

### Beginner Understanding

1. **Check cache first** - Is the data in Redis?
2. **If yes (cache hit)** - Return cached data
3. **If no (cache miss)** - Fetch from database, store in cache, return data

### Intermediate Implementation

```javascript
class CacheManager {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async getUser(userId) {
        const cacheKey = `user:${userId}`;

        // 1. Check cache
        const cachedUser = await this.client.get(cacheKey);
        if (cachedUser) {
            console.log('Cache HIT');
            return JSON.parse(cachedUser);
        }

        // 2. Cache miss - fetch from database
        console.log('Cache MISS - fetching from database');
        const user = await this.fetchUserFromDatabase(userId);

        // 3. Store in cache with expiration
        await this.client.setEx(cacheKey, 300, JSON.stringify(user));

        return user;
    }

    async fetchUserFromDatabase(userId) {
        // Simulate database call
        return {
            id: userId,
            name: `User ${userId}`,
            email: `user${userId}@example.com`
        };
    }
}
```

## Advanced Caching Strategies

### Write-Through Cache

**When to use:** When data consistency is critical

```javascript
class WriteThroughCache {
    async saveUser(user) {
        // 1. Save to database first
        await this.saveToDatabase(user);

        // 2. Then update cache
        const cacheKey = `user:${user.id}`;
        await this.client.setEx(cacheKey, 300, JSON.stringify(user));

        return user;
    }
}
```

### Write-Behind Cache (Write-Back)

**When to use:** High write performance needed, eventual consistency acceptable

```javascript
class WriteBehindCache {
    constructor() {
        this.writeQueue = [];
        this.flushInterval = setInterval(() => this.flushToDatabase(), 5000);
    }

    async saveUser(user) {
        // 1. Write to cache immediately
        const cacheKey = `user:${user.id}`;
        await this.client.setEx(cacheKey, 300, JSON.stringify(user));

        // 2. Queue for database write
        this.writeQueue.push(user);
    }

    async flushToDatabase() {
        if (this.writeQueue.length === 0) return;

        // Batch write to database
        await this.batchSaveToDatabase(this.writeQueue);
        this.writeQueue = [];
    }
}
```

## Cache Invalidation Strategies

### Time-Based Expiration (TTL)

```javascript
// Automatic expiration
await client.setEx('volatile:data', 3600, data); // Expires in 1 hour

// Check remaining TTL
const ttl = await client.ttl('volatile:data');
console.log(`${ttl} seconds remaining`);
```

### Manual Invalidation

```javascript
class CacheInvalidator {
    async invalidateUser(userId) {
        const cacheKey = `user:${userId}`;
        await this.client.del(cacheKey);
        console.log(`Cache invalidated for user ${userId}`);
    }

    async invalidatePattern(pattern) {
        // Invalidate all keys matching pattern
        const keys = await this.client.keys(`user:${pattern}*`);
        if (keys.length > 0) {
            await this.client.del(keys);
        }
    }
}
```

## Cache Performance Monitoring

### Basic Cache Statistics

```javascript
class CacheStats {
    constructor() {
        this.hits = 0;
        this.misses = 0;
    }

    recordHit() { this.hits++; }
    recordMiss() { this.misses++; }

    getHitRate() {
        const total = this.hits + this.misses;
        return total > 0 ? (this.hits / total * 100).toFixed(2) : 0;
    }

    getStats() {
        return {
            hits: this.hits,
            misses: this.misses,
            totalRequests: this.hits + this.misses,
            hitRate: `${this.getHitRate()}%`
        };
    }
}
```

## Advanced: Cache Warming and Preloading

```javascript
class CacheWarmer {
    async warmupFrequentlyAccessedData() {
        // Preload commonly accessed users
        const popularUserIds = [1, 2, 3, 4, 5];

        for (const userId of popularUserIds) {
            const user = await this.fetchUserFromDatabase(userId);
            await this.client.setEx(`user:${userId}`, 3600, JSON.stringify(user));
        }

        console.log('Cache warmed up with popular data');
    }
}
```

## Redis Cache Best Practices

### 1. Key Naming Conventions
```javascript
// Good: descriptive and structured
user:123:profile
product:456:reviews
cache:api:users:list

// Bad: unclear
u123
p456
data1
```

### 2. Memory Management
```javascript
// Set memory limits
await client.configSet('maxmemory', '256mb');
await client.configSet('maxmemory-policy', 'allkeys-lru'); // LRU eviction
```

### 3. Serialization Strategy
```javascript
// Consistent JSON serialization
const serialize = (data) => JSON.stringify(data, Object.keys(data).sort());
const deserialize = (data) => JSON.parse(data);
```

## Common Caching Pitfalls

### 1. Cache Penetration
**Problem:** Requests for non-existent data bypass cache and hit database
**Solution:** Cache negative results with short TTL

```javascript
async getUser(userId) {
    const cacheKey = `user:${userId}`;

    const cached = await this.client.get(cacheKey);
    if (cached !== null) {
        return cached === 'null' ? null : JSON.parse(cached);
    }

    const user = await this.fetchUserFromDatabase(userId);

    // Cache negative results too
    await this.client.setEx(cacheKey, 60, user ? JSON.stringify(user) : 'null');

    return user;
}
```

### 2. Cache Avalanche
**Problem:** Mass cache expiration causes database overload
**Solution:** Stagger expiration times with jitter

```javascript
// Add random jitter to TTL
const baseTTL = 300; // 5 minutes
const jitter = Math.random() * 60; // Up to 1 minute jitter
const finalTTL = baseTTL + jitter;

await this.client.setEx(cacheKey, finalTTL, data);
```

## Real-World Use Cases

1. **Database Query Caching**
2. **API Response Caching**
3. **Session Storage**
4. **Computed Result Caching**
5. **Static Asset Caching**

## Performance Benchmarks

Typical Redis caching performance:
- **Set operations:** ~100,000 ops/sec
- **Get operations:** ~150,000 ops/sec
- **Memory usage:** ~1KB per cached object
- **Network latency:** <1ms for local Redis

## Monitoring and Alerting

```javascript
class CacheMonitor {
    async getCacheHealth() {
        const info = await this.client.info('memory');
        const hitRate = await this.calculateHitRate();

        return {
            memoryUsage: info.used_memory_human,
            hitRate: hitRate,
            connectedClients: info.connected_clients,
            status: hitRate > 80 ? 'healthy' : 'warning'
        };
    }
}
```

## Conclusion

Caching with Redis is fundamental to building scalable applications. Start simple with cache-aside pattern, then progress to more sophisticated strategies as your needs grow. Always monitor cache performance and have fallback strategies for cache failures.

**Beginner Tip:** Start with TTL-based caching for any frequently accessed data.

**Advanced Tip:** Implement cache warming for critical application paths and monitor cache hit rates continuously.</content>
<parameter name="filePath">/Users/chhayhong/Desktop/Redis_University/caching.md