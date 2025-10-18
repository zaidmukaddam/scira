export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { assertAdmin } from '@/lib/auth';
import { pusher } from '@/lib/pusher';

export async function POST(req: NextRequest) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const xff = hdrs.get('x-forwarded-for') || '';
  const ip = (xff.split(',')[0] || '').trim() || '0.0.0.0';

  await db
    .update(user)
    .set({ lastSeen: new Date(), ipAddress: ip, updatedAt: new Date() })
    .where(eq(user.id, adminUser.id));

  try {
    await pusher.trigger('presence-online', 'heartbeat', {
      userId: adminUser.id,
      lastSeen: new Date().toISOString(),
      ip,
    });
  } catch {}

  return NextResponse.json({ ok: true });
}
