# Gemini API Keys - Integration Examples

## Example 1: Tracking Usage in Search Endpoint

### Before (Current Code)
```typescript
// /app/api/search/route.ts
onFinish: async (event) => {
  if (lightweightUser) {
    await saveMessages({
      messages: messages.map((message) => ({
        // ... message data
      })),
    });
  }
}
```

### After (With Key Tracking)
```typescript
import { geminiKeyManager } from '@/lib/gemini-key-manager';

// At the top of your route handler
let currentApiKeyId: string | null = null;

// In your request handler, get the active key
try {
  const activeKey = await geminiKeyManager.getActiveKey();
  if (activeKey) {
    // Store key ID for tracking later
    const keys = await db.select().from(geminiApiKeys)
      .where(eq(geminiApiKeys.isActive, true))
      .limit(1)
      .then((rows) => rows[0]);
    
    currentApiKeyId = keys?.id ?? null;
  }
} catch (error) {
  console.warn('Failed to get active API key:', error);
}

// In onFinish callback
onFinish: async (event) => {
  if (lightweightUser && currentApiKeyId && event.finishReason === 'stop') {
    after(async () => {
      try {
        // Track usage
        await geminiKeyManager.incrementUsage(
          currentApiKeyId!,
          1, // one user message
          1, // one API call
          event.usage?.totalTokens ?? 0
        );

        // Check if quota exceeded
        const isOverQuota = await geminiKeyManager.isKeyOverQuota(currentApiKeyId!);
        if (isOverQuota) {
          console.log('Key quota exceeded, rotating...');
          await geminiKeyManager.rotateToNextKey();
        }
      } catch (error) {
        console.error('Failed to track API key usage:', error);
      }
    });
  }

  // Continue with existing logic
  if (lightweightUser) {
    await saveMessages({
      messages: messages.map((message) => ({
        // ... existing message data
      })),
    });
  }
}
```

## Example 2: Error Handling with Automatic Rotation

### Handle 401/403 Errors
```typescript
import { geminiKeyManager } from '@/lib/gemini-key-manager';

async function callGeminiWithRotation(activeKey: string, keyId: string, prompt: string) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );

    if (response.status === 200) {
      return await response.json();
    } else if (response.status === 401 || response.status === 403) {
      // Invalid or expired key
      console.error('API key invalid, rotating...');
      await geminiKeyManager.markKeyError(keyId, 'Invalid API key (401/403)');
      
      // Get next key and retry
      const nextKey = await geminiKeyManager.getActiveKey();
      if (nextKey && nextKey !== activeKey) {
        return callGeminiWithRotation(nextKey, keyId, prompt);
      }
      throw new Error('No valid API keys available');
    } else if (response.status === 429) {
      // Rate limit / quota exceeded
      console.error('Quota exceeded, rotating...');
      await geminiKeyManager.rotateToNextKey();
      
      // Retry with new key
      const nextKey = await geminiKeyManager.getActiveKey();
      if (nextKey && nextKey !== activeKey) {
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return callGeminiWithRotation(nextKey, keyId, prompt);
      }
      throw new Error('All API keys have exceeded quota');
    } else {
      throw new Error(`API error: ${response.status}`);
    }
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}
```

### Usage Example
```typescript
const activeKey = await geminiKeyManager.getActiveKey();
const currentKeyId = 'key-1'; // Get from your key lookup

if (activeKey) {
  try {
    const result = await callGeminiWithRotation(activeKey, currentKeyId, userPrompt);
    
    // Track successful usage
    await geminiKeyManager.incrementUsage(currentKeyId, 1, 1, 0);
    
    return result;
  } catch (error) {
    return { error: error.message };
  }
}
```

## Example 3: Using in Server Action

```typescript
// /app/actions.ts
'use server'

import { geminiKeyManager } from '@/lib/gemini-key-manager';
import { db } from '@/lib/db';
import { geminiApiKeys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function generateWithTracking(prompt: string) {
  try {
    // Get active key
    const activeKey = await geminiKeyManager.getActiveKey();
    if (!activeKey) {
      throw new Error('No active API key configured');
    }

    // Get key ID for tracking
    const keyRecord = await db
      .select()
      .from(geminiApiKeys)
      .where(eq(geminiApiKeys.isActive, true))
      .limit(1)
      .then((rows) => rows[0]);

    if (!keyRecord) {
      throw new Error('Could not find active key record');
    }

    // Make API call
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const result = await response.json();

    // Track usage
    await geminiKeyManager.incrementUsage(
      keyRecord.id,
      1, // user messages
      1, // API calls
      result.usageMetadata?.totalTokenCount ?? 0
    );

    return {
      success: true,
      content: result.candidates?.[0]?.content?.parts?.[0]?.text,
      tokens: result.usageMetadata?.totalTokenCount,
    };

  } catch (error) {
    console.error('Generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

## Example 4: Utility Hook for React Components

```typescript
// /hooks/use-gemini-key-manager.ts
'use client'

import { useEffect, useState } from 'react';

interface KeyStatus {
  activeKeyId: string | null;
  usageToday: {
    calls: number;
    remaining: number;
    percentage: number;
  };
  isRotating: boolean;
  lastError: string | null;
}

export function useGeminiKeyManager() {
  const [status, setStatus] = useState<KeyStatus>({
    activeKeyId: null,
    usageToday: { calls: 0, remaining: 250, percentage: 0 },
    isRotating: false,
    lastError: null,
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/admin/api-keys');
        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();
        const activeKey = data.keys.find((k: any) => k.isActive);

        if (activeKey) {
          const calls = activeKey.usageToday.apiCallCount;
          const remaining = Math.max(0, 250 - calls);
          const percentage = (calls / 250) * 100;

          setStatus({
            activeKeyId: activeKey.id,
            usageToday: { calls, remaining, percentage },
            isRotating: false,
            lastError: activeKey.lastErrorAt ? 'Previous error detected' : null,
          });
        }
      } catch (error) {
        setStatus((prev) => ({
          ...prev,
          lastError: 'Failed to fetch key status',
        }));
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Every 10s

    return () => clearInterval(interval);
  }, []);

  const manualRotate = async () => {
    try {
      setStatus((prev) => ({ ...prev, isRotating: true }));

      if (!status.activeKeyId) throw new Error('No active key');

      const response = await fetch(
        `/api/admin/api-keys/${status.activeKeyId}/activate`,
        { method: 'POST' }
      );

      if (!response.ok) throw new Error('Rotation failed');

      // Refetch status
      const statusResponse = await fetch('/api/admin/api-keys');
      if (statusResponse.ok) {
        const data = await statusResponse.json();
        const newActiveKey = data.keys.find((k: any) => k.isActive);
        // Update state...
      }
    } catch (error) {
      setStatus((prev) => ({
        ...prev,
        lastError: error instanceof Error ? error.message : 'Rotation failed',
      }));
    } finally {
      setStatus((prev) => ({ ...prev, isRotating: false }));
    }
  };

  return { status, manualRotate };
}
```

## Example 5: Middleware for Auto-Rotation

```typescript
// /lib/middleware/api-key-middleware.ts
import { geminiKeyManager } from '@/lib/gemini-key-manager';
import { NextRequest, NextResponse } from 'next/server';

export async function withApiKeyTracking(handler: Function) {
  return async (req: NextRequest) => {
    let keyId: string | null = null;

    try {
      // Get active key ID before processing
      const activeKey = await geminiKeyManager.getActiveKey();
      if (activeKey) {
        // Store in request context (if supported by your framework)
        const clonedReq = req.clone();
        (clonedReq as any).geminiKeyId = keyId;
      }

      // Execute handler
      const response = await handler(req);

      // Track usage after successful response
      if (keyId && response.ok) {
        await geminiKeyManager.incrementUsage(keyId, 0, 1, 0);
      }

      return response;
    } catch (error) {
      if (keyId) {
        await geminiKeyManager.markKeyError(
          keyId,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
      throw error;
    }
  };
}
```

## Example 6: Admin Function to Manage Keys

```typescript
// /app/admin/actions.ts
'use server'

import { geminiKeyManager } from '@/lib/gemini-key-manager';
import { getCurrentUser } from '@/app/actions';
import { db } from '@/lib/db';
import { geminiApiKeys } from '@/lib/db/schema';

export async function adminTestAllKeys() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  const keys = await db.select().from(geminiApiKeys);
  const results = [];

  for (const key of keys) {
    const testResult = await geminiKeyManager.testApiKey(key.key);
    results.push({
      id: key.id,
      displayName: key.displayName,
      valid: testResult.valid,
      error: testResult.error,
    });
  }

  return results;
}

export async function adminGetKeyStatistics() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  return await geminiKeyManager.getFullStats();
}

export async function adminRotateToKey(keyId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  return await geminiKeyManager.activateKeyManually(keyId);
}
```

## Example 7: Monitoring & Alerts

```typescript
// /lib/services/key-monitor.ts
import { geminiKeyManager } from '@/lib/gemini-key-manager';
import { db } from '@/lib/db';
import { event } from '@/lib/db/schema';
import { desc, gte, and } from 'drizzle-orm';

export async function checkKeyHealth() {
  const stats = await geminiKeyManager.getFullStats();

  const alerts = [];

  // Check for keys with errors
  stats.keys.forEach((key) => {
    if (key.lastErrorAt) {
      const hoursSinceError =
        (Date.now() - new Date(key.lastErrorAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceError < 1) {
        alerts.push({
          severity: 'warning',
          message: `Key ${key.displayName} had error within last hour`,
          key: key.id,
        });
      }
    }

    // Check for high usage
    const usagePercent = (key.usageToday.apiCallCount / 250) * 100;
    if (usagePercent > 80) {
      alerts.push({
        severity: 'warning',
        message: `Key ${key.displayName} at ${usagePercent.toFixed(0)}% quota`,
        key: key.id,
      });
    }
  });

  // Check for high error rate
  if (stats.errorRate > 5) {
    alerts.push({
      severity: 'critical',
      message: `High error rate detected: ${stats.errorRate.toFixed(1)}%`,
    });
  }

  return alerts;
}

export async function getRotationHistory(days: number = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return await db
    .select()
    .from(event)
    .where(
      and(
        gte(event.createdAt, since),
        // Filter by rotation events
      )
    )
    .orderBy(desc(event.createdAt));
}
```

## Integration Checklist

- [ ] Run `npm run db:push` to create tables
- [ ] Set `ENCRYPTION_KEY` in `.env.local`
- [ ] Set `GEMINI_API_KEY_*` environment variables (at least 1)
- [ ] Run `npm run seed:api-keys` to initialize
- [ ] Import `geminiKeyManager` in your endpoints
- [ ] Add usage tracking in success handlers
- [ ] Add error handling for 401/403/429
- [ ] Test manual activation in admin dashboard
- [ ] Monitor usage with analytics dashboard
- [ ] Set up automatic rotation in production
- [ ] Configure Pusher for real-time updates (optional)

## Testing

### Manual Testing
1. Open admin dashboard at `/admin/api-keys`
2. Add a test API key
3. Click "Test" to verify it works
4. Simulate high usage by calling incrementUsage multiple times
5. Verify automatic rotation when hitting 250 calls

### Automated Testing
```typescript
// /tests/api-keys.test.ts
import { geminiKeyManager } from '@/lib/gemini-key-manager';

describe('GeminiKeyManager', () => {
  it('should rotate keys on quota', async () => {
    // Setup...
    // Increment usage to 250
    // Assert rotation occurred
  });

  it('should handle invalid keys', async () => {
    // Test with invalid key
    // Assert error handling
  });
});
```

## Support

For issues:
1. Check `/admin/api-keys` analytics tab for errors
2. Look at database event table for rotation logs
3. Review console logs for detailed error messages
4. Test individual keys using dashboard "Test" button
