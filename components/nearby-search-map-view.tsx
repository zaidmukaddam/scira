/* eslint-disable @next/next/no-img-element */
import React, { useState, memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import InteractiveMap from './interactive-maps';
import PlaceCard from './place-card';
import { Badge } from './ui/badge';
import { AlertCircle } from 'lucide-react';

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
  vicinity?: string;
  formatted_address?: string;
  rating?: number;
  reviews_count?: number;
  price_level?: number | string;
  description?: string;
  photos?: Photo[];
  is_closed?: boolean;
  is_open?: boolean;
  next_open_close?: string;
  type?: string;
  types?: string[];
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

interface NearbySearchMapViewProps {
  center: {
    lat: number;
    lng: number;
  };
  places: Place[];
  type: string;
  query?: string;
  searchRadius?: number;
}

const NearbySearchMapView = memo<NearbySearchMapViewProps>(
  ({ center, places, type, query, searchRadius }) => {
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [mapError, setMapError] = useState<boolean>(false);

    // Memoize center to prevent object recreation
    const memoizedCenter = React.useMemo(
      () => ({
        lat: center.lat,
        lng: center.lng,
      }),
      [center.lat, center.lng],
    );

    // Memoize normalized places to prevent unnecessary recalculations
    const normalizedPlaces = React.useMemo(
      () =>
        places.map((place) => ({
          ...place,
          // Ensure price_level is a number if it's a string like '$$$'
          price_level: typeof place.price_level === 'string' ? place.price_level.length : place.price_level,
          // Use formatted_address if vicinity is not available
          vicinity: place.vicinity || place.formatted_address || 'Unknown location',
        })),
      [places],
    );

    // Memoize the normalized selected place
    const normalizedSelectedPlace = React.useMemo(() => {
      if (!selectedPlace) return null;
      return {
        ...selectedPlace,
        vicinity: selectedPlace.vicinity || selectedPlace.formatted_address || 'Unknown location',
        price_level:
          typeof selectedPlace.price_level === 'string' ? selectedPlace.price_level.length : selectedPlace.price_level,
      };
    }, [selectedPlace]);

    // Memoize callbacks
    const handleMapError = useCallback(() => {
      setMapError(true);
    }, []);

    const handleRetry = useCallback(() => {
      setMapError(false);
      window.location.reload();
    }, []);

    const handlePlaceCardClick = useCallback((place: Place) => {
      setSelectedPlace(place);
    }, []);

    const handleViewModeChange = useCallback((mode: 'map' | 'list') => {
      setViewMode(mode);
    }, []);

    // Memoize the place selection handler for the map
    const handlePlaceSelect = useCallback((place: Place | null) => {
      setSelectedPlace(place);
    }, []);

    return (
      <div
        className={cn(
          'relative w-full h-[600px] bg-white dark:bg-neutral-900 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 my-4 nearby-search-map',
          viewMode === 'list' && 'list-view',
        )}
      >
        {/* Header with search info */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className="bg-white dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-700/60 shadow-[0_4px_12px_0_rgba(0,0,0,0.15),0_2px_4px_0_rgba(0,0,0,0.1)] dark:shadow-[0_4px_12px_0_rgba(0,0,0,0.4),0_2px_4px_0_rgba(0,0,0,0.3)] text-neutral-900 dark:text-neutral-100 font-semibold rounded-full px-4 py-1.25"
            >
              <div className="flex items-center gap-2 text-sm">
                <span>
                  {places.length} {type} found
                </span>
                {query && (
                  <>
                    <span className="text-neutral-400 dark:text-neutral-500">•</span>
                    <span className="text-neutral-600 dark:text-neutral-400">Near {query}</span>
                  </>
                )}
                {searchRadius && (
                  <>
                    <span className="text-neutral-400 dark:text-neutral-500">•</span>
                    <span className="text-neutral-600 dark:text-neutral-400">{searchRadius}m radius</span>
                  </>
                )}
              </div>
            </Badge>
          </div>

          {/* View Toggle */}
          <div className="relative flex rounded-full bg-white dark:bg-black border border-neutral-200 dark:border-neutral-700 p-0.5 shadow-lg">
            {/* Sliding background indicator */}
            <div
              className={cn(
                'absolute top-0.5 bottom-0.5 rounded-full bg-black dark:bg-white transition-all duration-300 ease-out',
                viewMode === 'list' ? 'left-0.5 right-[calc(50%-1px)]' : 'left-[calc(50%-1px)] right-0.5',
              )}
            />

            <button
              onClick={() => handleViewModeChange('list')}
              className={cn(
                'relative z-10 px-4 py-1 rounded-full text-sm font-medium transition-all duration-300 ease-out',
                viewMode === 'list'
                  ? 'text-white dark:text-black transform scale-[0.98]'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:scale-105',
              )}
            >
              List
            </button>
            <button
              onClick={() => handleViewModeChange('map')}
              className={cn(
                'relative z-10 px-4 py-1 rounded-full text-sm font-medium transition-all duration-300 ease-out',
                viewMode === 'map'
                  ? 'text-white dark:text-black transform scale-[0.98]'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:scale-105',
              )}
            >
              Map
            </button>
          </div>
        </div>

        <div
          className={cn(
            'w-full h-full flex flex-col',
            viewMode === 'list' ? 'divide-y divide-neutral-200 dark:divide-neutral-800' : '',
          )}
        >
          {/* Map Container */}
          <div
            className={cn(
              'w-full relative transition-all duration-500 ease-out',
              viewMode === 'map' ? 'h-full' : 'h-[40%]',
            )}
          >
            {mapError ? (
              <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
                <div className="text-center p-6">
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
                  <p className="text-neutral-600 dark:text-neutral-400 mb-3">Failed to load map</p>
                  <button onClick={handleRetry} className="text-sm text-blue-500 hover:text-blue-600 underline">
                    Try again
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full">
                <InteractiveMap
                  center={memoizedCenter}
                  places={normalizedPlaces}
                  selectedPlace={normalizedSelectedPlace}
                  onPlaceSelect={handlePlaceSelect}
                />

                {/* Selected Place Overlay - Only show in map view */}
                {selectedPlace && viewMode === 'map' && !mapError && (
                  <div className="absolute left-4 right-4 bottom-4 z-15 pointer-events-none">
                    <div className="pointer-events-auto">
                      <PlaceCard
                        place={normalizedSelectedPlace!}
                        onClick={() => {}}
                        isSelected={true}
                        variant="overlay"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* List Container */}
          {viewMode === 'list' && (
            <div
              className={cn(
                'h-[60%] bg-white dark:bg-neutral-900 transition-all duration-500 ease-out',
                'animate-in slide-in-from-bottom-4 fade-in',
              )}
            >
              <div className="h-full overflow-y-auto">
                {places.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-6">
                      <p className="text-neutral-500 dark:text-neutral-400">No {type} found in this area</p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto p-4 space-y-4">
                    {normalizedPlaces.map((place, index) => (
                      <PlaceCard
                        key={place.place_id || index}
                        place={place}
                        onClick={() => handlePlaceCardClick(place)}
                        isSelected={selectedPlace?.place_id === place.place_id}
                        variant="list"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    return (
      prevProps.center.lat === nextProps.center.lat &&
      prevProps.center.lng === nextProps.center.lng &&
      prevProps.type === nextProps.type &&
      prevProps.places.length === nextProps.places.length &&
      prevProps.places.every((place, index) => place.place_id === nextProps.places[index]?.place_id)
    );
  },
);

NearbySearchMapView.displayName = 'NearbySearchMapView';

export default NearbySearchMapView;
