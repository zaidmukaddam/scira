import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';
import { serverEnv } from '@/env/server';
import { upstashCache } from 'drizzle-orm/cache/upstash';

// Unified connection with optimized pooling for better consistency
const client = postgres(serverEnv.DATABASE_URL, {
  max: 200, // Reduced pool size for better consistency
  idle_timeout: 60,
  connect_timeout: 30,
  prepare: true, // Enable prepared statements for better performance and consistency
});

export const db = drizzle(client, {
  schema,
  cache: upstashCache({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    global: true,
    config: { ex: 300 },
  }),
});
