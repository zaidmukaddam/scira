export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { message, chat } from '@/lib/db/schema';
import { assertAdmin } from '@/lib/auth';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const params = await props.params;
  const id = decodeURIComponent(params.id);
  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

  const rows = await db
    .select({ id: message.id, createdAt: message.createdAt, role: message.role, model: message.model, chatId: message.chatId })
    .from(message)
    .innerJoin(chat, eq(message.chatId, chat.id))
    .where(eq(chat.userId, id))
    .orderBy(desc(message.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ messages: rows, nextOffset: offset + rows.length, hasMore: rows.length === limit });
}
