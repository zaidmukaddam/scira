import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

interface OpenSkyStateVector {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  time_position: number | null;
  last_contact: number;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;
  on_ground: boolean;
  velocity: number | null;
  true_track: number | null;
  vertical_rate: number | null;
  sensors: number[] | null;
  geo_altitude: number | null;
  squawk: string | null;
  spi: boolean;
  position_source: number;
}

export const flightLiveTrackerTool = tool({
  description: 'Track live flight position and status using callsign or ICAO24 address from OpenSky Network',
  inputSchema: z.object({
    callsign: z.string().optional().describe('Flight callsign (e.g., UAL863 for United Airlines 863)'),
    icao24: z.string().optional().describe('ICAO 24-bit address in hex format (e.g., a0b1c2)'),
  }),
  execute: async ({ callsign, icao24 }: { callsign?: string; icao24?: string }) => {
    if (!callsign && !icao24) {
      return {
        data: [],
        error: 'Either callsign or ICAO24 address must be provided',
      };
    }

    try {
      // Add basic auth if credentials are available
      const headers: HeadersInit = {
        Accept: 'application/json',
      };

      const openskyClientId = process.env.OPENSKY_CLIENT_ID;
      const openskyClientSecret = process.env.OPENSKY_CLIENT_SECRET;

      if (openskyClientId && openskyClientSecret) {
        const auth = Buffer.from(`${openskyClientId}:${openskyClientSecret}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      }

      let url = 'https://opensky-network.org/api/states/all';
      let data;

      // If ICAO24 is provided, use it for filtering (API supports this)
      if (icao24) {
        url += `?icao24=${icao24.toLowerCase()}`;
        console.log('OpenSky API URL:', url);

        const response = await fetch(url, { headers });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenSky API error:', response.status, errorText);
          throw new Error(`OpenSky API error: ${response.status} ${response.statusText}`);
        }

        data = await response.json();
      }
      // If only callsign is provided, we need to fetch all and filter
      else if (callsign) {
        // Unfortunately OpenSky doesn't support callsign filtering in the API
        // For better performance, we should try to convert callsign to ICAO24 first
        console.log('Warning: Callsign search requires fetching all aircraft - this may be slow');
        console.log('OpenSky API URL:', url, '(fetching all for callsign filtering)');

        const response = await fetch(url, { headers });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenSky API error:', response.status, errorText);
          throw new Error(`OpenSky API error: ${response.status} ${response.statusText}`);
        }

        const allData = await response.json();

        // Log total aircraft count before filtering
        console.log(`Total aircraft before filtering: ${allData.states?.length || 0}`);

        // Filter by callsign - be flexible with airline codes
        const searchCallsign = callsign.trim().toUpperCase();

        // Common airline code variations (e.g., UAL863 vs UA863)
        const alternativeCallsigns: string[] = [];
        if (searchCallsign.match(/^[A-Z]{3}\d+$/)) {
          // If it's a 3-letter code + numbers, also try 2-letter version
          alternativeCallsigns.push(searchCallsign.substring(0, 2) + searchCallsign.substring(3));
        } else if (searchCallsign.match(/^[A-Z]{2}\d+$/)) {
          // If it's a 2-letter code + numbers, try common 3-letter versions
          // This would require a mapping table, so skip for now
        }

        const filteredStates =
          allData.states?.filter((state: any[]) => {
            const stateCallsign = state[1]?.trim().toUpperCase();
            return stateCallsign === searchCallsign || alternativeCallsigns.includes(stateCallsign);
          }) || [];

        console.log(
          `Searching for callsign: ${searchCallsign}${alternativeCallsigns.length > 0 ? ` (also trying: ${alternativeCallsigns.join(', ')})` : ''}`,
        );
        console.log(`Found ${filteredStates.length} aircraft matching`);

        if (filteredStates.length > 0) {
          data = { states: filteredStates, time: allData.time };
        } else {
          return { data: [], error: `No aircraft found with callsign: ${callsign}` };
        }
      }

      // Check if we have any results
      if (!data || !data.states || data.states.length === 0) {
        return { data: [], error: 'No aircraft found' };
      }

      // Transform OpenSky state vectors to a more readable format
      const aircraft = data.states.map((state: any[]) => ({
        icao24: state[0],
        callsign: state[1]?.trim() || null,
        origin_country: state[2],
        last_position_update: state[3] ? new Date(state[3] * 1000).toISOString() : null,
        last_contact: new Date(state[4] * 1000).toISOString(),
        longitude: state[5],
        latitude: state[6],
        altitude_meters: state[7], // barometric altitude
        on_ground: state[8],
        velocity_ms: state[9], // meters per second
        heading_degrees: state[10], // true track
        vertical_rate_ms: state[11], // meters per second
        altitude_geometric_meters: state[13],
        squawk: state[14],
        // Derived fields
        altitude_feet: state[7] ? Math.round(state[7] * 3.28084) : null,
        altitude_geometric_feet: state[13] ? Math.round(state[13] * 3.28084) : null,
        speed_knots: state[9] ? Math.round(state[9] * 1.94384) : null,
        vertical_rate_fpm: state[11] ? Math.round(state[11] * 196.85) : null,
      }));

      return {
        data: aircraft,
        time: new Date(data.time * 1000).toISOString(),
        source: 'OpenSky Network',
      };
    } catch (error) {
      console.error('Flight live tracking error:', error);
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Live flight tracking failed',
      };
    }
  },
});
