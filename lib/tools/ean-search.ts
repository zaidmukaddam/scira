import Exa from 'exa-js';
import FirecrawlApp from '@mendable/firecrawl-js';
import { tool } from 'ai';
import { z } from 'zod';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '../types';
import { serverEnv } from '@/env/server';
import { tavily } from '@tavily/core';

const exa = new Exa(serverEnv.EXA_API_KEY as string);
const firecrawl = new FirecrawlApp({ apiKey: serverEnv.FIRECRAWL_API_KEY as string });
const tvly = tavily({ apiKey: serverEnv.TAVILY_API_KEY });

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

      try {
        const searchQuery = `EAN ${barcode} product information`;

        const [exaResults, tavilyResults, firecrawlResults] = await Promise.allSettled([
          exa
            .searchAndContents(searchQuery, {
              numResults: 5,
              type: 'auto',
              category: 'company',
            })
            .then((res) =>
              res.results.map((r) => ({
                title: r.title,
                url: r.url,
                content: r.text || '',
                images: [],
                favicon: r.favicon,
                publishedDate: r.publishedDate,
              })),
            ),

          tvly
            .search(searchQuery, {
              maxResults: 5,
              includeImages: true,
              includeAnswer: false,
            })
            .then((res) => ({
              results: res.results.map((r) => ({
                title: r.title,
                url: r.url,
                content: r.content || '',
                images: [],
              })),
              images: (res.images || []).map((img: any) => (typeof img === 'string' ? img : img.url)).filter(Boolean),
            })),

          Promise.resolve([]),
        ]);

        const allResults: ProductSearchResult[] = [];
        const allImages: string[] = [];

        if (exaResults.status === 'fulfilled') {
          allResults.push(
            ...exaResults.value.map((r) => ({ ...r, ean: barcode, images: [] })),
          );
        }

        if (tavilyResults.status === 'fulfilled') {
          allResults.push(
            ...tavilyResults.value.results.map((r: any) => ({ ...r, ean: barcode, images: [] })),
          );
          allImages.push(...tavilyResults.value.images);
        }

        const uniqueResults = Array.from(new Map(allResults.map((r) => [r.url, r])).values()).slice(0, 8);

        return {
          barcode,
          results: uniqueResults,
          images: allImages.slice(0, 12),
          totalResults: uniqueResults.length,
          message: `Found ${uniqueResults.length} results for barcode ${barcode}`,
        };
      } catch (err) {
        return {
          barcode,
          results: [],
          images: [],
          totalResults: 0,
          message: `No results found for barcode ${barcode}`,
          error: (err as Error)?.message || 'Unknown error',
        } as any;
      }
    },
  });
}
