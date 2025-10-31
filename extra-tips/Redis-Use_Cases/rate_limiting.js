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

// Rate Limiting example - controlling API request rates
class RateLimiter {
    constructor(redisClient) {
        this.client = redisClient;
    }

    // Fixed window rate limiting
    async checkFixedWindow(identifier, limit, windowSeconds) {
        const key = `ratelimit:fixed:${identifier}`;
        const now = Date.now();
        const windowStart = Math.floor(now / 1000 / windowSeconds) * windowSeconds;

        // Remove old entries outside current window
        await this.client.zRemRangeByScore(key, 0, windowStart - 1);

        // Count requests in current window
        const requestCount = await this.client.zCard(key);

        if (requestCount >= limit) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: windowStart + windowSeconds,
                limit,
                windowSeconds
            };
        }

        // Add current request
        await this.client.zAdd(key, [{ score: now / 1000, value: now.toString() }]);

        // Set expiration on the key
        await this.client.expire(key, windowSeconds * 2);

        return {
            allowed: true,
            remaining: limit - requestCount - 1,
            resetTime: windowStart + windowSeconds,
            limit,
            windowSeconds
        };
    }

    // Sliding window rate limiting
    async checkSlidingWindow(identifier, limit, windowSeconds) {
        const key = `ratelimit:sliding:${identifier}`;
        const now = Date.now() / 1000;
        const windowStart = now - windowSeconds;

        // Remove old entries
        await this.client.zRemRangeByScore(key, 0, windowStart);

        // Count requests in sliding window
        const requestCount = await this.client.zCard(key);

        if (requestCount >= limit) {
            // Get the oldest request time to calculate reset time
            const oldestRequest = await this.client.zRangeWithScores(key, 0, 0);
            const resetTime = oldestRequest.length > 0 ?
                oldestRequest[0].score + windowSeconds : now + windowSeconds;

            return {
                allowed: false,
                remaining: 0,
                resetTime,
                limit,
                windowSeconds
            };
        }

        // Add current request
        await this.client.zAdd(key, [{ score: now, value: now.toString() }]);

        // Set expiration (keep data a bit longer than window)
        await this.client.expire(key, windowSeconds * 2);

        return {
            allowed: true,
            remaining: limit - requestCount - 1,
            resetTime: now + windowSeconds,
            limit,
            windowSeconds
        };
    }

    // Token bucket algorithm
    async checkTokenBucket(identifier, capacity, refillRatePerSecond) {
        const key = `ratelimit:bucket:${identifier}`;
        const now = Date.now() / 1000;

        // Get current bucket state
        const bucketData = await this.client.hGetAll(key);
        let tokens = parseFloat(bucketData.tokens) || capacity;
        let lastRefill = parseFloat(bucketData.lastRefill) || now;

        // Calculate tokens to add since last refill
        const timePassed = now - lastRefill;
        const tokensToAdd = timePassed * refillRatePerSecond;
        tokens = Math.min(capacity, tokens + tokensToAdd);

        if (tokens < 1) {
            // Calculate when bucket will have tokens
            const timeToNextToken = (1 - tokens) / refillRatePerSecond;
            const resetTime = now + timeToNextToken;

            return {
                allowed: false,
                remaining: Math.floor(tokens),
                resetTime,
                capacity,
                refillRate: refillRatePerSecond
            };
        }

        // Consume a token
        tokens -= 1;

        // Update bucket state
        await this.client.hSet(key, {
            tokens: tokens.toString(),
            lastRefill: now.toString()
        });

        // Set expiration (keep bucket for a reasonable time)
        await this.client.expire(key, 3600); // 1 hour

        return {
            allowed: true,
            remaining: Math.floor(tokens),
            resetTime: now + (1 / refillRatePerSecond),
            capacity,
            refillRate: refillRatePerSecond
        };
    }

    // Check rate limit with multiple strategies
    async checkRateLimit(identifier, strategy = 'fixed', options = {}) {
        const {
            limit = 10,
            windowSeconds = 60,
            capacity = 10,
            refillRate = 1
        } = options;

        switch (strategy) {
            case 'fixed':
                return await this.checkFixedWindow(identifier, limit, windowSeconds);
            case 'sliding':
                return await this.checkSlidingWindow(identifier, limit, windowSeconds);
            case 'token_bucket':
                return await this.checkTokenBucket(identifier, capacity, refillRate);
            default:
                throw new Error(`Unknown rate limiting strategy: ${strategy}`);
        }
    }

    // Get rate limit status
    async getRateLimitStatus(identifier, strategy = 'fixed') {
        const key = strategy === 'token_bucket' ?
            `ratelimit:bucket:${identifier}` :
            `ratelimit:${strategy}:${identifier}`;

        if (strategy === 'token_bucket') {
            const data = await this.client.hGetAll(key);
            return {
                tokens: parseFloat(data.tokens) || 0,
                lastRefill: parseFloat(data.lastRefill) || 0
            };
        } else {
            const count = await this.client.zCard(key);
            const oldest = await this.client.zRangeWithScores(key, 0, 0);
            return {
                currentRequests: count,
                oldestRequest: oldest.length > 0 ? oldest[0].score : null
            };
        }
    }

    // Reset rate limit for an identifier
    async resetRateLimit(identifier, strategy = 'fixed') {
        const key = strategy === 'token_bucket' ?
            `ratelimit:bucket:${identifier}` :
            `ratelimit:${strategy}:${identifier}`;

        await this.client.del(key);
        console.log(`Reset rate limit for ${identifier} using ${strategy} strategy`);
    }
}

// Simulate API requests
async function simulateAPIRequest(rateLimiter, userId, endpoint, strategy = 'fixed') {
    const identifier = `${userId}:${endpoint}`;
    const result = await rateLimiter.checkRateLimit(identifier, strategy, {
        limit: 5,        // 5 requests
        windowSeconds: 60, // per 60 seconds for fixed/sliding
        capacity: 5,     // 5 tokens for token bucket
        refillRate: 1    // 1 token per second for token bucket
    });

    if (result.allowed) {
        console.log(`✅ ${userId} -> ${endpoint}: ALLOWED (${result.remaining} remaining)`);
        return true;
    } else {
        const resetIn = Math.ceil(result.resetTime - Date.now() / 1000);
        console.log(`❌ ${userId} -> ${endpoint}: BLOCKED (reset in ${resetIn}s)`);
        return false;
    }
}

// Demo the rate limiting functionality
async function demoRateLimiting() {
    const rateLimiter = new RateLimiter(client);

    console.log('=== Redis Rate Limiting Demo ===\n');

    // Demo Fixed Window
    console.log('1. Fixed Window Rate Limiting:');
    console.log('User alice making requests to /api/users:');

    for (let i = 0; i < 7; i++) {
        await simulateAPIRequest(rateLimiter, 'alice', '/api/users', 'fixed');
        if (i < 6) await new Promise(resolve => setTimeout(resolve, 200)); // Small delay
    }
    console.log();

    // Wait a bit and try again
    console.log('Waiting 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('Alice trying again:');
    await simulateAPIRequest(rateLimiter, 'alice', '/api/users', 'fixed');
    console.log();

    // Demo Sliding Window
    console.log('2. Sliding Window Rate Limiting:');
    console.log('User bob making requests to /api/posts:');

    for (let i = 0; i < 6; i++) {
        await simulateAPIRequest(rateLimiter, 'bob', '/api/posts', 'sliding');
        if (i < 5) await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
    console.log();

    // Demo Token Bucket
    console.log('3. Token Bucket Rate Limiting:');
    console.log('User charlie making requests to /api/search:');

    // Use up all tokens quickly
    for (let i = 0; i < 6; i++) {
        await simulateAPIRequest(rateLimiter, 'charlie', '/api/search', 'token_bucket');
    }
    console.log();

    // Wait and try again
    console.log('Waiting 3 seconds for token refill...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Charlie trying again:');
    await simulateAPIRequest(rateLimiter, 'charlie', '/api/search', 'token_bucket');
    console.log();

    // Check status
    console.log('4. Checking rate limit status:');
    const aliceStatus = await rateLimiter.getRateLimitStatus('alice:/api/users', 'fixed');
    const bobStatus = await rateLimiter.getRateLimitStatus('bob:/api/posts', 'sliding');
    const charlieStatus = await rateLimiter.getRateLimitStatus('charlie:/api/search', 'token_bucket');

    console.log('Alice status (fixed window):', aliceStatus);
    console.log('Bob status (sliding window):', bobStatus);
    console.log('Charlie status (token bucket):', charlieStatus);
    console.log();

    // Reset a rate limit
    console.log('5. Resetting Alice\'s rate limit:');
    await rateLimiter.resetRateLimit('alice:/api/users', 'fixed');
    await simulateAPIRequest(rateLimiter, 'alice', '/api/users', 'fixed');
    console.log();

    // Demo different endpoints for same user
    console.log('6. Different endpoints (same user):');
    await simulateAPIRequest(rateLimiter, 'alice', '/api/users', 'fixed');
    await simulateAPIRequest(rateLimiter, 'alice', '/api/posts', 'fixed');
    await simulateAPIRequest(rateLimiter, 'alice', '/api/comments', 'fixed');

    await client.disconnect();
}

demoRateLimiting().catch(console.error);