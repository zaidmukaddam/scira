import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';

export const academicSearchTool = tool({
  description: 'Search academic papers and research with multiple queries.',
  inputSchema: z.object({
    queries: z.array(z.string()).describe('Array of search queries for academic papers. Minimum 1, recommended 3-5.').min(1).max(5),
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
          const result = await exa.searchAndContents(query, {
            type: 'auto',
            numResults: currentMaxResults,
            category: 'research paper',
            summary: {
              query: 'Abstract of the Paper',
            },
          });

          const processedResults = result.results.reduce<typeof result.results>((acc, paper) => {
            if (acc.some((p) => p.url === paper.url) || !paper.summary) return acc;

            const cleanSummary = paper.summary.replace(/^Summary:\s*/i, '');
            const cleanTitle = paper.title?.replace(/\s\[.*?\]$/, '');

            acc.push({
              ...paper,
              title: cleanTitle || '',
              summary: cleanSummary,
            });

            return acc;
          }, []);

          return {
            query,
            results: processedResults,
          };
        } catch (error) {
          console.error(`Academic search error for query "${query}":`, error);
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
