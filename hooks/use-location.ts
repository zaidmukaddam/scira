import { useState, useEffect } from 'react';
import { getUserLocation } from '@/app/actions';

interface LocationData {
  country: string;
  countryCode: string;
  isIndia: boolean;
  isAustraliaOrNewZealand: boolean;
  loading: boolean;
}

const SESSION_STORAGE_KEY = 'scx-user-location';

export function useLocation(): LocationData {
  const [location, setLocation] = useState<LocationData>({
    country: '',
    countryCode: '',
    isIndia: false,
    isAustraliaOrNewZealand: false,
    loading: true,
  });

  useEffect(() => {
    const detectLocation = async () => {
      // Return cached result from this session to avoid redundant server calls
      try {
        const cached = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (cached) {
          setLocation(JSON.parse(cached) as LocationData);
          return;
        }
      } catch {
        // sessionStorage unavailable (e.g. private browsing restrictions) — continue to fetch
      }

      try {
        const locationData = await getUserLocation();
        const data: LocationData = {
          ...locationData,
          isAustraliaOrNewZealand: ['AU', 'NZ'].includes((locationData.countryCode ?? '').toUpperCase()),
        };
        setLocation(data);

        if (data.countryCode && data.countryCode !== 'Unknown') {
          try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
          } catch {
            // Ignore write failures
          }
        }
      } catch (error) {
        console.error('Failed to detect location:', error);
        setLocation({
          country: 'Unknown',
          countryCode: '',
          isIndia: false,
          isAustraliaOrNewZealand: false,
          loading: false,
        });
      }
    };

    detectLocation();
  }, []);

  return location;
}
