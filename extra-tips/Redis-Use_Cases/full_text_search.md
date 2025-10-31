# Redis Full-Text Search: From Beginner to Advanced

## What is Full-Text Search?

**Beginner Level:** Full-text search is like searching through books or documents. Instead of just looking for exact matches, it can find documents that contain words related to your search. For example, searching for "cat" might also find documents about "cats" or "feline."

**Intermediate Level:** Full-text search involves indexing text content to enable fast, relevant search results. Redis provides text search capabilities through modules like RediSearch, allowing for complex queries, scoring, and filtering.

## Why Redis for Full-Text Search?

- **Fast Search:** Sub-millisecond search results
- **Rich Queries:** Boolean logic, fuzzy matching, phrase search
- **Scoring:** Relevance-based result ranking
- **Filtering:** Numeric, geographic, and tag-based filtering
- **Aggregations:** Faceted search and analytics
- **Real-Time:** Instant index updates

## Basic Full-Text Search

### Beginner Example: Simple Text Search

```javascript
import { createClient } from 'redis';

const client = createClient();
await client.connect();

class SimpleTextSearch {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async indexDocument(docId, title, content) {
        const key = `doc:${docId}`;

        // Store document content
        await this.client.hSet(key, {
            title,
            content,
            indexed_at: new Date().toISOString()
        });

        // Simple word-based indexing
        const words = this.extractWords(`${title} ${content}`);
        for (const word of words) {
            await this.client.sAdd(`word:${word}`, docId);
        }
    }

    async search(query, limit = 10) {
        const queryWords = this.extractWords(query);
        if (queryWords.length === 0) return [];

        // Find documents containing any of the query words
        const docSets = await Promise.all(
            queryWords.map(word => this.client.sMembers(`word:${word}`))
        );

        // Intersect all document sets (AND logic)
        const commonDocs = this.intersectSets(docSets);

        // Get document details
        const results = [];
        for (const docId of commonDocs.slice(0, limit)) {
            const doc = await this.client.hGetAll(`doc:${docId}`);
            if (doc.title && doc.content) {
                results.push({
                    id: docId,
                    title: doc.title,
                    content: doc.content.substring(0, 200) + '...',
                    score: this.calculateScore(queryWords, doc)
                });
            }
        }

        return results.sort((a, b) => b.score - a.score);
    }

    extractWords(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2)
            .filter((word, index, arr) => arr.indexOf(word) === index); // Remove duplicates
    }

    intersectSets(sets) {
        if (sets.length === 0) return [];
        if (sets.length === 1) return Array.from(sets[0]);

        let result = new Set(sets[0]);
        for (let i = 1; i < sets.length; i++) {
            result = new Set([...result].filter(x => sets[i].has(x)));
        }

        return Array.from(result);
    }

    calculateScore(queryWords, doc) {
        const title = doc.title.toLowerCase();
        const content = doc.content.toLowerCase();

        let score = 0;
        for (const word of queryWords) {
            // Title matches are worth more
            if (title.includes(word)) score += 10;
            // Content matches
            const contentMatches = (content.match(new RegExp(word, 'g')) || []).length;
            score += contentMatches;
        }

        return score;
    }

    async removeDocument(docId) {
        const key = `doc:${docId}`;
        const doc = await this.client.hGetAll(key);

        if (doc.title && doc.content) {
            const words = this.extractWords(`${doc.title} ${doc.content}`);
            for (const word of words) {
                await this.client.sRem(`word:${word}`, docId);
            }
        }

        await this.client.del(key);
    }
}

// Example usage
const search = new SimpleTextSearch(client);

// Index some documents
await search.indexDocument('1', 'Redis Tutorial', 'Redis is an open source in-memory data structure store used as a database cache and message broker');
await search.indexDocument('2', 'Node.js Guide', 'Node.js is a JavaScript runtime built on Chrome V8 JavaScript engine');
await search.indexDocument('3', 'Database Systems', 'Redis and MongoDB are popular NoSQL databases for modern applications');

// Search for documents
const results = await search.search('redis database');
console.log('Search results:', results);
```

### Intermediate Example: Advanced Text Search

```javascript
class AdvancedTextSearch {
    constructor(redisClient) {
        this.client = redisClient;
        this.stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    }

    async indexDocument(docId, title, content, metadata = {}) {
        const key = `doc:${docId}`;

        // Store document with metadata
        const docData = {
            title,
            content,
            metadata: JSON.stringify(metadata),
            indexed_at: new Date().toISOString(),
            word_count: this.countWords(content)
        };

        await this.client.hSet(key, docData);

        // Advanced indexing with term frequency
        const terms = this.extractTerms(`${title} ${content}`);
        const termFreq = {};

        for (const term of terms) {
            termFreq[term] = (termFreq[term] || 0) + 1;
        }

        // Store term frequencies
        for (const [term, freq] of Object.entries(termFreq)) {
            await this.client.hSet(`tf:${docId}`, term, freq.toString());
            await this.client.sAdd(`term:${term}`, docId);
        }

        // Store document length for BM25 scoring
        await this.client.hSet('doc_lengths', docId, terms.length.toString());
    }

    async search(query, options = {}) {
        const {
            limit = 10,
            fuzzy = false,
            phrase = false,
            filters = {}
        } = options;

        let queryTerms = this.extractTerms(query);

        if (queryTerms.length === 0) return [];

        // Apply filters
        let candidateDocs = await this.applyFilters(filters);

        if (candidateDocs === null) {
            // Get documents containing query terms
            const termSets = await Promise.all(
                queryTerms.map(term => this.client.sMembers(`term:${term}`))
            );

            candidateDocs = this.intersectSets(termSets);
        }

        // Score documents
        const scoredResults = await this.scoreDocuments(queryTerms, candidateDocs, phrase);

        // Sort by score and return top results
        return scoredResults
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    async applyFilters(filters) {
        // Implement filtering logic (simplified)
        if (Object.keys(filters).length === 0) return null;

        // This would be more complex in a real implementation
        // For now, return null to use term-based filtering
        return null;
    }

    async scoreDocuments(queryTerms, docIds, phraseSearch = false) {
        const results = [];
        const avgDocLength = await this.getAverageDocLength();

        for (const docId of docIds) {
            const score = await this.calculateBM25Score(docId, queryTerms, avgDocLength);

            if (score > 0) {
                const doc = await this.client.hGetAll(`doc:${docId}`);
                results.push({
                    id: docId,
                    title: doc.title,
                    content: doc.content?.substring(0, 200) + '...' || '',
                    score: score,
                    metadata: doc.metadata ? JSON.parse(doc.metadata) : {}
                });
            }
        }

        return results;
    }

    async calculateBM25Score(docId, queryTerms, avgDocLength) {
        const k1 = 1.5; // BM25 parameters
        const b = 0.75;

        const docLength = parseInt(await this.client.hGet('doc_lengths', docId) || '0');
        if (docLength === 0) return 0;

        let score = 0;
        const termFreqs = await this.client.hGetAll(`tf:${docId}`);

        for (const term of queryTerms) {
            const tf = parseInt(termFreqs[term] || '0');
            const df = await this.client.sCard(`term:${term}`);
            const totalDocs = await this.client.sCard('all_docs');

            if (tf === 0 || df === 0) continue;

            // BM25 scoring formula
            const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5));
            const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLength / avgDocLength)));

            score += idf * tfNorm;
        }

        return score;
    }

    async getAverageDocLength() {
        const lengths = await this.client.hGetAll('doc_lengths');
        const totalLength = Object.values(lengths).reduce((sum, len) => sum + parseInt(len), 0);
        return totalLength / Object.keys(lengths).length || 100;
    }

    extractTerms(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !this.stopWords.has(word))
            .filter((word, index, arr) => arr.indexOf(word) === index);
    }

    countWords(text) {
        return text.split(/\s+/).length;
    }

    intersectSets(sets) {
        if (sets.length === 0) return [];
        if (sets.length === 1) return Array.from(sets[0]);

        let result = new Set(sets[0]);
        for (let i = 1; i < sets.length; i++) {
            result = new Set([...result].filter(x => sets[i].has(x)));
        }

        return Array.from(result);
    }

    async removeDocument(docId) {
        const key = `doc:${docId}`;
        const doc = await this.client.hGetAll(key);

        if (doc.title && doc.content) {
            const terms = this.extractTerms(`${doc.title} ${doc.content}`);
            for (const term of terms) {
                await this.client.sRem(`term:${term}`, docId);
                await this.client.hDel(`tf:${docId}`, term);
            }
        }

        await this.client.del(key);
        await this.client.del(`tf:${docId}`);
        await this.client.hDel('doc_lengths', docId);
        await this.client.sRem('all_docs', docId);
    }
}
```

## Advanced Full-Text Search Features

### Fuzzy Search and Autocomplete

```javascript
class FuzzySearchEngine {
    constructor(redisClient) {
        this.client = redisClient;
        this.maxEdits = 2; // Maximum Levenshtein distance
    }

    async buildFuzzyIndex() {
        // Build a trie-like structure for fuzzy matching
        const allTerms = await this.client.keys('term:*');

        for (const termKey of allTerms) {
            const term = termKey.replace('term:', '');
            await this.addToFuzzyIndex(term);
        }
    }

    async addToFuzzyIndex(term) {
        // Store term variations for fuzzy matching
        const variations = this.generateVariations(term);

        for (const variation of variations) {
            await this.client.sAdd(`fuzzy:${variation}`, term);
        }
    }

    generateVariations(term) {
        const variations = new Set([term]);

        // Generate deletions
        for (let i = 0; i < term.length; i++) {
            variations.add(term.slice(0, i) + term.slice(i + 1));
        }

        // Generate transpositions
        for (let i = 0; i < term.length - 1; i++) {
            const transposed = term.slice(0, i) + term.slice(i + 1, i + 2) + term[i] + term.slice(i + 2);
            variations.add(transposed);
        }

        // Generate replacements and insertions (simplified)
        const alphabet = 'abcdefghijklmnopqrstuvwxyz';
        for (let i = 0; i < term.length; i++) {
            for (const char of alphabet) {
                // Replacement
                variations.add(term.slice(0, i) + char + term.slice(i + 1));
                // Insertion
                variations.add(term.slice(0, i) + char + term.slice(i));
            }
        }

        return Array.from(variations);
    }

    async fuzzySearch(query, maxResults = 10) {
        const queryTerms = query.toLowerCase().split(/\s+/);
        const fuzzyResults = new Set();

        for (const term of queryTerms) {
            // Direct term match
            const directMatches = await this.client.sMembers(`term:${term}`);
            directMatches.forEach(doc => fuzzyResults.add(doc));

            // Fuzzy matches
            const variations = this.generateVariations(term);
            for (const variation of variations.slice(0, 10)) { // Limit variations to check
                const fuzzyMatches = await this.client.sMembers(`fuzzy:${variation}`);
                fuzzyMatches.forEach(doc => fuzzyResults.add(doc));
            }
        }

        // Get document details
        const results = [];
        for (const docId of Array.from(fuzzyResults).slice(0, maxResults)) {
            const doc = await this.client.hGetAll(`doc:${docId}`);
            if (doc.title) {
                results.push({
                    id: docId,
                    title: doc.title,
                    content: doc.content?.substring(0, 200) + '...' || ''
                });
            }
        }

        return results;
    }

    async buildAutocompleteIndex() {
        const allTerms = await this.client.keys('term:*');

        for (const termKey of allTerms) {
            const term = termKey.replace('term:', '');
            await this.addAutocompleteEntry(term);
        }
    }

    async addAutocompleteEntry(term) {
        // Add all prefixes of the term
        for (let i = 1; i <= term.length; i++) {
            const prefix = term.slice(0, i);
            await this.client.sAdd(`autocomplete:${prefix}`, term);
        }
    }

    async autocomplete(prefix, limit = 10) {
        const matches = await this.client.sMembers(`autocomplete:${prefix.toLowerCase()}`);
        return matches.slice(0, limit);
    }
}

// Enhanced search with fuzzy and autocomplete
class EnhancedSearchEngine extends AdvancedTextSearch {
    constructor(redisClient) {
        super(redisClient);
        this.fuzzyEngine = new FuzzySearchEngine(redisClient);
    }

    async search(query, options = {}) {
        const { fuzzy = false, autocomplete = false } = options;

        if (autocomplete) {
            return await this.fuzzyEngine.autocomplete(query, options.limit);
        }

        if (fuzzy) {
            return await this.fuzzyEngine.fuzzySearch(query, options.limit);
        }

        // Use standard search
        return await super.search(query, options);
    }

    async indexDocument(docId, title, content, metadata = {}) {
        await super.indexDocument(docId, title, content, metadata);

        // Add to fuzzy and autocomplete indices
        const terms = this.extractTerms(`${title} ${content}`);
        for (const term of terms) {
            await this.fuzzyEngine.addToFuzzyIndex(term);
            await this.fuzzyEngine.addAutocompleteEntry(term);
        }

        // Track all documents
        await this.client.sAdd('all_docs', docId);
    }
}
```

### Search with Filters and Facets

```javascript
class FacetedSearchEngine extends AdvancedTextSearch {
    constructor(redisClient) {
        super(redisClient);
        this.facets = ['category', 'author', 'year', 'tags'];
    }

    async indexDocument(docId, title, content, metadata = {}) {
        await super.indexDocument(docId, title, content, metadata);

        // Index facets
        for (const facet of this.facets) {
            if (metadata[facet]) {
                const values = Array.isArray(metadata[facet]) ? metadata[facet] : [metadata[facet]];
                for (const value of values) {
                    await this.client.sAdd(`facet:${facet}:${value}`, docId);
                }
            }
        }

        await this.client.sAdd('all_docs', docId);
    }

    async searchWithFacets(query, filters = {}, facets = []) {
        let candidateDocs = await this.getFilteredDocuments(filters);

        if (query) {
            const queryTerms = this.extractTerms(query);
            const termSets = await Promise.all(
                queryTerms.map(term => this.client.sMembers(`term:${term}`))
            );

            const queryDocs = this.intersectSets(termSets);
            candidateDocs = candidateDocs.filter(doc => queryDocs.includes(doc));
        }

        // Get search results
        const results = await this.scoreDocuments(this.extractTerms(query || ''), candidateDocs);

        // Calculate facet counts
        const facetCounts = await this.calculateFacetCounts(candidateDocs, facets);

        return {
            results: results.sort((a, b) => b.score - a.score),
            facets: facetCounts
        };
    }

    async getFilteredDocuments(filters) {
        let filteredDocs = new Set(await this.client.sMembers('all_docs'));

        for (const [facet, values] of Object.entries(filters)) {
            const valueArray = Array.isArray(values) ? values : [values];
            let facetDocs = new Set();

            for (const value of valueArray) {
                const docs = await this.client.sMembers(`facet:${facet}:${value}`);
                docs.forEach(doc => facetDocs.add(doc));
            }

            // Intersect with current filtered docs
            filteredDocs = new Set([...filteredDocs].filter(doc => facetDocs.has(doc)));
        }

        return Array.from(filteredDocs);
    }

    async calculateFacetCounts(documentIds, requestedFacets) {
        const facetCounts = {};

        for (const facet of requestedFacets) {
            facetCounts[facet] = {};

            // Get all possible values for this facet
            const facetKeys = await this.client.keys(`facet:${facet}:*`);

            for (const facetKey of facetKeys) {
                const value = facetKey.replace(`facet:${facet}:`, '');
                const docs = await this.client.sMembers(facetKey);

                // Count how many of the current documents have this facet value
                const count = docs.filter(doc => documentIds.includes(doc)).length;

                if (count > 0) {
                    facetCounts[facet][value] = count;
                }
            }
        }

        return facetCounts;
    }

    async getFacetValues(facet) {
        const facetKeys = await this.client.keys(`facet:${facet}:*`);
        return facetKeys.map(key => key.replace(`facet:${facet}:`, ''));
    }
}
```

### Search Analytics and Suggestions

```javascript
class SearchAnalytics {
    constructor(redisClient) {
        this.client = redisClient;
        this.analyticsKey = 'search_analytics';
    }

    async recordSearch(query, resultsCount, userId = null) {
        const timestamp = Date.now();

        // Record query
        await this.client.zAdd(`${this.analyticsKey}:queries`, [{
            score: timestamp,
            value: JSON.stringify({ query, resultsCount, userId, timestamp })
        }]);

        // Update query frequency
        await this.client.zIncrBy(`${this.analyticsKey}:popular_queries`, 1, query);

        // Record no-results queries
        if (resultsCount === 0) {
            await this.client.sAdd(`${this.analyticsKey}:no_results`, query);
        }

        // Keep only recent data (last 30 days)
        const cutoff = timestamp - (30 * 24 * 60 * 60 * 1000);
        await this.client.zRemRangeByScore(`${this.analyticsKey}:queries`, 0, cutoff);
    }

    async getPopularQueries(limit = 10) {
        const queries = await this.client.zRange(
            `${this.analyticsKey}:popular_queries`,
            -limit,
            -1,
            { WITHSCORES: true, REV: true }
        );

        return queries.map(([query, score]) => ({
            query,
            count: parseInt(score)
        }));
    }

    async getNoResultsQueries() {
        return await this.client.sMembers(`${this.analyticsKey}:no_results`);
    }

    async generateSuggestions(query) {
        const suggestions = new Set();

        // Get similar queries from analytics
        const popularQueries = await this.getPopularQueries(100);

        for (const { query: popularQuery } of popularQueries) {
            if (this.isSimilar(query, popularQuery)) {
                suggestions.add(popularQuery);
            }
        }

        // Add spell corrections
        const corrections = await this.getSpellCorrections(query);
        corrections.forEach(correction => suggestions.add(correction));

        return Array.from(suggestions).slice(0, 5);
    }

    isSimilar(query1, query2) {
        const words1 = query1.toLowerCase().split(/\s+/);
        const words2 = query2.toLowerCase().split(/\s+/);

        const commonWords = words1.filter(word => words2.includes(word));
        return commonWords.length >= Math.min(words1.length, words2.length) * 0.5;
    }

    async getSpellCorrections(query) {
        // Simple spell correction based on popular queries
        const corrections = [];
        const popularQueries = await this.getPopularQueries(50);

        for (const { query: popularQuery } of popularQueries) {
            const distance = this.levenshteinDistance(query, popularQuery);
            if (distance <= 2 && distance > 0) {
                corrections.push(popularQuery);
            }
        }

        return corrections.slice(0, 3);
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }
}

// Search engine with analytics
class AnalyticsEnabledSearch extends FacetedSearchEngine {
    constructor(redisClient) {
        super(redisClient);
        this.analytics = new SearchAnalytics(redisClient);
    }

    async search(query, options = {}) {
        const results = await super.search(query, options);

        // Record search analytics
        await this.analytics.recordSearch(query, results.length, options.userId);

        // Add suggestions if no results
        if (results.length === 0) {
            const suggestions = await this.analytics.generateSuggestions(query);
            return {
                results: [],
                suggestions,
                message: 'No results found. Did you mean:'
            };
        }

        return results;
    }
}
```

## Search Result Highlighting and Snippets

```javascript
class SearchResultHighlighter {
    constructor(redisClient) {
        this.client = redisClient;
    }

    generateSnippet(content, queryTerms, maxLength = 200) {
        const lowerContent = content.toLowerCase();
        const lowerTerms = queryTerms.map(term => term.toLowerCase());

        // Find the best position to start the snippet
        let bestStart = 0;
        let maxMatches = 0;

        for (let i = 0; i <= content.length - maxLength; i += 50) {
            const snippet = content.slice(i, i + maxLength).toLowerCase();
            const matches = lowerTerms.reduce((count, term) => {
                return count + (snippet.split(term).length - 1);
            }, 0);

            if (matches > maxMatches) {
                maxMatches = matches;
                bestStart = i;
            }
        }

        let snippet = content.slice(bestStart, bestStart + maxLength);

        // Add ellipsis if needed
        if (bestStart > 0) snippet = '...' + snippet;
        if (bestStart + maxLength < content.length) snippet = snippet + '...';

        // Highlight query terms
        return this.highlightTerms(snippet, queryTerms);
    }

    highlightTerms(text, queryTerms) {
        let highlighted = text;

        for (const term of queryTerms) {
            const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
            highlighted = highlighted.replace(regex, '**$1**');
        }

        return highlighted;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    async generateHighlightedResults(results, query) {
        const queryTerms = this.extractTerms(query);

        return results.map(result => ({
            ...result,
            highlightedTitle: this.highlightTerms(result.title, queryTerms),
            snippet: this.generateSnippet(result.content, queryTerms)
        }));
    }

    extractTerms(query) {
        return query.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2);
    }
}

// Complete search engine with highlighting
class CompleteSearchEngine extends AnalyticsEnabledSearch {
    constructor(redisClient) {
        super(redisClient);
        this.highlighter = new SearchResultHighlighter(redisClient);
    }

    async search(query, options = {}) {
        const results = await super.search(query, options);

        if (results.results) {
            // No results with suggestions
            return results;
        }

        // Generate highlighted results
        const highlightedResults = await this.highlighter.generateHighlightedResults(
            results,
            query
        );

        return highlightedResults;
    }
}
```

## Best Practices

### Search Index Optimization

```javascript
class OptimizedSearchIndex {
    constructor(redisClient) {
        this.client = redisClient;
        this.batchSize = 1000;
    }

    async bulkIndex(documents) {
        const batches = this.chunkArray(documents, this.batchSize);

        for (const batch of batches) {
            const pipeline = this.client.multi();

            for (const doc of batch) {
                const { id, title, content, metadata } = doc;

                // Queue document storage
                pipeline.hSet(`doc:${id}`, {
                    title,
                    content,
                    metadata: JSON.stringify(metadata || {}),
                    indexed_at: new Date().toISOString()
                });

                // Queue term indexing
                const terms = this.extractTerms(`${title} ${content}`);
                for (const term of terms) {
                    pipeline.sAdd(`term:${term}`, id);
                }

                // Queue document tracking
                pipeline.sAdd('all_docs', id);
            }

            await pipeline.exec();
        }
    }

    async optimizeIndex() {
        // Remove unused terms
        const allTerms = await this.client.keys('term:*');
        const allDocs = new Set(await this.client.sMembers('all_docs'));

        for (const termKey of allTerms) {
            const docs = await this.client.sMembers(termKey);
            const validDocs = docs.filter(doc => allDocs.has(doc));

            if (validDocs.length === 0) {
                await this.client.del(termKey);
            } else if (validDocs.length !== docs.length) {
                // Update the set with only valid docs
                await this.client.del(termKey);
                if (validDocs.length > 0) {
                    await this.client.sAdd(termKey, validDocs);
                }
            }
        }
    }

    async rebuildIndex() {
        // Clear existing index
        const keys = await this.client.keys('term:*');
        keys.push(...await this.client.keys('doc:*'));
        keys.push('all_docs');

        if (keys.length > 0) {
            await this.client.del(keys);
        }

        // Rebuild from all documents
        const allDocs = await this.client.keys('doc:*');
        const documents = [];

        for (const docKey of allDocs) {
            const doc = await this.client.hGetAll(docKey);
            if (doc.title && doc.content) {
                documents.push({
                    id: docKey.replace('doc:', ''),
                    title: doc.title,
                    content: doc.content,
                    metadata: doc.metadata ? JSON.parse(doc.metadata) : {}
                });
            }
        }

        await this.bulkIndex(documents);
    }

    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    extractTerms(text) {
        return text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2)
            .filter((word, index, arr) => arr.indexOf(word) === index);
    }
}
```

### Search Performance Monitoring

```javascript
class SearchPerformanceMonitor {
    constructor(redisClient) {
        this.client = redisClient;
        this.metricsKey = 'search_performance';
    }

    async recordSearchPerformance(query, searchTime, resultsCount) {
        const timestamp = Date.now();

        await this.client.zAdd(`${this.metricsKey}:response_times`, [{
            score: timestamp,
            value: JSON.stringify({ query, searchTime, resultsCount, timestamp })
        }]);

        // Keep only last 1000 performance records
        await this.client.zRemRangeByScore(`${this.metricsKey}:response_times`, 0, timestamp - 3600000);
    }

    async getPerformanceStats() {
        const responseTimes = await this.client.zRange(`${this.metricsKey}:response_times`, 0, -1);

        if (responseTimes.length === 0) return null;

        const times = responseTimes.map(record => {
            const data = JSON.parse(record);
            return data.searchTime;
        });

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const p95Time = this.percentile(times, 95);

        return {
            averageResponseTime: avgTime,
            minResponseTime: minTime,
            maxResponseTime: maxTime,
            p95ResponseTime: p95Time,
            totalSearches: times.length
        };
    }

    percentile(arr, p) {
        const sorted = arr.sort((a, b) => a - b);
        const index = (p / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);

        if (lower === upper) return sorted[lower];

        return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
    }

    async getSlowQueries(threshold = 100) {
        const responseTimes = await this.client.zRange(`${this.metricsKey}:response_times`, 0, -1);

        return responseTimes
            .map(record => JSON.parse(record))
            .filter(data => data.searchTime > threshold)
            .sort((a, b) => b.searchTime - a.searchTime)
            .slice(0, 10);
    }

    async monitorIndexSize() {
        const termKeys = await this.client.keys('term:*');
        const docKeys = await this.client.keys('doc:*');

        let totalIndexSize = 0;
        for (const key of [...termKeys, ...docKeys]) {
            const type = await this.client.type(key);
            if (type === 'set') {
                totalIndexSize += await this.client.sCard(key);
            } else if (type === 'hash') {
                totalIndexSize += Object.keys(await this.client.hGetAll(key)).length;
            }
        }

        return {
            termKeys: termKeys.length,
            docKeys: docKeys.length,
            totalIndexSize
        };
    }
}

// Enhanced search with performance monitoring
class MonitoredSearchEngine extends CompleteSearchEngine {
    constructor(redisClient) {
        super(redisClient);
        this.performanceMonitor = new SearchPerformanceMonitor(redisClient);
    }

    async search(query, options = {}) {
        const startTime = Date.now();
        const results = await super.search(query, options);
        const searchTime = Date.now() - startTime;

        // Record performance
        const resultsCount = results.results ? results.results.length : results.length;
        await this.performanceMonitor.recordSearchPerformance(query, searchTime, resultsCount);

        return results;
    }
}
```

## Conclusion

Redis full-text search enables powerful text search capabilities with high performance. Start with basic term-based search, then add BM25 scoring, fuzzy matching, and faceted search for advanced use cases.

**Beginner Tip:** Use sets to index terms and intersect them for simple Boolean search.

**Advanced Tip:** Implement BM25 scoring and fuzzy matching for production search engines with good relevance.
class TimeSeriesManager {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async addDataPoint(metric, value, timestamp = Date.now(), tags = {}) {
        const key = `metric:${metric}`;

        // Store data point with metadata
        const dataPoint = {
            value,
            timestamp,
            tags: JSON.stringify(tags)
        };

        await this.client.zAdd(key, [{
            score: timestamp,
            value: JSON.stringify(dataPoint)
        }]);

        // Maintain data retention (keep last 10,000 points)
        await this.client.zRemRangeByRank(key, 0, -10001);

        // Update metadata
        await this.updateMetricMetadata(metric, timestamp);
    }

    async getDataPoints(metric, startTime, endTime, limit = 1000) {
        const key = `metric:${metric}`;
        const dataPoints = await this.client.zRangeByScore(
            key,
            startTime,
            endTime,
            { LIMIT: { offset: 0, count: limit } }
        );

        return dataPoints.map(point => JSON.parse(point));
    }

    async getLatestValue(metric) {
        const key = `metric:${metric}`;
        const latest = await this.client.zRange(key, -1, -1);

        if (latest.length === 0) return null;

        return JSON.parse(latest[0]);
    }

    async updateMetricMetadata(metric, timestamp) {
        const metaKey = `meta:${metric}`;
        await this.client.hSet(metaKey, {
            lastUpdate: timestamp.toString(),
            updatedAt: new Date().toISOString()
        });
    }

    async getMetricStats(metric) {
        const key = `metric:${metric}`;
        const count = await this.client.zCard(key);

        if (count === 0) return null;

        const dataPoints = await this.client.zRange(key, 0, -1);
        const values = dataPoints.map(point => JSON.parse(point).value);

        return {
            count,
            min: Math.min(...values),
            max: Math.max(...values),
            average: values.reduce((a, b) => a + b, 0) / values.length,
            latest: values[values.length - 1]
        };
    }
}
```

## Advanced Time Series Patterns

### Downsampling and Aggregation

```javascript
class TimeSeriesAggregator {
    constructor(redisClient) {
        this.client = redisClient;
        this.resolutions = {
            '1m': 60 * 1000,      // 1 minute
            '5m': 5 * 60 * 1000,  // 5 minutes
            '1h': 60 * 60 * 1000, // 1 hour
            '1d': 24 * 60 * 60 * 1000 // 1 day
        };
    }

    async addDataPoint(metric, value, timestamp = Date.now()) {
        // Store raw data
        await this.addRawDataPoint(metric, value, timestamp);

        // Update aggregations for all resolutions
        for (const [resolution, interval] of Object.entries(this.resolutions)) {
            await this.updateAggregation(metric, resolution, value, timestamp, interval);
        }
    }

    async addRawDataPoint(metric, value, timestamp) {
        const key = `raw:${metric}`;
        await this.client.zAdd(key, [{
            score: timestamp,
            value: value.toString()
        }]);

        // Keep raw data for 24 hours
        const cutoff = timestamp - (24 * 60 * 60 * 1000);
        await this.client.zRemRangeByScore(key, 0, cutoff);
    }

    async updateAggregation(metric, resolution, value, timestamp, interval) {
        const bucket = Math.floor(timestamp / interval) * interval;
        const aggKey = `agg:${metric}:${resolution}:${bucket}`;

        // Get existing aggregation or initialize
        const existing = await this.client.hGetAll(aggKey);
        const current = existing.count ? JSON.parse(existing.data) : {
            count: 0,
            sum: 0,
            min: Infinity,
            max: -Infinity,
            first: value,
            last: value
        };

        // Update aggregation
        current.count += 1;
        current.sum += value;
        current.min = Math.min(current.min, value);
        current.max = Math.max(current.max, value);
        current.last = value;

        await this.client.hSet(aggKey, {
            data: JSON.stringify(current),
            timestamp: bucket.toString()
        });

        // Set expiration (keep aggregations for 30 days)
        await this.client.expire(aggKey, 30 * 24 * 60 * 60);
    }

    async getAggregatedData(metric, resolution, startTime, endTime) {
        const interval = this.resolutions[resolution];
        const startBucket = Math.floor(startTime / interval) * interval;
        const endBucket = Math.floor(endTime / interval) * interval;

        const results = [];

        for (let bucket = startBucket; bucket <= endBucket; bucket += interval) {
            const aggKey = `agg:${metric}:${resolution}:${bucket}`;
            const data = await this.client.hGet(aggKey, 'data');

            if (data) {
                const aggregation = JSON.parse(data);
                results.push({
                    timestamp: bucket,
                    ...aggregation,
                    average: aggregation.sum / aggregation.count
                });
            }
        }

        return results;
    }

    async getRawData(metric, startTime, endTime, limit = 1000) {
        const key = `raw:${metric}`;
        const dataPoints = await this.client.zRangeByScore(
            key,
            startTime,
            endTime,
            { LIMIT: { offset: 0, count: limit } }
        );

        return dataPoints.map(point => ({
            timestamp: parseInt(point.split(':')[0]),
            value: parseFloat(point.split(':')[1])
        }));
    }
}
```

### Time Series with Compression

```javascript
class CompressedTimeSeries {
    constructor(redisClient) {
        this.client = redisClient;
        this.compressionThreshold = 1000; // Compress after 1000 points
    }

    async addDataPoint(metric, value, timestamp = Date.now()) {
        const rawKey = `raw:${metric}`;
        const compressedKey = `compressed:${metric}`;

        // Add to raw data
        await this.client.zAdd(rawKey, [{
            score: timestamp,
            value: value.toString()
        }]);

        // Check if we need to compress
        const rawCount = await this.client.zCard(rawKey);
        if (rawCount >= this.compressionThreshold) {
            await this.compressData(metric);
        }
    }

    async compressData(metric) {
        const rawKey = `raw:${metric}`;
        const compressedKey = `compressed:${metric}`;

        // Get all raw data
        const rawData = await this.client.zRange(rawKey, 0, -1, { WITHSCORES: true });

        if (rawData.length < 2) return;

        // Simple delta encoding compression
        const compressed = this.deltaEncode(rawData);

        // Store compressed data
        await this.client.set(compressedKey, JSON.stringify(compressed));

        // Clear raw data
        await this.client.del(rawKey);
    }

    deltaEncode(data) {
        const values = data.map(([value, score]) => ({
            value: parseFloat(value),
            timestamp: parseInt(score)
        }));

        const compressed = {
            baseValue: values[0].value,
            baseTimestamp: values[0].timestamp,
            deltas: []
        };

        for (let i = 1; i < values.length; i++) {
            compressed.deltas.push({
                valueDelta: values[i].value - values[i-1].value,
                timeDelta: values[i].timestamp - values[i-1].timestamp
            });
        }

        return compressed;
    }

    async getDataPoints(metric, startTime, endTime) {
        const compressedKey = `compressed:${metric}`;
        const compressedData = await this.client.get(compressedKey);

        if (!compressedData) {
            // No compressed data, check raw
            return await this.getRawData(metric, startTime, endTime);
        }

        const compressed = JSON.parse(compressedData);
        const decompressed = this.deltaDecode(compressed);

        // Filter by time range
        return decompressed.filter(point =>
            point.timestamp >= startTime && point.timestamp <= endTime
        );
    }

    deltaDecode(compressed) {
        const points = [{
            value: compressed.baseValue,
            timestamp: compressed.baseTimestamp
        }];

        let currentValue = compressed.baseValue;
        let currentTime = compressed.baseTimestamp;

        for (const delta of compressed.deltas) {
            currentValue += delta.valueDelta;
            currentTime += delta.timeDelta;

            points.push({
                value: currentValue,
                timestamp: currentTime
            });
        }

        return points;
    }

    async getRawData(metric, startTime, endTime) {
        const rawKey = `raw:${metric}`;
        const data = await this.client.zRangeByScore(rawKey, startTime, endTime);

        return data.map(point => ({
            timestamp: parseInt(point.split(':')[0]),
            value: parseFloat(point.split(':')[1])
        }));
    }
}
```

## Real-Time Analytics and Alerting

### Threshold-Based Alerting

```javascript
class TimeSeriesAlertManager {
    constructor(redisClient) {
        this.client = redisClient;
        this.alerts = new Map();
    }

    async setAlert(metric, condition, threshold, callback, windowMinutes = 5) {
        const alertKey = `alert:${metric}`;
        const alert = {
            condition, // 'above', 'below', 'equals'
            threshold,
            callback,
            windowMinutes,
            active: true,
            createdAt: new Date().toISOString()
        };

        await this.client.set(alertKey, JSON.stringify(alert));

        // Start monitoring
        this.startMonitoring(metric);
    }

    async startMonitoring(metric) {
        if (this.alerts.has(metric)) return;

        const monitor = setInterval(async () => {
            await this.checkAlert(metric);
        }, 60000); // Check every minute

        this.alerts.set(metric, monitor);
    }

    async checkAlert(metric) {
        const alertKey = `alert:${metric}`;
        const alertData = await this.client.get(alertKey);

        if (!alertData) return;

        const alert = JSON.parse(alertData);
        if (!alert.active) return;

        // Get recent data
        const endTime = Date.now();
        const startTime = endTime - (alert.windowMinutes * 60 * 1000);

        const dataPoints = await this.getDataPoints(metric, startTime, endTime);

        if (dataPoints.length === 0) return;

        // Check condition
        const shouldAlert = this.checkCondition(dataPoints, alert);

        if (shouldAlert) {
            try {
                await alert.callback({
                    metric,
                    condition: alert.condition,
                    threshold: alert.threshold,
                    currentValue: dataPoints[dataPoints.length - 1].value,
                    dataPoints,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Alert callback error:', error);
            }
        }
    }

    checkCondition(dataPoints, alert) {
        const values = dataPoints.map(p => p.value);
        const avgValue = values.reduce((a, b) => a + b, 0) / values.length;

        switch (alert.condition) {
            case 'above':
                return avgValue > alert.threshold;
            case 'below':
                return avgValue < alert.threshold;
            case 'equals':
                return Math.abs(avgValue - alert.threshold) < 0.01;
            default:
                return false;
        }
    }

    async removeAlert(metric) {
        const alertKey = `alert:${metric}`;
        await this.client.del(alertKey);

        if (this.alerts.has(metric)) {
            clearInterval(this.alerts.get(metric));
            this.alerts.delete(metric);
        }
    }

    async getDataPoints(metric, startTime, endTime) {
        const key = `metric:${metric}`;
        const dataPoints = await this.client.zRangeByScore(key, startTime, endTime);

        return dataPoints.map(point => JSON.parse(point));
    }
}
```

### Anomaly Detection

```javascript
class AnomalyDetector {
    constructor(redisClient) {
        this.client = redisClient;
        this.baselineWindow = 24 * 60 * 60 * 1000; // 24 hours
        this.sensitivity = 2.0; // Standard deviations
    }

    async detectAnomalies(metric, currentValue, timestamp = Date.now()) {
        // Get baseline data
        const baselineStart = timestamp - this.baselineWindow;
        const baselineData = await this.getDataPoints(metric, baselineStart, timestamp);

        if (baselineData.length < 10) {
            return { isAnomaly: false, reason: 'insufficient_baseline_data' };
        }

        // Calculate statistics
        const values = baselineData.map(p => p.value);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);

        // Check if current value is anomalous
        const zScore = Math.abs(currentValue - mean) / stdDev;
        const isAnomaly = zScore > this.sensitivity;

        return {
            isAnomaly,
            zScore,
            mean,
            stdDev,
            threshold: this.sensitivity,
            currentValue,
            timestamp
        };
    }

    async monitorMetric(metric, callback) {
        // Set up continuous monitoring
        const monitorKey = `monitor:${metric}`;
        await this.client.set(monitorKey, JSON.stringify({
            active: true,
            callback: callback.toString(),
            startedAt: new Date().toISOString()
        }));

        // Start monitoring loop (in production, use a job scheduler)
        setInterval(async () => {
            const latest = await this.getLatestValue(metric);
            if (!latest) return;

            const anomaly = await this.detectAnomalies(metric, latest.value, latest.timestamp);

            if (anomaly.isAnomaly) {
                try {
                    await callback(anomaly);
                } catch (error) {
                    console.error('Anomaly callback error:', error);
                }
            }
        }, 60000); // Check every minute
    }

    async getDataPoints(metric, startTime, endTime) {
        const key = `metric:${metric}`;
        const dataPoints = await this.client.zRangeByScore(key, startTime, endTime);

        return dataPoints.map(point => JSON.parse(point));
    }

    async getLatestValue(metric) {
        const key = `metric:${metric}`;
        const latest = await this.client.zRange(key, -1, -1);

        if (latest.length === 0) return null;

        return JSON.parse(latest[0]);
    }
}
```

## Advanced Time Series Features

### Multi-Metric Analysis

```javascript
class MultiMetricAnalyzer {
    constructor(redisClient) {
        this.client = redisClient;
    }

    async correlateMetrics(metrics, startTime, endTime, windowSize = 60 * 1000) {
        const correlations = {};

        // Get data for all metrics
        const metricData = {};
        for (const metric of metrics) {
            metricData[metric] = await this.getDataPoints(metric, startTime, endTime);
        }

        // Calculate correlations between each pair
        for (let i = 0; i < metrics.length; i++) {
            for (let j = i + 1; j < metrics.length; j++) {
                const metric1 = metrics[i];
                const metric2 = metrics[j];

                const correlation = this.calculateCorrelation(
                    metricData[metric1],
                    metricData[metric2],
                    windowSize
                );

                correlations[`${metric1}:${metric2}`] = correlation;
            }
        }

        return correlations;
    }

    calculateCorrelation(data1, data2, windowSize) {
        // Align data points by time windows
        const alignedData = this.alignTimeSeries(data1, data2, windowSize);

        if (alignedData.length < 2) return 0;

        const values1 = alignedData.map(d => d.value1);
        const values2 = alignedData.map(d => d.value2);

        // Calculate Pearson correlation coefficient
        const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
        const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;

        let numerator = 0;
        let sumSq1 = 0;
        let sumSq2 = 0;

        for (let i = 0; i < alignedData.length; i++) {
            const diff1 = values1[i] - mean1;
            const diff2 = values2[i] - mean2;

            numerator += diff1 * diff2;
            sumSq1 += diff1 * diff1;
            sumSq2 += diff2 * diff2;
        }

        const denominator = Math.sqrt(sumSq1 * sumSq2);

        return denominator === 0 ? 0 : numerator / denominator;
    }

    alignTimeSeries(data1, data2, windowSize) {
        const aligned = [];
        const map2 = new Map(data2.map(d => [Math.floor(d.timestamp / windowSize), d]));

        for (const point1 of data1) {
            const window = Math.floor(point1.timestamp / windowSize);
            const point2 = map2.get(window);

            if (point2) {
                aligned.push({
                    timestamp: window * windowSize,
                    value1: point1.value,
                    value2: point2.value
                });
            }
        }

        return aligned;
    }

    async findOutliers(metrics, startTime, endTime, threshold = 3.0) {
        const outliers = {};

        for (const metric of metrics) {
            const data = await this.getDataPoints(metric, startTime, endTime);
            const values = data.map(d => d.value);

            if (values.length < 2) continue;

            // Calculate IQR for outlier detection
            const sorted = [...values].sort((a, b) => a - b);
            const q1 = sorted[Math.floor(sorted.length * 0.25)];
            const q3 = sorted[Math.floor(sorted.length * 0.75)];
            const iqr = q3 - q1;
            const lowerBound = q1 - (threshold * iqr);
            const upperBound = q3 + (threshold * iqr);

            outliers[metric] = data.filter(d => d.value < lowerBound || d.value > upperBound);
        }

        return outliers;
    }

    async getDataPoints(metric, startTime, endTime) {
        const key = `metric:${metric}`;
        const dataPoints = await this.client.zRangeByScore(key, startTime, endTime);

        return dataPoints.map(point => JSON.parse(point));
    }
}
```

## Time Series Storage Optimization

### Memory-Efficient Storage

```javascript
class OptimizedTimeSeries {
    constructor(redisClient) {
        this.client = redisClient;
        this.chunkSize = 1000; // Points per chunk
        this.compressionEnabled = true;
    }

    async addDataPoint(metric, value, timestamp = Date.now()) {
        const chunkId = Math.floor(timestamp / (24 * 60 * 60 * 1000)); // Daily chunks
        const chunkKey = `chunk:${metric}:${chunkId}`;

        // Add to current chunk
        await this.client.zAdd(chunkKey, [{
            score: timestamp,
            value: value.toString()
        }]);

        // Compress old chunks
        if (this.compressionEnabled) {
            await this.compressOldChunks(metric, chunkId);
        }

        // Update metadata
        await this.updateMetadata(metric, timestamp);
    }

    async compressOldChunks(metric, currentChunkId) {
        // Compress chunks older than 7 days
        const cutoffChunkId = currentChunkId - 7;

        for (let chunkId = cutoffChunkId - 30; chunkId < cutoffChunkId; chunkId++) {
            const chunkKey = `chunk:${metric}:${chunkId}`;
            const compressedKey = `compressed:${chunkKey}`;

            // Check if already compressed
            const exists = await this.client.exists(compressedKey);
            if (exists) continue;

            // Get chunk data
            const data = await this.client.zRange(chunkKey, 0, -1, { WITHSCORES: true });
            if (data.length === 0) continue;

            // Compress using simple delta encoding
            const compressed = this.compressChunk(data);

            // Store compressed version
            await this.client.set(compressedKey, JSON.stringify(compressed));

            // Remove original chunk
            await this.client.del(chunkKey);

            // Set expiration on compressed data (keep for 90 days)
            await this.client.expire(compressedKey, 90 * 24 * 60 * 60);
        }
    }

    compressChunk(data) {
        const points = data.map(([value, score]) => ({
            value: parseFloat(value),
            timestamp: parseInt(score)
        }));

        // Simple delta encoding
        const compressed = {
            baseValue: points[0].value,
            baseTimestamp: points[0].timestamp,
            deltas: []
        };

        for (let i = 1; i < points.length; i++) {
            compressed.deltas.push({
                valueDelta: points[i].value - points[i-1].value,
                timeDelta: points[i].timestamp - points[i-1].timestamp
            });
        }

        return compressed;
    }

    async getDataPoints(metric, startTime, endTime) {
        const startChunk = Math.floor(startTime / (24 * 60 * 60 * 1000));
        const endChunk = Math.floor(endTime / (24 * 60 * 60 * 1000));

        let allPoints = [];

        for (let chunkId = startChunk; chunkId <= endChunk; chunkId++) {
            const chunkKey = `chunk:${metric}:${chunkId}`;
            const compressedKey = `compressed:chunk:${metric}:${chunkId}`;

            let points = [];

            // Try uncompressed chunk first
            const uncompressedData = await this.client.zRangeByScore(chunkKey, startTime, endTime);
            if (uncompressedData.length > 0) {
                points = uncompressedData.map(value => ({
                    value: parseFloat(value),
                    timestamp: parseInt(value.split(':')[1])
                }));
            } else {
                // Try compressed chunk
                const compressedData = await this.client.get(compressedKey);
                if (compressedData) {
                    const decompressed = this.decompressChunk(JSON.parse(compressedData));
                    points = decompressed.filter(p => p.timestamp >= startTime && p.timestamp <= endTime);
                }
            }

            allPoints.push(...points);
        }

        return allPoints.sort((a, b) => a.timestamp - b.timestamp);
    }

    decompressChunk(compressed) {
        const points = [{
            value: compressed.baseValue,
            timestamp: compressed.baseTimestamp
        }];

        let currentValue = compressed.baseValue;
        let currentTime = compressed.baseTimestamp;

        for (const delta of compressed.deltas) {
            currentValue += delta.valueDelta;
            currentTime += delta.timeDelta;

            points.push({
                value: currentValue,
                timestamp: currentTime
            });
        }

        return points;
    }

    async updateMetadata(metric, timestamp) {
        const metaKey = `meta:${metric}`;
        await this.client.hSet(metaKey, {
            lastUpdate: timestamp.toString(),
            totalChunks: await this.getChunkCount(metric)
        });
    }

    async getChunkCount(metric) {
        const pattern = `chunk:${metric}:*`;
        const keys = await this.client.keys(pattern);
        return keys.length;
    }
}
```

## Best Practices

### Data Retention Policies

```javascript
class DataRetentionManager {
    constructor(redisClient) {
        this.client = redisClient;
        this.policies = {
            'raw': 24 * 60 * 60 * 1000,      // 24 hours
            '1m': 7 * 24 * 60 * 60 * 1000,   // 7 days
            '5m': 30 * 24 * 60 * 60 * 1000,  // 30 days
            '1h': 90 * 24 * 60 * 60 * 1000,  // 90 days
            '1d': 365 * 24 * 60 * 60 * 1000   // 1 year
        };
    }

    async applyRetentionPolicy(metric, resolution = 'raw') {
        const cutoff = Date.now() - this.policies[resolution];
        const key = resolution === 'raw' ? `metric:${metric}` : `agg:${metric}:${resolution}`;

        if (resolution === 'raw') {
            // For raw data, remove old points
            await this.client.zRemRangeByScore(key, 0, cutoff);
        } else {
            // For aggregations, remove old aggregation keys
            const aggKeys = await this.client.keys(`${key}:*`);
            for (const aggKey of aggKeys) {
                const timestamp = parseInt(aggKey.split(':').pop());
                if (timestamp < cutoff) {
                    await this.client.del(aggKey);
                }
            }
        }
    }

    async cleanupOldData() {
        // Run periodically to clean up old time series data
        const metrics = await this.client.keys('meta:*');

        for (const metaKey of metrics) {
            const metric = metaKey.replace('meta:', '');
            await this.applyRetentionPolicy(metric, 'raw');
            await this.applyRetentionPolicy(metric, '1m');
            await this.applyRetentionPolicy(metric, '5m');
            await this.applyRetentionPolicy(metric, '1h');
            await this.applyRetentionPolicy(metric, '1d');
        }
    }
}
```

### Performance Monitoring

```javascript
class TimeSeriesMonitor {
    constructor(redisClient) {
        this.client = redisClient;
        this.metricsKey = 'timeseries_metrics';
    }

    async recordOperation(operation, metric, duration, dataPoints = 0) {
        const timestamp = Date.now();

        await this.client.hIncrBy(`${this.metricsKey}:operations`, operation, 1);
        await this.client.zAdd(`${this.metricsKey}:performance`, [{
            score: timestamp,
            value: JSON.stringify({ operation, metric, duration, dataPoints })
        }]);

        // Keep only last 1000 performance records
        await this.client.zRemRangeByRank(`${this.metricsKey}:performance`, 0, -1001);
    }

    async getPerformanceStats() {
        const operations = await this.client.hGetAll(`${this.metricsKey}:operations`);
        const performance = await this.client.zRange(`${this.metricsKey}:performance`, -100, -1);

        const stats = {
            totalOperations: Object.values(operations).reduce((sum, count) => sum + parseInt(count), 0),
            operationBreakdown: Object.fromEntries(
                Object.entries(operations).map(([op, count]) => [op, parseInt(count)])
            ),
            recentPerformance: performance.map(p => JSON.parse(p))
        };

        // Calculate averages
        if (stats.recentPerformance.length > 0) {
            const avgDuration = stats.recentPerformance.reduce((sum, p) => sum + p.duration, 0) /
                              stats.recentPerformance.length;
            stats.averageOperationTime = avgDuration;
        }

        return stats;
    }

    async getStorageStats() {
        const info = await this.client.info('memory');
        const keys = await this.client.keys('*:*');

        const keyTypes = {};
        for (const key of keys) {
            const type = await this.client.type(key);
            keyTypes[type] = (keyTypes[type] || 0) + 1;
        }

        return {
            memoryUsage: info.used_memory_human,
            totalKeys: keys.length,
            keyDistribution: keyTypes
        };
    }
}
```

## Conclusion

Redis time series capabilities enable efficient storage and analysis of temporal data. Start with basic sorted set operations for time-ordered data, then add aggregations, compression, and alerting for production systems.

**Beginner Tip:** Use sorted sets with timestamps as scores for basic time series storage.

**Advanced Tip:** Implement downsampling, compression, and retention policies to manage large-scale time series data efficiently.</content>
<parameter name="filePath">/Users/chhayhong/Desktop/Redis_University/time_series.md