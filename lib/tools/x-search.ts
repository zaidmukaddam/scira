import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { getTweet } from 'react-tweet/api';
import { xai } from '@ai-sdk/xai';
import { UIMessageStreamWriter } from 'ai';
import { ChatMessage } from '@/lib/types';

interface CitationSource {
  sourceType?: string;
  url?: string;
}

export function xSearchTool(dataStream?: UIMessageStreamWriter<ChatMessage>) {
  return tool({
    description:
      'Search X (formerly Twitter) posts using X API with multiple queries for the past 15 days by default otherwise user can specify a date range. If the user gives you a link to a post then put it as the first query.',
    inputSchema: z
      .object({
        queries: z
          .array(z.string())
          .describe('Array of search queries for X posts. Minimum 1, recommended 3-5. If the user gives you a link to a post then put it as the first query.')
          .min(1)
          .max(5),
        startDate: z
          .string()
          .optional()
          .describe(
            'The start date of the search in the format YYYY-MM-DD (always default to 15 days ago if not specified)',
          ),
        endDate: z
          .string()
          .optional()
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
          .describe('The X handles to exclude in the search (max 10). Cannot be used with includeXHandles.'),
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
    execute: async ({
      queries,
      startDate,
      endDate,
      includeXHandles,
      excludeXHandles,
    }) => {
      try {
        const sanitizeHandle = (handle: string) => handle.replace(/^@+/, '').trim();

        const normalizedInclude = Array.isArray(includeXHandles)
          ? includeXHandles.map(sanitizeHandle).filter(Boolean)
          : undefined;
        const normalizedExclude = Array.isArray(excludeXHandles)
          ? excludeXHandles.map(sanitizeHandle).filter(Boolean)
          : undefined;

        const toYMD = (d: Date) => d.toISOString().slice(0, 10);
        const extractTweetId = (url: string) => url.match(/status\/(\d+)/)?.[1] || null;
        const canonicalTweetLink = (tweetId: string | null, fallback: string | undefined) =>
          tweetId ? `https://x.com/i/status/${tweetId}` : fallback || '';
        const today = new Date();
        const daysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
        const effectiveStart = startDate && startDate.trim().length > 0 ? startDate : toYMD(daysAgo);
        const effectiveEnd = endDate && endDate.trim().length > 0 ? endDate : toYMD(today);

        console.log('[X search - queries]:', queries);
        console.log('[X search - includeHandles]:', normalizedInclude, '[excludeHandles]:', normalizedExclude);

        const searchPromises = queries.map(async (query, index) => {
          try {
            // Send start notification
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

            const xSearchToolConfig: Parameters<typeof xai.tools.xSearch>[0] = {
              fromDate: effectiveStart,
              toDate: effectiveEnd,
            };

            // Add allowedXHandles if includeXHandles is provided
            if (normalizedInclude?.length) {
              xSearchToolConfig.allowedXHandles = normalizedInclude;
            }

            // Note: excludedXHandles, postFavoritesCount, postViewCount, and maxSearchResults
            // are not directly supported in the new xai.tools.xSearch API.

            const { text, sources } = await generateText({
              model: xai.responses('grok-4-1-fast-non-reasoning'),
              system: `You are a helpful assistant that searches for X content with all the tools available to you. Do not use user search tool.  You can search for the thread or the content of the post. You can also search for the content of the post using thread fetch tool. NO NEED TO WRITE A SINGLE WORD AFTER RUNNING THE TOOLs AT ALL COSTS!!`,
              messages: [{
                role: 'user',
                content: query
              }],
              maxOutputTokens: 1,
              stopWhen: stepCountIs(1),
              tools: {
                x_search: xai.tools.xSearch(xSearchToolConfig),
              },
              onStepFinish: (step) => {
                console.log(`[X search step for "${query}"]: `, step);
              },
            });

            console.log(`[X search data for "${query}"]: `, text);

            const citations = (Array.isArray(sources) ? sources : []) as CitationSource[];
            let allSources = [];

            if (citations.length > 0) {
              // Deduplicate citations within this query by URL
              const seenCitationUrls = new Set<string>();
              const uniqueCitations = citations
                .filter((link) => link.sourceType === 'url')
                .filter((link) => {
                  const url = link.url || '';
                  const tweetId = extractTweetId(url);
                  const key = tweetId || url;
                  if (key && !seenCitationUrls.has(key)) {
                    seenCitationUrls.add(key);
                    return true;
                  }
                  return false;
                });

              const tweetFetchPromises = uniqueCitations
                .map(async (link) => {
                  try {
                    const tweetUrl = link.url || '';
                    const tweetId = extractTweetId(tweetUrl);

                    if (!tweetId) return null;

                    const tweetData = await getTweet(tweetId);
                    if (!tweetData) return null;

                    const text = tweetData.text;
                    if (!text) return null;

                    return {
                      text: text,
                      link: canonicalTweetLink(tweetId, tweetUrl),
                      id: tweetId,
                    };
                  } catch (error) {
                    console.error(`Error fetching tweet data for ${link.sourceType === 'url' ? link.url : ''}:`, error);
                    return null;
                  }
                });

              const tweetResults = await Promise.all(tweetFetchPromises);

              const validTweets = tweetResults.filter((result) => result !== null);

              // Deduplicate allSources within this query by link
              const seenSourceLinks = new Set<string>();
              const uniqueTweets = validTweets.filter((tweet) => {
                const key = tweet?.link || tweet?.id;
                if (tweet && key && !seenSourceLinks.has(key)) {
                  seenSourceLinks.add(key);
                  return true;
                }
                return false;
              });

              allSources.push(...uniqueTweets);
            }

            // Deduplicate citations by URL
            const seenCitationKeys = new Set<string>();
            const uniqueCitationsForReturn = citations.filter((citation) => {
              if (citation.sourceType !== 'url') return true;
              const url = citation.url || '';
              const tweetId = extractTweetId(url);
              const key = tweetId || url;
              if (key && !seenCitationKeys.has(key)) {
                seenCitationKeys.add(key);
                return true;
              }
              return false;
            });

            const sourcesCount = allSources.length;

            // Send completion notification
            dataStream?.write({
              type: 'data-query_completion',
              data: {
                query,
                index,
                total: queries.length,
                status: 'completed',
                resultsCount: sourcesCount,
                imagesCount: 0,
              },
            });

            return {
              content: text,
              citations: uniqueCitationsForReturn,
              sources: allSources,
              query,
              dateRange: `${effectiveStart} to ${effectiveEnd}`,
              handles: normalizedInclude || normalizedExclude || [],
            };
          } catch (error) {
            console.error(`X search error for query "${query}":`, error);

            // Send error notification
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
              content: '',
              citations: [],
              sources: [],
              query,
              dateRange: `${effectiveStart} to ${effectiveEnd}`,
              handles: normalizedInclude || normalizedExclude || [],
            };
          }
        });

        const searches = await Promise.all(searchPromises);

        // Deduplicate posts across all queries based on tweet URL
        const seenUrls = new Set<string>();
        const deduplicatedSearches = searches.map(search => {
          const uniqueSources = search.sources.filter(source => {
            const key = source?.link || source?.id;
            if (source && key && !seenUrls.has(key)) {
              seenUrls.add(key);
              return true;
            }
            return false;
          });

          return {
            ...search,
            sources: uniqueSources,
          };
        });

        return {
          searches: deduplicatedSearches,
          dateRange: `${effectiveStart} to ${effectiveEnd}`,
          handles: normalizedInclude || normalizedExclude || [],
        };
      } catch (error) {
        console.error('X search error:', error);
        throw error;
      }
    },
  });
}
