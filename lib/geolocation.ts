import { getTimezoneFromCoordinates } from './utils/timezone-from-location';

// In-memory cache for geolocation data (production should use Redis)
const geoCache = new Map<string, { data: GeoData; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const MAX_CACHE_SIZE = 1000;

// Custom geolocation service that works on any platform
export interface GeoData {
  country: string;
  countryCode: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  utcOffset?: number;
}

// Get client IP address from various headers
export function getClientIp(request: Request): string | null {
  const headers = request.headers;

  // Check various headers in order of preference
  const possibleHeaders = [
    'x-real-ip',
    'x-forwarded-for',
    'x-client-ip',
    'x-cluster-client-ip',
    'cf-connecting-ip',
    'fastly-client-ip',
    'true-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded',
  ];

  for (const header of possibleHeaders) {
    const value = headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (ip && ip !== 'unknown') {
        return ip;
      }
    }
  }

  return null;
}

// Helper function to clean cache when it gets too large
function cleanCache() {
  if (geoCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entries
    const entries = Array.from(geoCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.2)); // Remove 20%
    toRemove.forEach(([key]) => geoCache.delete(key));
  }
}

// Free IP geolocation using ip-api.com (no API key required)
// Note: This has a rate limit of 45 requests per minute from the same IP
export async function getGeolocationFromIp(ip: string): Promise<GeoData> {
  try {
    // Skip geolocation for localhost/private IPs
    if (
      !ip ||
      ip === '::1' ||
      ip === '127.0.0.1' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.')
    ) {
      // Return Australia for localhost testing
      console.log('Private/localhost IP detected, returning test location (Australia)');
      const testLat = -33.8688;
      const testLon = 151.2093;
      const { timezone, utcOffset } = getTimezoneFromCoordinates(testLat, testLon);
      return {
        country: 'Australia',
        countryCode: 'AU',
        city: 'Sydney',
        region: 'New South Wales',
        latitude: testLat,
        longitude: testLon,
        timezone,
        utcOffset,
      };
    }

    // Check cache first
    const cacheKey = `geo:${ip}`;
    const cached = geoCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL) {
      console.log(`[GEOLOCATION CACHE HIT] IP: ${ip}`);
      return cached.data;
    }

    console.log(`[GEOLOCATION API CALL] IP: ${ip}`);

    // Use ip-api.com free service with reduced timeout
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,city,lat,lon`, {
      signal: AbortSignal.timeout(1500), // Reduced to 1.5 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'success') {
      const { timezone, utcOffset } = getTimezoneFromCoordinates(data.lat, data.lon);
      const geoData = {
        country: data.country,
        countryCode: data.countryCode,
        city: data.city,
        region: data.region,
        latitude: data.lat,
        longitude: data.lon,
        timezone,
        utcOffset,
      };

      // Cache the successful result
      cleanCache();
      geoCache.set(cacheKey, { data: geoData, timestamp: now });

      return geoData;
    }

    throw new Error('Geolocation lookup failed');
  } catch (error) {
    console.error('Geolocation error:', error);
    // Return unknown on error but cache it briefly to avoid repeated failures
    const unknownData = {
      country: 'Unknown',
      countryCode: 'UNKNOWN',
    };

    // Cache unknown result for shorter time to retry sooner
    const cacheKey = `geo:${ip}`;
    const now = Date.now();
    geoCache.set(cacheKey, { data: unknownData, timestamp: now - CACHE_TTL * 0.8 }); // Cache for 20% of normal time

    return unknownData;
  }
}

// Combined geolocation function that tries multiple methods
export async function getGeolocation(request: Request): Promise<GeoData> {
  // First, try Cloudflare headers (if behind Cloudflare)
  const cfCountry = request.headers.get('cf-ipcountry');
  if (cfCountry && cfCountry !== 'XX') {
    return {
      country: cfCountry,
      countryCode: cfCountry,
    };
  }

  // Get client IP
  const clientIp = getClientIp(request);

  if (!clientIp) {
    console.log('No client IP found in headers');
    // For localhost, return Australia for testing
    if (process.env.NODE_ENV === 'development') {
      const berlinLat = 52.52;
      const berlinLon = 13.405;
      const { timezone, utcOffset } = getTimezoneFromCoordinates(berlinLat, berlinLon);
      return {
        country: 'Germany',
        countryCode: 'DE',
        city: 'Berlin',
        region: 'Berlin',
        latitude: berlinLat,
        longitude: berlinLon,
        timezone,
        utcOffset,
      };
    }
    return {
      country: 'Unknown',
      countryCode: 'UNKNOWN',
    };
  }

  console.log('Client IP:', clientIp);

  // Use IP geolocation service
  return getGeolocationFromIp(clientIp);
}
