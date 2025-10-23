import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiKeyUsage, event } from '@/lib/db/schema';
import { eq, desc, gte } from 'drizzle-orm';
import { getCurrentUser } from '@/app/actions';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const dailyUsage = await db
      .select()
      .from(apiKeyUsage)
      .orderBy(desc(apiKeyUsage.date));

    const rotationEvents = await db
      .select()
      .from(event)
      .where(eq(event.type, 'API_KEY_ROTATION'))
      .orderBy(desc(event.createdAt))
      .limit(100);

    const errorEvents = await db
      .select()
      .from(event)
      .where(eq(event.type, 'API_KEY_ERROR'))
      .orderBy(desc(event.createdAt))
      .limit(100);

    return NextResponse.json({
      dailyUsage: dailyUsage.map((u) => ({
        date: u.date,
        apiKeyId: u.apiKeyId,
        messageCount: u.messageCount,
        apiCallCount: u.apiCallCount,
        tokensUsed: u.tokensUsed,
      })),
      rotationHistory: rotationEvents.map((e) => ({
        timestamp: e.createdAt,
        metadata: e.metadata,
        message: e.message,
      })),
      errorHistory: errorEvents.map((e) => ({
        timestamp: e.createdAt,
        metadata: e.metadata,
        message: e.message,
      })),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 },
    );
  }
}
