import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fileLibrary } from '@/lib/db/schema';

const TrackUsageSchema = z.object({
  fileId: z.string(),
  usage: z.enum(['chat_message', 'download', 'view', 'share']),
  metadata: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = TrackUsageSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validatedData.error.errors },
        { status: 400 }
      );
    }

    const { fileId, usage, metadata } = validatedData.data;

    const file = await db
      .select({ id: fileLibrary.id, userId: fileLibrary.userId })
      .from(fileLibrary)
      .where(and(eq(fileLibrary.id, fileId), eq(fileLibrary.userId, session.user.id)))
      .limit(1);

    if (!file.length) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    console.log(`File usage tracked: ${usage} for file ${fileId} by user ${session.user.id}`, metadata);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking file usage:', error);
    return NextResponse.json({ error: 'Failed to track usage' }, { status: 500 });
  }
}