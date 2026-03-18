import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';
import { UIMessageStreamWriter } from 'ai';
import { ChatMessage } from '@/lib/types';
import { all } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';

import Firecrawl, { SearchResultWeb } from '@mendable/firecrawl-js';

const firecrawl = new Firecrawl({ apiKey: serverEnv.FIRECRAWL_API_KEY });

export function academicSearchTool(dataStream?: UIMessageStreamWriter<ChatMessage>) {
  return tool({
    description: 'Search academic papers and research with multiple queries.',
    inputSchema: z.object({
      queries: z
        .array(z.string())
        .describe('Array of search queries for academic papers. Minimum 1, recommended 3-5.')
        .min(1)
        .max(5),
      maxResults: z.array(z.number()).optional().describe('Array of maximum results per query. Default is 20 per query.'),
    }),
    execute: async ({ queries, maxResults }: { queries: string[]; maxResults?: number[] }) => {
      try {
        console.log('Academic search queries:', queries);
        console.log('Max results:', maxResults);

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

            const { processedResults } = await all(
              {
                firecrawlResults: async function () {
                  return firecrawl.search(query, {
                    categories: ['research', 'pdf'],
                    limit: currentMaxResults,
                    scrapeOptions: {
                      storeInCache: true,
                    },
                  });
                },
                processedResults: async function () {
                  const firecrawlResults = await this.$.firecrawlResults;
                  if (!firecrawlResults.web || !Array.isArray(firecrawlResults.web)) return [];
                  return firecrawlResults.web.map((result) => ({
                    url: (result as SearchResultWeb).url || '',
                    title: (result as SearchResultWeb).title || '',
                    summary: (result as SearchResultWeb).description || '',
                  }));
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
            console.error(`Academic search error for query "${query}":`, error);

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
      } catch (error) {
        console.error('Academic search error:', error);
        throw error;
      }
    },
  });
}
