import { clientEnv } from "@/env/client";
import { cn } from "@/lib/utils";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useCallback, useEffect, useRef } from 'react';

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
  timezone?: string;
}

mapboxgl.accessToken = clientEnv.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface InteractiveMapProps {
  center: Location;
  places: Place[];
  selectedPlace: Place | null;
  onPlaceSelect: (place: Place | null) => void;
  className?: string;
  viewMode?: 'map' | 'list';
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  center,
  places,
  selectedPlace,
  onPlaceSelect,
  className,
  viewMode = 'map'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

  // Handler for marker clicks
  const handleMarkerClick = useCallback((place: Place) => {
    onPlaceSelect(place);
  }, [onPlaceSelect]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [center.lng, center.lat],
      zoom: 14,
      attributionControl: false,
    });

    const map = mapRef.current;

    // Add minimal controls
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false, showZoom: true }),
      'bottom-right'
    );

    // Compact attribution
    map.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      'bottom-left'
    );

    return () => {
      Object.values(markersRef.current).forEach(marker => marker.remove());
      map.remove();
    };
  }, [center.lat, center.lng]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Create markers with click handlers
    places.forEach((place, index) => {
      const isSelected = selectedPlace?.place_id === place.place_id;

      // Create marker element
      const el = document.createElement('div');
      el.className = cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 cursor-pointer shadow-md',
        isSelected
          ? 'bg-black text-white scale-110'
          : 'bg-white text-black hover:scale-105'
      );
      el.style.border = '2px solid currentColor';
      el.innerHTML = `${index + 1}`;

      // Create and add marker
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([place.location.lng, place.location.lat])
        .addTo(mapRef.current!);

      // Add click handler
      el.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent map click
        handleMarkerClick(place);
      });

      // Store marker reference
      markersRef.current[place.place_id] = marker;
    });
  }, [places, selectedPlace, handleMarkerClick]);

  // Handle map click to deselect
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
      // Check if click was on a marker
      const clickedMarker = Object.values(markersRef.current).some(marker => {
        const markerEl = marker.getElement();
        return e.originalEvent.target === markerEl || markerEl.contains(e.originalEvent.target as Node);
      });

      // If click wasn't on a marker, deselect
      if (!clickedMarker) {
        onPlaceSelect(null);
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [onPlaceSelect]);

  // Fly to selected place with proper padding for list view
  useEffect(() => {
    if (!mapRef.current || !selectedPlace) return;

    const map = mapRef.current;
    const { clientWidth, clientHeight } = document.documentElement;

    // Calculate the actual width of list view (60% of viewport height in list mode)
    const listHeight = viewMode === 'list' ? clientHeight * 0.6 : 0;

    // Set padding based on view mode
    const padding = {
      top: viewMode === 'list' ? listHeight : 50,
      bottom: 50,
      left: 50,
      right: 50
    };

    // Get coordinates of the target location
    const coordinates: [number, number] = [selectedPlace.location.lng, selectedPlace.location.lat];

    // Calculate the optimal zoom level
    const currentZoom = map.getZoom();
    const targetZoom = currentZoom < 15 ? 15 : currentZoom;

    // Fly to location with padding
    map.flyTo({
      center: coordinates,
      zoom: targetZoom,
      padding: padding,
      duration: 1500,
      essential: true
    });

    // Ensure padding is maintained after animation
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.setPadding(padding);
      }
    }, 1600);

  }, [selectedPlace, viewMode]);

  // Update map padding when view mode changes
  useEffect(() => {
    if (!mapRef.current) return;

    const { clientHeight } = document.documentElement;
    const listHeight = viewMode === 'list' ? clientHeight * 0.6 : 0;

    const padding = {
      top: viewMode === 'list' ? listHeight : 50,
      bottom: 50,
      left: 50,
      right: 50
    };

    mapRef.current.setPadding(padding);
  }, [viewMode]);

  return (
    <div className={cn("w-full h-full relative z-0", className)}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

export default InteractiveMap;
