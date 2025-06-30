/* eslint-disable @next/next/no-img-element */
'use client';

import React, { memo, useState } from 'react';
import Link from 'next/link';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';

// Chart components
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';

// Icons
import { DollarSign, Activity, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react';

interface CryptoTickersProps {
  result: any;
  coinId: string;
}

interface CryptoChartProps {
  result: any;
  coinId: string;
  chartType?: 'line' | 'candlestick';
}

interface CandlestickData {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  openClose: [number, number];
}

interface CandlestickProps {
  x: number;
  y: number;
  width: number;
  height: number;
  low: number;
  high: number;
  openClose: [number, number];
}

// Format price with appropriate decimal places and handle edge cases
const formatPrice = (price: number | null | undefined, currency: string = 'USD') => {
  if (price === null || price === undefined || isNaN(price)) {
    return 'N/A';
  }

  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: price < 1 ? 6 : 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    });
    return formatter.format(price);
  } catch (error) {
    // Fallback if currency is invalid
    return `$${price.toFixed(price < 1 ? 6 : 2)}`;
  }
};

// Format volume with better edge case handling
const formatVolume = (volume: number | null | undefined) => {
  if (volume === null || volume === undefined || isNaN(volume) || volume < 0) {
    return 'N/A';
  }

  if (volume >= 1e12) return `${(volume / 1e12).toFixed(1)}T`;
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume.toFixed(0);
};

// Format market cap in compact form with edge cases
const formatMarketCap = (value: number | null | undefined) => {
  if (value === null || value === undefined || isNaN(value) || value < 0) {
    return 'N/A';
  }

  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
};

// Format percentage change with better validation
const formatPercentage = (percent: number | null | undefined) => {
  if (percent === null || percent === undefined || isNaN(percent)) {
    return { text: 'N/A', isPositive: false };
  }

  const isPositive = percent >= 0;
  return {
    text: `${isPositive ? '+' : ''}${percent.toFixed(2)}%`,
    isPositive,
  };
};

// Safe image component with fallback
const SafeImage = ({
  src,
  alt,
  className,
  fallback,
}: {
  src?: string | null;
  alt: string;
  className: string;
  fallback?: React.ReactNode;
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      fallback || (
        <div className={`${className} bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center`}>
          <DollarSign className="h-3 w-3 text-neutral-400" />
        </div>
      )
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setHasError(true)} loading="lazy" />;
};

// Candlestick component
const Candlestick = (props: CandlestickProps) => {
  const {
    x,
    y,
    width,
    height,
    low,
    high,
    openClose: [open, close],
  } = props;
  
  const isGrowing = open < close;
  const ratio = Math.abs(height / (close - open)) || 1;

  return (
    <g>
      <path
        className={`${isGrowing ? 'fill-emerald-500' : 'fill-rose-500'}`}
        d={`
            M ${x},${y}
            L ${x},${y + height}
            L ${x + width},${y + height}
            L ${x + width},${y}
            L ${x},${y}
          `}
      />
      <g className={`${isGrowing ? 'stroke-emerald-500' : 'stroke-rose-500'}`} strokeWidth="1">
        {/* bottom line */}
        {isGrowing ? (
          <path
            d={`
                M ${x + width / 2}, ${y + height}
                v ${(open - low) * ratio}
              `}
          />
        ) : (
          <path
            d={`
                M ${x + width / 2}, ${y}
                v ${(close - low) * ratio}
              `}
          />
        )}
        {/* top line */}
        {isGrowing ? (
          <path
            d={`
                M ${x + width / 2}, ${y}
                v ${(close - high) * ratio}
              `}
          />
        ) : (
          <path
            d={`
                M ${x + width / 2}, ${y + height}
                v ${(open - high) * ratio}
              `}
          />
        )}
      </g>
    </g>
  );
};

// Render candlestick for Bar chart
const renderCandlestick = (props: any) => {
  const { x, y, width, height, payload } = props;

  if (payload && payload.low !== undefined && payload.high !== undefined && payload.openClose) {
    return (
      <Candlestick
        x={x}
        y={y}
        width={width}
        height={height}
        low={payload.low}
        high={payload.high}
        openClose={payload.openClose}
      />
    );
  }

  // Fallback: if payload structure is different, try to extract values directly
  if (payload && typeof payload === 'object') {
    const open = payload.open || 0;
    const high = payload.high || 0;
    const low = payload.low || 0;
    const close = payload.close || 0;
    
    if (high > 0 && low > 0) {
      return (
        <Candlestick
          x={x}
          y={y}
          width={width}
          height={height}
          low={low}
          high={high}
          openClose={[open, close]}
        />
      );
    }
  }

  return (
    <Candlestick x={x || 0} y={y || 0} width={width || 0} height={height || 0} low={0} high={0} openClose={[0, 0]} />
  );
};

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload as CandlestickData | undefined;

    if (data && data.openClose) {
      // Candlestick tooltip
      return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 shadow-sm max-w-[200px] z-50">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 truncate">
            {new Date(data.date).toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500 dark:text-neutral-400 flex-shrink-0">Open:</span>
              <span className="text-neutral-900 dark:text-neutral-100 font-medium truncate">
                {formatPrice(data.openClose[0])}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500 dark:text-neutral-400 flex-shrink-0">High:</span>
              <span className="text-neutral-900 dark:text-neutral-100 font-medium truncate">
                {formatPrice(data.high)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500 dark:text-neutral-400 flex-shrink-0">Low:</span>
              <span className="text-neutral-900 dark:text-neutral-100 font-medium truncate">
                {formatPrice(data.low)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500 dark:text-neutral-400 flex-shrink-0">Close:</span>
              <span className="text-neutral-900 dark:text-neutral-100 font-medium truncate">
                {formatPrice(data.openClose[1])}
              </span>
            </div>
          </div>
        </div>
      );
    } else {
      // Regular price tooltip
      return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 shadow-sm max-w-[150px] z-50">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {new Date(label).toLocaleDateString()}
          </p>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {formatPrice(payload[0].value)}
          </p>
        </div>
      );
    }
  }
  return null;
};

const CryptoTickers: React.FC<CryptoTickersProps> = memo(({ result, coinId }) => {
  // Enhanced error handling
  if (!result) {
    return (
      <Card className="w-full my-4 border-neutral-200/60 dark:border-neutral-800/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">No ticker data available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result.success) {
    return (
      <Card className="w-full my-4 border-red-200/60 dark:border-red-800/60 bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm font-medium">Error fetching ticker data</span>
          </div>
          <p className="text-xs text-red-500 dark:text-red-300 mt-1">{result.error || 'Unknown error occurred'}</p>
        </CardContent>
      </Card>
    );
  }

  // Validate required data
  const { name, symbol, tickers = [], url } = result;

  if (!Array.isArray(tickers) || tickers.length === 0) {
    return (
      <Card className="w-full my-4 border-neutral-200/60 dark:border-neutral-800/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">No ticker data available for {name || coinId}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topTickers = tickers.slice(0, 6); // Show top 6 tickers for cleaner design

  return (
    <Card className="w-full my-4 shadow-none border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-950">
      <CardHeader className="pb-4 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-6 w-6 rounded-md bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-3.5 w-3.5 text-neutral-600 dark:text-neutral-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {name || 'Unknown'}{' '}
                {symbol && (
                  <span className="text-neutral-500 dark:text-neutral-400 font-normal">({symbol.toUpperCase()})</span>
                )}
              </h3>
            </div>
          </div>
          {url && (
            <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs flex-shrink-0">
              <Link href={url} target="_blank" rel="noopener noreferrer">
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-6 pb-4">
        <div className="space-y-2">
          {topTickers
            .map((ticker: any, index: number) => {
              // Validate ticker data
              if (!ticker || typeof ticker !== 'object') {
                return null;
              }

              const volume24h = ticker.converted_volume?.usd || ticker.volume || 0;
              const price = ticker.converted_last?.usd || ticker.last || 0;
              const marketName = ticker.market?.name || ticker.exchange || 'Unknown';
              const base = ticker.base || 'N/A';
              const target = ticker.target || 'N/A';

              return (
                <div
                  key={`${ticker.market?.identifier || index}-${base}-${target}`}
                  className="flex items-center justify-between py-2 group"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                      {marketName}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">
                      {base}/{target}
                    </span>
                    {ticker.trust_score === 'green' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 dark:bg-green-400 flex-shrink-0" />
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
                      {formatPrice(price)}
                    </div>
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400 tabular-nums">
                      Vol: {formatVolume(volume24h)}
                    </div>
                  </div>
                </div>
              );
            })
            .filter(Boolean)}
        </div>

        {tickers.length > 6 && (
          <div className="mt-3 text-center">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Showing 6 of {tickers.length} tickers
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

const CryptoChart: React.FC<CryptoChartProps> = memo(({ result, coinId, chartType = 'line' }) => {
  // Enhanced error handling
  if (!result) {
    return (
      <Card className="w-full my-4 border-neutral-200/60 dark:border-neutral-800/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">No chart data available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result.success) {
    return (
      <Card className="w-full my-4 border-red-200/60 dark:border-red-800/60 bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">Error fetching chart data</span>
          </div>
          <p className="text-xs text-red-500 dark:text-red-300 mt-1">{result.error || 'Unknown error occurred'}</p>
        </CardContent>
      </Card>
    );
  }

  // Validate chart data structure
  const { chart, vsCurrency = 'usd', url } = result;

  if (!chart || (!chart.elements && !chart.data)) {
    return (
      <Card className="w-full my-4 border-neutral-200/60 dark:border-neutral-800/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <Activity className="h-4 w-4" />
            <span className="text-sm">No chart data available for {coinId}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = chart.elements || chart.data || [];

  // Validate chartData is an array
  if (!Array.isArray(chartData) || chartData.length === 0) {
    return (
      <Card className="w-full my-4 border-neutral-200/60 dark:border-neutral-800/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <Activity className="h-4 w-4" />
            <span className="text-sm">Chart contains no data points</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Safe date parsing function
  const parseDate = (dateInput: any): Date => {
    if (!dateInput) return new Date();

    // If it's already a Date object
    if (dateInput instanceof Date) return dateInput;

    // If it's a timestamp (number)
    if (typeof dateInput === 'number') {
      // Handle both milliseconds and seconds timestamps
      const timestamp = dateInput > 1e10 ? dateInput : dateInput * 1000;
      return new Date(timestamp);
    }

    // If it's a string, try to parse it
    if (typeof dateInput === 'string') {
      const parsed = new Date(dateInput);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    return new Date();
  };

  // Safe price extraction
  const extractPrice = (item: any): number => {
    if (typeof item === 'number') return item;
    return item?.price || item?.close || item?.value || 0;
  };

  // Prepare data based on chart type with enhanced validation
  let formattedData: any[] = [];
  let firstPrice = 0;
  let lastPrice = 0;
  let minValue = 0;
  let maxValue = 0;

  try {
    if (chartType === 'candlestick') {
      // Check if we have OHLC data or need to generate it from price data
      const hasOHLCData = chartData.some((item) => 
        item && typeof item === 'object' && 
        ('open' in item || 'high' in item || 'low' in item || 'close' in item)
      );

      if (hasOHLCData) {
        // OHLC data processing with validation
        formattedData = chartData
          .filter((item) => item && typeof item === 'object')
          .map((item: any) => {
            const date = parseDate(item.timestamp || item.date);
            const open = typeof item.open === 'number' ? item.open : 0;
            const high = typeof item.high === 'number' ? item.high : 0;
            const low = typeof item.low === 'number' ? item.low : 0;
            const close = typeof item.close === 'number' ? item.close : 0;

            return {
              ...item,
              date: date.toISOString(),
              open,
              high,
              low,
              close,
              openClose: [open, close],
              displayDate: date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              }),
              fullDate: date.toLocaleDateString(),
            };
          })
          .filter((item) => item.open > 0 || item.high > 0 || item.low > 0 || item.close > 0);
      } else {
        // Generate pseudo-OHLC data from price data
        const validPriceData = chartData.filter((item) => {
          const price = extractPrice(item);
          return price > 0 && !isNaN(price);
        });

        // Group data by day for candlestick generation
        const groupedByDay = new Map<string, any[]>();
        
        validPriceData.forEach((item) => {
          const date = parseDate(item.timestamp || item.date);
          const dayKey = date.toISOString().split('T')[0];
          
          if (!groupedByDay.has(dayKey)) {
            groupedByDay.set(dayKey, []);
          }
          groupedByDay.get(dayKey)!.push({
            ...item,
            price: extractPrice(item),
            timestamp: date.getTime()
          });
        });

        // Create candlesticks from grouped data
        formattedData = Array.from(groupedByDay.entries()).map(([dayKey, dayData]) => {
          // Sort by timestamp
          dayData.sort((a, b) => a.timestamp - b.timestamp);
          
          const prices = dayData.map(d => d.price);
          const open = prices[0];
          const close = prices[prices.length - 1];
          const high = Math.max(...prices);
          const low = Math.min(...prices);
          const date = new Date(dayKey);

          return {
            date: date.toISOString(),
            timestamp: date.getTime(),
            open,
            high,
            low,
            close,
            openClose: [open, close],
            displayDate: date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
            fullDate: date.toLocaleDateString(),
          };
        }).sort((a, b) => a.timestamp - b.timestamp);
      }

      if (formattedData.length > 0) {
        firstPrice = formattedData[0]?.open || 0;
        lastPrice = formattedData[formattedData.length - 1]?.close || 0;

        // Calculate min/max for candlestick data safely
        const allValues = formattedData
          .flatMap((item) => [item.low || 0, item.open || 0, item.close || 0, item.high || 0])
          .filter((val) => val > 0);

        minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
        maxValue = allValues.length > 0 ? Math.max(...allValues) : 0;
      }
    } else {
      // Regular price data processing with validation
      const validData = chartData.filter((item) => {
        const price = extractPrice(item);
        return price > 0 && !isNaN(price);
      });

      const step = Math.max(1, Math.floor(validData.length / 24));
      formattedData = validData
        .filter((_: any, index: number) => index % step === 0)
        .map((item: any) => {
          const date = parseDate(item.timestamp || item.date);
          const price = extractPrice(item);

          return {
            date: date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
            fullDate: date.toLocaleDateString(),
            price: price,
            formattedPrice: formatPrice(price, vsCurrency),
          };
        });

      if (validData.length > 0) {
        firstPrice = extractPrice(validData[0]);
        lastPrice = extractPrice(validData[validData.length - 1]);

        const prices = validData.map(extractPrice).filter((p) => p > 0);
        minValue = prices.length > 0 ? Math.min(...prices) : 0;
        maxValue = prices.length > 0 ? Math.max(...prices) : 0;
      }
    }

    // Final validation - ensure we have valid data
    if (formattedData.length === 0 || maxValue <= 0) {
      return (
        <Card className="w-full my-4 border-neutral-200/60 dark:border-neutral-800/60">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
              <Activity className="h-4 w-4" />
              <span className="text-sm">Unable to process chart data</span>
            </div>
          </CardContent>
        </Card>
      );
    }
  } catch (error) {
    console.error('Error processing chart data:', error);
    return (
      <Card className="w-full my-4 border-red-200/60 dark:border-red-800/60 bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">Error processing chart data</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const priceChange = lastPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
  const change = formatPercentage(priceChangePercent);

  // Compact formatter for Y-axis to prevent overflow
  const formatCompactPrice = (value: number) => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';

    // For very small values (like some altcoins)
    if (value < 0.00001) {
      return value.toExponential(2);
    }

    // For values less than 1, show appropriate decimals
    if (value < 1) {
      return value.toFixed(4);
    }

    // For larger values, use compact notation
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;

    return `$${value.toFixed(2)}`;
  };

  // Safe date formatting for candlestick charts
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;

      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear().toString().slice(2);
      return `${month} '${year}`;
    } catch {
      return dateStr;
    }
  };

  const customTickFormatter = (value: string, index: number) => {
    if (chartType !== 'candlestick') return value;

    try {
      // Show every few ticks to avoid overcrowding
      const interval = Math.max(1, Math.floor(formattedData.length / 6));
      if (index % interval === 0 || index === 0 || index === formattedData.length - 1) {
        return formatDate(value);
      }
      return '';
    } catch {
      return value;
    }
  };

  const mostRecentData = formattedData[formattedData.length - 1];
  const mostRecentClose = chartType === 'candlestick' ? mostRecentData?.openClose?.[1] : mostRecentData?.price;

  // Extract essential coin data when available
  const coinData = result.coinData;
  const displayName = coinData?.name || chart.title || `${coinId} Chart`;
  const symbol = coinData?.symbol?.toUpperCase();
  const marketData = coinData?.market_data;
  const description = coinData?.description?.en;

  return (
    <Card className="w-full my-4 shadow-none border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-950">
      <CardHeader className="pb-2 px-4 sm:px-6">
        {/* Essential Coin Info Section */}
        {coinData && (
          <div className="pb-4 border-b border-neutral-100 dark:border-neutral-800 mb-4">
            <div className="flex items-start gap-3">
              {/* Coin Icon */}
              {coinData.image?.small && (
                <SafeImage 
                  src={coinData.image.small} 
                  alt={displayName}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
              )}
              
              <div className="flex-1 min-w-0">
                {/* Name and Symbol */}
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                    {displayName}
                  </h2>
                  {symbol && (
                    <span className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                      {symbol}
                    </span>
                  )}
                  {url && (
                    <Button variant="ghost" size="sm" asChild className="h-6 px-2 flex-shrink-0">
                      <Link href={url} target="_blank" rel="noopener noreferrer">
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </div>

                {/* Essential Market Metrics */}
                {marketData && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {marketData.market_cap?.usd && (
                      <div>
                        <div className="text-neutral-500 dark:text-neutral-400">Market Cap</div>
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                          {formatMarketCap(marketData.market_cap.usd)}
                        </div>
                      </div>
                    )}
                    {marketData.total_volume?.usd && (
                      <div>
                        <div className="text-neutral-500 dark:text-neutral-400">24h Volume</div>
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                          {formatVolume(marketData.total_volume.usd)}
                        </div>
                      </div>
                    )}
                    {marketData.circulating_supply && (
                      <div>
                        <div className="text-neutral-500 dark:text-neutral-400">Circulating</div>
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                          {formatVolume(marketData.circulating_supply)} {symbol}
                        </div>
                      </div>
                    )}
                    {marketData.market_cap_rank && (
                      <div>
                        <div className="text-neutral-500 dark:text-neutral-400">Rank</div>
                        <div className="font-medium text-neutral-900 dark:text-neutral-100">
                          #{marketData.market_cap_rank}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Brief Description */}
                {description && (
                  <div className="mt-3">
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                      {description.split('.')[0]}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chart Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {coinData ? 'OHLC Chart' : (chart.title || `${coinId} Chart`)}
              </h3>
              {!coinData && url && (
                <Button variant="ghost" size="sm" asChild className="h-6 px-2 flex-shrink-0">
                  <Link href={url} target="_blank" rel="noopener noreferrer">
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
            <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
              <span className="text-lg sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100 tabular-nums break-all">
                {formatPrice(lastPrice, vsCurrency)}
              </span>
              <div
                className={`flex items-center gap-1 text-xs sm:text-sm tabular-nums ${
                  change.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {change.isPositive ? (
                  <ArrowUpRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                )}
                <span>{change.text}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:px-6 overflow-hidden">
        <ChartContainer config={{}} className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={formattedData}
              margin={{ top: 20, right: 5, left: 5, bottom: 10 }}
              maxBarSize={chartType === 'candlestick' ? 20 : undefined}
            >
              <CartesianGrid vertical={false} strokeWidth={1} />
              <XAxis
                dataKey={chartType === 'candlestick' ? 'date' : 'date'}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value, index) => {
                  // More aggressive truncation for mobile
                  if (chartType === 'candlestick') {
                    return customTickFormatter(value, index);
                  }
                  // For regular charts, show abbreviated dates
                  const interval = Math.max(1, Math.floor(formattedData.length / 4));
                  if (index % interval === 0 || index === 0 || index === formattedData.length - 1) {
                    return value.split(' ')[0]; // Just show month
                  }
                  return '';
                }}
                interval={0}
                minTickGap={30}
                tickMargin={8}
                angle={0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                stroke="hsl(var(--border))"
                strokeWidth={0.5}
                axisLine={false}
                tickLine={false}
                domain={[Math.max(0, minValue - (maxValue - minValue) * 0.1), maxValue + (maxValue - minValue) * 0.1]}
                tickCount={5}
                orientation="right"
                tickFormatter={formatCompactPrice}
                width={55}
              />

              {/* Reference line for most recent close value */}
              {mostRecentClose && mostRecentClose > 0 && (
                <ReferenceLine
                  y={mostRecentClose}
                  stroke="var(--muted-foreground)"
                  opacity={0.5}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
              )}

              <Tooltip content={<CustomTooltip />} />

              {chartType === 'candlestick' ? (
                <Bar dataKey="openClose" shape={renderCandlestick}>
                  {formattedData.map(({ date }: any, index: number) => (
                    <Cell key={`cell-${date}-${index}`} />
                  ))}
                </Bar>
              ) : (
                <Bar dataKey="price" fill="#f97316" radius={[2, 2, 0, 0]} opacity={0.8} />
              )}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-neutral-500 dark:text-neutral-400 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            {chart.data?.market_caps && Array.isArray(chart.data.market_caps) && chart.data.market_caps.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="flex-shrink-0">MCap:</span>
                <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[80px] sm:max-w-none">
                  {formatMarketCap(chart.data.market_caps[chart.data.market_caps.length - 1]?.[1])}
                </span>
              </div>
            )}
            {chart.data?.total_volumes &&
              Array.isArray(chart.data.total_volumes) &&
              chart.data.total_volumes.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="flex-shrink-0">Vol:</span>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[80px] sm:max-w-none">
                    {formatVolume(chart.data.total_volumes[chart.data.total_volumes.length - 1]?.[1])}
                  </span>
                </div>
              )}
          </div>
          <div className="flex items-center gap-2 text-[11px] sm:text-xs">
            <span className="tabular-nums">H: {formatCompactPrice(maxValue).replace('$', '')}</span>
            <span className="text-neutral-400">•</span>
            <span className="tabular-nums">L: {formatCompactPrice(minValue).replace('$', '')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

CryptoTickers.displayName = 'CryptoTickers';
CryptoChart.displayName = 'CryptoChart';

export { CryptoTickers, CryptoChart };
