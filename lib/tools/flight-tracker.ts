import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

const preferredTimingTypes = ['actual', 'estimated', 'scheduled'] as const;

const getPreferredTimingValue = (timings?: Array<{ value?: string; type?: string }>): string | null => {
  if (!timings?.length) return null;

  for (const type of preferredTimingTypes) {
    const candidate = timings.find(
      (timing) => typeof timing?.type === 'string' && timing.type.toLowerCase() === type && timing.value,
    );
    if (candidate?.value) {
      return candidate.value;
    }
  }

  return timings[0]?.value ?? null;
};

const getPointTiming = (point: any, direction: 'departure' | 'arrival'): string | null =>
  getPreferredTimingValue(point?.[direction]?.timings);

const getStatusValue = (value: any): string | null => {
  if (!value) return null;

  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (typeof value === 'object') {
    if (typeof value.status === 'string' && value.status.trim()) {
      return value.status.trim();
    }
    if (typeof value.code === 'string' && value.code.trim()) {
      return value.code.trim();
    }
    if (typeof value.label === 'string' && value.label.trim()) {
      return value.label.trim();
    }
    if (typeof value.name === 'string' && value.name.trim()) {
      return value.name.trim();
    }
    if (typeof value?.status === 'object') {
      if (typeof value.status.code === 'string' && value.status.code.trim()) {
        return value.status.code.trim();
      }
      if (typeof value.status.name === 'string' && value.status.name.trim()) {
        return value.status.name.trim();
      }
    }
  }

  return null;
};

const getPointStatus = (point?: any): string | null => {
  if (!point) return null;

  return (
    getStatusValue(point?.arrival?.status) ??
    getStatusValue(point?.departure?.status) ??
    getStatusValue(point?.status)
  );
};

const determineFlightStatus = ({
  flight,
  leg,
  departurePoint,
  arrivalPoint,
  matchingSegment,
}: {
  flight: any;
  leg: any;
  departurePoint?: any;
  arrivalPoint?: any;
  matchingSegment?: any;
}): string => {
  const candidates = [
    getPointStatus(arrivalPoint),
    getPointStatus(departurePoint),
    getStatusValue(matchingSegment?.status),
    getStatusValue(matchingSegment?.stage),
    getStatusValue(leg?.status),
    getStatusValue(leg?.executionStatus),
    getStatusValue(flight?.status),
    getStatusValue(flight?.flightStatus),
  ];

  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  return 'scheduled';
};

export const flightTrackerTool = tool({
  description: 'Track flight information and status using airline code and flight number',
  inputSchema: z.object({
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
    console.log(`[Tracking flight]: ${carrierCode} ${flightNumber} on ${scheduledDepartureDate}`);
    const tokenResponse = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
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
        `https://api.amadeus.com/v2/schedule/flights?carrierCode=${carrierCode}&flightNumber=${flightNumber}&scheduledDepartureDate=${scheduledDepartureDate}`,
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

      console.log(`[Flight data]: ${JSON.stringify(data, null, 2)}`);

      // Look up airline name
      let airlineName = carrierCode;
      try {
        const airlineResponse = await fetch(
          `https://api.amadeus.com/v1/reference-data/airlines?airlineCodes=${carrierCode}`,
          {
            headers: {
              Accept: 'application/vnd.amadeus+json',
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );

        if (airlineResponse.ok) {
          const airlineData = await airlineResponse.json();
          if (airlineData.data && airlineData.data.length > 0) {
            airlineName = airlineData.data[0].businessName || airlineData.data[0].commonName || carrierCode;
          }
        }
      } catch (error) {
        console.warn('Failed to lookup airline name:', error);
        // Fall back to carrier code
      }

      if (data.data && data.data.length > 0) {
        const flight = data.data[0];
        const legs = flight.legs || [];
        const segments = flight.segments || [];

        // Collect all unique airport codes
        const airportCodes = new Set<string>();
        legs.forEach((leg: any) => {
          if (leg.boardPointIataCode) airportCodes.add(leg.boardPointIataCode);
          if (leg.offPointIataCode) airportCodes.add(leg.offPointIataCode);
        });

        // Lookup airport names for all unique codes
        const airportNames: Record<string, string> = {};
        const airportLookupPromises = Array.from(airportCodes).map(async (code) => {
          try {
            const airportResponse = await fetch(
              `https://api.amadeus.com/v1/reference-data/locations?subType=AIRPORT&keyword=${code}&page[limit]=1&sort=analytics.travelers.score&view=FULL`,
              {
                headers: {
                  Accept: 'application/vnd.amadeus+json',
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            );

            if (airportResponse.ok) {
              const airportData = await airportResponse.json();
              if (airportData.data && airportData.data.length > 0) {
                const airport = airportData.data[0];
                airportNames[code] = airport.name || code;
              } else {
                airportNames[code] = code;
              }
            } else {
              airportNames[code] = code;
            }
          } catch (error) {
            console.warn(`Failed to lookup airport name for ${code}:`, error);
            airportNames[code] = code;
          }
        });

        // Wait for all airport lookups to complete
        await Promise.all(airportLookupPromises);

        // Build flight data for each leg
        const flightData: any[] = [];

        for (let legIndex = 0; legIndex < legs.length; legIndex++) {
          const leg = legs[legIndex];
          const boardPoint = leg.boardPointIataCode;
          const offPoint = leg.offPointIataCode;

          // Use the segment that matches this leg (segments have timing info)
          const matchingSegment = segments.find(
            (seg: any) => seg.boardPointIataCode === boardPoint && seg.offPointIataCode === offPoint,
          );

          // Find flight points - a flight point can have both departure and arrival
          // For departure, find the flight point at boardPoint that has departure info
          let departurePoint = flight.flightPoints.find((fp: any) => fp.iataCode === boardPoint && fp.departure);
          // If not found, try any flight point at boardPoint (might have both arrival and departure)
          if (!departurePoint) {
            const fp = flight.flightPoints.find((fp: any) => fp.iataCode === boardPoint);
            if (fp?.departure) {
              departurePoint = fp;
            }
          }

          // For arrival, find the flight point at offPoint that has arrival info
          let arrivalPoint = flight.flightPoints.find((fp: any) => fp.iataCode === offPoint && fp.arrival);
          // If not found, try any flight point at offPoint
          if (!arrivalPoint) {
            const fp = flight.flightPoints.find((fp: any) => fp.iataCode === offPoint);
            if (fp?.arrival) {
              arrivalPoint = fp;
            }
          }

          // Get departure time from flight point, preferring actual/estimated timings
          let departureTime = getPointTiming(departurePoint, 'departure');

          // For intermediate legs, if no departure time, calculate from previous leg arrival
          if (!departureTime && legIndex > 0 && flightData[legIndex - 1]) {
            const prevArrival = flightData[legIndex - 1].arrival.scheduled;
            if (prevArrival) {
              // Calculate from previous arrival + a small buffer (layover time)
              // For now, use previous arrival as departure (or could add a small buffer)
              departureTime = prevArrival;
            }
          }

          // Fallback to first flight point departure for first leg
          if (!departureTime && legIndex === 0) {
            departureTime = getPointTiming(flight.flightPoints[0], 'departure');
          }

          // Get arrival time from flight point, preferring actual/estimated timings
          let arrivalTime = getPointTiming(arrivalPoint, 'arrival');

          // If no arrival time, calculate from departure + duration
          if (!arrivalTime && departureTime && leg.scheduledLegDuration) {
            const depDate = new Date(departureTime);
            const duration = leg.scheduledLegDuration;
            const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
            if (matches) {
              const hours = parseInt(matches[1] || '0');
              const minutes = parseInt(matches[2] || '0');
              depDate.setHours(depDate.getHours() + hours);
              depDate.setMinutes(depDate.getMinutes() + minutes);
              arrivalTime = depDate.toISOString();
            }
          }

          // Fallback to last flight point arrival for last leg
          if (!arrivalTime && legIndex === legs.length - 1) {
            const lastPoint = flight.flightPoints[flight.flightPoints.length - 1];
            arrivalTime = getPointTiming(lastPoint, 'arrival');
          }

          // Parse duration from leg
          const durationMinutes = leg.scheduledLegDuration
            ? (() => {
                const duration = leg.scheduledLegDuration;
                const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
                if (matches) {
                  const hours = parseInt(matches[1] || '0');
                  const minutes = parseInt(matches[2] || '0');
                  return hours * 60 + minutes;
                }
                return null;
              })()
            : null;

          const flightStatus = determineFlightStatus({
            flight,
            leg,
            departurePoint,
            arrivalPoint,
            matchingSegment,
          });

          flightData.push({
            flight_date: flight.scheduledDepartureDate,
            flight_status: flightStatus,
            departure: {
              airport: airportNames[boardPoint] || boardPoint,
              airport_code: boardPoint,
              timezone: departureTime?.slice(-6) || '+00:00',
              iata: boardPoint,
              terminal: departurePoint?.departure?.terminal?.code ?? null,
              gate: departurePoint?.departure?.gate?.mainGate ?? null,
              delay: null,
              scheduled: departureTime || '',
            },
            arrival: {
              airport: airportNames[offPoint] || offPoint,
              airport_code: offPoint,
              timezone: arrivalTime?.slice(-6) || '+00:00',
              iata: offPoint,
              terminal: arrivalPoint?.arrival?.terminal?.code ?? null,
              gate: arrivalPoint?.arrival?.gate?.mainGate ?? null,
              delay: null,
              scheduled: arrivalTime || '',
            },
            airline: {
              name: airlineName,
              iata: carrierCode,
            },
            flight: {
              number: flightNumber,
              iata: `${carrierCode}${flightNumber}`,
              duration: durationMinutes,
            },
            amadeus_data: {
              aircraft_type: leg.aircraftEquipment?.aircraftType,
              operating_flight: matchingSegment?.partnership?.operatingFlight,
              segment_duration: matchingSegment?.scheduledSegmentDuration,
            },
          });
        }

        return {
          data: flightData,
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
