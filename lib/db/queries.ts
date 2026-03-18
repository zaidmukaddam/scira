import 'server-only';

import { cache } from 'react';
import { and, asc, desc, eq, gt, gte, isNotNull, isNull, lt, or, sql, type SQL } from 'drizzle-orm';
import {
  user,
  chat,
  type User,
  message,
  type Message,
  stream,
  extremeSearchUsage,
  messageUsage,
  customInstructions,
  userPreferences,
  dodosubscription,
  lookout,
  userMcpServer,
  buildSession,
} from './schema';
import { ChatSDKError } from '../errors';
import { db, maindb } from './index';
import { getDodoSubscriptions, setDodoSubscriptions, getDodoProStatus, setDodoProStatus } from '../performance-cache';
import { all } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';

type VisibilityType = 'public' | 'private';
type DodoSubscriptionRow = typeof dodosubscription.$inferSelect;

function getValidDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function isActiveDodoSubscriptionRecord(
  subscriptionRow: {
    currentPeriodEnd: Date | string | null;
    status: string;
    cancelAtPeriodEnd: boolean | null;
  },
  now: Date,
): boolean {
  const periodEnd = getValidDate(subscriptionRow.currentPeriodEnd);
  const isWithinPaidPeriod = !periodEnd || periodEnd > now;

  if (!isWithinPaidPeriod) return false;
  if (subscriptionRow.status === 'active') return true;
  if (subscriptionRow.status === 'cancelled' && subscriptionRow.cancelAtPeriodEnd === true) return true;

  return false;
}

async function getCachedOrFreshDodoSubscriptions(userId: string) {
  const cachedSubscriptions = getDodoSubscriptions(userId);
  if (cachedSubscriptions) return cachedSubscriptions as DodoSubscriptionRow[];

  const subscriptions = await maindb
    .select()
    .from(dodosubscription)
    .where(eq(dodosubscription.userId, userId))
    .orderBy(desc(dodosubscription.createdAt));

  setDodoSubscriptions(userId, subscriptions);
  return subscriptions;
}

// Cache user lookups for the duration of the request
export const getUser = cache(async (email: string): Promise<Array<User>> => {
  try {
    return await db.select().from(user).where(eq(user.email, email)).limit(1);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get user by email');
  }
});

// Cache user by ID lookups for the duration of the request
export const getUserById = cache(async (id: string): Promise<User | null> => {
  try {
    const [selectedUser] = await db.select().from(user).where(eq(user.id, id)).limit(1);
    return selectedUser || null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get user by id');
  }
});

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await maindb.insert(chat).values({
      id,
      userId,
      title,
      visibility,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat' + error);
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    // Use transaction to ensure atomicity - if chat deletion fails,
    // message and stream deletions are rolled back
    return await maindb.transaction(async (tx) => {
      // Delete messages and streams in parallel within the transaction using better-all
      await all(
        {
          deleteMessages: async function () {
            await tx.delete(message).where(eq(message.chatId, id));
            return true;
          },
          deleteStreams: async function () {
            await tx.delete(stream).where(eq(stream.chatId, id));
            return true;
          },
        },
        getBetterAllOptions(),
      );

      // Delete the chat and return the deleted record
      const [chatsDeleted] = await tx.delete(chat).where(eq(chat.id, id)).returning();
      return chatsDeleted;
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete chat by id');
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
  cursorDate,
  cursorIsPinned,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
  cursorDate?: string | null;
  cursorIsPinned?: boolean | null;
}) {
  try {
    const extendedLimit = limit + 1;

    // Select only necessary columns for better performance
    const query = (whereCondition?: SQL<any>) =>
      maindb
        .select({
          id: chat.id,
          userId: chat.userId,
          title: chat.title,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          isPinned: chat.isPinned,
          visibility: chat.visibility,
        })
        .from(chat)
        .where(whereCondition ? and(whereCondition, eq(chat.userId, id)) : eq(chat.userId, id))
        .orderBy(desc(chat.isPinned), desc(chat.updatedAt), desc(chat.id))
        .limit(extendedLimit);

    let filteredChats: Array<any> = [];

    if (startingAfter) {
      // If we have a direct timestamp cursor, skip the extra lookup
      const cursorTimestamp = cursorDate ? new Date(cursorDate) : null;
      if (cursorTimestamp) {
        filteredChats = await query(gt(chat.updatedAt, cursorTimestamp));
      } else {
        const [selectedChat] = await maindb
          .select({ updatedAt: chat.updatedAt })
          .from(chat)
          .where(eq(chat.id, startingAfter))
          .limit(1);

        if (!selectedChat) {
          throw new ChatSDKError('not_found:database', `Chat with id ${startingAfter} not found`);
        }

        filteredChats = await query(gt(chat.updatedAt, selectedChat.updatedAt));
      }
    } else if (endingBefore) {
      // If we have a direct timestamp cursor, skip the extra lookup
      const cursorTimestamp = cursorDate ? new Date(cursorDate) : null;
      if (cursorTimestamp) {
        if (cursorIsPinned) {
          filteredChats = await query(
            or(and(eq(chat.isPinned, true), lt(chat.updatedAt, cursorTimestamp)), eq(chat.isPinned, false)),
          );
        } else {
          filteredChats = await query(and(eq(chat.isPinned, false), lt(chat.updatedAt, cursorTimestamp)));
        }
      } else {
        const [selectedChat] = await maindb
          .select({ updatedAt: chat.updatedAt, isPinned: chat.isPinned })
          .from(chat)
          .where(eq(chat.id, endingBefore))
          .limit(1);

        if (!selectedChat) {
          throw new ChatSDKError('not_found:database', `Chat with id ${endingBefore} not found`);
        }

        if (selectedChat.isPinned) {
          filteredChats = await query(
            or(and(eq(chat.isPinned, true), lt(chat.updatedAt, selectedChat.updatedAt)), eq(chat.isPinned, false)),
          );
        } else {
          filteredChats = await query(and(eq(chat.isPinned, false), lt(chat.updatedAt, selectedChat.updatedAt)));
        }
      }
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chats by user id');
  }
}

// Lightweight query for sidebar recent chats - minimal columns, no pagination cursor logic
export async function getRecentChatsByUserId({ userId, limit = 8 }: { userId: string; limit?: number }): Promise<{
  chats: Array<{
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    isPinned: boolean;
    visibility: 'public' | 'private';
  }>;
  hasMore: boolean;
}> {
  try {
    const extendedLimit = limit + 1;
    // Use maindb (primary) so newly created chats appear immediately without replication lag
    const results = await maindb
      .select({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        isPinned: chat.isPinned,
        visibility: chat.visibility,
      })
      .from(chat)
      .leftJoin(buildSession, eq(buildSession.chatId, chat.id))
      .where(and(eq(chat.userId, userId), isNull(buildSession.chatId)))
      .orderBy(desc(chat.isPinned), desc(chat.updatedAt), desc(chat.id))
      .limit(extendedLimit);

    const hasMore = results.length > limit;
    return {
      chats: hasMore ? results.slice(0, limit) : results,
      hasMore,
    };
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get recent chats by user id');
  }
}

// Lightweight version that only fetches id and userId for ownership validation - cached per request
export const getChatByIdForValidation = cache(
  async ({ id }: { id: string }): Promise<{ id: string; userId: string } | null> => {
    try {
      const [selectedChat] = await maindb
        .select({ id: chat.id, userId: chat.userId })
        .from(chat)
        .where(eq(chat.id, id))
        .limit(1);
      return selectedChat || null;
    } catch (error) {
      throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
    }
  },
);

// Cache chat lookups for the duration of the request
export const getChatById = cache(async ({ id }: { id: string }) => {
  try {
    console.log('🔍 [DB-DETAIL] getChatById: Starting query...');
    const cacheQueryStart = Date.now();
    // Use direct select instead of relational query for better performance
    const [selectedChat] = await maindb.select().from(chat).where(eq(chat.id, id)).limit(1);
    const cacheQueryTime = (Date.now() - cacheQueryStart) / 1000;
    console.log(`⏱️  [DB-DETAIL] getChatById: Query (with cache) took ${cacheQueryTime.toFixed(2)}s`);
    return selectedChat || null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
});

export async function getChatWithUserById({ id }: { id: string }) {
  try {
    const [result] = await maindb
      .select({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        visibility: chat.visibility,
        userId: chat.userId,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
      })
      .from(chat)
      .innerJoin(user, eq(chat.userId, user.id))
      .where(eq(chat.id, id));
    return result;
  } catch (error) {
    console.log('Error getting chat with user by id', error);
    return null;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  if (!messages.length) return [];

  try {
    const insertBatchSize = 50;
    const payloadBatchThresholdBytes = 256 * 1024;
    const isSingleChat = messages.every((messageItem) => messageItem.chatId === messages[0].chatId);

    let estimatedPayloadBytes = 0;
    for (const messageItem of messages) {
      estimatedPayloadBytes += Buffer.byteLength(JSON.stringify(messageItem.parts));
      estimatedPayloadBytes += Buffer.byteLength(JSON.stringify(messageItem.attachments));
      if (estimatedPayloadBytes >= payloadBatchThresholdBytes) break;
    }

    const shouldBatch =
      messages.length > insertBatchSize &&
      (messages.length > insertBatchSize * 2 || estimatedPayloadBytes >= payloadBatchThresholdBytes);

    if (!shouldBatch) {
      const insertResult = await maindb.insert(message).values(messages).onConflictDoNothing({ target: message.id });

      if (isSingleChat) {
        let latestMessageAt = messages[0].createdAt;

        for (let index = 1; index < messages.length; index++) {
          if (messages[index].createdAt > latestMessageAt) latestMessageAt = messages[index].createdAt;
        }

        await maindb
          .update(chat)
          .set({ updatedAt: latestMessageAt })
          .where(and(eq(chat.id, messages[0].chatId), lt(chat.updatedAt, latestMessageAt)));

        return insertResult;
      }

      const latestMessageAtByChatId = new Map<string, Date>();

      for (const messageItem of messages) {
        const existing = latestMessageAtByChatId.get(messageItem.chatId);
        if (!existing || messageItem.createdAt > existing) {
          latestMessageAtByChatId.set(messageItem.chatId, messageItem.createdAt);
        }
      }

      await Promise.all(
        Array.from(latestMessageAtByChatId.entries()).map(([chatId, latestMessageAt]) =>
          maindb
            .update(chat)
            .set({ updatedAt: latestMessageAt })
            .where(and(eq(chat.id, chatId), lt(chat.updatedAt, latestMessageAt))),
        ),
      );

      return insertResult;
    }

    // Large multi-row payloads are safer to split into smaller inserts.
    return await maindb.transaction(async (tx) => {
      let lastInsertResult = await tx
        .insert(message)
        .values(messages.slice(0, insertBatchSize))
        .onConflictDoNothing({ target: message.id });

      for (let index = insertBatchSize; index < messages.length; index += insertBatchSize) {
        const messageBatch = messages.slice(index, index + insertBatchSize);
        lastInsertResult = await tx.insert(message).values(messageBatch).onConflictDoNothing({ target: message.id });
      }

      if (isSingleChat) {
        let latestMessageAt = messages[0].createdAt;

        for (let index = 1; index < messages.length; index++) {
          if (messages[index].createdAt > latestMessageAt) latestMessageAt = messages[index].createdAt;
        }

        await tx
          .update(chat)
          .set({ updatedAt: latestMessageAt })
          .where(and(eq(chat.id, messages[0].chatId), lt(chat.updatedAt, latestMessageAt)));

        return lastInsertResult;
      }

      const latestMessageAtByChatId = new Map<string, Date>();

      for (const messageItem of messages) {
        const existing = latestMessageAtByChatId.get(messageItem.chatId);
        if (!existing || messageItem.createdAt > existing) {
          latestMessageAtByChatId.set(messageItem.chatId, messageItem.createdAt);
        }
      }

      for (const [chatId, latestMessageAt] of latestMessageAtByChatId.entries()) {
        await tx
          .update(chat)
          .set({ updatedAt: latestMessageAt })
          .where(and(eq(chat.id, chatId), lt(chat.updatedAt, latestMessageAt)));
      }

      return lastInsertResult;
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

// Cache message lookups for the duration of the request
export const getMessagesByChatId = cache(
  async ({ id, limit = 50, offset = 0 }: { id: string; limit?: number; offset?: number }) => {
    try {
      return await maindb
        .select()
        .from(message)
        .where(eq(message.chatId, id))
        .orderBy(asc(message.createdAt), asc(message.id))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      throw new ChatSDKError('bad_request:database', 'Failed to get messages by chat id');
    }
  },
);

export async function getMessageById({ id }: { id: string }) {
  try {
    return await maindb.select().from(message).where(eq(message.id, id)).limit(1);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get message by id');
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({ chatId, timestamp }: { chatId: string; timestamp: Date }) {
  try {
    // Direct delete without intermediate query - more efficient and atomic
    // This prevents race conditions where messages could be inserted between select and delete
    return await maindb.delete(message).where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete messages by chat id after timestamp');
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  if (!message) {
    throw new ChatSDKError('not_found:database', `Message with id ${id} not found`);
  }

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  console.log('🔄 updateChatVisibilityById called with:', { chatId, visibility });

  try {
    console.log('📡 Executing database update for chat visibility');
    const result = await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
    console.log('✅ Database update successful, result:', result);

    // Return a consistent, serializable structure
    return {
      success: true,
      rowCount: result.rowCount || 0,
      chatId,
      visibility,
    };
  } catch (error) {
    console.error('❌ Database error in updateChatVisibilityById:', {
      chatId,
      visibility,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new ChatSDKError('bad_request:database', 'Failed to update chat visibility by id');
  }
}

export async function updateChatTitleById({ chatId, title }: { chatId: string; title: string }) {
  try {
    const [updatedChat] = await db
      .update(chat)
      .set({ title, updatedAt: new Date() })
      .where(eq(chat.id, chatId))
      .returning();
    return updatedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update chat title by id');
  }
}

export async function updateChatPinnedById({ chatId, isPinned }: { chatId: string; isPinned: boolean }) {
  try {
    const [updatedChat] = await db.update(chat).set({ isPinned }).where(eq(chat.id, chatId)).returning();
    return updatedChat;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update chat pinned state by id');
  }
}

export async function getMessageCountByUserId({ id }: { id: string }) {
  try {
    return await getMessageCount({ userId: id });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get message count by user id');
  }
}

export async function createStreamId({ streamId, chatId }: { streamId: string; chatId: string }) {
  try {
    await db.insert(stream).values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create stream id');
  }
}

/**
 * Creates a new chat and its first stream ID in a single DB round-trip using a CTE.
 * Saves one RTT compared to two sequential inserts (saveChat then createStreamId).
 */
export async function saveNewChatWithStream({
  chatId,
  userId,
  title,
  visibility,
  streamId,
}: {
  chatId: string;
  userId: string;
  title: string;
  visibility: 'public' | 'private';
  streamId: string;
}) {
  const now = new Date();
  const safeVisibility: 'public' | 'private' = visibility === 'public' ? 'public' : 'private';
  try {
    await maindb.execute(
      sql`WITH new_chat AS (
        INSERT INTO "chat" (id, "userId", title, visibility, created_at, updated_at)
        VALUES (${chatId}, ${userId}, ${title}, ${safeVisibility}, ${now}, ${now})
        RETURNING id
      )
      INSERT INTO "stream" (id, "chatId", "createdAt")
      SELECT ${streamId}, id, ${now} FROM new_chat`,
    );
  } catch (error) {
    console.error('[saveNewChatWithStream] DB error:', error);
    // Fallback: two sequential inserts
    await maindb
      .insert(chat)
      .values({ id: chatId, userId, title, visibility: safeVisibility, createdAt: now, updatedAt: now });
    await maindb.insert(stream).values({ id: streamId, chatId, createdAt: now });
  }
}

// Cache stream ID lookups for the duration of the request
export const getStreamIdsByChatId = cache(async ({ chatId }: { chatId: string }) => {
  try {
    const streamIds = await maindb
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get stream ids by chat id');
  }
});

/**
 * Returns the most recently created stream ID for a chat.
 * Uses maindb to avoid replica lag when guarding concurrent writes.
 */
export async function getLatestStreamIdByChatId({ chatId }: { chatId: string }): Promise<string | null> {
  try {
    const [latestStream] = await maindb
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(desc(stream.createdAt), desc(stream.id))
      .limit(1);

    return latestStream?.id ?? null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get latest stream id by chat id');
  }
}

/**
 * Returns the latest user message ID for a chat.
 * Uses maindb to avoid replica lag for race-condition guards.
 */
export async function getLatestUserMessageIdByChatId({ chatId }: { chatId: string }): Promise<string | null> {
  try {
    const [latestUserMessage] = await maindb
      .select({ id: message.id })
      .from(message)
      .where(and(eq(message.chatId, chatId), eq(message.role, 'user')))
      .orderBy(desc(message.createdAt), desc(message.id))
      .limit(1);

    return latestUserMessage?.id ?? null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get latest user message id by chat id');
  }
}

export async function getExtremeSearchUsageByUserId({ userId }: { userId: string }) {
  try {
    const now = new Date();
    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Start of next month
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    startOfNextMonth.setHours(0, 0, 0, 0);

    const [usage] = await maindb
      .select()
      .from(extremeSearchUsage)
      .where(
        and(
          eq(extremeSearchUsage.userId, userId),
          gte(extremeSearchUsage.date, startOfMonth),
          lt(extremeSearchUsage.date, startOfNextMonth),
        ),
      )
      .limit(1);

    return usage;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get extreme search usage');
  }
}

export async function incrementExtremeSearchUsage({ userId }: { userId: string }) {
  try {
    // Start of current month for the date key
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // End of current month for monthly reset
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1);
    endOfMonth.setHours(0, 0, 0, 0);

    // Atomic upsert: insert or increment if exists
    // Uses ON CONFLICT on the unique (userId, date) constraint
    const [result] = await db
      .insert(extremeSearchUsage)
      .values({
        userId,
        searchCount: 1,
        date: startOfMonth,
        resetAt: endOfMonth,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [extremeSearchUsage.userId, extremeSearchUsage.date],
        set: {
          searchCount: sql`${extremeSearchUsage.searchCount} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to increment extreme search usage');
  }
}

export async function getExtremeSearchCount({ userId }: { userId: string }): Promise<number> {
  try {
    const usage = await getExtremeSearchUsageByUserId({ userId });
    return usage?.searchCount || 0;
  } catch (error) {
    console.error('Error getting extreme search count:', error);
    return 0;
  }
}

export async function getMessageUsageByUserId({ userId }: { userId: string }) {
  try {
    const now = new Date();
    // Start of current day
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startOfDay.setHours(0, 0, 0, 0);

    // Start of next day
    const startOfNextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    startOfNextDay.setHours(0, 0, 0, 0);

    const [usage] = await maindb
      .select()
      .from(messageUsage)
      .where(
        and(eq(messageUsage.userId, userId), gte(messageUsage.date, startOfDay), lt(messageUsage.date, startOfNextDay)),
      )
      .limit(1);

    return usage;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get message usage');
  }
}

export async function incrementMessageUsage({ userId }: { userId: string }) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // End of current day for daily reset
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    endOfDay.setHours(0, 0, 0, 0);

    // Clean up previous day entries for this user (non-blocking, errors won't fail the increment)
    db.delete(messageUsage)
      .where(and(eq(messageUsage.userId, userId), lt(messageUsage.date, today)))
      .catch((err) => console.error('Failed to clean up old message usage:', err));

    // Atomic upsert: insert or increment if exists
    // Uses ON CONFLICT on the unique (userId, date) constraint
    const [result] = await db
      .insert(messageUsage)
      .values({
        userId,
        messageCount: 1,
        date: today,
        resetAt: endOfDay,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [messageUsage.userId, messageUsage.date],
        set: {
          messageCount: sql`${messageUsage.messageCount} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to increment message usage');
  }
}

export async function getMessageCount({ userId }: { userId: string }): Promise<number> {
  try {
    const usage = await getMessageUsageByUserId({ userId });
    return usage?.messageCount || 0;
  } catch (error) {
    console.error('Error getting message count:', error);
    return 0;
  }
}

/**
 * Fetches message count (daily) and extreme search count (monthly) in one parallel round-trip.
 * Use for critical-checks path to avoid sequential awaits.
 */
export async function getMessageCountAndExtremeSearchByUserId({
  userId,
}: {
  userId: string;
}): Promise<{ messageCount: number; extremeSearchCount: number }> {
  try {
    const { messageUsageRow, extremeUsageRow } = await all(
      {
        async messageUsageRow() {
          return getMessageUsageByUserId({ userId });
        },
        async extremeUsageRow() {
          return getExtremeSearchUsageByUserId({ userId });
        },
      },
      getBetterAllOptions(),
    );
    return {
      messageCount: messageUsageRow?.messageCount ?? 0,
      extremeSearchCount: extremeUsageRow?.searchCount ?? 0,
    };
  } catch (error) {
    console.error('Error getting batched usage counts:', error);
    return { messageCount: 0, extremeSearchCount: 0 };
  }
}

export async function getHistoricalUsageData({ userId, months = 6 }: { userId: string; months?: number }) {
  try {
    // Get aggregated message counts by date using SQL aggregation
    // This is much more efficient than fetching all messages and grouping in JS
    const totalDays = months * 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (totalDays - 1));

    // Use SQL aggregation to count messages per day
    const dailyCounts = await maindb
      .select({
        date: sql<string>`DATE(${message.createdAt})`.as('date'),
        messageCount: sql<number>`COUNT(*)::int`.as('message_count'),
      })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, userId),
          eq(message.role, 'user'),
          gte(message.createdAt, startDate),
          lt(message.createdAt, endDate),
        ),
      )
      .groupBy(sql`DATE(${message.createdAt})`)
      .orderBy(sql`DATE(${message.createdAt})`);

    // Convert to the format expected by the frontend
    return dailyCounts.map((row) => ({
      date: new Date(row.date),
      messageCount: row.messageCount,
    }));
  } catch (error) {
    console.error('Error getting historical usage data:', error);
    return [];
  }
}

// Custom Instructions CRUD operations
export async function getCustomInstructionsByUserId({ userId }: { userId: string }) {
  try {
    const [instructions] = await maindb
      .select()
      .from(customInstructions)
      .where(eq(customInstructions.userId, userId))
      .limit(1);

    return instructions;
  } catch (error) {
    console.error('Error getting custom instructions:', error);
    return null;
  }
}

export async function createCustomInstructions({ userId, content }: { userId: string; content: string }) {
  try {
    const [newInstructions] = await db
      .insert(customInstructions)
      .values({
        userId,
        content,
      })
      .returning();

    return newInstructions;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create custom instructions');
  }
}

export async function updateCustomInstructions({ userId, content }: { userId: string; content: string }) {
  try {
    const [updatedInstructions] = await db
      .update(customInstructions)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(customInstructions.userId, userId))
      .returning();

    return updatedInstructions;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update custom instructions');
  }
}

export async function deleteCustomInstructions({ userId }: { userId: string }) {
  try {
    const [deletedInstructions] = await db
      .delete(customInstructions)
      .where(eq(customInstructions.userId, userId))
      .returning();

    return deletedInstructions;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete custom instructions');
  }
}

// User Preferences CRUD operations
export async function getUserPreferencesByUserId({ userId }: { userId: string }) {
  try {
    const [preferences] = await maindb
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    return preferences || null;
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return null;
  }
}

export async function upsertUserPreferences({
  userId,
  preferences,
}: {
  userId: string;
  preferences: Partial<{
    'scira-search-provider'?: 'exa' | 'parallel' | 'tavily' | 'firecrawl';
    'scira-extreme-search-model'?:
      | 'scira-ext-1'
      | 'scira-ext-2'
      | 'scira-ext-4'
      | 'scira-ext-5'
      | 'scira-ext-6'
      | 'scira-ext-7'
      | 'scira-ext-8';
    'scira-group-order'?: string[];
    'scira-model-order-global'?: string[];
    'scira-blur-personal-info'?: boolean;
    'scira-custom-instructions-enabled'?: boolean;
    'scira-scroll-to-latest-on-open'?: boolean;
    'scira-location-metadata-enabled'?: boolean;
    'scira-auto-router-enabled'?: boolean;
    'scira-auto-router-config'?: {
      routes: Array<{
        name: string;
        description: string;
        model: string;
      }>;
    };
  }>;
}) {
  try {
    // Use transaction to ensure atomicity of read-modify-write
    return await maindb.transaction(async (tx) => {
      // Get existing preferences within transaction
      const [existing] = await tx.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);

      const existingPrefs = existing?.preferences || {};

      // Merge existing with new updates
      const mergedPreferences = {
        ...existingPrefs,
        ...preferences,
      };

      if (existing) {
        // Update existing record
        const [updated] = await tx
          .update(userPreferences)
          .set({
            preferences: mergedPreferences,
            updatedAt: new Date(),
          })
          .where(eq(userPreferences.userId, userId))
          .returning();
        return updated;
      } else {
        // Insert new record
        const [newPreferences] = await tx
          .insert(userPreferences)
          .values({
            userId,
            preferences: mergedPreferences,
          })
          .returning();
        return newPreferences;
      }
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to upsert user preferences');
  }
}

export interface UserMcpServerInput {
  userId: string;
  name: string;
  transportType: 'http' | 'sse';
  url: string;
  authType: 'none' | 'bearer' | 'header' | 'oauth';
  encryptedCredentials?: string | null;
  oauthIssuerUrl?: string | null;
  oauthAuthorizationUrl?: string | null;
  oauthTokenUrl?: string | null;
  oauthScopes?: string | null;
  oauthClientId?: string | null;
  oauthClientSecretEncrypted?: string | null;
  oauthAccessTokenEncrypted?: string | null;
  oauthRefreshTokenEncrypted?: string | null;
  oauthAccessTokenExpiresAt?: Date | null;
  oauthConnectedAt?: Date | null;
  oauthError?: string | null;
  isEnabled?: boolean;
}

export async function createUserMcpServer(input: UserMcpServerInput) {
  try {
    const [created] = await maindb
      .insert(userMcpServer)
      .values({
        userId: input.userId,
        name: input.name,
        transportType: input.transportType,
        url: input.url,
        authType: input.authType,
        encryptedCredentials: input.encryptedCredentials ?? null,
        oauthIssuerUrl: input.oauthIssuerUrl ?? null,
        oauthAuthorizationUrl: input.oauthAuthorizationUrl ?? null,
        oauthTokenUrl: input.oauthTokenUrl ?? null,
        oauthScopes: input.oauthScopes ?? null,
        oauthClientId: input.oauthClientId ?? null,
        oauthClientSecretEncrypted: input.oauthClientSecretEncrypted ?? null,
        oauthAccessTokenEncrypted: input.oauthAccessTokenEncrypted ?? null,
        oauthRefreshTokenEncrypted: input.oauthRefreshTokenEncrypted ?? null,
        oauthAccessTokenExpiresAt: input.oauthAccessTokenExpiresAt ?? null,
        oauthConnectedAt: input.oauthConnectedAt ?? null,
        oauthError: input.oauthError ?? null,
        isEnabled: input.isEnabled ?? true,
      })
      .returning();

    return created;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create MCP server');
  }
}

export async function getUserMcpServersByUserId({
  userId,
  enabledOnly = false,
}: {
  userId: string;
  enabledOnly?: boolean;
}) {
  try {
    return await maindb
      .select()
      .from(userMcpServer)
      .where(
        enabledOnly
          ? and(
              eq(userMcpServer.userId, userId),
              eq(userMcpServer.isEnabled, true),
              // Skip OAuth servers that haven't completed authorization
              or(
                eq(userMcpServer.authType, 'none'),
                eq(userMcpServer.authType, 'bearer'),
                eq(userMcpServer.authType, 'header'),
                and(eq(userMcpServer.authType, 'oauth'), isNotNull(userMcpServer.oauthConnectedAt)),
              ),
            )
          : eq(userMcpServer.userId, userId),
      )
      .orderBy(desc(userMcpServer.createdAt));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to fetch MCP servers');
  }
}

export async function getUserMcpServerById({ id, userId }: { id: string; userId: string }) {
  try {
    const [server] = await maindb
      .select()
      .from(userMcpServer)
      .where(and(eq(userMcpServer.id, id), eq(userMcpServer.userId, userId)))
      .limit(1);
    return server ?? null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to fetch MCP server');
  }
}

export async function updateUserMcpServer({
  id,
  userId,
  values,
}: {
  id: string;
  userId: string;
  values: Partial<{
    name: string;
    transportType: 'http' | 'sse';
    url: string;
    authType: 'none' | 'bearer' | 'header' | 'oauth';
    encryptedCredentials: string | null;
    oauthIssuerUrl: string | null;
    oauthAuthorizationUrl: string | null;
    oauthTokenUrl: string | null;
    oauthScopes: string | null;
    oauthClientId: string | null;
    oauthClientSecretEncrypted: string | null;
    oauthAccessTokenEncrypted: string | null;
    oauthRefreshTokenEncrypted: string | null;
    oauthAccessTokenExpiresAt: Date | null;
    oauthConnectedAt: Date | null;
    oauthError: string | null;
    isEnabled: boolean;
    disabledTools: string[];
    lastTestedAt: Date | null;
    lastError: string | null;
  }>;
}) {
  try {
    const [updated] = await maindb
      .update(userMcpServer)
      .set({
        ...values,
        updatedAt: new Date(),
      })
      .where(and(eq(userMcpServer.id, id), eq(userMcpServer.userId, userId)))
      .returning();
    return updated ?? null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update MCP server');
  }
}

export async function deleteUserMcpServer({ id, userId }: { id: string; userId: string }) {
  try {
    const [deleted] = await maindb
      .delete(userMcpServer)
      .where(and(eq(userMcpServer.id, id), eq(userMcpServer.userId, userId)))
      .returning();
    return deleted ?? null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete MCP server');
  }
}

// Dodo Subscription CRUD operations
export async function getDodoSubscriptionsByUserId({ userId }: { userId: string }) {
  try {
    return await getCachedOrFreshDodoSubscriptions(userId);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get Dodo subscriptions by user id');
  }
}

export async function getDodoSubscriptionById({ subscriptionId }: { subscriptionId: string }) {
  try {
    const [selectedSubscription] = await maindb
      .select()
      .from(dodosubscription)
      .where(eq(dodosubscription.id, subscriptionId))
      .limit(1);
    return selectedSubscription;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get Dodo subscription by id');
  }
}

export async function getActiveDodoSubscriptionsByUserId({ userId }: { userId: string }) {
  try {
    const allSubscriptions = await getCachedOrFreshDodoSubscriptions(userId);
    const now = new Date();
    return allSubscriptions
      .filter((subscriptionRow: DodoSubscriptionRow) => isActiveDodoSubscriptionRecord(subscriptionRow, now))
      .toSorted((subscriptionA: DodoSubscriptionRow, subscriptionB: DodoSubscriptionRow) => {
        const periodEndA = getValidDate(subscriptionA.currentPeriodEnd)?.getTime() ?? 0;
        const periodEndB = getValidDate(subscriptionB.currentPeriodEnd)?.getTime() ?? 0;

        return periodEndB - periodEndA;
      });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get active Dodo subscriptions by user id');
  }
}

export async function getTotalDodoSubscriptionAmountByUserId({ userId }: { userId: string }) {
  try {
    const subscriptions = await getActiveDodoSubscriptionsByUserId({ userId });
    return subscriptions.reduce((total: number, sub: DodoSubscriptionRow) => total + (sub.amount || 0), 0);
  } catch (error) {
    console.error('Error getting total subscription amount:', error);
    return 0;
  }
}

export async function hasActiveDodoSubscription({ userId }: { userId: string }) {
  try {
    // Check cache first for overall status
    const cachedStatus = getDodoProStatus(userId);
    if (cachedStatus !== null) {
      // Backward compatibility: handle both old (hasSubscriptions) and new (isProUser) cache formats
      return cachedStatus.isProUser ?? cachedStatus.hasSubscriptions ?? false;
    }

    // Use maindb to avoid replication lag and getActiveDodoSubscriptionsByUserId
    // which now handles cancelled subscriptions correctly
    const subscriptions = await getActiveDodoSubscriptionsByUserId({ userId });
    const hasSubscriptions = subscriptions.length > 0;

    // Cache the result
    const statusData = { hasSubscriptions, isProUser: hasSubscriptions };
    setDodoProStatus(userId, statusData);

    return hasSubscriptions;
  } catch (error) {
    console.error('Error checking Dodo Subscription status:', error);
    return false;
  }
}

export async function isDodoSubscriptionExpired({ userId }: { userId: string }) {
  try {
    const subscriptions = await getActiveDodoSubscriptionsByUserId({ userId });
    return subscriptions.length === 0;
  } catch (error) {
    console.error('Error checking Dodo Subscription expiration:', error);
    return true;
  }
}

export async function getDodoSubscriptionExpirationInfo({ userId }: { userId: string }) {
  try {
    const subscriptions = await getActiveDodoSubscriptionsByUserId({ userId });

    if (subscriptions.length === 0) {
      return null;
    }

    const mostRecentSubscription = subscriptions.find(
      (subscriptionRow: DodoSubscriptionRow) => subscriptionRow.currentPeriodEnd,
    );
    if (!mostRecentSubscription) {
      return null;
    }

    const expirationDate = getValidDate(mostRecentSubscription.currentPeriodEnd);
    if (!expirationDate) return null;

    // Calculate days until expiration
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    const daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      subscriptionDate: mostRecentSubscription.createdAt,
      expirationDate,
      daysUntilExpiration,
      isExpired: daysUntilExpiration <= 0,
      isExpiringSoon: daysUntilExpiration <= 7 && daysUntilExpiration > 0,
    };
  } catch (error) {
    console.error('Error getting Dodo Subscription expiration info:', error);
    return null;
  }
}

// Lookout CRUD operations
export async function createLookout({
  userId,
  title,
  prompt,
  frequency,
  cronSchedule,
  timezone,
  nextRunAt,
  qstashScheduleId,
  searchMode = 'extreme',
}: {
  userId: string;
  title: string;
  prompt: string;
  frequency: string;
  cronSchedule: string;
  timezone: string;
  nextRunAt: Date;
  qstashScheduleId?: string;
  searchMode?: string;
}) {
  try {
    const [newLookout] = await db
      .insert(lookout)
      .values({
        userId,
        title,
        prompt,
        frequency,
        cronSchedule,
        timezone,
        nextRunAt,
        qstashScheduleId,
        searchMode,
      })
      .returning();

    console.log('✅ Created lookout with ID:', newLookout.id, 'for user:', userId);
    return newLookout;
  } catch (error) {
    console.error('❌ Failed to create lookout:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to create lookout');
  }
}

// Cache lookout queries for the duration of the request
export const getLookoutsByUserId = cache(async ({ userId }: { userId: string }) => {
  try {
    return await maindb.select().from(lookout).where(eq(lookout.userId, userId)).orderBy(desc(lookout.createdAt));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get lookouts by user id');
  }
});

// Cache individual lookout lookups for the duration of the request
export const getLookoutById = cache(async ({ id }: { id: string }) => {
  try {
    console.log('🔍 Looking up lookout with ID:', id);
    const [selectedLookout] = await maindb.select().from(lookout).where(eq(lookout.id, id)).limit(1);

    if (selectedLookout) {
      console.log('✅ Found lookout:', selectedLookout.id, selectedLookout.title);
    } else {
      console.log('❌ No lookout found with ID:', id);
    }

    return selectedLookout;
  } catch (error) {
    console.error('❌ Error fetching lookout by ID:', id, error);
    throw new ChatSDKError('bad_request:database', 'Failed to get lookout by id');
  }
});

export async function updateLookout({
  id,
  title,
  prompt,
  frequency,
  cronSchedule,
  timezone,
  nextRunAt,
  qstashScheduleId,
  searchMode,
}: {
  id: string;
  title?: string;
  prompt?: string;
  frequency?: string;
  cronSchedule?: string;
  timezone?: string;
  nextRunAt?: Date;
  qstashScheduleId?: string;
  searchMode?: string;
}) {
  try {
    const updateData: any = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title;
    if (prompt !== undefined) updateData.prompt = prompt;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (cronSchedule !== undefined) updateData.cronSchedule = cronSchedule;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (nextRunAt !== undefined) updateData.nextRunAt = nextRunAt;
    if (qstashScheduleId !== undefined) updateData.qstashScheduleId = qstashScheduleId;
    if (searchMode !== undefined) updateData.searchMode = searchMode;

    const [updatedLookout] = await db.update(lookout).set(updateData).where(eq(lookout.id, id)).returning();

    return updatedLookout;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update lookout');
  }
}

export async function updateLookoutStatus({
  id,
  status,
}: {
  id: string;
  status: 'active' | 'paused' | 'archived' | 'running';
}) {
  try {
    const [updatedLookout] = await db
      .update(lookout)
      .set({ status, updatedAt: new Date() })
      .where(eq(lookout.id, id))
      .returning();

    return updatedLookout;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update lookout status');
  }
}

export async function updateLookoutLastRun({
  id,
  lastRunAt,
  lastRunChatId,
  nextRunAt,
  runStatus = 'success',
  error,
  duration,
  tokensUsed,
  searchesPerformed,
}: {
  id: string;
  lastRunAt: Date;
  lastRunChatId: string;
  nextRunAt?: Date;
  runStatus?: 'success' | 'error' | 'timeout';
  error?: string;
  duration?: number;
  tokensUsed?: number;
  searchesPerformed?: number;
}) {
  try {
    // Get current lookout to append to run history
    const currentLookout = await getLookoutById({ id });
    if (!currentLookout) {
      throw new Error('Lookout not found');
    }

    const currentHistory = (currentLookout.runHistory as any[]) || [];

    // Add new run to history
    const newRun = {
      runAt: lastRunAt.toISOString(),
      chatId: lastRunChatId,
      status: runStatus,
      ...(error && { error }),
      ...(duration && { duration }),
      ...(tokensUsed && { tokensUsed }),
      ...(searchesPerformed && { searchesPerformed }),
    };

    // Keep only last 100 runs to prevent unbounded growth
    const updatedHistory = [...currentHistory, newRun].slice(-100);

    const updateData: any = {
      lastRunAt,
      lastRunChatId,
      runHistory: updatedHistory,
      updatedAt: new Date(),
    };
    if (nextRunAt) updateData.nextRunAt = nextRunAt;

    const [updatedLookout] = await db.update(lookout).set(updateData).where(eq(lookout.id, id)).returning();

    return updatedLookout;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update lookout last run');
  }
}

// New function to get run statistics
export async function getLookoutRunStats({ id }: { id: string }) {
  try {
    const lookout = await getLookoutById({ id });
    if (!lookout) return null;

    const runHistory = (lookout.runHistory as any[]) || [];

    return {
      totalRuns: runHistory.length,
      successfulRuns: runHistory.filter((run) => run.status === 'success').length,
      failedRuns: runHistory.filter((run) => run.status === 'error').length,
      averageDuration: runHistory.reduce((sum, run) => sum + (run.duration || 0), 0) / runHistory.length || 0,
      lastWeekRuns: runHistory.filter((run) => new Date(run.runAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .length,
    };
  } catch (error) {
    console.error('Error getting lookout run stats:', error);
    return null;
  }
}

export async function deleteLookout({ id }: { id: string }) {
  try {
    const [deletedLookout] = await db.delete(lookout).where(eq(lookout.id, id)).returning();

    return deletedLookout;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete lookout');
  }
}

export async function createBuildSession({
  chatId,
  userId,
  boxId,
  runtime = 'node',
}: {
  chatId: string;
  userId: string;
  boxId?: string | null;
  runtime?: string;
}) {
  try {
    const [created] = await maindb
      .insert(buildSession)
      .values({
        chatId,
        userId,
        boxId: boxId ?? null,
        runtime,
        status: 'active',
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Failed to create build session:', error);
    return null;
  }
}

export async function updateBuildSession({
  chatId,
  status,
  boxId,
  runtime,
  snapshotId,
  totalCostUsd,
  totalComputeMs,
  totalInputTokens,
  totalOutputTokens,
}: {
  chatId: string;
  status?: string;
  boxId?: string | null;
  runtime?: string;
  snapshotId?: string | null;
  totalCostUsd?: number | null;
  totalComputeMs?: number | null;
  totalInputTokens?: number | null;
  totalOutputTokens?: number | null;
}) {
  try {
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (boxId !== undefined) updates.boxId = boxId;
    if (runtime !== undefined) updates.runtime = runtime;
    if (snapshotId !== undefined) updates.snapshotId = snapshotId;
    if (totalCostUsd !== undefined) updates.totalCostUsd = totalCostUsd;
    if (totalComputeMs !== undefined) updates.totalComputeMs = totalComputeMs;
    if (totalInputTokens !== undefined) updates.totalInputTokens = totalInputTokens;
    if (totalOutputTokens !== undefined) updates.totalOutputTokens = totalOutputTokens;
    if (status === 'completed' || status === 'error') updates.completedAt = new Date();

    await maindb.update(buildSession).set(updates).where(eq(buildSession.chatId, chatId));
  } catch (error) {
    console.error('Failed to update build session:', error);
  }
}

export async function getBuildSessionByChatId({ chatId }: { chatId: string }) {
  try {
    const [result] = await maindb.select().from(buildSession).where(eq(buildSession.chatId, chatId)).limit(1);
    return result ?? null;
  } catch (error) {
    console.error('Failed to get build session:', error);
    return null;
  }
}

export async function getBuildSessionsByUserId({ userId, limit = 20 }: { userId: string; limit?: number }): Promise<
  Array<{
    id: string;
    chatId: string;
    title: string;
    status: string;
    runtime: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
  }>
> {
  try {
    const results = await maindb
      .select({
        id: buildSession.id,
        chatId: buildSession.chatId,
        title: chat.title,
        status: buildSession.status,
        runtime: buildSession.runtime,
        createdAt: buildSession.createdAt,
        updatedAt: buildSession.updatedAt,
        completedAt: buildSession.completedAt,
      })
      .from(buildSession)
      .innerJoin(chat, eq(buildSession.chatId, chat.id))
      .where(eq(buildSession.userId, userId))
      .orderBy(desc(buildSession.createdAt))
      .limit(limit);

    return results;
  } catch (error) {
    console.error('Failed to get build sessions:', error);
    return [];
  }
}
