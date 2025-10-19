import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { pusher } from '@/lib/pusher';

export async function POST(_req: NextRequest) {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  const u = (session as any)?.user as any;
  if (!u) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const xff = hdrs.get('x-forwarded-for') || '';
  const ip = (xff.split(',')[0] || '').trim() || '0.0.0.0';

  await db.update(user).set({ lastSeen: new Date(), ipAddress: ip, updatedAt: new Date() }).where(eq(user.id, u.id));

  try {
    await pusher.trigger('presence-online', 'heartbeat', {
      userId: u.id,
      lastSeen: new Date().toISOString(),
      ip,
    });
  } catch {}

  return NextResponse.json({ ok: true });
}
