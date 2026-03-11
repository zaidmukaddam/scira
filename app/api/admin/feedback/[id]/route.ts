import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdminEmail } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { userFeedback, user, feedbackCategories, feedbackUpdates } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Await params as required in Next.js 15
    const { id: feedbackId } = await params;

    // Check if user is authenticated and is admin
    const session = await getSession();

    if (!session?.user || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get feedback with user and category info
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
        pageUrl: userFeedback.pageUrl,
        userAgent: userFeedback.userAgent,
        browserInfo: userFeedback.browserInfo,
        viewportSize: userFeedback.viewportSize,
        previousPage: userFeedback.previousPage,
        sessionDuration: userFeedback.sessionDuration,
        actionContext: userFeedback.actionContext,
        attachments: userFeedback.attachments,
        adminNotes: userFeedback.adminNotes,
        resolvedBy: userFeedback.resolvedBy,
        resolvedAt: userFeedback.resolvedAt,
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
      .where(eq(userFeedback.id, feedbackId))
      .limit(1);

    if (feedbackData.length === 0) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    // Get update history
    const updates = await db
      .select({
        id: feedbackUpdates.id,
        updateType: feedbackUpdates.updateType,
        oldValue: feedbackUpdates.oldValue,
        newValue: feedbackUpdates.newValue,
        comment: feedbackUpdates.comment,
        isInternal: feedbackUpdates.isInternal,
        createdAt: feedbackUpdates.createdAt,
        userName: user.name,
      })
      .from(feedbackUpdates)
      .leftJoin(user, eq(feedbackUpdates.userId, user.id))
      .where(eq(feedbackUpdates.feedbackId, feedbackId))
      .orderBy(desc(feedbackUpdates.createdAt));

    // Combine the data
    const feedbackWithUpdates = {
      ...feedbackData[0],
      updates: updates.filter((update) => !update.isInternal), // Only show non-internal updates
    };

    return NextResponse.json(feedbackWithUpdates);
  } catch (error) {
    console.error('Error fetching feedback details:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback details' }, { status: 500 });
  }
}
