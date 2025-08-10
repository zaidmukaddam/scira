import { tool } from 'ai';
import { z } from 'zod';
import { Valyu } from 'valyu-js';
import { tavily } from '@tavily/core';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  RUB: '₽',
  KRW: '₩',
  BTC: '₿',
  THB: '฿',
  BRL: 'R$',
  PHP: '₱',
  ILS: '₪',
  TRY: '₺',
  NGN: '₦',
  VND: '₫',
  ARS: '$',
  ZAR: 'R',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  HKD: 'HK$',
  NZD: 'NZ$',
  MXN: 'Mex$',
} as const;

interface NewsResult {
  title: string;
  url: string;
  content: string;
  published_date?: string;
  category: string;
  query: string;
}

interface NewsGroup {
  query: string;
  topic: string;
  results: NewsResult[];
}

export const stockChartTool = tool({
  description: 'Get stock data and news for given stock symbols.',
  inputSchema: z.object({
    title: z.string().describe('The title of the chart.'),
    news_queries: z.array(z.string()).describe('The news queries to search for.'),
    icon: z.enum(['stock', 'date', 'calculation', 'default']).describe('The icon to display for the chart.'),
    stock_symbols: z.array(z.string()).describe('The stock symbols to display for the chart.'),
    currency_symbols: z
      .array(z.string())
      .describe(
        'The currency symbols for each stock/asset in the chart. Available symbols: ' +
          Object.keys(CURRENCY_SYMBOLS).join(', ') +
          '. Defaults to USD if not provided.',
      ),
    interval: z
      .enum(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'])
      .describe('The interval of the chart. default is 1y.'),
  }),
  execute: async ({
    title,
    icon,
    stock_symbols,
    currency_symbols,
    interval,
    news_queries,
  }: {
    title: string;
    icon: string;
    stock_symbols: string[];
    currency_symbols?: string[];
    interval: string;
    news_queries: string[];
  }) => {
    console.log('Title:', title);
    console.log('Icon:', icon);
    console.log('Stock symbols:', stock_symbols);
    console.log('Currency symbols:', currency_symbols);
    console.log('Interval:', interval);
    console.log('News queries:', news_queries);

    let news_results: NewsGroup[] = [];

    const tvly = tavily({ apiKey: serverEnv.TAVILY_API_KEY });

    const searchPromises = [];
    for (const query of news_queries) {
      searchPromises.push({
        query,
        topic: 'finance',
        promise: tvly.search(query, {
          topic: 'finance',
          days: 7,
          maxResults: 3,
          searchDepth: 'advanced',
        }),
      });

      searchPromises.push({
        query,
        topic: 'news',
        promise: tvly.search(query, {
          topic: 'news',
          days: 7,
          maxResults: 3,
          searchDepth: 'advanced',
        }),
      });
    }

    const searchResults = await Promise.all(
      searchPromises.map(({ promise }) =>
        promise.catch((err) => ({
          results: [],
          error: err.message,
        })),
      ),
    );

    const urlSet = new Set();
    searchPromises.forEach(({ query, topic }, index) => {
      const result = searchResults[index];
      if (!result.results) return;

      const processedResults = result.results
        .filter((item) => {
          if (urlSet.has(item.url)) return false;
          urlSet.add(item.url);
          return true;
        })
        .map((item) => ({
          title: item.title,
          url: item.url,
          content: item.content.slice(0, 30000),
          published_date: item.publishedDate,
          category: topic,
          query: query,
        }));

      if (processedResults.length > 0) {
        news_results.push({
          query,
          topic,
          results: processedResults,
        });
      }
    });

    const exaResults: NewsGroup[] = [];
    try {
      const exa = new Exa(serverEnv.EXA_API_KEY);
      const exaSearchPromises = stock_symbols.map((symbol) =>
        exa
          .searchAndContents(`${symbol} financial report analysis`, {
            text: true,
            category: 'financial report',
            livecrawl: 'preferred',
            type: 'hybrid',
            numResults: 10,
            summary: {
              query: 'all important information relevent to the important for investors',
            },
          })
          .catch((error: any) => {
            console.error(`Exa search error for ${symbol}:`, error);
            return { results: [] };
          }),
      );

      const exaSearchResults = await Promise.all(exaSearchPromises);

      const exaUrlSet = new Set();
      exaSearchResults.forEach((result: any, index: number) => {
        if (!result.results || result.results.length === 0) return;

        const stockSymbol = stock_symbols[index];
        const processedResults = result.results
          .filter((item: any) => {
            if (exaUrlSet.has(item.url)) return false;
            exaUrlSet.add(item.url);
            return true;
          })
          .map((item: any) => ({
            title: item.title || '',
            url: item.url,
            content: item.summary || '',
            published_date: item.publishedDate,
            category: 'financial',
            query: stockSymbol,
          }));

        if (processedResults.length > 0) {
          exaResults.push({
            query: stockSymbol,
            topic: 'financial',
            results: processedResults,
          });
        }
      });

      news_results = [...news_results, ...exaResults];
    } catch (error) {
      console.error('Error fetching Exa financial reports:', error);
    }

    type ValyuOHLC = {
      datetime: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    };

    type ValyuResult = {
      id?: string;
      title: string;
      url: string;
      content: ValyuOHLC[];
      metadata?: {
        ticker?: string;
        name?: string;
        interval?: string;
        start?: string;
        end?: string;
        exchange?: string;
      };
    };

    const sanitizeTicker = (symbol: string): string => {
      const upper = symbol.toUpperCase();
      const base = upper.split('.')[0];
      return base.replace(/[^A-Z]/g, '');
    };

    const intervalToQueryRange = (raw: string): string => {
      const mapping: Record<string, string> = {
        '1d': '1 day',
        '5d': '5 days',
        '1mo': '1 month',
        '3mo': '3 months',
        '6mo': '6 months',
        '1y': '1 year',
        '2y': '2 years',
        '5y': '5 years',
        '10y': '10 years',
        ytd: 'year to date',
        max: 'max',
      };
      return mapping[raw] ?? '5 years';
    };

    const sanitizedTickers = stock_symbols.map(sanitizeTicker);
    const rangeText = intervalToQueryRange(interval);

    const valyu = new Valyu(serverEnv.VALYU_API_KEY);
    const query = `What are the ${rangeText} historical stock prices for ${sanitizedTickers.join(
      ' and ',
    )}?`;

    let valyuResults: ValyuResult[] = [];
    try {
      const response = await valyu.search(query, {
        searchType: 'proprietary',
        relevanceThreshold: 0.6,
        isToolCall: false,
        includedSources: ['valyu/valyu-stocks-US'],
      });

      const isValyuOHLCArray = (value: unknown): value is ValyuOHLC[] => {
        return (
          Array.isArray(value) &&
          value.every(
            (v) =>
              typeof v === 'object' &&
              v !== null &&
              'datetime' in (v as Record<string, unknown>) &&
              'close' in (v as Record<string, unknown>),
          )
        );
      };

      const isValyuResult = (obj: unknown): obj is ValyuResult => {
        if (!obj || typeof obj !== 'object') return false;
        const r = obj as Record<string, unknown>;
        return (
          typeof r['title'] === 'string' &&
          typeof r['url'] === 'string' &&
          isValyuOHLCArray(r['content'])
        );
      };

      if (response && Array.isArray(response.results)) {
        valyuResults = (response.results as unknown[]).filter(isValyuResult) as ValyuResult[];
      }
    } catch (error) {
      console.error('Error fetching Valyu data:', error);
    }

    const getTickerFromResult = (r: ValyuResult): string | undefined => {
      if (r.metadata?.ticker) return r.metadata.ticker.toUpperCase();
      if (r.id) {
        const match = r.id.match(/valyu-stocks-US:([A-Z.]+)\s/);
        if (match && match[1]) return match[1].split('.')[0];
      }

      const titleMatch = r.title.match(/Price of\s+([A-Z.]+)\s+/i);
      if (titleMatch && titleMatch[1]) return titleMatch[1].toUpperCase().split('.')[0];
      return undefined;
    };

    const elements = sanitizedTickers.map((ticker) => {
      const resultForTicker = valyuResults.find((r) => getTickerFromResult(r) === ticker);
      const points: Array<[string, number]> = (resultForTicker?.content || [])
        .map((c) => [c.datetime, Number(c.close)] as [string, number])
        .filter(([, close]) => Number.isFinite(close));
      return {
        label: ticker,
        points,
      };
    });

    const chartData = {
      type: 'line',
      title,
      x_label: 'Date',
      y_label: 'Price',
      x_scale: 'datetime',
      elements,
      png: undefined,
    };

    const outputCurrencyCodes = currency_symbols || stock_symbols.map(() => 'USD');

    return {
      message: 'Fetched historical prices from Valyu (US)',
      chart: chartData,
      currency_symbols: outputCurrencyCodes,
      news_results: news_results,
    };
  },
});
