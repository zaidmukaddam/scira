import { tool } from 'ai';
import { z } from 'zod';

const isASXStock = (symbol: string): boolean => {
  const u = symbol.toUpperCase();
  return u.endsWith('.AX') || u.endsWith('.ASX') || u.includes(':ASX') || u.startsWith('ASX:');
};

const formatSymbolForDisplay = (symbol: string): string => {
  const u = symbol.toUpperCase();
  if (u.includes(':ASX')) return u.replace(':ASX', '.AX');
  if (u.startsWith('ASX:')) return u.replace('ASX:', '') + '.AX';
  if (u.endsWith('.ASX')) return u.replace('.ASX', '.AX');
  return u;
};

const getMarketStatus = (isASX: boolean): { isOpen: boolean; message: string } => {
  const now = new Date();
  if (isASX) {
    const t = new Date(now.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }));
    const d = t.getDay(), time = t.getHours() * 100 + t.getMinutes();
    if (d === 0 || d === 6) return { isOpen: false, message: 'ASX is closed (weekend)' };
    if (time >= 1000 && time < 1600) return { isOpen: true, message: 'ASX is open' };
    return { isOpen: false, message: 'ASX is closed' };
  }
  const t = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const d = t.getDay(), time = t.getHours() * 100 + t.getMinutes();
  if (d === 0 || d === 6) return { isOpen: false, message: 'US markets closed (weekend)' };
  if (time >= 930 && time < 1600) return { isOpen: true, message: 'US markets open' };
  return { isOpen: false, message: 'US markets closed' };
};

interface YahooQuote {
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
  regularMarketVolume: number;
  marketCap: number;
  shortName: string;
  longName: string;
  fullExchangeName: string;
  currency: string;
}

async function fetchYahooQuote(symbol: string): Promise<YahooQuote | null> {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketDayHigh,regularMarketDayLow,regularMarketOpen,regularMarketPreviousClose,regularMarketVolume,marketCap,shortName,longName,fullExchangeName,currency`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const quote = data?.quoteResponse?.result?.[0];
  return quote ?? null;
}

// Fallback: scrape from Yahoo Finance chart API (more reliable, no auth needed)
async function fetchYahooChart(symbol: string): Promise<YahooQuote | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) return null;

  return {
    regularMarketPrice: meta.regularMarketPrice,
    regularMarketChange: meta.regularMarketPrice - meta.chartPreviousClose,
    regularMarketChangePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
    regularMarketDayHigh: meta.regularMarketDayHigh ?? 0,
    regularMarketDayLow: meta.regularMarketDayLow ?? 0,
    regularMarketOpen: meta.regularMarketOpen ?? 0,
    regularMarketPreviousClose: meta.chartPreviousClose ?? meta.previousClose ?? 0,
    regularMarketVolume: meta.regularMarketVolume ?? 0,
    marketCap: 0,
    shortName: meta.shortName ?? symbol,
    longName: meta.longName ?? meta.shortName ?? symbol,
    fullExchangeName: meta.fullExchangeName ?? meta.exchangeName ?? '',
    currency: meta.currency ?? 'USD',
  };
}

export const stockPriceTool = tool({
  description: 'Get the current (real-time) stock price for any publicly listed company. Use this for ANY question about share prices, stock value, market price, or ticker symbols — including US stocks (NYSE, NASDAQ) and Australian ASX-listed stocks (e.g. CBA, BHP, NAB, WBC). Always prefer this tool over any search or archive tool when the user asks about a stock price or the value of shares.',
  inputSchema: z.object({
    symbol: z.string().describe('Stock symbol (e.g., AAPL, NVDA, CBA.AX)'),
    preferredExchange: z.string().nullish().describe('Preferred exchange: "ASX" or "NYSE"'),
  }),
  execute: async ({ symbol, preferredExchange }: { symbol: string; preferredExchange?: string | null }) => {
    const start = Date.now();
    const displaySymbol = formatSymbolForDisplay(symbol);
    const isASX = isASXStock(symbol) || preferredExchange?.toUpperCase() === 'ASX';
    const marketStatus = getMarketStatus(isASX);

    try {
      // Direct Yahoo Finance API — no web search, no LLM extraction
      let quote = await fetchYahooQuote(displaySymbol);
      if (!quote) {
        quote = await fetchYahooChart(displaySymbol);
      }

      if (!quote || !quote.regularMarketPrice) {
        return { success: false, error: `Could not fetch quote for ${displaySymbol}`, symbol: displaySymbol };
      }

      const currency = quote.currency || (isASX ? 'AUD' : 'USD');
      const cs = currency === 'AUD' ? 'A$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
      const price = quote.regularMarketPrice;
      const change = quote.regularMarketChange;
      const changePct = quote.regularMarketChangePercent;

      console.log(`⚡ Stock price fetched in ${Date.now() - start}ms: ${displaySymbol} = ${cs}${price.toFixed(2)}`);

      return {
        success: true,
        symbol: displaySymbol,
        original_symbol: symbol,
        name: quote.longName || quote.shortName,
        last_price: price,
        currency,
        exchange: quote.fullExchangeName || (isASX ? 'ASX' : 'US'),
        last_update: new Date().toISOString().split('T')[0],
        change: Math.round(change * 100) / 100,
        change_percent: Math.round(changePct * 100) / 100,
        open: quote.regularMarketOpen || null,
        high: quote.regularMarketDayHigh || null,
        low: quote.regularMarketDayLow || null,
        previous_close: quote.regularMarketPreviousClose || null,
        volume: quote.regularMarketVolume || null,
        market_cap: quote.marketCap || null,
        market_status: marketStatus,
        formatted_price: `${cs}${price.toFixed(2)}`,
        price_movement: `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)`,
        day_range:
          quote.regularMarketDayLow && quote.regularMarketDayHigh
            ? `${cs}${quote.regularMarketDayLow.toFixed(2)} - ${cs}${quote.regularMarketDayHigh.toFixed(2)}`
            : null,
        summary:
          `**${quote.longName || quote.shortName}** (${displaySymbol})\n` +
          `Current Price: ${cs}${price.toFixed(2)} ${currency}\n` +
          `Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%)\n` +
          (quote.regularMarketDayLow && quote.regularMarketDayHigh
            ? `Day Range: ${cs}${quote.regularMarketDayLow.toFixed(2)} - ${cs}${quote.regularMarketDayHigh.toFixed(2)}\n`
            : '') +
          (quote.regularMarketOpen ? `Open: ${cs}${quote.regularMarketOpen.toFixed(2)}\n` : '') +
          (quote.regularMarketPreviousClose ? `Previous Close: ${cs}${quote.regularMarketPreviousClose.toFixed(2)}\n` : '') +
          (quote.regularMarketVolume ? `Volume: ${quote.regularMarketVolume.toLocaleString()}\n` : '') +
          (quote.marketCap ? `Market Cap: ${cs}${(quote.marketCap / 1e9).toFixed(2)}B\n` : '') +
          `\nMarket Status: ${marketStatus.message}`,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error getting stock price:', errorMessage);
      return { success: false, error: `Failed to retrieve stock price: ${errorMessage}`, symbol: displaySymbol };
    }
  },
});
