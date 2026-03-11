import { NextRequest, NextResponse } from 'next/server';
import { getUser, isAdminEmail } from '@/lib/auth-utils';
import { updateApiKeyLimits, getUserApiKeys } from '@/lib/api/api-key-manager';
import { z } from 'zod';

// Schema for updating API key
const UpdateApiKeySchema = z.object({
  rateLimitRpm: z.number().int().min(1).max(10000).optional(),
  rateLimitTpd: z.number().int().min(1000).max(1_000_000_000).optional(),
  allowedModels: z.array(z.string()).optional(),
  allowedTools: z.array(z.string()).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: keyId } = await params;
    const isAdmin = isAdminEmail(user.email);

    // Verify the user owns this API key (unless admin)
    if (!isAdmin) {
      const userKeys = await getUserApiKeys(user.id);
      const keyExists = userKeys.some((key) => key.id === keyId);

      if (!keyExists) {
        return NextResponse.json({ error: 'API key not found or unauthorized' }, { status: 404 });
      }
    }

    // Parse request body
    const body = await request.json();
    const validatedData = UpdateApiKeySchema.parse(body);

    // Update the API key
    const updatedKey = await updateApiKeyLimits(keyId, validatedData);

    if (!updatedKey) {
      return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
    }

    return NextResponse.json({
      id: updatedKey.id,
      name: updatedKey.name,
      rateLimitRpm: updatedKey.rateLimitRpm,
      rateLimitTpd: updatedKey.rateLimitTpd,
      allowedModels: updatedKey.allowedModels,
      allowedTools: updatedKey.allowedTools,
      message: 'API key updated successfully',
    });
  } catch (error) {
    console.error('Error updating API key:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
  }
}
