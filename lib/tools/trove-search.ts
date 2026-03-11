import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

// Trove zones available for searching
const TROVE_ZONES = [
  'newspaper',
  'gazette',
  'book',
  'article',
  'image', // Trove API uses 'image' not 'picture'
  'music',
  'map',
  'collection',
  'list',
  'all',
] as const;

// Shared document schema
interface TroveDocument {
  id: string;
  title: string;
  url: string;
  content: string;
  snippet?: string;
  year?: number;
  date?: string;
  contributor: string;
  zone: string;
  isPartOf?: string;
  page?: number;
  fullTextUrl?: string;
  thumbnail?: string;
}

// Helper to extract year from various date formats
const extractYear = (dateStr?: string): number | undefined => {
  if (!dateStr) return undefined;
  const match = dateStr.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? parseInt(match[1]) : undefined;
};

// De-duplicate results based on ID and similarity
const deduplicateResults = (results: TroveDocument[]): TroveDocument[] => {
  const seen = new Map<string, TroveDocument>();

  for (const doc of results) {
    const existing = seen.get(doc.id);
    if (!existing) {
      seen.set(doc.id, doc);
    } else {
      // Keep the one with more content
      if ((doc.content?.length || 0) > (existing.content?.length || 0)) {
        seen.set(doc.id, doc);
      }
    }
  }

  return Array.from(seen.values());
};

// Helper to strip HTML tags from text
const stripHtml = (html: string): string => {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[^;]+;/g, ' ') // Replace HTML entities with space
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

// Normalize Trove API response to our schema
const normalizeResult = (item: any, zone: string): TroveDocument => {
  // Handle title which can be an object or string
  let title = 'Untitled';
  if (item.title) {
    if (typeof item.title === 'string') {
      title = item.title;
    } else if (item.title.value) {
      title = item.title.value;
    } else if (item.title.title) {
      title = item.title.title;
    }
  } else if (item.heading) {
    title = item.heading;
  }

  const doc: TroveDocument = {
    id: item.id || '',
    title: stripHtml(title),
    url: item.troveUrl || '',
    content: '',
    zone: zone,
    year: extractYear(item.date || item.issued),
    date: item.date || item.issued,
    contributor: Array.isArray(item.contributor) ? item.contributor.join(', ') : item.contributor || '',
    isPartOf: item.isPartOf?.title,
  };

  // Extract thumbnail for images
  if (item.thumbnail) {
    doc.thumbnail = item.thumbnail;
  }

  // Handle newspaper articles specially
  if (zone.toLowerCase().includes('newspaper') || zone.toLowerCase().includes('gazette')) {
    // For newspapers, use snippet if available, otherwise truncate article text
    if (item.snippet) {
      doc.snippet = stripHtml(item.snippet);
      doc.content = doc.snippet;
    } else if (item.articleText) {
      const cleanText = stripHtml(item.articleText);
      doc.snippet = cleanText.substring(0, 500) + '...';
      doc.content = doc.snippet;
    }
    doc.page = item.page;
    // Store URL for full text retrieval if needed
    doc.fullTextUrl = `https://api.trove.nla.gov.au/v3/newspaper/${item.id}`;
  } else {
    // For other zones, use available text and strip HTML
    const rawContent = item.snippet || item.description || item.abstract || '';
    doc.content = stripHtml(rawContent);
  }

  return doc;
};

// Search Trove API
const searchTrove = async (
  query: string,
  zones: string[],
  limit: number = 20,
  apiKey: string,
  nextToken?: string,
): Promise<{ results: TroveDocument[]; nextToken?: string }> => {
  // Map zone names to Trove API categories
  const categoryMap: Record<string, string> = {
    newspaper: 'newspaper',
    gazette: 'gazette',
    book: 'book',
    article: 'article',
    picture: 'image', // Trove uses 'image' not 'picture'
    music: 'music',
    map: 'map',
    collection: 'collection',
    list: 'list',
    all: 'all',
  };

  // Map zones to categories
  const categories = zones.map((z) => categoryMap[z.toLowerCase()] || z).join(',');

  console.log('Trove search params:', { query, zones, categories, limit });

  const params = new URLSearchParams({
    q: query,
    category: categories,
    n: (limit || 20).toString(),
    encoding: 'json',
    include: 'all',
    key: apiKey,
  });

  if (nextToken) {
    params.append('s', nextToken);
  }

  const url = `https://api.trove.nla.gov.au/v3/result?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Trove API error response:', errorText);
      throw new Error(`Trove API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const results: TroveDocument[] = [];

    // Process results from each category
    for (const category of data.category || []) {
      const zoneName = category.name;

      // Handle different record types based on the zone
      if (category.records) {
        // Articles (for newspapers, gazettes)
        for (const record of category.records.article || []) {
          results.push(normalizeResult(record, zoneName));
        }
        // Works (for books, pictures, etc.)
        for (const record of category.records.work || []) {
          results.push(normalizeResult(record, zoneName));
        }
        // Add any other record types if needed
        for (const record of category.records.item || []) {
          results.push(normalizeResult(record, zoneName));
        }
      }
    }

    return {
      results: deduplicateResults(results),
      nextToken: data.nextStart,
    };
  } catch (error) {
    console.error('Trove search error:', error);
    throw error;
  }
};

export const troveSearchTool = tool({
  description:
    "Search the National Library of Australia's Trove archive for historical Australian content including newspapers, books, images, and more. Best for content before 2020. ALWAYS extract the search terms from the user's message and use them as the query parameter. The query parameter is MANDATORY and cannot be empty.",
  inputSchema: z.object({
    query: z
      .string()
      .min(1, 'Query is required and cannot be empty')
      .describe(
        'The search query extracted from the user\'s message. This is REQUIRED and must be a non-empty string containing the search terms (e.g., "Federation", "Australian history", "Sydney Olympics 2000"). Extract this directly from what the user is asking about.',
      ),
    zones: z
      .array(z.enum(TROVE_ZONES))
      .nullable()
      .optional()
      .describe('Specific zones to search (e.g., newspaper, book, image). Defaults to all.'),
    yearFrom: z.number().nullish().describe('Filter results from this year onwards'),
    yearTo: z.number().nullish().describe('Filter results up to this year'),
    limit: z.number().optional().default(20).describe('Maximum number of results to return'),
  }),
  execute: async ({ query, zones, yearFrom, yearTo, limit = 20 }, { messages }) => {
    // Enhanced validation with better error messages
    let actualQuery = query;

    // Handle nested argument format from SambaNova models
    if (query && typeof query === 'object' && 'value' in query) {
      actualQuery = query as string;
    }

    // Try to extract query from user message if not provided
    if (!actualQuery || typeof actualQuery !== 'string' || actualQuery.trim().length === 0) {
      // Extract from the last user message if available
      if (messages && Array.isArray(messages)) {
        const lastUserMessage = messages
          .slice()
          .reverse()
          .find((msg: any) => msg.role === 'user');

        if (lastUserMessage) {
          const messageContent =
            typeof lastUserMessage.content === 'string'
              ? lastUserMessage.content
              : Array.isArray(lastUserMessage.content)
                ? lastUserMessage.content
                    .filter((p: any) => p?.type === 'text')
                    .map((p: any) => p?.text || '')
                    .join(' ')
                : '';

          if (messageContent && messageContent.trim().length > 0) {
            actualQuery = messageContent.trim();
            console.log('[Trove] Extracted query from user message:', actualQuery);
          }
        }
      }
    }

    // Final validation
    if (!actualQuery || typeof actualQuery !== 'string' || actualQuery.trim().length === 0) {
      return {
        error: "Query parameter is required. Please provide a search query extracted from the user's message.",
        results: [],
        query: '',
      };
    }

    // Use the validated query
    const validatedQuery = actualQuery.trim();

    const apiKey = process.env.TROVE_API_KEY;
    if (!apiKey) {
      return {
        error: 'Trove API key not configured. Please set TROVE_API_KEY environment variable.',
        results: [],
      };
    }

    const normalizedYearFrom = typeof yearFrom === 'number' ? yearFrom : undefined;
    const normalizedYearTo = typeof yearTo === 'number' ? yearTo : undefined;

    try {
      // Handle zones parameter - it might come as a JSON string from some models
      let parsedZones = zones;
      if (typeof zones === 'string') {
        try {
          parsedZones = JSON.parse(zones);
        } catch (e) {
          // If it's not valid JSON, treat it as a single zone
          parsedZones = [zones];
        }
      }

      if (parsedZones == null) {
        parsedZones = undefined;
      }

      // Add year filters to query if provided
      let searchQuery = validatedQuery;
      if (normalizedYearFrom || normalizedYearTo) {
        const fromYear = normalizedYearFrom || 1800;
        const toYear = normalizedYearTo || new Date().getFullYear();
        searchQuery += ` date:[${fromYear} TO ${toYear}]`;
      }

      const normalizedZones = Array.isArray(parsedZones) && parsedZones.length > 0 ? parsedZones : undefined;

      // Default to all zones if none specified
      const searchZones = normalizedZones ?? ['all'];

      const { results, nextToken } = await searchTrove(searchQuery, searchZones, limit || 20, apiKey);

      // Filter by year if needed (backup in case API date filter doesn't work perfectly)
      const filteredResults = results.filter((doc) => {
        if (!doc.year) return true;
        if (normalizedYearFrom && doc.year < normalizedYearFrom) return false;
        if (normalizedYearTo && doc.year > normalizedYearTo) return false;
        return true;
      });

      // Log what we're returning for debugging
      console.log(
        `Trove search returning ${filteredResults.length} results:`,
        filteredResults.slice(0, 3).map((r) => ({
          title: r.title,
          date: r.date,
          url: r.url,
          zone: r.zone,
        })),
      );

      return {
        results: filteredResults,
        nextToken,
        query: searchQuery,
        zones: searchZones,
        totalFound: filteredResults.length,
        searchedQuery: searchQuery,
      };
    } catch (error) {
      console.error('Trove search error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        results: [],
        query: validatedQuery || query || '',
      };
    }
  },
});
