import 'server-only';

import { and, asc, desc, eq, gt, gte, inArray, lt, type SQL } from 'drizzle-orm';
import {
  user,
  chat,
  type User,
  message,
  type Message,
  type Chat,
  stream,
  extremeSearchUsage,
  messageUsage,
  customInstructions,
  userPreferences,
  dodosubscription,
  lookout,
} from './schema';
import { ChatSDKError } from '../errors';
import { db, getReadReplica, maindb } from './index';
import { getDodoSubscriptions, setDodoSubscriptions, getDodoProStatus, setDodoProStatus } from '../performance-cache';

type VisibilityType = 'public' | 'private';

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await getReadReplica().select().from(user).where(eq(user.email, email)).limit(1);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get user by email');
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const [selectedUser] = await getReadReplica().select().from(user).where(eq(user.id, id)).limit(1);
    return selectedUser || null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get user by id');
  }
}

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
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
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
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db.delete(chat).where(eq(chat.id, id)).returning();
    return chatsDeleted;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete chat by id');
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const readDb = maindb;

    // Select only necessary columns for better performance
    const query = (whereCondition?: SQL<any>) =>
      readDb
        .select({
          id: chat.id,
          userId: chat.userId,
          title: chat.title,
          createdAt: chat.createdAt,
          visibility: chat.visibility,
        })
        .from(chat)
        .where(whereCondition ? and(whereCondition, eq(chat.userId, id)) : eq(chat.userId, id))
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<any> = [];

    if (startingAfter) {
      const [selectedChat] = await readDb
        .select({ createdAt: chat.createdAt })
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError('not_found:database', `Chat with id ${startingAfter} not found`);
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await readDb
        .select({ createdAt: chat.createdAt })
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatSDKError('not_found:database', `Chat with id ${endingBefore} not found`);
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
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

// Lightweight version that only fetches id and userId for ownership validation
export async function getChatByIdForValidation({ id }: { id: string }): Promise<{ id: string; userId: string } | null> {
  try {
    const readDb = getReadReplica();
    const [selectedChat] = await readDb
      .select({ id: chat.id, userId: chat.userId })
      .from(chat)
      .where(eq(chat.id, id))
      .limit(1);
    return selectedChat || null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    console.log('🔍 [DB-DETAIL] getChatById: Starting query...');
    const cacheQueryStart = Date.now();
    // Use direct select instead of relational query for better performance
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id)).limit(1);
    const cacheQueryTime = (Date.now() - cacheQueryStart) / 1000;
    console.log(`⏱️  [DB-DETAIL] getChatById: Query (with cache) took ${cacheQueryTime.toFixed(2)}s`);
    return selectedChat || null;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function getChatWithUserById({ id }: { id: string }) {
  try {
    const [result] = await getReadReplica()
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
    return await db.insert(message).values(messages).onConflictDoNothing({ target: message.id });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({
  id,
  limit = 50,
  offset = 0,
}: {
  id: string;
  limit?: number;
  offset?: number;
}) {
  try {
    return await getReadReplica()
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt), asc(message.id))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get messages by chat id');
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await getReadReplica().select().from(message).where(eq(message.id, id)).limit(1);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get message by id');
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({ chatId, timestamp }: { chatId: string; timestamp: Date }) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)));

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      return await db.delete(message).where(and(eq(message.chatId, chatId), inArray(message.id, messageIds)));
    }
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete messages by chat id after timestamp');
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

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

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
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

    const [usage] = await getReadReplica()
      .select()
      .from(extremeSearchUsage)
      .where(
        and(
          eq(extremeSearchUsage.userId, userId),
          gte(extremeSearchUsage.date, startOfMonth),
          lt(extremeSearchUsage.date, startOfNextMonth),
        ),
      )
      .$withCache()
      .limit(1);

    return usage;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get extreme search usage');
  }
}

export async function incrementExtremeSearchUsage({ userId }: { userId: string }) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // End of current month for monthly reset
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    endOfMonth.setHours(0, 0, 0, 0);

    const existingUsage = await getExtremeSearchUsageByUserId({ userId });

    if (existingUsage) {
      const [updatedUsage] = await db
        .update(extremeSearchUsage)
        .set({
          searchCount: existingUsage.searchCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(extremeSearchUsage.id, existingUsage.id))
        .returning();
      return updatedUsage;
    } else {
      const [newUsage] = await db
        .insert(extremeSearchUsage)
        .values({
          userId,
          searchCount: 1,
          date: today,
          resetAt: endOfMonth,
        })
        .returning();
      return newUsage;
    }
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

    const [usage] = await db
      .select()
      .from(messageUsage)
      .where(
        and(eq(messageUsage.userId, userId), gte(messageUsage.date, startOfDay), lt(messageUsage.date, startOfNextDay)),
      ).
      $withCache()
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

    // Clean up previous day entries for this user
    await db.delete(messageUsage).where(and(eq(messageUsage.userId, userId), lt(messageUsage.date, today)));

    const existingUsage = await getMessageUsageByUserId({ userId });

    if (existingUsage) {
      const [updatedUsage] = await db
        .update(messageUsage)
        .set({
          messageCount: existingUsage.messageCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(messageUsage.id, existingUsage.id))
        .returning();
      return updatedUsage;
    } else {
      const [newUsage] = await db
        .insert(messageUsage)
        .values({
          userId,
          messageCount: 1,
          date: today,
          resetAt: endOfDay,
        })
        .returning();
      return newUsage;
    }
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

export async function getHistoricalUsageData({ userId, months = 6 }: { userId: string; months?: number }) {
  try {
    // Get actual message data for the specified months from message table
    const totalDays = months * 30; // Approximately 30 days per month
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (totalDays - 1)); // totalDays - 1 + today

    // Get all user messages from their chats in the date range
    const historicalMessages = await db
      .select({
        createdAt: message.createdAt,
        role: message.role,
      })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, userId),
          eq(message.role, 'user'), // Only count user messages, not assistant responses
          gte(message.createdAt, startDate),
          lt(message.createdAt, endDate),
        ),
      )
      .orderBy(asc(message.createdAt), asc(message.id));

    // Group messages by date and count them
    const dailyCounts = new Map<string, number>();

    historicalMessages.forEach((msg) => {
      const dateKey = msg.createdAt.toISOString().split('T')[0]; // Get YYYY-MM-DD format
      dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1);
    });

    // Convert to array format expected by the frontend
    const result = Array.from(dailyCounts.entries()).map(([date, count]) => ({
      date: new Date(date),
      messageCount: count,
    }));

    return result;
  } catch (error) {
    console.error('Error getting historical usage data:', error);
    return [];
  }
}

// Custom Instructions CRUD operations
export async function getCustomInstructionsByUserId({ userId }: { userId: string }) {
  try {
    const [instructions] = await db
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
    const [preferences] = await getReadReplica()
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
    'scira-extreme-search-provider'?: 'exa' | 'parallel';
    'scira-group-order'?: string[];
    'scira-model-order-global'?: string[];
    'scira-blur-personal-info'?: boolean;
    'scira-custom-instructions-enabled'?: boolean;
    'scira-location-metadata-enabled'?: boolean;
  }>;
}) {
  try {
    // Get existing preferences first to merge
    const existing = await getUserPreferencesByUserId({ userId });
    const existingPrefs = existing?.preferences || {};

    // Merge existing with new updates
    const mergedPreferences = {
      ...existingPrefs,
      ...preferences,
    };

    // Use upsert pattern: try to update first, if no rows affected, insert
    const [updated] = await db
      .update(userPreferences)
      .set({
        preferences: mergedPreferences,
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.userId, userId))
      .returning();

    if (updated) {
      return updated;
    }

    // If no rows were updated, insert new record
    const [newPreferences] = await db
      .insert(userPreferences)
      .values({
        userId,
        preferences: mergedPreferences,
      })
      .returning();

    return newPreferences;
  } catch (error) {
    // If insert fails due to unique constraint, try update again
    if (error instanceof Error && error.message.includes('unique')) {
      // Fetch again to be safe
      const existingRetry = await getUserPreferencesByUserId({ userId });
      const existingPrefsRetry = existingRetry?.preferences || {};
      const mergedPreferencesRetry = {
        ...existingPrefsRetry,
        ...preferences,
      };

      const [updated] = await db
        .update(userPreferences)
        .set({
          preferences: mergedPreferencesRetry,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId))
        .returning();

      // If update returned a row, return it
      if (updated) {
        return updated;
      }

      // If still no result, something is wrong
      throw new ChatSDKError('bad_request:database', 'Failed to upsert user preferences: record state inconsistent');
    }
    throw new ChatSDKError('bad_request:database', 'Failed to upsert user preferences');
  }
}

// Dodo Subscription CRUD operations
export async function getDodoSubscriptionsByUserId({ userId }: { userId: string }) {
  try {
    // Check cache first
    const cachedSubscriptions = getDodoSubscriptions(userId);
    if (cachedSubscriptions) {
      return cachedSubscriptions.sort(
        (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    // Fetch from database and cache
    const subscriptions = await db
      .select()
      .from(dodosubscription)
      .where(eq(dodosubscription.userId, userId))
      .orderBy(desc(dodosubscription.createdAt));
    setDodoSubscriptions(userId, subscriptions);
    return subscriptions;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get Dodo subscriptions by user id');
  }
}

export async function getDodoSubscriptionById({ subscriptionId }: { subscriptionId: string }) {
  try {
    const [selectedSubscription] = await db
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
    // Use maindb to avoid replication lag
    // Fetch subscriptions that are either active or cancelled but still within period
    const allSubscriptions = await maindb
      .select()
      .from(dodosubscription)
      .where(eq(dodosubscription.userId, userId))
      .orderBy(desc(dodosubscription.createdAt));

    // Filter in application logic to include cancelled subscriptions within period
    const now = new Date();
    return allSubscriptions.filter((sub) => {
      const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
      const isWithinPeriod = !periodEnd || periodEnd > now;

      // Active subscription
      if (sub.status === 'active' && isWithinPeriod) {
        return true;
      }

      // Cancelled but still within paid period
      if (
        sub.status === 'cancelled' &&
        sub.cancelAtPeriodEnd === true &&
        isWithinPeriod
      ) {
        return true;
      }

      return false;
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get active Dodo subscriptions by user id');
  }
}

export async function getTotalDodoSubscriptionAmountByUserId({ userId }: { userId: string }) {
  try {
    const subscriptions = await getActiveDodoSubscriptionsByUserId({ userId });
    return subscriptions.reduce((total, sub) => total + (sub.amount || 0), 0);
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

    if (subscriptions.length === 0) {
      return true; // No active subscriptions = expired
    }

    // Check if any subscription is still active and not expired
    const now = new Date();
    const hasActiveSubscription = subscriptions.some((sub) => {
      if (!sub.currentPeriodEnd) return false;
      return new Date(sub.currentPeriodEnd) > now;
    });

    return !hasActiveSubscription;
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

    // Get the most recent active subscription with a valid end date
    const activeWithEndDate = subscriptions
      .filter((sub) => sub.currentPeriodEnd)
      .sort((a, b) => new Date(b.currentPeriodEnd!).getTime() - new Date(a.currentPeriodEnd!).getTime());

    if (activeWithEndDate.length === 0) {
      return null;
    }

    const mostRecentSubscription = activeWithEndDate[0];
    const expirationDate = new Date(mostRecentSubscription.currentPeriodEnd!);

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
}: {
  userId: string;
  title: string;
  prompt: string;
  frequency: string;
  cronSchedule: string;
  timezone: string;
  nextRunAt: Date;
  qstashScheduleId?: string;
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
      })
      .returning();

    console.log('✅ Created lookout with ID:', newLookout.id, 'for user:', userId);
    return newLookout;
  } catch (error) {
    console.error('❌ Failed to create lookout:', error);
    throw new ChatSDKError('bad_request:database', 'Failed to create lookout');
  }
}

export async function getLookoutsByUserId({ userId }: { userId: string }) {
  try {
    return await getReadReplica()
      .select()
      .from(lookout)
      .where(eq(lookout.userId, userId))
      .orderBy(desc(lookout.createdAt));
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get lookouts by user id');
  }
}

export async function getLookoutById({ id }: { id: string }) {
  try {
    console.log('🔍 Looking up lookout with ID:', id);
    const [selectedLookout] = await db.select().from(lookout).where(eq(lookout.id, id)).limit(1);

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
}

export async function updateLookout({
  id,
  title,
  prompt,
  frequency,
  cronSchedule,
  timezone,
  nextRunAt,
  qstashScheduleId,
}: {
  id: string;
  title?: string;
  prompt?: string;
  frequency?: string;
  cronSchedule?: string;
  timezone?: string;
  nextRunAt?: Date;
  qstashScheduleId?: string;
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
