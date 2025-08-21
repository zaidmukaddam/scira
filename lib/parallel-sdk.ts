// Parallel AI Search SDK
export interface ParallelSearchOptions {
  objective: string;
  search_queries: string[];
  processor?: 'base' | 'pro';
  max_results?: number;
  max_chars_per_result?: number;
  source_policy?: {
    include_domains?: string;
    exclude_domains?: string;
  };
}

export interface ParallelSearchResult {
  url: string;
  title: string;
  excerpts: string[];
}

export interface ParallelSearchResponse {
  search_id: string;
  results: ParallelSearchResult[];
}

export interface ParallelBatchSearchResponse {
  search_id: string;
  query_results: {
    query: string;
    results: ParallelSearchResult[];
  }[];
}

export class ParallelAI {
  private apiKey: string;
  private baseUrl = 'https://api.parallel.ai/v1beta';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(options: ParallelSearchOptions): Promise<ParallelSearchResponse> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Parallel AI API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async searchAndContents(
    query: string,
    options: {
      processor?: 'base' | 'pro';
      max_results?: number;
      max_chars_per_result?: number;
      include_domains?: string[];
      exclude_domains?: string[];
      topic?: 'general' | 'news' | 'finance';
    } = {}
  ): Promise<ParallelSearchResponse & { query: string }> {
    const searchOptions: ParallelSearchOptions = {
      objective: query,
      search_queries: [query],
      processor: options.processor || 'base',
      max_results: options.max_results || 10,
      max_chars_per_result: options.max_chars_per_result || 1000,
    };

    // Handle domain filtering
    if (options.include_domains?.length || options.exclude_domains?.length) {
      searchOptions.source_policy = {};

      if (options.include_domains?.length) {
        searchOptions.source_policy.include_domains = options.include_domains.join(',');
      }

      if (options.exclude_domains?.length) {
        searchOptions.source_policy.exclude_domains = options.exclude_domains.join(',');
      }
    }

    const result = await this.search(searchOptions);
    return { ...result, query };
  }

  async batchSearchAndContents(
    queries: string[],
    options: {
      processor?: 'base' | 'pro';
      max_results?: number;
      max_chars_per_result?: number;
      include_domains?: string[];
      exclude_domains?: string[];
      objective?: string;
    } = {}
  ): Promise<ParallelBatchSearchResponse> {
    const searchOptions: ParallelSearchOptions = {
      objective: options.objective || queries.at(0) || '',
      search_queries: queries,
      processor: options.processor || 'base',
      max_results: options.max_results && options.max_results < 20 ? 20 : options.max_results || 20,
      max_chars_per_result: options.max_chars_per_result || 6000,
    };

    // Handle domain filtering
    if (options.include_domains?.length || options.exclude_domains?.length) {
      searchOptions.source_policy = {};

      if (options.include_domains?.length) {
        searchOptions.source_policy.include_domains = options.include_domains.join(',');
      }

      if (options.exclude_domains?.length) {
        searchOptions.source_policy.exclude_domains = options.exclude_domains.join(',');
      }
    }

    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(searchOptions),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Parallel AI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Transform response to match expected format
    // Parallel AI returns results that we need to map back to individual queries
    return {
      search_id: result.search_id,
      query_results: queries.map((query, index) => ({
        query,
        results: result.results || [], // All results are returned together, we'll distribute them
      }))
    };
  }
}

export default ParallelAI;
