export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getSessionFromHeaders } from '@/lib/local-session';
import { db } from '@/lib/db';
import { user as appUser } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

export async function GET() {
  const hdrs = await headers();
  const sess = getSessionFromHeaders(hdrs as any);
  if (!sess) return NextResponse.json({ user: null });

  const [u] = await db
    .select({ id: appUser.id, email: appUser.email, name: appUser.name })
    .from(appUser)
    .where(eq(appUser.id, sess.userId))
    .limit(1);

  if (!u) return NextResponse.json({ user: null });
  return NextResponse.json({ user: u });
}
