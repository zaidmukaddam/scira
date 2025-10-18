export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { user, users as credentials, event } from '@/lib/db/schema';
import { assertAdmin } from '@/lib/auth';
import { pusher } from '@/lib/pusher';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const id = decodeURIComponent(params.id);
  const body = await req.json();
  const action = String(body.action || '');

  const now = new Date();

  if (action === 'suspend') {
    const evt = { id: crypto.randomUUID(), category: 'user' as any, type: 'suspend', message: `Suspendu ${id}`, userId: id, createdAt: now } as any;
    await db.update(user).set({ status: 'suspended' as any, updatedAt: now }).where(eq(user.id, id));
    await db.insert(event).values(evt);
    try { await pusher.trigger('private-admin-events', 'new', evt); } catch {}
  } else if (action === 'delete') {
    const evt = { id: crypto.randomUUID(), category: 'user' as any, type: 'delete', message: `Supprimé ${id}`, userId: id, createdAt: now } as any;
    await db.update(user).set({ status: 'deleted' as any, updatedAt: now }).where(eq(user.id, id));
    await db.insert(event).values(evt);
    try { await pusher.trigger('private-admin-events', 'new', evt); } catch {}
  } else if (action === 'resetPassword') {
    const { password } = body as any;
    if (!password || String(password).length < 3) return NextResponse.json({ error: 'Mot de passe invalide' }, { status: 400 });
    const uname = id.startsWith('local:') ? id.slice('local:'.length) : id;
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash(String(password), 10);
    await db
      .update(credentials)
      .set({ passwordHash })
      .where(eq(credentials.username, uname));
    const evt = { id: crypto.randomUUID(), category: 'security' as any, type: 'reset_password', message: `Reset password ${id}`, userId: id, createdAt: now } as any;
    await db.insert(event).values(evt);
    try { await pusher.trigger('private-admin-events', 'new', evt); } catch {}
  } else if (action === 'changeRole') {
    const r = String(body.role || 'user');
    if (!['user', 'admin'].includes(r)) return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
    await db.update(user).set({ role: r as any, updatedAt: now }).where(eq(user.id, id));
    const evt = { id: crypto.randomUUID(), category: 'user' as any, type: 'change_role', message: `Change rôle ${id} -> ${r}`, userId: id, createdAt: now } as any;
    await db.insert(event).values(evt);
    try { await pusher.trigger('private-admin-events', 'new', evt); } catch {}
  } else {
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
  }

  try { await pusher.trigger('private-admin-users', 'updated', { id, action }); } catch {}

  return NextResponse.json({ ok: true });
}
