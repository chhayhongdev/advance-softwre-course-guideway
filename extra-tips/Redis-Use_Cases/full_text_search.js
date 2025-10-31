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

// Full-text Search example - basic search functionality using inverted indexes
class FullTextSearch {
    constructor(redisClient, indexName = 'fts') {
        this.client = redisClient;
        this.indexName = indexName;
        this.documentsKey = `${indexName}:documents`;
        this.wordsKey = `${indexName}:words`;
    }

    // Tokenize text into words
    tokenize(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/)
            .filter(word => word.length > 2) // Remove short words
            .map(word => word.replace(/s$/, '')); // Simple stemming (remove trailing 's')
    }

    // Add document to search index
    async indexDocument(docId, title, content, metadata = {}) {
        // Store document data
        await this.client.hSet(`${this.documentsKey}:${docId}`, {
            id: docId,
            title,
            content,
            indexedAt: new Date().toISOString(),
            ...metadata
        });

        // Create inverted index
        const allText = `${title} ${content}`;
        const words = this.tokenize(allText);

        for (const word of words) {
            const wordKey = `${this.wordsKey}:${word}`;
            await this.client.sAdd(wordKey, docId);

            // Store word frequency in document
            const freqKey = `${this.wordsKey}:${word}:${docId}`;
            await this.client.incr(freqKey);
        }

        // Add to all documents set
        await this.client.sAdd(`${this.indexName}:all_docs`, docId);

        console.log(`Indexed document: ${docId} - "${title}" (${words.length} unique words)`);
    }

    // Remove document from index
    async removeDocument(docId) {
        // Get all words for this document
        const docData = await this.client.hGetAll(`${this.documentsKey}:${docId}`);
        if (!docData.content) return;

        const allText = `${docData.title} ${docData.content}`;
        const words = this.tokenize(allText);

        // Remove from inverted index
        for (const word of words) {
            const wordKey = `${this.wordsKey}:${word}`;
            await this.client.sRem(wordKey, docId);

            // Remove frequency data
            const freqKey = `${this.wordsKey}:${word}:${docId}`;
            await this.client.del(freqKey);

            // Remove empty word sets
            const remaining = await this.client.sCard(wordKey);
            if (remaining === 0) {
                await this.client.del(wordKey);
            }
        }

        // Remove document data
        await this.client.del(`${this.documentsKey}:${docId}`);
        await this.client.sRem(`${this.indexName}:all_docs`, docId);

        console.log(`Removed document: ${docId}`);
    }

    // Search documents
    async search(query, options = {}) {
        const { limit = 10, offset = 0, sortBy = 'relevance' } = options;

        const queryWords = this.tokenize(query);
        if (queryWords.length === 0) {
            return { total: 0, results: [] };
        }

        // Find documents containing any of the query words
        const docSets = [];
        for (const word of queryWords) {
            const wordKey = `${this.wordsKey}:${word}`;
            const docs = await this.client.sMembers(wordKey);
            if (docs.length > 0) {
                docSets.push(new Set(docs));
            }
        }

        if (docSets.length === 0) {
            return { total: 0, results: [] };
        }

        // Find intersection of all document sets (documents containing all query words)
        let resultDocs = Array.from(docSets[0]);
        for (let i = 1; i < docSets.length; i++) {
            resultDocs = resultDocs.filter(doc => docSets[i].has(doc));
        }

        // Calculate relevance scores
        const scoredResults = [];
        for (const docId of resultDocs) {
            const docData = await this.client.hGetAll(`${this.documentsKey}:${docId}`);

            // Calculate TF-IDF like score
            let score = 0;
            let totalWords = 0;

            for (const word of queryWords) {
                const freqKey = `${this.wordsKey}:${word}:${docId}`;
                const freq = parseInt(await this.client.get(freqKey) || '0');
                const docFreq = await this.client.sCard(`${this.wordsKey}:${word}`);
                const totalDocs = await this.client.sCard(`${this.indexName}:all_docs`);

                // Simple TF-IDF calculation
                const tf = freq;
                const idf = Math.log(totalDocs / (docFreq || 1));
                score += tf * idf;
                totalWords += freq;
            }

            scoredResults.push({
                id: docId,
                title: docData.title,
                content: docData.content.substring(0, 200) + '...',
                score: Math.round(score * 100) / 100,
                totalWords,
                metadata: { ...docData }
            });
        }

        // Sort results
        if (sortBy === 'relevance') {
            scoredResults.sort((a, b) => b.score - a.score);
        } else if (sortBy === 'date') {
            scoredResults.sort((a, b) => new Date(b.metadata.indexedAt) - new Date(a.metadata.indexedAt));
        }

        // Apply pagination
        const paginatedResults = scoredResults.slice(offset, offset + limit);

        return {
            total: scoredResults.length,
            results: paginatedResults,
            query: queryWords
        };
    }

    // Get search suggestions (autocomplete)
    async getSuggestions(prefix, limit = 5) {
        const suggestions = new Set();

        // Get all words that start with the prefix
        const pattern = `${this.wordsKey}:${prefix}*`;
        const keys = await this.client.keys(pattern);

        for (const key of keys) {
            const word = key.replace(`${this.wordsKey}:`, '');
            suggestions.add(word);
        }

        return Array.from(suggestions).slice(0, limit);
    }

    // Get search statistics
    async getStats() {
        const totalDocs = await this.client.sCard(`${this.indexName}:all_docs`);
        const wordKeys = await this.client.keys(`${this.wordsKey}:*`);
        const uniqueWords = wordKeys.filter(key => !key.includes(':')).length;

        let totalWordOccurrences = 0;
        for (const key of wordKeys) {
            if (!key.includes(':')) { // Skip frequency keys
                const count = await this.client.sCard(key);
                totalWordOccurrences += count;
            }
        }

        return {
            totalDocuments: totalDocs,
            uniqueWords,
            totalWordOccurrences,
            averageWordsPerDocument: totalDocs > 0 ? Math.round(totalWordOccurrences / totalDocs * 100) / 100 : 0
        };
    }

    // Clear entire index
    async clearIndex() {
        const allKeys = await this.client.keys(`${this.indexName}:*`);
        const wordKeys = await this.client.keys(`${this.wordsKey}:*`);

        if (allKeys.length > 0) {
            await this.client.del(allKeys);
        }
        if (wordKeys.length > 0) {
            await this.client.del(wordKeys);
        }

        console.log('Search index cleared');
    }
}

// Demo the full-text search functionality
async function demoFullTextSearch() {
    const search = new FullTextSearch(client);

    console.log('=== Redis Full-text Search Demo ===\n');

    // Clear any existing index
    await search.clearIndex();

    // Index sample documents
    console.log('1. Indexing documents:');
    const documents = [
        {
            id: 'doc1',
            title: 'Redis Introduction',
            content: 'Redis is an open source, in-memory data structure store used as a database, cache, and message broker. It supports various data structures such as strings, hashes, lists, sets, and sorted sets.',
            category: 'database'
        },
        {
            id: 'doc2',
            title: 'Node.js Guide',
            content: 'Node.js is a JavaScript runtime built on Chrome\'s V8 JavaScript engine. It uses an event-driven, non-blocking I/O model that makes it lightweight and efficient.',
            category: 'programming'
        },
        {
            id: 'doc3',
            title: 'Database Performance',
            content: 'Database performance optimization involves indexing, query optimization, and caching strategies. Redis can significantly improve application performance when used as a cache layer.',
            category: 'performance'
        },
        {
            id: 'doc4',
            title: 'JavaScript Best Practices',
            content: 'JavaScript best practices include using const/let instead of var, arrow functions, async/await for asynchronous code, and proper error handling with try/catch blocks.',
            category: 'programming'
        },
        {
            id: 'doc5',
            title: 'Caching Strategies',
            content: 'Effective caching strategies include cache-aside, write-through, and write-behind patterns. Redis provides excellent support for implementing these caching patterns.',
            category: 'performance'
        }
    ];

    for (const doc of documents) {
        await search.indexDocument(doc.id, doc.title, doc.content, {
            category: doc.category,
            wordCount: doc.content.split(' ').length
        });
    }
    console.log();

    // Search for documents
    console.log('2. Searching for "redis":');
    let results = await search.search('redis');
    console.log(`Found ${results.total} documents:`);
    results.results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.title} (score: ${result.score})`);
        console.log(`     "${result.content}"`);
    });
    console.log();

    console.log('3. Searching for "javascript performance":');
    results = await search.search('javascript performance');
    console.log(`Found ${results.total} documents:`);
    results.results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.title} (score: ${result.score})`);
    });
    console.log();

    console.log('4. Searching for "database" with pagination:');
    results = await search.search('database', { limit: 2, offset: 0 });
    console.log(`Found ${results.total} documents (showing first 2):`);
    results.results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.title} (score: ${result.score})`);
    });
    console.log();

    // Get search suggestions
    console.log('5. Search suggestions for "java":');
    const suggestions = await search.getSuggestions('java');
    console.log('Suggestions:', suggestions);
    console.log();

    // Get search statistics
    console.log('6. Search index statistics:');
    const stats = await search.getStats();
    console.log('Stats:', JSON.stringify(stats, null, 2));
    console.log();

    // Remove a document
    console.log('7. Removing document "doc2":');
    await search.removeDocument('doc2');
    results = await search.search('nodejs');
    console.log(`After removal, found ${results.total} documents for "nodejs"`);
    console.log();

    // Search with different sorting
    console.log('8. Searching "performance" sorted by date:');
    results = await search.search('performance', { sortBy: 'date' });
    console.log(`Found ${results.total} documents:`);
    results.results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.title} (${result.metadata.indexedAt})`);
    });
    console.log();

    // Complex query
    console.log('9. Complex search query:');
    results = await search.search('cache optimization strategies');
    console.log(`Query: "cache optimization strategies"`);
    console.log(`Found ${results.total} documents:`);
    results.results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.title} (score: ${result.score})`);
        console.log(`     Category: ${result.metadata.category}`);
    });

    await client.disconnect();
    console.log('\nFull-text search demo completed!');
}

demoFullTextSearch().catch(console.error);