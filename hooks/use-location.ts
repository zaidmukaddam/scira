import { useState, useEffect } from 'react';
import { getUserLocation } from '@/app/actions';

interface LocationData {
  country: string;
  countryCode: string;
  isIndia: boolean;
  loading: boolean;
}

let cachedLocation: LocationData | null = null;
let locationRequest: Promise<LocationData> | null = null;

async function fetchLocationOnce(): Promise<LocationData> {
  if (cachedLocation) return cachedLocation;
  if (locationRequest) return locationRequest;

  locationRequest = getUserLocation()
    .then((locationData) => {
      cachedLocation = locationData;
      return locationData;
    })
    .catch((error) => {
      console.error('Failed to detect location:', error);
      const fallback = {
        country: 'Unknown',
        countryCode: '',
        isIndia: false,
        loading: false,
      };
      cachedLocation = fallback;
      return fallback;
    })
    .finally(() => {
      locationRequest = null;
    });

  return locationRequest;
}

export function useLocation(): LocationData {
  const [location, setLocation] = useState<LocationData>({
    country: '',
    countryCode: '',
    isIndia: false,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    fetchLocationOnce().then((locationData) => {
      if (mounted) setLocation(locationData);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return location;
}
