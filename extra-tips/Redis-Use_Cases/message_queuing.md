# Redis Real-Time Analytics: From Beginner to Advanced

## What is Real-Time Analytics?

**Beginner Level:** Real-time analytics means getting instant insights from data as it comes in. Instead of waiting for daily reports, you see what's happening right now. Redis is perfect for this because it can handle thousands of updates per second and give you instant results.

**Intermediate Level:** Real-time analytics involves continuous data ingestion, processing, and immediate query responses. Redis excels here with its in-memory speed, atomic operations, and data structures designed for real-time computations.

## Why Redis for Real-Time Analytics?

- **Speed:** Sub-millisecond operations for instant analytics
- **Atomic Operations:** Consistent data updates across multiple metrics
- **Data Structures:** Counters, sets, sorted sets for complex analytics
- **Pub/Sub:** Real-time notifications when metrics change
- **Memory Efficiency:** Store large amounts of analytics data efficiently

## Basic Analytics: Counters and Metrics

### Beginner Example: Simple Page View Counter

```javascript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

// Track page views
async function trackPageView(pageId) {
    const key = `page_views:${pageId}`;
    const count = await client.incr(key);
    console.log(`Page ${pageId} has ${count} views`);
    return count;
}

// Get page view stats
async function getPageViews(pageId) {
    const count = await client.get(`page_views:${pageId}`);
    return parseInt(count) || 0;
}

// Example usage
await trackPageView('home');
await trackPageView('home');
await trackPageView('about');

console.log('Home page views:', await getPageViews('home'));
```

### Intermediate Example: Time-Based Analytics

```javascript
class AnalyticsTracker {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async trackEvent(eventType, userId, metadata = {}) {
        const timestamp = Date.now();
        const eventKey = `event:${eventType}:${Math.floor(timestamp / 1000)}`; // Per-second bucket

        // Store event data
        const eventData = {
            userId,
            timestamp,
            metadata
        };

        await this.client.lPush(eventKey, JSON.stringify(eventData));
        await this.client.expire(eventKey, 86400); // Expire after 24 hours

        // Update counters
        await this.client.incr(`counter:${eventType}:total`);
        await this.client.incr(`counter:${eventType}:${userId}`);

        return eventData;
    }

    async getEventCount(eventType, timeRange = 3600) {
        const now = Math.floor(Date.now() / 1000);
        const startTime = now - timeRange;

        let totalCount = 0;
        for (let t = startTime; t <= now; t++) {
            const events = await this.client.lRange(`event:${eventType}:${t}`, 0, -1);
            totalCount += events.length;
        }

        return totalCount;
    }
}
```

## Advanced Analytics: Complex Metrics

### User Behavior Analytics

```javascript
class UserBehaviorAnalytics {
    async trackUserAction(userId, action, page, duration) {
        const timestamp = Date.now();

        // Store user action in time series
        await this.client.zAdd(`user_actions:${userId}`, [{
            score: timestamp,
            value: JSON.stringify({ action, page, duration })
        }]);

        // Update user statistics
        await this.client.hIncrBy(`user_stats:${userId}`, 'total_actions', 1);
        await this.client.hIncrBy(`user_stats:${userId}`, `actions_${action}`, 1);

        // Track page popularity
        await this.client.zIncrBy('page_popularity', 1, page);

        // Track session data
        const sessionKey = `user_session:${userId}`;
        await this.client.hSet(sessionKey, {
            last_action: timestamp,
            current_page: page,
            session_duration: duration
        });
        await this.client.expire(sessionKey, 1800); // 30 minutes
    }

    async getUserStats(userId) {
        const stats = await this.client.hGetAll(`user_stats:${userId}`);
        const recentActions = await this.client.zRange(`user_actions:${userId}`, -10, -1, { WITHSCORES: true });

        return {
            totalActions: parseInt(stats.total_actions) || 0,
            actionBreakdown: Object.fromEntries(
                Object.entries(stats).filter(([key]) => key.startsWith('actions_'))
            ),
            recentActions: recentActions.map(([data, score]) => ({
                ...JSON.parse(data),
                timestamp: parseInt(score)
            }))
        };
    }
}
```

### Real-Time Dashboards

```javascript
class RealTimeDashboard {
    constructor(redisClient) {
        this.client = redisClient;
        this.subscribers = new Map();
    }

    async updateMetric(metricName, value, tags = {}) {
        const timestamp = Date.now();
        const metricKey = `metric:${metricName}`;

        // Store metric value with timestamp
        await this.client.zAdd(metricKey, [{
            score: timestamp,
            value: JSON.stringify({ value, tags })
        }]);

        // Keep only last 1000 data points
        await this.client.zRemRangeByRank(metricKey, 0, -1001);

        // Update current value
        await this.client.set(`current:${metricName}`, JSON.stringify({
            value,
            timestamp,
            tags
        }));

        // Notify subscribers
        await this.notifySubscribers(metricName, { value, timestamp, tags });
    }

    async getCurrentMetric(metricName) {
        const data = await this.client.get(`current:${metricName}`);
        return data ? JSON.parse(data) : null;
    }

    async getMetricHistory(metricName, timeRange = 3600) {
        const now = Date.now();
        const startTime = now - (timeRange * 1000);

        const history = await this.client.zRangeByScore(metricKey, startTime, now, { WITHSCORES: true });
        return history.map(([data, score]) => ({
            ...JSON.parse(data),
            timestamp: parseInt(score)
        }));
    }

    async subscribeToMetric(metricName, callback) {
        if (!this.subscribers.has(metricName)) {
            this.subscribers.set(metricName, new Set());
        }
        this.subscribers.get(metricName).add(callback);
    }

    async notifySubscribers(metricName, data) {
        const subscribers = this.subscribers.get(metricName);
        if (subscribers) {
            subscribers.forEach(callback => callback(data));
        }
    }
}
```

## Advanced Analytics Patterns

### Funnel Analysis

```javascript
class FunnelAnalytics {
    async trackFunnelStep(userId, funnelName, stepName, stepNumber) {
        const funnelKey = `funnel:${funnelName}:${userId}`;

        // Add step to user's funnel progress
        await this.client.sAdd(funnelKey, stepName);
        await this.client.expire(funnelKey, 86400); // 24 hours

        // Track step completion time
        const stepKey = `${funnelKey}:step_${stepNumber}`;
        await this.client.set(stepKey, Date.now());
        await this.client.expire(stepKey, 86400);

        // Update funnel statistics
        await this.client.hIncrBy(`funnel_stats:${funnelName}`, `step_${stepNumber}_completions`, 1);
        await this.client.hIncrBy(`funnel_stats:${funnelName}`, 'total_users', 1);
    }

    async getFunnelConversion(funnelName) {
        const stats = await this.client.hGetAll(`funnel_stats:${funnelName}`);

        const steps = Object.keys(stats)
            .filter(key => key.includes('_completions'))
            .sort()
            .map(key => ({
                step: key.replace('_completions', ''),
                completions: parseInt(stats[key])
            }));

        const totalUsers = parseInt(stats.total_users) || 1;

        return steps.map(step => ({
            step: step.step,
            completions: step.completions,
            conversionRate: (step.completions / totalUsers) * 100
        }));
    }
}
```

### A/B Testing Analytics

```javascript
class ABTestingAnalytics {
    async assignUserToTest(userId, testName, variants) {
        // Use consistent hashing to assign users to variants
        const variantIndex = this.getUserVariant(userId, variants.length);
        const assignedVariant = variants[variantIndex];

        const testKey = `ab_test:${testName}:${userId}`;
        await this.client.set(testKey, assignedVariant);
        await this.client.expire(testKey, 86400); // 24 hours

        return assignedVariant;
    }

    async trackTestConversion(testName, userId, conversionType) {
        const variant = await this.client.get(`ab_test:${testName}:${userId}`);
        if (!variant) return;

        const conversionKey = `ab_conversion:${testName}:${variant}:${conversionType}`;
        await this.client.incr(conversionKey);

        // Track total participants per variant
        await this.client.hIncrBy(`ab_stats:${testName}`, `participants_${variant}`, 1);
        await this.client.hIncrBy(`ab_stats:${testName}`, `conversions_${variant}_${conversionType}`, 1);
    }

    async getTestResults(testName) {
        const stats = await this.client.hGetAll(`ab_stats:${testName}`);

        const variants = [...new Set(
            Object.keys(stats)
                .filter(key => key.startsWith('participants_'))
                .map(key => key.replace('participants_', ''))
        )];

        const results = {};
        for (const variant of variants) {
            const participants = parseInt(stats[`participants_${variant}`]) || 0;
            const conversions = Object.keys(stats)
                .filter(key => key.startsWith(`conversions_${variant}_`))
                .reduce((sum, key) => sum + parseInt(stats[key]), 0);

            results[variant] = {
                participants,
                conversions,
                conversionRate: participants > 0 ? (conversions / participants) * 100 : 0
            };
        }

        return results;
    }

    getUserVariant(userId, variantCount) {
        // Simple hash function for consistent assignment
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = ((hash << 5) - hash + userId.charCodeAt(i)) & 0xffffffff;
        }
        return Math.abs(hash) % variantCount;
    }
}
```

## Performance Analytics

### Response Time Tracking

```javascript
class PerformanceAnalytics {
    async trackResponseTime(endpoint, method, responseTime, statusCode) {
        const timestamp = Date.now();
        const perfKey = `perf:${endpoint}:${method}`;

        // Store response time in sorted set
        await this.client.zAdd(perfKey, [{
            score: timestamp,
            value: responseTime.toString()
        }]);

        // Keep only last 1000 measurements
        await this.client.zRemRangeByRank(perfKey, 0, -1001);

        // Update aggregates
        await this.client.hIncrBy(`perf_stats:${endpoint}`, 'total_requests', 1);
        await this.client.hIncrBy(`perf_stats:${endpoint}`, `status_${statusCode}`, 1);

        // Track percentiles
        await this.updatePercentiles(perfKey, responseTime);
    }

    async updatePercentiles(key, value) {
        const percentileKey = `${key}:percentiles`;
        await this.client.lPush(percentileKey, value);
        await this.client.lTrim(percentileKey, 0, 999); // Keep last 1000 values
        await this.client.expire(percentileKey, 3600); // 1 hour
    }

    async getPerformanceStats(endpoint, method) {
        const perfKey = `perf:${endpoint}:${method}`;
        const statsKey = `perf_stats:${endpoint}`;

        const responseTimes = await this.client.zRange(perfKey, 0, -1);
        const stats = await this.client.hGetAll(statsKey);

        const times = responseTimes.map(t => parseInt(t)).sort((a, b) => a - b);

        return {
            totalRequests: parseInt(stats.total_requests) || 0,
            averageResponseTime: times.reduce((a, b) => a + b, 0) / times.length,
            p95ResponseTime: this.calculatePercentile(times, 95),
            p99ResponseTime: this.calculatePercentile(times, 99),
            minResponseTime: Math.min(...times),
            maxResponseTime: Math.max(...times),
            statusCodes: Object.fromEntries(
                Object.entries(stats).filter(([key]) => key.startsWith('status_'))
            )
        };
    }

    calculatePercentile(sortedArray, percentile) {
        const index = (percentile / 100) * (sortedArray.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index % 1;

        if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
        return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
    }
}
```

## Real-Time Notifications

### Analytics Alerts

```javascript
class AnalyticsAlerts {
    constructor(redisClient) {
        this.client = redisClient;
        this.alerts = new Map();
    }

    async setAlert(metricName, condition, threshold, callback) {
        const alertKey = `alert:${metricName}`;

        const alert = {
            condition, // 'above', 'below', 'equals'
            threshold,
            callback,
            active: true,
            createdAt: Date.now()
        };

        await this.client.set(alertKey, JSON.stringify(alert));

        // Start monitoring
        this.startMonitoring(metricName);
    }

    async startMonitoring(metricName) {
        if (this.alerts.has(metricName)) return;

        const monitor = setInterval(async () => {
            const currentValue = await this.getCurrentMetric(metricName);
            const alert = await this.getAlert(metricName);

            if (!alert || !alert.active) return;

            const shouldTrigger = this.checkCondition(currentValue, alert);

            if (shouldTrigger) {
                await alert.callback({
                    metric: metricName,
                    value: currentValue,
                    threshold: alert.threshold,
                    condition: alert.condition
                });

                // Optionally deactivate alert after triggering
                // alert.active = false;
                // await this.client.set(`alert:${metricName}`, JSON.stringify(alert));
            }
        }, 5000); // Check every 5 seconds

        this.alerts.set(metricName, monitor);
    }

    checkCondition(value, alert) {
        switch (alert.condition) {
            case 'above':
                return value > alert.threshold;
            case 'below':
                return value < alert.threshold;
            case 'equals':
                return value === alert.threshold;
            default:
                return false;
        }
    }

    async getAlert(metricName) {
        const alertData = await this.client.get(`alert:${metricName}`);
        return alertData ? JSON.parse(alertData) : null;
    }
}
```

## Scaling Real-Time Analytics

### Distributed Analytics

```javascript
class DistributedAnalytics {
    constructor(redisClient, nodeId) {
        this.client = redisClient;
        this.nodeId = nodeId;
    }

    async trackDistributedMetric(metricName, value, tags = {}) {
        const globalKey = `global:${metricName}`;
        const nodeKey = `node:${this.nodeId}:${metricName}`;

        // Update global metric using atomic operations
        await this.client.incrByFloat(globalKey, value);

        // Store node-specific data
        await this.client.zAdd(nodeKey, [{
            score: Date.now(),
            value: JSON.stringify({ value, tags })
        }]);

        // Aggregate data across nodes periodically
        await this.aggregateGlobalMetrics(metricName);
    }

    async aggregateGlobalMetrics(metricName) {
        // Get all node keys for this metric
        const nodeKeys = await this.client.keys(`node:*:${metricName}`);

        let total = 0;
        for (const nodeKey of nodeKeys) {
            const nodeData = await this.client.zRange(nodeKey, 0, -1);
            total += nodeData.reduce((sum, data) => {
                return sum + JSON.parse(data).value;
            }, 0);
        }

        await this.client.set(`global:${metricName}`, total);
    }
}
```

## Best Practices

### 1. Data Retention Policies

```javascript
class DataRetentionManager {
    async applyRetentionPolicy(metricName, retentionHours) {
        const key = `metric:${metricName}`;
        const cutoffTime = Date.now() - (retentionHours * 60 * 60 * 1000);

        // Remove old data points
        await this.client.zRemRangeByScore(key, 0, cutoffTime);

        // Set expiration on the key itself
        await this.client.expire(key, retentionHours * 60 * 60);
    }

    async cleanupOldData() {
        // Run periodically to clean up old analytics data
        const metrics = await this.client.keys('metric:*');

        for (const metric of metrics) {
            // Apply different retention policies based on metric type
            if (metric.includes('page_views')) {
                await this.applyRetentionPolicy(metric.replace('metric:', ''), 24); // 24 hours
            } else if (metric.includes('performance')) {
                await this.applyRetentionPolicy(metric.replace('metric:', ''), 168); // 1 week
            }
        }
    }
}
```

### 2. Memory Optimization

```javascript
class MemoryOptimizedAnalytics {
    async trackMetricEfficiently(metricName, value) {
        // Use HyperLogLog for approximate unique counts
        if (metricName.includes('unique')) {
            await this.client.pfAdd(`hll:${metricName}`, value.toString());
            return;
        }

        // Use Bloom filters for existence checks
        if (metricName.includes('exists')) {
            // Note: Redis doesn't have built-in Bloom filters, but you can implement them
            // using multiple hash functions and bit operations
            await this.addToBloomFilter(`bloom:${metricName}`, value);
            return;
        }

        // Regular tracking for precise counts
        await this.client.incrByFloat(`metric:${metricName}`, value);
    }

    async addToBloomFilter(filterKey, value) {
        // Simple Bloom filter implementation using multiple hashes
        const hashes = this.generateHashes(value, 3); // 3 hash functions

        for (const hash of hashes) {
            await this.client.setBit(filterKey, hash % 1024, 1); // 1024-bit filter
        }
    }

    generateHashes(value, count) {
        const hashes = [];
        for (let i = 0; i < count; i++) {
            hashes.push(this.simpleHash(value + i));
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

## Conclusion

Real-time analytics with Redis enables instant insights and data-driven decisions. Start with basic counters and metrics, then add complex analytics like funnels, A/B testing, and performance monitoring as your needs grow.

**Beginner Tip:** Use Redis atomic operations (INCR, HINCRBY) for consistent metric updates.

**Advanced Tip:** Implement data retention policies and memory optimization techniques to handle large-scale analytics efficiently.</content>
<parameter name="filePath">/Users/chhayhong/Desktop/Redis_University/real_time_analytics.md