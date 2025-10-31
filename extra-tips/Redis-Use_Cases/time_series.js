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

// Time Series Data example - storing and analyzing time-stamped data
class TimeSeriesManager {
    constructor(redisClient) {
        this.client = redisClient;
    }

    // Add a data point to time series
    async addDataPoint(seriesName, timestamp, value, metadata = {}) {
        const key = `timeseries:${seriesName}`;

        // Store as sorted set with timestamp as score
        await this.client.zAdd(key, [{ score: timestamp, value: JSON.stringify({ value, ...metadata }) }]);

        // Keep only last 10000 data points to prevent unlimited growth
        await this.client.zRemRangeByRank(key, 0, -10001);

        console.log(`Added data point to ${seriesName}: ${value} at ${new Date(timestamp).toISOString()}`);
    }

    // Get data points in time range
    async getDataPoints(seriesName, startTime, endTime, limit = 1000) {
        const key = `timeseries:${seriesName}`;

        const results = await this.client.zRangeByScoreWithScores(key, startTime, endTime, {
            LIMIT: { offset: 0, count: limit }
        });

        return results.map(result => ({
            timestamp: result.score,
            ...JSON.parse(result.value)
        }));
    }

    // Get latest data points
    async getLatestDataPoints(seriesName, count = 10) {
        const key = `timeseries:${seriesName}`;

        const results = await this.client.zRevRangeWithScores(key, 0, count - 1);

        return results.map(result => ({
            timestamp: result.score,
            ...JSON.parse(result.value)
        }));
    }

    // Calculate basic statistics for a time range
    async getStatistics(seriesName, startTime, endTime) {
        const dataPoints = await this.getDataPoints(seriesName, startTime, endTime, 10000);

        if (dataPoints.length === 0) {
            return { count: 0, min: 0, max: 0, avg: 0, sum: 0 };
        }

        const values = dataPoints.map(dp => dp.value);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        return {
            count: dataPoints.length,
            min,
            max,
            avg: Math.round(avg * 100) / 100,
            sum: Math.round(sum * 100) / 100
        };
    }

    // Downsample time series (reduce data points)
    async downsample(seriesName, intervalSeconds, method = 'avg') {
        const key = `timeseries:${seriesName}`;
        const downsampledKey = `timeseries:${seriesName}:downsampled_${intervalSeconds}s`;

        // Get all data points
        const allData = await this.client.zRangeWithScores(key, 0, -1);

        if (allData.length === 0) return;

        // Group by intervals
        const intervals = new Map();

        for (const item of allData) {
            const timestamp = item.score;
            const intervalStart = Math.floor(timestamp / (intervalSeconds * 1000)) * (intervalSeconds * 1000);
            const data = JSON.parse(item.value);

            if (!intervals.has(intervalStart)) {
                intervals.set(intervalStart, []);
            }
            intervals.get(intervalStart).push(data.value);
        }

        // Calculate aggregated values for each interval
        const downsampledData = [];
        for (const [intervalStart, values] of intervals) {
            let aggregatedValue;

            switch (method) {
                case 'avg':
                    aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
                    break;
                case 'sum':
                    aggregatedValue = values.reduce((a, b) => a + b, 0);
                    break;
                case 'min':
                    aggregatedValue = Math.min(...values);
                    break;
                case 'max':
                    aggregatedValue = Math.max(...values);
                    break;
                case 'count':
                    aggregatedValue = values.length;
                    break;
                default:
                    aggregatedValue = values[values.length - 1]; // last
            }

            downsampledData.push({
                score: intervalStart,
                value: JSON.stringify({
                    value: Math.round(aggregatedValue * 100) / 100,
                    method,
                    originalCount: values.length
                })
            });
        }

        // Store downsampled data
        await this.client.zAdd(downsampledKey, downsampledData);

        // Set expiration (keep for 30 days)
        await this.client.expire(downsampledKey, 30 * 24 * 60 * 60);

        console.log(`Created downsampled series: ${downsampledKey} with ${downsampledData.length} points`);
        return downsampledKey;
    }

    // Detect anomalies (simple threshold-based)
    async detectAnomalies(seriesName, threshold = 2.0, windowSize = 10) {
        const dataPoints = await this.getLatestDataPoints(seriesName, windowSize * 2);

        if (dataPoints.length < windowSize) {
            return [];
        }

        // Calculate moving average
        const values = dataPoints.map(dp => dp.value);
        const recentValues = values.slice(-windowSize);
        const avg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
        const stdDev = Math.sqrt(
            recentValues.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / recentValues.length
        );

        const anomalies = [];
        for (let i = 0; i < dataPoints.length; i++) {
            const dp = dataPoints[i];
            const zScore = Math.abs(dp.value - avg) / (stdDev || 1);

            if (zScore > threshold) {
                anomalies.push({
                    timestamp: dp.timestamp,
                    value: dp.value,
                    zScore: Math.round(zScore * 100) / 100,
                    isAnomaly: true
                });
            }
        }

        return anomalies;
    }

    // Store metrics with automatic aggregation
    async recordMetric(metricName, value, tags = {}) {
        const timestamp = Date.now();
        const hour = Math.floor(timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000); // Round to hour

        // Store raw data point
        await this.addDataPoint(`${metricName}:raw`, timestamp, value, tags);

        // Update hourly aggregates
        const hourlyKey = `${metricName}:hourly`;
        const existing = await this.client.hGetAll(`${hourlyKey}:${hour}`);

        const count = (parseInt(existing.count) || 0) + 1;
        const sum = (parseFloat(existing.sum) || 0) + value;
        const min = Math.min(parseFloat(existing.min) || value, value);
        const max = Math.max(parseFloat(existing.max) || value, value);

        await this.client.hSet(`${hourlyKey}:${hour}`, {
            count: count.toString(),
            sum: sum.toString(),
            min: min.toString(),
            max: max.toString(),
            avg: (sum / count).toString()
        });

        // Set expiration on hourly data (keep for 90 days)
        await this.client.expire(`${hourlyKey}:${hour}`, 90 * 24 * 60 * 60);
    }

    // Get metric aggregates
    async getMetricAggregates(metricName, startHour, endHour) {
        const hourlyKey = `${metricName}:hourly`;
        const aggregates = [];

        for (let hour = startHour; hour <= endHour; hour += 60 * 60 * 1000) {
            const data = await this.client.hGetAll(`${hourlyKey}:${hour}`);
            if (Object.keys(data).length > 0) {
                aggregates.push({
                    timestamp: hour,
                    count: parseInt(data.count),
                    sum: parseFloat(data.sum),
                    min: parseFloat(data.min),
                    max: parseFloat(data.max),
                    avg: parseFloat(data.avg)
                });
            }
        }

        return aggregates;
    }
}

// Demo the time series functionality
async function demoTimeSeries() {
    const ts = new TimeSeriesManager(client);

    console.log('=== Redis Time Series Data Demo ===\n');

    // Simulate temperature sensor data
    console.log('1. Recording temperature sensor data:');
    const now = Date.now();
    const temperatures = [22.5, 23.1, 22.8, 23.5, 24.0, 23.8, 22.9, 23.2, 24.1, 23.7];

    for (let i = 0; i < temperatures.length; i++) {
        const timestamp = now - (temperatures.length - i) * 60 * 1000; // 1 minute intervals
        await ts.addDataPoint('sensor:temperature:living_room', timestamp, temperatures[i], {
            sensor_id: 'temp_001',
            location: 'living_room',
            unit: 'celsius'
        });
    }
    console.log();

    // Get recent temperature readings
    console.log('2. Getting recent temperature readings:');
    const recentTemps = await ts.getLatestDataPoints('sensor:temperature:living_room', 5);
    recentTemps.forEach(temp => {
        console.log(`  ${new Date(temp.timestamp).toLocaleTimeString()}: ${temp.value}°C`);
    });
    console.log();

    // Get temperature statistics for last hour
    console.log('3. Temperature statistics for last hour:');
    const oneHourAgo = now - 60 * 60 * 1000;
    const stats = await ts.getStatistics('sensor:temperature:living_room', oneHourAgo, now);
    console.log('Stats:', JSON.stringify(stats, null, 2));
    console.log();

    // Record website response times
    console.log('4. Recording website response times:');
    const responseTimes = [120, 95, 150, 85, 110, 200, 90, 135, 175, 95, 80, 125];

    for (let i = 0; i < responseTimes.length; i++) {
        const timestamp = now - (responseTimes.length - i) * 30 * 1000; // 30 second intervals
        await ts.recordMetric('web:response_time', responseTimes[i], {
            endpoint: '/api/users',
            method: 'GET',
            status_code: 200
        });
    }
    console.log();

    // Get response time aggregates
    console.log('5. Response time aggregates (last 2 hours):');
    const twoHoursAgo = Math.floor((now - 2 * 60 * 60 * 1000) / (60 * 60 * 1000)) * (60 * 60 * 1000);
    const currentHour = Math.floor(now / (60 * 60 * 1000)) * (60 * 60 * 1000);

    const aggregates = await ts.getMetricAggregates('web:response_time', twoHoursAgo, currentHour);
    aggregates.forEach(agg => {
        console.log(`  ${new Date(agg.timestamp).toLocaleString()}:`);
        console.log(`    Count: ${agg.count}, Avg: ${agg.avg}ms, Min: ${agg.min}ms, Max: ${agg.max}ms`);
    });
    console.log();

    // Downsample temperature data
    console.log('6. Creating downsampled temperature data (5-minute averages):');
    await ts.downsample('sensor:temperature:living_room', 300, 'avg'); // 5 minutes
    const downsampled = await ts.getLatestDataPoints('sensor:temperature:living_room:downsampled_300s', 3);
    console.log('Downsampled data:');
    downsampled.forEach(dp => {
        console.log(`  ${new Date(dp.timestamp).toLocaleTimeString()}: ${dp.value}°C (from ${dp.originalCount} readings)`);
    });
    console.log();

    // Detect anomalies in response times
    console.log('7. Detecting anomalies in response times:');
    const anomalies = await ts.detectAnomalies('web:response_time', 1.5, 8);
    if (anomalies.length > 0) {
        console.log('Detected anomalies:');
        anomalies.forEach(anomaly => {
            console.log(`  ${new Date(anomaly.timestamp).toLocaleTimeString()}: ${anomaly.value}ms (z-score: ${anomaly.zScore})`);
        });
    } else {
        console.log('No anomalies detected');
    }
    console.log();

    // Simulate real-time monitoring
    console.log('8. Real-time monitoring simulation:');
    const monitoringInterval = setInterval(async () => {
        // Simulate random temperature readings
        const temp = 22 + Math.random() * 4; // 22-26°C
        await ts.addDataPoint('sensor:temperature:living_room', Date.now(), temp, {
            sensor_id: 'temp_001',
            location: 'living_room',
            unit: 'celsius'
        });

        // Check for temperature anomalies
        const tempAnomalies = await ts.detectAnomalies('sensor:temperature:living_room', 2.0, 5);
        if (tempAnomalies.length > 0) {
            console.log(`🚨 Temperature anomaly detected: ${tempAnomalies[0].value}°C`);
        }
    }, 2000);

    // Run monitoring for 10 seconds
    await new Promise(resolve => setTimeout(resolve, 10000));
    clearInterval(monitoringInterval);
    console.log('Monitoring simulation completed');
    console.log();

    // Get final statistics
    console.log('9. Final temperature statistics:');
    const finalStats = await ts.getStatistics('sensor:temperature:living_room', now - 24 * 60 * 60 * 1000, now);
    console.log('24-hour stats:', JSON.stringify(finalStats, null, 2));

    await client.disconnect();
    console.log('\nTime series demo completed!');
}

demoTimeSeries().catch(console.error);