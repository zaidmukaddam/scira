// /components/github-search.tsx
/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { GithubIcon } from 'lucide-react';
import Image from 'next/image';
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
  Star: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
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
  Fork: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="6" r="3" />
      <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" />
      <path d="M12 12v3" />
    </svg>
  ),
  Code: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
};

type GitHubResult = {
  url: string;
  title: string;
  content: string;
  publishedDate?: string;
  author?: string;
  image?: string;
  favicon?: string;
  stars?: number;
  language?: string;
  description?: string;
};

type GitHubSearchQueryResult = {
  query: string;
  results: GitHubResult[];
};

type GitHubSearchResponse = {
  searches: GitHubSearchQueryResult[];
};

type GitHubSearchArgs = {
  queries?: (string | undefined)[] | string | null;
  maxResults?: (number | undefined)[] | number | null;
  startDate?: string;
  endDate?: string;
};

// GitHub Source Card Component - Minimal Premium Design
const GitHubSourceCard: React.FC<{
  result: GitHubResult;
  onClick?: () => void;
}> = ({ result, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Extract owner/repo from URL
  const repoMatch = result.url?.match(/github\.com\/([^/]+)\/([^/]+)/);
  const repoPath = repoMatch ? `${repoMatch[1]}/${repoMatch[2]}` : result.author || 'unknown';

  const formattedStars = result.stars
    ? result.stars >= 1000
      ? `${(result.stars / 1000).toFixed(1)}k`
      : result.stars.toString()
    : undefined;

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
        {/* GitHub Icon */}
        <div className="relative w-4 h-4 mt-0.5 flex items-center justify-center shrink-0 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
          {!imageLoaded && <div className="absolute inset-0 animate-pulse" />}
          <Image
            src={result.favicon || `https://github.com/favicon.ico`}
            alt=""
            width={16}
            height={16}
            className={cn('object-contain opacity-60', !imageLoaded && 'opacity-0')}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              setImageLoaded(true);
              e.currentTarget.src = 'https://github.com/favicon.ico';
            }}
          />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          {/* Title and Repo Path */}
          <div className="flex items-baseline gap-1.5">
            <h3 className="font-medium text-[13px] text-foreground line-clamp-1 flex-1">{result.title}</h3>
            <Icons.ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="px-1.5 py-0.5 rounded-sm bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium truncate max-w-[150px]">
              {repoPath}
            </span>
            {formattedStars && (
              <>
                <span>·</span>
                <Icons.Star className="w-2.5 h-2.5" />
                <span>{formattedStars}</span>
              </>
            )}
            {result.language && (
              <>
                <span>·</span>
                <Icons.Code className="w-2.5 h-2.5" />
                <span>{result.language}</span>
              </>
            )}
            {result.publishedDate && (
              <>
                <span>·</span>
                <Icons.Calendar className="w-2.5 h-2.5" />
                <span>
                  {new Date(result.publishedDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </>
            )}
          </div>

          {/* Content */}
          <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
            {result.description || (result.content.length > 150 ? result.content.substring(0, 150) + '...' : result.content)}
          </p>
        </div>
      </div>
    </div>
  );
};

// GitHub Sources Sheet Component - Minimal Design
const GitHubSourcesSheet: React.FC<{
  searches: GitHubSearchQueryResult[];
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
              <div className="p-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800">
                <GithubIcon className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
              </div>
              <h2 className="text-base font-semibold text-foreground">GitHub Results</h2>
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
                    <span className="text-xs font-medium text-foreground">{search.query}</span>
                    <span className="text-[10px] text-muted-foreground">{search.results.length}</span>
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
                      <GitHubSourceCard result={result} />
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
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800">
              <GithubIcon className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
            </div>
            <span className="text-sm font-medium text-foreground">GitHub</span>
            <span className="text-[11px] text-muted-foreground">{totalResults || 0} repos</span>
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
            {/* Query badges */}
            <div
              ref={loadingQueryTagsRef}
              className="flex gap-1.5 overflow-x-auto no-scrollbar pt-2.5"
              onWheel={handleWheelScroll}
            >
              {queries.length ? (
                queries.map((query, i) => {
                  const isCompleted = annotations.some((a) => a.data.query === query && a.data.status === 'completed');
                  const annotation = annotations.find((a) => a.data.query === query);
                  const resultsCount = annotation?.data.resultsCount || 0;
                  return (
                    <span
                      key={i}
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
                      <span className="font-medium">{query}</span>
                      {resultsCount > 0 && (
                        <span className="text-[10px] opacity-70">({resultsCount})</span>
                      )}
                    </span>
                  );
                })
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] shrink-0 border border-border bg-card text-muted-foreground">
                  <Spinner className="w-2.5 h-2.5" />
                  <span className="font-medium">Searching GitHub...</span>
                </span>
              )}
            </div>

            {/* Skeleton items */}
            <div className="space-y-px">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="py-2.5 px-3 border-b border-border last:border-0">
                  <div className="flex items-start gap-2.5">
                    <div className="w-4 h-4 mt-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse flex items-center justify-center">
                      <GithubIcon className="h-2.5 w-2.5 text-neutral-400 dark:text-neutral-600" />
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
        )}
      </div>
    </div>
  );
};

// Main component - Minimal Premium Design
const GitHubSearch: React.FC<{
  result: GitHubSearchResponse | null;
  args: GitHubSearchArgs;
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
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800">
              <GithubIcon className="h-3.5 w-3.5 text-neutral-700 dark:text-neutral-300" />
            </div>
            <span className="text-sm font-medium text-foreground">GitHub</span>
            <span className="text-[11px] text-muted-foreground">
              {totalResults} {totalResults === 1 ? 'repo' : 'repos'}
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
                isExpanded && 'rotate-180',
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
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] shrink-0 border bg-muted border-border text-foreground font-medium"
                  >
                    <span>{search.query}</span>
                  </span>
                );
              })}
            </div>

            {/* Results list */}
            <div className="max-h-80 overflow-y-auto">
              {allResults.map((repo, index) => (
                <a
                  key={index}
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block last:border-0"
                >
                  <GitHubSourceCard result={repo} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sources Sheet */}
      <GitHubSourcesSheet searches={result.searches} open={sourcesSheetOpen} onOpenChange={setSourcesSheetOpen} />
    </div>
  );
};

export default GitHubSearch;
