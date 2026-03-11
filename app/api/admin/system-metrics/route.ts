import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdminEmail } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { user, chat, message } from '@/lib/db/schema';
import { desc, eq, gte, sql, and, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getSession();
    if (!session?.user || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get total users
    const totalUsersResult = await db.select({ count: count() }).from(user);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get active users in last 24h
    const activeUsersResult = await db
      .selectDistinct({ userId: chat.userId })
      .from(chat)
      .where(gte(chat.updatedAt, twentyFourHoursAgo));
    const activeUsers24h = activeUsersResult.length;

    // Get total searches (messages from users)
    const totalSearchesResult = await db.select({ count: count() }).from(message).where(eq(message.role, 'user'));
    const totalSearches = totalSearchesResult[0]?.count || 0;

    // Get searches in last 24h
    const searches24hResult = await db
      .select({ count: count() })
      .from(message)
      .where(and(eq(message.role, 'user'), gte(message.createdAt, twentyFourHoursAgo)));
    const searches24h = searches24hResult[0]?.count || 0;

    // Get total errors (simplified - would need proper error tracking)
    const totalErrors = 0; // Placeholder
    const errors24h = 0; // Placeholder

    // Get average response time (simplified)
    const avgResponseTime = 2.5; // Placeholder in seconds

    // Calculate success rate
    const successRate = totalSearches > 0 ? ((totalSearches - totalErrors) / totalSearches) * 100 : 100;

    // Get top models (would need to track this properly)
    const topModels = [
      { model: 'llama-3.3', count: Math.floor(totalSearches * 0.4) },
      { model: 'llama-4', count: Math.floor(totalSearches * 0.3) },
      { model: 'deepseek-v3.1', count: Math.floor(totalSearches * 0.2) },
      { model: 'gpt-oss-120b', count: Math.floor(totalSearches * 0.1) },
    ];

    // Get top search groups (placeholder data)
    const topSearchGroups = [
      { group: 'web', count: Math.floor(totalSearches * 0.5) },
      { group: 'analysis', count: Math.floor(totalSearches * 0.2) },
      { group: 'chat', count: Math.floor(totalSearches * 0.15) },
      { group: 'academic', count: Math.floor(totalSearches * 0.1) },
      { group: 'x', count: Math.floor(totalSearches * 0.05) },
    ];

    // Get top tools (placeholder data)
    const topTools = [
      { tool: 'web_search', count: Math.floor(totalSearches * 0.6) },
      { tool: 'code_interpreter', count: Math.floor(totalSearches * 0.15) },
      { tool: 'stock_chart', count: Math.floor(totalSearches * 0.1) },
      { tool: 'academic_search', count: Math.floor(totalSearches * 0.1) },
      { tool: 'x_search', count: Math.floor(totalSearches * 0.05) },
    ];

    // Calculate trends (comparing to previous period)
    const trends = {
      users: 15.5, // Placeholder percentage
      searches: 23.2,
      errors: -5.0,
      performance: 8.0,
    };

    return NextResponse.json({
      totalUsers,
      activeUsers24h,
      totalSearches,
      searches24h,
      totalErrors,
      errors24h,
      avgResponseTime,
      successRate,
      topModels,
      topSearchGroups,
      topTools,
      trends,
    });
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
