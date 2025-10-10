import { NextResponse } from 'next/server';
import { db, maindb } from '@/lib/db';
import { user as userTable } from '@/lib/db/schema';

export async function GET() {
  const results: any = { replica: {}, primary: {} };

  try {
    const rows = await db.select({ id: userTable.id }).from(userTable).limit(1);
    results.replica.ok = true;
    results.replica.sample = rows?.[0]?.id ?? null;
  } catch (error: any) {
    results.replica.ok = false;
    results.replica.error = {
      name: error?.name,
      message: error?.message,
      code: error?.code,
    };
  }

  try {
    const rows = await maindb.select({ id: userTable.id }).from(userTable).limit(1);
    results.primary.ok = true;
    results.primary.sample = rows?.[0]?.id ?? null;
  } catch (error: any) {
    results.primary.ok = false;
    results.primary.error = {
      name: error?.name,
      message: error?.message,
      code: error?.code,
    };
  }

  return NextResponse.json({ ok: Boolean(results.replica.ok || results.primary.ok), ...results });
}
