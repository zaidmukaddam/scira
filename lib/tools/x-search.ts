import { generateText, tool } from 'ai';
import { z } from 'zod';
import { getTweet } from 'react-tweet/api';
import { XaiProviderOptions, xai } from '@ai-sdk/xai';

export const xSearchTool = tool({
  description:
    'Search X (formerly Twitter) posts using xAI Live Search for the past 15 days by default otherwise user can specify a date range.',
  inputSchema: z.object({
    query: z.string().describe('The search query for X posts'),
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
    postFavoritesCount: z.number().min(0).optional().describe('Minimum number of favorites (likes) the post must have'),
    postViewCount: z.number().min(0).optional().describe('Minimum number of views the post must have'),
    maxResults: z.number().min(1).max(100).optional().describe('Maximum number of search results to return (default 15)'),
  }).refine(data => {
    // Ensure includeXHandles and excludeXHandles are not both specified
    return !(data.includeXHandles && data.excludeXHandles);
  }, {
    message: "Cannot specify both includeXHandles and excludeXHandles - use one or the other",
    path: ["includeXHandles", "excludeXHandles"]
  }),
  execute: async ({
    query,
    startDate,
    endDate,
    includeXHandles,
    excludeXHandles,
    postFavoritesCount,
    postViewCount,
    maxResults = 15,
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
      const today = new Date();
      const daysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      const effectiveStart = startDate && startDate.trim().length > 0 ? startDate : toYMD(daysAgo);
      const effectiveEnd = endDate && endDate.trim().length > 0 ? endDate : toYMD(today);

      console.log('[X search - includeHandles]:', normalizedInclude, '[excludeHandles]:', normalizedExclude);

      const { text, sources } = await generateText({
        model: xai('grok-4-fast-non-reasoning'),
        system: `You are a helpful assistant that searches for X posts and returns the results in a structured format. You will be given a search query and optional handles to include/exclude. You will then search for the posts and return the results in a structured format. You will also cite the sources in the format [Source No.]. Go very deep in the search and return the most relevant results.`,
        messages: [{ role: 'user', content: `${query}` }],
        maxOutputTokens: 10,
        providerOptions: {
          xai: {
            searchParameters: {
              mode: 'on',
              fromDate: effectiveStart,
              toDate: effectiveEnd,
              maxSearchResults: maxResults && maxResults < 15 ? 15 : maxResults ?? 15,
              returnCitations: true,
              sources: [
                {
                  type: 'x',
                  ...(normalizedInclude?.length ? { includedXHandles: normalizedInclude } : {}),
                  ...(normalizedExclude?.length ? { excludedXHandles: normalizedExclude } : {}),
                  ...(typeof postFavoritesCount === 'number' ? { postFavoriteCount: postFavoritesCount } : {}),
                  ...(typeof postViewCount === 'number' ? { postViewCount: postViewCount } : {}),
                },
              ],
            },
          } satisfies XaiProviderOptions,
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
        dateRange: `${effectiveStart} to ${effectiveEnd}`,
        handles: normalizedInclude || normalizedExclude || [],
      };
    } catch (error) {
      console.error('X search error:', error);
      throw error;
    }
  },
});
