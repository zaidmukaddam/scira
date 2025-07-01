import { Redis } from '@upstash/redis';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { 
  QueryFingerprint, 
  CacheEntry, 
  SemanticSearchResult, 
  SemanticCacheError 
} from '../types';

export class SemanticMatcher {
  private redis: Redis;
  private embeddingModel = 'text-embedding-3-small';
  private indexName = 'scira_cache_embeddings';

  constructor(redis: Redis) {
    this.redis = redis;
    this.initializeVectorIndex();
  }

  /**
   * Generate embedding for a text query
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const { embedding } = await embed({
        model: openai.embedding(this.embeddingModel),
        value: text,
      });
      
      return embedding;
    } catch (error) {
      throw new SemanticCacheError(
        `Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Find similar queries using vector similarity search
   */
  async findSimilarQueries(
    queryEmbedding: number[], 
    threshold: number = 0.85
  ): Promise<SemanticSearchResult[]> {
    try {
      // Use Redis vector search if available, otherwise fall back to manual search
      const results = await this.performVectorSearch(queryEmbedding, threshold);
      return results;
    } catch (error) {
      console.warn('Vector search failed, falling back to manual similarity search:', error);
      return await this.performManualSimilaritySearch(queryEmbedding, threshold);
    }
  }

  /**
   * Index a cache entry with its embedding
   */
  async indexEntry(fingerprint: QueryFingerprint, entry: CacheEntry): Promise<void> {
    if (!fingerprint.embedding) {
      return; // Can't index without embedding
    }

    try {
      const indexKey = `${this.indexName}:${fingerprint.hash}`;
      const indexData = {
        hash: fingerprint.hash,
        embedding: fingerprint.embedding,
        originalQuery: fingerprint.originalQuery,
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        strategy: entry.strategy
      };

      await this.redis.hset(indexKey, indexData);
      
      // Store embedding in a separate key for vector operations
      await this.redis.hset(
        `${this.indexName}:vectors:${fingerprint.hash}`,
        {
          vector: JSON.stringify(fingerprint.embedding),
          metadata: JSON.stringify(indexData)
        }
      );

      // Add to the main index set
      await this.redis.sadd(`${this.indexName}:keys`, fingerprint.hash);

    } catch (error) {
      throw new SemanticCacheError(
        `Failed to index entry: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Remove entry from semantic index
   */
  async removeEntry(hash: string): Promise<void> {
    try {
      await this.redis.del(`${this.indexName}:${hash}`);
      await this.redis.del(`${this.indexName}:vectors:${hash}`);
      await this.redis.srem(`${this.indexName}:keys`, hash);
    } catch (error) {
      console.warn('Failed to remove entry from semantic index:', error);
    }
  }

  /**
   * Clear the entire semantic index
   */
  async clearIndex(): Promise<void> {
    try {
      const keys = await this.redis.smembers(`${this.indexName}:keys`);
      if (keys.length > 0) {
        const pipeline = this.redis.pipeline();
        
        keys.forEach(key => {
          pipeline.del(`${this.indexName}:${key}`);
          pipeline.del(`${this.indexName}:vectors:${key}`);
        });
        
        pipeline.del(`${this.indexName}:keys`);
        await pipeline.exec();
      }
    } catch (error) {
      throw new SemanticCacheError(
        `Failed to clear semantic index: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<{
    totalEntries: number;
    indexSize: number;
    oldestEntry: number;
    newestEntry: number;
  }> {
    try {
      const keys = await this.redis.smembers(`${this.indexName}:keys`);
      let oldestEntry = Date.now();
      let newestEntry = 0;
      let totalSize = 0;

      for (const key of keys) {
        const data = await this.redis.hgetall(`${this.indexName}:${key}`);
        if (data.timestamp) {
          const timestamp = parseInt(data.timestamp as string);
          oldestEntry = Math.min(oldestEntry, timestamp);
          newestEntry = Math.max(newestEntry, timestamp);
        }
        totalSize += JSON.stringify(data).length;
      }

      return {
        totalEntries: keys.length,
        indexSize: totalSize,
        oldestEntry: keys.length > 0 ? oldestEntry : 0,
        newestEntry
      };
    } catch (error) {
      throw new SemanticCacheError(
        `Failed to get index stats: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Initialize vector index (if Redis Stack is available)
   */
  private async initializeVectorIndex(): Promise<void> {
    try {
      // Try to create a vector index (this will fail if Redis Stack is not available)
      await this.redis.call(
        'FT.CREATE',
        this.indexName,
        'ON', 'HASH',
        'PREFIX', '1', `${this.indexName}:vectors:`,
        'SCHEMA',
        'vector', 'VECTOR', 'FLAT', '6', 'TYPE', 'FLOAT32', 'DIM', '1536', 'DISTANCE_METRIC', 'COSINE',
        'metadata', 'TEXT'
      );
      console.log('Vector search index created successfully');
    } catch (error) {
      // Index might already exist or Redis Stack might not be available
      console.log('Vector search not available, using manual similarity search');
    }
  }

  /**
   * Perform vector search using Redis Stack
   */
  private async performVectorSearch(
    queryEmbedding: number[],
    threshold: number
  ): Promise<SemanticSearchResult[]> {
    try {
      const vectorQuery = this.serializeVector(queryEmbedding);
      
      const results = await this.redis.call(
        'FT.SEARCH',
        this.indexName,
        `*=>[KNN 10 @vector $query_vector AS distance]`,
        'PARAMS', '2', 'query_vector', vectorQuery,
        'SORTBY', 'distance',
        'LIMIT', '0', '10',
        'RETURN', '2', 'distance', 'metadata'
      ) as any[];

      return this.parseVectorSearchResults(results, threshold);
    } catch (error) {
      throw new Error(`Vector search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Manual similarity search fallback
   */
  private async performManualSimilaritySearch(
    queryEmbedding: number[],
    threshold: number
  ): Promise<SemanticSearchResult[]> {
    try {
      const keys = await this.redis.smembers(`${this.indexName}:keys`);
      const results: SemanticSearchResult[] = [];

      for (const key of keys) {
        const vectorData = await this.redis.hgetall(`${this.indexName}:vectors:${key}`);
        if (vectorData.vector && vectorData.metadata) {
          const storedVector = JSON.parse(vectorData.vector as string);
          const metadata = JSON.parse(vectorData.metadata as string);
          
          const similarity = this.cosineSimilarity(queryEmbedding, storedVector);
          
          if (similarity >= threshold) {
            // Get the actual cache entry
            const cacheEntry = await this.redis.get(`scira:cache:${metadata.strategy}:${key}`);
            if (cacheEntry) {
              results.push({
                key,
                similarity,
                distance: 1 - similarity,
                entry: JSON.parse(cacheEntry as string)
              });
            }
          }
        }
      }

      // Sort by similarity (highest first)
      return results.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      throw new SemanticCacheError(
        `Manual similarity search failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Serialize vector for Redis
   */
  private serializeVector(vector: number[]): string {
    // Convert to binary format for Redis vector search
    const buffer = new Float32Array(vector);
    return Buffer.from(buffer.buffer).toString('base64');
  }

  /**
   * Parse vector search results from Redis
   */
  private parseVectorSearchResults(results: any[], threshold: number): SemanticSearchResult[] {
    const parsed: SemanticSearchResult[] = [];
    
    // Skip the first element (total count)
    for (let i = 1; i < results.length; i += 2) {
      const key = results[i];
      const fields = results[i + 1];
      
      if (Array.isArray(fields)) {
        let distance = 0;
        let metadata = '';
        
        for (let j = 0; j < fields.length; j += 2) {
          const fieldName = fields[j];
          const fieldValue = fields[j + 1];
          
          if (fieldName === 'distance') {
            distance = parseFloat(fieldValue);
          } else if (fieldName === 'metadata') {
            metadata = fieldValue;
          }
        }
        
        const similarity = 1 - distance;
        if (similarity >= threshold && metadata) {
          try {
            const metadataObj = JSON.parse(metadata);
            parsed.push({
              key: metadataObj.hash,
              similarity,
              distance,
              entry: {} as CacheEntry // Will be populated by the cache manager
            });
          } catch (error) {
            console.warn('Failed to parse metadata:', error);
          }
        }
      }
    }
    
    return parsed;
  }
}