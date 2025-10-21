export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { assertAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { user, chat, message } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET(_req: NextRequest) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const topUsers = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        totalMessages: sql<number>`COUNT(DISTINCT ${message.id})`,
        messages24h: sql<number>`COUNT(DISTINCT CASE WHEN ${message.createdAt} > NOW() - INTERVAL '24 hours' THEN ${message.id} END)`,
        lastSeen: user.lastSeen,
      })
      .from(user)
      .leftJoin(chat, eq(chat.userId, user.id))
      .leftJoin(message, eq(message.chatId, chat.id))
      .groupBy(user.id)
      .orderBy(desc(sql`COUNT(DISTINCT ${message.id})`))
      .limit(50);

    const details = await Promise.all(
      topUsers.map(async (u) => {
        const agentStats = await db
          .select({
            model: message.model,
            count: sql<number>`COUNT(*)`,
          })
          .from(message)
          .innerJoin(chat, eq(chat.id, message.chatId))
          .where(eq(chat.userId, u.id))
          .groupBy(message.model)
          .orderBy(desc(sql`COUNT(*)`))
          .limit(1);

        return {
          ...u,
          favoriteAgent: agentStats[0]?.model || 'N/A',
        };
      })
    );

    return NextResponse.json({
      ranking: details.map((u) => ({ name: u.name, messageCount: Number(u.totalMessages) })),
      details: details.map((u) => ({
        ...u,
        totalMessages: Number(u.totalMessages),
        messages24h: Number(u.messages24h),
      })),
    });
  } catch (error) {
    console.error('Error getting user ranking:', error);
    return NextResponse.json({ error: 'Failed to get user ranking' }, { status: 500 });
  }
}
