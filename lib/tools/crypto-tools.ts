import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

export const coinDataTool = tool({
  description: 'Get comprehensive coin data including metadata and market data by coin ID.',
  parameters: z.object({
    coinId: z.string().describe('The coin ID (e.g., bitcoin, ethereum, solana)'),
    localization: z.boolean().nullable().describe('Include all localized languages in response (default: true)'),
    tickers: z.boolean().nullable().describe('Include tickers data (default: true)'),
    marketData: z.boolean().nullable().describe('Include market data (default: true)'),
    communityData: z.boolean().nullable().describe('Include community data (default: true)'),
    developerData: z.boolean().nullable().describe('Include developer data (default: true)'),
  }),
  execute: async ({
    coinId,
    localization,
    tickers,
    marketData,
    communityData,
    developerData,
  }: {
    coinId: string;
    localization?: boolean | null;
    tickers?: boolean | null;
    marketData?: boolean | null;
    communityData?: boolean | null;
    developerData?: boolean | null;
  }) => {
    console.log('Fetching coin data for:', coinId);

    try {
      const params = new URLSearchParams({
        localization: localization?.toString() || 'true',
        tickers: tickers?.toString() || 'true',
        market_data: marketData?.toString() || 'true',
        community_data: communityData?.toString() || 'true',
        developer_data: developerData?.toString() || 'true',
        sparkline: 'false',
      });

      const url = `https://api.coingecko.com/api/v3/coins/${coinId}?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'x-cg-demo-api-key': serverEnv.COINGECKO_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        coinId,
        data: data,
        source: 'CoinGecko API',
        url: `https://www.coingecko.com/en/coins/${coinId}`,
      };
    } catch (error) {
      console.error('Coin data error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        coinId,
      };
    }
  },
});

export const coinDataByContractTool = tool({
  description: 'Get coin data by token contract address on a specific platform.',
  parameters: z.object({
    platformId: z.string().describe('The platform ID (e.g., ethereum, binance-smart-chain, polygon-pos)'),
    contractAddress: z.string().describe('The contract address of the token'),
    localization: z.boolean().nullable().describe('Include all localized languages in response (default: true)'),
    tickers: z.boolean().nullable().describe('Include tickers data (default: true)'),
    marketData: z.boolean().nullable().describe('Include market data (default: true)'),
    communityData: z.boolean().nullable().describe('Include community data (default: true)'),
    developerData: z.boolean().nullable().describe('Include developer data (default: true)'),
  }),
  execute: async ({
    platformId,
    contractAddress,
    localization,
    tickers,
    marketData,
    communityData,
    developerData,
  }: {
    platformId: string;
    contractAddress: string;
    localization?: boolean | null;
    tickers?: boolean | null;
    marketData?: boolean | null;
    communityData?: boolean | null;
    developerData?: boolean | null;
  }) => {
    console.log('Fetching coin data for contract:', contractAddress, 'on', platformId);

    try {
      const params = new URLSearchParams({
        localization: localization?.toString() || 'true',
        tickers: tickers?.toString() || 'true',
        market_data: marketData?.toString() || 'true',
        community_data: communityData?.toString() || 'true',
        developer_data: developerData?.toString() || 'true',
        sparkline: 'false',
      });

      const url = `https://api.coingecko.com/api/v3/coins/${platformId}/contract/${contractAddress}?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'x-cg-demo-api-key': serverEnv.COINGECKO_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        contractAddress,
        platformId,
        data: data,
        source: 'CoinGecko API',
        url: data.links?.homepage?.[0] || `https://www.coingecko.com`,
      };
    } catch (error) {
      console.error('Contract coin data error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        contractAddress,
        platformId,
      };
    }
  },
});

export const coinOhlcTool = tool({
  description: 'Get coin OHLC (Open, High, Low, Close) data for candlestick charts with comprehensive coin data.',
  parameters: z.object({
    coinId: z.string().describe('The coin ID (e.g., bitcoin, ethereum, solana)'),
    vsCurrency: z.string().nullable().describe('The target currency of market data (usd, eur, jpy, etc.)'),
    days: z.number().nullable().describe('Data up to number of days ago (1/7/14/30/90/180/365/max)'),
  }),
  execute: async ({
    coinId,
    vsCurrency = 'usd',
    days = 1,
  }: {
    coinId: string;
    vsCurrency?: string | null;
    days?: number | null;
  }) => {
    console.log('Coin OHLC with Data - Coin ID:', coinId);
    console.log('VS Currency:', vsCurrency);
    console.log('Days:', days);

    try {
      const [ohlcResponse, coinDataResponse] = await Promise.all([
        fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=${vsCurrency}&days=${days}`, {
          headers: {
            'Accept': 'application/json',
            'x-cg-demo-api-key': serverEnv.COINGECKO_API_KEY,
          },
        }),
        fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=true&sparkline=false`, {
          headers: {
            'Accept': 'application/json',
            'x-cg-demo-api-key': serverEnv.COINGECKO_API_KEY,
          },
        })
      ]);

      if (!ohlcResponse.ok) {
        throw new Error(`CoinGecko OHLC API error: ${ohlcResponse.status} ${ohlcResponse.statusText}`);
      }

      if (!coinDataResponse.ok) {
        throw new Error(`CoinGecko Coin Data API error: ${coinDataResponse.status} ${coinDataResponse.statusText}`);
      }

      const [ohlcData, coinData] = await Promise.all([
        ohlcResponse.json(),
        coinDataResponse.json()
      ]);

      const formattedOhlcData = ohlcData.map(([timestamp, open, high, low, close]: [number, number, number, number, number]) => ({
        timestamp,
        date: new Date(timestamp).toISOString(),
        open: open,
        high: high,
        low: low,
        close: close,
      }));

      return {
        success: true,
        coinId,
        vsCurrency,
        days,
        chart: {
          title: `${coinData.name || coinId.charAt(0).toUpperCase() + coinId.slice(1)} OHLC Chart`,
          type: 'candlestick',
          data: formattedOhlcData,
          elements: formattedOhlcData,
          x_scale: 'datetime',
          y_scale: 'linear',
        },
        coinData: coinData,
        source: 'CoinGecko API',
        url: `https://www.coingecko.com/en/coins/${coinId}`,
      };
    } catch (error) {
      console.error('Coin OHLC with Data error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        coinId,
      };
    }
  },
}); 