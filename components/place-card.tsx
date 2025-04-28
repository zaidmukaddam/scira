/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';
import { DateTime } from 'luxon';
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
    MapPin, Star, ExternalLink, Navigation, Globe, Phone, ChevronDown, ChevronUp,
    Clock
} from 'lucide-react';

interface Location {
    lat: number;
    lng: number;
}

interface Photo {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
    original: string;
    caption?: string;
}

interface Place {
    name: string;
    location: Location;
    place_id: string;
    vicinity: string;
    rating?: number;
    reviews_count?: number;
    price_level?: string;
    description?: string;
    photos?: Photo[];
    is_closed?: boolean;
    next_open_close?: string;
    type?: string;
    cuisine?: string;
    source?: string;
    phone?: string;
    website?: string;
    hours?: string[];
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
        <div className="mt-4 border-t dark:border-neutral-800">
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={cn(
                    "mt-4 flex items-center gap-2 cursor-pointer transition-colors",
                    "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
                )}
            >
                <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>Today: <span className="font-medium text-neutral-900 dark:text-neutral-100">{todayHours}</span></span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    className="ml-auto p-0 h-8 w-8 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                    {isOpen ? (
                        <ChevronUp className="h-4 w-4" />
                    ) : (
                        <ChevronDown className="h-4 w-4" />
                    )}
                </Button>
            </div>

            <div className={cn(
                "grid transition-all duration-200 overflow-hidden",
                isOpen ? "grid-rows-[1fr] mt-2" : "grid-rows-[0fr]"
            )}>
                <div className="overflow-hidden">
                    <div className="rounded-md border dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                        {hours.map((timeSlot, idx) => {
                            const [day, hours] = timeSlot.split(': ');
                            const isToday = day === currentDay;

                            return (
                                <div
                                    key={idx}
                                    className={cn(
                                        "flex items-center justify-between py-2 px-3 text-sm rounded-md",
                                        isToday && "bg-white dark:bg-neutral-800"
                                    )}
                                >
                                    <span className={cn(
                                        "font-medium",
                                        isToday ? "text-primary" : "text-neutral-600 dark:text-neutral-400"
                                    )}>
                                        {day}
                                    </span>
                                    <span className={cn(
                                        isToday ? "font-medium" : "text-neutral-600 dark:text-neutral-400"
                                    )}>
                                        {hours}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
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
        if (!place.timezone || place.is_closed === undefined || !place.next_open_close) {
            return null;
        }

        const timeStr = formatTime(place.next_open_close, place.timezone);
        if (place.is_closed) {
            return {
                text: `Closed · Opens ${timeStr}`,
                color: 'red-600 dark:text-red-400'
            };
        }
        return {
            text: `Open · Closes ${timeStr}`,
            color: 'green-600 dark:text-green-400'
        };
    };

    const statusDisplay = getStatusDisplay();

    const cardContent = (
        <>
            <div className="flex gap-3">
                {/* Image with Price Badge */}
                {place.photos?.[0]?.medium && (
                    <div className="relative w-20 h-20 rounded-md overflow-hidden shrink-0">
                        <img
                            src={place.photos[0].medium}
                            alt={place.name}
                            className="w-full h-full object-cover"
                        />
                        {place.price_level && (
                            <div className="absolute top-0 left-0 bg-black/80 text-white px-2 py-0.5 text-xs font-medium">
                                {place.price_level}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate pr-6">
                                {place.name}
                            </h3>

                            {/* Rating & Reviews */}
                            {place.rating && (
                                <div className="flex items-center gap-1 mt-1">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span className="font-medium">{place.rating.toFixed(1)}</span>
                                    {place.reviews_count && (
                                        <span className="text-neutral-500">({place.reviews_count})</span>
                                    )}
                                </div>
                            )}

                            {/* Status */}
                            {statusDisplay && (
                                <div className={`text-sm text-${statusDisplay.color} mt-1`}>
                                    {statusDisplay.text}
                                </div>
                            )}

                            {/* Address */}
                            {place.vicinity && (
                                <div className="flex items-center text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                    <MapPin className="w-4 h-4 mr-1 shrink-0" />
                                    <span className="truncate">{place.vicinity}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                            variant="default"
                            size="sm"
                            className="h-8"
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(
                                    `https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}`,
                                    '_blank'
                                );
                            }}
                        >
                            <Navigation className="w-4 h-4 mr-2" />
                            Directions
                        </Button>

                        {place.phone && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`tel:${place.phone}`, '_blank');
                                }}
                            >
                                <Phone className="w-4 h-4 mr-2" />
                                Call
                            </Button>
                        )}

                        {place.website && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(place.website, '_blank');
                                }}
                            >
                                <Globe className="w-4 h-4 mr-2" />
                                Website
                            </Button>
                        )}

                        {place.place_id && !isOverlay && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`https://www.tripadvisor.com/${place.place_id}`, '_blank');
                                }}
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                More Info
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Hours Section - Only show if has hours */}
            {place.hours && place.hours.length > 0 && (
                <HoursSection hours={place.hours} timezone={place.timezone} />
            )}
        </>
    );

    if (isOverlay) {
        return (
            <div
                className="bg-white/95 dark:bg-black/95 backdrop-blur-xs p-4 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-800"
                onClick={onClick}
            >
                {cardContent}
            </div>
        );
    }

    return (
        <Card
            onClick={onClick}
            className={cn(
                "w-full transition-all duration-200 cursor-pointer p-4",
                "hover:bg-neutral-50 dark:hover:bg-neutral-800",
                isSelected && "ring-2 ring-primary"
            )}
        >
            {cardContent}
        </Card>
    );
};

export default PlaceCard;