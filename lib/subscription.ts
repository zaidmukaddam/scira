import { eq } from 'drizzle-orm';
import { subscription, payment } from './db/schema';
import { db } from './db';
import { auth } from './auth';
import { headers } from 'next/headers';
import {
  subscriptionCache,
  createSubscriptionKey,
  getProUserStatus,
  setProUserStatus,
  getDodoPayments,
  setDodoPayments,
  getDodoPaymentExpiration,
  setDodoPaymentExpiration,
  getDodoProStatus,
  setDodoProStatus,
} from './performance-cache';

// Configurable subscription duration for DodoPayments (in months)
const DODO_SUBSCRIPTION_DURATION_MONTHS = parseInt(process.env.DODO_SUBSCRIPTION_DURATION_MONTHS || '1');

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

// Helper function to check DodoPayments status for Indian users
async function checkDodoPaymentsProStatus(userId: string): Promise<boolean> {
  try {
    // Check cache first
    const cachedStatus = getDodoProStatus(userId);
    if (cachedStatus !== null) {
      return cachedStatus.isProUser;
    }

    // Check cache for payments to avoid DB hit
    let userPayments = getDodoPayments(userId);
    if (!userPayments) {
      userPayments = await db.select().from(payment).where(eq(payment.userId, userId));
      setDodoPayments(userId, userPayments);
    }

    // Get the most recent successful payment
    const successfulPayments = userPayments
      .filter((p: any) => p.status === 'succeeded')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (successfulPayments.length === 0) {
      const statusData = { isProUser: false, hasPayments: false };
      setDodoProStatus(userId, statusData);
      console.log('No successful payments found');
      return false;
    }

    // Check if the most recent payment is within the subscription duration
    const mostRecentPayment = successfulPayments[0];
    const paymentDate = new Date(mostRecentPayment.createdAt);
    const subscriptionEndDate = new Date(paymentDate);
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + DODO_SUBSCRIPTION_DURATION_MONTHS);

    const now = new Date();
    const isActive = subscriptionEndDate > now;

    // Cache the result
    const statusData = {
      isProUser: isActive,
      hasPayments: true,
      mostRecentPayment: mostRecentPayment.createdAt,
      subscriptionEndDate: subscriptionEndDate.toISOString(),
    };
    setDodoProStatus(userId, statusData);

    return isActive;
  } catch (error) {
    console.error('Error checking DodoPayments status:', error);
    return false;
  }
}

// Combined function to check Pro status from both Polar and DodoPayments
async function getComprehensiveProStatus(
  userId: string,
): Promise<{ isProUser: boolean; source: 'polar' | 'dodo' | 'none' }> {
  try {
    // Check Polar subscriptions first
    const userSubscriptions = await db.select().from(subscription).where(eq(subscription.userId, userId));
    const activeSubscription = userSubscriptions.find((sub) => sub.status === 'active');

    if (activeSubscription) {
      console.log('🔥 Polar subscription found for user:', userId);
      return { isProUser: true, source: 'polar' };
    }

    // If no Polar subscription, check DodoPayments
    const hasDodoProStatus = await checkDodoPaymentsProStatus(userId);

    if (hasDodoProStatus) {
      console.log('🔥 DodoPayments subscription found for user:', userId);
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

    // Check cache first
    const cacheKey = createSubscriptionKey(session.user.id);
    const cached = subscriptionCache.get(cacheKey);
    if (cached) {
      // Update pro user status with comprehensive check
      const proStatus = await getComprehensiveProStatus(session.user.id);
      setProUserStatus(session.user.id, proStatus.isProUser);
      return cached;
    }

    const userSubscriptions = await db.select().from(subscription).where(eq(subscription.userId, session.user.id));

    if (!userSubscriptions.length) {
      // Even if no Polar subscriptions, check DodoPayments before returning
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
        // Cache comprehensive pro user status (might have DodoPayments even if Polar is inactive)
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

// Simple helper to check if user has an active subscription or successful payment
export async function isUserSubscribed(): Promise<boolean> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return false;
    }

    // Use comprehensive check for both Polar and DodoPayments
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

  // Fallback to comprehensive check (both Polar and DodoPayments)
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

    // First check comprehensive Pro status (includes DodoPayments)
    const proStatus = await getComprehensiveProStatus(session.user.id);

    if (proStatus.isProUser) {
      if (proStatus.source === 'dodo') {
        return 'active'; // DodoPayments successful payment = active
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

// Helper to get DodoPayments expiration date
export async function getDodoPaymentsExpirationDate(): Promise<Date | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return null;
    }

    // Check cache first
    const cachedExpiration = getDodoPaymentExpiration(session.user.id);
    if (cachedExpiration !== null) {
      return cachedExpiration.expirationDate ? new Date(cachedExpiration.expirationDate) : null;
    }

    // Check cache for payments to avoid DB hit
    let userPayments = getDodoPayments(session.user.id);
    if (!userPayments) {
      userPayments = await db.select().from(payment).where(eq(payment.userId, session.user.id));
      setDodoPayments(session.user.id, userPayments);
    }

    const successfulPayments = userPayments
      .filter((p: any) => p.status === 'succeeded')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (successfulPayments.length === 0) {
      const expirationData = { expirationDate: null };
      setDodoPaymentExpiration(session.user.id, expirationData);
      return null;
    }

    // Calculate expiration date based on payment date and configured duration
    const mostRecentPayment = successfulPayments[0];
    const expirationDate = new Date(mostRecentPayment.createdAt);
    expirationDate.setMonth(expirationDate.getMonth() + DODO_SUBSCRIPTION_DURATION_MONTHS);

    // Cache the result
    const expirationData = {
      expirationDate: expirationDate.toISOString(),
      paymentDate: mostRecentPayment.createdAt,
    };
    setDodoPaymentExpiration(session.user.id, expirationData);

    return expirationDate;
  } catch (error) {
    console.error('Error getting DodoPayments expiration date:', error);
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

    // If Pro status comes from DodoPayments, include expiration date
    if (proStatus.source === 'dodo' && proStatus.isProUser) {
      const expiresAt = await getDodoPaymentsExpirationDate();
      return { ...proStatus, expiresAt: expiresAt || undefined };
    }

    return proStatus;
  } catch (error) {
    console.error('Error getting pro status with source:', error);
    return { isProUser: false, source: 'none' };
  }
}
