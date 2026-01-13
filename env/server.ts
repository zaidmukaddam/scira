// https://env.t3.gg/docs/nextjs#create-your-schema
import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const serverEnv = createEnv({
  server: {
    // ✅ Required - Core essentials
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(1),
    
    // 🔑 AI API Keys - Optional (at least one recommended)
    XAI_API_KEY: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    GROQ_API_KEY: z.string().min(1).optional(),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
    
    // 🔧 Development Tools - Optional
    DAYTONA_API_KEY: z.string().min(1).optional(),
    
    // 🔐 OAuth Providers - Optional
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    TWITTER_CLIENT_ID: z.string().min(1).optional(),
    TWITTER_CLIENT_SECRET: z.string().min(1).optional(),
    
    // 💾 Cache & Storage - Optional
    REDIS_URL: z.string().min(1).optional(),
    UPSTASH_REDIS_REST_URL: z.string().min(1).optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
    
    // 🎤 Media APIs - Optional
    ELEVENLABS_API_KEY: z.string().min(1).optional(),
    TMDB_API_KEY: z.string().min(1).optional(),
    YT_ENDPOINT: z.string().min(1).optional(),
    
    // 🔍 Search & Web - Optional
    TAVILY_API_KEY: z.string().min(1).optional(),
    EXA_API_KEY: z.string().min(1).optional(),
    FIRECRAWL_API_KEY: z.string().min(1).optional(),
    
    // 🗺️ Maps & Location - Optional
    GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),
    OPENWEATHER_API_KEY: z.string().min(1).optional(),
    AMADEUS_API_KEY: z.string().min(1).optional(),
    AMADEUS_API_SECRET: z.string().min(1).optional(),
    
    // 🧠 Memory & MCP - Optional
    SMITHERY_API_KEY: z.string().min(1).optional(),
    SUPERMEMORY_API_KEY: z.string().min(1).optional(),
    
    // 💰 Finance & Crypto - Optional
    COINGECKO_API_KEY: z.string().min(1).optional(),
    VALYU_API_KEY: z.string().min(1).optional(),
    
    // 📊 Analytics & Tools - Optional
    SUPADATA_API_KEY: z.string().min(1).optional(),
    PARALLEL_API_KEY: z.string().min(1).optional(),
    
    // ⏰ Scheduling & Email - Optional
    CRON_SECRET: z.string().min(1).optional(),
    QSTASH_TOKEN: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    
    // 🌐 Security
    ALLOWED_ORIGINS: z.string().optional().default('http://localhost:3000'),
  },
  experimental__runtimeEnv: process.env,
});
