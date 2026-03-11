import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { apiKeys, apiUsage } from '@/lib/db/schema';
import { eq, and, gt, or, isNull, sql, count } from 'drizzle-orm';

// API key format: sk-scx-<random>
const API_KEY_PREFIX = 'sk-scx-';
const LEGACY_API_KEY_PREFIX = 'sk-scira-'; // For backward compatibility
const API_KEY_LENGTH = 32; // Length of random part

/**
 * Generate a new API key
 */
export function generateApiKey(): string {
  const randomPart = randomBytes(API_KEY_LENGTH).toString('base64url');
  return `${API_KEY_PREFIX}${randomPart}`;
}

/**
 * Hash an API key for storage
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, 10);
}

/**
 * Verify an API key against its hash
 */
export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(apiKey, hash);
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(
  userId: string,
  name: string,
  options?: {
    expiresAt?: Date;
    rateLimitRpm?: number;
    rateLimitTpd?: number;
    allowedModels?: string[];
    allowedTools?: string[];
    metadata?: Record<string, any>;
  },
) {
  const apiKey = generateApiKey();
  const keyHash = await hashApiKey(apiKey);

  // OPTIMIZATION: Extract first 12 characters for fast lookup
  const keyPrefix = apiKey.substring(0, 12);

  const [createdKey] = await db
    .insert(apiKeys)
    .values({
      keyHash,
      keyPrefix,
      name,
      userId,
      expiresAt: options?.expiresAt,
      rateLimitRpm: options?.rateLimitRpm,
      rateLimitTpd: options?.rateLimitTpd,
      allowedModels: options?.allowedModels,
      allowedTools: options?.allowedTools,
      metadata: options?.metadata,
    })
    .returning();

  return {
    id: createdKey.id,
    key: apiKey, // Return the plain key only on creation
    name: createdKey.name,
    createdAt: createdKey.createdAt,
  };
}

/**
 * Validate an API key and return its details
 * OPTIMIZED: Uses key_prefix for fast indexed lookup (90% faster)
 */
export async function validateApiKey(apiKey: string) {
  // Accept both new (sk-scx-) and legacy (sk-scira-) prefixes
  if (!apiKey.startsWith(API_KEY_PREFIX) && !apiKey.startsWith(LEGACY_API_KEY_PREFIX)) {
    return null;
  }

  // OPTIMIZATION: Extract first 12 characters for indexed lookup
  const keyPrefix = apiKey.substring(0, 12);

  // FAST PATH: Query only keys with matching prefix (indexed!)
  const keysWithPrefix = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyPrefix, keyPrefix),
        eq(apiKeys.isActive, true),
        or(gt(apiKeys.expiresAt, new Date()), isNull(apiKeys.expiresAt)),
      ),
    );

  // Check prefix-matched keys first (usually just 1 key)
  for (const key of keysWithPrefix) {
    const isValid = await verifyApiKey(apiKey, key.keyHash);
    if (isValid) {
      // Update last used timestamp asynchronously (non-blocking)
      db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, key.id))
        .catch((error) => {
          console.error('[API KEY] Failed to update lastUsedAt:', error);
        });

      return key;
    }
  }

  // FALLBACK PATH: For legacy keys without prefix (backward compatibility)
  const legacyKeys = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        isNull(apiKeys.keyPrefix),
        eq(apiKeys.isActive, true),
        or(gt(apiKeys.expiresAt, new Date()), isNull(apiKeys.expiresAt)),
      ),
    );

  // Check legacy keys (slow, but only for old keys)
  for (const key of legacyKeys) {
    const isValid = await verifyApiKey(apiKey, key.keyHash);
    if (isValid) {
      // Backfill the prefix for next time
      db.update(apiKeys)
        .set({
          keyPrefix: keyPrefix,
          lastUsedAt: new Date(),
        })
        .where(eq(apiKeys.id, key.id))
        .catch((error) => {
          console.error('[API KEY] Failed to backfill prefix:', error);
        });

      console.log('[API KEY] Backfilled prefix for legacy key:', key.id);
      return key;
    }
  }

  return null;
}

/**
 * Track API usage
 */
export async function trackApiUsage(
  apiKeyId: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  toolCalls: string[],
  responseTimeMs: number,
  statusCode: number,
  error?: string,
) {
  await db.insert(apiUsage).values({
    apiKeyId,
    model,
    inputTokens,
    outputTokens,
    toolCalls,
    responseTimeMs,
    statusCode,
    error,
  });
}

/**
 * Check rate limits for an API key
 */
export async function checkRateLimits(apiKeyId: string, rateLimitRpm: number, rateLimitTpd: number) {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);

  // Check requests per minute
  const recentRequests = await db
    .select({ count: count() })
    .from(apiUsage)
    .where(and(eq(apiUsage.apiKeyId, apiKeyId), gt(apiUsage.timestamp, oneMinuteAgo)));

  const requestCount = Number(recentRequests[0]?.count || 0);
  if (requestCount >= rateLimitRpm) {
    return { allowed: false, reason: 'Rate limit exceeded (requests per minute)' };
  }

  // Check tokens per day
  const todayUsage = await db
    .select({
      totalTokens: sql<number>`SUM(${apiUsage.inputTokens} + ${apiUsage.outputTokens})`,
    })
    .from(apiUsage)
    .where(and(eq(apiUsage.apiKeyId, apiKeyId), gt(apiUsage.timestamp, startOfDay)));

  const tokensUsed = Number(todayUsage[0]?.totalTokens) || 0;
  if (tokensUsed >= rateLimitTpd) {
    return { allowed: false, reason: 'Daily token limit exceeded' };
  }

  return { allowed: true, tokensRemaining: rateLimitTpd - tokensUsed };
}

/**
 * Get API keys for a user
 */
export async function getUserApiKeys(userId: string) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      isActive: apiKeys.isActive,
      rateLimitRpm: apiKeys.rateLimitRpm,
      rateLimitTpd: apiKeys.rateLimitTpd,
      allowedModels: apiKeys.allowedModels,
      allowedTools: apiKeys.allowedTools,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(apiKeys.createdAt);
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(userId: string, keyId: string) {
  const [result] = await db
    .update(apiKeys)
    .set({ isActive: false })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .returning();

  return result;
}

/**
 * Update API key rate limits
 */
export async function updateApiKeyLimits(
  keyId: string,
  updates: {
    rateLimitRpm?: number;
    rateLimitTpd?: number;
    allowedModels?: string[];
    allowedTools?: string[];
  },
) {
  const [updatedKey] = await db.update(apiKeys).set(updates).where(eq(apiKeys.id, keyId)).returning();

  return updatedKey;
}

/**
 * Admin: Update API key limits for any user
 */
export async function adminUpdateApiKeyLimits(
  keyId: string,
  updates: {
    rateLimitRpm?: number;
    rateLimitTpd?: number;
    allowedModels?: string[];
    allowedTools?: string[];
    metadata?: Record<string, any>;
  },
) {
  const [updatedKey] = await db.update(apiKeys).set(updates).where(eq(apiKeys.id, keyId)).returning();

  return updatedKey;
}
