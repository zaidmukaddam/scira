import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';
import { UIMessageStreamWriter } from 'ai';
import { ChatMessage } from '../types';
import ParallelAI from '@/lib/parallel-sdk';
import FirecrawlClient from '@/lib/firecrawl-sdk';
import { tavily } from '@tavily/core';

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

export function webSearchTool(
  dataStream?: UIMessageStreamWriter<ChatMessage> | undefined,
  searchProvider: 'exa' | 'parallel' | 'tavily' | 'firecrawl' = 'parallel',
) {
  return tool({
    description: `This is the default tool of the app to be used to search the web for information with multiple queries, max results, search depth, topics, and quality.
    Very important Rules:
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
      ),
      topics: z.array(
        z
          .enum(['general', 'news'])
          .describe(
            'Array of topic types to search for. Default is general. Other options are news and finance. No other options are available.',
          ),
      ),
      quality: z.array(
        z
          .enum(['default', 'best'])
          .describe(
            'Array of quality levels for the search. Default is default. Other option is best. DO NOT use best unless necessary.',
          ),
      ),
      include_domains: z
        .array(z.string())
        .optional()
        .describe(
          'An list of domains to include only and only if asked by the user. Default is undefined. DO NOT use unless instructed by the user.',
        ),
      exclude_domains: z
        .array(z.string())
        .optional()
        .describe(
          'An list of domains to exclude only and only if asked by the user. Default is undefined. DO NOT use unless instructed by the user.',
        ),
    }),
    execute: async ({
      queries,
      maxResults,
      topics,
      quality,
      include_domains,
      exclude_domains,
    }: {
      queries: string[];
      maxResults: number[];
      topics: ('general' | 'news')[];
      quality: ('default' | 'best')[];
      include_domains?: string[];
      exclude_domains?: string[];
    }) => {
      // Initialize clients based on provider
      const exa = new Exa(serverEnv.EXA_API_KEY);
      const parallel = new ParallelAI(serverEnv.PARALLEL_API_KEY);
      const firecrawl = new FirecrawlClient(serverEnv.FIRECRAWL_API_KEY);
      const tvly = tavily({ apiKey: serverEnv.TAVILY_API_KEY });

      console.log('Queries:', queries);
      console.log('Max Results:', maxResults);
      console.log('Topics:', topics);
      console.log('Quality:', quality);
      console.log('Search Provider:', searchProvider);
      console.log('Include Domains:', include_domains);
      console.log('Exclude Domains:', exclude_domains);

      // Use Parallel AI batch processing for better latency
      if (searchProvider === 'parallel') {
        console.log('Using Parallel AI batch processing for queries:', queries);

        // Send start notifications for all queries
        queries.forEach((query, index) => {
          dataStream?.write({
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
        });

        const processedIncludeDomains = processDomains(include_domains);
        const processedExcludeDomains = processDomains(exclude_domains);
        const maxResults_total = Math.max(...maxResults);

        const batchOptions = {
          processor: (quality.includes('best') ? 'pro' : 'base') as 'pro' | 'base',
          max_results: maxResults_total,
          max_chars_per_result: 1000,
          include_domains: processedIncludeDomains,
          exclude_domains: processedExcludeDomains,
          objective: `Search for: ${queries.join(', ')}`,
        };

        try {
          const batchResponse = await parallel.batchSearchAndContents(queries, batchOptions);

          // Get images for all queries in parallel using Firecrawl
          const imagePromises = queries.map(async (query) => {
            try {
              return await firecrawl.getImagesForQuery(query, 3);
            } catch (error) {
              console.error(`Firecrawl error for query "${query}":`, error);
              return [];
            }
          });

          const allImagesResults = await Promise.all(imagePromises);

          // Process results and distribute them across queries
          const searchResults = queries.map((query, index) => {
            // For batch response, results are combined - we'll split them evenly
            const startIdx = Math.floor((index / queries.length) * batchResponse.query_results[0]?.results.length || 0);
            const endIdx = Math.floor(
              ((index + 1) / queries.length) * batchResponse.query_results[0]?.results.length || 0,
            );
            const queryResults = batchResponse.query_results[0]?.results.slice(startIdx, endIdx) || [];

            const results = queryResults.map((result) => ({
              url: result.url,
              title: cleanTitle(result.title || ''),
              content: result.excerpts.join(' ').substring(0, 1000),
              published_date: undefined,
              author: undefined,
            }));

            const queryImages = allImagesResults[index] || [];

            // Send completion notification
            dataStream?.write({
              type: 'data-query_completion',
              data: {
                query,
                index,
                total: queries.length,
                status: 'completed',
                resultsCount: results.length,
                imagesCount: queryImages.length,
              },
            });

            return {
              query,
              results: deduplicateByDomainAndUrl(results),
              images: deduplicateByDomainAndUrl(queryImages),
            };
          });

          return { searches: searchResults };
        } catch (error) {
          console.error('Parallel AI batch search error:', error);

          // Send error notifications for all queries
          queries.forEach((query, index) => {
            dataStream?.write({
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
          });

          return {
            searches: queries.map((query) => ({
              query,
              results: [],
              images: [],
            })),
          };
        }
      }

      const searchPromises = queries.map(async (query, index) => {
        const currentTopic = topics[index] || topics[0] || 'general';
        const currentMaxResults = maxResults[index] || maxResults[0] || 10;
        const currentQuality = quality[index] || quality[0] || 'default';

        try {
          dataStream?.write({
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

          let results: any[] = [];
          let images: { url: string; description: string }[] = [];

          if (searchProvider === 'tavily') {
            // Use Tavily
            const processedIncludeDomains = processDomains(include_domains);
            const processedExcludeDomains = processDomains(exclude_domains);

            const tavilyData = await tvly.search(query, {
              topic: currentTopic || 'general',
              days: currentTopic === 'news' ? 7 : undefined,
              maxResults: currentMaxResults,
              searchDepth: currentQuality === 'best' ? 'advanced' : 'basic',
              includeAnswer: true,
              includeImages: true,
              includeImageDescriptions: true,
              excludeDomains: processedExcludeDomains,
              includeDomains: processedIncludeDomains,
            });

            results = deduplicateByDomainAndUrl(tavilyData.results).map((obj: any) => ({
              url: obj.url,
              title: cleanTitle(obj.title || ''),
              content: obj.content,
              published_date: currentTopic === 'news' ? obj.published_date : undefined,
              author: undefined,
            }));

            // Process Tavily images with validation
            images = await Promise.all(
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
          } else if (searchProvider === 'firecrawl') {
            // Use Firecrawl
            const sources = [] as ('web' | 'news' | 'images')[];

            // Map topics to Firecrawl sources
            if (currentTopic === 'news') {
              sources.push('news', 'web');
            } else {
              sources.push('web');
            }
            sources.push('images'); // Always include images

            const firecrawlData = await firecrawl.search({
              query,
              sources,
              limit: currentMaxResults,
            });

            // Process web results
            if (firecrawlData.success && firecrawlData.data?.web) {
              results = deduplicateByDomainAndUrl(firecrawlData.data.web).map((result) => ({
                url: result.url,
                title: cleanTitle(result.title || ''),
                content: result.markdown?.slice(0, 2000) || result.description || '',
                published_date: undefined,
                author: undefined,
              }));
            }

            // Process news results if available
            if (firecrawlData.success && firecrawlData.data?.news && currentTopic === 'news') {
              const newsResults = deduplicateByDomainAndUrl(firecrawlData.data.news).map((result) => ({
                url: result.url,
                title: cleanTitle(result.title || ''),
                content: result.snippet || '',
                published_date: result.date || undefined,
                author: undefined,
              }));

              // Combine news and web results, prioritizing news
              results = [...newsResults, ...results];
            }

            // Process images with deduplication
            if (firecrawlData.success && firecrawlData.data?.images) {
              images = deduplicateByDomainAndUrl(firecrawlData.data.images).map((image) => ({
                url: image.imageUrl,
                description: cleanTitle(image.title || ''),
              }));
            }
          } else {
            // Use Exa (default)
            const searchOptions: any = {
              text: true,
              type: currentQuality === 'best' ? 'hybrid' : 'auto',
              numResults: currentMaxResults < 10 ? 10 : currentMaxResults,
              livecrawl: 'preferred',
              useAutoprompt: true,
              category: currentTopic === 'news' ? 'news' : '',
            };

            const processedIncludeDomains = processDomains(include_domains);
            const processedExcludeDomains = processDomains(exclude_domains);

            const hasIncludeDomains = Array.isArray(processedIncludeDomains) && processedIncludeDomains.length > 0;
            const hasExcludeDomains = Array.isArray(processedExcludeDomains) && processedExcludeDomains.length > 0;

            if (hasIncludeDomains && hasExcludeDomains) {
              // Prefer includeDomains when both are provided
              searchOptions.includeDomains = processedIncludeDomains;
              console.warn(
                'Both include_domains and exclude_domains provided; prefer include_domains and ignore exclude_domains.',
              );
            } else if (hasIncludeDomains) {
              searchOptions.includeDomains = processedIncludeDomains;
            } else if (hasExcludeDomains) {
              searchOptions.excludeDomains = processedExcludeDomains;
            }

            const data = await exa.searchAndContents(query, searchOptions);

            // Collect all images first
            const collectedImages: { url: string; description: string }[] = [];

            results = data.results.map((result) => {
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
            images = deduplicateByDomainAndUrl(collectedImages);
          }

          dataStream?.write({
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
          console.error(`Search error for query "${query}" with provider "${searchProvider}":`, error);

          dataStream?.write({
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

      return {
        searches: searchResults,
      };
    },
  });
}
