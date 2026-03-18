import { tool } from 'ai';
import { z } from 'zod';
import { UIMessageStreamWriter } from 'ai';
import { ChatMessage } from '@/lib/types';

import Firecrawl from '@mendable/firecrawl-js';
import { serverEnv } from '@/env/server';
import { all } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';

const firecrawl = new Firecrawl({ apiKey: serverEnv.FIRECRAWL_API_KEY });

const githubRepoJsonSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: true,
  properties: {
    fullName: { type: 'string', description: 'owner/repo' },
    owner: { type: 'string' },
    repo: { type: 'string' },
    description: { type: 'string' },
    stars: { type: 'number' },
    forks: { type: 'number' },
    watchers: { type: 'number' },
    primaryLanguage: { type: 'string' },
    topics: { type: 'array', items: { type: 'string' } },
    license: { type: 'string' },
    homepage: { type: 'string' },
    lastUpdated: { type: 'string', description: 'ISO timestamp when possible' },
  },
};

function parseCount(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;

  const cleaned = value.trim().replace(/,/g, '');
  if (!cleaned) return undefined;

  const kMatch = cleaned.match(/^(\d+(?:\.\d+)?)\s*[kK]$/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function getGitHubResultUrl(result: unknown): string {
  const r = result as any;
  return r?.url || r?.metadata?.url || r?.metadata?.ogUrl || r?.metadata?.sourceURL || '';
}

function isGitHubRepoUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./, '').toLowerCase();
    if (hostname !== 'github.com') return false;

    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return false; // profiles like /owner

    const [first, second] = parts;
    const nonRepoFirstSegments = new Set([
      'about',
      'account',
      'collections',
      'contact',
      'customer-stories',
      'enterprise',
      'events',
      'explore',
      'features',
      'issues',
      'login',
      'marketplace',
      'new',
      'notifications',
      'orgs',
      'pricing',
      'pulls',
      'search',
      'security',
      'settings',
      'sponsors',
      'stars',
      'topics',
      'trending',
    ]);

    if (nonRepoFirstSegments.has(first.toLowerCase())) return false; // e.g. /topics/...
    if (second.toLowerCase() === 'followers' || second.toLowerCase() === 'following') return false;

    return true;
  } catch {
    // Non-absolute URL or invalid URL
    return false;
  }
}

export type GitHubResult = {
  url: string;
  title: string;
  content: string;
  publishedDate?: string;
  author?: string;
  image?: string;
  favicon?: string;
  stars?: number;
  language?: string;
  description?: string;
  json?: unknown;
};

export type GitHubSearchQueryResult = {
  query: string;
  results: GitHubResult[];
};

export type GitHubSearchResponse = {
  searches: GitHubSearchQueryResult[];
};

export function githubSearchTool(dataStream?: UIMessageStreamWriter<ChatMessage>) {
  return tool({
    description: 'Search GitHub using Firecrawl with multiple queries.',
    inputSchema: z.object({
      queries: z
        .array(z.string().max(200))
        .describe('Array of search queries to execute on GitHub. Minimum 1, recommended 3-5.')
        .min(1)
        .max(5),
      maxResults: z.array(z.number()).optional().describe('Array of maximum results per query. Default is 10 per query.'),
      startDate: z.string().optional().describe('Start date for filtering results in ISO format (e.g., 2025-01-01T00:00:00.000Z)'),
      endDate: z.string().optional().describe('End date for filtering results in ISO format (e.g., 2025-12-31T23:59:59.999Z)'),
    }),
    execute: async ({
      queries,
      maxResults,
      startDate,
      endDate,
    }: {
      queries: string[];
      maxResults?: number[];
      startDate?: string;
      endDate?: string;
    }) => {
      console.log('GitHub search queries:', queries);
      console.log('Max results:', maxResults);
      console.log('Date range:', startDate, '-', endDate);

      const searchPromises = queries.map(async (query, index) => {
        const currentMaxResults = maxResults?.[index] || maxResults?.[0] || 10;

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
                  categories: ['github'],
                  limit: currentMaxResults,
                  scrapeOptions: {
                    formats: [
                      'markdown',
                      {
                        type: 'json',
                        schema: githubRepoJsonSchema,
                        prompt:
                          'Extract GitHub repository metadata from this page. If the page is not a GitHub repository, return an empty object. ' +
                          'Return numeric counts as numbers (no "k" suffixes).',
                      },
                    ],
                    storeInCache: true,
                    proxy: 'auto',
                  },
                });
              },
              processedResults: async function () {
                const firecrawlResults = await this.$.firecrawlResults;
                if (!firecrawlResults.web || !Array.isArray(firecrawlResults.web)) return [];

                return firecrawlResults.web
                .map((result): GitHubResult | null => {
                  const url = getGitHubResultUrl(result);
                  if (!isGitHubRepoUrl(url)) return null;

                  const r = result as any;
                  const title =
                    (typeof r?.title === 'string' ? r.title : undefined) ||
                    (typeof r?.metadata?.title === 'string' ? r.metadata.title : undefined) ||
                    url;
                  const description =
                    (typeof r?.description === 'string' ? r.description : undefined) ||
                    (typeof r?.metadata?.description === 'string' ? r.metadata.description : undefined) ||
                    '';
                  const markdown = typeof r?.markdown === 'string' ? r.markdown : '';
                  const json = r?.json;
                  const extracted = json && typeof json === 'object' ? (json as any) : undefined;

                  const authorMatch = url.match(/github\.com\/([^/]+)/);
                  const author = authorMatch ? authorMatch[1] : undefined;
                  const stars = parseCount(extracted?.stars);
                  const language =
                    (typeof extracted?.primaryLanguage === 'string' ? extracted.primaryLanguage : undefined) ||
                    (typeof extracted?.language === 'string' ? extracted.language : undefined) ||
                    (typeof r?.metadata?.language === 'string' ? r.metadata.language : undefined);
                  const image = typeof r?.metadata?.ogImage === 'string' ? r.metadata.ogImage : undefined;
                  const favicon = typeof r?.metadata?.favicon === 'string' ? r.metadata.favicon : undefined;
                  const publishedDate =
                    (typeof r?.metadata?.publishedTime === 'string' ? r.metadata.publishedTime : undefined) ||
                    (typeof r?.metadata?.modifiedTime === 'string' ? r.metadata.modifiedTime : undefined) ||
                    (typeof extracted?.lastUpdated === 'string' ? extracted.lastUpdated : undefined);

                  const out: GitHubResult = {
                    url,
                    title,
                    content: description || markdown,
                  };
                  if (publishedDate) out.publishedDate = publishedDate;
                  if (author) out.author = author;
                  if (image) out.image = image;
                  if (favicon) out.favicon = favicon;
                  if (typeof stars === 'number') out.stars = stars;
                  if (language) out.language = language;
                  const extractedDescription = typeof extracted?.description === 'string' ? extracted.description : undefined;
                  if (extractedDescription) out.description = extractedDescription;
                  else if (description) out.description = description.substring(0, 300);
                  if (json !== undefined) out.json = json;

                  return out;
                })
                  .filter((r): r is GitHubResult => r !== null);
              },
            },
            getBetterAllOptions(),
          );

          if (processedResults.length === 0) {
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
          console.error(`GitHub search error for query "${query}":`, error);

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
    },
  });
}
