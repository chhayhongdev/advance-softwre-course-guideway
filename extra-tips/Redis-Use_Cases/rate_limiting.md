# Redis Leaderboards: From Beginner to Advanced

## What are Leaderboards?

**Beginner Level:** Leaderboards are like scoreboards in games. They show who's winning by ranking players based on their scores. Redis is perfect for this because it can quickly sort and rank thousands of players.

**Intermediate Level:** Leaderboards use sorted sets to maintain ordered collections of members with associated scores. Redis sorted sets provide O(log N) operations for adding, updating, and retrieving ranked data.

## Why Redis for Leaderboards?

- **Speed:** Fast ranking operations
- **Atomic Updates:** Consistent score changes
- **Range Queries:** Get top/bottom N players instantly
- **Real-time Updates:** Live leaderboard changes
- **Memory Efficient:** Compact storage for large leaderboards

## Basic Leaderboard Operations

### Beginner Example: Simple Score Tracking

```javascript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

// Add player scores
async function addScore(playerId, score) {
    await client.zAdd('leaderboard', [{ score, value: playerId }]);
    console.log(`Added score ${score} for player ${playerId}`);
}

// Get player's rank
async function getPlayerRank(playerId) {
    const rank = await client.zRevRank('leaderboard', playerId);
    return rank !== null ? rank + 1 : null; // +1 because ranks are 0-based
}

// Get top players
async function getTopPlayers(count = 10) {
    const topPlayers = await client.zRevRangeWithScores('leaderboard', 0, count - 1);
    return topPlayers.map(([playerId, score]) => ({
        playerId,
        score: Number(score)
    }));
}

// Example usage
await addScore('alice', 1500);
await addScore('bob', 1200);
await addScore('charlie', 1800);

console.log('Alice rank:', await getPlayerRank('alice'));
console.log('Top 3 players:', await getTopPlayers(3));
```

### Intermediate Example: Score Updates and History

```javascript
class LeaderboardManager {
    constructor(redisClient, leaderboardName = 'leaderboard') {
        this.client = redisClient;
        this.leaderboard = leaderboardName;
        this.historyKey = `${leaderboardName}:history`;
    }

    async updateScore(playerId, scoreChange, reason = '') {
        // Get current score
        const currentScore = await this.getPlayerScore(playerId) || 0;
        const newScore = currentScore + scoreChange;

        // Update leaderboard
        await this.client.zAdd(this.leaderboard, [{ score: newScore, value: playerId }]);

        // Record history
        const historyEntry = {
            playerId,
            oldScore: currentScore,
            newScore,
            change: scoreChange,
            reason,
            timestamp: new Date().toISOString()
        };

        await this.client.lPush(this.historyKey, JSON.stringify(historyEntry));
        await this.client.lTrim(this.historyKey, 0, 999); // Keep last 1000 entries

        return {
            oldScore: currentScore,
            newScore,
            rank: await this.getPlayerRank(playerId)
        };
    }

    async getPlayerScore(playerId) {
        const score = await this.client.zScore(this.leaderboard, playerId);
        return score !== null ? Number(score) : null;
    }

    async getPlayerRank(playerId) {
        const rank = await this.client.zRevRank(this.leaderboard, playerId);
        return rank !== null ? rank + 1 : null;
    }
}
```

## Advanced Leaderboard Features

### Time-Based Leaderboards

```javascript
class TimeBasedLeaderboards {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async updateDailyScore(playerId, score) {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const dailyKey = `leaderboard:daily:${today}`;

        await this.client.zIncrBy(dailyKey, score, playerId);
        await this.client.expire(dailyKey, 86400 * 7); // Expire after 7 days

        return await this.getPlayerDailyRank(playerId, today);
    }

    async getDailyLeaderboard(date, count = 10) {
        const dailyKey = `leaderboard:daily:${date}`;
        const players = await this.client.zRevRangeWithScores(dailyKey, 0, count - 1);

        return players.map(([playerId, score]) => ({
            playerId,
            score: Number(score),
            date
        }));
    }

    async getPlayerDailyRank(playerId, date) {
        const dailyKey = `leaderboard:daily:${date}`;
        const rank = await this.client.zRevRank(dailyKey, playerId);
        return rank !== null ? rank + 1 : null;
    }

    async getWeeklyLeaderboard(weekStartDate, count = 10) {
        // Combine daily scores for the week
        const weekScores = new Map();

        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStartDate);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            const dailyPlayers = await this.getDailyLeaderboard(dateStr, 1000); // Get more to combine

            for (const player of dailyPlayers) {
                const currentScore = weekScores.get(player.playerId) || 0;
                weekScores.set(player.playerId, currentScore + player.score);
            }
        }

        // Sort and return top players
        return Array.from(weekScores.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, count)
            .map(([playerId, score]) => ({ playerId, score }));
    }
}
```

### Category-Based Leaderboards

```javascript
class CategoryLeaderboards {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async updateCategoryScore(playerId, category, score) {
        const categoryKey = `leaderboard:category:${category}`;
        await this.client.zAdd(categoryKey, [{ score, value: playerId }]);

        // Update player's overall score across categories
        await this.updatePlayerOverallScore(playerId);

        return await this.getPlayerCategoryRank(playerId, category);
    }

    async updatePlayerOverallScore(playerId) {
        // Get all categories for this player
        const categoryKeys = await this.client.keys('leaderboard:category:*');

        let totalScore = 0;
        for (const categoryKey of categoryKeys) {
            const score = await this.client.zScore(categoryKey, playerId);
            if (score !== null) {
                totalScore += Number(score);
            }
        }

        await this.client.zAdd('leaderboard:overall', [{ score: totalScore, value: playerId }]);
    }

    async getCategoryLeaderboard(category, count = 10) {
        const categoryKey = `leaderboard:category:${category}`;
        const players = await this.client.zRevRangeWithScores(categoryKey, 0, count - 1);

        return players.map(([playerId, score]) => ({
            playerId,
            score: Number(score),
            category
        }));
    }

    async getPlayerCategoryRank(playerId, category) {
        const categoryKey = `leaderboard:category:${category}`;
        const rank = await this.client.zRevRank(categoryKey, playerId);
        return rank !== null ? rank + 1 : null;
    }

    async getPlayerAllCategories(playerId) {
        const categoryKeys = await this.client.keys('leaderboard:category:*');
        const categories = [];

        for (const categoryKey of categoryKeys) {
            const category = categoryKey.replace('leaderboard:category:', '');
            const score = await this.client.zScore(categoryKey, playerId);
            const rank = await this.client.zRevRank(categoryKey, playerId);

            if (score !== null) {
                categories.push({
                    category,
                    score: Number(score),
                    rank: rank + 1
                });
            }
        }

        return categories;
    }
}
```

## Leaderboard Analytics and Statistics

### Performance Metrics

```javascript
class LeaderboardAnalytics {
    async getLeaderboardStats(leaderboardKey) {
        const totalPlayers = await this.client.zCard(leaderboardKey);
        const scores = await this.client.zRangeWithScores(leaderboardKey, 0, -1);

        if (scores.length === 0) {
            return {
                totalPlayers: 0,
                averageScore: 0,
                medianScore: 0,
                topScore: 0,
                bottomScore: 0
            };
        }

        const scoreValues = scores.map(([_, score]) => Number(score)).sort((a, b) => a - b);

        return {
            totalPlayers,
            averageScore: scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length,
            medianScore: this.calculateMedian(scoreValues),
            topScore: scoreValues[scoreValues.length - 1],
            bottomScore: scoreValues[0],
            scoreDistribution: this.calculateDistribution(scoreValues)
        };
    }

    calculateMedian(sortedArray) {
        const mid = Math.floor(sortedArray.length / 2);
        return sortedArray.length % 2 !== 0
            ? sortedArray[mid]
            : (sortedArray[mid - 1] + sortedArray[mid]) / 2;
    }

    calculateDistribution(scores) {
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        const range = max - min;
        const buckets = 10;
        const bucketSize = range / buckets;

        const distribution = new Array(buckets).fill(0);

        for (const score of scores) {
            const bucketIndex = Math.min(
                Math.floor((score - min) / bucketSize),
                buckets - 1
            );
            distribution[bucketIndex]++;
        }

        return distribution;
    }

    async getPlayerPercentile(playerId, leaderboardKey) {
        const playerScore = await this.client.zScore(leaderboardKey, playerId);
        if (playerScore === null) return null;

        const totalPlayers = await this.client.zCard(leaderboardKey);
        const playersBelow = await this.client.zCount(leaderboardKey, 0, playerScore - 1);

        return (playersBelow / totalPlayers) * 100;
    }
}
```

### Trend Analysis

```javascript
class LeaderboardTrends {
    async recordLeaderboardSnapshot(leaderboardKey, interval = 'daily') {
        const timestamp = Date.now();
        const snapshotKey = `snapshot:${leaderboardKey}:${interval}:${timestamp}`;

        // Get current top 100 players
        const topPlayers = await this.client.zRevRangeWithScores(leaderboardKey, 0, 99);

        const snapshot = {
            timestamp,
            interval,
            leaderboard: leaderboardKey,
            topPlayers: topPlayers.map(([playerId, score]) => ({
                playerId,
                score: Number(score)
            }))
        };

        await this.client.set(snapshotKey, JSON.stringify(snapshot));
        await this.client.expire(snapshotKey, 86400 * 30); // Keep for 30 days

        // Maintain snapshot index
        await this.client.zAdd(`snapshots:${leaderboardKey}:${interval}`, [{
            score: timestamp,
            value: snapshotKey
        }]);

        return snapshot;
    }

    async getLeaderboardTrends(leaderboardKey, interval = 'daily', days = 7) {
        const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
        const snapshotKeys = await this.client.zRangeByScore(
            `snapshots:${leaderboardKey}:${interval}`,
            cutoffTime,
            Date.now()
        );

        const trends = [];

        for (const snapshotKey of snapshotKeys) {
            const snapshotData = await this.client.get(snapshotKey);
            if (snapshotData) {
                trends.push(JSON.parse(snapshotData));
            }
        }

        return trends.sort((a, b) => a.timestamp - b.timestamp);
    }

    async analyzePlayerProgression(playerId, leaderboardKey, days = 30) {
        const trends = await this.getLeaderboardTrends(leaderboardKey, 'daily', days);

        const progression = [];

        for (const snapshot of trends) {
            const playerData = snapshot.topPlayers.find(p => p.playerId === playerId);
            if (playerData) {
                progression.push({
                    date: new Date(snapshot.timestamp).toISOString().split('T')[0],
                    score: playerData.score,
                    rank: snapshot.topPlayers.findIndex(p => p.playerId === playerId) + 1
                });
            }
        }

        return progression;
    }
}
```

## Advanced Leaderboard Patterns

### Weighted Scoring Systems

```javascript
class WeightedLeaderboard {
    constructor(redisClient, leaderboardName) {
        this.client = redisClient;
        this.leaderboard = leaderboardName;
        this.weightsKey = `${leaderboardName}:weights`;
    }

    async setWeights(weights) {
        // weights = { score: 0.7, time: 0.2, bonus: 0.1 }
        await this.client.hSet(this.weightsKey, weights);
    }

    async updatePlayerMetrics(playerId, metrics) {
        // metrics = { score: 1000, time: 300, bonus: 50 }
        const playerMetricsKey = `metrics:${this.leaderboard}:${playerId}`;
        await this.client.hSet(playerMetricsKey, metrics);

        // Calculate weighted score
        const weightedScore = await this.calculateWeightedScore(playerId);
        await this.client.zAdd(this.leaderboard, [{ score: weightedScore, value: playerId }]);

        return weightedScore;
    }

    async calculateWeightedScore(playerId) {
        const weights = await this.client.hGetAll(this.weightsKey);
        const metrics = await this.client.hGetAll(`metrics:${this.leaderboard}:${playerId}`);

        let totalScore = 0;

        for (const [metric, weight] of Object.entries(weights)) {
            const metricValue = Number(metrics[metric]) || 0;
            totalScore += metricValue * Number(weight);
        }

        return totalScore;
    }

    async getPlayerMetrics(playerId) {
        const metricsKey = `metrics:${this.leaderboard}:${playerId}`;
        const metrics = await this.client.hGetAll(metricsKey);
        const weights = await this.client.hGetAll(this.weightsKey);

        return {
            metrics: Object.fromEntries(
                Object.entries(metrics).map(([k, v]) => [k, Number(v)])
            ),
            weights: Object.fromEntries(
                Object.entries(weights).map(([k, v]) => [k, Number(v)])
            ),
            weightedScore: await this.calculateWeightedScore(playerId)
        };
    }
}
```

### Tournament Leaderboards

```javascript
class TournamentLeaderboard {
    constructor(redisClient, tournamentId) {
        this.client = redisClient;
        this.tournamentId = tournamentId;
        this.leaderboardKey = `tournament:${tournamentId}:leaderboard`;
        this.matchesKey = `tournament:${tournamentId}:matches`;
    }

    async recordMatch(winnerId, loserId, winnerScore, loserScore) {
        const matchId = this.generateId();

        const match = {
            id: matchId,
            winnerId,
            loserId,
            winnerScore,
            loserScore,
            timestamp: new Date().toISOString(),
            tournamentId: this.tournamentId
        };

        // Record match
        await this.client.lPush(this.matchesKey, JSON.stringify(match));

        // Update player scores
        await this.client.zIncrBy(this.leaderboardKey, winnerScore, winnerId);
        await this.client.zIncrBy(this.leaderboardKey, loserScore, loserId);

        // Update player statistics
        await this.updatePlayerStats(winnerId, 'win');
        await this.updatePlayerStats(loserId, 'loss');

        return matchId;
    }

    async updatePlayerStats(playerId, result) {
        const statsKey = `player_stats:${this.tournamentId}:${playerId}`;

        if (result === 'win') {
            await this.client.hIncrBy(statsKey, 'wins', 1);
            await this.client.hIncrBy(statsKey, 'total_matches', 1);
        } else {
            await this.client.hIncrBy(statsKey, 'losses', 1);
            await this.client.hIncrBy(statsKey, 'total_matches', 1);
        }
    }

    async getTournamentLeaderboard(count = 10) {
        const players = await this.client.zRevRangeWithScores(this.leaderboardKey, 0, count - 1);

        const leaderboard = [];
        for (const [playerId, score] of players) {
            const stats = await this.client.hGetAll(`player_stats:${this.tournamentId}:${playerId}`);
            leaderboard.push({
                playerId,
                score: Number(score),
                wins: parseInt(stats.wins) || 0,
                losses: parseInt(stats.losses) || 0,
                totalMatches: parseInt(stats.total_matches) || 0,
                winRate: this.calculateWinRate(stats)
            });
        }

        return leaderboard;
    }

    calculateWinRate(stats) {
        const wins = parseInt(stats.wins) || 0;
        const total = parseInt(stats.total_matches) || 0;
        return total > 0 ? (wins / total) * 100 : 0;
    }

    async getMatchHistory(playerId, limit = 10) {
        const allMatches = await this.client.lRange(this.matchesKey, 0, -1);
        const playerMatches = allMatches
            .map(match => JSON.parse(match))
            .filter(match => match.winnerId === playerId || match.loserId === playerId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);

        return playerMatches;
    }
}
```

## Leaderboard Optimization

### Memory-Efficient Storage

```javascript
class OptimizedLeaderboard {
    // Use score compression for large leaderboards
    async addCompressedScore(playerId, score) {
        // Compress score to reduce memory usage
        const compressedScore = this.compressScore(score);
        await this.client.zAdd(this.leaderboard, [{ score: compressedScore, value: playerId }]);

        // Store original score separately if needed for display
        await this.client.hSet(`${this.leaderboard}:original_scores`, playerId, score);
    }

    compressScore(score) {
        // Simple compression: divide by 100 and store as integer
        return Math.floor(score / 100);
    }

    decompressScore(compressedScore) {
        return compressedScore * 100;
    }

    // Implement score bucketing for very large leaderboards
    async addBucketedScore(playerId, score) {
        const bucket = Math.floor(score / 1000); // Bucket size of 1000
        const bucketKey = `${this.leaderboard}:bucket:${bucket}`;

        await this.client.zAdd(bucketKey, [{ score, value: playerId }]);

        // Maintain bucket index
        await this.client.zAdd(`${this.leaderboard}:buckets`, [{
            score: bucket,
            value: bucketKey
        }]);
    }

    async getTopFromBuckets(count = 10) {
        const buckets = await this.client.zRevRange(`${this.leaderboard}:buckets`, 0, -1);
        const topPlayers = [];

        for (const bucketKey of buckets) {
            if (topPlayers.length >= count) break;

            const bucketPlayers = await this.client.zRevRangeWithScores(
                bucketKey,
                0,
                count - topPlayers.length - 1
            );

            topPlayers.push(...bucketPlayers);
        }

        return topPlayers.slice(0, count);
    }
}
```

## Real-Time Leaderboard Updates

### Live Updates with Pub/Sub

```javascript
class LiveLeaderboard {
    constructor(redisClient) {
        this.client = redisClient;
        this.subscriber = this.client.duplicate();
        this.publisher = this.client.duplicate();
    }

    async subscribeToUpdates(callback) {
        await this.subscriber.connect();
        await this.subscriber.subscribe('leaderboard_updates', (message) => {
            const update = JSON.parse(message);
            callback(update);
        });
    }

    async publishUpdate(update) {
        await this.publisher.connect();
        await this.publisher.publish('leaderboard_updates', JSON.stringify(update));
    }

    async updateScoreAndNotify(playerId, scoreChange) {
        // Update score
        const oldScore = await this.getPlayerScore(playerId) || 0;
        const newScore = oldScore + scoreChange;

        await this.client.zAdd(this.leaderboard, [{ score: newScore, value: playerId }]);

        const newRank = await this.getPlayerRank(playerId);

        // Notify subscribers
        const update = {
            type: 'score_update',
            playerId,
            oldScore,
            newScore,
            scoreChange,
            newRank,
            timestamp: new Date().toISOString()
        };

        await this.publishUpdate(update);

        return update;
    }
}
```

## Best Practices

### 1. Score Validation and Security

```javascript
class SecureLeaderboard {
    async updateScoreSecure(playerId, scoreChange, authToken) {
        // Validate authentication
        if (!await this.validateAuthToken(playerId, authToken)) {
            throw new Error('Invalid authentication');
        }

        // Validate score change
        if (!this.isValidScoreChange(scoreChange)) {
            throw new Error('Invalid score change');
        }

        // Rate limit updates
        if (!await this.checkRateLimit(playerId)) {
            throw new Error('Rate limit exceeded');
        }

        // Update score
        return await this.updateScore(playerId, scoreChange);
    }

    isValidScoreChange(change) {
        return typeof change === 'number' &&
               change >= -1000 &&
               change <= 1000 &&
               Number.isInteger(change);
    }

    async checkRateLimit(playerId) {
        const key = `ratelimit:${playerId}`;
        const count = await this.client.incr(key);

        if (count === 1) {
            await this.client.expire(key, 60); // 1 minute window
        }

        return count <= 10; // Max 10 updates per minute
    }
}
```

### 2. Data Consistency

```javascript
class ConsistentLeaderboard {
    async updateScoreAtomic(playerId, scoreChange) {
        // Use Lua script for atomic updates
        const script = `
            local current = redis.call('ZSCORE', KEYS[1], ARGV[1])
            if not current then current = 0 end
            local newScore = current + ARGV[2]
            redis.call('ZADD', KEYS[1], newScore, ARGV[1])
            return newScore
        `;

        const newScore = await this.client.eval(script, {
            keys: [this.leaderboard],
            arguments: [playerId, scoreChange.toString()]
        });

        return Number(newScore);
    }

    async bulkUpdateScores(updates) {
        // Use pipeline for multiple updates
        const pipeline = this.client.multi();

        for (const { playerId, scoreChange } of updates) {
            pipeline.zIncrBy(this.leaderboard, scoreChange, playerId);
        }

        const results = await pipeline.exec();
        return results.map(result => Number(result));
    }
}
```

## Conclusion

Leaderboards with Redis provide fast, scalable ranking systems for games and applications. Start with basic score tracking using sorted sets, then add time-based leaderboards, categories, and real-time updates as your needs grow.

**Beginner Tip:** Use ZADD to add scores and ZREVRANGE to get top players.

**Advanced Tip:** Implement weighted scoring, tournament systems, and real-time notifications for engaging leaderboards.</content>
<parameter name="filePath">/Users/chhayhong/Desktop/Redis_University/leaderboards.md