import { CacheStrategy } from '../types';

export class CacheStrategies {
  /**
   * Get default cache strategies for different query types
   */
  static getDefaultStrategies(): CacheStrategy[] {
    return [
      {
        name: 'semantic',
        type: 'semantic',
        defaultTTL: 3600, // 1 hour
        semanticThreshold: 0.85,
        compressionEnabled: true,
        maxSize: 1000000, // 1MB
        shouldCache: (key: string, value: any) => {
          // Don't cache very small or very large responses
          const size = JSON.stringify(value).length;
          return size > 100 && size < 500000; // 100 bytes to 500KB
        },
        onHit: (key: string, entry) => {
          console.debug(`Semantic cache hit for: ${key.substring(0, 50)}...`);
        },
        onMiss: (key: string) => {
          console.debug(`Semantic cache miss for: ${key.substring(0, 50)}...`);
        }
      },
      {
        name: 'exact',
        type: 'exact',
        defaultTTL: 1800, // 30 minutes
        compressionEnabled: false,
        shouldCache: (key: string, value: any) => {
          return JSON.stringify(value).length < 100000; // Only cache < 100KB
        }
      },
      {
        name: 'search',
        type: 'semantic',
        defaultTTL: 3600, // 1 hour
        semanticThreshold: 0.8,
        compressionEnabled: true,
        customKeyGenerator: (key: string) => {
          // Normalize search queries for better cache hits
          return key.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        }
      },
      {
        name: 'weather',
        type: 'geo-temporal',
        defaultTTL: 1800, // 30 minutes (weather changes frequently)
        compressionEnabled: false,
        customKeyGenerator: (key: string) => {
          // Extract location from weather queries
          const locationMatch = key.match(/weather\s+(?:in|for|at)?\s*([^,]+)/i);
          return locationMatch ? `weather:${locationMatch[1].trim()}` : key;
        }
      },
      {
        name: 'stock',
        type: 'financial',
        defaultTTL: 300, // 5 minutes (stock prices change frequently)
        compressionEnabled: false,
        customKeyGenerator: (key: string) => {
          // Extract stock symbol from queries
          const symbolMatch = key.match(/(?:stock|price)\s+(?:of|for)?\s*([A-Z]{1,5})/i);
          return symbolMatch ? `stock:${symbolMatch[1].toUpperCase()}` : key;
        }
      },
      {
        name: 'academic',
        type: 'semantic',
        defaultTTL: 7200, // 2 hours (academic content is more stable)
        semanticThreshold: 0.9, // Higher threshold for academic precision
        compressionEnabled: true
      },
      {
        name: 'news',
        type: 'semantic',
        defaultTTL: 900, // 15 minutes (news changes frequently)
        semanticThreshold: 0.75,
        compressionEnabled: true,
        customKeyGenerator: (key: string) => {
          // Normalize news queries by removing temporal words
          return key.toLowerCase()
            .replace(/\b(today|yesterday|latest|recent|breaking)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        }
      },
      {
        name: 'maps',
        type: 'geo-temporal',
        defaultTTL: 3600, // 1 hour (location data is relatively stable)
        compressionEnabled: true,
        customKeyGenerator: (key: string) => {
          // Normalize location queries
          return key.toLowerCase()
            .replace(/\b(near|around|close to|in|at)\b/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        }
      },
      {
        name: 'translate',
        type: 'exact',
        defaultTTL: 86400, // 24 hours (translations don't change)
        compressionEnabled: false,
        customKeyGenerator: (key: string) => {
          // Create consistent key for translations
          const match = key.match(/translate\s+"([^"]+)"\s+(?:from\s+(\w+)\s+)?to\s+(\w+)/i);
          if (match) {
            const [, text, fromLang = 'auto', toLang] = match;
            return `translate:${fromLang}:${toLang}:${text}`;
          }
          return key;
        }
      },
      {
        name: 'user-specific',
        type: 'user-specific',
        defaultTTL: 1800, // 30 minutes
        compressionEnabled: true,
        customKeyGenerator: (key: string) => {
          // Will be overridden with user ID in practice
          return key;
        },
        shouldCache: (key: string, value: any) => {
          // Only cache non-sensitive user data
          const sensitiveTerms = ['password', 'token', 'secret', 'private'];
          const keyLower = key.toLowerCase();
          return !sensitiveTerms.some(term => keyLower.includes(term));
        }
      },
      {
        name: 'code',
        type: 'exact',
        defaultTTL: 7200, // 2 hours (code execution results can be cached longer)
        compressionEnabled: true,
        shouldCache: (key: string, value: any) => {
          // Only cache successful code execution results
          if (typeof value === 'object' && value.error) {
            return false; // Don't cache errors
          }
          return true;
        }
      }
    ];
  }

  /**
   * Get strategy by query type
   */
  static getStrategyForQuery(query: string): string {
    const queryLower = query.toLowerCase();

    // Weather queries
    if (/weather|temperature|forecast|rain|snow/i.test(queryLower)) {
      return 'weather';
    }

    // Stock/financial queries
    if (/stock|price|market|trading|crypto|bitcoin/i.test(queryLower)) {
      return 'stock';
    }

    // Academic queries
    if (/research|paper|study|academic|journal|scientific/i.test(queryLower)) {
      return 'academic';
    }

    // News queries
    if (/news|breaking|latest|today|yesterday|current events/i.test(queryLower)) {
      return 'news';
    }

    // Location/map queries
    if (/near|location|address|map|directions|restaurant|hotel/i.test(queryLower)) {
      return 'maps';
    }

    // Translation queries
    if (/translate|translation|language/i.test(queryLower)) {
      return 'translate';
    }

    // Code queries
    if (/code|programming|function|algorithm|debug/i.test(queryLower)) {
      return 'code';
    }

    // Default to semantic search for general queries
    return 'search';
  }

  /**
   * Create a custom strategy
   */
  static createCustomStrategy(
    name: string,
    options: Partial<CacheStrategy>
  ): CacheStrategy {
    const defaultStrategy = this.getDefaultStrategies().find(s => s.name === 'semantic')!;
    
    return {
      ...defaultStrategy,
      name,
      ...options
    };
  }
}