import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';

export const academicSearchTool = tool({
  description: 'Search academic papers and research.',
  parameters: z.object({
    query: z.string().describe('The search query'),
  }),
  execute: async ({ query }: { query: string }) => {
    try {
      const exa = new Exa(serverEnv.EXA_API_KEY as string);

      const result = await exa.searchAndContents(query, {
        type: 'auto',
        numResults: 20,
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
        results: processedResults,
      };
    } catch (error) {
      console.error('Academic search error:', error);
      throw error;
    }
  },
});
