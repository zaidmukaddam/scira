import { notFound } from 'next/navigation';
import { ChatInterface } from '@/components/chat-interface';
import { getUser } from '@/lib/auth-utils';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { Message, type Chat } from '@/lib/db/schema';
import { Metadata } from 'next';
import { UIMessage, UIMessagePart } from 'ai';
import { ChatMessage, ChatTools, CustomUIDataTypes } from '@/lib/types';
import { formatISO } from 'date-fns';

async function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

async function fetchChatWithBackoff(id: string): Promise<Chat | undefined> {
  const maximumWaitMs = 5000;
  let delayMs = 250;
  const deadline = Date.now() + maximumWaitMs;

  // First immediate attempt
  let chat = await getChatById({ id });
  if (chat) return chat;

  while (Date.now() < deadline) {
    const remainingMs = deadline - Date.now();
    await sleep(Math.min(delayMs, remainingMs));
    chat = await getChatById({ id });
    if (chat) return chat;
    delayMs = Math.min(delayMs * 2, maximumWaitMs);
  }

  return undefined;
}

// metadata
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = (await params).id;
  const chat = await fetchChatWithBackoff(id);
  const user = await getUser();
  // if not chat, return Scira Chat
  if (!chat) {
    return { title: 'Scira Chat' };
  }
  let title;
  // if chat is public, return title
  if (chat.visibility === 'public') {
    title = chat.title;
  }
  // if chat is private, return title
  if (chat.visibility === 'private') {
    if (!user) {
      title = 'Scira Chat';
    }
    if (user!.id !== chat.userId) {
      title = 'Scira Chat';
    }
    title = chat.title;
  }
  return {
    title: title,
    description: 'A search in scira.ai',
    openGraph: {
      title: title,
      url: `https://scira.ai/search/${id}`,
      description: 'A search in scira.ai',
      siteName: 'scira.ai',
      images: [
        {
          url: `https://scira.ai/api/og/chat/${id}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      url: `https://scira.ai/search/${id}`,
      description: 'A search in scira.ai',
      siteName: 'scira.ai',
      creator: '@sciraai',
      images: [
        {
          url: `https://scira.ai/api/og/chat/${id}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    alternates: {
      canonical: `https://scira.ai/search/${id}`,
    },
  } as Metadata;
}

export function convertToUIMessages(messages: Message[]): ChatMessage[] {
  console.log('Messages: ', messages);

  return messages.map((message) => {
    // Handle the parts array which comes from JSON in the database
    const partsArray = Array.isArray(message.parts) ? message.parts : [];
    const convertedParts = partsArray
      // First convert legacy tool invocations
      .map((part: unknown) => convertLegacyToolInvocation(part))
      // Then convert legacy reasoning parts
      .map((part: unknown) => convertLegacyReasoningPart(part));

    return {
      id: message.id,
      role: message.role as 'user' | 'assistant' | 'system',
      parts: convertedParts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
      metadata: {
        createdAt: formatISO(message.createdAt),
      },
    };
  });
}

function convertLegacyToolInvocation(part: unknown): unknown {
  // Check if this is a legacy tool-invocation part
  if (
    typeof part === 'object' &&
    part !== null &&
    'type' in part &&
    part.type === 'tool-invocation' &&
    'toolInvocation' in part &&
    typeof part.toolInvocation === 'object' &&
    part.toolInvocation !== null &&
    'toolName' in part.toolInvocation
  ) {
    const toolInvocation = part.toolInvocation as {
      toolName: string;
      toolCallId: string;
      state: string;
      args: unknown;
      result: unknown;
    };

    // Map old state to new state
    const mapState = (oldState: string): string => {
      switch (oldState) {
        case 'result':
          return 'output-available';
        case 'partial-result':
          return 'input-available';
        case 'call':
          return 'input-streaming';
        default:
          return oldState; // Keep unknown states as-is
      }
    };

    // Return the new format
    return {
      type: `tool-${toolInvocation.toolName}`,
      toolCallId: toolInvocation.toolCallId,
      state: mapState(toolInvocation.state),
      input: toolInvocation.args,
      output: toolInvocation.result,
    };
  }

  // Return the part unchanged if it's not a legacy tool-invocation
  return part;
}

// Convert legacy reasoning structures to the standard ReasoningUIPart shape
function convertLegacyReasoningPart(part: unknown): unknown {
  if (typeof part !== 'object' || part === null || !('type' in part)) {
    return part;
  }

  // Narrow the type
  const maybePart = part as {
    type?: unknown;
    text?: unknown;
    reasoning?: unknown;
    details?: unknown;
  };

  // Only handle legacy reasoning-like entries
  if (maybePart.type === 'reasoning') {
    // If already in the desired shape (has string text), keep as-is
    if (typeof maybePart.text === 'string' && maybePart.text.length > 0) {
      return part;
    }

    // Collect text from possible legacy fields
    const mainText = typeof maybePart.reasoning === 'string' ? maybePart.reasoning : '';

    let detailsText = '';
    if (Array.isArray(maybePart.details)) {
      const collected: string[] = [];
      for (const entry of maybePart.details as Array<unknown>) {
        if (
          typeof entry === 'object' &&
          entry !== null &&
          'type' in entry &&
          (entry as { type?: unknown }).type === 'text' &&
          'text' in entry &&
          typeof (entry as { text?: unknown }).text === 'string'
        ) {
          collected.push((entry as { text: string }).text);
        }
      }
      if (collected.length > 0) {
        detailsText = collected.join('\n\n');
      }
    }

    const combinedText = [mainText, detailsText].filter((v) => v && v.trim().length > 0).join('\n\n');

    return {
      type: 'reasoning',
      text: combinedText,
    };
  }

  // Some logs store step markers; ignore or pass-through for non-reasoning types
  return part;
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await fetchChatWithBackoff(id);

  if (!chat) {
    notFound();
  }

  console.log('Chat: ', chat);

  const user = await getUser();

  if (chat.visibility === 'private') {
    if (!user) {
      return notFound();
    }

    if (user.id !== chat.userId) {
      return notFound();
    }
  }

  // Fetch only the initial 20 messages for faster loading
  const messagesFromDb = await getMessagesByChatId({
    id,
    offset: 0,
  });

  console.log('Messages from DB: ', messagesFromDb);

  const initialMessages = convertToUIMessages(messagesFromDb);

  // Determine if the current user owns this chat
  const isOwner = user ? user.id === chat.userId : false;

  return (
    <ChatInterface
      initialChatId={id}
      initialMessages={initialMessages}
      initialVisibility={chat.visibility as 'public' | 'private'}
      isOwner={isOwner}
    />
  );
}
