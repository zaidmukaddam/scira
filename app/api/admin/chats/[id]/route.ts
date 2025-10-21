export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { assertAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { chat, message, user, event } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { pusher } from '@/lib/pusher';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const params = await props.params;
  const chatId = decodeURIComponent(params.id);

  try {
    const chatData = await db.query.chat.findFirst({
      where: eq(chat.id, chatId),
      with: {
        user: true,
      },
    });

    if (!chatData) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const messages = await db
      .select()
      .from(message)
      .where(eq(message.chatId, chatId))
      .orderBy(asc(message.createdAt));

    const evt = {
      id: crypto.randomUUID(),
      category: 'security' as any,
      type: 'admin_view_conversation',
      message: `Admin ${adminUser.name} a consulté conversation ${chatId}`,
      metadata: { adminId: adminUser.id, chatId, userId: chatData.userId },
      userId: adminUser.id,
      createdAt: new Date(),
    };
    await db.insert(event).values(evt);

    try {
      await pusher.trigger('private-admin-events', 'new', evt);
    } catch {}

    return NextResponse.json({
      chat: chatData,
      user: chatData.user,
      messages,
    });
  } catch (error) {
    console.error('Error getting chat:', error);
    return NextResponse.json({ error: 'Failed to get chat' }, { status: 500 });
  }
}
