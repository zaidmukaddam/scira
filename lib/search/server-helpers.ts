import 'server-only';

import { getMessageCountAndExtremeSearchByUserId } from '@/lib/db/queries';
import {
  createExtremeCountKey,
  createMessageCountKey,
  usageCountCache,
} from '@/lib/performance-cache';
import {
  getComprehensiveUserData,
  getLightweightUserAuth,
} from '@/lib/user-data-server';

export async function getCurrentUser() {
  return getComprehensiveUserData();
}

export async function getLightweightUser() {
  return getLightweightUserAuth();
}

export async function getMessageCountAndExtremeSearchByUserIdAction(userId: string): Promise<{
  messageCountResult: { count: number; error: null } | { count: undefined; error: Error };
  extremeSearchUsage: { count: number; error: null } | { count: undefined; error: Error };
}> {
  const messageCacheKey = createMessageCountKey(userId);
  const extremeCacheKey = createExtremeCountKey(userId);
  const messageCached = usageCountCache.get(messageCacheKey);
  const extremeCached = usageCountCache.get(extremeCacheKey);

  if (messageCached !== null && extremeCached !== null) {
    return {
      messageCountResult: { count: messageCached, error: null },
      extremeSearchUsage: { count: extremeCached, error: null },
    };
  }

  try {
    const { messageCount, extremeSearchCount } =
      await getMessageCountAndExtremeSearchByUserId({ userId });

    if (messageCached === null) usageCountCache.set(messageCacheKey, messageCount);
    if (extremeCached === null) usageCountCache.set(extremeCacheKey, extremeSearchCount);

    return {
      messageCountResult: { count: messageCount, error: null },
      extremeSearchUsage: { count: extremeSearchCount, error: null },
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to verify usage limits');

    return {
      messageCountResult: { count: undefined, error },
      extremeSearchUsage: { count: undefined, error },
    };
  }
}
