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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = (await params).id;
  const chat = await getChatById({ id });
  const user = await getUser();
  if (!chat) {
    return { title: 'Atlas Chat' };
  }
  let title;
  if (chat.visibility === 'public') {
    title = chat.title;
  }
  if (chat.visibility === 'private') {
    if (!user) {
      title = 'Atlas Chat';
    }
    if (user!.id !== chat.userId) {
      title = 'Atlas Chat';
    }
    title = chat.title;
  }
  return {
    title: title,
    description: 'A search in atlas.ai',
    openGraph: {
      title: title,
      url: `https://atlas.ai/search/${id}`,
      description: 'A search in atlas.ai',
      siteName: 'atlas.ai',
      images: [
        {
          url: `https://atlas.ai/api/og/chat/${id}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      url: `https://atlas.ai/search/${id}`,
      description: 'A search in atlas.ai',
      siteName: 'atlas.ai',
      creator: '@atlasai',
      images: [
        {
          url: `https://atlas.ai/api/og/chat/${id}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    alternates: {
      canonical: `https://atlas.ai/search/${id}`,
    },
  } as Metadata;
}

function convertToUIMessages(messages: Array<Message>): Array<UIMessage> {
  return messages.map((message) => {
    let processedParts = message.parts;

    if (message.role === 'user' && (!processedParts || !Array.isArray(processedParts) || processedParts.length === 0)) {
      processedParts = [
        {
          type: 'text',
          text: '',
        },
      ];
    }

    const content =
      processedParts && Array.isArray(processedParts)
        ? processedParts
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('\n')
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

  const messagesFromDb = await getMessagesByChatId({
    id,
    offset: 0,
  });

  console.log('Messages from DB: ', messagesFromDb);

  const initialMessages = convertToUIMessages(messagesFromDb);

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
