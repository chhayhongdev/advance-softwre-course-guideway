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

// Session Storage example - managing user sessions
class SessionManager {
    constructor(redisClient) {
        this.client = redisClient;
        this.sessionTTL = 3600; // 1 hour in seconds
    }

    // Create a new session
    async createSession(userId, userData = {}) {
        const sessionId = this.generateSessionId();
        const sessionKey = `session:${sessionId}`;

        const sessionData = {
            userId,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            ...userData
        };

        try {
            await this.client.setEx(sessionKey, this.sessionTTL, JSON.stringify(sessionData));
            console.log(`Session created for user ${userId}: ${sessionId}`);
            return sessionId;
        } catch (error) {
            console.error('Error creating session:', error);
            throw error;
        }
    }

    // Get session data
    async getSession(sessionId) {
        const sessionKey = `session:${sessionId}`;

        try {
            const sessionData = await this.client.get(sessionKey);
            if (!sessionData) {
                return null; // Session not found or expired
            }

            const session = JSON.parse(sessionData);

            // Update last activity
            session.lastActivity = new Date().toISOString();
            await this.client.setEx(sessionKey, this.sessionTTL, JSON.stringify(session));

            return session;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }

    // Update session data
    async updateSession(sessionId, updates) {
        const sessionKey = `session:${sessionId}`;

        try {
            const sessionData = await this.client.get(sessionKey);
            if (!sessionData) {
                throw new Error('Session not found');
            }

            const session = JSON.parse(sessionData);
            const updatedSession = {
                ...session,
                ...updates,
                lastActivity: new Date().toISOString()
            };

            await this.client.setEx(sessionKey, this.sessionTTL, JSON.stringify(updatedSession));
            console.log(`Session ${sessionId} updated`);
            return updatedSession;
        } catch (error) {
            console.error('Error updating session:', error);
            throw error;
        }
    }

    // Destroy session
    async destroySession(sessionId) {
        const sessionKey = `session:${sessionId}`;

        try {
            await this.client.del(sessionKey);
            console.log(`Session ${sessionId} destroyed`);
        } catch (error) {
            console.error('Error destroying session:', error);
            throw error;
        }
    }

    // Get all active sessions for a user
    async getUserSessions(userId) {
        try {
            const pattern = `session:*`;
            const keys = await this.client.keys(pattern);
            const userSessions = [];

            for (const key of keys) {
                const sessionData = await this.client.get(key);
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    if (session.userId === userId) {
                        userSessions.push({
                            sessionId: key.replace('session:', ''),
                            ...session
                        });
                    }
                }
            }

            return userSessions;
        } catch (error) {
            console.error('Error getting user sessions:', error);
            return [];
        }
    }

    // Clean expired sessions (Redis handles this automatically with EXPIRE)
    async cleanupExpiredSessions() {
        console.log('Redis automatically expires sessions after TTL');
    }

    // Generate a unique session ID
    generateSessionId() {
        return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Demo the session management functionality
async function demoSessionStorage() {
    const sessionManager = new SessionManager(client);

    console.log('=== Redis Session Storage Demo ===\n');

    // Create a session
    console.log('1. Creating a new session:');
    const sessionId = await sessionManager.createSession(123, {
        username: 'john_doe',
        role: 'admin',
        preferences: { theme: 'dark' }
    });
    console.log(`Session ID: ${sessionId}\n`);

    // Get session data
    console.log('2. Retrieving session data:');
    let session = await sessionManager.getSession(sessionId);
    console.log('Session:', JSON.stringify(session, null, 2));
    console.log();

    // Update session
    console.log('3. Updating session data:');
    await sessionManager.updateSession(sessionId, {
        lastPage: '/dashboard',
        preferences: { theme: 'light' }
    });
    session = await sessionManager.getSession(sessionId);
    console.log('Updated session:', JSON.stringify(session, null, 2));
    console.log();

    // Create another session for the same user
    console.log('4. Creating another session for the same user:');
    const sessionId2 = await sessionManager.createSession(123, {
        username: 'john_doe',
        role: 'admin',
        device: 'mobile'
    });
    console.log(`Second Session ID: ${sessionId2}\n`);

    // Get all sessions for user
    console.log('5. Getting all sessions for user 123:');
    const userSessions = await sessionManager.getUserSessions(123);
    console.log('User sessions:', JSON.stringify(userSessions, null, 2));
    console.log();

    // Destroy first session
    console.log('6. Destroying first session:');
    await sessionManager.destroySession(sessionId);
    console.log();

    // Try to get destroyed session
    console.log('7. Trying to get destroyed session:');
    const destroyedSession = await sessionManager.getSession(sessionId);
    console.log('Destroyed session result:', destroyedSession);
    console.log();

    // Second session should still exist
    console.log('8. Checking if second session still exists:');
    const activeSession = await sessionManager.getSession(sessionId2);
    console.log('Active session:', activeSession ? 'Exists' : 'Not found');

    await client.disconnect();
}

demoSessionStorage().catch(console.error);