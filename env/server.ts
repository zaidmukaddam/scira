// https://env.t3.gg/docs/nextjs#create-your-schema
import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const serverEnv = createEnv({
  server: {
    XAI_API_KEY: z.string().min(1),
    MISTRAL_API_KEY: z.string().optional(),
    COHERE_API_KEY: z.string().optional(), 
    CEREBRAS_API_KEY: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),
    E2B_API_KEY: z.string().min(1),
    ELEVENLABS_API_KEY: z.string().optional(),
    TAVILY_API_KEY: z.string().min(1),
    EXA_API_KEY: z.string().min(1),
    TMDB_API_KEY: z.string().optional(),
    YT_ENDPOINT: z.string().optional(),
    FIRECRAWL_API_KEY: z.string().min(1),
    OPENWEATHER_API_KEY: z.string().optional(),
    SANDBOX_TEMPLATE_ID: z.string().optional(),
    GOOGLE_MAPS_API_KEY: z.string().optional(),
    MAPBOX_ACCESS_TOKEN: z.string().optional(),
    TRIPADVISOR_API_KEY: z.string().optional(),
    AVIATION_STACK_API_KEY: z.string().optional(),
    CRON_SECRET: z.string().optional(),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    MEM0_API_KEY: z.string().optional(),
    MEM0_ORG_ID: z.string().optional(),
    MEM0_PROJECT_ID: z.string().optional(),
    SMITHERY_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1),
  },
  experimental__runtimeEnv: process.env,
})
