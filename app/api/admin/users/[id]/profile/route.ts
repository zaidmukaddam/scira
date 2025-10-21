export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { assertAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { user, chat, message } from '@/lib/db/schema';
import { eq, desc, asc, and, sql } from 'drizzle-orm';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const params = await props.params;
  const userId = decodeURIComponent(params.id);

  try {
    const userInfo = await db.query.user.findFirst({
      where: eq(user.id, userId),
    });

    if (!userInfo) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const totalMessages = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(message)
      .innerJoin(chat, eq(chat.id, message.chatId))
      .where(eq(chat.userId, userId));

    const messages24h = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(message)
      .innerJoin(chat, eq(chat.id, message.chatId))
      .where(
        and(
          eq(chat.userId, userId),
          sql`${message.createdAt} > NOW() - INTERVAL '24 hours'`
        )
      );

    const totalCost = await db
      .select({
        cost: sql<number>`SUM((${message.totalTokens}::float / 1000.0) * 5)`,
      })
      .from(message)
      .innerJoin(chat, eq(chat.id, message.chatId))
      .where(eq(chat.userId, userId));

    const activityData = await db
      .select({
        date: sql<string>`DATE(${message.createdAt})`,
        messages: sql<number>`COUNT(*)`,
      })
      .from(message)
      .innerJoin(chat, eq(chat.id, message.chatId))
      .where(
        and(
          eq(chat.userId, userId),
          sql`${message.createdAt} > NOW() - INTERVAL '30 days'`
        )
      )
      .groupBy(sql`DATE(${message.createdAt})`)
      .orderBy(asc(sql`DATE(${message.createdAt})`));

    const agentData = await db
      .select({
        agent: message.model,
        count: sql<number>`COUNT(*)`,
      })
      .from(message)
      .innerJoin(chat, eq(chat.id, message.chatId))
      .where(eq(chat.userId, userId))
      .groupBy(message.model)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    const conversations = await db
      .select({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        messageCount: sql<number>`COUNT(${message.id})`,
      })
      .from(chat)
      .leftJoin(message, eq(message.chatId, chat.id))
      .where(eq(chat.userId, userId))
      .groupBy(chat.id)
      .orderBy(desc(chat.createdAt))
      .limit(50);

    return NextResponse.json({
      user: userInfo,
      stats: {
        totalMessages: Number(totalMessages[0]?.count) || 0,
        messages24h: Number(messages24h[0]?.count) || 0,
        totalCost: Number(totalCost[0]?.cost) || 0,
      },
      charts: {
        activity: activityData.map((item) => ({
          date: item.date,
          messages: Number(item.messages),
        })),
        agents: agentData.map((item) => ({
          agent: item.agent || 'unknown',
          count: Number(item.count),
        })),
      },
      conversations: conversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        messageCount: Number(conv.messageCount),
      })),
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 });
  }
}
