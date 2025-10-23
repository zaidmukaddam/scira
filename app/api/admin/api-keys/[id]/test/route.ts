import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { geminiApiKeys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';
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

    const key = await db
      .select()
      .from(geminiApiKeys)
      .where(eq(geminiApiKeys.id, id))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!key) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 },
      );
    }

    const decryptedKey = decrypt(key.key);
    const result = await geminiKeyManager.testApiKey(decryptedKey);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error testing API key:', error);
    return NextResponse.json(
      {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to test API key',
      },
      { status: 500 },
    );
  }
}
