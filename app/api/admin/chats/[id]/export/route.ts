export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { assertAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { chat, message, event } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { pusher } from '@/lib/pusher';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const chatId = decodeURIComponent(params.id);
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'txt';

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

    let content = '';

    if (format === 'markdown') {
      content = `# ${chatData.title}\n\n`;
      content += `**Utilisateur:** ${chatData.user?.name}\n`;
      content += `**Date:** ${new Date(chatData.createdAt).toLocaleString()}\n\n`;
      content += `---\n\n`;

      messages.forEach((msg: any) => {
        const role = msg.role === 'user' ? '👤 Utilisateur' : '🤖 Assistant';
        content += `## ${role} (${new Date(msg.createdAt).toLocaleString()})\n\n`;

        if (msg.model) content += `*Agent: ${msg.model}*\n\n`;

        const parts = msg.parts || [];
        parts.forEach((part: any) => {
          if (part.type === 'text') {
            content += `${part.text}\n\n`;
          }
        });

        content += `---\n\n`;
      });
    } else {
      content = `${chatData.title}\n`;
      content += `Utilisateur: ${chatData.user?.name}\n`;
      content += `Date: ${new Date(chatData.createdAt).toLocaleString()}\n`;
      content += `${'='.repeat(60)}\n\n`;

      messages.forEach((msg: any) => {
        const role = msg.role === 'user' ? 'UTILISATEUR' : 'ASSISTANT';
        content += `[${role}] ${new Date(msg.createdAt).toLocaleString()}`;
        if (msg.model) content += ` (${msg.model})`;
        content += `\n`;

        const parts = msg.parts || [];
        parts.forEach((part: any) => {
          if (part.type === 'text') {
            content += `${part.text}\n`;
          }
        });

        content += `\n${'-'.repeat(60)}\n\n`;
      });
    }

    const evt = {
      id: crypto.randomUUID(),
      category: 'security' as any,
      type: 'admin_export_conversation',
      message: `Admin ${adminUser.name} a exporté conversation ${chatId} (${format})`,
      metadata: { adminId: adminUser.id, chatId, format },
      userId: adminUser.id,
      createdAt: new Date(),
    };
    await db.insert(event).values(evt);

    try {
      await pusher.trigger('private-admin-events', 'new', evt);
    } catch {}

    return new Response(content, {
      headers: {
        'Content-Type': format === 'markdown' ? 'text/markdown' : 'text/plain',
        'Content-Disposition': `attachment; filename="conversation-${chatId}.${format === 'markdown' ? 'md' : 'txt'}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting chat:', error);
    return NextResponse.json({ error: 'Failed to export chat' }, { status: 500 });
  }
}
