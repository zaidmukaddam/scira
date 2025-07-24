import { useState, useEffect } from 'react';

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
        // Try multiple IP geolocation services for reliability
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        const countryCode = data.country_code;
        const country = data.country_name;
        const isIndia = countryCode === 'IN';

        setLocation({
          country,
          countryCode,
          isIndia,
          loading: false,
        });
      } catch (error) {
        console.error('Failed to detect location:', error);
        // Fallback: Try another service
        try {
          const fallbackResponse = await fetch('https://api.ipify.org?format=json');
          const fallbackData = await fallbackResponse.json();
          
          // Use a more basic service that just gives country
          const geoResponse = await fetch(`https://ipapi.co/${fallbackData.ip}/country/`);
          const countryCode = await geoResponse.text();
          
          setLocation({
            country: countryCode === 'IN' ? 'India' : 'Unknown',
            countryCode: countryCode,
            isIndia: countryCode === 'IN',
            loading: false,
          });
        } catch (fallbackError) {
          console.error('Fallback location detection failed:', fallbackError);
          // Default to non-India if all detection fails
          setLocation({
            country: 'Unknown',
            countryCode: '',
            isIndia: false,
            loading: false,
          });
        }
      }
    };

    detectLocation();
  }, []);

  return location;
} 