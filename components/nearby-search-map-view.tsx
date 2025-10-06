/* eslint-disable @next/next/no-img-element */
import 'leaflet/dist/leaflet.css';
import React, { useState, memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import InteractiveMap from './interactive-maps';
import PlaceCard from './place-card';
import { Badge } from './ui/badge';
import { WarningCircleIcon } from '@phosphor-icons/react';

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
  reviews?: Array<{
    author_name?: string;
    rating?: number;
    text?: string;
    time_description?: string;
    relative_time_description?: string;
  }>;
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
  } | null;
  places: Place[];
  type: string;
  query?: string;
  searchRadius?: number;
}

const NearbySearchMapView = memo<NearbySearchMapViewProps>(
  ({ center, places, type, query, searchRadius }) => {
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [mapError, setMapError] = useState<boolean>(false);

    // Memoize center to prevent object recreation
    const memoizedCenter = React.useMemo(
      () => ({
        lat: center?.lat || 0,
        lng: center?.lng || 0,
      }),
      [center?.lat, center?.lng],
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

    const displayIndex = React.useMemo(() => {
      if (selectedIndex !== null) return selectedIndex;
      if (!selectedPlace) return null;
      const idx = places.findIndex((p) => p.place_id === selectedPlace.place_id);
      return idx >= 0 ? idx : null;
    }, [selectedIndex, selectedPlace, places]);

    // Memoize callbacks
    const handleMapError = useCallback(() => {
      setMapError(true);
    }, []);

    const handleRetry = useCallback(() => {
      setMapError(false);
      window.location.reload();
    }, []);

    const handlePlaceCardClick = useCallback(
      (place: Place) => {
        setSelectedPlace(place);
        const idx = places.findIndex((p) => p.place_id === place.place_id);
        const resolved = idx >= 0 ? idx : null;
        setSelectedIndex(resolved);
        setActiveIndex(resolved);
      },
      [places],
    );

    const handleViewModeChange = useCallback((mode: 'map' | 'list') => {
      setViewMode(mode);
    }, []);

    // Memoize the place selection handler for the map
    const handlePlaceSelect = useCallback(
      (place: Place | null) => {
        setSelectedPlace(place);
        if (place) {
          const idx = places.findIndex((p) => p.place_id === place.place_id);
          const resolved = idx >= 0 ? idx : null;
          setSelectedIndex(resolved);
          setActiveIndex(resolved);
        } else {
          setSelectedIndex(null);
          setActiveIndex(null);
        }
      },
      [places],
    );

    const selectByIndex = useCallback(
      (nextIndex: number) => {
        if (normalizedPlaces.length === 0) return;
        const clamped = Math.max(0, Math.min(normalizedPlaces.length - 1, nextIndex));
        const next = normalizedPlaces[clamped];
        setSelectedIndex(clamped);
        setSelectedPlace(next);
        setActiveIndex(clamped);
      },
      [normalizedPlaces],
    );

    const commitIndexForMap = useCallback(
      (nextIndex: number) => {
        if (normalizedPlaces.length === 0) return;
        const clamped = Math.max(0, Math.min(normalizedPlaces.length - 1, nextIndex));
        const next = normalizedPlaces[clamped];
        setSelectedIndex(clamped);
        setSelectedPlace(next);
      },
      [normalizedPlaces],
    );

    // Tailwind-based horizontal scrolling handles swipes natively; no JS handlers needed

    const listContainerRef = React.useRef<HTMLDivElement | null>(null);
    const scrollDebounceRef = React.useRef<number | null>(null);
    const isDraggingRef = React.useRef<boolean>(false);
    const dragStartXRef = React.useRef<number>(0);
    const dragStartScrollRef = React.useRef<number>(0);
    const dragMovedRef = React.useRef<boolean>(false);

    const handleListScroll = useCallback(() => {
      if (!listContainerRef.current || normalizedPlaces.length === 0) return;
      const container = listContainerRef.current;
      const containerCenter = container.scrollLeft + container.clientWidth / 2;
      const children = Array.from(container.children) as HTMLElement[];
      let closestIdx = 0;
      let smallestDist = Number.MAX_SAFE_INTEGER;
      children.forEach((child, i) => {
        const childCenter = child.offsetLeft + child.clientWidth / 2;
        const dist = Math.abs(childCenter - containerCenter);
        if (dist < smallestDist) {
          smallestDist = dist;
          closestIdx = i;
        }
      });
      // Immediate visual highlight during scroll
      setActiveIndex(closestIdx);
      // Debounce commit to allow momentum to settle; lowers jank
      if (scrollDebounceRef.current) window.clearTimeout(scrollDebounceRef.current);
      scrollDebounceRef.current = window.setTimeout(() => commitIndexForMap(closestIdx), 90);
    }, [commitIndexForMap, normalizedPlaces.length]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!listContainerRef.current) return;
      e.preventDefault();
      isDraggingRef.current = true;
      dragMovedRef.current = false;
      dragStartXRef.current = e.clientX;
      dragStartScrollRef.current = listContainerRef.current.scrollLeft;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isDraggingRef.current || !listContainerRef.current) return;
        ev.preventDefault();
        const dx = ev.clientX - dragStartXRef.current;
        if (Math.abs(dx) > 3) dragMovedRef.current = true;
        listContainerRef.current.scrollLeft = dragStartScrollRef.current - dx;
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }, []);

    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
      if (!listContainerRef.current) return;
      const touch = e.touches[0];
      isDraggingRef.current = true;
      dragMovedRef.current = false;
      dragStartXRef.current = touch.clientX;
      dragStartScrollRef.current = listContainerRef.current.scrollLeft;
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || !listContainerRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartXRef.current;
      if (Math.abs(dx) > 3) dragMovedRef.current = true;
      listContainerRef.current.scrollLeft = dragStartScrollRef.current - dx;
    }, []);

    const handleTouchEnd = useCallback(() => {
      isDraggingRef.current = false;
    }, []);

    const handleClickCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (dragMovedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        dragMovedRef.current = false;
      }
    }, []);

    React.useEffect(() => {
      if (selectedIndex === null) return;
      const id = normalizedPlaces[selectedIndex]?.place_id || `idx-${selectedIndex}`;
      const el = document.getElementById(`place-card-${id}`);
      if (el && listContainerRef.current) {
        el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, [selectedIndex, normalizedPlaces]);

    // Ensure there is a default selection so the full-width pager has an initial card
    React.useEffect(() => {
      if (!selectedPlace && normalizedPlaces.length > 0) {
        setActiveIndex(0);
        commitIndexForMap(0); // ensures map zooms to first place by default
      }
    }, [normalizedPlaces, selectedPlace, commitIndexForMap]);

    // Handle null center case after all hooks are declared
    if (!center) {
      return (
        <div className="p-4 text-center text-neutral-600 dark:text-neutral-400">
          <p>Unable to display map: Location data unavailable</p>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'relative w-full h-[560px] bg-white dark:bg-neutral-900 rounded-lg overflow-hidden !border-2 !border-primary/50 dark:!border-primary/10 my-4 nearby-search-map',
          viewMode === 'list' && 'list-view',
          viewMode === 'map' && places.length > 0 && 'map-has-list',
        )}
      >
        {/* Header with search info */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-20 flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-2">
          <div className="flex items-center gap-2 flex-wrap max-sm:w-full">
            <Badge
              variant="secondary"
              className="bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md border border-neutral-200/60 dark:border-neutral-700/60 text-neutral-900 dark:text-neutral-100 font-semibold rounded-full px-4 py-1.25"
            >
              <div className="flex items-center gap-2 text-xs sm:text-sm">
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
          <div className="relative flex rounded-full bg-white/70 dark:bg-neutral-900/60 backdrop-blur-md border border-neutral-200/60 dark:border-neutral-700/60 p-0.5 max-sm:self-start">
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
                'relative z-10 px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ease-out',
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
                'relative z-10 px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ease-out',
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
              viewMode === 'map' ? 'h-full' : 'h-[40%] max-sm:h-[45%]',
            )}
          >
            {mapError ? (
              <div className="w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900">
                <div className="text-center p-6">
                  <WarningCircleIcon size={32} className="text-red-500 mx-auto mb-3" weight="duotone" />
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
                  viewMode={viewMode}
                />

                {/* Horizontal Place Cards strip in map view */}
                {viewMode === 'map' && !mapError && normalizedPlaces.length > 0 && (
                  <div className="absolute left-2 right-2 bottom-2 z-15 pointer-events-none">
                    <div
                      ref={listContainerRef}
                      className={cn(
                        'pointer-events-auto flex gap-3 overflow-x-auto px-2 py-2 scrollbar-thin w-full max-w-full [scrollbar-width:thin] [-ms-overflow-style:none] overscroll-x-contain cursor-grab active:cursor-grabbing select-none snap-x snap-mandatory [scroll-padding-inline:16px] scroll-smooth',
                      )}
                      onScroll={handleListScroll}
                      onMouseDown={handleMouseDown}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onClickCapture={handleClickCapture}
                    >
                      {normalizedPlaces.map((place, index) => {
                        const isSel = (activeIndex ?? selectedIndex) === index;
                        const id = place.place_id || `idx-${index}`;
                        return (
                          <div
                            key={id}
                            id={`place-card-${id}`}
                            data-pager-index={index}
                            className="basis-full min-w-full shrink-0 snap-center"
                          >
                            <div className="relative">
                              <div className="absolute -top-2 -left-2 z-20">
                                <div
                                  className={cn(
                                    'h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shadow-md border',
                                    isSel
                                      ? 'bg-black text-white dark:bg-white dark:text-black border-neutral-200 dark:border-neutral-800'
                                      : 'bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-800',
                                  )}
                                >
                                  {index + 1}
                                </div>
                              </div>
                              <PlaceCard
                                place={place}
                                onClick={() => handlePlaceCardClick(place)}
                                isSelected={isSel}
                                variant="overlay"
                                showHours={false}
                                className="min-h-[172px]"
                              />
                            </div>
                          </div>
                        );
                      })}
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
                'h-[60%] max-sm:h-[55%] bg-white dark:bg-neutral-900 transition-all duration-500 ease-out',
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
        {/* Nearby-specific mobile CSS to position map controls around overlays */}
        <style jsx global>{`
          /* When an overlay is visible, move zoom controls so they don't hide behind it */
          .nearby-search-map.map-has-list .leaflet-bottom.leaflet-right {
            bottom: auto !important;
            top: 18% !important;
            right: 12px !important;
            transform: translateY(-50%);
          }

          @media (max-width: 640px) {
            /* On small screens, prefer moving controls up rather than centering (for reachability) */
            .nearby-search-map.map-has-list .leaflet-bottom.leaflet-right {
              top: auto !important;
              bottom: 14.5rem !important;
              right: 8px !important;
              transform: none;
            }
            .nearby-search-map.list-view .leaflet-bottom.leaflet-right {
              bottom: 8px !important;
            }
          }
        `}</style>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    // Handle null center values
    if (prevProps.center === null && nextProps.center === null) {
      return (
        prevProps.type === nextProps.type &&
        prevProps.places.length === nextProps.places.length &&
        prevProps.places.every((place, index) => place.place_id === nextProps.places[index]?.place_id)
      );
    }

    if (prevProps.center === null || nextProps.center === null) {
      return false;
    }

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
