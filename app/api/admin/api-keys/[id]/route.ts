import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { geminiApiKeys } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/app/actions';

export async function PUT(
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

    const body = await request.json();
    const { displayName, priority, enabled } = body;

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

    const updated = await db
      .update(geminiApiKeys)
      .set({
        displayName: displayName !== undefined ? displayName : key.displayName,
        priority: priority !== undefined ? priority : key.priority,
        enabled: enabled !== undefined ? enabled : key.enabled,
        updatedAt: new Date(),
      })
      .where(eq(geminiApiKeys.id, id))
      .returning()
      .then((rows) => rows[0]);

    return NextResponse.json({
      id: updated.id,
      displayName: updated.displayName,
      priority: updated.priority,
      enabled: updated.enabled,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    if (key.isPrimary) {
      return NextResponse.json(
        { error: 'Cannot delete primary key' },
        { status: 400 },
      );
    }

    await db.delete(geminiApiKeys).where(eq(geminiApiKeys.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 },
    );
  }
}
