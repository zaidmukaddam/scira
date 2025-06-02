import { notFound } from 'next/navigation';
import { ChatInterface } from '@/components/chat-interface';
import { getUser } from '@/lib/auth-utils';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { Message } from '@/lib/db/schema';
import { Metadata } from 'next';

interface UIMessage {
  id: string;
  parts: any;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: Date;
  experimental_attachments?: Array<any>;
}

// metadata
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const chat = await getChatById({ id });
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
    title: title, description: "A search in scira.ai",
    openGraph: {
      title: title,
      url: `https://scira.ai/s/${id}`,
      description: "A search in scira.ai",
      siteName: "scira.ai",
      images: [{
        url: `https://scira.ai/api/og/chat/${id}`,
        width: 1200,
        height: 630,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      url: `https://scira.ai/s/${id}`,
      description: "A search in scira.ai",
      siteName: "scira.ai",
      creator: "@sciraai",
      images: [{
        url: `https://scira.ai/api/og/chat/${id}`,
        width: 1200,
        height: 630,
      }],
    },
    alternates: {
      canonical: `https://scira.ai/s/${id}`,
    },
  } as Metadata;
}

function convertToUIMessages(messages: Array<Message>): Array<UIMessage> {
  return messages.map((message) => {
    // Ensure parts are properly structured
    let processedParts = message.parts;

    // If parts is missing or empty for a user message, create a text part from empty string
    if (message.role === 'user' && (!processedParts || !Array.isArray(processedParts) || processedParts.length === 0)) {
      // Create an empty text part since there's no content property in DBMessage
      processedParts = [{
        type: 'text',
        text: '',
      }];
    }

    // Extract content from parts or use empty string
    const content = processedParts && Array.isArray(processedParts)
      ? processedParts.filter((part: any) => part.type === 'text').map((part: any) => part.text).join('\n')
      : '';

    return {
      id: message.id,
      parts: processedParts,
      role: message.role as UIMessage['role'],
      content,
      createdAt: message.createdAt,
      experimental_attachments: (message.attachments as Array<any>) ?? [],
    };
  });
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  console.log("Chat: ", chat);

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
    offset: 0
  });

  console.log("Messages from DB: ", messagesFromDb);

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