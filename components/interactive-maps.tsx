import { clientEnv } from '@/env/client';
import { cn } from '@/lib/utils';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useCallback, useEffect, useRef, useState, memo } from 'react';

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
  price_level?: number;
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

// Set Mapbox token with fallback
if (clientEnv.NEXT_PUBLIC_MAPBOX_TOKEN) {
  mapboxgl.accessToken = clientEnv.NEXT_PUBLIC_MAPBOX_TOKEN;
}

interface InteractiveMapProps {
  center: Location;
  places: Place[];
  selectedPlace: Place | null;
  onPlaceSelect: (place: Place | null) => void;
  className?: string;
  viewMode?: 'map' | 'list';
}

const InteractiveMapComponent = memo<InteractiveMapProps>(
  ({ center, places, selectedPlace, onPlaceSelect, className, viewMode = 'map' }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const [mapError, setMapError] = useState<string | null>(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const popupRef = useRef<mapboxgl.Popup | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    // Ensure component only renders on client
    useEffect(() => {
      setIsMounted(true);
    }, []);

    // Memoize the addMapLayers function
    const addMapLayers = useCallback(
      (map: mapboxgl.Map) => {
        // Add source for places with clustering enabled
        map.addSource('places', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
          cluster: true,
          clusterMaxZoom: 14, // Max zoom to cluster points on
          clusterRadius: 50, // Radius of each cluster when clustering points
        });

        // Add cluster circles
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'places',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#51bbd6', // Blue for small clusters
              10,
              '#f1c40f', // Yellow for medium clusters
              30,
              '#e74c3c', // Red for large clusters
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20, // Small clusters
              10,
              25, // Medium clusters
              30,
              30, // Large clusters
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          },
        });

        // Add cluster count labels
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'places',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-anchor': 'center',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
          },
          paint: {
            'text-color': '#ffffff',
          },
        });

        // Add unclustered points (individual markers)
        map.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'places',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 20, 16],
            'circle-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#000000', '#ffffff'],
            'circle-stroke-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#000000', '#d1d5db'],
            'circle-stroke-width': 2,
            'circle-opacity': 1,
            'circle-stroke-opacity': 1,
          },
        });

        // Add labels for unclustered points
        map.addLayer({
          id: 'unclustered-point-labels',
          type: 'symbol',
          source: 'places',
          filter: ['!', ['has', 'point_count']],
          layout: {
            'text-field': ['get', 'index'],
            'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12,
            'text-anchor': 'center',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
          },
          paint: {
            'text-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#ffffff', '#000000'],
          },
        });

        // Handle cluster clicks - zoom into cluster
        map.on('click', 'clusters', (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['clusters'],
          });

          if (!features.length) return;

          const clusterId = features[0].properties!.cluster_id;
          const source = map.getSource('places') as mapboxgl.GeoJSONSource;

          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err || zoom == null) return;

            map.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom: zoom + 1,
            });
          });
        });

        // Handle individual point clicks
        map.on('click', 'unclustered-point', (e) => {
          if (!e.features || e.features.length === 0) return;

          const feature = e.features[0];
          const placeId = feature.properties?.place_id;
          const place = places.find((p) => p.place_id === placeId);

          if (place) {
            onPlaceSelect(place);
          }
        });

        // Change cursor on hover for clusters
        map.on('mouseenter', 'clusters', () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', 'clusters', () => {
          map.getCanvas().style.cursor = '';
        });

        // Change cursor on hover for individual points
        map.on('mouseenter', 'unclustered-point', () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        map.on('mouseleave', 'unclustered-point', () => {
          map.getCanvas().style.cursor = '';
        });

        // Handle map click to deselect
        map.on('click', (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['unclustered-point', 'clusters'],
          });
          if (features.length === 0) {
            onPlaceSelect(null);
          }
        });
      },
      [places, onPlaceSelect],
    );

    // Initialize map
    useEffect(() => {
      if (!mapContainerRef.current || !isMounted) return;

      // Check if Mapbox token is available
      if (!mapboxgl.accessToken) {
        setMapError('Map configuration error. Please check your settings.');
        return;
      }

      try {
        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/light-v11',
          center: [center.lng, center.lat],
          zoom: 14,
          attributionControl: false,
        });

        const map = mapRef.current;

        // Add error handling
        map.on('error', (e) => {
          console.error('Mapbox error:', e);
          setMapError('Failed to load map. Please try again later.');
        });

        // Map loaded successfully
        map.on('load', () => {
          setIsMapLoaded(true);
          setMapError(null);

          // Add sources and layers for markers
          addMapLayers(map);
        });

        // Add minimal controls
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false, showZoom: true }), 'bottom-right');

        // Compact attribution
        map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left');

        return () => {
          if (popupRef.current) {
            popupRef.current.remove();
          }
          map.remove();
          mapRef.current = null;
          setIsMapLoaded(false);
        };
      } catch (error) {
        console.error('Failed to initialize map:', error);
        setMapError('Failed to initialize map. Please check your connection.');
      }
    }, [center.lat, center.lng, addMapLayers, isMounted]);

    // Update places data
    useEffect(() => {
      if (!mapRef.current || !isMapLoaded) return;

      const map = mapRef.current;
      const source = map.getSource('places') as mapboxgl.GeoJSONSource;

      if (!source) return;

      // Convert places to GeoJSON features
      const features = places.map((place, index) => ({
        type: 'Feature' as const,
        id: place.place_id,
        geometry: {
          type: 'Point' as const,
          coordinates: [place.location.lng, place.location.lat],
        },
        properties: {
          place_id: place.place_id,
          name: place.name,
          index: String(index + 1),
        },
      }));

      // Update source data
      source.setData({
        type: 'FeatureCollection',
        features,
      });

      // Update selected state for unclustered points only
      // Wait for the clustering to complete before setting feature states
      setTimeout(() => {
        features.forEach((feature) => {
          const isSelected = selectedPlace?.place_id === feature.id;
          try {
            map.setFeatureState({ source: 'places', id: feature.id }, { selected: isSelected });
          } catch (error) {
            // Feature might be clustered, ignore the error
            console.debug('Feature state update skipped (likely clustered):', error);
          }
        });
      }, 100);
    }, [places, selectedPlace, isMapLoaded]);

    // Fly to selected place
    useEffect(() => {
      if (!mapRef.current || !selectedPlace || !isMapLoaded) return;

      const map = mapRef.current;
      const coordinates: [number, number] = [selectedPlace.location.lng, selectedPlace.location.lat];

      // Get current bounds and zoom
      const bounds = map.getBounds();
      const currentZoom = map.getZoom();
      const point = new mapboxgl.LngLat(coordinates[0], coordinates[1]);

      if (!bounds) return;

      // Calculate the center and margins of the current view
      const mapContainer = map.getContainer();
      const { width, height } = mapContainer.getBoundingClientRect();

      // Convert the selected point to screen coordinates
      const pixelPoint = map.project(point);

      // Define comfort margins (don't move unless marker is very close to edges)
      const marginX = width * 0.25; // 25% margin on each side
      const marginY = height * 0.25; // 25% margin on top/bottom

      // Check if point is comfortably within the visible area
      const isComfortablyVisible =
        pixelPoint.x > marginX &&
        pixelPoint.x < width - marginX &&
        pixelPoint.y > marginY &&
        pixelPoint.y < height - marginY;

      // Only move the map if:
      // 1. Point is not in bounds at all, OR
      // 2. Point is too close to edges (not comfortably visible), OR
      // 3. Zoom is too low for proper detail
      const shouldMove = !bounds.contains(point) || !isComfortablyVisible || currentZoom < 12;

      if (shouldMove) {
        // Only zoom in if current zoom is quite low
        const targetZoom = currentZoom < 12 ? 14 : Math.max(currentZoom, 13);

        map.flyTo({
          center: coordinates,
          zoom: targetZoom,
          duration: 600,
          essential: true,
        });
      }
      // If marker is already comfortably visible and zoom is adequate, do nothing!
    }, [selectedPlace, isMapLoaded]);

    // Fit bounds to show all markers
    useEffect(() => {
      if (!mapRef.current || !isMapLoaded || places.length === 0) return;

      // Small delay to ensure data is loaded
      const timeout = setTimeout(() => {
        const bounds = new mapboxgl.LngLatBounds();
        places.forEach((place) => {
          bounds.extend([place.location.lng, place.location.lat]);
        });

        mapRef.current!.fitBounds(bounds, {
          padding: 80,
          maxZoom: 16,
          duration: 800,
        });
      }, 100);

      return () => clearTimeout(timeout);
    }, [places, isMapLoaded]);

    // Handle resize when viewMode changes
    useEffect(() => {
      if (!mapRef.current || !isMapLoaded) return;

      // Small delay to allow CSS transition to start
      const timeout = setTimeout(() => {
        // Trigger resize to recalculate map dimensions
        mapRef.current?.resize();
      }, 50);

      return () => clearTimeout(timeout);
    }, [viewMode, isMapLoaded]);

    // Don't render anything on server
    if (!isMounted) {
      return <div className={cn('w-full h-full bg-neutral-50 dark:bg-neutral-900', className)} />;
    }

    // Error state
    if (mapError) {
      return (
        <div
          className={cn('w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900', className)}
        >
          <div className="text-center p-4">
            <p className="text-neutral-500 dark:text-neutral-400 mb-2">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-blue-500 hover:text-blue-600 underline"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={cn('w-full h-full relative', className)}>
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    return (
      prevProps.center.lat === nextProps.center.lat &&
      prevProps.center.lng === nextProps.center.lng &&
      prevProps.className === nextProps.className &&
      prevProps.viewMode === nextProps.viewMode &&
      prevProps.selectedPlace?.place_id === nextProps.selectedPlace?.place_id &&
      prevProps.places.length === nextProps.places.length &&
      prevProps.places.every((place, index) => place.place_id === nextProps.places[index]?.place_id)
    );
  },
);

InteractiveMapComponent.displayName = 'InteractiveMap';

// Export both as default and named export for compatibility
export default InteractiveMapComponent;
export { InteractiveMapComponent as InteractiveMap };
