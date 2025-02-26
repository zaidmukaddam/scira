// /app/api/chat/route.ts
import { getGroupConfig } from '@/app/actions';
import { serverEnv } from '@/env/server';
import { xai } from '@ai-sdk/xai';
import { cerebras } from '@ai-sdk/cerebras';
import { anthropic } from '@ai-sdk/anthropic'
import { groq } from '@ai-sdk/groq'
import CodeInterpreter from '@e2b/code-interpreter';
import FirecrawlApp from '@mendable/firecrawl-js';
import { tavily } from '@tavily/core';
import {
    convertToCoreMessages,
    smoothStream,
    streamText,
    tool,
    createDataStreamResponse,
    wrapLanguageModel,
    extractReasoningMiddleware,
    customProvider,
    generateObject
} from 'ai';
import Exa from 'exa-js';
import { z } from 'zod';

const scira = customProvider({
    languageModels: {
        'scira-default': xai('grok-2-vision-1212'),
        'scira-llama': cerebras('llama-3.3-70b'),
        'scira-sonnet': anthropic('claude-3-7-sonnet-20250219'),
        'scira-r1': wrapLanguageModel({
            model: groq('deepseek-r1-distill-llama-70b'),
            middleware: extractReasoningMiddleware({ tagName: 'think' })
        }),
    }
})

// Allow streaming responses up to 120 seconds
export const maxDuration = 300;

interface XResult {
    id: string;
    url: string;
    title: string;
    author?: string;
    publishedDate?: string;
    text: string;
    highlights?: string[];
    tweetId: string;
}

interface MapboxFeature {
    id: string;
    name: string;
    formatted_address: string;
    geometry: {
        type: string;
        coordinates: number[];
    };
    feature_type: string;
    context: string;
    coordinates: number[];
    bbox: number[];
    source: string;
}

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

async function isValidImageUrl(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
        });

        clearTimeout(timeout);

        return response.ok && (response.headers.get('content-type')?.startsWith('image/') ?? false);
    } catch {
        return false;
    }
}


const extractDomain = (url: string): string => {
    const urlPattern = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/i;
    return url.match(urlPattern)?.[1] || url;
};

const deduplicateByDomainAndUrl = <T extends { url: string }>(items: T[]): T[] => {
    const seenDomains = new Set<string>();
    const seenUrls = new Set<string>();

    return items.filter(item => {
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

// Modify the POST function to use the new handler
export async function POST(req: Request) {
    const { messages, model, group } = await req.json();
    const { tools: activeTools, systemPrompt } = await getGroupConfig(group);

    console.log("Running with model: ", model.trim());

    return createDataStreamResponse({
        execute: async (dataStream) => {
            const result = streamText({
                model: scira.languageModel(model),
                maxSteps: 5,
                providerOptions: {
                    groq: {
                        reasoning_format: group === "chat" ? "raw" : "parsed",
                    },
                    anthropic: {
                        thinking: {
                            type: group === "chat" ? "enabled" : "disabled",
                            budgetTokens: 12000
                        }
                    }
                },
                messages: convertToCoreMessages(messages),
                experimental_transform: smoothStream({
                    chunking: 'word',
                    delayInMs: 15,
                }),
                temperature: 0,
                experimental_activeTools: [...activeTools],
                system: systemPrompt,
                tools: {
                    stock_chart: tool({
                        description: 'Write and execute Python code to find stock data and generate a stock chart.',
                        parameters: z.object({
                            title: z.string().describe('The title of the chart.'),
                            code: z.string().describe('The Python code to execute.'),
                            icon: z
                                .enum(['stock', 'date', 'calculation', 'default'])
                                .describe('The icon to display for the chart.'),
                            stock_symbols: z.array(z.string()).describe('The stock symbols to display for the chart.'),
                            interval: z.enum(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max']).describe('The interval of the chart. default is 1y.'),
                        }),
                        execute: async ({ code, title, icon, stock_symbols, interval }: { code: string; title: string; icon: string; stock_symbols: string[]; interval: string }) => {
                            console.log('Code:', code);
                            console.log('Title:', title);
                            console.log('Icon:', icon);
                            console.log('Stock symbols:', stock_symbols);
                            console.log('Interval:', interval);
                            const sandbox = await CodeInterpreter.create(serverEnv.SANDBOX_TEMPLATE_ID!);
                            const execution = await sandbox.runCode(code);
                            let message = '';

                            if (execution.results.length > 0) {
                                for (const result of execution.results) {
                                    if (result.isMainResult) {
                                        message += `${result.text}\n`;
                                    } else {
                                        message += `${result.text}\n`;
                                    }
                                }
                            }

                            if (execution.logs.stdout.length > 0 || execution.logs.stderr.length > 0) {
                                if (execution.logs.stdout.length > 0) {
                                    message += `${execution.logs.stdout.join('\n')}\n`;
                                }
                                if (execution.logs.stderr.length > 0) {
                                    message += `${execution.logs.stderr.join('\n')}\n`;
                                    console.log("Error: ", execution.logs.stderr);
                                }
                            }

                            if (execution.error) {
                                message += `Error: ${execution.error}\n`;
                                console.log('Error: ', execution.error);
                            }

                            console.log("Chart details: ", execution.results[0].chart)
                            if (execution.results[0].chart) {
                                execution.results[0].chart.elements.map((element: any) => {
                                    console.log(element.points);
                                });
                            }

                            if (execution.results[0].chart === null) {
                                console.log("No chart found");
                            }

                            return {
                                message: message.trim(),
                                chart: execution.results[0].chart ?? '',
                            };
                        },
                    }),
                    currency_converter: tool({
                        description: 'Convert currency from one to another using yfinance',
                        parameters: z.object({
                            from: z.string().describe('The source currency code.'),
                            to: z.string().describe('The target currency code.'),
                            amount: z.number().default(1).describe('The amount to convert.'),
                        }),
                        execute: async ({ from, to }: { from: string; to: string }) => {
                            const code = `
  import yfinance as yf
  from_currency = '${from}'
  to_currency = '${to}'
  currency_pair = f'{from_currency}{to_currency}=X'
  data = yf.Ticker(currency_pair).history(period='1d')
  latest_rate = data['Close'].iloc[-1]
  latest_rate
  `;
                            console.log('Currency pair:', from, to);

                            const sandbox = await CodeInterpreter.create(serverEnv.SANDBOX_TEMPLATE_ID!);
                            const execution = await sandbox.runCode(code);
                            let message = '';

                            if (execution.results.length > 0) {
                                for (const result of execution.results) {
                                    if (result.isMainResult) {
                                        message += `${result.text}\n`;
                                    } else {
                                        message += `${result.text}\n`;
                                    }
                                }
                            }

                            if (execution.logs.stdout.length > 0 || execution.logs.stderr.length > 0) {
                                if (execution.logs.stdout.length > 0) {
                                    message += `${execution.logs.stdout.join('\n')}\n`;
                                }
                                if (execution.logs.stderr.length > 0) {
                                    message += `${execution.logs.stderr.join('\n')}\n`;
                                }
                            }

                            if (execution.error) {
                                message += `Error: ${execution.error}\n`;
                                console.log('Error: ', execution.error);
                            }

                            return { rate: message.trim() };
                        },
                    }),
                    text_translate: tool({
                        description: "Translate text from one language to another.",
                        parameters: z.object({
                            text: z.string().describe("The text to translate."),
                            to: z.string().describe("The language to translate to (e.g., 'fr' for French)."),
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
                        description: 'Search the web for information with multiple queries, max results and search depth.',
                        parameters: z.object({
                            queries: z.array(z.string().describe('Array of search queries to look up on the web.')),
                            maxResults: z.array(
                                z.number().describe('Array of maximum number of results to return per query.').default(10),
                            ),
                            topics: z.array(
                                z.enum(['general', 'news']).describe('Array of topic types to search for.').default('general'),
                            ),
                            searchDepth: z.array(
                                z.enum(['basic', 'advanced']).describe('Array of search depths to use.').default('basic'),
                            ),
                            exclude_domains: z
                                .array(z.string())
                                .describe('A list of domains to exclude from all search results.')
                                .default([]),
                        }),
                        execute: async ({
                            queries,
                            maxResults,
                            topics,
                            searchDepth,
                            exclude_domains,
                        }: {
                            queries: string[];
                            maxResults: number[];
                            topics: ('general' | 'news')[];
                            searchDepth: ('basic' | 'advanced')[];
                            exclude_domains?: string[];
                        }) => {
                            const apiKey = serverEnv.TAVILY_API_KEY;
                            const tvly = tavily({ apiKey });
                            const includeImageDescriptions = true;

                            console.log('Queries:', queries);
                            console.log('Max Results:', maxResults);
                            console.log('Topics:', topics);
                            console.log('Search Depths:', searchDepth);
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
                                    excludeDomains: exclude_domains,
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
                                        imagesCount: data.images.length
                                    }
                                });

                                return {
                                    query,
                                    results: deduplicateByDomainAndUrl(data.results).map((obj: any) => ({
                                        url: obj.url,
                                        title: obj.title,
                                        content: obj.content,
                                        raw_content: obj.raw_content,
                                        published_date: topics[index] === 'news' ? obj.published_date : undefined,
                                    })),
                                    images: includeImageDescriptions
                                        ? await Promise.all(
                                            deduplicateByDomainAndUrl(data.images).map(
                                                async ({ url, description }: { url: string; description?: string }) => {
                                                    const sanitizedUrl = sanitizeUrl(url);
                                                    const isValid = await isValidImageUrl(sanitizedUrl);
                                                    return isValid
                                                        ? {
                                                            url: sanitizedUrl,
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
                                                return (await isValidImageUrl(sanitizedUrl)) ? sanitizedUrl : null;
                                            }),
                                        ).then((results) => results.filter((url): url is string => url !== null)),
                                };
                            });

                            const searchResults = await Promise.all(searchPromises);

                            return {
                                searches: searchResults,
                            };
                        },
                    }),
                    x_search: tool({
                        description: 'Search X (formerly Twitter) posts.',
                        parameters: z.object({
                            query: z.string().describe('The search query, if a username is provided put in the query with @username'),
                            startDate: z.string().optional().describe('The start date for the search in YYYY-MM-DD format'),
                            endDate: z.string().optional().describe('The end date for the search in YYYY-MM-DD format'),
                        }),
                        execute: async ({
                            query,
                            startDate,
                            endDate,
                        }: {
                            query: string;
                            startDate?: string;
                            endDate?: string;
                        }) => {
                            try {
                                const exa = new Exa(serverEnv.EXA_API_KEY as string);

                                const result = await exa.searchAndContents(query, {
                                    type: 'keyword',
                                    numResults: 15,
                                    text: true,
                                    highlights: true,
                                    includeDomains: ['twitter.com', 'x.com'],
                                    startPublishedDate: startDate,
                                    endPublishedDate: endDate,
                                });

                                // Extract tweet ID from URL
                                const extractTweetId = (url: string): string | null => {
                                    const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
                                    return match ? match[1] : null;
                                };

                                // Process and filter results
                                const processedResults = result.results.reduce<Array<XResult>>((acc, post) => {
                                    const tweetId = extractTweetId(post.url);
                                    if (tweetId) {
                                        acc.push({
                                            ...post,
                                            tweetId,
                                            title: post.title || '',
                                        });
                                    }
                                    return acc;
                                }, []);

                                return processedResults;
                            } catch (error) {
                                console.error('X search error:', error);
                                throw error;
                            }
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
                                    `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(
                                        query,
                                    )}&include_adult=true&language=en-US&page=1`,
                                    {
                                        headers: {
                                            Authorization: `Bearer ${TMDB_API_KEY}`,
                                            accept: 'application/json',
                                        },
                                    },
                                );

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
                                        writer: credits.crew?.find(
                                            (person: any) => person.job === 'Screenplay' || person.job === 'Writer',
                                        )?.name,
                                    },
                                    poster_path: details.poster_path
                                        ? `https://image.tmdb.org/t/p/original${details.poster_path}`
                                        : null,
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
                                    poster_path: movie.poster_path
                                        ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
                                        : null,
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
                                    poster_path: show.poster_path
                                        ? `https://image.tmdb.org/t/p/original${show.poster_path}`
                                        : null,
                                    backdrop_path: show.backdrop_path
                                        ? `https://image.tmdb.org/t/p/original${show.backdrop_path}`
                                        : null,
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

                                // Take only the first 10 unique, valid results
                                const limitedResults = processedResults.slice(0, 10);

                                return {
                                    results: limitedResults,
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
                            no_of_results: z.number().default(5).describe('The number of results to return'),
                        }),
                        execute: async ({ query, no_of_results }: { query: string; no_of_results: number }) => {
                            try {
                                const exa = new Exa(serverEnv.EXA_API_KEY as string);

                                // Simple search to get YouTube URLs only
                                const searchResult = await exa.search(query, {
                                    type: 'keyword',
                                    numResults: no_of_results,
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
                                const validResults = processedResults.filter(
                                    (result): result is VideoResult => result !== null,
                                );

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
                        description: 'Retrieve the information from a URL using Firecrawl.',
                        parameters: z.object({
                            url: z.string().describe('The URL to retrieve the information from.'),
                        }),
                        execute: async ({ url }: { url: string }) => {
                            const app = new FirecrawlApp({
                                apiKey: serverEnv.FIRECRAWL_API_KEY,
                            });
                            try {
                                const content = await app.scrapeUrl(url);
                                if (!content.success || !content.metadata) {
                                    return { error: 'Failed to retrieve content' };
                                }

                                // Define schema for extracting missing content
                                const schema = z.object({
                                    title: z.string(),
                                    content: z.string(),
                                    description: z.string()
                                });

                                let title = content.metadata.title;
                                let description = content.metadata.description;
                                let extractedContent = content.markdown;

                                // If any content is missing, use extract to get it
                                if (!title || !description || !extractedContent) {
                                    const extractResult = await app.extract([url], {
                                        prompt: "Extract the page title, main content, and a brief description.",
                                        schema: schema
                                    });

                                    if (extractResult.success && extractResult.data) {
                                        title = title || extractResult.data.title;
                                        description = description || extractResult.data.description;
                                        extractedContent = extractedContent || extractResult.data.content;
                                    }
                                }

                                return {
                                    results: [
                                        {
                                            title: title || 'Untitled',
                                            content: extractedContent || '',
                                            url: content.metadata.sourceURL,
                                            description: description || '',
                                            language: content.metadata.language,
                                        },
                                    ],
                                };
                            } catch (error) {
                                console.error('Firecrawl API error:', error);
                                return { error: 'Failed to retrieve content' };
                            }
                        },
                    }),
                    get_weather_data: tool({
                        description: 'Get the weather data for the given coordinates.',
                        parameters: z.object({
                            lat: z.number().describe('The latitude of the location.'),
                            lon: z.number().describe('The longitude of the location.'),
                        }),
                        execute: async ({ lat, lon }: { lat: number; lon: number }) => {
                            const apiKey = serverEnv.OPENWEATHER_API_KEY;
                            const response = await fetch(
                                `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}`,
                            );
                            const data = await response.json();
                            return data;
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

                            const sandbox = await CodeInterpreter.create(serverEnv.SANDBOX_TEMPLATE_ID!);
                            const execution = await sandbox.runCode(code);
                            let message = '';

                            if (execution.results.length > 0) {
                                for (const result of execution.results) {
                                    if (result.isMainResult) {
                                        message += `${result.text}\n`;
                                    } else {
                                        message += `${result.text}\n`;
                                    }
                                }
                            }

                            if (execution.logs.stdout.length > 0 || execution.logs.stderr.length > 0) {
                                if (execution.logs.stdout.length > 0) {
                                    message += `${execution.logs.stdout.join('\n')}\n`;
                                }
                                if (execution.logs.stderr.length > 0) {
                                    message += `${execution.logs.stderr.join('\n')}\n`;
                                }
                            }

                            if (execution.error) {
                                message += `Error: ${execution.error}\n`;
                                console.log('Error: ', execution.error);
                            }

                            console.log(execution.results);
                            if (execution.results[0].chart) {
                                execution.results[0].chart.elements.map((element: any) => {
                                    console.log(element.points);
                                });
                            }

                            return {
                                message: message.trim(),
                                chart: execution.results[0].chart ?? '',
                            };
                        },
                    }),
                    find_place: tool({
                        description:
                            'Find a place using Google Maps API for forward geocoding and Mapbox for reverse geocoding.',
                        parameters: z.object({
                            query: z.string().describe('The search query for forward geocoding'),
                            coordinates: z.array(z.number()).describe('Array of [latitude, longitude] for reverse geocoding'),
                        }),
                        execute: async ({ query, coordinates }: { query: string; coordinates: number[] }) => {
                            try {
                                // Forward geocoding with Google Maps API
                                const googleApiKey = serverEnv.GOOGLE_MAPS_API_KEY;
                                const googleResponse = await fetch(
                                    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                                        query,
                                    )}&key=${googleApiKey}`,
                                );
                                const googleData = await googleResponse.json();

                                // Reverse geocoding with Mapbox
                                const mapboxToken = serverEnv.MAPBOX_ACCESS_TOKEN;
                                const [lat, lng] = coordinates;
                                const mapboxResponse = await fetch(
                                    `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&access_token=${mapboxToken}`,
                                );
                                const mapboxData = await mapboxResponse.json();

                                // Process and combine results
                                const features = [];

                                // Process Google results
                                if (googleData.status === 'OK' && googleData.results.length > 0) {
                                    features.push(
                                        ...googleData.results.map((result: GoogleResult) => ({
                                            id: result.place_id,
                                            name: result.formatted_address.split(',')[0],
                                            formatted_address: result.formatted_address,
                                            geometry: {
                                                type: 'Point',
                                                coordinates: [result.geometry.location.lng, result.geometry.location.lat],
                                            },
                                            feature_type: result.types[0],
                                            address_components: result.address_components,
                                            viewport: result.geometry.viewport,
                                            place_id: result.place_id,
                                            source: 'google',
                                        })),
                                    );
                                }

                                // Process Mapbox results
                                if (mapboxData.features && mapboxData.features.length > 0) {
                                    features.push(
                                        ...mapboxData.features.map(
                                            (feature: any): MapboxFeature => ({
                                                id: feature.id,
                                                name: feature.properties.name_preferred || feature.properties.name,
                                                formatted_address: feature.properties.full_address,
                                                geometry: feature.geometry,
                                                feature_type: feature.properties.feature_type,
                                                context: feature.properties.context,
                                                coordinates: feature.properties.coordinates,
                                                bbox: feature.properties.bbox,
                                                source: 'mapbox',
                                            }),
                                        ),
                                    );
                                }

                                return {
                                    features,
                                    google_attribution: 'Powered by Google Maps Platform',
                                    mapbox_attribution: 'Powered by Mapbox',
                                };
                            } catch (error) {
                                console.error('Geocoding error:', error);
                                throw error;
                            }
                        },
                    }),
                    text_search: tool({
                        description: 'Perform a text-based search for places using Mapbox API.',
                        parameters: z.object({
                            query: z.string().describe("The search query (e.g., '123 main street')."),
                            location: z.string().describe("The location to center the search (e.g., '42.3675294,-71.186966')."),
                            radius: z.number().describe('The radius of the search area in meters (max 50000).'),
                        }),
                        execute: async ({ query, location, radius }: { query: string; location?: string; radius?: number }) => {
                            const mapboxToken = serverEnv.MAPBOX_ACCESS_TOKEN;

                            let proximity = '';
                            if (location) {
                                const [lng, lat] = location.split(',').map(Number);
                                proximity = `&proximity=${lng},${lat}`;
                            }

                            const response = await fetch(
                                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
                                    query,
                                )}.json?types=poi${proximity}&access_token=${mapboxToken}`,
                            );
                            const data = await response.json();

                            // If location and radius provided, filter results by distance
                            let results = data.features;
                            if (location && radius) {
                                const [centerLng, centerLat] = location.split(',').map(Number);
                                const radiusInDegrees = radius / 111320;
                                results = results.filter((feature: any) => {
                                    const [placeLng, placeLat] = feature.center;
                                    const distance = Math.sqrt(
                                        Math.pow(placeLng - centerLng, 2) + Math.pow(placeLat - centerLat, 2),
                                    );
                                    return distance <= radiusInDegrees;
                                });
                            }

                            return {
                                results: results.map((feature: any) => ({
                                    name: feature.text,
                                    formatted_address: feature.place_name,
                                    geometry: {
                                        location: {
                                            lat: feature.center[1],
                                            lng: feature.center[0],
                                        },
                                    },
                                })),
                            };
                        },
                    }),
                    nearby_search: tool({
                        description: 'Search for nearby places, such as restaurants or hotels based on the details given.',
                        parameters: z.object({
                            location: z.string().describe('The location name given by user.'),
                            latitude: z.number().describe('The latitude of the location.'),
                            longitude: z.number().describe('The longitude of the location.'),
                            type: z
                                .string()
                                .describe('The type of place to search for (restaurants, hotels, attractions, geos).'),
                            radius: z.number().default(6000).describe('The radius in meters (max 50000, default 6000).'),
                        }),
                        execute: async ({
                            location,
                            latitude,
                            longitude,
                            type,
                            radius,
                        }: {
                            latitude: number;
                            longitude: number;
                            location: string;
                            type: string;
                            radius: number;
                        }) => {
                            const apiKey = serverEnv.TRIPADVISOR_API_KEY;
                            let finalLat = latitude;
                            let finalLng = longitude;

                            try {
                                // Try geocoding first
                                const geocodingData = await fetch(
                                    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                                        location,
                                    )}&key=${serverEnv.GOOGLE_MAPS_API_KEY}`,
                                );

                                const geocoding = await geocodingData.json();

                                if (geocoding.results?.[0]?.geometry?.location) {
                                    let trimmedLat = geocoding.results[0].geometry.location.lat.toString().split('.');
                                    finalLat = parseFloat(trimmedLat[0] + '.' + trimmedLat[1].slice(0, 6));
                                    let trimmedLng = geocoding.results[0].geometry.location.lng.toString().split('.');
                                    finalLng = parseFloat(trimmedLng[0] + '.' + trimmedLng[1].slice(0, 6));
                                    console.log('Using geocoded coordinates:', finalLat, finalLng);
                                } else {
                                    console.log('Using provided coordinates:', finalLat, finalLng);
                                }

                                // Get nearby places
                                const nearbyResponse = await fetch(
                                    `https://api.content.tripadvisor.com/api/v1/location/nearby_search?latLong=${finalLat},${finalLng}&category=${type}&radius=${radius}&language=en&key=${apiKey}`,
                                    {
                                        method: 'GET',
                                        headers: {
                                            Accept: 'application/json',
                                            origin: 'https://mplx.local',
                                            referer: 'https://mplx.local',
                                        },
                                    },
                                );

                                if (!nearbyResponse.ok) {
                                    throw new Error(`Nearby search failed: ${nearbyResponse.status}`);
                                }

                                const nearbyData = await nearbyResponse.json();

                                if (!nearbyData.data || nearbyData.data.length === 0) {
                                    console.log('No nearby places found');
                                    return {
                                        results: [],
                                        center: { lat: finalLat, lng: finalLng },
                                    };
                                }

                                // Process each place
                                const detailedPlaces = await Promise.all(
                                    nearbyData.data.map(async (place: any) => {
                                        try {
                                            if (!place.location_id) {
                                                console.log(`Skipping place "${place.name}": No location_id`);
                                                return null;
                                            }

                                            // Fetch place details
                                            const detailsResponse = await fetch(
                                                `https://api.content.tripadvisor.com/api/v1/location/${place.location_id}/details?language=en&currency=USD&key=${apiKey}`,
                                                {
                                                    method: 'GET',
                                                    headers: {
                                                        Accept: 'application/json',
                                                        origin: 'https://mplx.local',
                                                        referer: 'https://mplx.local',
                                                    },
                                                },
                                            );

                                            if (!detailsResponse.ok) {
                                                console.log(`Failed to fetch details for "${place.name}"`);
                                                return null;
                                            }

                                            const details = await detailsResponse.json();

                                            console.log(`Place details for "${place.name}":`, details);

                                            // Fetch place photos
                                            let photos = [];
                                            try {
                                                const photosResponse = await fetch(
                                                    `https://api.content.tripadvisor.com/api/v1/location/${place.location_id}/photos?language=en&key=${apiKey}`,
                                                    {
                                                        method: 'GET',
                                                        headers: {
                                                            Accept: 'application/json',
                                                            origin: 'https://mplx.local',
                                                            referer: 'https://mplx.local',
                                                        },
                                                    },
                                                );

                                                if (photosResponse.ok) {
                                                    const photosData = await photosResponse.json();
                                                    photos =
                                                        photosData.data
                                                            ?.map((photo: any) => ({
                                                                thumbnail: photo.images?.thumbnail?.url,
                                                                small: photo.images?.small?.url,
                                                                medium: photo.images?.medium?.url,
                                                                large: photo.images?.large?.url,
                                                                original: photo.images?.original?.url,
                                                                caption: photo.caption,
                                                            }))
                                                            .filter((photo: any) => photo.medium) || [];
                                                }
                                            } catch (error) {
                                                console.log(`Photo fetch failed for "${place.name}":`, error);
                                            }

                                            // Get timezone for the location
                                            const tzResponse = await fetch(
                                                `https://maps.googleapis.com/maps/api/timezone/json?location=${details.latitude
                                                },${details.longitude}&timestamp=${Math.floor(Date.now() / 1000)}&key=${serverEnv.GOOGLE_MAPS_API_KEY
                                                }`,
                                            );
                                            const tzData = await tzResponse.json();
                                            const timezone = tzData.timeZoneId || 'UTC';

                                            // Process hours and status with timezone
                                            const localTime = new Date(
                                                new Date().toLocaleString('en-US', {
                                                    timeZone: timezone,
                                                }),
                                            );
                                            const currentDay = localTime.getDay();
                                            const currentHour = localTime.getHours();
                                            const currentMinute = localTime.getMinutes();
                                            const currentTime = currentHour * 100 + currentMinute;

                                            let is_closed = true;
                                            let next_open_close = null;
                                            let next_day = currentDay;

                                            if (details.hours?.periods) {
                                                // Sort periods by day and time for proper handling of overnight hours
                                                const sortedPeriods = [...details.hours.periods].sort((a, b) => {
                                                    if (a.open.day !== b.open.day) return a.open.day - b.open.day;
                                                    return parseInt(a.open.time) - parseInt(b.open.time);
                                                });

                                                // Find current or next opening period
                                                for (let i = 0; i < sortedPeriods.length; i++) {
                                                    const period = sortedPeriods[i];
                                                    const openTime = parseInt(period.open.time);
                                                    const closeTime = period.close ? parseInt(period.close.time) : 2359;
                                                    const periodDay = period.open.day;

                                                    // Handle overnight hours
                                                    if (closeTime < openTime) {
                                                        // Place is open from previous day
                                                        if (currentDay === periodDay && currentTime < closeTime) {
                                                            is_closed = false;
                                                            next_open_close = period.close.time;
                                                            break;
                                                        }
                                                        // Place is open today and extends to tomorrow
                                                        if (currentDay === periodDay && currentTime >= openTime) {
                                                            is_closed = false;
                                                            next_open_close = period.close.time;
                                                            next_day = (periodDay + 1) % 7;
                                                            break;
                                                        }
                                                    } else {
                                                        // Normal hours within same day
                                                        if (
                                                            currentDay === periodDay &&
                                                            currentTime >= openTime &&
                                                            currentTime < closeTime
                                                        ) {
                                                            is_closed = false;
                                                            next_open_close = period.close.time;
                                                            break;
                                                        }
                                                    }

                                                    // Find next opening time if currently closed
                                                    if (is_closed) {
                                                        if (
                                                            periodDay > currentDay ||
                                                            (periodDay === currentDay && openTime > currentTime)
                                                        ) {
                                                            next_open_close = period.open.time;
                                                            next_day = periodDay;
                                                            break;
                                                        }
                                                    }
                                                }
                                            }

                                            // Return processed place data
                                            return {
                                                name: place.name || 'Unnamed Place',
                                                location: {
                                                    lat: parseFloat(details.latitude || place.latitude || finalLat),
                                                    lng: parseFloat(details.longitude || place.longitude || finalLng),
                                                },
                                                timezone,
                                                place_id: place.location_id,
                                                vicinity: place.address_obj?.address_string || '',
                                                distance: parseFloat(place.distance || '0'),
                                                bearing: place.bearing || '',
                                                type: type,
                                                rating: parseFloat(details.rating || '0'),
                                                price_level: details.price_level || '',
                                                cuisine: details.cuisine?.[0]?.name || '',
                                                description: details.description || '',
                                                phone: details.phone || '',
                                                website: details.website || '',
                                                reviews_count: parseInt(details.num_reviews || '0'),
                                                is_closed,
                                                hours: details.hours?.weekday_text || [],
                                                next_open_close,
                                                next_day,
                                                periods: details.hours?.periods || [],
                                                photos,
                                                source: details.source?.name || 'TripAdvisor',
                                            };
                                        } catch (error) {
                                            console.log(`Failed to process place "${place.name}":`, error);
                                            return null;
                                        }
                                    }),
                                );

                                // Filter and sort results
                                const validPlaces = detailedPlaces
                                    .filter((place) => place !== null)
                                    .sort((a, b) => (a?.distance || 0) - (b?.distance || 0));

                                return {
                                    results: validPlaces,
                                    center: { lat: finalLat, lng: finalLng },
                                };
                            } catch (error) {
                                console.error('Nearby search error:', error);
                                throw error;
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
                    reason_search: tool({
                        description: 'Perform a reasoned web search with multiple steps and sources.',
                        parameters: z.object({
                            topic: z.string().describe('The main topic or question to research'),
                            depth: z.enum(['basic', 'advanced']).describe('Search depth level').default('basic'),
                        }),
                        execute: async ({ topic, depth }: { topic: string; depth: 'basic' | 'advanced' }) => {
                            const apiKey = serverEnv.TAVILY_API_KEY;
                            const tvly = tavily({ apiKey });
                            const exa = new Exa(serverEnv.EXA_API_KEY as string);

                            // Send initial plan status update (without steps count and extra details)
                            dataStream.writeMessageAnnotation({
                                type: 'research_update',
                                data: {
                                    id: 'research-plan-initial', // unique id for the initial state
                                    type: 'plan',
                                    status: 'running',
                                    title: 'Research Plan',
                                    message: 'Creating research plan...',
                                    timestamp: Date.now(),
                                    overwrite: true
                                }
                            });

                            // Now generate the research plan
                            const { object: researchPlan } = await generateObject({
                                model: model === "scira-sonnet" ? scira.languageModel("scira-sonnet") : xai("grok-beta"),
                                temperature: 0,
                                schema: z.object({
                                    search_queries: z.array(z.object({
                                        query: z.string(),
                                        rationale: z.string(),
                                        source: z.enum(['web', 'academic', 'both']),
                                        priority: z.number().min(1).max(5)
                                    })).max(12),
                                    required_analyses: z.array(z.object({
                                        type: z.string(),
                                        description: z.string(),
                                        importance: z.number().min(1).max(5)
                                    })).max(8)
                                }),
                                prompt: `Create a focused research plan for the topic: "${topic}". 
                                        
                                        Today's date and day of the week: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                
                                        Keep the plan concise but comprehensive, with:
                                        - 4-12 targeted search queries (each can use web, academic, or both sources)
                                        - 2-8 key analyses to perform
                                        - Prioritize the most important aspects to investigate
                                        
                                        Consider different angles and potential controversies, but maintain focus on the core aspects.
                                        Ensure the total number of steps (searches + analyses) does not exceed 20.`
                            });

                            // Generate IDs for all steps based on the plan
                            const generateStepIds = (plan: typeof researchPlan) => {
                                // Generate an array of search steps.
                                const searchSteps = plan.search_queries.flatMap((query, index) => {
                                    if (query.source === 'both') {
                                        return [
                                            { id: `search-web-${index}`, type: 'web', query },
                                            { id: `search-academic-${index}`, type: 'academic', query }
                                        ];
                                    }
                                    const searchType = query.source === 'academic' ? 'academic' : 'web';
                                    return [{ id: `search-${searchType}-${index}`, type: searchType, query }];
                                });

                                // Generate an array of analysis steps.
                                const analysisSteps = plan.required_analyses.map((analysis, index) => ({
                                    id: `analysis-${index}`,
                                    type: 'analysis',
                                    analysis
                                }));

                                return {
                                    planId: 'research-plan',
                                    searchSteps,
                                    analysisSteps
                                };
                            };

                            const stepIds = generateStepIds(researchPlan);
                            let completedSteps = 0;
                            const totalSteps = stepIds.searchSteps.length + stepIds.analysisSteps.length;

                            // Complete plan status
                            dataStream.writeMessageAnnotation({
                                type: 'research_update',
                                data: {
                                    id: stepIds.planId,
                                    type: 'plan',
                                    status: 'completed',
                                    title: 'Research Plan',
                                    plan: researchPlan,
                                    totalSteps: totalSteps,
                                    message: 'Research plan created',
                                    timestamp: Date.now(),
                                    overwrite: true
                                }
                            });

                            // Execute searches
                            const searchResults = [];
                            let searchIndex = 0;  // Add index tracker

                            for (const step of stepIds.searchSteps) {
                                // Send running annotation for this search step
                                dataStream.writeMessageAnnotation({
                                    type: 'research_update',
                                    data: {
                                        id: step.id,
                                        type: step.type,
                                        status: 'running',
                                        title: step.type === 'web'
                                            ? `Searching the web for "${step.query.query}"`
                                            : step.type === 'academic'
                                                ? `Searching academic papers for "${step.query.query}"`
                                                : `Analyzing ${step.query.query}`,
                                        query: step.query.query,
                                        message: `Searching ${step.query.source} sources...`,
                                        timestamp: Date.now()
                                    }
                                });

                                if (step.type === 'web') {
                                    const webResults = await tvly.search(step.query.query, {
                                        searchDepth: depth,
                                        includeAnswer: true,
                                        maxResults: Math.min(6 - step.query.priority, 10)
                                    });

                                    searchResults.push({
                                        type: 'web',
                                        query: step.query,
                                        results: webResults.results.map(r => ({
                                            source: 'web',
                                            title: r.title,
                                            url: r.url,
                                            content: r.content
                                        }))
                                    });
                                    completedSteps++;
                                } else if (step.type === 'academic') {
                                    const academicResults = await exa.searchAndContents(step.query.query, {
                                        type: 'auto',
                                        numResults: Math.min(6 - step.query.priority, 5),
                                        category: 'research paper',
                                        summary: true
                                    });

                                    searchResults.push({
                                        type: 'academic',
                                        query: step.query,
                                        results: academicResults.results.map(r => ({
                                            source: 'academic',
                                            title: r.title || '',
                                            url: r.url || '',
                                            content: r.summary || ''
                                        }))
                                    });
                                    completedSteps++;
                                }

                                // Send completed annotation for the search step
                                dataStream.writeMessageAnnotation({
                                    type: 'research_update',
                                    data: {
                                        id: step.id,
                                        type: step.type,
                                        status: 'completed',
                                        title: step.type === 'web'
                                            ? `Searched the web for "${step.query.query}"`
                                            : step.type === 'academic'
                                                ? `Searched academic papers for "${step.query.query}"`
                                                : `Analysis of ${step.query.query} complete`,
                                        query: step.query.query,
                                        results: searchResults[searchResults.length - 1].results.map(r => {
                                            return { ...r };
                                        }),
                                        message: `Found ${searchResults[searchResults.length - 1].results.length} results`,
                                        timestamp: Date.now(),
                                        overwrite: true
                                    }
                                });

                                searchIndex++;  // Increment index
                            }

                            // Perform analyses
                            let analysisIndex = 0;  // Add index tracker

                            for (const step of stepIds.analysisSteps) {
                                dataStream.writeMessageAnnotation({
                                    type: 'research_update',
                                    data: {
                                        id: step.id,
                                        type: 'analysis',
                                        status: 'running',
                                        title: `Analyzing ${step.analysis.type}`,
                                        analysisType: step.analysis.type,
                                        message: `Analyzing ${step.analysis.type}...`,
                                        timestamp: Date.now()
                                    }
                                });

                                const { object: analysisResult } = await generateObject({
                                    model: xai("grok-beta"),
                                    temperature: 0.5,
                                    schema: z.object({
                                        findings: z.array(z.object({
                                            insight: z.string(),
                                            evidence: z.array(z.string()),
                                            confidence: z.number().min(0).max(1)
                                        })),
                                        implications: z.array(z.string()),
                                        limitations: z.array(z.string())
                                    }),
                                    prompt: `Perform a ${step.analysis.type} analysis on the search results. ${step.analysis.description}
                                            Consider all sources and their reliability.
                                            Search results: ${JSON.stringify(searchResults)}`
                                });

                                dataStream.writeMessageAnnotation({
                                    type: 'research_update',
                                    data: {
                                        id: step.id,
                                        type: 'analysis',
                                        status: 'completed',
                                        title: `Analysis of ${step.analysis.type} complete`,
                                        analysisType: step.analysis.type,
                                        findings: analysisResult.findings,
                                        message: `Analysis complete`,
                                        timestamp: Date.now(),
                                        overwrite: true
                                    }
                                });

                                analysisIndex++;  // Increment index
                            }

                            // After all analyses are complete, send running state for gap analysis
                            dataStream.writeMessageAnnotation({
                                type: 'research_update',
                                data: {
                                    id: 'gap-analysis',
                                    type: 'analysis',
                                    status: 'running',
                                    title: 'Research Gaps and Limitations',
                                    analysisType: 'gaps',
                                    message: 'Analyzing research gaps and limitations...',
                                    timestamp: Date.now()
                                }
                            });

                            // After all analyses are complete, analyze limitations and gaps
                            const { object: gapAnalysis } = await generateObject({
                                model: xai("grok-beta"),
                                temperature: 0,
                                schema: z.object({
                                    limitations: z.array(z.object({
                                        type: z.string(),
                                        description: z.string(),
                                        severity: z.number().min(2).max(10),
                                        potential_solutions: z.array(z.string())
                                    })),
                                    knowledge_gaps: z.array(z.object({
                                        topic: z.string(),
                                        reason: z.string(),
                                        additional_queries: z.array(z.string())
                                    })),
                                    recommended_followup: z.array(z.object({
                                        action: z.string(),
                                        rationale: z.string(),
                                        priority: z.number().min(2).max(10)
                                    }))
                                }),
                                prompt: `Analyze the research results and identify limitations, knowledge gaps, and recommended follow-up actions.
                                        Consider:
                                        - Quality and reliability of sources
                                        - Missing perspectives or data
                                        - Areas needing deeper investigation
                                        - Potential biases or conflicts
                                        - Severity should be between 2 and 10
                                        - Knowledge gaps should be between 2 and 10
                                        
                                        Research results: ${JSON.stringify(searchResults)}
                                        Analysis findings: ${JSON.stringify(stepIds.analysisSteps.map(step => ({
                                    type: step.analysis.type,
                                    description: step.analysis.description,
                                    importance: step.analysis.importance
                                })))}`
                            });

                            // Send gap analysis update
                            dataStream.writeMessageAnnotation({
                                type: 'research_update',
                                data: {
                                    id: 'gap-analysis',
                                    type: 'analysis',
                                    status: 'completed',
                                    title: 'Research Gaps and Limitations',
                                    analysisType: 'gaps',
                                    findings: gapAnalysis.limitations.map(l => ({
                                        insight: l.description,
                                        evidence: l.potential_solutions,
                                        confidence: (6 - l.severity) / 5
                                    })),
                                    gaps: gapAnalysis.knowledge_gaps,
                                    recommendations: gapAnalysis.recommended_followup,
                                    message: `Identified ${gapAnalysis.limitations.length} limitations and ${gapAnalysis.knowledge_gaps.length} knowledge gaps`,
                                    timestamp: Date.now(),
                                    overwrite: true,
                                    completedSteps: completedSteps + 1,
                                    totalSteps: totalSteps + (depth === 'advanced' ? 2 : 1)
                                }
                            });

                            let synthesis;

                            // If there are significant gaps and depth is 'advanced', perform additional research
                            if (depth === 'advanced' && gapAnalysis.knowledge_gaps.length > 0) {
                                const additionalQueries = gapAnalysis.knowledge_gaps.flatMap(gap =>
                                    gap.additional_queries.map(query => ({
                                        query,
                                        rationale: gap.reason,
                                        source: 'both' as const,
                                        priority: 3
                                    }))
                                );

                                // Execute additional searches for gaps
                                for (const query of additionalQueries) {
                                    // Generate a unique ID for this gap search
                                    const gapSearchId = `gap-search-${searchIndex++}`;

                                    // Send running annotation for this gap search
                                    dataStream.writeMessageAnnotation({
                                        type: 'research_update',
                                        data: {
                                            id: gapSearchId,
                                            type: 'web',
                                            status: 'running',
                                            title: `Additional search for "${query.query}"`,
                                            query: query.query,
                                            message: `Searching to fill knowledge gap: ${query.rationale}`,
                                            timestamp: Date.now()
                                        }
                                    });

                                    // Execute web search
                                    const webResults = await tvly.search(query.query, {
                                        searchDepth: depth,
                                        includeAnswer: true,
                                        maxResults: 5
                                    });

                                    // Add to search results
                                    searchResults.push({
                                        type: 'web',
                                        query: {
                                            query: query.query,
                                            rationale: query.rationale,
                                            source: 'web',
                                            priority: query.priority
                                        },
                                        results: webResults.results.map(r => ({
                                            source: 'web',
                                            title: r.title,
                                            url: r.url,
                                            content: r.content
                                        }))
                                    });

                                    // Send completed annotation for web search
                                    dataStream.writeMessageAnnotation({
                                        type: 'research_update',
                                        data: {
                                            id: gapSearchId,
                                            type: 'web',
                                            status: 'completed',
                                            title: `Additional web search for "${query.query}"`,
                                            query: query.query,
                                            results: webResults.results.map(r => ({
                                                source: 'web',
                                                title: r.title,
                                                url: r.url,
                                                content: r.content
                                            })),
                                            message: `Found ${webResults.results.length} results`,
                                            timestamp: Date.now(),
                                            overwrite: true
                                        }
                                    });

                                    // For 'both' source type, also do academic search
                                    if (query.source === 'both') {
                                        const academicSearchId = `gap-search-academic-${searchIndex++}`;

                                        // Send running annotation for academic search
                                        dataStream.writeMessageAnnotation({
                                            type: 'research_update',
                                            data: {
                                                id: academicSearchId,
                                                type: 'academic',
                                                status: 'running',
                                                title: `Additional academic search for "${query.query}"`,
                                                query: query.query,
                                                message: `Searching academic sources to fill knowledge gap: ${query.rationale}`,
                                                timestamp: Date.now()
                                            }
                                        });

                                        // Execute academic search
                                        const academicResults = await exa.searchAndContents(query.query, {
                                            type: 'auto',
                                            numResults: 3,
                                            category: 'research paper',
                                            summary: true
                                        });

                                        // Add to search results
                                        searchResults.push({
                                            type: 'academic',
                                            query: {
                                                query: query.query,
                                                rationale: query.rationale,
                                                source: 'academic',
                                                priority: query.priority
                                            },
                                            results: academicResults.results.map(r => ({
                                                source: 'academic',
                                                title: r.title || '',
                                                url: r.url || '',
                                                content: r.summary || ''
                                            }))
                                        });

                                        // Send completed annotation for academic search
                                        dataStream.writeMessageAnnotation({
                                            type: 'research_update',
                                            data: {
                                                id: academicSearchId,
                                                type: 'academic',
                                                status: 'completed',
                                                title: `Additional academic search for "${query.query}"`,
                                                query: query.query,
                                                results: academicResults.results.map(r => ({
                                                    source: 'academic',
                                                    title: r.title || '',
                                                    url: r.url || '',
                                                    content: r.summary || ''
                                                })),
                                                message: `Found ${academicResults.results.length} academic sources`,
                                                timestamp: Date.now(),
                                                overwrite: true
                                            }
                                        });
                                    }

                                    completedSteps++; // Increment completed steps counter
                                }

                                // Send running state for final synthesis
                                dataStream.writeMessageAnnotation({
                                    type: 'research_update',
                                    data: {
                                        id: 'final-synthesis',
                                        type: 'analysis',
                                        status: 'running',
                                        title: 'Final Research Synthesis',
                                        analysisType: 'synthesis',
                                        message: 'Synthesizing all research findings...',
                                        timestamp: Date.now()
                                    }
                                });

                                // Perform final synthesis of all findings
                                const { object: finalSynthesis } = await generateObject({
                                    model: xai("grok-beta"),
                                    temperature: 0,
                                    schema: z.object({
                                        key_findings: z.array(z.object({
                                            finding: z.string(),
                                            confidence: z.number().min(0).max(1),
                                            supporting_evidence: z.array(z.string())
                                        })),
                                        remaining_uncertainties: z.array(z.string())
                                    }),
                                    prompt: `Synthesize all research findings, including gap analysis and follow-up research.
                                            Highlight key conclusions and remaining uncertainties.
                                            
                                            Original results: ${JSON.stringify(searchResults)}
                                            Gap analysis: ${JSON.stringify(gapAnalysis)}
                                            Additional findings: ${JSON.stringify(additionalQueries)}`
                                });

                                synthesis = finalSynthesis;

                                // Send final synthesis update
                                dataStream.writeMessageAnnotation({
                                    type: 'research_update',
                                    data: {
                                        id: 'final-synthesis',
                                        type: 'analysis',
                                        status: 'completed',
                                        title: 'Final Research Synthesis',
                                        analysisType: 'synthesis',
                                        findings: finalSynthesis.key_findings.map(f => ({
                                            insight: f.finding,
                                            evidence: f.supporting_evidence,
                                            confidence: f.confidence
                                        })),
                                        uncertainties: finalSynthesis.remaining_uncertainties,
                                        message: `Synthesized ${finalSynthesis.key_findings.length} key findings`,
                                        timestamp: Date.now(),
                                        overwrite: true,
                                        completedSteps: totalSteps + (depth === 'advanced' ? 2 : 1) - 1,
                                        totalSteps: totalSteps + (depth === 'advanced' ? 2 : 1)
                                    }
                                });
                            }

                            // Final progress update
                            const finalProgress = {
                                id: 'research-progress',
                                type: 'progress' as const,
                                status: 'completed' as const,
                                message: `Research complete`,
                                completedSteps: totalSteps + (depth === 'advanced' ? 2 : 1),
                                totalSteps: totalSteps + (depth === 'advanced' ? 2 : 1),
                                isComplete: true,
                                timestamp: Date.now()
                            };

                            dataStream.writeMessageAnnotation({
                                type: 'research_update',
                                data: {
                                    ...finalProgress,
                                    overwrite: true
                                }
                            });

                            return {
                                plan: researchPlan,
                                results: searchResults,
                                synthesis: synthesis
                            };
                        },
                    }),
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
                onFinish(event) {
                    console.log('Fin reason: ', event.finishReason);
                    console.log('Reasoning: ', event.reasoning);
                    console.log('reasoning details: ', event.reasoningDetails);
                    console.log('Steps ', event.steps);
                    console.log('Messages: ', event.response.messages);
                },
                onError(event) {
                    console.log('Error: ', event.error);
                },
            });

            result.consumeStream();

            return result.mergeIntoDataStream(dataStream, {
                sendReasoning: true,
                sendSources: true
            });
        }
    })
}