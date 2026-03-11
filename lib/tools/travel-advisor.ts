import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

const TRIPADVISOR_API_KEY = process.env.TRIPADVISOR_API_KEY;
const BASE_URL = 'https://api.content.tripadvisor.com/api/v1';

interface TripAdvisorLocation {
  location_id: string;
  name: string;
  address_obj?: {
    address_string: string;
    postalcode?: string;
  };
  rating?: number;
  num_reviews?: number;
  price_level?: string;
  category?: { name: string };
  subcategory?: Array<{ name: string }>;
  cuisine?: Array<{ name: string }>;
  phone?: string;
  email?: string;
  web_url?: string;
  website?: string;
  description?: string;
}

async function searchTripAdvisor(
  searchQuery: string,
  category?: string,
  limit: number = 10,
): Promise<TripAdvisorLocation[]> {
  if (!TRIPADVISOR_API_KEY) {
    throw new Error('TripAdvisor API key not configured');
  }

  const url = new URL(`${BASE_URL}/location/search`);
  url.searchParams.append('key', TRIPADVISOR_API_KEY);
  url.searchParams.append('searchQuery', searchQuery);
  url.searchParams.append('limit', limit.toString());

  if (category) {
    url.searchParams.append('category', category);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`TripAdvisor API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

async function getLocationDetails(locationId: string): Promise<TripAdvisorLocation | null> {
  if (!TRIPADVISOR_API_KEY) {
    throw new Error('TripAdvisor API key not configured');
  }

  const url = new URL(`${BASE_URL}/location/${locationId}/details`);
  url.searchParams.append('key', TRIPADVISOR_API_KEY);

  const response = await fetch(url.toString());

  if (!response.ok) {
    return null; // Location details might not be available
  }

  return await response.json();
}

function formatLocationResult(location: TripAdvisorLocation, includeDetails = false): string {
  let result = `🏪 **${location.name}**\n`;

  if (location.rating) {
    result += `⭐ ${location.rating}/5.0`;
    if (location.num_reviews) {
      result += ` (${location.num_reviews} reviews)`;
    }
    result += '\n';
  }

  if (location.address_obj?.address_string) {
    result += `📍 ${location.address_obj.address_string}\n`;
  }

  if (location.category?.name) {
    result += `🏷️  ${location.category.name}`;
    if (location.subcategory && location.subcategory.length > 0) {
      result += ` - ${location.subcategory.map((s) => s.name).join(', ')}`;
    }
    result += '\n';
  }

  if (location.cuisine && location.cuisine.length > 0) {
    result += `🍽️  Cuisine: ${location.cuisine.map((c) => c.name).join(', ')}\n`;
  }

  if (location.price_level) {
    result += `💰 Price Level: ${location.price_level}\n`;
  }

  if (includeDetails) {
    if (location.phone) {
      result += `📞 ${location.phone}\n`;
    }

    if (location.email) {
      result += `📧 ${location.email}\n`;
    }

    if (location.website) {
      result += `🌐 [Official Website](${location.website})\n`;
    }

    if (location.description) {
      result += `📝 ${location.description.substring(0, 200)}${location.description.length > 200 ? '...' : ''}\n`;
    }
  }

  if (location.web_url) {
    result += `🔗 [View on TripAdvisor](${location.web_url})\n`;
  }

  return result;
}

export const travelAdvisorTool = tool({
  description: `Search for restaurants, hotels, attractions, and activities using TripAdvisor data. 
  Perfect for travel recommendations, local dining suggestions, tourist attractions, and accommodation.
  Covers locations worldwide with detailed information including ratings, reviews, contact details, and descriptions.`,

  inputSchema: z.object({
    query: z
      .string()
      .describe(
        'Search query for locations (e.g., "Italian restaurants Sydney", "hotels Melbourne CBD", "attractions Brisbane")',
      ),
    category: z.enum(['restaurants', 'hotels', 'attractions', 'geos']).optional().describe('Filter by category type'),
    location: z.string().optional().describe('Geographic location to focus search (e.g., "Sydney", "Melbourne CBD")'),
    limit: z.number().min(1).max(20).default(10).describe('Maximum number of results to return'),
    includeDetails: z
      .boolean()
      .default(false)
      .describe('Whether to include detailed information like contact details and descriptions'),
  }),

  execute: async ({
    query,
    category,
    location,
    limit,
    includeDetails,
  }: {
    query: string;
    category?: 'restaurants' | 'hotels' | 'attractions' | 'geos';
    location?: string;
    limit: number;
    includeDetails: boolean;
  }) => {
    try {
      // Construct search query
      let searchQuery = query;
      if (location && !query.toLowerCase().includes(location.toLowerCase())) {
        searchQuery = `${query} ${location}`;
      }

      // Search for locations
      const locations = await searchTripAdvisor(searchQuery, category, limit);

      if (locations.length === 0) {
        return `No results found for "${searchQuery}". Try adjusting your search terms or expanding your location area.`;
      }

      let result = `Found ${locations.length} result${locations.length > 1 ? 's' : ''} for "${searchQuery}":\n\n`;

      // If detailed information is requested, get additional details for top results
      const processedLocations = [];

      if (includeDetails && locations.length > 0) {
        // Get detailed info for top 3 results
        for (const location of locations.slice(0, 3)) {
          try {
            const detailedInfo = await getLocationDetails(location.location_id);
            if (detailedInfo) {
              processedLocations.push({ ...location, ...detailedInfo });
            } else {
              processedLocations.push(location);
            }
            // Small delay to be respectful to the API
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch (error) {
            processedLocations.push(location);
          }
        }

        // Add remaining locations without detailed info
        processedLocations.push(...locations.slice(3));
      } else {
        processedLocations.push(...locations);
      }

      // Format results
      processedLocations.forEach((location, index) => {
        result += `## ${index + 1}. ${formatLocationResult(location, includeDetails)}\n`;
      });

      // Add helpful suggestions
      result += `\n💡 **Pro Tips:**\n`;
      result += `- For more specific results, try adding cuisine type (e.g., "Japanese restaurants")\n`;
      result += `- Include neighborhood names for local recommendations (e.g., "CBD", "Darling Harbour")\n`;
      result += `- Add "family-friendly" or "romantic" for atmosphere-specific suggestions\n`;
      result += `- Use "budget" or "luxury" to filter by price range\n`;

      return result;
    } catch (error) {
      console.error('TravelAdvisor tool error:', error);
      return `Sorry, I couldn't search travel recommendations right now. ${error instanceof Error ? error.message : 'Please try again later.'}`;
    }
  },
});
