import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { payment, user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { invalidateUserCaches } from '@/lib/performance-cache';
import { clearUserDataCache } from '@/lib/user-data-server';

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const type: string = payload?.type;
    const data = payload?.data;

    if (!type || !data) return NextResponse.json({ ok: true });

    if (
      type === 'payment.succeeded' ||
      type === 'payment.failed' ||
      type === 'payment.cancelled' ||
      type === 'payment.processing'
    ) {
      try {
        let validUserId: string | null = null;
        if (data.customer?.email) {
          try {
            const userExists = await db.query.user.findFirst({
              where: eq(user.email, data.customer.email),
              columns: { id: true },
            });
            validUserId = userExists ? (userExists.id as string) : null;
          } catch (_) {
            // ignore
          }
        }

        const paymentData = {
          id: data.payment_id,
          createdAt: new Date(data.created_at),
          updatedAt: data.updated_at ? new Date(data.updated_at) : null,
          brandId: data.brand_id || null,
          businessId: data.business_id || null,
          cardIssuingCountry: data.card_issuing_country || null,
          cardLastFour: data.card_last_four || null,
          cardNetwork: data.card_network || null,
          cardType: data.card_type || null,
          currency: data.currency,
          digitalProductsDelivered: data.digital_products_delivered || false,
          discountId: data.discount_id || null,
          errorCode: data.error_code || null,
          errorMessage: data.error_message || null,
          paymentLink: data.payment_link || null,
          paymentMethod: data.payment_method || null,
          paymentMethodType: data.payment_method_type || null,
          settlementAmount: data.settlement_amount || null,
          settlementCurrency: data.settlement_currency || null,
          settlementTax: data.settlement_tax || null,
          status: data.status || null,
          subscriptionId: data.subscription_id || null,
          tax: data.tax || null,
          totalAmount: data.total_amount,
          billing: data.billing || null,
          customer: data.customer || null,
          disputes: data.disputes || null,
          metadata: data.metadata || null,
          productCart: data.product_cart || null,
          refunds: data.refunds || null,
          userId: validUserId,
        } as const;

        await db
          .insert(payment)
          .values(paymentData)
          .onConflictDoUpdate({
            target: payment.id,
            set: {
              updatedAt: paymentData.updatedAt || new Date(),
              status: paymentData.status,
              errorCode: paymentData.errorCode,
              errorMessage: paymentData.errorMessage,
              digitalProductsDelivered: paymentData.digitalProductsDelivered,
              disputes: paymentData.disputes,
              refunds: paymentData.refunds,
              metadata: paymentData.metadata,
              userId: paymentData.userId,
            },
          });

        if (validUserId) {
          invalidateUserCaches(validUserId);
          clearUserDataCache(validUserId);
        }
      } catch (e) {
        console.error('Error processing DodoPayments webhook:', e);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true });
  }
}
