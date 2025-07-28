'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { User2, YoutubeIcon, PlayIcon, Eye, ThumbsUp, Search, Clock, FileText, X, Calendar } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  publishedDate?: string;
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
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [chapterSearch, setChapterSearch] = useState('');

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

  // Parse captions properly
  const parsedCaptions = parseCaptions(video?.captions);

  // Filter transcript based on search
  const filteredTranscript = useMemo(() => {
    if (!parsedCaptions || !transcriptSearch.trim()) return parsedCaptions;

    const searchTerm = transcriptSearch.toLowerCase();
    const lines = parsedCaptions.split('\n');

    return lines.filter((line) => line.toLowerCase().includes(searchTerm)).join('\n');
  }, [parsedCaptions, transcriptSearch]);

  // Filter chapters based on search (both time and content)
  const filteredChapters = useMemo(() => {
    if (!video?.timestamps || !chapterSearch.trim()) return video?.timestamps || [];

    const searchTerm = chapterSearch.toLowerCase();
    return video.timestamps.filter((timestamp: string) => {
      const { time, description } = formatTimestamp(timestamp);
      return time.toLowerCase().includes(searchTerm) || description.toLowerCase().includes(searchTerm);
    });
  }, [video?.timestamps, chapterSearch]);

  if (!video) return null;

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
      className="w-[280px] h-[300px] rounded-lg border dark:border-neutral-800 border-neutral-200 overflow-hidden bg-white dark:bg-neutral-900 shadow-xs hover:shadow-md transition-shadow duration-200 relative mr-4"
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
      <div className="p-3 pb-16">
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
              className="flex items-center gap-2 group mt-2 w-fit"
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

          {/* Published Date */}
          {video.publishedDate && (
            <div className="flex items-center gap-1.5 mt-2">
              <Calendar className="h-3 w-3 text-neutral-400" />
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {new Date(video.publishedDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* Stats */}
          {(video.views || video.likes) && (
            <div className="flex items-center gap-3 mt-2">
              {video.views && (
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3 w-3 text-neutral-400" />
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{formatViewCount(video.views)}</span>
                </div>
              )}
              {video.likes && (
                <div className="flex items-center gap-1.5">
                  <ThumbsUp className="h-3 w-3 text-neutral-400" />
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">{formatLikeCount(video.likes)}</span>
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {video.summary && (
            <div className="text-xs bg-neutral-50 dark:bg-neutral-800 p-2 rounded border dark:border-neutral-700 mt-3">
              <div className="flex items-baseline gap-2 mb-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-0.5"></div>
                <span className="font-medium text-neutral-700 dark:text-neutral-300">Summary</span>
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">{video.summary}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {((video.timestamps && video.timestamps?.length > 0) || parsedCaptions) && (
          <div className="absolute bottom-3 left-3 right-3 flex gap-2">
            {/* Timestamps Dialog */}
            {video.timestamps && video.timestamps.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1.5 border-neutral-200 dark:border-neutral-700 hover:border-red-300 dark:hover:border-red-600"
                  >
                    <Clock className="h-3 w-3" />
                    Chapters ({video.timestamps.length})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                      <Clock className="h-4 w-4 text-red-500" />
                      Video Chapters
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                        <Input
                          value={chapterSearch}
                          onChange={(e) => setChapterSearch(e.target.value)}
                          placeholder="Search chapters by time or content..."
                          className="pl-9 border-neutral-200 dark:border-neutral-700 focus:border-red-300 dark:focus:border-red-600"
                        />
                      </div>
                      {chapterSearch && (
                        <Button onClick={() => setChapterSearch('')} variant="outline" size="sm" className="px-3">
                          Clear
                        </Button>
                      )}
                    </div>

                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      {chapterSearch.trim()
                        ? `${filteredChapters.length} of ${video.timestamps?.length || 0} chapters found`
                        : 'Search by time (e.g., "1:30") or content to find specific moments'}
                    </div>

                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-2">
                        {(chapterSearch.trim() ? filteredChapters : video.timestamps || [])
                          .map((timestamp: string, i: number) => {
                            const { time, description } = formatTimestamp(timestamp);
                            const seconds = timestampToSeconds(time);

                            if (!time || seconds === 0) return null;

                            return (
                              <Link
                                key={i}
                                href={`${video.url}&t=${seconds}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-start gap-4 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-red-300 dark:hover:border-red-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all duration-200"
                              >
                                <div className="flex items-center justify-center min-w-[60px] h-8 bg-neutral-100 dark:bg-neutral-800 rounded font-mono text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:bg-red-50 dark:group-hover:bg-red-950/30 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                  {chapterSearch.trim() && time.toLowerCase().includes(chapterSearch.toLowerCase())
                                    ? (() => {
                                        const searchTerm = chapterSearch.toLowerCase();
                                        const lowerTime = time.toLowerCase();
                                        const index = lowerTime.indexOf(searchTerm);

                                        if (index !== -1) {
                                          return (
                                            <>
                                              {time.substring(0, index)}
                                              <mark className="bg-yellow-200 dark:bg-yellow-900/50 px-1 py-0.5 rounded">
                                                {time.substring(index, index + searchTerm.length)}
                                              </mark>
                                              {time.substring(index + searchTerm.length)}
                                            </>
                                          );
                                        }
                                        return time;
                                      })()
                                    : time}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed group-hover:text-neutral-900 dark:group-hover:text-neutral-100">
                                    {chapterSearch.trim()
                                      ? (() => {
                                          const searchTerm = chapterSearch.toLowerCase();
                                          const lowerDescription = description.toLowerCase();
                                          const index = lowerDescription.indexOf(searchTerm);

                                          if (index !== -1) {
                                            return (
                                              <>
                                                {description.substring(0, index)}
                                                <mark className="bg-yellow-200 dark:bg-yellow-900/50 px-1 py-0.5 rounded">
                                                  {description.substring(index, index + searchTerm.length)}
                                                </mark>
                                                {description.substring(index + searchTerm.length)}
                                              </>
                                            );
                                          }
                                          return description;
                                        })()
                                      : description}
                                  </p>
                                </div>
                              </Link>
                            );
                          })
                          .filter(Boolean)}
                        {chapterSearch.trim() && filteredChapters.length === 0 && (
                          <div className="text-center py-8 text-neutral-500">
                            No chapters found for &quot;{chapterSearch}&quot;
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Transcript Dialog */}
            {parsedCaptions && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1.5 border-neutral-200 dark:border-neutral-700 hover:border-red-300 dark:hover:border-red-600"
                  >
                    <FileText className="h-3 w-3" />
                    Transcript
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                      <FileText className="h-4 w-4 text-red-500" />
                      Video Transcript
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                        <Input
                          value={transcriptSearch}
                          onChange={(e) => setTranscriptSearch(e.target.value)}
                          placeholder="Search transcript..."
                          className="pl-9 border-neutral-200 dark:border-neutral-700 focus:border-red-300 dark:focus:border-red-600 focus:!outline-0 focus:!ring-0"
                        />
                      </div>
                      {transcriptSearch && (
                        <Button onClick={() => setTranscriptSearch('')} variant="outline" size="sm" className="px-3">
                          Clear
                        </Button>
                      )}
                    </div>

                    <ScrollArea className="h-[400px]">
                      <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-4 text-sm leading-relaxed">
                        {transcriptSearch.trim() ? (
                          filteredTranscript ? (
                            <div className="space-y-3">
                              {filteredTranscript.split('\n').map((line, idx) => {
                                if (!line.trim()) return null;
                                const searchTerm = transcriptSearch.toLowerCase();
                                const lowerLine = line.toLowerCase();
                                const index = lowerLine.indexOf(searchTerm);

                                if (index === -1) return null;

                                return (
                                  <div
                                    key={idx}
                                    className="p-2 bg-white dark:bg-neutral-800 rounded border dark:border-neutral-700"
                                  >
                                    <span className="text-neutral-600 dark:text-neutral-400">
                                      {line.substring(0, index)}
                                    </span>
                                    <mark className="bg-yellow-200 dark:bg-yellow-900/50 px-1 py-0.5 rounded">
                                      {line.substring(index, index + searchTerm.length)}
                                    </mark>
                                    <span className="text-neutral-600 dark:text-neutral-400">
                                      {line.substring(index + searchTerm.length)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-neutral-500">
                              No matches found for &quot;{transcriptSearch}&quot;
                            </div>
                          )
                        ) : (
                          <p className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">{parsedCaptions}</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            )}
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
                <div className="flex pl-4">
                  {filteredVideos.map((video, index) => (
                    <div key={video.videoId} className="last:mr-12">
                      <MemoizedYouTubeCard video={video} index={index} />
                    </div>
                  ))}
                </div>
                {filteredVideos.length > 3 && (
                  <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-neutral-900 to-transparent pointer-events-none" />
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

// Export types for external use
export type { VideoDetails, VideoResult, YouTubeSearchResponse, YouTubeSearchResultsProps };
