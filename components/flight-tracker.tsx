'use client';

import { Badge } from '@/components/ui/badge';
import { Plane, Clock, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface FlightApiResponse {
  data: Array<{
    flight_date: string;
    flight_status: string;
    departure: {
      airport: string;
      airport_code?: string;
      timezone: string;
      iata: string;
      terminal: string | null;
      gate: string | null;
      delay: number | null;
      scheduled: string;
    };
    arrival: {
      airport: string;
      airport_code?: string;
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
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  if (data?.error) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        <div className="border border-destructive/20 rounded-lg p-4 bg-destructive/5 dark:bg-destructive/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Unable to track flight</p>
              <p className="text-sm text-destructive/80 mt-1">{data.error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.data || data.data.length === 0) {
    return null;
  }

  const formatTime12Hour = (timestamp: string): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timestamp: string): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateTimeUntil = (timeString: string): string => {
    if (!timeString) return '';
    const targetTime = new Date(timeString);
    const now = currentTime;
    const diffMs = targetTime.getTime() - now.getTime();

    if (diffMs < 0) return '';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    }
    return '';
  };

  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const mapStatus = (status: string) => {
    const normalized = (status ?? '').toLowerCase();

    if (!normalized) {
      return { label: 'Status Unknown', variant: 'secondary' as const };
    }

    if (normalized.includes('landed') || normalized.includes('arrived')) {
      return { label: 'Landed', variant: 'default' as const };
    }

    if (
      normalized.includes('active') ||
      normalized.includes('in flight') ||
      normalized.includes('in_air') ||
      normalized.includes('airborne') ||
      normalized.includes('departed') ||
      normalized.includes('en route') ||
      normalized.includes('enroute') ||
      normalized.includes('transit') ||
      normalized.includes('enplane')
    ) {
      return { label: 'In Flight', variant: 'default' as const };
    }

    if (normalized.includes('delayed') || normalized.includes('delay')) {
      return { label: 'Delayed', variant: 'outline' as const };
    }

    if (normalized.includes('cancel')) {
      return { label: 'Cancelled', variant: 'destructive' as const };
    }

    if (normalized.includes('divert')) {
      return { label: 'Diverted', variant: 'destructive' as const };
    }

    if (normalized.includes('scheduled') || normalized.includes('on time') || normalized.includes('expected')) {
      return { label: 'Scheduled', variant: 'secondary' as const };
    }

    return { label: status || 'Status Unknown', variant: 'secondary' as const };
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3">
      {data.data.map((flight, index) => {
        const flightNumber = flight.flight.iata;
        const originCode = flight.departure.iata;
        const destCode = flight.arrival.iata;

        const timeUntil = calculateTimeUntil(flight.departure.scheduled);
        const statusInfo = mapStatus(flight.flight_status);

        const departureTime = formatTime12Hour(flight.departure.scheduled);
        const arrivalTime = formatTime12Hour(flight.arrival.scheduled);
        const departureDate = formatDate(flight.departure.scheduled);
        const arrivalDate = formatDate(flight.arrival.scheduled);

        const duration = formatDuration(flight.flight.duration);

        return (
          <div key={index} className="border rounded-md bg-card overflow-hidden shadow-2xs">
            {/* Compact Header */}
            <div className="px-4 py-2 border-b bg-muted/40">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-sm text-foreground truncate">{flightNumber}</span>
                  <span className="text-muted-foreground text-xs truncate">{flight.airline.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {timeUntil && <span className="text-xs text-muted-foreground whitespace-nowrap">{timeUntil}</span>}
                  <Badge variant={statusInfo.variant} className="text-[10px] h-5 px-1.5">
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Compact Body */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                {/* Left */}
                <div className="min-w-0 flex-1">
                  <div className="text-primary text-xl font-semibold leading-none">{departureTime}</div>
                  <div className="text-foreground text-lg font-mono font-bold mt-1 leading-none">{originCode}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{flight.departure.airport}</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">{departureDate}</div>
                </div>

                {/* Middle */}
                <div className="flex flex-col items-center justify-center w-28 shrink-0">
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-1 h-px bg-border"></div>
                    <Plane className="h-3.5 w-3.5 text-primary" />
                    <div className="flex-1 h-px bg-border"></div>
                  </div>
                  {duration && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      {duration}
                    </div>
                  )}
                </div>

                {/* Right */}
                <div className="text-right min-w-0 flex-1">
                  <div className="text-primary text-xl font-semibold leading-none">{arrivalTime}</div>
                  <div className="text-foreground text-lg font-mono font-bold mt-1 leading-none">{destCode}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{flight.arrival.airport}</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">{arrivalDate}</div>
                </div>
              </div>

              {/* Inline meta */}
              <div className="mt-3 pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span>Terminal {flight.departure.terminal ?? '-'}</span>
                  <span>Gate {flight.departure.gate ?? '-'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>Terminal {flight.arrival.terminal ?? '-'}</span>
                  <span>Gate {flight.arrival.gate ?? '-'}</span>
                </div>
              </div>

              {/* Operated by */}
              {flight.amadeus_data?.operating_flight && (
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Operated by {flight.amadeus_data.operating_flight.carrierCode}
                  {flight.amadeus_data.operating_flight.flightNumber}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
