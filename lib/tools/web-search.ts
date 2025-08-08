import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';
import { UIMessageStreamWriter } from 'ai';
import { ChatMessage } from '../types';

const extractDomain = (url: string): string => {
  const urlPattern = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/i;
  return url.match(urlPattern)?.[1] || url;
};

const cleanTitle = (title: string): string => {
  // Remove content within square brackets and parentheses, then trim whitespace
  return title
    .replace(/\[.*?\]/g, '') // Remove [content]
    .replace(/\(.*?\)/g, '') // Remove (content)
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing whitespace
};

const deduplicateByDomainAndUrl = <T extends { url: string }>(items: T[]): T[] => {
  const seenDomains = new Set<string>();
  const seenUrls = new Set<string>();

  return items.filter((item) => {
    const domain = extractDomain(item.url);
    const isNewUrl = !seenUrls.has(item.url);
    const isNewDomain = !seenDomains.has(domain);

    if (isNewUrl && isNewDomain) {
      seenUrls.add(item.url);
      seenDomains.add(domain);
      return true;
    }
    return false;
  });
};

const processDomains = (domains?: string[]): string[] | undefined => {
  if (!domains || domains.length === 0) return undefined;

  const processedDomains = domains.map((domain) => extractDomain(domain));
  return processedDomains.every((domain) => domain.trim() === '') ? undefined : processedDomains;
};

export function webSearchTool(dataStream: UIMessageStreamWriter<ChatMessage>) {
  return tool({
    description: 'Search the web for information with 5-10 queries, max results and search depth.',
    inputSchema: z.object({
      queries: z.array(
        z.string().describe('Array of search queries to look up on the web. Default is 5 to 10 queries.'),
      ),
      maxResults: z.array(
        z.number().describe('Array of maximum number of results to return per query. Default is 10.'),
      ),
      topics: z.array(
        z.enum(['general', 'news', 'finance']).describe('Array of topic types to search for. Default is general.'),
      ),
      quality: z.enum(['default', 'best']).describe('Search quality x speed level. Default is default.'),
      include_domains: z
        .array(z.string())
        .describe('An array of domains to include in all search results. Default is an empty list.'),
      exclude_domains: z
        .array(z.string())
        .describe('An array of domains to exclude from all search results. Default is an empty list.'),
    }),
    execute: async ({
      queries,
      maxResults,
      topics,
      quality,
      include_domains,
      exclude_domains,
    }: {
      queries: string[];
      maxResults: number[];
      topics: ('general' | 'news' | 'finance')[];
      quality: 'default' | 'best';
      include_domains?: string[];
      exclude_domains?: string[];
    }) => {
      const exa = new Exa(serverEnv.EXA_API_KEY);

      console.log('Queries:', queries);
      console.log('Max Results:', maxResults);
      console.log('Topics:', topics);
      console.log('Quality:', quality);
      console.log('Include Domains:', include_domains);
      console.log('Exclude Domains:', exclude_domains);

      const searchPromises = queries.map(async (query, index) => {
        const currentTopic = topics[index] || topics[0] || 'general';
        const currentMaxResults = maxResults[index] || maxResults[0] || 10;

        try {
          dataStream.write({
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

          const searchOptions: any = {
            text: true,
            type: quality === 'best' ? 'hybrid' : 'auto',
            numResults: currentMaxResults < 10 ? 10 : currentMaxResults,
            livecrawl: 'preferred',
            useAutoprompt: true,
            category: currentTopic === 'finance' ? 'financial report' : currentTopic === 'news' ? 'news' : '',
          };

          const processedIncludeDomains = processDomains(include_domains);
          if (processedIncludeDomains) {
            searchOptions.includeDomains = processedIncludeDomains;
          }

          const processedExcludeDomains = processDomains(exclude_domains);
          if (processedExcludeDomains) {
            searchOptions.excludeDomains = processedExcludeDomains;
          }

          const data = await exa.searchAndContents(query, searchOptions);

          const images: { url: string; description: string }[] = [];
          const results = data.results.map((result) => {
            if (result.image) {
              images.push({
                url: result.image,
                description: cleanTitle(result.title || result.text?.substring(0, 100) + '...' || ''),
              });
            }

            return {
              url: result.url,
              title: cleanTitle(result.title || ''),
              content: (result.text || '').substring(0, 1000),
              published_date: currentTopic === 'news' && result.publishedDate ? result.publishedDate : undefined,
              author: result.author || undefined,
            };
          });

          dataStream.write({
            type: 'data-query_completion',
            data: {
              query,
              index,
              total: queries.length,
              status: 'completed',
              resultsCount: results.length,
              imagesCount: images.length,
            },
          });

          return {
            query,
            results: deduplicateByDomainAndUrl(results),
            images: images.filter((img) => img.url && img.description),
          };
        } catch (error) {
          console.error(`Exa search error for query "${query}":`, error);

          dataStream.write({
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
            images: [],
          };
        }
      });

      const searchResults = await Promise.all(searchPromises);

      return {
        searches: searchResults,
      };
    },
  });
}
