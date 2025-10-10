// Better Auth removed. This module is intentionally minimal.
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { user } from './db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromHeaders } from './local-session';

export const auth = {
  api: {
    getSession: async (options?: { headers: any }) => {
      const requestHeaders = options?.headers || await headers();
      const local = getSessionFromHeaders(requestHeaders as any);
      if (!local?.userId) return null;

      const existing = await db.select().from(user).where(eq(user.id, local.userId)).limit(1);
      if (!existing || existing.length === 0) return null;
      return { user: existing[0] } as any;
    }
  }
};
