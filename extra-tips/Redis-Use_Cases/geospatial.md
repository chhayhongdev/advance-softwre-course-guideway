# Redis Data Structures: From Beginner to Advanced

## What are Redis Data Structures?

**Beginner Level:** Redis isn't just for storing simple key-value pairs. It has special data types like lists, sets, and hashes that make complex operations fast and easy. Think of them as different types of containers, each good for specific tasks.

**Intermediate Level:** Redis provides several built-in data structures beyond simple strings: lists, sets, sorted sets, hashes, bitmaps, hyperloglogs, and streams. Each structure is optimized for specific use cases and operations.

## Why Redis Data Structures?

- **Performance:** O(1) operations for most common use cases
- **Memory Efficient:** Compact storage for different data patterns
- **Atomic Operations:** Consistent updates across complex data
- **Versatility:** One database, many data modeling options
- **Rich API:** Specialized commands for each data type

## Strings: Beyond Simple Values

### Beginner Example: Basic String Operations

```javascript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

// Basic string operations
await client.set('user:name', 'Alice');
await client.set('user:age', '25');

const name = await client.get('user:name');
const age = await client.get('user:age');

console.log(`${name} is ${age} years old`);

// Increment operations
await client.set('counter', '0');
await client.incr('counter'); // 1
await client.incrBy('counter', 5); // 6

// String manipulation
await client.set('message', 'Hello World');
await client.append('message', '!'); // 'Hello World!'
const length = await client.strLen('message'); // 12
```

### Advanced String Patterns

```javascript
class StringManager {
    async storeJSON(key, data) {
        await this.client.set(key, JSON.stringify(data));
    }

    async getJSON(key) {
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }

    async updateJSON(key, updates) {
        const current = await this.getJSON(key) || {};
        const updated = { ...current, ...updates };
        await this.storeJSON(key, updated);
        return updated;
    }

    // Bit operations for compact data
    async setBitField(key, offset, value) {
        // Store multiple small integers in one string
        await this.client.setBit(key, offset, value);
    }

    async getBitField(key, offset) {
        return await this.client.getBit(key, offset);
    }

    // Atomic counters with expiration
    async createExpiringCounter(key, ttl = 3600) {
        const exists = await this.client.exists(key);
        if (!exists) {
            await this.client.setEx(key, ttl, '0');
        }
        return await this.client.incr(key);
    }
}
```

## Lists: Ordered Collections

### Beginner Example: Task Queue

```javascript
// Lists are perfect for queues and stacks
await client.lPush('tasks', 'task1', 'task2', 'task3');

// Process tasks (FIFO queue)
let task;
while ((task = await client.rPop('tasks')) !== null) {
    console.log('Processing:', task);
}

// Stack operations (LIFO)
await client.lPush('stack', 'item1', 'item2', 'item3');
console.log(await client.rPop('stack')); // 'item1'
console.log(await client.rPop('stack')); // 'item2'
```

### Advanced List Patterns

```javascript
class ListManager {
    // Capped lists (keep only recent items)
    async addToCappedList(key, item, maxLength = 100) {
        await this.client.lPush(key, JSON.stringify(item));
        await this.client.lTrim(key, 0, maxLength - 1);
    }

    // Priority queues using multiple lists
    async addToPriorityQueue(item, priority = 'normal') {
        const queueKey = `queue:${priority}`;
        await this.client.lPush(queueKey, JSON.stringify(item));
    }

    async getNextFromPriorityQueue() {
        const priorities = ['high', 'normal', 'low'];

        for (const priority of priorities) {
            const queueKey = `queue:${priority}`;
            const item = await this.client.rPop(queueKey);
            if (item) {
                return { item: JSON.parse(item), priority };
            }
        }

        return null;
    }

    // Circular buffers
    async addToCircularBuffer(key, item, size = 10) {
        await this.client.lPush(key, JSON.stringify(item));
        await this.client.lTrim(key, 0, size - 1);
    }

    async getCircularBuffer(key) {
        const items = await this.client.lRange(key, 0, -1);
        return items.map(item => JSON.parse(item)).reverse(); // Most recent first
    }

    // List-based pagination
    async getPage(key, page = 1, pageSize = 10) {
        const start = (page - 1) * pageSize;
        const end = start + pageSize - 1;

        const items = await this.client.lRange(key, start, end);
        const total = await this.client.lLen(key);

        return {
            items: items.map(item => JSON.parse(item)),
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize)
        };
    }
}
```

## Sets: Unique Collections

### Beginner Example: Unique Visitors

```javascript
// Track unique visitors
await client.sAdd('visitors:today', 'user1', 'user2', 'user1'); // user1 added only once

const visitorCount = await client.sCard('visitors:today'); // 2
console.log(`Unique visitors: ${visitorCount}`);

// Check membership
const isVisitor = await client.sIsMember('visitors:today', 'user1'); // true

// Set operations
await client.sAdd('group:A', 'alice', 'bob', 'charlie');
await client.sAdd('group:B', 'bob', 'charlie', 'dave');

// Intersection (common members)
const common = await client.sInter('group:A', 'group:B'); // ['bob', 'charlie']

// Union (all members)
const all = await client.sUnion('group:A', 'group:B'); // ['alice', 'bob', 'charlie', 'dave']
```

### Advanced Set Patterns

```javascript
class SetManager {
    // Tagging system
    async addTags(itemId, tags) {
        const key = `tags:${itemId}`;
        await this.client.sAdd(key, ...tags);
    }

    async getItemsByTag(tag) {
        return await this.client.sMembers(`tag:${tag}`);
    }

    async getItemsByTags(tags, operator = 'and') {
        if (operator === 'and') {
            return await this.client.sInter(...tags.map(tag => `tag:${tag}`));
        } else {
            return await this.client.sUnion(...tags.map(tag => `tag:${tag}`));
        }
    }

    // Social graph relationships
    async addFriend(userId, friendId) {
        await this.client.sAdd(`friends:${userId}`, friendId);
        await this.client.sAdd(`friends:${friendId}`, userId); // Bidirectional
    }

    async getMutualFriends(userId, otherUserId) {
        return await this.client.sInter(`friends:${userId}`, `friends:${otherUserId}`);
    }

    async getFriendRecommendations(userId) {
        // Get friends of friends
        const friends = await this.client.sMembers(`friends:${userId}`);
        const friendKeys = friends.map(friend => `friends:${friend}`);

        if (friendKeys.length === 0) return [];

        const friendsOfFriends = await this.client.sUnion(...friendKeys);

        // Remove self and direct friends
        const recommendations = friendsOfFriends.filter(id =>
            id !== userId && !friends.includes(id)
        );

        return recommendations;
    }

    // Bloom filter approximation
    async addToBloomFilter(key, item) {
        const hashes = this.generateHashes(item, 3);
        for (const hash of hashes) {
            await this.client.setBit(key, hash % 1024, 1);
        }
    }

    async checkBloomFilter(key, item) {
        const hashes = this.generateHashes(item, 3);
        for (const hash of hashes) {
            const bit = await this.client.getBit(key, hash % 1024);
            if (bit === 0) return false;
        }
        return true; // Might be a false positive
    }

    generateHashes(item, count) {
        const hashes = [];
        for (let i = 0; i < count; i++) {
            hashes.push(this.simpleHash(item + i));
        }
        return hashes;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
        }
        return Math.abs(hash);
    }
}
```

## Sorted Sets: Ordered Unique Collections

### Beginner Example: Leaderboards

```javascript
// Simple leaderboard
await client.zAdd('leaderboard', [
    { score: 1500, value: 'alice' },
    { score: 1200, value: 'bob' },
    { score: 1800, value: 'charlie' }
]);

// Get top players
const topPlayers = await client.zRevRangeWithScores('leaderboard', 0, 2);
console.log('Top 3:', topPlayers);

// Get rank
const rank = await client.zRevRank('leaderboard', 'alice'); // 1 (0-based)
console.log('Alice rank:', rank + 1);
```

### Advanced Sorted Set Patterns

```javascript
class SortedSetManager {
    // Time-series data
    async addTimeSeriesData(metric, timestamp, value) {
        const key = `timeseries:${metric}`;
        await this.client.zAdd(key, [{ score: timestamp, value: value.toString() }]);

        // Keep only last 1000 points
        await this.client.zRemRangeByRank(key, 0, -1001);
    }

    async getTimeSeriesData(metric, startTime, endTime) {
        const key = `timeseries:${metric}`;
        return await this.client.zRangeByScoreWithScores(key, startTime, endTime);
    }

    // Sliding window rate limiting
    async isAllowed(userId, maxRequests, windowSeconds) {
        const key = `ratelimit:${userId}`;
        const now = Date.now();
        const windowStart = now - (windowSeconds * 1000);

        // Add current request
        await this.client.zAdd(key, [{ score: now, value: now.toString() }]);

        // Remove old requests
        await this.client.zRemRangeByScore(key, 0, windowStart);

        // Count requests in window
        const requestCount = await this.client.zCard(key);

        // Set expiration
        await this.client.expire(key, windowSeconds);

        return requestCount <= maxRequests;
    }

    // Priority queues with scores
    async addToPriorityQueue(task, priority) {
        const key = 'priority_queue';
        await this.client.zAdd(key, [{ score: priority, value: JSON.stringify(task) }]);
    }

    async getNextTask() {
        const key = 'priority_queue';
        const tasks = await this.client.zPopMax(key); // Get highest priority task

        if (tasks.length > 0) {
            return JSON.parse(tasks[0].value);
        }

        return null;
    }

    // Range queries for analytics
    async getScoreDistribution(leaderboardKey, minScore, maxScore) {
        return await this.client.zCount(leaderboardKey, minScore, maxScore);
    }

    async getPercentile(leaderboardKey, playerId) {
        const playerScore = await this.client.zScore(leaderboardKey, playerId);
        if (playerScore === null) return null;

        const totalPlayers = await this.client.zCard(leaderboardKey);
        const playersBelow = await this.client.zCount(leaderboardKey, 0, playerScore - 1);

        return (playersBelow / totalPlayers) * 100;
    }

    // Lexicographical ranges
    async addWord(word) {
        await this.client.zAdd('dictionary', [{ score: 0, value: word }]);
    }

    async getWordsInRange(start, end) {
        return await this.client.zRangeByLex('dictionary', `[${start}`, `[${end}`);
    }
}
```

## Hashes: Field-Value Objects

### Beginner Example: User Profiles

```javascript
// Store user data as hash
await client.hSet('user:123', {
    name: 'Alice',
    email: 'alice@example.com',
    age: '25',
    city: 'New York'
});

// Get specific fields
const name = await client.hGet('user:123', 'name');
const email = await client.hGet('user:123', 'email');

// Get all fields
const user = await client.hGetAll('user:123');
console.log(user);

// Update specific fields
await client.hSet('user:123', 'last_login', new Date().toISOString());

// Increment numeric fields
await client.hIncrBy('user:123', 'login_count', 1);
```

### Advanced Hash Patterns

```javascript
class HashManager {
    // Nested objects with serialization
    async storeNestedObject(key, obj) {
        const flat = this.flattenObject(obj);
        await this.client.hSet(key, flat);
    }

    async getNestedObject(key) {
        const flat = await this.client.hGetAll(key);
        return this.unflattenObject(flat);
    }

    flattenObject(obj, prefix = '') {
        const flattened = {};

        for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}.${key}` : key;

            if (typeof value === 'object' && value !== null) {
                Object.assign(flattened, this.flattenObject(value, newKey));
            } else {
                flattened[newKey] = String(value);
            }
        }

        return flattened;
    }

    unflattenObject(flat) {
        const result = {};

        for (const [key, value] of Object.entries(flat)) {
            const keys = key.split('.');
            let current = result;

            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) current[keys[i]] = {};
                current = current[keys[i]];
            }

            current[keys[keys.length - 1]] = value;
        }

        return result;
    }

    // Counters within hashes
    async incrementField(key, field, amount = 1) {
        return await this.client.hIncrBy(key, field, amount);
    }

    async getField(key, field) {
        return await this.client.hGet(key, field);
    }

    // Hash-based caching
    async cacheObject(key, obj, ttl = 3600) {
        await this.client.hSet(key, this.flattenObject(obj));
        await this.client.expire(key, ttl);
    }

    async getCachedObject(key) {
        const flat = await this.client.hGetAll(key);
        return Object.keys(flat).length > 0 ? this.unflattenObject(flat) : null;
    }
}
```

## Bitmaps: Compact Boolean Arrays

### Beginner Example: User Activity Tracking

```javascript
// Track daily active users (bit per user)
const today = new Date().toISOString().split('T')[0];

for (let userId = 1; userId <= 1000; userId++) {
    if (Math.random() > 0.5) { // 50% chance of being active
        await client.setBit(`active_users:${today}`, userId, 1);
    }
}

// Count active users
const activeCount = await client.bitCount(`active_users:${today}`);
console.log(`Active users today: ${activeCount}`);

// Check if specific user was active
const wasActive = await client.getBit(`active_users:${today}`, 123);
console.log(`User 123 was ${wasActive ? 'active' : 'inactive'}`);
```

### Advanced Bitmap Patterns

```javascript
class BitmapManager {
    // Multi-day analytics
    async trackUserActivity(userId, date, active = true) {
        const key = `user_activity:${userId}`;
        const dayOffset = this.getDayOffset(date);

        await this.client.setBit(key, dayOffset, active ? 1 : 0);
    }

    async getUserActivityDays(userId, startDate, endDate) {
        const key = `user_activity:${userId}`;
        const startOffset = this.getDayOffset(startDate);
        const endOffset = this.getDayOffset(endDate);

        const activityBits = [];
        for (let offset = startOffset; offset <= endOffset; offset++) {
            const bit = await this.client.getBit(key, offset);
            activityBits.push(bit);
        }

        return activityBits;
    }

    async getActiveDaysCount(userId, startDate, endDate) {
        const key = `user_activity:${userId}`;
        const startOffset = this.getDayOffset(startDate);
        const endOffset = this.getDayOffset(endDate);

        let count = 0;
        for (let offset = startOffset; offset <= endOffset; offset++) {
            const bit = await this.client.getBit(key, offset);
            if (bit === 1) count++;
        }

        return count;
    }

    getDayOffset(date) {
        const start = new Date('2020-01-01'); // Arbitrary start date
        const target = new Date(date);
        const diffTime = target.getTime() - start.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    // Real-time analytics with bit operations
    async performBitOperation(operation, destKey, ...sourceKeys) {
        // AND, OR, XOR, NOT operations between bitmaps
        await this.client.bitOp(operation, destKey, sourceKeys);
        return await this.client.bitCount(destKey);
    }

    async findFirstSetBit(key, start = 0) {
        // Find first active bit (useful for finding first active day, etc.)
        const bitmap = await this.client.get(key);
        if (!bitmap) return -1;

        const buffer = Buffer.from(bitmap, 'binary');
        for (let i = start; i < buffer.length * 8; i++) {
            const byteIndex = Math.floor(i / 8);
            const bitIndex = i % 8;

            if (buffer[byteIndex] & (1 << bitIndex)) {
                return i;
            }
        }

        return -1;
    }
}
```

## HyperLogLog: Approximate Unique Counting

### Beginner Example: Unique Visitors

```javascript
// Approximate unique visitor counting
await client.pfAdd('unique_visitors', 'user1', 'user2', 'user1', 'user3');

const uniqueCount = await client.pfCount('unique_visitors');
console.log(`Approximate unique visitors: ${uniqueCount}`);

// Merge multiple HyperLogLogs
await client.pfAdd('visitors:page1', 'user1', 'user2');
await client.pfAdd('visitors:page2', 'user2', 'user3');

await client.pfMerge('visitors:all', 'visitors:page1', 'visitors:page2');
const totalUnique = await client.pfCount('visitors:all');
console.log(`Total unique across pages: ${totalUnique}`);
```

### Advanced HyperLogLog Patterns

```javascript
class HyperLogLogManager {
    // Sliding window unique counts
    async addToSlidingWindow(windowKey, item, windowSize = 24) {
        const hour = new Date().getHours();
        const key = `${windowKey}:${hour}`;

        await this.client.pfAdd(key, item);
        await this.client.expire(key, windowSize * 3600); // Keep for window size hours
    }

    async getSlidingWindowCount(windowKey, windowSize = 24) {
        const currentHour = new Date().getHours();
        const keys = [];

        for (let i = 0; i < windowSize; i++) {
            const hour = (currentHour - i + 24) % 24;
            keys.push(`${windowKey}:${hour}`);
        }

        if (keys.length === 1) {
            return await this.client.pfCount(keys[0]);
        }

        const mergedKey = `${windowKey}:merged`;
        await this.client.pfMerge(mergedKey, keys);
        const count = await this.client.pfCount(mergedKey);
        await this.client.del(mergedKey); // Clean up

        return count;
    }

    // Error rate estimation
    async estimateErrorRate(testData) {
        const exactCount = new Set(testData).size;
        const key = 'error_test';

        await this.client.pfAdd(key, ...testData);
        const estimatedCount = await this.client.pfCount(key);

        const errorRate = Math.abs(estimatedCount - exactCount) / exactCount;
        await this.client.del(key); // Clean up

        return {
            exact: exactCount,
            estimated: estimatedCount,
            errorRate: errorRate * 100
        };
    }

    // Cardinality estimation for multiple sets
    async estimateUnionCardinality(...keys) {
        const unionKey = 'temp_union';
        await this.client.pfMerge(unionKey, keys);
        const count = await this.client.pfCount(unionKey);
        await this.client.del(unionKey);

        return count;
    }
}
```

## Streams: Append-Only Logs

### Beginner Example: Event Logging

```javascript
// Add events to stream
await client.xAdd('events', '*', {
    event_type: 'user_login',
    user_id: '123',
    timestamp: new Date().toISOString()
});

await client.xAdd('events', '*', {
    event_type: 'purchase',
    user_id: '123',
    product_id: '456',
    amount: '99.99'
});

// Read events
const events = await client.xRange('events', '-', '+');
console.log('All events:', events);

// Read recent events
const recentEvents = await client.xRevRange('events', '+', '-', { COUNT: 5 });
console.log('Recent events:', recentEvents);
```

### Advanced Stream Patterns

```javascript
class StreamManager {
    // Consumer groups for load balancing
    async createConsumerGroup(streamKey, groupName) {
        try {
            await this.client.xGroupCreate(streamKey, groupName, '0');
        } catch (error) {
            if (!error.message.includes('BUSYGROUP')) {
                throw error;
            }
        }
    }

    async addToStream(streamKey, data) {
        return await this.client.xAdd(streamKey, '*', data);
    }

    async consumeFromGroup(streamKey, groupName, consumerName) {
        const result = await this.client.xReadGroup(
            groupName,
            consumerName,
            [{ key: streamKey, id: '>' }],
            { COUNT: 1, BLOCK: 5000 }
        );

        if (result && result.length > 0) {
            const stream = result[0];
            const message = stream.messages[0];

            return {
                id: message.id,
                data: message.message
            };
        }

        return null;
    }

    async acknowledgeMessage(streamKey, groupName, messageId) {
        await this.client.xAck(streamKey, groupName, messageId);
    }

    // Stream trimming for memory management
    async trimStream(streamKey, maxLength = 1000) {
        await this.client.xTrim(streamKey, 'MAXLEN', maxLength);
    }

    // Time-based trimming
    async trimStreamByTime(streamKey, maxAgeMs = 86400000) { // 24 hours
        const cutoff = Date.now() - maxAgeMs;
        await this.client.xTrim(streamKey, 'MINID', cutoff.toString());
    }

    // Stream analytics
    async getStreamStats(streamKey) {
        const info = await this.client.xInfoStream(streamKey);

        return {
            length: info.length,
            radixTreeKeys: info['radix-tree-keys'],
            radixTreeNodes: info['radix-tree-nodes'],
            groups: info.groups,
            firstEntry: info['first-entry'],
            lastEntry: info['last-entry']
        };
    }
}
```

## Choosing the Right Data Structure

### Decision Guide

```javascript
class DataStructureSelector {
    // When to use Strings
    useString(need) {
        return [
            'Simple key-value storage',
            'Counters and atomic increments',
            'Caching serialized objects',
            'Bit operations'
        ].includes(need);
    }

    // When to use Lists
    useList(need) {
        return [
            'Queues and stacks',
            'Recent items (capped collections)',
            'Timeline data',
            'Pagination'
        ].includes(need);
    }

    // When to use Sets
    useSet(need) {
        return [
            'Unique collections',
            'Membership testing',
            'Set operations (union, intersection)',
            'Tagging systems'
        ].includes(need);
    }

    // When to use Sorted Sets
    useSortedSet(need) {
        return [
            'Leaderboards',
            'Priority queues',
            'Time-series data',
            'Range queries'
        ].includes(need);
    }

    // When to use Hashes
    useHash(need) {
        return [
            'Object storage',
            'Frequent field updates',
            'Memory-efficient small objects',
            'Nested data structures'
        ].includes(need);
    }

    // When to use Bitmaps
    useBitmap(need) {
        return [
            'Boolean arrays',
            'User activity tracking',
            'Analytics flags',
            'Compact boolean data'
        ].includes(need);
    }

    // When to use HyperLogLog
    useHyperLogLog(need) {
        return [
            'Approximate unique counting',
            'Large-scale analytics',
            'Memory-constrained unique counts',
            'Acceptable error margins'
        ].includes(need);
    }

    // When to use Streams
    useStream(need) {
        return [
            'Event sourcing',
            'Audit logs',
            'Message queues with persistence',
            'Time-ordered event storage'
        ].includes(need);
    }
}
```

## Performance Optimization

### Memory Management

```javascript
class MemoryOptimizer {
    // Monitor memory usage
    async getMemoryStats() {
        const info = await this.client.info('memory');
        return {
            usedMemory: info.used_memory,
            usedMemoryHuman: info.used_memory_human,
            maxMemory: info.maxmemory,
            fragmentationRatio: info.mem_fragmentation_ratio
        };
    }

    // Optimize data structure encoding
    async optimizeEncoding(key) {
        const encoding = await this.client.objectEncoding(key);
        console.log(`Encoding for ${key}: ${encoding}`);

        // Force encoding optimization
        await this.client.objectRefCount(key); // Touch the object
    }

    // Batch operations for better performance
    async batchSet(operations) {
        const pipeline = this.client.multi();

        for (const op of operations) {
            switch (op.type) {
                case 'set':
                    pipeline.set(op.key, op.value);
                    break;
                case 'hset':
                    pipeline.hSet(op.key, op.field, op.value);
                    break;
                case 'sadd':
                    pipeline.sAdd(op.key, op.member);
                    break;
                case 'zadd':
                    pipeline.zAdd(op.key, [{ score: op.score, value: op.member }]);
                    break;
            }
        }

        return await pipeline.exec();
    }
}
```

## Conclusion

Redis data structures provide powerful building blocks for complex applications. Start with simple operations on each type, then combine them for sophisticated data models.

**Beginner Tip:** Choose the data structure that best matches your access patterns - lists for ordered data, sets for unique items, hashes for objects.

**Advanced Tip:** Combine multiple data structures and use pipelines for atomic multi-key operations to build complex, high-performance systems.</content>
<parameter name="filePath">/Users/chhayhong/Desktop/Redis_University/data_structures.md