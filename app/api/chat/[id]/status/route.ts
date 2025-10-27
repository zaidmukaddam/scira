import { getMessagesByChatId, getStreamIdsByChatId } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { differenceInSeconds } from 'date-fns';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: chatId } = await params;

    if (!chatId) {
      return new ChatSDKError('bad_request:api', 'Chat ID is required').toResponse();
    }

    const messages = await getMessagesByChatId({ id: chatId });
    const streamIds = await getStreamIdsByChatId({ chatId });

    const lastMessage = messages.at(-1);
    const lastAssistantMessage = messages
      .filter((m) => m.role === 'assistant')
      .at(-1);

    // Check if streaming is complete
    const isStreamingComplete =
      lastMessage?.role === 'assistant' &&
      lastAssistantMessage &&
      differenceInSeconds(new Date(), new Date(lastAssistantMessage.createdAt)) > 2;

    // Check if there's an active stream
    const hasActiveStream = streamIds.length > 0;

    return new Response(
      JSON.stringify({
        success: true,
        chatId,
        isStreamingComplete,
        hasActiveStream,
        lastMessageRole: lastMessage?.role,
        lastAssistantMessageTime: lastAssistantMessage?.createdAt,
        totalMessages: messages.length,
        messageCount: messages.filter((m) => m.role === 'assistant').length,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error checking chat status:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check status',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
