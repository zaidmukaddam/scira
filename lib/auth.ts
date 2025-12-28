import { betterAuth } from 'better-auth/minimal';
import { nextCookies } from 'better-auth/next-js';
import { lastLoginMethod } from 'better-auth/plugins';
import {
  user,
  session,
  verification,
  account,
  chat,
  message,
  extremeSearchUsage,
  messageUsage,
  subscription,
  payment,
  dodosubscription,
  customInstructions,
  stream,
  lookout,
} from '@/lib/db/schema';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db';
import { config } from 'dotenv';
import { serverEnv } from '@/env/server';
import { checkout, polar, portal, usage, webhooks } from '@polar-sh/better-auth';
import { Polar } from '@polar-sh/sdk';
import {
  dodopayments,
  checkout as dodocheckout,
  portal as dodoportal,
  webhooks as dodowebhooks,
} from '@dodopayments/better-auth';
import DodoPayments from 'dodopayments';
import { eq } from 'drizzle-orm';
import { invalidateUserCaches } from './performance-cache';
import { clearUserDataCache } from './user-data-server';

config({
  path: '.env.local',
});

// Utility function to safely parse dates
function safeParseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseBooleanFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  }
  return Boolean(value);
}

const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN,
  ...(process.env.NODE_ENV === 'production' ? {} : { server: 'sandbox' }),
});

export const dodoPayments = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  ...(process.env.NODE_ENV === 'production' ? { environment: 'live_mode' } : { environment: 'test_mode' }),
});

// Helper function to handle subscription webhooks
async function handleSubscriptionWebhook(payload: any, status: string) {
  try {
    const data = payload.data;

    // Extract user ID from customer data if available
    let validUserId = null;
    if (data.customer?.email) {
      try {
        const userExists = await db.query.user.findFirst({
          where: eq(user.email, data.customer.email),
          columns: { id: true },
        });
        validUserId = userExists ? userExists.id : null;

        if (!userExists) {
          console.warn(`⚠️ User with email ${data.customer.email} not found, creating subscription without user link`);
        }
      } catch (error) {
        console.error('Error checking user existence:', error);
      }
    }

    const currentPeriodStart =
      safeParseDate(
        data.previous_billing_date ||
          data.current_period_start ||
          data.billing_cycle?.current_period_start ||
          data.period_start,
      ) || new Date(data.created_at);

    const currentPeriodEnd = safeParseDate(
      data.next_billing_date ||
        data.current_period_end ||
        data.billing_cycle?.current_period_end ||
        data.period_end ||
        data.next_payment_due_date,
    );

    const cancelAtPeriodEnd = parseBooleanFlag(
      data.cancel_at_next_billing_date ??
        data.cancel_at_period_end ??
        data.cancel_at_current_period_end ??
        data.cancelled_at_period_end,
    );

    // Build subscription data
    const subscriptionData = {
      id: data.subscription_id,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : null,
      status: status,
      productId: data.product_id || data.product_cart?.[0]?.product_id || '',
      customerId: data.customer_id || data.customer?.customer_id || '',
      businessId: data.business_id || null,
      brandId: data.brand_id || null,
      currency: data.currency,
      amount: data.recurring_pre_tax_amount || 0,
      interval: data.payment_frequency_interval || null,
      intervalCount: data.payment_frequency_count || null,
      trialPeriodDays: data.trial_period_days || null,
      currentPeriodStart,
      currentPeriodEnd,
      cancelledAt: data.cancelled_at ? new Date(data.cancelled_at) : null,
      cancelAtPeriodEnd,
      endedAt: data.ended_at ? new Date(data.ended_at) : null,
      discountId: data.discount_id || null,
      // JSON fields
      customer: data.customer || null,
      metadata: data.metadata || null,
      productCart: data.product_cart || null,
      userId: validUserId,
    };

    console.log('💾 Final subscription data:', {
      id: subscriptionData.id,
      status: subscriptionData.status,
      userId: subscriptionData.userId,
      amount: subscriptionData.amount,
      currency: subscriptionData.currency,
    });

    // Use Drizzle's onConflictDoUpdate for proper upsert
    await db
      .insert(dodosubscription)
      .values(subscriptionData)
      .onConflictDoUpdate({
        target: dodosubscription.id,
        set: {
          updatedAt: subscriptionData.updatedAt || new Date(),
          status: subscriptionData.status,
          amount: subscriptionData.amount,
          currentPeriodStart: subscriptionData.currentPeriodStart,
          currentPeriodEnd: subscriptionData.currentPeriodEnd,
          cancelledAt: subscriptionData.cancelledAt,
          cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
          endedAt: subscriptionData.endedAt,
          metadata: subscriptionData.metadata,
          userId: subscriptionData.userId,
        },
      });

    console.log('✅ Upserted subscription:', data.subscription_id);

    // Invalidate user caches when subscription status changes
    if (validUserId) {
      invalidateUserCaches(validUserId);
      clearUserDataCache(validUserId);
      console.log('🗑️ Invalidated caches for user:', validUserId);
    }
  } catch (error) {
    console.error('💥 Error processing subscription webhook:', error);
    // Don't throw - let webhook succeed to avoid retries
  }
}

export const auth = betterAuth({
  rateLimit: {
    max: 100,
    window: 60,
  },
  experimental: { joins: true },
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      verification,
      account,
      chat,
      message,
      extremeSearchUsage,
      messageUsage,
      subscription,
      payment,
      dodosubscription,
      customInstructions,
      stream,
      lookout,
    },
  }),
  socialProviders: {
    github: {
      clientId: serverEnv.GITHUB_CLIENT_ID,
      clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: serverEnv.GOOGLE_CLIENT_ID,
      clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
    },
    twitter: {
      clientId: serverEnv.TWITTER_CLIENT_ID,
      clientSecret: serverEnv.TWITTER_CLIENT_SECRET,
    },
    microsoft: {
      clientId: process.env.MICROSOFT_CLIENT_ID as string,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET as string,
      prompt: 'select_account', // Forces account selection
    },
  },
  plugins: [
    lastLoginMethod(),
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      enableCustomerPortal: true,
      getCustomerCreateParams: async ({ user: newUser }) => {
        console.log('🚀 getCustomerCreateParams called for user:', newUser.id);

        try {
          // Look for existing customer by email
          const { result: existingCustomers } = await polarClient.customers.list({
            email: newUser.email,
          });

          const existingCustomer = existingCustomers.items[0];

          if (existingCustomer && existingCustomer.externalId && existingCustomer.externalId !== newUser.id) {
            console.log(
              `🔗 Found existing customer ${existingCustomer.id} with external ID ${existingCustomer.externalId}`,
            );
            console.log(`🔄 Updating user ID from ${newUser.id} to ${existingCustomer.externalId}`);

            // Update the user's ID in database to match the existing external ID
            if (!newUser.id) {
              console.error('Missing newUser.id; skipping user ID update to existing external ID');
            } else {
              await db.update(user).set({ id: existingCustomer.externalId }).where(eq(user.id, newUser.id));
            }

            console.log(`✅ Updated user ID to match existing external ID: ${existingCustomer.externalId}`);
          }

          return {};
        } catch (error) {
          console.error('💥 Error in getCustomerCreateParams:', error);
          return {};
        }
      },
      use: [
        checkout({
          products: [
            {
              productId:
                process.env.NEXT_PUBLIC_STARTER_TIER ||
                (() => {
                  throw new Error('NEXT_PUBLIC_STARTER_TIER environment variable is required');
                })(),
              slug:
                process.env.NEXT_PUBLIC_STARTER_SLUG ||
                (() => {
                  throw new Error('NEXT_PUBLIC_STARTER_SLUG environment variable is required');
                })(),
            },
          ],
          successUrl: `/success`,
          authenticatedUsersOnly: true,
        }),
        portal(),
        usage(),
        webhooks({
          secret:
            process.env.POLAR_WEBHOOK_SECRET ||
            (() => {
              throw new Error('POLAR_WEBHOOK_SECRET environment variable is required');
            })(),
          onPayload: async ({ data, type }) => {
            if (
              type === 'subscription.created' ||
              type === 'subscription.active' ||
              type === 'subscription.canceled' ||
              type === 'subscription.revoked' ||
              type === 'subscription.uncanceled' ||
              type === 'subscription.updated'
            ) {
              console.log('🎯 Processing subscription webhook:', type);
              console.log('📦 Payload data:', JSON.stringify(data, null, 2));

              try {
                // STEP 0: Validate product ID matches expected product
                const expectedProductId = process.env.NEXT_PUBLIC_STARTER_TIER;
                const incomingProductId = data.productId;

                if (expectedProductId && incomingProductId && incomingProductId !== expectedProductId) {
                  console.warn(
                    `⚠️ Product ID mismatch - expected: ${expectedProductId}, received: ${incomingProductId}. Skipping subscription.`,
                  );
                  return; // Don't add subscription if product ID doesn't match
                }

                // STEP 1: Extract user ID from customer data
                const userId = data.customer?.externalId;

                // STEP 1.5: Check if user exists to prevent foreign key violations
                let validUserId = null;
                if (userId) {
                  try {
                    const userExists = await db.query.user.findFirst({
                      where: eq(user.id, userId),
                      columns: { id: true },
                    });
                    validUserId = userExists ? userId : null;

                    if (!userExists) {
                      console.warn(
                        `⚠️ User ${userId} not found, creating subscription without user link - will auto-link when user signs up`,
                      );
                    }
                  } catch (error) {
                    console.error('Error checking user existence:', error);
                  }
                } else {
                  console.error('🚨 No external ID found for subscription', {
                    subscriptionId: data.id,
                    customerId: data.customerId,
                  });
                }
                // STEP 2: Build subscription data
                const subscriptionData = {
                  id: data.id,
                  createdAt: new Date(data.createdAt),
                  modifiedAt: safeParseDate(data.modifiedAt),
                  amount: data.amount,
                  currency: data.currency,
                  recurringInterval: data.recurringInterval,
                  status: data.status,
                  currentPeriodStart: safeParseDate(data.currentPeriodStart) || new Date(),
                  currentPeriodEnd: safeParseDate(data.currentPeriodEnd) || new Date(),
                  cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? true,
                  canceledAt: safeParseDate(data.canceledAt),
                  startedAt: safeParseDate(data.startedAt) || new Date(),
                  endsAt: safeParseDate(data.endsAt),
                  endedAt: safeParseDate(data.endedAt),
                  customerId: data.customerId,
                  productId: data.productId,
                  discountId: data.discountId || null,
                  checkoutId: data.checkoutId || '',
                  customerCancellationReason: data.customerCancellationReason || null,
                  customerCancellationComment: data.customerCancellationComment || null,
                  metadata: data.metadata ? JSON.stringify(data.metadata) : null,
                  customFieldData: data.customFieldData ? JSON.stringify(data.customFieldData) : null,
                  userId: validUserId,
                };

                console.log('💾 Final subscription data:', {
                  id: subscriptionData.id,
                  status: subscriptionData.status,
                  userId: subscriptionData.userId,
                  amount: subscriptionData.amount,
                });

                // STEP 3: Use Drizzle's onConflictDoUpdate for proper upsert
                await db
                  .insert(subscription)
                  .values(subscriptionData)
                  .onConflictDoUpdate({
                    target: subscription.id,
                    set: {
                      modifiedAt: subscriptionData.modifiedAt || new Date(),
                      amount: subscriptionData.amount,
                      currency: subscriptionData.currency,
                      recurringInterval: subscriptionData.recurringInterval,
                      status: subscriptionData.status,
                      currentPeriodStart: subscriptionData.currentPeriodStart,
                      currentPeriodEnd: subscriptionData.currentPeriodEnd,
                      cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
                      canceledAt: subscriptionData.canceledAt,
                      startedAt: subscriptionData.startedAt,
                      endsAt: subscriptionData.endsAt,
                      endedAt: subscriptionData.endedAt,
                      customerId: subscriptionData.customerId,
                      productId: subscriptionData.productId,
                      discountId: subscriptionData.discountId,
                      checkoutId: subscriptionData.checkoutId,
                      customerCancellationReason: subscriptionData.customerCancellationReason,
                      customerCancellationComment: subscriptionData.customerCancellationComment,
                      metadata: subscriptionData.metadata,
                      customFieldData: subscriptionData.customFieldData,
                      userId: subscriptionData.userId,
                    },
                  });

                console.log('✅ Upserted subscription:', data.id);

                // Invalidate user caches when subscription changes
                if (validUserId) {
                  invalidateUserCaches(validUserId);
                  clearUserDataCache(validUserId);
                  console.log('🗑️ Invalidated caches for user:', validUserId);
                }
              } catch (error) {
                console.error('💥 Error processing subscription webhook:', error);
                // Don't throw - let webhook succeed to avoid retries
              }
            }
          },
        }),
      ],
    }),
    dodopayments({
      client: dodoPayments,
      createCustomerOnSignUp: true,
      use: [
        dodocheckout({
          products: [
            {
              productId:
                process.env.NEXT_PUBLIC_PREMIUM_TIER ||
                (() => {
                  throw new Error('NEXT_PUBLIC_PREMIUM_TIER environment variable is required');
                })(),
              slug:
                process.env.NEXT_PUBLIC_PREMIUM_SLUG ||
                (() => {
                  throw new Error('NEXT_PUBLIC_PREMIUM_SLUG environment variable is required');
                })(),
            },
          ],
          successUrl: '/success',
          authenticatedUsersOnly: true,
        }),
        dodoportal(),
        dodowebhooks({
          webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_SECRET!,
          onPayload: async (payload) => {
            const webhookPayload = payload;
            console.log('🔔 Received Dodo Payments webhook:', webhookPayload.type);
            console.log('📦 Payload data:', JSON.stringify(webhookPayload.data, null, 2));
          },
          onSubscriptionActive: async (payload) => {
            console.log('🎯 Processing subscription.active webhook');
            await handleSubscriptionWebhook(payload, 'active');
          },
          onSubscriptionOnHold: async (payload) => {
            console.log('🎯 Processing subscription.on_hold webhook');
            await handleSubscriptionWebhook(payload, 'on_hold');
          },
          onSubscriptionRenewed: async (payload) => {
            console.log('🎯 Processing subscription.renewed webhook');
            await handleSubscriptionWebhook(payload, 'active');
          },
          onSubscriptionPlanChanged: async (payload) => {
            console.log('🎯 Processing subscription.plan_changed webhook');
            await handleSubscriptionWebhook(payload, 'active');
          },
          onSubscriptionCancelled: async (payload) => {
            console.log('🎯 Processing subscription.cancelled webhook');
            await handleSubscriptionWebhook(payload, 'cancelled');
          },
          onSubscriptionFailed: async (payload) => {
            console.log('🎯 Processing subscription.failed webhook');
            await handleSubscriptionWebhook(payload, 'failed');
          },
          onSubscriptionExpired: async (payload) => {
            console.log('🎯 Processing subscription.expired webhook');
            await handleSubscriptionWebhook(payload, 'expired');
          },
        }),
      ],
    }),
    nextCookies(),
  ],
  trustedOrigins: ['http://localhost:3000', 'https://scira.ai', 'https://www.scira.ai'],
  allowedOrigins: ['http://localhost:3000', 'https://scira.ai', 'https://www.scira.ai'],
});
