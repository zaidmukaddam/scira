export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { event } from '@/lib/db/schema';
import { assertAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter');

  const rows = await db
    .select()
    .from(event)
    .where(filter ? eq(event.category, filter as any) : undefined as any)
    .orderBy(desc(event.createdAt))
    .limit(20);

  return NextResponse.json({ events: rows });
}
