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

// Real-time Analytics example - tracking metrics and counters
class AnalyticsTracker {
    constructor(redisClient) {
        this.client = redisClient;
    }

    // Track page views
    async trackPageView(page, userId = null, referrer = null) {
        const now = new Date();
        const hour = now.getHours();
        const day = now.toISOString().split('T')[0]; // YYYY-MM-DD format

        const keys = [
            `pageviews:${page}:total`,
            `pageviews:${page}:${day}`,
            `pageviews:hourly:${day}:${hour}`,
            `pageviews:daily:${day}`
        ];

        // Increment counters
        for (const key of keys) {
            await this.client.incr(key);
        }

        // Track unique visitors (using HyperLogLog)
        await this.client.pfAdd(`unique_visitors:${day}`, userId || `anon_${Date.now()}`);

        // Track referrer if provided
        if (referrer) {
            await this.client.zIncrBy(`referrers:${page}:${day}`, 1, referrer);
        }

        // Track user-specific data
        if (userId) {
            await this.client.sAdd(`users_visited:${page}:${day}`, userId);
            await this.client.zIncrBy(`user_pageviews:${userId}:${day}`, 1, page);
        }

        console.log(`Tracked page view: ${page}`);
    }

    // Track events (button clicks, form submissions, etc.)
    async trackEvent(eventName, userId = null, metadata = {}) {
        const day = new Date().toISOString().split('T')[0];

        // Increment event counter
        await this.client.incr(`events:${eventName}:${day}`);

        // Store event metadata in a hash
        const eventKey = `event_data:${eventName}:${Date.now()}`;
        await this.client.hSet(eventKey, {
            userId: userId || 'anonymous',
            timestamp: new Date().toISOString(),
            ...metadata
        });

        // Set expiration for event data (keep for 30 days)
        await this.client.expire(eventKey, 30 * 24 * 60 * 60);

        // Track unique users for this event
        if (userId) {
            await this.client.sAdd(`event_users:${eventName}:${day}`, userId);
        }

        console.log(`Tracked event: ${eventName}`);
    }

    // Track performance metrics
    async trackPerformanceMetric(metricName, value, userId = null) {
        const day = new Date().toISOString().split('T')[0];

        // Store individual measurements
        await this.client.lPush(`performance:${metricName}:${day}`, value);

        // Keep only last 1000 measurements
        await this.client.lTrim(`performance:${metricName}:${day}`, 0, 999);

        // Update min/max/avg using sorted sets
        const metricKey = `performance_stats:${metricName}:${day}`;
        await this.client.zAdd(metricKey, [
            { score: value, value: Date.now().toString() }
        ]);

        // Keep only last 1000 stats entries
        await this.client.zRemRangeByRank(metricKey, 0, -1001);

        console.log(`Tracked performance metric: ${metricName} = ${value}`);
    }

    // Get analytics data
    async getAnalytics(page, days = 7) {
        const results = {};
        const now = new Date();

        for (let i = 0; i < days; i++) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const day = date.toISOString().split('T')[0];

            const totalViews = await this.client.get(`pageviews:${page}:${day}`) || 0;
            const uniqueVisitors = await this.client.pfCount(`unique_visitors:${day}`) || 0;

            results[day] = {
                pageViews: parseInt(totalViews),
                uniqueVisitors: uniqueVisitors
            };
        }

        return results;
    }

    // Get top pages
    async getTopPages(limit = 10) {
        const day = new Date().toISOString().split('T')[0];
        const pattern = `pageviews:*:${day}`;

        // Get all page view keys for today
        const keys = await this.client.keys(pattern);
        const pageViews = [];

        for (const key of keys) {
            const views = await this.client.get(key);
            const page = key.replace(`pageviews:`, '').replace(`:${day}`, '');
            pageViews.push({ page, views: parseInt(views) || 0 });
        }

        // Sort by views descending
        return pageViews.sort((a, b) => b.views - a.views).slice(0, limit);
    }

    // Get real-time stats
    async getRealTimeStats() {
        const day = new Date().toISOString().split('T')[0];
        const hour = new Date().getHours();

        const totalPageViews = await this.client.get(`pageviews:daily:${day}`) || 0;
        const hourlyPageViews = await this.client.get(`pageviews:hourly:${day}:${hour}`) || 0;
        const uniqueVisitors = await this.client.pfCount(`unique_visitors:${day}`) || 0;

        return {
            totalPageViews: parseInt(totalPageViews),
            hourlyPageViews: parseInt(hourlyPageViews),
            uniqueVisitors,
            day,
            hour
        };
    }
}

// Demo the analytics functionality
async function demoRealTimeAnalytics() {
    const analytics = new AnalyticsTracker(client);

    console.log('=== Redis Real-time Analytics Demo ===\n');

    // Simulate page views
    console.log('1. Tracking page views:');
    await analytics.trackPageView('/home', 'user123', 'google.com');
    await analytics.trackPageView('/home', 'user456', 'facebook.com');
    await analytics.trackPageView('/products', 'user123', 'direct');
    await analytics.trackPageView('/products', 'user789', '/home');
    await analytics.trackPageView('/home', 'user456', 'google.com');
    console.log();

    // Track events
    console.log('2. Tracking events:');
    await analytics.trackEvent('button_click', 'user123', { button: 'buy_now', page: '/products' });
    await analytics.trackEvent('form_submit', 'user456', { form: 'contact', success: true });
    await analytics.trackEvent('button_click', 'user123', { button: 'add_to_cart', page: '/products' });
    console.log();

    // Track performance metrics
    console.log('3. Tracking performance metrics:');
    await analytics.trackPerformanceMetric('page_load_time', 1250, 'user123'); // 1.25 seconds
    await analytics.trackPerformanceMetric('page_load_time', 980, 'user456');  // 0.98 seconds
    await analytics.trackPerformanceMetric('api_response_time', 150, 'user123'); // 150ms
    await analytics.trackPerformanceMetric('api_response_time', 200, 'user456'); // 200ms
    console.log();

    // Get real-time stats
    console.log('4. Real-time statistics:');
    const stats = await analytics.getRealTimeStats();
    console.log('Current stats:', JSON.stringify(stats, null, 2));
    console.log();

    // Get top pages
    console.log('5. Top pages today:');
    const topPages = await analytics.getTopPages(5);
    console.log('Top pages:', JSON.stringify(topPages, null, 2));
    console.log();

    // Get analytics for a specific page
    console.log('6. Analytics for /home page (last 3 days):');
    const homeAnalytics = await analytics.getAnalytics('/home', 3);
    console.log('Home page analytics:', JSON.stringify(homeAnalytics, null, 2));

    await client.disconnect();
}

demoRealTimeAnalytics().catch(console.error);