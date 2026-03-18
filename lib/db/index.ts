import { drizzle } from 'drizzle-orm/node-postgres';
import { withReplicas } from 'drizzle-orm/pg-core';
import { serverEnv } from '@/env/server';
import * as schema from './schema';

export const maindb = drizzle(serverEnv.DATABASE_URL, {
  schema,
});

const dbread1 = drizzle(process.env.READ_DB_1!, {
  schema,
});

const dbread2 = drizzle(process.env.READ_DB_2!, {
  schema,
});

export const db = withReplicas(maindb, [dbread1, dbread2]);

// Export all database instances for cache invalidation
export const allDatabases = [maindb, dbread1, dbread2] as const;
