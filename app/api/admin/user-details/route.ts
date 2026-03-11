import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdminEmail } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { user, chat, message, subscription } from '@/lib/db/schema';
import { desc, eq, gte, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getSession();
    if (!session?.user || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    // Get user details
    const users = await db.select().from(user).where(eq(user.email, email)).limit(1);

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = users[0];

    // Check if user has Pro subscription
    const subscriptions = await db
      .select()
      .from(subscription)
      .where(and(eq(subscription.userId, targetUser.id), eq(subscription.status, 'active')))
      .limit(1);

    const isProUser = subscriptions.length > 0;

    // Get user's messages for statistics
    const userChats = await db.select({ id: chat.id }).from(chat).where(eq(chat.userId, targetUser.id));

    const chatIds = userChats.map((c) => c.id);

    // Get total searches
    const userMessages = await db
      .select({
        id: message.id,
        chatId: message.chatId,
        role: message.role,
        parts: message.parts,
        createdAt: message.createdAt,
      })
      .from(message)
      .where(and(eq(message.role, 'user'), sql`${message.chatId} = ANY(${chatIds})`))
      .orderBy(desc(message.createdAt));

    const totalSearches = userMessages.length;

    // Get searches today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const searchesToday = userMessages.filter((m) => m.createdAt >= today).length;

    // Get recent searches (last 20)
    const recentSearches = userMessages.slice(0, 20).map((msg) => {
      const parts = msg.parts as any[];
      const textContent = parts.find((p) => p.type === 'text')?.text || '';

      return {
        id: msg.id,
        query: textContent,
        searchGroup: 'web', // Would need to track this properly
        model: 'llama-3.3', // Would need to track this properly
        timestamp: msg.createdAt,
        success: true,
        responseTime: 2.5, // Would need to track this properly
      };
    });

    // Get usage history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageByDay = new Map<string, number>();
    userMessages
      .filter((m) => m.createdAt >= thirtyDaysAgo)
      .forEach((msg) => {
        const dateKey = msg.createdAt.toISOString().split('T')[0];
        usageByDay.set(dateKey, (usageByDay.get(dateKey) || 0) + 1);
      });

    const usageHistory = Array.from(usageByDay.entries())
      .map(([date, count]) => ({
        date: new Date(date),
        searchCount: count,
        errorCount: 0, // Would need proper error tracking
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculate stats
    const stats = {
      totalSearches,
      totalErrors: 0, // Would need proper error tracking
      searchesToday,
      errorsToday: 0,
      favoriteModel: 'llama-3.3', // Would need to track this
      favoriteSearchGroup: 'web', // Would need to track this
      avgResponseTime: 2.5, // Would need to track this
    };

    return NextResponse.json({
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      createdAt: targetUser.createdAt,
      isProUser,
      stats,
      recentSearches,
      recentErrors: [], // Would need proper error tracking
      usageHistory,
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
