import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';
import { all } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';

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
      const { weatherResponse, airPollutionResponse, openMeteoResponse } = await all(
        {
          async weatherResponse() {
            return fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}`);
          },
          async airPollutionResponse() {
            return fetch(
              `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${apiKey}`,
            );
          },
          async openMeteoResponse() {
            return fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_probability_max,windspeed_10m_max,relative_humidity_2m_max&timezone=auto&forecast_days=16`,
            );
          },
        },
        getBetterAllOptions(),
      );

      const { weatherData, airPollutionData, openMeteoData } = await all(
        {
          async weatherData() {
            return weatherResponse.json();
          },
          async airPollutionData() {
            return airPollutionResponse.json();
          },
          async openMeteoData() {
            return openMeteoResponse.json();
          },
        },
        getBetterAllOptions(),
      );

      const airPollutionForecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}`,
      );
      const airPollutionForecastData = await airPollutionForecastResponse.json();

      console.log('Air pollution forecast data:', airPollutionForecastData);
      console.log('Open-Meteo 16-day forecast:', openMeteoData);
      console.log('Weather data:', weatherData);

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
        open_meteo_forecast: openMeteoData,
      };
    } catch (error) {
      console.error('Weather data error:', error);
      throw error;
    }
  },
});
