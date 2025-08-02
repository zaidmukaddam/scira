import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';
import { serverEnv } from '@/env/server';

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

export const youtubeSearchTool = tool({
  description: 'Search YouTube videos using Exa AI and get detailed video information.',
  parameters: z.object({
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

      const searchOptions: any = {
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

                // Use Promise.allSettled to handle partial failures gracefully
                const [detailsResult, captionsResult, timestampsResult] = await Promise.allSettled([
                  fetch(`${serverEnv.YT_ENDPOINT}/video-data`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      url: result.url,
                    }),
                  }).then((res) => (res.ok ? res.json() : null)),

                  fetch(`${serverEnv.YT_ENDPOINT}/video-captions`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      url: result.url,
                    }),
                  })
                    .then((res) => {
                      console.log(`🌐 Captions fetch response status for ${videoId}:`, res.status, res.ok);
                      if (!res.ok) {
                        console.log(`❌ Captions fetch failed for ${videoId}: ${res.status} ${res.statusText}`);
                        return null;
                      }
                      return res
                        .json()
                        .then((data) => {
                          try {
                            console.log(`📝 Raw captions response for ${videoId}:`, JSON.stringify(data));
                            console.log(`🔍 Captions data type:`, typeof data, `isArray:`, Array.isArray(data));
                            console.log(`🔑 Captions data keys:`, data ? Object.keys(data) : 'null');

                            // Handle JSON object with captions key
                            if (data && data.captions && typeof data.captions === 'string') {
                              console.log(`✅ Captions SUCCESS for ${videoId}: length ${data.captions.length}`);
                              return data.captions;
                            } else {
                              console.log(`⚠️ Captions FAILED for ${videoId}: data structure:`, data);
                              return null;
                            }
                          } catch (error) {
                            console.log(`⚠️ Captions JSON parsing failed for ${videoId}:`, error);
                            return null;
                          }
                        })
                        .catch((jsonError) => {
                          console.log(`⚠️ Captions res.json() failed for ${videoId}:`, jsonError);
                          return null;
                        });
                    })
                    .catch((fetchError) => {
                      console.log(`⚠️ Captions fetch completely failed for ${videoId}:`, fetchError);
                      return null;
                    }),

                  fetch(`${serverEnv.YT_ENDPOINT}/video-timestamps`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      url: result.url,
                    }),
                  })
                    .then((res) => {
                      console.log(`🌐 Timestamps fetch response status for ${videoId}:`, res.status, res.ok);
                      if (!res.ok) {
                        console.log(`❌ Timestamps fetch failed for ${videoId}: ${res.status} ${res.statusText}`);
                        return null;
                      }
                      return res
                        .json()
                        .then((data) => {
                          try {
                            console.log(`⏰ Raw timestamps response for ${videoId}:`, JSON.stringify(data));
                            console.log(`🔍 Timestamps data type:`, typeof data, `isArray:`, Array.isArray(data));
                            console.log(`🔑 Timestamps data keys:`, data ? Object.keys(data) : 'null');

                            // Handle both direct array and JSON object with timestamps key
                            if (Array.isArray(data)) {
                              console.log(`✅ Timestamps SUCCESS (direct array) for ${videoId}: count ${data.length}`);
                              return data;
                            } else if (data && data.timestamps && Array.isArray(data.timestamps)) {
                              console.log(
                                `✅ Timestamps SUCCESS (from JSON) for ${videoId}: count ${data.timestamps.length}`,
                              );
                              console.log(`📝 First 3 timestamps for ${videoId}:`, data.timestamps.slice(0, 3));
                              return data.timestamps;
                            } else {
                              console.log(`⚠️ Timestamps FAILED for ${videoId}: data structure:`, data);
                              return null;
                            }
                          } catch (error) {
                            console.log(`⚠️ Timestamps JSON parsing failed for ${videoId}:`, error);
                            return null;
                          }
                        })
                        .catch((jsonError) => {
                          console.log(`⚠️ Timestamps res.json() failed for ${videoId}:`, jsonError);
                          return null;
                        });
                    })
                    .catch((fetchError) => {
                      console.log(`⚠️ Timestamps fetch completely failed for ${videoId}:`, fetchError);
                      return null;
                    }),
                ]);

                // Debug raw Promise.allSettled results
                console.log(`🔍 Raw Promise.allSettled results for ${videoId}:`);
                console.log(`Details result:`, detailsResult);
                console.log(`Captions result:`, captionsResult);
                console.log(`Timestamps result:`, timestampsResult);

                const processedVideo = {
                  ...baseResult,
                  details: detailsResult.status === 'fulfilled' ? detailsResult.value : undefined,
                  captions: captionsResult.status === 'fulfilled' ? captionsResult.value || undefined : undefined,
                  timestamps: timestampsResult.status === 'fulfilled' ? timestampsResult.value : undefined,
                };

                console.log(`🎯 Final processed video for ${videoId}:`, {
                  hasCaptions: !!processedVideo.captions,
                  captionsType: typeof processedVideo.captions,
                  captionsLength: processedVideo.captions ? processedVideo.captions.length : 0,
                  hasTimestamps: !!processedVideo.timestamps,
                  timestampsType: typeof processedVideo.timestamps,
                  timestampsIsArray: Array.isArray(processedVideo.timestamps),
                  timestampsLength: Array.isArray(processedVideo.timestamps) ? processedVideo.timestamps.length : 0,
                });

                console.log(`🔍 Promise.allSettled results for ${videoId}:`);
                console.log(
                  `  📋 Details: ${detailsResult.status}`,
                  detailsResult.status === 'rejected' ? detailsResult.reason : 'success',
                );
                console.log(
                  `  💬 Captions: ${captionsResult.status}`,
                  captionsResult.status === 'rejected'
                    ? captionsResult.reason
                    : `value: ${captionsResult.value ? 'EXISTS' : 'NULL'}`,
                );
                console.log(
                  `  ⏰ Timestamps: ${timestampsResult.status}`,
                  timestampsResult.status === 'rejected'
                    ? timestampsResult.reason
                    : `value: ${timestampsResult.value ? 'EXISTS' : 'NULL'}`,
                );

                console.log(`🎯 Final processed video for ${videoId}:`, {
                  hasCaptions: !!processedVideo.captions,
                  captionsLength: processedVideo.captions ? processedVideo.captions.length : 0,
                  hasTimestamps: !!processedVideo.timestamps,
                  timestampsLength: Array.isArray(processedVideo.timestamps) ? processedVideo.timestamps.length : 0,
                });

                // Log sample timestamps to understand the format
                if (
                  processedVideo.timestamps &&
                  Array.isArray(processedVideo.timestamps) &&
                  processedVideo.timestamps.length > 0
                ) {
                  console.log(`📝 Sample timestamps for ${videoId}:`);
                  processedVideo.timestamps.slice(0, 3).forEach((timestamp, index) => {
                    console.log(`Sample timestamp [${index}]: ${timestamp}`);
                  });
                }

                console.log(`✅ Successfully processed video ${videoId}:`, {
                  hasDetails: !!processedVideo.details,
                  hasCaptions: !!processedVideo.captions,
                  hasTimestamps: !!processedVideo.timestamps,
                  timestampCount: Array.isArray(processedVideo.timestamps) ? processedVideo.timestamps.length : 0,
                  captionsLength: processedVideo.captions ? processedVideo.captions.length : 0,
                  captionsType: typeof processedVideo.captions,
                  timestampsType: typeof processedVideo.timestamps,
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
              failedBatchResults.map((r) => r.reason?.message || 'Unknown'),
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
