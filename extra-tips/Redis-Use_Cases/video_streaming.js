import { createClient } from 'redis';

class VideoStreamingPlatform {
    constructor() {
        this.client = createClient({
            username: 'default',
            password: 'gX94CVL0mRXXi7hligXMmMavy4lr55PV',
            socket: {
                host: 'redis-12372.c54.ap-northeast-1-2.ec2.redns.redis-cloud.com',
                port: 12372
            }
        });

        this.client.on('error', (err) => console.log('Redis Client Error', err));
    }

    async connect() {
        await this.client.connect();
    }

    // 1. Cache video metadata for fast access
    async cacheVideoMetadata(videoId, metadata) {
        const key = `video:metadata:${videoId}`;
        await this.client.setEx(key, 3600, JSON.stringify(metadata)); // Cache for 1 hour
        console.log(`Cached metadata for video ${videoId}`);
    }

    async getVideoMetadata(videoId) {
        const key = `video:metadata:${videoId}`;
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }

    // 2. Track user watching sessions
    async startWatchingSession(userId, videoId, sessionData) {
        const sessionKey = `session:${userId}:${videoId}`;
        const session = {
            ...sessionData,
            startTime: Date.now(),
            lastActivity: Date.now()
        };
        await this.client.setEx(sessionKey, 7200, JSON.stringify(session)); // 2 hours
        console.log(`Started watching session for user ${userId} on video ${videoId}`);
    }

    async updateWatchingProgress(userId, videoId, progress) {
        const sessionKey = `session:${userId}:${videoId}`;
        const sessionData = await this.client.get(sessionKey);
        if (sessionData) {
            const session = JSON.parse(sessionData);
            session.progress = progress;
            session.lastActivity = Date.now();
            await this.client.setEx(sessionKey, 7200, JSON.stringify(session));
        }
    }

    // 3. Real-time view counting with atomic operations
    async incrementViewCount(videoId) {
        const key = `video:views:${videoId}`;
        const views = await this.client.incr(key);
        console.log(`Video ${videoId} now has ${views} views`);
        return views;
    }

    async getViewCount(videoId) {
        const key = `video:views:${videoId}`;
        return parseInt(await this.client.get(key) || '0');
    }

    // 4. Cache user recommendations
    async cacheUserRecommendations(userId, recommendations) {
        const key = `user:recommendations:${userId}`;
        await this.client.setEx(key, 1800, JSON.stringify(recommendations)); // 30 minutes
        console.log(`Cached recommendations for user ${userId}`);
    }

    async getUserRecommendations(userId) {
        const key = `user:recommendations:${userId}`;
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }

    // 5. Rate limiting for API endpoints
    async checkRateLimit(userId, endpoint, limit = 100, window = 60) {
        const key = `ratelimit:${endpoint}:${userId}`;
        const current = await this.client.incr(key);

        if (current === 1) {
            await this.client.expire(key, window);
        }

        if (current > limit) {
            console.log(`Rate limit exceeded for user ${userId} on ${endpoint}`);
            return false;
        }

        return true;
    }

    // 6. Live streaming viewer tracking
    async addLiveViewer(streamId, userId, userInfo) {
        const viewersKey = `live:viewers:${streamId}`;
        await this.client.sAdd(viewersKey, userId);

        const userKey = `live:user:${streamId}:${userId}`;
        await this.client.setEx(userKey, 3600, JSON.stringify(userInfo));

        const count = await this.client.sCard(viewersKey);
        console.log(`Added viewer ${userId} to stream ${streamId}. Total viewers: ${count}`);
        return count;
    }

    async removeLiveViewer(streamId, userId) {
        const viewersKey = `live:viewers:${streamId}`;
        await this.client.sRem(viewersKey, userId);

        const userKey = `live:user:${streamId}:${userId}`;
        await this.client.del(userKey);

        const count = await this.client.sCard(viewersKey);
        console.log(`Removed viewer ${userId} from stream ${streamId}. Total viewers: ${count}`);
        return count;
    }

    async getLiveViewerCount(streamId) {
        const viewersKey = `live:viewers:${streamId}`;
        return await this.client.sCard(viewersKey);
    }

    // 7. Cache video segments (for adaptive streaming)
    async cacheVideoSegment(videoId, segmentId, segmentData, quality) {
        const key = `video:segment:${videoId}:${quality}:${segmentId}`;
        // In practice, you'd store segment URLs or metadata, not the actual binary data
        await this.client.setEx(key, 3600, JSON.stringify({
            url: segmentData.url,
            size: segmentData.size,
            duration: segmentData.duration
        }));
        console.log(`Cached segment ${segmentId} for video ${videoId} at quality ${quality}`);
    }

    async getVideoSegment(videoId, segmentId, quality) {
        const key = `video:segment:${videoId}:${quality}:${segmentId}`;
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }

    // 8. User watch history with sorted sets
    async addToWatchHistory(userId, videoId, timestamp = Date.now()) {
        const key = `user:history:${userId}`;
        await this.client.zAdd(key, { score: timestamp, value: videoId });
        // Keep only last 100 videos
        await this.client.zRemRangeByRank(key, 0, -101);
        console.log(`Added video ${videoId} to watch history for user ${userId}`);
    }

    async getWatchHistory(userId, limit = 20) {
        const key = `user:history:${userId}`;
        const history = await this.client.zRange(key, -limit, -1, { REV: true, WITHSCORES: true });
        return history.map(([videoId, score]) => ({
            videoId,
            watchedAt: parseInt(score)
        }));
    }

    // 9. Content moderation queue
    async queueVideoForModeration(videoId, priority = 1) {
        const queueKey = 'moderation:queue';
        await this.client.zAdd(queueKey, { score: priority, value: videoId });
        console.log(`Queued video ${videoId} for moderation with priority ${priority}`);
    }

    async getNextVideoForModeration() {
        const queueKey = 'moderation:queue';
        const videos = await this.client.zPopMax(queueKey);
        return videos.length > 0 ? videos[0].value : null;
    }

    // 10. Personalized video feed caching
    async cachePersonalizedFeed(userId, feedData) {
        const key = `user:feed:${userId}`;
        await this.client.setEx(key, 900, JSON.stringify(feedData)); // 15 minutes
        console.log(`Cached personalized feed for user ${userId}`);
    }

    async getPersonalizedFeed(userId) {
        const key = `user:feed:${userId}`;
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }

    async disconnect() {
        await this.client.destroy();
    }
}

// Example usage
async function demonstrateVideoStreaming() {
    const platform = new VideoStreamingPlatform();
    await platform.connect();

    try {
        // Cache video metadata
        await platform.cacheVideoMetadata('video123', {
            title: 'Amazing Tutorial',
            duration: 1800,
            thumbnail: 'https://example.com/thumb.jpg',
            tags: ['tutorial', 'javascript']
        });

        // Start watching session
        await platform.startWatchingSession('user456', 'video123', {
            quality: '1080p',
            device: 'web'
        });

        // Update progress
        await platform.updateWatchingProgress('user456', 'video123', 45.5); // 45.5% watched

        // Increment views
        await platform.incrementViewCount('video123');

        // Cache recommendations
        await platform.cacheUserRecommendations('user456', [
            'video124', 'video125', 'video126'
        ]);

        // Check rate limit
        const allowed = await platform.checkRateLimit('user456', 'api/watch', 10, 60);
        console.log(`Rate limit check: ${allowed ? 'allowed' : 'blocked'}`);

        // Live streaming example
        await platform.addLiveViewer('stream789', 'user456', {
            username: 'john_doe',
            joinedAt: Date.now()
        });

        // Cache video segment
        await platform.cacheVideoSegment('video123', 'segment001', {
            url: 'https://cdn.example.com/segment001.mp4',
            size: 2048576,
            duration: 10
        }, '1080p');

        // Add to watch history
        await platform.addToWatchHistory('user456', 'video123');

        // Queue for moderation
        await platform.queueVideoForModeration('video123', 2);

        // Cache personalized feed
        await platform.cachePersonalizedFeed('user456', {
            videos: ['video124', 'video125'],
            generatedAt: Date.now()
        });

        console.log('Video streaming platform demonstration completed successfully!');

    } catch (error) {
        console.error('Error in demonstration:', error);
    } finally {
        await platform.disconnect();
    }
}

export default VideoStreamingPlatform;

// Run demonstration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    demonstrateVideoStreaming().catch(console.error);
}