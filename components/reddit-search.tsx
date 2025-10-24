// /components/reddit-search.tsx
/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { RedditLogoIcon } from '@phosphor-icons/react';
import Image from 'next/image';

// Custom Premium Icons
const Icons = {
  Calendar: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  ThumbsUp: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
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
  Messages: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

type RedditResult = {
  url: string;
  title: string;
  content: string;
  published_date?: string;
  subreddit: string;
  isRedditPost: boolean;
  comments: string[];
  score?: number;
};

type RedditSearchQueryResult = {
  query: string;
  results: RedditResult[];
  timeRange: string;
};

type RedditSearchResponse = {
  searches: RedditSearchQueryResult[];
};

type RedditSearchArgs = {
  queries?: (string | undefined)[] | string | null;
  maxResults?: (number | undefined)[] | number | null;
  timeRange?: (('day' | 'week' | 'month' | 'year') | undefined)[] | ('day' | 'week' | 'month' | 'year') | null;
};

type NormalizedRedditSearchArgs = {
  queries: string[];
  maxResults: number[];
  timeRange: ('day' | 'week' | 'month' | 'year')[];
};

// Reddit Source Card Component - Minimal Premium Design
const RedditSourceCard: React.FC<{
  result: RedditResult;
  onClick?: () => void;
}> = ({ result, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const formatSubreddit = (subreddit: string) => {
    return subreddit.replace(/^r\//, '').toLowerCase();
  };

  const subreddit = formatSubreddit(result.subreddit);
  const formattedScore = result.score ? (isNaN(result.score) ? '0' : result.score.toString()) : '0';

  return (
    <div
      className={cn(
        'group relative',
        'border-b border-border',
        'py-2.5 px-3 transition-all duration-150',
        'hover:bg-accent/50',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2.5">
        {/* Reddit Icon */}
        <div className="relative w-4 h-4 mt-0.5 flex items-center justify-center shrink-0 rounded-full overflow-hidden bg-orange-50 dark:bg-orange-900/20">
          {!imageLoaded && <div className="absolute inset-0 animate-pulse" />}
          <Image
            src={`https://www.reddit.com/favicon.ico`}
            alt=""
            width={16}
            height={16}
            className={cn('object-contain opacity-60', !imageLoaded && 'opacity-0')}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              setImageLoaded(true);
              e.currentTarget.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23FF4500'%3E%3Cpath d='M10 0C4.478 0 0 4.478 0 10c0 5.523 4.478 10 10 10 5.523 0 10-4.477 10-10 0-5.522-4.477-10-10-10zm5.7 11.1c.1.1.1.1.1.2s0 .1-.1.2c-.599.901-1.899 1.4-3.6 1.4-1.3 0-2.5-.3-3.4-.9-.1-.1-.3-.1-.5-.2-.1 0-.1 0-.1-.1s-.1-.1-.1-.1c-.1-.1-.1-.1-.1-.2s0-.1.1-.2c.1-.1.2-.1.3-.1h.1c.9.5 2 .8 3.2.8 1.3 0 2.4-.3 3.3-.9h.1c.102-.1.202-.1.302-.1.099 0 .198 0 .298.1zm-9.6-2.3c0-.9.7-1.6 1.6-1.6.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6-.9 0-1.6-.7-1.6-1.6zm6.8 0c0-.9.7-1.6 1.6-1.6.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6-.9 0-1.6-.7-1.6-1.6z'/%3E%3C/svg%3E";
            }}
          />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          {/* Title and Subreddit */}
          <div className="flex items-baseline gap-1.5">
            <h3 className="font-medium text-[13px] text-foreground line-clamp-1 flex-1">
              {result.title}
            </h3>
            <Icons.ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          
          {/* Metadata */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="px-1.5 py-0.5 rounded-sm bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium">
              r/{subreddit}
            </span>
            {result.score !== undefined && (
              <>
                <span>·</span>
                <Icons.ThumbsUp className="w-2.5 h-2.5" />
                <span>{formattedScore}</span>
              </>
            )}
            {result.published_date && (
              <>
                <span>·</span>
                <Icons.Calendar className="w-2.5 h-2.5" />
                <span>
                  {new Date(result.published_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </>
            )}
          </div>

          {/* Content */}
          <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
            {result.content.length > 150 ? result.content.substring(0, 150) + '...' : result.content}
          </p>
        </div>
      </div>
    </div>
  );
};

// Reddit Sources Sheet Component - Minimal Design
const RedditSourcesSheet: React.FC<{
  searches: RedditSearchQueryResult[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ searches, open, onOpenChange }) => {
  const isMobile = useIsMobile();
  const totalResults = searches.reduce((sum, search) => sum + search.results.length, 0);

  const SheetWrapper = isMobile ? Drawer : Sheet;
  const SheetContentWrapper = isMobile ? DrawerContent : SheetContent;

  return (
    <SheetWrapper open={open} onOpenChange={onOpenChange}>
      <SheetContentWrapper className={cn(isMobile ? 'h-[85vh]' : 'w-[580px] sm:max-w-[580px]', 'p-0')}>
        <div className="flex flex-col h-full bg-background">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-900/20">
                <RedditLogoIcon className="h-3.5 w-3.5 text-orange-500" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Reddit Results</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {totalResults} from {searches.length} {searches.length === 1 ? 'query' : 'queries'}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {searches.map((search, searchIndex) => (
              <div key={searchIndex} className="border-b border-border last:border-0">
                <div className="px-5 py-2.5 bg-muted/40 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {search.query}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {search.results.length}
                    </span>
                  </div>
                </div>

                <div>
                  {search.results.map((result, resultIndex) => (
                    <a
                      key={resultIndex}
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block last:border-0"
                    >
                      <RedditSourceCard result={result} />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContentWrapper>
    </SheetWrapper>
  );
};

// Loading state component - Minimal Design
const SearchLoadingState = () => {
  return (
    <div className="w-full my-3">
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <div className="px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-900/20">
              <RedditLogoIcon className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <span className="text-sm font-medium text-foreground">Reddit Results</span>
            <span className="text-[11px] text-muted-foreground">0 posts</span>
          </div>
          <Icons.ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Loading Content */}
        <div className="border-t border-border px-3 py-3 space-y-2.5">
          {/* Loading badge */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] shrink-0 border border-border bg-card text-muted-foreground">
              <Spinner className="w-2.5 h-2.5" />
              <span className="font-medium">Searching Reddit...</span>
            </span>
          </div>

          {/* Skeleton items */}
          <div className="space-y-px">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="py-2.5 px-3 border-b border-border last:border-0"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-4 h-4 mt-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 animate-pulse flex items-center justify-center">
                    <RedditLogoIcon className="h-2.5 w-2.5 text-orange-500/30" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-2.5 bg-muted rounded animate-pulse w-1/2" />
                    <div className="h-2.5 bg-muted rounded animate-pulse w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main component - Minimal Premium Design
const RedditSearch: React.FC<{
  result: RedditSearchResponse | null;
  args: RedditSearchArgs;
}> = ({ result, args }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);

  // Normalize args to ensure required arrays for UI rendering
  const normalizedArgs = React.useMemo<NormalizedRedditSearchArgs>(
    () => ({
      queries: (Array.isArray(args.queries) ? args.queries : [args.queries ?? '']).filter(
        (q): q is string => typeof q === 'string' && q.length > 0
      ),
      maxResults: (Array.isArray(args.maxResults) ? args.maxResults : [args.maxResults ?? 20]).filter(
        (n): n is number => typeof n === 'number'
      ),
      timeRange: (Array.isArray(args.timeRange) ? args.timeRange : [args.timeRange ?? 'week']).filter(
        (t): t is 'day' | 'week' | 'month' | 'year' => 
          t === 'day' || t === 'week' || t === 'month' || t === 'year'
      ),
    }),
    [args]
  );

  if (!result) {
    return <SearchLoadingState />;
  }

  const allResults = result.searches.flatMap((search) => search.results);
  const totalResults = allResults.length;

  const formatTimeRange = (timeRange: string) => ({
    day: 'past 24 hours',
    week: 'past week',
    month: 'past month',
    year: 'past year',
  }[timeRange] || timeRange);

  return (
    <div className="w-full my-3">
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-900/20">
              <RedditLogoIcon className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <span className="text-sm font-medium text-foreground">Reddit Results</span>
            <span className="text-[11px] text-muted-foreground">
              {totalResults} {totalResults === 1 ? 'post' : 'posts'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {totalResults > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSourcesSheetOpen(true);
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
                isExpanded && 'rotate-180'
              )}
            />
          </div>
        </button>

        {/* Content */}
        {isExpanded && (
          <div className="border-t border-border">
            {/* Query tags */}
            <div className="px-3 pt-2.5 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-border">
              {result.searches.map((search, i) => {
                const currentTimeRange = normalizedArgs.timeRange[i] || 'week';
                return (
                  <span 
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] shrink-0 border bg-muted border-border text-foreground font-medium"
                  >
                    <Icons.Check className="w-2.5 h-2.5" />
                    <span>{search.query}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-orange-600 dark:text-orange-400">
                      {formatTimeRange(currentTimeRange)}
                    </span>
                  </span>
                );
              })}
            </div>

            {/* Results list */}
            <div className="max-h-80 overflow-y-auto">
              {allResults.map((post, index) => (
                <a
                  key={index}
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block last:border-0"
                >
                  <RedditSourceCard result={post} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sources Sheet */}
      <RedditSourcesSheet searches={result.searches} open={sourcesSheetOpen} onOpenChange={setSourcesSheetOpen} />
    </div>
  );
};

export default RedditSearch;
