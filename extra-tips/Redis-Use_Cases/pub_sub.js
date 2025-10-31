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

// Pub/Sub Messaging example - real-time messaging between applications
class PubSubManager {
    constructor(redisClient) {
        this.client = redisClient;
        this.subscriber = redisClient.duplicate(); // Separate connection for subscribing
        this.publisher = redisClient; // Use main client for publishing
        this.subscriptions = new Map();
    }

    // Subscribe to a channel
    async subscribe(channel, callback) {
        // Connect subscriber if not connected
        if (!this.subscriber.isOpen) {
            await this.subscriber.connect();
        }

        // Subscribe to channel
        await this.subscriber.subscribe(channel, (message) => {
            try {
                const data = JSON.parse(message);
                callback(data);
            } catch (error) {
                console.error(`Error parsing message from ${channel}:`, error);
                callback(message); // Pass raw message if JSON parsing fails
            }
        });

        // Track subscriptions
        if (!this.subscriptions.has(channel)) {
            this.subscriptions.set(channel, []);
        }
        this.subscriptions.get(channel).push(callback);

        console.log(`Subscribed to channel: ${channel}`);
    }

    // Unsubscribe from a channel
    async unsubscribe(channel, callback = null) {
        if (callback) {
            // Remove specific callback
            const callbacks = this.subscriptions.get(channel) || [];
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }

            if (callbacks.length === 0) {
                await this.subscriber.unsubscribe(channel);
                this.subscriptions.delete(channel);
            }
        } else {
            // Remove all callbacks for channel
            await this.subscriber.unsubscribe(channel);
            this.subscriptions.delete(channel);
        }

        console.log(`Unsubscribed from channel: ${channel}`);
    }

    // Publish a message to a channel
    async publish(channel, message) {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        const subscribers = await this.publisher.publish(channel, messageStr);
        console.log(`Published to ${channel}: ${subscribers} subscribers received the message`);
        return subscribers;
    }

    // Get list of active channels
    async getActiveChannels() {
        const channels = await this.publisher.pubsubChannels();
        return channels;
    }

    // Get number of subscribers for a channel
    async getSubscriberCount(channel) {
        const counts = await this.publisher.pubsubNumsub([channel]);
        return counts.length > 0 ? counts[0][1] : 0;
    }

    // Pattern subscription (subscribe to channels matching a pattern)
    async pSubscribe(pattern, callback) {
        if (!this.subscriber.isOpen) {
            await this.subscriber.connect();
        }

        await this.subscriber.pSubscribe(pattern, (message, channel) => {
            try {
                const data = JSON.parse(message);
                callback(data, channel);
            } catch (error) {
                console.error(`Error parsing message from ${channel}:`, error);
                callback(message, channel);
            }
        });

        console.log(`Pattern subscribed to: ${pattern}`);
    }

    // Publish to multiple channels
    async publishToMultiple(channels, message) {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        let totalSubscribers = 0;

        for (const channel of channels) {
            const subscribers = await this.publisher.publish(channel, messageStr);
            totalSubscribers += subscribers;
            console.log(`Published to ${channel}: ${subscribers} subscribers`);
        }

        console.log(`Total subscribers across all channels: ${totalSubscribers}`);
        return totalSubscribers;
    }

    // Create a chat room
    async createChatRoom(roomName) {
        const roomChannel = `chat:${roomName}`;
        const systemChannel = `system:${roomName}`;

        console.log(`Created chat room: ${roomName}`);
        return {
            roomChannel,
            systemChannel,
            roomName
        };
    }

    // Send chat message
    async sendChatMessage(roomName, userId, username, message) {
        const roomChannel = `chat:${roomName}`;
        const chatMessage = {
            type: 'chat',
            room: roomName,
            userId,
            username,
            message,
            timestamp: new Date().toISOString()
        };

        return await this.publish(roomChannel, chatMessage);
    }

    // Send system message
    async sendSystemMessage(roomName, message, messageType = 'info') {
        const systemChannel = `system:${roomName}`;
        const systemMessage = {
            type: 'system',
            room: roomName,
            message,
            messageType,
            timestamp: new Date().toISOString()
        };

        return await this.publish(systemChannel, systemMessage);
    }

    // User joined/left room
    async userJoinedRoom(roomName, userId, username) {
        await this.sendSystemMessage(roomName, `${username} joined the room`, 'user_join');
    }

    async userLeftRoom(roomName, userId, username) {
        await this.sendSystemMessage(roomName, `${username} left the room`, 'user_leave');
    }

    // Close connections
    async close() {
        if (this.subscriber.isOpen) {
            await this.subscriber.quit();
        }
        if (this.publisher.isOpen) {
            await this.publisher.quit();
        }
    }
}

// Demo the pub/sub functionality
async function demoPubSub() {
    const pubsub = new PubSubManager(client);

    console.log('=== Redis Pub/Sub Messaging Demo ===\n');

    // Subscribe to a news channel
    console.log('1. Subscribing to news channel:');
    await pubsub.subscribe('news', (message) => {
        console.log(`📰 NEWS: ${message.title} - ${message.content}`);
    });

    // Subscribe to sports updates
    await pubsub.subscribe('sports', (message) => {
        console.log(`⚽ SPORTS: ${message.team} ${message.event} (${message.score})`);
    });

    // Pattern subscription for all chat rooms
    await pubsub.pSubscribe('chat:*', (message, channel) => {
        const room = channel.replace('chat:', '');
        console.log(`💬 [${room}] ${message.username}: ${message.message}`);
    });

    // Subscribe to system messages
    await pubsub.subscribe('system:lobby', (message) => {
        console.log(`🔧 SYSTEM: ${message.message}`);
    });
    console.log();

    // Publish some news
    console.log('2. Publishing news:');
    await pubsub.publish('news', {
        title: 'Breaking News',
        content: 'Redis University announces new advanced course!',
        priority: 'high'
    });

    await pubsub.publish('news', {
        title: 'Tech Update',
        content: 'Node.js 24 released with new features',
        priority: 'medium'
    });
    console.log();

    // Publish sports updates
    console.log('3. Publishing sports updates:');
    await pubsub.publish('sports', {
        team: 'Redis Racers',
        event: 'goal scored',
        score: '2-1',
        player: 'Alice'
    });

    await pubsub.publish('sports', {
        team: 'Node Ninjas',
        event: 'match ended',
        score: '3-2',
        winner: 'Node Ninjas'
    });
    console.log();

    // Create a chat room
    console.log('4. Creating and using chat room:');
    const lobby = await pubsub.createChatRoom('lobby');

    // Simulate users joining
    await pubsub.userJoinedRoom('lobby', 'user1', 'Alice');
    await pubsub.userJoinedRoom('lobby', 'user2', 'Bob');

    // Send chat messages
    await pubsub.sendChatMessage('lobby', 'user1', 'Alice', 'Hello everyone!');
    await pubsub.sendChatMessage('lobby', 'user2', 'Bob', 'Hi Alice, welcome to Redis chat!');
    await pubsub.sendChatMessage('lobby', 'user1', 'Alice', 'This is amazing!');

    // User leaves
    await pubsub.userLeftRoom('lobby', 'user2', 'Bob');
    console.log();

    // Check channel information
    console.log('5. Channel information:');
    const activeChannels = await pubsub.getActiveChannels();
    console.log('Active channels:', activeChannels);

    const newsSubscribers = await pubsub.getSubscriberCount('news');
    const sportsSubscribers = await pubsub.getSubscriberCount('sports');
    console.log(`News channel subscribers: ${newsSubscribers}`);
    console.log(`Sports channel subscribers: ${sportsSubscribers}`);
    console.log();

    // Publish to multiple channels
    console.log('6. Publishing to multiple channels:');
    await pubsub.publishToMultiple(['news', 'sports'], {
        type: 'announcement',
        content: 'Redis University is having a special event tomorrow!',
        urgent: true
    });
    console.log();

    // Wait a bit for messages to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Unsubscribe from sports
    console.log('7. Unsubscribing from sports channel:');
    await pubsub.unsubscribe('sports');
    await pubsub.publish('sports', { event: 'This should not be received' });
    console.log();

    // Send final system message
    await pubsub.sendSystemMessage('lobby', 'Server maintenance in 5 minutes', 'warning');

    // Wait for final messages
    await new Promise(resolve => setTimeout(resolve, 500));

    await pubsub.close();
    console.log('\nPub/Sub demo completed!');
}

demoPubSub().catch(console.error);