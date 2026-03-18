import { tool } from 'ai';
import { z } from 'zod';
import { UIMessageStreamWriter } from 'ai';
import { ChatMessage } from '@/lib/types';
import { serverEnv } from '@/env/server';
import Parallel from 'parallel-web';
import { all } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';

interface ParallelSearchResult {
  url?: string;
  title?: string;
  excerpts?: unknown;
  publish_date?: string | null;
}

interface ParallelSearchResponse {
  results: ParallelSearchResult[];
}

type TimeRange = 'day' | 'week' | 'month' | 'year';

function getAfterDateFromTimeRange(timeRange: TimeRange | undefined): string | undefined {
  if (!timeRange) return;

  const now = new Date();
  const daysBackByRange: Record<TimeRange, number> = {
    day: 1,
    week: 7,
    month: 30,
    year: 365,
  };

  const daysBack = daysBackByRange[timeRange];
  const after = new Date(now);
  after.setUTCDate(after.getUTCDate() - daysBack);
  return after.toISOString().slice(0, 10);
}

function getTimeRangeAtIndex(timeRanges: TimeRange[] | undefined, index: number): TimeRange | undefined {
  if (!timeRanges?.length) return;
  return timeRanges[index] ?? timeRanges[0];
}

async function parallelSearch(
  parallel: Parallel,
  params: { query: string; maxResults: number; afterDate?: string },
) {
  return (await parallel.beta.search({
    objective: params.query,
    search_queries: [params.query],
    mode: 'fast' as any,
    max_results: params.maxResults < 10 ? 10 : params.maxResults,
    source_policy: {
      include_domains: ['reddit.com'],
      ...(params.afterDate ? { after_date: params.afterDate } : {}),
    },
  })) as ParallelSearchResponse;
}

export function redditSearchTool(dataStream?: UIMessageStreamWriter<ChatMessage>) {
  return tool({
    description: 'Search Reddit content using the Parallel API with multiple queries.',
    inputSchema: z.object({
      queries: z
        .array(z.string().max(200))
        .describe('Array of search queries to execute on Reddit. Minimum 1, recommended 3-5.')
        .min(1)
        .max(5),
      maxResults: z.array(z.number()).optional().describe('Array of maximum results per query. Default is 20 per query.'),
      timeRange: z
        .array(z.enum(['day', 'week', 'month', 'year']))
        .optional()
        .describe('Optional per-query time range. Used to set source_policy.after_date in the Parallel API.'),
    }),
    execute: async ({
      queries,
      maxResults,
      timeRange,
    }: {
      queries: string[];
      maxResults?: number[];
      timeRange?: TimeRange[];
    }) => {
      console.log('Reddit search queries:', queries);
      console.log('Max results:', maxResults);
      console.log('Time ranges:', timeRange);

      const parallel = new Parallel({ apiKey: serverEnv.PARALLEL_API_KEY });
      const searchPromises = queries.map(async (query, index) => {
        const currentMaxResults = maxResults?.[index] || maxResults?.[0] || 20;
        const currentTimeRange = getTimeRangeAtIndex(timeRange, index);
        const afterDate = getAfterDateFromTimeRange(currentTimeRange);

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

          const { processedResults } = await all(
            {
              data: async function () {
                return parallelSearch(parallel, { query, maxResults: currentMaxResults, afterDate });
              },
              processedResults: async function () {
                const data = await this.$.data;
                return data.results.map((result) => {
                const subredditMatch =
                  typeof result.url === 'string' ? result.url.match(/reddit\.com\/r\/([^/]+)/i) : null;
                const subreddit = subredditMatch ? subredditMatch[1] : 'unknown';
                const isRedditPost =
                  typeof result.url === 'string' ? /reddit\.com\/r\/[^/]+\/comments\//i.test(result.url) : false;

                const rawExcerpts = result.excerpts as unknown;
                let excerptsArray: string[] = [];

                if (Array.isArray(rawExcerpts)) {
                  excerptsArray = (rawExcerpts as unknown[]).filter(
                    (excerpt): excerpt is string => typeof excerpt === 'string' && excerpt.length > 0,
                  );
                } else if (typeof rawExcerpts === 'string' && rawExcerpts.length > 0) {
                  excerptsArray = [rawExcerpts];
                }

                return {
                  url: result.url,
                  title: result.title ?? result.url,
                  content: excerptsArray.join('\n\n'),
                  published_date: result.publish_date ?? undefined,
                  subreddit,
                  isRedditPost,
                  comments: excerptsArray,
                };
                });
              },
            },
            getBetterAllOptions(),
          );

          const resultsCount = processedResults.length;

          // Send completion notification
          dataStream?.write({
            type: 'data-query_completion',
            data: {
              query,
              index,
              total: queries.length,
              status: 'completed',
              resultsCount: resultsCount,
              imagesCount: 0,
            },
          });

          return {
            query,
            results: processedResults,
          };
        } catch (error) {
          console.error(`Reddit search error for query "${query}":`, error);

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
            query,
            results: [],
          };
        }
      });

      const searchMap = await all(
        Object.fromEntries(searchPromises.map((promise, index) => [`q:${index}`, async () => promise])),
        getBetterAllOptions(),
      );
      const searches = queries.map((_, index) => searchMap[`q:${index}`]);

      return {
        searches,
      };
    },
  });
}
