import { notFound, redirect } from 'next/navigation';
import { ChatInterface } from '@/components/chat-interface';
import { getUser } from '@/lib/auth-utils';
import { getChatWithUserAndInitialMessages } from '@/lib/db/chat-queries';
import { maindb } from '@/lib/db';
import { getChatById } from '@/lib/db/queries';
import { chat as chatTable, message as messageTable, Message, type Chat, type User } from '@/lib/db/schema';
import { Metadata } from 'next';
import { convertToUIMessages } from '@/lib/chat-messages';
import { eq } from 'drizzle-orm';
import { all } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

const CHAT_PRIMARY_BACKOFF_MAX_WAIT_MS = 15_000;
const CHAT_PRIMARY_BACKOFF_INITIAL_DELAY_MS = 250;
const CHAT_PRIMARY_BACKOFF_MAX_DELAY_MS = 2_000;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function getFreshUserFromSession(): Promise<User | null> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });
  return (session?.user as User | null) ?? null;
}

async function getChatWithMessagesFromPrimary({
  id,
}: {
  id: string;
}): Promise<{ chat: Chat | null; messages: Message[] }> {
  const chat = (await maindb.query.chat.findFirst({ where: eq(chatTable.id, id) })) ?? null;

  if (!chat) {
    return { chat: null, messages: [] };
  }

  const messages = await maindb.query.message.findMany({
    where: eq(messageTable.chatId, id),
    orderBy: (fields, { asc }) => [asc(fields.createdAt), asc(fields.id)],
  });

  return { chat: chat as unknown as Chat, messages: messages as unknown as Message[] };
}

async function getChatWithMessagesFromPrimaryWithBackoff(id: string): Promise<{ chat: Chat | null; messages: Message[] }> {
  const deadline = Date.now() + CHAT_PRIMARY_BACKOFF_MAX_WAIT_MS;
  let delayMs = CHAT_PRIMARY_BACKOFF_INITIAL_DELAY_MS;
  let result: { chat: Chat | null; messages: Message[] } = { chat: null, messages: [] };

  while (Date.now() < deadline) {
    result = await getChatWithMessagesFromPrimary({ id });
    if (result.chat) {
      return result;
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await sleep(Math.min(delayMs, remaining));
    delayMs = Math.min(delayMs * 2, CHAT_PRIMARY_BACKOFF_MAX_DELAY_MS);
  }

  return result;
}

// metadata
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = (await params).id;
  const chat = await getChatById({ id });

  if (!chat) {
    return { title: 'Scira Chat' };
  }

  const title = chat.title;
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

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  console.log('🔍 [PAGE] Starting optimized chat page load for:', id);
  const pageStartTime = Date.now();

  const { user, chatBundle, primaryFallback } = await all(
    {
      user: async function () {
        return getUser();
      },
      chatBundle: async function () {
        return getChatWithUserAndInitialMessages({
          id,
        });
      },
      primaryFallback: async function () {
        const { chat, messages } = await this.$.chatBundle;
        if (chat && messages.length > 0) return null;
        return getChatWithMessagesFromPrimaryWithBackoff(id);
      },
    },
    getBetterAllOptions(),
  );

  // Use optimized combined query to get chat, user, and messages in fewer DB calls
  let { chat, messages: messagesFromDb } = chatBundle;

  // Lookout/scheduled runs create chats server-side; replica reads can lag.
  // If the replica returns no chat or no messages, fall back to the primary DB for fresh reads.
  if (primaryFallback) {
    chat = primaryFallback.chat ?? chat;
    if (primaryFallback.messages.length > 0) {
      messagesFromDb = primaryFallback.messages;
    }
  }

  if (!chat) notFound();

  console.log('Chat: ', chat);
  console.log('Messages from DB: ', messagesFromDb);

  // Check visibility and ownership
  let effectiveUser = user;
  if (chat.visibility === 'private') {
    // Guard against stale in-process session cache returning null while
    // the request cookie is actually valid (prevents /search -> /sign-in -> / loop).
    if (!effectiveUser) {
      effectiveUser = await getFreshUserFromSession();
    }

    if (!effectiveUser) {
      redirect(`/sign-in?redirectTo=/search/${id}`);
    }

    if (effectiveUser.id !== chat.userId) {
      return notFound();
    }
  }

  const initialMessages = convertToUIMessages(messagesFromDb);

  // Determine if the current user owns this chat
  const isOwner = effectiveUser ? effectiveUser.id === chat.userId : false;

  const pageLoadTime = (Date.now() - pageStartTime) / 1000;
  console.log(`⏱️  [PAGE] Total page load time: ${pageLoadTime.toFixed(2)}s`);

  return (
    <ChatInterface
      key={`chat-interface-${id}`}
      initialChatId={id}
      initialMessages={initialMessages}
      initialVisibility={chat.visibility as 'public' | 'private'}
      isOwner={isOwner}
      chatTitle={chat.title}
    />
  );
}
