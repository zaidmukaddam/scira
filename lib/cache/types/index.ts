export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  fingerprint: QueryFingerprint;
  strategy: string;
  metadata?: {
    queryType?: string;
    userId?: string;
    sessionId?: string;
    cost?: number;
    tokenCount?: number;
  };
}

export interface QueryFingerprint {
  hash: string;
  embedding?: number[];
  originalQuery: string;
  normalizedQuery?: string;
  queryType?: string;
}

export interface CacheStrategy {
  name: string;
  type: 'semantic' | 'exact' | 'geo-temporal' | 'financial' | 'user-specific';
  defaultTTL: number;
  maxSize?: number;
  compressionEnabled?: boolean;
  semanticThreshold?: number;
  customKeyGenerator?: (key: string) => string;
  shouldCache?: (key: string, value: any) => boolean;
  onHit?: (key: string, entry: CacheEntry) => void;
  onMiss?: (key: string) => void;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  averageLatency: number;
  storageSize: number;
  evictions: number;
  lastUpdated: number;
}

export interface SemanticSearchResult {
  key: string;
  similarity: number;
  entry: CacheEntry;
  distance: number;
}

export interface CacheConfig {
  redis: {
    url: string;
    token?: string;
    maxRetries?: number;
    retryDelay?: number;
  };
  strategies: Record<string, CacheStrategy>;
  defaultStrategy: string;
  enableCompression?: boolean;
  enableMetrics?: boolean;
  metricsInterval?: number;
  maxCacheSize?: number;
  cleanupInterval?: number;
}

export interface BatchRequest {
  id: string;
  key: string;
  options?: CacheOptions;
  timestamp: number;
}

export interface CacheOptions {
  strategy?: string;
  ttl?: number;
  forceRefresh?: boolean;
  enableSemantic?: boolean;
  semanticThreshold?: number;
  metadata?: Record<string, any>;
}

export interface CacheMiddlewareOptions {
  strategy?: string;
  ttl?: number;
  keyGenerator?: (req: any) => string;
  shouldCache?: (req: any, res: any) => boolean;
  onHit?: (key: string, data: any) => void;
  onMiss?: (key: string) => void;
}

export type CacheEventType = 'hit' | 'miss' | 'set' | 'delete' | 'evict' | 'error';

export interface CacheEvent {
  type: CacheEventType;
  key: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface CacheMetrics {
  stats: CacheStats;
  events: CacheEvent[];
  strategies: Record<string, {
    hits: number;
    misses: number;
    hitRate: number;
  }>;
}

// Error types
export class CacheError extends Error {
  constructor(message: string, public code: string, public cause?: Error) {
    super(message);
    this.name = 'CacheError';
  }
}

export class SemanticCacheError extends CacheError {
  constructor(message: string, cause?: Error) {
    super(message, 'SEMANTIC_ERROR', cause);
    this.name = 'SemanticCacheError';
  }
}

export class CacheConfigError extends CacheError {
  constructor(message: string, cause?: Error) {
    super(message, 'CONFIG_ERROR', cause);
    this.name = 'CacheConfigError';
  }
}