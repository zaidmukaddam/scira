'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

// Transcript chunk type from Supadata
interface TranscriptChunk {
  text: string;
  offset: number;
  duration: number;
  lang: string;
}

// Custom Icons
const Icons = {
  YouTube: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
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
  Eye: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  ThumbsUp: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  ),
  Clock: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  FileText: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Search: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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
  Play: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  User: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

interface VideoDetails {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  type?: string;
  provider_name?: string;
  provider_url?: string;
  author_avatar_url?: string;
}

interface VideoStats {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}

interface VideoResult {
  videoId: string;
  url: string;
  details?: VideoDetails;
  captions?: string;
  transcriptChunks?: TranscriptChunk[];
  timestamps?: string[];
  views?: number | string;
  likes?: number | string;
  summary?: string;
  publishedDate?: string;
  durationSeconds?: number;
  stats?: VideoStats;
  tags?: string[];
}

interface YouTubeSearchResponse {
  results: VideoResult[];
}

interface YouTubeSearchResultsProps {
  results: YouTubeSearchResponse;
  isLoading?: boolean;
}

// Helper functions
const formatDuration = (durationSeconds?: number): string | null => {
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return null;
  }
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = Math.floor(durationSeconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
};

const formatCount = (value?: string | number): string | null => {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(/[^0-9]/g, '')) : undefined;
  if (num == null || !Number.isFinite(num)) return null;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
};

const formatTimestamp = (timestamp: string) => {
  const match = timestamp.match(/^(\d+:\d+(?::\d+)?) - (.+)$/);
  if (match) {
    const [, time, description] = match;
    return { time, description };
  }
  return { time: '', description: timestamp };
};

const timestampToSeconds = (time: string): number => {
  const parts = time.split(':').map((part) => parseInt(part, 10));
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};

// Video Card Component
const YouTubeVideoCard: React.FC<{
  video: VideoResult;
  onClick?: () => void;
}> = ({ video, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const durationLabel = formatDuration(video.durationSeconds);
  const viewCount = formatCount(video.stats?.views ?? video.views);
  const likeCount = formatCount(video.stats?.likes ?? video.likes);

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
      <div className="flex items-start gap-2.5">
        {/* Thumbnail */}
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative w-20 h-[45px] shrink-0 rounded-md overflow-hidden bg-muted/30"
          onClick={(e) => e.stopPropagation()}
        >
          {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-muted/20" />}
          {video.details?.thumbnail_url ? (
            <img
              src={video.details.thumbnail_url}
              alt=""
              className={cn('w-full h-full object-cover', !imageLoaded && 'opacity-0')}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                setImageLoaded(true);
                e.currentTarget.src = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icons.YouTube className="h-4 w-4 text-red-500/40" />
            </div>
          )}
          {durationLabel && (
            <span className="absolute bottom-0.5 right-0.5 px-1 py-px rounded-sm bg-black/80 text-white text-[8px] font-medium tabular-nums">
              {durationLabel}
            </span>
          )}
        </a>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-foreground line-clamp-1 hover:text-red-600 transition-colors flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              {video.details?.title || 'YouTube Video'}
            </a>
            <Icons.ArrowUpRight className="w-2.5 h-2.5 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground/60">
            {video.details?.author_name && (
              <span className="truncate max-w-[100px]">{video.details.author_name}</span>
            )}
            {video.details?.author_name && viewCount && <span className="text-muted-foreground/30">·</span>}
            {viewCount && <span className="tabular-nums">{viewCount} views</span>}
            {viewCount && likeCount && <span className="text-muted-foreground/30">·</span>}
            {likeCount && <span className="tabular-nums">{likeCount}</span>}
            {(viewCount || likeCount) && video.publishedDate && <span className="text-muted-foreground/30">·</span>}
            {video.publishedDate && (
              <span className="tabular-nums">
                {new Date(video.publishedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            {video.timestamps && video.timestamps.length > 0 && (
              <span className="font-pixel text-[8px] text-red-600 dark:text-red-400 uppercase tracking-wider bg-red-500/10 px-1.5 py-0.5 rounded">
                {video.timestamps.length} chapters
              </span>
            )}
            {video.captions && (
              <span className="font-pixel text-[8px] text-muted-foreground/50 uppercase tracking-wider bg-muted/30 px-1.5 py-0.5 rounded">
                Transcript
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Video Detail Sheet/Drawer Content
const VideoDetailContent: React.FC<{
  video: VideoResult;
}> = ({ video }) => {
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [chapterSearch, setChapterSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'chapters' | 'transcript'>('chapters');

  const filteredTranscript = useMemo(() => {
    if (!video.captions || !transcriptSearch.trim()) return video.captions;
    const searchTerm = transcriptSearch.toLowerCase();
    const lines = video.captions.split('\n');
    return lines.filter((line) => line.toLowerCase().includes(searchTerm)).join('\n');
  }, [video.captions, transcriptSearch]);

  const filteredChapters = useMemo(() => {
    if (!video.timestamps || !chapterSearch.trim()) return video.timestamps || [];
    const searchTerm = chapterSearch.toLowerCase();
    return video.timestamps.filter((timestamp: string) => {
      const { time, description } = formatTimestamp(timestamp);
      return time.toLowerCase().includes(searchTerm) || description.toLowerCase().includes(searchTerm);
    });
  }, [video.timestamps, chapterSearch]);

  const hasChapters = video.timestamps && video.timestamps.length > 0;
  const hasTranscript = !!video.captions;

  return (
    <div className="flex flex-col h-full">
      {/* Video Info Header */}
      <div className="px-4 py-3 border-b border-border space-y-3">
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative aspect-video w-full max-w-sm mx-auto rounded-lg overflow-hidden bg-muted"
        >
          {video.details?.thumbnail_url ? (
            <img src={video.details.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icons.YouTube className="h-12 w-12 text-red-500/50" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
            <div className="rounded-full bg-red-600 p-3">
              <Icons.Play className="h-6 w-6 text-white" />
            </div>
          </div>
          {video.durationSeconds && (
            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-xs font-medium">
              {formatDuration(video.durationSeconds)}
            </span>
          )}
        </a>

        <div>
          <h3 className="font-semibold text-sm text-foreground line-clamp-2">{video.details?.title || 'YouTube Video'}</h3>
          {video.details?.author_name && (
            <a
              href={video.details.author_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {video.details.author_name}
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      {(hasChapters || hasTranscript) && (
        <div className="flex border-b border-border">
          {hasChapters && (
            <button
              onClick={() => setActiveTab('chapters')}
              className={cn(
                'flex-1 px-4 py-2.5 text-xs font-medium transition-colors',
                activeTab === 'chapters'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Chapters ({video.timestamps?.length})
            </button>
          )}
          {hasTranscript && (
            <button
              onClick={() => setActiveTab('transcript')}
              className={cn(
                'flex-1 px-4 py-2.5 text-xs font-medium transition-colors',
                activeTab === 'transcript'
                  ? 'text-red-600 border-b-2 border-red-600'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Transcript
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chapters' && hasChapters && (
          <div className="p-3 space-y-2">
            <div className="relative">
              <Icons.Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                placeholder="Search chapters..."
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              {(chapterSearch.trim() ? filteredChapters : video.timestamps || []).map((timestamp: string, i: number) => {
                const { time, description } = formatTimestamp(timestamp);
                const seconds = timestampToSeconds(time);
                if (!time || seconds === 0) return null;

                return (
                  <a
                    key={i}
                    href={`${video.url}&t=${seconds}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-2 rounded-md hover:bg-accent transition-colors"
                  >
                    <span className="shrink-0 w-12 text-center text-[11px] font-mono font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded px-1.5 py-0.5">
                      {time}
                    </span>
                    <span className="text-xs text-foreground line-clamp-1 flex-1">{description}</span>
                  </a>
                );
              })}
              {chapterSearch.trim() && filteredChapters.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-4">No chapters found</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transcript' && hasTranscript && (
          <div className="p-3 space-y-2">
            <div className="relative">
              <Icons.Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={transcriptSearch}
                onChange={(e) => setTranscriptSearch(e.target.value)}
                placeholder="Search transcript..."
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="bg-muted/50 rounded-md p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap max-h-80 overflow-y-auto">
              {transcriptSearch.trim() ? (
                filteredTranscript ? (
                  filteredTranscript.split('\n').map((line, idx) => {
                    if (!line.trim()) return null;
                    const searchTerm = transcriptSearch.toLowerCase();
                    const lowerLine = line.toLowerCase();
                    const index = lowerLine.indexOf(searchTerm);
                    if (index === -1) return null;

                    return (
                      <div key={idx} className="mb-2 p-1.5 bg-background rounded">
                        <span>{line.substring(0, index)}</span>
                        <mark className="bg-yellow-200 dark:bg-yellow-900/50 px-0.5 rounded">
                          {line.substring(index, index + searchTerm.length)}
                        </mark>
                        <span>{line.substring(index + searchTerm.length)}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center py-4">No matches found</p>
                )
              ) : (
                video.captions
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Sources Sheet Component
const YouTubeSourcesSheet: React.FC<{
  videos: VideoResult[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ videos, open, onOpenChange }) => {
  const isMobile = useIsMobile();
  const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(null);

  const SheetWrapper = isMobile ? Drawer : Sheet;
  const SheetContentWrapper = isMobile ? DrawerContent : SheetContent;

  return (
    <SheetWrapper open={open} onOpenChange={onOpenChange}>
      <SheetContentWrapper className={cn(isMobile ? 'h-[85vh]' : 'w-[580px] sm:max-w-[580px]', 'p-0')}>
        {selectedVideo ? (
          <div className="flex flex-col h-full">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
            </div>
            <VideoDetailContent video={selectedVideo} />
          </div>
        ) : (
          <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/40">
              <div className="flex items-center gap-2 mb-0.5">
                <Icons.YouTube className="h-3.5 w-3.5 text-red-500" />
                <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">YouTube</span>
              </div>
              <p className="text-xs text-muted-foreground">{videos.length} videos with content</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/20">
              {videos.map((video, index) => (
                <YouTubeVideoCard key={video.videoId || index} video={video} onClick={() => setSelectedVideo(video)} />
              ))}
            </div>
          </div>
        )}
      </SheetContentWrapper>
    </SheetWrapper>
  );
};

// Loading state component
const YouTubeLoadingState: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="w-full my-3">
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card/30">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icons.YouTube className="h-3.5 w-3.5 text-red-500" />
            <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">YouTube</span>
          </div>
          <div className="flex items-center gap-2">
            <Spinner className="w-3 h-3 text-muted-foreground/40" />
            <Icons.ChevronDown
              className={cn('h-3 w-3 text-muted-foreground/60 transition-transform duration-200', isExpanded && 'rotate-180')}
            />
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-border/40">
            <div className="px-3.5 py-2 border-b border-border/30">
              <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Spinner className="w-2.5 h-2.5" />
                <span className="font-medium">Searching YouTube...</span>
              </span>
            </div>

            <div className="divide-y divide-border/20">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="px-3.5 py-2 flex items-start gap-2.5">
                  <div className="w-20 h-[45px] rounded-md bg-muted/20 animate-pulse shrink-0 flex items-center justify-center" style={{ animationDelay: `${i * 100}ms` }}>
                    <Icons.YouTube className="h-3.5 w-3.5 text-red-500/15" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-muted/30 rounded animate-pulse w-3/4" style={{ animationDelay: `${i * 100 + 50}ms` }} />
                    <div className="h-2 bg-muted/20 rounded animate-pulse w-1/2" style={{ animationDelay: `${i * 100 + 80}ms` }} />
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

// Main YouTube Search Results Component
export const YouTubeSearchResults: React.FC<YouTubeSearchResultsProps> = ({ results, isLoading = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);

  if (isLoading) {
    return <YouTubeLoadingState />;
  }

  if (!results || !results.results || !Array.isArray(results.results)) {
    return null;
  }

  // Filter videos with meaningful content
  const filteredVideos = results.results.filter((video) => {
    if (!video) return false;
    const hasTimestamps = video.timestamps && Array.isArray(video.timestamps) && video.timestamps.length > 0;
    const hasCaptions = video.captions && typeof video.captions === 'string' && video.captions.trim().length > 0;
    const hasSummary = video.summary && typeof video.summary === 'string' && video.summary.trim().length > 0;
    return hasTimestamps || hasCaptions || hasSummary;
  });

  if (filteredVideos.length === 0) {
    return null;
  }

  const totalResults = filteredVideos.length;

  return (
    <div className="w-full my-3">
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card/30">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icons.YouTube className="h-3.5 w-3.5 text-red-500" />
            <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">YouTube</span>
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
              className={cn('h-3 w-3 text-muted-foreground/60 transition-transform duration-200', isExpanded && 'rotate-180')}
            />
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-border/40">
            <div className="max-h-80 overflow-y-auto divide-y divide-border/20">
              {filteredVideos.slice(0, 5).map((video, index) => (
                <a
                  key={video.videoId || index}
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <YouTubeVideoCard video={video} />
                </a>
              ))}
              {filteredVideos.length > 5 && (
                <button
                  onClick={() => setSourcesSheetOpen(true)}
                  className="w-full py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-colors"
                >
                  View all {filteredVideos.length} videos
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <YouTubeSourcesSheet videos={filteredVideos} open={sourcesSheetOpen} onOpenChange={setSourcesSheetOpen} />
    </div>
  );
};

// Export types for external use
export type { VideoDetails, VideoResult, VideoStats, YouTubeSearchResponse, YouTubeSearchResultsProps, TranscriptChunk };
