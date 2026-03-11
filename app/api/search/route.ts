// /app/api/search/route.ts
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
  createUIMessageStreamResponse,
  generateText as generateTextAI,
  stepCountIs,
} from 'ai';
import { jsonrepair } from 'jsonrepair';
import { createMemoryTools } from '@/lib/tools/supermemory';
import { scx } from '@/ai/providers';
import {
  requiresAuthentication,
  requiresProSubscription,
  shouldBypassRateLimits,
  getModelParameters,
  getMaxOutputTokens,
  supportsFunctionCalling,
  hasReasoningSupport,
} from '@/ai/models';
import {
  createStreamId,
  getChatByIdForValidation,
  saveChat,
  saveMessages,
  incrementExtremeSearchUsage,
  updateChatTitleById,
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
  stockChartSimpleTool,
  stockPriceTool,
  currencyConverterTool,
  xSearchTool,
  textTranslateTool,
  webSearchTool,
  movieTvSearchTool,
  trendingMoviesTool,
  trendingTvTool,
  academicSearchTool,
  // youtubeSearchTool, // commented out
  retrieveTool,
  weatherTool,
  codeInterpreterTool,
  findPlaceOnMapTool,
  nearbyPlacesSearchTool,
  flightTrackerTool,
  flightLiveTrackerTool,
  coinDataTool,
  coinDataByContractTool,
  coinOhlcTool,
  datetimeTool,
  greetingTool,
  redditSearchTool,
  extremeSearchTool,
  createConnectorsSearchTool,
  codeContextTool,
  mermaidDiagramTool,
  troveSearchTool,
  travelAdvisorTool,
  ragSearchTool,
  memoryManagerTool,
} from '@/lib/tools';
import { generateDocumentTool } from '@/lib/tools/generate-document';
import { ChatMessage } from '@/lib/types';
import { getCachedCustomInstructionsByUserId, getCachedUserPreferencesByUserId } from '@/lib/user-data-server';
import { unauthenticatedRateLimit, getClientIdentifier } from '@/lib/rate-limit';

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
  chatInitializationPromise: Promise<{ isNewChat: boolean; chatTitle?: string; titlePromise?: Promise<string> }>;
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
        // New chat: create with placeholder immediately — don't block on title generation.
        // The real title resolves asynchronously and is sent via the stream once ready.
        await saveChat({
          id,
          userId: lightweightUser.userId,
          title: 'New Chat',
          visibility: selectedVisibilityType,
        });
        await createStreamId({ streamId, chatId: id });
        return { isNewChat: true, titlePromise: titleGenerationPromise };
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
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_request', message: 'Request body is missing or malformed.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
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
  } = body as {
    messages: any[];
    model: string;
    group: string;
    timezone?: string;
    id: string;
    selectedVisibilityType?: string;
    isCustomInstructionsEnabled?: boolean;
    searchProvider?: string;
    extremeSearchProvider?: string;
    selectedConnectors?: string[];
  };
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
    if (!unauthenticatedRateLimit) return { success: true };
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

  // In auto mode, tools are required — fall back to deepseek-v3 if the selected model
  // doesn't support function calling (e.g. llama-3.3, magpie)
  const effectiveModel = group === 'auto' && !supportsFunctionCalling(model) ? 'deepseek-v3' : model;

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

  // Computed once and shared between execute and onFinish closures
  const supportsReasoning = hasReasoningSupport(effectiveModel);

  const stream = createUIMessageStream<ChatMessage>({
    execute: async ({ writer: dataStream }) => {
      // Stream chat title for new chats — title is generated asynchronously so the
      // stream can start immediately without waiting for the title AI call to finish.
      if (chatInitResult.isNewChat && chatInitResult.titlePromise) {
        chatInitResult.titlePromise.then(async (title) => {
          dataStream.write({
            type: 'data-chat_title',
            data: { title },
            transient: true,
          });
          // Persist the real title now that we have it
          await updateChatTitleById({ chatId: id, title }).catch(() => {});
        }).catch(() => {});
      }

      const modelSupportsFunctionCalling = supportsFunctionCalling(effectiveModel);

      const result = streamText({
        model: scx.languageModel(effectiveModel),
        messages: prunedMessages,
        ...getModelParameters(effectiveModel),
        maxOutputTokens: getMaxOutputTokens(effectiveModel),
        stopWhen: stepCountIs(20),
        maxRetries: 10,
        activeTools: modelSupportsFunctionCalling ? [...activeTools] : [],
        toolChoice: modelSupportsFunctionCalling ? 'auto' : 'none',
        // experimental_transform: markdownJoinerTransform(), // disabled — flush() emits incomplete chunks that break toUIMessageStream
        system:
          instructions +
          `\n\n## CONVERSATION CONTEXT\nYou have access to the full conversation history. Always read all prior messages before responding. When a user asks a follow-up question or refers to something discussed earlier (e.g. "it", "that", "what you said", "as mentioned"), use the conversation history to understand what they mean — do NOT search for something new if the information was already covered. Only call a tool again if genuinely new or updated information is needed.` +
          `\n\nIMPORTANT: Provide your final answer directly without showing your reasoning steps or thought process. Do not use numbered steps, "Step 1:", "Step 2:", or similar formatting. Just give the answer.` +
          `\n\nTOOL USAGE RULES:\n- ALWAYS use the dedicated tool for: translation (text_translate), currency conversion (currency_converter), stock prices (stock_price), weather (get_weather_data), maps/places (find_place_on_map, nearby_places_search), movies/TV (movie_or_tv_search, trending_movies, trending_tv), current date/time (datetime). These tools exist specifically for these requests — never use web_search as a substitute.\n- Use web_search or extreme_search only for: news, current events, research questions, or factual queries not covered by a dedicated tool.\n- Do NOT use any tool for: pure knowledge questions, math, code explanations, or anything fully answerable from training data.\n- After receiving tool results, IMMEDIATELY provide your answer — do NOT make additional tool calls.\n\nCITATION RULES:\n- ONLY add citation links for URLs actually returned by a tool call. NEVER fabricate or invent URLs.\n- If you answered without calling any tool, do NOT add any links or citations at all. A plain answer is correct.` +
          (customInstructions && (isCustomInstructionsEnabled ?? true)
            ? `\n\nThe user's custom instructions are as follows and YOU MUST FOLLOW THEM AT ALL COSTS: ${customInstructions?.content}`
            : '\n') +
          (latitude && longitude && userPreferencesResult?.preferences?.['scira-location-metadata-enabled'] === true
            ? `\n\nThe user's location is ${latitude}, ${longitude}.`
            : ''),
        providerOptions: {
          openai: {
            parallelToolCalls: false,
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
            stock_chart_simple: stockChartSimpleTool,
            stock_price: stockPriceTool,
            currency_converter: currencyConverterTool,
            coin_data: coinDataTool,
            coin_data_by_contract: coinDataByContractTool,
            coin_ohlc: coinOhlcTool,

            x_search: xSearchTool(dataStream),
            web_search: webSearchTool(dataStream, searchProvider),
            academic_search: academicSearchTool(dataStream),
            // youtube_search: youtubeSearchTool,
            reddit_search: redditSearchTool(dataStream),
            retrieve: retrieveTool,

            movie_or_tv_search: movieTvSearchTool,
            trending_movies: trendingMoviesTool,
            trending_tv: trendingTvTool,

            find_place_on_map: findPlaceOnMapTool,
            nearby_places_search: nearbyPlacesSearchTool,
            get_weather_data: weatherTool,

            text_translate: textTranslateTool,
            code_interpreter: codeInterpreterTool,
            track_flight: flightTrackerTool,
            flight_live_tracker: flightLiveTrackerTool,
            mermaid_diagram: mermaidDiagramTool,
            trove_search: troveSearchTool,
            travel_advisor: travelAdvisorTool,
            rag_search: ragSearchTool,
            datetime: datetimeTool,
            extreme_search: extremeSearchTool(dataStream, extremeSearchProvider || 'exa'),
            greeting: greetingTool(timezone),
            code_context: codeContextTool,
            generate_document: generateDocumentTool,
          };

          if (!user) {
            return baseTools;
          }

          const memoryTools = createMemoryTools(user.id);
          return {
            ...baseTools,
            search_memories: memoryTools.searchMemories as any,
            add_memory: memoryTools.addMemory as any,
            memory_manager: memoryManagerTool as any,
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

          const { text: repairedText } = await generateTextAI({
            model: scx.languageModel('deepseek-v3'),
            prompt: [
              `The model tried to call the tool "${toolCall.toolName}" with the following arguments:`,
              JSON.stringify(toolCall.input),
              `The tool accepts the following schema:`,
              JSON.stringify(inputSchema(toolCall)),
              'Please fix the arguments and respond with ONLY the corrected JSON object, no explanation.',
              'For the code interpreter tool do not use print statements.',
              `For the web search make multiple queries to get the best results but avoid using the same query multiple times and do not use the include and exclude parameters.`,
              `Today's date is ${new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}`,
            ].join('\n'),
          });

          const jsonMatch = repairedText.match(/```(?:json)?\s*([\s\S]*?)```/) || repairedText.match(/\{[\s\S]*\}/);
          const rawJSON = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]).trim() : repairedText;
          const repairedArgs = JSON.parse(jsonrepair(rawJSON));

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
              if (!shouldBypassRateLimits(effectiveModel, user)) {
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

      // Do NOT call result.consumeStream() — it conflicts with toUIMessageStream()
      dataStream.merge(
        result.toUIMessageStream({
          sendFinish: false,
          sendReasoning: supportsReasoning,
        }),
      );
    },
    onError(error) {
      console.error('Stream error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Rate Limit') || error.message.includes('rate limit')) {
          return 'You have reached the usage limit. Please try again in a moment.';
        }
        if (error.message.includes('Bad Request') || error.message.includes('Invalid function calling')) {
          return 'Something went wrong with the AI response. Please try rephrasing your question.';
        }
        if (error.message.includes('timeout') || error.message.includes('Timed out')) {
          return 'The request took too long. Please try again.';
        }
      }
      return 'Something went wrong. Please try again.';
    },
    onFinish: ({ messages: streamedMessages }) => {
      if (!lightweightUser) {
        return;
      }

      after(async () => {
        try {
          await saveMessages({
            messages: streamedMessages.map((message) => {
              const validParts = (message.parts ?? [])
                .filter((part: any) => part != null && typeof part === 'object')
                .filter((part: any) => part.type !== 'data-thinking_status')
                .map((part: any) => {
                  // Guard against text parts with undefined text (can happen when a step only produces tool calls)
                  if (part.type === 'text' && part.text === undefined) {
                    return { ...part, text: '' };
                  }
                  // Drop reasoning parts if model doesn't support reasoning
                  if (part.type === 'reasoning' && !supportsReasoning) {
                    return null;
                  }
                  return part;
                })
                .filter((part: any) => part !== null);

              return {
                id: message.id,
                role: message.role,
                parts: validParts,
                createdAt: new Date(),
                attachments: [],
                chatId: id,
              };
            }),
          });
        } catch (error) {
          console.error('Failed to save messages in onFinish:', error);
        }
      });
    },
  });
  return createUIMessageStreamResponse({ stream });
}
