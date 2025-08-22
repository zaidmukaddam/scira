// /app/api/chat/route.ts
import {
  generateTitleFromUserMessage,
  getGroupConfig,
  getUserMessageCount,
  getExtremeSearchUsageCount,
  getCurrentUser,
  getCustomInstructions,
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
import { scira, requiresAuthentication, requiresProSubscription, shouldBypassRateLimits, models } from '@/ai/providers';
import {
  createStreamId,
  getChatById,
  saveChat,
  saveMessages,
  incrementExtremeSearchUsage,
  incrementMessageUsage,
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
  mcpSearchTool,
  memoryManagerTool,
  redditSearchTool,
  extremeSearchTool,
} from '@/lib/tools';
import { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import { XaiProviderOptions } from '@ai-sdk/xai';
import { GroqProviderOptions } from '@ai-sdk/groq';
import { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { markdownJoinerTransform } from '@/lib/parser';
import { ChatMessage } from '@/lib/types';

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
        keyPrefix: 'scira-ai:resumable-stream',
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

const getMaxOutputTokens = (model: string) => {
  const modelConfig = models.find((m) => m.value === model);
  return modelConfig?.maxOutputTokens ?? 4000;
};

export async function POST(req: Request) {
  console.log('🔍 Search API endpoint hit');

  const requestStartTime = Date.now();
  const { messages, model, group, timezone, id, selectedVisibilityType, isCustomInstructionsEnabled, searchProvider } =
    await req.json();
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

  const userCheckTime = Date.now();
  const user = await getCurrentUser();
  const streamId = 'stream-' + uuidv4();
  console.log(`⏱️  User check took: ${((Date.now() - userCheckTime) / 1000).toFixed(2)}s`);

  if (!user) {
    console.log('User not found');
  }
  let customInstructions: CustomInstructions | null = null;

  console.log('--------------------------------');
  console.log('Custom Instructions Enabled:', isCustomInstructionsEnabled);
  console.log('--------------------------------');

  // Check if model requires authentication (fast check)
  const authRequiredModels = models.filter((m) => m.requiresAuth).map((m) => m.value);
  if (authRequiredModels.includes(model) && !user) {
    return new ChatSDKError('unauthorized:model', `Authentication required to access ${model}`).toResponse();
  }

  // For authenticated users, do critical checks in parallel
  let criticalChecksPromise: Promise<{
    canProceed: boolean;
    error?: any;
    isProUser?: boolean;
  }> = Promise.resolve({ canProceed: true });

  // Get custom instructions in parallel with other operations (declare outside user block for scope)
  const customInstructionsPromise = user ? getCustomInstructions(user) : Promise.resolve(null);

  if (user) {
    const isProUser = user.isProUser;

    try {
      const existingChat = await getChatById({ id });
      if (!existingChat) {
        const title = await generateTitleFromUserMessage({
          message: messages[messages.length - 1],
        });
        console.log('--------------------------------');
        console.log('Generated title: ', title);
        console.log('--------------------------------');
        await saveChat({
          id,
          userId: user.id,
          title: title,
          visibility: selectedVisibilityType,
        });
        console.log('✅ Early chat creation completed for authenticated user');
      } else {
        if (existingChat.userId !== user.id) {
          throw new ChatSDKError('forbidden:chat', 'This chat belongs to another user');
        }
      }
      // Create stream record as early as possible for resumable streaming
      await createStreamId({ streamId, chatId: id });
      console.log('✅ Early stream creation completed');
    } catch (earlyChatError) {
      console.error('Early chat creation failed:', earlyChatError);
      return new ChatSDKError('bad_request:database', 'Failed to initialize chat').toResponse();
    }

    // Check if model requires Pro subscription
    if (requiresProSubscription(model) && !isProUser) {
      return new ChatSDKError('upgrade_required:model', `${model} requires a Pro subscription`).toResponse();
    }

    if (!isProUser) {
      const criticalChecksStartTime = Date.now();

      try {
        const [messageCountResult, extremeSearchUsage] = await Promise.all([
          getUserMessageCount(user),
          getExtremeSearchUsageCount(user),
        ]);
        console.log(`⏱️  Critical checks took: ${((Date.now() - criticalChecksStartTime) / 1000).toFixed(2)}s`);

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
        return new ChatSDKError('bad_request:api', 'Failed to verify user access').toResponse();
      }
    } else {
      const criticalChecksStartTime = Date.now();
      console.log(
        `⏱️  Critical checks took: ${((Date.now() - criticalChecksStartTime) / 1000).toFixed(2)}s (Pro user - skipped usage checks)`,
      );
      criticalChecksPromise = Promise.resolve({
        canProceed: true,
        messageCount: 0,
        isProUser: true,
        subscriptionData: user.polarSubscription
          ? {
              hasSubscription: true,
              subscription: { ...user.polarSubscription, organizationId: null },
            }
          : { hasSubscription: false },
        shouldBypassLimits: true,
        extremeSearchUsage: 0,
      });
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

  const configStartTime = Date.now();
  const configPromise = getGroupConfig(group).then((config) => {
    console.log(`⏱️  Config loading took: ${((Date.now() - configStartTime) / 1000).toFixed(2)}s`);
    return config;
  });

  // Start streaming immediately while background operations continue
  const stream = createUIMessageStream<ChatMessage>({
    execute: async ({ writer: dataStream }) => {
      const criticalWaitStartTime = Date.now();
      const criticalResult = await criticalChecksPromise;
      console.log(`⏱️  Critical checks wait took: ${((Date.now() - criticalWaitStartTime) / 1000).toFixed(2)}s`);

      if (!criticalResult.canProceed) {
        throw criticalResult.error;
      }

      const configWaitStartTime = Date.now();
      const [{ tools: activeTools, instructions }, customInstructionsResult] = await Promise.all([
        configPromise,
        customInstructionsPromise,
      ]);
      customInstructions = customInstructionsResult;
      console.log(
        `⏱️  Config and custom instructions wait took: ${((Date.now() - configWaitStartTime) / 1000).toFixed(2)}s`,
      );
      console.log('Custom Instructions from DB:', customInstructions ? 'Found' : 'Not found');
      console.log('Will apply custom instructions:', !!(customInstructions && (isCustomInstructionsEnabled ?? true)));

      if (user) {
        const backgroundOperations = (async () => {
          try {
            const backgroundStartTime = Date.now();
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
            console.log(`⏱️  Background operations took: ${((Date.now() - backgroundStartTime) / 1000).toFixed(2)}s`);

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
      console.log('--------------------------------');
      console.log(`Time to reach streamText: ${setupTime.toFixed(2)} seconds`);
      console.log('--------------------------------');

      const maxTokens = getMaxOutputTokens(model);

      const streamStartTime = Date.now();

      const result = streamText({
        model: scira.languageModel(model),
        messages: convertToModelMessages(messages),
        ...(model.includes('scira-qwen-32b')
          ? {
              temperature: 0.6,
              topP: 0.95,
              minP: 0,
            }
          : model.includes('scira-qwen-235')
            ? {
                temperature: 0.7,
                topP: 0.8,
                minP: 0,
              }
            : {}),
        stopWhen: stepCountIs(5),
        maxRetries: 10,
        ...(model.includes('scira-5')
          ? {
              maxOutputTokens: maxTokens,
            }
          : {}),
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
          openai: {
            ...(model.includes('scira-5')
              ? {
                  include: ['reasoning.encrypted_content'],
                  reasoningEffort: model === 'scira-5-high' ? 'high' : 'low',
                  reasoningSummary: model === 'scira-5-high' ? 'detailed' : 'auto',
                  parallelToolCalls: false,
                  strictJsonSchema: false,
                  serviceTier: 'auto',
                  textVerbosity: 'medium',
                }
              : {}),
          } satisfies OpenAIResponsesProviderOptions,
          xai: {
            ...(model === 'scira-default'
              ? {
                  reasoningEffort: 'low',
                }
              : {}),
          } satisfies XaiProviderOptions,
          groq: {
            ...(model === 'scira-gpt-oss-20' || model === 'scira-gpt-oss-120'
              ? {
                  reasoningEffort: 'high',
                }
              : {}),
            ...(model === 'scira-qwen-32b'
              ? {
                  reasoningEffort: 'none',
                }
              : {}),
            parallelToolCalls: false,
            structuredOutputs: true,
          } satisfies GroqProviderOptions,
          google: {
            structuredOutputs: true,
          } satisfies GoogleGenerativeAIProviderOptions,
        },
        tools: {
          // Stock & Financial Tools
          stock_chart: stockChartTool,
          currency_converter: currencyConverterTool,
          coin_data: coinDataTool,
          coin_data_by_contract: coinDataByContractTool,
          coin_ohlc: coinOhlcTool,

          // Search & Content Tools
          x_search: xSearchTool,
          web_search: webSearchTool(dataStream, searchProvider),
          academic_search: academicSearchTool,
          youtube_search: youtubeSearchTool,
          reddit_search: redditSearchTool,
          retrieve: retrieveTool,

          // Media & Entertainment
          movie_or_tv_search: movieTvSearchTool,
          trending_movies: trendingMoviesTool,
          trending_tv: trendingTvTool,

          // Location & Maps
          find_place_on_map: findPlaceOnMapTool,
          nearby_places_search: nearbyPlacesSearchTool,
          get_weather_data: weatherTool,

          // Utility Tools
          text_translate: textTranslateTool,
          code_interpreter: codeInterpreterTool,
          track_flight: flightTrackerTool,
          datetime: datetimeTool,
          mcp_search: mcpSearchTool,
          memory_manager: memoryManagerTool,
          extreme_search: extremeSearchTool(dataStream),
          greeting: greetingTool(timezone),
        },
        experimental_repairToolCall: async ({ toolCall, tools, inputSchema, error }) => {
          if (NoSuchToolError.isInstance(error)) {
            return null; // do not attempt to fix invalid tool names
          }

          console.log('Fixing tool call================================');
          console.log('toolCall', toolCall);
          console.log('tools', tools);
          console.log('parameterSchema', inputSchema);
          console.log('error', error);

          const tool = tools[toolCall.toolName as keyof typeof tools];

          const { object: repairedArgs } = await generateObject({
            model: scira.languageModel('scira-grok-3'),
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
          if (event.warnings) {
            console.log('Warnings: ', event.warnings);
          }
        },
        onFinish: async (event) => {
          console.log('Fin reason: ', event.finishReason);
          console.log('Reasoning: ', event.reasoningText);
          console.log('reasoning details: ', event.reasoning);
          console.log('Steps: ', event.steps);
          console.log('Messages: ', event.response.messages);
          console.log('Message content: ', event.response.messages[event.response.messages.length - 1].content);
          console.log('Response: ', event.response);
          console.log('Provider metadata: ', event.providerMetadata);
          console.log('Sources: ', event.sources);
          console.log('Usage: ', event.usage);
          console.log('Total Usage: ', event.totalUsage);

          // Only proceed if user is authenticated
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
                    step.toolCalls?.some((toolCall) => toolCall.toolName === 'extreme_search'),
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
      if (user) {
        console.log('Saving messages');
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
        console.log('Messages saved');
      }
    },
  });
  const streamContext = getStreamContext();

  if (streamContext) {
    return new Response(
      await streamContext.resumableStream(streamId, () => stream.pipeThrough(new JsonToSseTransformStream())),
    );
  } else {
    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  }
}
