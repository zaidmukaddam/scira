import { NextRequest, NextResponse } from 'next/server';
import { getUser, isAdminEmail } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { apiUsage } from '@/lib/db/schema';
import { eq, sql, and, gte, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get API key ID from query params
    const { searchParams } = new URL(request.url);
    const apiKeyId = searchParams.get('keyId');
    
    if (!apiKeyId) {
      return NextResponse.json(
        { error: 'API key ID required' },
        { status: 400 }
      );
    }

    // Verify ownership of the API key (unless admin)
    const isAdmin = isAdminEmail(user.email);

    if (!isAdmin) {
      // Check if the API key belongs to this user
      const { apiKeys } = await import('@/lib/db/schema');
      const keyOwnership = await db
        .select({ userId: apiKeys.userId })
        .from(apiKeys)
        .where(eq(apiKeys.id, apiKeyId))
        .limit(1);

      if (keyOwnership.length === 0) {
        return NextResponse.json(
          { error: 'API key not found' },
          { status: 404 }
        );
      }

      if (keyOwnership[0].userId !== user.id) {
        return NextResponse.json(
          { error: 'Unauthorized: You can only view usage for your own API keys' },
          { status: 403 }
        );
      }
    }

    // Calculate time periods
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now);
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

    // Get overall statistics
    const overallStats = await db
      .select({
        totalRequests: sql<number>`COUNT(*)::bigint`,
        totalInputTokens: sql<number>`COALESCE(SUM(${apiUsage.inputTokens}), 0)::bigint`,
        totalOutputTokens: sql<number>`COALESCE(SUM(${apiUsage.outputTokens}), 0)::bigint`,
        totalTokens: sql<number>`COALESCE(SUM(${apiUsage.inputTokens} + ${apiUsage.outputTokens}), 0)::bigint`,
        avgResponseTime: sql<number>`COALESCE(AVG(${apiUsage.responseTimeMs}), 0)::int`,
        firstRequest: sql<string>`MIN(${apiUsage.timestamp})`,
        lastRequest: sql<string>`MAX(${apiUsage.timestamp})`,
        errorCount: sql<number>`COUNT(CASE WHEN ${apiUsage.statusCode} >= 400 THEN 1 END)::bigint`,
      })
      .from(apiUsage)
      .where(eq(apiUsage.apiKeyId, apiKeyId));

    // Get today's usage
    const todayStats = await db
      .select({
        requests: sql<number>`COUNT(*)::bigint`,
        inputTokens: sql<number>`COALESCE(SUM(${apiUsage.inputTokens}), 0)::bigint`,
        outputTokens: sql<number>`COALESCE(SUM(${apiUsage.outputTokens}), 0)::bigint`,
        totalTokens: sql<number>`COALESCE(SUM(${apiUsage.inputTokens} + ${apiUsage.outputTokens}), 0)::bigint`,
      })
      .from(apiUsage)
      .where(
        and(
          eq(apiUsage.apiKeyId, apiKeyId),
          gte(apiUsage.timestamp, startOfToday)
        )
      );

    // Get this month's usage
    const monthStats = await db
      .select({
        requests: sql<number>`COUNT(*)::bigint`,
        inputTokens: sql<number>`COALESCE(SUM(${apiUsage.inputTokens}), 0)::bigint`,
        outputTokens: sql<number>`COALESCE(SUM(${apiUsage.outputTokens}), 0)::bigint`,
        totalTokens: sql<number>`COALESCE(SUM(${apiUsage.inputTokens} + ${apiUsage.outputTokens}), 0)::bigint`,
      })
      .from(apiUsage)
      .where(
        and(
          eq(apiUsage.apiKeyId, apiKeyId),
          gte(apiUsage.timestamp, startOfMonth)
        )
      );

    // Get last hour's usage (for rate limit monitoring)
    const lastHourStats = await db
      .select({
        requests: sql<number>`COUNT(*)::bigint`,
        totalTokens: sql<number>`COALESCE(SUM(${apiUsage.inputTokens} + ${apiUsage.outputTokens}), 0)::bigint`,
      })
      .from(apiUsage)
      .where(
        and(
          eq(apiUsage.apiKeyId, apiKeyId),
          gte(apiUsage.timestamp, oneHourAgo)
        )
      );

    // Get last minute's usage (for RPM monitoring)
    const lastMinuteStats = await db
      .select({
        requests: sql<number>`COUNT(*)::bigint`,
      })
      .from(apiUsage)
      .where(
        and(
          eq(apiUsage.apiKeyId, apiKeyId),
          gte(apiUsage.timestamp, oneMinuteAgo)
        )
      );

    // Get usage by model
    const modelStats = await db
      .select({
        model: apiUsage.model,
        requests: sql<number>`COUNT(*)::bigint`,
        totalTokens: sql<number>`COALESCE(SUM(${apiUsage.inputTokens} + ${apiUsage.outputTokens}), 0)::bigint`,
      })
      .from(apiUsage)
      .where(eq(apiUsage.apiKeyId, apiKeyId))
      .groupBy(apiUsage.model)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(10);

    // Get recent requests (last 10)
    const recentRequests = await db
      .select({
        timestamp: apiUsage.timestamp,
        model: apiUsage.model,
        inputTokens: apiUsage.inputTokens,
        outputTokens: apiUsage.outputTokens,
        responseTimeMs: apiUsage.responseTimeMs,
        statusCode: apiUsage.statusCode,
        toolCalls: apiUsage.toolCalls,
        error: apiUsage.error,
      })
      .from(apiUsage)
      .where(eq(apiUsage.apiKeyId, apiKeyId))
      .orderBy(desc(apiUsage.timestamp))
      .limit(10);

    // Get tool usage statistics - fetch all with toolCalls and filter in JS
    const allUsageWithTools = await db
      .select({
        toolCalls: apiUsage.toolCalls,
      })
      .from(apiUsage)
      .where(eq(apiUsage.apiKeyId, apiKeyId));
    
    // Filter to only rows with non-empty toolCalls arrays
    const toolUsageRaw = allUsageWithTools.filter(
      row => row.toolCalls && Array.isArray(row.toolCalls) && row.toolCalls.length > 0
    );

    // Process tool usage data
    const toolUsageMap = new Map<string, number>();
    toolUsageRaw.forEach(row => {
      if (row.toolCalls && Array.isArray(row.toolCalls)) {
        row.toolCalls.forEach(tool => {
          toolUsageMap.set(tool, (toolUsageMap.get(tool) || 0) + 1);
        });
      }
    });

    const toolStats = Array.from(toolUsageMap.entries())
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      apiKeyId,
      overall: overallStats[0] || {
        totalRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        avgResponseTime: 0,
        firstRequest: null,
        lastRequest: null,
        errorCount: 0,
      },
      today: todayStats[0] || {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
      thisMonth: monthStats[0] || {
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
      lastHour: lastHourStats[0] || {
        requests: 0,
        totalTokens: 0,
      },
      lastMinute: lastMinuteStats[0] || {
        requests: 0,
      },
      modelStats,
      toolStats,
      recentRequests,
    });
  } catch (error) {
    console.error('Error fetching API key usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage statistics' },
      { status: 500 }
    );
  }
}
