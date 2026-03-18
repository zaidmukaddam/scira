import { tool, rerank } from 'ai';
import { z } from 'zod';
import { UIMessageStreamWriter } from 'ai';
import { ChatMessage } from '@/lib/types';
import { serverEnv } from '@/env/server';
import { Valyu } from 'valyu-js';
import { cohere } from '@ai-sdk/cohere';

// Type definitions for Valyu API responses
interface PolymarketOutcome {
  outcome: string;
  price: number;
  probability_pct: number;
}

interface PolymarketMarket {
  market_id: string;
  title: string;
  outcomes: PolymarketOutcome[];
  volume: number;
  volume_24h: number;
  liquidity: number;
  end_date: string;
  active: boolean;
  closed: boolean;
}

interface PolymarketContent {
  event_id: string;
  event_title: string;
  event_description: string;
  category: string | null;
  start_date: string;
  end_date: string;
  total_volume: number;
  total_liquidity: number;
  markets: PolymarketMarket[];
  url: string;
}

interface KalshiOutcome {
  outcome: string;
  price: number;
  probability_pct: number;
  bid?: number;
  ask?: number;
}

interface KalshiMarket {
  ticker: string;
  title: string;
  outcomes: KalshiOutcome[];
  volume: number;
  volume_24h: number;
  open_interest: number;
  close_time: string;
  expiration_time: string;
  status: string;
  result: string;
}

interface KalshiContent {
  event_ticker: string;
  event_title: string;
  event_subtitle: string;
  category: string;
  status: string | null;
  strike_date: string | null;
  mutually_exclusive: boolean;
  total_volume: number;
  total_open_interest: number;
  markets: KalshiMarket[];
  url: string;
}

interface ValyuResult {
  id: string;
  title: string;
  url: string;
  content: PolymarketContent | KalshiContent;
  source: string;
  price: number;
  length: number;
  image_url: string | null;
  data_type: string;
  source_type: string;
  metadata: {
    query: string;
    event_id?: string;
    event_ticker?: string;
    total_volume: number;
    total_liquidity?: number;
    total_open_interest?: number;
    market_count: number;
    source: string;
  };
  relevance_score: number;
}

interface ValyuSearchResponse {
  success: boolean;
  error: string;
  tx_id: string;
  query: string;
  results: ValyuResult[];
  results_by_source: {
    web: number;
    proprietary: number;
  };
  total_deduction_pcm: number;
  total_deduction_dollars: number;
  total_characters: number;
}

export interface PredictionMarket {
  id: string;
  title: string;
  description: string;
  url: string;
  source: 'Polymarket' | 'Kalshi';
  category: string | null;
  totalVolume: number;
  totalLiquidity?: number;
  totalOpenInterest?: number;
  endDate: string | null;
  markets: Array<{
    id: string;
    title: string;
    outcomes: Array<{
      name: string;
      probability: number;
      price: number;
    }>;
    volume: number;
    volume24h: number;
    liquidity?: number;
    openInterest?: number;
    endDate: string;
    active: boolean;
    closed: boolean;
  }>;
  relevanceScore: number;
}

function parsePolymarketResult(result: ValyuResult): PredictionMarket {
  const content = result.content as PolymarketContent;
  return {
    id: result.id,
    title: content.event_title,
    description: content.event_description || '',
    url: result.url,
    source: 'Polymarket',
    category: content.category,
    totalVolume: content.total_volume,
    totalLiquidity: content.total_liquidity,
    endDate: content.end_date,
    markets: content.markets.map((market) => ({
      id: market.market_id,
      title: market.title,
      outcomes: market.outcomes.map((o) => ({
        name: o.outcome,
        probability: o.probability_pct,
        price: o.price,
      })),
      volume: market.volume,
      volume24h: market.volume_24h,
      liquidity: market.liquidity,
      endDate: market.end_date,
      active: market.active,
      closed: market.closed,
    })),
    relevanceScore: result.relevance_score,
  };
}

function parseKalshiResult(result: ValyuResult): PredictionMarket {
  const content = result.content as KalshiContent;
  return {
    id: result.id,
    title: content.event_title,
    description: content.event_subtitle || '',
    url: result.url,
    source: 'Kalshi',
    category: content.category,
    totalVolume: content.total_volume,
    totalOpenInterest: content.total_open_interest,
    endDate: content.strike_date,
    markets: content.markets.map((market) => ({
      id: market.ticker,
      title: market.title,
      outcomes: market.outcomes.map((o) => ({
        name: o.outcome,
        probability: o.probability_pct,
        price: o.price,
      })),
      volume: market.volume,
      volume24h: market.volume_24h,
      openInterest: market.open_interest,
      endDate: market.close_time,
      active: market.status === 'active',
      closed: market.result !== '',
    })),
    relevanceScore: result.relevance_score,
  };
}

export function predictionSearchTool(dataStream?: UIMessageStreamWriter<ChatMessage>) {
  return tool({
    description:
      'Search prediction markets from Polymarket and Kalshi to find forecasts, betting odds, and market predictions on various topics including politics, sports, crypto, entertainment, and more.',
    inputSchema: z.object({
      query: z
        .string()
        .max(500)
        .describe('The search query to find relevant prediction markets. Be specific about what you want to predict.'),
      maxResults: z
        .number()
        .min(1)
        .max(30)
        .optional()
        .default(15)
        .describe('Maximum number of results to return. Default is 15.'),
    }),
    execute: async ({
      query,
      maxResults = 15,
    }: {
      query: string;
      maxResults?: number;
    }) => {
      console.log('Prediction market search query:', query);
      console.log('Max results:', maxResults);

      const valyu = new Valyu(serverEnv.VALYU_API_KEY);

      // Always search both Polymarket and Kalshi
      const includedSources = ['valyu/valyu-polymarket', 'valyu/valyu-kalshi'];

      try {
        // Send start notification
        dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index: 0,
            total: 1,
            status: 'started',
            resultsCount: 0,
            imagesCount: 0,
          },
        });

        const response = (await valyu.search(query, {
          maxNumResults: maxResults,
          searchType: 'proprietary',
          isToolCall: false,
          includedSources,
        })) as unknown as ValyuSearchResponse;

        if (!response.success) {
          console.error('Valyu API error:', response.error);
          dataStream?.write({
            type: 'data-query_completion',
            data: {
              query,
              index: 0,
              total: 1,
              status: 'error',
              resultsCount: 0,
              imagesCount: 0,
            },
          });
          return {
            query,
            results: [] as PredictionMarket[],
            error: response.error || 'Failed to search prediction markets',
          };
        }

        // Parse results based on source
        const markets: PredictionMarket[] = response.results.map((result) => {
          if (result.source === 'valyu/valyu-polymarket') {
            return parsePolymarketResult(result);
          } else {
            return parseKalshiResult(result);
          }
        });

        // Filter out markets with no active markets (empty market arrays)
        const filteredMarkets = markets.filter(
          (market) => market.markets.length > 0 || market.description.length > 0,
        );

        // Rerank results using Cohere for better relevance
        let activeMarkets = filteredMarkets;
        if (filteredMarkets.length > 1) {
          try {
            const { ranking } = await rerank({
              model: cohere.reranking('rerank-v4.0-fast'),
              query,
              documents: filteredMarkets.map((m) => `${m.title}. ${m.description}`),
              topN: Math.min(filteredMarkets.length, maxResults),
            });

            activeMarkets = ranking.map((r) => ({
              ...filteredMarkets[r.originalIndex],
              relevanceScore: r.score,
            }));
          } catch (rerankError) {
            console.error('Rerank error, using original order:', rerankError);
            // Fall back to original order if reranking fails
          }
        }

        // Send completion notification
        dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index: 0,
            total: 1,
            status: 'completed',
            resultsCount: activeMarkets.length,
            imagesCount: 0,
          },
        });

        // Stream the prediction market results to the UI
        dataStream?.write({
          type: 'data-prediction_results',
          data: {
            query,
            markets: activeMarkets,
            totalResults: response.results.length,
            sources: response.results_by_source,
          },
        });

        return {
          query,
          results: activeMarkets,
          totalResults: response.results.length,
          sources: response.results_by_source,
        };
      } catch (error) {
        console.error('Prediction market search error:', error);

        dataStream?.write({
          type: 'data-query_completion',
          data: {
            query,
            index: 0,
            total: 1,
            status: 'error',
            resultsCount: 0,
            imagesCount: 0,
          },
        });

        return {
          query,
          results: [] as PredictionMarket[],
          error: error instanceof Error ? error.message : 'An error occurred while searching prediction markets',
        };
      }
    },
  });
}
