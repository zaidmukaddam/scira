import Exa from 'exa-js';
import { tool } from 'ai';
import { z } from 'zod';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '../types';
import { serverEnv } from '@/env/server';
import { tavily } from '@tavily/core';

const exa = new Exa(serverEnv.EXA_API_KEY as string);
const tvly = tavily({ apiKey: serverEnv.TAVILY_API_KEY });

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

        const [exaResults, tavilyDomainResults] = await Promise.allSettled([
          exa
            .searchAndContents(searchQuery, {
              numResults: 20,
              type: 'auto',
              category: 'company',
              include_domains: Array.from(allowedHostnames).map((host) => host.replace(/^www\./, '')),
            } as any)
            .then((res) => res.results || []),
          Promise.allSettled(
            normalizedDomains.map((domain) =>
              tvly.search(`${searchQuery} site:${domain}`, {
                maxResults: 4,
                includeImages: true,
                includeAnswer: false,
              }),
            ),
          ),
        ]);

        const collectedResults: ProductSearchResult[] = [];
        const collectedImages: string[] = [];

        const pushResult = (result: {
          title?: string | null;
          url: string;
          content?: string | null;
          favicon?: string | null;
          publishedDate?: string | null;
        }) => {
          if (!result.url) return;
          const hostname = getHostname(result.url);
          if (!hostname) return;
          const normalizedHost = hostname.replace(/^www\./, '');
          if (!allowedHostnames.has(normalizedHost) && !allowedHostnames.has(hostname)) {
            return;
          }

          const content = result.content || '';
          const brand = deriveBrand(result.title || '', content, hostname);

          collectedResults.push({
            title: result.title || '',
            url: result.url,
            content,
            favicon: result.favicon || undefined,
            publishedDate: result.publishedDate || undefined,
            images: [],
            supplier: brand || undefined,
            ean: barcode,
          });
        };

        const pushImages = (images: unknown[]) => {
          if (!images) return;
          images
            .map((img) => (typeof img === 'string' ? img : typeof img === 'object' && img && 'url' in img ? (img as any).url : null))
            .filter((value): value is string => Boolean(value))
            .forEach((img) => collectedImages.push(img));
        };

        if (exaResults.status === 'fulfilled') {
          exaResults.value.forEach((r) => {
            pushResult({
              title: r.title,
              url: r.url,
              content: r.text || '',
              favicon: r.favicon,
              publishedDate: r.publishedDate,
            });
          });
        }

        if (tavilyDomainResults.status === 'fulfilled') {
          tavilyDomainResults.value.forEach((entry) => {
            if (entry.status === 'fulfilled') {
              const data = entry.value;
              pushImages(data.images || []);
              (data.results || []).forEach((r: any) => {
                pushResult({
                  title: r.title,
                  url: r.url,
                  content: r.content || '',
                });
              });
            }
          });
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

        return {
          barcode,
          results: finalResults,
          images: finalImages,
          totalResults: finalResults.length,
          message: `Found ${finalResults.length} results for barcode ${barcode}`,
        };
      } catch (err) {
        return {
          barcode,
          results: [],
          images: [],
          totalResults: 0,
          message: 'Aucun résultat trouvé sur les sites autorisés.',
          error: (err as Error)?.message || 'Unknown error',
        } as const;
      }
    },
  });
}
