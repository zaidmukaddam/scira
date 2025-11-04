// https://env.t3.gg/docs/nextjs#create-your-schema
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const serverEnv = createEnv({
  server: {
    // Core APIs (required)
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),

    // AI APIs (optional with placeholders)
    XAI_API_KEY: z.string().default('placeholder'),
    OPENAI_API_KEY: z.string().default('placeholder'),
    ANTHROPIC_API_KEY: z.string().default('placeholder'),
    GROQ_API_KEY: z.string().default('placeholder'),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().default('placeholder'),

    // Optional auth providers
    GOOGLE_CLIENT_ID: z.string().default('placeholder'),
    GOOGLE_CLIENT_SECRET: z.string().default('placeholder'),
    TWITTER_CLIENT_ID: z.string().default('placeholder'),
    TWITTER_CLIENT_SECRET: z.string().default('placeholder'),
    MICROSOFT_CLIENT_ID: z.string().default('placeholder'),
    MICROSOFT_CLIENT_SECRET: z.string().default('placeholder'),

    // Optional services
    POLAR_ACCESS_TOKEN: z.string().default('placeholder'),
    POLAR_WEBHOOK_SECRET: z.string().default('placeholder'),
    DODO_PAYMENTS_API_KEY: z.string().default('placeholder'),
    DODO_PAYMENTS_WEBHOOK_SECRET: z.string().default('placeholder'),
                    DAYTONA_API_KEY: z.string().default('placeholder'),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    UPSTASH_REDIS_REST_URL: z.string().default('placeholder'),
    UPSTASH_REDIS_REST_TOKEN: z.string().default('placeholder'),
    ELEVENLABS_API_KEY: z.string().default('placeholder'),
    TAVILY_API_KEY: z.string().default('placeholder'),
    EXA_API_KEY: z.string().default('placeholder'),
    VALYU_API_KEY: z.string().default('placeholder'),
    TMDB_API_KEY: z.string().default('placeholder'),
    YT_ENDPOINT: z.string().default('https://youtube-api-placeholder.com'),
    FIRECRAWL_API_KEY: z.string().default('placeholder'),
    PARALLEL_API_KEY: z.string().default('placeholder'),
    OPENWEATHER_API_KEY: z.string().default('placeholder'),
    GOOGLE_MAPS_API_KEY: z.string().default('placeholder'),
    AMADEUS_API_KEY: z.string().default('placeholder'),
    AMADEUS_API_SECRET: z.string().default('placeholder'),
    CRON_SECRET: z.string().default('placeholder'),
    BLOB_READ_WRITE_TOKEN: z.string().default('placeholder'),
    SMITHERY_API_KEY: z.string().default('placeholder'),
    COINGECKO_API_KEY: z.string().default('placeholder'),
    QSTASH_TOKEN: z.string().default('placeholder'),
    RESEND_API_KEY: z.string().default('placeholder'),
    SUPERMEMORY_API_KEY: z.string().default('placeholder'),
    ALLOWED_ORIGINS: z.string().optional().default('http://localhost:8931'),
  },
  experimental__runtimeEnv: process.env,
});
