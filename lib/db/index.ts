import { drizzle } from 'drizzle-orm/node-postgres';
import { withReplicas } from 'drizzle-orm/pg-core';
import { serverEnv } from '@/env/server';
import { RedisDrizzleCache } from '@databuddy/cache';
import Redis from 'ioredis';
import * as schema from './schema';
import { Pool } from 'pg';

// SilentRedis wraps ioredis so that cache GET/SET errors are never propagated
// to @databuddy/cache (RedisDrizzleCache). Without this wrapper, a Redis blip
// causes RedisDrizzleCache to throw inside queryWithCache, which in turn makes
// every Drizzle DB query fail — resulting in blank chats and 500s.
//
// Behaviour with this wrapper:
//   • GET failure  → returns null  (cache miss; @databuddy/cache falls through to DB)
//   • SETEX failure → returns 'OK' (silently ignored; DB write is unaffected)
//   • All other commands are passed through unchanged.
//
// We also keep enableOfflineQueue:false so that a broken connection never queues
// commands indefinitely (which caused the original 57-min hang). The wrapper
// ensures those immediate rejections never escape to callers that don't handle them.
class SilentRedis extends Redis {
  async get(key: string): Promise<string | null> {
    try {
      return await super.get(key);
    } catch {
      return null;
    }
  }

  // ioredis overloads: (key, seconds, value) or (key, value, secondsOrExpiry, ...)
  // @databuddy/cache calls setex(key, ttl, value) — the three-arg form.
  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    try {
      return await super.setex(key, seconds, value);
    } catch {
      return 'OK';
    }
  }
}

const redis = new SilentRedis(serverEnv.REDIS_URL, {
  // Reject queued commands immediately when disconnected rather than queuing
  // indefinitely — prevents the 57-minute hang that was the original bug.
  enableOfflineQueue: false,
  connectTimeout: 2_000,
  commandTimeout: 1_500,
  maxRetriesPerRequest: 1,
  // No lazyConnect: ioredis connects eagerly on module load so the socket is
  // ready before the first request arrives. lazyConnect + enableOfflineQueue:false
  // created a race where requests arrived before the connection was established,
  // causing "Stream isn't writeable" errors that RedisDrizzleCache propagated.
  retryStrategy: (times: number) => {
    if (times > 5) return null; // stop retrying after 5 attempts
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
