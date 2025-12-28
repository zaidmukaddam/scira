/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { XLogoIcon } from '@phosphor-icons/react';
import { Tweet } from 'react-tweet';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { CustomUIDataTypes, DataQueryCompletionPart } from '@/lib/types';
import type { DataUIPart } from 'ai';

// Custom Premium Icons
const Icons = {
  Users: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Messages: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
  ArrowUpRight: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 17L17 7M17 7H7M17 7v10" />
    </svg>
  ),
};

interface Citation {
  url: string;
  title: string;
  description?: string;
  tweet_id?: string;
  author?: string;
  created_at?: string;
}

interface Source {
  text: string;
  link: string;
  title?: string;
}

interface XSearchQueryResult {
  content: string;
  citations: Citation[];
  sources: Source[];
  query: string;
  dateRange: string;
  handles: string[];
}

interface XSearchResponse {
  searches: XSearchQueryResult[];
  dateRange: string;
  handles: string[];
}

interface XSearchArgs {
  queries?: (string | undefined)[] | string | null;
  startDate?: string;
  endDate?: string;
  includeXHandles?: string[];
  excludeXHandles?: string[];
  postFavoritesCount?: number;
  postViewCount?: number;
  maxResults?: (number | undefined)[] | number | null;
}

interface NormalizedXSearchArgs {
  queries: string[];
  maxResults: number[];
}

interface XSearchProps {
  result: XSearchResponse | null;
  args: XSearchArgs;
  annotations?: DataQueryCompletionPart[];
}

function extractTweetId(url?: string | null) {
  if (!url) return null;
  return url.match(/\/status\/(\d+)/)?.[1] ?? null;
}

const XSearchLoadingState: React.FC<{ queries: string[]; annotations: DataUIPart<CustomUIDataTypes>[] }> = ({ queries, annotations }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const loadingQueryTagsRef = React.useRef<HTMLDivElement>(null);
  const totalSources = annotations.reduce((sum, a) => sum + (a.data.resultsCount || 0), 0);

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
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <XLogoIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">X Search</span>
            <span className="text-[11px] text-muted-foreground">{totalSources || 0} posts</span>
          </div>
          <Icons.ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180',
            )}
          />
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 space-y-2.5 border-t border-border">
            <div
              ref={loadingQueryTagsRef}
              className="flex gap-1.5 overflow-x-auto no-scrollbar pt-2.5"
              onWheel={handleWheelScroll}
            >
              {queries.length ? (
                queries.map((query, i) => {
                  const isCompleted = annotations.some((a) => a.data.query === query && a.data.status === 'completed');
                  const annotation = annotations.find((a) => a.data.query === query);
                  const sourcesCount = annotation?.data.resultsCount || 0;
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
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <Spinner className="w-2.5 h-2.5" />
                      )}
                      <span className="font-medium">{query}</span>
                      {sourcesCount > 0 && (
                        <span className="text-[10px] opacity-70">({sourcesCount})</span>
                      )}
                    </span>
                  );
                })
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] shrink-0 border border-border bg-card text-muted-foreground">
                  <Spinner className="w-2.5 h-2.5" />
                  <span className="font-medium">Searching X...</span>
                </span>
              )}
            </div>

            <div className="space-y-px">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="py-2.5 px-3 border-b border-border last:border-0">
                  <div className="flex items-start gap-2.5">
                    <div className="w-4 h-4 mt-0.5 rounded-full bg-muted animate-pulse flex items-center justify-center">
                      <XLogoIcon className="h-2.5 w-2.5 text-muted-foreground/30" />
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

const XSearch: React.FC<XSearchProps> = ({ result, args, annotations = [] }) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const normalizedQueries = useMemo(() => {
    const raw = Array.isArray(args?.queries) ? args.queries : [args?.queries ?? ''];
    return raw.filter((q): q is string => typeof q === 'string' && q.length > 0);
  }, [args?.queries]);

  const searches = useMemo(() => {
    const raw = result?.searches;
    return Array.isArray(raw) ? raw : [];
  }, [result?.searches]);

  // Aggregate all citations and sources from all searches
  const allCitations = useMemo(() => searches.flatMap((search) => search.citations ?? []), [searches]);
  const allSources = useMemo(() => searches.flatMap((search) => search.sources ?? []), [searches]);
  const uniqueSources = useMemo(() => {
    const seen = new Set<string>();
    return allSources.filter((source) => {
      const key = extractTweetId(source.link) ?? source.link ?? source.text;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allSources]);

  // Extract tweet IDs from citations
  const tweetCitations = useMemo(() => {
    const seen = new Set<string>();
    return allCitations
      .filter((citation) => {
        const url = typeof citation === 'string' ? citation : citation.url;
        return url && url.includes('x.com');
      })
      .map((citation) => {
        const url = typeof citation === 'string' ? citation : citation.url;
        const tweetId = extractTweetId(url);
        let title = typeof citation === 'object' ? citation.title : '';

        if (!title && uniqueSources.length) {
          const matchingSource = uniqueSources.find((source) => {
            const sourceId = extractTweetId(source.link);
            return sourceId && sourceId === tweetId;
          });
          title = matchingSource?.title || '';
        }

        return {
          url,
          title,
          description: typeof citation === 'object' ? citation.description : '',
          tweet_id: tweetId,
        };
      })
      .filter((citation) => {
        if (!citation.tweet_id) return false;
        if (seen.has(citation.tweet_id)) {
          return false;
        }
        seen.add(citation.tweet_id);
        return true;
      });
  }, [allCitations, uniqueSources]);

  const displayedTweets = useMemo(() => {
    return tweetCitations.slice(0, 3);
  }, [tweetCitations]);

  const remainingTweets = useMemo(() => {
    return tweetCitations.slice(3);
  }, [tweetCitations]);

  const formatDateRange = (dateRange?: string) => {
    if (!dateRange) {
      return { start: 'Unknown', end: 'Unknown' };
    }

    const [startRaw = '', endRaw = ''] = dateRange.split(' to ');

    const toDisplayDate = (value: string) => {
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? 'Unknown'
        : date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
    };

    return {
      start: toDisplayDate(startRaw),
      end: toDisplayDate(endRaw),
    };
  };

  const { start, end } = formatDateRange(result?.dateRange);

  if (!result) {
    return <XSearchLoadingState queries={normalizedQueries} annotations={annotations} />;
  }

  return (
    <div className="w-full my-2">
      <div className="border border-border/40 rounded-lg overflow-hidden bg-card">
        {/* Compact Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-accent/20 transition-colors group"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="p-1 rounded bg-black dark:bg-white shrink-0">
              <XLogoIcon className="h-3 w-3 text-white dark:text-black" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <h3 className="font-medium text-xs text-foreground">X Search</h3>
              <p className="text-[10px] text-muted-foreground/80 truncate">
                {tweetCitations.length} posts • {start} - {end}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {searches.length > 1 && (
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted/50 text-muted-foreground">
                {searches.length} queries
              </span>
            )}
            <Icons.ChevronDown
              className={cn(
                'h-3 w-3 text-muted-foreground/60 transition-transform duration-200 group-hover:text-muted-foreground',
                isExpanded && 'rotate-180',
              )}
            />
          </div>
        </button>

        {/* Content */}
        {isExpanded && (
          <div className="border-t border-border/40">
            {/* Query tags - more compact */}
            {searches.length > 0 && (
              <div className="px-2.5 py-1.5 flex gap-1 overflow-x-auto no-scrollbar bg-transparent">
                {searches.map((search, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] shrink-0 bg-background border border-border/40 text-foreground/90"
                  >
                    {search.query}
                  </span>
                ))}
              </div>
            )}

            {/* Tweets Grid - more compact and browsable */}
            {tweetCitations.length > 0 && (
              <div className="px-2.5">
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
                  {displayedTweets.map((citation, index) => (
                    <motion.div
                      key={citation.tweet_id}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="shrink-0 w-[260px] sm:w-[300px]"
                    >
                      {citation.tweet_id && (
                        <div className="tweet-wrapper">
                          <Tweet id={citation.tweet_id} />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* More button - cleaner design */}
                  {remainingTweets.length > 0 && (
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                      <button
                        onClick={() => setIsSheetOpen(true)}
                        className="shrink-0 w-[260px] sm:w-[300px] min-h-[160px] border border-dashed border-border/60 dark:border-2 dark:border-solid dark:border-border rounded-lg flex flex-col items-center justify-center hover:border-border dark:hover:border-border hover:bg-accent/20 transition-colors group"
                      >
                        <div className="p-2 rounded-full bg-muted/50 mb-2 group-hover:bg-muted transition-colors">
                          <Icons.Messages className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="font-medium text-xs text-foreground">+{remainingTweets.length} more</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">View all posts</p>
                      </button>
                      <SheetContent side="right" className="w-full sm:w-[480px] md:w-[550px] sm:max-w-[90vw] p-0">
                        <div className="flex flex-col h-full bg-background">
                          <SheetHeader className="px-4 py-3 border-b border-border/40">
                            <SheetTitle className="flex items-center gap-2 text-sm">
                              <div className="p-1 rounded bg-black dark:bg-white">
                                <XLogoIcon className="h-3 w-3 text-white dark:text-black" />
                              </div>
                              <span>All Posts ({tweetCitations.length})</span>
                            </SheetTitle>
                          </SheetHeader>
                          <div className="flex-1 overflow-y-auto p-3">
                            <div className="space-y-4 max-w-full sm:max-w-[520px] mx-auto">
                              {tweetCitations.map((citation, index) => (
                                <motion.div
                                  key={citation.tweet_id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.015 }}
                                >
                                  {citation.tweet_id && (
                                    <div className="tweet-wrapper-sheet">
                                      <Tweet id={citation.tweet_id} />
                                    </div>
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  )}
                </div>
              </div>
            )}

            {/* No tweets state - more minimal */}
            {tweetCitations.length === 0 && (
              <div className="text-center py-8 px-4">
                <div className="inline-flex p-2 rounded-full bg-muted/50 mb-2">
                  <Icons.Messages className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <p className="text-xs text-muted-foreground/80">No posts found for this search</p>
              </div>
            )}

            {/* External links - cleaner and more compact */}
            {allCitations.length > tweetCitations.length && (
              <div className="border-t border-border/40 px-2.5 py-2">
                <h4 className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-1.5">
                  Sources
                </h4>
                <div className="space-y-0.5">
                  {allCitations
                    .filter((citation) => {
                      const url = typeof citation === 'string' ? citation : citation.url;
                      return url && !url.includes('x.com');
                    })
                    .slice(0, 3)
                    .map((citation, index) => {
                      const url = typeof citation === 'string' ? citation : citation.url;
                      const title = typeof citation === 'object' ? citation.title : url;
                      return (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 py-1.5 px-2 rounded hover:bg-accent/20 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-foreground/90 truncate leading-tight">{title}</p>
                          </div>
                          <Icons.ExternalLink className="h-2.5 w-2.5 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 transition-colors" />
                        </a>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default XSearch;
