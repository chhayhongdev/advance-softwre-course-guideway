# Redis for Video Streaming Platforms

## Overview
Redis is exceptionally well-suited for video streaming platforms, providing high-performance caching, real-time features, and data management capabilities. While Redis isn't used to store actual video files (those belong in object storage or CDNs), it powers the metadata, user experience, and real-time features that make streaming platforms fast and engaging.

## When to Use Redis in Video Streaming

### Perfect For:
- **Video metadata caching** - Fast access to video information
- **User session management** - Tracking watching progress and preferences
- **Real-time view counting** - Atomic increment operations
- **Personalized recommendations** - Caching user-specific content feeds
- **Rate limiting** - Preventing API abuse
- **Live streaming features** - Viewer tracking and real-time updates
- **Content moderation queues** - Prioritizing video review workflows

### Not Suitable For:
- **Storing video files** - Use S3, GCS, or dedicated video storage
- **Full video transcoding** - Better handled by specialized services
- **Long-term video archives** - Use persistent storage solutions

## Beginner Level: Basic Video Metadata Caching

### What You'll Learn
- Basic Redis string operations for caching
- Setting expiration times on cached data
- Simple get/set operations with JSON data

### Code Example: Video Metadata Cache

```javascript
import { createClient } from 'redis';

const client = createClient({
    username: 'default',
    password: 'your_redis_password',
    socket: {
        host: 'redis-12345.c1.us-east1-2.gce.cloud.redislabs.com',
        port: 12345
    }
});

await client.connect();

// Cache video metadata for 1 hour
async function cacheVideoMetadata(videoId, metadata) {
    const key = `video:metadata:${videoId}`;
    await client.setEx(key, 3600, JSON.stringify(metadata));
    console.log(`Cached metadata for video ${videoId}`);
}

// Retrieve cached metadata
async function getVideoMetadata(videoId) {
    const key = `video:metadata:${videoId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
}

// Usage
await cacheVideoMetadata('video123', {
    title: 'Learn Redis',
    duration: 1800, // 30 minutes in seconds
    thumbnail: 'https://example.com/thumb.jpg',
    tags: ['tutorial', 'database', 'redis']
});

const metadata = await getVideoMetadata('video123');
console.log('Retrieved metadata:', metadata);
```

### Key Concepts
- **Expiration**: `setEx()` automatically removes old data
- **JSON Storage**: Convert objects to strings for Redis storage
- **Key Naming**: Use descriptive prefixes for organization

## Intermediate Level: User Sessions and Progress Tracking

### What You'll Learn
- Managing user watching sessions
- Updating progress in real-time
- Handling session expiration

### Code Example: Session Management

```javascript
// Track user watching sessions
async function startWatchingSession(userId, videoId, sessionData) {
    const sessionKey = `session:${userId}:${videoId}`;
    const session = {
        ...sessionData,
        startTime: Date.now(),
        lastActivity: Date.now(),
        progress: 0
    };
    await client.setEx(sessionKey, 7200, JSON.stringify(session)); // 2 hours
    return session;
}

// Update watching progress
async function updateWatchingProgress(userId, videoId, progress) {
    const sessionKey = `session:${userId}:${videoId}`;
    const sessionData = await client.get(sessionKey);

    if (sessionData) {
        const session = JSON.parse(sessionData);
        session.progress = progress;
        session.lastActivity = Date.now();
        await client.setEx(sessionKey, 7200, JSON.stringify(session));
        console.log(`Updated progress for ${userId}: ${progress}%`);
    }
}

// Usage
await startWatchingSession('user456', 'video123', {
    quality: '1080p',
    device: 'web',
    autoplay: true
});

await updateWatchingProgress('user456', 'video123', 45.5);
```

### Real-time View Counting

```javascript
// Atomic view counting
async function incrementViewCount(videoId) {
    const key = `video:views:${videoId}`;
    const views = await client.incr(key);
    console.log(`Video ${videoId} now has ${views} views`);
    return views;
}

async function getViewCount(videoId) {
    const key = `video:views:${videoId}`;
    return parseInt(await client.get(key) || '0');
}

// Usage
const views = await incrementViewCount('video123');
console.log(`Current views: ${views}`);
```

## Advanced Level: Live Streaming and Real-time Features

### What You'll Learn
- Managing live stream viewers with sets
- Implementing rate limiting
- Using sorted sets for content queues
- Caching personalized feeds

### Live Streaming Viewer Management

```javascript
// Track live stream viewers
async function addLiveViewer(streamId, userId, userInfo) {
    const viewersKey = `live:viewers:${streamId}`;
    await client.sAdd(viewersKey, userId);

    const userKey = `live:user:${streamId}:${userId}`;
    await client.setEx(userKey, 3600, JSON.stringify(userInfo));

    const count = await client.sCard(viewersKey);
    console.log(`Viewer ${userId} joined stream ${streamId}. Total: ${count}`);
    return count;
}

async function removeLiveViewer(streamId, userId) {
    const viewersKey = `live:viewers:${streamId}`;
    await client.sRem(viewersKey, userId);

    const userKey = `live:user:${streamId}:${userId}`;
    await client.del(userKey);

    const count = await client.sCard(viewersKey);
    console.log(`Viewer ${userId} left stream ${streamId}. Total: ${count}`);
    return count;
}

async function getLiveViewerCount(streamId) {
    const viewersKey = `live:viewers:${streamId}`;
    return await client.sCard(viewersKey);
}
```

### Rate Limiting for API Protection

```javascript
// Rate limiting implementation
async function checkRateLimit(userId, endpoint, limit = 100, window = 60) {
    const key = `ratelimit:${endpoint}:${userId}`;
    const current = await client.incr(key);

    if (current === 1) {
        await client.expire(key, window);
    }

    return current <= limit;
}

// Usage
const allowed = await checkRateLimit('user456', 'api/watch', 10, 60);
if (!allowed) {
    console.log('Rate limit exceeded');
    // Return 429 Too Many Requests
}
```

### Content Moderation Queue

```javascript
// Priority queue for content moderation
async function queueVideoForModeration(videoId, priority = 1) {
    const queueKey = 'moderation:queue';
    await client.zAdd(queueKey, { score: priority, value: videoId });
}

async function getNextVideoForModeration() {
    const queueKey = 'moderation:queue';
    const videos = await client.zPopMax(queueKey);
    return videos.length > 0 ? videos[0].value : null;
}

// Usage
await queueVideoForModeration('video123', 2); // High priority
await queueVideoForModeration('video124', 1); // Normal priority

const nextVideo = await getNextVideoForModeration();
console.log(`Next video to moderate: ${nextVideo}`);
```

### Personalized Feed Caching

```javascript
// Cache personalized video feeds
async function cachePersonalizedFeed(userId, feedData) {
    const key = `user:feed:${userId}`;
    await client.setEx(key, 900, JSON.stringify(feedData)); // 15 minutes
}

async function getPersonalizedFeed(userId) {
    const key = `user:feed:${userId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
}

// Usage
await cachePersonalizedFeed('user456', {
    videos: ['video124', 'video125', 'video126'],
    categories: ['trending', 'recommended'],
    generatedAt: Date.now()
});
```

## Architecture Patterns for Video Streaming

### 1. Multi-Layer Caching Strategy
```
User Request → CDN → Redis Cache → Application → Database
```

### 2. Video Segment Caching
```javascript
// Cache frequently accessed video segments
async function cacheVideoSegment(videoId, segmentId, segmentData, quality) {
    const key = `video:segment:${videoId}:${quality}:${segmentId}`;
    await client.setEx(key, 3600, JSON.stringify({
        url: segmentData.url,
        size: segmentData.size,
        duration: segmentData.duration,
        lastAccessed: Date.now()
    }));
}
```

### 3. Watch History with Sorted Sets
```javascript
// Maintain user watch history
async function addToWatchHistory(userId, videoId, timestamp = Date.now()) {
    const key = `user:history:${userId}`;
    await client.zAdd(key, { score: timestamp, value: videoId });
    // Keep only last 100 videos
    await client.zRemRangeByRank(key, 0, -101);
}

async function getWatchHistory(userId, limit = 20) {
    const key = `user:history:${userId}`;
    const history = await client.zRange(key, -limit, -1, { REV: true });
    return history;
}
```

## Performance Considerations

### Memory Management
- Set appropriate TTL values to prevent memory bloat
- Use Redis persistence for critical data
- Monitor memory usage with `INFO memory`

### Scaling Strategies
- **Read Replicas**: For high-read scenarios
- **Cluster Mode**: For horizontal scaling
- **Sharding**: Distribute data across multiple Redis instances

### Monitoring and Alerts
```javascript
// Monitor Redis performance
async function getRedisStats() {
    const info = await client.info();
    const stats = {
        connected_clients: info.match(/connected_clients:(\d+)/)?.[1],
        used_memory: info.match(/used_memory:(\d+)/)?.[1],
        total_commands_processed: info.match(/total_commands_processed:(\d+)/)?.[1]
    };
    return stats;
}
```

## Best Practices

### 1. Key Naming Conventions
```
video:metadata:{videoId}
video:views:{videoId}
video:segment:{videoId}:{quality}:{segmentId}
session:{userId}:{videoId}
user:feed:{userId}
live:viewers:{streamId}
ratelimit:{endpoint}:{userId}
```

### 2. Expiration Strategies
- **Video metadata**: 1-24 hours
- **User sessions**: 2-8 hours
- **Personalized feeds**: 15-30 minutes
- **Rate limit counters**: 1-60 seconds

### 3. Error Handling
```javascript
try {
    await client.setEx(key, ttl, data);
} catch (error) {
    console.error('Redis operation failed:', error);
    // Fallback to database or return cached stale data
}
```

### 4. Connection Management
```javascript
const client = createClient(config);

client.on('error', (err) => {
    console.error('Redis connection error:', err);
    // Implement reconnection logic
});

client.on('ready', () => {
    console.log('Redis connected successfully');
});
```

## Common Pitfalls to Avoid

1. **Storing Large Objects**: Don't store video files in Redis
2. **No Expiration**: Always set TTL to prevent memory leaks
3. **Blocking Operations**: Use async operations to avoid blocking
4. **Key Conflicts**: Use consistent naming conventions
5. **Connection Pooling**: Reuse connections instead of creating new ones

## Integration with Video Processing Pipeline

```
Upload Video → Transcode → Store in S3 → Update Redis Metadata → CDN Distribution
```

Redis fits perfectly in this pipeline for:
- **Metadata storage** during processing
- **Cache invalidation** after updates
- **Progress tracking** for long-running transcodes
- **Queue management** for processing jobs

## Summary

Redis transforms video streaming platforms by providing:
- **Sub-millisecond response times** for metadata
- **Real-time features** like live viewer counts
- **Scalable session management** for millions of users
- **Intelligent caching** to reduce database load
- **Rate limiting** to prevent abuse

While the actual video content lives in specialized storage systems, Redis powers the intelligence, speed, and real-time capabilities that users expect from modern streaming platforms.

The combination of Redis with CDNs, object storage, and video processing services creates a robust, scalable architecture that can handle millions of concurrent viewers while maintaining excellent user experience.