import { put, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';

// File validation schema
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    .refine(
      (file) => {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        return validTypes.includes(file.type);
      },
      {
        message: 'File type should be JPEG, PNG, GIF or PDF',
      },
    ),
});

export async function POST(request: NextRequest) {
  // Check for authentication but don't require it
  let isAuthenticated = false;
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    isAuthenticated = !!session;
  } catch (error) {
    console.warn('Error checking authentication:', error);
    // Continue as unauthenticated
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Validate file
  const validatedFile = FileSchema.safeParse({ file });
  if (!validatedFile.success) {
    const errorMessage = validatedFile.error.cause as string;

    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }

  try {
    // Use a different prefix for authenticated vs unauthenticated uploads
    const prefix = isAuthenticated ? 'auth' : 'public';

    const blob = await put(`mplx/${prefix}.${file.name.split('.').pop()}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json({
      name: file.name,
      contentType: file.type,
      url: blob.url,
      size: file.size,
      authenticated: isAuthenticated,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Check for authentication but don't require it
  let isAuthenticated = false;
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    isAuthenticated = !!session;
  } catch (error) {
    console.warn('Error checking authentication:', error);
    // Continue as unauthenticated
  }

  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Validate that the URL is from Vercel Blob
    if (!url.includes('blob.vercel-storage.com')) {
      return NextResponse.json({ error: 'Invalid blob URL' }, { status: 400 });
    }

    // Delete the file from Vercel Blob
    await del(url);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
      authenticated: isAuthenticated,
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
