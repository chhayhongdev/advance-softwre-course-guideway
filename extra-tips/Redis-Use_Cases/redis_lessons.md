# Redis Lessons: From Basic to Advanced

## Table of Contents
1. [Introduction to Redis](#introduction-to-redis)
2. [Basic Concepts](#basic-concepts)
3. [Data Types and Operations](#data-types-and-operations)
4. [Data Operations and Patterns](#data-operations-and-patterns)
5. [Intermediate Topics](#intermediate-topics)
6. [Advanced Features](#advanced-features)
7. [Real-World Use Cases](#real-world-use-cases)
8. [Best Practices and Performance](#best-practices-and-performance)
9. [Troubleshooting and Common Issues](#troubleshooting-and-common-issues)

## Introduction to Redis

Redis (Remote Dictionary Server) is an open-source, in-memory data structure store that can be used as a database, cache, and message broker. It's known for its high performance, versatility, and support for various data structures.

### Key Characteristics:
- **In-Memory**: Stores data in RAM for lightning-fast access
- **Persistent**: Optional disk persistence for durability
- **Versatile**: Supports multiple data types and use cases
- **Distributed**: Clustering and replication capabilities

## Basic Concepts

### Installation and Setup

```bash
# Install Redis (macOS with Homebrew)
brew install redis

# Start Redis server
redis-server

# Connect to Redis CLI
redis-cli
```

### Basic Commands

```bash
# Set a key-value pair
SET name "John Doe"

# Get a value
GET name

# Check if key exists
EXISTS name

# Delete a key
DEL name

# Set expiration (TTL)
SET session_token "abc123" EX 3600
```

## Data Types and Operations

### 1. Strings
The most basic Redis data type - binary-safe strings up to 512MB.

```javascript
// Node.js example
const redis = require('redis');
const client = redis.createClient();

// Set and get strings
await client.set('user:123:name', 'Alice');
const name = await client.get('user:123:name');

// Increment counters
await client.set('counter', 0);
await client.incr('counter'); // 1
await client.incrby('counter', 5); // 6
```

### 2. Lists
Ordered collections of strings, implemented as linked lists.

```javascript
// Push elements to list
await client.lpush('tasks', 'task1', 'task2', 'task3');

// Get list length
const length = await client.llen('tasks');

// Get range of elements
const tasks = await client.lrange('tasks', 0, -1);

// Pop elements
const task = await client.rpop('tasks');
```

### 3. Sets
Unordered collections of unique strings.

```javascript
// Add members to set
await client.sadd('tags', 'javascript', 'redis', 'nodejs');

// Check membership
const isMember = await client.sismember('tags', 'redis');

// Get all members
const tags = await client.smembers('tags');

// Set operations
await client.sadd('set1', 'a', 'b', 'c');
await client.sadd('set2', 'b', 'c', 'd');
const intersection = await client.sinter('set1', 'set2'); // ['b', 'c']
```

### 4. Sorted Sets
Sets ordered by score, useful for rankings and priority queues.

```javascript
// Add members with scores
await client.zadd('leaderboard', 100, 'alice', 95, 'bob', 85, 'charlie');

// Get rank of member
const rank = await client.zrank('leaderboard', 'alice');

// Get range by score
const topPlayers = await client.zrange('leaderboard', 0, 2, 'WITHSCORES');

// Increment score
await client.zincrby('leaderboard', 10, 'alice');
```

### 5. Hashes
Maps between string fields and string values, perfect for objects.

```javascript
// Set hash fields
await client.hset('user:123', 'name', 'Alice', 'email', 'alice@example.com', 'age', '30');

// Get specific field
const name = await client.hget('user:123', 'name');

// Get all fields
const user = await client.hgetall('user:123');

// Increment numeric field
await client.hincrby('user:123', 'login_count', 1);
```

### 6. Bitmaps and HyperLogLog
Advanced data structures for specific use cases.

```javascript
// Bitmaps for bit-level operations
await client.setbit('user:123:login_days', 0, 1); // Monday
await client.setbit('user:123:login_days', 6, 1); // Sunday

// Count bits set to 1
const loginDays = await client.bitcount('user:123:login_days');

// HyperLogLog for unique counting
await client.pfadd('unique_visitors', 'user1', 'user2', 'user3');
const count = await client.pfcount('unique_visitors');
```

## Data Operations and Patterns

### Atomic Operations

Redis provides atomic operations that execute as single, indivisible operations, ensuring data consistency even with concurrent access.

#### Counter Operations
```javascript
// Atomic increment/decrement
await client.set('counter', 0);
await client.incr('counter'); // 1
await client.incrby('counter', 5); // 6
await client.decr('counter'); // 5
await client.decrby('counter', 2); // 3

// Atomic increment with expiration (if key doesn't exist)
await client.incr('new_counter'); // Creates key with value 1
```

#### Conditional Operations
```javascript
// SET only if key doesn't exist (NX)
const result1 = await client.set('lock:key', 'locked', 'NX', 'EX', 30);
console.log(result1); // 'OK' if set, null if key exists

// SET only if key exists (XX)
const result2 = await client.set('existing:key', 'new_value', 'XX');
console.log(result2); // 'OK' if updated, null if key doesn't exist

// GETSET - Get old value and set new value atomically
const oldValue = await client.getset('counter', '0');
console.log(oldValue); // Previous value
```

### Batch Operations

#### Pipelining
Send multiple commands to Redis without waiting for each response, reducing network round trips.

```javascript
// Basic pipelining
const pipeline = client.pipeline();

pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.get('key1');
pipeline.get('key2');
pipeline.del('key1');

const results = await pipeline.exec();
console.log(results);
// [
//   [null, 'OK'],     // SET key1
//   [null, 'OK'],     // SET key2
//   [null, 'value1'], // GET key1
//   [null, 'value2'], // GET key2
//   [null, 1]         // DEL key1
// ]
```

#### Multi-Get and Multi-Set
```javascript
// Set multiple keys at once
await client.mset('user:1:name', 'Alice', 'user:1:age', '25', 'user:2:name', 'Bob');

// Get multiple keys at once
const values = await client.mget('user:1:name', 'user:1:age', 'user:2:name');
console.log(values); // ['Alice', '25', 'Bob']

// Set multiple keys with expiration
await client.mset('temp:key1', 'value1', 'temp:key2', 'value2');
await client.expire('temp:key1', 60);
await client.expire('temp:key2', 60);
```

### Data Manipulation Patterns

#### Key Patterns and Namespacing
```javascript
// Consistent key naming patterns
const KeyPatterns = {
  user: (id) => `user:${id}`,
  userProfile: (id) => `user:${id}:profile`,
  userPosts: (id) => `user:${id}:posts`,
  userFriends: (id) => `user:${id}:friends`,
  post: (id) => `post:${id}`,
  postLikes: (id) => `post:${id}:likes`,
  session: (id) => `session:${id}`,
  cache: (key) => `cache:${key}`
};

// Usage
await client.hset(KeyPatterns.userProfile(123), 'name', 'Alice', 'email', 'alice@example.com');
await client.sadd(KeyPatterns.userFriends(123), 'user:456', 'user:789');
```

#### Data Serialization Patterns
```javascript
class RedisSerializer {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  // Store complex objects as JSON
  async setObject(key, obj, ttl = null) {
    const data = JSON.stringify(obj);
    if (ttl) {
      return await this.redis.setex(key, ttl, data);
    }
    return await this.redis.set(key, data);
  }

  // Retrieve and parse JSON objects
  async getObject(key) {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  // Store arrays efficiently
  async setArray(key, arr, ttl = null) {
    // For small arrays, JSON is fine
    if (arr.length <= 100) {
      return await this.setObject(key, arr, ttl);
    }

    // For large arrays, use Redis lists
    await this.redis.del(key); // Clear existing
    if (arr.length > 0) {
      await this.redis.rpush(key, ...arr.map(item => JSON.stringify(item)));
    }

    if (ttl) {
      await this.redis.expire(key, ttl);
    }
  }

  async getArray(key) {
    const length = await this.redis.llen(key);
    if (length === 0) return [];

    const items = await this.redis.lrange(key, 0, -1);
    return items.map(item => JSON.parse(item));
  }
}
```

#### Time-Series Data Operations
```javascript
class TimeSeriesManager {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  // Store timestamped data
  async addDataPoint(metric, timestamp, value) {
    const key = `metric:${metric}`;
    await this.redis.zadd(key, timestamp, `${timestamp}:${value}`);
  }

  // Get data points in time range
  async getDataPoints(metric, startTime, endTime, limit = 1000) {
    const key = `metric:${metric}`;
    const data = await this.redis.zrangebyscore(key, startTime, endTime, 'LIMIT', 0, limit);

    return data.map(item => {
      const [timestamp, value] = item.split(':');
      return { timestamp: parseInt(timestamp), value: parseFloat(value) };
    });
  }

  // Aggregate data (sum, count, average)
  async getAggregatedData(metric, startTime, endTime) {
    const dataPoints = await this.getDataPoints(metric, startTime, endTime);

    if (dataPoints.length === 0) return null;

    const sum = dataPoints.reduce((acc, point) => acc + point.value, 0);
    return {
      count: dataPoints.length,
      sum: sum,
      average: sum / dataPoints.length,
      min: Math.min(...dataPoints.map(p => p.value)),
      max: Math.max(...dataPoints.map(p => p.value))
    };
  }
}

// Usage
const ts = new TimeSeriesManager(client);
await ts.addDataPoint('cpu_usage', Date.now(), 85.5);
await ts.addDataPoint('cpu_usage', Date.now() + 1000, 87.2);

const hourlyData = await ts.getAggregatedData('cpu_usage',
  Date.now() - 3600000, Date.now());
```

#### Geospatial Operations
```javascript
// Store and query geospatial data
await client.geoadd('restaurants', 13.361389, 38.115556, 'restaurant:1');
await client.geoadd('restaurants', 15.087269, 37.502669, 'restaurant:2');

// Find restaurants within radius
const nearby = await client.georadius('restaurants', 15, 37, 100, 'km');
console.log(nearby); // ['restaurant:2', 'restaurant:1']

// Get distance between points
const distance = await client.geodist('restaurants', 'restaurant:1', 'restaurant:2', 'km');
console.log(distance); // Distance in km

// Get coordinates
const coords = await client.geopos('restaurants', 'restaurant:1');
console.log(coords); // [[13.361389338970184, 38.1155563954963]]
```

### Advanced Data Patterns

#### Bloom Filters (using Redis Bitmaps)
```javascript
class BloomFilter {
  constructor(redisClient, key, size = 1000000, hashCount = 3) {
    this.redis = redisClient;
    this.key = key;
    this.size = size;
    this.hashCount = hashCount;
  }

  // Simple hash functions (in production, use better hash functions)
  hash1(value) { return this.simpleHash(value) % this.size; }
  hash2(value) { return this.simpleHash(value + 'salt1') % this.size; }
  hash3(value) { return this.simpleHash(value + 'salt2') % this.size; }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  async add(value) {
    const hashes = [this.hash1(value), this.hash2(value), this.hash3(value)];
    const pipeline = this.redis.pipeline();

    hashes.forEach(hash => pipeline.setbit(this.key, hash, 1));
    await pipeline.exec();
  }

  async mightContain(value) {
    const hashes = [this.hash1(value), this.hash2(value), this.hash3(value)];
    const pipeline = this.redis.pipeline();

    hashes.forEach(hash => pipeline.getbit(this.key, hash));
    const results = await pipeline.exec();

    // If any bit is 0, definitely not present
    return results.every(([err, bit]) => bit === 1);
  }
}

// Usage
const bloom = new BloomFilter(client, 'email_filter');
await bloom.add('user@example.com');
const exists = await bloom.mightContain('user@example.com'); // true (might be present)
const exists2 = await bloom.mightContain('other@example.com'); // false (definitely not present)
```

#### HyperLogLog for Cardinality Estimation
```javascript
// Estimate unique visitors
await client.pfadd('daily_visitors:2024-01-01', 'user1', 'user2', 'user3');
await client.pfadd('daily_visitors:2024-01-01', 'user2', 'user4', 'user5');

const uniqueVisitors = await client.pfcount('daily_visitors:2024-01-01');
console.log(uniqueVisitors); // ~4 (estimated)

// Merge multiple HyperLogLogs
await client.pfmerge('weekly_visitors', 'daily_visitors:2024-01-01', 'daily_visitors:2024-01-02');
const weeklyCount = await client.pfcount('weekly_visitors');
```

## Intermediate Topics

### Caching Strategies

#### Cache-Aside Pattern
```javascript
class CacheAsideExample {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async getUser(userId) {
    // Try cache first
    let user = await this.redis.get(`user:${userId}`);
    if (user) {
      return JSON.parse(user);
    }

    // Cache miss - fetch from database
    user = await this.fetchFromDatabase(userId);

    // Store in cache with TTL
    await this.redis.setex(`user:${userId}`, 3600, JSON.stringify(user));

    return user;
  }
}
```

#### Write-Through Cache
```javascript
class WriteThroughCache {
  async updateUser(userId, userData) {
    // Update database first
    await this.updateDatabase(userId, userData);

    // Then update cache
    await this.redis.setex(`user:${userId}`, 3600, JSON.stringify(userData));
  }
}
```

### Session Management

```javascript
class SessionManager {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async createSession(userId, sessionData = {}) {
    const sessionId = this.generateSessionId();
    const sessionKey = `session:${sessionId}`;

    const session = {
      userId,
      createdAt: Date.now(),
      ...sessionData
    };

    await this.redis.setex(sessionKey, 3600, JSON.stringify(session));
    return sessionId;
  }

  async getSession(sessionId) {
    const session = await this.redis.get(`session:${sessionId}`);
    return session ? JSON.parse(session) : null;
  }

  async destroySession(sessionId) {
    await this.redis.del(`session:${sessionId}`);
  }
}
```

### Pub/Sub Messaging

```javascript
class PubSubExample {
  constructor(redisClient) {
    this.redis = redisClient;
    this.subscriber = redisClient.duplicate();
  }

  async publishMessage(channel, message) {
    await this.redis.publish(channel, JSON.stringify(message));
  }

  async subscribeToChannel(channel, callback) {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        callback(JSON.parse(message));
      }
    });
  }
}

// Usage
const pubsub = new PubSubExample(client);
await pubsub.subscribeToChannel('notifications', (msg) => {
  console.log('Received:', msg);
});

await pubsub.publishMessage('notifications', { type: 'user_login', userId: 123 });
```

## Advanced Features

### Redis Cluster

Redis Cluster provides automatic partitioning and high availability.

```javascript
// Connect to Redis Cluster
const cluster = redis.createCluster({
  rootNodes: [
    { host: '127.0.0.1', port: 7001 },
    { host: '127.0.0.1', port: 7002 },
    { host: '127.0.0.1', port: 7003 }
  ]
});

// Data is automatically partitioned across nodes
await cluster.set('key1', 'value1');
await cluster.set('key2', 'value2');
```

### Persistence

#### RDB Snapshots
Point-in-time snapshots saved to disk.

```redis.conf
# Save every 15 minutes if at least 1 key changed
save 900 1

# Save every 5 minutes if at least 10 keys changed
save 300 10

# Save every 1 minute if at least 10000 keys changed
save 60 10000
```

#### AOF (Append Only File)
Logs every write operation.

```redis.conf
# Enable AOF
appendonly yes

# AOF rewrite strategy
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

### Lua Scripting

Execute Lua scripts atomically on the server.

```javascript
const script = `
  local key = KEYS[1]
  local current = redis.call('GET', key)
  if not current then
    redis.call('SET', key, 1)
    return 1
  else
    local new_value = tonumber(current) + 1
    redis.call('SET', key, new_value)
    return new_value
  end
`;

const result = await client.eval(script, 1, 'counter');
```

### Transactions

Execute multiple commands atomically.

```javascript
const transaction = client.multi();

// Queue commands
transaction.set('user:123:name', 'Alice');
transaction.set('user:123:email', 'alice@example.com');
transaction.incr('user_count');

// Execute atomically
const results = await transaction.exec();
```

### Pipelining

Send multiple commands without waiting for responses.

```javascript
const pipeline = client.pipeline();

pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.get('key1');
pipeline.get('key2');

// Execute all at once
const results = await pipeline.exec();
```

## Real-World Use Cases

### 1. API Response Caching

```javascript
class APICache {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async cacheResponse(endpoint, params, response, ttl = 300) {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    await this.redis.setex(key, ttl, JSON.stringify(response));
  }

  async getCachedResponse(endpoint, params) {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
}
```

### 2. Rate Limiting

```javascript
class RateLimiter {
  constructor(redisClient, windowSeconds = 60, maxRequests = 100) {
    this.redis = redisClient;
    this.window = windowSeconds;
    this.max = maxRequests;
  }

  async isAllowed(userId) {
    const key = `ratelimit:${userId}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, this.window);
    }

    return current <= this.max;
  }
}
```

### 3. Distributed Locks

```javascript
class DistributedLock {
  constructor(redisClient) {
    this.redis = redisClient;
  }

  async acquireLock(lockKey, ttl = 30) {
    const result = await this.redis.set(lockKey, 'locked', 'NX', 'EX', ttl);
    return result === 'OK';
  }

  async releaseLock(lockKey) {
    await this.redis.del(lockKey);
  }
}
```

### 4. Video Streaming Platform (Advanced Example)

See `video_streaming.js` and `video_streaming.md` for a comprehensive implementation of Redis in video streaming platforms, including:
- Video metadata caching
- Session management
- View counting with atomic operations
- Live streaming viewer tracking
- Content recommendation caching
- Rate limiting for API protection

## Best Practices and Performance

### Memory Management

```javascript
// Monitor memory usage
const info = await client.info('memory');
console.log('Used memory:', info.used_memory_human);

// Set memory limits
// In redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Connection Pooling

```javascript
// Use connection pooling for high-throughput applications
const client = redis.createClient({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null
});
```

### Key Naming Conventions

```javascript
// Use consistent naming patterns
const keys = {
  user: (id) => `user:${id}`,
  userPosts: (id) => `user:${id}:posts`,
  post: (id) => `post:${id}`,
  postLikes: (id) => `post:${id}:likes`,
  session: (id) => `session:${id}`
};
```

### Monitoring and Metrics

```javascript
class RedisMonitor {
  async getStats() {
    const info = await this.redis.info();
    return {
      connected_clients: info.connected_clients,
      used_memory: info.used_memory,
      total_commands_processed: info.total_commands_processed,
      keyspace_hits: info.keyspace_hits,
      keyspace_misses: info.keyspace_misses
    };
  }

  async getSlowLog() {
    return await this.redis.slowlog('get', 10);
  }
}
```

## Troubleshooting and Common Issues

### Connection Issues

```javascript
// Handle connection errors
client.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Reconnect on failure
client.on('ready', () => {
  console.log('Redis connected successfully');
});
```

### Memory Issues

```bash
# Check memory usage
redis-cli info memory

# Find large keys
redis-cli --bigkeys

# Monitor commands
redis-cli monitor
```

### Performance Problems

```javascript
// Use SCAN instead of KEYS in production
async function scanKeys(pattern) {
  const stream = client.scanStream({ match: pattern });
  const keys = [];

  for await (const key of stream) {
    keys.push(key);
  }

  return keys;
}
```

### Data Persistence Issues

```bash
# Check if RDB/AOF files exist
ls -la /var/lib/redis/

# Force save
redis-cli save

# Check last save time
redis-cli lastsave
```

## Conclusion

Redis is a powerful tool that can significantly improve application performance when used appropriately. Start with basic key-value operations, then explore more complex data structures and patterns as your needs grow. Always consider your data access patterns, memory constraints, and scalability requirements when designing Redis-based solutions.

For more advanced use cases and production deployments, consider Redis Enterprise or Redis Cloud for additional features like active-active replication, auto-scaling, and enterprise security.

Remember: Redis shines when used for the right problems - caching, real-time analytics, session storage, and message queuing. It's not a replacement for traditional databases but a complement that can dramatically improve performance.