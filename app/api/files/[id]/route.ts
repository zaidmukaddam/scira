import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fileLibrary, fileFolder } from '@/lib/db/schema';

const FileUpdateSchema = z.object({
  filename: z.string().min(1).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  folderId: z.string().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const fileId = params.id;
    
    const file = await db
      .select({
        id: fileLibrary.id,
        filename: fileLibrary.filename,
        originalName: fileLibrary.originalName,
        contentType: fileLibrary.contentType,
        size: fileLibrary.size,
        url: fileLibrary.url,
        thumbnailUrl: fileLibrary.thumbnailUrl,
        folderId: fileLibrary.folderId,
        tags: fileLibrary.tags,
        description: fileLibrary.description,
        metadata: fileLibrary.metadata,
        isPublic: fileLibrary.isPublic,
        publicId: fileLibrary.publicId,
        createdAt: fileLibrary.createdAt,
        updatedAt: fileLibrary.updatedAt,
        folderName: fileFolder.name,
      })
      .from(fileLibrary)
      .leftJoin(fileFolder, eq(fileLibrary.folderId, fileFolder.id))
      .where(and(
        eq(fileLibrary.id, fileId),
        eq(fileLibrary.userId, session.user.id)
      ))
      .limit(1);

    if (!file.length) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json(file[0]);
  } catch (error) {
    console.error('Error fetching file:', error);
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const fileId = params.id;
    const body = await request.json();

    const validatedData = FileUpdateSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validatedData.error.errors },
        { status: 400 }
      );
    }

    const { filename, description, tags, folderId } = validatedData.data;

    const existingFile = await db
      .select()
      .from(fileLibrary)
      .where(and(
        eq(fileLibrary.id, fileId),
        eq(fileLibrary.userId, session.user.id)
      ))
      .limit(1);

    if (!existingFile.length) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (folderId) {
      const folder = await db
        .select()
        .from(fileFolder)
        .where(and(eq(fileFolder.id, folderId), eq(fileFolder.userId, session.user.id)))
        .limit(1);

      if (!folder.length) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (filename !== undefined) updateData.filename = filename;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags.length > 0 ? tags : null;
    if (folderId !== undefined) updateData.folderId = folderId;

    const [updatedFile] = await db
      .update(fileLibrary)
      .set(updateData)
      .where(and(
        eq(fileLibrary.id, fileId),
        eq(fileLibrary.userId, session.user.id)
      ))
      .returning();

    if (!updatedFile) {
      return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
    }

    const fileWithFolder = await db
      .select({
        id: fileLibrary.id,
        filename: fileLibrary.filename,
        originalName: fileLibrary.originalName,
        contentType: fileLibrary.contentType,
        size: fileLibrary.size,
        url: fileLibrary.url,
        thumbnailUrl: fileLibrary.thumbnailUrl,
        folderId: fileLibrary.folderId,
        tags: fileLibrary.tags,
        description: fileLibrary.description,
        metadata: fileLibrary.metadata,
        isPublic: fileLibrary.isPublic,
        publicId: fileLibrary.publicId,
        createdAt: fileLibrary.createdAt,
        updatedAt: fileLibrary.updatedAt,
        folderName: fileFolder.name,
      })
      .from(fileLibrary)
      .leftJoin(fileFolder, eq(fileLibrary.folderId, fileFolder.id))
      .where(eq(fileLibrary.id, fileId))
      .limit(1);

    return NextResponse.json(fileWithFolder[0]);
  } catch (error) {
    console.error('Error updating file:', error);
    return NextResponse.json({ error: 'Failed to update file' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const fileId = params.id;

    const existingFile = await db
      .select()
      .from(fileLibrary)
      .where(and(
        eq(fileLibrary.id, fileId),
        eq(fileLibrary.userId, session.user.id)
      ))
      .limit(1);

    if (!existingFile.length) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await db
      .delete(fileLibrary)
      .where(and(
        eq(fileLibrary.id, fileId),
        eq(fileLibrary.userId, session.user.id)
      ));

    return NextResponse.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}