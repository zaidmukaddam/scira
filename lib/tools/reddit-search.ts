import { tool } from 'ai';
import { z } from 'zod';
import { tavily } from '@tavily/core';
import { serverEnv } from '@/env/server';

export const redditSearchTool = tool({
  description: 'Search Reddit content using Tavily API.',
  inputSchema: z.object({
    query: z.string().describe('The exact search query from the user.').max(200),
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
        timeRange,
      };
    } catch (error) {
      console.error('Reddit search error:', error);
      throw error;
    }
  },
});
