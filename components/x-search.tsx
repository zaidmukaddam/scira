/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { XLogoIcon } from '@phosphor-icons/react';
import { Tweet } from 'react-tweet';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

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
  result: XSearchResponse;
  args: XSearchArgs;
}

const XSearchLoadingState = () => {
  return (
    <div className="w-full my-3 border border-border rounded-lg overflow-hidden bg-card">
      <div className="px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-muted animate-pulse">
            <XLogoIcon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-48 bg-muted/60 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="p-3 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-3 border border-border rounded-md animate-pulse">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 bg-muted rounded-full" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
              <div className="space-y-1.5">
                <div className="h-2.5 w-full bg-muted rounded" />
                <div className="h-2.5 w-3/4 bg-muted rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const XSearch: React.FC<XSearchProps> = ({ result, args }) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Normalize args to ensure required arrays for UI rendering
  const normalizedArgs = useMemo<NormalizedXSearchArgs>(
    () => ({
      queries: (Array.isArray(args.queries) ? args.queries : [args.queries ?? '']).filter(
        (q): q is string => typeof q === 'string' && q.length > 0
      ),
      maxResults: (Array.isArray(args.maxResults) ? args.maxResults : [args.maxResults ?? 15]).filter(
        (n): n is number => typeof n === 'number'
      ),
    }),
    [args]
  );

  if (!result) {
    return <XSearchLoadingState />;
  }

  // Aggregate all citations and sources from all searches
  const allCitations = result.searches.flatMap((search) => search.citations);
  const allSources = result.searches.flatMap((search) => search.sources);

  // Extract tweet IDs from citations
  const tweetCitations = useMemo(() => {
    return allCitations
      .filter((citation) => {
        // Handle both string URLs and objects with url property
        const url = typeof citation === 'string' ? citation : citation.url;
        return url && url.includes('x.com');
      })
      .map((citation) => {
        // Handle both string URLs and objects with url property
        const url = typeof citation === 'string' ? citation : citation.url;
        const match = url.match(/\/status\/(\d+)/);
        let title = typeof citation === 'object' ? citation.title : '';

        // If no title from citation, try to get it from sources with generated titles
        if (!title && allSources) {
          const matchingSource = allSources.find((source) => source.link === url);
          title = matchingSource?.title || '';
        }

        return {
          url,
          title,
          description: typeof citation === 'object' ? citation.description : '',
          tweet_id: match ? match[1] : null,
        };
      })
      .filter((citation) => citation.tweet_id);
  }, [allCitations, allSources]);

  const displayedTweets = useMemo(() => {
    return tweetCitations.slice(0, 3);
  }, [tweetCitations]);

  const remainingTweets = useMemo(() => {
    return tweetCitations.slice(3);
  }, [tweetCitations]);

  const formatDateRange = (dateRange: string) => {
    const [start, end] = dateRange.split(' to ');
    return {
      start: new Date(start).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      end: new Date(end).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };
  };

  const { start, end } = formatDateRange(result.dateRange);

  return (
    <div className="w-full my-3">
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-1.5 rounded-md bg-black dark:bg-white flex-shrink-0">
              <XLogoIcon className="h-3.5 w-3.5 text-white dark:text-black" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <h3 className="font-medium text-sm text-foreground">X Search Results</h3>
              <p className="text-xs text-muted-foreground truncate">
                {result.searches.length} {result.searches.length === 1 ? 'query' : 'queries'} • {start} - {end}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {(args.includeXHandles || args.excludeXHandles || result.handles.length > 0) && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Icons.Users className="h-3 w-3" />
                {args.includeXHandles?.length || args.excludeXHandles?.length || result.handles.length}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Icons.Messages className="h-3 w-3" />
              {tweetCitations.length}
            </span>
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
              {result.searches.map((search, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] shrink-0 border bg-muted border-border text-foreground font-medium"
                >
                  <span>{search.query}</span>
                </span>
              ))}
            </div>

            <div className="pt-3 pb-0">
            <div className="space-y-3">
              {/* Horizontal Tweets Row */}
              {tweetCitations.length > 0 && (
                <div className="space-y-3 px-3">
                  <div className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-none rounded-[8px]">
                    {displayedTweets.map((citation, index) => (
                      <motion.div
                        key={citation.tweet_id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[350px]"
                      >
                        {citation.tweet_id && (
                          <div className="tweet-wrapper">
                            <Tweet id={citation.tweet_id} />
                          </div>
                        )}
                      </motion.div>
                    ))}

                    {/* Show More in Sheet */}
                    {remainingTweets.length > 0 && (
                      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <button
                          onClick={() => setIsSheetOpen(true)}
                          className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[350px] min-h-[180px] border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-border/80 hover:bg-accent/30 transition-all duration-200 group"
                        >
                          <div className="text-center px-4">
                            <div className="mb-2">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                                <Icons.Messages className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                            <p className="font-medium text-sm text-foreground mb-1">
                              +{remainingTweets.length} more posts
                            </p>
                            <p className="text-xs text-muted-foreground">Click to view all</p>
                          </div>
                        </button>
                        <SheetContent
                          side="right"
                          className="w-full sm:w-[500px] md:w-[600px] lg:w-[650px] sm:max-w-[90vw] p-0"
                        >
                          <div className="flex flex-col h-full bg-background">
                            <SheetHeader className="px-4 sm:px-6 py-4 border-b border-border">
                              <SheetTitle className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-md bg-black dark:bg-white">
                                  <XLogoIcon className="h-3.5 w-3.5 text-white dark:text-black" />
                                </div>
                                <span>All Posts ({tweetCitations.length})</span>
                              </SheetTitle>
                            </SheetHeader>
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                              <div className="space-y-6 max-w-full sm:max-w-[550px] mx-auto">
                                {tweetCitations.map((citation, index) => (
                                  <motion.div
                                    key={citation.tweet_id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.02 }}
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

              {/* Compact No Tweets Found */}
              {tweetCitations.length === 0 && (
                <div className="text-center py-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-2 rounded-full bg-muted">
                      <Icons.Messages className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-sm">No posts found</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Try adjusting your search parameters
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Compact External Links */}
              {allCitations.length > tweetCitations.length && (
                <div className="border-t border-border pt-3 px-3">
                  <h4 className="font-medium text-xs text-foreground mb-2 uppercase tracking-wide">
                    Related Sources
                  </h4>
                  <div className="space-y-px">
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
                            className="flex items-center gap-2 py-2 px-2.5 rounded-md hover:bg-accent/50 transition-colors group"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs text-foreground truncate">
                                {title}
                              </p>
                            </div>
                            <Icons.ExternalLink className="h-3 w-3 text-muted-foreground group-hover:opacity-100 opacity-60 flex-shrink-0 transition-opacity" />
                          </a>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default XSearch;
