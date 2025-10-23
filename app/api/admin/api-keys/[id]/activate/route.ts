import { NextRequest, NextResponse } from 'next/server';
import { geminiKeyManager } from '@/lib/gemini-key-manager';
import { getCurrentUser } from '@/app/actions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const result = await geminiKeyManager.activateKeyManually(id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Key activated successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error activating API key:', error);
    return NextResponse.json(
      { error: 'Failed to activate API key' },
      { status: 500 },
    );
  }
}
