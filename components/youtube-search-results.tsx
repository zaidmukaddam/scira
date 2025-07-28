'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { User2, YoutubeIcon, PlayIcon, Eye, ThumbsUp } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SearchLoadingState } from './tool-invocation-list-view';

// Helper function to parse captions that might be JSON-encoded
const parseCaptions = (captions: string | undefined): string | undefined => {
  if (!captions) return undefined;

  try {
    // Try to parse as JSON in case the API returns nested JSON
    const parsed = JSON.parse(captions);
    return parsed.captions || captions;
  } catch {
    // If parsing fails, return the raw text
    return captions;
  }
};

// Updated interfaces to match the optimized tool output
interface VideoDetails {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  type?: string;
  provider_name?: string;
  provider_url?: string;
}

interface VideoResult {
  videoId: string;
  url: string;
  details?: VideoDetails;
  captions?: string;
  timestamps?: string[];
  views?: string;
  likes?: string;
  summary?: string;
}

interface YouTubeSearchResponse {
  results: VideoResult[];
}

interface YouTubeCardProps {
  video: VideoResult;
  index: number;
}

interface YouTubeSearchResultsProps {
  results: YouTubeSearchResponse;
  isLoading?: boolean;
}

const YouTubeCard: React.FC<YouTubeCardProps> = ({ video, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!video) return null;

  // Parse captions properly
  const parsedCaptions = parseCaptions(video.captions);

  // Format timestamp for accessibility and URL generation
  const formatTimestamp = (timestamp: string) => {
    console.log(`🕐 Parsing timestamp: "${timestamp}"`);
    // Match the format: "0:06 - [Music]" or "0:10 - good morning gamers"
    const match = timestamp.match(/^(\d+:\d+(?::\d+)?) - (.+)$/);
    if (match) {
      const [_, time, description] = match;
      console.log(`✅ Parsed timestamp - time: "${time}", description: "${description}"`);
      return { time, description };
    }
    console.warn(`⚠️ Failed to parse timestamp: "${timestamp}"`);
    return { time: '', description: timestamp };
  };

  // Convert timestamp to seconds for YouTube URL
  const timestampToSeconds = (time: string): number => {
    console.log(`⏱️ Converting time to seconds: "${time}"`);
    const parts = time.split(':').map((part) => parseInt(part, 10));
    let seconds = 0;

    if (parts.length === 2) {
      // MM:SS format (e.g., "0:06" or "10:30")
      seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      // HH:MM:SS format (e.g., "1:10:30")
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    console.log(`📊 Time "${time}" converted to ${seconds} seconds`);
    return seconds;
  };

  // Format view count
  const formatViewCount = (views: string): string => {
    const num = parseInt(views.replace(/[^0-9]/g, ''), 10);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M views`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K views`;
    }
    return `${num} views`;
  };

  // Format like count
  const formatLikeCount = (likes: string): string => {
    const num = parseInt(likes.replace(/[^0-9]/g, ''), 10);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return likes;
  };

  return (
    <div
      className="w-[280px] shrink-0 rounded-lg border dark:border-neutral-800 border-neutral-200 overflow-hidden bg-white dark:bg-neutral-900 shadow-xs hover:shadow-md transition-shadow duration-200"
      onTouchStart={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Video Thumbnail */}
      <Link
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative aspect-video block bg-neutral-100 dark:bg-neutral-800 overflow-hidden"
        aria-label={`Watch ${video.details?.title || 'YouTube video'}`}
      >
        {video.details?.thumbnail_url ? (
          <img
            src={video.details.thumbnail_url}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <YoutubeIcon className="h-8 w-8 text-red-500" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="absolute bottom-2 left-2 right-2 text-white text-xs font-medium line-clamp-2">
            {video.details?.title || 'YouTube Video'}
          </div>
          <div className="rounded-full bg-white/90 p-2">
            <PlayIcon className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </Link>

      {/* Video Info */}
      <div className="p-3 flex flex-col gap-2">
        <div>
          <Link
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium line-clamp-2 hover:text-red-500 transition-colors dark:text-neutral-100"
          >
            {video.details?.title || 'YouTube Video'}
          </Link>

          {/* Channel Info */}
          {video.details?.author_name && (
            <Link
              href={video.details.author_url || video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 group mt-1.5 w-fit"
              aria-label={`Channel: ${video.details.author_name}`}
            >
              <div className="h-5 w-5 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center shrink-0">
                <User2 className="h-3 w-3 text-red-500" />
              </div>
              <span className="text-xs text-neutral-600 dark:text-neutral-400 group-hover:text-red-500 transition-colors truncate">
                {video.details.author_name}
              </span>
            </Link>
          )}

          {/* Stats */}
          {(video.views || video.likes) && (
            <div className="flex items-center gap-3 mt-1.5">
              {video.views && (
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3 text-neutral-400" />
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{formatViewCount(video.views)}</span>
                </div>
              )}
              {video.likes && (
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3 text-neutral-400" />
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{formatLikeCount(video.likes)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expandable Content */}
        {((video.timestamps && video.timestamps?.length > 0) || parsedCaptions || video.summary) && (
          <div className="mt-1">
            <Accordion type="single" collapsible>
              <AccordionItem value="details" className="border-none">
                <AccordionTrigger className="py-1 hover:no-underline" onClick={() => setIsExpanded(!isExpanded)}>
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400">
                    {isExpanded ? 'Hide details' : 'Show details'}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {/* Summary */}
                  {video.summary && (
                    <div className="mb-3 space-y-1.5">
                      <h4 className="text-xs font-semibold dark:text-neutral-300 text-neutral-700">Summary</h4>
                      <div className="text-xs dark:text-neutral-400 text-neutral-600 rounded bg-neutral-50 dark:bg-neutral-800 p-2">
                        <p className="whitespace-pre-wrap">{video.summary}</p>
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  {video.timestamps && video.timestamps.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      <h4 className="text-xs font-semibold dark:text-neutral-300 text-neutral-700">Key Moments</h4>
                      <ScrollArea className="h-[120px]">
                        <div className="pr-4">
                          {video.timestamps
                            .map((timestamp: string, i: number) => {
                              console.log(`🎬 Processing timestamp ${i}: "${timestamp}"`);
                              const { time, description } = formatTimestamp(timestamp);
                              const seconds = timestampToSeconds(time);

                              // Skip invalid timestamps
                              if (!time || seconds === 0) {
                                console.warn(`⚠️ Skipping invalid timestamp: "${timestamp}"`);
                                return null;
                              }

                              return (
                                <Link
                                  key={i}
                                  href={`${video.url}&t=${seconds}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-start gap-2 py-1 px-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                  title={`Jump to ${time}: ${description}`}
                                >
                                  <span className="text-xs font-medium text-red-500 whitespace-nowrap">{time}</span>
                                  <span className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2">
                                    {description}
                                  </span>
                                </Link>
                              );
                            })
                            .filter(Boolean)}
                        </div>
                      </ScrollArea>
                    </div>
                  )}

                  {/* Captions/Transcript */}
                  {parsedCaptions && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold dark:text-neutral-300 text-neutral-700">Transcript</h4>
                      <ScrollArea className="h-[120px]">
                        <div className="text-xs dark:text-neutral-400 text-neutral-600 rounded bg-neutral-50 dark:bg-neutral-800 p-2">
                          <p className="whitespace-pre-wrap">{parsedCaptions}</p>
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </div>
    </div>
  );
};

// Memoized YouTube Card for performance
const MemoizedYouTubeCard = React.memo(YouTubeCard, (prevProps, nextProps) => {
  return (
    prevProps.video.videoId === nextProps.video.videoId &&
    prevProps.index === nextProps.index &&
    prevProps.video.url === nextProps.video.url &&
    JSON.stringify(prevProps.video.details) === JSON.stringify(nextProps.video.details) &&
    prevProps.video.views === nextProps.video.views &&
    prevProps.video.likes === nextProps.video.likes
  );
});

MemoizedYouTubeCard.displayName = 'MemoizedYouTubeCard';

// Loading component

// Empty state component
const YouTubeEmptyState: React.FC = () => (
  <div className="rounded-xl overflow-hidden border dark:border-neutral-800 border-neutral-200 bg-white dark:bg-neutral-900 shadow-xs p-4 text-center">
    <div className="flex flex-col items-center gap-3 py-6">
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/30">
        <YoutubeIcon className="h-6 w-6 text-red-600" />
      </div>
      <div className="text-center">
        <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100 mb-1">No Content Available</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          The videos found don&apos;t contain any timestamps, transcripts, or summaries.
        </p>
      </div>
    </div>
  </div>
);

// Main YouTube Search Results Component
export const YouTubeSearchResults: React.FC<YouTubeSearchResultsProps> = ({ results, isLoading = false }) => {
  if (isLoading) {
    return <SearchLoadingState icon={YoutubeIcon} text="Searching YouTube" color="red" />;
  }

  if (!results || !results.results || !Array.isArray(results.results)) {
    return <YouTubeEmptyState />;
  }

  // Filter out videos with no meaningful content - using parseCaptions for proper filtering
  const filteredVideos = results.results.filter((video) => {
    if (!video) return false;

    const hasTimestamps = video.timestamps && Array.isArray(video.timestamps) && video.timestamps.length > 0;
    const hasCaptions =
      video.captions &&
      (typeof video.captions === 'string' ? video.captions.trim().length > 0 : !!parseCaptions(video.captions));
    const hasSummary = video.summary && typeof video.summary === 'string' && video.summary.trim().length > 0;

    return hasTimestamps || hasCaptions || hasSummary;
  });

  console.log(`📊 YouTube Results Summary:`, {
    totalResults: results.results.length,
    filteredResults: filteredVideos.length,
    videoIds: filteredVideos.map((v) => v.videoId),
  });

  // Debug each video's content
  results.results.forEach((video, index) => {
    if (!video) return;

    const hasTimestamps = video.timestamps && Array.isArray(video.timestamps) && video.timestamps.length > 0;
    const hasCaptions =
      video.captions &&
      (typeof video.captions === 'string' ? video.captions.trim().length > 0 : !!parseCaptions(video.captions));
    const hasSummary = video.summary && typeof video.summary === 'string' && video.summary.trim().length > 0;

    console.log(`🎥 Video ${index + 1} (${video.videoId}):`, {
      title: video.details?.title?.substring(0, 50) + '...',
      hasTimestamps,
      timestampCount: Array.isArray(video.timestamps) ? video.timestamps.length : 0,
      hasCaptions,
      captionsLength:
        typeof video.captions === 'string' ? video.captions.length : parseCaptions(video.captions)?.length || 0,
      hasSummary,
      captionsType: typeof video.captions,
      timestampsType: typeof video.timestamps,
      rawCaptions: video.captions
        ? typeof video.captions === 'string'
          ? video.captions.substring(0, 100) + '...'
          : 'NOT STRING'
        : 'NULL',
      rawTimestamps: Array.isArray(video.timestamps) ? video.timestamps.slice(0, 2) : video.timestamps,
      willShowInUI: hasTimestamps || hasCaptions || hasSummary,
    });

    if (hasTimestamps && video.timestamps) {
      console.log(`📝 Sample timestamps for ${video.videoId}:`, video.timestamps.slice(0, 3));
    }
  });

  if (filteredVideos.length === 0) {
    return <YouTubeEmptyState />;
  }

  return (
    <div className="w-full my-4">
      <Accordion type="single" collapsible defaultValue="videos">
        <AccordionItem
          value="videos"
          className="border dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 shadow-xs"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-9 w-9 rounded-full bg-red-50 dark:bg-red-950/30">
                <YoutubeIcon className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100 text-left">
                  YouTube Results
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant="secondary"
                    className="px-2 py-0 h-5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                  >
                    {filteredVideos.length} videos with content
                  </Badge>
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="relative">
              <div className="w-full overflow-x-scroll">
                <div className="flex gap-3 p-4">
                  {filteredVideos.map((video, index) => (
                    <MemoizedYouTubeCard key={video.videoId} video={video} index={index} />
                  ))}
                </div>
              </div>
              {filteredVideos.length > 3 && (
                <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white dark:from-neutral-900 to-transparent pointer-events-none" />
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

// Export types for external use
export type { VideoDetails, VideoResult, YouTubeSearchResponse, YouTubeSearchResultsProps };
