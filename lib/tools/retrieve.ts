import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';

export const retrieveTool = tool({
  description: 'Retrieve the full content from a URL using Exa AI, including text, title, summary, images, and more.',
  parameters: z.object({
    url: z.string().describe('The URL to retrieve the information from.'),
    include_summary: z.boolean().describe('Whether to include a summary of the content. Default is true.'),
    live_crawl: z
      .enum(['never', 'auto', 'always'])
      .describe('Whether to crawl the page immediately. Options: never, auto, always. Default is "always".'),
  }),
  execute: async ({
    url,
    include_summary = true,
    live_crawl = 'always',
  }: {
    url: string;
    include_summary?: boolean;
    live_crawl?: 'never' | 'auto' | 'always';
  }) => {
    try {
      const exa = new Exa(serverEnv.EXA_API_KEY as string);

      console.log(`Retrieving content from ${url} with Exa AI, summary: ${include_summary}, livecrawl: ${live_crawl}`);

      const start = Date.now();

      const result = await exa.getContents([url], {
        text: true,
        summary: include_summary ? true : undefined,
        livecrawl: live_crawl,
      });

      if (!result.results || result.results.length === 0) {
        console.error('Exa AI error: No content retrieved');
        return { error: 'Failed to retrieve content', results: [] };
      }

      return {
        base_url: url,
        results: result.results.map((item) => {
          const typedItem = item as any;
          return {
            url: item.url,
            content: typedItem.text || typedItem.summary || '',
            title: typedItem.title || item.url.split('/').pop() || 'Retrieved Content',
            description: typedItem.summary || `Content retrieved from ${item.url}`,
            author: typedItem.author || undefined,
            publishedDate: typedItem.publishedDate || undefined,
            image: typedItem.image || undefined,
            favicon: typedItem.favicon || undefined,
            language: 'en',
          };
        }),
        response_time: (Date.now() - start) / 1000,
      };
    } catch (error) {
      console.error('Exa AI error:', error);
      return { error: error instanceof Error ? error.message : 'Failed to retrieve content', results: [] };
    }
  },
});
