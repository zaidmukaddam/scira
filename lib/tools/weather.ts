import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

export const weatherTool = tool({
  description: 'Get the weather data for a location using either location name or coordinates with OpenWeather API.',
  inputSchema: z.object({
    location: z
      .string()
      .optional()
      .describe(
        'The name of the location to get weather data for (e.g., "London", "New York", "Tokyo"). Required if latitude and longitude are not provided.',
      ),
    latitude: z.number().optional().describe('The latitude coordinate. Required if location is not provided.'),
    longitude: z.number().optional().describe('The longitude coordinate. Required if location is not provided.'),
  }),
  execute: async ({
    location,
    latitude,
    longitude,
  }: {
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }) => {
    try {
      let lat = latitude;
      let lng = longitude;
      let locationName = location;
      let country: string | undefined;
      let timezone: string | undefined;

      if (!location && (!latitude || !longitude)) {
        throw new Error('Either location name or both latitude and longitude coordinates must be provided');
      }

      if (!lat || !lng) {
        if (!location) {
          throw new Error('Location name is required when coordinates are not provided');
        }

        const geocodingResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            location,
          )}&count=1&language=en&format=json`,
        );

        const geocodingData = await geocodingResponse.json();

        if (!geocodingData.results || geocodingData.results.length === 0) {
          throw new Error(`Location '${location}' not found`);
        }

        const geocodingResult = geocodingData.results[0];
        lat = geocodingResult.latitude;
        lng = geocodingResult.longitude;
        locationName = geocodingResult.name;
        country = geocodingResult.country;
        timezone = geocodingResult.timezone;
      } else {
        if (!location) {
          try {
            const reverseGeocodeResponse = await fetch(
              `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lng}&limit=1&appid=${serverEnv.OPENWEATHER_API_KEY}`,
            );
            const reverseGeocodeData = await reverseGeocodeResponse.json();

            if (reverseGeocodeData && reverseGeocodeData.length > 0) {
              locationName = reverseGeocodeData[0].name;
              country = reverseGeocodeData[0].country;
            } else {
              locationName = `${lat}, ${lng}`;
            }
          } catch (reverseGeocodeError) {
            console.warn('Reverse geocoding failed:', reverseGeocodeError);
            locationName = `${lat}, ${lng}`;
          }
        }
      }

      console.log('Latitude:', lat);
      console.log('Longitude:', lng);
      console.log('Location:', locationName);

      const apiKey = serverEnv.OPENWEATHER_API_KEY;
      const [weatherResponse, airPollutionResponse, dailyForecastResponse] = await Promise.all([
        fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}`),
        fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${apiKey}`),
        fetch(`https://api.openweathermap.org/data/2.5/forecast/daily?lat=${lat}&lon=${lng}&cnt=16&appid=${apiKey}`),
      ]);

      const [weatherData, airPollutionData, dailyForecastData] = await Promise.all([
        weatherResponse.json(),
        airPollutionResponse.json(),
        dailyForecastResponse.json().catch((error) => {
          console.error('Daily forecast API error:', error);
          return { list: [] };
        }),
      ]);

      const airPollutionForecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}`,
      );
      const airPollutionForecastData = await airPollutionForecastResponse.json();

      return {
        ...weatherData,
        geocoding: {
          latitude: lat,
          longitude: lng,
          name: locationName,
          country: country,
          timezone: timezone,
        },
        air_pollution: airPollutionData,
        air_pollution_forecast: airPollutionForecastData,
        daily_forecast: dailyForecastData,
      };
    } catch (error) {
      console.error('Weather data error:', error);
      throw error;
    }
  },
});
