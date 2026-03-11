import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiter is only active when Upstash credentials are present.
// Without them (e.g. local dev), all requests pass through.
export const unauthenticatedRateLimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(3, '7 d'),
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
