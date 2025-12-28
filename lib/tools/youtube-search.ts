import { Supadata } from '@supadata/js';
import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';
import { getSubtitles, getVideoDetails } from 'youtube-caption-extractor';

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
  timestamps?: string[];
  views?: number | string;
  likes?: number | string;
  summary?: string;
  publishedDate?: string;
  durationSeconds?: number;
  stats?: VideoStats;
  tags?: string[];
}

interface SubtitleFragment {
  start: string; // seconds as string from API
  dur: string; // seconds as string from API
  text: string;
}

type TimeRange = 'day' | 'week' | 'month' | 'year' | 'anytime';

interface SupadataYouTubeChannel {
  id?: string;
  name?: string;
  thumbnail?: string;
  url?: string;
}

interface SupadataYouTubeVideo {
  type?: string;
  id?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  viewCount?: number;
  uploadDate?: string;
  channel?: SupadataYouTubeChannel;
  tags?: string[];
  url?: string;
}

const BATCH_SIZE = 4;
const SEARCH_LIMIT = 12;
const YOUTUBE_BASE_URL = 'https://www.youtube.com/watch?v=';
const searchModeEnum = z.enum(['general', 'channel', 'playlist']);
const channelVideoTypeEnum = z.enum(['all', 'video', 'short', 'live']);
type SearchMode = z.infer<typeof searchModeEnum>;
type ChannelVideoType = z.infer<typeof channelVideoTypeEnum>;

const timeRangeToUploadDate: Record<Exclude<TimeRange, 'anytime'>, 'hour' | 'today' | 'week' | 'month' | 'year'> = {
  day: 'today',
  week: 'week',
  month: 'month',
  year: 'year',
};

const chapterRegex = /^\s*((?:\d+:)?\d{1,2}:\d{2})\s*[-–—]?\s*(.+)$/i;

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function dedupeVideos(videos: SupadataYouTubeVideo[]) {
  const seen = new Set<string>();
  return videos.filter((video) => {
    const videoId = video.id;
    if (!videoId) return false;
    if (seen.has(videoId)) return false;
    seen.add(videoId);
    return true;
  });
}

function extractChaptersFromDescription(description?: string): string[] | undefined {
  if (!description) return undefined;
  const chapters: string[] = [];
  const lines = description.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(chapterRegex);
    if (match) {
      const [, time, title] = match;
      if (time && title) {
        chapters.push(`${time} - ${title.trim()}`);
      }
    }
  }
  return chapters.length > 0 ? chapters : undefined;
}

function generateChaptersFromSubtitles(
  subs: SubtitleFragment[] | undefined,
  targetCount: number = 30,
): string[] | undefined {
  if (!subs || subs.length === 0) return undefined;

  const parseSeconds = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const last = subs[subs.length - 1];
  const totalDurationSec = Math.max(0, parseSeconds(last.start) + parseSeconds(last.dur));
  if (totalDurationSec <= 1) return undefined;

  const interval = Math.max(10, Math.floor(totalDurationSec / targetCount));

  const formatTime = (secondsTotal: number) => {
    const seconds = Math.max(1, Math.floor(secondsTotal)); // avoid 0:00 which UI filters out
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  };

  const chapters: string[] = [];
  const usedTimes = new Set<number>();
  for (let t = interval; t < totalDurationSec; t += interval) {
    const idx = subs.findIndex((sf) => parseSeconds(sf.start) >= t);
    const chosen = idx >= 0 ? subs[idx] : subs[subs.length - 1];
    const text = chosen.text?.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const key = Math.floor(parseSeconds(chosen.start));
    if (usedTimes.has(key)) continue;
    usedTimes.add(key);
    chapters.push(`${formatTime(key)} - ${text}`);
    if (chapters.length >= targetCount) break;
  }

  return chapters.length > 0 ? chapters : undefined;
}

async function buildTranscriptArtifacts(videoId: string, fallbackDescription?: string) {
  const details = await getVideoDetails({ videoID: videoId, lang: 'en' }).catch((error: unknown) => {
    console.warn(`⚠️ getVideoDetails failed for ${videoId}:`, error);
    return null;
  });

  let subtitleSource: SubtitleFragment[] | undefined =
    Array.isArray(details?.subtitles) && details!.subtitles.length > 0
      ? (details!.subtitles as SubtitleFragment[])
      : undefined;

  if (!subtitleSource) {
    subtitleSource = (await getSubtitles({ videoID: videoId, lang: 'en' }).catch((error: unknown) => {
      console.warn(`⚠️ getSubtitles failed for ${videoId}:`, error);
      return null;
    })) as SubtitleFragment[] | undefined;
  }

  const transcriptText = subtitleSource?.map((s) => s.text).join('\n');

  const timestampsFromDescription = extractChaptersFromDescription(details?.description ?? fallbackDescription);
  const timestamps = timestampsFromDescription ?? generateChaptersFromSubtitles(subtitleSource);

  return {
    transcriptText,
    timestamps,
    description: details?.description ?? fallbackDescription,
    subtitles: subtitleSource,
  };
}

function mapTimeRangeToSupadata(timeRange: TimeRange) {
  if (timeRange === 'anytime') return undefined;
  return timeRangeToUploadDate[timeRange];
}

function resolveNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function flattenVideoIds(ids?: { videoIds?: string[]; shortIds?: string[]; liveIds?: string[] }) {
  if (!ids) return [];
  return [...(ids.videoIds ?? []), ...(ids.shortIds ?? []), ...(ids.liveIds ?? [])];
}

function normalizeHandle(query: string) {
  return query.trim().replace(/^@/, '');
}

function extractPlaylistId(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const urlMatch = trimmed.match(/[?&]list=([^&]+)/i);
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }
  if (trimmed.startsWith('PL') || trimmed.startsWith('UU') || trimmed.startsWith('LL')) {
    return trimmed;
  }
  return null;
}

async function resolveChannelIdFromQuery(supadata: Supadata, query: string) {
  const normalized = normalizeHandle(query);
  if (!normalized) return null;

  try {
    const searchResult = await supadata.youtube.search({
      query: normalized,
      type: 'channel',
      limit: 5,
      sortBy: 'relevance',
    });

    const channelResults = (searchResult?.results ?? []) as Array<{
      type?: string;
      id?: string;
      handle?: string;
      name?: string;
    }>;

    const cleanedHandle = normalized.toLowerCase();

    const handleMatch = channelResults.find((result) => {
      if (result.type !== 'channel' || !result.handle) return false;
      const candidate = result.handle.replace(/^@/, '').toLowerCase();
      return candidate === cleanedHandle;
    });

    const chosenChannel = handleMatch ?? channelResults.find((result) => result.type === 'channel');
    if (!chosenChannel) return null;
    return chosenChannel.id || chosenChannel.handle || null;
  } catch (error) {
    console.warn('⚠️ Failed to resolve channel ID from query', { query, error });
    return null;
  }
}

async function resolvePlaylistIdFromQuery(supadata: Supadata, query: string) {
  const playlistId = extractPlaylistId(query);
  if (playlistId) return playlistId;

  const trimmed = query.trim();
  if (!trimmed) return null;

  try {
    const searchResult = await supadata.youtube.search({
      query: trimmed,
      type: 'playlist',
      limit: 5,
      sortBy: 'relevance',
    });

    const playlistResults = (searchResult?.results ?? []) as Array<{
      type?: string;
      id?: string;
      title?: string;
    }>;

    const chosenPlaylist = playlistResults.find((result) => result.type === 'playlist');
    return chosenPlaylist?.id ?? null;
  } catch (error) {
    console.warn('⚠️ Failed to resolve playlist ID from query', { query, error });
    return null;
  }
}

async function getVideosForMode({
  supadata,
  query,
  timeRange,
  mode,
  channelVideoType,
}: {
  supadata: Supadata;
  query: string;
  timeRange: TimeRange;
  mode: SearchMode;
  channelVideoType?: ChannelVideoType;
}) {
  if (mode === 'general') {
    const uploadDateFilter = mapTimeRangeToSupadata(timeRange);
    const searchResult = await supadata.youtube.search({
      query,
      type: 'video',
      ...(uploadDateFilter ? { uploadDate: uploadDateFilter } : {}),
      limit: SEARCH_LIMIT,
      sortBy: 'relevance',
    });

    const rawVideos = (searchResult?.results ?? []) as SupadataYouTubeVideo[];
    return dedupeVideos(rawVideos.filter((result) => result.type === 'video'));
  }

  const fetchChannelVideos = async (channelQuery: string) => {
    if (!channelQuery.trim()) return [];
    try {
      const ids = await supadata.youtube.channel.videos({
        id: channelQuery,
        limit: SEARCH_LIMIT,
        type: channelVideoType ?? 'all',
      });
      return flattenVideoIds(ids);
    } catch (error) {
      console.warn('⚠️ Supadata channel.videos failed', { channelQuery, error });
      return [];
    }
  };

  const fetchPlaylistVideos = async (playlistId: string | null) => {
    if (!playlistId) return [];
    try {
      const ids = await supadata.youtube.playlist.videos({
        id: playlistId,
        limit: SEARCH_LIMIT,
      });
      return flattenVideoIds(ids);
    } catch (error) {
      console.warn('⚠️ Supadata playlist.videos failed', { playlistId, error });
      return [];
    }
  };

  const normalizedIds =
    mode === 'channel'
      ? await (async () => {
          // First, try to resolve the channel identifier from the query
          const resolvedId = await resolveChannelIdFromQuery(supadata, query);
          const channelIdentifier = resolvedId || query;

          // Now fetch videos using the resolved identifier
          const ids = await fetchChannelVideos(channelIdentifier);
          return ids;
        })()
      : await (async () => {
          const preExtractedId = extractPlaylistId(query);
          const directIds = await fetchPlaylistVideos(preExtractedId ?? query);
          if (directIds.length > 0) return directIds;

          const resolvedId = await resolvePlaylistIdFromQuery(supadata, query);
          if (!resolvedId) return directIds;
          return fetchPlaylistVideos(resolvedId);
        })();

  if (normalizedIds.length === 0) {
    console.warn(`⚠️ No video IDs resolved for mode="${mode}". Falling back to general search.`);
    return getVideosForMode({
      supadata,
      query,
      timeRange,
      mode: 'general',
    });
  }

  const uniqueIds = Array.from(new Set(normalizedIds)).slice(0, SEARCH_LIMIT);
  return uniqueIds.map((id) => ({
    id,
    type: 'video',
    url: `${YOUTUBE_BASE_URL}${id}`,
  }));
}

export const youtubeSearchTool = tool({
  description: 'Search YouTube videos using Supadata and enrich them with transcripts, stats, and metadata.',
  inputSchema: z.object({
    query: z.string().describe('The search query for YouTube videos'),
    timeRange: z.enum(['day', 'week', 'month', 'year', 'anytime']),
    mode: searchModeEnum.default('general').describe('general search, channel videos, or playlist videos'),
    channelVideoType: channelVideoTypeEnum.optional().describe('When mode=channel, filter to video/short/live/all'),
  }),
  execute: async ({
    query,
    timeRange,
    mode = 'general',
    channelVideoType,
  }: {
    query: string;
    timeRange: 'day' | 'week' | 'month' | 'year' | 'anytime';
    mode?: SearchMode;
    channelVideoType?: ChannelVideoType;
  }) => {
    try {
      const supadata = new Supadata({
        apiKey: serverEnv.SUPADATA_API_KEY,
      });

      console.log('🔎 Supadata YouTube search', { query, timeRange, mode, channelVideoType });

      const videoResults = await getVideosForMode({
        supadata,
        query,
        timeRange,
        mode,
        channelVideoType,
      });

      if (videoResults.length === 0) {
        console.log('ℹ️ Supadata returned no video IDs for the provided input');
        return { results: [] };
      }

      console.log(`🎥 Resolved ${videoResults.length} video candidates for mode="${mode}"`);

      const batches = chunkArray(videoResults, BATCH_SIZE);
      const processedResults: VideoResult[] = [];

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        try {
          const batchResults = await Promise.allSettled(
            batch.map(async (video): Promise<VideoResult | null> => {
              const videoId = video.id;
              if (!videoId) {
                console.warn('⚠️ Video missing ID from Supadata result, skipping');
                return null;
              }

              const videoUrl = `${YOUTUBE_BASE_URL}${videoId}`;

              const baseResult: VideoResult = {
                videoId,
                url: video.url ?? videoUrl,
                publishedDate: video.uploadDate,
              };

              try {
                const [transcripts, metadata] = await Promise.all([
                  buildTranscriptArtifacts(videoId, video.description),
                  supadata.metadata({ url: video.url ?? videoUrl }).catch((error: unknown) => {
                    console.warn(`⚠️ Supadata metadata failed for ${videoId}:`, error);
                    return null;
                  }),
                ]);

                const metadataAuthor = metadata?.author;
                const metadataStats = metadata?.stats;
                const metadataMedia = metadata?.media as { duration?: number; thumbnailUrl?: string } | undefined;

                const stats: VideoStats | undefined =
                  metadataStats != null || video.viewCount != null
                    ? {
                        views: resolveNumber(metadataStats?.views ?? video.viewCount),
                        likes: resolveNumber(metadataStats?.likes),
                        comments: resolveNumber(metadataStats?.comments),
                        shares: resolveNumber(metadataStats?.shares),
                      }
                    : undefined;

                const processedVideo: VideoResult = {
                  ...baseResult,
                  details: {
                    title: metadata?.title ?? video.title,
                    author_name: metadataAuthor?.displayName ?? video.channel?.name,
                    author_url:
                      metadataAuthor?.username
                        ? `https://www.youtube.com/@${metadataAuthor.username}`
                        : video.channel?.id
                          ? `https://www.youtube.com/channel/${video.channel.id}`
                          : video.channel?.url,
                    thumbnail_url:
                      metadataMedia?.thumbnailUrl ??
                      video.thumbnail ??
                      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    provider_name: 'YouTube',
                    provider_url: 'https://www.youtube.com',
                    author_avatar_url: metadataAuthor?.avatarUrl ?? video.channel?.thumbnail,
                  },
                  captions: transcripts.transcriptText,
                  timestamps: transcripts.timestamps,
                  summary: metadata?.description ?? video.description,
                  publishedDate: metadata?.createdAt ?? video.uploadDate,
                  durationSeconds: metadataMedia?.duration ?? video.duration,
                  stats,
                  tags: metadata?.tags ?? video.tags,
                };

                if (processedVideo.stats?.views != null) {
                  processedVideo.views = processedVideo.stats.views;
                }
                if (processedVideo.stats?.likes != null) {
                  processedVideo.likes = processedVideo.stats.likes;
                }

                return processedVideo;
              } catch (error) {
                console.warn(`⚠️ Error processing video ${videoId}:`, error);
                return baseResult;
              }
            }),
          );

          const validBatchResults = batchResults
            .filter((result) => result.status === 'fulfilled' && result.value !== null)
            .map((result) => (result as PromiseFulfilledResult<VideoResult>).value);

          processedResults.push(...validBatchResults);
        } catch (batchError) {
          console.error(`💥 Batch ${batchIndex + 1} failed:`, batchError);
        }
      }

      console.log(`🏁 Supadata processing completed with ${processedResults.length} enriched videos`);

      return {
        results: processedResults,
      };
    } catch (error) {
      console.error('YouTube search error:', error);
      throw error;
    }
  },
});
