import { tool } from 'ai';
import { z } from 'zod';
import { Valyu } from 'valyu-js';
import { serverEnv } from '@/env/server';

export const currencyConverterTool = tool({
  description: 'Convert currency from one to another using Valyu forex data',
  inputSchema: z.object({
    from: z.string().describe('The source currency code.'),
    to: z.string().describe('The target currency code.'),
    amount: z.number().describe('The amount to convert. Default is 1.'),
  }),
  execute: async ({ from, to, amount }: { from: string; to: string; amount: number }) => {
    const valyu = new Valyu(serverEnv.VALYU_API_KEY);

    type ForexResult = {
      id?: string;
      title: string;
      url: string;
      content: number;
      metadata?: {
        base_currency?: string;
        quote_currency?: string;
        name?: string;
        timestamp?: string;
      };
    };

    const fetchRate = async (base: string, quote: string): Promise<number | undefined> => {
      const query = `${base} to ${quote}`;
      try {
        const response = await valyu.search(query, {
          searchType: 'proprietary',
          includedSources: ['valyu/valyu-forex', 'valyu/valyu-crypto'],
        });
        if (!response || !Array.isArray(response.results)) return undefined;

        const candidates = (response.results as unknown[]).filter((r): r is ForexResult => {
          if (!r || typeof r !== 'object') return false;
          const obj = r as Record<string, unknown>;
          const meta = obj['metadata'] as Record<string, unknown> | undefined;
          const baseOk = meta && typeof meta['base_currency'] === 'string' && meta['base_currency'] === base;
          const quoteOk = meta && typeof meta['quote_currency'] === 'string' && meta['quote_currency'] === quote;
          const contentOk = typeof obj['content'] === 'number';
          return Boolean(contentOk && baseOk && quoteOk);
        });

        if (candidates.length > 0) {
          return candidates[0].content;
        }

        // Fallback: first numeric content
        const firstNumeric = (response.results as unknown[]).find((r) =>
          r && typeof (r as Record<string, unknown>)['content'] === 'number',
        ) as ForexResult | undefined;
        return firstNumeric?.content;
      } catch (error) {
        console.error('Valyu forex fetch error:', error);
        return undefined;
      }
    };

    const [forwardRateRaw, reverseRateRaw] = await Promise.all([
      fetchRate(from, to),
      fetchRate(to, from),
    ]);

    const forwardRate = typeof forwardRateRaw === 'number' && Number.isFinite(forwardRateRaw) ? forwardRateRaw : undefined;
    const reverseRate =
      typeof reverseRateRaw === 'number' && Number.isFinite(reverseRateRaw)
        ? reverseRateRaw
        : forwardRate && forwardRate > 0
          ? 1 / forwardRate
          : undefined;

    const convertedAmount = forwardRate ? forwardRate * amount : undefined;

    return {
      rate: typeof convertedAmount === 'number' ? convertedAmount : 'Rate unavailable',
      forwardRate: forwardRate ?? null,
      reverseRate: reverseRate ?? null,
      fromCurrency: from,
      toCurrency: to,
      amount: amount,
      convertedAmount: convertedAmount ?? null,
    };
  },
});
