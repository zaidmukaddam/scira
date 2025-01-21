import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    try {
        const blob = await put(`mplx/image-${Date.now()}.${file.name.split('.').pop()}`, file, {
            access: 'public',
        });

        return NextResponse.json({
            name: file.name,
            contentType: file.type,
            url: blob.url,
            size: file.size, // Include the file size in the response
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
}
