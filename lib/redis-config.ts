import { createClient, RedisClientType } from 'redis';
let redis: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType | null> {
  if (!process.env.REDIS_URL || process.env.REDIS_URL === 'your_redis_url_here') {
    console.log('Redis URL not configured - caching disabled');
    return null;
  }

  if (!redis) {
    try {
      redis = createClient({ url: process.env.REDIS_URL });

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
