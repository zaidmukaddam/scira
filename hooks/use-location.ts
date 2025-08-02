import { useState, useEffect } from 'react';
import { getUserLocation } from '@/app/actions';

interface LocationData {
  country: string;
  countryCode: string;
  isIndia: boolean;
  loading: boolean;
}

export function useLocation(): LocationData {
  const [location, setLocation] = useState<LocationData>({
    country: '',
    countryCode: '',
    isIndia: false,
    loading: true,
  });

  useEffect(() => {
    const detectLocation = async () => {
      try {
        const locationData = await getUserLocation();
        setLocation(locationData);
      } catch (error) {
        console.error('Failed to detect location:', error);
        // Fallback to default values
        setLocation({
          country: 'Unknown',
          countryCode: '',
          isIndia: false,
          loading: false,
        });
      }
    };

    detectLocation();
  }, []);

  return location;
}
