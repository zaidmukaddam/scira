import { createClient, RedisClientType } from 'redis';
let redis: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (!process.env.REDIS_URL || process.env.REDIS_URL === 'your_redis_url_here') {
    console.log('Redis URL not configured - caching disabled');
    return null;
  }

  // Re-create the client if the previous one is no longer connected (e.g. after a
  // serverless cold start where the prior TCP connection was closed by the host).
  if (redis && !redis.isOpen) {
    console.log('[redis-config] Client exists but connection is closed — reconnecting');
    redis = null;
  }

  if (!redis) {
    try {
      redis = createClient({
        url: process.env.REDIS_URL,
        socket: {
          // Bail out quickly instead of hanging indefinitely
          connectTimeout: 2_000,
          // Reconnect with back-off (max 10 s) up to 6 attempts then give up
          reconnectStrategy: (retries: number) => {
            if (retries > 5) return new Error('Redis max retries reached');
            return Math.min(retries * 500, 10_000);
          },
        },
      });

      redis.on('error', (err: Error) => {
        console.error('Redis connection error:', err.message);
      });

      redis.on('connect', () => {
        console.log('Redis connected successfully');
      });

      redis.on('ready', () => {
        console.log('Redis ready to accept commands');
      });

      // Connect to Redis
      await redis.connect();
    } catch (error) {
      console.error('Failed to create Redis client:', error);
      redis = null;
    }
  }

  return redis;
}

export async function closeRedis() {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
