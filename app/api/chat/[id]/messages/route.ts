import { getMessagesByChatId } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: chatId } = await params;
    
    if (!chatId) {
      return new ChatSDKError('bad_request:api', 'Chat ID is required').toResponse();
    }

    const limit = new URL(req.url).searchParams.get('limit');
    const limitNumber = limit ? parseInt(limit, 10) : 100;

    const messages = await getMessagesByChatId({ id: chatId });

    // Return the last `limit` messages
    const recentMessages = messages.slice(-limitNumber);

    return new Response(
      JSON.stringify({
        success: true,
        messages: recentMessages as ChatMessage[],
        total: messages.length,
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
    console.error('Error fetching messages:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch messages',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
