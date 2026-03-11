// https://env.t3.gg/docs/nextjs#create-your-schema
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const serverEnv = createEnv({
  server: {
    // ─── SCX Sovereign AI Provider ─────────────────────────────────────────
    SCX_API_KEY: z.string().min(1),
    SCX_API_URL: z.string().url().optional().default('https://api.scx.ai'),

    // ─── Database & Auth ────────────────────────────────────────────────────
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    TWITTER_CLIENT_ID: z.string().min(1),
    TWITTER_CLIENT_SECRET: z.string().min(1),

    // ─── Caching & Queues ───────────────────────────────────────────────────
    REDIS_URL: z.string().min(1),
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    QSTASH_TOKEN: z.string().optional(),

    // ─── Search Providers ───────────────────────────────────────────────────
    TAVILY_API_KEY: z.string().min(1),
    EXA_API_KEY: z.string().min(1),
    FIRECRAWL_API_KEY: z.string().min(1),
    PARALLEL_API_KEY: z.string().min(1),

    // ─── Data & Media APIs ──────────────────────────────────────────────────
    TMDB_API_KEY: z.string().min(1),
    YT_ENDPOINT: z.string().min(1),
    OPENWEATHER_API_KEY: z.string().min(1),
    GOOGLE_MAPS_API_KEY: z.string().min(1),
    AMADEUS_API_KEY: z.string().min(1),
    AMADEUS_API_SECRET: z.string().min(1),
    COINGECKO_API_KEY: z.string().min(1),
    SUPADATA_API_KEY: z.string().optional(),
    VALYU_API_KEY: z.string().min(1),

    // ─── Voice & Transcription ──────────────────────────────────────────────
    ELEVENLABS_API_KEY: z.string().min(1),

    // ─── Code Execution ─────────────────────────────────────────────────────
    DAYTONA_API_KEY: z.string().min(1),

    // ─── Storage (Supabase) ─────────────────────────────────────────────────
    // NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are read directly
    // via process.env in lib/supabase-storage.ts (NEXT_PUBLIC_ vars can't be
    // declared in the server schema)
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

    // ─── Integrations ───────────────────────────────────────────────────────
    SMITHERY_API_KEY: z.string().min(1),
    SUPERMEMORY_API_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),

    // ─── Cron & Infrastructure ──────────────────────────────────────────────
    CRON_SECRET: z.string().min(1),
    ALLOWED_ORIGINS: z.string().optional().default('http://localhost:3000'),

    // ─── Admin ──────────────────────────────────────────────────────────────
    ADMIN_EMAIL: z.string().optional(),
    ADMIN_EMAILS: z.string().optional(),

    // ─── Slack Integration ───────────────────────────────────────────────────
    SLACK_CLIENT_ID: z.string().min(1).optional(),
    SLACK_CLIENT_SECRET: z.string().min(1).optional(),
    SLACK_SIGNING_SECRET: z.string().min(1).optional(),
    SLACK_REDIRECT_URI: z.string().url().optional(),
    SLACK_APP_LEVEL_TOKEN: z.string().min(1).optional(),

    // ─── Trove (National Library of Australia) ──────────────────────────────
    TROVE_API_KEY: z.string().optional(),

    // ─── Travel ─────────────────────────────────────────────────────────────
    TRIPADVISOR_API_KEY: z.string().optional(),

    // ─── XQL (X/Twitter Search via xAI) ─────────────────────────────────────
    XAI_API_KEY: z.string().optional(),

    // ─── OpenSky (Live Flight Tracking) ─────────────────────────────────────
    OPENSKY_CLIENT_ID: z.string().optional(),
    OPENSKY_CLIENT_SECRET: z.string().optional(),

    // ─── Mem0 (Persistent Memory) ────────────────────────────────────────────
    MEM0_API_KEY: z.string().optional(),
    MEM0_ORG_ID: z.string().optional(),
    MEM0_PROJECT_ID: z.string().optional(),
  },
  experimental__runtimeEnv: process.env,
});
