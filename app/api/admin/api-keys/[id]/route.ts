import { NextRequest, NextResponse } from 'next/server';
import { getUser, isAdminEmail } from '@/lib/auth-utils';
import { adminUpdateApiKeyLimits } from '@/lib/api/api-key-manager';
import { z } from 'zod';
import { db } from '@/lib/db';
import { apiKeys, user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Schema for admin updating API key
const AdminUpdateApiKeySchema = z.object({
  rateLimitRpm: z.number().int().min(1).max(10000).optional(),
  rateLimitTpd: z.number().int().min(1000).max(1_000_000_000).optional(),
  allowedModels: z.array(z.string()).optional(),
  allowedTools: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check authentication
    const currentUser = await getUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    if (!isAdminEmail(currentUser.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id: keyId } = await params;

    // Verify the API key exists and get owner info
    const [keyData] = await db
      .select({
        keyId: apiKeys.id,
        keyName: apiKeys.name,
        userId: apiKeys.userId,
        userEmail: user.email,
        currentRpm: apiKeys.rateLimitRpm,
        currentTpd: apiKeys.rateLimitTpd,
      })
      .from(apiKeys)
      .innerJoin(user, eq(apiKeys.userId, user.id))
      .where(eq(apiKeys.id, keyId));

    if (!keyData) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const validatedData = AdminUpdateApiKeySchema.parse(body);

    // Add admin metadata
    const updates = {
      ...validatedData,
      metadata: {
        ...(validatedData.metadata || {}),
        lastUpdatedBy: currentUser.email,
        lastUpdatedAt: new Date().toISOString(),
        previousRpm: keyData.currentRpm,
        previousTpd: keyData.currentTpd,
      },
    };

    // Update the API key
    const updatedKey = await adminUpdateApiKeyLimits(keyId, updates);

    if (!updatedKey) {
      return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
    }

    return NextResponse.json({
      id: updatedKey.id,
      name: updatedKey.name,
      owner: keyData.userEmail,
      rateLimitRpm: updatedKey.rateLimitRpm,
      rateLimitTpd: updatedKey.rateLimitTpd,
      allowedModels: updatedKey.allowedModels,
      allowedTools: updatedKey.allowedTools,
      metadata: updatedKey.metadata,
      message: 'API key updated successfully by admin',
    });
  } catch (error) {
    console.error('Error updating API key (admin):', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check authentication
    const currentUser = await getUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    if (!isAdminEmail(currentUser.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id: keyId } = await params;

    // Get API key details with usage stats
    const [keyData] = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        userId: apiKeys.userId,
        userEmail: user.email,
        createdAt: apiKeys.createdAt,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        isActive: apiKeys.isActive,
        rateLimitRpm: apiKeys.rateLimitRpm,
        rateLimitTpd: apiKeys.rateLimitTpd,
        allowedModels: apiKeys.allowedModels,
        allowedTools: apiKeys.allowedTools,
        metadata: apiKeys.metadata,
      })
      .from(apiKeys)
      .innerJoin(user, eq(apiKeys.userId, user.id))
      .where(eq(apiKeys.id, keyId));

    if (!keyData) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return NextResponse.json(keyData);
  } catch (error) {
    console.error('Error fetching API key (admin):', error);
    return NextResponse.json({ error: 'Failed to fetch API key' }, { status: 500 });
  }
}
