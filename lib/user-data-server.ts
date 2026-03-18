import 'server-only';

import { cache } from 'react';
import { eq, desc } from 'drizzle-orm';
import { subscription, dodosubscription, user } from './db/schema';
import { db, maindb } from './db';
import { auth } from './auth';
import { headers } from 'next/headers';
import { getCustomInstructionsByUserId, getUserPreferencesByUserId } from './db/queries';
import type { CustomInstructions, UserPreferences } from './db/schema';
import { getDodoProStatus, setDodoProStatus, sessionCache, createSessionKey } from './performance-cache';

// Reverse mapping: userId → Set of session tokens, so we can invalidate all sessions when user data changes
const userSessionTokens = new Map<string, Set<string>>();

function createLightweightAuthSessionKey(token: string): string {
  return `lightweight-auth:${token}`;
}

export function invalidateSessionCacheForUser(userId: string): void {
  const tokens = userSessionTokens.get(userId);
  if (tokens) {
    for (const token of tokens) {
      sessionCache.delete(createSessionKey(token));
      sessionCache.delete(createLightweightAuthSessionKey(token));
    }
    userSessionTokens.delete(userId);
  }
}

export function invalidateSessionCacheForToken(token: string): void {
  sessionCache.delete(createSessionKey(token));
  sessionCache.delete(createLightweightAuthSessionKey(token));
  // Clean up reverse map entries for this token
  for (const [userId, tokens] of userSessionTokens.entries()) {
    if (tokens.delete(token) && tokens.size === 0) {
      userSessionTokens.delete(userId);
    }
  }
}
import { all, flow } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';

// Status type literals
export type DodoSubscriptionStatus = 'active' | 'on_hold' | 'cancelled' | 'expired' | 'failed';
export type PolarSubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid';
export type ProSource = 'polar' | 'dodo' | 'none';
export type PlanTier = 'free' | 'pro' | 'max';
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'none';

// Type for dodo subscription data selected from the database
export interface DodoSubscriptionData {
  id: string;
  createdAt: Date;
  status: string; // Using string as DB may have other statuses
  amount: number;
  currency: string;
  interval: string | null;
  intervalCount: number | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  cancelAtPeriodEnd: boolean | null;
  endedAt: Date | null;
  productId: string;
}

// Type for polar subscription data
export interface PolarSubscriptionData {
  id: string;
  productId: string;
  status: string; // Using string as DB may have other statuses
  amount: number;
  currency: string;
  recurringInterval: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
}

// Type for dodo expiration info (matches return of getDodoSubscriptionExpirationInfo)
export interface DodoExpirationInfo {
  subscriptionDate: Date;
  expirationDate: Date;
  daysUntilExpiration: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

function getActiveDodoSubscriptions(subscriptions: DodoSubscriptionData[], now: Date): DodoSubscriptionData[] {
  return subscriptions
    .filter((sub) => {
      const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
      const isWithinPeriod = !periodEnd || periodEnd > now;

      if (sub.status === 'active' && isWithinPeriod) return true;
      if (sub.status === 'cancelled' && sub.cancelAtPeriodEnd === true && isWithinPeriod) return true;

      return false;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function getDodoExpirationInfoFromSubscriptions(
  subscriptions: DodoSubscriptionData[],
  now: Date,
): DodoExpirationInfo | null {
  const activeWithEndDate = getActiveDodoSubscriptions(subscriptions, now).filter((sub) => sub.currentPeriodEnd);

  if (activeWithEndDate.length === 0) return null;

  const mostRecentSubscription = activeWithEndDate[0];
  const expirationDate = new Date(mostRecentSubscription.currentPeriodEnd!);
  const diffTime = expirationDate.getTime() - now.getTime();
  const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    subscriptionDate: mostRecentSubscription.createdAt,
    expirationDate,
    daysUntilExpiration,
    isExpired: daysUntilExpiration <= 0,
    isExpiringSoon: daysUntilExpiration <= 7 && daysUntilExpiration > 0,
  };
}

// Type for dodo subscription details in comprehensive data
export interface DodoSubscriptionDetails {
  hasSubscriptions: boolean;
  expiresAt: Date | null;
  mostRecentSubscription?: Date;
  daysUntilExpiration?: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

// Single comprehensive user data type
export interface ComprehensiveUserData {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  isProUser: boolean;
  isMaxUser: boolean;
  planTier: PlanTier;
  proSource: ProSource;
  subscriptionStatus: SubscriptionStatus;
  polarSubscription?: PolarSubscriptionData;
  dodoSubscription?: DodoSubscriptionDetails;
  subscriptionHistory: DodoSubscriptionData[];
}

// Lightweight user auth type for fast checks
export interface LightweightUserAuth {
  userId: string;
  email: string;
  isProUser: boolean;
  isMaxUser: boolean;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const LIGHTWEIGHT_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes - shorter for lightweight checks
const USER_DATA_CACHE_MAX = 2000;
const LIGHTWEIGHT_AUTH_CACHE_MAX = 3000;
const CUSTOM_INSTRUCTIONS_CACHE_MAX = 2000;
const USER_PREFERENCES_CACHE_MAX = 2000;

type CacheEntry<T> = { value: T; expiresAt: number };

class LruTtlCache<T> {
  private map = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    // Refresh LRU position
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
    if (this.map.size > this.maxSize) {
      const firstKey = this.map.keys().next().value;
      if (firstKey) this.map.delete(firstKey);
    }
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }
}

const userDataCache = new LruTtlCache<ComprehensiveUserData>(USER_DATA_CACHE_MAX);
const lightweightAuthCache = new LruTtlCache<LightweightUserAuth>(LIGHTWEIGHT_AUTH_CACHE_MAX);

// Custom instructions cache (per-user)
const customInstructionsCache = new LruTtlCache<CustomInstructions | null>(CUSTOM_INSTRUCTIONS_CACHE_MAX);
const CUSTOM_INSTRUCTIONS_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// User preferences cache (per-user)
const userPreferencesCache = new LruTtlCache<UserPreferences | null>(USER_PREFERENCES_CACHE_MAX);
const USER_PREFERENCES_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getCachedUserData(userId: string): ComprehensiveUserData | null {
  return userDataCache.get(userId) ?? null;
}

function setCachedUserData(userId: string, data: ComprehensiveUserData): void {
  userDataCache.set(userId, data, CACHE_TTL_MS);
}

export function clearUserDataCache(userId: string): void {
  userDataCache.delete(userId);
  lightweightAuthCache.delete(userId);
  customInstructionsCache.delete(userId);
  userPreferencesCache.delete(userId);
  // Invalidate all session token cache entries for this user so stale Pro status is not served
  invalidateSessionCacheForUser(userId);
}

export function clearAllUserDataCache(): void {
  userDataCache.clear();
  lightweightAuthCache.clear();
  customInstructionsCache.clear();
  userPreferencesCache.clear();
}

function getCachedLightweightAuth(userId: string): LightweightUserAuth | null {
  return lightweightAuthCache.get(userId) ?? null;
}

function setCachedLightweightAuth(userId: string, data: LightweightUserAuth): void {
  lightweightAuthCache.set(userId, data, LIGHTWEIGHT_CACHE_TTL_MS);
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
  if (cached !== undefined) {
    return cached;
  }

  const instructions = await getCustomInstructionsByUserId({ userId });
  customInstructionsCache.set(userId, instructions ?? null, ttlMs);
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
  if (cached !== undefined) {
    return cached;
  }

  const preferences = await getUserPreferencesByUserId({ userId });
  userPreferencesCache.set(userId, preferences ?? null, ttlMs);
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
export const getLightweightUserAuth = cache(async (): Promise<LightweightUserAuth | null> => {
  try {
    const reqHeaders = await headers();

    const session = await auth.api.getSession({
      headers: reqHeaders,
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
        isMaxUser: fullCached.isMaxUser,
      };
      setCachedLightweightAuth(userId, lightweightData);
      return lightweightData;
    }

    // Check dodo status from cache synchronously before starting any DB queries.
    const cachedDodoStatus = getDodoProStatus(userId);

    // Capture the polar rows via closure so we can use the email after flow() completes,
    // even when no task calls $end() (i.e. neither source is Pro).
    let capturedPolarRows: { userId: string; email: string; subscriptionStatus: string | null }[] = [];

    // Run polar subscription check + dodo DB check (on cache miss) in parallel.
    // flow() exits as soon as either source confirms the user is Pro, avoiding
    // the sequential polar → dodo waterfall on cache misses.
    const DODO_MAX_PRODUCT_ID = process.env.DODO_MAX_PRODUCT_ID || process.env.NEXT_PUBLIC_MAX_TIER;

    const flowResult = await flow<{ email: string; isProUser: boolean; isMaxUser: boolean }>(
      {
        async polarQuery() {
          const rows = await db
            .select({
              userId: user.id,
              email: user.email,
              subscriptionStatus: subscription.status,
            })
            .from(user)
            .leftJoin(subscription, eq(subscription.userId, user.id))
            .where(eq(user.id, userId));

          capturedPolarRows = rows.map((r) => ({
            userId: r.userId,
            email: r.email,
            subscriptionStatus: r.subscriptionStatus ?? null,
          }));

          if (!rows.length) return null;

          const hasActive = rows.some((row) => row.subscriptionStatus === 'active');
          if (hasActive) this.$end({ email: rows[0].email, isProUser: true, isMaxUser: false });
          return rows;
        },
        async dodoCheck() {
          if (cachedDodoStatus !== null) {
            const isDodoActive = cachedDodoStatus.isProUser ?? cachedDodoStatus.hasSubscriptions ?? false;
            if (isDodoActive) {
              const isMaxUser = cachedDodoStatus.isMaxUser ?? false;
              const rows = await this.$.polarQuery;
              if (rows?.length) this.$end({ email: rows[0].email, isProUser: true, isMaxUser });
            }
            return isDodoActive;
          }

          // Cache miss: query Dodo DB in parallel with polar
          const recentDodoSubscription = await maindb
            .select({
              currentPeriodEnd: dodosubscription.currentPeriodEnd,
              status: dodosubscription.status,
              cancelAtPeriodEnd: dodosubscription.cancelAtPeriodEnd,
              productId: dodosubscription.productId,
            })
            .from(dodosubscription)
            .where(eq(dodosubscription.userId, userId))
            .orderBy(desc(dodosubscription.createdAt))
            .limit(1);

          let isDodoActive = false;
          let isMaxUser = false;
          if (recentDodoSubscription.length > 0) {
            const sub = recentDodoSubscription[0];
            const now = new Date();
            const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
            const isWithinPeriod = !periodEnd || periodEnd > now;
            isDodoActive =
              (sub.status === 'active' || (sub.status === 'cancelled' && sub.cancelAtPeriodEnd === true)) &&
              isWithinPeriod;
            isMaxUser = isDodoActive && !!DODO_MAX_PRODUCT_ID && sub.productId === DODO_MAX_PRODUCT_ID;
          }
          setDodoProStatus(userId, { isProUser: isDodoActive, hasSubscriptions: isDodoActive, isMaxUser });

          if (isDodoActive) {
            const rows = await this.$.polarQuery;
            if (rows?.length) this.$end({ email: rows[0].email, isProUser: true, isMaxUser });
          }
          return isDodoActive;
        },
      },
      getBetterAllOptions(),
    );

    // flow() returns undefined when neither source is Pro — use the captured polar rows
    // for email (they were already fetched as part of the flow, no extra round-trip).
    if (!flowResult && capturedPolarRows.length === 0) {
      return null; // user not found in DB
    }

    const lightweightData: LightweightUserAuth = {
      userId,
      email: flowResult?.email ?? capturedPolarRows[0]?.email ?? '',
      isProUser: flowResult?.isProUser ?? false,
      isMaxUser: flowResult?.isMaxUser ?? false,
    };

    // Cache by userId (for cross-request reuse)
    setCachedLightweightAuth(userId, lightweightData);

    return lightweightData;
  } catch (error) {
    console.error('Error in lightweight auth check:', error);
    return null;
  }
});

export const getComprehensiveUserData = cache(async (): Promise<ComprehensiveUserData | null> => {
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

    // Fetch base user + Dodo subscription rows in parallel, then derive expiration info locally.
    const { userWithSubscriptions, dodoSubscriptions } = await all(
      {
        async userWithSubscriptions() {
          return maindb
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
        },
        async dodoSubscriptions() {
          // IMPORTANT: Use maindb for critical subscription queries to avoid replication lag
          return maindb
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
        },
      },
      getBetterAllOptions(),
    );

    if (!userWithSubscriptions || userWithSubscriptions.length === 0) {
      return null;
    }

    const userData = userWithSubscriptions[0];

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
    const activeDodoSubscriptions = getActiveDodoSubscriptions(dodoSubscriptions, now);
    const dodoExpirationInfo = getDodoExpirationInfoFromSubscriptions(dodoSubscriptions, now);

    const hasDodoSubscriptions = activeDodoSubscriptions.length > 0;
    let isDodoActive = false;
    let isDodoMax = false;

    const DODO_MAX_PRODUCT_ID = process.env.DODO_MAX_PRODUCT_ID || process.env.NEXT_PUBLIC_MAX_TIER;

    if (hasDodoSubscriptions) {
      const mostRecentSubscription = activeDodoSubscriptions[0];
      // Check if subscription is still within its period
      if (mostRecentSubscription.currentPeriodEnd) {
        isDodoActive = new Date(mostRecentSubscription.currentPeriodEnd) > now;
      } else {
        // If no end date, consider it active
        isDodoActive = true;
      }
      isDodoMax = isDodoActive && !!DODO_MAX_PRODUCT_ID && mostRecentSubscription.productId === DODO_MAX_PRODUCT_ID;
    }

    // Determine overall Pro status and source
    let isProUser = false;
    let isMaxUser = false;
    let proSource: 'polar' | 'dodo' | 'none' = 'none';
    let subscriptionStatus: 'active' | 'canceled' | 'expired' | 'none' = 'none';

    if (isDodoActive && isDodoMax) {
      isProUser = true;
      isMaxUser = true;
      proSource = 'dodo';
      subscriptionStatus = 'active';
    } else if (activePolarSubscription) {
      isProUser = true;
      proSource = 'polar';
      subscriptionStatus = 'active';
    } else if (isDodoActive) {
      isProUser = true;
      isMaxUser = false;
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
    const planTier: PlanTier = isMaxUser ? 'max' : isProUser ? 'pro' : 'free';

    const comprehensiveData: ComprehensiveUserData = {
      id: userData.userId,
      email: userData.email,
      emailVerified: userData.emailVerified,
      name: userData.name || userData.email.split('@')[0], // Fallback to email prefix if name is null
      image: userData.image,
      createdAt: userData.userCreatedAt,
      updatedAt: userData.userUpdatedAt,
      isProUser,
      isMaxUser,
      planTier,
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
});

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
