# Redis Time Series: From Beginner to Advanced

## What is Time Series Data?

**Beginner Level:** Time series data is information collected over time. Like a weather app showing temperature readings every hour, or a website tracking how many visitors it gets each day. Redis can store and analyze this time-based data very efficiently.

**Intermediate Level:** Time series data consists of sequences of data points indexed by time. Redis provides specialized commands for efficient storage, retrieval, and analysis of time-ordered data using sorted sets and other structures.

## Why Redis for Time Series?

- **High Performance:** Fast ingestion and querying of time series data
- **Memory Efficient:** Compact storage for large datasets
- **Time-Based Operations:** Range queries, aggregations, downsampling
- **Real-Time Analytics:** Live data processing and alerting
- **Scalability:** Handle millions of data points per second

## Basic Time Series Operations

### Beginner Example: Simple Metrics Collection

```javascript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

// Store temperature readings
async function recordTemperature(sensorId, temperature) {
    const timestamp = Date.now();
    const key = `temperature:${sensorId}`;

    await client.zAdd(key, [{ score: timestamp, value: `${temperature}:${timestamp}` }]);

    // Keep only last 1000 readings
    await client.zRemRangeByRank(key, 0, -1001);
}

// Get recent readings
async function getRecentTemperatures(sensorId, count = 10) {
    const key = `temperature:${sensorId}`;
    const readings = await client.zRange(key, -count, -1, { WITHSCORES: true });

    return readings.map(([value, score]) => {
        const [temp, timestamp] = value.split(':');
        return {
            temperature: parseFloat(temp),
            timestamp: parseInt(timestamp)
        };
    });
}

// Example usage
await recordTemperature('sensor1', 23.5);
await recordTemperature('sensor1', 24.1);
await recordTemperature('sensor1', 23.8);

const recent = await getRecentTemperatures('sensor1', 3);
console.log('Recent temperatures:', recent);
```

### Intermediate Example: Time Series Analytics

```javascript
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

**Advanced Tip:** Implement downsampling, compression, and retention policies to manage large-scale time series data efficiently.
class LocationService {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async addLocation(key, id, longitude, latitude, metadata = {}) {
        // Add to geospatial index
        await this.client.geoAdd(key, [{
            longitude,
            latitude,
            member: id
        }]);

        // Store additional metadata
        const metaKey = `${key}:meta:${id}`;
        await this.client.hSet(metaKey, {
            longitude: longitude.toString(),
            latitude: latitude.toString(),
            ...metadata,
            addedAt: new Date().toISOString()
        });
    }

    async findNearby(key, longitude, latitude, radius = 1, unit = 'km', count) {
        const options = {
            radius,
            unit,
            WITHCOORD: true,
            WITHDIST: true
        };

        if (count) {
            options.COUNT = { count };
        }

        const results = await this.client.geoSearch(key, { longitude, latitude }, options);

        // Enrich with metadata
        const enriched = [];
        for (const [id, coords, distance] of results) {
            const metadata = await this.client.hGetAll(`${key}:meta:${id}`);
            enriched.push({
                id,
                longitude: parseFloat(coords[0]),
                latitude: parseFloat(coords[1]),
                distance: parseFloat(distance),
                metadata
            });
        }

        return enriched;
    }

    async getLocation(key, id) {
        const coords = await this.client.geoPos(key, id);
        if (!coords || coords.length === 0) return null;

        const metadata = await this.client.hGetAll(`${key}:meta:${id}`);

        return {
            id,
            longitude: parseFloat(coords[0][0]),
            latitude: parseFloat(coords[0][1]),
            metadata
        };
    }
}
```

## Advanced Geospatial Patterns

### Geofencing and Boundaries

```javascript
class GeofencingService {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async createGeofence(fenceId, centerLongitude, centerLatitude, radius, unit = 'km') {
        const fenceKey = `geofence:${fenceId}`;

        // Store fence metadata
        await this.client.hSet(`${fenceKey}:meta`, {
            centerLongitude: centerLongitude.toString(),
            centerLatitude: centerLatitude.toString(),
            radius: radius.toString(),
            unit,
            createdAt: new Date().toISOString()
        });

        // Create a geospatial index for the fence boundary (approximate)
        // We'll store points around the circumference
        const points = this.generateCirclePoints(centerLongitude, centerLatitude, radius, unit, 32);

        for (const point of points) {
            await this.client.geoAdd(fenceKey, [{
                longitude: point.longitude,
                latitude: point.latitude,
                member: `boundary_${point.index}`
            }]);
        }
    }

    async isInsideGeofence(fenceId, longitude, latitude) {
        const fenceKey = `geofence:${fenceId}`;
        const meta = await this.client.hGetAll(`${fenceKey}:meta`);

        if (!meta.centerLongitude) return false;

        const centerLng = parseFloat(meta.centerLongitude);
        const centerLat = parseFloat(meta.centerLatitude);
        const radius = parseFloat(meta.radius);

        // Calculate distance from center
        const distance = this.calculateDistance(
            centerLng, centerLat,
            longitude, latitude,
            meta.unit
        );

        return distance <= radius;
    }

    async findNearbyGeofences(longitude, latitude, radius = 10, unit = 'km') {
        // Get all geofence keys
        const fenceKeys = await this.client.keys('geofence:*:meta');
        const nearbyFences = [];

        for (const metaKey of fenceKeys) {
            const fenceId = metaKey.replace('geofence:', '').replace(':meta', '');
            const fenceKey = `geofence:${fenceId}`;

            const meta = await this.client.hGetAll(metaKey);
            const centerLng = parseFloat(meta.centerLongitude);
            const centerLat = parseFloat(meta.centerLatitude);

            const distance = this.calculateDistance(
                centerLng, centerLat,
                longitude, latitude,
                unit
            );

            if (distance <= radius) {
                nearbyFences.push({
                    fenceId,
                    distance,
                    center: { longitude: centerLng, latitude: centerLat },
                    radius: parseFloat(meta.radius),
                    unit: meta.unit
                });
            }
        }

        return nearbyFences.sort((a, b) => a.distance - b.distance);
    }

    generateCirclePoints(centerLng, centerLat, radius, unit, points) {
        const result = [];
        const radiusInMeters = this.convertToMeters(radius, unit);

        for (let i = 0; i < points; i++) {
            const angle = (i / points) * 2 * Math.PI;
            const dx = radiusInMeters * Math.cos(angle);
            const dy = radiusInMeters * Math.sin(angle);

            const point = this.destinationPoint(centerLng, centerLat, dx, dy);
            result.push({
                longitude: point.longitude,
                latitude: point.latitude,
                index: i
            });
        }

        return result;
    }

    calculateDistance(lng1, lat1, lng2, lat2, unit = 'km') {
        // Haversine formula
        const R = unit === 'km' ? 6371 : 3959; // Earth's radius
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLng/2) * Math.sin(dLng/2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    convertToMeters(distance, unit) {
        const conversions = {
            'm': 1,
            'km': 1000,
            'mi': 1609.34,
            'ft': 0.3048
        };
        return distance * (conversions[unit] || 1000);
    }

    destinationPoint(lng, lat, dx, dy) {
        // Approximate destination point calculation
        const R = 6371000; // Earth radius in meters
        const dLat = dy / R;
        const dLng = dx / (R * Math.cos(this.toRadians(lat)));

        return {
            longitude: lng + this.toDegrees(dLng),
            latitude: lat + this.toDegrees(dLat)
        };
    }

    toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    toDegrees(radians) {
        return radians * 180 / Math.PI;
    }
}
```

### Location-Based Recommendations

```javascript
class LocationBasedRecommender {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async addPlace(placeId, longitude, latitude, categories, rating = 0) {
        // Add to geospatial index
        await this.client.geoAdd('places', [{
            longitude,
            latitude,
            member: placeId
        }]);

        // Store place metadata
        await this.client.hSet(`place:${placeId}`, {
            longitude: longitude.toString(),
            latitude: latitude.toString(),
            categories: JSON.stringify(categories),
            rating: rating.toString(),
            addedAt: new Date().toISOString()
        });

        // Add to category indices
        for (const category of categories) {
            await this.client.sAdd(`category:${category}`, placeId);
        }
    }

    async recommendNearby(longitude, latitude, preferences = {}, maxDistance = 5, limit = 10) {
        const nearbyPlaces = await this.findNearby('places', longitude, latitude, maxDistance, limit * 2);

        let recommendations = [];

        for (const place of nearbyPlaces) {
            const metadata = await this.client.hGetAll(`place:${place.id}`);
            const categories = JSON.parse(metadata.categories || '[]');
            const rating = parseFloat(metadata.rating || '0');

            // Calculate recommendation score
            let score = this.calculateRecommendationScore(place.distance, rating, categories, preferences);

            recommendations.push({
                ...place,
                categories,
                rating,
                score
            });
        }

        // Sort by recommendation score and return top results
        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    calculateRecommendationScore(distance, rating, categories, preferences) {
        let score = 0;

        // Distance factor (closer is better)
        score += (5 - Math.min(distance, 5)) * 2;

        // Rating factor
        score += rating * 1.5;

        // Category preference factor
        if (preferences.categories) {
            const matchingCategories = categories.filter(cat =>
                preferences.categories.includes(cat)
            );
            score += matchingCategories.length * 3;
        }

        // Price preference (if available)
        if (preferences.maxPrice && metadata.price) {
            const price = parseFloat(metadata.price);
            if (price <= preferences.maxPrice) {
                score += 2;
            }
        }

        return score;
    }

    async findNearby(key, longitude, latitude, radius = 1, count = 10) {
        const results = await this.client.geoSearch(
            key,
            { longitude, latitude },
            {
                radius,
                unit: 'km',
                COUNT: { count },
                WITHCOORD: true,
                WITHDIST: true
            }
        );

        return results.map(([id, coords, distance]) => ({
            id,
            longitude: parseFloat(coords[0]),
            latitude: parseFloat(coords[1]),
            distance: parseFloat(distance)
        }));
    }
}
```

## Geospatial Analytics

### Movement Tracking and Analytics

```javascript
class MovementTracker {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async trackLocation(userId, longitude, latitude, timestamp = Date.now()) {
        const locationKey = `user_locations:${userId}`;

        // Store location history
        await this.client.zAdd(locationKey, [{
            score: timestamp,
            value: JSON.stringify({ longitude, latitude, timestamp })
        }]);

        // Keep only last 1000 locations
        await this.client.zRemRangeByRank(locationKey, 0, -1001);

        // Update current location
        await this.client.geoAdd(`current_locations`, [{
            longitude,
            latitude,
            member: userId
        }]);

        // Store metadata
        await this.client.hSet(`user_meta:${userId}`, {
            lastLocation: JSON.stringify({ longitude, latitude, timestamp }),
            lastUpdate: new Date(timestamp).toISOString()
        });
    }

    async getLocationHistory(userId, startTime, endTime, limit = 100) {
        const locationKey = `user_locations:${userId}`;

        const locations = await this.client.zRangeByScore(
            locationKey,
            startTime,
            endTime,
            { LIMIT: { offset: 0, count: limit } }
        );

        return locations.map(loc => JSON.parse(loc));
    }

    async calculateDistanceTraveled(userId, startTime, endTime) {
        const history = await this.getLocationHistory(userId, startTime, endTime, 1000);

        if (history.length < 2) return 0;

        let totalDistance = 0;

        for (let i = 1; i < history.length; i++) {
            const prev = history[i - 1];
            const curr = history[i];

            totalDistance += this.calculateDistance(
                prev.longitude, prev.latitude,
                curr.longitude, curr.latitude
            );
        }

        return totalDistance;
    }

    async findUsersInArea(longitude, latitude, radius = 1, unit = 'km') {
        const nearby = await this.client.geoSearch(
            'current_locations',
            { longitude, latitude },
            { radius, unit }
        );

        const users = [];
        for (const userId of nearby) {
            const meta = await this.client.hGetAll(`user_meta:${userId}`);
            if (meta.lastLocation) {
                users.push({
                    userId,
                    lastLocation: JSON.parse(meta.lastLocation),
                    lastUpdate: meta.lastUpdate
                });
            }
        }

        return users;
    }

    calculateDistance(lng1, lat1, lng2, lat2) {
        // Haversine formula implementation
        const R = 6371; // Earth's radius in km
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLng/2) * Math.sin(dLng/2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRadians(degrees) {
        return degrees * Math.PI / 180;
    }
}
```

## Advanced Geospatial Queries

### Spatial Joins and Complex Queries

```javascript
class SpatialQueryEngine {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async findPlacesInPolygon(polygon, placeType = 'all') {
        // Simplified polygon query using bounding box approximation
        const bounds = this.getBoundingBox(polygon);
        const places = await this.findPlacesInBoundingBox(bounds, placeType);

        // Filter by actual polygon
        return places.filter(place =>
            this.isPointInPolygon(place.longitude, place.latitude, polygon)
        );
    }

    async findPlacesInBoundingBox(bounds, placeType = 'all') {
        const { minLng, maxLng, minLat, maxLat } = bounds;

        // Use geo search with a large radius to cover the bounding box
        const centerLng = (minLng + maxLng) / 2;
        const centerLat = (minLat + maxLat) / 2;
        const radius = this.calculateBoundingBoxRadius(bounds);

        const candidates = await this.client.geoSearch(
            'places',
            { longitude: centerLng, latitude: centerLat },
            { radius, unit: 'km', WITHCOORD: true }
        );

        // Filter by bounding box
        return candidates
            .map(([id, coords]) => ({
                id,
                longitude: parseFloat(coords[0]),
                latitude: parseFloat(coords[1])
            }))
            .filter(place =>
                place.longitude >= minLng && place.longitude <= maxLng &&
                place.latitude >= minLat && place.latitude <= maxLat
            );
    }

    async findNearestNeighbors(longitude, latitude, k = 5, placeType = 'all') {
        // Get more candidates than needed
        const candidates = await this.client.geoSearch(
            'places',
            { longitude, latitude },
            { radius: 100, unit: 'km', COUNT: { count: k * 3 }, WITHCOORD: true, WITHDIST: true }
        );

        // Sort by distance and return top k
        return candidates
            .map(([id, coords, distance]) => ({
                id,
                longitude: parseFloat(coords[0]),
                latitude: parseFloat(coords[1]),
                distance: parseFloat(distance)
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, k);
    }

    getBoundingBox(polygon) {
        const lngs = polygon.map(p => p.longitude);
        const lats = polygon.map(p => p.latitude);

        return {
            minLng: Math.min(...lngs),
            maxLng: Math.max(...lngs),
            minLat: Math.min(...lats),
            maxLat: Math.max(...lats)
        };
    }

    calculateBoundingBoxRadius(bounds) {
        const { minLng, maxLng, minLat, maxLat } = bounds;

        // Calculate distance from center to corner
        const centerLng = (minLng + maxLng) / 2;
        const centerLat = (minLat + maxLat) / 2;

        const cornerDistance = this.calculateDistance(
            centerLng, centerLat, maxLng, maxLat
        );

        return cornerDistance * 1.5; // Add some padding
    }

    isPointInPolygon(longitude, latitude, polygon) {
        // Ray casting algorithm
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].longitude, yi = polygon[i].latitude;
            const xj = polygon[j].longitude, yj = polygon[j].latitude;

            if (((yi > latitude) !== (yj > latitude)) &&
                (longitude < (xj - xi) * (latitude - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    calculateDistance(lng1, lat1, lng2, lat2) {
        const R = 6371; // Earth's radius in km
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLng/2) * Math.sin(dLng/2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRadians(degrees) {
        return degrees * Math.PI / 180;
    }
}
```

## Performance Optimization

### Geospatial Indexing Strategies

```javascript
class GeospatialOptimizer {
    constructor(redisClient) {
        this.client = redisClient;
    }

    // Grid-based indexing for better performance
    async createGridIndex(key, gridSize = 0.01) { // ~1km grid
        const places = await this.client.geoSearch(key, { longitude: 0, latitude: 0 }, { radius: 20000, unit: 'km' });

        for (const [placeId, coords] of places) {
            const longitude = parseFloat(coords[0]);
            const latitude = parseFloat(coords[1]);

            const gridX = Math.floor(longitude / gridSize);
            const gridY = Math.floor(latitude / gridSize);
            const gridKey = `${gridX}:${gridY}`;

            await this.client.sAdd(`grid:${key}:${gridKey}`, placeId);
        }
    }

    async searchWithGrid(key, longitude, latitude, radius, unit = 'km') {
        const gridSize = 0.01;
        const radiusDegrees = this.convertRadiusToDegrees(radius, unit);

        const minGridX = Math.floor((longitude - radiusDegrees) / gridSize);
        const maxGridX = Math.floor((longitude + radiusDegrees) / gridSize);
        const minGridY = Math.floor((latitude - radiusDegrees) / gridSize);
        const maxGridY = Math.floor((latitude + radiusDegrees) / gridSize);

        const candidatePlaces = new Set();

        // Collect candidates from relevant grid cells
        for (let x = minGridX; x <= maxGridX; x++) {
            for (let y = minGridY; y <= maxGridY; y++) {
                const gridKey = `${x}:${y}`;
                const places = await this.client.sMembers(`grid:${key}:${gridKey}`);
                places.forEach(place => candidatePlaces.add(place));
            }
        }

        // Filter by actual distance
        const results = [];
        for (const placeId of candidatePlaces) {
            const distance = await this.client.geoDist(key, placeId, [longitude, latitude], unit);
            if (distance !== null && parseFloat(distance) <= radius) {
                const coords = await this.client.geoPos(key, placeId);
                results.push({
                    id: placeId,
                    longitude: parseFloat(coords[0][0]),
                    latitude: parseFloat(coords[0][1]),
                    distance: parseFloat(distance)
                });
            }
        }

        return results.sort((a, b) => a.distance - b.distance);
    }

    convertRadiusToDegrees(radius, unit) {
        // Approximate conversion
        const kmPerDegree = 111; // Roughly 111 km per degree
        const radiusKm = unit === 'km' ? radius : radius * 1.60934; // Convert miles to km
        return radiusKm / kmPerDegree;
    }

    // Caching for frequent queries
    async cachedGeoSearch(key, longitude, latitude, radius, unit = 'km', ttl = 300) {
        const cacheKey = `cache:geo:${key}:${longitude.toFixed(4)}:${latitude.toFixed(4)}:${radius}:${unit}`;

        // Check cache first
        const cached = await this.client.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Perform search
        const results = await this.client.geoSearch(
            key,
            { longitude, latitude },
            { radius, unit, WITHCOORD: true, WITHDIST: true }
        );

        // Cache results
        await this.client.setEx(cacheKey, ttl, JSON.stringify(results));

        return results;
    }
}
```

## Real-World Applications

### Ride-Sharing Service

```javascript
class RideSharingService {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async addDriver(driverId, longitude, latitude, status = 'available') {
        await this.client.geoAdd('drivers', [{
            longitude,
            latitude,
            member: driverId
        }]);

        await this.client.hSet(`driver:${driverId}`, {
            status,
            longitude: longitude.toString(),
            latitude: latitude.toString(),
            lastUpdate: new Date().toISOString()
        });
    }

    async findNearbyDrivers(longitude, latitude, radius = 5, limit = 10) {
        const drivers = await this.client.geoSearch(
            'drivers',
            { longitude, latitude },
            { radius, unit: 'km', COUNT: { count: limit }, WITHCOORD: true, WITHDIST: true }
        );

        const availableDrivers = [];
        for (const [driverId, coords, distance] of drivers) {
            const driverData = await this.client.hGetAll(`driver:${driverId}`);
            if (driverData.status === 'available') {
                availableDrivers.push({
                    driverId,
                    longitude: parseFloat(coords[0]),
                    latitude: parseFloat(coords[1]),
                    distance: parseFloat(distance),
                    lastUpdate: driverData.lastUpdate
                });
            }
        }

        return availableDrivers;
    }

    async requestRide(userId, pickupLng, pickupLat, dropoffLng, dropoffLat) {
        const nearbyDrivers = await this.findNearbyDrivers(pickupLng, pickupLat, 3, 5);

        if (nearbyDrivers.length === 0) {
            throw new Error('No drivers available');
        }

        // Assign closest driver
        const assignedDriver = nearbyDrivers[0];

        const rideId = this.generateId();
        const ride = {
            id: rideId,
            userId,
            driverId: assignedDriver.driverId,
            pickup: { longitude: pickupLng, latitude: pickupLat },
            dropoff: { longitude: dropoffLng, latitude: dropoffLat },
            status: 'assigned',
            createdAt: new Date().toISOString(),
            estimatedDistance: await this.calculateDistance(pickupLng, pickupLat, dropoffLng, dropoffLat)
        };

        await this.client.hSet(`ride:${rideId}`, ride);
        await this.client.set(`user_ride:${userId}`, rideId);
        await this.client.set(`driver_ride:${assignedDriver.driverId}`, rideId);

        return ride;
    }

    async calculateDistance(lng1, lat1, lng2, lat2) {
        // Haversine formula
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}
```

## Best Practices

### Data Accuracy and Validation

```javascript
class GeospatialValidator {
    static validateCoordinates(longitude, latitude) {
        if (longitude < -180 || longitude > 180) {
            throw new Error('Invalid longitude');
        }
        if (latitude < -90 || latitude > 90) {
            throw new Error('Invalid latitude');
        }
        return true;
    }

    static normalizeCoordinates(longitude, latitude, precision = 6) {
        return {
            longitude: parseFloat(longitude.toFixed(precision)),
            latitude: parseFloat(latitude.toFixed(precision))
        };
    }

    static isValidRadius(radius, unit) {
        const maxRadii = {
            'm': 20000000,  // 20,000 km in meters
            'km': 20000,
            'mi': 12427,
            'ft': 65616800
        };

        return radius > 0 && radius <= maxRadii[unit];
    }
}
```

### Performance Monitoring

```javascript
class GeospatialMonitor {
    constructor(redisClient) {
        this.client = redisClient;
        this.metricsKey = 'geospatial_metrics';
    }

    async recordQuery(queryType, duration, resultCount) {
        const timestamp = Date.now();

        await this.client.hIncrBy(`${this.metricsKey}:queries`, queryType, 1);
        await this.client.zAdd(`${this.metricsKey}:performance`, [{
            score: timestamp,
            value: JSON.stringify({ queryType, duration, resultCount })
        }]);

        // Keep only last 1000 performance records
        await this.client.zRemRangeByRank(`${this.metricsKey}:performance`, 0, -1001);
    }

    async getQueryStats() {
        const queries = await this.client.hGetAll(`${this.metricsKey}:queries`);
        const performance = await this.client.zRange(`${this.metricsKey}:performance`, -100, -1);

        const stats = {
            totalQueries: Object.values(queries).reduce((sum, count) => sum + parseInt(count), 0),
            queryBreakdown: Object.fromEntries(
                Object.entries(queries).map(([type, count]) => [type, parseInt(count)])
            ),
            recentPerformance: performance.map(p => JSON.parse(p))
        };

        // Calculate averages
        if (stats.recentPerformance.length > 0) {
            const avgDuration = stats.recentPerformance.reduce((sum, p) => sum + p.duration, 0) /
                              stats.recentPerformance.length;
            stats.averageQueryTime = avgDuration;
        }

        return stats;
    }
}
```

## Conclusion

Redis geospatial capabilities enable fast, accurate location-based services. Start with basic GEOADD and GEOSEARCH operations, then build complex applications like geofencing, recommendations, and ride-sharing.

**Beginner Tip:** Always validate coordinates and use appropriate radius units for your use case.

**Advanced Tip:** Combine geospatial queries with other Redis data structures for rich, location-aware applications with real-time updates.</content>
<parameter name="filePath">/Users/chhayhong/Desktop/Redis_University/geospatial.md