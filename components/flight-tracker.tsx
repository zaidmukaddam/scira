import { Badge } from '@/components/ui/badge';
import { Plane, Clock, AlertCircle } from 'lucide-react';

interface FlightApiResponse {
  data: Array<{
    flight_date: string;
    flight_status: string;
    departure: {
      airport: string;
      timezone: string;
      iata: string;
      terminal: string | null;
      gate: string | null;
      delay: number | null;
      scheduled: string;
    };
    arrival: {
      airport: string;
      timezone: string;
      iata: string;
      terminal: string | null;
      gate: string | null;
      delay: number | null;
      scheduled: string;
    };
    airline: {
      name: string;
      iata: string;
    };
    flight: {
      number: string;
      iata: string;
      duration: number | null;
    };
    amadeus_data?: {
      aircraft_type?: string;
      operating_flight?: {
        carrierCode: string;
        flightNumber: number;
      };
      segment_duration?: string;
    };
  }>;
  error?: string;
}

interface FlightTrackerProps {
  data: FlightApiResponse;
}

export function FlightTracker({ data }: FlightTrackerProps) {
  if (data?.error) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-950/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-100">Unable to track flight</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{data.error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.data?.[0]) {
    return null;
  }

  const flight = data.data[0];

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const mapStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'landed':
        return { label: 'Landed', variant: 'default' as const };
      case 'active':
        return flight.departure.delay
          ? { label: 'Delayed', variant: 'destructive' as const }
          : { label: 'In Flight', variant: 'default' as const };
      case 'scheduled':
        return { label: 'Scheduled', variant: 'secondary' as const };
      default:
        return { label: 'Scheduled', variant: 'secondary' as const };
    }
  };

  const calculateDuration = (departureTime: string, arrivalTime: string): string => {
    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);
    const durationInMinutes = Math.floor((arrival.getTime() - departure.getTime()) / (1000 * 60));

    if (durationInMinutes < 0) return 'N/A';

    const hours = Math.floor(durationInMinutes / 60);
    const minutes = durationInMinutes % 60;

    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  const flightInfo = {
    flightNumber: flight.flight.iata,
    status: mapStatus(flight.flight_status),
    airline: flight.airline.name,
    departure: {
      airport: flight.departure.airport,
      code: flight.departure.iata,
      time: formatTime(flight.departure.scheduled),
      date: formatDate(flight.departure.scheduled),
      terminal: flight.departure.terminal,
      gate: flight.departure.gate,
    },
    arrival: {
      airport: flight.arrival.airport,
      code: flight.arrival.iata,
      time: formatTime(flight.arrival.scheduled),
      date: formatDate(flight.arrival.scheduled),
      terminal: flight.arrival.terminal,
      gate: flight.arrival.gate,
    },
    duration: calculateDuration(flight.departure.scheduled, flight.arrival.scheduled),
    aircraftType: flight.amadeus_data?.aircraft_type,
    operatedBy: flight.amadeus_data?.operating_flight
      ? `${flight.amadeus_data.operating_flight.carrierCode}${flight.amadeus_data.operating_flight.flightNumber}`
      : null,
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-950">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                {flightInfo.flightNumber}
              </h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{flightInfo.airline}</p>
            </div>
            <Badge variant={flightInfo.status.variant}>{flightInfo.status.label}</Badge>
          </div>
        </div>

        {/* Flight Route */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            {/* Departure */}
            <div className="flex-1">
              <div className="text-2xl font-mono font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                {flightInfo.departure.code}
              </div>
              <div className="space-y-1">
                <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                  {flightInfo.departure.time}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{flightInfo.departure.date}</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-32 sm:max-w-none truncate">
                  {flightInfo.departure.airport}
                </p>
              </div>
            </div>

            {/* Flight Info */}
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-px bg-neutral-300 dark:bg-neutral-700"></div>
                <Plane className="h-4 w-4 text-neutral-400 dark:text-neutral-600" />
                <div className="w-8 h-px bg-neutral-300 dark:bg-neutral-700"></div>
              </div>
              <div className="text-center space-y-1">
                {flightInfo.duration && (
                  <div className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400">
                    <Clock className="h-3 w-3" />
                    {flightInfo.duration}
                  </div>
                )}
                {flightInfo.aircraftType && (
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">{flightInfo.aircraftType}</div>
                )}
              </div>
            </div>

            {/* Arrival */}
            <div className="flex-1 text-right">
              <div className="text-2xl font-mono font-bold text-neutral-900 dark:text-neutral-100 mb-2">
                {flightInfo.arrival.code}
              </div>
              <div className="space-y-1">
                <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100">{flightInfo.arrival.time}</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{flightInfo.arrival.date}</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-32 sm:max-w-none truncate ml-auto">
                  {flightInfo.arrival.airport}
                </p>
              </div>
            </div>
          </div>

          {/* Terminal/Gate Info */}
          {(flightInfo.departure.terminal ||
            flightInfo.departure.gate ||
            flightInfo.arrival.terminal ||
            flightInfo.arrival.gate) && (
            <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                <div className="flex gap-3">
                  {flightInfo.departure.terminal && <span>Terminal {flightInfo.departure.terminal}</span>}
                  {flightInfo.departure.gate && <span>Gate {flightInfo.departure.gate}</span>}
                </div>
                <div className="flex gap-3">
                  {flightInfo.arrival.terminal && <span>Terminal {flightInfo.arrival.terminal}</span>}
                  {flightInfo.arrival.gate && <span>Gate {flightInfo.arrival.gate}</span>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Additional Info */}
        {flightInfo.operatedBy && (
          <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 rounded-b-lg">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Operated by {flightInfo.operatedBy}</p>
          </div>
        )}
      </div>
    </div>
  );
}
