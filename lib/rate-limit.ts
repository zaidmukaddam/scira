import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create a ratelimiter that allows 25 requests per week for unauthenticated users
export const unauthenticatedRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(25, '7 d'), // 25 requests per 1 week
  analytics: true,
  prefix: '@upstash/ratelimit:unauth',
});

// Helper function to get IP address from request
export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp?.trim() || cfConnectingIp?.trim();
  return ip ? `ip:${ip}` : 'ip:unknown';
}
