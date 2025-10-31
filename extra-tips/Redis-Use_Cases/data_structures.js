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

// Data Structures example - demonstrating Redis data types
class DataStructuresDemo {
    constructor(redisClient) {
        this.client = redisClient;
    }

    // Strings - basic key-value storage
    async demoStrings() {
        console.log('=== Strings Demo ===');

        // Set and get string values
        await this.client.set('user:name', 'Alice Johnson');
        await this.client.set('user:email', 'alice@example.com');
        await this.client.set('user:age', '28');

        const name = await this.client.get('user:name');
        const email = await this.client.get('user:email');
        const age = await this.client.get('user:age');

        console.log(`Name: ${name}, Email: ${email}, Age: ${age}`);

        // String operations
        await this.client.set('counter', '10');
        const newValue = await this.client.incr('counter'); // Increment by 1
        console.log(`Counter incremented: ${newValue}`);

        const decrValue = await this.client.decrBy('counter', 3); // Decrement by 3
        console.log(`Counter decremented by 3: ${decrValue}`);

        // Append to string
        await this.client.append('user:name', ' Smith');
        const fullName = await this.client.get('user:name');
        console.log(`Full name after append: ${fullName}`);

        // Set with expiration
        await this.client.setEx('temp:key', 10, 'This will expire in 10 seconds');
        console.log('Set temporary key with 10s expiration');
        console.log();
    }

    // Lists - ordered collections
    async demoLists() {
        console.log('=== Lists Demo ===');

        // Create a shopping cart
        await this.client.lPush('cart:user123', 'apple', 'banana', 'orange');
        console.log('Added items to shopping cart');

        // Add more items
        await this.client.rPush('cart:user123', 'grapes', 'pears');
        console.log('Added more items to cart');

        // Get all items
        const cart = await this.client.lRange('cart:user123', 0, -1);
        console.log('Shopping cart contents:', cart);

        // Get list length
        const cartLength = await this.client.lLen('cart:user123');
        console.log(`Cart has ${cartLength} items`);

        // Remove items from ends
        const firstItem = await this.client.lPop('cart:user123');
        const lastItem = await this.client.rPop('cart:user123');
        console.log(`Removed ${firstItem} from start and ${lastItem} from end`);

        // Insert item at specific position
        await this.client.lInsert('cart:user123', 'BEFORE', 'banana', 'kiwi');
        const updatedCart = await this.client.lRange('cart:user123', 0, -1);
        console.log('Cart after inserting kiwi before banana:', updatedCart);

        // Use as a queue (FIFO)
        await this.client.rPush('queue:emails', 'email1@example.com', 'email2@example.com');
        const nextEmail = await this.client.lPop('queue:emails');
        console.log(`Next email to process: ${nextEmail}`);

        // Use as a stack (LIFO)
        await this.client.rPush('stack:history', 'page1', 'page2', 'page3');
        const currentPage = await this.client.rPop('stack:history');
        console.log(`Current page (from stack): ${currentPage}`);
        console.log();
    }

    // Sets - unordered unique collections
    async demoSets() {
        console.log('=== Sets Demo ===');

        // User interests
        await this.client.sAdd('user:interests:alice', 'redis', 'nodejs', 'javascript', 'databases');
        await this.client.sAdd('user:interests:bob', 'python', 'redis', 'machine-learning', 'databases');
        await this.client.sAdd('user:interests:charlie', 'javascript', 'react', 'redis', 'web-development');

        // Get all interests
        const aliceInterests = await this.client.sMembers('user:interests:alice');
        console.log('Alice\'s interests:', aliceInterests);

        // Check membership
        const hasRedis = await this.client.sIsMember('user:interests:alice', 'redis');
        console.log('Alice interested in Redis:', hasRedis);

        // Set operations
        const commonInterests = await this.client.sInter(['user:interests:alice', 'user:interests:bob']);
        console.log('Common interests (Alice & Bob):', commonInterests);

        const allInterests = await this.client.sUnion(['user:interests:alice', 'user:interests:bob', 'user:interests:charlie']);
        console.log('All interests (union):', allInterests);

        const aliceOnly = await this.client.sDiff(['user:interests:alice', 'user:interests:bob']);
        console.log('Alice\'s unique interests:', aliceOnly);

        // Add/remove members
        await this.client.sAdd('user:interests:alice', 'typescript');
        await this.client.sRem('user:interests:alice', 'javascript');
        const updatedAlice = await this.client.sMembers('user:interests:alice');
        console.log('Alice\'s updated interests:', updatedAlice);

        // Random member
        const randomInterest = await this.client.sRandMember('user:interests:alice');
        console.log('Random interest from Alice:', randomInterest);

        // Set size
        const aliceCount = await this.client.sCard('user:interests:alice');
        console.log(`Alice has ${aliceCount} interests`);
        console.log();
    }

    // Hashes - objects with multiple fields
    async demoHashes() {
        console.log('=== Hashes Demo ===');

        // User profile as hash
        await this.client.hSet('user:profile:123', {
            name: 'Alice Johnson',
            email: 'alice@example.com',
            age: '28',
            city: 'New York',
            occupation: 'Software Engineer',
            joined: '2023-01-15'
        });
        console.log('Created user profile hash');

        // Get specific fields
        const name = await this.client.hGet('user:profile:123', 'name');
        const email = await this.client.hGet('user:profile:123', 'email');
        console.log(`User: ${name} (${email})`);

        // Get all fields
        const profile = await this.client.hGetAll('user:profile:123');
        console.log('Full profile:', profile);

        // Update specific fields
        await this.client.hSet('user:profile:123', 'city', 'San Francisco');
        await this.client.hSet('user:profile:123', 'last_login', new Date().toISOString());
        console.log('Updated city and added last_login');

        // Increment numeric fields
        await this.client.hIncrBy('user:profile:123', 'login_count', 1);
        await this.client.hIncrByFloat('user:profile:123', 'account_balance', 50.25);
        console.log('Incremented login count and account balance');

        // Check if field exists
        const hasBalance = await this.client.hExists('user:profile:123', 'account_balance');
        console.log('Has account balance field:', hasBalance);

        // Get specific fields
        const selectedFields = await this.client.hmGet('user:profile:123', ['name', 'city', 'login_count']);
        console.log('Selected fields:', selectedFields);

        // Get all field names
        const fields = await this.client.hKeys('user:profile:123');
        console.log('All field names:', fields);

        // Get all values
        const values = await this.client.hVals('user:profile:123');
        console.log('All values:', values);

        // Hash length
        const fieldCount = await this.client.hLen('user:profile:123');
        console.log(`Profile has ${fieldCount} fields`);

        // Delete fields
        await this.client.hDel('user:profile:123', 'joined');
        console.log('Removed joined field');
        console.log();
    }

    // Sorted Sets - ordered unique collections with scores
    async demoSortedSets() {
        console.log('=== Sorted Sets Demo ===');

        // Player scores in a game
        await this.client.zAdd('game:scores', [
            { score: 1500, value: 'alice' },
            { score: 1200, value: 'bob' },
            { score: 1800, value: 'charlie' },
            { score: 950, value: 'diana' },
            { score: 1350, value: 'eve' }
        ]);
        console.log('Added player scores to sorted set');

        // Get top players (highest scores)
        const topPlayers = await this.client.zRevRangeWithScores('game:scores', 0, 2);
        console.log('Top 3 players:');
        topPlayers.forEach((player, index) => {
            console.log(`  ${index + 1}. ${player.value}: ${player.score}`);
        });

        // Get player rank
        const aliceRank = await this.client.zRevRank('game:scores', 'alice');
        const charlieRank = await this.client.zRevRank('game:scores', 'charlie');
        console.log(`Alice rank: ${aliceRank + 1}, Charlie rank: ${charlieRank + 1}`);

        // Get players in score range
        const midRange = await this.client.zRangeByScoreWithScores('game:scores', 1000, 1600);
        console.log('Players with scores 1000-1600:');
        midRange.forEach(player => {
            console.log(`  ${player.value}: ${player.score}`);
        });

        // Update scores
        await this.client.zIncrBy('game:scores', 100, 'alice'); // Alice gains 100 points
        await this.client.zIncrBy('game:scores', -50, 'charlie'); // Charlie loses 50 points
        console.log('Updated scores for Alice (+100) and Charlie (-50)');

        // Get updated rankings
        const updatedTop = await this.client.zRevRangeWithScores('game:scores', 0, 2);
        console.log('Updated top 3 players:');
        updatedTop.forEach((player, index) => {
            console.log(`  ${index + 1}. ${player.value}: ${player.score}`);
        });

        // Remove player
        await this.client.zRem('game:scores', 'diana');
        console.log('Removed Diana from leaderboard');

        // Get set size and score range
        const playerCount = await this.client.zCard('game:scores');
        const scoreRange = await this.client.zRangeWithScores('game:scores', 0, -1);
        const minScore = scoreRange[0]?.score || 0;
        const maxScore = scoreRange[scoreRange.length - 1]?.score || 0;
        console.log(`Remaining players: ${playerCount}, Score range: ${minScore} - ${maxScore}`);

        // Use as a priority queue
        await this.client.zAdd('tasks:priority', [
            { score: 1, value: 'low_priority_task' },
            { score: 5, value: 'medium_priority_task' },
            { score: 10, value: 'high_priority_task' }
        ]);

        const highestPriority = await this.client.zPopMax('tasks:priority');
        console.log('Highest priority task:', highestPriority);
        console.log();
    }

    // Complex data structure combining multiple types
    async demoComplexStructure() {
        console.log('=== Complex Data Structure Demo ===');

        // Create a blog post with comments (combining hashes, lists, and sets)
        const postId = 'post:123';

        // Post metadata (hash)
        await this.client.hSet(`${postId}:meta`, {
            title: 'Redis Data Structures Guide',
            author: 'Alice Johnson',
            created: new Date().toISOString(),
            category: 'tutorial',
            tags: 'redis,database,nosql'
        });

        // Post content (string)
        await this.client.set(`${postId}:content`,
            'This is a comprehensive guide to Redis data structures...');

        // Comments (list of hashes stored as JSON strings)
        const comments = [
            { id: '1', author: 'Bob', text: 'Great article!', timestamp: new Date().toISOString() },
            { id: '2', author: 'Charlie', text: 'Very helpful, thanks!', timestamp: new Date().toISOString() },
            { id: '3', author: 'Diana', text: 'Can you cover Redis Cluster next?', timestamp: new Date().toISOString() }
        ];

        for (const comment of comments) {
            await this.client.lPush(`${postId}:comments`, JSON.stringify(comment));
        }

        // Likes (set of user IDs)
        await this.client.sAdd(`${postId}:likes`, 'user456', 'user789', 'user101');

        // View counter (string with atomic increment)
        await this.client.set(`${postId}:views`, '0');

        // Retrieve and display the complex structure
        const meta = await this.client.hGetAll(`${postId}:meta`);
        const content = await this.client.get(`${postId}:content`);
        const commentList = await this.client.lRange(`${postId}:comments`, 0, -1);
        const likes = await this.client.sMembers(`${postId}:likes`);
        const views = await this.client.get(`${postId}:views`);

        console.log('Blog Post Structure:');
        console.log('Metadata:', meta);
        console.log('Content:', content.substring(0, 50) + '...');
        console.log('Comments:', commentList.map(c => JSON.parse(c).text));
        console.log('Likes:', likes.length, 'users');
        console.log('Views:', views);

        // Simulate user interactions
        await this.client.incr(`${postId}:views`); // Increment views
        await this.client.sAdd(`${postId}:likes`, 'user202'); // Add like
        await this.client.lPush(`${postId}:comments`, JSON.stringify({
            id: '4', author: 'Eve', text: 'Looking forward to more content!',
            timestamp: new Date().toISOString()
        })); // Add comment

        console.log('After user interactions:');
        console.log('Views:', await this.client.get(`${postId}:views`));
        console.log('Likes:', await this.client.sCard(`${postId}:likes`));
        console.log('Comments:', await this.client.lLen(`${postId}:comments`));
        console.log();
    }

    // Run all demos
    async runAllDemos() {
        await this.demoStrings();
        await this.demoLists();
        await this.demoSets();
        await this.demoHashes();
        await this.demoSortedSets();
        await this.demoComplexStructure();
    }
}

// Demo the data structures functionality
async function demoDataStructures() {
    const dsDemo = new DataStructuresDemo(client);

    console.log('=== Redis Data Structures Demo ===\n');

    await dsDemo.runAllDemos();

    await client.disconnect();
    console.log('Data structures demo completed!');
}

demoDataStructures().catch(console.error);