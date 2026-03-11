/**
 * In-Memory Cache for Vercel Serverless
 *
 * Uses module-level Map that persists during warm starts
 * Perfect for API key caching in serverless environments
 * No external dependencies (Redis) needed
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;
  private defaultTTL: number; // TTL in seconds

  /**
   * Create a new MemoryCache instance with a default TTL
   * @param defaultTTLSeconds Default TTL in seconds for entries
   */
  constructor(defaultTTLSeconds: number = 3600) {
    this.defaultTTL = defaultTTLSeconds;
  }

  /**
   * Get value from cache (synchronous - for new cache modules)
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value;
  }

  /**
   * Set value in cache with default TTL
   */
  set(key: string, value: T): void {
    const expiresAt = Date.now() + this.defaultTTL * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Set value in cache with custom TTL (synchronous)
   */
  setWithTTL(key: string, value: T, ttlSeconds: number): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(2) + '%' : '0%',
      total,
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Clean up expired entries (run periodically)
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Async methods for backward compatibility with existing code
  /**
   * Get value from cache (async - for backward compatibility)
   * @param key Cache key
   * @param category Optional category prefix
   */
  async getAsync(key: string, category: string = 'default'): Promise<T | null> {
    const fullKey = `${category}:${key}`;
    return this.get(fullKey);
  }

  /**
   * Set value in cache with TTL (async - for backward compatibility)
   */
  async setWithTTLAsync(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.setWithTTL(key, value, ttlSeconds);
  }

  /**
   * Delete from cache (async - for backward compatibility)
   */
  async del(key: string, category?: string): Promise<void> {
    const fullKey = category ? `${category}:${key}` : key;
    this.delete(fullKey);
  }
}

// Create a wrapper class for async compatibility
class AsyncMemoryCache {
  private cache: MemoryCache<any>;

  constructor(cache: MemoryCache<any>) {
    this.cache = cache;
  }

  async get(key: string, category: string = 'default'): Promise<any | null> {
    const fullKey = `${category}:${key}`;
    return this.cache.get(fullKey);
  }

  async setWithTTL(key: string, value: any, ttlSeconds: number): Promise<void> {
    this.cache.setWithTTL(key, value, ttlSeconds);
  }

  async del(key: string, category?: string): Promise<void> {
    const fullKey = category ? `${category}:${key}` : key;
    this.cache.delete(fullKey);
  }

  cleanup(): number {
    return this.cache.cleanup();
  }
}

// Module-level cache - persists across warm starts
// Using default TTL of 3600 seconds (1 hour)
const baseCache = new MemoryCache(3600);
export const memoryCache = new AsyncMemoryCache(baseCache);

// Periodic cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      memoryCache.cleanup();
    },
    5 * 60 * 1000,
  );
}

// Log initialization
console.log('[MEMORY CACHE] Initialized (in-memory caching for Vercel serverless)');
