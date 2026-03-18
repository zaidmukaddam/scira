import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { eq } from 'drizzle-orm';
import { getUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { message as messageTable } from '@/lib/db/schema';
import { getChatById, getChatWithUserById } from '@/lib/db/queries';
import { convertToUIMessages } from '@/lib/chat-messages';
import { ShareViewer } from '@/components/share-viewer';
import { SidebarLayout } from '@/components/sidebar-layout';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = (await params).id;
  const chat = await getChatById({ id });

  if (!chat || chat.visibility !== 'public') {
    return { title: 'Scira Chat' };
  }

  return {
    title: chat.title,
    description: 'A shared chat on scira.ai',
    openGraph: {
      title: chat.title,
      url: `https://scira.ai/share/${id}`,
      description: 'A shared chat on scira.ai',
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
      title: chat.title,
      url: `https://scira.ai/share/${id}`,
      description: 'A shared chat on scira.ai',
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
      canonical: `https://scira.ai/share/${id}`,
    },
  } as Metadata;
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  const userPromise = getUser();
  const chat = await getChatWithUserById({ id });

  if (!chat || chat.visibility !== 'public') {
    return notFound();
  }

  const messages = await db.query.message.findMany({
    where: eq(messageTable.chatId, id),
    orderBy: (fields, { asc }) => [asc(fields.createdAt), asc(fields.id)],
  });

  const user = await userPromise;
  const shareUrl = `https://scira.ai/share/${id}`;
  const uiMessages = convertToUIMessages(messages);

  const sharedBy = chat.userName || chat.userEmail || 'Scira user';

  return (
    <SidebarLayout>
      <ShareViewer
        chatId={id}
        chatTitle={chat.title}
        shareUrl={shareUrl}
        messages={uiMessages}
        isSignedIn={Boolean(user)}
        sharedBy={sharedBy}
      />
    </SidebarLayout>
  );
}
