import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';
import { UIMessageStreamWriter } from 'ai';
import { ChatMessage } from '../types';
import Parallel from 'parallel-web';
import FirecrawlApp, { SearchResultWeb, SearchResultNews, SearchResultImages, Document } from '@mendable/firecrawl-js';
import { tavily, type TavilyClient } from '@tavily/core';

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
      dataStream?: UIMessageStreamWriter<ChatMessage>;
    },
  ): Promise<{ searches: Array<{ query: string; results: any[]; images: any[] }> }>;
}

// Parallel AI search strategy
class ParallelSearchStrategy implements SearchStrategy {
  constructor(
    private parallel: Parallel,
    private firecrawl: FirecrawlApp,
  ) { }

  async search(
    queries: string[],
    options: {
      maxResults: number[];
      topics: ('general' | 'news')[];
      quality: ('default' | 'best')[];
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

        try {
          // Run Parallel AI search and Firecrawl images concurrently per query
          const [singleResponse, firecrawlImages] = await Promise.all([
            this.parallel.beta.search({
              objective: query,
              search_queries: [query],
              processor: currentQuality === 'best' ? 'pro' : 'base',
              max_results: Math.max(currentMaxResults, 10),
              max_chars_per_result: 1000,
            }),
            this.firecrawl.search(query, {
              sources: ['images'],
              limit: 3,
            }).catch((error) => {
              console.error(`Firecrawl error for query "${query}":`, error);
              return { images: [] } as Partial<Document> as any;
            }),
          ]);

          const results = (singleResponse?.results || []).map((result: any) => ({
            url: result.url,
            title: cleanTitle(result.title || ''),
            content: Array.isArray(result.excerpts)
              ? result.excerpts.join(' ').substring(0, 1000)
              : (result.content || '').substring(0, 1000),
            published_date: undefined,
            author: undefined,
          }));

          const images = ((firecrawlImages as any)?.images || [])
            .filter(isSearchResultImages)
            .map((item: any) => ({
              url: getImageUrl(item) || '',
              description: cleanTitle(item.title || ''),
            }))
            .filter((item: any) => item.url);

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

      const searchResults = await Promise.all(perQueryPromises);
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
  constructor(private tvly: TavilyClient) { }

  async search(
    queries: string[],
    options: {
      maxResults: number[];
      topics: ('general' | 'news')[];
      quality: ('default' | 'best')[];
      dataStream?: UIMessageStreamWriter<ChatMessage>;
    },
  ) {
    const searchPromises = queries.map(async (query, index) => {
      const currentTopic = options.topics[index] || options.topics[0] || 'general';
      const currentMaxResults = options.maxResults[index] || options.maxResults[0] || 10;
      const currentQuality = options.quality[index] || options.quality[0] || 'default';

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

        const tavilyData = await this.tvly.search(query, {
          topic: currentTopic || 'general',
          days: currentTopic === 'news' ? 7 : undefined,
          maxResults: currentMaxResults,
          searchDepth: currentQuality === 'best' ? 'advanced' : 'basic',
          includeAnswer: true,
          includeImages: true,
          includeImageDescriptions: true,
        });

        const results = deduplicateByDomainAndUrl(tavilyData.results).map((obj: any) => ({
          url: obj.url,
          title: cleanTitle(obj.title || ''),
          content: obj.content,
          published_date: currentTopic === 'news' ? obj.published_date : undefined,
          author: undefined,
        }));

        // Process Tavily images with validation
        const images = await Promise.all(
          deduplicateByDomainAndUrl(tavilyData.images || []).map(
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
          ),
        ).then((results) =>
          results.filter(
            (image): image is { url: string; description: string } =>
              image !== null &&
              typeof image === 'object' &&
              typeof image.description === 'string' &&
              image.description !== '',
          ),
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

    const searchResults = await Promise.all(searchPromises);
    return { searches: searchResults };
  }
}

// Firecrawl search strategy
class FirecrawlSearchStrategy implements SearchStrategy {
  constructor(private firecrawl: FirecrawlApp) { }

  async search(
    queries: string[],
    options: {
      maxResults: number[];
      topics: ('general' | 'news')[];
      quality: ('default' | 'best')[];
      dataStream?: UIMessageStreamWriter<ChatMessage>;
    },
  ) {
    const searchPromises = queries.map(async (query, index) => {
      const currentTopic = options.topics[index] || options.topics[0] || 'general';
      const currentMaxResults = options.maxResults[index] || options.maxResults[0] || 10;

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

        const sources = [] as ('web' | 'news' | 'images')[];

        // Map topics to Firecrawl sources
        if (currentTopic === 'news') {
          sources.push('news', 'web');
        } else {
          sources.push('web');
        }
        sources.push('images'); // Always include images

        const firecrawlData = await this.firecrawl.search(query, {
          sources,
          limit: currentMaxResults,
        });

        let results: any[] = [];

        // Process web results
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

        // Process news results if available
        if (firecrawlData?.news && Array.isArray(firecrawlData.news) && currentTopic === 'news') {
          const newsResults = firecrawlData.news.filter(isSearchResultNewsWithUrl);
          const processedNewsResults = deduplicateByDomainAndUrl(newsResults).map((result) => ({
            url: result.url,
            title: cleanTitle(result.title || ''),
            content: result.snippet || '',
            published_date: result.date || undefined,
            author: undefined,
          }));

          // Combine news and web results, prioritizing news
          results = [...processedNewsResults, ...results];
        }

        // Process images with deduplication
        let images: { url: string; description: string }[] = [];
        if (firecrawlData?.images && Array.isArray(firecrawlData.images)) {
          const imageResults = firecrawlData.images.filter(isSearchResultImages);
          const processedImages = imageResults
            .map((image) => ({
              url: getImageUrl(image) || '',
              description: cleanTitle(image.title || ''),
            }))
            .filter((img) => img.url);
          images = deduplicateByDomainAndUrl(processedImages);
        }

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

    const searchResults = await Promise.all(searchPromises);
    return { searches: searchResults };
  }
}

// Exa search strategy
class ExaSearchStrategy implements SearchStrategy {
  constructor(private exa: Exa) { }

  async search(
    queries: string[],
    options: {
      maxResults: number[];
      topics: ('general' | 'news')[];
      quality: ('default' | 'best')[];
      include_domains?: string[];
      exclude_domains?: string[];
      dataStream?: UIMessageStreamWriter<ChatMessage>;
    },
  ) {
    const searchPromises = queries.map(async (query, index) => {
      const currentTopic = options.topics[index] || options.topics[0] || 'general';
      const currentMaxResults = options.maxResults[index] || options.maxResults[0] || 10;
      const currentQuality = options.quality[index] || options.quality[0] || 'default';

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

        const searchOptions: any = {
          text: true,
          type: currentQuality === 'best' ? 'hybrid' : 'auto',
          numResults: currentMaxResults < 10 ? 10 : currentMaxResults,
          livecrawl: 'preferred',
          useAutoprompt: true,
          category: currentTopic === 'news' ? 'news' : '',
        };

        // Domain include/exclude behavior removed

        const data = await this.exa.searchAndContents(query, searchOptions);

        // Collect all images first
        const collectedImages: { url: string; description: string }[] = [];

        const results = data.results.map((result) => {
          if (result.image) {
            collectedImages.push({
              url: result.image,
              description: cleanTitle(result.title || result.text?.substring(0, 100) + '...' || ''),
            });
          }

          return {
            url: result.url,
            title: cleanTitle(result.title || ''),
            content: (result.text || '').substring(0, 1000),
            published_date: currentTopic === 'news' && result.publishedDate ? result.publishedDate : undefined,
            author: result.author || undefined,
          };
        });

        // Apply deduplication to images
        const images = deduplicateByDomainAndUrl(collectedImages);

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

    const searchResults = await Promise.all(searchPromises);
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
    exa: () => new ExaSearchStrategy(clients.exa),
  };

  return strategies[provider]();
};

export function webSearchTool(
  dataStream?: UIMessageStreamWriter<ChatMessage> | undefined,
  searchProvider: 'exa' | 'parallel' | 'tavily' | 'firecrawl' = 'parallel',
) {
  return tool({
    description: `This is the default tool of the app to be used to search the web for information with multiple queries, max results, search depth, topics, and quality.
    Very important Rules:
    ...${searchProvider === "parallel" ? "The First Query should be the objective and the rest of the queries should be related to the objective" : ""}...
    - The queries should always be in the same language as the user's message.
    - And count of the queries should be 3-5.
    - Do not use the best quality unless absolutly required since it is time expensive.
    `,
    inputSchema: z.object({
      queries: z.array(
        z.string().describe('Array of 3-5 search queries to look up on the web. Default is 5. Minimum is 3.'),
      ),
      maxResults: z.array(
        z
          .number()
          .describe(
            'Array of maximum number of results to return per query. Default is 10. Minimum is 8. Maximum is 15.',
          ),
      ).optional(),
      topics: z.array(
        z
          .enum(['general', 'news'])
          .describe(
            'Array of topic types to search for. Default is general. Other options are news and finance. No other options are available.',
          ),
      ).optional(),
      quality: z.array(
        z
          .enum(['default', 'best'])
          .describe(
            'Array of quality levels for the search. Default is default. Other option is best. DO NOT use best unless necessary.',
          ),
      ).optional(),
    }),
    execute: async ({
      queries,
      maxResults,
      topics,
      quality,
    }: {
      queries: string[];
      maxResults?: (number | undefined)[];
      topics?: ('general' | 'news' | undefined)[];
      quality?: ('default' | 'best' | undefined)[];
    }) => {
      // Initialize all clients
      const clients = {
        exa: new Exa(serverEnv.EXA_API_KEY),
        parallel: new Parallel({ apiKey: serverEnv.PARALLEL_API_KEY }),
        firecrawl: new FirecrawlApp({ apiKey: serverEnv.FIRECRAWL_API_KEY }),
        tvly: tavily({ apiKey: serverEnv.TAVILY_API_KEY }),
      };

      console.log('Queries:', queries);
      console.log('Max Results:', maxResults);
      console.log('Topics:', topics);
      console.log('Quality:', quality);
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
      return await strategy.search(queries, {
        maxResults: maxResults as number[],
        topics: topics as ('general' | 'news')[],
        quality: quality as ('default' | 'best')[],
        dataStream,
      });
    },
  });
}
