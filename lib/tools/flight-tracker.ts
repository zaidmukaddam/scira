import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

export const flightTrackerTool = tool({
  description: 'Track flight information and status using airline code and flight number',
  parameters: z.object({
    carrierCode: z.string().describe('The 2-letter airline carrier code (e.g., UL for SriLankan Airlines)'),
    flightNumber: z.string().describe('The flight number without carrier code (e.g., 604)'),
    scheduledDepartureDate: z.string().describe('The scheduled departure date in YYYY-MM-DD format (e.g., 2025-07-01)'),
  }),
  execute: async ({
    carrierCode,
    flightNumber,
    scheduledDepartureDate,
  }: {
    carrierCode: string;
    flightNumber: string;
    scheduledDepartureDate: string;
  }) => {
    const tokenResponse = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: serverEnv.AMADEUS_API_KEY,
        client_secret: serverEnv.AMADEUS_API_SECRET,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log(tokenData);

    const accessToken = tokenData.access_token;

    try {
      const response = await fetch(
        `https://test.api.amadeus.com/v2/schedule/flights?carrierCode=${carrierCode}&flightNumber=${flightNumber}&scheduledDepartureDate=${scheduledDepartureDate}`,
        {
          headers: {
            Accept: 'application/vnd.amadeus+json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Amadeus API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.data && data.data.length > 0) {
        const flight = data.data[0];
        const departure = flight.flightPoints[0];
        const arrival = flight.flightPoints[1];

        return {
          data: [
            {
              flight_date: flight.scheduledDepartureDate,
              flight_status: 'scheduled',
              departure: {
                airport: departure.iataCode,
                timezone: departure.departure.timings[0].value.slice(-6),
                iata: departure.iataCode,
                terminal: null,
                gate: null,
                delay: null,
                scheduled: departure.departure.timings[0].value,
              },
              arrival: {
                airport: arrival.iataCode,
                timezone: arrival.arrival.timings[0].value.slice(-6),
                iata: arrival.iataCode,
                terminal: null,
                gate: null,
                delay: null,
                scheduled: arrival.arrival.timings[0].value,
              },
              airline: {
                name: carrierCode,
                iata: carrierCode,
              },
              flight: {
                number: flightNumber,
                iata: `${carrierCode}${flightNumber}`,
                duration: flight.legs[0]?.scheduledLegDuration
                  ? (() => {
                      const duration = flight.legs[0].scheduledLegDuration;
                      const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
                      if (matches) {
                        const hours = parseInt(matches[1] || '0');
                        const minutes = parseInt(matches[2] || '0');
                        return hours * 60 + minutes;
                      }
                      return null;
                    })()
                  : null,
              },
              amadeus_data: {
                aircraft_type: flight.legs[0]?.aircraftEquipment?.aircraftType,
                operating_flight: flight.segments[0]?.partnership?.operatingFlight,
                segment_duration: flight.segments[0]?.scheduledSegmentDuration,
              },
            },
          ],
          amadeus_response: data,
        };
      }

      return { data: [], error: 'No flight data found' };
    } catch (error) {
      console.error('Flight tracking error:', error);
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Flight tracking failed',
      };
    }
  },
});
