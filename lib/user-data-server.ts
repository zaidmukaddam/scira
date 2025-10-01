import 'server-only';

import { eq, and, desc } from 'drizzle-orm';
import { subscription, payment, user } from './db/schema';
import { db } from './db';
import { auth } from './auth';
import { headers } from 'next/headers';
import { getPaymentsByUserId, getDodoPaymentsExpirationInfo } from './db/queries';
import { getCustomInstructionsByUserId } from './db/queries';
import type { CustomInstructions } from './db/schema';

// Configurable subscription duration for DodoPayments (in months)
const DODO_SUBSCRIPTION_DURATION_MONTHS = parseInt(process.env.DODO_SUBSCRIPTION_DURATION_MONTHS || '1');

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
  dodoPayments?: {
    hasPayments: boolean;
    expiresAt: Date | null;
    mostRecentPayment?: Date;
    daysUntilExpiration?: number;
    isExpired: boolean;
    isExpiringSoon: boolean;
  };
  // Payment history
  paymentHistory: any[];
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
}

export function clearAllUserDataCache(): void {
  userDataCache.clear();
  lightweightAuthCache.clear();
  customInstructionsCache.clear();
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

    // Optimized query: Use JOIN to fetch user + subscription status in a single query
    const result = await db
      .select({
        userId: user.id,
        email: user.email,
        subscriptionStatus: subscription.status,
        subscriptionEnd: subscription.currentPeriodEnd,
      })
      .from(user)
      .leftJoin(subscription, eq(subscription.userId, user.id))
      .where(eq(user.id, userId))
      .$withCache();

    if (!result || result.length === 0) {
      return null;
    }

    // Check for active Polar subscription (quick check)
    const hasActivePolarSub = result.some((row) => row.subscriptionStatus === 'active');

    // For DodoPayments, we need to do a quick check
    // Only fetch the most recent successful payment for quick pro status check
    let isDodoActive = false;
    if (!hasActivePolarSub) {
      const recentDodoPayment = await db
        .select({
          createdAt: payment.createdAt,
        })
        .from(payment)
        .where(and(eq(payment.userId, userId), eq(payment.status, 'succeeded')))
        .orderBy(desc(payment.createdAt))
        .limit(1)
        .$withCache();

      if (recentDodoPayment.length > 0) {
        const paymentDate = new Date(recentDodoPayment[0].createdAt);
        const subscriptionEndDate = new Date(paymentDate);
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + DODO_SUBSCRIPTION_DURATION_MONTHS);
        isDodoActive = subscriptionEndDate > new Date();
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
    const userWithSubscriptions = await db
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
      .where(eq(user.id, userId))
      .$withCache();

    if (!userWithSubscriptions || userWithSubscriptions.length === 0) {
      return null;
    }

    const userData = userWithSubscriptions[0];

    // Fetch payment data in parallel (still separate as it's less commonly needed)
    const [dodoPayments, dodoExpirationInfo] = await Promise.all([
      getPaymentsByUserId({ userId }),
      getDodoPaymentsExpirationInfo({ userId }),
    ]);

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

    // Process DodoPayments
    const successfulDodoPayments = dodoPayments
      .filter((p: any) => p.status === 'succeeded')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const hasDodoPayments = successfulDodoPayments.length > 0;
    let isDodoActive = false;

    if (hasDodoPayments) {
      const mostRecentPayment = successfulDodoPayments[0];
      const paymentDate = new Date(mostRecentPayment.createdAt);
      const subscriptionEndDate = new Date(paymentDate);
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + DODO_SUBSCRIPTION_DURATION_MONTHS);
      isDodoActive = subscriptionEndDate > new Date();
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
      paymentHistory: dodoPayments,
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

    // Always add DodoPayments details if user has any payments or dodo pro status
    if (dodoPayments.length > 0 || proSource === 'dodo') {
      comprehensiveData.dodoPayments = {
        hasPayments: hasDodoPayments,
        expiresAt: dodoExpirationInfo?.expirationDate || null,
        mostRecentPayment: hasDodoPayments ? successfulDodoPayments[0].createdAt : undefined,
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
