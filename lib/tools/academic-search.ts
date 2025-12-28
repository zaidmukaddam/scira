import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';
import { UIMessageStreamWriter } from 'ai';
import { ChatMessage } from '@/lib/types';

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
        const exa = new Exa(serverEnv.EXA_API_KEY as string);

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

            const firecrawlResults = await firecrawl.search(query, {
              categories: ['research', 'pdf'],
              limit: currentMaxResults,
              scrapeOptions: {
                storeInCache: true,
              },
            });

            // check if firecrawlResults.web is defined
            if (!firecrawlResults.web) {
              // Send completion notification with 0 results
              dataStream?.write({
                type: 'data-query_completion',
                data: {
                  query,
                  index,
                  total: queries.length,
                  status: 'completed',
                  resultsCount: 0,
                  imagesCount: 0,
                },
              });

              return {
                query,
                results: [],
              };
            }

            const processedResults = firecrawlResults.web.map((result) => ({
              url: (result as SearchResultWeb).url || '',
              title: (result as SearchResultWeb).title || '',
              summary: (result as SearchResultWeb).description || '',
            }));

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

        const searches = await Promise.all(searchPromises);

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
