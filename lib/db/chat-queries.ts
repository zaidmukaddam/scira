import 'server-only';

import { asc, eq, inArray } from 'drizzle-orm';
import {
  user,
  chat,
  type User,
  message,
  type Message,
  type Chat,
} from './schema';
import { ChatSDKError } from '../errors';
import { db } from './index';

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
    console.log('🔍 [DB-OPTIMIZED] getChatWithInitialMessages: Starting combined query...');
    const startTime = Date.now();

    // Get chat data
    const [selectedChat] = await db
      .select()
      .from(chat)
      .where(eq(chat.id, id))
      .limit(1)
      .$withCache();

    if (!selectedChat) {
      return {
        chat: null,
        messages: [],
        hasMoreMessages: false,
      };
    }

    // Get initial messages with limit + 1 to check if there are more
    const messages = await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt))
      .limit(messageLimit + 1)
      .offset(messageOffset)
      .$withCache();

    const hasMoreMessages = messages.length > messageLimit;
    const limitedMessages = hasMoreMessages ? messages.slice(0, messageLimit) : messages;

    const queryTime = (Date.now() - startTime) / 1000;
    console.log(`⏱️  [DB-OPTIMIZED] getChatWithInitialMessages: Combined query took ${queryTime.toFixed(2)}s`);

    return {
      chat: selectedChat,
      messages: limitedMessages,
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
  messageLimit = 20,
  messageOffset = 0,
}: {
  id: string;
  messageLimit?: number;
  messageOffset?: number;
}): Promise<{
  chat: Chat | null;
  user: User | null;
  messages: Message[];
  hasMoreMessages: boolean;
}> {
  try {
    console.log('🔍 [DB-OPTIMIZED] getChatWithUserAndInitialMessages: Starting optimized query...');
    const startTime = Date.now();

    // Get chat with user data in one query
    const [chatWithUser] = await db
      .select({
        chat: chat,
        user: user,
      })
      .from(chat)
      .leftJoin(user, eq(chat.userId, user.id))
      .where(eq(chat.id, id))
      .limit(1)
      .$withCache();

    if (!chatWithUser?.chat) {
      return {
        chat: null,
        user: null,
        messages: [],
        hasMoreMessages: false,
      };
    }

    // Get initial messages
    const messages = await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt))
      .limit(messageLimit + 1)
      .offset(messageOffset)
      .$withCache();

    const hasMoreMessages = messages.length > messageLimit;
    const limitedMessages = hasMoreMessages ? messages.slice(0, messageLimit) : messages;

    const queryTime = (Date.now() - startTime) / 1000;
    console.log(`⏱️  [DB-OPTIMIZED] getChatWithUserAndInitialMessages: Optimized query took ${queryTime.toFixed(2)}s`);

    return {
      chat: chatWithUser.chat,
      user: chatWithUser.user,
      messages: limitedMessages,
      hasMoreMessages,
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

    console.log('🔍 [DB-OPTIMIZED] getChatsWithInitialMessages: Starting batch query...');
    const startTime = Date.now();

    // Get all chats in one query
    const chats = await db
      .select()
      .from(chat)
      .where(inArray(chat.id, chatIds))
      .$withCache();

    const chatMap = new Map(chats.map(c => [c.id, c]));

    // Get all messages for these chats in one query
    const allMessages = await db
      .select()
      .from(message)
      .where(inArray(message.chatId, chatIds))
      .orderBy(asc(message.createdAt))
      .$withCache();

    // Group messages by chat ID and apply limits
    const messagesByChat = new Map<string, Message[]>();
    allMessages.forEach(msg => {
      if (!messagesByChat.has(msg.chatId)) {
        messagesByChat.set(msg.chatId, []);
      }
      messagesByChat.get(msg.chatId)!.push(msg);
    });

    // Build result object
    const result: {
      [chatId: string]: {
        chat: Chat | null;
        messages: Message[];
        hasMoreMessages: boolean;
      };
    } = {};

    chatIds.forEach(chatId => {
      const chat = chatMap.get(chatId) || null;
      const messages = messagesByChat.get(chatId) || [];
      const hasMoreMessages = messages.length > messageLimit;
      const limitedMessages = hasMoreMessages ? messages.slice(0, messageLimit) : messages;

      result[chatId] = {
        chat,
        messages: limitedMessages,
        hasMoreMessages,
      };
    });

    const queryTime = (Date.now() - startTime) / 1000;
    console.log(`⏱️  [DB-OPTIMIZED] getChatsWithInitialMessages: Batch query took ${queryTime.toFixed(2)}s`);

    return result;
  } catch (error) {
    console.error('Error in getChatsWithInitialMessages:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to get chats with messages');
  }
}

// Optimized query to check chat visibility and ownership
export async function getChatVisibilityAndOwnership({
  id,
  userId,
}: {
  id: string;
  userId?: string;
}): Promise<{
  chat: Chat | null;
  isOwner: boolean;
  canAccess: boolean;
}> {
  try {
    console.log('🔍 [DB-OPTIMIZED] getChatVisibilityAndOwnership: Starting visibility check...');
    const startTime = Date.now();

    const [selectedChat] = await db
      .select()
      .from(chat)
      .where(eq(chat.id, id))
      .$withCache();

    if (!selectedChat) {
      return {
        chat: null,
        isOwner: false,
        canAccess: false,
      };
    }

    const isOwner = userId ? selectedChat.userId === userId : false;
    const canAccess = selectedChat.visibility === 'public' || isOwner;

    const queryTime = (Date.now() - startTime) / 1000;
    console.log(`⏱️  [DB-OPTIMIZED] getChatVisibilityAndOwnership: Visibility check took ${queryTime.toFixed(2)}s`);

    return {
      chat: selectedChat,
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
    const messages = await db
      .select()
      .from(message)
      .where(eq(message.chatId, chatId))
      .orderBy(asc(message.createdAt))
      .limit(limit + 1)
      .offset(offset)
      .$withCache();

    const hasMore = messages.length > limit;
    const limitedMessages = hasMore ? messages.slice(0, limit) : messages;

    return {
      messages: limitedMessages,
      hasMore,
    };
  } catch (error) {
    console.error('Error in getAdditionalMessages:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to get additional messages');
  }
}
