import { tool } from 'ai';
import { z } from 'zod';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '../types';
import { serverEnv } from '@/env/server';

const SERPER_API_KEY = serverEnv.SERPER_API_KEY;
const SERPER_SEARCH_ENDPOINT = 'https://google.serper.dev/search';

interface SerperSearchResult {
  organic?: Array<{
    title: string;
    link: string;
    snippet: string;
    date?: string;
  }>;
  images?: string[];
  knowledgeGraph?: {
    title?: string;
    description?: string;
    descriptionSource?: string;
    descriptionLink?: string;
    attributes?: Record<string, string>;
    imageUrl?: string;
  };
}

async function searchSerper(query: string, num: number = 10): Promise<SerperSearchResult> {
  const response = await fetch(SERPER_SEARCH_ENDPOINT, {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_API_KEY as string,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      num,
      gl: 'fr',
      hl: 'fr',
    }),
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status}`);
  }

  return (await response.json()) as SerperSearchResult;
}

const allowedSources = [
  'https://www.barcodelookup.com/',
  'https://go-upc.com/',
  'https://www.gs1.org/services/verified-by-gs1',
  'https://www.eandata.com/',
  'https://www.upcindex.com/',
  'https://www.carrefour.fr/',
  'https://fr.openfoodfacts.org/',
  'https://carrefour-express.fr/',
  'https://world.openfoodfacts.org/',
];

const hostToBrandFallback: Record<string, string> = {
  'www.barcodelookup.com': 'Barcode Lookup',
  'barcodelookup.com': 'Barcode Lookup',
  'go-upc.com': 'Go-UPC',
  'www.gs1.org': 'GS1',
  'www.eandata.com': 'EANData',
  'www.upcindex.com': 'UPC Index',
  'www.carrefour.fr': 'Carrefour',
  'carrefour.fr': 'Carrefour',
  'carrefour-express.fr': 'Carrefour Express',
  'fr.openfoodfacts.org': 'Open Food Facts',
  'world.openfoodfacts.org': 'Open Food Facts',
};

function extractDomain(value: string): string | null {
  try {
    const url = value.includes('://') ? new URL(value) : new URL(`https://${value}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function getHostname(value: string): string | null {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function deriveBrand(title: string, content: string, hostname: string | null): string | undefined {
  const haystack = `${title}\n${content}`.split(/\n|\.|\r/);
  for (const segment of haystack) {
    const match = segment.match(/\b(?:brand|marque)\s*[:\-]\s*([^\n\r]+)/i);
    if (match) {
      const raw = match[1].trim();
      if (raw) {
        return raw.replace(/\s{2,}/g, ' ');
      }
    }
  }

  if (hostname) {
    const fallback = hostToBrandFallback[hostname] || hostToBrandFallback[hostname.replace(/^www\./, '')];
    if (fallback) {
      return fallback;
    }
  }

  const titleMatch = title.match(/^[^|-]+/);
  if (titleMatch) {
    const possible = titleMatch[0].trim();
    if (possible && possible.length <= 40) {
      return possible;
    }
  }

  return undefined;
}

type ProductSearchResult = {
  title: string;
  url: string;
  content: string;
  price?: string;
  images: string[];
  supplier?: string;
  ean: string;
  publishedDate?: string;
  favicon?: string;
  description?: string;
};

export function eanSearchTool(dataStream: UIMessageStreamWriter<ChatMessage> | undefined) {
  return tool({
    description:
      'Search for product information using EAN/UPC barcode. Returns detailed product information including title, description, images, price, and suppliers. Use this tool when the user provides a barcode number (13 digits for EAN-13, 8 digits for EAN-8, or 12 digits for UPC).',
    inputSchema: z.object({
      barcode: z.string().describe('The EAN/UPC barcode number provided by the user'),
    }),
    execute: async ({ barcode }) => {
      if (!/^\d{8,13}$/.test(barcode)) {
        throw new Error('Invalid barcode format. EAN codes must be 8-13 digits.');
      }

      const normalizedDomains = Array.from(
        new Set(allowedSources.map(extractDomain).filter((domain): domain is string => Boolean(domain))),
      );
      const allowedHostnames = new Set<string>();
      normalizedDomains.forEach((domain) => {
        allowedHostnames.add(domain);
        allowedHostnames.add(domain.replace(/^www\./, ''));
        allowedHostnames.add(`www.${domain.replace(/^www\./, '')}`);
      });

      try {
        const searchQuery = `EAN ${barcode}`;

        const serperResults = await searchSerper(searchQuery, 20);

        const collectedResults: ProductSearchResult[] = [];
        const collectedImages: string[] = [];

        if (serperResults.organic) {
          for (const result of serperResults.organic) {
            const url = result.link;
            const hostname = url ? getHostname(url) : null;
            if (!hostname) continue;
            const normalizedHost = hostname.replace(/^www\./, '');
            if (!allowedHostnames.has(normalizedHost) && !allowedHostnames.has(hostname)) {
              continue;
            }

            const content = result.snippet || '';
            const brand = deriveBrand(result.title || '', content, hostname);

            collectedResults.push({
              title: result.title || '',
              url,
              content,
              images: [],
              supplier: brand || undefined,
              ean: barcode,
              publishedDate: result.date || undefined,
            });
          }
        }

        if (serperResults.images && Array.isArray(serperResults.images)) {
          serperResults.images.forEach((img) => {
            if (typeof img === 'string') {
              collectedImages.push(img);
            }
          });
        }

        if (serperResults.knowledgeGraph?.imageUrl) {
          collectedImages.unshift(serperResults.knowledgeGraph.imageUrl);
        }

        const domainSearches = normalizedDomains.slice(0, 5).map((domain) =>
          searchSerper(`EAN ${barcode} site:${domain}`, 4).catch(() => null),
        );

        const domainResults = await Promise.all(domainSearches);

        for (const domainResult of domainResults) {
          if (!domainResult?.organic) continue;

          for (const result of domainResult.organic) {
            const url = result.link;
            const hostname = url ? getHostname(url) : null;
            if (!hostname) continue;
            const normalizedHost = hostname.replace(/^www\./, '');
            if (!allowedHostnames.has(normalizedHost) && !allowedHostnames.has(hostname)) {
              continue;
            }

            const content = result.snippet || '';
            const brand = deriveBrand(result.title || '', content, hostname);

            collectedResults.push({
              title: result.title || '',
              url,
              content,
              images: [],
              supplier: brand || undefined,
              ean: barcode,
              publishedDate: result.date || undefined,
            });
          }

          if (domainResult.images && Array.isArray(domainResult.images)) {
            domainResult.images.forEach((img) => {
              if (typeof img === 'string') {
                collectedImages.push(img);
              }
            });
          }
        }

        const seenUrls = new Set<string>();
        const finalResults: ProductSearchResult[] = [];
        for (const result of collectedResults) {
          if (!result.url || seenUrls.has(result.url)) continue;
          seenUrls.add(result.url);
          finalResults.push(result);
        }

        const finalImages = Array.from(new Set(collectedImages)).slice(0, 12);

        if (finalResults.length === 0) {
          return {
            barcode,
            results: [],
            images: [],
            totalResults: 0,
            message: 'Aucun résultat trouvé sur les sites autorisés.',
          } as const;
        }

        finalResults.splice(8);

        let fullDescription = '';

        if (serperResults.knowledgeGraph) {
          const kg = serperResults.knowledgeGraph;
          if (kg.title) {
            fullDescription += `${kg.title}\n\n`;
          }
          if (kg.description) {
            fullDescription += `${kg.description}\n\n`;
          }
          if (kg.attributes) {
            Object.entries(kg.attributes).forEach(([key, value]) => {
              fullDescription += `${key}: ${value}\n`;
            });
            fullDescription += '\n';
          }
        }

        finalResults.slice(0, 3).forEach((result) => {
          if (result.content) {
            fullDescription += `${result.content}\n\n`;
          }
        });

        return {
          barcode,
          results: finalResults,
          images: finalImages,
          totalResults: finalResults.length,
          description: fullDescription.trim() || undefined,
          message: `Found ${finalResults.length} results for barcode ${barcode}`,
        };
      } catch (err) {
        return {
          barcode,
          results: [],
          images: [],
          totalResults: 0,
          description: undefined,
          message: 'Aucun résultat trouvé sur les sites autorisés.',
          error: (err as Error)?.message || 'Unknown error',
        } as const;
      }
    },
  });
}
