// /app/api/chat/route.ts
import {
  generateTitleFromUserMessage,
  getGroupConfig,
  getUserMessageCount,
  getExtremeSearchUsageCount,
  getCurrentUser,
  getLightweightUser,
} from '@/app/actions';
import {
  convertToModelMessages,
  streamText,
  pruneMessages,
  NoSuchToolError,
  createUIMessageStream,
  generateObject,
  stepCountIs,
  JsonToSseTransformStream,
} from 'ai';
import { createMemoryTools } from '@/lib/tools/supermemory';
import {
  scira,
  requiresAuthentication,
  requiresProSubscription,
  shouldBypassRateLimits,
  getModelParameters,
  getMaxOutputTokens,
} from '@/ai/providers';
import {
  createStreamId,
  getChatByIdForValidation,
  saveChat,
  saveMessages,
  incrementExtremeSearchUsage,
  incrementMessageUsage,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { createResumableStreamContext, type ResumableStreamContext } from 'resumable-stream';
import { after } from 'next/server';
import { CustomInstructions } from '@/lib/db/schema';
import { v7 as uuidv7 } from 'uuid';
import { geolocation } from '@vercel/functions';

import {
  stockChartTool,
  currencyConverterTool,
  xSearchTool,
  textTranslateTool,
  webSearchTool,
  movieTvSearchTool,
  trendingMoviesTool,
  trendingTvTool,
  academicSearchTool,
  youtubeSearchTool,
  retrieveTool,
  weatherTool,
  codeInterpreterTool,
  findPlaceOnMapTool,
  nearbyPlacesSearchTool,
  flightTrackerTool,
  coinDataTool,
  coinDataByContractTool,
  coinOhlcTool,
  datetimeTool,
  greetingTool,
  // mcpSearchTool,
  redditSearchTool,
  extremeSearchTool,
  createConnectorsSearchTool,
  codeContextTool,
} from '@/lib/tools';
import { GroqProviderOptions } from '@ai-sdk/groq';
import { markdownJoinerTransform } from '@/lib/parser';
import { ChatMessage } from '@/lib/types';
import { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import { AnthropicProviderOptions } from '@ai-sdk/anthropic';
import { getCachedCustomInstructionsByUserId, getCachedUserPreferencesByUserId } from '@/lib/user-data-server';
import { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { unauthenticatedRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { CohereChatModelOptions } from '@ai-sdk/cohere';
import { XaiProviderOptions } from '@ai-sdk/xai';

let globalStreamContext: ResumableStreamContext | null = null;

// Shared config promise to avoid duplicate calls
let configPromise: Promise<any>;

interface CriticalChecksResult {
  canProceed: boolean;
  error?: any;
  isProUser: boolean;
  messageCount?: number;
  extremeSearchUsage?: number;
  subscriptionData?: any;
  shouldBypassLimits?: boolean;
}

interface ChatInitializationParams {
  chatQueryPromise: Promise<any>;
  lightweightUser: { userId: string; email: string; isProUser: boolean } | null;
  isProUser: boolean;
  fullUserPromise: Promise<any>;
  id: string;
  streamId: string;
  selectedVisibilityType: any;
  messages: any[];
  model: string;
}

function initializeChatAndChecks({
  chatQueryPromise,
  lightweightUser,
  isProUser,
  fullUserPromise,
  id,
  streamId,
  selectedVisibilityType,
  messages,
  model,
}: ChatInitializationParams): {
  criticalChecksPromise: Promise<CriticalChecksResult>;
  chatInitializationPromise: Promise<{ isNewChat: boolean; chatTitle?: string }>;
} {
  // Unauthenticated users don't need chat validation
  if (!lightweightUser) {
    return {
      criticalChecksPromise: Promise.resolve({
        canProceed: true,
        isProUser: false,
        messageCount: 0,
        extremeSearchUsage: 0,
        subscriptionData: null,
        shouldBypassLimits: false,
      }),
      chatInitializationPromise: Promise.resolve({ isNewChat: false }),
    };
  }

  // Start title generation early (only needed for new chats)
  const titleGenerationPromise = generateTitleFromUserMessage({
    message: messages[messages.length - 1],
  }).catch(() => 'New Chat');

  // Validate ownership once and get chat data
  const validatedChatPromise = chatQueryPromise.then((existingChat) => {
    if (existingChat && existingChat.userId !== lightweightUser.userId) {
      throw new ChatSDKError('forbidden:chat', 'This chat belongs to another user');
    }
    return existingChat;
  });

  // Build critical checks promise first (must complete before chat creation)
  let criticalChecksPromise: Promise<CriticalChecksResult>;

  if (isProUser) {
    // Pro users: only validate ownership, skip usage checks
    criticalChecksPromise = Promise.all([fullUserPromise, validatedChatPromise]).then(([user]) => {
      const hasPolarSubscription = !!user?.polarSubscription;
      const hasDodoSubscription = !!user?.dodoSubscription?.hasSubscriptions;

      return {
        canProceed: true,
        isProUser: true,
        messageCount: 0,
        extremeSearchUsage: 0,
        subscriptionData:
          hasPolarSubscription || hasDodoSubscription
            ? {
              hasSubscription: true,
              subscription: user?.polarSubscription ? { ...user.polarSubscription, organizationId: null } : null,
              dodoSubscription: user?.dodoSubscription || null,
            }
            : { hasSubscription: false },
        shouldBypassLimits: true,
      };
    });
  } else {
    // Non-Pro users: validate ownership and check usage limits
    criticalChecksPromise = Promise.all([fullUserPromise, validatedChatPromise])
      .then(async ([user]) => {
        if (!user) {
          throw new ChatSDKError('unauthorized:auth', 'User authentication failed');
        }

        const [messageCountResult, extremeSearchUsage] = await Promise.all([
          getUserMessageCount(user),
          getExtremeSearchUsageCount(user),
        ]);

        if (messageCountResult.error) {
          throw new ChatSDKError('bad_request:api', 'Failed to verify usage limits');
        }

        if (extremeSearchUsage.error) {
          throw new ChatSDKError('bad_request:api', 'Failed to verify extreme search usage limits');
        }

        const shouldBypassLimits = shouldBypassRateLimits(model, user);
        if (!shouldBypassLimits && messageCountResult.count !== undefined && messageCountResult.count >= 100) {
          throw new ChatSDKError('rate_limit:chat', 'Daily search limit reached');
        }

        const hasPolarSubscription = !!user.polarSubscription;
        const hasDodoSubscription = !!user.dodoSubscription?.hasSubscriptions;

        return {
          canProceed: true,
          isProUser: false,
          messageCount: messageCountResult.count,
          extremeSearchUsage: extremeSearchUsage.count,
          subscriptionData:
            hasPolarSubscription || hasDodoSubscription
              ? {
                hasSubscription: true,
                subscription: user.polarSubscription ? { ...user.polarSubscription, organizationId: null } : null,
                dodoSubscription: user.dodoSubscription || null,
              }
              : { hasSubscription: false },
          shouldBypassLimits,
        };
      })
      .catch((error) => {
        if (error instanceof ChatSDKError) throw error;
        throw new ChatSDKError('bad_request:api', 'Failed to verify user access');
      });
  }

  // Initialize chat (create if needed, create stream ID)
  // For existing chats, create stream ID immediately (doesn't need to wait for anything)
  // For new chats, wait for critical checks to complete first, then create chat (FK constraint)
  const chatInitializationPromise = Promise.all([validatedChatPromise, criticalChecksPromise])
    .then(async ([existingChat, criticalResult]) => {
      // Verify critical checks passed before creating new chat
      if (!criticalResult.canProceed) {
        throw criticalResult.error || new ChatSDKError('bad_request:api', 'Failed to verify user access');
      }

      if (!existingChat) {
        // New chat: create it only after pro check passes (needed before saving messages due to FK constraint)
        const chatTitle = await titleGenerationPromise;
        await saveChat({
          id,
          userId: lightweightUser.userId,
          title: chatTitle,
          visibility: selectedVisibilityType,
        });
        // Now create stream ID (chat exists, so this is safe)
        await createStreamId({ streamId, chatId: id });
        return { isNewChat: true, chatTitle };
      } else {
        // Existing chat: create stream ID immediately (needed for resumable streams)
        await createStreamId({ streamId, chatId: id });
        return { isNewChat: false };
      }
    })
    .catch((error) => {
      if (error instanceof ChatSDKError) throw error;
      console.error('Chat initialization failed:', error);
      throw new ChatSDKError('bad_request:database', 'Failed to initialize chat');
    });

  return { criticalChecksPromise, chatInitializationPromise };
}

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(' > Resumable streams are disabled due to missing REDIS_URL');
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(req: Request) {
  const requestStartTime = Date.now();
  const preStreamTimings: { label: string; durationMs: number }[] = [];

  function recordTiming(label: string, startTime: number) {
    preStreamTimings.push({
      label,
      durationMs: Date.now() - startTime,
    });
  }

  let opStart = Date.now();
  const {
    messages,
    model,
    group,
    timezone,
    id,
    selectedVisibilityType,
    isCustomInstructionsEnabled,
    searchProvider,
    extremeSearchProvider,
    selectedConnectors,
  } = await req.json();
  recordTiming('parse_request_body', opStart);

  opStart = Date.now();
  const { latitude, longitude } = geolocation(req);
  recordTiming('geolocation_lookup', opStart);

  const streamId = 'stream-' + uuidv7();

  console.log('🔍 Search API:', { model: model.trim(), group, latitude, longitude });

  // Start all independent operations in parallel immediately
  opStart = Date.now();
  const lightweightUserPromise = getLightweightUser();
  // Use lightweight validation query - only fetches id and userId
  const chatQueryPromise = getChatByIdForValidation({ id }); // Start immediately - doesn't depend on auth
  const rateLimitPromise = (async () => {
    const identifier = getClientIdentifier(req);
    return unauthenticatedRateLimit.limit(identifier);
  })();
  recordTiming('start_parallel_operations', opStart);

  // Wait for lightweight user first (needed for early exit checks)
  opStart = Date.now();
  const lightweightUser = await lightweightUserPromise;
  recordTiming('get_lightweight_user', opStart);

  // Start full user fetch immediately (doesn't block early exits)
  const isProUser = lightweightUser?.isProUser ?? false;
  opStart = Date.now();
  const fullUserPromise = lightweightUser ? getCurrentUser() : Promise.resolve(null);
  recordTiming('create_full_user_promise', opStart);

  // Rate limit check for unauthenticated users (already started in parallel)
  if (!lightweightUser) {
    opStart = Date.now();
    const { success, limit, reset } = await rateLimitPromise;
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
  } else {
    // Fast auth checks using lightweight user (no additional DB calls)
    if (requiresProSubscription(model) && !lightweightUser.isProUser) {
      return new ChatSDKError('upgrade_required:model', `${model} requires a Pro subscription`).toResponse();
    }
  }

  // Start config and custom instructions in parallel
  // Use lightweightUser.userId directly instead of waiting for fullUserPromise
  opStart = Date.now();
  configPromise = getGroupConfig(group, lightweightUser, fullUserPromise);
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
    fullUserPromise,
    id,
    streamId,
    selectedVisibilityType,
    messages,
    model,
  });
  recordTiming('initialize_chat_and_checks', opStart);

  let customInstructions: CustomInstructions | null = null;

  // Wait for critical checks, config, and chat initialization in parallel
  // Chat initialization is critical: for new chats it must complete before streaming (FK constraint)
  const [
    criticalResult,
    { tools: activeTools, instructions },
    customInstructionsResult,
    user,
    chatInitResult,
    userPreferencesResult,
  ] = await Promise.all([
    criticalChecksPromise,
    configPromise,
    customInstructionsPromise,
    fullUserPromise,
    chatInitializationPromise, // Must complete before streaming (especially for new chats)
    userPreferencesPromise,
  ]);
  recordTiming('await_parallel_setup', opStart);

  if (!criticalResult.canProceed) {
    throw criticalResult.error;
  }

  customInstructions = customInstructionsResult;

  // Save user message (chat is guaranteed to exist now) - await synchronously (no background)
  if (user) {
    opStart = Date.now();
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: messages[messages.length - 1].id,
          role: 'user',
          parts: messages[messages.length - 1].parts,
          attachments: messages[messages.length - 1].experimental_attachments ?? [],
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

  const setupTimeMs = Date.now() - requestStartTime;
  console.log('⏱ Pre-stream operation timings (ms):', preStreamTimings);
  console.log(`🚀 Time to streamText: ${(setupTimeMs / 1000).toFixed(2)}s`);

  const streamStartTime = Date.now();
  const initialMessageIds = new Set(messages.map((message: any) => message.id));

  const shouldPrune = messages.length > 10;

  const prunedMessages = shouldPrune
    ? await (async () => {
        console.log(`🔧 Pruning messages: ${messages.length} messages`);
        const pruned = pruneMessages({
          reasoning: 'none',
          messages: await convertToModelMessages(messages),
          toolCalls: 'before-last-3-messages',
          emptyMessages: 'remove',
        });
        console.log(`✂️ Pruned to ${pruned.length} messages`);
        return pruned;
      })()
    : await convertToModelMessages(messages);

  const stream = createUIMessageStream<ChatMessage>({
    execute: async ({ writer: dataStream }) => {
      // Stream chat title for new chats so client can update immediately
      if (chatInitResult.isNewChat && chatInitResult.chatTitle) {
        dataStream.write({
          type: 'data-chat_title',
          data: { title: chatInitResult.chatTitle },
          transient: true,
        });
      }

      const result = streamText({
        model: scira.languageModel(model),
        messages: prunedMessages,
        ...getModelParameters(model),
        stopWhen: stepCountIs(5),
        ...(model === "scira-default" || model === "scira-grok4.1-fast-thinking" || model === "scira-glm-4.6" || model === "scira-glm-4.6v-flash" || model === "scira-glm-4.6v" ? {
          maxOutputTokens: getMaxOutputTokens(model),
        } : {}),
        maxRetries: 10,
        activeTools:
          model === 'scira-qwen-coder-plus'
            ? [...activeTools].filter((tool) => tool !== 'code_interpreter')
            : [...activeTools],
        experimental_transform: markdownJoinerTransform(),
        system:
          instructions +
          (customInstructions && (isCustomInstructionsEnabled ?? true)
            ? `\n\nThe user's custom instructions are as follows and YOU MUST FOLLOW THEM AT ALL COSTS: ${customInstructions?.content}`
            : '\n') +
          (latitude && longitude && userPreferencesResult?.preferences?.['scira-location-metadata-enabled'] === true
            ? `\n\nThe user's location is ${latitude}, ${longitude}.`
            : ''),
        toolChoice: 'auto',
        ...(model === 'scira-anthropic' || model === 'scira-anthropic-think'
          ? {
            headers: {
              'anthropic-beta': 'context-1m-2025-08-07',
            },
          } : {}),
        providerOptions: {
          gateway: {
            only: ['openai', 'google', 'zai', 'arcee-ai', 'deepseek', 'alibaba', 'baseten', 'minimax', 'fireworks', 'bedrock', 'vercel'],
            ...(model === 'scira-kimi-k2-v2-thinking' || model === 'scira-kimi-k2-v2'
              ? {
                order: ['baseten', 'fireworks'],
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
              model === 'scira-gpt-5.2-thinking'
              ? {
                reasoningEffort:
                  model === 'scira-gpt5-nano' || model === 'scira-gpt5' || model === 'scira-gpt5-mini'
                    ? 'minimal'
                    : model === 'scira-gpt-5.1' || model === 'scira-gpt-5.2'
                      ? 'none'
                      : 'medium',
                parallelToolCalls: false,
                reasoningSummary: 'detailed',
                promptCacheKey: 'scira-oai',
                ...(model === 'scira-gpt-5.1' ||
                  model === 'scira-gpt-5.2' ||
                  model === 'scira-gpt-5.2-thinking' ||
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
                // only for reasoning models
                ...(model === 'scira-gpt-5.1' ||
                  model === 'scira-gpt-5.1-codex' ||
                  model === 'scira-gpt-5.1-codex-mini' ||
                  model === 'scira-gpt5' ||
                  model === 'scira-gpt5-codex' ||
                  model === 'scira-gpt-5.1-thinking' ||
                  model === 'scira-gpt5-nano' ||
                  model === 'scira-gpt5-mini' ||
                  model === 'scira-gpt-5.1-codex-max' ||
                  model === 'scira-gpt-5.2' ||
                  model === 'scira-gpt-5.2-thinking'
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
          xai: {
            parallel_function_calling: false,
          } satisfies XaiProviderOptions,
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
            ...(model === 'scira-gemini-3-pro'
              ? {
                thinkingConfig: {
                  thinkingLevel: 'low',
                  includeThoughts: true,
                },
              }
              : {}),
            ...(model === 'scira-gemini-3-flash-think'
              ? {
                thinkingConfig: {
                  thinkingLevel: 'medium',
                  includeThoughts: true,
                },
              }
              : {}),
            threshold: 'OFF',
          } satisfies GoogleGenerativeAIProviderOptions,
          openrouter: {
            ...(model === 'scira-anthropic-think' || model === 'scira-anthropic-opus-think'
              ? {
                reasoning: {
                  exclude: false,
                  max_tokens: 400,
                },
              }
              : {}),
          },
        },
        prepareStep: async ({ steps }) => {
          // Check if we should disable tool calls (after first tool execution)
          const shouldDisableTools =
            steps.length > 0 &&
            steps[steps.length - 1].toolCalls.length > 0 &&
            steps[steps.length - 1].toolResults.length > 0;

          // Only return object if tools need to be disabled
          if (shouldDisableTools) {
            return {
              toolChoice: 'none' as const,
              activeTools: [],
            };
          }

          return undefined;
        },
        tools: (() => {
          const baseTools = {
            stock_chart: stockChartTool,
            currency_converter: currencyConverterTool,
            coin_data: coinDataTool,
            coin_data_by_contract: coinDataByContractTool,
            coin_ohlc: coinOhlcTool,

            x_search: xSearchTool(dataStream),
            web_search: webSearchTool(dataStream, searchProvider),
            academic_search: academicSearchTool(dataStream),
            youtube_search: youtubeSearchTool,
            reddit_search: redditSearchTool(dataStream),
            retrieve: retrieveTool,

            movie_or_tv_search: movieTvSearchTool,
            trending_movies: trendingMoviesTool,
            trending_tv: trendingTvTool,

            find_place_on_map: findPlaceOnMapTool,
            nearby_places_search: nearbyPlacesSearchTool,
            get_weather_data: weatherTool,

            text_translate: textTranslateTool,
            ...(model !== 'scira-qwen-coder-plus' ? { code_interpreter: codeInterpreterTool } : {}),
            track_flight: flightTrackerTool,
            datetime: datetimeTool,
            extreme_search: extremeSearchTool(dataStream, extremeSearchProvider || 'exa'),
            greeting: greetingTool(timezone),
            code_context: codeContextTool,
          };

          if (!user) {
            return baseTools;
          }

          const memoryTools = createMemoryTools(user.id);
          return {
            ...baseTools,
            search_memories: memoryTools.searchMemories as any,
            add_memory: memoryTools.addMemory as any,
            connectors_search: createConnectorsSearchTool(user.id, selectedConnectors),
          } as any;
        })(),
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

          const { object: repairedArgs } = await generateObject({
            model: scira.languageModel('scira-default'),
            schema: tool.inputSchema,
            prompt: [
              `The model tried to call the tool "${toolCall.toolName}"` + ` with the following arguments:`,
              JSON.stringify(toolCall.input),
              `The tool accepts the following schema:`,
              JSON.stringify(inputSchema(toolCall)),
              'Please fix the arguments.',
              'For the code interpreter tool do not use print statements.',
              `For the web search make multiple queries to get the best results but avoid using the same query multiple times and do not use te include and exclude parameters.`,
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
          console.log('Step Request:', event.request);
          if (event.warnings) {
            console.log('Warnings: ', event.warnings);
          }
        },
        onFinish: async (event) => {
          const processingTime = (Date.now() - requestStartTime) / 1000;
          console.log(`✅ Request completed: ${processingTime.toFixed(2)}s (${event.finishReason})`);

          if (user?.id && event.finishReason === 'stop') {
            // Track usage in background
            // Track usage synchronously - this is critical for billing and rate limiting
            try {
              if (!shouldBypassRateLimits(model, user)) {
                await incrementMessageUsage({ userId: user.id });
              }

              // Track extreme search usage if used
              if (group === 'extreme') {
                const extremeSearchUsed = event.steps?.some((step) =>
                  step.toolCalls?.some((toolCall) => toolCall && toolCall.toolName === 'extreme_search'),
                );
                if (extremeSearchUsed) {
                  await incrementExtremeSearchUsage({ userId: user.id });
                }
              }
            } catch (error) {
              console.error('Failed to track usage:', error);
            }
          }
        },
        onError(event) {
          const processingTime = (Date.now() - requestStartTime) / 1000;
          console.error(`❌ Request failed: ${processingTime.toFixed(2)}s`, event.error);
        },
      });

      result.consumeStream();

      dataStream.merge(
        result.toUIMessageStream({
          sendReasoning: true,
          messageMetadata: ({ part }) => {
            if (part.type === 'finish') {
              console.log('Finish part: ', part);
              const processingTime = (Date.now() - streamStartTime) / 1000;
              return {
                model: model as string,
                completionTime: processingTime,
                createdAt: new Date().toISOString(),
                totalTokens: part.totalUsage?.totalTokens ?? null,
                inputTokens: part.totalUsage?.inputTokens ?? null,
                outputTokens: part.totalUsage?.outputTokens ?? null,
              };
            }
          },
        }),
      );
    },
    onError(error) {
      console.log('Error: ', error);
      if (error instanceof Error && error.message.includes('Rate Limit')) {
        return 'Oops, you have reached the rate limit! Please try again later.';
      }
      return 'Oops, an error occurred!';
    },
    onFinish: async ({ messages: streamedMessages }) => {
      if (!lightweightUser) {
        return;
      }

      const newMessages = streamedMessages.filter((message) => !initialMessageIds.has(message.id));

      if (newMessages.length === 0) {
        console.log('No new messages to persist for chat', id);
        return;
      }

      await saveMessages({
        messages: newMessages.map((message) => {
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
            model: model,
            completionTime: message.metadata?.completionTime ?? 0,
            inputTokens: message.metadata?.inputTokens ?? 0,
            outputTokens: message.metadata?.outputTokens ?? 0,
            totalTokens: message.metadata?.totalTokens ?? 0,
          };
        }),
      });
    },
  });
  const streamContext = getStreamContext();

  if (streamContext) {
    return new Response(
      await streamContext.resumableStream(streamId, () => stream.pipeThrough(new JsonToSseTransformStream())),
    );
  }
  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}
