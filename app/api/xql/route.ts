import { getCurrentUser } from '@/app/actions';
import {
  convertToModelMessages,
  streamText,
  ToolSet,
  tool,
  hasToolCall,
  UIMessage,
  UIDataTypes,
  InferUITools,
  generateText,
  stepCountIs,
} from 'ai';
import { ChatSDKError } from '@/lib/errors';

import { markdownJoinerTransform } from '@/lib/parser';
import { scira } from '@/ai/providers';

import { z } from 'zod';
import { GroqProviderOptions } from '@ai-sdk/groq';
import { createXai } from '@ai-sdk/xai';

const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://eu-west-1.api.x.ai/v1',
});

const xqlTool = tool({
  description:
    'Search X posts for recent information and discussions with the ability to filter by X handles, date range, and post engagement metrics.',
  inputSchema: z
    .object({
      query: z.string().describe('The new rephrased natural language query crafted by you.'),
      startDate: z
        .string()
        .describe('The start date of the search in the format YYYY-MM-DD (default to 15 days ago if not specified)'),
      endDate: z
        .string()
        .describe('The end date of the search in the format YYYY-MM-DD (default to today if not specified)'),
      includeXHandles: z
        .array(z.string())
        .max(10)
        .optional()
        .describe('The X handles to include in the search (max 10). Cannot be used with excludeXHandles.'),
      excludeXHandles: z
        .array(z.string())
        .max(10)
        .optional()
        .describe(
          'The X handles to exclude in the search (max 10). Cannot be used with includeXHandles. Note: "grok" handle is excluded by default.',
        ),
    })
    .refine(
      (data) => {
        // Ensure includeXHandles and excludeXHandles are not both specified with non-empty arrays
        const hasInclude = data.includeXHandles && data.includeXHandles.length > 0;
        const hasExclude = data.excludeXHandles && data.excludeXHandles.length > 0;
        return !(hasInclude && hasExclude);
      },
      {
        message: 'Cannot specify both includeXHandles and excludeXHandles - use one or the other',
        path: ['includeXHandles', 'excludeXHandles'],
      },
    ),
  async execute({
    query,
    startDate,
    endDate,
    includeXHandles,
    excludeXHandles,
  }) {
    const sanitizeHandle = (handle: string) => handle.replace(/^@+/, '').trim();

    const normalizedInclude = Array.isArray(includeXHandles)
      ? includeXHandles.map(sanitizeHandle).filter(Boolean)
      : undefined;
    const normalizedExclude = Array.isArray(excludeXHandles)
      ? excludeXHandles.map(sanitizeHandle).filter(Boolean)
      : undefined;

    const toYMD = (d: Date) => d.toISOString().slice(0, 10);
    const today = new Date();
    const daysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const effectiveStart = startDate && startDate.trim().length > 0 ? startDate : toYMD(daysAgo);
    const effectiveEnd = endDate && endDate.trim().length > 0 ? endDate : toYMD(today);

    console.log('X search - includeHandles:', normalizedInclude, 'excludeHandles:', normalizedExclude);

    const xSearchToolConfig: Parameters<typeof xai.tools.xSearch>[0] = {
      fromDate: effectiveStart,
      toDate: effectiveEnd,
      enableImageUnderstanding: true,
      enableVideoUnderstanding: true,
    };

    // Add allowedXHandles if includeXHandles is provided
    if (normalizedInclude?.length) {
      xSearchToolConfig.allowedXHandles = normalizedInclude;
    }

    const result = await generateText({
      model: xai.responses('grok-4-fast'),
      prompt: query,
      maxOutputTokens: 10,
      stopWhen: stepCountIs(1),
      tools: {
        x_search: xai.tools.xSearch(xSearchToolConfig),
      },
    });

    const citations =
      result.sources?.map((source) => (source.sourceType === 'url' ? source.url : null)).filter((url) => url !== null) ||
      [];

    return citations;
  },
});

const tools = {
  xql: xqlTool,
};

export type XQLMessage = UIMessage<never, UIDataTypes, InferUITools<typeof tools>>;

export async function POST(req: Request) {
  console.log('🔍 Search API endpoint hit');

  const requestStartTime = Date.now();
  const { messages } = await req.json();

  const user = await getCurrentUser();

  if (!user) {
    console.log('User not found');
  }

  if (user) {
    const isProUser = user.isProUser;

    if (!isProUser) {
      return new ChatSDKError('upgrade_required:auth', 'This feature requires a Pro subscription').toResponse();
    }
  }

  const result = streamText({
    model: scira.languageModel('scira-default'),
    messages: await convertToModelMessages(messages),
    stopWhen: hasToolCall('xql'),
    onAbort: ({ steps }) => {
      console.log('Stream aborted after', steps.length, 'steps');
    },
    prepareStep: ({ stepNumber }) => {
      if (stepNumber === 0) {
        return {
          toolChoice: { toolName: 'xql', type: 'tool' },
          activeTools: ['xql'],
        };
      }
    },
    providerOptions: {
      groq: {
        reasoningEffort: 'none',
        parallelToolCalls: false,
        structuredOutputs: true,
        serviceTier: 'auto',
      } satisfies GroqProviderOptions,
    },
    maxRetries: 10,
    experimental_transform: markdownJoinerTransform(),
    system: `You are a helpful assistant that searches for X posts, You will be given a search query and you will need to search for the posts and return the results in a structured format.

        Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}.
        The date range is from 15 days ago to today unless the user specifies otherwise.

        The tool to use is xql.

        The tool has the following parameters:
        - query: The natural language query
        - startDate: The start date of the search in the format YYYY-MM-DD (default to 15 days ago if not specified)
        - endDate: The end date of the search in the format YYYY-MM-DD (default to today if not specified)
        - includeXHandles: The X handles to include in the search (max 10 handles). Do not include the @ symbol. CANNOT be used together with excludeXHandles.
        - excludeXHandles: The X handles to exclude in the search (max 10 handles). Do not include the @ symbol. CANNOT be used together with includeXHandles. Note: "grok" handle is automatically excluded by default.
        - postFavoritesCount: The minimum number of favorites (likes) the post must have to be included
        - postViewCount: The minimum number of views the post must have to be included
        - maxResults: The maximum number of search results to return (default 15, max 100)

        IMPORTANT CONSTRAINTS:
        - Maximum 10 handles for include/exclude lists
        - Cannot use both includeXHandles and excludeXHandles in the same query
        - postFavoritesCount and postViewCount are minimum thresholds, not exact matches

        The tools name is xql it doesnt meant you should write SQL in the input of the tool!
        `,
    tools: {
      xql: xqlTool,
    } as ToolSet,
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
      console.log('Steps: ', event.steps);
      console.log('Tool calls: ', event.toolCalls);
      console.log('Tool Result: ', event.toolResults);
      console.log('Response: ', event.response);
      console.log('Provider metadata: ', event.providerMetadata);
      console.log('Sources: ', event.sources);
      console.log('Usage: ', event.usage);
      console.log('Total Usage: ', event.totalUsage);

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

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
  });
}
