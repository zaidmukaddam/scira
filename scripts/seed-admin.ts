import { db } from '@/lib/db';
import { users as credentials, user as appUser } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const username = 'sam';
  const password = 'sam';
  const userId = `local:${username}`;
  const email = `${username}@local`;
  const now = new Date();

  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash(password, 10);

  const cred = await db.query.users.findFirst({ where: eq(credentials.username, username) }).catch(() => null as any);
  if (!cred) {
    await db.insert(credentials).values({ username, passwordHash });
  }

  const u = await db.query.user.findFirst({ where: eq(appUser.id, userId) });
  if (!u) {
    await db.insert(appUser).values({
      id: userId,
      name: username,
      email,
      emailVerified: false,
      image: null,
      createdAt: now,
      updatedAt: now,
      // @ts-ignore new columns
      role: 'admin',
      status: 'active',
    } as any);
  } else {
    await db.update(appUser).set({ role: 'admin' as any, status: 'active' as any, updatedAt: now }).where(eq(appUser.id, userId));
  }

  console.log('Seeded admin user sam/sam');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
