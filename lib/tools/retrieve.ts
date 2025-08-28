import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';
import FirecrawlApp from '@mendable/firecrawl-js';

export const retrieveTool = tool({
  description:
    'Retrieve the full content from a URL using Exa AI, with Firecrawl as a fallback. Returns text, title, summary, images, and more.',
  inputSchema: z.object({
    url: z.string().describe('The URL to retrieve the information from.'),
    include_summary: z.boolean().describe('Whether to include a summary of the content. Default is true.'),
    live_crawl: z
      .enum(['never', 'auto', 'preferred'])
      .describe('Whether to crawl the page immediately. Options: never, auto, preferred. Default is "preferred".'),
  }),
  execute: async ({
    url,
    include_summary = true,
    live_crawl = 'preferred',
  }: {
    url: string;
    include_summary?: boolean;
    live_crawl?: 'never' | 'auto' | 'preferred';
  }) => {
    try {
      const exa = new Exa(serverEnv.EXA_API_KEY as string);
      const firecrawl = new FirecrawlApp({ apiKey: serverEnv.FIRECRAWL_API_KEY });

      console.log(`Retrieving content from ${url} with Exa AI, summary: ${include_summary}, livecrawl: ${live_crawl}`);

      const start = Date.now();
      let result;
      let usingFirecrawl = false;

      try {
        // Try Exa AI first
        result = await exa.getContents([url], {
          text: true,
          summary: include_summary ? true : undefined,
          livecrawl: live_crawl,
        });

        // Check if Exa returned results
        if (!result.results || result.results.length === 0 || !result.results[0].text) {
          console.log('Exa AI returned no content, falling back to Firecrawl');
          usingFirecrawl = true;
        }
      } catch (exaError) {
        console.error('Exa AI error:', exaError);
        console.log('Falling back to Firecrawl');
        usingFirecrawl = true;
      }

      // Use Firecrawl as fallback
      if (usingFirecrawl) {
        const urlWithoutHttps = url.replace(/^https?:\/\//, '');
        try {
          const scrapeResponse = await firecrawl.scrape(urlWithoutHttps, {
            formats: ['markdown'],
            onlyMainContent: true,
            parsePDF: true,
            maxAge: 14400000,
            proxy: 'auto',
          });

          if (!scrapeResponse) {
            throw new Error(`Firecrawl failed: ${scrapeResponse}`);
          }

          console.log(`Firecrawl successfully scraped ${url}`);

          // Format Firecrawl response to match expected output
          return {
            base_url: url,
            results: [
              {
                url: url,
                content: scrapeResponse.markdown || scrapeResponse.html || '',
                title: scrapeResponse.metadata?.title || url.split('/').pop() || 'Retrieved Content',
                description: scrapeResponse.metadata?.description || `Content retrieved from ${url}`,
                author: scrapeResponse.metadata?.author || undefined,
                publishedDate: scrapeResponse.metadata?.publishedDate || undefined,
                image: scrapeResponse.metadata?.image || scrapeResponse.metadata?.ogImage || undefined,
                favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`,
                language: scrapeResponse.metadata?.language || 'en',
              },
            ],
            response_time: (Date.now() - start) / 1000,
            source: 'firecrawl',
          };
        } catch (firecrawlError) {
          console.error('Firecrawl error:', firecrawlError);
          return { error: 'Both Exa AI and Firecrawl failed to retrieve content', results: [] };
        }
      }

      // Return Exa results if successful
      return {
        base_url: url,
        results: result!.results.map((item) => {
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
        source: 'exa',
      };
    } catch (error) {
      console.error('Exa AI error:', error);
      return { error: error instanceof Error ? error.message : 'Failed to retrieve content', results: [] };
    }
  },
});
