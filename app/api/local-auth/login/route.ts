import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, user as appUser } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createSessionToken, createCookie } from '@/lib/local-session';

// Lazy import to avoid bundling issues if argon2 isn't installed in some environments
async function verifyPassword(hash: string, pwd: string) {
  const argon2 = await import('argon2');
  return argon2.verify(hash, pwd);
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    const [cred] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!cred) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const ok = await verifyPassword(cred.passwordHash, password).catch(() => false);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const localUserId = `local:${username}`;
    const localEmail = `local-${username}@local`;

    // Ensure app user exists (used throughout the app)
    const existing = await db
      .select({ id: appUser.id })
      .from(appUser)
      .where(eq(appUser.id, localUserId))
      .limit(1);

    if (!existing || existing.length === 0) {
      const now = new Date();
      await db.insert(appUser).values({
        id: localUserId,
        name: username,
        email: localEmail,
        emailVerified: false,
        image: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    const token = createSessionToken({ userId: localUserId, email: localEmail });
    const cookie = createCookie(token);

    const res = NextResponse.json({ success: true }, { status: 200 });
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
