/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';
import { DateTime } from 'luxon';
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import PlaceholderImage from '@/components/placeholder-image';
import {
    MapPin, Star, ExternalLink, Navigation, Globe, Phone, ChevronDown, ChevronUp,
    Clock
} from 'lucide-react';

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
}


const HoursSection: React.FC<{ hours: string[]; timezone?: string }> = ({ hours, timezone }) => {
    const [isOpen, setIsOpen] = useState(false);
    const now = timezone ?
        DateTime.now().setZone(timezone) :
        DateTime.now();
    const currentDay = now.weekdayLong;

    if (!hours?.length) return null;

    // Find today's hours
    const todayHours = hours.find(h => h.startsWith(currentDay!))?.split(': ')[1] || 'Closed';

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
                    <Clock className="h-3 w-3 text-neutral-400 dark:text-neutral-500" />
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        Today: <span className="font-medium text-neutral-900 dark:text-neutral-100">{todayHours}</span>
                    </span>
                </div>
                {isOpen ? (
                    <ChevronUp className="h-3 w-3 text-neutral-400 dark:text-neutral-500" />
                ) : (
                    <ChevronDown className="h-3 w-3 text-neutral-400 dark:text-neutral-500" />
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
                                    "flex items-center justify-between px-3 py-2 text-xs",
                                    isToday 
                                        ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium" 
                                        : "text-neutral-600 dark:text-neutral-400",
                                    idx !== hours.length - 1 && "border-b border-neutral-200 dark:border-neutral-800"
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
    variant = 'list'
}) => {
    const [showHours, setShowHours] = useState(false);
    const [imageError, setImageError] = useState(false);
    const isOverlay = variant === 'overlay';

    const formatTime = (timeStr: string | undefined, timezone: string | undefined): string => {
        if (!timeStr || !timezone) return '';
        const hours = Math.floor(parseInt(timeStr) / 100);
        const minutes = parseInt(timeStr) % 100;
        return DateTime.now()
            .setZone(timezone)
            .set({ hour: hours, minute: minutes })
            .toFormat('h:mm a');
    };

    const getStatusDisplay = (): { text: string; color: string } | null => {
        if (!place.timezone || (place.is_closed === undefined && place.is_open === undefined) || !place.next_open_close) {
            return null;
        }

        const timeStr = formatTime(place.next_open_close, place.timezone);
        const isClosed = place.is_closed ?? !place.is_open;
        
        if (isClosed) {
            return {
                text: `Closed · Opens ${timeStr}`,
                color: 'text-red-600 dark:text-red-400'
            };
        }
        return {
            text: `Open · Closes ${timeStr}`,
            color: 'text-emerald-600 dark:text-emerald-400'
        };
    };

    // Convert Google Places price level (0-4) to dollar signs
    const getPriceLevelDisplay = (priceLevel?: number): string => {
        if (priceLevel === undefined || priceLevel === null) return '';
        return '$'.repeat(Math.max(1, Math.min(4, priceLevel)));
    };

    const statusDisplay = getStatusDisplay();
    const displayHours = place.hours || place.opening_hours || [];
    const hasValidImage = place.photos?.[0]?.url && !imageError;

    const cardContent = (
        <div className="flex gap-3">
            {/* Clean Image Container */}
            <div className="relative w-16 h-16 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-50 dark:bg-neutral-900 shrink-0">
                {hasValidImage ? (
                    <img
                        src={place.photos![0].url}
                        alt={place.name}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <PlaceholderImage 
                        variant="compact" 
                        size="sm"
                        className="border-0"
                    />
                )}
                {place.price_level && (
                    <div className="absolute top-1 left-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-1.5 py-0.5 text-xs font-medium rounded-md">
                        {getPriceLevelDisplay(place.price_level)}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="space-y-1">
                    {/* Title and Rating Row */}
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-neutral-900 dark:text-neutral-100 text-sm leading-tight truncate">
                            {place.name}
                        </h3>
                        {place.rating && (
                            <div className="flex items-center gap-1 shrink-0">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                                    {place.rating.toFixed(1)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Status */}
                    {statusDisplay && (
                        <div className={cn("text-xs font-medium", statusDisplay.color)}>
                            {statusDisplay.text}
                        </div>
                    )}

                    {/* Address */}
                    {place.vicinity && (
                        <div className="flex items-start gap-1">
                            <MapPin className="w-3 h-3 text-neutral-400 dark:text-neutral-500 mt-0.5 shrink-0" />
                            <span className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                {place.vicinity}
                            </span>
                        </div>
                    )}

                    {/* Review Count */}
                    {place.reviews_count && (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                            {place.reviews_count} reviews
                        </div>
                    )}
                </div>

                {/* Clean Action Buttons */}
                <div className="flex gap-1 mt-3">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                                `https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}`,
                                '_blank'
                            );
                        }}
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700 transition-colors"
                    >
                        <Navigation className="w-3 h-3" />
                        Directions
                    </button>

                    {place.phone && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(`tel:${place.phone}`, '_blank');
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700 transition-colors"
                        >
                            <Phone className="w-3 h-3" />
                            Call
                        </button>
                    )}

                    {place.website && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(place.website, '_blank');
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700 transition-colors"
                        >
                            <Globe className="w-3 h-3" />
                            Website
                        </button>
                    )}

                    {place.place_id && !isOverlay && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://www.google.com/maps/place/?q=place_id:${place.place_id}`, '_blank');
                            }}
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full border border-neutral-200 dark:border-neutral-700 transition-colors"
                        >
                            <ExternalLink className="w-3 h-3" />
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
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-lg"
                onClick={onClick}
            >
                {cardContent}
                
                {/* Hours Section for Overlay */}
                {displayHours && displayHours.length > 0 && (
                    <HoursSection hours={displayHours} timezone={place.timezone} />
                )}
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className={cn(
                "w-full p-4 cursor-pointer transition-colors border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-neutral-900 shadow-sm",
                "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:shadow-md",
                isSelected && "ring-1 ring-neutral-900 dark:ring-neutral-100 shadow-md"
            )}
        >
            {cardContent}
            
            {/* Hours Section */}
            {displayHours && displayHours.length > 0 && (
                <HoursSection hours={displayHours} timezone={place.timezone} />
            )}
        </div>
    );
};

export default PlaceCard;