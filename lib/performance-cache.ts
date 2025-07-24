// Performance cache with memory limits and automatic cleanup

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  accessCount: number;
  lastAccessed: number;
}

class PerformanceCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly ttl: number;
  private readonly name: string;

  constructor(name: string, maxSize: number = 1000, ttlMs: number = 2 * 60 * 1000) {
    this.name = name;
    this.maxSize = maxSize;
    this.ttl = ttlMs;

    // Clean up every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.cachedAt > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.data;
  }

  set(key: string, data: T): void {
    // Enforce memory limits
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, {
      data,
      cachedAt: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private evictLeastRecentlyUsed(): void {
    let lruKey = '';
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.cachedAt > this.ttl) {
        this.cache.delete(key);
        evicted++;
      }
    }

    // Cleanup completed silently
  }
}

// Create cache instances with appropriate limits
export const sessionCache = new PerformanceCache<any>('sessions', 500, 15 * 60 * 1000); // 15 min, 500 sessions
export const subscriptionCache = new PerformanceCache<any>('subscriptions', 1000, 1 * 60 * 1000); // 1 min, 1000 users
export const usageCountCache = new PerformanceCache<number>('usage-counts', 2000, 5 * 60 * 1000); // 5 min, 2000 users
export const proUserStatusCache = new PerformanceCache<boolean>('pro-user-status', 1000, 30 * 60 * 1000); // 30 min, 1000 users

// DodoPayments-specific caches
export const paymentCache = new PerformanceCache<any>('payments', 1000, 5 * 60 * 1000); // 5 min, 1000 users
export const paymentExpirationCache = new PerformanceCache<any>('payment-expiration', 1000, 30 * 60 * 1000); // 30 min, 1000 users
export const dodoProStatusCache = new PerformanceCache<any>('dodo-pro-status', 1000, 30 * 60 * 1000); // 30 min, 1000 users

// Cache key generators
export const createSessionKey = (token: string) => `session:${token}`;
export const createUserKey = (token: string) => `user:${token}`;
export const createSubscriptionKey = (userId: string) => `subscription:${userId}`;
export const createMessageCountKey = (userId: string) => `msg-count:${userId}`;
export const createExtremeCountKey = (userId: string) => `extreme-count:${userId}`;
export const createProUserKey = (userId: string) => `pro-user:${userId}`;

// DodoPayments cache key generators
export const createPaymentKey = (userId: string) => `payments:${userId}`;
export const createPaymentExpirationKey = (userId: string) => `payment-expiration:${userId}`;
export const createDodoProStatusKey = (userId: string) => `dodo-pro-status:${userId}`;

// Extract session token from headers
export function extractSessionToken(headers: Headers): string | null {
  const cookies = headers.get('cookie');
  if (!cookies) return null;

  const match = cookies.match(/better-auth\.session_token=([^;]+)/);
  return match ? match[1] : null;
}

// Pro user status helpers with caching
export function getProUserStatus(userId: string): boolean | null {
  const cacheKey = createProUserKey(userId);
  return proUserStatusCache.get(cacheKey);
}

export function setProUserStatus(userId: string, isProUser: boolean): void {
  const cacheKey = createProUserKey(userId);
  proUserStatusCache.set(cacheKey, isProUser);
}

export function computeAndCacheProUserStatus(userId: string, subscriptionData: any): boolean {
  const isProUser = Boolean(subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active');

  setProUserStatus(userId, isProUser);
  return isProUser;
}

// DodoPayments cache helpers
export function getDodoPayments(userId: string) {
  const cacheKey = createPaymentKey(userId);
  return paymentCache.get(cacheKey);
}

export function setDodoPayments(userId: string, payments: any) {
  const cacheKey = createPaymentKey(userId);
  paymentCache.set(cacheKey, payments);
}

export function getDodoPaymentExpiration(userId: string) {
  const cacheKey = createPaymentExpirationKey(userId);
  return paymentExpirationCache.get(cacheKey);
}

export function setDodoPaymentExpiration(userId: string, expirationData: any) {
  const cacheKey = createPaymentExpirationKey(userId);
  paymentExpirationCache.set(cacheKey, expirationData);
}

export function getDodoProStatus(userId: string) {
  const cacheKey = createDodoProStatusKey(userId);
  return dodoProStatusCache.get(cacheKey);
}

export function setDodoProStatus(userId: string, statusData: any) {
  const cacheKey = createDodoProStatusKey(userId);
  dodoProStatusCache.set(cacheKey, statusData);
}

// Cache invalidation helpers
export function invalidateUserCaches(userId: string) {
  subscriptionCache.delete(createSubscriptionKey(userId));
  usageCountCache.delete(createMessageCountKey(userId));
  usageCountCache.delete(createExtremeCountKey(userId));
  proUserStatusCache.delete(createProUserKey(userId));
  // Invalidate DodoPayments caches
  paymentCache.delete(createPaymentKey(userId));
  paymentExpirationCache.delete(createPaymentExpirationKey(userId));
  dodoProStatusCache.delete(createDodoProStatusKey(userId));
}

export function invalidateAllCaches() {
  sessionCache.clear();
  subscriptionCache.clear();
  usageCountCache.clear();
  proUserStatusCache.clear();
  // Clear DodoPayments caches
  paymentCache.clear();
  paymentExpirationCache.clear();
  dodoProStatusCache.clear();
}
