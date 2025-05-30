import { put } from '@vercel/blob';
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
    .refine((file) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      return validTypes.includes(file.type);
    }, {
      message: 'File type should be JPEG, PNG, GIF or PDF',
    }),
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
        const errorMessage = validatedFile.error.errors
            .map((error) => error.message)
            .join(', ');
        
        return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    try {
        // Use a different prefix for authenticated vs unauthenticated uploads
        const prefix = isAuthenticated ? 'auth' : 'public';
        
        const blob = await put(`mplx/${prefix}`, file, {
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
