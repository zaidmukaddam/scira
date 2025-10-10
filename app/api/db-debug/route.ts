import { NextResponse } from 'next/server';
import { db, maindb } from '@/lib/db';
import { user as userTable } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  const results: any = { replica: {}, primary: {} };

  // Basic SELECT via ORM
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

  // Meta + existence checks
  try {
    const metaReplica = await db.execute(sql`select current_database() as db, current_user as role, current_setting('search_path') as search_path`);
    const tablesReplica = await db.execute(sql`select table_schema, table_name from information_schema.tables where table_name = 'user' order by table_schema`);
    const fqReplica = await db.execute(sql`select id from "public"."user" limit 1`);
    results.replica.meta = metaReplica.rows?.[0] ?? null;
    results.replica.tables = tablesReplica.rows ?? [];
    results.replica.fqSelectOk = Array.isArray(fqReplica.rows);
  } catch (error: any) {
    results.replica.metaError = { name: error?.name, message: error?.message, code: error?.code };
  }

  try {
    const metaPrimary = await maindb.execute(sql`select current_database() as db, current_user as role, current_setting('search_path') as search_path`);
    const tablesPrimary = await maindb.execute(sql`select table_schema, table_name from information_schema.tables where table_name = 'user' order by table_schema`);
    const fqPrimary = await maindb.execute(sql`select id from "public"."user" limit 1`);
    results.primary.meta = metaPrimary.rows?.[0] ?? null;
    results.primary.tables = tablesPrimary.rows ?? [];
    results.primary.fqSelectOk = Array.isArray(fqPrimary.rows);
  } catch (error: any) {
    results.primary.metaError = { name: error?.name, message: error?.message, code: error?.code };
  }

  return NextResponse.json({ ok: Boolean(results.replica.ok || results.primary.ok), ...results });
}
