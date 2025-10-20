import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { user, type User } from './db/schema';
import { eq } from 'drizzle-orm';
import { getSessionFromHeaders } from './local-session';

export const getSession = async () => {
  const requestHeaders = await headers();
  const local = getSessionFromHeaders(requestHeaders as any);
  if (!local?.userId) return null;

  const existing = await db.select().from(user).where(eq(user.id, local.userId)).limit(1);
  if (!existing || existing.length === 0) return null;
  return { user: existing[0] } as any;
};

export const getUser = async (): Promise<User | null> => {
  const session = await getSession();
  return (session?.user as User) ?? null;
};
