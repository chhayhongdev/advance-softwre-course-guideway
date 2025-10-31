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

// Leaderboards example - maintaining sorted sets for rankings
class LeaderboardManager {
    constructor(redisClient) {
        this.client = redisClient;
    }

    // Update player score
    async updateScore(leaderboardName, playerId, score, playerData = {}) {
        const key = `leaderboard:${leaderboardName}`;

        // Update score in sorted set (higher score = better rank)
        await this.client.zAdd(key, [{ score, value: playerId }]);

        // Store player metadata
        const playerKey = `player:${playerId}`;
        await this.client.hSet(playerKey, {
            id: playerId,
            name: playerData.name || `Player ${playerId}`,
            avatar: playerData.avatar || '',
            lastUpdated: new Date().toISOString(),
            ...playerData
        });

        console.log(`Updated score for ${playerData.name || playerId}: ${score}`);
    }

    // Get top players
    async getTopPlayers(leaderboardName, limit = 10, withScores = true) {
        const key = `leaderboard:${leaderboardName}`;

        const results = await this.client.zRevRangeWithScores(key, 0, limit - 1);

        const players = [];
        for (const result of results) {
            const playerData = await this.client.hGetAll(`player:${result.value}`);
            players.push({
                rank: players.length + 1,
                playerId: result.value,
                score: result.score,
                ...playerData
            });
        }

        return players;
    }

    // Get player rank
    async getPlayerRank(leaderboardName, playerId) {
        const key = `leaderboard:${leaderboardName}`;

        const rank = await this.client.zRevRank(key, playerId);
        const score = await this.client.zScore(key, playerId);

        if (rank === null) {
            return null; // Player not in leaderboard
        }

        const playerData = await this.client.hGetAll(`player:${playerId}`);

        return {
            rank: rank + 1, // Redis ranks are 0-based
            score,
            playerId,
            ...playerData
        };
    }

    // Get players around a specific rank
    async getPlayersAroundRank(leaderboardName, targetRank, range = 2) {
        const key = `leaderboard:${leaderboardName}`;

        // Get rank 0-based for Redis
        const startRank = Math.max(0, targetRank - 1 - range);
        const endRank = targetRank - 1 + range;

        const results = await this.client.zRevRangeWithScores(key, startRank, endRank);

        const players = [];
        for (const result of results) {
            const playerData = await this.client.hGetAll(`player:${result.value}`);
            players.push({
                rank: startRank + players.length + 1,
                playerId: result.value,
                score: result.score,
                ...playerData
            });
        }

        return players;
    }

    // Get players in score range
    async getPlayersInScoreRange(leaderboardName, minScore, maxScore) {
        const key = `leaderboard:${leaderboardName}`;

        const results = await this.client.zRangeByScoreWithScores(key, minScore, maxScore);

        const players = [];
        for (const result of results) {
            const playerData = await this.client.hGetAll(`player:${result.value}`);
            players.push({
                playerId: result.value,
                score: result.score,
                ...playerData
            });
        }

        return players;
    }

    // Increment player score
    async incrementScore(leaderboardName, playerId, increment = 1) {
        const key = `leaderboard:${leaderboardName}`;

        const newScore = await this.client.zIncrBy(key, increment, playerId);

        // Update last updated timestamp
        await this.client.hSet(`player:${playerId}`, 'lastUpdated', new Date().toISOString());

        console.log(`Incremented score for ${playerId} by ${increment}. New score: ${newScore}`);
        return newScore;
    }

    // Remove player from leaderboard
    async removePlayer(leaderboardName, playerId) {
        const key = `leaderboard:${leaderboardName}`;

        await this.client.zRem(key, playerId);
        console.log(`Removed player ${playerId} from leaderboard ${leaderboardName}`);
    }

    // Get leaderboard statistics
    async getLeaderboardStats(leaderboardName) {
        const key = `leaderboard:${leaderboardName}`;

        const [totalPlayers, totalScore] = await Promise.all([
            this.client.zCard(key),
            this.client.zScore(key, 'dummy') // This will fail, but we can sum all scores
        ]);

        // Get all scores to calculate total and average
        const allScores = await this.client.zRangeWithScores(key, 0, -1);
        const scores = allScores.map(item => item.score);

        const totalScoreSum = scores.reduce((sum, score) => sum + score, 0);
        const averageScore = scores.length > 0 ? totalScoreSum / scores.length : 0;
        const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
        const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

        return {
            totalPlayers,
            totalScore: totalScoreSum,
            averageScore: Math.round(averageScore * 100) / 100,
            highestScore,
            lowestScore
        };
    }

    // Create a seasonal leaderboard (with expiration)
    async createSeasonalLeaderboard(seasonName, durationDays = 30) {
        const leaderboardName = `seasonal:${seasonName}`;
        const key = `leaderboard:${leaderboardName}`;

        // Set expiration on the leaderboard
        await this.client.expire(key, durationDays * 24 * 60 * 60);

        console.log(`Created seasonal leaderboard: ${seasonName} (expires in ${durationDays} days)`);
        return leaderboardName;
    }

    // Merge seasonal leaderboard into all-time leaderboard
    async mergeSeasonalToAllTime(seasonName, allTimeName = 'all_time') {
        const seasonalKey = `leaderboard:seasonal:${seasonName}`;
        const allTimeKey = `leaderboard:${allTimeName}`;

        // Get all players from seasonal leaderboard
        const seasonalPlayers = await this.client.zRangeWithScores(seasonalKey, 0, -1);

        // Add/merge scores to all-time leaderboard
        for (const player of seasonalPlayers) {
            await this.client.zIncrBy(allTimeKey, player.score, player.value);
        }

        console.log(`Merged ${seasonalPlayers.length} players from seasonal leaderboard to all-time`);
        return seasonalPlayers.length;
    }
}

// Demo the leaderboard functionality
async function demoLeaderboards() {
    const leaderboard = new LeaderboardManager(client);

    console.log('=== Redis Leaderboards Demo ===\n');

    // Create a gaming leaderboard
    console.log('1. Creating gaming leaderboard and adding players:');
    await leaderboard.updateScore('weekly_challenge', 'player1', 1500, { name: 'Alice', level: 25 });
    await leaderboard.updateScore('weekly_challenge', 'player2', 1200, { name: 'Bob', level: 22 });
    await leaderboard.updateScore('weekly_challenge', 'player3', 1800, { name: 'Charlie', level: 28 });
    await leaderboard.updateScore('weekly_challenge', 'player4', 950, { name: 'Diana', level: 20 });
    await leaderboard.updateScore('weekly_challenge', 'player5', 1350, { name: 'Eve', level: 24 });
    console.log();

    // Get top players
    console.log('2. Top 5 players:');
    const topPlayers = await leaderboard.getTopPlayers('weekly_challenge', 5);
    console.table(topPlayers);
    console.log();

    // Get specific player rank
    console.log('3. Player rank lookup:');
    const aliceRank = await leaderboard.getPlayerRank('weekly_challenge', 'player1');
    const bobRank = await leaderboard.getPlayerRank('weekly_challenge', 'player2');
    console.log('Alice rank:', aliceRank);
    console.log('Bob rank:', bobRank);
    console.log();

    // Get players around a rank
    console.log('4. Players around rank 3:');
    const aroundRank3 = await leaderboard.getPlayersAroundRank('weekly_challenge', 3, 1);
    console.table(aroundRank3);
    console.log();

    // Increment scores
    console.log('5. Incrementing scores:');
    await leaderboard.incrementScore('weekly_challenge', 'player4', 200); // Diana gains 200 points
    await leaderboard.incrementScore('weekly_challenge', 'player2', 50);  // Bob gains 50 points
    console.log();

    // Get updated top players
    console.log('6. Updated top 5 players:');
    const updatedTop = await leaderboard.getTopPlayers('weekly_challenge', 5);
    console.table(updatedTop);
    console.log();

    // Get leaderboard statistics
    console.log('7. Leaderboard statistics:');
    const stats = await leaderboard.getLeaderboardStats('weekly_challenge');
    console.log('Stats:', JSON.stringify(stats, null, 2));
    console.log();

    // Create seasonal leaderboard
    console.log('8. Creating seasonal leaderboard:');
    const seasonalName = await leaderboard.createSeasonalLeaderboard('summer_2024', 7);
    await leaderboard.updateScore(seasonalName, 'player1', 500, { name: 'Alice' });
    await leaderboard.updateScore(seasonalName, 'player6', 750, { name: 'Frank' });
    console.log();

    // Get seasonal leaderboard
    console.log('9. Seasonal leaderboard top players:');
    const seasonalTop = await leaderboard.getTopPlayers(seasonalName, 3);
    console.table(seasonalTop);
    console.log();

    // Merge seasonal to all-time
    console.log('10. Merging seasonal leaderboard to all-time:');
    const mergedCount = await leaderboard.mergeSeasonalToAllTime('summer_2024');
    console.log(`Merged ${mergedCount} players`);
    console.log();

    // Check all-time leaderboard
    console.log('11. All-time leaderboard after merge:');
    const allTimeTop = await leaderboard.getTopPlayers('all_time', 5);
    console.table(allTimeTop);

    await client.disconnect();
}

demoLeaderboards().catch(console.error);