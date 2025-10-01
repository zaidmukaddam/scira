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

let globalStreamContext: ResumableStreamContext | null = null;

// Database operations tracking
const dbOperationTimings: { operation: string; time: number }[] = [];

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
  console.log('🔍 Search API endpoint hit');

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

  console.log('--------------------------------');
  console.log('Location: ', latitude, longitude);
  console.log('--------------------------------');

  console.log('--------------------------------');
  console.log('Messages: ', messages);
  console.log('--------------------------------');

  console.log('Running with model: ', model.trim());
  console.log('Group: ', group);
  console.log('Timezone: ', timezone);

  // OPTIMIZATION: Use lightweight auth check first for faster validation
  const lightweightAuthCheckTime = Date.now();
  console.log('🔍 [DB] Starting getLightweightUser() (fast auth check)...');
  const lightweightUser = await getLightweightUser();
  const streamId = 'stream-' + uuidv4();
  const lightweightAuthTime = (Date.now() - lightweightAuthCheckTime) / 1000;
  dbOperationTimings.push({ operation: 'getLightweightUser', time: lightweightAuthTime });
  console.log(`⏱️  [DB] getLightweightUser() took: ${lightweightAuthTime.toFixed(2)}s`);

  if (!lightweightUser) {
    console.log('User not authenticated');
  }

  // Check if model requires authentication (fast check using lightweight user)
  const authRequiredModels = models.filter((m) => m.requiresAuth).map((m) => m.value);
  if (authRequiredModels.includes(model) && !lightweightUser) {
    return new ChatSDKError('unauthorized:model', `Authentication required to access ${model}`).toResponse();
  }

  // Check if model requires Pro subscription (fast check using lightweight user)
  if (lightweightUser && requiresProSubscription(model) && !lightweightUser.isProUser) {
    return new ChatSDKError('upgrade_required:model', `${model} requires a Pro subscription`).toResponse();
  }

  // OPTIMIZATION: Start config fetch immediately for all users (parallel with everything else)
  const configStartTime = Date.now();
  console.log('🔍 [DB] Starting getGroupConfig() early (parallel)...');
  configPromise = getGroupConfig(group).then((config) => {
    const configTime = (Date.now() - configStartTime) / 1000;
    dbOperationTimings.push({ operation: 'getGroupConfig', time: configTime });
    console.log(`⏱️  [DB] getGroupConfig() took: ${configTime.toFixed(2)}s`);
    return config;
  });

  // Fetch full user data in parallel with other operations (only if authenticated)
  const fullUserPromise = lightweightUser ? getCurrentUser() : Promise.resolve(null);

  let customInstructions: CustomInstructions | null = null;

  console.log('--------------------------------');
  console.log('Custom Instructions Enabled:', isCustomInstructionsEnabled);
  console.log('--------------------------------');

  // For authenticated users, do critical checks in parallel
  let criticalChecksPromise: Promise<{
    canProceed: boolean;
    error?: any;
    isProUser?: boolean;
  }> = Promise.resolve({ canProceed: true });

  const customInstructionsPromise = lightweightUser
    ? fullUserPromise.then(async (user) => {
      if (!user) return null;
      console.log('🔍 [DB] Fetching (cached) custom instructions...');
      const start = Date.now();
      const instructions = await getCachedCustomInstructionsByUserId(user.id);
      const elapsed = (Date.now() - start) / 1000;
      dbOperationTimings.push({ operation: 'getCustomInstructions', time: elapsed });
      console.log(`⏱️  [DB] getCustomInstructions() took: ${elapsed.toFixed(2)}s`);
      return instructions;
    })
    : Promise.resolve(null);

  if (lightweightUser) {
    const isProUser = lightweightUser.isProUser;

    // OPTIMIZATION: Start all independent DB operations in parallel
    const parallelOpsStartTime = Date.now();
    console.log('🔍 [DB] Starting parallel operations (getChatById, getGroupConfig, usage checks)...');

    // Start getChatById immediately
    const getChatStartTime = Date.now();
    const getChatPromise = getChatById({ id }).then((chat) => {
      const getChatTime = (Date.now() - getChatStartTime) / 1000;
      dbOperationTimings.push({ operation: 'getChatById', time: getChatTime });
      console.log(`⏱️  [DB] getChatById() took: ${getChatTime.toFixed(2)}s`);
      return chat;
    });

    // For non-Pro users, start usage checks in parallel
    let usageChecksPromise: Promise<{
      messageCountResult: any;
      extremeSearchUsage: any;
      user: any;
    } | null>;
    if (!isProUser) {
      const criticalChecksStartTime = Date.now();
      usageChecksPromise = fullUserPromise.then(async (user) => {
        if (!user) {
          throw new ChatSDKError('unauthorized:auth', 'User authentication failed');
        }
        console.log('🔍 [DB] Starting getUserMessageCount() and getExtremeSearchUsageCount()...');
        const [messageCountResult, extremeSearchUsage] = await Promise.all([
          getUserMessageCount(user),
          getExtremeSearchUsageCount(user),
        ]);
        const criticalChecksTime = (Date.now() - criticalChecksStartTime) / 1000;
        dbOperationTimings.push({
          operation: 'getUserMessageCount + getExtremeSearchUsageCount',
          time: criticalChecksTime,
        });
        console.log(
          `⏱️  [DB] getUserMessageCount() + getExtremeSearchUsageCount() took: ${criticalChecksTime.toFixed(2)}s`,
        );
        return { messageCountResult, extremeSearchUsage, user };
      });
    } else {
      usageChecksPromise = Promise.resolve(null);
    }

    // Wait for chat check to complete before creating/validating
    try {
      const existingChat = await getChatPromise;

      if (!existingChat) {
        // Create chat immediately with a temporary title to avoid blocking the request
        const saveChatStartTime = Date.now();
        console.log('🔍 [DB] Starting saveChat()...');
        await saveChat({
          id,
          userId: lightweightUser.userId,
          title: 'New Chat', // Temporary title
          visibility: selectedVisibilityType,
        });
        const saveChatTime = (Date.now() - saveChatStartTime) / 1000;
        dbOperationTimings.push({ operation: 'saveChat', time: saveChatTime });
        console.log(`⏱️  [DB] saveChat() took: ${saveChatTime.toFixed(2)}s`);

        // Generate title in background and update the chat
        after(async () => {
          try {
            const title = await generateTitleFromUserMessage({
              message: messages[messages.length - 1],
            });
            console.log('--------------------------------');
            console.log('Generated title: ', title);
            console.log('--------------------------------');
            // Update the chat with the generated title
            await updateChatTitleById({
              chatId: id,
              title: title,
            });
            console.log('✅ Background title generation completed');
          } catch (titleError) {
            console.error('Background title generation failed:', titleError);
          }
        });

        console.log('✅ Early chat creation completed for authenticated user');
      } else {
        if (existingChat.userId !== lightweightUser.userId) {
          throw new ChatSDKError('forbidden:chat', 'This chat belongs to another user');
        }
      }

      // Create stream record - can run in parallel with usage checks
      const createStreamStartTime = Date.now();
      console.log('🔍 [DB] Starting createStreamId()...');
      await createStreamId({ streamId, chatId: id });
      const createStreamTime = (Date.now() - createStreamStartTime) / 1000;
      dbOperationTimings.push({ operation: 'createStreamId', time: createStreamTime });
      console.log(`⏱️  [DB] createStreamId() took: ${createStreamTime.toFixed(2)}s`);
      console.log('✅ Early stream creation completed');
    } catch (earlyChatError) {
      console.error('Early chat creation failed:', earlyChatError);
      return new ChatSDKError('bad_request:database', 'Failed to initialize chat').toResponse();
    }

    const parallelOpsTime = (Date.now() - parallelOpsStartTime) / 1000;
    console.log(`⏱️  [PARALLEL] All parallel operations initiated in: ${parallelOpsTime.toFixed(2)}s`);

    // Pro subscription check already done earlier with lightweight user

    if (!isProUser) {
      try {
        const usageResults = await usageChecksPromise;
        if (!usageResults) {
          return new ChatSDKError('unauthorized:auth', 'User authentication failed').toResponse();
        }

        const { messageCountResult, extremeSearchUsage, user } = usageResults;

        if (messageCountResult.error) {
          console.error('Error getting message count:', messageCountResult.error);
          return new ChatSDKError('bad_request:api', 'Failed to verify usage limits').toResponse();
        }

        const shouldBypassLimits = shouldBypassRateLimits(model, user);

        if (!shouldBypassLimits && messageCountResult.count !== undefined) {
          const dailyLimit = 100;
          if (messageCountResult.count >= dailyLimit) {
            return new ChatSDKError('rate_limit:chat', 'Daily search limit reached').toResponse();
          }
        }

        criticalChecksPromise = Promise.resolve({
          canProceed: true,
          messageCount: messageCountResult.count,
          isProUser: false,
          subscriptionData: user.polarSubscription
            ? {
              hasSubscription: true,
              subscription: { ...user.polarSubscription, organizationId: null },
            }
            : { hasSubscription: false },
          shouldBypassLimits,
          extremeSearchUsage: extremeSearchUsage.count,
        });
      } catch (error) {
        console.error('Critical checks failed:', error);
        if (error instanceof ChatSDKError) {
          return error.toResponse();
        }
        return new ChatSDKError('bad_request:api', 'Failed to verify user access').toResponse();
      }
    } else {
      console.log('⏱️  Critical checks skipped (Pro user - no usage limits)');
      criticalChecksPromise = fullUserPromise.then((user) => ({
        canProceed: true,
        messageCount: 0,
        isProUser: true,
        subscriptionData: user?.polarSubscription
          ? {
            hasSubscription: true,
            subscription: { ...user.polarSubscription, organizationId: null },
          }
          : { hasSubscription: false },
        shouldBypassLimits: true,
        extremeSearchUsage: 0,
      }));
    }
  } else {
    if (requiresAuthentication(model)) {
      return new ChatSDKError('unauthorized:model', `${model} requires authentication`).toResponse();
    }

    criticalChecksPromise = Promise.resolve({
      canProceed: true,
      messageCount: 0,
      isProUser: false,
      subscriptionData: null,
      shouldBypassLimits: false,
      extremeSearchUsage: 0,
    });
  }

  // Config promise already started early for all users

  // If we don't have custom instructions promise yet (unauthenticated user), create it now
  const finalCustomInstructionsPromise = customInstructionsPromise || Promise.resolve(null);

  // Start streaming immediately while background operations continue
  const stream = createUIMessageStream<ChatMessage>({
    execute: async ({ writer: dataStream }) => {
      const criticalWaitStartTime = Date.now();
      const criticalResult = await criticalChecksPromise;
      console.log(`⏱️  Critical checks wait took: ${((Date.now() - criticalWaitStartTime) / 1000).toFixed(2)}s`);

      if (!criticalResult.canProceed) {
        throw criticalResult.error;
      }

      // Add individual timing for each operation
      const configWaitStartTime = Date.now();
      const customInstructionsWaitStartTime = Date.now();

      const configWithTiming = configPromise.then((result) => {
        console.log(`⏱️  [DB] Config promise wait took: ${((Date.now() - configWaitStartTime) / 1000).toFixed(2)}s`);
        return result;
      });

      const customInstructionsWithTiming = finalCustomInstructionsPromise.then((result) => {
        console.log(
          `⏱️  [DB] Custom instructions promise wait took: ${((Date.now() - customInstructionsWaitStartTime) / 1000).toFixed(2)}s`,
        );
        return result;
      });

      const combinedWaitStartTime = Date.now();
      const [{ tools: activeTools, instructions }, customInstructionsResult] = await Promise.all([
        configWithTiming,
        customInstructionsWithTiming,
      ]);
      customInstructions = customInstructionsResult;
      console.log(`⏱️  Combined wait took: ${((Date.now() - combinedWaitStartTime) / 1000).toFixed(2)}s`);
      console.log('Custom Instructions from DB:', customInstructions ? 'Found' : 'Not found');
      console.log('Will apply custom instructions:', !!(customInstructions && (isCustomInstructionsEnabled ?? true)));

      // Get full user data for message saving
      const user = await fullUserPromise;
      if (user) {
        const backgroundOperations = (async () => {
          try {
            const backgroundStartTime = Date.now();
            console.log('🔍 [DB] Starting background saveMessages()...');
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
            console.log(
              `⏱️  [DB] Background saveMessages() took: ${((Date.now() - backgroundStartTime) / 1000).toFixed(2)}s`,
            );

            console.log('--------------------------------');
            console.log('Messages saved: ', messages);
            console.log('--------------------------------');
          } catch (error) {
            console.error('Error in background message operations:', error);
          }
        })();

        backgroundOperations.catch((error) => {
          console.error('Background operations failed:', error);
        });
      }

      const preStreamTime = Date.now();
      const setupTime = (preStreamTime - requestStartTime) / 1000;
      const totalDbTime = dbOperationTimings.reduce((sum, op) => sum + op.time, 0);

      console.log('================================');
      console.log(`🚀 TOTAL TIME TO REACH STREAMTEXT: ${setupTime.toFixed(2)} seconds`);
      console.log(
        `📊 TOTAL DATABASE TIME: ${totalDbTime.toFixed(2)} seconds (${((totalDbTime / setupTime) * 100).toFixed(1)}% of total)`,
      );
      console.log('📋 DB OPERATIONS BREAKDOWN:');
      dbOperationTimings.forEach((op) => {
        console.log(`   • ${op.operation}: ${op.time.toFixed(2)}s`);
      });
      console.log('================================');

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
            only: ['openai', 'anthropic', 'moonshotai', 'zai', 'deepseek', 'fireworks', 'bedrock', 'alibaba'],
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
              model === 'scira-gpt5-nano'
              ? {
                reasoningEffort: 'medium',
                parallelToolCalls: false,
                store: false,
                reasoningSummary: 'detailed',
                textVerbosity: 'high',
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
          console.log('Finished event:', event);
          console.log('Reason:', event.finishReason);
          console.log('Steps:', event.steps);
          console.log('Reasoning:', event.reasoning);
          if (user?.id && event.finishReason === 'stop') {
            after(async () => {
              try {
                if (!shouldBypassRateLimits(model, user)) {
                  await incrementMessageUsage({ userId: user.id });
                }
              } catch (error) {
                console.error('Failed to track message usage:', error);
              }
            });

            if (group === 'extreme') {
              after(async () => {
                try {
                  const extremeSearchUsed = event.steps?.some((step) =>
                    step.toolCalls?.some((toolCall) => toolCall && toolCall.toolName === 'extreme_search'),
                  );

                  if (extremeSearchUsed) {
                    console.log('Extreme search was used successfully, incrementing count');
                    await incrementExtremeSearchUsage({ userId: user.id });
                  }
                } catch (error) {
                  console.error('Failed to track extreme search usage:', error);
                }
              });
            }
          }

          const requestEndTime = Date.now();
          const processingTime = (requestEndTime - requestStartTime) / 1000;
          console.log('--------------------------------');
          console.log(`Total request processing time: ${processingTime.toFixed(2)} seconds`);
          console.log('--------------------------------');
        },
        onError(event) {
          console.log('Error: ', event.error);
          const requestEndTime = Date.now();
          const processingTime = (requestEndTime - requestStartTime) / 1000;
          console.log('--------------------------------');
          console.log(`Request processing time (with error): ${processingTime.toFixed(2)} seconds`);
          console.log('--------------------------------');
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
      console.log('onFinish', messages);
      if (lightweightUser) {
        const finalSaveStartTime = Date.now();
        console.log('🔍 [DB] Starting final saveMessages()...');
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
        const finalSaveTime = (Date.now() - finalSaveStartTime) / 1000;
        console.log(`⏱️  [DB] Final saveMessages() took: ${finalSaveTime.toFixed(2)}s`);
        console.log('✅ Messages saved');
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
