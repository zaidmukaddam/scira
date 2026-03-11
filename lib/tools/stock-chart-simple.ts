import { tool, generateText } from 'ai';
import { z } from 'zod';
import { jsonrepair } from 'jsonrepair';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';
import { scx } from '@/ai/providers';

const companyToSymbol: Record<string, string> = {
  'commonwealth bank': 'CBA.AX', 'commonwealth bank of australia': 'CBA.AX', cba: 'CBA.AX',
  westpac: 'WBC.AX', 'westpac banking': 'WBC.AX',
  'national australia bank': 'NAB.AX', nab: 'NAB.AX',
  anz: 'ANZ.AX', 'anz bank': 'ANZ.AX',
  bhp: 'BHP.AX', 'bhp group': 'BHP.AX',
  'rio tinto': 'RIO.AX', rio: 'RIO.AX',
  csl: 'CSL.AX', 'csl limited': 'CSL.AX',
  woolworths: 'WOW.AX', wesfarmers: 'WES.AX', telstra: 'TLS.AX',
  macquarie: 'MQG.AX', fortescue: 'FMG.AX', xero: 'XRO.AX',
  apple: 'AAPL', microsoft: 'MSFT', google: 'GOOGL', alphabet: 'GOOGL',
  amazon: 'AMZN', meta: 'META', facebook: 'META', tesla: 'TSLA',
  nvidia: 'NVDA', netflix: 'NFLX',
};

function resolveSymbol(input: string): string {
  const lower = input.toLowerCase().trim();
  if (companyToSymbol[lower]) return companyToSymbol[lower];
  if (input.toUpperCase() === input && input.length <= 6) return input.toUpperCase();
  for (const [name, symbol] of Object.entries(companyToSymbol)) {
    if (lower.includes(name) || name.includes(lower)) return symbol;
  }
  return input.toUpperCase();
}

const historicalDataSchema = z.object({
  dataPoints: z.array(z.object({
    date: z.string(),
    price: z.number(),
  })),
  companyName: z.string(),
  currency: z.string(),
  currentPrice: z.number(),
  periodHigh: z.number().nullish(),
  periodLow: z.number().nullish(),
  periodChange: z.number().nullish(),
  periodChangePercent: z.number().nullish(),
});

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const braced = text.match(/\{[\s\S]*\}/);
  if (braced) return braced[0];
  return text;
}

export const stockChartSimpleTool = tool({
  description:
    'Create a stock price chart showing historical performance. Accepts company names or symbols. For ASX stocks, use .AX suffix (e.g., CBA.AX) or company name (e.g., "Commonwealth Bank").',
  inputSchema: z.object({
    title: z.string().describe('Chart title'),
    companies: z.array(z.string()).describe('Company names or stock symbols. Max 4.'),
    time_period: z.string().default('6 months').describe('Time period: "1 month", "3 months", "6 months", "1 year"'),
    preferASX: z.boolean().nullish().describe('Prefer ASX for ambiguous stocks'),
  }),
  execute: async ({
    title, companies, time_period = '6 months',
  }: {
    title: string; companies: string[]; time_period?: string; preferASX?: boolean | null;
  }) => {
    console.log('Creating stock chart:', { title, companies, time_period });

    if (!serverEnv.EXA_API_KEY) {
      return { success: false, error: 'Exa API key not configured', chart: null };
    }

    const exa = new Exa(serverEnv.EXA_API_KEY);
    const limitedCompanies = companies.slice(0, 4);

    const elements: Array<{ label: string; points: Array<[string, number]>; ticker: string }> = [];
    const resolvedCompanies: Array<{ name: string; ticker: string }> = [];
    const currencySymbols: string[] = [];
    const companyStatistics: Record<string, { stock_price_summary: Record<string, number> }> = {};
    const errors: string[] = [];

    for (const company of limitedCompanies) {
      try {
        const symbol = resolveSymbol(company);
        const isASX = symbol.endsWith('.AX');
        const displaySymbol = symbol;

        const searchQuery = isASX
          ? `${symbol.replace('.AX', '')} ASX stock price history chart ${time_period}`
          : `${symbol} stock price history chart ${time_period}`;

        const searchResult = await exa.searchAndContents(searchQuery, {
          text: true, livecrawl: 'always', type: 'auto', numResults: 3,
          includeDomains: [
            'finance.yahoo.com', 'google.com/finance', 'marketwatch.com',
            'asx.com.au', 'tradingview.com', 'investing.com',
          ],
        });

        if (!searchResult.results || searchResult.results.length === 0) {
          errors.push(`${company}: No data found`);
          continue;
        }

        const combinedContent = searchResult.results
          .map((r) => `Source: ${r.url}\n${r.text || ''}`)
          .join('\n\n---\n\n')
          .slice(0, 6000);

        const { text } = await generateText({
          model: scx.languageModel('llama-4'),
          maxOutputTokens: 2000,
          prompt: `Extract historical stock price data for ${displaySymbol} over ${time_period}. Output ONLY JSON, no markdown.
Include 10-20 date/price data points. Currency: ${isASX ? 'AUD' : 'USD'}.

{"dataPoints":[{"date":"YYYY-MM-DD","price":0}],"companyName":"str","currency":"str","currentPrice":0,"periodHigh":null,"periodLow":null,"periodChange":null,"periodChangePercent":null}

Text:
${combinedContent}`,
        });

        const rawJSON = extractJSON(text);
        const repaired = jsonrepair(rawJSON);
        const parsed = JSON.parse(repaired);
        const data = historicalDataSchema.parse(parsed);

        if (data.dataPoints.length === 0) {
          errors.push(`${company}: Could not extract price data`);
          continue;
        }

        elements.push({
          label: `${data.companyName} (${displaySymbol})`,
          points: data.dataPoints.map((d) => [d.date, d.price] as [string, number]),
          ticker: displaySymbol,
        });

        resolvedCompanies.push({ name: data.companyName, ticker: displaySymbol });
        currencySymbols.push(data.currency);

        companyStatistics[displaySymbol] = {
          stock_price_summary: {
            current_price: data.currentPrice ?? 0,
            period_high: data.periodHigh ?? 0,
            period_low: data.periodLow ?? 0,
            period_change: data.periodChange ?? 0,
            period_change_percent: data.periodChangePercent ?? 0,
          },
        };

        console.log(`Got ${data.dataPoints.length} data points for ${displaySymbol}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error fetching ${company}:`, msg);
        errors.push(`${company}: ${msg}`);
      }
    }

    if (elements.length === 0) {
      return { success: false, error: `Failed to create chart: ${errors.join('; ')}`, chart: null };
    }

    return {
      success: true,
      message: `Chart created for ${elements.length} stock${elements.length > 1 ? 's' : ''} over ${time_period}`,
      chart: { type: 'line', title, x_label: 'Date', y_label: 'Price', x_scale: 'datetime', elements },
      currency_symbols: currencySymbols,
      resolved_companies: resolvedCompanies,
      company_statistics: companyStatistics,
      earnings_data: [], news_results: [], sec_filings: [],
      balance_sheets: {}, income_statements: {}, cash_flows: {},
      dividends_data: {}, insider_transactions: {},
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});
