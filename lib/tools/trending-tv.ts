import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

export const trendingTvTool = tool({
  description: 'Get trending TV shows from TMDB',
  inputSchema: z.object({}),
  execute: async () => {
    const TMDB_API_KEY = serverEnv.TMDB_API_KEY;
    const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

    try {
      const response = await fetch(`${TMDB_BASE_URL}/trending/tv/day?language=en-US`, {
        headers: {
          Authorization: `Bearer ${TMDB_API_KEY}`,
          accept: 'application/json',
        },
      });

      const data = await response.json();
      const results = data.results.map((show: any) => ({
        ...show,
        poster_path: show.poster_path ? `https://image.tmdb.org/t/p/original${show.poster_path}` : null,
        backdrop_path: show.backdrop_path ? `https://image.tmdb.org/t/p/original${show.backdrop_path}` : null,
      }));

      return { results };
    } catch (error) {
      console.error('Trending TV shows error:', error);
      throw error;
    }
  },
});
