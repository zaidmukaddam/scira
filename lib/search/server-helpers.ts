import 'server-only';

import { getMessageCountAndExtremeSearchByUserId } from '@/lib/db/queries';
import {
  createAnthropicCountKey,
  createGoogleCountKey,
  createExtremeCountKey,
  createMessageCountKey,
  usageCountCache,
} from '@/lib/performance-cache';
import { getComprehensiveUserData, getLightweightUserAuth } from '@/lib/user-data-server';

export async function getCurrentUser() {
  return getComprehensiveUserData();
}

export async function getLightweightUser() {
  return getLightweightUserAuth();
}

export async function getMessageCountAndExtremeSearchByUserIdAction(userId: string): Promise<{
  messageCountResult: { count: number; error: null } | { count: undefined; error: Error };
  extremeSearchUsage: { count: number; error: null } | { count: undefined; error: Error };
  anthropicUsageResult: { count: number; error: null } | { count: undefined; error: Error };
  googleUsageResult: { count: number; error: null } | { count: undefined; error: Error };
}> {
  const messageCacheKey = createMessageCountKey(userId);
  const extremeCacheKey = createExtremeCountKey(userId);
  const anthropicCacheKey = createAnthropicCountKey(userId);
  const googleCacheKey = createGoogleCountKey(userId);
  const messageCached = usageCountCache.get(messageCacheKey);
  const extremeCached = usageCountCache.get(extremeCacheKey);
  const anthropicCached = usageCountCache.get(anthropicCacheKey);
  const googleCached = usageCountCache.get(googleCacheKey);

  if (messageCached !== null && extremeCached !== null && anthropicCached !== null && googleCached !== null) {
    return {
      messageCountResult: { count: messageCached, error: null },
      extremeSearchUsage: { count: extremeCached, error: null },
      anthropicUsageResult: { count: anthropicCached, error: null },
      googleUsageResult: { count: googleCached, error: null },
    };
  }

  try {
    const { messageCount, extremeSearchCount, anthropicCount, googleCount } =
      await getMessageCountAndExtremeSearchByUserId({ userId });

    if (messageCached === null) usageCountCache.set(messageCacheKey, messageCount);
    if (extremeCached === null) usageCountCache.set(extremeCacheKey, extremeSearchCount);
    if (anthropicCached === null) usageCountCache.set(anthropicCacheKey, anthropicCount);
    if (googleCached === null) usageCountCache.set(googleCacheKey, googleCount);

    return {
      messageCountResult: { count: messageCount, error: null },
      extremeSearchUsage: { count: extremeSearchCount, error: null },
      anthropicUsageResult: { count: anthropicCount, error: null },
      googleUsageResult: { count: googleCount, error: null },
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to verify usage limits');

    return {
      messageCountResult: { count: undefined, error },
      extremeSearchUsage: { count: undefined, error },
      anthropicUsageResult: { count: undefined, error },
      googleUsageResult: { count: undefined, error },
    };
  }
}
