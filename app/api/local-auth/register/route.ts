import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, user as appUser } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function hashPassword(pwd: string) {
  const argon2 = await import('argon2');
  return argon2.hash(pwd);
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: 'Weak password' }, { status: 400 });

    const [existing] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existing) return NextResponse.json({ error: 'Username taken' }, { status: 409 });

    const passwordHash = await hashPassword(password);
    await db.insert(users).values({ username, passwordHash });

    const localUserId = `local:${username}`;
    const now = new Date();
    const [existingAppUser] = await db.select({ id: appUser.id }).from(appUser).where(eq(appUser.id, localUserId)).limit(1);
    if (!existingAppUser) {
      await db.insert(appUser).values({
        id: localUserId,
        name: username,
        email: `local-${username}@local`,
        emailVerified: false,
        image: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
