// /components/prediction-search.tsx
'use client';

import React, { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { CustomUIDataTypes } from '@/lib/types';
import type { DataUIPart } from 'ai';
import Image from 'next/image';

// Custom Icons
const Icons = {
  TrendUp: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 17l6-6 4 4 8-8M14 7h7v7" />
    </svg>
  ),
  Calendar: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  DollarSign: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Check: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  ArrowUpRight: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 17L17 7M17 7H7M17 7v10" />
    </svg>
  ),
  ExternalLink: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  Activity: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
};

// Source logos
const SourceLogo: React.FC<{ source: 'Polymarket' | 'Kalshi'; className?: string }> = ({ source, className }) => {
  if (source === 'Polymarket') {
    return (
      <div className={cn('flex items-center justify-center rounded-full overflow-hidden', className)}>
        <Image
          src="/polymarket-logo.png"
          alt="Polymarket"
          width={20}
          height={20}
          className="object-contain"
        />
      </div>
    );
  }
  return (
    <div className={cn('flex items-center justify-center rounded-full overflow-hidden', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/kalshi-logo.svg"
        alt="Kalshi"
        width={20}
        height={20}
        className="object-contain"
      />
    </div>
  );
};

type PredictionMarket = {
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
};

type PredictionSearchResponse = {
  query: string;
  results: PredictionMarket[];
  totalResults?: number;
  sources?: {
    web: number;
    proprietary: number;
  };
  error?: string;
};

type PredictionSearchArgs = {
  query?: string;
  maxResults?: number;
};

// Helper functions
const formatVolume = (volume: number): string => {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`;
  } else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(1)}K`;
  }
  return `$${volume.toFixed(0)}`;
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Probability Bar Component
const ProbabilityBar: React.FC<{
  outcomes: Array<{ name: string; probability: number; price: number }>;
}> = ({ outcomes }) => {
  const sortedOutcomes = [...outcomes].sort((a, b) => b.probability - a.probability);
  const leadingOutcome = sortedOutcomes[0];
  const secondOutcome = sortedOutcomes[1];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              leadingOutcome?.probability >= 50 ? 'bg-primary' : 'bg-muted-foreground/50',
            )}
            style={{ width: `${leadingOutcome?.probability || 0}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span className={cn(leadingOutcome?.probability >= 50 ? 'text-primary font-medium' : '')}>
          {leadingOutcome?.name}: {leadingOutcome?.probability.toFixed(0)}%
        </span>
        {secondOutcome && (
          <span className={cn(secondOutcome?.probability >= 50 ? 'text-primary font-medium' : '')}>
            {secondOutcome?.name}: {secondOutcome?.probability.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
};

// Market Card Component
const MarketCard: React.FC<{
  market: PredictionMarket;
  onClick?: () => void;
}> = ({ market, onClick }) => {
  const primaryMarket = market.markets[0];
  const sourceColors =
    market.source === 'Polymarket'
      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
      : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400';

  return (
    <div
      className={cn(
        'group relative',
        'border-b border-border',
        'py-3 px-4 transition-all duration-150',
        'hover:bg-accent/50',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      <div className="space-y-2.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            <SourceLogo source={market.source} className="w-5 h-5 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-[13px] text-foreground line-clamp-2 leading-tight">{market.title}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={cn('px-1.5 py-0.5 rounded-sm text-[10px] font-medium', sourceColors)}>
                  {market.source}
                </span>
                {market.category && (
                  <span className="text-[10px] text-muted-foreground">{market.category}</span>
                )}
              </div>
            </div>
          </div>
          <Icons.ExternalLink className="w-3.5 h-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
        </div>

        {/* Probability */}
        {primaryMarket && primaryMarket.outcomes.length > 0 && (
          <ProbabilityBar outcomes={primaryMarket.outcomes} />
        )}

        {/* Metadata */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Icons.DollarSign className="w-3 h-3" />
            <span>{formatVolume(market.totalVolume)}</span>
          </div>
          {market.endDate && (
            <div className="flex items-center gap-1">
              <Icons.Calendar className="w-3 h-3" />
              <span>{formatDate(market.endDate)}</span>
            </div>
          )}
          {primaryMarket?.closed && (
            <span className="px-1.5 py-0.5 rounded-sm bg-muted text-[9px] font-medium">Closed</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Markets Sheet Component
const MarketsSheet: React.FC<{
  markets: PredictionMarket[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
}> = ({ markets, open, onOpenChange, query }) => {
  const isMobile = useIsMobile();

  const SheetWrapper = isMobile ? Drawer : Sheet;
  const SheetContentWrapper = isMobile ? DrawerContent : SheetContent;

  return (
    <SheetWrapper open={open} onOpenChange={onOpenChange}>
      <SheetContentWrapper className={cn(isMobile ? 'h-[85vh]' : 'w-[580px] sm:max-w-[580px]', 'p-0')}>
        <div className="flex flex-col h-full bg-background">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="p-1.5 rounded-md bg-muted">
                <Icons.TrendUp className="h-3.5 w-3.5 text-foreground" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Prediction Markets</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {markets.length} markets for "{query}"
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {markets.map((market, index) => (
              <a key={index} href={market.url} target="_blank" rel="noopener noreferrer" className="block">
                <MarketCard market={market} />
              </a>
            ))}
          </div>
        </div>
      </SheetContentWrapper>
    </SheetWrapper>
  );
};

// Loading State Component
const SearchLoadingState: React.FC<{
  query: string;
  annotations: DataUIPart<CustomUIDataTypes>[];
}> = ({ query, annotations }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const isCompleted = annotations.some((a) => a.data.status === 'completed');
  const resultsCount = annotations.find((a) => a.data.status === 'completed')?.data.resultsCount || 0;

  return (
    <div className="w-full my-3">
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-muted">
              <Icons.TrendUp className="h-3.5 w-3.5 text-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">Prediction Markets</span>
            <span className="text-[11px] text-muted-foreground">{resultsCount || 0} markets</span>
          </div>
          <Icons.ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180',
            )}
          />
        </button>

        {/* Loading Content */}
        {isExpanded && (
          <div className="px-3 pb-3 space-y-2.5 border-t border-border">
            {/* Query badge */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-2.5">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] shrink-0 border',
                  isCompleted
                    ? 'bg-muted border-border text-foreground'
                    : 'bg-card border-border/60 text-muted-foreground',
                )}
              >
                {isCompleted ? (
                  <Icons.Check className="w-2.5 h-2.5" />
                ) : (
                  <Spinner className="w-2.5 h-2.5" />
                )}
                <span className="font-medium">{query || 'Searching markets...'}</span>
                {resultsCount > 0 && <span className="text-[10px] opacity-70">({resultsCount})</span>}
              </span>
            </div>

            {/* Skeleton items */}
            <div className="space-y-px">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="py-3 px-4 border-b border-border last:border-0">
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-muted animate-pulse" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-muted rounded animate-pulse w-3/4" />
                        <div className="h-2.5 bg-muted rounded animate-pulse w-1/3" />
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full animate-pulse w-full" />
                    <div className="flex gap-3">
                      <div className="h-2.5 bg-muted rounded animate-pulse w-16" />
                      <div className="h-2.5 bg-muted rounded animate-pulse w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Component
const PredictionSearch: React.FC<{
  result: PredictionSearchResponse | null;
  args: PredictionSearchArgs;
  annotations?: Array<DataUIPart<CustomUIDataTypes> & { data: { query: string; status: string; resultsCount?: number } }>;
}> = ({ result, args, annotations = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const query = args?.query || '';

  if (!result) {
    return <SearchLoadingState query={query} annotations={annotations} />;
  }

  const markets = result.results || [];
  const totalResults = markets.length;

  return (
    <div className="w-full my-3">
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-muted">
              <Icons.TrendUp className="h-3.5 w-3.5 text-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">Prediction Markets</span>
            <span className="text-[11px] text-muted-foreground">
              {totalResults} {totalResults === 1 ? 'market' : 'markets'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {totalResults > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSheetOpen(true);
                }}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 hover:bg-accent rounded-md flex items-center gap-1"
              >
                View all
                <Icons.ArrowUpRight className="w-3 h-3" />
              </button>
            )}
            <Icons.ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                isExpanded && 'rotate-180',
              )}
            />
          </div>
        </button>

        {/* Content */}
        {isExpanded && (
          <div className="border-t border-border">
            {/* Query tag */}
            <div className="px-3 pt-2.5 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-border">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] shrink-0 border bg-muted border-border text-foreground font-medium">
                {result.query}
              </span>
            </div>

            {/* Results list */}
            <div className="max-h-96 overflow-y-auto">
              {markets.slice(0, 5).map((market, index) => (
                <a key={index} href={market.url} target="_blank" rel="noopener noreferrer" className="block">
                  <MarketCard market={market} />
                </a>
              ))}
              {totalResults > 5 && (
                <button
                  onClick={() => setSheetOpen(true)}
                  className="w-full py-2.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors flex items-center justify-center gap-1"
                >
                  View {totalResults - 5} more markets
                  <Icons.ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Markets Sheet */}
      <MarketsSheet markets={markets} open={sheetOpen} onOpenChange={setSheetOpen} query={result.query} />
    </div>
  );
};

export default PredictionSearch;
