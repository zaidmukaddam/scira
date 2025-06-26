// /app/api/chat/route.ts
import {
  generateTitleFromUserMessage,
  getGroupConfig,
  getUserMessageCount,
  getSubDetails,
  getExtremeSearchUsageCount,
} from '@/app/actions';
import { serverEnv } from '@/env/server';
import { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import { Daytona } from '@daytonaio/sdk';
import { tavily } from '@tavily/core';
import {
  convertToCoreMessages,
  streamText,
  tool,
  generateObject,
  NoSuchToolError,
  appendResponseMessages,
  CoreToolMessage,
  CoreAssistantMessage,
  createDataStream,
} from 'ai';
import Exa from 'exa-js';
import { z } from 'zod';
import MemoryClient from 'mem0ai';
import { extremeSearchTool } from '@/ai/extreme-search';
import { scira } from '@/ai/providers';
import { getUser } from '@/lib/auth-utils';
import {
  createStreamId,
  getChatById,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveChat,
  saveMessages,
  incrementExtremeSearchUsage,
  incrementMessageUsage,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { SEARCH_LIMITS } from '@/lib/constants';
import { createResumableStreamContext, type ResumableStreamContext } from 'resumable-stream';
import { after } from 'next/server';
import { differenceInSeconds } from 'date-fns';
import { Chat } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { geolocation } from '@vercel/functions';
import { getTweet } from 'react-tweet/api';

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

function getTrailingMessageId({ messages }: { messages: Array<ResponseMessage> }): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
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

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  RUB: '₽',
  KRW: '₩',
  BTC: '₿',
  THB: '฿',
  BRL: 'R$',
  PHP: '₱',
  ILS: '₪',
  TRY: '₺',
  NGN: '₦',
  VND: '₫',
  ARS: '$',
  ZAR: 'R',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  HKD: 'HK$',
  NZD: 'NZ$',
  MXN: 'Mex$',
} as const;

interface GoogleResult {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    viewport: {
      northeast: {
        lat: number;
        lng: number;
      };
      southwest: {
        lat: number;
        lng: number;
      };
    };
  };
  types: string[];
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

interface VideoDetails {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  type?: string;
  provider_name?: string;
  provider_url?: string;
}

interface VideoResult {
  videoId: string;
  url: string;
  details?: VideoDetails;
  captions?: string;
  timestamps?: string[];
  views?: string;
  likes?: string;
  summary?: string;
}

function sanitizeUrl(url: string): string {
  return url.replace(/\s+/g, '%20');
}

async function isValidImageUrl(url: string): Promise<{ valid: boolean; redirectedUrl?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        Accept: 'image/*',
        'User-Agent': 'Mozilla/5.0 (compatible; ImageValidator/1.0)',
      },
      redirect: 'follow', // Ensure redirects are followed
    });

    clearTimeout(timeout);

    // Log response details for debugging
    console.log(
      `Image validation [${url}]: status=${response.status}, content-type=${response.headers.get('content-type')}`,
    );

    // Capture redirected URL if applicable
    const redirectedUrl = response.redirected ? response.url : undefined;

    // Check if we got redirected (for logging purposes)
    if (response.redirected) {
      console.log(`Image was redirected from ${url} to ${redirectedUrl}`);
    }

    // Handle specific response codes
    if (response.status === 404) {
      console.log(`Image not found (404): ${url}`);
      return { valid: false };
    }

    if (response.status === 403) {
      console.log(`Access forbidden (403) - likely CORS issue: ${url}`);

      // Try to use proxy instead of whitelisting domains
      try {
        // Attempt to handle CORS blocked images by trying to access via proxy
        const controller = new AbortController();
        const proxyTimeout = setTimeout(() => controller.abort(), 5000);

        const proxyResponse = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`, {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(proxyTimeout);

        if (proxyResponse.ok) {
          const contentType = proxyResponse.headers.get('content-type');
          const proxyRedirectedUrl = proxyResponse.headers.get('x-final-url') || undefined;

          if (contentType && contentType.startsWith('image/')) {
            console.log(`Proxy validation successful for ${url}`);
            return {
              valid: true,
              redirectedUrl: proxyRedirectedUrl || redirectedUrl,
            };
          }
        }
      } catch (proxyError) {
        console.error(`Proxy validation failed for ${url}:`, proxyError);
      }
      return { valid: false };
    }

    if (response.status >= 400) {
      console.log(`Image request failed with status ${response.status}: ${url}`);
      return { valid: false };
    }

    // Check content type to ensure it's actually an image
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      console.log(`Invalid content type for image: ${contentType}, url: ${url}`);
      return { valid: false };
    }

    return { valid: true, redirectedUrl };
  } catch (error) {
    // Check if error is related to CORS
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (errorMsg.includes('CORS') || errorMsg.includes('blocked by CORS policy')) {
      console.error(`CORS error for ${url}:`, errorMsg);

      // Try to use proxy instead of whitelisting domains
      try {
        // Attempt to handle CORS blocked images by trying to access via proxy
        const controller = new AbortController();
        const proxyTimeout = setTimeout(() => controller.abort(), 5000);

        const proxyResponse = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`, {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(proxyTimeout);

        if (proxyResponse.ok) {
          const contentType = proxyResponse.headers.get('content-type');
          const proxyRedirectedUrl = proxyResponse.headers.get('x-final-url') || undefined;

          if (contentType && contentType.startsWith('image/')) {
            console.log(`Proxy validation successful for ${url}`);
            return { valid: true, redirectedUrl: proxyRedirectedUrl };
          }
        }
      } catch (proxyError) {
        console.error(`Proxy validation failed for ${url}:`, proxyError);
      }
    }

    // Log the specific error
    console.error(`Image validation error for ${url}:`, errorMsg);
    return { valid: false };
  }
}

const extractDomain = (url: string): string => {
  const urlPattern = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/i;
  return url.match(urlPattern)?.[1] || url;
};

const deduplicateByDomainAndUrl = <T extends { url: string }>(items: T[]): T[] => {
  const seenDomains = new Set<string>();
  const seenUrls = new Set<string>();

  return items.filter((item) => {
    const domain = extractDomain(item.url);
    const isNewUrl = !seenUrls.has(item.url);
    const isNewDomain = !seenDomains.has(domain);

    if (isNewUrl && isNewDomain) {
      seenUrls.add(item.url);
      seenDomains.add(domain);
      return true;
    }
    return false;
  });
};

// Initialize Exa client
const exa = new Exa(serverEnv.EXA_API_KEY);

export async function POST(req: Request) {
  const { messages, model, group, timezone, id, selectedVisibilityType } = await req.json();
  const { latitude, longitude } = geolocation(req);

  console.log('--------------------------------');
  console.log('Location: ', latitude, longitude);
  console.log('--------------------------------');

  console.log('--------------------------------');
  console.log('Messages: ', messages);
  console.log('--------------------------------');

  const user = await getUser();
  const streamId = 'stream-' + uuidv4();

  if (!user) {
    console.log('User not found');
  }

  // Check if model requires authentication
  const authRequiredModels = ['scira-anthropic', 'scira-google'];
  if (authRequiredModels.includes(model) && !user) {
    return new ChatSDKError('unauthorized:model', `Authentication required to access ${model}`).toResponse();
  }

  // Check message count limit for non-pro users
  if (user) {
    const [messageCountResult, subscriptionResult, extremeSearchUsage] = await Promise.all([
      getUserMessageCount(), // Check daily message count (deletion-proof tracking)
      getSubDetails(),
      getExtremeSearchUsageCount(),
    ]);

    if (messageCountResult.error) {
      console.error('Error getting message count:', messageCountResult.error);
      return new ChatSDKError('bad_request:api', 'Failed to verify usage limits').toResponse();
    }

    const isProUser = subscriptionResult.hasSubscription && subscriptionResult.subscription?.status === 'active';

    // Check if model requires Pro subscription
    const proRequiredModels = [
      'scira-grok-3',
      'scira-anthropic',
      'scira-anthropic-thinking',
      'scira-opus',
      'scira-opus-pro',
      'scira-google',
      'scira-google-pro',
    ];

    if (proRequiredModels.includes(model) && !isProUser) {
      return new ChatSDKError('upgrade_required:model', `${model} requires a Pro subscription`).toResponse();
    }

    // Check if user should bypass limits for free unlimited models
    const freeUnlimitedModels = ['scira-default', 'scira-vision'];
    const shouldBypassLimits = freeUnlimitedModels.includes(model);

    if (!isProUser && !shouldBypassLimits && messageCountResult.count >= SEARCH_LIMITS.DAILY_SEARCH_LIMIT) {
      return new ChatSDKError(
        'upgrade_required:chat',
        `Daily search limit of ${SEARCH_LIMITS.DAILY_SEARCH_LIMIT} exceeded`,
      ).toResponse();
    }

    // Check extreme search usage limit for non-pro users
    if (!isProUser && group === 'extreme') {
      if (extremeSearchUsage.count >= SEARCH_LIMITS.EXTREME_SEARCH_LIMIT) {
        return new ChatSDKError(
          'upgrade_required:api',
          `Daily extreme search limit of ${SEARCH_LIMITS.EXTREME_SEARCH_LIMIT} exceeded`,
        ).toResponse();
      }
    }
  }

  const { tools: activeTools, instructions } = await getGroupConfig(group);

  if (user) {
    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: messages[messages.length - 1],
      });

      console.log('--------------------------------');
      console.log('Title: ', title);
      console.log('--------------------------------');

      await saveChat({
        id,
        userId: user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== user.id) {
        return new ChatSDKError('forbidden:chat', 'This chat belongs to another user').toResponse();
      }
    }

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



    console.log('--------------------------------');
    console.log('Messages saved: ', messages);
    console.log('--------------------------------');

    await createStreamId({ streamId, chatId: id });
  }

  console.log('--------------------------------');
  console.log('Messages: ', messages);
  console.log('--------------------------------');
  console.log('Running with model: ', model.trim());
  console.log('Group: ', group);
  console.log('Timezone: ', timezone);

  const stream = createDataStream({
    execute: async (dataStream) => {
      const result = streamText({
        model: scira.languageModel(model),
        messages: convertToCoreMessages(messages),
        ...(model.includes('scira-qwq') || model.includes('scira-qwen-32b')
          ? {
            temperature: 0.6,
            topP: 0.95,
          }
          : {
            temperature: 0,
          }),
        maxSteps: 5,
        maxRetries: 5,
        experimental_activeTools: [...activeTools],
        system: instructions + `\n\nThe user's location is ${latitude}, ${longitude}.`,
        toolChoice: 'auto',
        providerOptions: {
          google: {
            thinkingConfig: {
              includeThoughts: true,
              thinkingBudget: 10000,
            },
          },
          openai: {
            ...(model === 'scira-o4-mini' || model === 'scira-o3'
              ? {
                reasoningEffort: 'medium',
                strictSchemas: true,
                reasoningSummary: 'detailed',
              }
              : {}),
            ...(model === 'scira-4o-mini'
              ? {
                parallelToolCalls: false,
                strictSchemas: true,
              }
              : {}),
          } as OpenAIResponsesProviderOptions,
          xai: {
            ...(model === 'scira-default'
              ? {
                reasoningEffort: 'high',
              }
              : {}),
          },
          anthropic: {
            ...(model === 'scira-anthropic-thinking' || model === 'scira-opus-pro'
              ? {
                thinking: { type: 'enabled', budgetTokens: 12000 },
              }
              : {}),
          },
        },
        tools: {
          stock_chart: tool({
            description: 'Get stock data and news for given stock symbols.',
            parameters: z.object({
              title: z.string().describe('The title of the chart.'),
              news_queries: z.array(z.string()).describe('The news queries to search for.'),
              icon: z.enum(['stock', 'date', 'calculation', 'default']).describe('The icon to display for the chart.'),
              stock_symbols: z.array(z.string()).describe('The stock symbols to display for the chart.'),
              currency_symbols: z
                .array(z.string())
                .describe(
                  'The currency symbols for each stock/asset in the chart. Available symbols: ' +
                  Object.keys(CURRENCY_SYMBOLS).join(', ') +
                  '. Defaults to USD if not provided.',
                ),
              interval: z
                .enum(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'])
                .describe('The interval of the chart. default is 1y.'),
            }),
            execute: async ({
              title,
              icon,
              stock_symbols,
              currency_symbols,
              interval,
              news_queries,
            }: {
              title: string;
              icon: string;
              stock_symbols: string[];
              currency_symbols?: string[];
              interval: string;
              news_queries: string[];
            }) => {
              console.log('Title:', title);
              console.log('Icon:', icon);
              console.log('Stock symbols:', stock_symbols);
              console.log('Currency symbols:', currency_symbols);
              console.log('Interval:', interval);
              console.log('News queries:', news_queries);

              // Format currency symbols with actual symbols
              const formattedCurrencySymbols = (currency_symbols || stock_symbols.map(() => 'USD')).map((currency) => {
                const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS];
                return symbol || currency; // Fallback to currency code if symbol not found
              });

              interface NewsResult {
                title: string;
                url: string;
                content: string;
                published_date?: string;
                category: string;
                query: string;
              }

              interface NewsGroup {
                query: string;
                topic: string;
                results: NewsResult[];
              }

              let news_results: NewsGroup[] = [];

              const tvly = tavily({ apiKey: serverEnv.TAVILY_API_KEY });

              // Gather all news search promises to execute in parallel
              const searchPromises = [];
              for (const query of news_queries) {
                // Add finance and news topic searches for each query
                searchPromises.push({
                  query,
                  topic: 'finance',
                  promise: tvly.search(query, {
                    topic: 'finance',
                    days: 7,
                    maxResults: 3,
                    searchDepth: 'advanced',
                  }),
                });

                searchPromises.push({
                  query,
                  topic: 'news',
                  promise: tvly.search(query, {
                    topic: 'news',
                    days: 7,
                    maxResults: 3,
                    searchDepth: 'advanced',
                  }),
                });
              }

              // Execute all searches in parallel
              const searchResults = await Promise.all(
                searchPromises.map(({ promise }) =>
                  promise.catch((err) => ({
                    results: [],
                    error: err.message,
                  })),
                ),
              );

              // Process results and deduplicate
              const urlSet = new Set();
              searchPromises.forEach(({ query, topic }, index) => {
                const result = searchResults[index];
                if (!result.results) return;

                const processedResults = result.results
                  .filter((item) => {
                    // Skip if we've already included this URL
                    if (urlSet.has(item.url)) return false;
                    urlSet.add(item.url);
                    return true;
                  })
                  .map((item) => ({
                    title: item.title,
                    url: item.url,
                    content: item.content.slice(0, 30000),
                    published_date: item.publishedDate,
                    category: topic,
                    query: query,
                  }));

                if (processedResults.length > 0) {
                  news_results.push({
                    query,
                    topic,
                    results: processedResults,
                  });
                }
              });

              // Perform Exa search for financial reports
              const exaResults: NewsGroup[] = [];
              try {
                // Run Exa search for each stock symbol
                const exaSearchPromises = stock_symbols.map((symbol) =>
                  exa
                    .searchAndContents(`${symbol} financial report analysis`, {
                      text: true,
                      category: 'financial report',
                      livecrawl: 'always',
                      type: 'auto',
                      numResults: 10,
                      summary: {
                        query: 'all important information relevent to the important for investors',
                      },
                    })
                    .catch((error) => {
                      console.error(`Exa search error for ${symbol}:`, error);
                      return { results: [] };
                    }),
                );

                const exaSearchResults = await Promise.all(exaSearchPromises);

                // Process Exa results
                const exaUrlSet = new Set();
                exaSearchResults.forEach((result, index) => {
                  if (!result.results || result.results.length === 0) return;

                  const stockSymbol = stock_symbols[index];
                  const processedResults = result.results
                    .filter((item) => {
                      if (exaUrlSet.has(item.url)) return false;
                      exaUrlSet.add(item.url);
                      return true;
                    })
                    .map((item) => ({
                      title: item.title || '',
                      url: item.url,
                      content: item.summary || '',
                      published_date: item.publishedDate,
                      category: 'financial',
                      query: stockSymbol,
                    }));

                  if (processedResults.length > 0) {
                    exaResults.push({
                      query: stockSymbol,
                      topic: 'financial',
                      results: processedResults,
                    });
                  }
                });

                // Complete missing titles for financial reports
                for (const group of exaResults) {
                  for (let i = 0; i < group.results.length; i++) {
                    const result = group.results[i];
                    if (!result.title || result.title.trim() === '') {
                      try {
                        const { object } = await generateObject({
                          model: scira.languageModel('scira-g2'),
                          prompt: `Complete the following financial report with an appropriate title. The report is about ${group.query
                            } and contains this content: ${result.content.substring(0, 500)}...`,
                          schema: z.object({
                            title: z.string().describe('A descriptive title for the financial report'),
                          }),
                        });
                        group.results[i].title = object.title;
                      } catch (error) {
                        console.error(`Error generating title for ${group.query} report:`, error);
                        group.results[i].title = `${group.query} Financial Report`;
                      }
                    }
                  }
                }

                // Merge Exa results with news results
                news_results = [...news_results, ...exaResults];
              } catch (error) {
                console.error('Error fetching Exa financial reports:', error);
              }

              const code = `
import yfinance as yf
import matplotlib.pyplot as plt
import pandas as pd
from datetime import datetime

${stock_symbols
                  .map(
                    (symbol) =>
                      `${symbol.toLowerCase().replace('.', '')} = yf.download('${symbol}', period='${interval}', interval='1d')`,
                  )
                  .join('\n')}

# Create the plot
plt.figure(figsize=(10, 6))
${stock_symbols
                  .map(
                    (symbol) => `
# Convert datetime64 index to strings to make it serializable
${symbol.toLowerCase().replace('.', '')}.index = ${symbol.toLowerCase().replace('.', '')}.index.strftime('%Y-%m-%d')
plt.plot(${symbol.toLowerCase().replace('.', '')}.index, ${symbol
                        .toLowerCase()
                        .replace('.', '')}['Close'], label='${symbol} ${formattedCurrencySymbols[stock_symbols.indexOf(symbol)]
                      }', color='blue')
`,
                  )
                  .join('\n')}

# Customize the chart
plt.title('${title}')
plt.xlabel('Date')
plt.ylabel('Closing Price')
plt.legend()
plt.grid(True)
plt.show()`;

              console.log('Code:', code);

              const daytona = new Daytona({
                apiKey: serverEnv.DAYTONA_API_KEY,
                target: 'us',
              });
              const sandbox = await daytona.create({
                image: 'scira-analysis:1749316515',
                language: 'python',
                resources: {
                  cpu: 2,
                  memory: 5,
                  disk: 10,
                },
                autoStopInterval: 0,
              });

              const execution = await sandbox.process.codeRun(code);
              let message = '';

              if (execution.result === execution.artifacts?.stdout) {
                message += execution.result;
              } else if (execution.result && execution.result !== execution.artifacts?.stdout) {
                message += execution.result;
              } else if (execution.artifacts?.stdout && execution.artifacts?.stdout !== execution.result) {
                message += execution.artifacts.stdout;
              } else {
                message += execution.result;
              }

              console.log('execution exit code: ', execution.exitCode);
              console.log('execution result: ', execution.result);

              console.log('Chart details: ', execution.artifacts?.charts);
              if (execution.artifacts?.charts) {
                console.log('showing chart');
                execution.artifacts.charts[0].elements.map((element: any) => {
                  console.log(element.points);
                });
              }

              if (execution.artifacts?.charts === undefined) {
                console.log('No chart found');
              }

              await sandbox.delete();

              // map the chart to the correct format for the frontend and remove the png property
              const chart = execution.artifacts?.charts?.[0] ?? undefined;
              const chartData = chart
                ? {
                  type: chart.type,
                  title: chart.title,
                  elements: chart.elements,
                  png: undefined,
                }
                : undefined;

              return {
                message: message.trim(),
                chart: chartData,
                currency_symbols: formattedCurrencySymbols,
                news_results: news_results,
              };
            },
          }),
          currency_converter: tool({
            description: 'Convert currency from one to another using yfinance',
            parameters: z.object({
              from: z.string().describe('The source currency code.'),
              to: z.string().describe('The target currency code.'),
              amount: z.number().describe('The amount to convert. Default is 1.'),
            }),
            execute: async ({ from, to, amount }: { from: string; to: string; amount: number }) => {
              const code = `
import yfinance as yf

# Get exchange rates for both directions
from_currency = '${from}'
to_currency = '${to}'
amount = ${amount}

# Forward conversion (from -> to)
currency_pair_forward = f'{from_currency}{to_currency}=X'
data_forward = yf.Ticker(currency_pair_forward).history(period='1d')
rate_forward = data_forward['Close'].iloc[-1]
converted_amount = rate_forward * amount

# Reverse conversion (to -> from)
currency_pair_reverse = f'{to_currency}{from_currency}=X'
data_reverse = yf.Ticker(currency_pair_reverse).history(period='1d')
rate_reverse = data_reverse['Close'].iloc[-1]

print(f"Forward rate: {rate_forward}")
print(f"Reverse rate: {rate_reverse}")
print(f"Converted amount: {converted_amount}")
`;
              console.log('Currency pair:', from, to);

              const daytona = new Daytona({
                apiKey: serverEnv.DAYTONA_API_KEY,
                target: 'us',
              });
              const sandbox = await daytona.create({
                image: 'scira-analysis:1749316515',
                language: 'python',
                resources: {
                  cpu: 2,
                  memory: 5,
                  disk: 10,
                },
                autoStopInterval: 0,
              });

              const execution = await sandbox.process.codeRun(code);
              let message = '';

              if (execution.result === execution.artifacts?.stdout) {
                message += execution.result;
              } else if (execution.result && execution.result !== execution.artifacts?.stdout) {
                message += execution.result;
              } else if (execution.artifacts?.stdout && execution.artifacts?.stdout !== execution.result) {
                message += execution.artifacts.stdout;
              } else {
                message += execution.result;
              }

              await sandbox.delete();

              // Parse the output to extract rates
              const lines = message.split('\n');
              let forwardRate = null;
              let reverseRate = null;
              let convertedAmount = null;

              for (const line of lines) {
                if (line.includes('Forward rate:')) {
                  forwardRate = parseFloat(line.split(': ')[1]);
                }
                if (line.includes('Reverse rate:')) {
                  reverseRate = parseFloat(line.split(': ')[1]);
                }
                if (line.includes('Converted amount:')) {
                  convertedAmount = parseFloat(line.split(': ')[1]);
                }
              }

              return {
                rate: convertedAmount || message.trim(),
                forwardRate: forwardRate,
                reverseRate: reverseRate,
                fromCurrency: from,
                toCurrency: to,
                amount: amount,
                convertedAmount: convertedAmount,
              };
            },
          }),
          x_search: tool({
            description: 'Search X (formerly Twitter) posts using xAI Live Search.',
            parameters: z.object({
              query: z.string().describe('The search query for X posts').nullable(),
              startDate: z
                .string()
                .nullable()
                .describe(
                  'The start date of the search in the format YYYY-MM-DD (default to 7 days ago if not specified)',
                ),
              endDate: z
                .string()
                .nullable()
                .describe('The end date of the search in the format YYYY-MM-DD (default to today if not specified)'),
              xHandles: z
                .array(z.string())
                .nullable()
                .describe(
                  'Optional list of X handles/usernames to search from (without @ symbol). Only include if user explicitly mentions specific handles like "@elonmusk" or "@openai"',
                ),
              maxResults: z.number().nullable().describe('Maximum number of search results to return (default 15)'),
            }),
            execute: async ({
              query,
              startDate,
              endDate,
              xHandles,
              maxResults = 15,
            }: {
              query: string | null;
              startDate: string | null;
              endDate: string | null;
              xHandles: string[] | null;
              maxResults: number | null;
            }) => {
              try {
                const searchParameters: any = {
                  mode: 'on',
                  ...(startDate && { from_date: startDate }),
                  ...(endDate && { to_date: endDate }),
                  ...(maxResults && { max_search_results: maxResults }),
                  return_citations: true,
                  sources: [
                    xHandles && xHandles.length > 0
                      ? { type: 'x', x_handles: xHandles, safe_search: false }
                      : { type: 'x', safe_search: false },
                  ],
                };

                console.log('[X search parameters]: ', searchParameters);
                console.log('[X search handles]: ', xHandles);

                const response = await fetch('https://api.x.ai/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${serverEnv.XAI_API_KEY}`,
                  },
                  body: JSON.stringify({
                    model: 'grok-3-latest',
                    messages: [
                      {
                        role: 'system',
                        content: `You are a helpful assistant that searches for X posts and returns the results in a structured format. You will be given a search query and a list of X handles to search from. You will then search for the posts and return the results in a structured format. You will also cite the sources in the format [Source No.]. Go very deep in the search and return the most relevant results.`,
                      },
                      {
                        role: 'user',
                        content: `${query}`,
                      },
                    ],
                    search_parameters: searchParameters,
                  }),
                });

                if (!response.ok) {
                  throw new Error(`xAI API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                console.log('[X search data]: ', data);

                // Transform citations into sources with tweet text
                const sources = [];
                const citations = data.citations || [];

                if (citations.length > 0) {
                  // Extract tweet IDs and fetch tweet data using react-tweet
                  const tweetFetchPromises = citations
                    .filter((url: any) => typeof url === 'string' && url.includes('x.com'))
                    .map(async (url: string) => {
                      try {
                        // Extract tweet ID from URL
                        const match = url.match(/\/status\/(\d+)/);
                        if (!match) return null;

                        const tweetId = match[1];

                        // Fetch tweet data using react-tweet API
                        const tweetData = await getTweet(tweetId);
                        if (!tweetData) return null;

                        const text = tweetData.text;
                        if (!text) return null;

                        return {
                          text: text,
                          link: url,
                        };
                      } catch (error) {
                        console.error(`Error fetching tweet data for ${url}:`, error);
                        return null;
                      }
                    });

                  // Wait for all tweet fetches to complete
                  const tweetResults = await Promise.all(tweetFetchPromises);

                  // Filter out null results and add to sources
                  sources.push(...tweetResults.filter((result) => result !== null));
                }

                return {
                  content: data.choices[0]?.message?.content || '',
                  citations: citations,
                  sources: sources,
                  query,
                  dateRange: `${startDate} to ${endDate}`,
                  handles: xHandles || [],
                };
              } catch (error) {
                console.error('X search error:', error);
                throw error;
              }
            },
          }),
          text_translate: tool({
            description: 'Translate text from one language to another.',
            parameters: z.object({
              text: z.string().describe('The text to translate.'),
              to: z.string().describe('The language to translate to (e.g., French).'),
            }),
            execute: async ({ text, to }: { text: string; to: string }) => {
              const { object: translation } = await generateObject({
                model: scira.languageModel(model),
                system: `You are a helpful assistant that translates text from one language to another.`,
                prompt: `Translate the following text to ${to} language: ${text}`,
                schema: z.object({
                  translatedText: z.string(),
                  detectedLanguage: z.string(),
                }),
              });
              console.log(translation);
              return {
                translatedText: translation.translatedText,
                detectedLanguage: translation.detectedLanguage,
              };
            },
          }),
          web_search: tool({
            description: 'Search the web for information with 5-10 queries, max results and search depth.',
            parameters: z.object({
              queries: z.array(
                z.string().describe('Array of search queries to look up on the web. Default is 5 to 10 queries.'),
              ),
              maxResults: z.array(
                z.number().describe('Array of maximum number of results to return per query. Default is 10.'),
              ),
              topics: z.array(
                z
                  .enum(['general', 'news', 'finance'])
                  .describe('Array of topic types to search for. Default is general.'),
              ),
              searchDepth: z.array(
                z
                  .enum(['basic', 'advanced'])
                  .describe('Array of search depths to use. Default is basic. Use advanced for more detailed results.'),
              ),
              include_domains: z
                .array(z.string())
                .describe('A list of domains to include in all search results. Default is an empty list.'),
              exclude_domains: z
                .array(z.string())
                .describe('A list of domains to exclude from all search results. Default is an empty list.'),
            }),
            execute: async ({
              queries,
              maxResults,
              topics,
              searchDepth,
              include_domains,
              exclude_domains,
            }: {
              queries: string[];
              maxResults: number[];
              topics: ('general' | 'news' | 'finance')[];
              searchDepth: ('basic' | 'advanced')[];
              include_domains?: string[];
              exclude_domains?: string[];
            }) => {
              const apiKey = serverEnv.TAVILY_API_KEY;
              const tvly = tavily({ apiKey });
              const includeImageDescriptions = true;

              console.log('Queries:', queries);
              console.log('Max Results:', maxResults);
              console.log('Topics:', topics);
              console.log('Search Depths:', searchDepth);
              console.log('Include Domains:', include_domains);
              console.log('Exclude Domains:', exclude_domains);

              // Execute searches in parallel
              const searchPromises = queries.map(async (query, index) => {
                const data = await tvly.search(query, {
                  topic: topics[index] || topics[0] || 'general',
                  days: topics[index] === 'news' ? 7 : undefined,
                  maxResults: maxResults[index] || maxResults[0] || 10,
                  searchDepth: searchDepth[index] || searchDepth[0] || 'basic',
                  includeAnswer: true,
                  includeImages: true,
                  includeImageDescriptions: includeImageDescriptions,
                  excludeDomains: exclude_domains || undefined,
                  includeDomains: include_domains || undefined,
                });

                // Add annotation for query completion
                dataStream.writeMessageAnnotation({
                  type: 'query_completion',
                  data: {
                    query,
                    index,
                    total: queries.length,
                    status: 'completed',
                    resultsCount: data.results.length,
                    imagesCount: data.images.length,
                  },
                });

                return {
                  query,
                  results: deduplicateByDomainAndUrl(data.results).map((obj: any) => ({
                    url: obj.url,
                    title: obj.title,
                    content: obj.content,
                    published_date: topics[index] === 'news' ? obj.published_date : undefined,
                  })),
                  images: includeImageDescriptions
                    ? await Promise.all(
                      deduplicateByDomainAndUrl(data.images).map(
                        async ({ url, description }: { url: string; description?: string }) => {
                          const sanitizedUrl = sanitizeUrl(url);
                          const imageValidation = await isValidImageUrl(sanitizedUrl);
                          return imageValidation.valid
                            ? {
                              url: imageValidation.redirectedUrl || sanitizedUrl,
                              description: description ?? '',
                            }
                            : null;
                        },
                      ),
                    ).then((results) =>
                      results.filter(
                        (image): image is { url: string; description: string } =>
                          image !== null &&
                          typeof image === 'object' &&
                          typeof image.description === 'string' &&
                          image.description !== '',
                      ),
                    )
                    : await Promise.all(
                      deduplicateByDomainAndUrl(data.images).map(async ({ url }: { url: string }) => {
                        const sanitizedUrl = sanitizeUrl(url);
                        const imageValidation = await isValidImageUrl(sanitizedUrl);
                        return imageValidation.valid ? imageValidation.redirectedUrl || sanitizedUrl : null;
                      }),
                    ).then((results) => results.filter((url) => url !== null) as string[]),
                };
              });

              const searchResults = await Promise.all(searchPromises);

              return {
                searches: searchResults,
              };
            },
          }),
          movie_or_tv_search: tool({
            description: 'Search for a movie or TV show using TMDB API',
            parameters: z.object({
              query: z.string().describe('The search query for movies/TV shows'),
            }),
            execute: async ({ query }: { query: string }) => {
              const TMDB_API_KEY = serverEnv.TMDB_API_KEY;
              const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

              try {
                // First do a multi-search to get the top result
                const searchResponse = await fetch(
                  `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(
                    query,
                  )}&language=en-US&page=1&include_adult=false`,
                  {
                    method: 'GET',
                    headers: {
                      Authorization: `Bearer ${TMDB_API_KEY}`,
                      accept: 'application/json',
                    },
                  },
                );

                // catch error if the response is not ok
                if (!searchResponse.ok) {
                  console.error('TMDB search error:', searchResponse.statusText);
                  return { result: null };
                }

                const searchResults = await searchResponse.json();

                // Get the first movie or TV show result
                const firstResult = searchResults.results.find(
                  (result: any) => result.media_type === 'movie' || result.media_type === 'tv',
                );

                if (!firstResult) {
                  return { result: null };
                }

                // Get detailed information for the media
                const detailsResponse = await fetch(
                  `${TMDB_BASE_URL}/${firstResult.media_type}/${firstResult.id}?language=en-US`,
                  {
                    headers: {
                      Authorization: `Bearer ${TMDB_API_KEY}`,
                      accept: 'application/json',
                    },
                  },
                );

                const details = await detailsResponse.json();

                // Get additional credits information
                const creditsResponse = await fetch(
                  `${TMDB_BASE_URL}/${firstResult.media_type}/${firstResult.id}/credits?language=en-US`,
                  {
                    headers: {
                      Authorization: `Bearer ${TMDB_API_KEY}`,
                      accept: 'application/json',
                    },
                  },
                );

                const credits = await creditsResponse.json();

                // Format the result
                const result = {
                  ...details,
                  media_type: firstResult.media_type,
                  credits: {
                    cast:
                      credits.cast?.slice(0, 8).map((person: any) => ({
                        ...person,
                        profile_path: person.profile_path
                          ? `https://image.tmdb.org/t/p/original${person.profile_path}`
                          : null,
                      })) || [],
                    director: credits.crew?.find((person: any) => person.job === 'Director')?.name,
                    writer: credits.crew?.find((person: any) => person.job === 'Screenplay' || person.job === 'Writer')
                      ?.name,
                  },
                  poster_path: details.poster_path ? `https://image.tmdb.org/t/p/original${details.poster_path}` : null,
                  backdrop_path: details.backdrop_path
                    ? `https://image.tmdb.org/t/p/original${details.backdrop_path}`
                    : null,
                };

                return { result };
              } catch (error) {
                console.error('TMDB search error:', error);
                throw error;
              }
            },
          }),
          trending_movies: tool({
            description: 'Get trending movies from TMDB',
            parameters: z.object({}),
            execute: async () => {
              const TMDB_API_KEY = serverEnv.TMDB_API_KEY;
              const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

              try {
                const response = await fetch(`${TMDB_BASE_URL}/trending/movie/day?language=en-US`, {
                  headers: {
                    Authorization: `Bearer ${TMDB_API_KEY}`,
                    accept: 'application/json',
                  },
                });

                const data = await response.json();
                const results = data.results.map((movie: any) => ({
                  ...movie,
                  poster_path: movie.poster_path ? `https://image.tmdb.org/t/p/original${movie.poster_path}` : null,
                  backdrop_path: movie.backdrop_path
                    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
                    : null,
                }));

                return { results };
              } catch (error) {
                console.error('Trending movies error:', error);
                throw error;
              }
            },
          }),
          trending_tv: tool({
            description: 'Get trending TV shows from TMDB',
            parameters: z.object({}),
            execute: async () => {
              const TMDB_API_KEY = serverEnv.TMDB_API_KEY;
              const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

              try {
                const response = await fetch(`${TMDB_BASE_URL}/trending/tv/day?language=en-US`, {
                  headers: {
                    Authorization: `Bearer ${TMDB_API_KEY}`,
                    accept: 'application/json',
                  },
                });

                const data = await response.json();
                const results = data.results.map((show: any) => ({
                  ...show,
                  poster_path: show.poster_path ? `https://image.tmdb.org/t/p/original${show.poster_path}` : null,
                  backdrop_path: show.backdrop_path ? `https://image.tmdb.org/t/p/original${show.backdrop_path}` : null,
                }));

                return { results };
              } catch (error) {
                console.error('Trending TV shows error:', error);
                throw error;
              }
            },
          }),
          academic_search: tool({
            description: 'Search academic papers and research.',
            parameters: z.object({
              query: z.string().describe('The search query'),
            }),
            execute: async ({ query }: { query: string }) => {
              try {
                const exa = new Exa(serverEnv.EXA_API_KEY as string);

                // Search academic papers with content summary
                const result = await exa.searchAndContents(query, {
                  type: 'auto',
                  numResults: 20,
                  category: 'research paper',
                  summary: {
                    query: 'Abstract of the Paper',
                  },
                });

                // Process and clean results
                const processedResults = result.results.reduce<typeof result.results>((acc, paper) => {
                  // Skip if URL already exists or if no summary available
                  if (acc.some((p) => p.url === paper.url) || !paper.summary) return acc;

                  // Clean up summary (remove "Summary:" prefix if exists)
                  const cleanSummary = paper.summary.replace(/^Summary:\s*/i, '');

                  // Clean up title (remove [...] suffixes)
                  const cleanTitle = paper.title?.replace(/\s\[.*?\]$/, '');

                  acc.push({
                    ...paper,
                    title: cleanTitle || '',
                    summary: cleanSummary,
                  });

                  return acc;
                }, []);

                return {
                  results: processedResults,
                };
              } catch (error) {
                console.error('Academic search error:', error);
                throw error;
              }
            },
          }),
          youtube_search: tool({
            description: 'Search YouTube videos using Exa AI and get detailed video information.',
            parameters: z.object({
              query: z.string().describe('The search query for YouTube videos'),
            }),
            execute: async ({ query }: { query: string }) => {
              try {
                const exa = new Exa(serverEnv.EXA_API_KEY as string);

                // Simple search to get YouTube URLs only
                const searchResult = await exa.search(query, {
                  type: 'keyword',
                  numResults: 10,
                  includeDomains: ['youtube.com'],
                });

                // Process results
                const processedResults = await Promise.all(
                  searchResult.results.map(async (result): Promise<VideoResult | null> => {
                    const videoIdMatch = result.url.match(
                      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
                    );
                    const videoId = videoIdMatch?.[1];

                    if (!videoId) return null;

                    // Base result
                    const baseResult: VideoResult = {
                      videoId,
                      url: result.url,
                    };

                    try {
                      // Fetch detailed info from our endpoints
                      const [detailsResponse, captionsResponse, timestampsResponse] = await Promise.all([
                        fetch(`${serverEnv.YT_ENDPOINT}/video-data`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            url: result.url,
                          }),
                        }).then((res) => (res.ok ? res.json() : null)),
                        fetch(`${serverEnv.YT_ENDPOINT}/video-captions`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            url: result.url,
                          }),
                        }).then((res) => (res.ok ? res.text() : null)),
                        fetch(`${serverEnv.YT_ENDPOINT}/video-timestamps`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            url: result.url,
                          }),
                        }).then((res) => (res.ok ? res.json() : null)),
                      ]);

                      // Return combined data
                      return {
                        ...baseResult,
                        details: detailsResponse || undefined,
                        captions: captionsResponse || undefined,
                        timestamps: timestampsResponse || undefined,
                      };
                    } catch (error) {
                      console.error(`Error fetching details for video ${videoId}:`, error);
                      return baseResult;
                    }
                  }),
                );

                // Filter out null results
                const validResults = processedResults.filter((result): result is VideoResult => result !== null);

                return {
                  results: validResults,
                };
              } catch (error) {
                console.error('YouTube search error:', error);
                throw error;
              }
            },
          }),
          retrieve: tool({
            description:
              'Retrieve the full content from a URL using Exa AI, including text, title, summary, images, and more.',
            parameters: z.object({
              url: z.string().describe('The URL to retrieve the information from.'),
              include_summary: z.boolean().describe('Whether to include a summary of the content. Default is true.'),
              live_crawl: z
                .enum(['never', 'auto', 'always'])
                .describe('Whether to crawl the page immediately. Options: never, auto, always. Default is "always".'),
            }),
            execute: async ({
              url,
              include_summary = true,
              live_crawl = 'always',
            }: {
              url: string;
              include_summary?: boolean;
              live_crawl?: 'never' | 'auto' | 'always';
            }) => {
              try {
                const exa = new Exa(serverEnv.EXA_API_KEY as string);

                console.log(
                  `Retrieving content from ${url} with Exa AI, summary: ${include_summary}, livecrawl: ${live_crawl}`,
                );

                const start = Date.now();

                const result = await exa.getContents([url], {
                  text: true,
                  summary: include_summary ? true : undefined,
                  livecrawl: live_crawl,
                });

                // Check if there are results
                if (!result.results || result.results.length === 0) {
                  console.error('Exa AI error: No content retrieved');
                  return { error: 'Failed to retrieve content', results: [] };
                }

                return {
                  base_url: url,
                  results: result.results.map((item) => {
                    // Type assertion to access potentially missing properties
                    const typedItem = item as any;
                    return {
                      url: item.url,
                      content: typedItem.text || typedItem.summary || '',
                      title: typedItem.title || item.url.split('/').pop() || 'Retrieved Content',
                      description: typedItem.summary || `Content retrieved from ${item.url}`,
                      author: typedItem.author || undefined,
                      publishedDate: typedItem.publishedDate || undefined,
                      image: typedItem.image || undefined,
                      favicon: typedItem.favicon || undefined,
                      language: 'en',
                    };
                  }),
                  response_time: (Date.now() - start) / 1000,
                };
              } catch (error) {
                console.error('Exa AI error:', error);
                return { error: error instanceof Error ? error.message : 'Failed to retrieve content', results: [] };
              }
            },
          }),
          get_weather_data: tool({
            description:
              'Get the weather data for a location using either location name or coordinates with OpenWeather API.',
            parameters: z.object({
              location: z
                .string()
                .nullable()
                .describe(
                  'The name of the location to get weather data for (e.g., "London", "New York", "Tokyo"). Required if latitude and longitude are not provided.',
                ),
              latitude: z
                .number()
                .nullable()
                .describe('The latitude coordinate. Required if location is not provided.'),
              longitude: z
                .number()
                .nullable()
                .describe('The longitude coordinate. Required if location is not provided.'),
            }),
            execute: async ({
              location,
              latitude,
              longitude,
            }: {
              location?: string | null;
              latitude?: number | null;
              longitude?: number | null;
            }) => {
              try {
                let lat = latitude;
                let lng = longitude;
                let locationName = location;
                let country: string | undefined;
                let timezone: string | undefined;

                // Validate input parameters
                if (!location && (!latitude || !longitude)) {
                  throw new Error('Either location name or both latitude and longitude coordinates must be provided');
                }

                // Step 1: Get coordinates if not provided
                if (!lat || !lng) {
                  if (!location) {
                    throw new Error('Location name is required when coordinates are not provided');
                  }

                  // Geocode the location name using Open Meteo API
                  const geocodingResponse = await fetch(
                    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
                      location,
                    )}&count=1&language=en&format=json`,
                  );

                  const geocodingData = await geocodingResponse.json();

                  if (!geocodingData.results || geocodingData.results.length === 0) {
                    throw new Error(`Location '${location}' not found`);
                  }

                  const geocodingResult = geocodingData.results[0];
                  lat = geocodingResult.latitude;
                  lng = geocodingResult.longitude;
                  locationName = geocodingResult.name;
                  country = geocodingResult.country;
                  timezone = geocodingResult.timezone;
                } else {
                  // If coordinates are provided but no location name, try reverse geocoding
                  if (!location) {
                    try {
                      const reverseGeocodeResponse = await fetch(
                        `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lng}&limit=1&appid=${serverEnv.OPENWEATHER_API_KEY}`,
                      );
                      const reverseGeocodeData = await reverseGeocodeResponse.json();

                      if (reverseGeocodeData && reverseGeocodeData.length > 0) {
                        locationName = reverseGeocodeData[0].name;
                        country = reverseGeocodeData[0].country;
                      } else {
                        locationName = `${lat}, ${lng}`;
                      }
                    } catch (reverseGeocodeError) {
                      console.warn('Reverse geocoding failed:', reverseGeocodeError);
                      locationName = `${lat}, ${lng}`;
                    }
                  }
                }

                console.log('Latitude:', lat);
                console.log('Longitude:', lng);
                console.log('Location:', locationName);

                // Step 2: Fetch weather data using OpenWeather API with the coordinates
                const apiKey = serverEnv.OPENWEATHER_API_KEY;
                const [weatherResponse, airPollutionResponse, dailyForecastResponse] = await Promise.all([
                  fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}`),
                  fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${apiKey}`),
                  fetch(
                    `https://api.openweathermap.org/data/2.5/forecast/daily?lat=${lat}&lon=${lng}&cnt=16&appid=${apiKey}`,
                  ),
                ]);

                const [weatherData, airPollutionData, dailyForecastData] = await Promise.all([
                  weatherResponse.json(),
                  airPollutionResponse.json(),
                  dailyForecastResponse.json().catch((error) => {
                    console.error('Daily forecast API error:', error);
                    return { list: [] }; // Return empty data if API fails
                  }),
                ]);

                // Step 3: Fetch air pollution forecast
                const airPollutionForecastResponse = await fetch(
                  `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}`,
                );
                const airPollutionForecastData = await airPollutionForecastResponse.json();

                // Add geocoding information to the weather data
                return {
                  ...weatherData,
                  geocoding: {
                    latitude: lat,
                    longitude: lng,
                    name: locationName,
                    country: country,
                    timezone: timezone,
                  },
                  air_pollution: airPollutionData,
                  air_pollution_forecast: airPollutionForecastData,
                  daily_forecast: dailyForecastData,
                };
              } catch (error) {
                console.error('Weather data error:', error);
                throw error;
              }
            },
          }),
          code_interpreter: tool({
            description: 'Write and execute Python code.',
            parameters: z.object({
              title: z.string().describe('The title of the code snippet.'),
              code: z
                .string()
                .describe(
                  'The Python code to execute. put the variables in the end of the code to print them. do not use the print function.',
                ),
              icon: z
                .enum(['stock', 'date', 'calculation', 'default'])
                .describe('The icon to display for the code snippet.'),
            }),
            execute: async ({ code, title, icon }: { code: string; title: string; icon: string }) => {
              console.log('Code:', code);
              console.log('Title:', title);
              console.log('Icon:', icon);

              const daytona = new Daytona({
                apiKey: serverEnv.DAYTONA_API_KEY,
                target: 'us',
              });
              const sandbox = await daytona.create(
                {
                  image: 'scira-analysis:1749316515',
                  language: 'python',
                  resources: {
                    cpu: 4,
                    memory: 8,
                    disk: 10,
                  },
                },
                {
                  timeout: 300,
                },
              );

              const execution = await sandbox.process.codeRun(code);

              console.log('Execution:', execution.result);
              console.log('Execution:', execution.artifacts?.stdout);

              let message = '';

              if (execution.artifacts?.stdout === execution.result) {
                message += execution.result;
              } else if (execution.result && execution.result !== execution.artifacts?.stdout) {
                message += execution.result;
              } else if (execution.artifacts?.stdout && execution.artifacts?.stdout !== execution.result) {
                message += execution.artifacts.stdout;
              } else {
                message += execution.result;
              }

              if (execution.artifacts?.charts) {
                console.log('Chart:', execution.artifacts.charts[0]);
              }

              let chart;

              if (execution.artifacts?.charts) {
                chart = execution.artifacts.charts[0];
              }

              // map the chart to the correct format for the frontend and remove the png property
              const chartData = chart
                ? {
                  type: chart.type,
                  title: chart.title,
                  elements: chart.elements,
                  png: undefined,
                }
                : undefined;

              await sandbox.delete();

              return {
                message: message.trim(),
                chart: chartData,
              };
            },
          }),
          // Improved geocoding tool - combines forward and reverse geocoding in one tool
          find_place_on_map: tool({
            description:
              'Find places using Google Maps geocoding API. Supports both address-to-coordinates (forward) and coordinates-to-address (reverse) geocoding.',
            parameters: z.object({
              query: z.string().nullable().describe('Address or place name to search for (for forward geocoding)'),
              latitude: z.number().nullable().describe('Latitude for reverse geocoding'),
              longitude: z.number().nullable().describe('Longitude for reverse geocoding'),
            }),
            execute: async ({ query, latitude, longitude }) => {
              try {
                const googleApiKey = serverEnv.GOOGLE_MAPS_API_KEY;

                if (!googleApiKey) {
                  throw new Error('Google Maps API key not configured');
                }

                let url: string;
                let searchType: 'forward' | 'reverse';

                // Determine search type and build URL
                if (query) {
                  // Forward geocoding
                  url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                    query,
                  )}&key=${googleApiKey}`;
                  searchType = 'forward';
                } else if (latitude !== undefined && longitude !== undefined) {
                  // Reverse geocoding
                  url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleApiKey}`;
                  searchType = 'reverse';
                } else {
                  throw new Error('Either query or coordinates (latitude/longitude) must be provided');
                }

                const response = await fetch(url);
                const data = await response.json();

                if (data.status === 'OVER_QUERY_LIMIT') {
                  return {
                    success: false,
                    error: 'Google Maps API quota exceeded. Please try again later.',
                    places: [],
                  };
                }

                if (data.status !== 'OK') {
                  return {
                    success: false,
                    error: data.error_message || `Geocoding failed: ${data.status}`,
                    places: [],
                  };
                }

                const places = data.results.map((result: GoogleResult) => ({
                  place_id: result.place_id,
                  name: result.formatted_address.split(',')[0].trim(),
                  formatted_address: result.formatted_address,
                  location: {
                    lat: result.geometry.location.lat,
                    lng: result.geometry.location.lng,
                  },
                  types: result.types,
                  address_components: result.address_components,
                  viewport: result.geometry.viewport,
                  source: 'google_maps',
                }));

                return {
                  success: true,
                  search_type: searchType,
                  query: query || `${latitude},${longitude}`,
                  places,
                  count: places.length,
                };
              } catch (error) {
                console.error('Geocoding error:', error);
                return {
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown geocoding error',
                  places: [],
                };
              }
            },
          }),

          // Improved nearby search using Google Places Nearby Search API
          nearby_places_search: tool({
            description: 'Search for nearby places using Google Places Nearby Search API.',
            parameters: z.object({
              location: z.string().describe('The location name or coordinates to search around'),
              latitude: z.number().nullable().describe('Latitude of the search center'),
              longitude: z.number().nullable().describe('Longitude of the search center'),
              type: z
                .string()
                .describe(
                  'Type of place to search for (restaurant, lodging, tourist_attraction, gas_station, bank, hospital, etc.) from the new google places api',
                ),
              radius: z.number().describe('Search radius in meters (max 50000)'),
              keyword: z.string().nullable().describe('Additional keyword to filter results'),
            }),
            execute: async ({
              location,
              latitude,
              longitude,
              type,
              radius,
              keyword,
            }: {
              location: string;
              latitude: number | null;
              longitude: number | null;
              type: string;
              radius: number;
              keyword: string | null;
            }) => {
              try {
                const googleApiKey = serverEnv.GOOGLE_MAPS_API_KEY;

                if (!googleApiKey) {
                  throw new Error('Google Maps API key not configured');
                }

                let searchLat = latitude;
                let searchLng = longitude;

                // If coordinates not provided, geocode the location
                if (!searchLat || !searchLng) {
                  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                    location,
                  )}&key=${googleApiKey}`;
                  const geocodeResponse = await fetch(geocodeUrl);
                  const geocodeData = await geocodeResponse.json();

                  if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
                    searchLat = geocodeData.results[0].geometry.location.lat;
                    searchLng = geocodeData.results[0].geometry.location.lng;
                  } else {
                    return {
                      success: false,
                      error: `Could not geocode location: ${location}`,
                      places: [],
                      center: null,
                    };
                  }
                }

                // Build nearby search URL
                let nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${searchLat},${searchLng}&radius=${Math.min(
                  radius,
                  50000,
                )}&type=${type}&key=${googleApiKey}`;

                if (keyword) {
                  nearbyUrl += `&keyword=${encodeURIComponent(keyword)}`;
                }

                const response = await fetch(nearbyUrl);
                const data = await response.json();

                if (data.status !== 'OK') {
                  return {
                    success: false,
                    error: data.error_message || `Nearby search failed: ${data.status}`,
                    places: [],
                    center: { lat: searchLat, lng: searchLng },
                  };
                }

                // Get detailed information for each place
                const detailedPlaces = await Promise.all(
                  data.results.slice(0, 20).map(async (place: any) => {
                    try {
                      // Get place details for additional information
                      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,reviews,opening_hours,photos,price_level,types&key=${googleApiKey}`;
                      const detailsResponse = await fetch(detailsUrl);
                      const details = await detailsResponse.json();

                      let detailsData = details.status === 'OK' ? details.result : {};

                      // Calculate distance from search center
                      const lat1 = searchLat!;
                      const lon1 = searchLng!;
                      const lat2 = place.geometry.location.lat;
                      const lon2 = place.geometry.location.lng;

                      const R = 6371000; // Earth's radius in meters
                      const dLat = ((lat2 - lat1) * Math.PI) / 180;
                      const dLon = ((lon2 - lon1) * Math.PI) / 180;
                      const a =
                        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos((lat1 * Math.PI) / 180) *
                        Math.cos((lat2 * Math.PI) / 180) *
                        Math.sin(dLon / 2) *
                        Math.sin(dLon / 2);
                      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                      const distance = R * c;

                      // Convert Google's price_level to text representation
                      const formatPriceLevel = (priceLevel: number | undefined): string => {
                        if (priceLevel === undefined || priceLevel === null) return 'Not Available';
                        switch (priceLevel) {
                          case 0:
                            return 'Free';
                          case 1:
                            return 'Inexpensive';
                          case 2:
                            return 'Moderate';
                          case 3:
                            return 'Expensive';
                          case 4:
                            return 'Very Expensive';
                          default:
                            return 'Not Available';
                        }
                      };

                      return {
                        place_id: place.place_id,
                        name: place.name,
                        formatted_address: detailsData.formatted_address || place.vicinity,
                        location: {
                          lat: place.geometry.location.lat,
                          lng: place.geometry.location.lng,
                        },
                        rating: place.rating || detailsData.rating,
                        price_level: formatPriceLevel(place.price_level || detailsData.price_level),
                        types: place.types,
                        distance: Math.round(distance),
                        is_open: place.opening_hours?.open_now,
                        photos:
                          (detailsData.photos || place.photos)?.slice(0, 3).map((photo: any) => ({
                            photo_reference: photo.photo_reference,
                            width: photo.width,
                            height: photo.height,
                            url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googleApiKey}`,
                          })) || [],
                        phone: detailsData.formatted_phone_number,
                        website: detailsData.website,
                        opening_hours: detailsData.opening_hours?.weekday_text || [],
                        reviews_count: detailsData.reviews?.length || 0,
                        source: 'google_places',
                      };
                    } catch (error) {
                      console.error(`Failed to get details for place ${place.name}:`, error);

                      // Convert Google's price_level to text representation (same function as above)
                      const formatPriceLevel = (priceLevel: number | undefined): string => {
                        if (priceLevel === undefined || priceLevel === null) return 'Not Available';
                        switch (priceLevel) {
                          case 0:
                            return 'Free';
                          case 1:
                            return 'Inexpensive';
                          case 2:
                            return 'Moderate';
                          case 3:
                            return 'Expensive';
                          case 4:
                            return 'Very Expensive';
                          default:
                            return 'Not Available';
                        }
                      };

                      // Return basic place info if details fail
                      return {
                        place_id: place.place_id,
                        name: place.name,
                        formatted_address: place.vicinity,
                        location: {
                          lat: place.geometry.location.lat,
                          lng: place.geometry.location.lng,
                        },
                        rating: place.rating,
                        price_level: formatPriceLevel(place.price_level),
                        types: place.types,
                        distance: 0,
                        source: 'google_places',
                      };
                    }
                  }),
                );

                // Sort by distance
                const sortedPlaces = detailedPlaces.sort((a, b) => (a.distance || 0) - (b.distance || 0));

                return {
                  success: true,
                  query: location,
                  type,
                  center: { lat: searchLat, lng: searchLng },
                  places: sortedPlaces,
                  count: sortedPlaces.length,
                };
              } catch (error) {
                console.error('Nearby search error:', error);
                return {
                  success: false,
                  error: error instanceof Error ? error.message : 'Unknown nearby search error',
                  places: [],
                  center: latitude && longitude ? { lat: latitude, lng: longitude } : null,
                };
              }
            },
          }),
          track_flight: tool({
            description: 'Track flight information and status',
            parameters: z.object({
              flight_number: z.string().describe('The flight number to track'),
            }),
            execute: async ({ flight_number }: { flight_number: string }) => {
              try {
                const response = await fetch(
                  `https://api.aviationstack.com/v1/flights?access_key=${serverEnv.AVIATION_STACK_API_KEY}&flight_iata=${flight_number}`,
                );
                return await response.json();
              } catch (error) {
                console.error('Flight tracking error:', error);
                throw error;
              }
            },
          }),
          datetime: tool({
            description: "Get the current date and time in the user's timezone",
            parameters: z.object({}),
            execute: async () => {
              try {
                // Get the current UTC time
                const now = new Date();

                // Format date and time using the user's timezone
                return {
                  timestamp: now.getTime(),
                  iso: now.toISOString(),
                  timezone: timezone,
                  formatted: {
                    date: new Intl.DateTimeFormat('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      timeZone: timezone,
                    }).format(now),
                    time: new Intl.DateTimeFormat('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                      timeZone: timezone,
                    }).format(now),
                    dateShort: new Intl.DateTimeFormat('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      timeZone: timezone,
                    }).format(now),
                    timeShort: new Intl.DateTimeFormat('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: timezone,
                    }).format(now),
                    // Add additional useful formats
                    full: new Intl.DateTimeFormat('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                      timeZone: timezone,
                    }).format(now),
                    iso_local: new Intl.DateTimeFormat('sv-SE', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      timeZone: timezone,
                    })
                      .format(now)
                      .replace(' ', 'T'),
                  },
                };
              } catch (error) {
                console.error('Datetime error:', error);
                throw error;
              }
            },
          }),
          mcp_search: tool({
            description: 'Search for mcp servers and get the information about them',
            parameters: z.object({
              query: z.string().describe('The query to search for'),
            }),
            execute: async ({ query }: { query: string }) => {
              try {
                // Call the Smithery Registry API
                const response = await fetch(`https://registry.smithery.ai/servers?q=${encodeURIComponent(query)}`, {
                  headers: {
                    Authorization: `Bearer ${serverEnv.SMITHERY_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                });

                if (!response.ok) {
                  throw new Error(`Smithery API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                // Get detailed information for each server
                const detailedServers = await Promise.all(
                  data.servers.map(async (server: any) => {
                    const detailResponse = await fetch(
                      `https://registry.smithery.ai/servers/${encodeURIComponent(server.qualifiedName)}`,
                      {
                        headers: {
                          Authorization: `Bearer ${serverEnv.SMITHERY_API_KEY}`,
                          'Content-Type': 'application/json',
                        },
                      },
                    );

                    if (!detailResponse.ok) {
                      console.warn(`Failed to fetch details for ${server.qualifiedName}`);
                      return server;
                    }

                    const details = await detailResponse.json();
                    return {
                      ...server,
                      deploymentUrl: details.deploymentUrl,
                      connections: details.connections,
                    };
                  }),
                );

                return {
                  servers: detailedServers,
                  pagination: data.pagination,
                  query: query,
                };
              } catch (error) {
                console.error('Smithery search error:', error);
                return {
                  error: error instanceof Error ? error.message : 'Unknown error',
                  query: query,
                };
              }
            },
          }),
          extreme_search: extremeSearchTool(dataStream),
          memory_manager: tool({
            description: 'Manage personal memories with add and search operations.',
            parameters: z.object({
              action: z.enum(['add', 'search']).describe('The memory operation to perform'),
              content: z.string().describe('The memory content for add operation'),
              query: z.string().describe('The search query for search operations'),
            }),
            execute: async ({
              action,
              content,
              query,
            }: {
              action: 'add' | 'search';
              content?: string;
              query?: string;
            }) => {
              console.log('user', user);
              const client = new MemoryClient({ apiKey: serverEnv.MEM0_API_KEY });

              console.log('action', action);
              console.log('content', content);
              console.log('query', query);

              try {
                switch (action) {
                  case 'add': {
                    if (!content) {
                      return {
                        success: false,
                        action: 'add',
                        message: 'Content is required for add operation',
                      };
                    }
                    const result = await client.add(
                      [
                        {
                          role: 'user',
                          content: content,
                        },
                      ],
                      {
                        user_id: user?.id,
                        org_id: serverEnv.MEM0_ORG_ID,
                        project_id: serverEnv.MEM0_PROJECT_ID,
                      },
                    );
                    if (result.length === 0) {
                      return {
                        success: false,
                        action: 'add',
                        message: 'No memory added',
                      };
                    }
                    console.log('result', result);
                    return {
                      success: true,
                      action: 'add',
                      memory: result[0],
                    };
                  }
                  case 'search': {
                    if (!query) {
                      return {
                        success: false,
                        action: 'search',
                        message: 'Query is required for search operation',
                      };
                    }
                    const searchFilters = {
                      AND: [{ user_id: user?.id }],
                    };
                    const result = await client.search(query, {
                      filters: searchFilters,
                      api_version: 'v2',
                    });
                    if (!result || !result[0]) {
                      return {
                        success: false,
                        action: 'search',
                        message: 'No results found for the search query',
                      };
                    }
                    return {
                      success: true,
                      action: 'search',
                      results: result[0],
                    };
                  }
                }
              } catch (error) {
                console.error('Memory operation error:', error);
                throw error;
              }
            },
          }),
          reddit_search: tool({
            description: 'Search Reddit content using Tavily API.',
            parameters: z.object({
              query: z.string().describe('The exact search query from the user.'),
              maxResults: z.number().describe('Maximum number of results to return. Default is 20.'),
              timeRange: z.enum(['day', 'week', 'month', 'year']).describe('Time range for Reddit search.'),
            }),
            execute: async ({
              query,
              maxResults = 20,
              timeRange = 'week',
            }: {
              query: string;
              maxResults?: number;
              timeRange?: 'day' | 'week' | 'month' | 'year';
            }) => {
              const apiKey = serverEnv.TAVILY_API_KEY;
              const tvly = tavily({ apiKey });

              console.log('Reddit search query:', query);
              console.log('Max results:', maxResults);
              console.log('Time range:', timeRange);

              try {
                const data = await tvly.search(query, {
                  maxResults: maxResults,
                  timeRange: timeRange,
                  includeRawContent: 'text',
                  searchDepth: 'basic',
                  topic: 'general',
                  includeDomains: ['reddit.com'],
                });

                console.log('data', data);

                // Process results for better display
                const processedResults = data.results.map((result) => {
                  // Extract Reddit post metadata
                  const isRedditPost = result.url.includes('/comments/');
                  const subreddit = isRedditPost
                    ? result.url.match(/reddit\.com\/r\/([^/]+)/)?.[1] || 'unknown'
                    : 'unknown';

                  // Don't attempt to parse comments - treat content as a single snippet
                  // The Tavily API already returns short content snippets
                  return {
                    url: result.url,
                    title: result.title,
                    content: result.content || '',
                    score: result.score,
                    published_date: result.publishedDate,
                    subreddit,
                    isRedditPost,
                    // Keep original content as a single comment/snippet
                    comments: result.content ? [result.content] : [],
                  };
                });

                return {
                  query,
                  results: processedResults,
                  timeRange,
                };
              } catch (error) {
                console.error('Reddit search error:', error);
                throw error;
              }
            },
          }),
        },
        experimental_repairToolCall: async ({ toolCall, tools, parameterSchema, error }) => {
          if (NoSuchToolError.isInstance(error)) {
            return null; // do not attempt to fix invalid tool names
          }

          console.log('Fixing tool call================================');
          console.log('toolCall', toolCall);
          console.log('tools', tools);
          console.log('parameterSchema', parameterSchema);
          console.log('error', error);

          const tool = tools[toolCall.toolName as keyof typeof tools];

          const { object: repairedArgs } = await generateObject({
            model: scira.languageModel('scira-default'),
            schema: tool.parameters,
            prompt: [
              `The model tried to call the tool "${toolCall.toolName}"` + ` with the following arguments:`,
              JSON.stringify(toolCall.args),
              `The tool accepts the following schema:`,
              JSON.stringify(parameterSchema(toolCall)),
              'Please fix the arguments.',
              'Do not use print statements stock chart tool.',
              `For the stock chart tool you have to generate a python code with matplotlib and yfinance to plot the stock chart.`,
              `For the web search make multiple queries to get the best results.`,
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
          console.log('Reasoning: ', event.reasoning);
          console.log('reasoning details: ', event.reasoningDetails);
          console.log('Steps: ', event.steps);
          console.log('Messages: ', event.response.messages);
          console.log('Response Body: ', event.response.body);
          console.log('Provider metadata: ', event.providerMetadata);
          console.log('Sources: ', event.sources);

          // Track message usage for rate limiting (deletion-proof)
          // Only track usage for models that are not free unlimited
          if (user?.id) {
            try {
              const freeUnlimitedModels = ['scira-default', 'scira-vision'];
              if (!freeUnlimitedModels.includes(model)) {
                await incrementMessageUsage({ userId: user.id });
              }
            } catch (error) {
              console.error('Failed to track message usage:', error);
            }
          }

          // Track extreme search usage if it was used successfully
          if (user?.id && group === 'extreme') {
            try {
              // Check if extreme_search tool was actually called
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
          }

          if (user?.id) {
            try {
              const assistantId = getTrailingMessageId({
                messages: event.response.messages.filter((message: any) => message.role === 'assistant'),
              });

              if (!assistantId) {
                throw new Error('No assistant message found!');
              }

              const [, assistantMessage] = appendResponseMessages({
                messages: [messages[messages.length - 1]],
                responseMessages: event.response.messages,
              });

              console.log('Assistant message [annotations]:', assistantMessage.annotations);

              await saveMessages({
                messages: [
                  {
                    id: assistantId,
                    chatId: id,
                    role: assistantMessage.role,
                    parts: assistantMessage.parts,
                    attachments: assistantMessage.experimental_attachments ?? [],
                    createdAt: new Date(),
                  },
                ],
              });
            } catch (_) {
              console.error('Failed to save chat');
            }
          }
        },
        onError(event) {
          console.log('Error: ', event.error);
        },
      });

      result.consumeStream();

      result.mergeIntoDataStream(dataStream, {
        sendReasoning: true,
      });
    },
    onError(error) {
      console.log('Error: ', error);
      if (error instanceof Error && error.message.includes('Rate Limit')) {
        return 'Oops, you have reached the rate limit! Please try again later.';
      }
      return 'Oops, an error occurred!';
    },
  });
  const streamContext = getStreamContext();

  if (streamContext) {
    return new Response(await streamContext.resumableStream(streamId, () => stream));
  } else {
    return new Response(stream);
  }
}

export async function GET(request: Request) {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new ChatSDKError('bad_request:api', 'Chat ID is required').toResponse();
  }

  const session = await auth.api.getSession(request);

  if (!session?.user) {
    return new ChatSDKError('unauthorized:auth', 'Authentication required to resume chat stream').toResponse();
  }

  let chat: Chat | null;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (!chat) {
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.visibility === 'private' && chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat', 'Access denied to private chat').toResponse();
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new ChatSDKError('not_found:stream').toResponse();
  }

  const emptyDataStream = createDataStream({
    execute: () => { },
  });

  const stream = await streamContext.resumableStream(recentStreamId, () => emptyDataStream);

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }

    if (mostRecentMessage.role !== 'assistant') {
      return new Response(emptyDataStream, { status: 200 });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: 'append-message',
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(restoredStream, { status: 200 });
  }

  return new Response(stream, { status: 200 });
}
