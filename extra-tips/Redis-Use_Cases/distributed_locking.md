# Redis Distributed Locking: From Beginner to Advanced

## What is Distributed Locking?

**Beginner Level:** Distributed locking is like having a shared lock that multiple computers can use. Imagine you have a shared resource (like a database) that multiple servers want to access. You need a way to make sure only one server can use it at a time, even if the servers are on different machines.

**Intermediate Level:** Distributed locking ensures mutual exclusion across multiple processes or machines. Redis provides atomic operations that can be used to implement distributed locks, preventing race conditions in distributed systems.

## Why Redis for Distributed Locking?

- **Atomic Operations:** SET with NX/EX flags for atomic lock acquisition
- **Automatic Expiration:** Locks can expire automatically to prevent deadlocks
- **High Performance:** Sub-millisecond lock operations
- **Reliability:** Redis persistence ensures locks survive restarts
- **Simplicity:** Easy to implement compared to other solutions

## Basic Distributed Locking

### Beginner Example: Simple Lock Implementation

```javascript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

class SimpleLock {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async acquireLock(lockKey, ttlSeconds = 30) {
        const lockValue = `lock:${Date.now()}:${Math.random()}`;

        // Try to acquire lock
        const result = await this.client.set(lockKey, lockValue, {
            NX: true,  // Only set if key doesn't exist
            EX: ttlSeconds  // Expire after TTL seconds
        });

        return result === 'OK' ? lockValue : null;
    }

    async releaseLock(lockKey, lockValue) {
        // Use Lua script for atomic check-and-delete
        const script = `
            if redis.call('GET', KEYS[1]) == ARGV[1] then
                return redis.call('DEL', KEYS[1])
            else
                return 0
            end
        `;

        const result = await this.client.eval(script, {
            keys: [lockKey],
            arguments: [lockValue]
        });

        return result === 1;
    }

    async isLocked(lockKey) {
        return await this.client.exists(lockKey);
    }
}

// Example usage
const lock = new SimpleLock(client);

async function criticalSection() {
    const lockKey = 'my_resource_lock';
    const lockValue = await lock.acquireLock(lockKey, 30);

    if (lockValue) {
        try {
            // Critical section - only one process can be here at a time
            console.log('Lock acquired, performing critical operation...');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
            console.log('Critical operation completed');
        } finally {
            // Always release the lock
            await lock.releaseLock(lockKey, lockValue);
            console.log('Lock released');
        }
    } else {
        console.log('Could not acquire lock, resource is busy');
    }
}

await criticalSection();
```

### Intermediate Example: Lock with Retry Logic

```javascript
class RetryLock {
    constructor(redisClient, options = {}) {
        this.client = redisClient;
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 1000; // 1 second
        this.lockTimeout = options.lockTimeout || 30; // 30 seconds
    }

    async acquireLockWithRetry(lockKey, ttlSeconds = 30) {
        const lockValue = `lock:${Date.now()}:${Math.random()}`;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            const result = await this.client.set(lockKey, lockValue, {
                NX: true,
                EX: ttlSeconds
            });

            if (result === 'OK') {
                return lockValue;
            }

            if (attempt < this.maxRetries) {
                console.log(`Lock acquisition attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }

        return null;
    }

    async releaseLock(lockKey, lockValue) {
        const script = `
            if redis.call('GET', KEYS[1]) == ARGV[1] then
                return redis.call('DEL', KEYS[1])
            else
                return 0
            end
        `;

        return await this.client.eval(script, {
            keys: [lockKey],
            arguments: [lockValue]
        });
    }

    async withLock(lockKey, operation, ttlSeconds = 30) {
        const lockValue = await this.acquireLockWithRetry(lockKey, ttlSeconds);

        if (!lockValue) {
            throw new Error(`Could not acquire lock for key: ${lockKey}`);
        }

        try {
            return await operation();
        } finally {
            await this.releaseLock(lockKey, lockValue);
        }
    }
}

// Example usage with automatic lock management
const retryLock = new RetryLock(client);

async function safeDatabaseOperation() {
    return await retryLock.withLock('database_lock', async () => {
        // This code is guaranteed to run with exclusive access
        console.log('Performing database operation...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Database operation completed');
        return 'operation_result';
    });
}

try {
    const result = await safeDatabaseOperation();
    console.log('Result:', result);
} catch (error) {
    console.error('Operation failed:', error.message);
}
```

## Advanced Distributed Locking Patterns

### Lock Renewal (Watchdog)

```javascript
class RenewableLock {
    constructor(redisClient, options = {}) {
        this.client = redisClient;
        this.lockTimeout = options.lockTimeout || 30;
        this.renewalInterval = options.renewalInterval || 10; // Renew every 10 seconds
        this.renewalTimer = null;
    }

    async acquireLock(lockKey, ttlSeconds = 30) {
        const lockValue = `lock:${Date.now()}:${Math.random()}`;

        const result = await this.client.set(lockKey, lockValue, {
            NX: true,
            EX: ttlSeconds
        });

        if (result === 'OK') {
            // Start renewal timer
            this.startRenewal(lockKey, lockValue, ttlSeconds);
            return lockValue;
        }

        return null;
    }

    startRenewal(lockKey, lockValue, ttlSeconds) {
        this.renewalTimer = setInterval(async () => {
            const renewed = await this.renewLock(lockKey, lockValue, ttlSeconds);
            if (!renewed) {
                console.warn('Failed to renew lock, stopping renewal');
                this.stopRenewal();
            }
        }, this.renewalInterval * 1000);
    }

    async renewLock(lockKey, lockValue, ttlSeconds) {
        const script = `
            if redis.call('GET', KEYS[1]) == ARGV[1] then
                return redis.call('EXPIRE', KEYS[1], ARGV[2])
            else
                return 0
            end
        `;

        const result = await this.client.eval(script, {
            keys: [lockKey],
            arguments: [lockValue, ttlSeconds.toString()]
        });

        return result === 1;
    }

    stopRenewal() {
        if (this.renewalTimer) {
            clearInterval(this.renewalTimer);
            this.renewalTimer = null;
        }
    }

    async releaseLock(lockKey, lockValue) {
        this.stopRenewal();

        const script = `
            if redis.call('GET', KEYS[1]) == ARGV[1] then
                return redis.call('DEL', KEYS[1])
            else
                return 0
            end
        `;

        return await this.client.eval(script, {
            keys: [lockKey],
            arguments: [lockValue]
        });
    }

    async withAutoRenewal(lockKey, operation, ttlSeconds = 30) {
        const lockValue = await this.acquireLock(lockKey, ttlSeconds);

        if (!lockValue) {
            throw new Error(`Could not acquire lock for key: ${lockKey}`);
        }

        try {
            const result = await operation();
            return result;
        } finally {
            await this.releaseLock(lockKey, lockValue);
        }
    }
}

// Example usage with long-running operations
const renewableLock = new RenewableLock(client);

async function longRunningOperation() {
    return await renewableLock.withAutoRenewal('long_operation_lock', async () => {
        console.log('Starting long-running operation...');

        // Simulate long operation that takes longer than lock timeout
        for (let i = 0; i < 10; i++) {
            console.log(`Step ${i + 1}/10 completed`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds per step
        }

        console.log('Long-running operation completed');
        return 'success';
    }, 15); // 15 second lock timeout
}
```

### Multi-Lock Coordination

```javascript
class MultiLockCoordinator {
    constructor(redisClient) {
        this.client = redisClient;
        this.lockTimeout = 30;
    }

    async acquireMultipleLocks(lockKeys, ttlSeconds = 30) {
        const lockValues = new Map();
        const acquiredLocks = [];

        try {
            // Sort keys to prevent deadlocks
            const sortedKeys = [...lockKeys].sort();

            for (const lockKey of sortedKeys) {
                const lockValue = `lock:${Date.now()}:${Math.random()}`;

                const result = await this.client.set(lockKey, lockValue, {
                    NX: true,
                    EX: ttlSeconds
                });

                if (result === 'OK') {
                    lockValues.set(lockKey, lockValue);
                    acquiredLocks.push(lockKey);
                } else {
                    // Failed to acquire this lock, release all acquired locks
                    await this.releaseMultipleLocks(acquiredLocks, lockValues);
                    return null;
                }
            }

            return lockValues;
        } catch (error) {
            // Release any acquired locks on error
            await this.releaseMultipleLocks(acquiredLocks, lockValues);
            throw error;
        }
    }

    async releaseMultipleLocks(lockKeys, lockValues) {
        const script = `
            if redis.call('GET', KEYS[1]) == ARGV[1] then
                return redis.call('DEL', KEYS[1])
            else
                return 0
            end
        `;

        const releasePromises = lockKeys.map(lockKey => {
            const lockValue = lockValues.get(lockKey);
            if (lockValue) {
                return this.client.eval(script, {
                    keys: [lockKey],
                    arguments: [lockValue]
                });
            }
            return Promise.resolve(0);
        });

        await Promise.all(releasePromises);
    }

    async withMultipleLocks(lockKeys, operation, ttlSeconds = 30) {
        const lockValues = await this.acquireMultipleLocks(lockKeys, ttlSeconds);

        if (!lockValues) {
            throw new Error(`Could not acquire all locks: ${lockKeys.join(', ')}`);
        }

        try {
            return await operation();
        } finally {
            await this.releaseMultipleLocks(lockKeys, lockValues);
        }
    }
}

// Example usage for bank transfer (needs to lock both accounts)
const multiLock = new MultiLockCoordinator(client);

async function transferMoney(fromAccount, toAccount, amount) {
    const lockKeys = [`account:${fromAccount}`, `account:${toAccount}`];

    return await multiLock.withMultipleLocks(lockKeys, async () => {
        console.log(`Transferring $${amount} from ${fromAccount} to ${toAccount}`);

        // Get current balances
        const fromBalance = parseFloat(await client.get(`balance:${fromAccount}`) || '0');
        const toBalance = parseFloat(await client.get(`balance:${toAccount}`) || '0');

        if (fromBalance < amount) {
            throw new Error('Insufficient funds');
        }

        // Perform transfer
        await client.set(`balance:${fromAccount}`, (fromBalance - amount).toString());
        await client.set(`balance:${toAccount}`, (toBalance + amount).toString());

        console.log('Transfer completed successfully');
        return { fromBalance: fromBalance - amount, toBalance: toBalance + amount };
    });
}

// Initialize balances
await client.set('balance:account1', '1000');
await client.set('balance:account2', '500');

try {
    const result = await transferMoney('account1', 'account2', 200);
    console.log('Transfer result:', result);
} catch (error) {
    console.error('Transfer failed:', error.message);
}
```

### Read-Write Locks

```javascript
class ReadWriteLock {
    constructor(redisClient) {
        this.client = redisClient;
        this.readLockPrefix = 'read:';
        this.writeLockPrefix = 'write:';
    }

    async acquireReadLock(resource, ttlSeconds = 30) {
        const readLockKey = `${this.readLockPrefix}${resource}`;
        const writeLockKey = `${this.writeLockPrefix}${resource}`;

        // Check if write lock exists
        const writeLockExists = await this.client.exists(writeLockKey);
        if (writeLockExists) {
            return null; // Cannot acquire read lock while write lock exists
        }

        // Acquire read lock (increment counter)
        const lockValue = `read:${Date.now()}:${Math.random()}`;
        await this.client.hSet(readLockKey, lockValue, '1');

        // Set expiration on the hash
        await this.client.expire(readLockKey, ttlSeconds);

        return lockValue;
    }

    async acquireWriteLock(resource, ttlSeconds = 30) {
        const readLockKey = `${this.readLockPrefix}${resource}`;
        const writeLockKey = `${this.writeLockPrefix}${resource}`;

        // Check if any read locks exist
        const readLocksExist = await this.client.exists(readLockKey);
        if (readLocksExist) {
            return null; // Cannot acquire write lock while read locks exist
        }

        // Acquire write lock
        const lockValue = `write:${Date.now()}:${Math.random()}`;

        const result = await this.client.set(writeLockKey, lockValue, {
            NX: true,
            EX: ttlSeconds
        });

        return result === 'OK' ? lockValue : null;
    }

    async releaseReadLock(resource, lockValue) {
        const readLockKey = `${this.readLockPrefix}${resource}`;

        // Remove this reader's lock
        await this.client.hDel(readLockKey, lockValue);

        // If no more readers, clean up the hash
        const remainingReaders = await this.client.hLen(readLockKey);
        if (remainingReaders === 0) {
            await this.client.del(readLockKey);
        }
    }

    async releaseWriteLock(resource, lockValue) {
        const writeLockKey = `${this.writeLockPrefix}${resource}`;

        const script = `
            if redis.call('GET', KEYS[1]) == ARGV[1] then
                return redis.call('DEL', KEYS[1])
            else
                return 0
            end
        `;

        return await this.client.eval(script, {
            keys: [writeLockKey],
            arguments: [lockValue]
        });
    }

    async withReadLock(resource, operation, ttlSeconds = 30) {
        const lockValue = await this.acquireReadLock(resource, ttlSeconds);

        if (!lockValue) {
            throw new Error(`Could not acquire read lock for resource: ${resource}`);
        }

        try {
            return await operation();
        } finally {
            await this.releaseReadLock(resource, lockValue);
        }
    }

    async withWriteLock(resource, operation, ttlSeconds = 30) {
        const lockValue = await this.acquireWriteLock(resource, ttlSeconds);

        if (!lockValue) {
            throw new Error(`Could not acquire write lock for resource: ${resource}`);
        }

        try {
            return await operation();
        } finally {
            await this.releaseWriteLock(resource, lockValue);
        }
    }
}

// Example usage
const rwLock = new ReadWriteLock(client);

async function readData(resource) {
    return await rwLock.withReadLock(resource, async () => {
        console.log(`Reading data from ${resource}`);
        const data = await client.get(`data:${resource}`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate read time
        return data;
    });
}

async function writeData(resource, newData) {
    return await rwLock.withWriteLock(resource, async () => {
        console.log(`Writing data to ${resource}`);
        await client.set(`data:${resource}`, newData);
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate write time
        return 'success';
    });
}

// Initialize data
await client.set('data:shared_resource', 'initial_data');

// Demonstrate concurrent reads
const readPromises = [
    readData('shared_resource'),
    readData('shared_resource'),
    readData('shared_resource')
];

await Promise.all(readPromises);

// Demonstrate write lock blocking reads
const writePromise = writeData('shared_resource', 'updated_data');
const readDuringWrite = readData('shared_resource'); // This will wait

await writePromise;
await readDuringWrite;
```

## Lock Management and Monitoring

### Lock Registry

```javascript
class LockRegistry {
    constructor(redisClient) {
        this.client = redisClient;
        this.registryKey = 'lock_registry';
    }

    async registerLock(lockKey, owner, metadata = {}) {
        const lockInfo = {
            owner,
            acquiredAt: new Date().toISOString(),
            metadata
        };

        await this.client.hSet(this.registryKey, lockKey, JSON.stringify(lockInfo));
    }

    async unregisterLock(lockKey) {
        await this.client.hDel(this.registryKey, lockKey);
    }

    async getLockInfo(lockKey) {
        const info = await this.client.hGet(this.registryKey, lockKey);
        return info ? JSON.parse(info) : null;
    }

    async getAllLocks() {
        const locks = await this.client.hGetAll(this.registryKey);
        const result = {};

        for (const [lockKey, lockInfo] of Object.entries(locks)) {
            result[lockKey] = JSON.parse(lockInfo);
        }

        return result;
    }

    async findLocksByOwner(owner) {
        const allLocks = await this.getAllLocks();
        const ownerLocks = {};

        for (const [lockKey, lockInfo] of Object.entries(allLocks)) {
            if (lockInfo.owner === owner) {
                ownerLocks[lockKey] = lockInfo;
            }
        }

        return ownerLocks;
    }

    async cleanupExpiredLocks() {
        const allLocks = await this.getAllLocks();

        for (const [lockKey, lockInfo] of Object.entries(allLocks)) {
            const exists = await this.client.exists(lockKey);
            if (!exists) {
                // Lock key doesn't exist, remove from registry
                await this.unregisterLock(lockKey);
            }
        }
    }
}

// Enhanced lock with registry
class RegisteredLock extends SimpleLock {
    constructor(redisClient, owner) {
        super(redisClient);
        this.registry = new LockRegistry(redisClient);
        this.owner = owner;
    }

    async acquireLock(lockKey, ttlSeconds = 30) {
        const lockValue = await super.acquireLock(lockKey, ttlSeconds);

        if (lockValue) {
            await this.registry.registerLock(lockKey, this.owner, {
                ttlSeconds,
                acquiredAt: new Date().toISOString()
            });
        }

        return lockValue;
    }

    async releaseLock(lockKey, lockValue) {
        const released = await super.releaseLock(lockKey, lockValue);

        if (released) {
            await this.registry.unregisterLock(lockKey);
        }

        return released;
    }
}
```

### Lock Timeout and Deadlock Prevention

```javascript
class SafeLockManager {
    constructor(redisClient) {
        this.client = redisClient;
        this.maxWaitTime = 30000; // 30 seconds max wait
        this.deadlockDetectionInterval = 5000; // Check every 5 seconds
    }

    async acquireLockWithTimeout(lockKey, ttlSeconds = 30, waitTimeout = 10000) {
        const startTime = Date.now();
        const lockValue = `lock:${Date.now()}:${Math.random()}`;

        while (Date.now() - startTime < waitTimeout) {
            const result = await this.client.set(lockKey, lockValue, {
                NX: true,
                EX: ttlSeconds
            });

            if (result === 'OK') {
                return lockValue;
            }

            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return null; // Timeout
    }

    async detectDeadlocks() {
        const lockRegistry = new LockRegistry(this.client);
        const allLocks = await lockRegistry.getAllLocks();

        const deadlockCandidates = new Map();

        // Group locks by owner
        for (const [lockKey, lockInfo] of Object.entries(allLocks)) {
            const owner = lockInfo.owner;
            if (!deadlockCandidates.has(owner)) {
                deadlockCandidates.set(owner, []);
            }
            deadlockCandidates.get(owner).push(lockKey);
        }

        // Check for potential deadlocks (simplified detection)
        const deadlocks = [];

        for (const [owner, locks] of deadlockCandidates) {
            if (locks.length > 1) {
                // Owner holds multiple locks - potential deadlock scenario
                const lockDetails = await Promise.all(
                    locks.map(async (lockKey) => ({
                        key: lockKey,
                        ttl: await this.client.ttl(lockKey)
                    }))
                );

                const expiredLocks = lockDetails.filter(detail => detail.ttl <= 0);
                if (expiredLocks.length > 0) {
                    deadlocks.push({
                        owner,
                        locks: expiredLocks.map(l => l.key),
                        issue: 'expired_locks'
                    });
                }
            }
        }

        return deadlocks;
    }

    async resolveDeadlocks() {
        const deadlocks = await this.detectDeadlocks();

        for (const deadlock of deadlocks) {
            console.warn(`Resolving deadlock for owner ${deadlock.owner}:`, deadlock);

            // Force release expired locks
            for (const lockKey of deadlock.locks) {
                await this.client.del(lockKey);
            }
        }

        return deadlocks.length;
    }

    async withTimeoutAndDeadlockProtection(lockKey, operation, options = {}) {
        const {
            lockTtl = 30,
            waitTimeout = 10000,
            enableDeadlockDetection = true
        } = options;

        let deadlockChecker = null;

        if (enableDeadlockDetection) {
            // Start deadlock detection
            deadlockChecker = setInterval(async () => {
                await this.resolveDeadlocks();
            }, this.deadlockDetectionInterval);
        }

        try {
            const lockValue = await this.acquireLockWithTimeout(lockKey, lockTtl, waitTimeout);

            if (!lockValue) {
                throw new Error(`Could not acquire lock within timeout: ${waitTimeout}ms`);
            }

            return await operation();
        } finally {
            if (deadlockChecker) {
                clearInterval(deadlockChecker);
            }
        }
    }
}
```

## Best Practices

### Lock Naming Conventions

```javascript
class LockNamingStrategy {
    static resourceLock(resourceType, resourceId) {
        return `lock:${resourceType}:${resourceId}`;
    }

    static userLock(userId) {
        return `lock:user:${userId}`;
    }

    static operationLock(operation, target) {
        return `lock:op:${operation}:${target}`;
    }

    static hierarchicalLock(...parts) {
        return `lock:${parts.join(':')}`;
    }
}

// Usage examples
const userLock = LockNamingStrategy.userLock('user123');
const resourceLock = LockNamingStrategy.resourceLock('account', 'acc456');
const operationLock = LockNamingStrategy.operationLock('transfer', 'acc456-to-acc789');
```

### Lock Metrics and Monitoring

```javascript
class LockMetrics {
    constructor(redisClient) {
        this.client = redisClient;
        this.metricsKey = 'lock_metrics';
    }

    async recordLockAcquisition(lockKey, success, duration) {
        const timestamp = Date.now();

        await this.client.hIncrBy(`${this.metricsKey}:total_attempts`, 'count', 1);

        if (success) {
            await this.client.hIncrBy(`${this.metricsKey}:successful_acquisitions`, 'count', 1);
        } else {
            await this.client.hIncrBy(`${this.metricsKey}:failed_acquisitions`, 'count', 1);
        }

        // Record timing
        await this.client.zAdd(`${this.metricsKey}:acquisition_times`, [{
            score: timestamp,
            value: JSON.stringify({ lockKey, success, duration })
        }]);

        // Keep only recent timing data
        await this.client.zRemRangeByScore(`${this.metricsKey}:acquisition_times`, 0, timestamp - 3600000); // Last hour
    }

    async recordLockHoldTime(lockKey, holdTime) {
        await this.client.zAdd(`${this.metricsKey}:hold_times`, [{
            score: Date.now(),
            value: JSON.stringify({ lockKey, holdTime })
        }]);

        // Keep only recent data
        await this.client.zRemRangeByScore(`${this.metricsKey}:hold_times`, 0, Date.now() - 3600000);
    }

    async getMetrics() {
        const [totalAttempts, successful, failed] = await Promise.all([
            this.client.hGet(`${this.metricsKey}:total_attempts`, 'count'),
            this.client.hGet(`${this.metricsKey}:successful_acquisitions`, 'count'),
            this.client.hGet(`${this.metricsKey}:failed_acquisitions`, 'count')
        ]);

        const total = parseInt(totalAttempts || '0');
        const successCount = parseInt(successful || '0');
        const failureCount = parseInt(failed || '0');

        return {
            totalAttempts: total,
            successfulAcquisitions: successCount,
            failedAcquisitions: failureCount,
            successRate: total > 0 ? (successCount / total) * 100 : 0,
            failureRate: total > 0 ? (failureCount / total) * 100 : 0
        };
    }

    async getContendingLocks() {
        // Find locks that are frequently contended
        const failedAttempts = await this.client.zRange(`${this.metricsKey}:acquisition_times`, 0, -1);

        const contentionCount = {};
        failedAttempts.forEach(attempt => {
            const data = JSON.parse(attempt);
            if (!data.success) {
                contentionCount[data.lockKey] = (contentionCount[data.lockKey] || 0) + 1;
            }
        });

        return Object.entries(contentionCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10); // Top 10 most contended locks
    }
}

// Enhanced lock with metrics
class MonitoredLock extends SimpleLock {
    constructor(redisClient) {
        super(redisClient);
        this.metrics = new LockMetrics(redisClient);
    }

    async acquireLock(lockKey, ttlSeconds = 30) {
        const startTime = Date.now();
        const lockValue = await super.acquireLock(lockKey, ttlSeconds);
        const duration = Date.now() - startTime;

        await this.metrics.recordLockAcquisition(lockKey, lockValue !== null, duration);

        return lockValue;
    }

    async releaseLock(lockKey, lockValue) {
        const startTime = Date.now();
        const released = await super.releaseLock(lockKey, lockValue);

        if (released) {
            const holdTime = Date.now() - startTime;
            await this.metrics.recordLockHoldTime(lockKey, holdTime);
        }

        return released;
    }
}
```

## Conclusion

Redis distributed locking provides a simple yet powerful way to coordinate access to shared resources in distributed systems. Start with basic SET NX operations, then add retry logic, renewal, and monitoring for production use.

**Beginner Tip:** Always use Lua scripts for lock release to ensure atomic check-and-delete operations.

**Advanced Tip:** Implement lock renewal (watchdog) for long-running operations and monitor lock metrics to identify contention issues.
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