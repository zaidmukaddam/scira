import { drizzle } from 'drizzle-orm/neon-http';
import { withReplicas } from 'drizzle-orm/pg-core';
import * as schema from '@/lib/db/schema';
import { serverEnv } from '@/env/server';
import { upstashCache } from 'drizzle-orm/cache/upstash';
import { neon } from '@neondatabase/serverless';

// Primary connection (required)
const sql = neon(serverEnv.DATABASE_URL);

// Optional read replicas — fall back to primary if not provided
const readDb1Url = process.env.READ_DB_1;
const readDb2Url = process.env.READ_DB_2;
const sqlread1 = readDb1Url ? neon(readDb1Url) : sql;
const sqlread2 = readDb2Url ? neon(readDb2Url) : sql;

// Optional Upstash cache — only configure if both URL and TOKEN are set
const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const cache = hasUpstash
  ? upstashCache({
      url: process.env.UPSTASH_REDIS_REST_URL as string,
      token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
      global: true,
      config: { ex: 600 },
    })
  : undefined;

export const maindb = drizzle(sql, {
  schema,
  // @ts-expect-error allow optional cache at runtime
  cache,
});

const dbread1 = drizzle(sqlread1, {
  schema,
  // @ts-expect-error allow optional cache at runtime
  cache,
});

const dbread2 = drizzle(sqlread2, {
  schema,
  // @ts-expect-error allow optional cache at runtime
  cache,
});

export const db = withReplicas(maindb, [dbread1, dbread2]);
