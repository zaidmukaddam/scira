import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscription, user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { invalidateUserCaches } from '@/lib/performance-cache';
import { clearUserDataCache } from '@/lib/user-data-server';
import { createHmac, timingSafeEqual } from 'crypto';


function safeParseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  return new Date(value);
}


function verifyPolarWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  

  const expectedSignature = createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  const providedSignature = signature.startsWith('sha256=') 
    ? signature.slice(7) 
    : signature;
  
  return timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  );
  return expectedSignature === actualSignature;

}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-polar-signature');
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('POLAR_WEBHOOK_SECRET is not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    if (!signature) {
      console.error('Missing x-polar-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    if (!verifyPolarWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    }

    const payload = JSON.parse(rawBody);
    const type: string = payload?.type;
    const data = payload?.data;

    if (!type || !data) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    if (
      type === 'subscription.created' ||
      type === 'subscription.active' ||
      type === 'subscription.canceled' ||
      type === 'subscription.revoked' ||
      type === 'subscription.uncanceled' ||
      type === 'subscription.updated'
    ) {
      try {
        const userId = data.customer?.externalId as string | undefined;
        let validUserId: string | null = null;
        if (userId) {
          const userExists = await db.query.user.findFirst({
            where: eq(user.id, userId),
            columns: { id: true },
          });
          validUserId = userExists ? userId : null;
        }

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
          cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
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
        } as const;

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

        if (validUserId) {
          invalidateUserCaches(validUserId);
          clearUserDataCache(validUserId);
        }
      } catch (e) {
        console.error('Error processing Polar webhook:', e);
        throw e;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Error processing Polar webhook request:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
