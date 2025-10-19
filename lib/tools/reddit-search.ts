import { tool } from 'ai';
import { z } from 'zod';
import { tavily } from '@tavily/core';
import { serverEnv } from '@/env/server';

export const redditSearchTool = tool({
  description: 'Search Reddit content using Tavily API with multiple queries.',
  inputSchema: z.object({
    queries: z.array(z.string().max(200)).describe('Array of search queries to execute on Reddit. Minimum 1, recommended 3-5.').min(1).max(5),
    maxResults: z.array(z.number()).optional().describe('Array of maximum results per query. Default is 20 per query.'),
    timeRange: z.array(z.enum(['day', 'week', 'month', 'year'])).optional().describe('Array of time ranges for each Reddit search query.'),
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
    const apiKey = serverEnv.TAVILY_API_KEY;
    const tvly = tavily({ apiKey });

    console.log('Reddit search queries:', queries);
    console.log('Max results:', maxResults);
    console.log('Time ranges:', timeRange);

    const searchPromises = queries.map(async (query, index) => {
      const currentMaxResults = maxResults?.[index] || maxResults?.[0] || 20;
      const currentTimeRange = timeRange?.[index] || timeRange?.[0] || 'week';

      try {
        const data = await tvly.search(query, {
          maxResults: currentMaxResults < 20 ? 20 : currentMaxResults,
          timeRange: currentTimeRange,
          includeRawContent: 'markdown',
          searchDepth: 'advanced',
          chunksPerSource: 5,
          topic: 'general',
          includeDomains: ['reddit.com'],
        });

        const processedResults = data.results.map((result) => {
          const isRedditPost = result.url.includes('/comments/');
          const subreddit = isRedditPost ? result.url.match(/reddit\.com\/r\/([^/]+)/)?.[1] || 'unknown' : 'unknown';

          return {
            url: result.url,
            title: result.title,
            content: result.content || '',
            score: result.score,
            published_date: result.publishedDate,
            subreddit,
            isRedditPost,
            comments: result.content ? [result.content] : [],
          };
        });

        return {
          query,
          results: processedResults,
          timeRange: currentTimeRange,
        };
      } catch (error) {
        console.error(`Reddit search error for query "${query}":`, error);
        return {
          query,
          results: [],
          timeRange: currentTimeRange,
        };
      }
    });

    const searches = await Promise.all(searchPromises);

    return {
      searches,
    };
  },
});
