import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdminEmail } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { userFeedback, user, feedbackCategories } from '@/lib/db/schema';
import { eq, desc, and, or, like, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const session = await getSession();

    if (!session?.user || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build filter conditions
    const conditions = [];

    if (status && status !== 'all') {
      conditions.push(eq(userFeedback.status, status));
    }

    if (type && type !== 'all') {
      conditions.push(eq(userFeedback.type, type));
    }

    if (priority && priority !== 'all') {
      conditions.push(eq(userFeedback.priority, priority));
    }

    if (search) {
      conditions.push(or(like(userFeedback.title, `%${search}%`), like(userFeedback.description, `%${search}%`)));
    }

    // Query feedback with user and category info
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const feedbackData = await db
      .select({
        id: userFeedback.id,
        userId: userFeedback.userId,
        type: userFeedback.type,
        title: userFeedback.title,
        description: userFeedback.description,
        status: userFeedback.status,
        priority: userFeedback.priority,
        categoryId: userFeedback.categoryId,
        createdAt: userFeedback.createdAt,
        updatedAt: userFeedback.updatedAt,
        // User info
        userName: user.name,
        userEmail: user.email,
        // Category info
        categoryName: feedbackCategories.name,
      })
      .from(userFeedback)
      .leftJoin(user, eq(userFeedback.userId, user.id))
      .leftJoin(feedbackCategories, eq(userFeedback.categoryId, feedbackCategories.id))
      .where(whereClause)
      .orderBy(desc(userFeedback.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFeedback)
      .where(whereClause);

    const totalCount = Number(countResult[0]?.count || 0);

    const response = {
      feedback: feedbackData,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching feedback list:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch feedback',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
