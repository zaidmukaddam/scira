export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { and, desc, eq, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { user, users as credentials, event } from '@/lib/db/schema';
import { assertAdmin } from '@/lib/auth';
import { pusher } from '@/lib/pusher';
import { initializeUserAgentAccess } from '@/lib/db/queries';

export async function GET() {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user as any).role,
      status: (user as any).status,
      lastSeen: (user as any).lastSeen,
      ipAddress: (user as any).ipAddress,
      geo: (user as any).geo,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt));

  return NextResponse.json({ users: rows });
}

export async function POST(req: NextRequest) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { username, password, role } = await req.json();
  const uname = (username || '').trim();
  const pwd = String(password || '');
  const r = (role || 'user').toString();

  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(uname)) {
    return NextResponse.json({ error: 'Nom d’utilisateur invalide' }, { status: 400 });
  }
  if (pwd.length < 3) {
    return NextResponse.json({ error: 'Mot de passe invalide' }, { status: 400 });
  }
  if (!['user','admin'].includes(r)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 });
  }

  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash(pwd, 10);

  const existingCred = await db.query.credentials?.findFirst?.({ where: eq(credentials.username, uname) }).catch(() => null as any);
  if (existingCred) {
    return NextResponse.json({ error: 'Utilisateur déjà existant' }, { status: 409 });
  }

  const localUserId = `local:${uname}`;
  const localEmail = `${uname}@local`;
  const now = new Date();

  await db.insert(credentials).values({ username: uname, passwordHash });

  const existingUser = await db.query.user.findFirst({ where: eq(user.id, localUserId) });
  if (!existingUser) {
    await db.insert(user).values({
      id: localUserId,
      name: uname,
      email: localEmail,
      emailVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
      // @ts-ignore new columns
      role: r,
      status: 'active',
    } as any);
    
    await initializeUserAgentAccess(localUserId);
  } else {
    await db.update(user).set({ role: r as any, status: 'active' as any, updatedAt: now }).where(eq(user.id, localUserId));
  }

  const evt = {
    id: crypto.randomUUID(),
    category: 'user' as any,
    type: 'create',
    message: `Création utilisateur ${uname} (rôle=${r})`,
    metadata: { by: adminUser.id },
    userId: localUserId,
    createdAt: now,
  } as any;
  await db.insert(event).values(evt);

  try {
    await pusher.trigger('private-admin-users', 'created', { id: localUserId, username: uname, role: r });
    await pusher.trigger('private-admin-events', 'new', evt);
  } catch {}

  return NextResponse.json({ ok: true, id: localUserId });
}
