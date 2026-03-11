/**
 * Failed Image Cache
 * Prevents repeated attempts to load images that have failed
 */

interface FailedImageEntry {
  url: string;
  failedAt: number;
  attempts: number;
  reason: string;
}

class FailedImageCache {
  private cache: Map<string, FailedImageEntry> = new Map();
  private readonly TTL = 1000 * 60 * 60 * 24; // 24 hours
  private readonly MAX_ATTEMPTS = 3;

  /**
   * Check if an image URL has failed recently
   */
  hasFailed(url: string): boolean {
    const entry = this.cache.get(url);
    if (!entry) return false;

    // Check if TTL has expired
    if (Date.now() - entry.failedAt > this.TTL) {
      this.cache.delete(url);
      return false;
    }

    return entry.attempts >= this.MAX_ATTEMPTS;
  }

  /**
   * Record a failed image load attempt
   */
  recordFailure(url: string, reason: string = 'Unknown error') {
    const existing = this.cache.get(url);

    if (existing && Date.now() - existing.failedAt < this.TTL) {
      // Update existing entry
      existing.attempts++;
      existing.failedAt = Date.now();
      existing.reason = reason;
    } else {
      // Create new entry
      this.cache.set(url, {
        url,
        failedAt: Date.now(),
        attempts: 1,
        reason,
      });
    }
  }

  /**
   * Clear a specific URL from the cache
   */
  clear(url: string) {
    this.cache.delete(url);
  }

  /**
   * Clear all entries older than TTL
   */
  cleanup() {
    const now = Date.now();
    for (const [url, entry] of this.cache.entries()) {
      if (now - entry.failedAt > this.TTL) {
        this.cache.delete(url);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.values()),
    };
  }
}

// Export singleton instance
export const failedImageCache = new FailedImageCache();

// Run cleanup every hour
if (typeof window === 'undefined') {
  setInterval(() => failedImageCache.cleanup(), 1000 * 60 * 60);
}
