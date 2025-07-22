import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';
import { getTweet } from 'react-tweet/api';

export const xSearchTool = tool({
  description: 'Search X (formerly Twitter) posts using xAI Live Search.',
  parameters: z.object({
    query: z.string().describe('The search query for X posts').nullable(),
    startDate: z
      .string()
      .nullable()
      .describe('The start date of the search in the format YYYY-MM-DD (default to 7 days ago if not specified)'),
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

      const sources = [];
      const citations = data.citations || [];

      if (citations.length > 0) {
        const tweetFetchPromises = citations
          .filter((url: any) => typeof url === 'string' && url.includes('x.com'))
          .map(async (url: string) => {
            try {
              const match = url.match(/\/status\/(\d+)/);
              if (!match) return null;

              const tweetId = match[1];

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

        const tweetResults = await Promise.all(tweetFetchPromises);

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
});
