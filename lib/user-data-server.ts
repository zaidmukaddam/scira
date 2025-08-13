import 'server-only';

import { eq } from 'drizzle-orm';
import { subscription, payment, user } from './db/schema';
import { db } from './db';
import { auth } from './auth';
import { headers } from 'next/headers';
import { getPaymentsByUserId, getDodoPaymentsExpirationInfo } from './db/queries';

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

const userDataCache = new Map<string, { data: ComprehensiveUserData; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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

    // Fetch all data in parallel - SINGLE DATABASE OPERATION SET
    const [userData, polarSubscriptions, dodoPayments, dodoExpirationInfo] = await Promise.all([
      // User basic data
      db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .then((rows) => rows[0]),
      // Polar subscriptions
      db.select().from(subscription).where(eq(subscription.userId, userId)).$withCache(),
      // DodoPayments data
      getPaymentsByUserId({ userId }),
      // DodoPayments expiration info
      getDodoPaymentsExpirationInfo({ userId }),
    ]);

    if (!userData) {
      return null;
    }

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
      id: userData.id,
      email: userData.email,
      emailVerified: userData.emailVerified,
      name: userData.name || userData.email.split('@')[0], // Fallback to email prefix if name is null
      image: userData.image,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
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
