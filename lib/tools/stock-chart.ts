import { tool } from 'ai';
import { z } from 'zod';
import { Valyu } from 'valyu-js';
import { tavily } from '@tavily/core';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';
import { isUserProCached } from '@/lib/subscription';

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
  description: 'Get stock data and news for companies using natural language. Valyu will resolve company names to stock tickers automatically.',
  inputSchema: z.object({
    title: z.string().describe('The title of the chart.'),
    news_queries: z.array(z.string()).describe('The news queries to search for.'),
    icon: z.enum(['stock', 'date', 'calculation', 'default']).describe('The icon to display for the chart.'),
    companies: z.array(z.string()).describe('Company names (e.g., "Apple", "Microsoft", "Tesla") - Valyu will resolve these to appropriate stock tickers.'),
    currency_symbols: z
      .array(z.string())
      .optional()
      .describe(
        'The currency symbols for each stock/asset in the chart. Available symbols: ' +
          Object.keys(CURRENCY_SYMBOLS).join(', ') +
          '. Defaults to USD if not provided.',
      ),
    time_period: z
      .string()
      .describe('Natural language time period (e.g., "last 6 months", "past year", "2 weeks", "since January", "last quarter", "since IPO", "all time", "maximum available"). Defaults to "1 year".'),
    filing_types: z
      .array(z.enum(['10-K', '10-Q', '8-K']))
      .optional()
      .describe('SEC filing types to retrieve (10-K for annual reports, 10-Q for quarterly reports, 8-K for current reports). If not specified, SEC filings won\'t be fetched.'),
    sections: z
      .array(z.string())
      .optional()
      .describe('Specific sections to retrieve from SEC filings (e.g., "MD&A", "Risk Factors", "Business", "Financial Statements", "Controls and Procedures"). If not specified, returns full filings.'),
    include_statistics: z
      .boolean()
      .optional()
      .describe('Include comprehensive company statistics like P/E ratios, market cap, debt-to-equity, etc. Adds key financial metrics and ratios.'),
    include_balance_sheet: z
      .boolean()
      .optional()
      .describe('Include balance sheet data showing assets, liabilities, and shareholders equity. Available from 2020 onwards.'),
    include_income_statement: z
      .boolean()
      .optional()
      .describe('Include income statement data with revenue, expenses, and profitability metrics. Available from 2020 onwards.'),
    include_cash_flow: z
      .boolean()
      .optional()
      .describe('Include cash flow statement showing operating, investing, and financing activities. Available from 2020 onwards.'),
    include_dividends: z
      .boolean()
      .optional()
      .describe('Include historical dividend information and payment schedules.'),
    include_insider_transactions: z
      .boolean()
      .optional()
      .describe('Include recent insider trading activity and executive transactions.'),
    include_market_movers: z
      .boolean()
      .optional()
      .describe('Include today\'s biggest gainers, losers, and most active stocks in the market. Only use if user asks for it explicitly.'),
    financial_period: z
      .string()
      .optional()
      .describe('Time period for financial statements (e.g., "2020-2024", "last 3 years", "Q4 2023"). Defaults to latest available if not specified.'),
  }),
  execute: async ({
    title,
    icon,
    companies,
    currency_symbols,
    time_period = "1 year",
    news_queries,
    filing_types,
    sections,
    include_statistics,
    include_balance_sheet,
    include_income_statement,
    include_cash_flow,
    include_dividends,
    include_insider_transactions,
    include_market_movers,
    financial_period,
  }: {
    title: string;
    icon: string;
    companies: string[];
    currency_symbols?: string[];
    time_period?: string;
    news_queries: string[];
    filing_types?: Array<'10-K' | '10-Q' | '8-K'>;
    sections?: string[];
    include_statistics?: boolean;
    include_balance_sheet?: boolean;
    include_income_statement?: boolean;
    include_cash_flow?: boolean;
    include_dividends?: boolean;
    include_insider_transactions?: boolean;
    include_market_movers?: boolean;
    financial_period?: string;
  }) => {
    console.log('Title:', title);
    console.log('Icon:', icon);
    console.log('Companies:', companies);
    console.log('Currency symbols:', currency_symbols);
    console.log('Time period:', time_period);
    console.log('Filing types:', filing_types);
    console.log('Sections:', sections);
    console.log('News queries:', news_queries);
    console.log('Financial options:', {
      include_statistics,
      include_balance_sheet,
      include_income_statement,
      include_cash_flow,
      include_dividends,
      include_insider_transactions,
      include_market_movers,
      financial_period,
    });

    // Check if user is pro for premium features
    const isProUser = await isUserProCached();
    console.log('Pro user:', isProUser);
    
    // Override pro-only features if user is not pro
    const actualIncludeEarnings = isProUser; // Earnings always require pro
    const actualIncludeStatistics = isProUser && include_statistics;
    const actualIncludeBalanceSheet = isProUser && include_balance_sheet;
    const actualIncludeIncomeStatement = isProUser && include_income_statement;
    const actualIncludeCashFlow = isProUser && include_cash_flow;
    const actualIncludeDividends = isProUser && include_dividends;
    const actualIncludeInsiderTransactions = isProUser && include_insider_transactions;
    const actualIncludeMarketMovers = isProUser && include_market_movers;
    const actualFilingTypes = isProUser ? filing_types : undefined;

    // Initialize all API clients
    const tvly = tavily({ apiKey: serverEnv.TAVILY_API_KEY });
    const exa = new Exa(serverEnv.EXA_API_KEY);
    const valyu = new Valyu(serverEnv.VALYU_API_KEY);

    // Calculate if we expect a lot of data to be returned
    const hasMultipleDataSources = [
      actualIncludeStatistics,
      actualIncludeBalanceSheet,
      actualIncludeIncomeStatement,
      actualIncludeCashFlow,
      actualIncludeDividends,
      actualIncludeInsiderTransactions,
      actualIncludeMarketMovers
    ].filter(Boolean).length;

    const isLargeDataRequest = hasMultipleDataSources >= 3 || 
                              (actualFilingTypes && actualFilingTypes.length > 0 && hasMultipleDataSources >= 2) ||
                              companies.length > 2;

    // Use shorter response length for SEC filings when we expect large amounts of data
    const secResponseLength = isLargeDataRequest ? 'short' : 'max';

    // Build all API promises to run in parallel
    const allPromises: Promise<any>[] = [];
    const promiseMap = new Map<string, number>();
    let promiseIndex = 0;

    // 1. Tavily news search promises
    const tavilyPromises: { query: string; topic: string; index: number }[] = [];
    for (const query of news_queries) {
      tavilyPromises.push({ query, topic: 'finance', index: promiseIndex });
      allPromises.push(
        tvly.search(query, {
          topic: 'finance',
          days: 7,
          maxResults: 3,
          searchDepth: 'advanced',
        }).catch((err) => ({ results: [], error: err.message }))
      );
      promiseMap.set(`tavily-finance-${query}`, promiseIndex++);

      tavilyPromises.push({ query, topic: 'news', index: promiseIndex });
      allPromises.push(
        tvly.search(query, {
          topic: 'news',
          days: 7,
          maxResults: 3,
          searchDepth: 'advanced',
        }).catch((err) => ({ results: [], error: err.message }))
      );
      promiseMap.set(`tavily-news-${query}`, promiseIndex++);
    }

    // 2. Exa financial reports promises
    const exaPromises: { company: string; index: number }[] = [];
    companies.forEach((company) => {
      exaPromises.push({ company, index: promiseIndex });
      allPromises.push(
        exa.searchAndContents(`${company} financial report analysis`, {
            text: true,
            category: 'financial report',
            livecrawl: 'preferred',
            type: 'hybrid',
            numResults: 10,
            summary: {
              query: 'all important information relevent to the important for investors',
            },
        }).catch((error: any) => {
          console.error(`Exa search error for ${company}:`, error);
          return { results: [] };
        })
      );
      promiseMap.set(`exa-${company}`, promiseIndex++);
    });

    // 3. Valyu core data promises (stock prices and earnings)
    const stockQuery = `What are the stock prices for ${companies.join(' and ')} for time period ${time_period}?`;
    
    allPromises.push(
      valyu.search(stockQuery, {
        searchType: 'proprietary',
        isToolCall: true,
        includedSources: ['valyu/valyu-stocks-US'],
        maxPrice: 100
      }).catch((error) => {
        console.error('Error fetching Valyu stock data:', error);
        return null;
      })
    );
    promiseMap.set('valyu-stocks', promiseIndex++);

    // Only fetch earnings if user is pro
    if (actualIncludeEarnings) {
      const earningsQuery = `What are the earnings for ${companies.join(' and ')} for time period ${time_period}?`;
      allPromises.push(
        valyu.search(earningsQuery, {
          searchType: 'proprietary',
          isToolCall: true,
          includedSources: ['valyu/valyu-earnings-US'],
          maxPrice: 100
        }).catch((error) => {
          console.error('Error fetching Valyu earnings data:', error);
          return null;
        })
      );
      promiseMap.set('valyu-earnings', promiseIndex++);
    }

    // 4. SEC filings promises
    const secPromises: { company: string; filingType: string; index: number }[] = [];
    if (actualFilingTypes && actualFilingTypes.length > 0) {
      companies.forEach(company => {
        actualFilingTypes.forEach(filingType => {
          let secQuery = `Get the full ${filingType} filing for ${company} for the time period "${time_period}"`;
          if (sections && sections.length > 0) {
            secQuery = `${company} sec filing ${filingType} ${sections.join(' and ')} for the time period "${time_period}"`;
          }
          
          secPromises.push({ company, filingType, index: promiseIndex });
          allPromises.push(
            valyu.search(secQuery, {
              searchType: 'proprietary',
              isToolCall: true,
              includedSources: ['valyu/valyu-sec-filings'],
              responseLength: secResponseLength,
              maxPrice: 100
            }).catch((error) => {
              console.error(`Error fetching ${filingType} for ${company}:`, error);
              return null;
            })
          );
          promiseMap.set(`sec-${company}-${filingType}`, promiseIndex++);
        });
      });
    }

    // 5. Additional financial data promises
    const financialPromises: { type: string; company?: string; index: number }[] = [];

    // Company statistics
    if (actualIncludeStatistics) {
      companies.forEach(company => {
        financialPromises.push({ type: 'statistics', company, index: promiseIndex });
        allPromises.push(
          valyu.search(`${company} company statistics`, {
            searchType: 'proprietary',
            isToolCall: true,
            includedSources: ['valyu/valyu-statistics-US'],
            maxPrice: 100
          }).catch((error) => {
            console.error(`Error fetching statistics for ${company}:`, error);
            return null;
          })
        );
        promiseMap.set(`stats-${company}`, promiseIndex++);
      });
    }

    // Balance sheets
    if (actualIncludeBalanceSheet) {
      companies.forEach(company => {
        const buildFinancialQuery = (company: string, statement: string) => {
          if (financial_period) {
            return `${company} ${statement} ${financial_period}`;
          }
          return `${company} ${statement}`;
        };

        financialPromises.push({ type: 'balance', company, index: promiseIndex });
        allPromises.push(
          valyu.search(buildFinancialQuery(company, 'balance sheet'), {
            searchType: 'proprietary',
            isToolCall: true,
            includedSources: ['valyu/valyu-balance-sheet-US'],
            maxPrice: 100
          }).catch((error) => {
            console.error(`Error fetching balance sheet for ${company}:`, error);
            return null;
          })
        );
        promiseMap.set(`balance-${company}`, promiseIndex++);
      });
    }

    // Income statements
    if (actualIncludeIncomeStatement) {
      companies.forEach(company => {
        const buildFinancialQuery = (company: string, statement: string) => {
          if (financial_period) {
            return `${company} ${statement} ${financial_period}`;
          }
          return `${company} ${statement}`;
        };

        financialPromises.push({ type: 'income', company, index: promiseIndex });
        allPromises.push(
          valyu.search(buildFinancialQuery(company, 'income statement'), {
            searchType: 'proprietary',
            isToolCall: true,
            includedSources: ['valyu/valyu-income-statement-US'],
            maxPrice: 100
          }).catch((error) => {
            console.error(`Error fetching income statement for ${company}:`, error);
            return null;
          })
        );
        promiseMap.set(`income-${company}`, promiseIndex++);
      });
    }

    // Cash flows
    if (actualIncludeCashFlow) {
      companies.forEach(company => {
        const buildFinancialQuery = (company: string, statement: string) => {
          if (financial_period) {
            return `${company} ${statement} ${financial_period}`;
          }
          return `${company} ${statement}`;
        };

        financialPromises.push({ type: 'cash', company, index: promiseIndex });
        allPromises.push(
          valyu.search(buildFinancialQuery(company, 'cash flow'), {
            searchType: 'proprietary',
            isToolCall: true,
            includedSources: ['valyu/valyu-cash-flow-US'],
            maxPrice: 100
          }).catch((error) => {
            console.error(`Error fetching cash flow for ${company}:`, error);
            return null;
          })
        );
        promiseMap.set(`cash-${company}`, promiseIndex++);
      });
    }

    // Dividends
    if (actualIncludeDividends) {
      companies.forEach(company => {
        financialPromises.push({ type: 'dividends', company, index: promiseIndex });
        allPromises.push(
          valyu.search(`${company} dividends ${time_period}`, {
            searchType: 'proprietary',
            isToolCall: true,
            includedSources: ['valyu/valyu-dividends-US'],
            maxPrice: 100
          }).catch((error) => {
            console.error(`Error fetching dividends for ${company}:`, error);
            return null;
          })
        );
        promiseMap.set(`dividends-${company}`, promiseIndex++);
      });
    }

    // Insider transactions
    if (actualIncludeInsiderTransactions) {
      companies.forEach(company => {
        const timeHint = time_period && time_period.trim().length > 0 ? time_period : 'recent';
        financialPromises.push({ type: 'insider', company, index: promiseIndex });
        allPromises.push(
          valyu.search(`${company} insider transactions ${timeHint}`, {
            searchType: 'proprietary',
            isToolCall: true,
            includedSources: ['valyu/valyu-insider-transactions-US'],
            maxPrice: 100
          }).catch((error) => {
            console.error(`Error fetching insider transactions for ${company}:`, error);
            return null;
          })
        );
        promiseMap.set(`insider-${company}`, promiseIndex++);
      });
    }

    // Market movers
    if (actualIncludeMarketMovers) {
      financialPromises.push({ type: 'gainers', index: promiseIndex });
      allPromises.push(
        valyu.search('top market gainers today stocks', {
          searchType: 'proprietary',
          isToolCall: true,
          includedSources: ['valyu/valyu-market-movers-US'],
          maxPrice: 100
        }).catch((error) => {
          console.error('Error fetching market gainers:', error);
          return null;
        })
      );
      promiseMap.set('gainers', promiseIndex++);

      financialPromises.push({ type: 'losers', index: promiseIndex });
      allPromises.push(
        valyu.search('top market losers today stocks', {
          searchType: 'proprietary',
          isToolCall: true,
          includedSources: ['valyu/valyu-market-movers-US'],
          maxPrice: 100
        }).catch((error) => {
          console.error('Error fetching market losers:', error);
          return null;
        })
      );
      promiseMap.set('losers', promiseIndex++);

      financialPromises.push({ type: 'active', index: promiseIndex });
      allPromises.push(
        valyu.search('most active stocks today', {
          searchType: 'proprietary',
          isToolCall: true,
          includedSources: ['valyu/valyu-market-movers-US'],
          maxPrice: 100
        }).catch((error) => {
          console.error('Error fetching most active stocks:', error);
          return null;
        })
      );
      promiseMap.set('active', promiseIndex++);
    }

    // Execute all promises in parallel
    console.log(`Executing ${allPromises.length} API calls in parallel...`);
    const allResults = await Promise.all(allPromises);

    // Process results
    let news_results: NewsGroup[] = [];

    // Process Tavily results
    const urlSet = new Set();
    tavilyPromises.forEach(({ query, topic, index }) => {
      const result = allResults[index];
      if (!result.results) return;

      const processedResults = result.results
        .filter((item: any) => {
          if (urlSet.has(item.url)) return false;
          urlSet.add(item.url);
          return true;
        })
        .map((item: any) => ({
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

    // Process Exa results
      const exaUrlSet = new Set();
    exaPromises.forEach(({ company, index }) => {
      const result = allResults[index];
        if (!result.results || result.results.length === 0) return;

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
          query: company,
          }));

        if (processedResults.length > 0) {
        news_results.push({
          query: company,
            topic: 'financial',
            results: processedResults,
          });
        }
      });

    type ValyuOHLC = {
      datetime: string;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    };

    type ValyuEarning = {
      date: string;
      time: string;
      eps_estimate: number | null;
      eps_actual: number;
      difference: number | null;
      surprise_prc: number | null;
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

    type ValyuEarningsResult = {
      id?: string;
      title: string;
      url: string;
      content: ValyuEarning[];
      metadata?: {
        symbol?: string;
        name?: string;
        start_date?: string;
        end_date?: string;
        timestamp?: string;
        total_results?: number;
        exchange?: string;
      };
    };

    // Process Valyu stock and earnings results
    let valyuResults: ValyuResult[] = [];
    let valyuEarningsResults: ValyuEarningsResult[] = [];
    
    const stockResponse = allResults[promiseMap.get('valyu-stocks')!];

    console.log('Valyu stock response:', stockResponse);

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

    const isValyuEarningsArray = (value: unknown): value is ValyuEarning[] => {
      return (
        Array.isArray(value) &&
        value.every(
          (v) =>
            typeof v === 'object' &&
            v !== null &&
            'date' in (v as Record<string, unknown>) &&
            'eps_actual' in (v as Record<string, unknown>),
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

    const isValyuEarningsResult = (obj: unknown): obj is ValyuEarningsResult => {
      if (!obj || typeof obj !== 'object') return false;
      const r = obj as Record<string, unknown>;
      return (
        typeof r['title'] === 'string' &&
        typeof r['url'] === 'string' &&
        isValyuEarningsArray(r['content'])
      );
    };

    // Process stock data
    if (stockResponse && Array.isArray(stockResponse.results)) {
      valyuResults = (stockResponse.results as unknown[]).filter(isValyuResult) as ValyuResult[];
    }

    // Process earnings data (only if user is pro)
    const earningsResponse = actualIncludeEarnings ? allResults[promiseMap.get('valyu-earnings') || -1] : null;
    if (earningsResponse && Array.isArray(earningsResponse.results)) {
      valyuEarningsResults = (earningsResponse.results as unknown[]).filter(isValyuEarningsResult) as ValyuEarningsResult[];
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

    const getTickerFromEarningsResult = (r: ValyuEarningsResult): string | undefined => {
      if (r.metadata?.symbol) return r.metadata.symbol.toUpperCase();
      if (r.id) {
        const match = r.id.match(/valyu-earnings-US:([A-Z.]+)\s/);
        if (match && match[1]) return match[1].split('.')[0];
      }

      const titleMatch = r.title.match(/([A-Z.]+)\s+Earnings/i);
      if (titleMatch && titleMatch[1]) return titleMatch[1].toUpperCase().split('.')[0];
      return undefined;
    };

    // Create chart elements using resolved tickers from Valyu
    const elements = valyuResults.map((result) => {
      const resolvedTicker = getTickerFromResult(result);
      const companyName = result.metadata?.name || resolvedTicker || 'Unknown';
      const points: Array<[string, number]> = result.content
        .map((c) => [c.datetime, Number(c.close)] as [string, number])
        .filter(([, close]) => Number.isFinite(close));
      
      return {
        label: `${companyName} (${resolvedTicker})`,
        points,
        ticker: resolvedTicker,
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

    const outputCurrencyCodes = currency_symbols || elements.map(() => 'USD');

    // Process earnings data
    const earningsData = valyuEarningsResults.map((earningsResult) => {
      const resolvedTicker = getTickerFromEarningsResult(earningsResult);
      const companyName = earningsResult.metadata?.name || resolvedTicker || 'Unknown';

    return {
        ticker: resolvedTicker,
        companyName,
        earnings: earningsResult.content.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), // Sort by date desc
        metadata: earningsResult.metadata,
      };
    });

    // Fetch SEC filings from Valyu
    // Type definitions for all financial data
    type CompanyStatistics = {
      valuations_metrics: {
        market_capitalization: number;
        enterprise_value: number;
        trailing_pe: number;
        forward_pe: number;
        peg_ratio: number;
        price_to_sales_ttm: number;
        price_to_book_mrq: number;
        enterprise_to_revenue: number;
        enterprise_to_ebitda: number;
      };
      financials: {
        fiscal_year_ends: string;
        most_recent_quarter: string;
        gross_margin: number;
        profit_margin: number;
        operating_margin: number;
        return_on_assets_ttm: number;
        return_on_equity_ttm: number;
        income_statement: {
          revenue_ttm: number;
          revenue_per_share_ttm: number;
          quarterly_revenue_growth: number;
          gross_profit_ttm: number;
          ebitda: number;
          net_income_to_common_ttm: number;
          diluted_eps_ttm: number;
          quarterly_earnings_growth_yoy: number;
        };
        balance_sheet: {
          total_cash_mrq: number;
          total_cash_per_share_mrq: number;
          total_debt_mrq: number;
          total_debt_to_equity_mrq: number;
          current_ratio_mrq: number;
          book_value_per_share_mrq: number;
        };
        cash_flow: {
          operating_cash_flow_ttm: number;
          levered_free_cash_flow_ttm: number;
        };
      };
      stock_statistics: {
        shares_outstanding: number;
        float_shares: number;
        avg_10_volume: number;
        avg_90_volume: number;
        shares_short: number;
        short_ratio: number;
        short_percent_of_shares_outstanding: number;
        percent_held_by_insiders: number;
        percent_held_by_institutions: number;
      };
      stock_price_summary: {
        fifty_two_week_low: number;
        fifty_two_week_high: number;
        fifty_two_week_change: number;
        beta: number;
        day_50_ma: number;
        day_200_ma: number;
      };
      dividends_and_splits: {
        forward_annual_dividend_rate: number;
        forward_annual_dividend_yield: number;
        trailing_annual_dividend_rate: number;
        trailing_annual_dividend_yield: number;
        "5_year_average_dividend_yield": number;
        payout_ratio: number;
        dividend_frequency: string;
        dividend_date: string;
        ex_dividend_date: string;
        last_split_factor: string;
        last_split_date: string;
      };
    };

    type BalanceSheetItem = {
      fiscal_date: string;
      year: number;
      assets: {
        current_assets: {
          cash: number | null;
          cash_equivalents: number | null;
          cash_and_cash_equivalents: number;
          other_short_term_investments: number;
          accounts_receivable: number;
          other_receivables: number | null;
          inventory: number;
          prepaid_assets: number | null;
          restricted_cash: number | null;
          assets_held_for_sale: number | null;
          hedging_assets: number | null;
          other_current_assets: number;
          total_current_assets: number;
        };
        non_current_assets: {
          properties: number;
          land_and_improvements: number;
          machinery_furniture_equipment: number;
          construction_in_progress: number;
          leases: number | null;
          accumulated_depreciation: number;
          goodwill: number;
          investment_properties: number | null;
          financial_assets: number | null;
          intangible_assets: number;
          investments_and_advances: number;
          other_non_current_assets: number;
          total_non_current_assets: number;
        };
        total_assets: number;
      };
      liabilities: {
        current_liabilities: {
          accounts_payable: number;
          accrued_expenses: number | null;
          short_term_debt: number;
          deferred_revenue: number | null;
          tax_payable: number;
          pensions: number;
          other_current_liabilities: number;
          total_current_liabilities: number;
        };
        non_current_liabilities: {
          long_term_provisions: number | null;
          long_term_debt: number;
          provision_for_risks_and_charges: number;
          deferred_liabilities: number;
          derivative_product_liabilities: number;
          other_non_current_liabilities: number;
          total_non_current_liabilities: number;
        };
        total_liabilities: number;
      };
      shareholders_equity: {
        common_stock: number;
        retained_earnings: number;
        other_shareholders_equity: number;
        total_shareholders_equity: number;
        additional_paid_in_capital: number;
        treasury_stock: number;
        minority_interest: number;
      };
    };

    type IncomeStatementItem = {
      fiscal_date: string;
      quarter?: number;
      year: number;
      sales: number;
      cost_of_goods: number;
      gross_profit: number;
      operating_expense: {
        research_and_development: number;
        selling_general_and_administrative: number;
        other_operating_expenses: number | null;
      };
      operating_income: number;
      non_operating_interest: {
        income: number;
        expense: number;
      };
      other_income_expense: number;
      pretax_income: number;
      income_tax: number;
      net_income: number;
      eps_basic: number;
      eps_diluted: number;
      basic_shares_outstanding: number;
      diluted_shares_outstanding: number;
      ebit: number;
      ebitda: number;
      net_income_continuous_operations: number;
      minority_interests: number;
      preferred_stock_dividends: number | null;
    };

    type CashFlowItem = {
      fiscal_date: string;
      year: number;
      operating_activities: {
        net_income: number;
        depreciation: number;
        deferred_taxes: number;
        stock_based_compensation: number;
        other_non_cash_items: number;
        accounts_receivable: number;
        accounts_payable: number;
        other_assets_liabilities: number;
        operating_cash_flow: number;
      };
      investing_activities: {
        capital_expenditures: number;
        net_intangibles: number | null;
        net_acquisitions: number;
        purchase_of_investments: number;
        sale_of_investments: number;
        other_investing_activity: number | null;
        investing_cash_flow: number;
      };
      financing_activities: {
        long_term_debt_issuance: number;
        long_term_debt_payments: number;
        short_term_debt_issuance: number;
        common_stock_issuance: number | null;
        common_stock_repurchase: number;
        common_dividends: number;
        other_financing_charges: number;
        financing_cash_flow: number;
      };
      end_cash_position: number;
      income_tax_paid: number;
      interest_paid: number;
      free_cash_flow: number;
    };

    type DividendData = {
      ex_date: string;
      amount: number;
    };

    type InsiderTransaction = {
      full_name: string;
      position: string;
      date_reported: string;
      is_direct: boolean;
      shares: number;
      value: number;
      description: string;
    };

    type MarketMover = {
      symbol: string;
      name: string;
      exchange: string;
      mic_code: string;
      datetime: string;
      last: number;
      high: number;
      low: number;
      volume: number;
      change: number;
      percent_change: number;
    };

    type SECFiling = {
      id?: string;
      title: string;
      url: string;
      content: string;
      metadata?: {
        accession_number?: string;
        full_filing?: boolean;
        filing_date?: string; // YYYYMMDD format
        date?: string; // YYYY-MM-DD format (alternative field)
        document_type?: string;
        form_type?: string; // Alternative field name
        name?: string;
        ticker?: string;
        cik?: string;
        part?: string;
        item?: string;
        timestamp?: string;
      };
    };

    // Process SEC filings from parallel results  
    let secFilings: SECFiling[] = [];
    if (actualFilingTypes && actualFilingTypes.length > 0) {
      const rawFilings: any[] = [];
      
      secPromises.forEach(({ company, filingType, index }) => {
        const response = allResults[index];
        if (response && Array.isArray(response.results)) {
          const filings = response.results.map((result: any) => ({
            ...result,
            requestedCompany: company,
            requestedFilingType: filingType
          }));
          rawFilings.push(...filings);
        }
      });

      // Truncate SEC filing content if we have a lot of data to prevent token limit issues
      const maxFilingLength = isLargeDataRequest ? 15000 : 50000; // Shorter when lots of other data
      
      secFilings = rawFilings
        .filter(filing => filing && filing.content)
        .map(filing => ({
          id: filing.id,
          title: filing.title,
          url: filing.url,
          content: filing.content.length > maxFilingLength 
            ? filing.content.substring(0, maxFilingLength) + '\n\n[Content truncated due to length...]'
            : filing.content,
          metadata: filing.metadata,
          requestedCompany: filing.requestedCompany,
          requestedFilingType: filing.requestedFilingType
        }));

      console.log('SEC filings fetched:', secFilings.length);
      console.log('Using response length:', secResponseLength, '| Large data request:', isLargeDataRequest);
    }

    // Process additional financial data from parallel results
    let companyStatistics: Record<string, CompanyStatistics> = {};
    let balanceSheets: Record<string, BalanceSheetItem[]> = {};
    let incomeStatements: Record<string, IncomeStatementItem[]> = {};
    let cashFlows: Record<string, CashFlowItem[]> = {};
    let dividendsData: Record<string, DividendData[]> = {};
    let insiderTransactions: Record<string, InsiderTransaction[]> = {};
    let marketMovers: { gainers: MarketMover[]; losers: MarketMover[]; most_active: MarketMover[] } = {
      gainers: [],
      losers: [],
      most_active: []
    };

    // Process all financial data results
    financialPromises.forEach(({ type, company, index }) => {
      const response = allResults[index];
      if (!response || !response.results || !response.results[0]) return;

      const result = response.results[0];
      
      switch (type) {
        case 'statistics':
          if (company) {
            companyStatistics[company] = result.content as unknown as CompanyStatistics;
          }
          break;
        case 'balance':
          if (company) {
            balanceSheets[company] = result.content as unknown as BalanceSheetItem[];
          }
          break;
        case 'income':
          if (company) {
            incomeStatements[company] = result.content as unknown as IncomeStatementItem[];
          }
          break;
        case 'cash':
          if (company) {
            cashFlows[company] = result.content as unknown as CashFlowItem[];
          }
          break;
        case 'dividends':
          if (company) {
            dividendsData[company] = result.content as unknown as DividendData[];
          }
          break;
        case 'insider':
          if (company) {
            insiderTransactions[company] = result.content as unknown as InsiderTransaction[];
          }
          break;
        case 'gainers':
          marketMovers.gainers = (result.content as unknown as MarketMover[]).slice(0, 10);
          break;
        case 'losers':
          marketMovers.losers = (result.content as unknown as MarketMover[]).slice(0, 10);
          break;
        case 'active':
          marketMovers.most_active = (result.content as unknown as MarketMover[]).slice(0, 10);
          break;
      }
    });

    return {
      message: `Fetched historical prices and earnings from Valyu for ${elements.length} companies over ${time_period}${sections && sections.length > 0 ? `, including SEC filing sections: ${sections.join(', ')}` : ''}`,
      chart: chartData,
      currency_symbols: outputCurrencyCodes,
      news_results: news_results,
      resolved_companies: elements.map(el => ({
        name: el.label,
        ticker: el.ticker,
      })),
      earnings_data: earningsData,
      sec_filings: secFilings,
      company_statistics: companyStatistics,
      balance_sheets: balanceSheets,
      income_statements: incomeStatements,
      cash_flows: cashFlows,
      dividends_data: dividendsData,
      insider_transactions: insiderTransactions,
      market_movers: include_market_movers ? marketMovers : undefined,
    };
  },
});
