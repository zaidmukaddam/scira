// https://env.t3.gg/docs/nextjs#create-your-schema
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const serverEnv = createEnv({
  server: {
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    BLOB_READ_WRITE_TOKEN: z.string().min(1),

    LOCAL_AUTH_SECRET: z.string().optional(),

    // Deprecated / unused at runtime (kept for compile-time compatibility)
    XAI_API_KEY: z.string().optional().default('deprecated'),
    OPENAI_API_KEY: z.string().optional().default('deprecated'),
    ANTHROPIC_API_KEY: z.string().optional().default('deprecated'),
    GROQ_API_KEY: z.string().optional().default('deprecated'),
    DAYTONA_API_KEY: z.string().optional().default('deprecated'),
    BETTER_AUTH_SECRET: z.string().optional().default('deprecated'),
    GITHUB_CLIENT_ID: z.string().optional().default('deprecated'),
    GITHUB_CLIENT_SECRET: z.string().optional().default('deprecated'),
    GOOGLE_CLIENT_ID: z.string().optional().default('deprecated'),
    GOOGLE_CLIENT_SECRET: z.string().optional().default('deprecated'),
    TWITTER_CLIENT_ID: z.string().optional().default('deprecated'),
    TWITTER_CLIENT_SECRET: z.string().optional().default('deprecated'),
    UPSTASH_REDIS_REST_URL: z.string().optional().default('deprecated'),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional().default('deprecated'),
    ELEVENLABS_API_KEY: z.string().optional().default('deprecated'),
    TAVILY_API_KEY: z.string().optional().default('deprecated'),
    EXA_API_KEY: z.string().optional().default('deprecated'),
    VALYU_API_KEY: z.string().optional().default('deprecated'),
    TMDB_API_KEY: z.string().optional().default('deprecated'),
    YT_ENDPOINT: z.string().optional().default('deprecated'),
    FIRECRAWL_API_KEY: z.string().optional().default('deprecated'),
    PARALLEL_API_KEY: z.string().optional().default('deprecated'),
    OPENWEATHER_API_KEY: z.string().optional().default('deprecated'),
    GOOGLE_MAPS_API_KEY: z.string().optional().default('deprecated'),
    AMADEUS_API_KEY: z.string().optional().default('deprecated'),
    AMADEUS_API_SECRET: z.string().optional().default('deprecated'),
    CRON_SECRET: z.string().optional().default('deprecated'),
    SMITHERY_API_KEY: z.string().optional().default('deprecated'),
    COINGECKO_API_KEY: z.string().optional().default('deprecated'),
    QSTASH_TOKEN: z.string().optional().default('deprecated'),
    RESEND_API_KEY: z.string().optional().default('deprecated'),
    SUPERMEMORY_API_KEY: z.string().optional().default('deprecated'),
    ALLOWED_ORIGINS: z.string().optional().default('http://localhost:3000'),
  },
  experimental__runtimeEnv: process.env,
});
