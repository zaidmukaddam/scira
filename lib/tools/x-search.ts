import { generateText, tool } from 'ai';
import { z } from 'zod';
import { getTweet } from 'react-tweet/api';
import { XaiProviderOptions, xai } from '@ai-sdk/xai';

export const xSearchTool = tool({
  description:
    'Search X (formerly Twitter) posts using xAI Live Search for the past 7 days by default otherwise user can specify a date range.',
  inputSchema: z.object({
    query: z.string().describe('The search query for X posts').optional(),
    startDate: z
      .string()
      .describe('The start date of the search in the format YYYY-MM-DD (always default to 7 days ago if not specified)'),
    endDate: z
      .string()
      .describe('The end date of the search in the format YYYY-MM-DD (default to today if not specified)'),
    xHandles: z
      .array(z.string())
      .optional()
      .describe(
        'Optional list of X handles/usernames to search from (without @ symbol). Only include if user explicitly mentions specific handles like "@elonmusk" or "@openai"',
      ),
    maxResults: z.number().optional().describe('Maximum number of search results to return (default 15)'),
  }),
  execute: async ({
    query,
    startDate,
    endDate,
    xHandles,
    maxResults = 15,
  }: {
    query?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    xHandles?: string[] | null;
    maxResults?: number | null;
  }) => {
    try {
      const searchParameters: any = {
        mode: 'on',
        ...(startDate && { from_date: startDate }),
        ...(endDate && { to_date: endDate }),
        ...(maxResults && { max_search_results: maxResults < 15 ? 15 : maxResults }),
        return_citations: true,
        sources: [
          xHandles && xHandles.length > 0
            ? { type: 'x', x_handles: xHandles, safe_search: false }
            : { type: 'x', safe_search: false },
        ],
      };

      // if startDate is not provided, set it to 7 days ago
      if (!startDate) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        startDate = sevenDaysAgo.toISOString().split('T')[0];
      }

      // if endDate is not provided, set it to today
      if (!endDate) {
        endDate = new Date().toISOString().split('T')[0];
      }

      console.log('[X search parameters]: ', searchParameters);
      console.log('[X search handles]: ', xHandles);

      const { text, sources } = await generateText({
        model: xai('grok-3-latest'),
        system: `You are a helpful assistant that searches for X posts and returns the results in a structured format. You will be given a search query and a list of X handles to search from. You will then search for the posts and return the results in a structured format. You will also cite the sources in the format [Source No.]. Go very deep in the search and return the most relevant results.`,
        messages: [{ role: 'user', content: `${query}` }],
        providerOptions: {
          xai: {
            searchParameters: {
              mode: 'on',
              ...(startDate && { fromDate: startDate }),
              ...(endDate && { toDate: endDate }),
              maxSearchResults: maxResults,
              returnCitations: true,
              sources: [
                xHandles && xHandles.length > 0 ? { type: 'x', xHandles: xHandles, safeSearch: false } : { type: 'x' },
              ],
            },
          } as XaiProviderOptions,
        },
        onStepFinish: (step) => {
          console.log('[X search step]: ', step);
        },
      });

      console.log('[X search data]: ', text);

      const citations = sources || [];
      let allSources = [];

      if (citations.length > 0) {
        const tweetFetchPromises = citations
          .filter((link) => link.sourceType === 'url')
          .map(async (link) => {
            try {
              const tweetUrl = link.sourceType === 'url' ? link.url : '';
              const tweetId = tweetUrl.match(/\/status\/(\d+)/)?.[1] || '';

              const tweetData = await getTweet(tweetId);
              if (!tweetData) return null;

              const text = tweetData.text;
              if (!text) return null;

              return {
                text: text,
                link: tweetUrl,
              };
            } catch (error) {
              console.error(`Error fetching tweet data for ${link.sourceType === 'url' ? link.url : ''}:`, error);
              return null;
            }
          });

        const tweetResults = await Promise.all(tweetFetchPromises);

        allSources.push(...tweetResults.filter((result) => result !== null));
      }

      return {
        content: text,
        citations: citations,
        sources: allSources,
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
