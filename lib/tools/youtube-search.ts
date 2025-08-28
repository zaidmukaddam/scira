import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
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

interface SubtitleFragment {
  start: string; // seconds as string from API
  dur: string; // seconds as string from API
  text: string;
}

export const youtubeSearchTool = tool({
  description: 'Search YouTube videos using Exa AI and get detailed video information.',
  inputSchema: z.object({
    query: z.string().describe('The search query for YouTube videos'),
    timeRange: z.enum(['day', 'week', 'month', 'year', 'anytime']),
  }),
  execute: async ({
    query,
    timeRange,
  }: {
    query: string;
    timeRange: 'day' | 'week' | 'month' | 'year' | 'anytime';
  }) => {
    try {
      const exa = new Exa(serverEnv.EXA_API_KEY as string);

      console.log('query', query);
      console.log('timeRange', timeRange);
      let startDate: string | undefined;
      let endDate: string | undefined;

      const now = new Date();
      const formatDate = (date: Date) => date.toISOString().split('T')[0];

      switch (timeRange) {
        case 'day':
          startDate = formatDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
          endDate = formatDate(now);
          break;
        case 'week':
          startDate = formatDate(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
          endDate = formatDate(now);
          break;
        case 'month':
          startDate = formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
          endDate = formatDate(now);
          break;
        case 'year':
          startDate = formatDate(new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000));
          endDate = formatDate(now);
          break;
        case 'anytime':
          // Don't set dates for anytime - let Exa use its defaults
          break;
      }

      interface ExaSearchOptions {
        type?: 'auto' | 'neural' | 'keyword' | 'hybrid' | 'fast';
        numResults?: number;
        includeDomains?: string[];
        startPublishedDate?: string;
        endPublishedDate?: string;
      }

      const searchOptions: ExaSearchOptions = {
        type: 'auto',
        numResults: 5,
        includeDomains: ['youtube.com', 'youtu.be', 'm.youtube.com'],
      };

      if (startDate) {
        searchOptions.startPublishedDate = startDate;
      }
      if (endDate) {
        searchOptions.endPublishedDate = endDate;
      }

      console.log('📅 Search date range:', {
        timeRange,
        startDate,
        endDate,
        searchOptions,
      });

      const searchResult = await exa.searchAndContents(query, searchOptions);

      console.log('🎥 YouTube Search Results:', searchResult);

      // Deduplicate videos by ID to avoid redundant API calls
      const uniqueResults = searchResult.results.reduce((acc, result) => {
        const videoIdMatch = result.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
        const videoId = videoIdMatch?.[1];

        if (videoId && !acc.has(videoId)) {
          acc.set(videoId, result);
        }
        return acc;
      }, new Map());

      console.log(
        `🔍 Processing ${uniqueResults.size} unique videos from ${searchResult.results.length} search results`,
      );

      // Process videos in smaller batches to avoid overwhelming the API
      const batchSize = 5;
      console.log(`📦 Creating batches from ${uniqueResults.size} unique videos with batch size ${batchSize}`);

      const uniqueResultsArray = Array.from(uniqueResults.values());
      console.log(
        `🔗 Unique video URLs:`,
        uniqueResultsArray.map((r) => r.url),
      );

      const batches = uniqueResultsArray.reduce(
        (acc: Array<Array<(typeof searchResult.results)[0]>>, result, index) => {
          const batchIndex = Math.floor(index / batchSize);
          if (!acc[batchIndex]) {
            acc[batchIndex] = [];
            console.log(`📝 Created new batch ${batchIndex + 1}`);
          }
          acc[batchIndex].push(result);
          console.log(`➕ Added video ${index + 1} (${result.url}) to batch ${batchIndex + 1}`);
          return acc;
        },
        [] as Array<Array<(typeof searchResult.results)[0]>>,
      );

      console.log(`📊 Batch creation complete: ${batches.length} batches created`);
      batches.forEach((batch, index) => {
        console.log(`📋 Batch ${index + 1}: ${batch.length} videos`);
        batch.forEach((video, videoIndex) => {
          const videoId = video.url.match(
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
          )?.[1];
          console.log(`  ${videoIndex + 1}. ${videoId} - ${video.url}`);
        });
      });

      const processedResults: VideoResult[] = [];

      console.log(`🚀 Starting batch processing: ${batches.length} batches total`);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`🔄 [BATCH ${batchIndex + 1}/${batches.length}] Processing ${batch.length} videos`);
        console.log(
          `📋 [BATCH ${batchIndex + 1}] Video IDs in this batch:`,
          batch.map((r) => {
            const match = r.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
            return match?.[1] || 'unknown';
          }),
        );

        try {
          const batchResults = await Promise.allSettled(
            batch.map(async (result: (typeof searchResult.results)[0]): Promise<VideoResult | null> => {
              const videoIdMatch = result.url.match(
                /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
              );
              const videoId = videoIdMatch?.[1];

              if (!videoId) {
                console.warn(`⚠️  No video ID found for URL: ${result.url}`);
                return null;
              }

              const baseResult: VideoResult = {
                videoId,
                url: result.url,
                publishedDate: result.publishedDate,
              };

              try {
                console.log(`📹 Processing video ${videoId}...`);

                // Fetch details and subtitles using youtube-caption-extractor
                const details = await getVideoDetails({ videoID: videoId, lang: 'en' }).catch((e: unknown) => {
                  console.warn(`⚠️ getVideoDetails failed for ${videoId}:`, e);
                  return null;
                });

                // Extract transcript text from subtitles (prefer details.subtitles, fallback to direct API)
                let transcriptText: string | undefined = undefined;
                if (details && Array.isArray(details.subtitles) && details.subtitles.length > 0) {
                  transcriptText = details.subtitles.map((s) => s.text).join('\n');
                } else {
                  const subs = await getSubtitles({ videoID: videoId, lang: 'en' }).catch((e: unknown) => {
                    console.warn(`⚠️ getSubtitles failed for ${videoId}:`, e);
                    return null;
                  });
                  if (subs && Array.isArray(subs) && subs.length > 0) {
                    transcriptText = subs.map((s) => s.text).join('\n');
                  }
                }

                // Derive chapters from description if available (lines like "0:00 Intro" or "1:02:30 Deep dive")
                const extractChaptersFromDescription = (description: string | undefined): string[] | undefined => {
                  if (!description) return undefined;
                  const lines = description.split(/\r?\n/);
                  const chapterRegex = /^\s*((?:\d+:)?\d{1,2}:\d{2})\s*[\-|–|—]?\s*(.+)$/i;
                  const chapters: string[] = [];
                  for (const line of lines) {
                    const match = line.match(chapterRegex);
                    if (match) {
                      const time = match[1];
                      const title = match[2].trim();
                      if (time && title) {
                        chapters.push(`${time} - ${title}`);
                      }
                    }
                  }
                  return chapters.length > 0 ? chapters : undefined;
                };

                // Fallback: generate chapters from subtitles when description has no chapters
                const generateChaptersFromSubtitles = (
                  subs: SubtitleFragment[] | undefined,
                  targetCount: number = 30,
                ): string[] | undefined => {
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
                    // find first subtitle starting at or after t
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
                };

                const timestampsFromDescription = extractChaptersFromDescription(details?.description);
                let timestamps: string[] | undefined = timestampsFromDescription;
                if (!timestamps) {
                  const subtitleSource: SubtitleFragment[] | undefined = details?.subtitles as
                    | SubtitleFragment[]
                    | undefined;
                  if (subtitleSource && subtitleSource.length > 0) {
                    timestamps = generateChaptersFromSubtitles(subtitleSource);
                  } else {
                    const subs = await getSubtitles({ videoID: videoId, lang: 'en' }).catch(() => null);
                    timestamps = generateChaptersFromSubtitles(subs ?? undefined);
                  }
                }

                const processedVideo: VideoResult = {
                  ...baseResult,
                  details: {
                    title: details?.title,
                    thumbnail_url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                    provider_name: 'YouTube',
                    provider_url: 'https://www.youtube.com',
                  },
                  captions: transcriptText,
                  timestamps,
                };

                console.log(`✅ Successfully processed video ${videoId}:`, {
                  hasDetails: !!processedVideo.details,
                  hasCaptions: !!processedVideo.captions,
                  hasTimestamps: !!processedVideo.timestamps,
                  timestampCount: Array.isArray(processedVideo.timestamps) ? processedVideo.timestamps.length : 0,
                  captionsLength: processedVideo.captions ? processedVideo.captions.length : 0,
                });
                return processedVideo;
              } catch (error) {
                console.warn(`⚠️  Error processing video ${videoId}:`, error);
                return baseResult;
              }
            }),
          );

          // Process batch results - even failed promises return a result
          const validBatchResults = batchResults
            .filter((result) => result.status === 'fulfilled' && result.value !== null)
            .map((result) => (result as PromiseFulfilledResult<VideoResult>).value);

          const failedBatchResults = batchResults.filter((result) => result.status === 'rejected');

          console.log(`📊 [BATCH ${batchIndex + 1}] Results breakdown:`);
          console.log(`  ✅ Successful: ${validBatchResults.length}/${batch.length}`);
          console.log(`  ❌ Failed: ${failedBatchResults.length}/${batch.length}`);

          if (failedBatchResults.length > 0) {
            console.log(
              `  🚨 Failed reasons:`,
              failedBatchResults.map((r) => (r as PromiseRejectedResult).reason?.message || 'Unknown'),
            );
          }

          processedResults.push(...validBatchResults);
          console.log(`📈 [BATCH ${batchIndex + 1}] Total processed so far: ${processedResults.length} videos`);
          console.log(
            `🆔 [BATCH ${batchIndex + 1}] Added video IDs:`,
            validBatchResults.map((v) => v.videoId),
          );

          // Small delay between batches to be respectful to the API
          if (batchIndex < batches.length - 1) {
            console.log(`⏳ [BATCH ${batchIndex + 1}] Waiting 100ms before next batch...`);
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (batchError) {
          console.error(`💥 [BATCH ${batchIndex + 1}] CRITICAL BATCH FAILURE:`, batchError);
          if (batchError instanceof Error) {
            console.error(`💥 [BATCH ${batchIndex + 1}] Stack trace:`, batchError.stack);
          }
          console.log(`🔄 [BATCH ${batchIndex + 1}] Continuing to next batch despite failure...`);
          // Continue with next batch even if this one fails
          continue;
        }

        console.log(`✅ [BATCH ${batchIndex + 1}] Batch completed successfully`);
      }

      console.log(`🏁 All batches processed! Final summary:`);
      console.log(`📊 Total videos processed: ${processedResults.length}`);
      console.log(
        `🆔 All processed video IDs:`,
        processedResults.map((v) => v.videoId),
      );

      console.log(
        `🎉 FINAL RESULT: Successfully processed ${processedResults.length} videos out of ${uniqueResults.size} unique videos`,
      );

      // Debug: Check what videos have content for UI filtering
      const videosWithContent = processedResults.filter(
        (video) => (video.timestamps && video.timestamps.length > 0) || video.captions || video.summary,
      );
      console.log(`🎯 Videos with content for UI: ${videosWithContent.length}/${processedResults.length}`);

      processedResults.forEach((video, index) => {
        console.log(`Video ${index + 1} (${video.videoId}):`, {
          hasTimestamps: !!(video.timestamps && video.timestamps.length > 0),
          hasCaptions: !!video.captions,
          hasSummary: !!video.summary,
          willShowInUI: !!(video.timestamps && video.timestamps.length > 0) || !!video.captions || !!video.summary,
        });
      });

      console.log('Processed Source 2', processedResults[2]);

      return {
        results: processedResults,
      };
    } catch (error) {
      console.error('YouTube search error:', error);
      throw error;
    }
  },
});
