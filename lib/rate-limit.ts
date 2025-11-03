import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Check if we have valid Upstash credentials
const hasValidUpstash =
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_URL !== 'placeholder' &&
  process.env.UPSTASH_REDIS_REST_TOKEN &&
  process.env.UPSTASH_REDIS_REST_TOKEN !== 'placeholder' &&
  process.env.UPSTASH_REDIS_REST_URL.includes('upstash.io');

// Create a new ratelimiter that allows 3 requests per day for unauthenticated users
// Only if we have valid Upstash credentials
export const unauthenticatedRateLimit = hasValidUpstash
  ? new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(3, '1 d'), // 3 requests per 1 day
      analytics: true,
      prefix: '@upstash/ratelimit:unauth',
    })
  : null;

// Helper function to get IP address from request
export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] ?? realIp ?? 'unknown';
  return `ip:${ip}`;
}

