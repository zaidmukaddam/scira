// Performance cache with memory limits and automatic cleanup
// Uses a doubly-linked list for O(1) LRU eviction

import { allDatabases } from '@/lib/db';
import { dodosubscription, subscription, user } from './db/schema';

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  accessCount: number;
  lastAccessed: number;
}

// Doubly-linked list node for O(1) LRU operations
interface LRUNode<T> {
  key: string;
  entry: CacheEntry<T>;
  prev: LRUNode<T> | null;
  next: LRUNode<T> | null;
}

class PerformanceCache<T> {
  private cache = new Map<string, LRUNode<T>>();
  private head: LRUNode<T> | null = null; // Most recently used
  private tail: LRUNode<T> | null = null; // Least recently used
  private readonly maxSize: number;
  private readonly ttl: number;
  private readonly name: string;
  private static cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private static instances = new Set<PerformanceCache<any>>();

  constructor(name: string, maxSize: number = 1000, ttlMs: number = 2 * 60 * 1000) {
    this.name = name;
    this.maxSize = maxSize;
    this.ttl = ttlMs;

    PerformanceCache.instances.add(this);

    // Single shared cleanup timer for all cache instances
    if (!PerformanceCache.cleanupTimer) {
      const timer = setInterval(() => {
        for (const instance of PerformanceCache.instances) {
          instance.cleanup();
        }
      }, 5 * 60 * 1000);
      // Avoid keeping the event loop alive in serverless/idle contexts
      if (typeof (timer as any).unref === 'function') {
        (timer as any).unref();
      }
      PerformanceCache.cleanupTimer = timer;
    }
  }

  get(key: string): T | null {
    const node = this.cache.get(key);
    if (!node) return null;

    // Check if expired
    if (Date.now() - node.entry.cachedAt > this.ttl) {
      this.removeNode(node);
      this.cache.delete(key);
      return null;
    }

    // Update access stats and move to head (most recently used)
    node.entry.accessCount++;
    node.entry.lastAccessed = Date.now();
    this.moveToHead(node);

    return node.entry.data;
  }

  set(key: string, data: T): void {
    const existingNode = this.cache.get(key);

    if (existingNode) {
      // Update existing entry and move to head
      existingNode.entry.data = data;
      existingNode.entry.cachedAt = Date.now();
      existingNode.entry.accessCount++;
      existingNode.entry.lastAccessed = Date.now();
      this.moveToHead(existingNode);
      return;
    }

    // Enforce memory limits - evict LRU entry (tail) in O(1)
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    // Create new node
    const newNode: LRUNode<T> = {
      key,
      entry: {
        data,
        cachedAt: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now(),
      },
      prev: null,
      next: null,
    };

    // Add to cache and linked list
    this.cache.set(key, newNode);
    this.addToHead(newNode);
  }

  delete(key: string): void {
    const node = this.cache.get(key);
    if (node) {
      this.removeNode(node);
      this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  // O(1) eviction - remove tail node
  private evictLeastRecentlyUsed(): void {
    if (this.tail) {
      const keyToRemove = this.tail.key;
      this.removeNode(this.tail);
      this.cache.delete(keyToRemove);
    }
  }

  // Add node to head of linked list
  private addToHead(node: LRUNode<T>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  // Remove node from linked list
  private removeNode(node: LRUNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  // Move existing node to head (most recently used)
  private moveToHead(node: LRUNode<T>): void {
    if (node === this.head) return; // Already at head
    this.removeNode(node);
    this.addToHead(node);
  }

  private cleanup(): void {
    const now = Date.now();

    // Iterate through cache and remove expired entries
    for (const [key, node] of this.cache.entries()) {
      if (now - node.entry.cachedAt > this.ttl) {
        this.removeNode(node);
        this.cache.delete(key);
      }
    }
  }
}

// Create cache instances with appropriate limits
export const sessionCache = new PerformanceCache<any>('sessions', 500, 15 * 60 * 1000); // 15 min, 500 sessions
export const subscriptionCache = new PerformanceCache<any>('subscriptions', 1000, 1 * 60 * 1000); // 1 min, 1000 users
export const usageCountCache = new PerformanceCache<number>('usage-counts', 2000, 5 * 60 * 1000); // 5 min, 2000 users
export const proUserStatusCache = new PerformanceCache<boolean>('pro-user-status', 1000, 30 * 60 * 1000); // 30 min, 1000 users

// Dodo Subscriptions-specific caches
export const dodoSubscriptionCache = new PerformanceCache<any>('dodo-subscriptions', 1000, 5 * 60 * 1000); // 5 min, 1000 users
export const dodoSubscriptionExpirationCache = new PerformanceCache<any>(
  'dodo-subscription-expiration',
  1000,
  30 * 60 * 1000,
); // 30 min, 1000 users
export const dodoProStatusCache = new PerformanceCache<any>('dodo-pro-status', 1000, 30 * 60 * 1000); // 30 min, 1000 users

// Cache key generators
export const createSessionKey = (token: string) => `session:${token}`;
export const createUserKey = (token: string) => `user:${token}`;
export const createSubscriptionKey = (userId: string) => `subscription:${userId}`;
export const createMessageCountKey = (userId: string) => `msg-count:${userId}`;
export const createExtremeCountKey = (userId: string) => `extreme-count:${userId}`;
export const createProUserKey = (userId: string) => `pro-user:${userId}`;

// Dodo Subscriptions cache key generators
export const createDodoSubscriptionKey = (userId: string) => `dodo-subscriptions:${userId}`;
export const createDodoSubscriptionExpirationKey = (userId: string) => `dodo-subscription-expiration:${userId}`;
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

// Dodo Subscriptions cache helpers
export function getDodoSubscriptions(userId: string) {
  const cacheKey = createDodoSubscriptionKey(userId);
  return dodoSubscriptionCache.get(cacheKey);
}

export function setDodoSubscriptions(userId: string, subscriptions: any) {
  const cacheKey = createDodoSubscriptionKey(userId);
  dodoSubscriptionCache.set(cacheKey, subscriptions);
}

export function getDodoSubscriptionExpiration(userId: string) {
  const cacheKey = createDodoSubscriptionExpirationKey(userId);
  return dodoSubscriptionExpirationCache.get(cacheKey);
}

export function setDodoSubscriptionExpiration(userId: string, expirationData: any) {
  const cacheKey = createDodoSubscriptionExpirationKey(userId);
  dodoSubscriptionExpirationCache.set(cacheKey, expirationData);
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
  // Invalidate Dodo Subscription caches
  dodoSubscriptionCache.delete(createDodoSubscriptionKey(userId));
  dodoSubscriptionExpirationCache.delete(createDodoSubscriptionExpirationKey(userId));
  dodoProStatusCache.delete(createDodoProStatusKey(userId));

  // Invalidate the db cache on ALL database instances (main + read replicas)
  // Only invalidate if the database has caching enabled ($cache may be undefined)
  const tablesToInvalidate = { tables: [user, subscription, dodosubscription] };
  for (const database of allDatabases) {
    if (database.$cache) {
      database.$cache.invalidate(tablesToInvalidate);
    }
  }
}

export function invalidateAllCaches() {
  sessionCache.clear();
  subscriptionCache.clear();
  usageCountCache.clear();
  proUserStatusCache.clear();
  // Clear Dodo Subscription caches
  dodoSubscriptionCache.clear();
  dodoSubscriptionExpirationCache.clear();
  dodoProStatusCache.clear();
}
