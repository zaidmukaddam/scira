import 'server-only';

import { eq, and, desc } from 'drizzle-orm';
import { subscription, dodosubscription, user } from './db/schema';
import { getReadReplica, maindb } from './db';
import { auth } from './auth';
import { headers } from 'next/headers';
import { getDodoSubscriptionExpirationInfo } from './db/queries';
import { getCustomInstructionsByUserId, getUserPreferencesByUserId } from './db/queries';
import type { CustomInstructions, UserPreferences } from './db/schema';
import { getDodoProStatus, setDodoProStatus } from './performance-cache';

// Single comprehensive user data type
export type ComprehensiveUserData = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  isProUser: boolean;
  proSource: 'polar' | 'dodo' | 'none';
  subscriptionStatus: 'active' | 'canceled' | 'expired' | 'none';
  polarSubscription?: {
    id: string;
    productId: string;
    status: string;
    amount: number;
    currency: string;
    recurringInterval: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    canceledAt: Date | null;
  };
  dodoSubscription?: {
    hasSubscriptions: boolean;
    expiresAt: Date | null;
    mostRecentSubscription?: Date;
    daysUntilExpiration?: number;
    isExpired: boolean;
    isExpiringSoon: boolean;
  };
  // Subscription history
  subscriptionHistory: any[];
};

// Lightweight user auth type for fast checks
export type LightweightUserAuth = {
  userId: string;
  email: string;
  isProUser: boolean;
};

const userDataCache = new Map<string, { data: ComprehensiveUserData; expiresAt: number }>();
const lightweightAuthCache = new Map<string, { data: LightweightUserAuth; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const LIGHTWEIGHT_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes - shorter for lightweight checks

// Custom instructions cache (per-user)
const customInstructionsCache = new Map<
  string,
  {
    instructions: CustomInstructions | null;
    timestamp: number;
    ttl: number;
  }
>();
const CUSTOM_INSTRUCTIONS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// User preferences cache (per-user)
const userPreferencesCache = new Map<
  string,
  {
    preferences: UserPreferences | null;
    timestamp: number;
    ttl: number;
  }
>();
const USER_PREFERENCES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedUserData(userId: string): ComprehensiveUserData | null {
  const cached = userDataCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  if (cached) {
    userDataCache.delete(userId);
  }
  return null;
}

function setCachedUserData(userId: string, data: ComprehensiveUserData): void {
  userDataCache.set(userId, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearUserDataCache(userId: string): void {
  userDataCache.delete(userId);
  // Also clear lightweight auth cache to avoid stale pro status
  lightweightAuthCache.delete(userId);
  // Clear any per-user custom instructions cache
  customInstructionsCache.delete(userId);
  // Clear any per-user preferences cache
  userPreferencesCache.delete(userId);
}

export function clearAllUserDataCache(): void {
  userDataCache.clear();
  lightweightAuthCache.clear();
  customInstructionsCache.clear();
  userPreferencesCache.clear();
}

function getCachedLightweightAuth(userId: string): LightweightUserAuth | null {
  const cached = lightweightAuthCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  if (cached) {
    lightweightAuthCache.delete(userId);
  }
  return null;
}

function setCachedLightweightAuth(userId: string, data: LightweightUserAuth): void {
  lightweightAuthCache.set(userId, {
    data,
    expiresAt: Date.now() + LIGHTWEIGHT_CACHE_TTL_MS,
  });
}

/**
 * Get custom instructions for a user with in-memory caching.
 * Falls back to DB via getCustomInstructionsByUserId when cache miss/expired.
 */
export async function getCachedCustomInstructionsByUserId(
  userId: string,
  options?: { ttlMs?: number },
): Promise<CustomInstructions | null> {
  const ttlMs = options?.ttlMs ?? CUSTOM_INSTRUCTIONS_CACHE_TTL_MS;
  const cached = customInstructionsCache.get(userId);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.instructions;
  }

  const instructions = await getCustomInstructionsByUserId({ userId });
  customInstructionsCache.set(userId, {
    instructions: instructions ?? null,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
  return instructions ?? null;
}

export function clearCustomInstructionsCache(userId?: string): void {
  if (userId) {
    customInstructionsCache.delete(userId);
  } else {
    customInstructionsCache.clear();
  }
}

/**
 * Get user preferences for a user with in-memory caching.
 * Falls back to DB via getUserPreferencesByUserId when cache miss/expired.
 */
export async function getCachedUserPreferencesByUserId(
  userId: string,
  options?: { ttlMs?: number },
): Promise<UserPreferences | null> {
  const ttlMs = options?.ttlMs ?? USER_PREFERENCES_CACHE_TTL_MS;
  const cached = userPreferencesCache.get(userId);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.preferences;
  }

  const preferences = await getUserPreferencesByUserId({ userId });
  userPreferencesCache.set(userId, {
    preferences: preferences ?? null,
    timestamp: Date.now(),
    ttl: ttlMs,
  });
  return preferences ?? null;
}

export function clearUserPreferencesCache(userId?: string): void {
  if (userId) {
    userPreferencesCache.delete(userId);
  } else {
    userPreferencesCache.clear();
  }
}

/**
 * Lightweight authentication check that only fetches minimal user data.
 * This is much faster than getComprehensiveUserData() and should be used
 * for early auth checks before fetching full user details.
 *
 * @returns Lightweight user auth data or null if not authenticated
 */
export async function getLightweightUserAuth(): Promise<LightweightUserAuth | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return null;
    }

    const userId = session.user.id;

    // Check lightweight cache first
    const cached = getCachedLightweightAuth(userId);
    if (cached) {
      return cached;
    }

    // Check if full user data is cached (reuse it if available)
    const fullCached = getCachedUserData(userId);
    if (fullCached) {
      const lightweightData: LightweightUserAuth = {
        userId: fullCached.id,
        email: fullCached.email,
        isProUser: fullCached.isProUser,
      };
      setCachedLightweightAuth(userId, lightweightData);
      return lightweightData;
    }

    const readDb = getReadReplica();

    // Optimized query: Use JOIN to fetch user + subscription status in a single query
    const result = await readDb
      .select({
        userId: user.id,
        email: user.email,
        subscriptionStatus: subscription.status,
        subscriptionEnd: subscription.currentPeriodEnd,
      })
      .from(user)
      .leftJoin(subscription, eq(subscription.userId, user.id))
      .where(eq(user.id, userId));

    if (!result || result.length === 0) {
      return null;
    }

    // Check for active Polar subscription (quick check)
    const hasActivePolarSub = result.some((row) => row.subscriptionStatus === 'active');

    // For Dodo Subscriptions, check cache first, then DB only if needed
    let isDodoActive = false;

    if (!hasActivePolarSub) {
      // Check cache first (fast path)
      const cachedDodoStatus = getDodoProStatus(userId);
      if (cachedDodoStatus !== null) {
        // Backward compatibility: handle both old (hasSubscriptions) and new (isProUser) cache formats
        isDodoActive = cachedDodoStatus.isProUser ?? cachedDodoStatus.hasSubscriptions ?? false;
      } else {
        // Cache miss: query DB (use maindb to avoid replication lag)
        const recentDodoSubscription = await maindb
          .select({
            createdAt: dodosubscription.createdAt,
            currentPeriodEnd: dodosubscription.currentPeriodEnd,
            status: dodosubscription.status,
            cancelAtPeriodEnd: dodosubscription.cancelAtPeriodEnd,
          })
          .from(dodosubscription)
          .where(eq(dodosubscription.userId, userId))
          .orderBy(desc(dodosubscription.createdAt))
          .limit(1);

        if (recentDodoSubscription.length > 0) {
          const sub = recentDodoSubscription[0];
          const now = new Date();
          const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
          const isWithinPeriod = !periodEnd || periodEnd > now;

          // Check if subscription is active or cancelled but still within period
          if (
            (sub.status === 'active' || (sub.status === 'cancelled' && sub.cancelAtPeriodEnd === true)) &&
            isWithinPeriod
          ) {
            isDodoActive = true;
          }
        }

        // Cache the result for next time
        setDodoProStatus(userId, { isProUser: isDodoActive, hasSubscriptions: isDodoActive });
      }
    }

    const lightweightData: LightweightUserAuth = {
      userId: result[0].userId,
      email: result[0].email,
      isProUser: hasActivePolarSub || isDodoActive,
    };

    // Cache the result
    setCachedLightweightAuth(userId, lightweightData);

    return lightweightData;
  } catch (error) {
    console.error('Error in lightweight auth check:', error);
    return null;
  }
}

export async function getComprehensiveUserData(): Promise<ComprehensiveUserData | null> {
  try {
    // Get session once
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return null;
    }

    const userId = session.user.id;

    // Check cache first
    const cached = getCachedUserData(userId);
    if (cached) {
      return cached;
    }

    // OPTIMIZED: Use JOIN query to reduce DB round trips
    // Fetch user + subscriptions in a single query
    const readDb = getReadReplica();

    const userWithSubscriptions = await readDb
      .select({
        // User fields
        userId: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        image: user.image,
        userCreatedAt: user.createdAt,
        userUpdatedAt: user.updatedAt,
        // Subscription fields (will be null if no subscription)
        subscriptionId: subscription.id,
        subscriptionCreatedAt: subscription.createdAt,
        subscriptionStatus: subscription.status,
        subscriptionAmount: subscription.amount,
        subscriptionCurrency: subscription.currency,
        subscriptionRecurringInterval: subscription.recurringInterval,
        subscriptionCurrentPeriodStart: subscription.currentPeriodStart,
        subscriptionCurrentPeriodEnd: subscription.currentPeriodEnd,
        subscriptionCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        subscriptionCanceledAt: subscription.canceledAt,
        subscriptionProductId: subscription.productId,
      })
      .from(user)
      .leftJoin(subscription, eq(subscription.userId, user.id))
      .where(eq(user.id, userId));

    if (!userWithSubscriptions || userWithSubscriptions.length === 0) {
      return null;
    }

    const userData = userWithSubscriptions[0];

    // Fetch Dodo subscription data separately with optimized query
    // IMPORTANT: Use maindb for critical subscription queries to avoid replication lag
    const dodoSubscriptions = await maindb
      .select({
        id: dodosubscription.id,
        createdAt: dodosubscription.createdAt,
        status: dodosubscription.status,
        amount: dodosubscription.amount,
        currency: dodosubscription.currency,
        interval: dodosubscription.interval,
        intervalCount: dodosubscription.intervalCount,
        currentPeriodStart: dodosubscription.currentPeriodStart,
        currentPeriodEnd: dodosubscription.currentPeriodEnd,
        cancelledAt: dodosubscription.cancelledAt,
        cancelAtPeriodEnd: dodosubscription.cancelAtPeriodEnd,
        endedAt: dodosubscription.endedAt,
        productId: dodosubscription.productId,
      })
      .from(dodosubscription)
      .where(eq(dodosubscription.userId, userId));

    // Calculate expiration info from subscriptions
    const dodoExpirationInfo = await getDodoSubscriptionExpirationInfo({ userId });

    // Process Polar subscriptions from the joined data
    const polarSubscriptions = userWithSubscriptions
      .filter((row) => row.subscriptionId !== null)
      .map((row) => ({
        id: row.subscriptionId!,
        createdAt: row.subscriptionCreatedAt!,
        status: row.subscriptionStatus!,
        amount: row.subscriptionAmount!,
        currency: row.subscriptionCurrency!,
        recurringInterval: row.subscriptionRecurringInterval!,
        currentPeriodStart: row.subscriptionCurrentPeriodStart!,
        currentPeriodEnd: row.subscriptionCurrentPeriodEnd!,
        cancelAtPeriodEnd: row.subscriptionCancelAtPeriodEnd!,
        canceledAt: row.subscriptionCanceledAt,
        productId: row.subscriptionProductId!,
      }));

    // Process Polar subscription
    const activePolarSubscription = polarSubscriptions
      .filter((sub) => sub.status === 'active')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    // Process Dodo Subscriptions
    // Include both active subscriptions and cancelled subscriptions that are still within their paid period
    const now = new Date();
    const activeDodoSubscriptions = dodoSubscriptions
      .filter((sub: any) => {
        const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
        const isWithinPeriod = !periodEnd || periodEnd > now;

        // Active subscription
        if (sub.status === 'active' && isWithinPeriod) {
          return true;
        }

        // Cancelled but still within paid period
        if (
          sub.status === 'cancelled' &&
          sub.cancelAtPeriodEnd === true &&
          isWithinPeriod
        ) {
          return true;
        }

        return false;
      })
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const hasDodoSubscriptions = activeDodoSubscriptions.length > 0;
    let isDodoActive = false;

    if (hasDodoSubscriptions) {
      const mostRecentSubscription = activeDodoSubscriptions[0];
      // Check if subscription is still within its period
      if (mostRecentSubscription.currentPeriodEnd) {
        isDodoActive = new Date(mostRecentSubscription.currentPeriodEnd) > now;
      } else {
        // If no end date, consider it active
        isDodoActive = true;
      }
    }

    // Determine overall Pro status and source
    let isProUser = false;
    let proSource: 'polar' | 'dodo' | 'none' = 'none';
    let subscriptionStatus: 'active' | 'canceled' | 'expired' | 'none' = 'none';

    if (activePolarSubscription) {
      isProUser = true;
      proSource = 'polar';
      subscriptionStatus = 'active';
    } else if (isDodoActive) {
      isProUser = true;
      proSource = 'dodo';
      subscriptionStatus = 'active';
    } else {
      // Check for expired/canceled Polar subscriptions
      const latestPolarSubscription = polarSubscriptions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];

      if (latestPolarSubscription) {
        const now = new Date();
        const isExpired = new Date(latestPolarSubscription.currentPeriodEnd) < now;
        const isCanceled = latestPolarSubscription.status === 'canceled';

        if (isCanceled) {
          subscriptionStatus = 'canceled';
        } else if (isExpired) {
          subscriptionStatus = 'expired';
        }
      }
    }

    // Build comprehensive user data
    const comprehensiveData: ComprehensiveUserData = {
      id: userData.userId,
      email: userData.email,
      emailVerified: userData.emailVerified,
      name: userData.name || userData.email.split('@')[0], // Fallback to email prefix if name is null
      image: userData.image,
      createdAt: userData.userCreatedAt,
      updatedAt: userData.userUpdatedAt,
      isProUser,
      proSource,
      subscriptionStatus,
      subscriptionHistory: dodoSubscriptions,
    };

    // Add Polar subscription details if exists
    if (activePolarSubscription) {
      comprehensiveData.polarSubscription = {
        id: activePolarSubscription.id,
        productId: activePolarSubscription.productId,
        status: activePolarSubscription.status,
        amount: activePolarSubscription.amount,
        currency: activePolarSubscription.currency,
        recurringInterval: activePolarSubscription.recurringInterval,
        currentPeriodStart: activePolarSubscription.currentPeriodStart,
        currentPeriodEnd: activePolarSubscription.currentPeriodEnd,
        cancelAtPeriodEnd: activePolarSubscription.cancelAtPeriodEnd,
        canceledAt: activePolarSubscription.canceledAt,
      };
    }

    // Always add Dodo Subscription details if user has any subscriptions or dodo pro status
    if (dodoSubscriptions.length > 0 || proSource === 'dodo') {
      comprehensiveData.dodoSubscription = {
        hasSubscriptions: hasDodoSubscriptions,
        expiresAt: dodoExpirationInfo?.expirationDate || null,
        mostRecentSubscription: hasDodoSubscriptions ? activeDodoSubscriptions[0].createdAt : undefined,
        daysUntilExpiration: dodoExpirationInfo?.daysUntilExpiration,
        isExpired: dodoExpirationInfo?.isExpired || false,
        isExpiringSoon: dodoExpirationInfo?.isExpiringSoon || false,
      };
    }

    // Cache the result
    setCachedUserData(userId, comprehensiveData);

    return comprehensiveData;
  } catch (error) {
    console.error('Error getting comprehensive user data:', error);
    return null;
  }
}

// Helper functions for backward compatibility and specific use cases
export async function isUserPro(): Promise<boolean> {
  const userData = await getComprehensiveUserData();
  return userData?.isProUser || false;
}

export async function getUserSubscriptionStatus(): Promise<'active' | 'canceled' | 'expired' | 'none'> {
  const userData = await getComprehensiveUserData();
  return userData?.subscriptionStatus || 'none';
}

export async function getProSource(): Promise<'polar' | 'dodo' | 'none'> {
  const userData = await getComprehensiveUserData();
  return userData?.proSource || 'none';
}
