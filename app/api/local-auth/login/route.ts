import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, user as appUser } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createSessionToken, createCookie } from '@/lib/local-session';

function isArgon2(hash: string) {
  return hash.startsWith('$argon2');
}

function isBcrypt(hash: string) {
  return /^\$2[aby]\$/.test(hash);
}

async function verifyHybridPassword(hash: string, pwd: string) {
  if (isArgon2(hash)) {
    const argon2 = await import('argon2');
    return argon2.verify(hash, pwd);
  }
  if (isBcrypt(hash)) {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(pwd, hash);
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const uname = (username || '').trim();
    const pwd = String(password || '');

    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(uname)) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 });
    }
    if (pwd.length < 3) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 400 });
    }

    const cred = await db.query.users.findFirst({ where: eq(users.username, uname) });
    if (!cred) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const ok = await verifyHybridPassword(cred.passwordHash, pwd).catch(() => false);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const localUserId = `local:${uname}`;
    const localEmail = `${uname}@local`;

    const existing = await db.query.user.findFirst({ where: eq(appUser.id, localUserId) });

    if (!existing) {
      const now = new Date();
      await db.insert(appUser).values({
        id: localUserId,
        name: uname,
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
