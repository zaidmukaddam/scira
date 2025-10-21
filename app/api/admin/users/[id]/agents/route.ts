export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { assertAdmin } from '@/lib/auth';
import { getUserAgentAccess, updateUserAgentAccess } from '@/lib/db/queries';
import { db } from '@/lib/db';
import { event } from '@/lib/db/schema';
import { pusher } from '@/lib/pusher';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = decodeURIComponent(params.id);

  try {
    const access = await getUserAgentAccess(userId);
    return NextResponse.json(access);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get agent access' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const userId = decodeURIComponent(params.id);
  const body = await req.json().catch(() => ({}));
  const agents = body.agents || {};

  try {
    await Promise.all(
      Object.entries(agents).map(([agentId, enabled]) =>
        updateUserAgentAccess(userId, agentId, enabled as boolean)
      )
    );

    try {
      await pusher.trigger('private-admin-users', 'updated', { userId });
      await pusher.trigger(`private-user-${userId}`, 'agent-access-updated', { userId });
    } catch {}

    const evt = {
      id: crypto.randomUUID(),
      category: 'user' as any,
      type: 'agent_access_updated',
      message: `Mise à jour accès agents pour utilisateur ${userId}`,
      metadata: { by: adminUser.id, agents },
      userId: userId,
      createdAt: new Date(),
    };
    await db.insert(event).values(evt);

    try {
      await pusher.trigger('private-admin-events', 'new', evt);
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update agent access' }, { status: 500 });
  }
}
