import { db } from '@/lib/db';
import { geminiApiKeys, apiKeyUsage, event } from '@/lib/db/schema';
import { eq, and, desc, asc, gte, lte } from 'drizzle-orm';
import { encrypt, decrypt } from '@/lib/encryption';
import { pusher } from '@/lib/pusher';

interface KeyStats {
  id: string;
  displayName: string | null;
  isActive: boolean;
  isPrimary: boolean;
  enabled: boolean;
  priority: number;
  maskedKey: string;
  usageToday: {
    messageCount: number;
    apiCallCount: number;
    tokensUsed: number;
  };
  lastUsedAt: Date | null;
  lastErrorAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class GeminiKeyManager {
  private static instance: GeminiKeyManager;

  private constructor() {}

  static getInstance(): GeminiKeyManager {
    if (!GeminiKeyManager.instance) {
      GeminiKeyManager.instance = new GeminiKeyManager();
    }
    return GeminiKeyManager.instance;
  }

  async getActiveKey(): Promise<string | null> {
    try {
      const activeKey = await db
        .select()
        .from(geminiApiKeys)
        .where(and(eq(geminiApiKeys.isActive, true), eq(geminiApiKeys.enabled, true)))
        .limit(1)
        .then((rows) => rows[0] || null);

      if (!activeKey) {
        return null;
      }

      return decrypt(activeKey.key);
    } catch (error) {
      console.error('Error getting active key:', error);
      return null;
    }
  }

  async getNextKey(): Promise<string | null> {
    try {
      const keys = await db
        .select()
        .from(geminiApiKeys)
        .where(eq(geminiApiKeys.enabled, true))
        .orderBy(asc(geminiApiKeys.priority))
        .limit(5);

      if (keys.length === 0) {
        return null;
      }

      const activeKey = await db
        .select()
        .from(geminiApiKeys)
        .where(eq(geminiApiKeys.isActive, true))
        .limit(1)
        .then((rows) => rows[0] || null);

      let nextKeyIndex = 0;

      if (activeKey) {
        const currentIndex = keys.findIndex((k) => k.id === activeKey.id);
        nextKeyIndex = (currentIndex + 1) % keys.length;
      }

      const nextKey = keys[nextKeyIndex];
      if (!nextKey) return null;

      return decrypt(nextKey.key);
    } catch (error) {
      console.error('Error getting next key:', error);
      return null;
    }
  }

  async incrementUsage(
    apiKeyId: string,
    messageCount: number = 0,
    apiCallCount: number = 0,
    tokensUsed: number = 0,
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const existingUsage = await db
        .select()
        .from(apiKeyUsage)
        .where(
          and(eq(apiKeyUsage.apiKeyId, apiKeyId), eq(apiKeyUsage.date, today)),
        )
        .limit(1)
        .then((rows) => rows[0] || null);

      if (existingUsage) {
        await db
          .update(apiKeyUsage)
          .set({
            messageCount: existingUsage.messageCount + messageCount,
            apiCallCount: existingUsage.apiCallCount + apiCallCount,
            tokensUsed: existingUsage.tokensUsed + tokensUsed,
            updatedAt: new Date(),
          })
          .where(eq(apiKeyUsage.id, existingUsage.id));
      } else {
        await db.insert(apiKeyUsage).values({
          apiKeyId,
          date: today,
          messageCount,
          apiCallCount,
          tokensUsed,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await db
        .update(geminiApiKeys)
        .set({
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(geminiApiKeys.id, apiKeyId));
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  }

  async isKeyOverQuota(apiKeyId: string): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const usage = await db
        .select()
        .from(apiKeyUsage)
        .where(
          and(eq(apiKeyUsage.apiKeyId, apiKeyId), eq(apiKeyUsage.date, today)),
        )
        .limit(1)
        .then((rows) => rows[0] || null);

      if (!usage) return false;

      return usage.apiCallCount >= 250;
    } catch (error) {
      console.error('Error checking quota:', error);
      return false;
    }
  }

  async rotateToNextKey(): Promise<{ previousKey: string | null; newKey: string | null }> {
    try {
      const activeKey = await db
        .select()
        .from(geminiApiKeys)
        .where(eq(geminiApiKeys.isActive, true))
        .limit(1)
        .then((rows) => rows[0] || null);

      const previousKeyId = activeKey?.id || null;

      const nextKey = await db
        .select()
        .from(geminiApiKeys)
        .where(eq(geminiApiKeys.enabled, true))
        .orderBy(asc(geminiApiKeys.priority))
        .limit(5)
        .then((rows) => {
          if (rows.length === 0) return null;

          if (!activeKey) {
            return rows[0];
          }

          const currentIndex = rows.findIndex((k) => k.id === activeKey.id);
          const nextIndex = (currentIndex + 1) % rows.length;
          return rows[nextIndex];
        });

      if (activeKey) {
        await db
          .update(geminiApiKeys)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(geminiApiKeys.id, activeKey.id));
      }

      if (nextKey) {
        await db
          .update(geminiApiKeys)
          .set({ isActive: true, updatedAt: new Date() })
          .where(eq(geminiApiKeys.id, nextKey.id));

        await db.insert(event).values({
          category: 'system',
          type: 'API_KEY_ROTATION',
          message: `Rotated from key ${activeKey?.id} to ${nextKey.id}`,
          metadata: {
            fromKeyId: activeKey?.id || null,
            toKeyId: nextKey.id,
            reason: 'automatic',
            timestamp: new Date().toISOString(),
          },
          createdAt: new Date(),
        });

        await pusher.trigger('private-admin-events', 'key-rotation', {
          type: 'KEY_ROTATION',
          previousKeyId: activeKey?.id || null,
          newKeyId: nextKey.id,
          timestamp: new Date().toISOString(),
        });
      }

      return {
        previousKey: previousKeyId,
        newKey: nextKey?.id || null,
      };
    } catch (error) {
      console.error('Error rotating key:', error);
      return {
        previousKey: null,
        newKey: null,
      };
    }
  }

  async markKeyError(apiKeyId: string, errorMessage: string): Promise<void> {
    try {
      await db
        .update(geminiApiKeys)
        .set({
          lastErrorAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(geminiApiKeys.id, apiKeyId));

      await db.insert(event).values({
        category: 'system',
        type: 'API_KEY_ERROR',
        message: `API key ${apiKeyId} encountered error: ${errorMessage}`,
        metadata: {
          keyId: apiKeyId,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date(),
      });

      await pusher.trigger('private-admin-events', 'key-error', {
        type: 'KEY_ERROR',
        keyId: apiKeyId,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      const isQuotaError =
        errorMessage.includes('quota') ||
        errorMessage.includes('429') ||
        errorMessage.includes('too many requests');

      if (isQuotaError) {
        const isOverQuota = await this.isKeyOverQuota(apiKeyId);
        if (isOverQuota) {
          await this.rotateToNextKey();
        }
      } else {
        const activeKey = await db
          .select()
          .from(geminiApiKeys)
          .where(eq(geminiApiKeys.isActive, true))
          .limit(1)
          .then((rows) => rows[0] || null);

        if (activeKey?.id === apiKeyId) {
          await this.rotateToNextKey();
        }
      }
    } catch (error) {
      console.error('Error marking key error:', error);
    }
  }

  async testApiKey(key: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + key,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: 'Say "test successful" in one word',
                  },
                ],
              },
            ],
          }),
        },
      );

      if (response.status === 200) {
        return { valid: true };
      } else if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Invalid API key' };
      } else if (response.status === 429) {
        return { valid: true, error: 'Quota exceeded but key is valid' };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          valid: false,
          error: errorData.error?.message || `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async resetDailyCounters(): Promise<void> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split('T')[0];

      await db
        .delete(apiKeyUsage)
        .where(lte(apiKeyUsage.date, yesterdayDate));

      await db.insert(event).values({
        category: 'system',
        type: 'DAILY_RESET',
        message: 'Daily usage counters reset',
        metadata: {
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date(),
      });

      await pusher.trigger('private-admin-events', 'daily-reset', {
        type: 'DAILY_RESET',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error resetting daily counters:', error);
    }
  }

  async getFullStats(): Promise<{
    keys: KeyStats[];
    totalRequests: number;
    totalTokens: number;
    errorRate: number;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const keys = await db.select().from(geminiApiKeys);

      const keyStats: KeyStats[] = await Promise.all(
        keys.map(async (key) => {
          const usage = await db
            .select()
            .from(apiKeyUsage)
            .where(
              and(
                eq(apiKeyUsage.apiKeyId, key.id),
                eq(apiKeyUsage.date, today),
              ),
            )
            .limit(1)
            .then((rows) => rows[0] || null);

          return {
            id: key.id,
            displayName: key.displayName,
            isActive: key.isActive,
            isPrimary: key.isPrimary,
            enabled: key.enabled,
            priority: key.priority,
            maskedKey: key.key.substring(0, 20) + '*'.repeat(Math.max(0, key.key.length - 20)),
            usageToday: {
              messageCount: usage?.messageCount || 0,
              apiCallCount: usage?.apiCallCount || 0,
              tokensUsed: usage?.tokensUsed || 0,
            },
            lastUsedAt: key.lastUsedAt,
            lastErrorAt: key.lastErrorAt,
            createdAt: key.createdAt,
            updatedAt: key.updatedAt,
          };
        }),
      );

      const allUsageToday = await db
        .select()
        .from(apiKeyUsage)
        .where(eq(apiKeyUsage.date, today));

      const totalRequests = allUsageToday.reduce(
        (sum, u) => sum + u.apiCallCount,
        0,
      );
      const totalTokens = allUsageToday.reduce(
        (sum, u) => sum + u.tokensUsed,
        0,
      );

      const recentErrors = await db
        .select()
        .from(event)
        .where(eq(event.type, 'API_KEY_ERROR'))
        .orderBy(desc(event.createdAt))
        .limit(100);

      const errorRate = keys.length > 0 ? (recentErrors.length / (keys.length * 10)) * 100 : 0;

      return {
        keys: keyStats,
        totalRequests,
        totalTokens,
        errorRate: Math.min(errorRate, 100),
      };
    } catch (error) {
      console.error('Error getting full stats:', error);
      return {
        keys: [],
        totalRequests: 0,
        totalTokens: 0,
        errorRate: 0,
      };
    }
  }

  async activateKeyManually(keyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const key = await db
        .select()
        .from(geminiApiKeys)
        .where(eq(geminiApiKeys.id, keyId))
        .limit(1)
        .then((rows) => rows[0] || null);

      if (!key) {
        return { success: false, error: 'Key not found' };
      }

      if (!key.enabled) {
        return { success: false, error: 'Key is disabled' };
      }

      const activeKey = await db
        .select()
        .from(geminiApiKeys)
        .where(eq(geminiApiKeys.isActive, true))
        .limit(1)
        .then((rows) => rows[0] || null);

      if (activeKey) {
        await db
          .update(geminiApiKeys)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(geminiApiKeys.id, activeKey.id));
      }

      await db
        .update(geminiApiKeys)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(geminiApiKeys.id, keyId));

      await db.insert(event).values({
        category: 'system',
        type: 'API_KEY_MANUAL_ACTIVATION',
        message: `Manually activated key ${keyId}`,
        metadata: {
          fromKeyId: activeKey?.id || null,
          toKeyId: keyId,
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date(),
      });

      await pusher.trigger('private-admin-events', 'key-activation', {
        type: 'KEY_ACTIVATION',
        keyId,
        timestamp: new Date().toISOString(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error activating key manually:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const geminiKeyManager = GeminiKeyManager.getInstance();
