import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';
import { serverEnv } from '@/env/server';

// Unified connection with optimized pooling for better consistency
const client = postgres(serverEnv.DATABASE_URL, {
  max: 10, // Reduced pool size for better consistency
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: true, // Enable prepared statements for better performance and consistency
});

export const db = drizzle(client, { schema });
