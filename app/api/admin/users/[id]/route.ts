export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { user, users as credentials, event } from '@/lib/db/schema';
import { assertAdmin } from '@/lib/auth';
import { pusher } from '@/lib/pusher';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const id = decodeURIComponent(params.id);
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || '').trim();

  const existing = await db.query.user.findFirst({ where: eq(user.id, id) });
  if (!existing) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  const now = new Date();
  let evt: any | null = null;

  try {
    if (action === 'resetPassword') {
      const pwd = String(body?.password || '');
      if (pwd.length < 3) return NextResponse.json({ error: 'Mot de passe invalide' }, { status: 400 });
      if (!id.startsWith('local:')) return NextResponse.json({ error: "Impossible de réinitialiser: utilisateur non local" }, { status: 400 });
      const username = id.slice('local:'.length);
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(pwd, 10);
      const cred = await db.query.credentials?.findFirst?.({ where: eq(credentials.username, username) }).catch(() => null as any);
      if (cred) {
        await db.update(credentials).set({ passwordHash }).where(eq(credentials.username, username));
      } else {
        await db.insert(credentials).values({ username, passwordHash });
      }

      evt = {
        id: crypto.randomUUID(),
        category: 'user' as any,
        type: 'password_reset',
        message: `Réinitialisation du mot de passe pour ${existing.name}`,
        metadata: { by: adminUser.id },
        userId: id,
        createdAt: now,
      } as any;
      await db.insert(event).values(evt);

      try {
        await pusher.trigger('private-admin-users', 'updated', { id, action: 'resetPassword' });
        await pusher.trigger('private-admin-events', 'new', evt);
      } catch {}

      return NextResponse.json({ ok: true });
    }

    if (action === 'suspend') {
      if (existing.status === 'deleted') return NextResponse.json({ error: 'Utilisateur supprimé' }, { status: 400 });
      await db.update(user).set({ status: 'suspended' as any, updatedAt: now }).where(eq(user.id, id));

      evt = {
        id: crypto.randomUUID(),
        category: 'user' as any,
        type: 'suspend',
        message: `Suspension de ${existing.name}`,
        metadata: { by: adminUser.id },
        userId: id,
        createdAt: now,
      } as any;
      await db.insert(event).values(evt);

      try {
        await pusher.trigger('private-admin-users', 'updated', { id, action: 'suspend' });
        await pusher.trigger('private-admin-events', 'new', evt);
        await pusher.trigger(`private-user-${id}`, 'suspended', { 
          message: 'Votre compte a été suspendu',
          timestamp: now 
        });
      } catch {}

      return NextResponse.json({ ok: true });
    }

    if (action === 'changeRole') {
      const role = String(body?.role || '').trim();
      if (!['user', 'admin'].includes(role)) return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
      await db.update(user).set({ role: role as any, updatedAt: now }).where(eq(user.id, id));

      evt = {
        id: crypto.randomUUID(),
        category: 'user' as any,
        type: 'role_change',
        message: `Changement de rôle pour ${existing.name} → ${role}`,
        metadata: { by: adminUser.id },
        userId: id,
        createdAt: now,
      } as any;
      await db.insert(event).values(evt);

      try {
        await pusher.trigger('private-admin-users', 'updated', { id, action: 'changeRole', role });
        await pusher.trigger('private-admin-events', 'new', evt);
      } catch {}

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const id = decodeURIComponent(params.id);
  if (id === adminUser.id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas vous supprimer vous-même' }, { status: 400 });
  }

  const existing = await db.query.user.findFirst({ where: eq(user.id, id) });
  if (!existing) return NextResponse.json({ ok: true });

  const now = new Date();

  const evt = {
    id: crypto.randomUUID(),
    category: 'user' as any,
    type: 'delete',
    message: `Suppression définitive de ${existing.name}`,
    metadata: { by: adminUser.id },
    userId: id,
    createdAt: now,
  } as any;
  await db.insert(event).values(evt);

  if (id.startsWith('local:')) {
    const username = id.slice('local:'.length);
    try {
      await db.delete(credentials).where(eq(credentials.username, username));
    } catch {}
  }

  await db.delete(user).where(eq(user.id, id));

  try {
    await pusher.trigger('private-admin-users', 'updated', { id, action: 'delete' });
    await pusher.trigger('private-admin-events', 'new', evt);
  } catch {}

  return NextResponse.json({ ok: true });
}
