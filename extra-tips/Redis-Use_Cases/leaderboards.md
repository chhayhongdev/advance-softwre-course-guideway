# Redis Message Queuing: From Beginner to Advanced

## What is Message Queuing?

**Beginner Level:** Message queuing is like a post office for computer programs. Instead of programs talking directly to each other, they send messages through a queue. Redis acts as the post office, storing messages until they're ready to be delivered.

**Intermediate Level:** Message queuing provides asynchronous communication between services. Producers send messages to queues, consumers process them at their own pace. Redis lists provide simple but powerful queuing capabilities.

## Why Redis for Message Queuing?

- **Simplicity:** Basic list operations for queues
- **Performance:** Fast enqueue/dequeue operations
- **Reliability:** Messages persist until processed
- **Scalability:** Multiple consumers can process messages
- **Features:** Blocking operations, pub/sub for notifications

## Basic Message Queuing

### Beginner Example: Simple Task Queue

```javascript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

// Producer: Add tasks to queue
async function addTask(taskData) {
    await client.lPush('task_queue', JSON.stringify(taskData));
    console.log('Task added to queue');
}

// Consumer: Process tasks from queue
async function processTasks() {
    while (true) {
        // Use blocking pop to wait for tasks
        const result = await client.blPop('task_queue', 0);
        const taskData = JSON.parse(result.element);

        console.log('Processing task:', taskData);

        // Simulate task processing
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('Task completed');
    }
}

// Example usage
await addTask({ type: 'email', to: 'user@example.com', subject: 'Welcome' });
await addTask({ type: 'notification', userId: 123, message: 'Order shipped' });

// Start processing (in real app, this would run in background)
processTasks();
```

### Intermediate Example: Priority Queues

```javascript
class PriorityQueue {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async addTask(task, priority = 'normal') {
        const queueName = `queue:${priority}`;
        await this.client.lPush(queueName, JSON.stringify(task));
    }

    async getNextTask() {
        // Check high priority first, then normal, then low
        const queues = ['queue:high', 'queue:normal', 'queue:low'];

        for (const queue of queues) {
            const result = await this.client.blPop(queue, 1); // 1 second timeout
            if (result) {
                return JSON.parse(result.element);
            }
        }

        return null; // No tasks available
    }

    async processTasks() {
        while (true) {
            const task = await this.getNextTask();
            if (task) {
                await this.processTask(task);
            } else {
                console.log('No tasks available, waiting...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
}
```

## Advanced Message Queuing Patterns

### Dead Letter Queue (DLQ)

```javascript
class MessageQueue {
    constructor(redisClient, queueName) {
        this.client = redisClient;
        this.queueName = queueName;
        this.processingQueue = `${queueName}:processing`;
        this.deadLetterQueue = `${queueName}:dlq`;
        this.maxRetries = 3;
    }

    async enqueue(message, options = {}) {
        const messageData = {
            id: this.generateId(),
            data: message,
            retries: 0,
            createdAt: new Date().toISOString(),
            priority: options.priority || 'normal',
            ttl: options.ttl || 86400 // 24 hours
        };

        await this.client.lPush(this.queueName, JSON.stringify(messageData));
        await this.client.expire(this.queueName, messageData.ttl);

        return messageData.id;
    }

    async dequeue() {
        const result = await this.client.blPop(this.queueName, 0);
        const messageData = JSON.parse(result.element);

        // Move to processing queue
        await this.client.setEx(
            `${this.processingQueue}:${messageData.id}`,
            300, // 5 minutes processing timeout
            JSON.stringify(messageData)
        );

        return messageData;
    }

    async acknowledge(messageId) {
        // Remove from processing queue
        await this.client.del(`${this.processingQueue}:${messageId}`);
    }

    async retry(messageId) {
        const processingKey = `${this.processingQueue}:${messageId}`;
        const messageData = await this.client.get(processingKey);

        if (!messageData) return false;

        const message = JSON.parse(messageData);
        message.retries = (message.retries || 0) + 1;
        message.lastRetryAt = new Date().toISOString();

        if (message.retries >= this.maxRetries) {
            // Move to dead letter queue
            await this.client.lPush(this.deadLetterQueue, JSON.stringify(message));
            await this.client.del(processingKey);
            console.log(`Message ${messageId} moved to DLQ after ${message.retries} retries`);
            return false;
        } else {
            // Re-queue for retry
            await this.client.lPush(this.queueName, JSON.stringify(message));
            await this.client.del(processingKey);
            console.log(`Message ${messageId} re-queued (attempt ${message.retries})`);
            return true;
        }
    }
}
```

### Delayed Message Queue

```javascript
class DelayedQueue {
    constructor(redisClient, queueName) {
        this.client = redisClient;
        this.queueName = queueName;
        this.delayedQueue = `${queueName}:delayed`;
    }

    async enqueueWithDelay(message, delaySeconds) {
        const executeAt = Date.now() + (delaySeconds * 1000);

        const messageData = {
            id: this.generateId(),
            data: message,
            executeAt,
            createdAt: new Date().toISOString()
        };

        // Add to sorted set with execution time as score
        await this.client.zAdd(this.delayedQueue, [{
            score: executeAt,
            value: JSON.stringify(messageData)
        }]);

        return messageData.id;
    }

    async processDelayedMessages() {
        while (true) {
            const now = Date.now();

            // Get messages ready for execution
            const readyMessages = await this.client.zRangeByScore(
                this.delayedQueue,
                0,
                now,
                { LIMIT: { offset: 0, count: 10 } }
            );

            for (const messageStr of readyMessages) {
                const messageData = JSON.parse(messageStr);

                // Move to main queue
                await this.client.lPush(this.queueName, JSON.stringify(messageData));

                // Remove from delayed queue
                await this.client.zRem(this.delayedQueue, messageStr);
            }

            // Wait before checking again
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async getDelayedMessageCount() {
        return await this.client.zCard(this.delayedQueue);
    }
}
```

## Message Routing and Filtering

### Topic-Based Routing

```javascript
class TopicRouter {
    constructor(redisClient) {
        this.client = redisClient;
        this.topicQueues = new Map();
    }

    async subscribe(topic, queueName) {
        if (!this.topicQueues.has(topic)) {
            this.topicQueues.set(topic, new Set());
        }
        this.topicQueues.get(topic).add(queueName);
    }

    async publish(topic, message) {
        const queues = this.topicQueues.get(topic);
        if (!queues) return;

        const messageData = {
            id: this.generateId(),
            topic,
            data: message,
            publishedAt: new Date().toISOString()
        };

        // Publish to all subscribed queues
        for (const queueName of queues) {
            await this.client.lPush(queueName, JSON.stringify(messageData));
        }
    }

    async publishWithFilter(topic, message, filterFunction) {
        const queues = this.topicQueues.get(topic);
        if (!queues) return;

        // Get current queue lengths to balance load
        const queueLengths = {};
        for (const queueName of queues) {
            queueLengths[queueName] = await this.client.lLen(queueName);
        }

        // Find queue with shortest length
        const targetQueue = Object.keys(queueLengths)
            .reduce((a, b) => queueLengths[a] < queueLengths[b] ? a : b);

        const messageData = {
            id: this.generateId(),
            topic,
            data: message,
            publishedAt: new Date().toISOString(),
            filter: filterFunction.toString()
        };

        await this.client.lPush(targetQueue, JSON.stringify(messageData));
    }
}
```

## Message Processing Patterns

### Batch Processing

```javascript
class BatchProcessor {
    constructor(redisClient, queueName, batchSize = 10) {
        this.client = redisClient;
        this.queueName = queueName;
        this.batchSize = batchSize;
    }

    async processBatch() {
        const batch = [];

        // Collect batch of messages
        for (let i = 0; i < this.batchSize; i++) {
            const result = await this.client.blPop(this.queueName, 1); // 1 second timeout
            if (result) {
                batch.push(JSON.parse(result.element));
            } else {
                break; // No more messages
            }
        }

        if (batch.length > 0) {
            console.log(`Processing batch of ${batch.length} messages`);

            try {
                await this.processBatchData(batch);
                console.log('Batch processed successfully');
            } catch (error) {
                console.error('Batch processing failed:', error);
                // Re-queue failed messages
                for (const message of batch) {
                    await this.client.lPush(this.queueName, JSON.stringify(message));
                }
            }
        }

        return batch.length;
    }

    async processBatchData(batch) {
        // Implement your batch processing logic here
        // For example: bulk database operations, API calls, etc.
        for (const message of batch) {
            await this.processMessage(message);
        }
    }

    async processMessage(message) {
        // Individual message processing
        console.log('Processing message:', message.id);
    }
}
```

### Competing Consumers Pattern

```javascript
class CompetingConsumers {
    constructor(redisClient, queueName, consumerId) {
        this.client = redisClient;
        this.queueName = queueName;
        this.consumerId = consumerId;
        this.processingKey = `${queueName}:processing:${consumerId}`;
    }

    async startConsuming() {
        console.log(`Consumer ${this.consumerId} started`);

        while (true) {
            try {
                // Try to get a message
                const result = await this.client.blPop(this.queueName, 5); // 5 second timeout

                if (result) {
                    const message = JSON.parse(result.element);

                    // Mark as processing
                    await this.client.setEx(this.processingKey, 300, JSON.stringify(message)); // 5 min timeout

                    // Process the message
                    await this.processMessage(message);

                    // Remove from processing
                    await this.client.del(this.processingKey);

                    console.log(`Consumer ${this.consumerId} processed message ${message.id}`);
                }
            } catch (error) {
                console.error(`Consumer ${this.consumerId} error:`, error);
                // Continue processing other messages
            }
        }
    }

    async processMessage(message) {
        // Implement message processing logic
        // This could involve calling APIs, updating databases, etc.
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000)); // Simulate work
    }

    async getConsumerStats() {
        const processing = await this.client.get(this.processingKey);
        const queueLength = await this.client.lLen(this.queueName);

        return {
            consumerId: this.consumerId,
            isProcessing: !!processing,
            currentMessage: processing ? JSON.parse(processing) : null,
            queueLength
        };
    }
}
```

## Message Reliability and Monitoring

### Message Acknowledgment and Tracking

```javascript
class ReliableQueue {
    constructor(redisClient, queueName) {
        this.client = redisClient;
        this.queueName = queueName;
        this.ackQueue = `${queueName}:acknowledged`;
        this.nackQueue = `${queueName}:nack`;
        this.metricsKey = `${queueName}:metrics`;
    }

    async enqueue(message) {
        const messageData = {
            id: this.generateId(),
            data: message,
            status: 'queued',
            createdAt: new Date().toISOString(),
            attempts: 0
        };

        await this.client.lPush(this.queueName, JSON.stringify(messageData));

        // Track metrics
        await this.client.hIncrBy(this.metricsKey, 'enqueued', 1);

        return messageData.id;
    }

    async dequeue() {
        const result = await this.client.blPop(this.queueName, 0);
        const messageData = JSON.parse(result.element);

        messageData.status = 'processing';
        messageData.attempts += 1;
        messageData.processedAt = new Date().toISOString();

        // Store in processing set with TTL
        await this.client.setEx(
            `processing:${messageData.id}`,
            300, // 5 minutes
            JSON.stringify(messageData)
        );

        return messageData;
    }

    async acknowledge(messageId) {
        const processingKey = `processing:${messageId}`;
        const messageData = await this.client.get(processingKey);

        if (messageData) {
            const message = JSON.parse(messageData);
            message.status = 'completed';
            message.completedAt = new Date().toISOString();

            // Move to acknowledged queue
            await this.client.lPush(this.ackQueue, JSON.stringify(message));
            await this.client.del(processingKey);

            // Update metrics
            await this.client.hIncrBy(this.metricsKey, 'acknowledged', 1);
        }
    }

    async negativeAcknowledge(messageId, reason = 'processing_failed') {
        const processingKey = `processing:${messageId}`;
        const messageData = await this.client.get(processingKey);

        if (messageData) {
            const message = JSON.parse(messageData);
            message.status = 'failed';
            message.failedAt = new Date().toISOString();
            message.failureReason = reason;

            // Move to NACK queue for retry or DLQ
            await this.client.lPush(this.nackQueue, JSON.stringify(message));
            await this.client.del(processingKey);

            // Update metrics
            await this.client.hIncrBy(this.metricsKey, 'failed', 1);
        }
    }

    async getMetrics() {
        const metrics = await this.client.hGetAll(this.metricsKey);
        const queueLength = await this.client.lLen(this.queueName);
        const processingCount = await this.client.keys(`processing:*`).then(keys => keys.length);

        return {
            enqueued: parseInt(metrics.enqueued) || 0,
            acknowledged: parseInt(metrics.acknowledged) || 0,
            failed: parseInt(metrics.failed) || 0,
            pending: queueLength,
            processing: processingCount
        };
    }
}
```

## Advanced Queuing Features

### Message Scheduling

```javascript
class ScheduledQueue {
    constructor(redisClient, queueName) {
        this.client = redisClient;
        this.queueName = queueName;
        this.scheduleKey = `${queueName}:schedule`;
    }

    async scheduleMessage(message, scheduleTime) {
        const messageData = {
            id: this.generateId(),
            data: message,
            scheduleTime: new Date(scheduleTime).getTime(),
            createdAt: new Date().toISOString()
        };

        // Add to sorted set with schedule time as score
        await this.client.zAdd(this.scheduleKey, [{
            score: messageData.scheduleTime,
            value: JSON.stringify(messageData)
        }]);

        return messageData.id;
    }

    async processScheduledMessages() {
        while (true) {
            const now = Date.now();

            // Get messages ready to be sent
            const readyMessages = await this.client.zRangeByScore(
                this.scheduleKey,
                0,
                now,
                { LIMIT: { offset: 0, count: 10 } }
            );

            for (const messageStr of readyMessages) {
                const messageData = JSON.parse(messageStr);

                // Move to main queue
                await this.client.lPush(this.queueName, JSON.stringify({
                    ...messageData,
                    scheduledAt: new Date().toISOString()
                }));

                // Remove from schedule
                await this.client.zRem(this.scheduleKey, messageStr);
            }

            // Wait before next check
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async cancelScheduledMessage(messageId) {
        // Find and remove the message from schedule
        const scheduledMessages = await this.client.zRange(this.scheduleKey, 0, -1);

        for (const messageStr of scheduledMessages) {
            const messageData = JSON.parse(messageStr);
            if (messageData.id === messageId) {
                await this.client.zRem(this.scheduleKey, messageStr);
                return true;
            }
        }

        return false;
    }
}
```

## Queue Monitoring and Management

### Queue Health Monitoring

```javascript
class QueueMonitor {
    constructor(redisClient) {
        this.client = redisClient;
        this.queues = new Set();
    }

    registerQueue(queueName) {
        this.queues.add(queueName);
    }

    async getQueueHealth() {
        const health = {};

        for (const queueName of this.queues) {
            const length = await this.client.lLen(queueName);
            const processingCount = await this.client.keys(`processing:${queueName}:*`).then(keys => keys.length);
            const dlqLength = await this.client.lLen(`${queueName}:dlq`);

            health[queueName] = {
                pending: length,
                processing: processingCount,
                deadLetters: dlqLength,
                healthy: length < 1000 && dlqLength < 100 // Arbitrary thresholds
            };
        }

        return health;
    }

    async getQueueStats(queueName) {
        const metrics = await this.client.hGetAll(`${queueName}:metrics`);
        const throughput = await this.calculateThroughput(queueName);

        return {
            enqueued: parseInt(metrics.enqueued) || 0,
            processed: parseInt(metrics.acknowledged) || 0,
            failed: parseInt(metrics.failed) || 0,
            throughput: throughput, // messages per minute
            errorRate: this.calculateErrorRate(metrics)
        };
    }

    async calculateThroughput(queueName) {
        // Simple throughput calculation based on recent acknowledgments
        const recentAcks = await this.client.lRange(`${queueName}:acknowledged`, 0, 59); // Last 60 messages
        return recentAcks.length; // messages per minute approximation
    }

    calculateErrorRate(metrics) {
        const total = (parseInt(metrics.acknowledged) || 0) + (parseInt(metrics.failed) || 0);
        if (total === 0) return 0;
        return (parseInt(metrics.failed) || 0) / total * 100;
    }
}
```

## Best Practices

### 1. Message Size and Serialization

```javascript
class OptimizedQueue {
    // Keep messages small
    MAX_MESSAGE_SIZE = 64 * 1024; // 64KB limit

    async enqueue(message) {
        const serialized = JSON.stringify(message);

        if (serialized.length > this.MAX_MESSAGE_SIZE) {
            throw new Error('Message too large');
        }

        // Use compression for large messages
        if (serialized.length > 1024) {
            const compressed = await this.compress(serialized);
            await this.client.lPush(this.queueName, compressed);
            return;
        }

        await this.client.lPush(this.queueName, serialized);
    }

    async compress(data) {
        // Implement compression (gzip, etc.)
        return data; // Placeholder
    }
}
```

### 2. Connection Pooling and Error Handling

```javascript
class ResilientQueue {
    constructor(redisConfig) {
        this.redisConfig = redisConfig;
        this.client = null;
        this.connect();
    }

    async connect() {
        try {
            this.client = createClient(this.redisConfig);
            await this.client.connect();
            console.log('Connected to Redis');
        } catch (error) {
            console.error('Redis connection failed:', error);
            // Implement retry logic
            setTimeout(() => this.connect(), 5000);
        }
    }

    async enqueue(message) {
        try {
            await this.client.lPush(this.queueName, JSON.stringify(message));
        } catch (error) {
            console.error('Enqueue failed:', error);
            // Implement fallback logic (write to file, etc.)
            throw error;
        }
    }
}
```

## Conclusion

Message queuing with Redis provides a simple yet powerful way to decouple services and handle asynchronous workloads. Start with basic producer-consumer patterns, then add reliability features like acknowledgments, retries, and monitoring as your system grows.

**Beginner Tip:** Use Redis lists with LPUSH (enqueue) and BRPOP (dequeue) for basic queuing.

**Advanced Tip:** Implement dead letter queues, message scheduling, and comprehensive monitoring for production reliability.</content>
<parameter name="filePath">/Users/chhayhong/Desktop/Redis_University/message_queuing.md