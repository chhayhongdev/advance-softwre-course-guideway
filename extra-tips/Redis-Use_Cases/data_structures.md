# Redis Pub/Sub: From Beginner to Advanced

## What is Pub/Sub?

**Beginner Level:** Pub/Sub is like a radio station. Publishers send messages (broadcast), and subscribers listen to specific channels. Redis acts as the radio tower, delivering messages instantly to anyone listening.

**Intermediate Level:** Publish/Subscribe is a messaging pattern where senders (publishers) broadcast messages to channels without knowing receivers (subscribers). Redis provides fast, scalable pub/sub with pattern matching and message persistence options.

## Why Redis for Pub/Sub?

- **Speed:** Instant message delivery
- **Scalability:** Handle thousands of subscribers
- **Pattern Matching:** Subscribe to multiple channels with patterns
- **Lightweight:** Minimal memory overhead
- **Persistence:** Optional message durability

## Basic Pub/Sub Operations

### Beginner Example: Simple Chat System

```javascript
import { createClient } from 'redis';

const publisher = createClient();
const subscriber = createClient();

await publisher.connect();
await subscriber.connect();

// Subscriber listens to a channel
await subscriber.subscribe('chat:general', (message, channel) => {
    console.log(`Received on ${channel}: ${message}`);
});

// Publisher sends messages
await publisher.publish('chat:general', 'Hello everyone!');
await publisher.publish('chat:general', 'How is everyone doing?');

// Create a private chat
await subscriber.subscribe('chat:user123', (message) => {
    console.log(`Private message: ${message}`);
});

await publisher.publish('chat:user123', 'Hey, this is a private message!');
```

### Intermediate Example: Multi-Channel Subscriber

```javascript
class ChatSystem {
    constructor(redisClient) {
        this.publisher = redisClient;
        this.subscriber = redisClient.duplicate();
        this.channels = new Set();
    }

    async connect() {
        await this.subscriber.connect();
    }

    async subscribeToChannel(channel) {
        await this.subscriber.subscribe(channel, (message, channelName) => {
            this.handleMessage(channelName, message);
        });
        this.channels.add(channel);
    }

    async unsubscribeFromChannel(channel) {
        await this.subscriber.unsubscribe(channel);
        this.channels.delete(channel);
    }

    async publishMessage(channel, message, sender = 'system') {
        const messageData = {
            sender,
            content: message,
            timestamp: new Date().toISOString(),
            channel
        };

        await this.publisher.publish(channel, JSON.stringify(messageData));
    }

    handleMessage(channel, message) {
        try {
            const messageData = JSON.parse(message);
            console.log(`[${channel}] ${messageData.sender}: ${messageData.content}`);
        } catch (error) {
            console.log(`[${channel}] ${message}`);
        }
    }

    async getSubscribedChannels() {
        return Array.from(this.channels);
    }
}
```

## Advanced Pub/Sub Patterns

### Pattern Subscription

```javascript
class PatternSubscriber {
    constructor(redisClient) {
        this.subscriber = redisClient.duplicate();
        this.patterns = new Map();
    }

    async connect() {
        await this.subscriber.connect();

        // Handle pattern messages
        this.subscriber.on('pmessage', (pattern, channel, message) => {
            this.handlePatternMessage(pattern, channel, message);
        });
    }

    async subscribeToPattern(pattern, handler) {
        await this.subscriber.pSubscribe(pattern, (message, channel) => {
            // This won't be called for pSubscribe
        });
        this.patterns.set(pattern, handler);
    }

    async unsubscribeFromPattern(pattern) {
        await this.subscriber.pUnsubscribe(pattern);
        this.patterns.delete(pattern);
    }

    handlePatternMessage(pattern, channel, message) {
        const handler = this.patterns.get(pattern);
        if (handler) {
            handler(channel, message);
        } else {
            console.log(`Pattern ${pattern} matched ${channel}: ${message}`);
        }
    }
}

// Usage
const patternSub = new PatternSubscriber(client);
await patternSub.connect();

// Subscribe to all user channels
await patternSub.subscribeToPattern('user:*', (channel, message) => {
    console.log(`User channel ${channel}: ${message}`);
});

// Subscribe to all chat rooms
await patternSub.subscribeToPattern('chat:room:*', (channel, message) => {
    console.log(`Chat room ${channel}: ${message}`);
});
```

### Message Routing and Filtering

```javascript
class MessageRouter {
    constructor(redisClient) {
        this.publisher = redisClient;
        this.subscribers = new Map(); // channel -> handlers
        this.filters = new Map(); // channel -> filter functions
    }

    async publishWithRouting(channel, message, metadata = {}) {
        const messageData = {
            id: this.generateId(),
            content: message,
            metadata,
            timestamp: new Date().toISOString(),
            channel
        };

        // Apply filters before publishing
        const filter = this.filters.get(channel);
        if (filter && !filter(messageData)) {
            console.log('Message filtered out');
            return false;
        }

        await this.publisher.publish(channel, JSON.stringify(messageData));
        return true;
    }

    addFilter(channel, filterFunction) {
        this.filters.set(channel, filterFunction);
    }

    removeFilter(channel) {
        this.filters.delete(channel);
    }

    async subscribeWithHandler(channel, handler) {
        if (!this.subscribers.has(channel)) {
            this.subscribers.set(channel, []);
        }
        this.subscribers.get(channel).push(handler);
    }

    async processMessages() {
        const subscriber = this.publisher.duplicate();
        await subscriber.connect();

        for (const channel of this.subscribers.keys()) {
            await subscriber.subscribe(channel, (message) => {
                const handlers = this.subscribers.get(channel);
                const messageData = JSON.parse(message);

                handlers.forEach(handler => {
                    try {
                        handler(messageData);
                    } catch (error) {
                        console.error('Handler error:', error);
                    }
                });
            });
        }
    }
}
```

## Event-Driven Architecture

### Event Bus Implementation

```javascript
class EventBus {
    constructor(redisClient) {
        this.publisher = redisClient;
        this.subscriber = redisClient.duplicate();
        this.eventHandlers = new Map();
        this.middlewares = [];
    }

    async connect() {
        await this.subscriber.connect();
    }

    // Register event handler
    on(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType).push(handler);
    }

    // Remove event handler
    off(eventType, handler) {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    // Add middleware
    use(middleware) {
        this.middlewares.push(middleware);
    }

    // Publish event
    async emit(eventType, data, metadata = {}) {
        const event = {
            id: this.generateId(),
            type: eventType,
            data,
            metadata,
            timestamp: new Date().toISOString(),
            source: process.env.SERVICE_NAME || 'unknown'
        };

        // Apply middlewares
        let processedEvent = event;
        for (const middleware of this.middlewares) {
            processedEvent = await middleware(processedEvent);
            if (!processedEvent) return; // Middleware can cancel event
        }

        const channel = `events:${eventType}`;
        await this.publisher.publish(channel, JSON.stringify(processedEvent));

        // Also publish to wildcard channel
        await this.publisher.publish('events:*', JSON.stringify(processedEvent));
    }

    // Start listening for events
    async start() {
        // Subscribe to specific event types
        for (const eventType of this.eventHandlers.keys()) {
            const channel = `events:${eventType}`;
            await this.subscriber.subscribe(channel, (message) => {
                this.handleEvent(message);
            });
        }

        // Subscribe to all events
        await this.subscriber.pSubscribe('events:*', (pattern, channel, message) => {
            this.handleEvent(message, true);
        });
    }

    async handleEvent(message, isWildcard = false) {
        try {
            const event = JSON.parse(message);

            if (isWildcard && event.type === '*') return; // Avoid infinite loops

            const handlers = this.eventHandlers.get(event.type);
            if (handlers) {
                for (const handler of handlers) {
                    try {
                        await handler(event);
                    } catch (error) {
                        console.error(`Event handler error for ${event.type}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error('Event parsing error:', error);
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Usage
const eventBus = new EventBus(client);
await eventBus.connect();

// Add logging middleware
eventBus.use(async (event) => {
    console.log(`Event: ${event.type}`, event.data);
    return event;
});

// Register handlers
eventBus.on('user:login', async (event) => {
    console.log(`User ${event.data.userId} logged in`);
});

eventBus.on('order:created', async (event) => {
    console.log(`Order ${event.data.orderId} created`);
});

// Start the event bus
await eventBus.start();

// Emit events
await eventBus.emit('user:login', { userId: 123, ip: '192.168.1.1' });
await eventBus.emit('order:created', { orderId: 'ORD-001', amount: 99.99 });
```

## Message Persistence and Reliability

### Persistent Pub/Sub with Acknowledgments

```javascript
class PersistentPubSub {
    constructor(redisClient) {
        this.client = redisClient;
        this.pendingMessages = new Map(); // messageId -> timeout
        this.ackTimeout = 30000; // 30 seconds
    }

    async publishPersistent(channel, message, options = {}) {
        const messageId = this.generateId();
        const messageData = {
            id: messageId,
            content: message,
            channel,
            persistent: true,
            maxRetries: options.maxRetries || 3,
            retryCount: 0,
            createdAt: new Date().toISOString(),
            ttl: options.ttl || 86400 // 24 hours
        };

        // Store message for potential redelivery
        await this.client.setEx(
            `msg:${messageId}`,
            messageData.ttl,
            JSON.stringify(messageData)
        );

        // Add to channel queue
        await this.client.lPush(`queue:${channel}`, messageId);

        // Publish immediately
        await this.client.publish(channel, JSON.stringify(messageData));

        // Set up redelivery timeout
        this.scheduleRedelivery(messageId, channel);

        return messageId;
    }

    async acknowledge(messageId) {
        // Remove from pending messages
        if (this.pendingMessages.has(messageId)) {
            clearTimeout(this.pendingMessages.get(messageId));
            this.pendingMessages.delete(messageId);
        }

        // Remove persisted message
        await this.client.del(`msg:${messageId}`);
    }

    scheduleRedelivery(messageId, channel) {
        const timeout = setTimeout(async () => {
            const messageData = await this.client.get(`msg:${messageId}`);
            if (!messageData) return;

            const message = JSON.parse(messageData);
            message.retryCount++;

            if (message.retryCount < message.maxRetries) {
                // Republish
                await this.client.publish(channel, JSON.stringify(message));

                // Schedule next redelivery with exponential backoff
                this.scheduleRedelivery(messageId, channel);
            } else {
                // Move to dead letter queue
                await this.client.lPush(`dlq:${channel}`, messageId);
                await this.client.del(`msg:${messageId}`);
                console.log(`Message ${messageId} moved to DLQ`);
            }
        }, this.ackTimeout * Math.pow(2, message.retryCount || 0));

        this.pendingMessages.set(messageId, timeout);
    }

    async subscribePersistent(channel, handler) {
        const subscriber = this.client.duplicate();
        await subscriber.connect();

        await subscriber.subscribe(channel, async (message) => {
            const messageData = JSON.parse(message);

            if (messageData.persistent) {
                try {
                    await handler(messageData);
                    await this.acknowledge(messageData.id);
                } catch (error) {
                    console.error(`Handler error for message ${messageData.id}:`, error);
                    // Don't acknowledge - will be retried
                }
            } else {
                // Handle non-persistent messages
                await handler(messageData);
            }
        });
    }
}
```

## Real-Time Notifications

### Notification System

```javascript
class NotificationSystem {
    constructor(redisClient) {
        this.publisher = redisClient;
        this.subscribers = new Map();
    }

    async subscribeToNotifications(userId, callback) {
        const channel = `notifications:${userId}`;
        const subscriber = this.publisher.duplicate();

        await subscriber.connect();
        await subscriber.subscribe(channel, (message) => {
            const notification = JSON.parse(message);
            callback(notification);
        });

        this.subscribers.set(userId, subscriber);
    }

    async sendNotification(userId, notification) {
        const channel = `notifications:${userId}`;
        const notificationData = {
            id: this.generateId(),
            userId,
            ...notification,
            timestamp: new Date().toISOString(),
            read: false
        };

        // Publish to real-time channel
        await this.publisher.publish(channel, JSON.stringify(notificationData));

        // Store in user's notification history
        await this.storeNotification(userId, notificationData);

        return notificationData.id;
    }

    async storeNotification(userId, notification) {
        const key = `user_notifications:${userId}`;

        // Keep last 100 notifications
        await this.publisher.lPush(key, JSON.stringify(notification));
        await this.publisher.lTrim(key, 0, 99);
        await this.publisher.expire(key, 86400 * 30); // 30 days
    }

    async getNotificationHistory(userId, limit = 20) {
        const key = `user_notifications:${userId}`;
        const notifications = await this.publisher.lRange(key, 0, limit - 1);

        return notifications.map(n => JSON.parse(n)).reverse(); // Most recent first
    }

    async markAsRead(userId, notificationId) {
        const key = `user_notifications:${userId}`;
        const notifications = await this.publisher.lRange(key, 0, -1);

        for (let i = 0; i < notifications.length; i++) {
            const notification = JSON.parse(notifications[i]);
            if (notification.id === notificationId) {
                notification.read = true;
                notification.readAt = new Date().toISOString();

                // Update the notification in the list
                await this.publisher.lSet(key, i, JSON.stringify(notification));
                break;
            }
        }
    }

    async broadcastNotification(userIds, notification) {
        const promises = userIds.map(userId =>
            this.sendNotification(userId, notification)
        );
        return await Promise.all(promises);
    }
}
```

## Advanced Pub/Sub Features

### Message Prioritization

```javascript
class PriorityPubSub {
    constructor(redisClient) {
        this.client = redisClient;
        this.priorityLevels = ['low', 'normal', 'high', 'critical'];
    }

    async publishWithPriority(channel, message, priority = 'normal') {
        const priorityIndex = this.priorityLevels.indexOf(priority);
        const priorityChannel = `${channel}:priority:${priorityIndex}`;

        const messageData = {
            id: this.generateId(),
            content: message,
            priority,
            priorityIndex,
            timestamp: new Date().toISOString()
        };

        // Publish to priority-specific channel
        await this.client.publish(priorityChannel, JSON.stringify(messageData));

        // Also publish to main channel for subscribers who don't care about priority
        await this.client.publish(channel, JSON.stringify(messageData));
    }

    async subscribeWithPriority(channel, handler, minPriority = 'low') {
        const subscriber = this.client.duplicate();
        await subscriber.connect();

        const minPriorityIndex = this.priorityLevels.indexOf(minPriority);

        // Subscribe to all priority levels at or above minimum
        for (let i = minPriorityIndex; i < this.priorityLevels.length; i++) {
            const priorityChannel = `${channel}:priority:${i}`;
            await subscriber.subscribe(priorityChannel, (message) => {
                const messageData = JSON.parse(message);
                handler(messageData);
            });
        }

        // Also subscribe to main channel
        await subscriber.subscribe(channel, (message) => {
            const messageData = JSON.parse(message);
            handler(messageData);
        });
    }
}
```

### Load Balancing with Pub/Sub

```javascript
class LoadBalancedPubSub {
    constructor(redisClient, instanceId) {
        this.client = redisClient;
        this.instanceId = instanceId;
        this.workers = new Set();
    }

    async registerWorker() {
        await this.client.sAdd('pubsub_workers', this.instanceId);
        await this.client.expire('pubsub_workers', 60); // Refresh every minute

        // Heartbeat to keep worker alive
        setInterval(async () => {
            await this.client.expire('pubsub_workers', 60);
        }, 30000);
    }

    async publishToWorkers(channel, message) {
        const workers = await this.client.sMembers('pubsub_workers');

        if (workers.length === 0) {
            throw new Error('No workers available');
        }

        // Simple round-robin: use hash of message to select worker
        const workerIndex = this.hashString(message) % workers.length;
        const targetWorker = workers[workerIndex];

        const workerChannel = `worker:${targetWorker}:${channel}`;
        await this.client.publish(workerChannel, message);

        return targetWorker;
    }

    async subscribeAsWorker(channel, handler) {
        const workerChannel = `worker:${this.instanceId}:${channel}`;
        const subscriber = this.client.duplicate();

        await subscriber.connect();
        await subscriber.subscribe(workerChannel, handler);
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
        }
        return Math.abs(hash);
    }

    async getWorkerStats() {
        const workers = await this.client.sMembers('pubsub_workers');
        const stats = {};

        for (const worker of workers) {
            // Get worker-specific metrics (you'd need to implement these)
            stats[worker] = {
                active: true,
                lastSeen: await this.client.get(`worker_heartbeat:${worker}`)
            };
        }

        return stats;
    }
}
```

## Monitoring and Analytics

### Pub/Sub Metrics

```javascript
class PubSubMonitor {
    constructor(redisClient) {
        this.client = redisClient;
        this.metrics = new Map();
    }

    async recordMessage(channel, messageType = 'publish') {
        const key = `pubsub_metrics:${channel}`;
        const timestamp = Date.now();

        await this.client.hIncrBy(key, `${messageType}_count`, 1);
        await this.client.hSet(key, 'last_activity', timestamp);
        await this.client.expire(key, 86400); // 24 hours

        // Track message rate (sliding window)
        const rateKey = `pubsub_rate:${channel}`;
        await this.client.zAdd(rateKey, [{ score: timestamp, value: timestamp.toString() }]);
        await this.client.zRemRangeByScore(rateKey, 0, timestamp - 60000); // Keep last minute
        await this.client.expire(rateKey, 3600);
    }

    async getChannelStats(channel) {
        const key = `pubsub_metrics:${channel}`;
        const stats = await this.client.hGetAll(key);

        const rateKey = `pubsub_rate:${channel}`;
        const recentMessages = await this.client.zCard(rateKey);

        return {
            channel,
            publishCount: parseInt(stats.publish_count) || 0,
            subscribeCount: parseInt(stats.subscribe_count) || 0,
            lastActivity: parseInt(stats.last_activity) || 0,
            messagesPerMinute: recentMessages
        };
    }

    async getTopChannels(limit = 10) {
        const keys = await this.client.keys('pubsub_metrics:*');
        const channelStats = [];

        for (const key of keys) {
            const channel = key.replace('pubsub_metrics:', '');
            const stats = await this.getChannelStats(channel);
            channelStats.push(stats);
        }

        return channelStats
            .sort((a, b) => b.publishCount - a.publishCount)
            .slice(0, limit);
    }

    async detectAnomalies() {
        const channels = await this.client.keys('pubsub_metrics:*');
        const anomalies = [];

        for (const key of channels) {
            const channel = key.replace('pubsub_metrics:', '');
            const stats = await this.getChannelStats(channel);

            // Check for unusual message rates
            if (stats.messagesPerMinute > 1000) { // More than 1000 messages/minute
                anomalies.push({
                    channel,
                    type: 'high_traffic',
                    value: stats.messagesPerMinute,
                    threshold: 1000
                });
            }

            // Check for inactive channels
            const hoursSinceActivity = (Date.now() - stats.lastActivity) / (1000 * 60 * 60);
            if (hoursSinceActivity > 24) {
                anomalies.push({
                    channel,
                    type: 'inactive',
                    hoursSinceActivity: Math.round(hoursSinceActivity)
                });
            }
        }

        return anomalies;
    }
}
```

## Best Practices

### 1. Connection Management

```javascript
class ConnectionManager {
    constructor() {
        this.publisher = null;
        this.subscribers = new Map();
        this.reconnectDelay = 1000;
    }

    async createPublisher(config) {
        this.publisher = createClient(config);
        this.publisher.on('error', (err) => {
            console.error('Publisher error:', err);
            this.handleReconnection('publisher');
        });
        await this.publisher.connect();
    }

    async createSubscriber(channel, config) {
        const subscriber = createClient(config);
        subscriber.on('error', (err) => {
            console.error(`Subscriber error for ${channel}:`, err);
            this.handleReconnection(channel);
        });

        await subscriber.connect();
        this.subscribers.set(channel, subscriber);
        return subscriber;
    }

    async handleReconnection(target) {
        console.log(`Attempting to reconnect ${target}...`);

        setTimeout(async () => {
            try {
                if (target === 'publisher') {
                    await this.publisher.connect();
                } else {
                    const subscriber = this.subscribers.get(target);
                    if (subscriber) {
                        await subscriber.connect();
                    }
                }
                console.log(`${target} reconnected successfully`);
            } catch (error) {
                console.error(`Failed to reconnect ${target}:`, error);
                this.handleReconnection(target); // Retry
            }
        }, this.reconnectDelay);
    }
}
```

### 2. Message Size and Performance

```javascript
class OptimizedPubSub {
    // Keep messages small for better performance
    MAX_MESSAGE_SIZE = 1024; // 1KB limit

    async publishOptimized(channel, message) {
        const serialized = JSON.stringify(message);

        if (serialized.length > this.MAX_MESSAGE_SIZE) {
            // Compress large messages
            const compressed = await this.compressMessage(serialized);
            await this.client.publish(channel, compressed);
            return;
        }

        await this.client.publish(channel, serialized);
    }

    async compressMessage(message) {
        // Implement compression (gzip, etc.)
        return message; // Placeholder
    }

    // Batch messages for high-throughput scenarios
    async publishBatch(channel, messages, batchSize = 10) {
        for (let i = 0; i < messages.length; i += batchSize) {
            const batch = messages.slice(i, i + batchSize);
            const batchMessage = {
                type: 'batch',
                messages: batch,
                timestamp: new Date().toISOString()
            };

            await this.publishOptimized(channel, batchMessage);
        }
    }
}
```

## Conclusion

Redis Pub/Sub enables real-time communication between distributed system components. Start with basic publish/subscribe operations, then add pattern matching, persistence, and monitoring as your application scales.

**Beginner Tip:** Use PUBLISH to send messages and SUBSCRIBE to receive them on specific channels.

**Advanced Tip:** Implement message persistence, acknowledgments, and load balancing for production reliability.</content>
<parameter name="filePath">/Users/chhayhong/Desktop/Redis_University/pub_sub.md