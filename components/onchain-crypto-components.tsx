'use client';

import React from 'react';
import { toast } from 'sonner';

// UI Components
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Icons
import { ArrowUpRight, ArrowDownRight, Copy, AlertTriangle } from 'lucide-react';

// Types
interface OnChainTokenPriceProps {
  result: any;
  network: string;
  addresses: string[];
}

// Utility functions
const formatPrice = (price: number | string): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice) || numPrice === 0) return '$0.00';

  if (numPrice < 0.000001) return `$${numPrice.toExponential(2)}`;
  if (numPrice < 0.01) return `$${numPrice.toFixed(6)}`;
  if (numPrice < 1) return `$${numPrice.toFixed(4)}`;
  if (numPrice < 100) return `$${numPrice.toFixed(2)}`;

  if (numPrice >= 1e9) return `$${(numPrice / 1e9).toFixed(2)}B`;
  if (numPrice >= 1e6) return `$${(numPrice / 1e6).toFixed(2)}M`;
  if (numPrice >= 1e3) return `$${(numPrice / 1e3).toFixed(2)}K`;

  return `$${numPrice.toFixed(2)}`;
};

const formatCompact = (num: number | string): string => {
  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value) || value === 0) return '$0';

  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;

  return `$${value.toFixed(0)}`;
};

// Main OnChain Token Price Component - Clean Card Design
export const OnChainTokenPrice: React.FC<OnChainTokenPriceProps> = ({ result, network }) => {
  if (!result.success) {
    return (
      <Card className="mb-4 p-4 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Error: {result.error || 'Failed to fetch token prices'}</span>
        </div>
      </Card>
    );
  }

  const { data } = result;

  // Sort by market cap descending
  const sortedData = [...data].sort((a, b) => (b.market_cap_usd || 0) - (a.market_cap_usd || 0));

  return (
    <div className="mb-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {network.toUpperCase()}
        </Badge>
        <span className="text-sm text-neutral-600 dark:text-neutral-400">{data.length} tokens</span>
      </div>

      {/* Token Cards */}
      <div className="space-y-2">
        {sortedData.map((token: any, index: number) => {
          const change24h = token.usd_24h_change || 0;
          const isPositive = change24h >= 0;

          return (
            <Card
              key={token.address || index}
              className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
            >
              {/* Main row: Address, Price, Change */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <code className="text-xs font-mono text-neutral-600 dark:text-neutral-400">
                    {`${token.address.slice(0, 6)}...${token.address.slice(-4)}`}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(token.address);
                      toast.success('Copied!');
                    }}
                    className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-lg font-mono font-semibold">{formatPrice(token.usd || 0)}</span>

                  {change24h !== 0 && (
                    <div
                      className={`flex items-center gap-1 ${
                        isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      <span className="font-medium">{Math.abs(change24h).toFixed(2)}%</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-2 gap-4 text-xs text-neutral-600 dark:text-neutral-400">
                <div className="space-y-1">
                  {token.market_cap_usd && (
                    <div>
                      MCap:{' '}
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {formatCompact(token.market_cap_usd)}
                      </span>
                    </div>
                  )}
                  {token.fdv_usd && (
                    <div>
                      FDV:{' '}
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {formatCompact(token.fdv_usd)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {token.volume_24h_usd && (
                    <div>
                      Vol:{' '}
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {formatCompact(token.volume_24h_usd)}
                      </span>
                    </div>
                  )}
                  {token.total_reserve_in_usd && (
                    <div>
                      Reserves:{' '}
                      <span className="font-medium text-neutral-900 dark:text-neutral-100">
                        {formatCompact(token.total_reserve_in_usd)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
