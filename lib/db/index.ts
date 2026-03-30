import { drizzle } from 'drizzle-orm/node-postgres';
import { withReplicas } from 'drizzle-orm/pg-core';
import { serverEnv } from '@/env/server';
import { RedisDrizzleCache } from '@databuddy/cache';
import Redis from 'ioredis';
import * as schema from './schema';
import { Pool } from 'pg';

// Create Redis client with fail-fast settings so a broken Redis connection
// never blocks DB queries or causes hanging requests:
//   • enableOfflineQueue: false  — reject commands immediately when disconnected
//     instead of queueing them indefinitely (the default true causes 57-min hangs)
//   • connectTimeout / commandTimeout — bail out quickly rather than waiting forever
//   • maxRetriesPerRequest: 1     — one retry then throw, not infinite retries
//   • lazyConnect: true           — don't block the process at startup
const redis = new Redis(serverEnv.REDIS_URL, {
  enableOfflineQueue: false,
  connectTimeout: 2_000,
  commandTimeout: 1_500,
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  retryStrategy: (times: number) => {
    // Exponential back-off up to 10 s, then stop retrying
    if (times > 5) return null; // null = stop retrying
    return Math.min(times * 500, 10_000);
  },
});

// Surface ioredis errors instead of crashing with "Unhandled error event"
redis.on('error', (err: Error) => {
  console.error('[ioredis] connection error:', err.message);
});

// Create shared cache instance
const cache = new RedisDrizzleCache({
  redis,
  defaultTtl: 20,
  strategy: 'explicit',
  namespace: 'scira:drizzle',
});

// Supabase PgBouncer uses a self-signed cert chain; rejectUnauthorized: false
// keeps the connection encrypted while skipping strict CA verification.
const sslConfig = { rejectUnauthorized: false };

export const maindb = drizzle({
  client: new Pool({
    connectionString: serverEnv.DATABASE_URL,
    ssl: sslConfig,
  }),
  schema,
  cache,
});

// Only create read replicas when URLs are explicitly configured.
// When absent, all reads fall through to maindb automatically.
const readReplicas: ReturnType<typeof drizzle>[] = [];

if (process.env.READ_DB_1) {
  readReplicas.push(drizzle({
    client: new Pool({ connectionString: process.env.READ_DB_1, ssl: sslConfig }),
    schema,
    cache,
  }));
}

if (process.env.READ_DB_2) {
  readReplicas.push(drizzle({
    client: new Pool({ connectionString: process.env.READ_DB_2, ssl: sslConfig }),
    schema,
    cache,
  }));
}

const REPLICA_WEIGHTS = [4, 6];
let currentIndex = -1;
let currentWeight = 0;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

function selectReplica<T>(replicas: readonly T[]): T {
  if (!replicas.length) throw new Error('No replicas configured');
  const weights = REPLICA_WEIGHTS.slice(0, replicas.length);
  const maxWeight = Math.max(...weights);
  const weightGcd = weights.reduce(gcd);
  while (true) {
    currentIndex = (currentIndex + 1) % replicas.length;
    if (currentIndex === 0) {
      currentWeight -= weightGcd;
      if (currentWeight <= 0) currentWeight = maxWeight;
    }
    if (weights[currentIndex] >= currentWeight) return replicas[currentIndex]!;
  }
}

// Cast to typeof maindb so TypeScript resolves db.query.* relational types correctly.
// withReplicas() loses generic schema types at the type level; the cast is safe because
// all replica instances are created with the same schema.
export const db: typeof maindb =
  readReplicas.length > 0
    ? (withReplicas(maindb, readReplicas as any, (replicas: any): typeof maindb => selectReplica(replicas)) as unknown as typeof maindb)
    : maindb;

type ReplicaClient = typeof maindb;

export function getReadReplica(): ReplicaClient {
  return readReplicas.length > 0 ? selectReplica(readReplicas as any) : maindb;
}

// Export all database instances for cache invalidation
export const allDatabases = [maindb, ...readReplicas] as const;
