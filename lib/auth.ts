// Better Auth removed. This module is intentionally minimal.
import { headers, cookies } from 'next/headers';
import { maindb } from '@/lib/db';
import { user } from './db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromHeaders, getSessionFromRequestCookies } from './local-session';

export const auth = {
  api: {
    getSession: async (options?: { headers: any }) => {
      // Prefer request cookies to avoid missing Cookie header in RSC
      const localFromCookies = await getSessionFromRequestCookies();
      let local = localFromCookies;
      if (!local) {
        const requestHeaders = options?.headers || (await headers());
        local = getSessionFromHeaders(requestHeaders as any);
      }
      if (!local?.userId) return null;

      // Use primary DB to avoid replica lag for auth/roles
      const existing = await maindb.select().from(user).where(eq(user.id, local.userId)).limit(1);
      if (!existing || existing.length === 0) return null;
      return { user: existing[0] } as any;
    },
  },
};

export async function assertAdmin(options?: { headers?: any }) {
  const session = await auth.api.getSession({ headers: options?.headers });
  const u = (session as any)?.user;
  if (!u || u.role !== 'admin' || u.status === 'suspended' || u.status === 'deleted') {
    return null;
  }
  return u;
}
