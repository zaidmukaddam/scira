import { eq } from 'drizzle-orm';
import { subscription } from './db/schema';
import { db } from './db';
import { auth } from './auth';
import { headers } from 'next/headers';
import { subscriptionCache, createSubscriptionKey, getProUserStatus, setProUserStatus } from './performance-cache';

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

export async function getSubscriptionDetails(): Promise<SubscriptionDetailsResult> {
  'use server';

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return { hasSubscription: false };
    }

    // Check cache first
    const cacheKey = createSubscriptionKey(session.user.id);
    const cached = subscriptionCache.get(cacheKey);
    if (cached) {
      // Also ensure pro user status is cached
      if (cached.hasSubscription && cached.subscription?.status === 'active') {
        setProUserStatus(session.user.id, true);
      } else {
        setProUserStatus(session.user.id, false);
      }
      return cached;
    }

    const userSubscriptions = await db.select().from(subscription).where(eq(subscription.userId, session.user.id));

    if (!userSubscriptions.length) {
      const result = { hasSubscription: false };
      subscriptionCache.set(cacheKey, result);
      // Cache pro user status as false
      setProUserStatus(session.user.id, false);
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
        // Cache pro user status
        setProUserStatus(session.user.id, result.subscription?.status === 'active');
        return result;
      }

      const fallbackResult = { hasSubscription: false };
      subscriptionCache.set(cacheKey, fallbackResult);
      // Cache pro user status as false
      setProUserStatus(session.user.id, false);
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
    // Cache pro user status as true for active subscription
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
  const result = await getSubscriptionDetails();
  return result.hasSubscription && result.subscription?.status === 'active';
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

  // Fallback to full subscription check
  const result = await getSubscriptionDetails();
  return result.hasSubscription && result.subscription?.status === 'active';
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
  const result = await getSubscriptionDetails();

  if (!result.hasSubscription) {
    return 'none';
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
}
