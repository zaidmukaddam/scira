import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';
import { UIMessageStreamWriter } from 'ai';
import { ChatMessage } from '../types';
import Parallel from 'parallel-web';
import FirecrawlApp, { SearchResultWeb, SearchResultNews, SearchResultImages, Document } from '@mendable/firecrawl-js';
import { tavily, type TavilyClient } from '@tavily/core';
import { all } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';

// Singleton clients - initialized lazily and reused across requests
let _searchClients: {
  exa: Exa;
  parallel: Parallel;
  firecrawl: FirecrawlApp;
  tvly: TavilyClient;
} | null = null;

function getSearchClients() {
  if (!_searchClients) {
    _searchClients = {
      exa: new Exa(serverEnv.EXA_API_KEY),
      parallel: new Parallel({ apiKey: serverEnv.PARALLEL_API_KEY }),
      firecrawl: new FirecrawlApp({ apiKey: serverEnv.FIRECRAWL_API_KEY }),
      tvly: tavily({ apiKey: serverEnv.TAVILY_API_KEY }),
    };
  }
  return _searchClients;
}

const extractDomain = (url: string | null | undefined): string => {
  if (!url || typeof url !== 'string') return '';
  const urlPattern = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/i;
  return url.match(urlPattern)?.[1] || url;
};

const cleanTitle = (title: string): string => {
  // Remove content within square brackets and parentheses, then trim whitespace
  return title
    .replace(/\[.*?\]/g, '') // Remove [content]
    .replace(/\(.*?\)/g, '') // Remove (content)
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing whitespace
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

// Helper function to check if an item is SearchResultWeb
const isSearchResultWeb = (item: SearchResultWeb | Document): item is SearchResultWeb => {
  return 'url' in item && typeof item.url === 'string';
};

// Helper function to check if an item is SearchResultNews with valid URL
const isSearchResultNewsWithUrl = (item: SearchResultNews | Document): item is SearchResultNews & { url: string } => {
  return 'url' in item && typeof item.url === 'string' && item.url.length > 0;
};

// Helper function to check if an item is SearchResultImages
const isSearchResultImages = (item: SearchResultImages | Document): item is SearchResultImages => {
  return ('url' in item && typeof item.url === 'string') || ('imageUrl' in item && typeof item.imageUrl === 'string');
};

// Helper function to get URL from SearchResultImages
const getImageUrl = (item: SearchResultImages): string | undefined => {
  return item.imageUrl || item.url;
};

const processDomains = (domains?: (string | null)[]): string[] | undefined => {
  if (!domains || domains.length === 0) return undefined;

  const processedDomains = domains.map((domain) => extractDomain(domain)).filter((domain) => domain.trim() !== '');
  return processedDomains.length === 0 ? undefined : processedDomains;
};

// Helper functions for Tavily image processing
const sanitizeUrl = (url: string): string => {
  try {
    // Remove any additional URL parameters that might cause issues
    const urlObj = new URL(url);
    return urlObj.href;
  } catch {
    return url;
  }
};

const isValidImageUrl = async (url: string): Promise<{ valid: boolean; redirectedUrl?: string }> => {
  try {
    // Just return valid for now - we can add more sophisticated validation later
    return { valid: true, redirectedUrl: url };
  } catch {
    return { valid: false };
  }
};

// Search provider strategy interface
interface SearchStrategy {
  search(
    queries: string[],
    options: {
      maxResults: number[];
      topics: ('general' | 'news')[];
      quality: ('default' | 'best')[];
      startDates?: (string | null)[];
      dataStream?: UIMessageStreamWriter<ChatMessage>;
    },
  ): Promise<{ searches: Array<{ query: string; results: any[]; images: any[] }> }>;
}

// Helper function to format date for Firecrawl tbs parameter
const formatDateForFirecrawl = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

// Parallel AI search strategy
class ParallelSearchStrategy implements SearchStrategy {
  constructor(
    private parallel: Parallel,
    private firecrawl: FirecrawlApp,
  ) {}

  async search(
    queries: string[],
    options: {
      maxResults: number[];
      topics: ('general' | 'news')[];
      quality: ('default' | 'best')[];
      startDates?: (string | null)[];
      dataStream?: UIMessageStreamWriter<ChatMessage>;
    },
  ) {
    // Limit queries to first 5 for Parallel AI
    const limitedQueries = queries.slice(0, 5);
    console.log('Using Parallel AI batch processing for queries:', limitedQueries);

    // Send start notifications for all queries
    limitedQueries.forEach((query, index) => {
      options.dataStream?.write({
        type: 'data-query_completion',
        data: {
          query,
          index,
          total: limitedQueries.length,
          status: 'started',
          resultsCount: 0,
          imagesCount: 0,
        },
      });
    });

    try {
      const perQueryPromises = limitedQueries.map(async (query, index) => {
        const currentQuality = options.quality[index] || options.quality[0] || 'default';
        const currentMaxResults = options.maxResults[index] || options.maxResults[0] || 10;
        const currentStartDate = options.startDates?.[index] || options.startDates?.[0] || null;
        const parallel = this.parallel;
        const firecrawl = this.firecrawl;

        try {
          const { results, images } = await all(
            {
              singleResponse: async function () {
                return parallel.beta.search({
                  objective: query,
                  mode: currentQuality === 'best' ? 'agentic' : 'fast' as any,
                  max_results: Math.max(currentMaxResults, 10),
                  excerpts: {
                    max_chars_per_result: 5000,
                  },
                  fetch_policy: {
                    max_age_seconds: 3600,
                    timeout_seconds: 120,
                  },
                  ...(currentStartDate && {
                    source_policy: {
                      after_date: currentStartDate,
                    },
                  }),
                });
              },
              firecrawlImages: async function () {
                return firecrawl
                  .search(query, {
                    sources: ['images'],
                    limit: 3,
                    scrapeOptions: {
                      storeInCache: true,
                    },
                  })
                  .catch((error) => {
                    console.error(`Firecrawl error for query "${query}":`, error);
                    return { images: [] } as Partial<Document> as any;
                  });
              },
              results: async function () {
                const singleResponse = await this.$.singleResponse;
                return (singleResponse?.results || []).map((result: any) => ({
                  url: result.url,
                  title: cleanTitle(result.title || ''),
                  content: Array.isArray(result.excerpts)
                    ? result.excerpts.join(' ').substring(0, 1000)
                    : (result.content || '').substring(0, 1000),
                  published_date: result.publish_date || undefined,
                  author: undefined,
                }));
              },
              images: async function () {
                const firecrawlImages = await this.$.firecrawlImages;
                return ((firecrawlImages as any)?.images || [])
                  .filter(isSearchResultImages)
                  .map((item: any) => ({
                    url: getImageUrl(item) || '',
                    description: cleanTitle(item.title || ''),
                  }))
                  .filter((item: any) => item.url);
              },
            },
            getBetterAllOptions(),
          );

          // Send completion notification
          options.dataStream?.write({
            type: 'data-query_completion',
            data: {
              query,
              index,
              total: limitedQueries.length,
              status: 'completed',
              resultsCount: results.length,
              imagesCount: images.length,
            },
          });

          return {
            query,
            results: deduplicateByDomainAndUrl(results),
            images: deduplicateByDomainAndUrl(images),
          };
        } catch (error) {
          console.error(`Parallel AI search error for query "${query}":`, error);

          options.dataStream?.write({
            type: 'data-query_completion',
            data: {
              query,
              index,
              total: limitedQueries.length,
              status: 'error',
              resultsCount: 0,
              imagesCount: 0,
            },
          });

          return { query, results: [], images: [] };
        }
      });

      const perQueryMap = await all(
        Object.fromEntries(perQueryPromises.map((promise, index) => [`q:${index}`, async () => promise])),
        getBetterAllOptions(),
      );
      const searchResults = limitedQueries.map((_, index) => perQueryMap[`q:${index}`]);
      return { searches: searchResults };
    } catch (error) {
      console.error('Parallel AI batch orchestration error:', error);

      // Send error notifications for all queries
      limitedQueries.forEach((query, index) => {
        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: limitedQueries.length,
            status: 'error',
            resultsCount: 0,
            imagesCount: 0,
          },
        });
      });

      return {
        searches: limitedQueries.map((query) => ({ query, results: [], images: [] })),
      };
    }
  }
}

// Tavily search strategy
class TavilySearchStrategy implements SearchStrategy {
  constructor(private tvly: TavilyClient) {}

  async search(
    queries: string[],
    options: {
      maxResults: number[];
      topics: ('general' | 'news')[];
      quality: ('default' | 'best')[];
      startDates?: (string | null)[];
      dataStream?: UIMessageStreamWriter<ChatMessage>;
    },
  ) {
    const searchPromises = queries.map(async (query, index) => {
      const currentTopic = options.topics[index] || options.topics[0] || 'general';
      const currentMaxResults = options.maxResults[index] || options.maxResults[0] || 10;
      const currentQuality = options.quality[index] || options.quality[0] || 'default';
      const currentStartDate = options.startDates?.[index] || options.startDates?.[0] || null;
      const tvly = this.tvly;

      // Format date as YYYY-MM-DD for Tavily
      const formatDateForTavily = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
      };

      // Get today's date in YYYY-MM-DD format
      const getTodayForTavily = (): string => {
        return new Date().toISOString().split('T')[0];
      };

      try {
        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'started',
            resultsCount: 0,
            imagesCount: 0,
          },
        });

        const { results, images } = await all(
          {
            tavilyData: async function () {
              return tvly.search(query, {
                topic: currentTopic || 'general',
                ...(currentStartDate
                  ? {
                      startDate: formatDateForTavily(currentStartDate),
                      endDate: getTodayForTavily(),
                    }
                  : currentTopic === 'news'
                    ? { days: 7 }
                    : {}),
                maxResults: currentMaxResults,
                searchDepth: currentQuality === 'best' ? 'advanced' : ('ultra-fast' as any),
                includeAnswer: true,
                includeImages: true,
                includeImageDescriptions: true,
              });
            },
            results: async function () {
              const tavilyData = await this.$.tavilyData;
              return deduplicateByDomainAndUrl(tavilyData.results).map((obj: any) => ({
                url: obj.url,
                title: cleanTitle(obj.title || ''),
                content: obj.content,
                published_date: currentTopic === 'news' ? obj.published_date : undefined,
                author: undefined,
              }));
            },
            images: async function () {
              const tavilyData = await this.$.tavilyData;
              const imagePromises = deduplicateByDomainAndUrl(tavilyData.images || []).map(
                async ({ url, description }: { url: string; description?: string }) => {
                  const sanitizedUrl = sanitizeUrl(url);
                  const imageValidation = await isValidImageUrl(sanitizedUrl);
                  return imageValidation.valid
                    ? {
                        url: imageValidation.redirectedUrl || sanitizedUrl,
                        description: description || '',
                      }
                    : null;
                },
              );
              const imageMap = await all(
                Object.fromEntries(imagePromises.map((promise, index) => [`img:${index}`, async () => promise])),
                getBetterAllOptions(),
              );
              const validated = imagePromises.map((_, index) => imageMap[`img:${index}`]);
              return validated.filter(
                (image): image is { url: string; description: string } =>
                  image !== null &&
                  typeof image === 'object' &&
                  typeof image.description === 'string' &&
                  image.description !== '',
              );
            },
          },
          getBetterAllOptions(),
        );

        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'completed',
            resultsCount: results.length,
            imagesCount: images.length,
          },
        });

        return {
          query,
          results,
          images: images.filter((img) => img.url && img.description),
        };
      } catch (error) {
        console.error(`Tavily search error for query "${query}":`, error);

        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'error',
            resultsCount: 0,
            imagesCount: 0,
          },
        });

        return {
          query,
          results: [],
          images: [],
        };
      }
    });

    const searchMap = await all(
      Object.fromEntries(searchPromises.map((promise, index) => [`q:${index}`, async () => promise])),
      getBetterAllOptions(),
    );
    const searchResults = queries.map((_, index) => searchMap[`q:${index}`]);
    return { searches: searchResults };
  }
}

// Firecrawl search strategy
class FirecrawlSearchStrategy implements SearchStrategy {
  constructor(private firecrawl: FirecrawlApp) {}

  async search(
    queries: string[],
    options: {
      maxResults: number[];
      topics: ('general' | 'news')[];
      quality: ('default' | 'best')[];
      startDates?: (string | null)[];
      dataStream?: UIMessageStreamWriter<ChatMessage>;
    },
  ) {
    const searchPromises = queries.map(async (query, index) => {
      const currentTopic = options.topics[index] || options.topics[0] || 'general';
      const currentMaxResults = options.maxResults[index] || options.maxResults[0] || 10;
      const currentStartDate = options.startDates?.[index] || options.startDates?.[0] || null;
      const firecrawl = this.firecrawl;

      // Build tbs parameter for date filtering
      const buildTbsParam = (startDate: string | null): string | undefined => {
        if (!startDate) return undefined;
        const startFormatted = formatDateForFirecrawl(startDate);
        const endFormatted = formatDateForFirecrawl(new Date().toISOString());
        return `cdr:1,cd_min:${startFormatted},cd_max:${endFormatted}`;
      };

      try {
        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'started',
            resultsCount: 0,
            imagesCount: 0,
          },
        });

        const { results, images } = await all(
          {
            firecrawlData: async function () {
              const sources = [] as ('web' | 'news' | 'images')[];

              if (currentTopic === 'news') {
                sources.push('news', 'web');
              } else {
                sources.push('web');
              }
              sources.push('images');

              const tbsParam = buildTbsParam(currentStartDate);
              return firecrawl.search(query, {
                sources,
                limit: currentMaxResults,
                ...(tbsParam && { tbs: tbsParam }),
              });
            },
            results: async function () {
              const firecrawlData = await this.$.firecrawlData;
              let results: any[] = [];

              if (firecrawlData?.web && Array.isArray(firecrawlData.web)) {
                const webResults = firecrawlData.web.filter(isSearchResultWeb);
                results = deduplicateByDomainAndUrl(webResults).map((result) => ({
                  url: result.url,
                  title: cleanTitle(result.title || ''),
                  content: result.description || '',
                  published_date: undefined,
                  author: undefined,
                }));
              }

              if (firecrawlData?.news && Array.isArray(firecrawlData.news) && currentTopic === 'news') {
                const newsResults = firecrawlData.news.filter(isSearchResultNewsWithUrl);
                const processedNewsResults = deduplicateByDomainAndUrl(newsResults).map((result) => ({
                  url: result.url,
                  title: cleanTitle(result.title || ''),
                  content: result.snippet || '',
                  published_date: result.date || undefined,
                  author: undefined,
                }));

                results = [...processedNewsResults, ...results];
              }

              return results;
            },
            images: async function () {
              const firecrawlData = await this.$.firecrawlData;
              if (!firecrawlData?.images || !Array.isArray(firecrawlData.images)) return [];

              const imageResults = firecrawlData.images.filter(isSearchResultImages);
              const processedImages = imageResults
                .map((image) => ({
                  url: getImageUrl(image) || '',
                  description: cleanTitle(image.title || ''),
                }))
                .filter((img) => img.url);
              return deduplicateByDomainAndUrl(processedImages);
            },
          },
          getBetterAllOptions(),
        );

        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'completed',
            resultsCount: results.length,
            imagesCount: images.length,
          },
        });

        return {
          query,
          results: deduplicateByDomainAndUrl(results),
          images: images.filter((img) => img.url && img.description),
        };
      } catch (error) {
        console.error(`Firecrawl search error for query "${query}":`, error);

        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'error',
            resultsCount: 0,
            imagesCount: 0,
          },
        });

        return {
          query,
          results: [],
          images: [],
        };
      }
    });

    const searchMap = await all(
      Object.fromEntries(searchPromises.map((promise, index) => [`q:${index}`, async () => promise])),
      getBetterAllOptions(),
    );
    const searchResults = queries.map((_, index) => searchMap[`q:${index}`]);
    return { searches: searchResults };
  }
}

// Exa search strategy
class ExaSearchStrategy implements SearchStrategy {
  constructor(
    private exa: Exa,
    private firecrawl: FirecrawlApp,
  ) {}

  async search(
    queries: string[],
    options: {
      maxResults: number[];
      topics: ('general' | 'news')[];
      quality: ('default' | 'best')[];
      startDates?: (string | null)[];
      include_domains?: string[];
      exclude_domains?: string[];
      dataStream?: UIMessageStreamWriter<ChatMessage>;
    },
  ) {
    const searchPromises = queries.map(async (query, index) => {
      const currentTopic = options.topics[index] || options.topics[0] || 'general';
      const currentMaxResults = options.maxResults[index] || options.maxResults[0] || 10;
      const currentQuality = options.quality[index] || options.quality[0] || 'default';
      const currentStartDate = options.startDates?.[index] || options.startDates?.[0] || null;
      const exa = this.exa;
      const firecrawl = this.firecrawl;

      // Convert date to ISO format for Exa
      const formatDateForExa = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toISOString();
      };

      try {
        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'started',
            resultsCount: 0,
            imagesCount: 0,
          },
        });

        const { results, images } = await all(
          {
            data: async function () {
              const startPublishedDate = currentStartDate ? formatDateForExa(currentStartDate) : undefined;
              const endPublishedDate = currentStartDate ? formatDateForExa(new Date().toISOString()) : undefined;
              return exa.search(query, {
                type: currentQuality === 'best' ? 'deep' : 'instant',
                numResults: currentMaxResults < 15 ? 15 : currentMaxResults,
                category: currentTopic === 'news' ? 'news' : undefined,
                ...(startPublishedDate && { startPublishedDate }),
                ...(endPublishedDate && { endPublishedDate }),
                contents: {
                  highlights: {
                    maxCharacters: 4000
                  }
                },
              });
            },
            firecrawlImages: async function () {
              return firecrawl
                .search(query, {
                  sources: ['images'],
                  limit: 8,
                  scrapeOptions: {
                    storeInCache: true,
                  },
                })
                .catch((error) => {
                  console.error(`Firecrawl image search error for query "${query}":`, error);
                  return { images: [] } as Partial<Document> as any;
                });
            },
            results: async function () {
              const data = await this.$.data;
              return deduplicateByDomainAndUrl(
                data.results.map((result) => ({
                  url: result.url,
                  title: cleanTitle(result.title || ''),
                  content: (result.highlights?.join(' ') || '').substring(0, 1000),
                  published_date: result.publishedDate ? result.publishedDate : undefined,
                  author: result.author || undefined,
                })),
              );
            },
            images: async function () {
              const firecrawlImages = await this.$.firecrawlImages;
              return ((firecrawlImages as any)?.images || [])
                .filter(isSearchResultImages)
                .map((item: any) => ({
                  url: getImageUrl(item) || '',
                  description: cleanTitle(item.title || ''),
                }))
                .filter((item: any) => item.url);
            },
          },
          getBetterAllOptions(),
        );

        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'completed',
            resultsCount: results.length,
            imagesCount: images.length,
          },
        });

        return {
          query,
          results: deduplicateByDomainAndUrl(results),
          images: deduplicateByDomainAndUrl(images.filter((img: { url: string; description: string }) => img.url && img.description)),
        };
      } catch (error) {
        console.error(`Exa search error for query "${query}":`, error);

        options.dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index,
            total: queries.length,
            status: 'error',
            resultsCount: 0,
            imagesCount: 0,
          },
        });

        return {
          query,
          results: [],
          images: [],
        };
      }
    });

    const searchMap = await all(
      Object.fromEntries(searchPromises.map((promise, index) => [`q:${index}`, async () => promise])),
      getBetterAllOptions(),
    );
    const searchResults = queries.map((_, index) => searchMap[`q:${index}`]);
    return { searches: searchResults };
  }
}

// Search provider factory
const createSearchStrategy = (
  provider: 'exa' | 'parallel' | 'tavily' | 'firecrawl',
  clients: {
    exa: Exa;
    parallel: Parallel;
    firecrawl: FirecrawlApp;
    tvly: TavilyClient;
  },
): SearchStrategy => {
  const strategies = {
    parallel: () => new ParallelSearchStrategy(clients.parallel, clients.firecrawl),
    tavily: () => new TavilySearchStrategy(clients.tvly),
    firecrawl: () => new FirecrawlSearchStrategy(clients.firecrawl),
    exa: () => new ExaSearchStrategy(clients.exa, clients.firecrawl),
  };

  return strategies[provider]();
};

export function webSearchTool(
  dataStream?: UIMessageStreamWriter<ChatMessage> | undefined,
  searchProvider: 'exa' | 'parallel' | 'tavily' | 'firecrawl' = 'exa',
) {
  return tool({
    description: `This is the default tool of the app to be used to search the web for information with multiple queries(5-10), max results(15-20), topics, and quality.
    Very important Rules:
    ...${searchProvider === 'parallel' ? 'The First Query should be the objective and the rest of the queries should be related to the objective' : ''}...
    - The queries should always be in the same language as the user's message.
    - And count of the queries should be 5-10 always!
    - Assert to max number of results for each query to be 15-20.
    - Your knowledge base is zero, so you must gather as much information as possible from the tools you have.
    - **Prohibition**: NEVER use the retrieve tool after running web_search tool
    - Do not use the best quality unless absolutly required since it is time expensive.
    - ⚠️ CRITICAL: ALWAYS include date/time context in search queries:
      - For current events: "latest", "${new Date().getFullYear()}", "today", "current", "recent"
      - For historical info: specific years or date ranges
      - For time-sensitive topics: "newest", "updated", "${new Date().getFullYear()}"
      - **NO TEMPORAL ASSUMPTIONS**: Never assume time periods - always be explicit about dates/years
      - Examples: "latest AI news ${new Date().getFullYear()}", "current stock prices today", "recent developments in ${new Date().getFullYear()}"
    `,
    inputSchema: z.object({
      queries: z
        .array(z.string().describe('Array of 3-5 search queries to look up on the web. Default is 5. Minimum is 3.'))
        .min(3),
      maxResults: z
        .array(
          z
            .number()
            .describe(
              'Array of maximum number of results to return per query. Default is 10. Minimum is 10. Maximum is 15.',
            ),
        )
        .optional(),
      topics: z
        .array(
          z
            .enum(['general', 'news'])
            .describe(
              'Array of topic types to search for. Default is general. Other options are news and finance. No other options are available.',
            ),
        )
        .optional(),
      quality: z
        .array(
          z
            .enum(['default', 'best'])
            .describe(
              'Array of quality levels for the search. Default is default. Other option is best. DO NOT use best unless necessary.',
            ),
        )
        .optional(),
      startDates: z
        .array(
          z
            .string()
            .nullable()
            .optional()
            .describe(
              'Array of start dates for filtering search results. Use ISO date format (YYYY-MM-DD). Results will be filtered to show only content published after this date. Default to 3 days ago if not specified. Use empty string for no date filter on a specific query.',
            ),
        )
        .optional(),
    }),
    execute: async ({
      queries,
      maxResults,
      topics,
      quality,
      startDates,
    }: {
      queries: string[];
      maxResults?: (number | undefined)[];
      topics?: ('general' | 'news' | undefined)[];
      quality?: ('default' | 'best' | undefined)[];
      startDates?: (string | null | undefined)[];
    }) => {
      // Use singleton clients (initialized at module level for reuse)
      const clients = getSearchClients();

      console.log('Queries:', queries);
      console.log('Max Results:', maxResults);
      console.log('Topics:', topics);
      console.log('Quality:', quality);
      console.log('Start Dates:', startDates);
      console.log('Search Provider:', searchProvider);

      // Create and use the appropriate search strategy
      const strategy = createSearchStrategy(searchProvider, clients);
      if (!maxResults) {
        maxResults = new Array(queries.length).fill(10);
      }
      if (!topics) {
        topics = new Array(queries.length).fill('general');
      }
      if (!quality) {
        quality = new Array(queries.length).fill('default');
      }
      const searchOptions = {
        maxResults: maxResults as number[],
        topics: topics as ('general' | 'news')[],
        quality: quality as ('default' | 'best')[],
        startDates: startDates as (string | null)[] | undefined,
        dataStream,
      };
      let result = await strategy.search(queries, searchOptions);
      const hasNoResults = result.searches.every((s) => s.results.length === 0);
      if (hasNoResults && searchProvider !== 'firecrawl') {
        console.log(`${searchProvider} returned no results, falling back to Firecrawl`);
        const fallbackStrategy = createSearchStrategy('firecrawl', clients);
        result = await fallbackStrategy.search(queries, searchOptions);
      }
      return result;
    },
  });
}
