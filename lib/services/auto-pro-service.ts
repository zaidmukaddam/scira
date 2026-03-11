import { db } from '@/lib/db';
import { subscription } from '@/lib/db/schema';
import { eq, like } from 'drizzle-orm';
import { generateId } from 'ai';
import { subscriptionCache, createSubscriptionKey } from '@/lib/performance-cache';

export interface AutoProConfig {
  enabled: boolean;
  endDate: string;
  userLimit: 'all' | 'new' | 'none';
}

/**
 * Get auto-pro feature configuration
 */
export function getAutoProConfig(): AutoProConfig {
  return {
    enabled: process.env.AUTO_PRO_ENABLED === 'true',
    endDate: process.env.AUTO_PRO_END_DATE || '2026-03-31',
    userLimit: (process.env.AUTO_PRO_USER_LIMIT || 'all') as 'all' | 'new' | 'none',
  };
}

/**
 * Check if a user should receive auto-pro access
 */
export async function shouldGrantAutoPro(userId: string, userCreatedAt: Date): Promise<boolean> {
  const config = getAutoProConfig();

  // Feature is disabled
  if (!config.enabled || config.userLimit === 'none') {
    return false;
  }

  // Check if user already has any subscription
  const existingSubscription = await db.select().from(subscription).where(eq(subscription.userId, userId)).limit(1);

  if (existingSubscription.length > 0) {
    return false; // User already has a subscription
  }

  // Check user limit setting
  if (config.userLimit === 'new') {
    // Only grant to users created after a certain date
    const cutoffDate = new Date('2025-01-01'); // Adjust as needed
    return userCreatedAt >= cutoffDate;
  }

  // config.userLimit === 'all'
  return true;
}

/**
 * Create a free Pro subscription for a user
 */
export async function createFreeProSubscription(userId: string): Promise<void> {
  const config = getAutoProConfig();
  const now = new Date();
  const endDate = new Date(config.endDate);

  // Ensure end date is in the future
  if (endDate <= now) {
    console.warn(`[AutoPro] End date ${config.endDate} is in the past, using 1 year from now`);
    endDate.setFullYear(now.getFullYear() + 1);
  }

  const subscriptionData = {
    id: `auto_pro_${generateId()}`,
    createdAt: now,
    modifiedAt: now,
    amount: 0, // Free
    currency: 'AUD',
    recurringInterval: 'month',
    status: 'active' as const,
    currentPeriodStart: now,
    currentPeriodEnd: endDate,
    cancelAtPeriodEnd: true, // Auto-cancel after free period
    startedAt: now,
    endsAt: endDate,
    endedAt: null,
    canceledAt: null,
    customerId: `auto_customer_${userId}`,
    productId: process.env.NEXT_PUBLIC_STARTER_TIER || '82915eda-dd77-4e11-bfc7-b5962ca5bf69',
    discountId: null,
    checkoutId: `auto_checkout_${userId}`,
    customerCancellationReason: null,
    customerCancellationComment: null,
    metadata: JSON.stringify({
      type: 'auto_pro',
      created: now.toISOString(),
      reason: 'promotional_free_access',
      config: config,
    }),
    customFieldData: null,
    userId: userId,
  };

  try {
    await db.insert(subscription).values(subscriptionData);

    // Clear subscription cache for this user
    const cacheKey = createSubscriptionKey(userId);
    subscriptionCache.delete(cacheKey);

    console.log(`[AutoPro] ✅ Created free Pro subscription for user ${userId}`);
    console.log(`[AutoPro] Subscription ID: ${subscriptionData.id}`);
    console.log(`[AutoPro] Valid until: ${endDate.toISOString()}`);
  } catch (error) {
    console.error(`[AutoPro] ❌ Failed to create subscription for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get metrics about auto-pro subscriptions
 */
export async function getAutoProMetrics() {
  const allAutoProSubs = await db.select().from(subscription).where(like(subscription.id, 'auto_pro_%'));

  const now = new Date();
  const monthFromNow = new Date(now);
  monthFromNow.setMonth(monthFromNow.getMonth() + 1);

  const metrics = {
    total: allAutoProSubs.length,
    active: allAutoProSubs.filter((s) => s.status === 'active').length,
    canceled: allAutoProSubs.filter((s) => s.status === 'canceled').length,
    expired: allAutoProSubs.filter((s) => {
      return s.currentPeriodEnd && new Date(s.currentPeriodEnd) < now;
    }).length,
    expiringThisMonth: allAutoProSubs.filter((s) => {
      if (!s.currentPeriodEnd) return false;
      const endDate = new Date(s.currentPeriodEnd);
      return endDate >= now && endDate <= monthFromNow;
    }).length,
  };

  return metrics;
}

/**
 * Cancel all auto-pro subscriptions (for emergency use)
 */
export async function cancelAllAutoProSubscriptions(): Promise<number> {
  const result = await db
    .update(subscription)
    .set({
      status: 'canceled',
      canceledAt: new Date(),
      modifiedAt: new Date(),
    })
    .where(like(subscription.id, 'auto_pro_%'));

  // Clear all subscription caches
  subscriptionCache.clear();

  console.log(`[AutoPro] Canceled all auto-pro subscriptions`);
  // Note: Drizzle update returns result object, not array
  return 0; // Return 0 as placeholder since Drizzle doesn't provide rowCount easily
}
