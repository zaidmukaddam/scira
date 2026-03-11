import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { userFile, fileChunk } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { supabaseStorage } from '@/lib/supabase-storage';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get file
    const files = await db
      .select()
      .from(userFile)
      .where(and(eq(userFile.id, id), eq(userFile.userId, userId)));

    if (files.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Update last accessed time
    await db.update(userFile).set({ lastAccessedAt: new Date() }).where(eq(userFile.id, id));

    return NextResponse.json({ file: files[0] });
  } catch (error) {
    console.error('Error getting file:', error);
    return NextResponse.json({ error: 'Failed to get file' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get file to verify ownership and get storage path
    const files = await db
      .select()
      .from(userFile)
      .where(and(eq(userFile.id, id), eq(userFile.userId, userId)));

    if (files.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const file = files[0];

    // Delete from storage if Supabase is configured
    if (supabaseStorage) {
      try {
        await supabaseStorage.storage.from('uploads').remove([file.filePath]);
        console.log(`[Delete] Removed file from storage: ${file.filePath}`);
      } catch (storageError) {
        console.error('[Delete] Failed to remove from storage:', storageError);
        // Continue with database deletion even if storage fails
      }
    }

    // Delete file chunks (will cascade due to foreign key)
    await db.delete(fileChunk).where(eq(fileChunk.fileId, id));

    // Delete file record
    await db.delete(userFile).where(eq(userFile.id, id));

    console.log(`[Delete] Deleted file ${id} for user ${userId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
