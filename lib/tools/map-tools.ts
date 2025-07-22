import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

interface GoogleResult {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    viewport: {
      northeast: {
        lat: number;
        lng: number;
      };
      southwest: {
        lat: number;
        lng: number;
      };
    };
  };
  types: string[];
  address_components: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}

export const findPlaceOnMapTool = tool({
  description:
    'Find places using Google Maps geocoding API. Supports both address-to-coordinates (forward) and coordinates-to-address (reverse) geocoding.',
  parameters: z.object({
    query: z.string().nullable().describe('Address or place name to search for (for forward geocoding)'),
    latitude: z.number().nullable().describe('Latitude for reverse geocoding'),
    longitude: z.number().nullable().describe('Longitude for reverse geocoding'),
  }),
  execute: async ({ query, latitude, longitude }) => {
    try {
      const googleApiKey = serverEnv.GOOGLE_MAPS_API_KEY;

      if (!googleApiKey) {
        throw new Error('Google Maps API key not configured');
      }

      let url: string;
      let searchType: 'forward' | 'reverse';

      if (query) {
        url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          query,
        )}&key=${googleApiKey}`;
        searchType = 'forward';
      } else if (latitude !== undefined && longitude !== undefined) {
        url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleApiKey}`;
        searchType = 'reverse';
      } else {
        throw new Error('Either query or coordinates (latitude/longitude) must be provided');
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OVER_QUERY_LIMIT') {
        return {
          success: false,
          error: 'Google Maps API quota exceeded. Please try again later.',
          places: [],
        };
      }

      if (data.status !== 'OK') {
        return {
          success: false,
          error: data.error_message || `Geocoding failed: ${data.status}`,
          places: [],
        };
      }

      const places = data.results.map((result: GoogleResult) => ({
        place_id: result.place_id,
        name: result.formatted_address.split(',')[0].trim(),
        formatted_address: result.formatted_address,
        location: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
        types: result.types,
        address_components: result.address_components,
        viewport: result.geometry.viewport,
        source: 'google_maps',
      }));

      return {
        success: true,
        search_type: searchType,
        query: query || `${latitude},${longitude}`,
        places,
        count: places.length,
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown geocoding error',
        places: [],
      };
    }
  },
});

export const nearbyPlacesSearchTool = tool({
  description: 'Search for nearby places using Google Places Nearby Search API.',
  parameters: z.object({
    location: z.string().describe('The location name or coordinates to search around'),
    latitude: z.number().nullable().describe('Latitude of the search center'),
    longitude: z.number().nullable().describe('Longitude of the search center'),
    type: z
      .string()
      .describe(
        'Type of place to search for (restaurant, lodging, tourist_attraction, gas_station, bank, hospital, etc.) from the new google places api',
      ),
    radius: z.number().describe('Search radius in meters (max 50000)'),
    keyword: z.string().nullable().describe('Additional keyword to filter results'),
  }),
  execute: async ({
    location,
    latitude,
    longitude,
    type,
    radius,
    keyword,
  }: {
    location: string;
    latitude: number | null;
    longitude: number | null;
    type: string;
    radius: number;
    keyword: string | null;
  }) => {
    try {
      const googleApiKey = serverEnv.GOOGLE_MAPS_API_KEY;

      if (!googleApiKey) {
        throw new Error('Google Maps API key not configured');
      }

      let searchLat = latitude;
      let searchLng = longitude;

      if (!searchLat || !searchLng) {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          location,
        )}&key=${googleApiKey}`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();

        if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
          searchLat = geocodeData.results[0].geometry.location.lat;
          searchLng = geocodeData.results[0].geometry.location.lng;
        } else {
          return {
            success: false,
            error: `Could not geocode location: ${location}`,
            places: [],
            center: null,
          };
        }
      }

      let nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${searchLat},${searchLng}&radius=${Math.min(
        radius,
        50000,
      )}&type=${type}&key=${googleApiKey}`;

      if (keyword) {
        nearbyUrl += `&keyword=${encodeURIComponent(keyword)}`;
      }

      const response = await fetch(nearbyUrl);
      const data = await response.json();

      if (data.status !== 'OK') {
        return {
          success: false,
          error: data.error_message || `Nearby search failed: ${data.status}`,
          places: [],
          center: { lat: searchLat, lng: searchLng },
        };
      }

      const detailedPlaces = await Promise.all(
        data.results.slice(0, 20).map(async (place: any) => {
          try {
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,reviews,opening_hours,photos,price_level,types&key=${googleApiKey}`;
            const detailsResponse = await fetch(detailsUrl);
            const details = await detailsResponse.json();

            let detailsData = details.status === 'OK' ? details.result : {};

            const lat1 = searchLat!;
            const lon1 = searchLng!;
            const lat2 = place.geometry.location.lat;
            const lon2 = place.geometry.location.lng;

            const R = 6371000;
            const dLat = ((lat2 - lat1) * Math.PI) / 180;
            const dLon = ((lon2 - lon1) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            const formatPriceLevel = (priceLevel: number | undefined): string => {
              if (priceLevel === undefined || priceLevel === null) return 'Not Available';
              switch (priceLevel) {
                case 0:
                  return 'Free';
                case 1:
                  return 'Inexpensive';
                case 2:
                  return 'Moderate';
                case 3:
                  return 'Expensive';
                case 4:
                  return 'Very Expensive';
                default:
                  return 'Not Available';
              }
            };

            return {
              place_id: place.place_id,
              name: place.name,
              formatted_address: detailsData.formatted_address || place.vicinity,
              location: {
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng,
              },
              rating: place.rating || detailsData.rating,
              price_level: formatPriceLevel(place.price_level || detailsData.price_level),
              types: place.types,
              distance: Math.round(distance),
              is_open: place.opening_hours?.open_now,
              photos:
                (detailsData.photos || place.photos)?.slice(0, 3).map((photo: any) => ({
                  photo_reference: photo.photo_reference,
                  width: photo.width,
                  height: photo.height,
                  url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googleApiKey}`,
                })) || [],
              phone: detailsData.formatted_phone_number,
              website: detailsData.website,
              opening_hours: detailsData.opening_hours?.weekday_text || [],
              reviews_count: detailsData.reviews?.length || 0,
              source: 'google_places',
            };
          } catch (error) {
            console.error(`Failed to get details for place ${place.name}:`, error);

            const formatPriceLevel = (priceLevel: number | undefined): string => {
              if (priceLevel === undefined || priceLevel === null) return 'Not Available';
              switch (priceLevel) {
                case 0:
                  return 'Free';
                case 1:
                  return 'Inexpensive';
                case 2:
                  return 'Moderate';
                case 3:
                  return 'Expensive';
                case 4:
                  return 'Very Expensive';
                default:
                  return 'Not Available';
              }
            };

            return {
              place_id: place.place_id,
              name: place.name,
              formatted_address: place.vicinity,
              location: {
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng,
              },
              rating: place.rating,
              price_level: formatPriceLevel(place.price_level),
              types: place.types,
              distance: 0,
              source: 'google_places',
            };
          }
        }),
      );

      const sortedPlaces = detailedPlaces.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      return {
        success: true,
        query: location,
        type,
        center: { lat: searchLat, lng: searchLng },
        places: sortedPlaces,
        count: sortedPlaces.length,
      };
    } catch (error) {
      console.error('Nearby search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown nearby search error',
        places: [],
        center: latitude && longitude ? { lat: latitude, lng: longitude } : null,
      };
    }
  },
});
