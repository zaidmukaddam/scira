import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';
import { serverEnv } from '@/env/server';

// Unified connection with optimized pooling
const client = postgres(serverEnv.DATABASE_URL, {
  max: 50,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

export const db = drizzle(client, { schema });
