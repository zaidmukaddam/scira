import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdminEmail } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { feedbackCategories } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is admin
    const session = await getSession();

    if (!session?.user || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active categories
    const categories = await db
      .select({
        id: feedbackCategories.id,
        name: feedbackCategories.name,
        description: feedbackCategories.description,
        displayOrder: feedbackCategories.displayOrder,
      })
      .from(feedbackCategories)
      .where(eq(feedbackCategories.isActive, true))
      .orderBy(asc(feedbackCategories.displayOrder), asc(feedbackCategories.name));

    return NextResponse.json({
      categories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
