import { auth } from '@/lib/auth';
import { config } from 'dotenv';
import { headers } from 'next/headers';
import { User } from './db/schema';
import { sessionCache, extractSessionToken, createSessionKey } from './performance-cache';
import { PRIMARY_ADMIN_EMAILS } from './admin-constants';

config({
  path: '.env.local',
});

export const getSession = async () => {
  const requestHeaders = await headers();
  const sessionToken = extractSessionToken(requestHeaders);

  // Try cache first (only if we have a session token)
  if (sessionToken) {
    const cacheKey = createSessionKey(sessionToken);
    const cached = sessionCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  // Only cache valid sessions with users
  if (sessionToken && session?.user) {
    const cacheKey = createSessionKey(sessionToken);
    sessionCache.set(cacheKey, session);
  }

  return session;
};

export const getUser = async (): Promise<User | null> => {
  const session = await getSession();
  return session?.user as User | null;
};

/**
 * Check if a user is an admin
 * Supports:
 * - Hardcoded admin emails (for primary admins)
 * - ADMIN_EMAIL environment variable
 * - ADMIN_EMAILS environment variable (comma-separated list)
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  if (PRIMARY_ADMIN_EMAILS.includes(email)) {
    return true;
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && email === adminEmail) {
    return true;
  }

  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map((e) => e.trim()) || [];
  return adminEmails.includes(email);
}

/**
 * Check if the current session user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getUser();
  return isAdminEmail(user?.email);
}
