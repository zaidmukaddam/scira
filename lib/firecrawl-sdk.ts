// Firecrawl Search SDK
export interface FirecrawlSearchOptions {
  query: string;
  sources?: ('web' | 'news' | 'images')[];
  limit?: number;
  location?: string;
  tbs?: string;
}

export interface FirecrawlImageSearchOptions {
  query: string;
  sources?: ['images'];
  limit?: number;
}

export interface FirecrawlImageResult {
  title: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  url: string;
  position: number;
}

export interface FirecrawlWebResult {
  url: string;
  title: string;
  description: string;
  markdown: string;
  position: number;
}

export interface FirecrawlNewsResult {
  title: string;
  url: string;
  snippet: string;
  date: string;
  position: number;
}

export interface FirecrawlSearchResponse {
  success: boolean;
  data: {
    web?: FirecrawlWebResult[];
    news?: FirecrawlNewsResult[];
    images?: FirecrawlImageResult[];
  };
}

export interface FirecrawlImageSearchResponse {
  success: boolean;
  data: {
    images: FirecrawlImageResult[];
  };
}

export class FirecrawlClient {
  private apiKey: string;
  private baseUrl = 'https://api.firecrawl.dev/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(options: FirecrawlSearchOptions): Promise<FirecrawlSearchResponse> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        query: options.query,
        sources: options.sources || ['web'],
        limit: options.limit || 10,
        location: options.location,
        tbs: options.tbs,
        scrapeOptions: {
          formats: ['markdown'],
          proxy: "auto",
          blockAds: true
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async searchImages(options: FirecrawlImageSearchOptions): Promise<FirecrawlImageSearchResponse> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        query: options.query,
        sources: ['images'],
        limit: options.limit || 8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async getImagesForQuery(query: string, maxResults: number = 8): Promise<{ url: string; description: string }[]> {
    try {
      const searchResponse = await this.searchImages({
        query,
        limit: maxResults,
      });

      if (!searchResponse.success || !searchResponse.data.images) {
        return [];
      }

      return searchResponse.data.images.map((image) => ({
        url: image.imageUrl,
        description: image.title || '',
      }));
    } catch (error) {
      console.error('Firecrawl image search error:', error);
      return [];
    }
  }
}

export default FirecrawlClient;
