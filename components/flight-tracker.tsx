'use client';

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
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  if (data?.error) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4">
        <div className="rounded-xl border border-destructive/20 p-4 bg-destructive/5 dark:bg-destructive/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-destructive">Unable to track flight</p>
              <p className="text-[10px] text-destructive/70 mt-1">{data.error}</p>
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
      return { label: 'Unknown', color: 'text-muted-foreground' };
    }

    if (normalized.includes('landed') || normalized.includes('arrived')) {
      return { label: 'Landed', color: 'text-emerald-600 dark:text-emerald-400' };
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
      return { label: 'In Flight', color: 'text-blue-600 dark:text-blue-400' };
    }

    if (normalized.includes('delayed') || normalized.includes('delay')) {
      return { label: 'Delayed', color: 'text-amber-600 dark:text-amber-400' };
    }

    if (normalized.includes('cancel')) {
      return { label: 'Cancelled', color: 'text-red-600 dark:text-red-400' };
    }

    if (normalized.includes('divert')) {
      return { label: 'Diverted', color: 'text-red-600 dark:text-red-400' };
    }

    if (normalized.includes('scheduled') || normalized.includes('on time') || normalized.includes('expected')) {
      return { label: 'Scheduled', color: 'text-muted-foreground' };
    }

    return { label: status || 'Unknown', color: 'text-muted-foreground' };
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
          <div key={index} className="rounded-xl border border-border/60 bg-card/30 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <Plane className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">{flightNumber}</span>
                <span className="text-[10px] text-muted-foreground/50 truncate">{flight.airline.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {timeUntil && <span className="text-[10px] text-muted-foreground/60 tabular-nums">{timeUntil}</span>}
                <span className={`font-pixel text-[10px] uppercase tracking-wider ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                {/* Departure */}
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-semibold text-foreground leading-none tabular-nums">{departureTime}</div>
                  <div className="text-base font-pixel uppercase tracking-wider text-foreground/80 mt-1.5 leading-none">{originCode}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-1 truncate">{flight.departure.airport}</div>
                  <div className="text-[9px] text-muted-foreground/40 mt-0.5">{departureDate}</div>
                </div>

                {/* Flight path */}
                <div className="flex flex-col items-center justify-center w-24 shrink-0">
                  <div className="flex items-center gap-1.5 w-full">
                    <div className="flex-1 h-px bg-border/60"></div>
                    <Plane className="h-3 w-3 text-muted-foreground/40" />
                    <div className="flex-1 h-px bg-border/60"></div>
                  </div>
                  {duration && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 mt-1 tabular-nums">
                      <Clock className="h-2.5 w-2.5" />
                      {duration}
                    </div>
                  )}
                </div>

                {/* Arrival */}
                <div className="text-right min-w-0 flex-1">
                  <div className="text-lg font-semibold text-foreground leading-none tabular-nums">{arrivalTime}</div>
                  <div className="text-base font-pixel uppercase tracking-wider text-foreground/80 mt-1.5 leading-none">{destCode}</div>
                  <div className="text-[10px] text-muted-foreground/60 mt-1 truncate">{flight.arrival.airport}</div>
                  <div className="text-[9px] text-muted-foreground/40 mt-0.5">{arrivalDate}</div>
                </div>
              </div>

              {/* Terminal/Gate info */}
              <div className="mt-3 pt-2.5 border-t border-border/30 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
                  <span>T{flight.departure.terminal ?? '-'}</span>
                  <span>Gate {flight.departure.gate ?? '-'}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50">
                  <span>T{flight.arrival.terminal ?? '-'}</span>
                  <span>Gate {flight.arrival.gate ?? '-'}</span>
                </div>
              </div>

              {flight.amadeus_data?.operating_flight && (
                <div className="mt-2 text-[10px] text-muted-foreground/40">
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
