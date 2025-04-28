import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, Clock, Terminal } from "lucide-react";
import { motion } from "framer-motion";

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
  }>;
}

interface FlightTrackerProps {
  data: FlightApiResponse;
}

export function FlightTracker({ data }: FlightTrackerProps) {
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
      timeZone: 'UTC'
    }) + ' UTC';
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const mapStatus = (status: string): "LANDED" | "DEPARTING ON TIME" | "DELAYED" | "SCHEDULED" => {
    switch (status.toLowerCase()) {
      case 'landed':
        return 'LANDED';
      case 'active':
        return flight.departure.delay ? 'DELAYED' : 'DEPARTING ON TIME';
      case 'scheduled':
        return 'SCHEDULED';
      default:
        return 'SCHEDULED';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "LANDED":
        return "bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900 dark:hover:bg-green-800 dark:text-green-200";
      case "DEPARTING ON TIME":
        return "bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900 dark:hover:bg-green-800 dark:text-green-200";
      case "DELAYED":
        return "bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-900 dark:hover:bg-red-800 dark:text-red-200";
      default:
        return "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-200";
    }
  };

  const getPlanePosition = (status: string) => {
    switch (status.toLowerCase()) {
      case 'landed': return 'right-0';
      case 'active': return 'left-1/2 -translate-x-1/2';
      default: return 'left-0';
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
    departure: {
      airport: flight.departure.airport,
      code: flight.departure.iata,
      time: formatTime(flight.departure.scheduled),
      date: formatDate(flight.departure.scheduled),
      terminal: flight.departure.terminal || undefined,
      gate: flight.departure.gate || undefined
    },
    arrival: {
      airport: flight.arrival.airport,
      code: flight.arrival.iata,
      time: formatTime(flight.arrival.scheduled),
      date: formatDate(flight.arrival.scheduled),
      terminal: flight.arrival.terminal || undefined,
      gate: flight.arrival.gate || undefined
    },
    duration: calculateDuration(flight.departure.scheduled, flight.arrival.scheduled),
    lastUpdated: new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  };

  return (
    <Card className="w-full max-w-3xl bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xs border-neutral-200/50 dark:border-neutral-800/50 shadow-none">
      <CardContent className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-0 md:justify-between mb-6 pb-6 border-b border-neutral-200/50 dark:border-neutral-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center">
              <Plane className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">{flightInfo.flightNumber}</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{flight.airline.name}</p>
            </div>
          </div>
          <Badge className={`${getStatusColor(flightInfo.status)} px-3 py-1 md:px-4 md:py-1.5 text-sm font-medium self-start md:self-aut shadow-none`}>
            {flightInfo.status}
          </Badge>
        </div>

        {/* Flight Route */}
        <div className="py-4 md:py-8">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 md:items-center">
            {/* Departure */}
            <div className="flex-1 min-w-0">
              <div className="text-2xl md:text-3xl font-mono font-bold mb-2 truncate">
                {flightInfo.departure.code}
              </div>
              <div className="space-y-0.5 md:space-y-1">
                <p className="font-medium text-sm truncate">{flightInfo.departure.airport}</p>
                <p className="text-lg md:text-xl font-bold">{flightInfo.departure.time}</p>
                <p className="text-xs text-neutral-500">{flightInfo.departure.date}</p>
              </div>
            </div>

            {/* Flight Path - Hidden on mobile */}
            <div className="hidden md:block flex-1 relative h-[2px] mx-4">
              <div className="absolute left-0 top-1/2 w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full -translate-y-1/2" />
              <div className="w-full h-[2px] border-t-2 border-dotted border-blue-500/50 dark:border-blue-400/50" />
              <div className="absolute right-0 top-1/2 w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full -translate-y-1/2" />
              <div className={`absolute top-1/2 -translate-y-1/2 ${getPlanePosition(flightInfo.status)} transition-all duration-1000`}>
                <div className="bg-white dark:bg-neutral-800 p-2 rounded-full border">
                  <Plane className="h-5 w-5 text-blue-600 dark:text-blue-400 transform rotate-45" />
                </div>
              </div>
            </div>

            {/* Mobile Flight Progress */}
            <div className="md:hidden relative w-[97%] h-8 flex items-center">
              {/* Background Track */}
              <div className="absolute inset-0 h-1 top-1/2 -translate-y-1/2 bg-neutral-100 dark:bg-neutral-800 rounded-full" />

              {/* Progress Bar */}
              <div
                className={`absolute h-1 top-1/2 -translate-y-1/2 bg-blue-500 rounded-full transition-all duration-1000 ${flightInfo.status === 'LANDED' ? 'w-full' :
                  flightInfo.status === 'DEPARTING ON TIME' ? 'w-[5%]' : 'w-1/2'
                  }`}
              />

              {/* Animated Plane */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 transition-all duration-1000`}
                style={{
                  left: flightInfo.status === 'LANDED' ? '100%' :
                    flightInfo.status === 'DEPARTING ON TIME' ? '5%' : '50%',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="bg-white dark:bg-neutral-800 p-1.5 rounded-full border">
                  <Plane className="h-4 w-4 text-blue-600 dark:text-blue-400 transform rotate-45" />
                </div>
              </div>
            </div>

            {/* Arrival */}
            <div className="flex-1 min-w-0 md:text-right">
              <div className="text-2xl md:text-3xl font-mono font-bold mb-2 truncate">
                {flightInfo.arrival.code}
              </div>
              <div className="space-y-0.5 md:space-y-1">
                <p className="font-medium text-sm truncate">{flightInfo.arrival.airport}</p>
                <p className="text-lg md:text-xl font-bold">{flightInfo.arrival.time}</p>
                <p className="text-xs text-neutral-500">{flightInfo.arrival.date}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Flight Details */}
        <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 bg-neutral-50/50 dark:bg-neutral-800/50 rounded-xl p-4">
          {/* Departure Details */}
          <div className="space-y-3 max-w-full">
            {flightInfo.departure.terminal && (
              <div className="flex items-center gap-2 overflow-hidden">
                <Terminal className="h-4 w-4 shrink-0 text-neutral-500" />
                <span className="text-sm truncate">Terminal {flightInfo.departure.terminal}</span>
              </div>
            )}
            {flightInfo.departure.gate && (
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="h-4 w-4 shrink-0 rounded bg-blue-500/10 flex items-center justify-center text-[10px] text-blue-600">G</div>
                <span className="text-sm truncate">Gate {flightInfo.departure.gate}</span>
              </div>
            )}
          </div>

          {/* Arrival Details */}
          <div className="space-y-3 max-w-full">
            {flightInfo.arrival.terminal && (
              <div className="flex items-center gap-2 overflow-hidden">
                <Terminal className="h-4 w-4 shrink-0 text-neutral-500" />
                <span className="text-sm truncate">Terminal {flightInfo.arrival.terminal}</span>
              </div>
            )}
            {flightInfo.arrival.gate && (
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="h-4 w-4 shrink-0 rounded bg-blue-500/10 flex items-center justify-center text-[10px] text-blue-600">G</div>
                <span className="text-sm truncate">Gate {flightInfo.arrival.gate}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 md:mt-6 flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-3 text-sm text-neutral-500">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Flight duration: {flightInfo.duration}</span>
          </div>
          <span className="hidden md:inline text-neutral-300">•</span>
          <span>Last updated: {flightInfo.lastUpdated}</span>
        </div>
      </CardContent>
    </Card>
  );
}