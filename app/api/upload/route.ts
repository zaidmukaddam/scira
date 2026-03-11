import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { supabaseStorage } from '@/lib/supabase-storage';
import { db } from '@/lib/db';
import { userFile, subscription } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { getChatById } from '@/lib/db/queries';

// File validation schema - matches SouthernCross allowed types
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 20 * 1024 * 1024, {
      message: 'File size should be less than 20MB',
    })
    .refine(
      (file) => {
        // Image types (always allowed)
        const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic'];

        // Document types (Pro users only, but we validate here - frontend controls UI)
        const documentTypes = [
          'application/pdf',
          'application/msword', // .doc
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
          'text/plain', // .txt
          'application/vnd.ms-excel', // .xls
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        ];

        const validTypes = [...imageTypes, ...documentTypes];

        // Also check by file extension for iOS Safari compatibility
        // Note: Blob doesn't have .name, but File does (File extends Blob)
        if (file instanceof File) {
          const fileName = file.name.toLowerCase();
          const validExtensions = [
            '.jpg',
            '.jpeg',
            '.png',
            '.gif',
            '.webp',
            '.heic', // Images
            '.pdf',
            '.doc',
            '.docx',
            '.txt',
            '.xls',
            '.xlsx', // Documents
          ];

          return validTypes.includes(file.type) || validExtensions.some((ext) => fileName.endsWith(ext));
        }

        // If not a File instance, only check MIME type
        return validTypes.includes(file.type);
      },
      {
        message: 'File type should be JPEG, PNG, GIF, WEBP, HEIC, PDF, Word, Excel, or Text',
      },
    ),
});

// Helper function to check if user has Pro subscription
async function checkIsProUser(userId: string): Promise<boolean> {
  try {
    const subscriptions = await db
      .select()
      .from(subscription)
      .where(and(eq(subscription.userId, userId), eq(subscription.status, 'active')));

    return subscriptions.length > 0;
  } catch (error) {
    console.error('[Upload] Error checking Pro status:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Check for authentication but don't require it
  let isAuthenticated = false;
  let session: any = null;
  try {
    session = await auth.api.getSession({
      headers: request.headers,
    });
    isAuthenticated = !!session;
  } catch (error) {
    console.warn('Error checking authentication:', error);
    // Continue as unauthenticated
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const chatId = formData.get('chatId') as string | null;
  const messageId = formData.get('messageId') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Validate file
  const validatedFile = FileSchema.safeParse({ file });
  if (!validatedFile.success) {
    const errorMessage = validatedFile.error.issues.map((issue) => issue.message).join(', ');

    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  try {
    if (!supabaseStorage) {
      return NextResponse.json(
        { error: 'File storage is not configured. Please configure Supabase storage.' },
        { status: 503 },
      );
    }

    // Use a different prefix for authenticated vs unauthenticated uploads
    const prefix = isAuthenticated ? 'auth' : 'public';

    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${prefix}/${timestamp}-${randomString}.${fileExtension}`;

    // Convert File to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabaseStorage.storage.from('uploads').upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    // Get the public URL
    const {
      data: { publicUrl },
    } = supabaseStorage.storage.from('uploads').getPublicUrl(fileName);

    let fileId: string | null = null;

    // Track file in database if user is authenticated
    if (isAuthenticated && session?.user?.id) {
      try {
        const userId = session.user.id;
        fileId = uuidv7();

        // Check if user is Pro
        const isProUser = await checkIsProUser(userId);

        // Validate chatId exists if provided (to avoid foreign key constraint violations)
        let validChatId: string | null = null;
        if (chatId) {
          try {
            const existingChat = await getChatById({ id: chatId });
            if (existingChat && existingChat.userId === userId) {
              validChatId = chatId;
            } else {
              console.warn(
                `[Upload] Chat ${chatId} does not exist or does not belong to user ${userId}, skipping chatId`,
              );
            }
          } catch (chatError) {
            console.warn(`[Upload] Error checking chat existence: ${chatError}, skipping chatId`);
            // Continue without chatId - it's optional
          }
        }

        // Check if file is a document type (not just PDF) - matches SouthernCross document types
        const isDocument =
          file.type === 'application/pdf' ||
          file.type === 'application/msword' ||
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type === 'text/plain' ||
          file.type === 'application/vnd.ms-excel' ||
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.name.toLowerCase().endsWith('.pdf') ||
          file.name.toLowerCase().endsWith('.doc') ||
          file.name.toLowerCase().endsWith('.docx') ||
          file.name.toLowerCase().endsWith('.txt') ||
          file.name.toLowerCase().endsWith('.xls') ||
          file.name.toLowerCase().endsWith('.xlsx');

        const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(file.name);

        // Insert file record
        await db.insert(userFile).values({
          id: fileId,
          userId,
          filename: fileName.split('/').pop() || fileName,
          originalName: file.name,
          fileType: file.type,
          fileSize: file.size,
          filePath: fileName,
          fileUrl: publicUrl,
          chatId: validChatId,
          messageId: messageId || null,
          ragStatus: isProUser && (isDocument || isImage) ? 'pending' : 'skipped',
          source: 'chat',
        });

        console.log(
          `[Upload] File tracked in database: ${fileId}${validChatId ? ` (chatId: ${validChatId})` : ' (no chatId)'}`,
        );

        // For Pro users, trigger RAG processing asynchronously
        if (isProUser && fileId && (isDocument || isImage)) {
          // Trigger async RAG processing (non-blocking)
          const currentFileId = fileId; // Capture for async context
          setTimeout(async () => {
            try {
              console.log(`[Upload] Triggering RAG processing for file ${currentFileId}`);
              const { ragProcessor } = await import('@/lib/services/rag-processor');
              await ragProcessor.processFile(currentFileId);
              console.log(`[Upload] RAG processing completed for file ${currentFileId}`);
            } catch (ragError) {
              console.error('[Upload] RAG processing error:', ragError);
              // Update file status to failed
              try {
                await db
                  .update(userFile)
                  .set({
                    ragStatus: 'failed',
                    ragError: ragError instanceof Error ? ragError.message : String(ragError),
                  })
                  .where(eq(userFile.id, currentFileId));
              } catch (updateError) {
                console.error('[Upload] Failed to update RAG error status:', updateError);
              }
            }
          }, 1000);
        }
      } catch (trackingError) {
        console.error('Error tracking file:', trackingError);
        // Don't fail the upload, just log the error
        // The file is already uploaded to Supabase, so we return success
        // but without fileId tracking
      }
    }

    return NextResponse.json({
      name: file.name,
      contentType: file.type,
      url: publicUrl,
      size: file.size,
      authenticated: isAuthenticated,
      fileId: fileId,
      path: fileName,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
