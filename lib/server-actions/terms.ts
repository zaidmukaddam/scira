'use server';

import { db } from '@/lib/db';
import { userTermsAcceptance } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getUser } from '@/lib/auth-utils';

const CURRENT_TERMS_VERSION = '1.0';

/**
 * Record that the authenticated user has accepted the current terms version.
 * Uses an upsert so re-acceptance always reflects the latest timestamp.
 */
export async function acceptTermsAction(ipAddress?: string, userAgent?: string) {
  try {
    const user = await getUser();
    if (!user) throw new Error('Not authenticated — please sign in and try again');

    await db
      .insert(userTermsAcceptance)
      .values({
        userId: user.id,
        termsVersion: CURRENT_TERMS_VERSION,
        acceptedAt: new Date(),
        ipAddress,
        userAgent,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userTermsAcceptance.userId, userTermsAcceptance.termsVersion],
        set: {
          acceptedAt: new Date(),
          ipAddress,
          userAgent,
        },
      });
  } catch (error) {
    console.error('[acceptTermsAction] Failed to record terms acceptance:', error);
    throw new Error('Failed to accept terms. Please try again.');
  }
}

/**
 * Returns true if the authenticated user has accepted the current terms version.
 * Returns false for unauthenticated users or on error (fail open).
 */
export async function hasAcceptedTerms(): Promise<boolean> {
  try {
    const user = await getUser();
    if (!user) return false;

    const result = await db
      .select({ id: userTermsAcceptance.id })
      .from(userTermsAcceptance)
      .where(and(eq(userTermsAcceptance.userId, user.id), eq(userTermsAcceptance.termsVersion, CURRENT_TERMS_VERSION)))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('[hasAcceptedTerms] Error checking acceptance:', error);
    return false;
  }
}

/**
 * Returns the most recent terms acceptance record for the authenticated user, or null.
 */
export async function getTermsAcceptanceDetails() {
  try {
    const user = await getUser();
    if (!user) return null;

    const result = await db
      .select()
      .from(userTermsAcceptance)
      .where(eq(userTermsAcceptance.userId, user.id))
      .orderBy(desc(userTermsAcceptance.acceptedAt))
      .limit(1);

    return result[0] ?? null;
  } catch (error) {
    console.error('[getTermsAcceptanceDetails] Error fetching details:', error);
    return null;
  }
}
