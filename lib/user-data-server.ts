import 'server-only';

import { eq } from 'drizzle-orm';
import { user } from './db/schema';
import { db } from './db';
// Better Auth removed
import { headers, cookies } from 'next/headers';
import { getSessionFromHeaders } from '@/lib/local-session';
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
  // Also clear lightweight auth cache to avoid stale pro status
  lightweightAuthCache.delete(userId);
  // Clear any per-user custom instructions cache
  customInstructionsCache.delete(userId);
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
    const hdrs = await headers();
    const local = getSessionFromHeaders(hdrs as any);
    let effectiveUserId: string | null = local?.userId ?? null;
    let effectiveEmail: string | null = local?.email ?? null;

    // Guest sessions disabled: if no local session, return null
    if (!effectiveUserId) {
      return null;
    }

    const userId = effectiveUserId;

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

    // Simple lookup: fetch minimal user info and treat as Pro
    const found = await db
      .select({ userId: user.id, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)
      .$withCache();

    if (!found || found.length === 0) {
      if (effectiveEmail) return { userId, email: effectiveEmail, isProUser: true };
      return null;
    }

    const lightweightData: LightweightUserAuth = {
      userId: found[0].userId,
      email: found[0].email,
      isProUser: true,
    };

    setCachedLightweightAuth(userId, lightweightData);
    return lightweightData;
  } catch (error) {
    console.error('Error in lightweight auth check:', error);
    return null;
  }
}

export async function getComprehensiveUserData(): Promise<ComprehensiveUserData | null> {
  try {
    const hdrs = await headers();
    const local = getSessionFromHeaders(hdrs as any);
    let effectiveUserId: string | null = local?.userId ?? null;
    let effectiveEmail: string | null = local?.email ?? null;

    // Guest sessions disabled: if no local session, return null
    if (!effectiveUserId) {
      return null;
    }

    const userId = effectiveUserId;

    // Check cache first
    const cached = getCachedUserData(userId);
    if (cached) {
      return cached;
    }

    // Simplified: fetch only user row and treat as Pro without subscriptions/payments
    const rows = await db
      .select({
        userId: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, userId))
      .$withCache();

    if (!rows || rows.length === 0) {
      return null;
    }

    const u = rows[0];

    const comprehensiveData: ComprehensiveUserData = {
      id: u.userId,
      email: u.email,
      emailVerified: u.emailVerified,
      name: u.name || (u.email ? u.email.split('@')[0] : 'User'),
      image: u.image,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      isProUser: true,
      proSource: 'none',
      subscriptionStatus: 'none',
      paymentHistory: [],
    };

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
