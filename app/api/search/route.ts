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
  models,
  getModelParameters,
} from '@/ai/providers';
import {
  createStreamId,
  getChatById,
  saveChat,
  saveMessages,
  incrementExtremeSearchUsage,
  incrementMessageUsage,
  updateChatTitleById,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { createResumableStreamContext, type ResumableStreamContext } from 'resumable-stream';
import { after } from 'next/server';
import { CustomInstructions } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';
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
import { getCachedCustomInstructionsByUserId } from '@/lib/user-data-server';
import { GoogleGenerativeAIProvider, GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';

let globalStreamContext: ResumableStreamContext | null = null;

// Shared config promise to avoid duplicate calls
let configPromise: Promise<any>;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
        keyPrefix: 'scira-ai',
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
  const {
    messages,
    model,
    group,
    timezone,
    id,
    selectedVisibilityType,
    isCustomInstructionsEnabled,
    searchProvider,
    selectedConnectors,
  } = await req.json();
  const { latitude, longitude } = geolocation(req);
  const streamId = 'stream-' + uuidv4();

  console.log('🔍 Search API:', { model: model.trim(), group, latitude, longitude });

  // CRITICAL PATH: Get auth status first (required for all subsequent checks)
  const lightweightUser = await getLightweightUser();

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

  // START ALL CRITICAL PARALLEL OPERATIONS IMMEDIATELY
  const isProUser = lightweightUser?.isProUser ?? false;
  
  // 1. Config (needed for streaming) - start immediately
  configPromise = getGroupConfig(group);
  
  // 2. Full user data (needed for usage checks and custom instructions)
  const fullUserPromise = lightweightUser ? getCurrentUser() : Promise.resolve(null);
  
  // 3. Custom instructions (only if enabled and authenticated)
  const customInstructionsPromise = lightweightUser && (isCustomInstructionsEnabled ?? true)
    ? fullUserPromise.then(user => user ? getCachedCustomInstructionsByUserId(user.id) : null)
    : Promise.resolve(null);

  // 4. For authenticated users: start ALL operations in parallel
  let criticalChecksPromise: Promise<{
    canProceed: boolean;
    error?: any;
    isProUser: boolean;
    messageCount?: number;
    extremeSearchUsage?: number;
    subscriptionData?: any;
    shouldBypassLimits?: boolean;
  }>;

  if (lightweightUser) {
    // Chat validation and creation (must be synchronous for DB consistency)
    const chatValidationPromise = getChatById({ id }).then(async (existingChat) => {
      // Validate ownership if chat exists
      if (existingChat && existingChat.userId !== lightweightUser.userId) {
        throw new ChatSDKError('forbidden:chat', 'This chat belongs to another user');
      }
      
      // Create chat if it doesn't exist (MUST be sync - other operations depend on it)
      if (!existingChat) {
        await saveChat({
          id,
          userId: lightweightUser.userId,
          title: 'New Chat',
          visibility: selectedVisibilityType,
        });
        
        // Generate better title in background (non-critical)
        after(async () => {
          try {
            const title = await generateTitleFromUserMessage({
              message: messages[messages.length - 1],
            });
            await updateChatTitleById({ chatId: id, title });
          } catch (error) {
            console.error('Background title generation failed:', error);
          }
        });
      }
      
      // Stream tracking in background (non-critical for functionality)
      after(async () => {
        try {
          await createStreamId({ streamId, chatId: id });
        } catch (error) {
          console.error('Background createStreamId failed:', error);
        }
      });
      
      return existingChat;
    });

    // For non-Pro users: run usage checks in parallel
    if (!isProUser) {
      criticalChecksPromise = Promise.all([
        fullUserPromise,
        chatValidationPromise,
      ]).then(async ([user]) => {
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

        const shouldBypassLimits = shouldBypassRateLimits(model, user);
        if (!shouldBypassLimits && messageCountResult.count !== undefined && messageCountResult.count >= 100) {
          throw new ChatSDKError('rate_limit:chat', 'Daily search limit reached');
        }

        return {
          canProceed: true,
          isProUser: false,
          messageCount: messageCountResult.count,
          extremeSearchUsage: extremeSearchUsage.count,
          subscriptionData: user.polarSubscription
            ? { hasSubscription: true, subscription: { ...user.polarSubscription, organizationId: null } }
            : { hasSubscription: false },
          shouldBypassLimits,
        };
      }).catch(error => {
        if (error instanceof ChatSDKError) throw error;
        throw new ChatSDKError('bad_request:api', 'Failed to verify user access');
      });
    } else {
      // Pro users: just validate chat ownership
      criticalChecksPromise = Promise.all([
        fullUserPromise,
        chatValidationPromise,
      ]).then(([user]) => ({
        canProceed: true,
        isProUser: true,
        messageCount: 0,
        extremeSearchUsage: 0,
        subscriptionData: user?.polarSubscription
          ? { hasSubscription: true, subscription: { ...user.polarSubscription, organizationId: null } }
          : { hasSubscription: false },
        shouldBypassLimits: true,
      }));
    }
  } else {
    // Unauthenticated users: no checks needed
    criticalChecksPromise = Promise.resolve({
      canProceed: true,
      isProUser: false,
      messageCount: 0,
      extremeSearchUsage: 0,
      subscriptionData: null,
      shouldBypassLimits: false,
    });
  }

  let customInstructions: CustomInstructions | null = null;

  // Start streaming immediately while background operations continue
  const stream = createUIMessageStream<ChatMessage>({
    execute: async ({ writer: dataStream }) => {
      // Wait for critical checks and config in parallel (only what's needed to start streaming)
      const [criticalResult, { tools: activeTools, instructions }, customInstructionsResult, user] = await Promise.all([
        criticalChecksPromise,
        configPromise,
        customInstructionsPromise,
        fullUserPromise,
      ]);

      if (!criticalResult.canProceed) {
        throw criticalResult.error;
      }

      customInstructions = customInstructionsResult;
      
      // Save user message BEFORE streaming (critical for conversation history)
      if (user) {
        await saveMessages({
          messages: [{
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
          }],
        });
      }

      const setupTime = (Date.now() - requestStartTime) / 1000;
      console.log(`🚀 Time to streamText: ${setupTime.toFixed(2)}s`);

      const streamStartTime = Date.now();

      const result = streamText({
        model: scira.languageModel(model),
        messages: convertToModelMessages(messages),
        ...getModelParameters(model),
        stopWhen: stepCountIs(5),
        onAbort: ({ steps }) => {
          console.log('Stream aborted after', steps.length, 'steps');
        },
        maxRetries: 10,
        activeTools: [...activeTools],
        experimental_transform: markdownJoinerTransform(),
        system:
          instructions +
          (customInstructions && (isCustomInstructionsEnabled ?? true)
            ? `\n\nThe user's custom instructions are as follows and YOU MUST FOLLOW THEM AT ALL COSTS: ${customInstructions?.content}`
            : '\n') +
          (latitude && longitude ? `\n\nThe user's location is ${latitude}, ${longitude}.` : ''),
        toolChoice: 'auto',
        providerOptions: {
          gateway: {
            only: ['openai', 'anthropic', 'vertex', 'moonshotai', 'zai', 'deepseek', 'fireworks', 'bedrock', 'alibaba'],
            order: ['anthropic', 'vertex', 'bedrock']
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
              model === 'scira-gpt5-codex'
              ? {
                reasoningEffort: (
                  model === 'scira-gpt5-nano' ||
                    model === 'scira-gpt5' ||
                    model === 'scira-gpt5-mini' ?
                    'minimal' :
                    'medium'
                ),
                parallelToolCalls: false,
                store: false,
                reasoningSummary: 'detailed',
                textVerbosity: (model === 'scira-o3' || model === 'scira-gpt5-codex' ? 'medium' : 'high'),
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
            parallel_tool_calls: false,
          },
          anthropic: {
            ...(model === 'scira-anthropic-think'
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
            ...(model === 'scira-google-think'
              ? {
                thinkingConfig: {
                  thinkingBudget: 400,
                  includeThoughts: true,
                },
              }
              : {}),
            threshold: "OFF"
          } satisfies GoogleGenerativeAIProviderOptions,
        },
        prepareStep: async ({ steps }) => {
          if (steps.length > 0) {
            const lastStep = steps[steps.length - 1];

            // If tools were called and results are available, disable further tool calls
            if (lastStep.toolCalls.length > 0 && lastStep.toolResults.length > 0) {
              return {
                toolChoice: 'none',
              };
            }
          }
        },
        tools: (() => {
          const baseTools = {
            stock_chart: stockChartTool,
            currency_converter: currencyConverterTool,
            coin_data: coinDataTool,
            coin_data_by_contract: coinDataByContractTool,
            coin_ohlc: coinOhlcTool,

            x_search: xSearchTool,
            web_search: webSearchTool(dataStream, searchProvider),
            academic_search: academicSearchTool,
            youtube_search: youtubeSearchTool,
            reddit_search: redditSearchTool,
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
            datetime: datetimeTool,
            extreme_search: extremeSearchTool(dataStream),
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
            model: scira.languageModel('scira-grok-4-fast'),
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
            after(async () => {
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
            });
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
    onFinish: async ({ messages }) => {
      if (lightweightUser) {
        await saveMessages({
          messages: messages.map((message) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
            model: model,
            completionTime: message.metadata?.completionTime ?? 0,
            inputTokens: message.metadata?.inputTokens ?? 0,
            outputTokens: message.metadata?.outputTokens ?? 0,
            totalTokens: message.metadata?.totalTokens ?? 0,
          })),
        });
      }
    },
  });
  // const streamContext = getStreamContext();

  // if (streamContext) {
  //   return new Response(
  //     await streamContext.resumableStream(streamId, () => stream.pipeThrough(new JsonToSseTransformStream())),
  //   );
  // }
  return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
}
