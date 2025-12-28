import { eq } from 'drizzle-orm';
import { subscription, dodosubscription } from './db/schema';
import { getReadReplica, maindb } from './db';
import { auth } from './auth';
import { headers } from 'next/headers';
import {
  subscriptionCache,
  createSubscriptionKey,
  getProUserStatus,
  setProUserStatus,
  getDodoSubscriptions,
  setDodoSubscriptions,
  getDodoSubscriptionExpiration,
  setDodoSubscriptionExpiration,
  getDodoProStatus,
  setDodoProStatus,
} from './performance-cache';

export type SubscriptionDetails = {
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
  organizationId: string | null;
};

export type SubscriptionDetailsResult = {
  hasSubscription: boolean;
  subscription?: SubscriptionDetails;
  error?: string;
  errorType?: 'CANCELED' | 'EXPIRED' | 'GENERAL';
};

interface DodoSubscriptionRecord {
  id: string;
  status: string;
  currentPeriodEnd: Date | string | null;
  cancelAtPeriodEnd: boolean | null;
  [key: string]: unknown;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isDodoSubscriptionWithinPaidPeriod(subscriptionRow: DodoSubscriptionRecord, now: Date): boolean {
  const periodEnd = toDate(subscriptionRow?.currentPeriodEnd);
  if (!periodEnd) return false;
  return periodEnd.getTime() > now.getTime();
}

function isDodoSubscriptionActiveForAccess(subscriptionRow: DodoSubscriptionRecord, now: Date): boolean {
  if (!subscriptionRow) return false;
  if (!isDodoSubscriptionWithinPaidPeriod(subscriptionRow, now)) return false;
  if (subscriptionRow.status === 'active') return true;
  if (subscriptionRow.status === 'cancelled') return true;
  return false;
}

// Helper function to check Dodo Subscriptions status
async function checkDodoSubscriptionProStatus(userId: string): Promise<boolean> {
  try {
    // Check cache first
    const cachedStatus = getDodoProStatus(userId);
    if (cachedStatus !== null) {
      // Backward compatibility: handle both old (hasSubscriptions) and new (isProUser) cache formats
      return cachedStatus.isProUser ?? cachedStatus.hasSubscriptions ?? false;
    }

    // Check cache for subscriptions to avoid DB hit
    let userSubscriptions = getDodoSubscriptions(userId);
    if (!userSubscriptions) {
      // Use maindb to avoid replication lag for immediate subscription recognition
      userSubscriptions = await maindb
        .select()
        .from(dodosubscription)
        .where(eq(dodosubscription.userId, userId));
      setDodoSubscriptions(userId, userSubscriptions);
    }

    // Check if any subscription is active (active status or cancelled with time left)
    const now = new Date();
    const activeSubscription = userSubscriptions.find((sub: DodoSubscriptionRecord) =>
      isDodoSubscriptionActiveForAccess(sub, now),
    );

    const isProUser = !!activeSubscription;

    // Cache the result
    const statusData = {
      isProUser,
      hasSubscriptions: userSubscriptions.length > 0,
      subscriptionEndDate: activeSubscription?.currentPeriodEnd
        ? toDate(activeSubscription.currentPeriodEnd)?.toISOString() ?? null
        : null,
    };
    setDodoProStatus(userId, statusData);

    if (!isProUser) {
      console.log('No active Dodo subscriptions found');
    }

    return isProUser;
  } catch (error) {
    console.error('Error checking Dodo Subscription status:', error);
    return false;
  }
}

// Combined function to check Pro status from both Polar and Dodo Subscriptions
async function getComprehensiveProStatus(
  userId: string,
): Promise<{ isProUser: boolean; source: 'polar' | 'dodo' | 'none' }> {
  try {
    const readDb = getReadReplica();
    // Check Polar subscriptions first
    const userSubscriptions = await readDb.select().from(subscription).where(eq(subscription.userId, userId));
    const activeSubscription = userSubscriptions.find((sub) => sub.status === 'active');

    if (activeSubscription) {
      console.log('🔥 Polar subscription found for user:', userId);
      return { isProUser: true, source: 'polar' };
    }

    // If no Polar subscription, check Dodo Subscriptions
    const hasDodoProStatus = await checkDodoSubscriptionProStatus(userId);

    if (hasDodoProStatus) {
      console.log('🔥 Dodo subscription found for user:', userId);
      return { isProUser: true, source: 'dodo' };
    }

    return { isProUser: false, source: 'none' };
  } catch (error) {
    console.error('Error getting comprehensive pro status:', error);
    return { isProUser: false, source: 'none' };
  }
}

export async function getSubscriptionDetails(): Promise<SubscriptionDetailsResult> {
  'use server';

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { hasSubscription: false };
    }

    const readDb = getReadReplica();

    // Check cache first
    const cacheKey = createSubscriptionKey(session.user.id);
    const cached = subscriptionCache.get(cacheKey);
    if (cached) {
      // Update pro user status with comprehensive check
      const proStatus = await getComprehensiveProStatus(session.user.id);
      setProUserStatus(session.user.id, proStatus.isProUser);
      return cached;
    }

    const userSubscriptions = await readDb.select().from(subscription).where(eq(subscription.userId, session.user.id));

    if (!userSubscriptions.length) {
      // Even if no Polar subscriptions, check Dodo Subscriptions before returning
      const proStatus = await getComprehensiveProStatus(session.user.id);
      const result = { hasSubscription: false };
      subscriptionCache.set(cacheKey, result);
      // Cache comprehensive pro user status
      setProUserStatus(session.user.id, proStatus.isProUser);
      return result;
    }

    // Get the most recent active subscription
    const activeSubscription = userSubscriptions
      .filter((sub) => sub.status === 'active')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!activeSubscription) {
      // Check for canceled or expired subscriptions
      const latestSubscription = userSubscriptions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];

      if (latestSubscription) {
        const now = new Date();
        const isExpired = new Date(latestSubscription.currentPeriodEnd) < now;
        const isCanceled = latestSubscription.status === 'canceled';

        const result = {
          hasSubscription: true,
          subscription: {
            id: latestSubscription.id,
            productId: latestSubscription.productId,
            status: latestSubscription.status,
            amount: latestSubscription.amount,
            currency: latestSubscription.currency,
            recurringInterval: latestSubscription.recurringInterval,
            currentPeriodStart: latestSubscription.currentPeriodStart,
            currentPeriodEnd: latestSubscription.currentPeriodEnd,
            cancelAtPeriodEnd: latestSubscription.cancelAtPeriodEnd,
            canceledAt: latestSubscription.canceledAt,
            organizationId: null,
          },
          error: isCanceled
            ? 'Subscription has been canceled'
            : isExpired
              ? 'Subscription has expired'
              : 'Subscription is not active',
          errorType: (isCanceled ? 'CANCELED' : isExpired ? 'EXPIRED' : 'GENERAL') as
            | 'CANCELED'
            | 'EXPIRED'
            | 'GENERAL',
        };
        subscriptionCache.set(cacheKey, result);
        // Cache comprehensive pro user status (might have Dodo Subscription even if Polar is inactive)
        const proStatus = await getComprehensiveProStatus(session.user.id);
        setProUserStatus(session.user.id, proStatus.isProUser);
        return result;
      }

      const fallbackResult = { hasSubscription: false };
      subscriptionCache.set(cacheKey, fallbackResult);
      // Cache comprehensive pro user status
      const proStatus = await getComprehensiveProStatus(session.user.id);
      setProUserStatus(session.user.id, proStatus.isProUser);
      return fallbackResult;
    }

    const result = {
      hasSubscription: true,
      subscription: {
        id: activeSubscription.id,
        productId: activeSubscription.productId,
        status: activeSubscription.status,
        amount: activeSubscription.amount,
        currency: activeSubscription.currency,
        recurringInterval: activeSubscription.recurringInterval,
        currentPeriodStart: activeSubscription.currentPeriodStart,
        currentPeriodEnd: activeSubscription.currentPeriodEnd,
        cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
        canceledAt: activeSubscription.canceledAt,
        organizationId: null,
      },
    };
    subscriptionCache.set(cacheKey, result);
    // Cache pro user status as true for active Polar subscription
    setProUserStatus(session.user.id, true);
    return result;
  } catch (error) {
    console.error('Error fetching subscription details:', error);
    return {
      hasSubscription: false,
      error: 'Failed to load subscription details',
      errorType: 'GENERAL',
    };
  }
}

// Simple helper to check if user has an active subscription
export async function isUserSubscribed(): Promise<boolean> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return false;
    }

    // Use comprehensive check for both Polar and Dodo Subscriptions
    const proStatus = await getComprehensiveProStatus(session.user.id);
    return proStatus.isProUser;
  } catch (error) {
    console.error('Error checking user subscription status:', error);
    return false;
  }
}

// Fast pro user status check using cache
export async function isUserProCached(): Promise<boolean> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return false;
  }

  // Try cache first
  const cached = getProUserStatus(session.user.id);
  if (cached !== null) {
    return cached;
  }

  // Fallback to comprehensive check (both Polar and Dodo Subscriptions)
  const proStatus = await getComprehensiveProStatus(session.user.id);
  setProUserStatus(session.user.id, proStatus.isProUser);
  return proStatus.isProUser;
}

// Helper to check if user has access to a specific product/tier
export async function hasAccessToProduct(productId: string): Promise<boolean> {
  const result = await getSubscriptionDetails();
  return (
    result.hasSubscription && result.subscription?.status === 'active' && result.subscription?.productId === productId
  );
}

// Helper to get user's current subscription status
export async function getUserSubscriptionStatus(): Promise<'active' | 'canceled' | 'expired' | 'none'> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return 'none';
    }

    // First check comprehensive Pro status (includes Dodo Subscriptions)
    const proStatus = await getComprehensiveProStatus(session.user.id);

    if (proStatus.isProUser) {
      if (proStatus.source === 'dodo') {
        return 'active'; // Dodo subscription active = active
      }
    }

    // For Polar subscriptions, get detailed status
    const result = await getSubscriptionDetails();

    if (!result.hasSubscription) {
      return proStatus.isProUser ? 'active' : 'none';
    }

    if (result.subscription?.status === 'active') {
      return 'active';
    }

    if (result.errorType === 'CANCELED') {
      return 'canceled';
    }

    if (result.errorType === 'EXPIRED') {
      return 'expired';
    }

    return 'none';
  } catch (error) {
    console.error('Error getting user subscription status:', error);
    return 'none';
  }
}

// Helper to get Dodo Subscription expiration date
export async function getDodoSubscriptionExpirationDate(): Promise<Date | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return null;
    }

    // Check cache first
    const cachedExpiration = getDodoSubscriptionExpiration(session.user.id);
    if (cachedExpiration !== null) {
      return cachedExpiration.expirationDate ? new Date(cachedExpiration.expirationDate) : null;
    }

    // Check cache for subscriptions to avoid DB hit
    let userSubscriptions = getDodoSubscriptions(session.user.id);
    if (!userSubscriptions) {
      // Use maindb to avoid replication lag
      userSubscriptions = await maindb
        .select()
        .from(dodosubscription)
        .where(eq(dodosubscription.userId, session.user.id));
      setDodoSubscriptions(session.user.id, userSubscriptions);
    }

    // Get active subscriptions sorted by current period end
    // Include cancelled subscriptions with cancelAtPeriodEnd: true that are still within period
    const now = new Date();
    const activeSubscriptions = userSubscriptions
      .filter((sub: DodoSubscriptionRecord) => isDodoSubscriptionActiveForAccess(sub, now))
      .sort((a: DodoSubscriptionRecord, b: DodoSubscriptionRecord) => {
        const periodEndA = toDate(a.currentPeriodEnd)?.getTime() ?? 0;
        const periodEndB = toDate(b.currentPeriodEnd)?.getTime() ?? 0;
        return periodEndB - periodEndA;
      });

    if (activeSubscriptions.length === 0) {
      const expirationData = { expirationDate: null };
      setDodoSubscriptionExpiration(session.user.id, expirationData);
      return null;
    }

    // Get the expiration date from the most recent active subscription
    const mostRecentSubscription = activeSubscriptions[0];
    const expirationDate = toDate(mostRecentSubscription.currentPeriodEnd);
    if (!expirationDate) {
      const expirationData = { expirationDate: null };
      setDodoSubscriptionExpiration(session.user.id, expirationData);
      return null;
    }

    // Cache the result
    const expirationData = {
      expirationDate: expirationDate.toISOString(),
      subscriptionId: mostRecentSubscription.id,
    };
    setDodoSubscriptionExpiration(session.user.id, expirationData);

    return expirationDate;
  } catch (error) {
    console.error('Error getting Dodo Subscription expiration date:', error);
    return null;
  }
}

// Export the comprehensive pro status function for UI components that need to know the source
export async function getProStatusWithSource(): Promise<{
  isProUser: boolean;
  source: 'polar' | 'dodo' | 'none';
  expiresAt?: Date;
}> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { isProUser: false, source: 'none' };
    }

    const proStatus = await getComprehensiveProStatus(session.user.id);

    // If Pro status comes from Dodo Subscription, include expiration date
    if (proStatus.source === 'dodo' && proStatus.isProUser) {
      const expiresAt = await getDodoSubscriptionExpirationDate();
      return { ...proStatus, expiresAt: expiresAt || undefined };
    }

    return proStatus;
  } catch (error) {
    console.error('Error getting pro status with source:', error);
    return { isProUser: false, source: 'none' };
  }
}
