import { serverEnv } from '@/env/server';
import { del, list, ListBlobResult } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    if (req.headers.get('Authorization') !== `Bearer ${serverEnv.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        await deleteAllBlobsInFolder('mplx/');
        return new NextResponse('All images in mplx/ folder were deleted', {
            status: 200,
        });
    } catch (error) {
        console.error('An error occurred:', error);
        return new NextResponse('An error occurred while deleting images', {
            status: 500,
        });
    }
}

async function deleteAllBlobsInFolder(folderPrefix: string) {
    let cursor;

    do {
        const listResult: ListBlobResult = await list({
            prefix: folderPrefix,
            cursor,
            limit: 1000,
        });

        if (listResult.blobs.length > 0) {
            await del(listResult.blobs.map((blob) => blob.url));
            console.log(`Deleted ${listResult.blobs.length} blobs`);
        }

        cursor = listResult.cursor;
    } while (cursor);

    console.log('All blobs in the specified folder were deleted');
}
