import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userFile } from '@/lib/db/schema';
import { eq, desc, asc, and, like, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const fileType = searchParams.get('type') || 'all';
    const sortBy = searchParams.get('sort') || 'uploadedAt';
    const sortOrder = searchParams.get('order') || 'desc';
    const search = searchParams.get('search');

    // Build WHERE conditions
    const conditions = [eq(userFile.userId, userId)];

    // Filter by file type
    if (fileType === 'image') {
      conditions.push(like(userFile.fileType, 'image/%'));
    } else if (fileType === 'pdf') {
      conditions.push(eq(userFile.fileType, 'application/pdf'));
    }

    // Search by filename
    if (search) {
      conditions.push(sql`${userFile.originalName} ILIKE ${`%${search}%`}`);
    }

    // Build ORDER BY
    let orderByColumn;
    switch (sortBy) {
      case 'uploadedAt':
        orderByColumn = userFile.uploadedAt;
        break;
      case 'fileSize':
        orderByColumn = userFile.fileSize;
        break;
      case 'originalName':
        orderByColumn = userFile.originalName;
        break;
      default:
        orderByColumn = userFile.uploadedAt;
    }

    const orderByFn = sortOrder === 'asc' ? asc : desc;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userFile)
      .where(and(...conditions));

    const total = countResult[0]?.count || 0;

    // Get files with pagination
    const offset = (page - 1) * limit;
    const files = await db
      .select({
        id: userFile.id,
        userId: userFile.userId,
        filename: userFile.filename,
        originalName: userFile.originalName,
        fileType: userFile.fileType,
        fileSize: userFile.fileSize,
        filePath: userFile.filePath,
        fileUrl: userFile.fileUrl,
        chatId: userFile.chatId,
        messageId: userFile.messageId,
        ragStatus: userFile.ragStatus,
        ragProcessedAt: userFile.ragProcessedAt,
        chunkCount: userFile.chunkCount,
        extractedTextLength: userFile.extractedTextLength,
        source: userFile.source,
        uploadedAt: userFile.uploadedAt,
        lastAccessedAt: userFile.lastAccessedAt,
      })
      .from(userFile)
      .where(and(...conditions))
      .orderBy(orderByFn(orderByColumn))
      .limit(limit)
      .offset(offset);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
    });
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}
