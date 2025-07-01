import { NextRequest, NextResponse } from 'next/server';
import { CacheManager } from '../core/cache-manager';
import { CacheMiddlewareOptions, CacheConfig } from '../types';

// Default cache configuration
const defaultCacheConfig: CacheConfig = {
  redis: {
    url: process.env.REDIS_URL || '',
    token: process.env.REDIS_TOKEN,
  },
  strategies: {},
  defaultStrategy: 'semantic',
  enableCompression: true,
  enableMetrics: true,
  metricsInterval: 60000,
  maxCacheSize: 100000000, // 100MB
  cleanupInterval: 3600000, // 1 hour
};

// Global cache manager instance
let cacheManager: CacheManager | null = null;

function getCacheManager(): CacheManager {
  if (!cacheManager) {
    cacheManager = new CacheManager(defaultCacheConfig);
  }
  return cacheManager;
}

/**
 * Wrapper for API routes to add caching
 */
export function withApiCache(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse> | NextResponse,
  options: CacheMiddlewareOptions = {}
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    // Skip caching for non-GET requests by default
    if (req.method !== 'GET' && !options.shouldCache) {
      return handler(req, context);
    }

    const cache = getCacheManager();
    
    // Generate cache key
    const cacheKey = options.keyGenerator 
      ? options.keyGenerator(req) 
      : await generateCacheKey(req);

    try {
      // Try to get from cache first
      const cached = await cache.get(cacheKey, {
        strategy: options.strategy,
        enableSemantic: true
      });

      if (cached) {
        options.onHit?.(cacheKey, cached);
        
        // Return cached response
        return new NextResponse(JSON.stringify(cached), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey.substring(0, 20) + '...'
          }
        });
      }

      // Cache miss - execute the original handler
      options.onMiss?.(cacheKey);
      const response = await handler(req, context);

      // Cache the response if it's successful
      if (response.ok && shouldCacheResponse(response, options)) {
        try {
          const responseData = await response.clone().json();
          
          await cache.set(cacheKey, responseData, {
            strategy: options.strategy,
            ttl: options.ttl,
            metadata: {
              url: req.url,
              method: req.method,
              timestamp: Date.now()
            }
          });
        } catch (error) {
          // Don't fail the request if caching fails
          console.warn('Failed to cache response:', error);
        }
      }

      // Add cache headers
      const headers = new Headers(response.headers);
      headers.set('X-Cache', 'MISS');
      headers.set('X-Cache-Key', cacheKey.substring(0, 20) + '...');

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });

    } catch (error) {
      console.error('Cache wrapper error:', error);
      // Fallback to original handler if caching fails
      return handler(req, context);
    }
  };
}

/**
 * Wrapper for server actions to add caching
 */
export function withServerActionCache<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  options: {
    strategy?: string;
    ttl?: number;
    keyGenerator?: (...args: T) => string;
    shouldCache?: (...args: T) => boolean;
  } = {}
) {
  return async (...args: T): Promise<R> => {
    // Check if we should cache this call
    if (options.shouldCache && !options.shouldCache(...args)) {
      return action(...args);
    }

    const cache = getCacheManager();
    
    // Generate cache key
    const cacheKey = options.keyGenerator 
      ? options.keyGenerator(...args)
      : `action:${action.name}:${JSON.stringify(args)}`;

    try {
      // Try to get from cache first
      const cached = await cache.get<R>(cacheKey, {
        strategy: options.strategy,
        enableSemantic: false // Server actions use exact matching
      });

      if (cached !== null) {
        return cached;
      }

      // Cache miss - execute the original action
      const result = await action(...args);

      // Cache the result
      await cache.set(cacheKey, result, {
        strategy: options.strategy,
        ttl: options.ttl,
        metadata: {
          action: action.name,
          args: args.length,
          timestamp: Date.now()
        }
      });

      return result;

    } catch (error) {
      console.error('Server action cache error:', error);
      // Fallback to original action if caching fails
      return action(...args);
    }
  };
}

/**
 * Generate cache key from request
 */
async function generateCacheKey(req: NextRequest): Promise<string> {
  const url = new URL(req.url);
  const body = req.method !== 'GET' ? await req.clone().text() : '';
  
  const keyData = {
    method: req.method,
    pathname: url.pathname,
    search: url.search,
    body: body || undefined
  };

  // Simple hash function (in production, use crypto.createHash)
  const keyString = JSON.stringify(keyData);
  let hash = 0;
  for (let i = 0; i < keyString.length; i++) {
    const char = keyString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `api:${Math.abs(hash).toString(36)}`;
}

/**
 * Check if response should be cached
 */
function shouldCacheResponse(response: NextResponse, options: CacheMiddlewareOptions): boolean {
  // Don't cache error responses
  if (!response.ok) {
    return false;
  }

  // Custom shouldCache function
  if (options.shouldCache) {
    // Note: We can't easily check req/res in this context, so we use a simplified check
    return true;
  }

  // Default: cache successful responses
  return true;
}

/**
 * Clear cache for a specific pattern
 */
export async function clearCache(pattern?: string): Promise<number> {
  const cache = getCacheManager();
  return cache.clear(pattern);
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  const cache = getCacheManager();
  return cache.getStats();
}

/**
 * Warm up cache with common queries
 */
export async function warmupCache(queries: Array<{ key: string; value: any; options?: any }>) {
  const cache = getCacheManager();
  
  const promises = queries.map(async ({ key, value, options }) => {
    try {
      await cache.set(key, value, options);
    } catch (error) {
      console.warn(`Failed to warm up cache for key ${key}:`, error);
    }
  });

  await Promise.all(promises);
}

// Export cache manager for direct access if needed
export { getCacheManager };