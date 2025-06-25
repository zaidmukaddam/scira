// /components/reddit-search.tsx
/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Search, ThumbsUp, Check, ArrowUpRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RedditLogo } from '@phosphor-icons/react';

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

// Loading state component
const SearchLoadingState = () => {
  return (
    <div className="w-full space-y-3">
      <Accordion type="single" collapsible defaultValue="search" className="w-full">
        <AccordionItem value="search" className="border-none">
          <AccordionTrigger className="py-3 px-4 bg-white dark:bg-neutral-900 rounded-lg hover:no-underline border border-neutral-200 dark:border-neutral-800 data-[state=open]:rounded-b-none">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-900/20">
                  <RedditLogo className="h-3.5 w-3.5 text-orange-500" />
                </div>
                <h2 className="font-medium text-left text-sm">Reddit Results</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="rounded-full px-2.5 py-0.5 text-xs bg-neutral-100 dark:bg-neutral-800"
                >
                  <Search className="h-2.5 w-2.5 mr-1" />
                  Loading...
                </Badge>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="pt-0 mt-0 border-0 overflow-hidden">
            <div className="py-3 px-4 bg-white dark:bg-neutral-900 rounded-b-lg border border-t-0 border-neutral-200 dark:border-neutral-800">
              {/* Query badge */}
              <div className="flex overflow-x-auto gap-1.5 mb-3 no-scrollbar pb-1">
                <Badge
                  variant="secondary"
                  className="px-2.5 py-1 text-xs rounded-full shrink-0 flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-900 text-neutral-400"
                >
                  <div className="h-2.5 w-2.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Searching Reddit...
                </Badge>
              </div>

              {/* Horizontal scrolling results skeleton */}
              <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1 snap-x snap-mandatory">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-[280px] shrink-0 bg-background rounded-lg border border-border/50 snap-start"
                  >
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-md bg-orange-50 dark:bg-orange-900/20 animate-pulse flex items-center justify-center">
                          <RedditLogo className="h-4 w-4 text-orange-500/30" />
                        </div>
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-md animate-pulse w-3/4" />
                          <div className="h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-md animate-pulse w-1/2" />
                        </div>
                      </div>
                      <div className="space-y-1.5 mb-2">
                        <div className="h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-md animate-pulse w-full" />
                        <div className="h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-md animate-pulse w-5/6" />
                        <div className="h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-md animate-pulse w-4/6" />
                      </div>
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

// Reddit post card component
const ResultCard = ({ result }: { result: RedditResult }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showContent, setShowContent] = useState(false);

  // Format subreddit name
  const formatSubreddit = (subreddit: string) => {
    return subreddit.replace(/^r\//, '').toLowerCase();
  };

  const subreddit = formatSubreddit(result.subreddit);

  // Get a clean content snippet
  const snippet = result.content;

  // Format score display
  const formattedScore = result.score ? (isNaN(result.score) ? '0.0' : result.score.toFixed(1)) : '0.0';

  return (
    <div className="w-[280px] shrink-0 bg-background rounded-lg border border-border/50 transition-all hover:shadow-xs">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative w-8 h-8 rounded-md bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center overflow-hidden">
            {!imageLoaded && <RedditLogo weight="fill" className="h-4 w-4 text-orange-500" />}
            <img
              src={`https://www.reddit.com/r/${subreddit}/favicon.ico`}
              alt=""
              className={cn('w-5 h-5 object-contain', !imageLoaded && 'opacity-0')}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                e.currentTarget.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23FF4500'%3E%3Cpath d='M10 0C4.478 0 0 4.478 0 10c0 5.523 4.478 10 10 10 5.523 0 10-4.477 10-10 0-5.522-4.477-10-10-10zm5.7 11.1c.1.1.1.1.1.2s0 .1-.1.2c-.599.901-1.899 1.4-3.6 1.4-1.3 0-2.5-.3-3.4-.9-.1-.1-.3-.1-.5-.2-.1 0-.1 0-.1-.1s-.1-.1-.1-.1c-.1-.1-.1-.1-.1-.2s0-.1.1-.2c.1-.1.2-.1.3-.1h.1c.9.5 2 .8 3.2.8 1.3 0 2.4-.3 3.3-.9h.1c.102-.1.202-.1.302-.1.099 0 .198 0 .298.1zm-9.6-2.3c0-.9.7-1.6 1.6-1.6.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6-.9 0-1.6-.7-1.6-1.6zm6.8 0c0-.9.7-1.6 1.6-1.6.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6-.9 0-1.6-.7-1.6-1.6z'/%3E%3C/svg%3E";
                setImageLoaded(true);
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-1">{result.title}</h3>
            <div className="flex items-center gap-1">
              <Badge
                variant="secondary"
                className="px-1.5 py-0 text-[10px] rounded-sm bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100"
              >
                r/{subreddit}
              </Badge>
              {result.score !== undefined && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <ThumbsUp className="h-2.5 w-2.5" />
                  {formattedScore}
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground line-clamp-3 mb-2">{snippet}</p>

        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-xs gap-0.5 font-medium text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 transition-colors"
        >
          Read on Reddit
          <ArrowUpRight className="h-3 w-3" />
        </a>

        {result.published_date && (
          <div className="pt-1 border-t border-neutral-200 dark:border-neutral-700 mt-2">
            <time className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3 w-3 shrink-0" />
              {new Date(result.published_date).toLocaleDateString()}
            </time>
          </div>
        )}
      </div>
    </div>
  );
};

// Main component
const RedditSearch: React.FC<{
  result: RedditSearchResponse;
  args: RedditSearchArgs;
}> = ({ result, args }) => {
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

  return (
    <div className="w-full space-y-3 my-4">
      <Accordion type="single" collapsible defaultValue="reddit_search" className="w-full">
        <AccordionItem value="reddit_search" className="border-none">
          <AccordionTrigger className="py-3 px-4 bg-white dark:bg-neutral-900 rounded-lg hover:no-underline border border-neutral-200 dark:border-neutral-800 data-[state=open]:rounded-b-none">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-orange-50 dark:bg-orange-900/20">
                  <RedditLogo className="h-3.5 w-3.5 text-orange-500" />
                </div>
                <h2 className="font-medium text-left text-sm">Reddit Results</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="rounded-full px-2.5 py-0.5 text-xs bg-neutral-100 dark:bg-neutral-800"
                >
                  <Search className="h-2.5 w-2.5 mr-1" />
                  {result.results.length} Results
                </Badge>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="pt-0 mt-0 border-0 overflow-hidden">
            <div className="py-3 px-4 bg-white dark:bg-neutral-900 rounded-b-lg border border-t-0 border-neutral-200 dark:border-neutral-800">
              {/* Query badge */}
              <div className="flex overflow-x-auto gap-1.5 mb-3 no-scrollbar pb-1">
                <Badge
                  variant="secondary"
                  className="px-2.5 py-1 text-xs rounded-full shrink-0 flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800"
                >
                  <Check className="h-2.5 w-2.5" />
                  {args.query}
                </Badge>
                <Badge
                  variant="secondary"
                  className="px-2.5 py-1 text-xs rounded-full shrink-0 flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
                >
                  {formattedTimeRange}
                </Badge>
              </div>
              <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1 snap-x snap-mandatory">
                {result.results.map((post, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="snap-start"
                  >
                    <ResultCard result={post} />
                  </motion.div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default RedditSearch;
