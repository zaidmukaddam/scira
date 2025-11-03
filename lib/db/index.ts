import { drizzle } from 'drizzle-orm/neon-http';
import { withReplicas } from 'drizzle-orm/pg-core';
import * as schema from '@/lib/db/schema';
import { serverEnv } from '@/env/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(serverEnv.DATABASE_URL);

// Check if we have read replicas configured
const hasReadReplicas =
  process.env.READ_DB_1 &&
  process.env.READ_DB_1 !== 'placeholder' &&
  process.env.READ_DB_2 &&
  process.env.READ_DB_2 !== 'placeholder';

// Note: Upstash cache temporarily disabled for development
// To enable cache in production, uncomment and configure Upstash credentials
export const maindb = drizzle(sql, {
  schema,
});

// Only configure read replicas if they exist
let db: typeof maindb;

if (hasReadReplicas) {
  const sqlread1 = neon(process.env.READ_DB_1!);
  const sqlread2 = neon(process.env.READ_DB_2!);

  const dbread1 = drizzle(sqlread1, {
    schema,
  });

  const dbread2 = drizzle(sqlread2, {
    schema,
  });

  db = withReplicas(maindb, [dbread1, dbread2]);
} else {
  // In development or without read replicas, just use the main database
  db = maindb;
}

export { db };
