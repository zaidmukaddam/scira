// app/actions.ts
'use server';

import { geolocation } from '@vercel/functions';
import { serverEnv } from '@/env/server';
import { UIMessage, generateText, Output } from 'ai';
import type { ModelMessage } from 'ai';
import { z } from 'zod';
import { getUser } from '@/lib/auth-utils';
import { hasVisionSupport, scira } from '@/ai/providers';
import {
  getChatsByUserId,
  getRecentChatsByUserId,
  deleteChatById,
  updateChatVisibilityById,
  getChatById,
  getMessageById,
  deleteMessagesByChatIdAfterTimestamp,
  updateChatTitleById,
  updateChatPinnedById,
  getExtremeSearchCount,
  getMessageCountAndExtremeSearchByUserId,
  incrementMessageUsage,
  incrementAnthropicUsage,
  incrementGoogleUsage,
  getMessageCount,
  getAnthropicUsageCount,
  getGoogleUsageCount,
  getAgentModeRequestCountForCurrentMonth,
  getHistoricalUsageData,
  getCustomInstructionsByUserId,
  createCustomInstructions,
  updateCustomInstructions,
  deleteCustomInstructions,
  upsertUserPreferences,
  getDodoSubscriptionsByUserId,
  createLookout,
  getLookoutsByUserId,
  getLookoutById,
  updateLookout,
  updateLookoutStatus,
  deleteLookout,
  getChatWithUserById,
} from '@/lib/db/queries';
import { extractChatPreview } from '@/lib/search-utils';
import { db, maindb } from '@/lib/db';
import { chat, message, buildSession, dodosubscription, type User } from '@/lib/db/schema';
import { eq, desc, ilike, and, asc, inArray, notExists } from 'drizzle-orm';
import { getDiscountConfig } from '@/lib/discount';
import { get } from '@vercel/edge-config';
import { GroqProviderOptions, groq } from '@ai-sdk/groq';
import { Client } from '@upstash/qstash';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import type { CharacterAlignmentResponseModel } from '@elevenlabs/elevenlabs-js/api/types/CharacterAlignmentResponseModel';
import {
  usageCountCache,
  createMessageCountKey,
  createExtremeCountKey,
  createAnthropicCountKey,
  createGoogleCountKey,
  createAgentModeCountKey,
} from '@/lib/performance-cache';
import { CronExpressionParser } from 'cron-parser';
import {
  getComprehensiveUserData,
  getLightweightUserAuth,
  getCachedUserPreferencesByUserId,
  clearUserPreferencesCache,
} from '@/lib/user-data-server';
import {
  createConnection,
  listUserConnections,
  deleteConnection,
  manualSync,
  getSyncStatus,
  type ConnectorProvider,
} from '@/lib/connectors';
import { jsonrepair } from 'jsonrepair';
import { headers } from 'next/headers';
import { v7 as uuidv7 } from 'uuid';
import { saveChat, saveMessages } from '@/lib/db/queries';
import { all, allSettled } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';
import { getGroupConfig as getSearchGroupConfig } from '@/lib/search/group-config';
import { GoogleGenerativeAIProviderOptions, GoogleLanguageModelOptions } from '@ai-sdk/google';
import { GatewayProviderOptions } from '@ai-sdk/gateway';
import { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';

// Server action to get the current user with Pro status - UNIFIED VERSION
export async function getCurrentUser() {
  'use server';

  return await getComprehensiveUserData();
}

// Lightweight auth check for fast authentication validation
export async function getLightweightUser() {
  'use server';

  return await getLightweightUserAuth();
}

// Fetch chat meta with user details (server action for client use via React Query)
export async function getChatMeta(chatId: string, viewerUserId?: string) {
  'use server';

  if (!chatId) return null;

  try {
    const chat = await getChatWithUserById({ id: chatId });

    if (!chat) return null;

    const isOwner = viewerUserId ? chat.userId === viewerUserId : false;

    return {
      id: chat.id,
      title: chat.title,
      visibility: chat.visibility as 'public' | 'private',
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      user: {
        id: chat.userId,
        name: chat.userName,
        email: chat.userEmail,
        image: chat.userImage,
      },
      isOwner,
    } as const;
  } catch (error) {
    console.error('Error in getChatMeta:', error);
    return null;
  }
}

// Get user's country code from geolocation
export async function getUserCountryCode() {
  'use server';

  try {
    const headersList = await headers();

    const request = {
      headers: headersList,
    };

    const locationData = geolocation(request);

    return locationData.country || null;
  } catch (error) {
    console.error('Error getting geolocation:', error);
    return null;
  }
}

export async function suggestQuestions(history: any[]) {
  'use server';

  console.log(history);

  const { output } = await generateText({
    model: scira.languageModel('scira-follow-up'),
    providerOptions: {
      google: {
        structuredOutputs: true,
      } satisfies GoogleGenerativeAIProviderOptions,
    },
    system: `You are a search engine follow up query/questions generator. You MUST create between 3 and 5 questions for the search engine based on the conversation history.

### Question Generation Guidelines:
- Create 3-5 questions that are open-ended and encourage further discussion
- Questions must be concise (5-10 words each) but specific and contextually relevant
- Each question must contain specific nouns, entities, or clear context markers
- NEVER use pronouns (he, she, him, his, her, etc.) - always use proper nouns from the context
- Questions must be related to tools available in the system
- Questions should flow naturally from previous conversation
- You are here to generate questions for the search engine not to use tools or run tools!!

### Tool-Specific Question Types:
- Web search: Focus on factual information, current events, or general knowledge
- Academic: Focus on scholarly topics, research questions, or educational content
- YouTube: Focus on tutorials, how-to questions, or content discovery
- Social media (X/Twitter): Focus on trends, opinions, or social conversations
- Code/Analysis: Focus on programming, data analysis, or technical problem-solving
- Weather: Redirect to news, sports, or other non-weather topics
- Location: Focus on culture, history, landmarks, or local information
- Finance: Focus on market analysis, investment strategies, or economic topics

### Context Transformation Rules:
- For weather conversations → Generate questions about news, sports, or other non-weather topics
- For programming conversations → Generate questions about algorithms, data structures, or code optimization
- For location-based conversations → Generate questions about culture, history, or local attractions
- For mathematical queries → Generate questions about related applications or theoretical concepts
- For current events → Generate questions that explore implications, background, or related topics

### Formatting Requirements:
- No bullet points, numbering, or prefixes
- No quotation marks around questions
- Each question must be grammatically complete
- Each question must end with a question mark
- Questions must be diverse and not redundant
- Do not include instructions or meta-commentary in the questions

JSON Output Schema:
{
  "questions": [
    "question1 (string)",
    "question2 (string)",
    "question3 (string)"
  ]
}
`,
    messages: history,
    output: Output.object({
      schema: z.object({
        questions: z
          .array(z.string().max(150))
          .describe('The generated questions based on the message history.')
          .min(3)
          .max(5),
      }),
    }),
  });

  return {
    questions: output.questions,
  };
}

export async function checkImageModeration(images: string[]) {
  const messages: ModelMessage[] = images.map((image) => ({
    role: 'user',
    content: [{ type: 'image', image: image }],
  }));

  const { text } = await generateText({
    model: groq('meta-llama/llama-guard-4-12b'),
    messages,
    providerOptions: {
      groq: {
        service_tier: 'flex',
      },
    },
  });
  return text;
}

export async function generateTitleFromUserMessage({ message }: { message: UIMessage }) {
  const startTime = Date.now();
  const firstTextPart = message.parts.find((part) => part.type === 'text');
  const prompt = JSON.stringify(firstTextPart && firstTextPart.type === 'text' ? firstTextPart.text : '');
  console.log('Prompt: ', prompt);
  const { text: title } = await generateText({
    model: scira.languageModel('scira-name'),
    system: `You are an expert title generator. You are given a message and you need to generate a short title based on it.

    - you will generate a short 3-4 words title based on the first message a user begins a conversation with
    - the title should creative and unique
    - do not write anything other than the title
    - do not use quotes or colons
    - no markdown formatting allowed
    - keep plain text only
    - not more than 4 words in the title
    - do not use any other text other than the title`,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    providerOptions: {
      openai: {
        reasoningEffort: 'minimal',
        reasoningSummary: null,
        textVerbosity: 'low',
        store: false,
        include: ['reasoning.encrypted_content'],
      } satisfies OpenAIResponsesProviderOptions,
      gateway: {
        only: ['vertex', 'google'],
        order: ['vertex', 'google'],
      } satisfies GatewayProviderOptions,
      google: {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      } satisfies GoogleGenerativeAIProviderOptions,
      vertex: {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      } satisfies GoogleLanguageModelOptions,
    },
    onFinish: (output) => {
      console.log('Title generated: ', output.text);
      console.log('Model Used: ', output.model.modelId);
      const durationMs = Date.now() - startTime;
      console.log(`⏱️ [USAGE] generateTitleFromUserMessage: Model took ${durationMs}ms`);
    },
  });

  console.log('Title: ', title);

  const durationMs = Date.now() - startTime;
  console.log(`⏱️ [USAGE] generateTitleFromUserMessage: Model took ${durationMs}ms`);

  return title;
}

export async function enhancePrompt(raw: string) {
  try {
    const auth = await getLightweightUserAuth();

    if (!auth?.isProUser) {
      return { success: false, error: 'Pro subscription required' };
    }

    const system = `You are an expert prompt engineer. Rewrite and enhance the user's prompt.

Today's date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}. Treat this as the authoritative current date/time.

Temporal awareness:
- Interpret relative time expressions (e.g., "today", "last week", "current", "up-to-date") relative to the date stated above.
- Do not include meta-references like "date above", "current date", or similar in the output.
- Only include an explicit calendar date when the user's prompt requests or clearly implies a time boundary; otherwise, keep timing implicit and avoid adding extra date text.
- Do not speculate about future events beyond the date stated above.

Guidelines (MANDATORY):
- Preserve the user's original intent, constraints, and point of view and voice.
- Make the prompt specific, unambiguous, and actionable.
- Add missing context when implied: entities, timeframe, location, and output format/constraints.
- Remove fluff and vague language; prefer proper nouns over pronouns.
- Keep it concise (add at most 1–2 sentences of necessary context) but information-dense.
- Do NOT ask follow-up questions.
- Do NOT answer the user's request; your job is only to improve the prompt.
- Do NOT introduce new facts not implied by the user.

Output requirements:
- Return ONLY the improved prompt text, in plain text.
- No quotes, no commentary, no markdown, and no preface.`;

    const { text } = await generateText({
      model: scira.languageModel('scira-enhance'),
      temperature: 0.6,
      topP: 0.95,
      maxOutputTokens: 1024,
      system,
      prompt: raw,
    });

    console.log('Enhanced text: ', text);

    return { success: true, enhanced: text.trim() };
  } catch (error) {
    console.error('Error enhancing prompt:', error);
    return { success: false, error: 'Failed to enhance prompt' };
  }
}

export interface GenerateSpeechResult {
  audio: string;
  alignment: CharacterAlignmentResponseModel | null;
  normalizedAlignment: CharacterAlignmentResponseModel | null;
}

export async function generateSpeech(text: string): Promise<GenerateSpeechResult> {
  const client = new ElevenLabsClient({
    apiKey: serverEnv.ELEVENLABS_API_KEY,
  });

  const result = await client.textToSpeech.convertWithTimestamps('90ipbRoKi4CpHXvKVtl0', {
    text,
    modelId: 'eleven_v3',
  });

  return {
    audio: `data:audio/mp3;base64,${result.audioBase64}`,
    alignment: result.alignment ?? null,
    normalizedAlignment: result.normalizedAlignment ?? null,
  };
}

export async function getGroupConfig(...args: Parameters<typeof getSearchGroupConfig>) {
  'use server';
  return getSearchGroupConfig(...args);
}

// Lightweight function for sidebar recent chats - minimal payload, no cursor pagination
export async function getRecentChats(
  userId: string,
  limit: number = 8,
): Promise<{
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
  'use server';

  if (!userId) return { chats: [], hasMore: false };

  try {
    return await getRecentChatsByUserId({ userId, limit });
  } catch (error) {
    console.error('Error fetching recent chats:', error);
    return { chats: [], hasMore: false };
  }
}

// Add functions to fetch user chats
export async function getUserChats(
  userId: string,
  limit: number = 20,
  startingAfter?: string,
  endingBefore?: string,
): Promise<{ chats: any[]; hasMore: boolean }> {
  'use server';

  if (!userId) return { chats: [], hasMore: false };

  try {
    return await getChatsByUserId({
      id: userId,
      limit,
      startingAfter: startingAfter || null,
      endingBefore: endingBefore || null,
    });
  } catch (error) {
    console.error('Error fetching user chats:', error);
    return { chats: [], hasMore: false };
  }
}

// Add function to load more chats for infinite scroll
// Accepts optional cursorDate to skip the extra DB lookup for the cursor chat's updatedAt
export async function loadMoreChats(
  userId: string,
  lastChatId: string,
  limit: number = 20,
  cursorDate?: string,
  cursorIsPinned?: boolean,
): Promise<{ chats: any[]; hasMore: boolean }> {
  'use server';

  if (!userId || !lastChatId) return { chats: [], hasMore: false };

  try {
    return await getChatsByUserId({
      id: userId,
      limit,
      startingAfter: null,
      endingBefore: lastChatId,
      cursorDate: cursorDate || null,
      cursorIsPinned: cursorIsPinned ?? null,
    });
  } catch (error) {
    console.error('Error loading more chats:', error);
    return { chats: [], hasMore: false };
  }
}

// Add function to delete a chat
export async function deleteChat(chatId: string) {
  'use server';

  if (!chatId) return null;

  try {
    return await deleteChatById({ id: chatId });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return null;
  }
}

// Add function to bulk delete chats
export async function bulkDeleteChats(chatIds: string[]) {
  'use server';

  if (!chatIds || chatIds.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  try {
    const taskEntries = chatIds.map((id) => [`chat:${id}`, async () => deleteChatById({ id })] as const);

    const settled = await allSettled(Object.fromEntries(taskEntries), getBetterAllOptions());

    const settledValues = Object.values(settled);
    const anyRejected = settledValues.some((r) => r.status === 'rejected');
    if (anyRejected) {
      // Preserve previous behavior: bubble up failure
      throw new Error('Failed to delete chats');
    }

    const deletedCount = settledValues.filter((r) => r.status === 'fulfilled' && r.value !== null).length;
    return { success: true, deletedCount };
  } catch (error) {
    console.error('Error bulk deleting chats:', error);
    throw new Error('Failed to delete chats');
  }
}

// Add function to update chat visibility
export async function updateChatVisibility(chatId: string, visibility: 'private' | 'public') {
  'use server';

  console.log('🔄 updateChatVisibility called with:', { chatId, visibility });

  if (!chatId) {
    console.error('❌ updateChatVisibility: No chatId provided');
    throw new Error('Chat ID is required');
  }

  try {
    console.log('📡 Calling updateChatVisibilityById with:', { chatId, visibility });
    const result = await updateChatVisibilityById({ chatId, visibility });
    console.log('✅ updateChatVisibilityById successful, result:', result);

    // Return a serializable plain object instead of raw database result
    return {
      success: true,
      chatId,
      visibility,
      rowCount: result?.rowCount || 0,
    };
  } catch (error) {
    console.error('❌ Error in updateChatVisibility:', {
      chatId,
      visibility,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function updateChatPinned(chatId: string, isPinned: boolean) {
  'use server';

  if (!chatId) return null;

  try {
    return await updateChatPinnedById({ chatId, isPinned });
  } catch (error) {
    console.error('Error updating chat pinned state:', error);
    return null;
  }
}

// Add function to get chat info
export async function getChatInfo(chatId: string) {
  'use server';

  if (!chatId) return null;

  try {
    return await getChatById({ id: chatId });
  } catch (error) {
    console.error('Error getting chat info:', error);
    return null;
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  'use server';
  try {
    const [message] = await getMessageById({ id });
    console.log('Message: ', message);

    if (!message) {
      console.error(`No message found with id: ${id}`);
      return;
    }

    await deleteMessagesByChatIdAfterTimestamp({
      chatId: message.chatId,
      timestamp: message.createdAt,
    });

    console.log(`Successfully deleted trailing messages after message ID: ${id}`);
  } catch (error) {
    console.error(`Error deleting trailing messages: ${error}`);
    throw error; // Re-throw to allow caller to handle
  }
}

// Add function to update chat title
export async function updateChatTitle(chatId: string, title: string) {
  'use server';

  if (!chatId || !title.trim()) return null;

  try {
    return await updateChatTitleById({ chatId, title: title.trim() });
  } catch (error) {
    console.error('Error updating chat title:', error);
    return null;
  }
}

export async function forkChat(
  originalChatId: string,
): Promise<{ success: boolean; newChatId?: string; error?: string }> {
  'use server';

  if (!originalChatId) {
    return { success: false, error: 'Chat ID is required' };
  }

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    const originalChat = await getChatById({ id: originalChatId });
    if (!originalChat || originalChat.visibility !== 'public') {
      return { success: false, error: 'Chat is not available for forking' };
    }

    const messages = await db.query.message.findMany({
      where: eq(message.chatId, originalChatId),
      orderBy: (fields, { asc }) => [asc(fields.createdAt), asc(fields.id)],
    });

    const newChatId = uuidv7();
    const newChatTitle = originalChat.title ? `Fork of ${originalChat.title}` : 'Forked Chat';

    const messagesToSave = messages.map((messageItem) => ({
      chatId: newChatId,
      id: uuidv7(),
      role: messageItem.role,
      parts: messageItem.parts,
      attachments: messageItem.attachments ?? [],
      createdAt: messageItem.createdAt,
      model: messageItem.model ?? null,
      inputTokens: messageItem.inputTokens ?? null,
      outputTokens: messageItem.outputTokens ?? null,
      totalTokens: messageItem.totalTokens ?? null,
      completionTime: messageItem.completionTime ?? null,
    }));

    await all(
      {
        async saveMessages() {
          if (messagesToSave.length > 0) {
            await saveMessages({ messages: messagesToSave });
          }
          return true;
        },
        async saveChat() {
          await saveChat({
            id: newChatId,
            userId: currentUser.id,
            title: newChatTitle,
            visibility: 'private',
          });
          return true;
        },
      },
      getBetterAllOptions(),
    );

    return { success: true, newChatId };
  } catch (error) {
    console.error('Error forking chat:', error);
    return { success: false, error: 'Failed to fork chat' };
  }
}

// Branch out a chat - create a new chat with the current user and assistant message pair
export async function branchOutChat({
  userMessage,
  assistantMessage,
}: {
  userMessage: UIMessage;
  assistantMessage: UIMessage;
}) {
  'use server';

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    // Generate new chat ID and message IDs
    const newChatId = uuidv7();
    const newUserMessageId = uuidv7();
    const newAssistantMessageId = uuidv7();

    // Start title generation early (can run while we prepare messages)
    const chatTitlePromise = generateTitleFromUserMessage({ message: userMessage });

    // Prepare messages for saving
    const messagesToSave = [
      {
        chatId: newChatId,
        id: newUserMessageId,
        role: 'user' as const,
        parts: userMessage.parts,
        attachments: (userMessage as any).experimental_attachments ?? [],
        createdAt: new Date(),
        model: (userMessage as any).metadata?.model || null,
        inputTokens: (userMessage as any).metadata?.inputTokens ?? null,
        outputTokens: null,
        totalTokens: null,
        completionTime: null,
      },
      {
        chatId: newChatId,
        id: newAssistantMessageId,
        role: 'assistant' as const,
        parts: assistantMessage.parts,
        attachments: [],
        createdAt: new Date(),
        model: (assistantMessage as any).metadata?.model || null,
        inputTokens: (assistantMessage as any).metadata?.inputTokens ?? null,
        outputTokens: (assistantMessage as any).metadata?.outputTokens ?? null,
        totalTokens: (assistantMessage as any).metadata?.totalTokens ?? null,
        completionTime: (assistantMessage as any).metadata?.completionTime ?? null,
      },
    ];

    // Create chat first (messages have foreign key to chat), then save messages
    await all(
      {
        chatTitle: async function () {
          return chatTitlePromise;
        },
        saveChat: async function () {
          const chatTitle = await this.$.chatTitle;
          await saveChat({
            id: newChatId,
            userId: currentUser.id,
            title: chatTitle,
            visibility: 'private',
          });
          return true;
        },
        saveMessages: async function () {
          await this.$.saveChat; // Wait for chat to be created first (foreign key constraint)
          await saveMessages({ messages: messagesToSave });
          return true;
        },
      },
      getBetterAllOptions(),
    );

    return { success: true, chatId: newChatId };
  } catch (error) {
    console.error('Error branching out chat:', error);
    return { success: false, error: 'Failed to branch out chat' };
  }
}

export async function getSubDetails() {
  'use server';

  // Import here to avoid issues with SSR
  const { getComprehensiveUserData } = await import('@/lib/user-data-server');
  const userData = await getComprehensiveUserData();

  if (!userData) return { hasSubscription: false };

  return userData.polarSubscription
    ? {
        hasSubscription: true,
        subscription: userData.polarSubscription,
      }
    : { hasSubscription: false };
}

export async function previewMaxUpgrade() {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    const { getComprehensiveUserData } = await import('@/lib/user-data-server');
    const { dodoPayments } = await import('@/lib/auth');
    const userData = await getComprehensiveUserData();
    if (!userData) {
      return { success: false, error: 'User data not found' };
    }

    if (userData.isMaxUser) {
      return { success: false, error: 'Already on Max plan' };
    }

    const maxProductId = process.env.NEXT_PUBLIC_MAX_TIER;
    if (!maxProductId) {
      return { success: false, error: 'NEXT_PUBLIC_MAX_TIER environment variable is required' };
    }

    if (userData.proSource !== 'dodo') {
      return { success: false, error: 'Preview is only available for active Dodo subscriptions' };
    }

    const dodoProProductId = process.env.NEXT_PUBLIC_PREMIUM_TIER;
    if (!dodoProProductId) {
      return { success: false, error: 'NEXT_PUBLIC_PREMIUM_TIER environment variable is required' };
    }

    const activeDodoProSub = await maindb.query.dodosubscription.findFirst({
      where: and(
        eq(dodosubscription.userId, user.id),
        eq(dodosubscription.productId, dodoProProductId),
        eq(dodosubscription.status, 'active'),
      ),
      orderBy: (table, { desc }) => [desc(table.updatedAt), desc(table.createdAt)],
    });

    if (!activeDodoProSub?.id) {
      return { success: false, error: 'Active Dodo Pro subscription not found' };
    }

    console.log('ℹ️ [UPGRADE] previewMaxUpgrade selected subscription:', {
      userId: user.id,
      subscriptionId: activeDodoProSub.id,
      productId: activeDodoProSub.productId,
      status: activeDodoProSub.status,
      amount: activeDodoProSub.amount,
      currency: activeDodoProSub.currency,
      interval: activeDodoProSub.interval,
      currentPeriodStart: activeDodoProSub.currentPeriodStart,
      currentPeriodEnd: activeDodoProSub.currentPeriodEnd,
      targetProductId: maxProductId,
    });

    const preview = await dodoPayments.subscriptions.previewChangePlan(activeDodoProSub.id, {
      product_id: maxProductId,
      quantity: 1,
      proration_billing_mode: 'prorated_immediately',
    });

    console.log('ℹ️ [UPGRADE] previewMaxUpgrade Dodo preview summary:', {
      subscriptionId: activeDodoProSub.id,
      totalAmount: preview.immediate_charge.summary.total_amount,
      currency: preview.immediate_charge.summary.currency,
      settlementAmount: preview.immediate_charge.summary.settlement_amount,
      settlementCurrency: preview.immediate_charge.summary.settlement_currency,
      lineItems: preview.immediate_charge.line_items,
    });

    return {
      success: true,
      subscriptionId: activeDodoProSub.id,
      preview: {
        totalAmount: preview.immediate_charge.summary.total_amount,
        currency: preview.immediate_charge.summary.currency,
        settlementAmount: preview.immediate_charge.summary.settlement_amount,
        settlementCurrency: preview.immediate_charge.summary.settlement_currency,
        lineItems: preview.immediate_charge.line_items,
      },
    };
  } catch (error) {
    console.error('❌ [UPGRADE] previewMaxUpgrade error:', error);
    return { success: false, error: 'Failed to preview Max upgrade. Please try again.' };
  }
}

export async function upgradeToMax() {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    const { getComprehensiveUserData } = await import('@/lib/user-data-server');
    const { dodoPayments } = await import('@/lib/auth');
    const userData = await getComprehensiveUserData();
    if (!userData) {
      return { success: false, error: 'User data not found' };
    }

    if (userData.isMaxUser) {
      return { success: false, error: 'Already on Max plan' };
    }

    const maxProductId = process.env.NEXT_PUBLIC_MAX_TIER;
    if (!maxProductId) {
      return { success: false, error: 'NEXT_PUBLIC_MAX_TIER environment variable is required' };
    }

    if (userData.proSource === 'dodo') {
      const dodoProProductId = process.env.NEXT_PUBLIC_PREMIUM_TIER;
      if (!dodoProProductId) {
        return { success: false, error: 'NEXT_PUBLIC_PREMIUM_TIER environment variable is required' };
      }

      const activeDodoProSub = await maindb.query.dodosubscription.findFirst({
        where: and(
          eq(dodosubscription.userId, user.id),
          eq(dodosubscription.productId, dodoProProductId),
          eq(dodosubscription.status, 'active'),
        ),
        orderBy: (table, { desc }) => [desc(table.updatedAt), desc(table.createdAt)],
      });

      if (!activeDodoProSub?.id) {
        return { success: false, error: 'Active Dodo Pro subscription not found' };
      }

      console.log('ℹ️ [UPGRADE] upgradeToMax selected subscription:', {
        userId: user.id,
        subscriptionId: activeDodoProSub.id,
        productId: activeDodoProSub.productId,
        status: activeDodoProSub.status,
        amount: activeDodoProSub.amount,
        currency: activeDodoProSub.currency,
        interval: activeDodoProSub.interval,
        currentPeriodStart: activeDodoProSub.currentPeriodStart,
        currentPeriodEnd: activeDodoProSub.currentPeriodEnd,
        targetProductId: maxProductId,
      });

      await dodoPayments.subscriptions.changePlan(activeDodoProSub.id, {
        product_id: maxProductId,
        quantity: 1,
        proration_billing_mode: 'prorated_immediately',
        on_payment_failure: 'prevent_change',
      });

      return { success: true, redirect: '/success' };
    }

    // Free users and Polar Pro users should complete Max via checkout.
    // Polar revocation happens in the Dodo webhook handler after Max becomes active.
    return { success: true, redirect: '/pricing' };
  } catch (error) {
    console.error('❌ [UPGRADE] upgradeToMax error:', error);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

export async function previewDowngradeToPro() {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    const { getComprehensiveUserData } = await import('@/lib/user-data-server');
    const { dodoPayments } = await import('@/lib/auth');
    const userData = await getComprehensiveUserData();
    if (!userData) {
      return { success: false, error: 'User data not found' };
    }

    if (!userData.isMaxUser || userData.proSource !== 'dodo') {
      return { success: false, error: 'Preview is only available for active Dodo Max subscriptions' };
    }

    const dodoMaxProductId = process.env.NEXT_PUBLIC_MAX_TIER;
    const dodoProProductId = process.env.NEXT_PUBLIC_PREMIUM_TIER;
    if (!dodoMaxProductId) {
      return { success: false, error: 'NEXT_PUBLIC_MAX_TIER environment variable is required' };
    }
    if (!dodoProProductId) {
      return { success: false, error: 'NEXT_PUBLIC_PREMIUM_TIER environment variable is required' };
    }

    const activeDodoMaxSub = await maindb.query.dodosubscription.findFirst({
      where: and(eq(dodosubscription.userId, user.id), eq(dodosubscription.productId, dodoMaxProductId)),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    if (!activeDodoMaxSub?.id) {
      return { success: false, error: 'Active Dodo Max subscription not found' };
    }

    const preview = await dodoPayments.subscriptions.previewChangePlan(activeDodoMaxSub.id, {
      product_id: dodoProProductId,
      quantity: 1,
      proration_billing_mode: 'difference_immediately',
    });

    return {
      success: true,
      subscriptionId: activeDodoMaxSub.id,
      preview: {
        totalAmount: preview.immediate_charge.summary.total_amount,
        currency: preview.immediate_charge.summary.currency,
        settlementAmount: preview.immediate_charge.summary.settlement_amount,
        settlementCurrency: preview.immediate_charge.summary.settlement_currency,
        lineItems: preview.immediate_charge.line_items,
      },
    };
  } catch (error) {
    console.error('❌ [DOWNGRADE] previewDowngradeToPro error:', error);
    return { success: false, error: 'Failed to preview Pro downgrade. Please try again.' };
  }
}

export async function downgradeToPro() {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    const { getComprehensiveUserData } = await import('@/lib/user-data-server');
    const { dodoPayments } = await import('@/lib/auth');
    const userData = await getComprehensiveUserData();
    if (!userData) {
      return { success: false, error: 'User data not found' };
    }

    if (!userData.isMaxUser || userData.proSource !== 'dodo') {
      return { success: false, error: 'Downgrade is only available for active Dodo Max subscriptions' };
    }

    const dodoMaxProductId = process.env.NEXT_PUBLIC_MAX_TIER;
    const dodoProProductId = process.env.NEXT_PUBLIC_PREMIUM_TIER;
    if (!dodoMaxProductId) {
      return { success: false, error: 'NEXT_PUBLIC_MAX_TIER environment variable is required' };
    }
    if (!dodoProProductId) {
      return { success: false, error: 'NEXT_PUBLIC_PREMIUM_TIER environment variable is required' };
    }

    const activeDodoMaxSub = await maindb.query.dodosubscription.findFirst({
      where: and(eq(dodosubscription.userId, user.id), eq(dodosubscription.productId, dodoMaxProductId)),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    if (!activeDodoMaxSub?.id) {
      return { success: false, error: 'Active Dodo Max subscription not found' };
    }

    await dodoPayments.subscriptions.changePlan(activeDodoMaxSub.id, {
      product_id: dodoProProductId,
      quantity: 1,
      proration_billing_mode: 'difference_immediately',
      on_payment_failure: 'prevent_change',
    });

    return { success: true, redirect: '/success' };
  } catch (error) {
    console.error('❌ [DOWNGRADE] downgradeToPro error:', error);
    return { success: false, error: 'Failed to downgrade to Pro. Please try again.' };
  }
}

export async function getUserMessageCount(providedUser?: User | null) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    // Check cache first
    const cacheKey = createMessageCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      console.log('⏱️ [USAGE] getUserMessageCount: cache hit');
      return { count: cached, error: null };
    }

    const start = Date.now();
    const count = await getMessageCount({
      userId: user.id,
    });
    const durationMs = Date.now() - start;
    console.log(`⏱️ [USAGE] getUserMessageCount: DB usage lookup took ${durationMs}ms`);

    // Cache the result
    usageCountCache.set(cacheKey, count);

    return { count, error: null };
  } catch (error) {
    console.error('Error getting user message count:', error);
    return { count: 0, error: 'Failed to get message count' };
  }
}

export async function getUserExtremeSearchCount(providedUser?: User | null) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    // Check cache first
    const cacheKey = createExtremeCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      console.log('⏱️ [USAGE] getUserExtremeSearchCount: cache hit');
      return { count: cached, error: null };
    }

    const start = Date.now();
    const count = await getExtremeSearchCount({
      userId: user.id,
    });
    const durationMs = Date.now() - start;
    console.log(`⏱️ [USAGE] getUserExtremeSearchCount: DB usage lookup took ${durationMs}ms`);

    // Cache the result
    usageCountCache.set(cacheKey, count);

    return { count, error: null };
  } catch (error) {
    console.error('Error getting user extreme search count:', error);
    return { count: 0, error: 'Failed to get extreme search count' };
  }
}

export async function incrementUserMessageCount() {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    await incrementMessageUsage({
      userId: user.id,
    });

    // Invalidate cache
    const cacheKey = createMessageCountKey(user.id);
    usageCountCache.delete(cacheKey);

    return { success: true, error: null };
  } catch (error) {
    console.error('Error incrementing user message count:', error);
    return { success: false, error: 'Failed to increment message count' };
  }
}

export async function getExtremeSearchUsageCount(providedUser?: User | null) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    // Check cache first
    const cacheKey = createExtremeCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      console.log('⏱️ [USAGE] getExtremeSearchUsageCount: cache hit');
      return { count: cached, error: null };
    }

    const start = Date.now();
    const count = await getExtremeSearchCount({
      userId: user.id,
    });
    const durationMs = Date.now() - start;
    console.log(`⏱️ [USAGE] getExtremeSearchUsageCount: DB usage lookup took ${durationMs}ms`);

    // Cache the result
    usageCountCache.set(cacheKey, count);

    return { count, error: null };
  } catch (error) {
    console.error('Error getting extreme search usage count:', error);
    return { count: 0, error: 'Failed to get extreme search count' };
  }
}

/**
 * Get message count by userId directly - avoids getUser() overhead.
 * Uses the same cache as getUserMessageCount for consistency.
 */
export async function getMessageCountByUserId(userId: string) {
  const cacheKey = createMessageCountKey(userId);
  const cached = usageCountCache.get(cacheKey);
  if (cached !== null) return { count: cached, error: null };

  const count = await getMessageCount({ userId });
  usageCountCache.set(cacheKey, count);
  return { count, error: null };
}

/**
 * Get extreme search count by userId directly - avoids getUser() overhead.
 * Uses the same cache as getExtremeSearchUsageCount for consistency.
 */
export async function getExtremeSearchCountByUserId(userId: string) {
  const cacheKey = createExtremeCountKey(userId);
  const cached = usageCountCache.get(cacheKey);
  if (cached !== null) return { count: cached, error: null };

  const count = await getExtremeSearchCount({ userId });
  usageCountCache.set(cacheKey, count);
  return { count, error: null };
}

/**
 * Get anthropic usage count by userId directly - avoids getUser() overhead.
 * Uses the same cache strategy as other usage counters for consistency.
 */
export async function getAnthropicUsageCountByUserId(userId: string) {
  const cacheKey = createAnthropicCountKey(userId);
  const cached = usageCountCache.get(cacheKey);
  if (cached !== null) return { count: cached, error: null };

  const count = await getAnthropicUsageCount({ userId });
  usageCountCache.set(cacheKey, count);
  return { count, error: null };
}

export async function getAnthropicUsageCountAction(providedUser?: User | null) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    const cacheKey = createAnthropicCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      console.log('⏱️ [USAGE] getAnthropicUsageCountAction: cache hit');
      return { count: cached, error: null };
    }

    const start = Date.now();
    const count = await getAnthropicUsageCount({
      userId: user.id,
    });
    const durationMs = Date.now() - start;
    console.log(`⏱️ [USAGE] getAnthropicUsageCountAction: DB usage lookup took ${durationMs}ms`);

    usageCountCache.set(cacheKey, count);

    return { count, error: null };
  } catch (error) {
    console.error('Error getting anthropic usage count:', error);
    return { count: 0, error: 'Failed to get anthropic usage count' };
  }
}

export async function getAgentModeUsageCountAction(providedUser?: User | null) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    const cacheKey = createAgentModeCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      console.log('⏱️ [USAGE] getAgentModeUsageCountAction: cache hit');
      return { count: cached, error: null };
    }

    const start = Date.now();
    const count = await getAgentModeRequestCountForCurrentMonth({
      userId: user.id,
    });
    const durationMs = Date.now() - start;
    console.log(`⏱️ [USAGE] getAgentModeUsageCountAction: DB usage lookup took ${durationMs}ms`);

    usageCountCache.set(cacheKey, count);

    return { count, error: null };
  } catch (error) {
    console.error('Error getting agent mode usage count:', error);
    return { count: 0, error: 'Failed to get agent mode usage count' };
  }
}

export async function incrementAnthropicUsageAction(model?: string | null) {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    await incrementAnthropicUsage({
      userId: user.id,
      model,
    });

    const cacheKey = createAnthropicCountKey(user.id);
    usageCountCache.delete(cacheKey);

    return { success: true, error: null };
  } catch (error) {
    console.error('Error incrementing anthropic usage count:', error);
    return { success: false, error: 'Failed to increment anthropic usage count' };
  }
}

export async function getGoogleUsageCountByUserId(userId: string) {
  const cacheKey = createGoogleCountKey(userId);
  const cached = usageCountCache.get(cacheKey);
  if (cached !== null) return { count: cached, error: null };

  const count = await getGoogleUsageCount({ userId });
  usageCountCache.set(cacheKey, count);
  return { count, error: null };
}

export async function getGoogleUsageCountAction(providedUser?: User | null) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    const cacheKey = createGoogleCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      console.log('⏱️ [USAGE] getGoogleUsageCountAction: cache hit');
      return { count: cached, error: null };
    }

    const start = Date.now();
    const count = await getGoogleUsageCount({ userId: user.id });
    const durationMs = Date.now() - start;
    console.log(`⏱️ [USAGE] getGoogleUsageCountAction: DB usage lookup took ${durationMs}ms`);

    usageCountCache.set(cacheKey, count);
    return { count, error: null };
  } catch (error) {
    console.error('Error getting google usage count:', error);
    return { count: 0, error: 'Failed to get google usage count' };
  }
}

export async function incrementGoogleUsageAction(model?: string | null) {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    await incrementGoogleUsage({ userId: user.id, model });

    const cacheKey = createGoogleCountKey(user.id);
    usageCountCache.delete(cacheKey);

    return { success: true, error: null };
  } catch (error) {
    console.error('Error incrementing google usage count:', error);
    return { success: false, error: 'Failed to increment google usage count' };
  }
}

/**
 * Get message count, extreme search count, and anthropic usage count in one parallel DB round-trip.
 * Updates usage caches. Use in search critical-checks to run usage fetch
 * in parallel with chat validation instead of after it.
 */
export async function getMessageCountAndExtremeSearchByUserIdAction(userId: string): Promise<{
  messageCountResult: { count: number; error: null } | { count: undefined; error: Error };
  extremeSearchUsage: { count: number; error: null } | { count: undefined; error: Error };
  anthropicUsageResult: { count: number; error: null } | { count: undefined; error: Error };
}> {
  const messageCacheKey = createMessageCountKey(userId);
  const extremeCacheKey = createExtremeCountKey(userId);
  const anthropicCacheKey = createAnthropicCountKey(userId);

  const messageCached = usageCountCache.get(messageCacheKey);
  const extremeCached = usageCountCache.get(extremeCacheKey);
  const anthropicCached = usageCountCache.get(anthropicCacheKey);

  if (messageCached !== null && extremeCached !== null && anthropicCached !== null) {
    return {
      messageCountResult: { count: messageCached, error: null },
      extremeSearchUsage: { count: extremeCached, error: null },
      anthropicUsageResult: { count: anthropicCached, error: null },
    };
  }

  try {
    const { messageCount, extremeSearchCount, anthropicCount } = await getMessageCountAndExtremeSearchByUserId({
      userId,
    });

    if (messageCached === null) usageCountCache.set(messageCacheKey, messageCount);
    if (extremeCached === null) usageCountCache.set(extremeCacheKey, extremeSearchCount);
    if (anthropicCached === null) usageCountCache.set(anthropicCacheKey, anthropicCount);

    return {
      messageCountResult: { count: messageCount, error: null },
      extremeSearchUsage: { count: extremeSearchCount, error: null },
      anthropicUsageResult: { count: anthropicCount, error: null },
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to verify usage limits');
    return {
      messageCountResult: { count: undefined, error },
      extremeSearchUsage: { count: undefined, error },
      anthropicUsageResult: { count: undefined, error },
    };
  }
}

type DiscountConfigParams = {
  email?: string | null;
  isIndianUser?: boolean;
};

export async function getDiscountConfigAction(params?: DiscountConfigParams) {
  try {
    let userEmail = params?.email ?? null;

    if (!userEmail) {
      const user = await getCurrentUser();
      userEmail = user?.email ?? null;
    }

    let isIndianUser = params?.isIndianUser;

    if (isIndianUser === undefined) {
      try {
        const headersList = await headers();
        const request = { headers: headersList };
        const locationData = geolocation(request);
        const country = (locationData.country || '').toUpperCase();
        isIndianUser = country === 'IN';
      } catch (geoError) {
        console.warn('Geolocation lookup failed in getDiscountConfigAction:', geoError);
        isIndianUser = false;
      }
    }

    return await getDiscountConfig(userEmail ?? undefined, isIndianUser);
  } catch (error) {
    console.error('Error getting discount configuration:', error);
    return {
      enabled: false,
    };
  }
}

export async function getHistoricalUsage(providedUser?: User | null, days: number = 30) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return [];
    }

    // Convert days to months for the database query (approximately 30 days per month)
    const months = Math.ceil(days / 30);
    const historicalData = await getHistoricalUsageData({ userId: user.id, months });

    // Use the exact number of days requested
    const totalDays = days;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (totalDays - 1)); // -1 to include today

    // Create a map of existing data for quick lookup
    const dataMap = new Map<string, number>();
    historicalData.forEach((record) => {
      const dateKey = record.date.toISOString().split('T')[0];
      dataMap.set(dateKey, record.messageCount || 0);
    });

    // Generate complete dataset for all days
    const completeData = [];
    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateKey = currentDate.toISOString().split('T')[0];

      const count = dataMap.get(dateKey) || 0;
      let level: 0 | 1 | 2 | 3 | 4;

      // Define usage levels based on message count
      if (count === 0) level = 0;
      else if (count <= 3) level = 1;
      else if (count <= 7) level = 2;
      else if (count <= 12) level = 3;
      else level = 4;

      completeData.push({
        date: dateKey,
        count,
        level,
      });
    }

    return completeData;
  } catch (error) {
    console.error('Error getting historical usage:', error);
    return [];
  }
}

// Custom Instructions Server Actions
export async function getCustomInstructions(providedUser?: User | null) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return null;
    }

    const instructions = await getCustomInstructionsByUserId({ userId: user.id });
    return instructions;
  } catch (error) {
    console.error('Error getting custom instructions:', error);
    return null;
  }
}

export async function saveCustomInstructions(content: string) {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!content.trim()) {
      return { success: false, error: 'Content cannot be empty' };
    }

    // Check if instructions already exist
    const existingInstructions = await getCustomInstructionsByUserId({ userId: user.id });

    let result;
    if (existingInstructions) {
      result = await updateCustomInstructions({ userId: user.id, content: content.trim() });
    } else {
      result = await createCustomInstructions({ userId: user.id, content: content.trim() });
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error saving custom instructions:', error);
    return { success: false, error: 'Failed to save custom instructions' };
  }
}

export async function deleteCustomInstructionsAction() {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const result = await deleteCustomInstructions({ userId: user.id });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error deleting custom instructions:', error);
    return { success: false, error: 'Failed to delete custom instructions' };
  }
}

// User Preferences Actions
export async function getUserPreferences(providedUser?: User | null) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return null;
    }

    const preferences = await getCachedUserPreferencesByUserId(user.id);
    return preferences;
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return null;
  }
}

export async function saveUserPreferences(
  preferences: Partial<{
    'scira-search-provider'?: 'exa' | 'parallel' | 'firecrawl';
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
  }>,
) {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const result = await upsertUserPreferences({ userId: user.id, preferences });

    // Clear cache after update
    clearUserPreferencesCache(user.id);

    return { success: true, data: result };
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return { success: false, error: 'Failed to save user preferences' };
  }
}

export async function routeWithAutoRouter({
  query,
  routes,
  hasImages = false,
}: {
  query: string;
  routes: Array<{ name: string; description: string; model: string }>;
  hasImages?: boolean;
}) {
  'use server';

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.isProUser) {
      return { success: false, error: 'pro_required' };
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return { success: false, error: 'Query cannot be empty' };
    }

    const sanitizedRoutes = routes
      .map((route) => ({
        name: route.name.trim(),
        description: route.description.trim(),
        model: route.model.trim(),
      }))
      .filter((route) => route.name && route.description && route.model);

    if (!sanitizedRoutes.length) {
      return { success: false, error: 'No routes configured' };
    }

    const routeConfig = sanitizedRoutes.map(({ name, description }) => ({
      name,
      description,
    }));

    const conversation = [{ role: 'user', content: trimmedQuery }];

    const taskInstruction = `
You are a helpful assistant designed to find the best suited route.
You are provided with route description within <routes></routes> XML tags:
<routes>

${JSON.stringify(routeConfig)}

</routes>

<conversation>

${JSON.stringify(conversation)}

</conversation>
`;

    const imageContext = hasImages
      ? '\n\nIMPORTANT: The user attached image(s). Prefer a route whose model supports vision/image analysis. If none do, return {"route": "other"}.'
      : '';

    const formatPrompt = `
Your task is to decide which route is best suit with user intent on the conversation in <conversation></conversation> XML tags. Follow the instruction:
1. If the latest intent from user is irrelevant or user intent is full filled, response with other route {"route": "other"}.
2. You must analyze the route descriptions and find the best match route for user latest intent.
3. You only response the name of the route that best matches the user's request, use the exact name in the <routes></routes>.
${imageContext}

Based on your analysis, provide your response in the following JSON formats if you decide to match any route:
{"route": "route_name"}
`;

    const { text } = await generateText({
      model: scira.languageModel('scira-arch-router'),
      messages: [{ role: 'user', content: taskInstruction + formatPrompt }],
      maxOutputTokens: 200,
      temperature: 0,
    });

    const rawMatch = text.match(/\{[\s\S]*\}/);
    const parsed = rawMatch ? JSON.parse(jsonrepair(rawMatch[0])) : null;
    const routeName = parsed?.route as string | undefined;

    const matchedRoute = sanitizedRoutes.find((route) => route.name === routeName);
    let resolvedModel = matchedRoute?.model || 'scira-default';

    if (hasImages && !hasVisionSupport(resolvedModel)) {
      const visionRoute = sanitizedRoutes.find((route) => hasVisionSupport(route.model));
      resolvedModel = visionRoute?.model || 'scira-default';
    }

    console.log('Resolved model:', resolvedModel);

    return {
      success: true,
      model: resolvedModel,
      route: matchedRoute?.name || 'other',
    };
  } catch (error) {
    console.error('Error routing with auto router:', error);
    return { success: false, error: 'Failed to route query' };
  }
}

export async function syncUserPreferences() {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // This will be called from the client to migrate localStorage data
    // The actual migration logic will be in the hook
    return { success: true };
  } catch (error) {
    console.error('Error syncing user preferences:', error);
    return { success: false, error: 'Failed to sync user preferences' };
  }
}

// Fast pro user status check - UNIFIED VERSION
export async function getProUserStatusOnly(): Promise<boolean> {
  'use server';

  // Import here to avoid issues with SSR
  const { isUserPro } = await import('@/lib/user-data-server');
  return await isUserPro();
}

export async function getDodoSubscriptionHistory() {
  try {
    const user = await getUser();
    if (!user) return null;

    const subscriptions = await getDodoSubscriptionsByUserId({ userId: user.id });
    return subscriptions;
  } catch (error) {
    console.error('Error getting subscription history:', error);
    return null;
  }
}

export async function getDodoSubscriptionProStatus() {
  'use server';

  // Import here to avoid issues with SSR
  const { getComprehensiveUserData } = await import('@/lib/user-data-server');
  const userData = await getComprehensiveUserData();

  if (!userData) return { isProUser: false, hasSubscriptions: false };

  const isDodoProUser = userData.proSource === 'dodo' && userData.isProUser;

  return {
    isProUser: isDodoProUser,
    hasSubscriptions: Boolean(userData.dodoSubscription?.hasSubscriptions),
    expiresAt: userData.dodoSubscription?.expiresAt,
    source: userData.proSource,
    daysUntilExpiration: userData.dodoSubscription?.daysUntilExpiration,
    isExpired: userData.dodoSubscription?.isExpired,
    isExpiringSoon: userData.dodoSubscription?.isExpiringSoon,
  };
}

export async function getDodoSubscriptionExpirationDate() {
  'use server';

  // Import here to avoid issues with SSR
  const { getComprehensiveUserData } = await import('@/lib/user-data-server');
  const userData = await getComprehensiveUserData();

  return userData?.dodoSubscription?.expiresAt || null;
}

// Initialize QStash client
const qstash = new Client({ token: serverEnv.QSTASH_TOKEN });

// Helper function to convert frequency to cron schedule with timezone
function frequencyToCron(frequency: string, time: string, timezone: string, dayOfWeek?: string): string {
  const [hours, minutes] = time.split(':').map(Number);

  let cronExpression = '';
  switch (frequency) {
    case 'once':
      // For 'once', we'll handle it differently - no cron schedule needed
      return '';
    case 'daily':
      cronExpression = `${minutes} ${hours} * * *`;
      break;
    case 'weekly':
      // Use the day of week if provided, otherwise default to Sunday (0)
      const day = dayOfWeek || '0';
      cronExpression = `${minutes} ${hours} * * ${day}`;
      break;
    case 'monthly':
      // Run on the 1st of each month
      cronExpression = `${minutes} ${hours} 1 * *`;
      break;
    case 'yearly':
      // Run on January 1st
      cronExpression = `${minutes} ${hours} 1 1 *`;
      break;
    default:
      cronExpression = `${minutes} ${hours} * * *`; // Default to daily
  }

  // Prepend timezone to cron expression for QStash
  return `CRON_TZ=${timezone} ${cronExpression}`;
}

// Helper function to calculate next run time using cron-parser
function calculateNextRun(cronSchedule: string, timezone: string): Date {
  try {
    // Extract the actual cron expression from the timezone-prefixed format
    // Format: "CRON_TZ=timezone 0 9 * * *" -> "0 9 * * *"
    const actualCronExpression = cronSchedule.startsWith('CRON_TZ=')
      ? cronSchedule.split(' ').slice(1).join(' ')
      : cronSchedule;

    const options = {
      currentDate: new Date(),
      tz: timezone,
    };

    const interval = CronExpressionParser.parse(actualCronExpression, options);
    return interval.next().toDate();
  } catch (error) {
    console.error('Error parsing cron expression:', cronSchedule, error);
    // Fallback to simple calculation
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setDate(nextRun.getDate() + 1);
    return nextRun;
  }
}

// Helper function to calculate next run for 'once' frequency
function calculateOnceNextRun(time: string, timezone: string, date?: string): Date {
  const [hours, minutes] = time.split(':').map(Number);

  if (date) {
    // If a specific date is provided, use it
    const targetDate = new Date(date);
    targetDate.setHours(hours, minutes, 0, 0);
    return targetDate;
  }

  // Otherwise, use today or tomorrow
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setHours(hours, minutes, 0, 0);

  // If the time has already passed today, schedule for tomorrow
  if (targetDate <= now) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  return targetDate;
}

export async function createScheduledLookout({
  title,
  prompt,
  frequency,
  time,
  timezone = 'UTC',
  date,
  searchMode = 'extreme',
}: {
  title: string;
  prompt: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  time: string; // Format: "HH:MM" or "HH:MM:dayOfWeek" for weekly
  timezone?: string;
  date?: string; // For 'once' frequency
  searchMode?: string; // Search mode: 'extreme', 'web', 'academic', etc.
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    // Check if user is Pro
    if (!user.isProUser) {
      throw new Error('Pro subscription required for scheduled searches');
    }

    // Check lookout limits
    const existingLookouts = await getLookoutsByUserId({ userId: user.id });
    if (existingLookouts.length >= 10) {
      throw new Error('You have reached the maximum limit of 10 lookouts');
    }

    // Check daily lookout limit specifically
    if (frequency === 'daily') {
      const activeDailyLookouts = existingLookouts.filter(
        (lookout) => lookout.frequency === 'daily' && lookout.status === 'active',
      );
      if (activeDailyLookouts.length >= 5) {
        throw new Error('You have reached the maximum limit of 5 active daily lookouts');
      }
    }

    let cronSchedule = '';
    let nextRunAt: Date;
    let actualTime = time;
    let dayOfWeek: string | undefined;

    // Extract day of week for weekly frequency
    if (frequency === 'weekly' && time.includes(':')) {
      const parts = time.split(':');
      if (parts.length === 3) {
        actualTime = `${parts[0]}:${parts[1]}`;
        dayOfWeek = parts[2];
      }
    }

    if (frequency === 'once') {
      // For 'once', calculate the next run time without cron
      nextRunAt = calculateOnceNextRun(actualTime, timezone, date);
    } else {
      // Generate cron schedule for recurring frequencies
      cronSchedule = frequencyToCron(frequency, actualTime, timezone, dayOfWeek);
      nextRunAt = calculateNextRun(cronSchedule, timezone);
    }

    // Create lookout in database first
    const lookout = await createLookout({
      userId: user.id,
      title,
      prompt,
      frequency,
      cronSchedule,
      timezone,
      nextRunAt,
      qstashScheduleId: undefined, // Will be updated if needed
      searchMode,
    });

    console.log('📝 Created lookout in database:', lookout.id, 'Now scheduling with QStash...');

    // Small delay to ensure database transaction is committed
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create QStash schedule for all frequencies (recurring and once)
    if (lookout.id) {
      try {
        if (frequency === 'once') {
          console.log('⏰ Creating QStash one-time execution for lookout:', lookout.id);
          console.log('📅 Scheduled time:', nextRunAt.toISOString());

          const delay = Math.floor((nextRunAt.getTime() - Date.now()) / 1000); // Delay in seconds
          const minimumDelay = Math.max(delay, 5); // At least 5 seconds to ensure DB consistency

          if (delay > 0) {
            await qstash.publish({
              // if dev env use localhost:3000/api/lookout, else use scira.ai/api/lookout
              url:
                process.env.NODE_ENV === 'development'
                  ? process.env.NGROK_URL + '/api/lookout'
                  : `https://scira.ai/api/lookout`,
              body: JSON.stringify({
                lookoutId: lookout.id,
                prompt,
                userId: user.id,
              }),
              headers: {
                'Content-Type': 'application/json',
              },
              delay: minimumDelay,
            });

            console.log(
              '✅ QStash one-time execution scheduled for lookout:',
              lookout.id,
              'with delay:',
              minimumDelay,
              'seconds',
            );

            // For consistency, we don't store a qstashScheduleId for one-time executions
            // since they use the publish API instead of schedules API
          } else {
            throw new Error('Cannot schedule for a time in the past');
          }
        } else {
          console.log('⏰ Creating QStash recurring schedule for lookout:', lookout.id);
          console.log('📅 Cron schedule with timezone:', cronSchedule);

          const scheduleResponse = await qstash.schedules.create({
            // if dev env use localhost:3000/api/lookout, else use scira.ai/api/lookout
            destination:
              process.env.NODE_ENV === 'development'
                ? process.env.NGROK_URL + '/api/lookout'
                : `https://scira.ai/api/lookout`,
            method: 'POST',
            cron: cronSchedule,
            body: JSON.stringify({
              lookoutId: lookout.id,
              prompt,
              userId: user.id,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
          });

          console.log('✅ QStash recurring schedule created:', scheduleResponse.scheduleId, 'for lookout:', lookout.id);

          // Update lookout with QStash schedule ID
          await updateLookout({
            id: lookout.id,
            qstashScheduleId: scheduleResponse.scheduleId,
          });

          lookout.qstashScheduleId = scheduleResponse.scheduleId;
        }
      } catch (qstashError) {
        console.error('Error creating QStash schedule:', qstashError);
        // Delete the lookout if QStash creation fails
        await deleteLookout({ id: lookout.id });
        throw new Error(
          `Failed to ${frequency === 'once' ? 'schedule one-time search' : 'create recurring schedule'}. Please try again.`,
        );
      }
    }

    return { success: true, lookout };
  } catch (error) {
    console.error('Error creating scheduled lookout:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getUserLookouts() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    const lookouts = await getLookoutsByUserId({ userId: user.id });

    // Update next run times for active lookouts
    const updatedLookouts = lookouts.map((lookout) => {
      if (lookout.status === 'active' && lookout.cronSchedule && lookout.frequency !== 'once') {
        try {
          const nextRunAt = calculateNextRun(lookout.cronSchedule, lookout.timezone);
          return { ...lookout, nextRunAt };
        } catch (error) {
          console.error('Error calculating next run for lookout:', lookout.id, error);
          return lookout;
        }
      }
      return lookout;
    });

    return { success: true, lookouts: updatedLookouts };
  } catch (error) {
    console.error('Error getting user lookouts:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateLookoutStatusAction({
  id,
  status,
}: {
  id: string;
  status: 'active' | 'paused' | 'archived' | 'running';
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    // Get lookout to verify ownership
    const lookout = await getLookoutById({ id });
    if (!lookout || lookout.userId !== user.id) {
      throw new Error('Lookout not found or access denied');
    }

    // Update QStash schedule status if it exists
    if (lookout.qstashScheduleId) {
      try {
        if (status === 'paused') {
          await qstash.schedules.pause({ schedule: lookout.qstashScheduleId });
        } else if (status === 'active') {
          await qstash.schedules.resume({ schedule: lookout.qstashScheduleId });
          // Update next run time when resuming
          if (lookout.cronSchedule) {
            const nextRunAt = calculateNextRun(lookout.cronSchedule, lookout.timezone);
            await updateLookout({ id, nextRunAt });
          }
        } else if (status === 'archived') {
          await qstash.schedules.delete(lookout.qstashScheduleId);
        }
      } catch (qstashError) {
        console.error('Error updating QStash schedule:', qstashError);
        // Continue with database update even if QStash fails
      }
    }

    // Update database
    const updatedLookout = await updateLookoutStatus({ id, status });
    return { success: true, lookout: updatedLookout };
  } catch (error) {
    console.error('Error updating lookout status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateLookoutAction({
  id,
  title,
  prompt,
  frequency,
  time,
  timezone,
  dayOfWeek,
  searchMode,
}: {
  id: string;
  title: string;
  prompt: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  time: string;
  timezone: string;
  dayOfWeek?: string;
  searchMode?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    // Get lookout to verify ownership
    const lookout = await getLookoutById({ id });
    if (!lookout || lookout.userId !== user.id) {
      throw new Error('Lookout not found or access denied');
    }

    // Check daily lookout limit if changing to daily frequency
    if (frequency === 'daily' && lookout.frequency !== 'daily') {
      const existingLookouts = await getLookoutsByUserId({ userId: user.id });
      const activeDailyLookouts = existingLookouts.filter(
        (existingLookout) =>
          existingLookout.frequency === 'daily' && existingLookout.status === 'active' && existingLookout.id !== id,
      );
      if (activeDailyLookouts.length >= 5) {
        throw new Error('You have reached the maximum limit of 5 active daily lookouts');
      }
    }

    // Handle weekly day selection
    let adjustedTime = time;
    if (frequency === 'weekly' && dayOfWeek) {
      adjustedTime = `${time}:${dayOfWeek}`;
    }

    // Generate new cron schedule if frequency changed
    let cronSchedule = '';
    let nextRunAt: Date;

    if (frequency === 'once') {
      // For 'once', set next run to today/tomorrow at specified time
      const [hours, minutes] = time.split(':').map(Number);
      const now = new Date();
      nextRunAt = new Date(now);
      nextRunAt.setHours(hours, minutes, 0, 0);

      if (nextRunAt <= now) {
        nextRunAt.setDate(nextRunAt.getDate() + 1);
      }
    } else {
      cronSchedule = frequencyToCron(frequency, time, timezone, dayOfWeek);
      nextRunAt = calculateNextRun(cronSchedule, timezone);
    }

    // Update QStash schedule if it exists and frequency/time changed
    if (lookout.qstashScheduleId && frequency !== 'once') {
      try {
        // Delete old schedule
        await qstash.schedules.delete(lookout.qstashScheduleId);

        console.log('⏰ Recreating QStash schedule for lookout:', id);
        console.log('📅 Updated cron schedule with timezone:', cronSchedule);

        // Create new schedule with updated cron
        const scheduleResponse = await qstash.schedules.create({
          // if dev env use localhost:3000/api/lookout, else use scira.ai/api/lookout
          destination:
            process.env.NODE_ENV === 'development'
              ? process.env.NGROK_URL + '/api/lookout'
              : `https://scira.ai/api/lookout`,
          method: 'POST',
          cron: cronSchedule,
          body: JSON.stringify({
            lookoutId: id,
            prompt: prompt.trim(),
            userId: user.id,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // Update database with new details
        const updatedLookout = await updateLookout({
          id,
          title: title.trim(),
          prompt: prompt.trim(),
          frequency,
          cronSchedule,
          timezone,
          nextRunAt,
          qstashScheduleId: scheduleResponse.scheduleId,
          searchMode,
        });

        return { success: true, lookout: updatedLookout };
      } catch (qstashError) {
        console.error('Error updating QStash schedule:', qstashError);
        throw new Error('Failed to update schedule. Please try again.');
      }
    } else {
      // Update database only
      const updatedLookout = await updateLookout({
        id,
        title: title.trim(),
        prompt: prompt.trim(),
        frequency,
        cronSchedule,
        timezone,
        nextRunAt,
        searchMode,
      });

      return { success: true, lookout: updatedLookout };
    }
  } catch (error) {
    console.error('Error updating lookout:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteLookoutAction({ id }: { id: string }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    // Get lookout to verify ownership
    const lookout = await getLookoutById({ id });
    if (!lookout || lookout.userId !== user.id) {
      throw new Error('Lookout not found or access denied');
    }

    // Delete QStash schedule if it exists
    if (lookout.qstashScheduleId) {
      try {
        await qstash.schedules.delete(lookout.qstashScheduleId);
      } catch (error) {
        console.error('Error deleting QStash schedule:', error);
        // Continue with database deletion even if QStash deletion fails
      }
    }

    // Delete from database
    const deletedLookout = await deleteLookout({ id });
    return { success: true, lookout: deletedLookout };
  } catch (error) {
    console.error('Error deleting lookout:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function testLookoutAction({ id }: { id: string }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    // Get lookout to verify ownership
    const lookout = await getLookoutById({ id });
    if (!lookout || lookout.userId !== user.id) {
      throw new Error('Lookout not found or access denied');
    }

    // Only allow testing of active or paused lookouts
    if (lookout.status === 'archived' || lookout.status === 'running') {
      throw new Error(`Cannot test lookout with status: ${lookout.status}`);
    }

    // Make a POST request to the lookout API endpoint to trigger the run
    const lookoutUrl =
      process.env.NODE_ENV === 'development'
        ? process.env.NGROK_URL
          ? process.env.NGROK_URL + '/api/lookout'
          : 'http://localhost:3000/api/lookout'
        : `https://scira.ai/api/lookout`;

    const response = await fetch(lookoutUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lookoutId: lookout.id,
        prompt: lookout.prompt,
        userId: user.id,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to trigger lookout test: ${response.statusText}`);
    }

    return { success: true, message: 'Lookout test started successfully' };
  } catch (error) {
    console.error('Error testing lookout:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Server action to get user's geolocation using Vercel
export async function getUserLocation() {
  try {
    const headersList = await headers();

    const request = {
      headers: headersList,
    };

    const locationData = geolocation(request);

    return {
      country: locationData.country || '',
      countryCode: locationData.country || '',
      city: locationData.city || '',
      region: locationData.region || '',
      isIndia: locationData.country === 'IN',
      loading: false,
    };
  } catch (error) {
    console.error('Failed to get location from Vercel:', error);
    return {
      country: 'Unknown',
      countryCode: '',
      city: '',
      region: '',
      isIndia: false,
      loading: false,
    };
  }
}

// Connector management actions
export async function createConnectorAction(provider: ConnectorProvider) {
  'use server';

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    const authLink = await createConnection(provider, user.id);
    return { success: true, authLink };
  } catch (error) {
    console.error('Error creating connector:', error);
    return { success: false, error: 'Failed to create connector' };
  }
}

export async function listUserConnectorsAction() {
  'use server';

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Authentication required', connections: [] };
    }

    const connections = await listUserConnections(user.id);
    return { success: true, connections };
  } catch (error) {
    console.error('Error listing connectors:', error);
    return { success: false, error: 'Failed to list connectors', connections: [] };
  }
}

export async function deleteConnectorAction(connectionId: string) {
  'use server';

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    const result = await deleteConnection(connectionId);
    if (result) {
      return { success: true };
    } else {
      return { success: false, error: 'Failed to delete connector' };
    }
  } catch (error) {
    console.error('Error deleting connector:', error);
    return { success: false, error: 'Failed to delete connector' };
  }
}

export async function manualSyncConnectorAction(provider: ConnectorProvider) {
  'use server';

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    const result = await manualSync(provider, user.id);
    if (result) {
      return { success: true };
    } else {
      return { success: false, error: 'Failed to start sync' };
    }
  } catch (error) {
    console.error('Error syncing connector:', error);
    return { success: false, error: 'Failed to start sync' };
  }
}

export async function getConnectorSyncStatusAction(provider: ConnectorProvider) {
  'use server';

  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Authentication required', status: null };
    }

    const status = await getSyncStatus(provider, user.id);
    return { success: true, status };
  } catch (error) {
    console.error('Error getting sync status:', error);
    return { success: false, error: 'Failed to get sync status', status: null };
  }
}

// Server action to get supported student domains from Edge Config
export async function getStudentDomainsAction() {
  'use server';

  try {
    const studentDomainsConfig = await get('student_domains');
    if (studentDomainsConfig && typeof studentDomainsConfig === 'string') {
      // Parse CSV string to array, trim whitespace, and sort alphabetically
      const domains = studentDomainsConfig
        .split(',')
        .map((domain) => domain.trim())
        .filter((domain) => domain.length > 0)
        .sort();

      return {
        success: true,
        domains,
        count: domains.length,
      };
    }

    // Fallback to hardcoded domains if Edge Config fails
    const fallbackDomains = ['.edu', '.ac.in'].sort();
    return {
      success: true,
      domains: fallbackDomains,
      count: fallbackDomains.length,
      fallback: true,
    };
  } catch (error) {
    console.error('Failed to fetch student domains from Edge Config:', error);

    // Return fallback domains on error
    const fallbackDomains = ['.edu', '.ac.in'].sort();
    return {
      success: false,
      domains: fallbackDomains,
      count: fallbackDomains.length,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Fetch chats for the authenticated user (paginated)
interface ChatMeta {
  preview?: string;
  model?: string;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '') // fenced code blocks
    .replace(/`[^`]*`/g, '') // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → label only
    .replace(/#{1,6}\s+/g, '') // headings
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // italic
    .replace(/~~(.*?)~~/g, '$1') // strikethrough
    .replace(/^[-*+]\s+/gm, '') // unordered list bullets
    .replace(/^\d+\.\s+/gm, '') // ordered list numbers
    .replace(/^>\s+/gm, '') // blockquotes
    .replace(
      /^\|(.+)\|$/gm,
      (
        _,
        row, // table rows → space-separated cells
      ) =>
        row
          .split('|')
          .map((c: string) => c.trim())
          .filter(Boolean)
          .join(' '),
    )
    .replace(/^\|?[\s:|-]+\|[\s:|-|]*$/gm, '') // table separator rows (---|:---:|---)
    .replace(/[-]{3,}|[*]{3,}|[_]{3,}/g, '') // horizontal rules
    .replace(/\n{2,}/g, ' ') // collapse blank lines
    .replace(/\n/g, ' ') // newlines → space
    .replace(/\s{2,}/g, ' ') // collapse whitespace
    .trim();
}

// Batch-fetch the first user message (preview) + first assistant message (model) per chat.
// Two queries total, no N+1.
async function buildPreviewMap(chatIds: string[]): Promise<Record<string, ChatMeta>> {
  if (chatIds.length === 0) return {};

  const rows = await db
    .select({ chatId: message.chatId, role: message.role, parts: message.parts, model: message.model })
    .from(message)
    .where(and(inArray(message.chatId, chatIds)))
    .orderBy(asc(message.createdAt));

  const seenUser = new Set<string>();
  const seenAssistant = new Set<string>();
  const map: Record<string, ChatMeta> = {};

  for (const msg of rows) {
    if (!map[msg.chatId]) map[msg.chatId] = {};

    if (msg.role === 'assistant' && !seenAssistant.has(msg.chatId)) {
      seenAssistant.add(msg.chatId);
      if (msg.model) map[msg.chatId].model = msg.model;
      const parts = Array.isArray(msg.parts) ? msg.parts : [];
      const raw = (parts as Array<{ type: string; text?: string }>)
        .filter((p) => p.type === 'text' && p.text)
        .map((p) => p.text!.trim())
        .join(' ');
      const text = stripMarkdown(raw);
      if (text) map[msg.chatId].preview = text.length > 160 ? text.slice(0, 160) + '…' : text;
    }

    // Fallback: if no assistant message yet, use first user message
    if (msg.role === 'user' && !seenUser.has(msg.chatId) && !map[msg.chatId].preview) {
      seenUser.add(msg.chatId);
      const parts = Array.isArray(msg.parts) ? msg.parts : [];
      const raw = (parts as Array<{ type: string; text?: string }>)
        .filter((p) => p.type === 'text' && p.text)
        .map((p) => p.text!.trim())
        .join(' ');
      const text = stripMarkdown(raw);
      if (text) map[msg.chatId].preview = text.length > 160 ? text.slice(0, 160) + '…' : text;
    }
  }

  return map;
}

export async function getAllChatsWithPreview(limit: number = 25, offset: number = 0) {
  'use server';

  try {
    const user = await getUser();

    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const chats = await db.query.chat.findMany({
      where: and(
        eq(chat.userId, user.id),
        notExists(db.select({ id: buildSession.id }).from(buildSession).where(eq(buildSession.chatId, chat.id))),
      ),
      orderBy: [desc(chat.isPinned), desc(chat.updatedAt), desc(chat.id)],
      limit,
      offset,
    });

    const previewMap = await buildPreviewMap(chats.map((c) => c.id));
    const chatsWithPreview = chats.map((c) => ({
      ...c,
      preview: previewMap[c.id]?.preview ?? null,
      model: previewMap[c.id]?.model ?? null,
    }));

    return { chats: chatsWithPreview };
  } catch (error) {
    console.error('Error fetching chats:', error);
    return { error: 'Failed to fetch chats', status: 500 };
  }
}

// Search chats by title (paginated)
export async function searchChatsByTitle(query: string, limit: number = 25, offset: number = 0) {
  'use server';

  try {
    const user = await getUser();

    if (!user) {
      return { error: 'Unauthorized', status: 401 };
    }

    const trimmedQuery = query?.trim() || '';

    const excludeBuildChats = notExists(
      db.select({ id: buildSession.id }).from(buildSession).where(eq(buildSession.chatId, chat.id)),
    );

    const chats = await db.query.chat.findMany({
      where:
        trimmedQuery.length === 0
          ? and(eq(chat.userId, user.id), excludeBuildChats)
          : and(eq(chat.userId, user.id), ilike(chat.title, `%${trimmedQuery}%`), excludeBuildChats),
      orderBy: [desc(chat.isPinned), desc(chat.updatedAt), desc(chat.id)],
      limit,
      offset,
    });

    const previewMap = await buildPreviewMap(chats.map((c) => c.id));
    const chatsWithPreview = chats.map((c) => ({
      ...c,
      preview: previewMap[c.id]?.preview ?? null,
      model: previewMap[c.id]?.model ?? null,
    }));

    return { chats: chatsWithPreview };
  } catch (error) {
    console.error('Error searching chats:', error);
    return { error: 'Failed to search chats', status: 500 };
  }
}
