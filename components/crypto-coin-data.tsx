/* eslint-disable @next/next/no-img-element */
'use client';

import React, { memo, useState } from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ExternalLink, ArrowUpRight, ArrowDownRight, Activity, AlertCircle, DollarSign } from 'lucide-react';

interface CoinDataProps {
  result: any;
  coinId?: string;
  contractAddress?: string;
}

const formatPrice = (price: number | null | undefined, currency: string = 'usd') => {
  if (price === null || price === undefined || isNaN(price)) {
    return 'N/A';
  }

  try {
    // For extremely high prices, use exponential notation
    if (price >= 1e9) {
      return `$${price.toExponential(2)}`;
    }

    // For very small prices, limit decimals
    if (price < 0.00001) {
      return `$${price.toExponential(2)}`;
    }

    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: price < 1 ? 6 : 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    });
    return formatter.format(price);
  } catch (error) {
    return `$${price.toFixed(price < 1 ? 6 : 2)}`;
  }
};

const formatCompactNumber = (num: number | null | undefined) => {
  if (num === null || num === undefined || isNaN(num) || num < 0) {
    return 'N/A';
  }

  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
};

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

const formatSupply = (supply: number | null | undefined, symbol?: string) => {
  if (supply === null || supply === undefined || isNaN(supply)) {
    return 'N/A';
  }

  const formatted = supply.toLocaleString();
  return symbol ? `${formatted} ${symbol.toUpperCase()}` : formatted;
};

// Safe image component with fallback
const SafeCoinImage = ({
  src,
  alt,
  className,
  size = 'small',
}: {
  src?: string | null;
  alt: string;
  className: string;
  size?: 'small' | 'large';
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className={`${className} bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center`}>
        <DollarSign className={`${size === 'small' ? 'h-4 w-4' : 'h-6 w-6'} text-neutral-400`} />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setHasError(true)} loading="lazy" />;
};

// Safe link component
const SafeLink = ({
  href,
  children,
  className,
}: {
  href?: string | null;
  children: React.ReactNode;
  className?: string;
}) => {
  if (!href || !href.startsWith('http')) {
    return null;
  }

  return (
    <a href={href} target="_blank" className={className}>
      {children}
    </a>
  );
};

const CoinData: React.FC<CoinDataProps> = memo(({ result, coinId, contractAddress }) => {
  // Enhanced error handling
  if (!result) {
    return (
      <Card className="w-full my-4 border-neutral-200 dark:border-neutral-800 shadow-none bg-white dark:bg-neutral-950">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">No coin data available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result.success) {
    return (
      <Card className="w-full my-4 border-red-200 dark:border-red-800 shadow-none bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">Error fetching coin data</span>
          </div>
          <p className="text-xs text-red-500 dark:text-red-300 mt-1">{result.error || 'Unknown error occurred'}</p>
        </CardContent>
      </Card>
    );
  }

  // Validate data structure
  const { data, url } = result;

  if (!data || typeof data !== 'object') {
    return (
      <Card className="w-full my-4 border-neutral-200 dark:border-neutral-800 shadow-none bg-white dark:bg-neutral-950">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <Activity className="h-4 w-4" />
            <span className="text-sm">Invalid coin data format</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Safe data extraction with fallbacks
  const marketData = data.market_data || {};
  const currentPrice = marketData.current_price?.usd ?? null;
  const priceChange24h = marketData.price_change_percentage_24h ?? null;
  const priceChange7d = marketData.price_change_percentage_7d ?? null;
  const priceChange30d = marketData.price_change_percentage_30d ?? null;
  const marketCap = marketData.market_cap?.usd ?? null;
  const volume24h = marketData.total_volume?.usd ?? null;
  const ath = marketData.ath?.usd ?? null;
  const athChange = marketData.ath_change_percentage?.usd ?? null;
  const circulatingSupply = marketData.circulating_supply ?? null;
  const maxSupply = marketData.max_supply ?? null;

  const priceChange = formatPercentage(priceChange24h);
  const coinName = data.name || 'Unknown';
  const coinSymbol = data.symbol || '';
  const marketCapRank = data.market_cap_rank || null;

  // Safely extract description
  const description = data.description?.en || '';
  const cleanDescription = description.replace(/<[^>]*>/g, '').trim();

  // Safely extract links
  const homepage = data.links?.homepage?.[0];

  return (
    <Card className="w-full my-4 border-neutral-200 dark:border-neutral-800 shadow-none bg-white dark:bg-neutral-950">
      <CardHeader className="pb-0 pt-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <SafeCoinImage src={data.image?.small} alt={coinName} className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <SafeLink href={url} className="no-underline group">
                  <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors flex items-center gap-1">
                    {coinName}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                </SafeLink>
                {coinSymbol && (
                  <span className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md font-medium tracking-wide">
                    {coinSymbol.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
          {marketCapRank && (
            <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded font-normal flex-shrink-0">
              Rank #{marketCapRank}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 pb-3 px-4">
        {/* Price Section */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
            <span className="text-xl sm:text-2xl font-medium text-neutral-900 dark:text-neutral-100 tabular-nums break-all max-w-full">
              {formatPrice(currentPrice)}
            </span>
            {priceChange.text !== 'N/A' && (
              <div
                className={`flex items-center gap-0.5 text-xs sm:text-sm ${
                  priceChange.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {priceChange.isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
                <span className="font-medium">{priceChange.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Compact Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3 overflow-hidden">
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-2 min-w-0">
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">Market Cap</p>
            <p className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {formatCompactNumber(marketCap)}
            </p>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-2 min-w-0">
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">24h Volume</p>
            <p className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {formatCompactNumber(volume24h)}
            </p>
          </div>

          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-2 min-w-0">
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">ATH</p>
            <p className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
              {formatPrice(ath)}
            </p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {priceChange24h !== null && (
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 dark:text-neutral-400">24h</span>
                <span
                  className={`font-medium ${
                    (priceChange24h ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatPercentage(priceChange24h).text}
                </span>
              </div>
            )}

            {priceChange7d !== null && (
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 dark:text-neutral-400">7d</span>
                <span
                  className={`font-medium ${
                    (priceChange7d ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatPercentage(priceChange7d).text}
                </span>
              </div>
            )}

            {priceChange30d !== null && (
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 dark:text-neutral-400">30d</span>
                <span
                  className={`font-medium ${
                    (priceChange30d ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatPercentage(priceChange30d).text}
                </span>
              </div>
            )}

            {athChange !== null && (
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 dark:text-neutral-400">From ATH</span>
                <span
                  className={`font-medium ${
                    (athChange ?? 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatPercentage(athChange).text}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Supply Information */}
        {(circulatingSupply !== null || maxSupply !== null) && (
          <div className="space-y-1.5 mb-3">
            {circulatingSupply !== null && (
              <div className="flex justify-between text-xs gap-2">
                <span className="text-neutral-500 dark:text-neutral-400 flex-shrink-0">Circulating Supply</span>
                <span className="text-neutral-900 dark:text-neutral-100 font-medium text-right truncate max-w-[60%]">
                  {formatSupply(circulatingSupply, coinSymbol)}
                </span>
              </div>
            )}

            {maxSupply !== null && (
              <div className="flex justify-between text-xs gap-2">
                <span className="text-neutral-500 dark:text-neutral-400 flex-shrink-0">Max Supply</span>
                <span className="text-neutral-900 dark:text-neutral-100 font-medium text-right truncate max-w-[60%]">
                  {formatSupply(maxSupply, coinSymbol)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {cleanDescription && (
          <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-3 break-words">
            {cleanDescription.length > 200 ? `${cleanDescription.slice(0, 200)}...` : cleanDescription}
          </p>
        )}
      </CardContent>
    </Card>
  );
});

CoinData.displayName = 'CoinData';

export { CoinData };
