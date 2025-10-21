export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { db, maindb } from '@/lib/db';
import { user, users as credentials, event } from '@/lib/db/schema';
import { assertAdmin } from '@/lib/auth';
import { pusher } from '@/lib/pusher';
import { randomUUID } from 'crypto';

function logAdmin(step: string, data: Record<string, any>) {
  try {
    const redacted: any = { ...data };
    if (redacted?.body?.password) redacted.body.password = '***';
    console.log('[admin-action]', JSON.stringify({ ts: new Date().toISOString(), step, ...redacted }));
  } catch (e) {
    console.error('[admin-action/log-error]', e);
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) {
    logAdmin('auth_fail', { method: 'PATCH', status: 401 });
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const params = await props.params;
  const id = decodeURIComponent(params.id);
  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const action = String(body?.action || '').trim();
  logAdmin('start', { method: 'PATCH', adminId: (adminUser as any)?.id, userId: id, action, body: { hasPassword: Boolean(body?.password) } });

  const existing = await maindb.query.user.findFirst({ where: eq(user.id, id) });
  if (!existing) {
    logAdmin('not_found', { method: 'PATCH', userId: id });
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }

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
      const cred = await maindb.query.credentials?.findFirst?.({ where: eq(credentials.username, username) }).catch(() => null as any);
      if (cred) {
        await maindb.update(credentials).set({ passwordHash }).where(eq(credentials.username, username));
      } else {
        await maindb.insert(credentials).values({ username, passwordHash });
      }

      evt = {
        id: randomUUID(),
        category: 'user' as any,
        type: 'password_reset',
        message: `Réinitialisation du mot de passe pour ${existing.name}`,
        metadata: { by: adminUser.id },
        userId: id,
        createdAt: now,
      } as any;
      await maindb.insert(event).values(evt);

      try {
        await pusher.trigger('private-admin-users', 'updated', { id, action: 'resetPassword' });
        await pusher.trigger('private-admin-events', 'new', evt);
      } catch (err) {
        logAdmin('pusher_error', { method: 'PATCH', userId: id, action: 'resetPassword', error: String(err) });
      }

      logAdmin('success', { method: 'PATCH', userId: id, action: 'resetPassword' });
      return NextResponse.json({ ok: true });
    }

    if (action === 'suspend') {
      if (existing.status === 'deleted') return NextResponse.json({ error: 'Utilisateur supprimé' }, { status: 400 });
      await maindb.update(user).set({ status: 'suspended' as any, updatedAt: now }).where(eq(user.id, id));

      evt = {
        id: randomUUID(),
        category: 'user' as any,
        type: 'suspend',
        message: `Suspension de ${existing.name}`,
        metadata: { by: adminUser.id },
        userId: id,
        createdAt: now,
      } as any;
      await maindb.insert(event).values(evt);

      try {
        await pusher.trigger('private-admin-users', 'updated', { id, action: 'suspend' });
        await pusher.trigger('private-admin-events', 'new', evt)
        await pusher.trigger(`private-user-${id}`, 'suspended', { 
          message: 'Votre compte a été suspendu',
          timestamp: now 
        });
      } catch {}


      logAdmin('success', { method: 'PATCH', userId: id, action: 'suspend' });
      return NextResponse.json({ ok: true });
    }

    if (action === 'changeRole') {
      const role = String(body?.role || '').trim();
      if (!['user', 'admin'].includes(role)) return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
      await maindb.update(user).set({ role: role as any, updatedAt: now }).where(eq(user.id, id));

      evt = {
        id: randomUUID(),
        category: 'user' as any,
        type: 'role_change',
        message: `Changement de rôle pour ${existing.name} → ${role}`,
        metadata: { by: adminUser.id },
        userId: id,
        createdAt: now,
      } as any;
      await maindb.insert(event).values(evt);

      try {
        await pusher.trigger('private-admin-users', 'updated', { id, action: 'changeRole', role });
        await pusher.trigger('private-admin-events', 'new', evt);
      } catch (err) {
        logAdmin('pusher_error', { method: 'PATCH', userId: id, action: 'changeRole', error: String(err) });
      }

      logAdmin('success', { method: 'PATCH', userId: id, action: 'changeRole' });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (e: any) {
    logAdmin('error', { method: 'PATCH', userId: id, action, error: String(e?.message || e) });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) {
    logAdmin('auth_fail', { method: 'DELETE', status: 401 });
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const params = await props.params;
  const id = decodeURIComponent(params.id);
  logAdmin('start', { method: 'DELETE', adminId: (adminUser as any)?.id, userId: id });
  if (id === adminUser.id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas vous supprimer vous-même' }, { status: 400 });
  }

  const existing = await maindb.query.user.findFirst({ where: eq(user.id, id) });
  if (!existing) {
    logAdmin('not_found', { method: 'DELETE', userId: id });
    return NextResponse.json({ ok: true });
  }

  const now = new Date();

  const evt = {
    id: randomUUID(),
    category: 'user' as any,
    type: 'delete',
    message: `Suppression définitive de ${existing.name}`,
    metadata: { by: adminUser.id },
    userId: id,
    createdAt: now,
  } as any;
  await maindb.insert(event).values(evt);

  if (id.startsWith('local:')) {
    const username = id.slice('local:'.length);
    try {
      await maindb.delete(credentials).where(eq(credentials.username, username));
    } catch {}
  }

  await maindb.delete(user).where(eq(user.id, id));

  try {
    await pusher.trigger('private-admin-users', 'updated', { id, action: 'delete' });
    await pusher.trigger('private-admin-events', 'new', evt);
  } catch (err) {
    logAdmin('pusher_error', { method: 'DELETE', userId: id, action: 'delete', error: String(err) });
  }

  logAdmin('success', { method: 'DELETE', userId: id, action: 'delete' });
  return NextResponse.json({ ok: true });
}
