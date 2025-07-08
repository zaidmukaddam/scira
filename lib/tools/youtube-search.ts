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
}

export const youtubeSearchTool = tool({
  description: 'Search YouTube videos using Exa AI and get detailed video information.',
  parameters: z.object({
    query: z.string().describe('The search query for YouTube videos'),
  }),
  execute: async ({ query }: { query: string }) => {
    try {
      const exa = new Exa(serverEnv.EXA_API_KEY as string);

      const searchResult = await exa.search(query, {
        type: 'keyword',
        numResults: 10,
        includeDomains: ['youtube.com'],
      });

      const processedResults = await Promise.all(
        searchResult.results.map(async (result): Promise<VideoResult | null> => {
          const videoIdMatch = result.url.match(
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
          );
          const videoId = videoIdMatch?.[1];

          if (!videoId) return null;

          const baseResult: VideoResult = {
            videoId,
            url: result.url,
          };

          try {
            const [detailsResponse, captionsResponse, timestampsResponse] = await Promise.all([
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
              }).then((res) => (res.ok ? res.text() : null)),
              fetch(`${serverEnv.YT_ENDPOINT}/video-timestamps`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  url: result.url,
                }),
              }).then((res) => (res.ok ? res.json() : null)),
            ]);

            return {
              ...baseResult,
              details: detailsResponse || undefined,
              captions: captionsResponse || undefined,
              timestamps: timestampsResponse || undefined,
            };
          } catch (error) {
            console.error(`Error fetching details for video ${videoId}:`, error);
            return baseResult;
          }
        }),
      );

      const validResults = processedResults.filter((result): result is VideoResult => result !== null);

      return {
        results: validResults,
      };
    } catch (error) {
      console.error('YouTube search error:', error);
      throw error;
    }
  },
}); 