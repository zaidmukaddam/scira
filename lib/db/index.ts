import { drizzle } from 'drizzle-orm/node-postgres';
import { withReplicas } from 'drizzle-orm/pg-core';
import { serverEnv } from '@/env/server';
import { RedisDrizzleCache } from '@databuddy/cache';
import Redis from 'ioredis';
import * as schema from './schema';
import { Pool } from 'pg';

// Create Redis client
const redis = new Redis(serverEnv.REDIS_URL);

// Create shared cache instance
const cache = new RedisDrizzleCache({
  redis,
  defaultTtl: 20,
  strategy: 'explicit',
  namespace: 'scira:drizzle',
});

export const maindb = drizzle({
  client: new Pool({
    connectionString: serverEnv.DATABASE_URL,
    ssl: true,
  }),
  schema,
  cache,
});

const dbread1 = drizzle({
  client: new Pool({
    connectionString: process.env.READ_DB_1,
    ssl: true,
  }),
  schema,
  cache,
});

const dbread2 = drizzle({
  client: new Pool({
    connectionString: process.env.READ_DB_2,
    ssl: true,
  }),
  schema,
  cache,
});

const REPLICA_WEIGHTS = [4, 6];
let currentIndex = -1;
let currentWeight = 0;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const MAX_WEIGHT = Math.max(...REPLICA_WEIGHTS);
const WEIGHT_GCD = REPLICA_WEIGHTS.reduce(gcd);

function selectReplica<T>(replicas: readonly T[]): T {
  if (!replicas.length) {
    throw new Error('No replicas configured');
  }

  const weights = REPLICA_WEIGHTS.slice(0, replicas.length);

  while (true) {
    currentIndex = (currentIndex + 1) % replicas.length;

    if (currentIndex === 0) {
      currentWeight -= WEIGHT_GCD;
      if (currentWeight <= 0) {
        currentWeight = MAX_WEIGHT;
      }
    }

    if (weights[currentIndex] >= currentWeight) {
      return replicas[currentIndex]!;
    }
  }
}

export const db = withReplicas(maindb, [dbread1, dbread2], (replicas) => selectReplica(replicas));

type ReplicaClient = (typeof db)['$replicas'][number];

export function getReadReplica(): ReplicaClient {
  return selectReplica(db.$replicas);
}

// Export all database instances for cache invalidation
export const allDatabases = [maindb, dbread1, dbread2] as const;
