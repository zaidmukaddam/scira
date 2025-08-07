import { tool } from 'ai';
import { z } from 'zod';
import { Daytona } from '@daytonaio/sdk';
import { tavily } from '@tavily/core';
import Exa from 'exa-js';
import { generateObject } from 'ai';
import { serverEnv } from '@/env/server';
import { scira } from '@/ai/providers';
import { SNAPSHOT_NAME } from '@/lib/constants';

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

    const formattedCurrencySymbols = (currency_symbols || stock_symbols.map(() => 'USD')).map((currency) => {
      const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS];
      return symbol || currency;
    });

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
            livecrawl: 'always',
            type: 'auto',
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

      for (const group of exaResults) {
        for (let i = 0; i < group.results.length; i++) {
          const result = group.results[i];
          if (!result.title || result.title.trim() === '') {
            try {
              const { object } = await generateObject({
                model: scira.languageModel('scira-nano'),
                prompt: `Complete the following financial report with an appropriate title. The report is about ${
                  group.query
                } and contains this content: ${result.content.substring(0, 500)}...`,
                schema: z.object({
                  title: z.string().describe('A descriptive title for the financial report'),
                }),
              });
              group.results[i].title = object.title;
            } catch (error) {
              console.error(`Error generating title for ${group.query} report:`, error);
              group.results[i].title = `${group.query} Financial Report`;
            }
          }
        }
      }

      news_results = [...news_results, ...exaResults];
    } catch (error) {
      console.error('Error fetching Exa financial reports:', error);
    }

    const code = `
import yfinance as yf
import matplotlib.pyplot as plt
import pandas as pd
from datetime import datetime

${stock_symbols
  .map(
    (symbol) =>
      `${symbol.toLowerCase().replace('.', '')} = yf.download('${symbol}', period='${interval}', interval='1d')`,
  )
  .join('\n')}

# Create the plot
plt.figure(figsize=(10, 6))
${stock_symbols
  .map(
    (symbol) => `
# Convert datetime64 index to strings to make it serializable
${symbol.toLowerCase().replace('.', '')}.index = ${symbol.toLowerCase().replace('.', '')}.index.strftime('%Y-%m-%d')
plt.plot(${symbol.toLowerCase().replace('.', '')}.index, ${symbol
      .toLowerCase()
      .replace('.', '')}['Close'], label='${symbol} ${
      formattedCurrencySymbols[stock_symbols.indexOf(symbol)]
    }', color='blue')
`,
  )
  .join('\n')}

# Customize the chart
plt.title('${title}')
plt.xlabel('Date')
plt.ylabel('Closing Price')
plt.legend()
plt.grid(True)
plt.show()`;

    console.log('Code:', code);

    const daytona = new Daytona({
      apiKey: serverEnv.DAYTONA_API_KEY,
      target: 'us',
    });

    const sandbox = await daytona.create({
      snapshot: SNAPSHOT_NAME,
    });

    const execution = await sandbox.process.codeRun(code);
    let message = '';

    if (execution.result === execution.artifacts?.stdout) {
      message += execution.result;
    } else if (execution.result && execution.result !== execution.artifacts?.stdout) {
      message += execution.result;
    } else if (execution.artifacts?.stdout && execution.artifacts?.stdout !== execution.result) {
      message += execution.artifacts.stdout;
    } else {
      message += execution.result;
    }

    console.log('execution exit code: ', execution.exitCode);
    console.log('execution result: ', execution.result);

    console.log('Chart details: ', execution.artifacts?.charts);
    if (execution.artifacts?.charts) {
      console.log('showing chart');
      execution.artifacts.charts[0].elements.map((element: any) => {
        console.log(element.points);
      });
    }

    if (execution.artifacts?.charts === undefined) {
      console.log('No chart found');
    }

    await sandbox.delete();

    const chart = execution.artifacts?.charts?.[0] ?? undefined;
    const chartData = chart
      ? {
          type: chart.type,
          title: chart.title,
          elements: chart.elements,
          png: undefined,
        }
      : undefined;

    return {
      message: message.trim(),
      chart: chartData,
      currency_symbols: formattedCurrencySymbols,
      news_results: news_results,
    };
  },
});
