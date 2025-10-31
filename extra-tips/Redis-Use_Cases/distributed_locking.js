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

// Distributed Locking example - implementing locks across distributed systems
class DistributedLock {
    constructor(redisClient, lockPrefix = 'lock:') {
        this.client = redisClient;
        this.lockPrefix = lockPrefix;
        this.defaultTTL = 30000; // 30 seconds default
    }

    // Acquire a lock
    async acquireLock(lockName, ownerId, ttl = this.defaultTTL) {
        const lockKey = `${this.lockPrefix}${lockName}`;
        const lockValue = `${ownerId}:${Date.now()}`;

        try {
            // Use SET with NX (only if key doesn't exist) and PX (expire in milliseconds)
            const result = await this.client.set(lockKey, lockValue, {
                NX: true, // Only set if key doesn't exist
                PX: ttl   // Expire after ttl milliseconds
            });

            if (result === 'OK') {
                console.log(`Lock acquired: ${lockName} by ${ownerId}`);
                return {
                    success: true,
                    lockKey,
                    lockValue,
                    expiresAt: Date.now() + ttl
                };
            } else {
                console.log(`Failed to acquire lock: ${lockName} (already held)`);
                return { success: false };
            }
        } catch (error) {
            console.error('Error acquiring lock:', error);
            return { success: false };
        }
    }

    // Release a lock (only if owned by the same owner)
    async releaseLock(lockName, ownerId) {
        const lockKey = `${this.lockPrefix}${lockName}`;
        const lockValue = `${ownerId}:*`; // Pattern to match owner's locks

        try {
            // Use Lua script to ensure atomic check-and-delete
            const script = `
                if redis.call('GET', KEYS[1]) == ARGV[1] then
                    return redis.call('DEL', KEYS[1])
                else
                    return 0
                end
            `;

            // Get current lock value to check ownership
            const currentValue = await this.client.get(lockKey);
            if (!currentValue) {
                console.log(`Lock ${lockName} not found`);
                return false;
            }

            // Check if we own this lock
            if (currentValue.startsWith(`${ownerId}:`)) {
                const result = await this.client.eval(script, {
                    keys: [lockKey],
                    arguments: [currentValue]
                });

                if (result === 1) {
                    console.log(`Lock released: ${lockName} by ${ownerId}`);
                    return true;
                }
            }

            console.log(`Cannot release lock ${lockName}: not owned by ${ownerId}`);
            return false;
        } catch (error) {
            console.error('Error releasing lock:', error);
            return false;
        }
    }

    // Extend lock TTL
    async extendLock(lockName, ownerId, additionalTTL = this.defaultTTL) {
        const lockKey = `${this.lockPrefix}${lockName}`;

        try {
            // Use Lua script to ensure atomic check-and-extend
            const script = `
                if redis.call('GET', KEYS[1]) == ARGV[1] then
                    return redis.call('PEXPIRE', KEYS[1], ARGV[2])
                else
                    return 0
                end
            `;

            const currentValue = await this.client.get(lockKey);
            if (!currentValue || !currentValue.startsWith(`${ownerId}:`)) {
                console.log(`Cannot extend lock ${lockName}: not owned by ${ownerId}`);
                return false;
            }

            const result = await this.client.eval(script, {
                keys: [lockKey],
                arguments: [currentValue, additionalTTL.toString()]
            });

            if (result === 1) {
                console.log(`Lock extended: ${lockName} by ${ownerId} (+${additionalTTL}ms)`);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error extending lock:', error);
            return false;
        }
    }

    // Check lock status
    async getLockStatus(lockName) {
        const lockKey = `${this.lockPrefix}${lockName}`;

        try {
            const value = await this.client.get(lockKey);
            const ttl = await this.client.pTTL(lockKey);

            if (!value) {
                return { exists: false };
            }

            const [ownerId, timestamp] = value.split(':');
            return {
                exists: true,
                ownerId,
                acquiredAt: parseInt(timestamp),
                ttl,
                expiresAt: Date.now() + ttl
            };
        } catch (error) {
            console.error('Error getting lock status:', error);
            return { exists: false };
        }
    }

    // Try to acquire lock with retry
    async acquireLockWithRetry(lockName, ownerId, options = {}) {
        const {
            ttl = this.defaultTTL,
            maxRetries = 3,
            retryDelay = 1000,
            backoffMultiplier = 1.5
        } = options;

        let attempt = 0;
        let delay = retryDelay;

        while (attempt < maxRetries) {
            const result = await this.acquireLock(lockName, ownerId, ttl);

            if (result.success) {
                return result;
            }

            attempt++;
            if (attempt < maxRetries) {
                console.log(`Lock acquisition failed, retrying in ${delay}ms... (${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay = Math.floor(delay * backoffMultiplier);
            }
        }

        console.log(`Failed to acquire lock ${lockName} after ${maxRetries} attempts`);
        return { success: false };
    }

    // Execute function with lock (automatic acquire/release)
    async withLock(lockName, ownerId, fn, options = {}) {
        const lock = await this.acquireLockWithRetry(lockName, ownerId, options);

        if (!lock.success) {
            throw new Error(`Could not acquire lock: ${lockName}`);
        }

        try {
            const result = await fn();
            return result;
        } finally {
            await this.releaseLock(lockName, ownerId);
        }
    }
}

// Simulate a shared resource
class SharedCounter {
    constructor(redisClient) {
        this.client = redisClient;
        this.key = 'shared:counter';
    }

    async increment(amount = 1) {
        const value = await this.client.incrBy(this.key, amount);
        return value;
    }

    async getValue() {
        const value = await this.client.get(this.key) || '0';
        return parseInt(value);
    }

    async reset() {
        await this.client.set(this.key, '0');
    }
}

// Demo the distributed locking functionality
async function demoDistributedLocking() {
    const lockManager = new DistributedLock(client);
    const counter = new SharedCounter(client);

    console.log('=== Redis Distributed Locking Demo ===\n');

    // Reset counter
    await counter.reset();

    // Demo 1: Basic lock acquire/release
    console.log('1. Basic lock operations:');
    const lock1 = await lockManager.acquireLock('resource1', 'worker1');
    if (lock1.success) {
        console.log('Performing work with lock...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await lockManager.releaseLock('resource1', 'worker1');
    }
    console.log();

    // Demo 2: Lock contention
    console.log('2. Lock contention simulation:');
    const worker1Promise = lockManager.withLock('counter', 'worker1', async () => {
        console.log('Worker 1: Acquired counter lock');
        let value = await counter.increment(10);
        console.log(`Worker 1: Incremented counter to ${value}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        value = await counter.increment(5);
        console.log(`Worker 1: Incremented counter to ${value}`);
        return 'Worker 1 done';
    });

    // Small delay before worker 2 starts
    await new Promise(resolve => setTimeout(resolve, 100));

    const worker2Promise = lockManager.withLock('counter', 'worker2', async () => {
        console.log('Worker 2: Acquired counter lock');
        let value = await counter.increment(20);
        console.log(`Worker 2: Incremented counter to ${value}`);
        await new Promise(resolve => setTimeout(resolve, 300));
        value = await counter.increment(15);
        console.log(`Worker 2: Incremented counter to ${value}`);
        return 'Worker 2 done';
    });

    try {
        const [result1, result2] = await Promise.all([worker1Promise, worker2Promise]);
        console.log('Results:', result1, result2);
        console.log('Final counter value:', await counter.getValue());
    } catch (error) {
        console.error('Error in concurrent operations:', error);
    }
    console.log();

    // Demo 3: Lock extension
    console.log('3. Lock extension:');
    const lock2 = await lockManager.acquireLock('long_running_task', 'worker3', 5000); // 5 second TTL
    if (lock2.success) {
        console.log('Started long running task...');

        // Simulate work that takes longer than TTL
        for (let i = 0; i < 3; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const extended = await lockManager.extendLock('long_running_task', 'worker3', 5000);
            if (extended) {
                console.log(`Extended lock ${i + 1}/3 times`);
            }
        }

        await lockManager.releaseLock('long_running_task', 'worker3');
        console.log('Long running task completed');
    }
    console.log();

    // Demo 4: Lock status checking
    console.log('4. Lock status checking:');
    const lock3 = await lockManager.acquireLock('status_test', 'worker4', 10000);
    if (lock3.success) {
        const status = await lockManager.getLockStatus('status_test');
        console.log('Lock status:', {
            ...status,
            acquiredAt: new Date(status.acquiredAt).toLocaleTimeString(),
            expiresAt: new Date(status.expiresAt).toLocaleTimeString()
        });

        await lockManager.releaseLock('status_test', 'worker4');
    }
    console.log();

    // Demo 5: Failed lock acquisition
    console.log('5. Failed lock acquisition:');
    const lock4 = await lockManager.acquireLock('exclusive_resource', 'worker5');
    if (lock4.success) {
        // Try to acquire same lock with different owner
        const lock5 = await lockManager.acquireLock('exclusive_resource', 'worker6');
        console.log('Second acquisition result:', lock5.success ? 'Success' : 'Failed');

        // Try to release with wrong owner
        const released = await lockManager.releaseLock('exclusive_resource', 'worker6');
        console.log('Release with wrong owner:', released ? 'Success' : 'Failed');

        // Release with correct owner
        await lockManager.releaseLock('exclusive_resource', 'worker5');
        console.log('Released with correct owner');
    }
    console.log();

    // Demo 6: Lock with retry
    console.log('6. Lock acquisition with retry:');
    // Hold a lock
    const lock6 = await lockManager.acquireLock('retry_test', 'worker7');

    // Try to acquire with retry in background
    setTimeout(async () => {
        console.log('Attempting to acquire lock with retry...');
        const retryResult = await lockManager.acquireLockWithRetry('retry_test', 'worker8', {
            maxRetries: 5,
            retryDelay: 1000
        });
        console.log('Retry result:', retryResult.success ? 'Success' : 'Failed');

        if (retryResult.success) {
            await lockManager.releaseLock('retry_test', 'worker8');
        }
    }, 100);

    // Release the lock after 3 seconds
    setTimeout(async () => {
        console.log('Releasing lock held by worker7...');
        await lockManager.releaseLock('retry_test', 'worker7');
    }, 3000);

    // Wait for demo to complete
    await new Promise(resolve => setTimeout(resolve, 8000));

    await client.disconnect();
    console.log('\nDistributed locking demo completed!');
}

demoDistributedLocking().catch(console.error);