'use server';

import { geolocation } from '@vercel/functions';
import { headers } from 'next/headers';
import { getUser } from '@/lib/auth-utils';
import {
  getExtremeSearchCount,
  incrementMessageUsage,
  getMessageCount,
  getHistoricalUsageData,
  getDodoSubscriptionsByUserId,
} from '@/lib/db/queries';
import { usageCountCache, createMessageCountKey, createExtremeCountKey } from '@/lib/performance-cache';
import { getDiscountConfig } from '@/lib/discount';
import { getComprehensiveUserData, isUserPro } from '@/lib/user-data-server';

type DiscountConfigParams = {
  email?: string | null;
  isIndianUser?: boolean;
};

export async function getSubDetails() {
  const userData = await getComprehensiveUserData();

  if (!userData) return { hasSubscription: false };

  return userData.polarSubscription
    ? { hasSubscription: true, subscription: userData.polarSubscription }
    : { hasSubscription: false };
}

export async function getUserMessageCount(providedUser?: any) {
  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    const cacheKey = createMessageCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      console.log('⏱️ [USAGE] getUserMessageCount: cache hit');
      return { count: cached, error: null };
    }

    const start = Date.now();
    const count = await getMessageCount({ userId: user.id });
    console.log(`⏱️ [USAGE] getUserMessageCount: DB usage lookup took ${Date.now() - start}ms`);

    usageCountCache.set(cacheKey, count);
    return { count, error: null };
  } catch (error) {
    console.error('Error getting user message count:', error);
    return { count: 0, error: 'Failed to get message count' };
  }
}

export async function getUserExtremeSearchCount(providedUser?: any) {
  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    const cacheKey = createExtremeCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      console.log('⏱️ [USAGE] getUserExtremeSearchCount: cache hit');
      return { count: cached, error: null };
    }

    const start = Date.now();
    const count = await getExtremeSearchCount({ userId: user.id });
    console.log(`⏱️ [USAGE] getUserExtremeSearchCount: DB usage lookup took ${Date.now() - start}ms`);

    usageCountCache.set(cacheKey, count);
    return { count, error: null };
  } catch (error) {
    console.error('Error getting user extreme search count:', error);
    return { count: 0, error: 'Failed to get extreme search count' };
  }
}

export async function incrementUserMessageCount() {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    await incrementMessageUsage({ userId: user.id });

    const cacheKey = createMessageCountKey(user.id);
    usageCountCache.delete(cacheKey);

    return { success: true, error: null };
  } catch (error) {
    console.error('Error incrementing user message count:', error);
    return { success: false, error: 'Failed to increment message count' };
  }
}

export async function getExtremeSearchUsageCount(providedUser?: any) {
  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    const cacheKey = createExtremeCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      console.log('⏱️ [USAGE] getExtremeSearchUsageCount: cache hit');
      return { count: cached, error: null };
    }

    const start = Date.now();
    const count = await getExtremeSearchCount({ userId: user.id });
    console.log(`⏱️ [USAGE] getExtremeSearchUsageCount: DB usage lookup took ${Date.now() - start}ms`);

    usageCountCache.set(cacheKey, count);
    return { count, error: null };
  } catch (error) {
    console.error('Error getting extreme search usage count:', error);
    return { count: 0, error: 'Failed to get extreme search count' };
  }
}

export async function getDiscountConfigAction(params?: DiscountConfigParams) {
  try {
    let userEmail = params?.email ?? null;

    if (!userEmail) {
      const user = await getComprehensiveUserData();
      userEmail = user?.email ?? null;
    }

    let isIndianUser = params?.isIndianUser;

    if (isIndianUser === undefined) {
      try {
        const headersList = await headers();
        const locationData = geolocation({ headers: headersList });
        const country = (locationData.country || '').toUpperCase();
        isIndianUser = country === 'IN';
      } catch (geoError) {
        console.warn('Geolocation lookup failed in getDiscountConfigAction:', geoError);
        isIndianUser = false;
      }
    }

    return await getDiscountConfig(userEmail ?? undefined, isIndianUser);
  } catch (error) {
    console.error('Error getting discount configuration:', error);
    return { enabled: false };
  }
}

export async function getHistoricalUsage(providedUser?: any, days: number = 30) {
  try {
    const user = providedUser || (await getUser());
    if (!user) return [];

    const months = Math.ceil(days / 30);
    const historicalData = await getHistoricalUsageData({ userId: user.id, months });

    const totalDays = days;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (totalDays - 1));

    const dataMap = new Map<string, number>();
    historicalData.forEach((record) => {
      const dateKey = record.date.toISOString().split('T')[0];
      dataMap.set(dateKey, record.messageCount || 0);
    });

    const completeData = [];
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateKey = currentDate.toISOString().split('T')[0];

      const count = dataMap.get(dateKey) || 0;
      let level: 0 | 1 | 2 | 3 | 4;

      if (count === 0) level = 0;
      else if (count <= 3) level = 1;
      else if (count <= 7) level = 2;
      else if (count <= 12) level = 3;
      else level = 4;

      completeData.push({ date: dateKey, count, level });
    }

    return completeData;
  } catch (error) {
    console.error('Error getting historical usage:', error);
    return [];
  }
}

export async function getProUserStatusOnly(): Promise<boolean> {
  return await isUserPro();
}

export async function getDodoSubscriptionHistory() {
  try {
    const user = await getUser();
    if (!user) return null;

    const subscriptions = await getDodoSubscriptionsByUserId({ userId: user.id });
    return subscriptions;
  } catch (error) {
    console.error('Error getting subscription history:', error);
    return null;
  }
}

export async function getDodoSubscriptionProStatus() {
  const userData = await getComprehensiveUserData();

  if (!userData) return { isProUser: false, hasSubscriptions: false };

  const isDodoProUser = userData.proSource === 'dodo' && userData.isProUser;

  return {
    isProUser: isDodoProUser,
    hasSubscriptions: Boolean(userData.dodoSubscription?.hasSubscriptions),
    expiresAt: userData.dodoSubscription?.expiresAt,
    source: userData.proSource,
    daysUntilExpiration: userData.dodoSubscription?.daysUntilExpiration,
    isExpired: userData.dodoSubscription?.isExpired,
    isExpiringSoon: userData.dodoSubscription?.isExpiringSoon,
  };
}

export async function getDodoSubscriptionExpirationDate() {
  const userData = await getComprehensiveUserData();
  return userData?.dodoSubscription?.expiresAt || null;
}
