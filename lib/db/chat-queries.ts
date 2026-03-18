import 'server-only';

import { eq } from 'drizzle-orm';
import { chat, type User, message, type Message, type Chat } from './schema';
import { ChatSDKError } from '../errors';
import { db, maindb } from './index';

interface MessagePage {
  hasMoreMessages: boolean;
  messages: Message[];
}

async function getRecentMessagesPage({
  chatId,
  database,
  limit = 20,
  offset = 0,
}: {
  chatId: string;
  database: typeof db;
  limit?: number;
  offset?: number;
}): Promise<MessagePage> {
  const messages = await database.query.message.findMany({
    where: eq(message.chatId, chatId),
    orderBy: (fields, { desc: orderDesc }) => [orderDesc(fields.createdAt), orderDesc(fields.id)],
    limit: limit + 1,
    offset,
  });

  const hasMoreMessages = messages.length > limit;
  const visibleMessages = hasMoreMessages ? messages.slice(0, limit) : messages;

  return {
    hasMoreMessages,
    messages: visibleMessages.toReversed() as Message[],
  };
}

// Combined query to get chat and initial messages in one database call
export async function getChatWithInitialMessages({
  id,
  messageLimit = 20,
  messageOffset = 0,
}: {
  id: string;
  messageLimit?: number;
  messageOffset?: number;
}): Promise<{
  chat: Chat | null;
  messages: Message[];
  hasMoreMessages: boolean;
}> {
  try {
    console.log('🔍 [DB-OPTIMIZED] getChatWithInitialMessages: Starting combined query (db.query.chat)...');
    const startTime = Date.now();

    const record = await db.query.chat.findFirst({
      where: eq(chat.id, id),
    });

    if (!record) {
      return {
        chat: null,
        messages: [],
        hasMoreMessages: false,
      };
    }

    const { messages, hasMoreMessages } = await getRecentMessagesPage({
      chatId: id,
      database: db,
      limit: messageLimit,
      offset: messageOffset,
    });

    const queryTime = (Date.now() - startTime) / 1000;
    console.log(`⏱️  [DB-OPTIMIZED] getChatWithInitialMessages: db.query.chat took ${queryTime.toFixed(2)}s`);

    return {
      chat: record,
      messages,
      hasMoreMessages,
    };
  } catch (error) {
    console.error('Error in getChatWithInitialMessages:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to get chat with messages');
  }
}

// Optimized query to get chat with user data for ownership checks
export async function getChatWithUserAndInitialMessages({
  id,
}: {
  id: string;
}): Promise<{
  chat: Chat | null;
  user: User | null;
  messages: Message[];
  hasMoreMessages: boolean;
}> {
  try {
    console.log('🔍 [DB-OPTIMIZED] getChatWithUserAndInitialMessages: Starting optimized query (db.query.chat)...');
    const startTime = Date.now();

    const record = await maindb.query.chat.findFirst({
      where: eq(chat.id, id),
    });

    if (!record) {
      return {
        chat: null,
        user: null,
        messages: [],
        hasMoreMessages: false,
      };
    }

    // The only caller already fetches the current session user separately,
    // so avoid joining the chat owner row here.
    const messages = await maindb.query.message.findMany({
      where: eq(message.chatId, id),
      orderBy: (fields, { asc: orderAsc }) => [orderAsc(fields.createdAt), orderAsc(fields.id)],
    });

    const queryTime = (Date.now() - startTime) / 1000;
    console.log(
      `⏱️  [DB-OPTIMIZED] getChatWithUserAndInitialMessages: db.query.chat (with user + messages) took ${queryTime.toFixed(
        2,
      )}s`,
    );

    return {
      chat: record,
      user: null,
      messages,
      hasMoreMessages: false,
    };
  } catch (error) {
    console.error('Error in getChatWithUserAndInitialMessages:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to get chat with user and messages');
  }
}

// Batch query to get multiple chats with their initial messages
export async function getChatsWithInitialMessages({
  chatIds,
  messageLimit = 20,
}: {
  chatIds: string[];
  messageLimit?: number;
}): Promise<{
  [chatId: string]: {
    chat: Chat | null;
    messages: Message[];
    hasMoreMessages: boolean;
  };
}> {
  try {
    if (chatIds.length === 0) {
      return {};
    }

    console.log('🔍 [DB-OPTIMIZED] getChatsWithInitialMessages: Starting batch query (db.query.chat)...');
    const startTime = Date.now();


    const chatsWithMessages = await db.query.chat.findMany({
      where: (fields, { inArray }) => inArray(fields.id, chatIds),
      with: {
        messages: {
          orderBy: (fields, { asc: orderAsc }) => [orderAsc(fields.createdAt), orderAsc(fields.id)],
          limit: messageLimit + 1,
        },
      },
    });

    const result: {
      [chatId: string]: {
        chat: Chat | null;
        messages: Message[];
        hasMoreMessages: boolean;
      };
    } = {};

    chatsWithMessages.forEach((record) => {
      const messages = ((record as unknown as { messages?: Message[] }).messages as Message[]) || [];
      const hasMoreMessages = messages.length > messageLimit;
      const limitedMessages = hasMoreMessages ? messages.slice(0, messageLimit) : messages;

      result[record.id] = {
        chat: record as unknown as Chat,
        messages: limitedMessages,
        hasMoreMessages,
      };
    });

    // Ensure all requested chatIds are present in the result
    chatIds.forEach((id) => {
      if (!result[id]) {
        result[id] = {
          chat: null,
          messages: [],
          hasMoreMessages: false,
        };
      }
    });

    const queryTime = (Date.now() - startTime) / 1000;
    console.log(
      `⏱️  [DB-OPTIMIZED] getChatsWithInitialMessages: db.query.chat batch query took ${queryTime.toFixed(2)}s`,
    );

    return result;
  } catch (error) {
    console.error('Error in getChatsWithInitialMessages:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to get chats with messages');
  }
}

// Optimized query to check chat visibility and ownership
export async function getChatVisibilityAndOwnership({ id, userId }: { id: string; userId?: string }): Promise<{
  chat: Chat | null;
  isOwner: boolean;
  canAccess: boolean;
}> {
  try {
    console.log('🔍 [DB-OPTIMIZED] getChatVisibilityAndOwnership: Starting visibility check (db.query.chat)...');
    const startTime = Date.now();


    const record = await db.query.chat.findFirst({
      where: eq(chat.id, id),
      columns: {
        id: true,
        userId: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        title: true,
      },
    });

    if (!record) {
      return {
        chat: null,
        isOwner: false,
        canAccess: false,
      };
    }

    const isOwner = userId ? record.userId === userId : false;
    const canAccess = record.visibility === 'public' || isOwner;

    const queryTime = (Date.now() - startTime) / 1000;
    console.log(
      `⏱️  [DB-OPTIMIZED] getChatVisibilityAndOwnership: db.query.chat visibility check took ${queryTime.toFixed(2)}s`,
    );

    return {
      chat: record as unknown as Chat,
      isOwner,
      canAccess,
    };
  } catch (error) {
    console.error('Error in getChatVisibilityAndOwnership:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to check chat visibility and ownership');
  }
}

// Get additional messages for pagination
export async function getAdditionalMessages({
  chatId,
  limit = 20,
  offset = 0,
}: {
  chatId: string;
  limit?: number;
  offset?: number;
}): Promise<{
  messages: Message[];
  hasMore: boolean;
}> {
  try {
    const { messages, hasMoreMessages } = await getRecentMessagesPage({
      chatId,
      database: db,
      limit,
      offset,
    });

    return {
      messages,
      hasMore: hasMoreMessages,
    };
  } catch (error) {
    console.error('Error in getAdditionalMessages:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to get additional messages');
  }
}
