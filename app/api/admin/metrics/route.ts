import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { and, desc, gte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { user, message, chat } from '@/lib/db/schema';
import { assertAdmin } from '@/lib/auth';

function costFromTokens(totalTokens?: number | null, inputTokens?: number | null, outputTokens?: number | null) {
  const total = totalTokens ?? ((inputTokens ?? 0) + (outputTokens ?? 0));
  return (total / 1000) * 5;
}

export async function GET(_req: NextRequest) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since60s = new Date(now.getTime() - 60 * 1000);

  const [allUsers, activeUsers, suspendedUsers, deletedUsers, recentMessages] = await Promise.all([
    db.select({ id: user.id, status: user.status }).from(user),
    db.select({ id: user.id }).from(user).where(and((user as any).lastSeen.isNotNull?.() ?? (user.lastSeen as any), gte(user.lastSeen, since60s))),
    db.select({ id: user.id }).from(user).where((user.status as any).eq ? (user.status as any).eq('suspended') : (user.status as any) as any),
    db.select({ id: user.id }).from(user).where((user.status as any).eq ? (user.status as any).eq('deleted') : (user.status as any) as any),
    db
      .select({ id: message.id, model: message.model, totalTokens: message.totalTokens, inputTokens: message.inputTokens, outputTokens: message.outputTokens, createdAt: message.createdAt, chatId: message.chatId })
      .from(message)
      .where(gte(message.createdAt, since24h))
      .orderBy(desc(message.createdAt))
  ]);

  const kpiActiveUsers = activeUsers.length;
  const suspendedCount = allUsers.filter((u: any) => u.status === 'suspended').length;
  const deletedCount = allUsers.filter((u: any) => u.status === 'deleted').length;
  const totalUsers = allUsers.length || 1;
  const suspendedPct = (suspendedCount / totalUsers) * 100;
  const deletedPct = (deletedCount / totalUsers) * 100;

  const messagesByModelMap = new Map<string, number>();
  const messagesByUserMap = new Map<string, number>();
  const costByUserMap = new Map<string, number>();

  const chats = await db.select({ id: chat.id, userId: chat.userId }).from(chat);
  const chatUserMap = new Map<string, string>();
  chats.forEach((c) => chatUserMap.set(c.id, (c as any).userId));

  for (const m of recentMessages) {
    const model = (m.model || 'inconnu').toString();
    messagesByModelMap.set(model, (messagesByModelMap.get(model) || 0) + 1);
    const uid = chatUserMap.get(m.chatId) || 'inconnu';
    messagesByUserMap.set(uid, (messagesByUserMap.get(uid) || 0) + 1);
    const c = costFromTokens(m.totalTokens as any, m.inputTokens as any, m.outputTokens as any);
    costByUserMap.set(uid, (costByUserMap.get(uid) || 0) + c);
  }

  const messagesByModel = Array.from(messagesByModelMap.entries())
    .map(([model, count]) => ({ model, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const messagesByUser = Array.from(messagesByUserMap.entries())
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const costByUser = Array.from(costByUserMap.entries())
    .map(([userId, cost]) => ({ userId, cost: Number(cost.toFixed(2)) }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 15);

  return NextResponse.json({
    kpis: {
      activeUsers: kpiActiveUsers,
      suspended: { count: suspendedCount, pct: suspendedPct },
      deleted: { count: deletedCount, pct: deletedPct },
      messages24hTotal: recentMessages.length,
    },
    charts: {
      models: messagesByModel,
      usersActivity: messagesByUser,
      usersCost: costByUser,
    },
  });
}
