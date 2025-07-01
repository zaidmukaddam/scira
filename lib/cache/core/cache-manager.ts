import { Redis } from '@upstash/redis';
import { createHash } from 'crypto';
import { 
  CacheEntry, 
  CacheStrategy, 
  CacheStats, 
  CacheConfig, 
  CacheOptions,
  QueryFingerprint,
  CacheError,
  CacheEvent,
  CacheEventType,
  BatchRequest
} from '../types';
import { SemanticMatcher } from '../semantic/similarity-matcher';
import { CacheStrategies } from './cache-strategies';

export class CacheManager {
  private redis: Redis;
  private strategies: Map<string, CacheStrategy>;
  private semanticMatcher: SemanticMatcher;
  private stats: CacheStats;
  private config: CacheConfig;
  private eventListeners: Map<CacheEventType, Array<(event: CacheEvent) => void>>;
  private batchRequests: Map<string, BatchRequest[]>;
  private metricsInterval?: NodeJS.Timeout;

  constructor(config: CacheConfig) {
    this.config = config;
    this.redis = new Redis({
      url: config.redis.url,
      token: config.redis.token,
    });
    
    this.strategies = new Map();
    this.eventListeners = new Map();
    this.batchRequests = new Map();
    
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      averageLatency: 0,
      storageSize: 0,
      evictions: 0,
      lastUpdated: Date.now()
    };

    this.initializeStrategies();
    this.semanticMatcher = new SemanticMatcher(this.redis);
    
    if (config.enableMetrics) {
      this.startMetricsCollection();
    }
  }

  private initializeStrategies(): void {
    const defaultStrategies = CacheStrategies.getDefaultStrategies();
    
    // Load default strategies
    defaultStrategies.forEach(strategy => {
      this.strategies.set(strategy.name, strategy);
    });

    // Load custom strategies from config
    Object.entries(this.config.strategies).forEach(([name, strategy]) => {
      this.strategies.set(name, strategy);
    });
  }

  /**
   * Get data from cache with semantic similarity matching
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const startTime = Date.now();
    const strategy = this.getStrategy(options.strategy);
    
    try {
      // Check for exact match first
      const fingerprint = await this.generateFingerprint(key, strategy);
      let entry = await this.getEntry<T>(fingerprint.hash);

      // If no exact match and semantic search is enabled, try semantic matching
      if (!entry && options.enableSemantic !== false && strategy.type === 'semantic') {
        const semanticResults = await this.semanticMatcher.findSimilarQueries(
          fingerprint.embedding!,
          options.semanticThreshold || strategy.semanticThreshold || 0.85
        );

        if (semanticResults.length > 0) {
          const bestMatch = semanticResults[0];
          entry = bestMatch.entry as CacheEntry<T>;
          
          // Update the cache with the new key pointing to the same data
          if (entry) {
            await this.setEntry(fingerprint.hash, entry, entry.ttl);
          }
        }
      }

      const latency = Date.now() - startTime;
      
      if (entry && !this.isExpired(entry)) {
        this.updateStats('hit', latency);
        this.emitEvent('hit', key, { strategy: strategy.name, latency });
        
        // Call strategy onHit callback
        strategy.onHit?.(key, entry);
        
        return entry.data;
      } else {
        // Remove expired entry
        if (entry && this.isExpired(entry)) {
          await this.delete(key);
        }
        
        this.updateStats('miss', latency);
        this.emitEvent('miss', key, { strategy: strategy.name, latency });
        
        // Call strategy onMiss callback
        strategy.onMiss?.(key);
        
        return null;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitEvent('error', key, { error: errorMessage });
      throw new CacheError(`Failed to get cache entry: ${errorMessage}`, 'GET_ERROR', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Set data in cache with intelligent strategies
   */
  async set<T>(
    key: string, 
    value: T, 
    options: CacheOptions = {}
  ): Promise<void> {
    const strategy = this.getStrategy(options.strategy);
    
    // Check if we should cache this value
    if (strategy.shouldCache && !strategy.shouldCache(key, value)) {
      return;
    }

    try {
      const fingerprint = await this.generateFingerprint(key, strategy);
      const ttl = options.ttl || strategy.defaultTTL;
      
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl,
        fingerprint,
        strategy: strategy.name,
        metadata: options.metadata
      };

      await this.setEntry(fingerprint.hash, entry, ttl);
      
      // Store semantic embedding if this is a semantic strategy
      if (strategy.type === 'semantic' && fingerprint.embedding) {
        await this.semanticMatcher.indexEntry(fingerprint, entry);
      }

      this.emitEvent('set', key, { 
        strategy: strategy.name, 
        ttl,
        size: this.calculateSize(value)
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitEvent('error', key, { error: errorMessage });
      throw new CacheError(`Failed to set cache entry: ${errorMessage}`, 'SET_ERROR', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Delete entry from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const strategy = this.getStrategy();
      const fingerprint = await this.generateFingerprint(key, strategy);
      
      const result = await this.redis.del(fingerprint.hash);
      
      if (result > 0) {
        // Remove from semantic index if applicable
        if (strategy.type === 'semantic') {
          await this.semanticMatcher.removeEntry(fingerprint.hash);
        }
        
        this.emitEvent('delete', key, { strategy: strategy.name });
        return true;
      }
      
      return false;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emitEvent('error', key, { error: errorMessage });
      throw new CacheError(`Failed to delete cache entry: ${errorMessage}`, 'DELETE_ERROR', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Batch get operations for efficiency
   */
  async getBatch<T>(keys: string[], options: CacheOptions = {}): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    
    // Check if we have pending batch requests for deduplication
    const batchId = this.generateBatchId(keys, options);
    if (this.batchRequests.has(batchId)) {
      // Wait for the existing batch to complete
      await this.waitForBatch(batchId);
    }

    const promises = keys.map(async (key) => {
      const value = await this.get<T>(key, options);
      results.set(key, value);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Clear all cache entries or entries matching a pattern
   */
  async clear(pattern?: string): Promise<number> {
    try {
      if (pattern) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          const result = await this.redis.del(...keys);
          this.emitEvent('evict', `pattern:${pattern}`, { count: result });
          return result;
        }
        return 0;
      } else {
        // Clear all cache
        await this.redis.flushall();
        await this.semanticMatcher.clearIndex();
        this.resetStats();
        this.emitEvent('evict', 'all', {});
        return 1;
      }
    } catch (error) {
      throw new CacheError(`Failed to clear cache: ${error.message}`, 'CLEAR_ERROR', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? this.stats.hits / this.stats.totalRequests 
      : 0;
    this.stats.lastUpdated = Date.now();
    return { ...this.stats };
  }

  /**
   * Generate cache key fingerprint with embeddings
   */
  private async generateFingerprint(key: string, strategy: CacheStrategy): Promise<QueryFingerprint> {
    const normalizedKey = this.normalizeKey(key);
    const hash = strategy.customKeyGenerator 
      ? strategy.customKeyGenerator(normalizedKey)
      : createHash('sha256').update(normalizedKey).digest('hex');

    const fingerprint: QueryFingerprint = {
      hash: `scira:cache:${strategy.name}:${hash}`,
      originalQuery: key,
      normalizedQuery: normalizedKey,
      queryType: strategy.type
    };

    // Generate embedding for semantic strategies
    if (strategy.type === 'semantic') {
      try {
        fingerprint.embedding = await this.semanticMatcher.generateEmbedding(normalizedKey);
      } catch (error) {
        console.warn('Failed to generate embedding for semantic cache:', error);
        // Continue without embedding - will fall back to exact matching
      }
    }

    return fingerprint;
  }

  private normalizeKey(key: string): string {
    return key.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private getStrategy(strategyName?: string): CacheStrategy {
    const name = strategyName || this.config.defaultStrategy;
    const strategy = this.strategies.get(name);
    
    if (!strategy) {
      throw new CacheError(`Unknown cache strategy: ${name}`, 'STRATEGY_ERROR');
    }
    
    return strategy;
  }

  private async getEntry<T>(key: string): Promise<CacheEntry<T> | null> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data as string) : null;
  }

  private async setEntry<T>(key: string, entry: CacheEntry<T>, ttl: number): Promise<void> {
    const data = JSON.stringify(entry);
    await this.redis.setex(key, ttl, data);
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > (entry.timestamp + entry.ttl * 1000);
  }

  private updateStats(type: 'hit' | 'miss', latency: number): void {
    this.stats.totalRequests++;
    
    if (type === 'hit') {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }

    // Update average latency
    this.stats.averageLatency = (
      (this.stats.averageLatency * (this.stats.totalRequests - 1)) + latency
    ) / this.stats.totalRequests;
  }

  private emitEvent(type: CacheEventType, key: string, metadata?: Record<string, any>): void {
    const event: CacheEvent = {
      type,
      key,
      timestamp: Date.now(),
      metadata
    };

    const listeners = this.eventListeners.get(type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Cache event listener error:', error);
      }
    });
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      averageLatency: 0,
      storageSize: 0,
      evictions: 0,
      lastUpdated: Date.now()
    };
  }

  private calculateSize(value: any): number {
    return new Blob([JSON.stringify(value)]).size;
  }

  private generateBatchId(keys: string[], options: CacheOptions): string {
    return createHash('md5')
      .update(JSON.stringify({ keys: keys.sort(), options }))
      .digest('hex');
  }

  private async waitForBatch(batchId: string): Promise<void> {
    return new Promise((resolve) => {
      const checkBatch = () => {
        if (!this.batchRequests.has(batchId)) {
          resolve();
        } else {
          setTimeout(checkBatch, 10);
        }
      };
      checkBatch();
    });
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        const info = await this.redis.info();
        // Update storage size and other metrics from Redis info
        this.updateStorageMetrics(info);
      } catch (error) {
        console.error('Failed to collect cache metrics:', error);
      }
    }, this.config.metricsInterval || 60000); // Default 1 minute
  }

  private updateStorageMetrics(info: string): void {
    // Parse Redis INFO output to extract storage metrics
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line.startsWith('used_memory:')) {
        this.stats.storageSize = parseInt(line.split(':')[1], 10);
        break;
      }
    }
  }

  /**
   * Event listener management
   */
  on(eventType: CacheEventType, listener: (event: CacheEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  off(eventType: CacheEventType, listener: (event: CacheEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    this.eventListeners.clear();
    this.batchRequests.clear();
    
    // The Redis client will be garbage collected
  }
}