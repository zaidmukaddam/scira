import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { geminiApiKeys, apiKeyUsage } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { encrypt, decrypt } from '@/lib/encryption';
import { geminiKeyManager } from '@/lib/gemini-key-manager';
import { getCurrentUser } from '@/app/actions';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { key, displayName, priority, enabled } = body;

    if (!key) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 },
      );
    }

    const encryptedKey = encrypt(key);

    const existingKey = await db
      .select()
      .from(geminiApiKeys)
      .where(eq(geminiApiKeys.key, encryptedKey))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (existingKey) {
      return NextResponse.json(
        { error: 'This API key already exists' },
        { status: 400 },
      );
    }

    const newKey = await db
      .insert(geminiApiKeys)
      .values({
        key: encryptedKey,
        displayName: displayName || `Key ${Date.now()}`,
        priority: priority || 1,
        enabled: enabled !== false,
        isActive: false,
        isPrimary: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()
      .then((rows) => rows[0]);

    return NextResponse.json({
      id: newKey.id,
      displayName: newKey.displayName,
      priority: newKey.priority,
      enabled: newKey.enabled,
      createdAt: newKey.createdAt,
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const stats = await geminiKeyManager.getFullStats();

    return NextResponse.json({
      keys: stats.keys,
      stats: {
        totalRequests: stats.totalRequests,
        totalTokens: stats.totalTokens,
        errorRate: stats.errorRate,
        activeKeyCount: stats.keys.filter((k) => k.isActive).length,
      },
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 },
    );
  }
}
