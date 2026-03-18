import { auth } from '@/lib/auth';
import { getChatById, getLatestStreamIdByChatId } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { createResumableUIMessageStream } from 'ai-resumable-stream';
import { getResumableStreamClients } from '@/lib/redis';
import { all } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = await params;

  const clients = getResumableStreamClients();

  if (!clients) {
    return new Response(null, { status: 204 });
  }

  if (!chatId) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const { session, chat, latestStreamId } = await all(
    {
      async session() {
        return auth.api.getSession(req);
      },
      async chat() {
        return getChatById({ id: chatId }).catch(() => null);
      },
      async latestStreamId() {
        return getLatestStreamIdByChatId({ chatId });
      },
    },
    getBetterAllOptions(),
  );

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  if (!latestStreamId) {
    return new Response(null, { status: 204 });
  }

  const context = await createResumableUIMessageStream({
    streamId: latestStreamId,
    publisher: clients.publisher,
    subscriber: clients.subscriber,
  });

  await context.stopStream();

  return new Response(null, { status: 200 });
}
