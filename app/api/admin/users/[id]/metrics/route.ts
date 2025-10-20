import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { user, message, chat } from '@/lib/db/schema';
import { assertAdmin } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const id = decodeURIComponent(params.id);
  const { searchParams } = new URL(req.url);
  const range = (searchParams.get('range') || '24h').toLowerCase();

  const now = new Date();
  const since = range === '7d' ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) : new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Basic stats
  const totalMessages = await db
    .select({ id: message.id })
    .from(message)
    .innerJoin(chat, eq(message.chatId, chat.id))
    .where(eq(chat.userId, id));

  const recentMessages = await db
    .select({ id: message.id, createdAt: message.createdAt, model: message.model, role: message.role })
    .from(message)
    .innerJoin(chat, eq(message.chatId, chat.id))
    .where(and(eq(chat.userId, id), gte(message.createdAt, since), lt(message.createdAt, now)))
    .orderBy(desc(message.createdAt));

  const messages24h = range === '7d'
    ? (await db
        .select({ id: message.id })
        .from(message)
        .innerJoin(chat, eq(message.chatId, chat.id))
        .where(and(eq(chat.userId, id), gte(message.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000))))).length
    : recentMessages.length;

  // Build time series
  const buckets = new Map<string, number>();
  const stepMs = range === '7d' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000; // day or hour
  const pad = range === '7d' ? 7 : 24;
  for (let i = pad - 1; i >= 0; i--) {
    const t = new Date(now.getTime() - i * stepMs);
    const key = range === '7d' ? t.toISOString().slice(0, 10) : `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()} ${t.getHours()}:00`;
    buckets.set(key, 0);
  }
  for (const m of recentMessages) {
    const d = new Date(m.createdAt as any);
    const key = range === '7d' ? d.toISOString().slice(0, 10) : `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:00`;
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  const activity = Array.from(buckets.entries()).map(([ts, count]) => ({ ts, count }));

  // Distributions
  const modelsMap = new Map<string, number>();
  const rolesMap = new Map<string, number>();
  for (const m of recentMessages) {
    const modelName = (m.model || 'inconnu') as any as string;
    modelsMap.set(modelName, (modelsMap.get(modelName) || 0) + 1);
    const role = (m.role || 'inconnu') as any as string;
    rolesMap.set(role, (rolesMap.get(role) || 0) + 1);
  }
  const models = Array.from(modelsMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 15);
  const roles = Array.from(rolesMap.entries()).map(([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    kpis: {
      totalMessages: totalMessages.length,
      messages24h,
    },
    series: {
      activity,
      models,
      roles,
    },
  });
}
