export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { assertAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { customInstructions, event } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateId } from 'ai';
import { pusher } from '@/lib/pusher';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const params = await props.params;
  const userId = decodeURIComponent(params.id);

  try {
    const instructions = await db.query.customInstructions.findFirst({
      where: eq(customInstructions.userId, userId),
    });

    return NextResponse.json({
      customInstructions: instructions?.content || '',
      searchProvider: 'parallel',
      agentOrder: [],
    });
  } catch (error) {
    console.error('Error getting user settings:', error);
    return NextResponse.json({ error: 'Failed to get user settings' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const params = await props.params;
  const userId = decodeURIComponent(params.id);
  const body = await req.json().catch(() => ({}));

  try {
    if ('customInstructions' in body) {
      await db
        .insert(customInstructions)
        .values({
          id: generateId(),
          userId: userId,
          content: body.customInstructions,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: customInstructions.userId,
          set: { content: body.customInstructions, updatedAt: new Date() },
        });
    }

    const evt = {
      id: crypto.randomUUID(),
      category: 'user' as any,
      type: 'settings_updated_by_admin',
      message: `Admin ${adminUser.name} a modifié les paramètres de l'utilisateur ${userId}`,
      metadata: { by: adminUser.id, changes: Object.keys(body) },
      userId: userId,
      createdAt: new Date(),
    };
    await db.insert(event).values(evt);

    try {
      await pusher.trigger('private-admin-events', 'new', evt);
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user settings:', error);
    return NextResponse.json({ error: 'Failed to update user settings' }, { status: 500 });
  }
}
