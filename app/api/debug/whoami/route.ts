import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { getSessionFromRequestCookies, getSessionFromHeaders } from '@/lib/local-session';
import { maindb } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { assertAdmin } from '@/lib/auth';

export async function GET() {
  const cookieStore = await cookies();
  const hasLocalCookie = Boolean(cookieStore.get('local.session')?.value);

  const hdrs = await headers();
  const fromCookies = await getSessionFromRequestCookies();
  const fromHeaders = getSessionFromHeaders(hdrs as any);

  let dbUser: any = null;
  if (fromCookies?.userId) {
    const rows = await maindb.select().from(user).where(eq(user.id, fromCookies.userId)).limit(1);
    dbUser = rows?.[0] || null;
  }

  const admin = await assertAdmin({ headers: hdrs });

  return NextResponse.json({
    hasLocalCookie,
    sessionFromCookies: fromCookies,
    sessionFromHeaders: fromHeaders,
    dbUser: dbUser ? { id: dbUser.id, role: (dbUser as any).role, status: (dbUser as any).status } : null,
    isAdmin: Boolean(admin),
  });
}
