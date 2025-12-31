import { tool } from 'ai';
import { z } from 'zod';
import Parallel from 'parallel-web';
import { UIMessageStreamWriter } from 'ai';
import { ChatMessage } from '@/lib/types';

const client = new Parallel({ apiKey: process.env.PARALLEL_API_KEY });

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
      .describe('Deprecated: no longer used, kept for backward compatibility.'),
  }),
  execute: async ({
    queries,
    maxResults,
    timeRange,
  }: {
    queries: string[];
    maxResults?: number[];
    timeRange?: ('day' | 'week' | 'month' | 'year')[];
  }) => {
    console.log('Reddit search queries:', queries);
    console.log('Max results:', maxResults);
    console.log('Time ranges (deprecated):', timeRange);

    const searchPromises = queries.map(async (query, index) => {
      const currentMaxResults = maxResults?.[index] || maxResults?.[0] || 20;

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

        const data = await client.beta.search({
          objective: query,
          mode: 'one-shot',
          max_results: currentMaxResults < 10 ? 10 : currentMaxResults,
          excerpts: {
            max_chars_per_result: 10000,
          },
          source_policy: {
            include_domains: ['reddit.com'],
          },
          fetch_policy: {
            max_age_seconds: 6000,
            timeout_seconds: 120,
          },
        });

        const processedResults = data.results.map((result) => {
          const subredditMatch = typeof result.url === 'string' ? result.url.match(/reddit\.com\/r\/([^/]+)/i) : null;
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

    const searches = await Promise.all(searchPromises);

    return {
      searches,
    };
  },
  });
}
