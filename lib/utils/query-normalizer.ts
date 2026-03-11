// Query normalization utilities to increase cache hit rates

export class QueryNormalizer {
  // Normalize queries for better cache hits
  static normalizeQuery(query: string): string {
    return (
      query
        .toLowerCase()
        .trim()
        // Expand common contractions
        .replace(/what's/g, 'what is')
        .replace(/where's/g, 'where is')
        .replace(/it's/g, 'it is')
        .replace(/won't/g, 'will not')
        .replace(/can't/g, 'cannot')
        .replace(/i'm/g, 'i am')
        .replace(/you're/g, 'you are')
        .replace(/they're/g, 'they are')
        .replace(/we're/g, 'we are')
        // Remove filler words
        .replace(/\b(please|could you|can you|would you|tell me|show me)\b/g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim()
        // Remove punctuation at end
        .replace(/[?!.,;]+$/, '')
    );
  }

  // Normalize location names for consistent caching
  static normalizeLocation(location: string | any): string {
    // Handle non-string inputs
    if (!location) return '';
    if (typeof location !== 'string') {
      // If it's an object with a value property (SambaNova format)
      if (location?.value && typeof location.value === 'string') {
        location = location.value;
      } else {
        location = String(location);
      }
    }

    return (
      location
        .trim()
        // Remove country codes (e.g., "Sydney, AU" → "Sydney")
        .split(',')[0]
        .trim()
        // Capitalize properly
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ')
        // Common abbreviations
        .replace(/\bNyc\b/i, 'New York City')
        .replace(/\bLa\b/i, 'Los Angeles')
        .replace(/\bSf\b/i, 'San Francisco')
        .replace(/\bSyd\b/i, 'Sydney')
        .replace(/\bMelb\b/i, 'Melbourne')
    );
  }

  // Normalize stock ticker symbols
  static normalizeTicker(ticker: string | any): string {
    // Handle non-string inputs
    if (!ticker) return '';
    if (typeof ticker !== 'string') {
      // If it's an object with a value property (SambaNova format)
      if (ticker?.value && typeof ticker.value === 'string') {
        ticker = ticker.value;
      } else {
        ticker = String(ticker);
      }
    }

    return (
      ticker
        .toUpperCase()
        .trim()
        // Remove common prefixes
        .replace(/^\$/, '')
        .replace(/^NASDAQ:/i, '')
        .replace(/^NYSE:/i, '')
        .replace(/^ASX:/i, '')
    );
  }

  // Extract and normalize parameters from natural language
  static extractParameters(query: string): {
    location?: string;
    ticker?: string;
    timeContext?: string;
    searchType?: string;
  } {
    const normalized = this.normalizeQuery(query);

    // Location patterns
    const locationMatch =
      normalized.match(/(?:weather|temperature|forecast|conditions?)\s+(?:in|at|for)?\s*([a-z\s]+?)(?:\s|$)/i) ||
      normalized.match(/(?:in|at|near)\s+([a-z\s]+?)(?:\s|$)/i);

    // Stock/crypto patterns
    const tickerMatch =
      normalized.match(/\$?([A-Z]{1,5})\s+(?:stock|price|chart)/i) ||
      normalized.match(/(?:stock|price|chart)\s+(?:of|for)?\s*\$?([A-Z]{1,5})/i);

    // Time context
    const timeMatch = normalized.match(/\b(today|tomorrow|yesterday|this week|next week|weekend)\b/i);

    return {
      location: locationMatch ? this.normalizeLocation(locationMatch[1]) : undefined,
      ticker: tickerMatch ? this.normalizeTicker(tickerMatch[1]) : undefined,
      timeContext: timeMatch ? timeMatch[1].toLowerCase() : undefined,
      searchType: this.detectSearchType(normalized),
    };
  }

  // Detect the type of search from query
  private static detectSearchType(query: string): string | undefined {
    if (/weather|temperature|forecast|rain|snow|sunny|cloudy/.test(query)) {
      return 'weather';
    }
    if (/stock|share|price|market|trading/.test(query)) {
      return 'stock';
    }
    if (/movie|film|tv|show|series|watch/.test(query)) {
      return 'entertainment';
    }
    if (/translate|translation|language/.test(query)) {
      return 'translation';
    }
    if (/flight|plane|airport|departure|arrival/.test(query)) {
      return 'flight';
    }
    return undefined;
  }

  // Generate normalized cache key for tool arguments
  static normalizeToolArgs(toolName: string, args: any): any {
    try {
      // If args is not an object, return as-is
      if (!args || typeof args !== 'object') {
        return args;
      }

      const normalized = { ...args };

      switch (toolName) {
        case 'get_weather_data':
          if (normalized.location) {
            try {
              normalized.location = this.normalizeLocation(normalized.location);
            } catch (e) {
              console.warn('[QueryNormalizer] Failed to normalize location:', e);
              // Keep original value
            }
          }
          break;

        case 'stock_chart':
        case 'coin_data':
          if (normalized.ticker) {
            try {
              normalized.ticker = this.normalizeTicker(normalized.ticker);
            } catch (e) {
              console.warn('[QueryNormalizer] Failed to normalize ticker:', e);
            }
          }
          if (normalized.symbol) {
            try {
              normalized.symbol = this.normalizeTicker(normalized.symbol);
            } catch (e) {
              console.warn('[QueryNormalizer] Failed to normalize symbol:', e);
            }
          }
          if (normalized.coinId && typeof normalized.coinId === 'string') {
            normalized.coinId = normalized.coinId.toLowerCase().trim();
          }
          break;

        case 'web_search':
          if (normalized.queries && Array.isArray(normalized.queries)) {
            normalized.queries = normalized.queries.map((q: string) => {
              try {
                return this.normalizeQuery(q);
              } catch (e) {
                console.warn('[QueryNormalizer] Failed to normalize query:', e);
                return q; // Return original
              }
            });
          }
          break;

        case 'find_place_on_map':
        case 'nearby_places_search':
          if (normalized.location) {
            try {
              normalized.location = this.normalizeLocation(normalized.location);
            } catch (e) {
              console.warn('[QueryNormalizer] Failed to normalize location:', e);
            }
          }
          if (normalized.query) {
            try {
              normalized.query = this.normalizeQuery(normalized.query);
            } catch (e) {
              console.warn('[QueryNormalizer] Failed to normalize query:', e);
            }
          }
          break;
      }

      return normalized;
    } catch (error) {
      console.error('[QueryNormalizer] Error in normalizeToolArgs:', error);
      // Return original args if normalization fails
      return args;
    }
  }
}

// Semantic query grouping for similar searches
export const semanticGroups = {
  weather: [
    'what is the weather',
    'weather forecast',
    'temperature',
    'will it rain',
    'how cold is it',
    'how hot is it',
    'weather conditions',
  ],
  stocks: ['stock price', 'share price', 'market value', 'trading at', 'stock chart', 'current price'],
  location: ['where is', 'location of', 'find on map', 'show me', 'directions to'],
  time: ['what time', 'current time', 'time in', 'what day', 'what date'],
};

// Check if two queries are semantically similar
export function areQueriesSimilar(query1: string, query2: string): boolean {
  const norm1 = QueryNormalizer.normalizeQuery(query1);
  const norm2 = QueryNormalizer.normalizeQuery(query2);

  // Exact match after normalization
  if (norm1 === norm2) return true;

  // Check if they belong to same semantic group
  for (const [group, patterns] of Object.entries(semanticGroups)) {
    const inGroup1 = patterns.some((p) => norm1.includes(p));
    const inGroup2 = patterns.some((p) => norm2.includes(p));
    if (inGroup1 && inGroup2) return true;
  }

  // Check if they have same parameters
  const params1 = QueryNormalizer.extractParameters(query1);
  const params2 = QueryNormalizer.extractParameters(query2);

  if (params1.searchType === params2.searchType) {
    if (params1.location && params1.location === params2.location) return true;
    if (params1.ticker && params1.ticker === params2.ticker) return true;
  }

  return false;
}
