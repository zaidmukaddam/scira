import { getRedisClient } from '@/lib/redis-config';
import { memoryCache } from './memory-cache';
import { QueryNormalizer } from '@/lib/utils/query-normalizer';

// Category-based TTLs optimized for chatbot use cases
const TTLs = {
  // Real-time data (cache briefly)
  stockData: 60, // 1 minute
  cryptoData: 60, // 1 minute
  flightStatus: 5 * 60, // 5 minutes

  // Semi-static data (cache longer)
  weatherData: 15 * 60, // 15 minutes
  newsResults: 10 * 60, // 10 minutes
  webSearch: 10 * 60, // 10 minutes
  placeData: 30 * 60, // 30 minutes

  // Static data (cache much longer)
  movieData: 24 * 60 * 60, // 24 hours
  translations: 7 * 24 * 60 * 60, // 7 days
  academicPapers: 24 * 60 * 60, // 24 hours

  // User data
  userLocation: 60 * 60, // 1 hour
  userPreferences: 24 * 60 * 60, // 24 hours

  // Auth data
  auth: 5 * 60, // 5 minutes

  // Default
  default: 5 * 60, // 5 minutes
} as const;

export type CacheCategory = keyof typeof TTLs;

// Metrics for monitoring cache performance
class CacheMetrics {
  private hits = 0;
  private misses = 0;
  private errors = 0;
  private categoryHits: Record<string, number> = {};
  private categoryMisses: Record<string, number> = {};

  recordHit(category: string) {
    this.hits++;
    this.categoryHits[category] = (this.categoryHits[category] || 0) + 1;
  }

  recordMiss(category: string) {
    this.misses++;
    this.categoryMisses[category] = (this.categoryMisses[category] || 0) + 1;
  }

  recordError() {
    this.errors++;
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }

  getStats() {
    return {
      total: this.hits + this.misses,
      hits: this.hits,
      misses: this.misses,
      errors: this.errors,
      hitRate: this.getHitRate().toFixed(2) + '%',
      categoryStats: Object.keys({ ...this.categoryHits, ...this.categoryMisses }).map((cat) => ({
        category: cat,
        hits: this.categoryHits[cat] || 0,
        misses: this.categoryMisses[cat] || 0,
        hitRate: this.getCategoryHitRate(cat).toFixed(2) + '%',
      })),
    };
  }

  private getCategoryHitRate(category: string): number {
    const hits = this.categoryHits[category] || 0;
    const misses = this.categoryMisses[category] || 0;
    const total = hits + misses;
    return total > 0 ? (hits / total) * 100 : 0;
  }

  reset() {
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
    this.categoryHits = {};
    this.categoryMisses = {};
  }
}

const metrics = new CacheMetrics();

export class RedisCache {
  async get(key: string, category: CacheCategory = 'default'): Promise<any> {
    try {
      const redis = await getRedisClient();

      // Fallback to memory cache if Redis is not available
      if (!redis) {
        return await memoryCache.get(key, category);
      }

      const fullKey = `${category}:${key}`;
      const value = await redis.get(fullKey);

      if (value) {
        metrics.recordHit(category);
        console.log(`[REDIS HIT] ${fullKey}`);
        try {
          return JSON.parse(value);
        } catch (parseError) {
          console.error('[REDIS ERROR] Failed to parse cached value:', parseError);
          // Delete corrupted cache entry
          await redis.del(fullKey).catch(() => {});
          return null;
        }
      } else {
        metrics.recordMiss(category);
        return null;
      }
    } catch (error) {
      metrics.recordError();
      console.error('[REDIS ERROR]', error);
      // Fallback to memory cache on error
      return await memoryCache.get(key, category);
    }
  }

  async set(key: string, value: any, category: CacheCategory = 'default'): Promise<void> {
    try {
      const redis = await getRedisClient();

      // Fallback to memory cache if Redis is not available
      if (!redis) {
        const ttl = TTLs[category] || TTLs.default;
        await memoryCache.setWithTTL(key, value, ttl);
        return;
      }

      const fullKey = `${category}:${key}`;
      const ttl = TTLs[category] || TTLs.default;

      let stringValue: string;
      try {
        stringValue = JSON.stringify(value);
      } catch (stringifyError) {
        console.error('[REDIS ERROR] Failed to stringify value:', stringifyError);
        return;
      }

      await redis.setEx(fullKey, ttl, stringValue);
      console.log(`[REDIS SET] ${fullKey} (TTL: ${ttl}s)`);

      // Also cache in memory for faster access
      await memoryCache.setWithTTL(key, value, ttl);
    } catch (error) {
      metrics.recordError();
      console.error('[REDIS ERROR]', error);
      // Fallback to memory cache on error
      const ttl = TTLs[category] || TTLs.default;
      await memoryCache.setWithTTL(key, value, ttl);
    }
  }

  async setWithTTL(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      const redis = await getRedisClient();

      // Fallback to memory cache if Redis is not available
      if (!redis) {
        await memoryCache.setWithTTL(key, value, ttlSeconds);
        return;
      }

      await redis.setEx(key, ttlSeconds, JSON.stringify(value));
      console.log(`[REDIS SET] ${key} (TTL: ${ttlSeconds}s)`);

      // Also cache in memory
      await memoryCache.setWithTTL(key, value, ttlSeconds);
    } catch (error) {
      metrics.recordError();
      console.error('[REDIS ERROR]', error);
      // Fallback to memory cache on error
      await memoryCache.setWithTTL(key, value, ttlSeconds);
    }
  }

  async delete(key: string, category?: CacheCategory): Promise<void> {
    try {
      const redis = await getRedisClient();

      const fullKey = category ? `${category}:${key}` : key;

      if (redis) {
        await redis.del(fullKey);
        console.log(`[REDIS DEL] ${fullKey}`);
      }

      // Also delete from memory cache
      await memoryCache.del(key, category);
    } catch (error) {
      console.error('[REDIS ERROR]', error);
    }
  }

  // Alias for delete method
  async del(key: string, category?: CacheCategory): Promise<void> {
    return this.delete(key, category);
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      if (!redis) {
        return;
      }

      // Get all keys matching pattern
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
        console.log(`[REDIS DEL] Deleted ${keys.length} keys matching ${pattern}`);
      }
    } catch (error) {
      console.error('[REDIS ERROR]', error);
    }
  }

  // Get cache statistics
  getMetrics() {
    return metrics.getStats();
  }

  // Reset metrics (useful for testing)
  resetMetrics() {
    metrics.reset();
  }
}

// Export singleton instance
export const cache = new RedisCache();

// Helper function to generate stable cache keys
export function generateCacheKey(toolName: string, params: Record<string, any>): string {
  try {
    // Sort keys to ensure consistent key generation
    const sortedKeys = Object.keys(params).sort();
    const paramStr = sortedKeys
      .map((k) => {
        try {
          const value = params[k];
          // Handle arrays and objects
          if (Array.isArray(value)) {
            return `${k}:${JSON.stringify(value.sort())}`;
          } else if (typeof value === 'object' && value !== null) {
            return `${k}:${JSON.stringify(value)}`;
          }
          return `${k}:${value}`;
        } catch (e) {
          console.warn(`[Cache] Failed to stringify param ${k}:`, e);
          return `${k}:error`;
        }
      })
      .join('|');

    return `${toolName}:${paramStr}`;
  } catch (error) {
    console.error('[Cache] Error generating cache key:', error);
    // Fallback to a simple key based on tool name and timestamp
    return `${toolName}:fallback:${Date.now()}`;
  }
}

// Export metrics for monitoring
export { metrics as cacheMetrics };
