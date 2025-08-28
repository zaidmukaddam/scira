/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';
import { DateTime } from 'luxon';
import { cn } from '@/lib/utils';
import PlaceholderImage from '@/components/placeholder-image';
import {
  MapPin,
  Star,
  MapTrifold,
  NavigationArrow,
  Globe,
  Phone,
  CaretDown,
  CaretUp,
  Clock,
} from '@phosphor-icons/react';

interface Location {
  lat: number;
  lng: number;
}

interface Photo {
  photo_reference: string;
  width: number;
  height: number;
  url: string;
  caption?: string;
}

interface Place {
  name: string;
  location: Location;
  place_id: string;
  vicinity: string;
  rating?: number;
  reviews_count?: number;
  reviews?: Array<{
    author_name?: string;
    rating?: number;
    text?: string;
    time_description?: string;
    relative_time_description?: string;
  }>;
  price_level?: number;
  description?: string;
  photos?: Photo[];
  is_closed?: boolean;
  is_open?: boolean;
  next_open_close?: string;
  type?: string;
  cuisine?: string;
  source?: string;
  phone?: string;
  website?: string;
  hours?: string[];
  opening_hours?: string[];
  distance?: number;
  bearing?: string;
  timezone?: string;
}

interface PlaceCardProps {
  place: Place;
  onClick: () => void;
  isSelected?: boolean;
  variant?: 'overlay' | 'list';
  showHours?: boolean;
  className?: string;
}

const HoursSection: React.FC<{ hours: string[]; timezone?: string }> = ({ hours, timezone }) => {
  const [isOpen, setIsOpen] = useState(false);
  const now = timezone ? DateTime.now().setZone(timezone) : DateTime.now();
  const currentDay = now.weekdayLong;

  if (!hours?.length) return null;

  // Find today's hours
  const todayHours = hours.find((h) => h.startsWith(currentDay!))?.split(': ')[1] || 'Closed';

  return (
    <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-full flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 -mx-1 px-1 py-1 rounded transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-neutral-400 dark:text-neutral-500" />
          <span className="text-xs text-neutral-600 dark:text-neutral-400">
            Today: <span className="font-medium text-neutral-900 dark:text-neutral-100">{todayHours}</span>
          </span>
        </div>
        {isOpen ? (
          <CaretUp size={12} className="text-neutral-400 dark:text-neutral-500" />
        ) : (
          <CaretDown size={12} className="text-neutral-400 dark:text-neutral-500" />
        )}
      </button>

      {isOpen && (
        <div className="mt-2 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
          {hours.map((timeSlot, idx) => {
            const [day, hours] = timeSlot.split(': ');
            const isToday = day === currentDay;

            return (
              <div
                key={idx}
                className={cn(
                  'flex items-center justify-between px-3 py-2 text-xs',
                  isToday
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium'
                    : 'text-neutral-600 dark:text-neutral-400',
                  idx !== hours.length - 1 && 'border-b border-neutral-200 dark:border-neutral-800',
                )}
              >
                <span>{day}</span>
                <span>{hours}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  onClick,
  isSelected = false,
  variant = 'list',
  showHours = true,
  className,
}) => {
  const [imageError, setImageError] = useState(false);
  const isOverlay = variant === 'overlay';

  const formatTime = (timeStr: string | undefined, timezone: string | undefined): string => {
    if (!timeStr || !timezone) return '';
    const hours = Math.floor(parseInt(timeStr) / 100);
    const minutes = parseInt(timeStr) % 100;
    return DateTime.now().setZone(timezone).set({ hour: hours, minute: minutes }).toFormat('h:mm a');
  };

  const getStatusDisplay = (): { text: string; color: string } | null => {
    const hasOpenState = place.is_closed !== undefined || place.is_open !== undefined;
    if (!hasOpenState && (!place.timezone || !place.next_open_close)) {
      return null;
    }

    const isClosed = place.is_closed ?? (place.is_open === undefined ? undefined : !place.is_open);

    // If we have next open/close time and timezone, show the richer status
    if (place.next_open_close && place.timezone) {
      const timeStr = formatTime(place.next_open_close, place.timezone);
      if (isClosed === true) {
        return {
          text: `Closed · Opens ${timeStr}`,
          color: 'text-red-600 dark:text-red-400',
        };
      }
      if (isClosed === false) {
        return {
          text: `Open · Closes ${timeStr}`,
          color: 'text-emerald-600 dark:text-emerald-400',
        };
      }
    }

    // Fallback: try deriving today's opening/closing from weekday text if provided
    const hoursArray = place.hours || place.opening_hours || [];
    const getTodayHoursString = (): string | null => {
      if (!hoursArray.length) return null;
      const now = place.timezone ? DateTime.now().setZone(place.timezone) : DateTime.now();
      const currentDay = now.weekdayLong;
      if (!currentDay) return null;
      const entry = hoursArray.find((h) => h.startsWith(currentDay));
      if (!entry) return null;
      const parts = entry.split(': ');
      if (parts.length < 2) return null;
      return parts[1];
    };

    const extractOpenClose = (hoursStr: string): { open?: string; close?: string } => {
      const lower = hoursStr.toLowerCase();
      if (lower.includes('closed')) return {};
      // Split on en dash or hyphen
      const [openPart, closePart] = hoursStr.split(/[–-]/);
      const open = openPart?.trim();
      const close = closePart?.trim();
      return { open, close };
    };

    // Fallback when we only know open_now (nearby search) without timing info
    if (isClosed === true) {
      const todayHours = getTodayHoursString();
      if (todayHours) {
        const { open } = extractOpenClose(todayHours);
        if (open) {
          return { text: `Closed · Opens ${open}`, color: 'text-red-600 dark:text-red-400' };
        }
      }
      return { text: 'Closed', color: 'text-red-600 dark:text-red-400' };
    }
    if (isClosed === false) {
      return { text: 'Open now', color: 'text-emerald-600 dark:text-emerald-400' };
    }

    return null;
  };

  // Convert Google Places price level (0-4) to dollar signs
  const getPriceLevelDisplay = (priceLevel?: number): string => {
    if (priceLevel === undefined || priceLevel === null) return '';
    return '$'.repeat(Math.max(1, Math.min(4, priceLevel)));
  };

  const statusDisplay = getStatusDisplay();
  const allReviews = place.reviews ?? [];
  const textReviews = allReviews.filter((r) => (r.text ?? '').trim().length > 0);
  const reviewsToShow = (textReviews.length > 0 ? textReviews : allReviews).slice(0, 1);
  const displayHours = place.hours || place.opening_hours || [];
  const hasValidImage = place.photos?.[0]?.url && !imageError;

  const cardContent = (
    <div className="flex gap-3 max-sm:gap-2">
      {/* Clean Image Container */}
      <div className="relative w-16 h-16 max-sm:w-14 max-sm:h-14 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-50 dark:bg-neutral-900 shrink-0">
        {hasValidImage ? (
          <img
            src={place.photos![0].url}
            alt={place.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <PlaceholderImage variant="compact" size="sm" className="border-0" />
        )}
        {place.price_level && (
          <div className="absolute top-1 left-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-1.5 py-0.5 text-xs font-medium rounded-md">
            {getPriceLevelDisplay(place.price_level)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="space-y-1.5 max-sm:space-y-1">
          {/* Title and Rating Row */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm max-sm:text-[13px] leading-tight truncate">
              {place.name}
            </h3>
            {place.rating && (
              <div className="flex items-center gap-1 shrink-0">
                <Star size={12} weight="fill" className="text-amber-500 fill-amber-500" />
                <span className="text-xs max-sm:text-[11px] font-medium text-neutral-900 dark:text-neutral-100">
                  {place.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Status - reserve line height even if absent for uniform cards */}
          <div className={cn('text-xs font-medium min-h-[18px]', statusDisplay?.color)}>
            {statusDisplay?.text || ''}
          </div>

          {/* Address - keep two-line block height consistent */}
          <div className="min-h-[32px]">
            {place.vicinity && (
              <div className="flex items-start gap-1">
                <MapPin size={12} className="text-neutral-400 dark:text-neutral-500 mt-0.5 shrink-0" />
                <span className="text-xs max-sm:text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2">
                  {place.vicinity}
                </span>
              </div>
            )}
          </div>

          {/* Reviews (normalize height in overlay to keep cards even) */}
          <div className={cn('mt-1 space-y-2', isOverlay && 'min-h-[48px] sm:min-h-[52px]')}>
            {reviewsToShow.length > 0 && (
              <>
                {reviewsToShow.map((rev, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'text-xs max-sm:text-[11px] text-neutral-700 dark:text-neutral-300 border-l-2 border-neutral-200 dark:border-neutral-700 pl-2',
                      idx > 0 && 'hidden sm:block',
                    )}
                  >
                    {rev.text && <p className="line-clamp-2 leading-snug">“{rev.text}”</p>}
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                      {rev.author_name && <span className="font-medium">{rev.author_name}</span>}
                      {typeof rev.rating === 'number' && (
                        <span className="inline-flex items-center gap-1">
                          <Star size={12} weight="fill" className="text-amber-500 fill-amber-500" />
                          {rev.rating.toFixed(1)}
                        </span>
                      )}
                      {(rev.time_description || rev.relative_time_description) && (
                        <span>· {rev.time_description ?? rev.relative_time_description}</span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Clean Action Buttons */}
        <div className="flex flex-wrap gap-2 sm:gap-1 mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}`,
                '_blank',
              );
            }}
            className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] sm:text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700 transition-colors"
          >
            <NavigationArrow size={12} />
            Directions
          </button>

          {place.phone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(`tel:${place.phone}`, '_blank');
              }}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] sm:text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700 transition-colors"
            >
              <Phone size={12} />
              Call
            </button>
          )}

          {place.website && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(place.website, '_blank');
              }}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] sm:text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700 transition-colors"
            >
              <Globe size={12} />
              Website
            </button>
          )}

          {place.place_id && !isOverlay && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://www.google.com/maps/place/?q=place_id:${place.place_id}`, '_blank');
              }}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] sm:text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700 transition-colors"
            >
              <MapTrifold size={12} />
              Maps
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (isOverlay) {
    return (
      <div
        className={cn(
          'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3 sm:p-4 w-full',
          className,
        )}
        onClick={onClick}
      >
        {cardContent}

        {/* Hours Section for Overlay */}
        {showHours && displayHours && displayHours.length > 0 && (
          <HoursSection hours={displayHours} timezone={place.timezone} />
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'w-full p-4 max-sm:p-3 cursor-pointer transition-colors border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-neutral-900',
        'hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
        isSelected && 'ring-1 ring-neutral-900 dark:ring-neutral-100',
        className,
      )}
    >
      {cardContent}

      {/* Hours Section */}
      {showHours && displayHours && displayHours.length > 0 && (
        <HoursSection hours={displayHours} timezone={place.timezone} />
      )}
    </div>
  );
};

export default PlaceCard;
