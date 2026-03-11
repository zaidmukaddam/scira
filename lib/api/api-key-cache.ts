// VERCEL OPTIMIZATION: Use in-memory cache instead of Redis
// Redis is not configured on Vercel, so we use module-level Map that persists during warm starts
import { memoryCache as cache } from '@/lib/services/memory-cache';
import { validateApiKey as validateApiKeyFromDb, checkRateLimits as checkRateLimitsFromDb } from './api-key-manager';

// OPTIMIZATION: Extend API key cache TTL (keys rarely change)
// In-memory cache is fast and persists during Vercel warm starts
const API_KEY_CACHE_TTL = 3600 * 4; // 4 hours (was 1800 = 30 minutes)
const RATE_LIMIT_CACHE_TTL = 60; // 1 minute (keep short - changes frequently)

interface CachedApiKey {
  id: string;
  userId: string;
  rateLimitRpm: number;
  rateLimitTpd: number;
  allowedModels: string[];
  allowedTools: string[];
  isActive: boolean;
  metadata?: any;
}

interface CachedRateLimit {
  allowed: boolean;
  reason?: string;
  tokensRemaining?: number;
}

/**
 * Validate API key with caching
 */
export async function validateApiKeyWithCache(apiKey: string): Promise<CachedApiKey | null> {
  try {
    // Try to get from cache first
    const cacheKey = `api_key:${apiKey}`;
    const cached = await cache.get(cacheKey, 'auth');

    if (cached) {
      console.log('[API KEY CACHE] Cache hit');
      return cached;
    }

    console.log('[API KEY CACHE] Cache miss, fetching from database');

    // Validate from database
    const keyData = await validateApiKeyFromDb(apiKey);

    if (keyData) {
      // Cache the result (don't cache the hash for security)
      const cacheData: CachedApiKey = {
        id: keyData.id,
        userId: keyData.userId,
        rateLimitRpm: keyData.rateLimitRpm,
        rateLimitTpd: keyData.rateLimitTpd,
        allowedModels: keyData.allowedModels || [],
        allowedTools: keyData.allowedTools || [],
        isActive: keyData.isActive,
        metadata: keyData.metadata,
      };

      await cache.setWithTTL(cacheKey, cacheData, API_KEY_CACHE_TTL);
    }

    return keyData;
  } catch (error) {
    console.error('[API KEY CACHE] Error:', error);
    // Fall back to direct database validation
    return validateApiKeyFromDb(apiKey);
  }
}

/**
 * Check rate limits with caching
 */
export async function checkRateLimitsWithCache(
  apiKeyId: string,
  rateLimitRpm: number,
  rateLimitTpd: number,
): Promise<CachedRateLimit> {
  try {
    // For rate limits, we'll use a shorter cache TTL since they change frequently
    const cacheKey = `rate_limit:${apiKeyId}:${Math.floor(Date.now() / 60000)}`; // Cache per minute
    const cached = await cache.get(cacheKey, 'auth');

    if (cached) {
      console.log('[RATE LIMIT CACHE] Cache hit');
      return cached;
    }

    console.log('[RATE LIMIT CACHE] Cache miss, checking database');

    // Check from database
    const result = await checkRateLimitsFromDb(apiKeyId, rateLimitRpm, rateLimitTpd);

    // Cache the result for a short time
    await cache.setWithTTL(cacheKey, result, RATE_LIMIT_CACHE_TTL);

    return result;
  } catch (error) {
    console.error('[RATE LIMIT CACHE] Error:', error);
    // Fall back to direct database check
    return checkRateLimitsFromDb(apiKeyId, rateLimitRpm, rateLimitTpd);
  }
}

/**
 * Invalidate API key cache (call this when key is updated/deleted)
 */
export async function invalidateApiKeyCache(apiKey: string): Promise<void> {
  try {
    const cacheKey = `api_key:${apiKey}`;
    await cache.del(cacheKey, 'auth');
    console.log('[API KEY CACHE] Invalidated cache for key');
  } catch (error) {
    console.error('[API KEY CACHE] Error invalidating cache:', error);
  }
}

/**
 * Parallel validation of API key and rate limits
 */
export async function validateApiKeyAndRateLimitsParallel(apiKey: string): Promise<{
  keyData: CachedApiKey | null;
  rateLimitCheck: CachedRateLimit | null;
  error?: string;
}> {
  try {
    // First validate the API key
    const keyData = await validateApiKeyWithCache(apiKey);

    if (!keyData) {
      return { keyData: null, rateLimitCheck: null, error: 'Invalid API key' };
    }

    // If we have a valid key, check rate limits in parallel with any other operations
    const rateLimitCheck = await checkRateLimitsWithCache(keyData.id, keyData.rateLimitRpm, keyData.rateLimitTpd);

    return { keyData, rateLimitCheck };
  } catch (error) {
    console.error('[API VALIDATION] Error:', error);
    return {
      keyData: null,
      rateLimitCheck: null,
      error: 'Validation error',
    };
  }
}
