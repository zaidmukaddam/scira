// /components/reddit-search.tsx
/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { RedditLogoIcon } from '@phosphor-icons/react';
import { CustomUIDataTypes, DataQueryCompletionPart } from '@/lib/types';
import type { DataUIPart } from 'ai';

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
  url: string | undefined;
  title: string | undefined;
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
};

type RedditSearchResponse = {
  searches: RedditSearchQueryResult[];
};

type RedditSearchArgs = {
  queries?: (string | undefined)[] | string | null;
  maxResults?: (number | undefined)[] | number | null;
};

// Reddit Source Card Component
const RedditSourceCard: React.FC<{
  result: RedditResult;
  onClick?: () => void;
}> = ({ result, onClick }) => {
  const formatSubreddit = (subreddit: string) => {
    return subreddit.replace(/^r\//, '').toLowerCase();
  };

  const subreddit = formatSubreddit(result.subreddit);
  const formattedScore = result.score ? (isNaN(result.score) ? '0' : result.score.toString()) : '0';

  return (
    <div
      className={cn(
        'group relative',
        'px-3.5 py-2 transition-colors',
        'hover:bg-muted/10',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5">
        <RedditLogoIcon className="w-3.5 h-3.5 text-orange-500/70 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-medium text-foreground line-clamp-1 flex-1">{result.title}</h3>
            <Icons.ArrowUpRight className="w-2.5 h-2.5 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-pixel text-[8px] text-orange-600 dark:text-orange-400 uppercase tracking-wider">r/{subreddit}</span>
            {result.score !== undefined && (
              <>
                <span className="text-muted-foreground/30 text-[10px]">·</span>
                <span className="text-[10px] text-muted-foreground/60 tabular-nums">{formattedScore}</span>
              </>
            )}
            {result.published_date && (
              <>
                <span className="text-muted-foreground/30 text-[10px]">·</span>
                <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                  {new Date(result.published_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/50 line-clamp-1 mt-0.5 leading-relaxed">
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
          <div className="px-5 py-4 border-b border-border/40">
            <div className="flex items-center gap-2 mb-0.5">
              <RedditLogoIcon className="h-3.5 w-3.5 text-orange-500" />
              <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">Reddit</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {totalResults} from {searches.length} {searches.length === 1 ? 'query' : 'queries'}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {searches.map((search, searchIndex) => (
              <div key={searchIndex} className="border-b border-border/30 last:border-0">
                <div className="px-5 py-2 bg-muted/20 border-b border-border/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{search.query}</span>
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums">{search.results.length}</span>
                  </div>
                </div>

                <div className="divide-y divide-border/20">
                  {search.results.map((result, resultIndex) => (
                    <a
                      key={resultIndex}
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
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
const SearchLoadingState: React.FC<{ queries: string[]; annotations: DataUIPart<CustomUIDataTypes>[] }> = ({ queries, annotations }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const loadingQueryTagsRef = React.useRef<HTMLDivElement>(null);
  const totalResults = annotations.reduce((sum, a) => sum + (a.data.resultsCount || 0), 0);

  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (e.deltaY === 0) return;
    const canScrollHorizontally = container.scrollWidth > container.clientWidth;
    if (!canScrollHorizontally) return;
    e.stopPropagation();
    const isAtLeftEdge = container.scrollLeft <= 1;
    const isAtRightEdge = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;
    if (!isAtLeftEdge && !isAtRightEdge) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtLeftEdge && e.deltaY > 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtRightEdge && e.deltaY < 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="w-full my-3">
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card/30">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <RedditLogoIcon className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">Reddit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">{totalResults || 0}</span>
            <Icons.ChevronDown
              className={cn(
                'h-3 w-3 text-muted-foreground/60 transition-transform duration-200',
                isExpanded && 'rotate-180',
              )}
            />
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-border/40">
            <div
              ref={loadingQueryTagsRef}
              className="px-3.5 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-border/30"
              onWheel={handleWheelScroll}
            >
              {queries.length ? (
                queries.map((query, i) => {
                  const isCompleted = annotations.some((a) => a.data.query === query && a.data.status === 'completed');
                  const annotation = annotations.find((a) => a.data.query === query);
                  const resultsCount = annotation?.data.resultsCount || 0;
                  return (
                    <span key={i} className="inline-flex items-center gap-1.5 text-[10px] shrink-0">
                      {isCompleted ? <Icons.Check className="w-2.5 h-2.5 text-muted-foreground" /> : <Spinner className="w-2.5 h-2.5" />}
                      <span className={cn('font-medium', isCompleted ? 'text-foreground' : 'text-muted-foreground')}>{query}</span>
                      {resultsCount > 0 && <span className="text-[9px] text-muted-foreground/50 tabular-nums">({resultsCount})</span>}
                      {i < queries.length - 1 && <span className="text-muted-foreground/30 ml-1">/</span>}
                    </span>
                  );
                })
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Spinner className="w-2.5 h-2.5" />
                  <span className="font-medium">Searching Reddit...</span>
                </span>
              )}
            </div>

            <div className="divide-y divide-border/20">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="px-3.5 py-2 flex items-center gap-2.5">
                  <RedditLogoIcon className="h-3.5 w-3.5 text-orange-500/20 shrink-0 animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-muted/30 rounded animate-pulse w-3/4" style={{ animationDelay: `${i * 100}ms` }} />
                    <div className="h-2 bg-muted/20 rounded animate-pulse w-1/2" style={{ animationDelay: `${i * 100 + 50}ms` }} />
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

// Main component
const RedditSearch: React.FC<{
  result: RedditSearchResponse | null;
  args: RedditSearchArgs;
  annotations?: DataQueryCompletionPart[];
}> = ({ result, args: _args, annotations = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);

  const normalizedQueries = React.useMemo(() => {
    const raw = Array.isArray(_args?.queries) ? _args.queries : [_args?.queries ?? ''];
    return raw.filter((q): q is string => typeof q === 'string' && q.length > 0);
  }, [_args?.queries]);

  if (!result) {
    return <SearchLoadingState queries={normalizedQueries} annotations={annotations} />;
  }

  const allResults = result.searches.flatMap((search) => search.results);
  const totalResults = allResults.length;

  return (
    <div className="w-full my-3">
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card/30">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <RedditLogoIcon className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">Reddit</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">{totalResults}</span>
            {totalResults > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSourcesSheetOpen(true);
                }}
                className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 hover:bg-muted/30 rounded flex items-center gap-1"
              >
                View all
                <Icons.ArrowUpRight className="w-2.5 h-2.5" />
              </button>
            )}
            <Icons.ChevronDown
              className={cn(
                'h-3 w-3 text-muted-foreground/60 transition-transform duration-200',
                isExpanded && 'rotate-180',
              )}
            />
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-border/40">
            <div className="px-3.5 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-border/30">
              {result.searches.map((search, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[10px] shrink-0">
                  <span className="font-medium text-foreground/80">{search.query}</span>
                  {i < result.searches.length - 1 && <span className="text-muted-foreground/30 ml-1">/</span>}
                </span>
              ))}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border/20">
              {allResults.map((post, index) => (
                <a key={index} href={post.url} target="_blank" rel="noopener noreferrer" className="block">
                  <RedditSourceCard result={post} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <RedditSourcesSheet searches={result.searches} open={sourcesSheetOpen} onOpenChange={setSourcesSheetOpen} />
    </div>
  );
};

export default RedditSearch;
