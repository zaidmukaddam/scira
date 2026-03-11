import { serverEnv } from '@/env/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseStorage } from '@/lib/supabase-storage';

export async function GET(req: NextRequest) {
  if (!serverEnv.CRON_SECRET || req.headers.get('Authorization') !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    if (!supabaseStorage) {
      return new NextResponse('Supabase storage is not configured', {
        status: 503,
      });
    }
    await deleteAllFilesWithPrefix('public/');
    return new NextResponse('All public files were deleted', {
      status: 200,
    });
  } catch (error) {
    console.error('An error occurred:', error);
    return new NextResponse('An error occurred while deleting files', {
      status: 500,
    });
  }
}

async function deleteAllFilesWithPrefix(filePrefix: string) {
  try {
    // List all files in the uploads bucket with the prefix
    const { data: files, error: listError } = await supabaseStorage.storage.from('uploads').list(filePrefix, {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'asc' },
    });

    if (listError) {
      console.error('Error listing files:', listError);
      throw listError;
    }

    if (!files || files.length === 0) {
      console.log('No files found with prefix:', filePrefix);
      return;
    }

    // Delete all files
    const filePaths = files.map((file: { name: string }) => `${filePrefix}${file.name}`);
    const { error: deleteError } = await supabaseStorage.storage.from('uploads').remove(filePaths);

    if (deleteError) {
      console.error('Error deleting files:', deleteError);
      throw deleteError;
    }

    console.log(`Deleted ${files.length} files with prefix: ${filePrefix}`);
  } catch (error) {
    console.error('Error in deleteAllFilesWithPrefix:', error);
    throw error;
  }
}
