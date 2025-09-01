// https://env.t3.gg/docs/nextjs#create-your-schema
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const serverEnv = createEnv({
  server: {
    // Core AI APIs - make optional for development
    XAI_API_KEY: z.string().optional().default('dummy_key'),
    OPENAI_API_KEY: z.string().optional().default('dummy_key'),
    ANTHROPIC_API_KEY: z.string().optional().default('dummy_key'),
    GROQ_API_KEY: z.string().optional().default('dummy_key'),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional().default('dummy_key'),
    
    // Database - required
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    
    // OAuth - make optional
    GITHUB_CLIENT_ID: z.string().optional().default('dummy_id'),
    GITHUB_CLIENT_SECRET: z.string().optional().default('dummy_secret'),
    GOOGLE_CLIENT_ID: z.string().optional().default('dummy_id'),
    GOOGLE_CLIENT_SECRET: z.string().optional().default('dummy_secret'),
    TWITTER_CLIENT_ID: z.string().optional().default('dummy_id'),
    TWITTER_CLIENT_SECRET: z.string().optional().default('dummy_secret'),
    
    // Redis - make optional
    REDIS_URL: z.string().optional().default('redis://localhost:6379'),
    UPSTASH_REDIS_REST_URL: z.string().optional().default('dummy_url'),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional().default('dummy_token'),
    
    // External APIs - make optional
    ELEVENLABS_API_KEY: z.string().optional().default('dummy_key'),
    TAVILY_API_KEY: z.string().optional().default('dummy_key'),
    EXA_API_KEY: z.string().optional().default('dummy_key'),
    VALYU_API_KEY: z.string().optional().default('dummy_key'),
    TMDB_API_KEY: z.string().optional().default('dummy_key'),
    YT_ENDPOINT: z.string().optional().default('https://dummy-endpoint.com'),
    FIRECRAWL_API_KEY: z.string().optional().default('dummy_key'),
    PARALLEL_API_KEY: z.string().optional().default('dummy_key'),
    OPENWEATHER_API_KEY: z.string().optional().default('dummy_key'),
    GOOGLE_MAPS_API_KEY: z.string().optional().default('dummy_key'),
    AMADEUS_API_KEY: z.string().optional().default('dummy_key'),
    AMADEUS_API_SECRET: z.string().optional().default('dummy_secret'),
    CRON_SECRET: z.string().optional().default('dummy_secret'),
    BLOB_READ_WRITE_TOKEN: z.string().optional().default('dummy_token'),
    SMITHERY_API_KEY: z.string().optional().default('dummy_key'),
    COINGECKO_API_KEY: z.string().optional().default('dummy_key'),
    QSTASH_TOKEN: z.string().optional().default('dummy_token'),
    RESEND_API_KEY: z.string().optional().default('dummy_key'),
    SUPERMEMORY_API_KEY: z.string().optional().default('dummy_key'),
    ALLOWED_ORIGINS: z.string().optional().default('http://localhost:3000'),
  },
  experimental__runtimeEnv: process.env,
});
