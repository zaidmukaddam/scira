// https://env.t3.gg/docs/nextjs#create-your-schema
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const serverEnv = createEnv({
  server: {
    // Essential for basic functionality
    DATABASE_URL: z.string().optional().default('sqlite:./dev.db'),
    BETTER_AUTH_SECRET: z.string().optional().default('dev-secret-key-change-in-production'),
    
    // AI API Keys - optional for development
    XAI_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
    
    // Azure OpenAI - optional for development
    AZURE_OPENAI_API_KEY: z.string().optional(),
    AZURE_OPENAI_ENDPOINT: z.string().optional(),
    AZURE_OPENAI_API_VERSION: z.string().optional().default('2024-10-01-preview'),
    AZURE_OPENAI_DEPLOYMENT_PREFIX: z.string().optional(),
    
    // Development & Sandbox
    DAYTONA_API_KEY: z.string().optional(),
    
    // OAuth - optional
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    TWITTER_CLIENT_ID: z.string().optional(),
    TWITTER_CLIENT_SECRET: z.string().optional(),
    
    // External services - optional
    REDIS_URL: z.string().optional(),
    ELEVENLABS_API_KEY: z.string().optional(),
    TAVILY_API_KEY: z.string().optional(),
    EXA_API_KEY: z.string().optional(),
    TMDB_API_KEY: z.string().optional(),
    YT_ENDPOINT: z.string().optional(),
    FIRECRAWL_API_KEY: z.string().optional(),
    OPENWEATHER_API_KEY: z.string().optional(),
    GOOGLE_MAPS_API_KEY: z.string().optional(),
    MAPBOX_ACCESS_TOKEN: z.string().optional(),
    AMADEUS_API_KEY: z.string().optional(),
    AMADEUS_API_SECRET: z.string().optional(),
    COINGECKO_API_KEY: z.string().optional(),
    
    // System
    CRON_SECRET: z.string().optional().default('dev-cron-secret'),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    MEM0_API_KEY: z.string().optional(),
    MEM0_ORG_ID: z.string().optional(),
    MEM0_PROJECT_ID: z.string().optional(),
    SMITHERY_API_KEY: z.string().optional(),
    ALLOWED_ORIGINS: z.string().optional().default('http://localhost:3000'),
  },
  experimental__runtimeEnv: process.env,
})
