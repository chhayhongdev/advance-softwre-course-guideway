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

// Message Queuing example - job queues and background task processing
class JobQueue {
    constructor(redisClient, queueName = 'default') {
        this.client = redisClient;
        this.queueName = queueName;
        this.processingQueue = `${queueName}:processing`;
        this.failedQueue = `${queueName}:failed`;
        this.delayedQueue = `${queueName}:delayed`;
    }

    // Add a job to the queue
    async addJob(jobData, priority = 'normal', delay = 0) {
        const job = {
            id: this.generateJobId(),
            data: jobData,
            priority,
            createdAt: new Date().toISOString(),
            status: 'queued',
            attempts: 0
        };

        if (delay > 0) {
            // Add to delayed queue with score as execution time
            const executeAt = Date.now() + (delay * 1000);
            await this.client.zAdd(this.delayedQueue, [
                { score: executeAt, value: JSON.stringify(job) }
            ]);
            console.log(`Job ${job.id} scheduled for delayed execution`);
        } else {
            // Add to regular queue based on priority
            const queueKey = priority === 'high' ? `${this.queueName}:high` : this.queueName;
            await this.client.lPush(queueKey, JSON.stringify(job));
            console.log(`Job ${job.id} added to ${priority} priority queue`);
        }

        return job.id;
    }

    // Get next job from queue (round-robin between priorities)
    async getNextJob() {
        // First check high priority queue
        let jobData = await this.client.rPop(`${this.queueName}:high`);
        let priority = 'high';

        // If no high priority jobs, check regular queue
        if (!jobData) {
            jobData = await this.client.rPop(this.queueName);
            priority = 'normal';
        }

        if (!jobData) {
            return null;
        }

        const job = JSON.parse(jobData);
        job.status = 'processing';
        job.startedAt = new Date().toISOString();

        // Move to processing queue
        await this.client.lPush(this.processingQueue, JSON.stringify(job));

        console.log(`Job ${job.id} (${priority} priority) started processing`);
        return job;
    }

    // Mark job as completed
    async completeJob(jobId) {
        const processingJobs = await this.client.lRange(this.processingQueue, 0, -1);

        for (let i = 0; i < processingJobs.length; i++) {
            const job = JSON.parse(processingJobs[i]);
            if (job.id === jobId) {
                await this.client.lRem(this.processingQueue, 1, processingJobs[i]);
                console.log(`Job ${jobId} completed successfully`);
                return true;
            }
        }

        console.log(`Job ${jobId} not found in processing queue`);
        return false;
    }

    // Mark job as failed and retry or move to failed queue
    async failJob(jobId, error, maxRetries = 3) {
        const processingJobs = await this.client.lRange(this.processingQueue, 0, -1);

        for (let i = 0; i < processingJobs.length; i++) {
            const job = JSON.parse(processingJobs[i]);
            if (job.id === jobId) {
                job.attempts++;
                job.lastError = error;
                job.failedAt = new Date().toISOString();

                await this.client.lRem(this.processingQueue, 1, processingJobs[i]);

                if (job.attempts < maxRetries) {
                    // Retry - add back to queue with lower priority
                    job.status = 'retry';
                    await this.client.lPush(this.queueName, JSON.stringify(job));
                    console.log(`Job ${jobId} failed, retrying (attempt ${job.attempts}/${maxRetries})`);
                } else {
                    // Max retries reached - move to failed queue
                    job.status = 'failed';
                    await this.client.lPush(this.failedQueue, JSON.stringify(job));
                    console.log(`Job ${jobId} failed permanently after ${maxRetries} attempts`);
                }

                return true;
            }
        }

        console.log(`Job ${jobId} not found in processing queue`);
        return false;
    }

    // Process delayed jobs
    async processDelayedJobs() {
        const now = Date.now();
        const delayedJobs = await this.client.zRangeByScore(this.delayedQueue, 0, now);

        for (const jobData of delayedJobs) {
            const job = JSON.parse(jobData);
            job.status = 'queued';

            // Remove from delayed queue
            await this.client.zRem(this.delayedQueue, jobData);

            // Add to regular queue
            await this.client.lPush(this.queueName, JSON.stringify(job));
            console.log(`Delayed job ${job.id} moved to active queue`);
        }

        return delayedJobs.length;
    }

    // Get queue statistics
    async getQueueStats() {
        const [queued, processing, failed, delayed] = await Promise.all([
            this.client.lLen(this.queueName),
            this.client.lLen(this.processingQueue),
            this.client.lLen(this.failedQueue),
            this.client.zCard(this.delayedQueue)
        ]);

        return {
            queued,
            processing,
            failed,
            delayed,
            total: queued + processing + failed + delayed
        };
    }

    // Clear all queues (for testing)
    async clearQueues() {
        await Promise.all([
            this.client.del(this.queueName),
            this.client.del(`${this.queueName}:high`),
            this.client.del(this.processingQueue),
            this.client.del(this.failedQueue),
            this.client.del(this.delayedQueue)
        ]);
        console.log('All queues cleared');
    }

    generateJobId() {
        return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Simulate job processing
async function processJob(job) {
    console.log(`Processing job ${job.id}: ${JSON.stringify(job.data)}`);

    // Simulate different types of work
    if (job.data.type === 'email') {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate email sending
        console.log(`Email sent to ${job.data.to}`);
    } else if (job.data.type === 'calculation') {
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate calculation
        const result = job.data.a + job.data.b;
        console.log(`Calculation result: ${job.data.a} + ${job.data.b} = ${result}`);
    } else if (job.data.type === 'api_call') {
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API call
        console.log(`API call completed for ${job.data.endpoint}`);
    } else {
        await new Promise(resolve => setTimeout(resolve, 100)); // Default processing
        console.log(`Generic job completed`);
    }
}

// Demo the message queuing functionality
async function demoMessageQueuing() {
    const queue = new JobQueue(client, 'demo_queue');

    console.log('=== Redis Message Queuing Demo ===\n');

    // Clear any existing jobs
    await queue.clearQueues();

    // Add various jobs
    console.log('1. Adding jobs to queue:');
    await queue.addJob({ type: 'email', to: 'user1@example.com', subject: 'Welcome!' });
    await queue.addJob({ type: 'calculation', a: 10, b: 20 });
    await queue.addJob({ type: 'api_call', endpoint: '/api/users' }, 'high'); // High priority
    await queue.addJob({ type: 'email', to: 'user2@example.com', subject: 'Newsletter' });
    await queue.addJob({ type: 'backup', path: '/data' }, 'normal', 5); // Delayed by 5 seconds
    console.log();

    // Show initial queue stats
    console.log('2. Initial queue statistics:');
    let stats = await queue.getQueueStats();
    console.log('Queue stats:', JSON.stringify(stats, null, 2));
    console.log();

    // Process jobs
    console.log('3. Processing jobs:');
    for (let i = 0; i < 4; i++) {
        const job = await queue.getNextJob();
        if (job) {
            try {
                await processJob(job);
                await queue.completeJob(job.id);
            } catch (error) {
                console.error(`Job ${job.id} failed:`, error.message);
                await queue.failJob(job.id, error.message);
            }
        }
        console.log();
    }

    // Process delayed jobs
    console.log('4. Processing delayed jobs:');
    await new Promise(resolve => setTimeout(resolve, 6000)); // Wait for delayed job
    const delayedCount = await queue.processDelayedJobs();
    console.log(`Processed ${delayedCount} delayed jobs`);
    console.log();

    // Process remaining jobs
    console.log('5. Processing remaining jobs:');
    let job;
    while ((job = await queue.getNextJob()) !== null) {
        try {
            await processJob(job);
            await queue.completeJob(job.id);
        } catch (error) {
            console.error(`Job ${job.id} failed:`, error.message);
            await queue.failJob(job.id, error.message);
        }
        console.log();
    }

    // Final queue stats
    console.log('6. Final queue statistics:');
    stats = await queue.getQueueStats();
    console.log('Queue stats:', JSON.stringify(stats, null, 2));

    await client.disconnect();
}

demoMessageQueuing().catch(console.error);