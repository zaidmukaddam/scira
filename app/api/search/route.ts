// /app/api/chat/route.ts
import {
  convertToModelMessages,
  generateText,
  Output,
  streamText,
  pruneMessages,
  NoSuchToolError,
  createUIMessageStream,
  tool,
  stepCountIs,
  JsonToSseTransformStream,
  TextPart,
  ImagePart,
  FilePart,
  InferUIMessageChunk,
  AsyncIterableStream,
} from 'ai';
import { pipeJsonRender } from '@json-render/core';
import {
  scira,
  requiresAuthentication,
  requiresProSubscription,
  requiresMaxSubscription,
  shouldBypassRateLimits,
  getModelParameters,
  getMaxOutputTokens,
  hasVisionSupport,
  getModelProvider,
} from '@/ai/providers';
import {
  createStreamId,
  getChatByIdForValidation,
  getLatestStreamIdByChatId,
  getLatestUserMessageIdByChatId,
  getMessagesByChatId,
  saveNewChatWithStream,
  saveMessages,
  incrementExtremeSearchUsage,
  incrementMessageUsage,
  incrementAnthropicUsage,
  incrementGoogleUsage,
  updateChatTitleById,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { after } from 'next/server';
import { CustomInstructions, Message as DbMessage } from '@/lib/db/schema';
import { v7 as uuidv7 } from 'uuid';
import { geolocation } from '@vercel/functions';
import { all } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';
import { GroqProviderOptions } from '@ai-sdk/groq';
import { markdownJoinerTransform } from '@/lib/parser';
import { ChatMessage } from '@/lib/types';
import { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import { AnthropicProviderOptions } from '@ai-sdk/anthropic';
import { getGroupConfig } from '@/lib/search/group-config';
import {
  getCurrentUser,
  getLightweightUser,
  getMessageCountAndExtremeSearchByUserIdAction,
} from '@/lib/search/server-helpers';
import { getCachedCustomInstructionsByUserId, getCachedUserPreferencesByUserId } from '@/lib/user-data-server';
import { GoogleGenerativeAIProviderOptions, GoogleLanguageModelOptions } from '@ai-sdk/google';
import { unauthenticatedRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { loadConfiguredTools } from '@/lib/search/tool-loader';
import { CohereChatModelOptions } from '@ai-sdk/cohere';
import { xai } from '@ai-sdk/xai';

interface CriticalChecksResult {
  canProceed: boolean;
  error?: any;
  isProUser: boolean;
  isMaxUser: boolean;
  messageCount?: number;
  extremeSearchUsage?: number;
  subscriptionData?: any;
  shouldBypassLimits?: boolean;
}

interface ChatInitializationParams {
  chatQueryPromise: Promise<any>;
  lightweightUser: { userId: string; email: string; isProUser: boolean; isMaxUser: boolean } | null;
  isProUser: boolean;
  isMaxUser: boolean;
  id: string;
  streamId: string;
  selectedVisibilityType: any;
  messages: any[];
  model: string;
  isTemporaryChat: boolean;
  enableDetailedTiming?: boolean;
}

function initializeChatAndChecks({
  chatQueryPromise,
  lightweightUser,
  isProUser,
  isMaxUser,
  id,
  streamId,
  selectedVisibilityType,
  messages,
  model,
  isTemporaryChat,
  enableDetailedTiming = false,
}: ChatInitializationParams): {
  criticalChecksPromise: Promise<CriticalChecksResult>;
  chatInitializationPromise: Promise<{ isNewChat: boolean; titlePromise: Promise<string> | null }>;
} {
  async function withTiming<T>(label: string, promise: Promise<T>): Promise<T> {
    if (!enableDetailedTiming) return promise;
    const startedAt = Date.now();

    try {
      const value = await promise;
      console.log(`⏱ ${label}: ${Date.now() - startedAt}ms`);
      return value;
    } catch (error) {
      console.log(`⏱ ${label}: ${Date.now() - startedAt}ms (failed)`);
      throw error;
    }
  }

  // Unauthenticated users don't need chat validation
  if (!lightweightUser) {
    return {
      criticalChecksPromise: Promise.resolve({
        canProceed: true,
        isProUser: false,
        isMaxUser: false,
        messageCount: 0,
        extremeSearchUsage: 0,
        subscriptionData: null,
        shouldBypassLimits: false,
      }),
      chatInitializationPromise: Promise.resolve({ isNewChat: false, titlePromise: null }),
    };
  }

  if (isTemporaryChat) {
    let criticalChecksPromise: Promise<CriticalChecksResult>;

    if (isProUser) {
      // Pro users: known from lightweightUser — resolve immediately, no DB needed
      criticalChecksPromise = Promise.resolve({
        canProceed: true,
        isProUser: true,
        isMaxUser,
        messageCount: 0,
        extremeSearchUsage: 0,
        subscriptionData: null,
        shouldBypassLimits: true,
      });
    } else {
      criticalChecksPromise = (async () => {
        const { messageCountResult, extremeSearchUsage, anthropicUsageResult, googleUsageResult } =
          await getMessageCountAndExtremeSearchByUserIdAction(lightweightUser.userId);

        if (messageCountResult.error) {
          throw new ChatSDKError('bad_request:api', 'Failed to verify usage limits');
        }
        if (extremeSearchUsage.error) {
          throw new ChatSDKError('bad_request:api', 'Failed to verify extreme search usage limits');
        }
        if (anthropicUsageResult.error) {
          throw new ChatSDKError('bad_request:api', 'Failed to verify anthropic usage limits');
        }
        if (googleUsageResult.error) {
          throw new ChatSDKError('bad_request:api', 'Failed to verify google usage limits');
        }

        const shouldBypassLimits = shouldBypassRateLimits(model, lightweightUser);
        const isAnthropicModel = getModelProvider(model) === 'anthropic';
        const isMaxGoogleModel = getModelProvider(model) === 'google' && lightweightUser.isMaxUser;
        if (!shouldBypassLimits && messageCountResult.count !== undefined && messageCountResult.count >= 100) {
          throw new ChatSDKError('rate_limit:chat', 'Daily search limit reached');
        }
        if (
          isAnthropicModel &&
          lightweightUser.isMaxUser &&
          anthropicUsageResult.count !== undefined &&
          anthropicUsageResult.count >= 60
        ) {
          throw new ChatSDKError('rate_limit:model', 'Daily Anthropic limit reached for Max users.');
        }
        if (
          isMaxGoogleModel &&
          googleUsageResult.count !== undefined &&
          googleUsageResult.count >= 80
        ) {
          throw new ChatSDKError('rate_limit:model', 'Monthly Gemini limit reached for Max users.');
        }

        return {
          canProceed: true,
          isProUser: false,
          isMaxUser: false,
          messageCount: messageCountResult.count,
          extremeSearchUsage: extremeSearchUsage.count,
          anthropicUsage: anthropicUsageResult.count,
          subscriptionData: { hasSubscription: false },
          shouldBypassLimits,
        };
      })().catch((error) => {
        if (error instanceof ChatSDKError) throw error;
        throw new ChatSDKError('bad_request:api', 'Failed to verify user access');
      });
    }

    return {
      criticalChecksPromise,
      chatInitializationPromise: Promise.resolve({ isNewChat: false, titlePromise: null }),
    };
  }

  // Validate ownership once and get chat data
  const validatedChatPromise = withTiming(
    'chat_init.existingChat_wait',
    chatQueryPromise.then((existingChat) => {
      if (existingChat && existingChat.userId !== lightweightUser.userId) {
        throw new ChatSDKError('forbidden:chat', 'This chat belongs to another user');
      }
      return existingChat;
    }),
  );

  // Build critical checks promise first (must complete before chat creation)
  let criticalChecksPromise: Promise<CriticalChecksResult>;

  if (isProUser) {
    // Pro users: ownership check only, no usage DB calls or fullUserPromise needed.
    // validatedChatPromise is fast (cache + indexed lookup) and unblocks saveChat/createStreamId earlier.
    criticalChecksPromise = validatedChatPromise.then(() => ({
      canProceed: true,
      isProUser: true,
      isMaxUser,
      messageCount: 0,
      extremeSearchUsage: 0,
      subscriptionData: null,
      shouldBypassLimits: true,
    }));
  } else {
    // Non-Pro users: validate ownership and check usage limits.
    // Run chat validation and usage fetch in parallel to save one RTT.
    criticalChecksPromise = (async () => {
      const { validatedChat, usageResult } = await all(
        {
          async validatedChat() {
            return validatedChatPromise;
          },
          async usageResult() {
            return getMessageCountAndExtremeSearchByUserIdAction(lightweightUser.userId);
          },
        },
        getBetterAllOptions(),
      );

      if (validatedChat && validatedChat.userId !== lightweightUser.userId) {
        throw new ChatSDKError('forbidden:chat', 'This chat belongs to another user');
      }

      const { messageCountResult, extremeSearchUsage, anthropicUsageResult, googleUsageResult } = usageResult;
      if (messageCountResult.error) {
        throw new ChatSDKError('bad_request:api', 'Failed to verify usage limits');
      }
      if (extremeSearchUsage.error) {
        throw new ChatSDKError('bad_request:api', 'Failed to verify extreme search usage limits');
      }
      if (anthropicUsageResult.error) {
        throw new ChatSDKError('bad_request:api', 'Failed to verify anthropic usage limits');
      }
      if (googleUsageResult.error) {
        throw new ChatSDKError('bad_request:api', 'Failed to verify google usage limits');
      }

      const shouldBypassLimits = shouldBypassRateLimits(model, lightweightUser);
      const isAnthropicModel = getModelProvider(model) === 'anthropic';
      const isMaxGoogleModel = getModelProvider(model) === 'google' && lightweightUser.isMaxUser;
      if (!shouldBypassLimits && messageCountResult.count !== undefined && messageCountResult.count >= 100) {
        throw new ChatSDKError('rate_limit:chat', 'Daily search limit reached');
      }
      if (
        isAnthropicModel &&
        lightweightUser.isMaxUser &&
        anthropicUsageResult.count !== undefined &&
        anthropicUsageResult.count >= 60
      ) {
        throw new ChatSDKError('rate_limit:model', 'Daily Anthropic limit reached for Max users.');
      }
      if (
        isMaxGoogleModel &&
        googleUsageResult.count !== undefined &&
        googleUsageResult.count >= 80
      ) {
        throw new ChatSDKError('rate_limit:model', 'Monthly Gemini limit reached for Max users.');
      }

      return {
        canProceed: true,
        isProUser: false,
        isMaxUser: false,
        messageCount: messageCountResult.count,
        extremeSearchUsage: extremeSearchUsage.count,
        anthropicUsage: anthropicUsageResult.count,
        subscriptionData: { hasSubscription: false },
        shouldBypassLimits,
      };
    })().catch((error) => {
      if (error instanceof ChatSDKError) throw error;
      throw new ChatSDKError('bad_request:api', 'Failed to verify user access');
    });
  }

  criticalChecksPromise = withTiming('chat_init.criticalResult_wait', criticalChecksPromise);

  // For existing chats, start stream ID creation immediately (runs in parallel with critical checks)
  const earlyStreamIdPromise = withTiming(
    'chat_init.streamIdCreated_wait',
    validatedChatPromise.then(async (existingChat) => {
      if (existingChat) {
        await createStreamId({ streamId, chatId: id });
        return true;
      }
      return false;
    }),
  );

  // Initialize chat (create if needed, create stream ID)
  // For new chats, wait for critical checks to complete first, then create chat (FK constraint)
  const chatInitializationPromise = withTiming(
    'chat_init.total',
    all(
      {
        async existingChat() {
          return validatedChatPromise;
        },
        async criticalResult() {
          return criticalChecksPromise;
        },
        async streamIdCreated() {
          return earlyStreamIdPromise;
        },
      },
      getBetterAllOptions(),
    )
      .then(async ({ existingChat, criticalResult }) => {
        // Verify critical checks passed before creating new chat
        if (!criticalResult.canProceed) {
          throw criticalResult.error || new ChatSDKError('bad_request:api', 'Failed to verify user access');
        }

        if (!existingChat) {
          // New chat: save chat + stream ID in one CTE query (single DB round-trip)
          await saveNewChatWithStream({
            chatId: id,
            userId: lightweightUser.userId,
            title: 'New Chat',
            visibility: selectedVisibilityType,
            streamId,
          });
          // Fire off title generation without blocking chat creation
          const titlePromise = import('@/lib/search/chat-title')
            .then(({ generateTitleFromUserMessage }) =>
              generateTitleFromUserMessage({
                message: messages[messages.length - 1],
              }),
            )
            .catch(() => 'New Chat');
          return { isNewChat: true, titlePromise };
        } else {
          // Stream ID already created in parallel via earlyStreamIdPromise
          return { isNewChat: false, titlePromise: null };
        }
      })
      .catch((error) => {
        if (error instanceof ChatSDKError) throw error;
        console.error('Chat initialization failed:', error);
        throw new ChatSDKError('bad_request:database', 'Failed to initialize chat');
      }),
  );

  return { criticalChecksPromise, chatInitializationPromise };
}

export async function getStreamContext() {
  const { getResumableStreamClients } = await import('@/lib/redis');
  return getResumableStreamClients();
}

export async function POST(req: Request) {
  const requestStartTime = Date.now();
  const preStreamTimings: { label: string; durationMs: number }[] = [];
  const shouldLogTimings = process.env.NODE_ENV !== 'production' && process.env.DEBUG_PERF === '1';

  function recordTiming(label: string, startTime: number) {
    preStreamTimings.push({
      label,
      durationMs: Date.now() - startTime,
    });
  }

  let opStart = Date.now();
  const {
    messages: requestMessages,
    model: requestedModel,
    group,
    timezone,
    id,
    selectedVisibilityType,
    isCustomInstructionsEnabled,
    searchProvider,
    extremeSearchModel,
    selectedConnectors,
    isTemporaryChat,
    isAutoRouted,
    autoRouterEnabled,
    autoRouterConfig,
  } = await req.json();
  recordTiming('parse_request_body', opStart);

  if (!Array.isArray(requestMessages) || requestMessages.length === 0) {
    return new ChatSDKError('bad_request:api', 'Messages array is required and cannot be empty').toResponse();
  }

  const incomingMessages = requestMessages as ChatMessage[];
  const requestLastUserMessage = [...incomingMessages].reverse().find((message) => message.role === 'user');

  if (!requestLastUserMessage) {
    return new ChatSDKError('bad_request:api', 'A user message is required').toResponse();
  }

  opStart = Date.now();
  const { latitude, longitude } = geolocation(req);
  recordTiming('geolocation_lookup', opStart);

  const streamId = 'stream-' + uuidv7();

  // Initialize model - will be updated by auto-router if needed
  let model = requestedModel.trim();
  let autoRouteName: string | undefined;

  console.log('🔍 Search API:', {
    model,
    requestedModel,
    group,
    latitude,
    longitude,
    isAutoRouted,
    autoRouterEnabled,
  });

  // Start all independent operations in parallel immediately
  opStart = Date.now();
  const lightweightUserPromise = getLightweightUser();
  // Use lightweight validation query - only fetches id and userId
  const chatQueryPromise = isTemporaryChat ? Promise.resolve(null) : getChatByIdForValidation({ id });
  const persistedMessagesPromise =
    isTemporaryChat || incomingMessages.length > 1 ? Promise.resolve<ChatMessage[]>([]) : getMessagesByChatId({ id });
  const isDev = process.env.NODE_ENV === 'development';
  const rateLimitPromise = lightweightUserPromise.then((user) => {
    if (user || isDev) return null;
    const identifier = getClientIdentifier(req);
    return unauthenticatedRateLimit.limit(identifier);
  });
  recordTiming('start_parallel_operations', opStart);

  // Wait for lightweight user first (needed for early exit checks)
  opStart = Date.now();
  const lightweightUser = await lightweightUserPromise;
  recordTiming('get_lightweight_user', opStart);

  // Start full user fetch immediately (doesn't block early exits)
  const isProUser = lightweightUser?.isProUser ?? false;
  const isMaxUser = lightweightUser?.isMaxUser ?? false;
  const shouldUseXaiMultiAgent = group === 'multi-agent' && isProUser;
  opStart = Date.now();
  const fullUserPromise = lightweightUser ? getCurrentUser() : Promise.resolve(null);
  recordTiming('create_full_user_promise', opStart);

  // Rate limit check for unauthenticated users (skip in dev environment)
  if (!lightweightUser && !isDev) {
    opStart = Date.now();
    const rateLimitResult = await rateLimitPromise;
    if (!rateLimitResult) {
      return new ChatSDKError('rate_limit:api', 'Rate limit check failed').toResponse();
    }
    const { success, limit, reset } = rateLimitResult;
    recordTiming('unauthenticated_rate_limit', opStart);

    if (!success) {
      const resetDate = new Date(reset);
      return new ChatSDKError(
        'rate_limit:api',
        `You've reached the limit of ${limit} searches per day for unauthenticated users. Sign in for more searches or wait until ${resetDate.toLocaleString()}.`,
      ).toResponse();
    }
  }

  // Early exit checks (no DB operations needed)
  if (!lightweightUser) {
    if (requiresAuthentication(model)) {
      return new ChatSDKError('unauthorized:model', `${model} requires authentication`).toResponse();
    }
    if (group === 'extreme') {
      return new ChatSDKError('unauthorized:auth', 'Authentication required to use Extreme Search mode').toResponse();
    }
    if (group === 'mcp') {
      return new ChatSDKError('unauthorized:auth', 'Authentication required to use MCP mode').toResponse();
    }
  } else {
    // Fast auth checks using lightweight user (no additional DB calls)
    if (requiresMaxSubscription(model) && !lightweightUser.isMaxUser) {
      return new ChatSDKError('upgrade_required:model', `${model} requires a Max subscription`).toResponse();
    }
    if (requiresProSubscription(model) && !lightweightUser.isProUser && !lightweightUser.isMaxUser) {
      return new ChatSDKError('upgrade_required:model', `${model} requires a Pro subscription`).toResponse();
    }
    if (group === 'mcp' && !lightweightUser.isProUser && !lightweightUser.isMaxUser) {
      return new ChatSDKError('upgrade_required:auth', 'MCP mode requires a Pro subscription').toResponse();
    }
  }

  // Start config and custom instructions in parallel
  // Use lightweightUser.userId directly instead of waiting for fullUserPromise
  opStart = Date.now();
  const configPromise = getGroupConfig(group, lightweightUser, fullUserPromise);
  const customInstructionsPromise =
    lightweightUser && (isCustomInstructionsEnabled ?? true)
      ? getCachedCustomInstructionsByUserId(lightweightUser.userId)
      : Promise.resolve(null);
  const userPreferencesPromise = lightweightUser
    ? getCachedUserPreferencesByUserId(lightweightUser.userId)
    : Promise.resolve(null);
  recordTiming('start_parallel_config_and_user_promises', opStart);

  // Initialize chat and perform critical checks (chatQueryPromise already started)
  opStart = Date.now();
  const { criticalChecksPromise, chatInitializationPromise } = initializeChatAndChecks({
    chatQueryPromise,
    lightweightUser,
    isProUser,
    isMaxUser,
    id,
    streamId,
    selectedVisibilityType,
    messages: incomingMessages,
    model,
    isTemporaryChat: Boolean(isTemporaryChat),
    enableDetailedTiming: shouldLogTimings,
  });
  recordTiming('initialize_chat_and_checks', opStart);

  let customInstructions: CustomInstructions | null = null;

  // Wait for critical checks, config, and chat initialization in parallel
  // Chat initialization is critical: for new chats it must complete before streaming (FK constraint)
  const { criticalResult, config, customInstructionsResult, chatInitResult, userPreferencesResult, persistedMessages } =
    await all(
      {
        async criticalResult() {
          return criticalChecksPromise;
        },
        async config() {
          return configPromise;
        },
        async customInstructionsResult() {
          return customInstructionsPromise;
        },
        async chatInitResult() {
          return chatInitializationPromise; // Must complete before streaming (especially for new chats)
        },
        async userPreferencesResult() {
          return userPreferencesPromise;
        },
        async persistedMessages() {
          return persistedMessagesPromise;
        },
      },
      getBetterAllOptions(),
    );
  const { tools: activeTools, instructions } = config;
  recordTiming('await_parallel_setup', opStart);

  if (!criticalResult.canProceed) {
    throw criticalResult.error;
  }

  customInstructions = customInstructionsResult;

  const persistedDbMessages = persistedMessages as DbMessage[];
  const persistedMessageIds = new Set(persistedDbMessages.map((message) => message.id));
  const newIncomingMessages = incomingMessages.filter((message) => !persistedMessageIds.has(message.id));
  const normalizedPersistedMessages: ChatMessage[] = persistedDbMessages.map((message) => ({
    id: message.id,
    role: message.role as 'user' | 'assistant' | 'system',
    parts: (message.parts as ChatMessage['parts']) ?? [],
    metadata: {
      createdAt: message.createdAt.toISOString(),
      model: message.model ?? '',
      completionTime: message.completionTime ?? null,
      inputTokens: message.inputTokens ?? null,
      outputTokens: message.outputTokens ?? null,
      totalTokens: message.totalTokens ?? null,
    },
  }));
  const hydratedMessages =
    !isTemporaryChat && normalizedPersistedMessages.length > 0 && incomingMessages.length === 1
      ? [...normalizedPersistedMessages, ...newIncomingMessages]
      : incomingMessages;

  // Save user message (chat is guaranteed to exist now) - await synchronously (no background)
  if (lightweightUser && !isTemporaryChat && newIncomingMessages.length > 0) {
    const latestIncomingUserMessage = [...newIncomingMessages].reverse().find((message) => message.role === 'user');

    if (latestIncomingUserMessage) {
      opStart = Date.now();
      await saveMessages({
        messages: [
          {
            chatId: id,
            id: latestIncomingUserMessage.id,
            role: 'user',
            parts: latestIncomingUserMessage.parts,
            attachments: [],
            createdAt: new Date(),
            model: model,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            completionTime: 0,
          },
        ],
      });
      recordTiming('save_user_message', opStart);
    }
  }

  const setupTimeMs = Date.now() - requestStartTime;
  if (shouldLogTimings) {
    console.log('⏱ Pre-stream operation timings (ms):', preStreamTimings);
    console.log(`🚀 Time to streamText: ${(setupTimeMs / 1000).toFixed(2)}s`);
  }

  const streamStartTime = Date.now();
  const initialMessageIds = new Set(hydratedMessages.map((message: any) => message.id));
  const requestLastUserMessageId: string | null = requestLastUserMessage?.id ?? null;

  const userMessageCount = hydratedMessages.filter((message: any) => message.role === 'user').length;
  const shouldPrune = userMessageCount > 10;

  const prunedMessages = shouldPrune
    ? await (async () => {
        console.log(
          `🔧 Pruning messages: ${userMessageCount} user messages (${hydratedMessages.length} total messages)`,
        );
        const pruned = pruneMessages({
          reasoning: 'all',
          messages: await convertToModelMessages(hydratedMessages, {
            ignoreIncompleteToolCalls: true,
          }),
          toolCalls: 'before-last-5-messages',
        });
        console.log(`✂️ Pruned to ${pruned.length} messages`);
        return pruned;
      })()
    : await convertToModelMessages(hydratedMessages, {
        ignoreIncompleteToolCalls: true,
      });

  // Extract document files from ALL messages for file_query_search tool
  // PDF support requires Pro subscription (enforced in form-component.tsx)
  const documentMimeTypes = [
    'application/pdf',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];

  // Collect all document files from all messages in the conversation
  const contextFiles: Array<{ url: string; contentType: string; name?: string }> = [];
  const seenUrls = new Set<string>();

  for (const msg of hydratedMessages) {
    const parts = (msg.parts as (TextPart | ImagePart | FilePart)[]) ?? [];
    for (const part of parts) {
      if (part.type === 'file') {
        const filePart = part as any;
        const mediaType = filePart.mediaType || '';
        const url = filePart.url || '';
        if (documentMimeTypes.includes(mediaType) && url && !seenUrls.has(url)) {
          seenUrls.add(url);
          contextFiles.push({
            url,
            contentType: mediaType,
            name: filePart.name,
          });
        }
      }
    }
  }

  // Process messages to remove document file parts from model input
  let processedMessages = prunedMessages.map((msg: any) => {
    if (msg.role === 'user' && Array.isArray(msg.content)) {
      // Filter out document file parts
      const filteredContent = msg.content.filter((part: any) => {
        if (part.type === 'file') {
          const mediaType = part.mimeType || part.mediaType || '';
          return !documentMimeTypes.includes(mediaType);
        }
        return true;
      });
      return { ...msg, content: filteredContent };
    }
    return msg;
  });

  // If there are document files in the conversation, add instruction to the last user message
  if (contextFiles.length > 0) {
    const fileNames = contextFiles.map((f) => f.name || 'unnamed file').join(', ');
    const fileInstruction = `\n\n[Attached files in conversation: ${fileNames}. Use the file_query_search tool to search and retrieve information from these files.]`;

    // Find the last user message and append the instruction
    for (let i = processedMessages.length - 1; i >= 0; i--) {
      const msg = processedMessages[i];
      if (msg.role === 'user') {
        if (Array.isArray(msg.content)) {
          const lastTextIndex = msg.content.findLastIndex((p: any) => p.type === 'text');
          if (lastTextIndex >= 0) {
            msg.content[lastTextIndex] = {
              ...msg.content[lastTextIndex],
              text: msg.content[lastTextIndex].text + fileInstruction,
            };
          } else {
            msg.content.push({ type: 'text', text: fileInstruction.trim() });
          }
        } else if (typeof msg.content === 'string') {
          msg.content = msg.content + fileInstruction;
        }
        break;
      }
    }
  }

  // Detect images in last user message for auto-routing
  const lastUserMessage = [...hydratedMessages].reverse().find((msg) => msg.role === 'user');
  const lastUserParts = (lastUserMessage?.parts as (TextPart | ImagePart | FilePart)[]) ?? [];
  const hasImages = lastUserParts.some((part) => part.type === 'file' && (part as any).mediaType?.startsWith('image/'));

  // Auto-routing logic - run on server side if auto router is selected
  if (isAutoRouted && autoRouterEnabled && requestedModel === 'scira-auto') {
    // Extract last user query for routing
    let query = '';
    for (let i = hydratedMessages.length - 1; i >= 0; i--) {
      const msg = hydratedMessages[i];
      if (msg.role === 'user') {
        const parts = (msg.parts as (TextPart | ImagePart | FilePart)[]) ?? [];
        for (let j = parts.length - 1; j >= 0; j--) {
          const part = parts[j];
          if (part.type === 'text' && part.text) {
            query = part.text;
            break;
          }
        }
        if (query) break;
      }
    }

    // Run auto router with user's configured routes
    const routes = autoRouterConfig?.routes ?? [];
    if (query && routes.length > 0) {
      try {
        const { routeWithAutoRouter } = await import('@/lib/search/auto-router');
        const routeResult = await routeWithAutoRouter({ query, routes, hasImages });
        if (routeResult?.success && routeResult.model) {
          model = routeResult.model;
          autoRouteName = routeResult.route;
        } else {
          model = 'scira-default';
        }
      } catch (error) {
        console.error('Auto router error:', error);
        model = 'scira-default';
      }
    } else {
      model = 'scira-default';
    }

    if (hasImages && !hasVisionSupport(model)) {
      model = 'scira-default';
      autoRouteName = 'other';
    }
  }

  const abortController = new AbortController();
  let finalUsageMetadata: {
    completionTime: number | null;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  } = {
    completionTime: null,
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
  };

  const stream = createUIMessageStream<ChatMessage>({
    execute: async ({ writer: dataStream }) => {
      let mcpDynamicTools: Record<string, any> = {};
      let closeMcpTools = async () => {};
      let mcpToolsClosed = false;

      const closeMcpToolsSafe = async () => {
        if (mcpToolsClosed) return;
        mcpToolsClosed = true;
        await closeMcpTools().catch((error) => {
          console.warn('Failed closing MCP clients:', error);
        });
      };

      const shouldLoadMcpTools = Boolean(lightweightUser?.isProUser && (group === 'mcp' || group === 'extreme'));

      if (shouldLoadMcpTools && lightweightUser) {
        const { resolveUserMcpTools } = await import('@/lib/tools/mcp-client');
        const resolvedMcp = await resolveUserMcpTools({
          userId: lightweightUser.userId,
          dataStream,
        });
        mcpDynamicTools = resolvedMcp.tools;
        closeMcpTools = resolvedMcp.closeAll;

        if (resolvedMcp.errors.length > 0) {
          console.warn('MCP tool loading errors:', resolvedMcp.errors);
        }
      }

      const dynamicMcpToolNames = Object.keys(mcpDynamicTools);
      const configuredActiveTools = [
        ...activeTools,
        ...(group === 'mcp' || group === 'extreme' ? dynamicMcpToolNames : []),
      ];
      const streamActiveTools =
        model === 'scira-qwen-coder-plus' || model === 'scira-qwen-3-vl' || model === 'scira-qwen-3-vl-thinking'
          ? [...configuredActiveTools].filter((tool) => tool !== 'code_interpreter')
          : [...configuredActiveTools];
      const loadedTools = await loadConfiguredTools({
        activeToolNames: streamActiveTools,
        dataStream,
        searchProvider,
        timezone,
        contextFiles,
        extremeSearchModel,
        includeMcpTools: group === 'extreme' || group === 'mcp',
        mcpDynamicTools,
        lightweightUser,
        selectedConnectors,
      });

      const streamTools = shouldUseXaiMultiAgent
        ? {
            ...loadedTools,
            xai_web_search: xai.tools.webSearch(),
            xai_x_search: xai.tools.xSearch(),
          }
        : loadedTools;

      function setUsageMetadataFromUsage(
        usage:
          | {
              inputTokens?: number;
              outputTokens?: number;
              totalTokens?: number;
            }
          | undefined,
        completionTime: number,
      ) {
        const inputTokens = usage?.inputTokens ?? null;
        const outputTokens = usage?.outputTokens ?? null;
        const totalTokens =
          usage?.totalTokens ??
          (inputTokens !== null || outputTokens !== null ? (inputTokens ?? 0) + (outputTokens ?? 0) : null);

        finalUsageMetadata = {
          completionTime,
          inputTokens,
          outputTokens,
          totalTokens,
        };
      }

      function setUsageMetadataFromSteps(
        steps: Array<{
          usage?: {
            inputTokens?: number;
            outputTokens?: number;
            totalTokens?: number;
          };
        }>,
        completionTime: number,
      ) {
        let inputTokens = 0;
        let outputTokens = 0;
        let totalTokens = 0;
        let hasInputTokens = false;
        let hasOutputTokens = false;
        let hasTotalTokens = false;

        for (const step of steps) {
          if (typeof step.usage?.inputTokens === 'number') {
            inputTokens += step.usage.inputTokens;
            hasInputTokens = true;
          }
          if (typeof step.usage?.outputTokens === 'number') {
            outputTokens += step.usage.outputTokens;
            hasOutputTokens = true;
          }
          if (typeof step.usage?.totalTokens === 'number') {
            totalTokens += step.usage.totalTokens;
            hasTotalTokens = true;
          }
        }

        finalUsageMetadata = {
          completionTime,
          inputTokens: hasInputTokens ? inputTokens : null,
          outputTokens: hasOutputTokens ? outputTokens : null,
          totalTokens: hasTotalTokens
            ? totalTokens
            : hasInputTokens || hasOutputTokens
              ? inputTokens + outputTokens
              : null,
        };
      }

      // Stream the auto-routed model info to the client
      if (isAutoRouted && autoRouteName) {
        dataStream.write({
          type: 'data-auto_routed_model',
          data: { model, route: autoRouteName },
          transient: true,
        });
      }

      // Stream chat title for new chats so client can update immediately
      if (chatInitResult.isNewChat && chatInitResult.titlePromise) {
        chatInitResult.titlePromise.then((chatTitle) => {
          dataStream.write({
            type: 'data-chat_title',
            data: { title: chatTitle },
            transient: true,
          });
          // Update the placeholder title in the DB
          updateChatTitleById({ chatId: id, title: chatTitle }).catch(console.error);
        });
      }

      const result = streamText({
        model: shouldUseXaiMultiAgent ? xai.responses('grok-4.20-multi-agent') : scira.languageModel(model),
        messages: processedMessages,
        ...getModelParameters(shouldUseXaiMultiAgent ? 'grok-4.20-multi-agent' : model),
        stopWhen: stepCountIs(shouldUseXaiMultiAgent ? 5 : group === 'mcp' ? 50 : 5),
        ...(shouldUseXaiMultiAgent
          ? {}
          : model === 'scira-default' ||
              model === 'scira-grok4.1-fast-thinking' ||
              model === 'scira-glm-4.6' ||
              model === 'scira-glm-4.6v-flash' ||
              model === 'scira-glm-4.6v'
            ? {
                maxOutputTokens: getMaxOutputTokens(model),
              }
            : {}),
        maxRetries: 10,
        abortSignal: abortController.signal,
        activeTools: shouldUseXaiMultiAgent ? ['xai_web_search', 'xai_x_search'] : streamActiveTools,
        experimental_transform: markdownJoinerTransform(),
        system:
          instructions +
          (customInstructions && (isCustomInstructionsEnabled ?? true)
            ? `\n\nThe user's custom instructions are as follows and YOU MUST FOLLOW THEM AT ALL COSTS: ${customInstructions?.content}`
            : '\n') +
          (latitude && longitude && userPreferencesResult?.preferences?.['scira-location-metadata-enabled'] === true
            ? `\n\nThe user's location is ${latitude}, ${longitude}.`
            : '') +
          (shouldUseXaiMultiAgent
            ? '\n\nWhen multi-agent mode is enabled, you are operating in a high-agency research workflow. Use only the xAI server-side web search and X search tools available in this environment. Do not call any other research or search tools.\n\nYour job is to behave like a rigorous research analyst:\n- Break the request into sub-questions when useful.\n- Search broadly first, then narrow based on what you find.\n- Use multiple searches when the topic is ambiguous, fast-moving, comparative, or requires validation.\n- Cross-check important claims across multiple sources whenever possible.\n- Prefer recent and primary sources for news, releases, product changes, pricing, benchmarks, and policy updates.\n- Use X search when social signals, firsthand announcements, or fast-moving discourse are relevant.\n- Use web search when you need official documentation, articles, product pages, blogs, papers, or other published sources.\n- If both web and X are relevant, use both.\n\nOutput requirements:\n- Synthesize findings into a clear, direct answer instead of narrating every search step.\n- Be concise but complete.\n- Include uncertainty when evidence is mixed, incomplete, or time-sensitive.\n- Do not fabricate facts, sources, timelines, quotes, or consensus.\n- If you cannot verify a claim well enough, say so plainly.\n- Ground the final answer in the sources you found and make sure the answer actually reflects them.\n\nResponse structure guidelines:\n- Start with a direct answer or conclusion in 1-3 sentences.\n- Then present the most important findings as short sections or bullet points.\n- For comparative questions, explicitly compare the options point-by-point.\n- For fast-moving topics, clearly separate confirmed facts from tentative signals.\n- End with a brief takeaway, recommendation, or next step when useful.\n- Keep the response skimmable and avoid long, repetitive paragraphs.\n\nTool behavior requirements:\n- Do not mention internal tool limitations unless necessary.\n- Do not ask for permission to search.\n- Do not stop after a single weak search if the question clearly needs deeper verification.\n- Avoid redundant searches that do not add evidence.\n- Prefer quality of evidence over quantity of searches.'
            : ''),
        toolChoice: 'auto',
        tools: streamTools,
        ...(model === 'scira-anthropic' ||
        model === 'scira-anthropic-think' ||
        model === 'scira-anthropic-sonnet-4.6' ||
        model === 'scira-anthropic-sonnet-4.6-think' ||
        model === 'scira-anthropic-opus-4.6' ||
        model === 'scira-anthropic-opus-4.6-think'
          ? {
              headers: {
                'anthropic-beta': 'context-1m-2025-08-07',
              },
            }
          : {}),
        providerOptions: {
          gateway: {
            only: [
              'openai',
              'google',
              'vertex',
              'zai',
              'arcee-ai',
              'deepseek',
              'alibaba',
              'baseten',
              'minimax',
              'streamlake',
              'fireworks',
              'bedrock',
              'vercel',
              'xai',
              'xai',
              'bytedance',
              'moonshotai',
              'novita',
              'togetherai',
              'inception',
            ],
            ...(model === 'scira-kimi-k2-v2-thinking'
              ? {
                  order: ['moonshotai'],
                }
              : {}),
            ...(model === 'scira-qwen-coder' || model === 'scira-deepseek-v3' || model === 'scira-qwen-235'
              ? {
                  order: ['baseten'],
                }
              : {}),
            ...(model === 'scira-nova-2-lite'
              ? {
                  order: ['bedrock'],
                }
              : {}),
            ...(model === 'scira-kat-coder'
              ? {
                  order: ['streamlake'],
                }
              : {}),
            ...(model === 'scira-glm-4.7' || model === 'scira-glm-4.7-flash'
              ? {
                  order: ['zai'],
                }
              : {}),
            ...(model === 'scira-kimi-k2.5' || model === 'scira-kimi-k2.5-thinking'
              ? {
                  order: ['fireworks'],
                }
              : {}),
          },
          'workersai.chat': {
            chat_template_kwargs: {
              enable_thinking: false,
            },
          },
          sarvam: {
            reasoning_effort: 'high',
          },
          openai: {
            ...(model !== 'scira-qwen-coder'
              ? {
                  parallelToolCalls: false,
                }
              : {}),
            ...((model === 'scira-gpt5' ||
            model === 'scira-gpt5-mini' ||
            model === 'scira-o3' ||
            model === 'scira-gpt5-nano' ||
            model === 'scira-gpt5-codex' ||
            model === 'scira-gpt5-medium' ||
            model === 'scira-o4-mini' ||
            model === 'scira-gpt-4.1' ||
            model === 'scira-gpt-4.1-mini' ||
            model === 'scira-gpt-4.1-nano' ||
            model === 'scira-gpt-5.1' ||
            model === 'scira-gpt-5.1-thinking' ||
            model === 'scira-gpt-5.1-codex' ||
            model === 'scira-gpt-5.1-codex-mini' ||
            model === 'scira-gpt-5.1-codex-max' ||
            model === 'scira-gpt-5.2' ||
            model === 'scira-gpt-5.4' ||
            model === 'scira-gpt-5.4-mini' ||
            model === 'scira-gpt-5.4-nano' ||
            model === 'scira-gpt-5.4-thinking' ||
            model === 'scira-gpt-5.4-thinking-xhigh' ||
            model === 'scira-gpt-5.2-thinking' ||
            model === 'scira-gpt-5.2-thinking-xhigh' ||
            model === 'scira-gpt-5.2-codex' ||
            model === 'scira-gpt-5.3-codex'
              ? {
                  reasoningEffort:
                    model === 'scira-gpt5-nano' || model === 'scira-gpt5' || model === 'scira-gpt5-mini'
                      ? 'minimal'
                      : model === 'scira-gpt-5.2-thinking-xhigh' || model === 'scira-gpt-5.4-thinking-xhigh'
                        ? 'xhigh'
                        : model === 'scira-gpt-5.1' ||
                            model === 'scira-gpt-5.2' ||
                            model === 'scira-gpt-5.4' ||
                            model === 'scira-gpt-5.4-mini' ||
                            model === 'scira-gpt-5.4-nano'
                          ? 'none'
                          : 'medium',
                  parallelToolCalls:
                    model === 'scira-gpt-5.2-thinking-xhigh' || model === 'scira-gpt-5.4-thinking-xhigh' ? true : false,
                  reasoningSummary: 'detailed',
                  promptCacheKey: 'scira-oai',
                  ...(model === 'scira-gpt-5.1' ||
                  model === 'scira-gpt-5.4' ||
                  model === 'scira-gpt-5.4-mini' ||
                  model === 'scira-gpt-5.4-nano' ||
                  model === 'scira-gpt-5.4-thinking' ||
                  model === 'scira-gpt-5.2' ||
                  model === 'scira-gpt-5.2-thinking' ||
                  model === 'scira-gpt-5.2-codex' ||
                  model === 'scira-gpt-5.3-codex' ||
                  model === 'scira-gpt-5.1-codex' ||
                  model === 'scira-gpt-5.1-codex-mini' ||
                  model === 'scira-gpt-5.1-codex-max' ||
                  model === 'scira-gpt5' ||
                  model === 'scira-gpt5-codex' ||
                  model === 'scira-gpt4.1'
                    ? {
                        promptCacheRetention: '24h',
                      }
                    : {}),
                  store: false,
                  ...(model === 'scira-gpt-5.4' ||
                  model === 'scira-gpt-5.4-mini' ||
                  model === 'scira-gpt-5.4-nano' ||
                  model === 'scira-gpt-5.4-thinking' ||
                  model === 'scira-gpt-5.4-thinking-xhigh'
                    ? {
                        serviceTier: 'priority',
                      }
                    : {}),
                  // only for reasoning models
                  ...(model === 'scira-gpt-5.1' ||
                  model === 'scira-gpt-5.1-codex' ||
                  model === 'scira-gpt-5.1-codex-mini' ||
                  model === 'scira-gpt5' ||
                  model === 'scira-gpt5-codex' ||
                  model === 'scira-gpt-5.1-thinking' ||
                  model === 'scira-gpt5-nano' ||
                  model === 'scira-gpt5-mini' ||
                  model === 'scira-gpt-5.4' ||
                  model === 'scira-gpt-5.4-mini' ||
                  model === 'scira-gpt-5.4-nano' ||
                  model === 'scira-gpt-5.4-thinking' ||
                  model === 'scira-gpt-5.4-thinking-xhigh' ||
                  model === 'scira-gpt-5.1-codex-max' ||
                  model === 'scira-gpt-5.2' ||
                  model === 'scira-gpt-5.2-thinking' ||
                  model === 'scira-gpt-5.2-codex' ||
                  model === 'scira-gpt-5.3-codex'
                    ? {
                        include: ['reasoning.encrypted_content'],
                      }
                    : {}),
                  textVerbosity:
                    model === 'scira-o3' ||
                    model === 'scira-gpt5-codex' ||
                    model === 'scira-gpt-5.1-codex' ||
                    model === 'scira-gpt-5.1-codex-mini' ||
                    model === 'scira-gpt-5.1-codex-max' ||
                    model === 'scira-gpt-5.2-codex' ||
                    model === 'scira-gpt-5.3-codex' ||
                    model === 'scira-o4-mini' ||
                    model === 'scira-gpt-4.1' ||
                    model === 'scira-gpt-4.1-mini' ||
                    model === 'scira-gpt-4.1-nano'
                      ? 'medium'
                      : 'high',
                }
              : {}) satisfies OpenAIResponsesProviderOptions),
          },
          deepseek: {
            parallelToolCalls: false,
          },
          groq: {
            ...(model === 'scira-gpt-oss-20' || model === 'scira-gpt-oss-120'
              ? {
                  reasoningEffort: 'high',
                  reasoningFormat: 'hidden',
                }
              : {}),
            ...(model === 'scira-qwen-32b'
              ? {
                  reasoningEffort: 'none',
                }
              : {}),
            parallelToolCalls: false,
            structuredOutputs: true,
            serviceTier: 'auto',
          } satisfies GroqProviderOptions,
          xai: shouldUseXaiMultiAgent
            ? {
                reasoningEffort: 'high',
                parallel_function_calling: true,
                parallel_tool_calls: true,
                parallelToolCalls: true,
                paralelFunctionCalling: true,
              }
            : {
                parallel_function_calling: false,
                parallel_tool_calls: false,
                parallelToolCalls: false,
                paralelFunctionCalling: false,
              },
          anannas: {
            parallel_function_calling: false,
            parallel_tool_calls: false,
          },
          cohere: {
            ...(model === 'scira-cmd-a-think'
              ? {
                  thinking: {
                    type: 'enabled',
                    tokenBudget: 1000,
                  },
                }
              : {}),
          } satisfies CohereChatModelOptions,
          zai: {
            ...(model === 'scira-glm-4.7' ||
            model === 'scira-glm-4.7-flash' ||
            model === 'scira-glm-5' ||
            model === 'scira-pony-alpha-2'
              ? {
                  thinking: {
                    type: 'disabled',
                    clear_thinking: true,
                  },
                }
              : {}),
          },
          anthropic: {
            ...(model === 'scira-anthropic-think' || model === 'scira-anthropic-opus-think'
              ? {
                  sendReasoning: true,
                  thinking: {
                    type: 'enabled',
                    budgetTokens: 4000,
                  },
                }
              : {}),
            ...(model === 'scira-anthropic-sonnet-4.6-think' || model === 'scira-anthropic-opus-4.6-think'
              ? {
                  sendReasoning: true,
                  thinking: {
                    type: 'adaptive' as const,
                  },
                  effort: 'medium' as const,
                }
              : {}),
            disableParallelToolUse: true,
          } satisfies AnthropicProviderOptions,
          google: {
            ...(model === 'scira-google-think' || model === 'scira-google-pro-think'
              ? {
                  thinkingConfig: {
                    thinkingBudget: 400,
                    includeThoughts: true,
                  },
                }
              : {}),
            ...(model === 'scira-gemini-3-flash-think' ||
            model === 'scira-gemini-3.1-pro' ||
            model === 'scira-gemini-3.1-flash-lite-think'
              ? {
                  thinkingConfig: {
                    thinkingLevel: 'medium',
                    includeThoughts: true,
                  },
                }
              : {}),
            threshold: 'OFF',
          } satisfies GoogleGenerativeAIProviderOptions,
          vertex: {
            ...(model === 'scira-gemini-3-flash-think' ||
            model === 'scira-gemini-3.1-pro' ||
            model === 'scira-gemini-3.1-flash-lite-think'
              ? {
                  thinkingConfig: {
                    thinkingLevel: 'medium',
                    includeThoughts: true,
                  },
                }
              : {}),
            threshold: 'OFF',
          } satisfies GoogleLanguageModelOptions,
          openrouter: {
            ...(model === 'scira-anthropic-think' || model === 'scira-anthropic-opus-think'
              ? {
                  reasoning: {
                    exclude: false,
                    max_tokens: 400,
                  },
                }
              : {}),
            // ...(model === "scira-pony-alpha" ? {
            //   reasoning: {
            //     exclude: true,
            //   },
            // } : {}),
          },
          bytedance: {
            reasoningEffort: 'minimal',
          },
          ark: {
            thinking: { type: 'disabled' },
            reasoning: { effort: 'minimal' },
          },
          alibaba: {
            ...(model === 'scira-qwen-3-max-preview-thinking'
              ? {
                  enable_thinking: true,
                }
              : {}),
            ...(model === 'scira-qwen-3.5-flash'
              ? {
                  enable_thinking: false,
                }
              : {}),
          },
          moonshotai: {
            ...(model === 'scira-kimi-k2.5'
              ? {
                  thinking: { type: 'disabled' },
                }
              : {}),
            ...(model === 'scira-kimi-k2.5-thinking'
              ? {
                  thinking: { type: 'enabled' },
                }
              : {}),
          },
          fireworks: {
            ...(model === 'scira-kimi-k2.5'
              ? {
                  thinking: { type: 'disabled' },
                }
              : {}),
            ...(model === 'scira-kimi-k2.5-thinking'
              ? {
                  thinking: { type: 'enabled' },
                }
              : {}),
          },
          novita: {
            ...(model === 'scira-deepseek-chat-think-exp'
              ? {
                  enable_thinking: true,
                }
              : {}),
            ...(model === 'scira-qwen-3.5'
              ? {
                  enable_thinking: false,
                }
              : {}),
          },
          mistral: {
            ...(model === 'scira-mistral-small-think'
              ? {
                  reasoning_effort: 'high',
                }
              : {}),
          },
          inception: {
            ...(model === 'scira-mercury-2'
              ? {
                  reasoning_effort: 'high',
                  reasoning_summary: true,
                  reasoning_summary_wait: true,
                }
              : {}),
          },
        },
        experimental_context: (() => {
          // Extract images and files from the last user message's attachments
          const lastUserMessage = [...hydratedMessages].reverse().find((m) => m.role === 'user');
          const attachments = (lastUserMessage?.parts as (TextPart | ImagePart | FilePart)[]) ?? [];
          const images = attachments
            .filter((att): att is FilePart => att.type === 'file' && (att as any).mediaType?.startsWith('image/'))
            .map((att) => ({
              url: (att as any).url,
              contentType: (att as any).mediaType,
              name: (att as any).name,
            }));
          // Extract document files (PDF, CSV, DOCX, XLSX)
          const files = attachments
            .filter((att): att is FilePart => {
              if (att.type !== 'file') return false;
              const mediaType = (att as any).mediaType || '';
              return (
                mediaType === 'application/pdf' ||
                mediaType === 'text/csv' ||
                mediaType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                mediaType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                mediaType === 'application/vnd.ms-excel'
              );
            })
            .map((att) => ({
              url: (att as any).url,
              contentType: (att as any).mediaType,
              name: (att as any).name,
            }));
          return { images, files };
        })(),
        experimental_download: async (requestedDownloads) => {
          type DownloadResult = { data: Uint8Array; mediaType: string | undefined } | null;

          // Download for models that can't fetch R2 URLs directly
          const requiresDownload =
            model.startsWith('scira-anthropic') || model.startsWith('scira-google') || model.startsWith('scira-gemini');

          if (!requiresDownload) {
            // Let other models handle URLs directly
            return requestedDownloads.map(() => null);
          }

          const downloadTasks = requestedDownloads.reduce(
            (acc, { url }, index) => {
              acc[`dl:${index}`] = async (): Promise<DownloadResult> => {
                console.log(`[experimental_download] Downloading for Anthropic: ${url.toString()}`);
                const response = await fetch(url.toString());
                if (!response.ok) {
                  console.error(`[experimental_download] Failed: ${url.toString()} - ${response.status}`);
                  throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
                }

                const data = new Uint8Array(await response.arrayBuffer());
                const mediaType = response.headers.get('content-type') || undefined;

                console.log(
                  `[experimental_download] Success: ${url.toString()} (${data.byteLength} bytes, ${mediaType})`,
                );
                return { data, mediaType };
              };
              return acc;
            },
            {} as Record<string, () => Promise<DownloadResult>>,
          );

          const results = await all(downloadTasks, getBetterAllOptions());

          // Convert back to ordered array
          return requestedDownloads.map((_, index) => results[`dl:${index}`]);
        },
        prepareStep: async ({ steps }) => {
          const latestStep = steps[steps.length - 1];
          const latestStepHasToolRoundTrip =
            Boolean(latestStep) && latestStep.toolCalls.length > 0 && latestStep.toolResults.length > 0;

          // MCP mode and xAI multi-agent mode: keep tools available across steps.
          if (group === 'mcp' || shouldUseXaiMultiAgent) {
            return shouldUseXaiMultiAgent
              ? {
                  toolChoice: 'auto' as const,
                  activeTools: ['xai_web_search', 'xai_x_search'],
                }
              : undefined;
          }

          // Other modes: disable tool calls after first completed tool round.
          const shouldDisableTools = steps.length > 0 && latestStepHasToolRoundTrip;

          // Only return object if tools need to be disabled
          if (shouldDisableTools && model !== 'scira-sarvam-105b') {
            return {
              toolChoice: 'none' as const,
              activeTools: [],
            };
          }

          return {
            toolChoice: 'auto' as const,
            activeTools: streamActiveTools,
          };
        },

        experimental_repairToolCall: async ({ toolCall, tools, inputSchema, error }) => {
          if (NoSuchToolError.isInstance(error)) {
            return null;
          }

          console.log('Fixing tool call================================');
          console.log('toolCall', toolCall);
          console.log('tools', tools);
          console.log('parameterSchema', inputSchema);
          console.log('error', error);

          const tool = tools[toolCall.toolName as keyof typeof tools];

          if (!tool) {
            return null;
          }

          const { output: repairedArgs } = await generateText({
            model: scira.languageModel('scira-default'),
            output: Output.object({ schema: tool.inputSchema }),
            prompt: [
              `The model tried to call the tool "${toolCall.toolName}"` + ` with the following arguments:`,
              JSON.stringify(toolCall.input),
              `The tool accepts the following schema:`,
              JSON.stringify(inputSchema(toolCall)),
              'Please fix the arguments.',
              'For the code interpreter tool do not use print statements.',
              `For the web search make multiple queries to get the best results but avoid using the same query multiple times.`,
              `Today's date is ${new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}`,
            ].join('\n'),
          });

          console.log('repairedArgs', repairedArgs);

          return { ...toolCall, args: JSON.stringify(repairedArgs) };
        },
        onChunk(event) {
          if (event.chunk.type === 'tool-call') {
            console.log('Called Tool: ', event.chunk.toolName);
          }
        },
        onStepFinish(event) {
          const processingTime = (Date.now() - streamStartTime) / 1000;
          setUsageMetadataFromUsage(event.usage, processingTime);
        },
        onAbort(event) {
          const processingTime = (Date.now() - streamStartTime) / 1000;
          setUsageMetadataFromSteps(event.steps, processingTime);
          closeMcpToolsSafe().catch(() => null);
        },
        onFinish: async (event) => {
          // console.log('Finish event: ', event);
          const processingTime = (Date.now() - streamStartTime) / 1000;
          setUsageMetadataFromUsage(event.totalUsage, processingTime);
          console.log(`✅ Request completed: ${processingTime.toFixed(2)}s (${event.finishReason})`);

          try {
            if (lightweightUser?.userId && event.finishReason === 'stop') {
              // Track usage synchronously - this is critical for billing and rate limiting
              try {
                const shouldTrackMessageUsage = !shouldBypassRateLimits(model, lightweightUser);
                const shouldTrackExtremeSearchUsage =
                  group === 'extreme' &&
                  event.steps?.some((step) =>
                    step.toolCalls?.some((toolCall) => toolCall && toolCall.toolName === 'extreme_search'),
                  );
                const shouldTrackAnthropicUsage = getModelProvider(model) === 'anthropic' && lightweightUser.isMaxUser;
                const shouldTrackGoogleUsage =
                  getModelProvider(model) === 'google' && lightweightUser.isMaxUser;

                if (
                  shouldTrackMessageUsage ||
                  shouldTrackExtremeSearchUsage ||
                  shouldTrackAnthropicUsage ||
                  shouldTrackGoogleUsage
                ) {
                  await all(
                    {
                      async messageUsage() {
                        if (!shouldTrackMessageUsage) return false;
                        await incrementMessageUsage({ userId: lightweightUser.userId });
                        return true;
                      },
                      async extremeSearchUsage() {
                        if (!shouldTrackExtremeSearchUsage) return false;
                        await incrementExtremeSearchUsage({ userId: lightweightUser.userId });
                        return true;
                      },
                      async anthropicUsage() {
                        if (!shouldTrackAnthropicUsage) return false;
                        await incrementAnthropicUsage({ userId: lightweightUser.userId, model });
                        return true;
                      },
                      async googleUsage() {
                        if (!shouldTrackGoogleUsage) return false;
                        await incrementGoogleUsage({ userId: lightweightUser.userId, model });
                        return true;
                      },
                    },
                    getBetterAllOptions(),
                  );
                }
              } catch (error) {
                console.error('Failed to track usage:', error);
              }
            }
          } finally {
            await closeMcpToolsSafe();
          }
        },
        onError(event) {
          const processingTime = (Date.now() - requestStartTime) / 1000;
          console.error(`❌ Request failed: ${processingTime.toFixed(2)}s`, event.error);
          closeMcpToolsSafe().catch(() => null);
        },
      });

      result.consumeStream();

      const assistantMessageCreatedAt = new Date().toISOString();

      const uiMessageStream = result.toUIMessageStream({
        sendReasoning: true,
        sendSources: true,
        messageMetadata: ({ part }) => {
          const baseMetadata = {
            model: model as string,
            createdAt: assistantMessageCreatedAt,
            multiAgentMode: shouldUseXaiMultiAgent,
          };

          if (part.type === 'finish') {
            console.log('Finish part: ', part);
            const processingTime = (Date.now() - streamStartTime) / 1000;
            return {
              ...baseMetadata,
              completionTime: processingTime,
              totalTokens: part.totalUsage?.totalTokens ?? null,
              inputTokens: part.totalUsage?.inputTokens ?? null,
              outputTokens: part.totalUsage?.outputTokens ?? null,
            };
          }

          return baseMetadata;
        },
      });

      dataStream.merge(
        (group === 'canvas' ? pipeJsonRender(uiMessageStream) : uiMessageStream) as AsyncIterableStream<
          InferUIMessageChunk<ChatMessage>
        >,
      );
    },
    onError(error) {
      console.log('Error: ', error);
      if (error instanceof Error && error.message.includes('Rate Limit')) {
        return 'Oops, you have reached the rate limit! Please try again later.';
      }
      return 'Oops, an error occurred!';
    },
    // onStepFinish(event) {
    //   console.log('Step finish event: ', event);
    // },
    onFinish: async ({ messages: streamedMessages, isAborted }: { messages: ChatMessage[]; isAborted: boolean }) => {
      if (!lightweightUser || isTemporaryChat) {
        return;
      }

      const newMessages = streamedMessages.filter((message: ChatMessage) => !initialMessageIds.has(message.id));

      if (newMessages.length === 0) {
        console.log('No new messages to persist for chat', id);
        return;
      }

      // Persist assistant output only for the latest stream on this chat.
      // If a newer request started while this one was running, this prevents
      // stale onFinish writes from older streams from being inserted out of order.
      const latestStreamId = await getLatestStreamIdByChatId({ chatId: id });
      if (latestStreamId !== streamId) {
        console.log('Skipping stale stream message persistence', {
          chatId: id,
          streamId,
          latestStreamId,
        });
        return;
      }

      // Persist only if this response still belongs to the latest user turn.
      // This blocks older in-flight generations from writing a different assistant
      // response after the user has already sent/edited/regenerated a newer turn.
      if (requestLastUserMessageId) {
        const latestUserMessageId = await getLatestUserMessageIdByChatId({ chatId: id });
        if (latestUserMessageId !== requestLastUserMessageId) {
          console.log('Skipping stale turn message persistence', {
            chatId: id,
            streamId,
            requestLastUserMessageId,
            latestUserMessageId,
          });
          return;
        }
      }

      const messagesToPersist = isAborted
        ? newMessages.filter((message: ChatMessage) => {
            if (message.role !== 'assistant') return false;
            if (!Array.isArray(message.parts) || message.parts.length === 0) return false;

            return message.parts.some((part: any) => {
              if (part.type === 'text') return typeof part.text === 'string' && part.text.trim().length > 0;
              if (part.type === 'reasoning') return typeof part.text === 'string' && part.text.trim().length > 0;
              if (part.type === 'tool-invocation') return true;
              if (part.type === 'file') return true;
              if (part.type === 'source-url') return true;
              return false;
            });
          })
        : newMessages;

      if (isAborted && messagesToPersist.length === 0) {
        console.log('Stream aborted with no persistable assistant output', { chatId: id, streamId });
        return;
      }

      await saveMessages({
        messages: messagesToPersist.map((message: ChatMessage) => {
          const attachments = (message as any).experimental_attachments ?? [];
          const createdAt =
            typeof message.metadata?.createdAt === 'string' ? new Date(message.metadata.createdAt) : new Date();

          return {
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt,
            attachments,
            chatId: id,
            model: message.metadata?.model ?? model,
            completionTime: message.metadata?.completionTime ?? finalUsageMetadata.completionTime,
            inputTokens: message.metadata?.inputTokens ?? finalUsageMetadata.inputTokens,
            outputTokens: message.metadata?.outputTokens ?? finalUsageMetadata.outputTokens,
            totalTokens: message.metadata?.totalTokens ?? finalUsageMetadata.totalTokens,
          };
        }),
      });
    },
  });
  const { getResumableStreamClients } = await import('@/lib/redis');
  const clients = getResumableStreamClients();

  if (clients) {
    const { createResumableUIMessageStream } = await import('ai-resumable-stream');
    const context = await createResumableUIMessageStream({
      streamId,
      publisher: clients.publisher,
      subscriber: clients.subscriber,
      abortController,
      waitUntil: after,
    });
    const resumableStream = await context.startStream(stream as ReadableStream<any>);
    return new Response(resumableStream.pipeThrough(new JsonToSseTransformStream()));
  }

  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}
