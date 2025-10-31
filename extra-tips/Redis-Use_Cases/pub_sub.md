# Redis Rate Limiting: From Beginner to Advanced

## What is Rate Limiting?

**Beginner Level:** Rate limiting is like a speed limit for your app. It prevents users from making too many requests too quickly. Without it, one user could overwhelm your server. Redis helps track how many requests each user makes.

**Intermediate Level:** Rate limiting controls the rate of requests to protect services from abuse and ensure fair resource allocation. Redis provides atomic counters and expiration for efficient rate limiting implementations.

## Why Redis for Rate Limiting?

- **Atomic Operations:** Consistent counter updates
- **Expiration:** Automatic cleanup of old data
- **Performance:** Sub-millisecond operations
- **Scalability:** Works across multiple servers
- **Flexibility:** Various algorithms supported

## Basic Rate Limiting

### Beginner Example: Simple Request Counter

```javascript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

// Check if request is allowed
async function isAllowed(userId, maxRequests = 10, windowSeconds = 60) {
    const key = `ratelimit:${userId}`;

    // Get current request count
    const current = await client.get(key);

    if (current === null) {
        // First request in window
        await client.setEx(key, windowSeconds, '1');
        return true;
    }

    const count = parseInt(current);

    if (count >= maxRequests) {
        return false; // Rate limit exceeded
    }

    // Increment counter
    await client.incr(key);
    return true;
}

// Example usage
const userId = 'user123';

if (await isAllowed(userId, 5, 60)) { // 5 requests per minute
    console.log('Request allowed');
    // Process request
} else {
    console.log('Rate limit exceeded');
}
```

### Intermediate Example: Sliding Window Rate Limiting

```javascript
class RateLimiter {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async isAllowed(userId, maxRequests, windowSeconds) {
        const key = `ratelimit:${userId}`;
        const now = Date.now();
        const windowStart = now - (windowSeconds * 1000);

        // Add current request timestamp
        await this.client.zAdd(key, [{ score: now, value: now.toString() }]);

        // Remove old requests outside the window
        await this.client.zRemRangeByScore(key, 0, windowStart);

        // Count requests in current window
        const requestCount = await this.client.zCard(key);

        // Set expiration on the key
        await this.client.expire(key, windowSeconds);

        return requestCount <= maxRequests;
    }

    async getRemainingRequests(userId, maxRequests, windowSeconds) {
        const key = `ratelimit:${userId}`;
        const now = Date.now();
        const windowStart = now - (windowSeconds * 1000);

        // Clean old requests
        await this.client.zRemRangeByScore(key, 0, windowStart);

        const currentCount = await this.client.zCard(key);
        return Math.max(0, maxRequests - currentCount);
    }

    async getResetTime(userId, windowSeconds) {
        const key = `ratelimit:${userId}`;
        const oldestRequest = await this.client.zRangeWithScores(key, 0, 0);

        if (oldestRequest.length === 0) {
            return Date.now();
        }

        const oldestTimestamp = parseInt(oldestRequest[0][1]);
        return oldestTimestamp + (windowSeconds * 1000);
    }
}
```

## Advanced Rate Limiting Algorithms

### Token Bucket Algorithm

```javascript
class TokenBucketRateLimiter {
    constructor(redisClient, capacity, refillRate) {
        this.client = redisClient;
        this.capacity = capacity; // Max tokens
        this.refillRate = refillRate; // Tokens per second
    }

    async isAllowed(userId) {
        const key = `tokenbucket:${userId}`;
        const now = Date.now() / 1000; // Current time in seconds

        // Get current bucket state
        const bucketData = await this.client.hGetAll(key);

        let tokens = parseFloat(bucketData.tokens) || this.capacity;
        let lastRefill = parseFloat(bucketData.lastRefill) || now;

        // Calculate tokens to add since last refill
        const timePassed = now - lastRefill;
        const tokensToAdd = timePassed * this.refillRate;

        tokens = Math.min(this.capacity, tokens + tokensToAdd);
        lastRefill = now;

        // Try to consume a token
        if (tokens >= 1) {
            tokens -= 1;

            // Update bucket state
            await this.client.hSet(key, {
                tokens: tokens.toString(),
                lastRefill: lastRefill.toString()
            });

            // Set expiration (cleanup after bucket would be full)
            const ttl = Math.ceil(this.capacity / this.refillRate) * 2;
            await this.client.expire(key, ttl);

            return true;
        }

        return false;
    }

    async getTokensRemaining(userId) {
        const key = `tokenbucket:${userId}`;
        const bucketData = await this.client.hGetAll(key);

        if (!bucketData.tokens) return this.capacity;

        const now = Date.now() / 1000;
        const lastRefill = parseFloat(bucketData.lastRefill) || now;
        const timePassed = now - lastRefill;
        const tokensToAdd = timePassed * this.refillRate;

        const currentTokens = Math.min(
            this.capacity,
            parseFloat(bucketData.tokens) + tokensToAdd
        );

        return Math.floor(currentTokens);
    }
}
```

### Leaky Bucket Algorithm

```javascript
class LeakyBucketRateLimiter {
    constructor(redisClient, capacity, leakRate) {
        this.client = redisClient;
        this.capacity = capacity; // Max requests in bucket
        this.leakRate = leakRate; // Requests leaked per second
    }

    async isAllowed(userId) {
        const key = `leakybucket:${userId}`;
        const now = Date.now() / 1000;

        // Get current bucket state
        const bucketData = await this.client.hGetAll(key);

        let waterLevel = parseFloat(bucketData.waterLevel) || 0;
        let lastLeak = parseFloat(bucketData.lastLeak) || now;

        // Leak water since last check
        const timePassed = now - lastLeak;
        const leakedAmount = timePassed * this.leakRate;
        waterLevel = Math.max(0, waterLevel - leakedAmount);
        lastLeak = now;

        // Try to add request (drop of water)
        if (waterLevel < this.capacity) {
            waterLevel += 1;

            // Update bucket state
            await this.client.hSet(key, {
                waterLevel: waterLevel.toString(),
                lastLeak: lastLeak.toString()
            });

            // Set expiration
            const ttl = Math.ceil(this.capacity / this.leakRate) * 2;
            await this.client.expire(key, ttl);

            return true;
        }

        return false;
    }

    async getWaterLevel(userId) {
        const key = `leakybucket:${userId}`;
        const bucketData = await this.client.hGetAll(key);

        if (!bucketData.waterLevel) return 0;

        const now = Date.now() / 1000;
        const lastLeak = parseFloat(bucketData.lastLeak) || now;
        const timePassed = now - lastLeak;
        const leakedAmount = timePassed * this.leakRate;

        return Math.max(0, parseFloat(bucketData.waterLevel) - leakedAmount);
    }
}
```

## Multi-Level Rate Limiting

### Hierarchical Rate Limiting

```javascript
class HierarchicalRateLimiter {
    constructor(redisClient) {
        this.client = redisClient;
        this.levels = {
            second: 1,
            minute: 60,
            hour: 3600,
            day: 86400
        };
    }

    async isAllowed(userId, limits) {
        // limits = { second: 5, minute: 100, hour: 1000 }

        for (const [period, maxRequests] of Object.entries(limits)) {
            const windowSeconds = this.levels[period];
            const allowed = await this.checkLimit(userId, period, maxRequests, windowSeconds);

            if (!allowed) {
                return {
                    allowed: false,
                    limit: period,
                    resetTime: await this.getResetTime(userId, period, windowSeconds)
                };
            }
        }

        return { allowed: true };
    }

    async checkLimit(userId, period, maxRequests, windowSeconds) {
        const key = `ratelimit:${userId}:${period}`;
        const count = await this.client.incr(key);

        if (count === 1) {
            await this.client.expire(key, windowSeconds);
        }

        return count <= maxRequests;
    }

    async getResetTime(userId, period, windowSeconds) {
        const key = `ratelimit:${userId}:${period}`;
        const ttl = await this.client.ttl(key);
        return Date.now() + (ttl * 1000);
    }

    async getRemainingRequests(userId, limits) {
        const remaining = {};

        for (const [period, maxRequests] of Object.entries(limits)) {
            const windowSeconds = this.levels[period];
            const key = `ratelimit:${userId}:${period}`;
            const current = parseInt(await this.client.get(key) || '0');
            remaining[period] = Math.max(0, maxRequests - current);
        }

        return remaining;
    }
}
```

### API Endpoint Rate Limiting

```javascript
class EndpointRateLimiter {
    constructor(redisClient) {
        this.client = redisClient;
        this.endpointLimits = new Map();
    }

    setEndpointLimit(endpoint, limits) {
        this.endpointLimits.set(endpoint, limits);
    }

    async checkEndpointLimit(userId, endpoint, method = 'GET') {
        const key = `${method}:${endpoint}`;
        const limits = this.endpointLimits.get(key);

        if (!limits) return { allowed: true }; // No limits set

        return await this.isAllowed(`${userId}:${key}`, limits);
    }

    async getEndpointStats(endpoint, method = 'GET') {
        const key = `${method}:${endpoint}`;
        const limits = this.endpointLimits.get(key);

        if (!limits) return null;

        // Get current usage across all users
        const pattern = `*:*:${key}`;
        const keys = await this.client.keys(pattern);

        let totalRequests = 0;
        for (const userKey of keys) {
            const count = parseInt(await this.client.get(userKey) || '0');
            totalRequests += count;
        }

        return {
            endpoint: key,
            limits,
            currentUsage: totalRequests,
            uniqueUsers: keys.length
        };
    }
}
```

## Distributed Rate Limiting

### Global Rate Limiting Across Multiple Instances

```javascript
class DistributedRateLimiter {
    constructor(redisClient, instanceId) {
        this.client = redisClient;
        this.instanceId = instanceId;
    }

    async isAllowedGlobal(userId, maxRequests, windowSeconds) {
        const key = `global_ratelimit:${userId}`;

        // Use Lua script for atomic check and increment
        const script = `
            local current = redis.call('GET', KEYS[1])
            if not current then
                redis.call('SETEX', KEYS[1], ARGV[2], 1)
                return 1
            end

            local count = tonumber(current)
            if count >= tonumber(ARGV[1]) then
                return 0
            end

            redis.call('INCR', KEYS[1])
            return 1
        `;

        const result = await this.client.eval(script, {
            keys: [key],
            arguments: [maxRequests.toString(), windowSeconds.toString()]
        });

        return result === 1;
    }

    async isAllowedPerInstance(userId, maxRequests, windowSeconds) {
        const key = `instance_ratelimit:${this.instanceId}:${userId}`;

        const count = await this.client.incr(key);

        if (count === 1) {
            await this.client.expire(key, windowSeconds);
        }

        return count <= maxRequests;
    }

    async getInstanceLoad() {
        // Get all instance keys
        const instanceKeys = await this.client.keys('instance_ratelimit:' + this.instanceId + ':*');
        return instanceKeys.length;
    }
}
```

## Rate Limiting with Burst Handling

### Burst-Aware Rate Limiting

```javascript
class BurstRateLimiter {
    constructor(redisClient, sustainedRate, burstCapacity, refillRate) {
        this.client = redisClient;
        this.sustainedRate = sustainedRate; // Requests per second (sustained)
        this.burstCapacity = burstCapacity; // Additional burst capacity
        this.refillRate = refillRate; // How fast burst capacity refills
    }

    async isAllowed(userId) {
        const sustainedKey = `sustained:${userId}`;
        const burstKey = `burst:${userId}`;

        const now = Date.now() / 1000;

        // Check sustained rate (sliding window)
        const sustainedAllowed = await this.checkSustainedRate(sustainedKey, now);

        if (!sustainedAllowed) {
            return false;
        }

        // Check burst capacity
        const burstData = await this.client.hGetAll(burstKey);
        let burstTokens = parseFloat(burstData.tokens) || this.burstCapacity;
        let lastRefill = parseFloat(burstData.lastRefill) || now;

        // Refill burst tokens
        const timePassed = now - lastRefill;
        const tokensToAdd = timePassed * this.refillRate;
        burstTokens = Math.min(this.burstCapacity, burstTokens + tokensToAdd);
        lastRefill = now;

        // Try to consume burst token
        if (burstTokens >= 1) {
            burstTokens -= 1;

            // Update burst state
            await this.client.hSet(burstKey, {
                tokens: burstTokens.toString(),
                lastRefill: lastRefill.toString()
            });

            await this.client.expire(burstKey, Math.ceil(this.burstCapacity / this.refillRate) * 2);

            return true;
        }

        return false;
    }

    async checkSustainedRate(key, now) {
        const windowSeconds = 60; // 1 minute window
        const maxRequests = this.sustainedRate * windowSeconds;

        // Add current request
        await this.client.zAdd(key, [{ score: now, value: now.toString() }]);

        // Remove old requests
        const windowStart = now - windowSeconds;
        await this.client.zRemRangeByScore(key, 0, windowStart);

        // Check count
        const requestCount = await this.client.zCard(key);
        await this.client.expire(key, windowSeconds * 2);

        return requestCount <= maxRequests;
    }
}
```

## Monitoring and Analytics

### Rate Limiting Metrics

```javascript
class RateLimitMonitor {
    constructor(redisClient) {
        this.client = redisClient;
        this.metricsKey = 'ratelimit_metrics';
    }

    async recordRateLimitHit(userId, endpoint, limitType) {
        const timestamp = Date.now();
        const dateKey = new Date().toISOString().split('T')[0];

        // Record hit
        await this.client.hIncrBy(`${this.metricsKey}:hits:${dateKey}`, `${endpoint}:${limitType}`, 1);

        // Record user activity
        await this.client.zAdd(`${this.metricsKey}:users:${dateKey}`, [{
            score: timestamp,
            value: userId
        }]);

        // Clean old data (keep 30 days)
        await this.client.expire(`${this.metricsKey}:hits:${dateKey}`, 86400 * 30);
        await this.client.expire(`${this.metricsKey}:users:${dateKey}`, 86400 * 30);
    }

    async getRateLimitStats(date) {
        const hits = await this.client.hGetAll(`${this.metricsKey}:hits:${date}`);
        const uniqueUsers = await this.client.zCard(`${this.metricsKey}:users:${date}`);

        return {
            date,
            endpointStats: Object.entries(hits).map(([endpoint, count]) => ({
                endpoint,
                hits: parseInt(count)
            })),
            uniqueUsers,
            totalHits: Object.values(hits).reduce((sum, count) => sum + parseInt(count), 0)
        };
    }

    async getTopRateLimitedEndpoints(date, limit = 10) {
        const hits = await this.client.hGetAll(`${this.metricsKey}:hits:${date}`);

        return Object.entries(hits)
            .map(([endpoint, count]) => ({ endpoint, hits: parseInt(count) }))
            .sort((a, b) => b.hits - a.hits)
            .slice(0, limit);
    }

    async detectAnomalies(date) {
        const today = await this.getRateLimitStats(date);
        const yesterday = await this.getRateLimitStats(
            new Date(Date.now() - 86400000).toISOString().split('T')[0]
        );

        const anomalies = [];

        for (const todayStat of today.endpointStats) {
            const yesterdayStat = yesterday.endpointStats.find(
                s => s.endpoint === todayStat.endpoint
            );

            if (yesterdayStat) {
                const increase = ((todayStat.hits - yesterdayStat.hits) / yesterdayStat.hits) * 100;
                if (increase > 200) { // 200% increase
                    anomalies.push({
                        endpoint: todayStat.endpoint,
                        increase: increase.toFixed(1) + '%',
                        today: todayStat.hits,
                        yesterday: yesterdayStat.hits
                    });
                }
            }
        }

        return anomalies;
    }
}
```

## Advanced Patterns

### Adaptive Rate Limiting

```javascript
class AdaptiveRateLimiter {
    constructor(redisClient) {
        this.client = redisClient;
        this.baselineRequests = 100; // Baseline requests per minute
        this.adjustmentFactor = 0.1; // How much to adjust limits
    }

    async isAllowed(userId, currentLoad) {
        // Get user's current limit
        let userLimit = await this.getUserLimit(userId);

        // Adjust limit based on system load
        if (currentLoad > 0.8) { // High load
            userLimit = Math.floor(userLimit * (1 - this.adjustmentFactor));
        } else if (currentLoad < 0.3) { // Low load
            userLimit = Math.floor(userLimit * (1 + this.adjustmentFactor));
        }

        // Apply rate limiting with adjusted limit
        const allowed = await this.checkLimit(userId, userLimit, 60);

        if (!allowed) {
            // If limit exceeded, temporarily reduce user's limit
            await this.adjustUserLimit(userId, -1);
        }

        return allowed;
    }

    async getUserLimit(userId) {
        const limit = await this.client.get(`user_limit:${userId}`);
        return limit ? parseInt(limit) : this.baselineRequests;
    }

    async adjustUserLimit(userId, adjustment) {
        const currentLimit = await this.getUserLimit(userId);
        const newLimit = Math.max(1, currentLimit + adjustment);

        await this.client.set(`user_limit:${userId}`, newLimit);
        await this.client.expire(`user_limit:${userId}`, 3600); // Reset after 1 hour
    }

    async checkLimit(userId, maxRequests, windowSeconds) {
        const key = `ratelimit:${userId}`;
        const count = await this.client.incr(key);

        if (count === 1) {
            await this.client.expire(key, windowSeconds);
        }

        return count <= maxRequests;
    }
}
```

## Best Practices

### 1. Rate Limit Headers

```javascript
class RateLimitResponse {
    static createResponse(allowed, remaining, resetTime, retryAfter) {
        const headers = {};

        if (!allowed) {
            headers['X-RateLimit-Remaining'] = '0';
            headers['X-RateLimit-Reset'] = Math.ceil(resetTime / 1000).toString();
            headers['Retry-After'] = retryAfter.toString();
        } else {
            headers['X-RateLimit-Remaining'] = remaining.toString();
            headers['X-RateLimit-Limit'] = '100'; // Your limit
            headers['X-RateLimit-Reset'] = Math.ceil(resetTime / 1000).toString();
        }

        return headers;
    }
}

// Usage in Express.js middleware
function rateLimitMiddleware(limiter) {
    return async (req, res, next) => {
        const userId = req.user?.id || req.ip;
        const allowed = await limiter.isAllowed(userId, 100, 60); // 100 requests per minute

        if (!allowed) {
            const remaining = await limiter.getRemainingRequests(userId, 100, 60);
            const resetTime = await limiter.getResetTime(userId, 60);

            const headers = RateLimitResponse.createResponse(
                false,
                remaining,
                resetTime,
                60
            );

            res.set(headers);
            return res.status(429).json({ error: 'Rate limit exceeded' });
        }

        const remaining = await limiter.getRemainingRequests(userId, 100, 60);
        const resetTime = await limiter.getResetTime(userId, 60);

        const headers = RateLimitResponse.createResponse(
            true,
            remaining,
            resetTime
        );

        res.set(headers);
        next();
    };
}
```

### 2. Rate Limit Bypass Prevention

```javascript
class SecureRateLimiter {
    async isAllowedSecure(userId, requestFingerprint) {
        // Check for rate limit
        const allowed = await this.isAllowed(userId, 100, 60);

        if (!allowed) {
            // Log suspicious activity
            await this.logSuspiciousActivity(userId, requestFingerprint);

            // Check for patterns that might indicate bypass attempts
            const isBypassAttempt = await this.detectBypassAttempt(userId);

            if (isBypassAttempt) {
                // Implement stricter limits or blocking
                await this.implementStrictLimits(userId);
            }
        }

        return allowed;
    }

    async detectBypassAttempt(userId) {
        // Check for rapid IP changes, unusual patterns, etc.
        const recentActivity = await this.client.lRange(`activity:${userId}`, 0, 9);

        // Implement detection logic based on your security requirements
        const uniqueIPs = new Set(recentActivity.map(a => JSON.parse(a).ip));

        return uniqueIPs.size > 5; // More than 5 different IPs recently
    }

    async implementStrictLimits(userId) {
        // Temporarily reduce limits for suspicious users
        await this.client.setEx(`strict_limit:${userId}`, 300, '10'); // 10 requests per 5 minutes
    }
}
```

## Conclusion

Rate limiting with Redis protects your applications from abuse while ensuring fair resource allocation. Start with simple fixed-window counters, then implement sliding windows, token buckets, and multi-level limits as your needs grow.

**Beginner Tip:** Use INCR and EXPIRE for simple rate limiting with automatic cleanup.

**Advanced Tip:** Implement adaptive rate limiting that adjusts based on system load and user behavior patterns.</content>
<parameter name="filePath">/Users/chhayhong/Desktop/Redis_University/rate_limiting.md