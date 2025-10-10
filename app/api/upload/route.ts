import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionFromHeaders } from '@/lib/local-session';

// File validation schema
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 10 * 1024 * 1024, {
      message: 'File size should be 10MB or less',
    })
    .refine(
      (file) => {
        const t = file.type || '';
        const allowedTypes = [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf'
        ];
        return allowedTypes.includes(t);
      },
      {
        message: 'File type must be JPEG, PNG, GIF, WebP, or PDF',
      },
    ),
});

export async function POST(request: NextRequest) {
  // Check for authentication but don't require it
  let isAuthenticated = false;
  try {
    const sess = getSessionFromHeaders(request.headers as any);
    isAuthenticated = !!sess;
  } catch (error) {
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
