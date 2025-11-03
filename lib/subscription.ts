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
      userPayments = await db.select().from(payment).where(eq(payment.userId, userId)).$withCache();
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

// SELF-HOSTED: Always return Pro status since using own APIs
async function getComprehensiveProStatus(
  userId: string,
): Promise<{ isProUser: boolean; source: 'polar' | 'dodo' | 'none' }> {
  // Always return Pro status for self-hosted instance
  console.log('🚀 Self-hosted mode: User has unlimited Pro access');
  return { isProUser: true, source: 'polar' }; // Return polar as source to avoid any special handling
}

export async function getSubscriptionDetails(): Promise<SubscriptionDetailsResult> {
  'use server';

  // SELF-HOSTED: Always return active subscription
  return {
    hasSubscription: true,
    subscription: {
      id: 'self-hosted-unlimited',
      productId: 'pro-unlimited',
      status: 'active',
      amount: 0,
      currency: 'USD',
      recurringInterval: 'lifetime',
      currentPeriodStart: new Date('2024-01-01'),
      currentPeriodEnd: new Date('2099-12-31'), // Far future date
      cancelAtPeriodEnd: false,
      canceledAt: null,
      organizationId: null,
    },
  };
}

// SELF-HOSTED: Always return true for subscription check
export async function isUserSubscribed(): Promise<boolean> {
  // Always return true for self-hosted instance
  return true;
}

// SELF-HOSTED: Always return true for pro status
export async function isUserProCached(): Promise<boolean> {
  // Always return true for self-hosted instance
  return true;
}

// SELF-HOSTED: Always return true for product access
export async function hasAccessToProduct(productId: string): Promise<boolean> {
  // Always return true for self-hosted instance
  return true;
}

// SELF-HOSTED: Always return active status
export async function getUserSubscriptionStatus(): Promise<'active' | 'canceled' | 'expired' | 'none'> {
  // Always return active for self-hosted instance
  return 'active';
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
      userPayments = await db.select().from(payment).where(eq(payment.userId, session.user.id)).$withCache();
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

// SELF-HOSTED: Always return Pro status
export async function getProStatusWithSource(): Promise<{
  isProUser: boolean;
  source: 'polar' | 'dodo' | 'none';
  expiresAt?: Date;
}> {
  // Always return Pro status for self-hosted instance
  return { isProUser: true, source: 'polar' };
}
