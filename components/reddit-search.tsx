// /components/reddit-search.tsx
/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Search, ThumbsUp, Check, ArrowUpRight, ExternalLink, Globe } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { RedditLogoIcon } from '@phosphor-icons/react';
import Image from 'next/image';

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

type RedditSearchResponse = {
  query: string;
  results: RedditResult[];
  timeRange: string;
};

type RedditSearchArgs = {
  query: string;
  maxResults: number;
  timeRange: string;
};

// Reddit Source Card Component
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
        'group relative bg-white dark:bg-neutral-900',
        'border border-neutral-200 dark:border-neutral-800',
        'rounded-xl p-4 transition-all duration-200',
        'hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center overflow-hidden shrink-0">
          {!imageLoaded && <div className="absolute inset-0 animate-pulse" />}
          <Image
            src={`https://www.reddit.com/favicon.ico`}
            alt=""
            width={24}
            height={24}
            className={cn('object-contain', !imageLoaded && 'opacity-0')}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              setImageLoaded(true);
              e.currentTarget.src =
                "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23FF4500'%3E%3Cpath d='M10 0C4.478 0 0 4.478 0 10c0 5.523 4.478 10 10 10 5.523 0 10-4.477 10-10 0-5.522-4.477-10-10-10zm5.7 11.1c.1.1.1.1.1.2s0 .1-.1.2c-.599.901-1.899 1.4-3.6 1.4-1.3 0-2.5-.3-3.4-.9-.1-.1-.3-.1-.5-.2-.1 0-.1 0-.1-.1s-.1-.1-.1-.1c-.1-.1-.1-.1-.1-.2s0-.1.1-.2c.1-.1.2-.1.3-.1h.1c.9.5 2 .8 3.2.8 1.3 0 2.4-.3 3.3-.9h.1c.102-.1.202-.1.302-.1.099 0 .198 0 .298.1zm-9.6-2.3c0-.9.7-1.6 1.6-1.6.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6-.9 0-1.6-.7-1.6-1.6zm6.8 0c0-.9.7-1.6 1.6-1.6.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6-.9 0-1.6-.7-1.6-1.6z'/%3E%3C/svg%3E";
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-neutral-900 dark:text-neutral-100 line-clamp-1 mb-1">
            {result.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-[10px] rounded-sm bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
            >
              r/{subreddit}
            </Badge>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-3">
        {result.content.length > 150 ? result.content.substring(0, 150) + '...' : result.content}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
        {result.score !== undefined && (
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <ThumbsUp className="w-3 h-3" />
            <span>{formattedScore} upvotes</span>
          </div>
        )}
        {result.published_date && (
          <time className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {new Date(result.published_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </time>
        )}
      </div>
    </div>
  );
};

// Reddit Sources Sheet Component
const RedditSourcesSheet: React.FC<{
  results: RedditResult[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ results, open, onOpenChange }) => {
  const isMobile = useIsMobile();

  const SheetWrapper = isMobile ? Drawer : Sheet;
  const SheetContentWrapper = isMobile ? DrawerContent : SheetContent;

  return (
    <SheetWrapper open={open} onOpenChange={onOpenChange}>
      <SheetContentWrapper className={cn(isMobile ? 'h-[85vh]' : 'w-[600px] sm:max-w-[600px]', 'p-0')}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-900/20">
                <RedditLogoIcon className="h-4 w-4 text-orange-500" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">All Reddit Results</h2>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{results.length} posts and comments</p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-3">
              {results.map((result, index) => (
                <a key={index} href={result.url} target="_blank" className="block">
                  <RedditSourceCard result={result} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </SheetContentWrapper>
    </SheetWrapper>
  );
};

// Loading state component
const SearchLoadingState = () => {
  return (
    <div className="w-full space-y-3">
      <Accordion type="single" collapsible defaultValue="search" className="w-full">
        <AccordionItem value="search" className="border-none">
          <AccordionTrigger
            className={cn(
              'py-3 px-4 rounded-xl hover:no-underline',
              'bg-white dark:bg-neutral-900',
              'border border-neutral-200 dark:border-neutral-800',
              'data-[state=open]:rounded-b-none',
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-900/20">
                  <RedditLogoIcon className="h-3.5 w-3.5 text-orange-500" />
                </div>
                <h2 className="font-medium text-sm">Reddit Results</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full text-xs px-2.5 py-0.5">
                  0
                </Badge>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs opacity-50 cursor-not-allowed" disabled>
                  View all
                  <ArrowUpRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="p-0">
            <div
              className={cn(
                'p-3 space-y-3',
                'bg-white dark:bg-neutral-900',
                'border-x border-b border-neutral-200 dark:border-neutral-800',
                'rounded-b-xl',
              )}
            >
              {/* Query badges */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                <Badge
                  variant="outline"
                  className="rounded-full text-xs px-3 py-1 shrink-0 bg-neutral-50 dark:bg-neutral-900 text-neutral-400"
                >
                  <div className="w-3 h-3 mr-1.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Searching Reddit...
                </Badge>
              </div>

              {/* Skeleton cards */}
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-[320px] bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 animate-pulse flex items-center justify-center">
                        <RedditLogoIcon className="h-5 w-5 text-orange-500/30" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
                      <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

// Main component
const RedditSearch: React.FC<{
  result: RedditSearchResponse;
  args: RedditSearchArgs;
}> = ({ result, args }) => {
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);

  // Add horizontal scroll support with mouse wheel
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;

    // Only handle vertical scrolling
    if (e.deltaY === 0) return;

    // Check if container can scroll horizontally
    const canScrollHorizontally = container.scrollWidth > container.clientWidth;
    if (!canScrollHorizontally) return;

    // Always stop propagation first to prevent page scroll interference
    e.stopPropagation();

    // Check scroll position to determine if we should handle the event
    const isAtLeftEdge = container.scrollLeft <= 1; // Small tolerance for edge detection
    const isAtRightEdge = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;

    // Only prevent default if we're not at edges OR if we're scrolling in the direction that would move within bounds
    if (!isAtLeftEdge && !isAtRightEdge) {
      // In middle of scroll area - always handle
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtLeftEdge && e.deltaY > 0) {
      // At left edge, scrolling right - handle it
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtRightEdge && e.deltaY < 0) {
      // At right edge, scrolling left - handle it
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
    // If at edge and scrolling in direction that would go beyond bounds, let the event continue but without propagation
  };

  if (!result) {
    return <SearchLoadingState />;
  }

  const formattedTimeRange =
    {
      day: 'past 24 hours',
      week: 'past week',
      month: 'past month',
      year: 'past year',
    }[result.timeRange] || result.timeRange;

  // Show first 5 results in preview
  const previewResults = result.results.slice(0, 5);

  return (
    <div className="w-full space-y-3 my-4">
      <Accordion type="single" collapsible defaultValue="reddit_search" className="w-full">
        <AccordionItem value="reddit_search" className="border-none">
          <AccordionTrigger
            className={cn(
              'py-3 px-4 rounded-xl hover:no-underline',
              'bg-white dark:bg-neutral-900',
              'border border-neutral-200 dark:border-neutral-800',
              'data-[state=open]:rounded-b-none',
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-900/20">
                  <RedditLogoIcon className="h-3.5 w-3.5 text-orange-500" />
                </div>
                <h2 className="font-medium text-sm">Reddit Results</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full text-xs px-2.5 py-0.5">
                  {result.results.length}
                </Badge>
                {result.results.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSourcesSheetOpen(true);
                    }}
                  >
                    View all
                    <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="p-0">
            <div
              className={cn(
                'p-3 space-y-3',
                'bg-white dark:bg-neutral-900',
                'border-x border-b border-neutral-200 dark:border-neutral-800',
                'rounded-b-xl',
              )}
            >
              {/* Query badges */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar" onWheel={handleWheelScroll}>
                <Badge
                  variant="outline"
                  className="rounded-full text-xs px-3 py-1 shrink-0 bg-neutral-100 dark:bg-neutral-800"
                >
                  <Check className="w-3 h-3 mr-1.5" />
                  {args.query}
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full text-xs px-3 py-1 shrink-0 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
                >
                  {formattedTimeRange}
                </Badge>
              </div>

              {/* Preview results */}
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1" onWheel={handleWheelScroll}>
                {previewResults.map((post, index) => (
                  <a key={index} href={post.url} target="_blank" className="block flex-shrink-0 w-[320px]">
                    <RedditSourceCard result={post} />
                  </a>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Sources Sheet */}
      <RedditSourcesSheet results={result.results} open={sourcesSheetOpen} onOpenChange={setSourcesSheetOpen} />
    </div>
  );
};

export default RedditSearch;
