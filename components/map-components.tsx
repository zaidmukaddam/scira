// /app/components/map-components.tsx
import { clientEnv } from '@/env/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useEffect, useRef, useState, memo } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTheme } from 'next-themes';

// Set Mapbox token with fallback
if (clientEnv.NEXT_PUBLIC_MAPBOX_TOKEN) {
  mapboxgl.accessToken = clientEnv.NEXT_PUBLIC_MAPBOX_TOKEN;
}

interface Location {
  lat: number;
  lng: number;
}

export interface Place {
  name: string;
  location: Location;
  vicinity?: string;
  formatted_address?: string;
  place_id?: string;
  rating?: number;
  types?: string[];
}

interface MapProps {
  center: Location;
  places?: Place[];
  zoom?: number;
  onMarkerClick?: (place: Place) => void;
  height?: string;
  className?: string;
}

const MapComponent = memo(
  ({ center, places = [], zoom = 14, onMarkerClick, height = 'h-[400px]', className = '' }: MapProps) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const [mapError, setMapError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { theme, resolvedTheme } = useTheme();

    // Determine if we should use dark theme
    const isDark = resolvedTheme === 'dark';

    useEffect(() => {
      if (!mapRef.current || mapInstance.current) return;

      // Check if Mapbox token is available
      if (!mapboxgl.accessToken) {
        setMapError('Map configuration error. Please check your settings.');
        setIsLoading(false);
        return;
      }

      try {
        // Use appropriate style based on theme
        const mapStyle = isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';

        mapInstance.current = new mapboxgl.Map({
          container: mapRef.current,
          style: mapStyle,
          center: [center.lng, center.lat],
          zoom,
          attributionControl: false,
          failIfMajorPerformanceCaveat: true,
          // Fix the container resize issue by ensuring consistent sizing
          preserveDrawingBuffer: true,
          antialias: true,
          // Prevent resize issues
          trackResize: true,
        });

        const map = mapInstance.current;

        // Handle map errors
        map.on('error', (e) => {
          console.error('Mapbox error:', e);
          setMapError('Failed to load map. Please try again later.');
          setIsLoading(false);
        });

        // Map loaded successfully
        map.on('load', () => {
          setIsLoading(false);
          setMapError(null);
          // Force a resize to ensure proper dimensions
          map.resize();
        });

        // Add zoom and rotation controls with better positioning
        map.addControl(
          new mapboxgl.NavigationControl({
            showCompass: false,
            showZoom: true,
          }),
          'top-right',
        );

        // Add attribution control
        map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

        // Prevent zoom from affecting container size
        map.on('zoom', () => {
          // Ensure the container maintains its size
          if (mapRef.current) {
            mapRef.current.style.height = mapRef.current.style.height || '100%';
          }
        });

        return () => {
          markersRef.current.forEach((marker) => marker.remove());
          markersRef.current = [];
          if (mapInstance.current) {
            map.remove();
            mapInstance.current = null;
          }
        };
      } catch (error) {
        console.error('Failed to initialize map:', error);
        setMapError('Failed to initialize map. Please check your connection.');
        setIsLoading(false);
      }
    }, [center.lat, center.lng, zoom, isDark]);

    // Update map style when theme changes
    useEffect(() => {
      if (mapInstance.current && !isLoading) {
        const mapStyle = isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11';
        mapInstance.current.setStyle(mapStyle);
      }
    }, [isDark, isLoading]);

    useEffect(() => {
      if (mapInstance.current && !isLoading) {
        mapInstance.current.flyTo({
          center: [center.lng, center.lat],
          zoom,
          essential: true,
          duration: 1000,
          padding: { top: 20, bottom: 20, left: 20, right: 20 },
        });
      }
    }, [center, zoom, isLoading]);

    useEffect(() => {
      if (!mapInstance.current || isLoading) return;

      // Clear existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Add markers for each place
      places.forEach((place, index) => {
        // Create custom marker element with theme-aware styling
        const el = document.createElement('div');
        el.className = 'custom-marker';

        // Theme-aware marker colors
        const markerBg = isDark ? 'bg-blue-500' : 'bg-blue-600';
        const hoverBg = isDark ? 'hover:bg-blue-400' : 'hover:bg-blue-700';
        const ringColor = isDark ? 'ring-neutral-800' : 'ring-white';

        el.innerHTML = `
        <div class="w-6 h-6 ${markerBg} rounded-full flex items-center justify-center shadow-lg ring-2 ${ringColor} transform-gpu transition-all hover:scale-110 cursor-pointer ${hoverBg}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
          </svg>
        </div>
      `;

        // Add accessibility attributes
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', `Marker for ${place.name}`);
        el.setAttribute('tabindex', '0');

        // Create popup content with theme-aware styling
        const popupBg = isDark ? 'bg-neutral-900' : 'bg-white';
        const popupBorder = isDark ? 'border-neutral-700' : 'border-neutral-200';
        const titleColor = isDark ? 'text-white' : 'text-neutral-900';
        const textColor = isDark ? 'text-neutral-300' : 'text-neutral-600';
        const ratingBg = isDark ? 'bg-neutral-800' : 'bg-neutral-100';
        const tagBg = isDark ? 'bg-neutral-800' : 'bg-neutral-100';
        const tagColor = isDark ? 'text-neutral-400' : 'text-neutral-600';

        const popupContent = `
        <div class="p-3 min-w-[220px] max-w-[320px] ${popupBg} rounded-lg shadow-sm border ${popupBorder}">
          <h3 class="font-semibold text-sm ${titleColor} mb-2">${place.name}</h3>
          ${
            place.vicinity || place.formatted_address
              ? `
            <p class="text-xs ${textColor} mb-2 leading-relaxed">
              ${place.vicinity || place.formatted_address}
            </p>
          `
              : ''
          }
          ${
            place.rating
              ? `
            <div class="flex items-center gap-1.5 text-xs mb-2">
              <span class="text-yellow-500 text-sm">★</span>
              <span class="${titleColor} font-medium">${place.rating}</span>
            </div>
          `
              : ''
          }
          ${
            place.types && place.types.length > 0
              ? `
            <div class="flex flex-wrap gap-1">
              ${place.types
                .slice(0, 2)
                .map(
                  (type) =>
                    `<span class="text-[10px] px-2 py-1 ${tagBg} rounded-full ${tagColor} capitalize">
                  ${type.replace(/_/g, ' ')}
                </span>`,
                )
                .join('')}
            </div>
          `
              : ''
          }
        </div>
      `;

        const popup = new mapboxgl.Popup({
          offset: 20,
          closeButton: true,
          closeOnClick: false,
          className: `custom-popup ${isDark ? 'dark-popup' : 'light-popup'}`,
          maxWidth: '320px',
        }).setHTML(popupContent);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([place.location.lng, place.location.lat])
          .setPopup(popup)
          .addTo(mapInstance.current!);

        // Add click handler
        el.addEventListener('click', () => {
          if (onMarkerClick) {
            onMarkerClick(place);
          }
        });

        // Add keyboard handler for accessibility
        el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (onMarkerClick) {
              onMarkerClick(place);
            }
            marker.togglePopup();
          }
        });

        markersRef.current.push(marker);
      });

      // Fit bounds if multiple markers with better padding
      if (places.length > 1 && mapInstance.current) {
        const bounds = new mapboxgl.LngLatBounds();
        places.forEach((place) => {
          bounds.extend([place.location.lng, place.location.lat]);
        });

        mapInstance.current.fitBounds(bounds, {
          padding: { top: 40, bottom: 40, left: 40, right: 40 },
          maxZoom: 15,
          duration: 1000,
        });
      }
    }, [places, onMarkerClick, isLoading, isDark]);

    // Error state
    if (mapError) {
      return (
        <div
          className={`w-full ${height} flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 rounded-lg ${className}`}
        >
          <div className="text-center p-6">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <p className="text-neutral-600 dark:text-neutral-400 mb-3 text-sm">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`w-full ${height} relative overflow-hidden ${className}`}
        style={{
          minHeight: '300px',
          maxHeight: '600px',
          position: 'relative',
          containIntrinsicSize: '100% 400px',
        }}
      >
        <div
          ref={mapRef}
          className="w-full h-full absolute inset-0"
          style={{
            height: '100%',
            width: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 flex items-center justify-center backdrop-blur-sm z-10">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-r-transparent"></div>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Loading map...</p>
            </div>
          </div>
        )}

        {/* Add custom CSS for popup theming */}
        <style jsx global>{`
          .mapboxgl-popup-content {
            padding: 0 !important;
            border-radius: 8px !important;
          }

          .dark-popup .mapboxgl-popup-content {
            background-color: rgb(23 23 23) !important;
            border: 1px solid rgb(64 64 64) !important;
          }

          .light-popup .mapboxgl-popup-content {
            background-color: white !important;
            border: 1px solid rgb(229 229 229) !important;
          }

          .mapboxgl-popup-close-button {
            color: ${isDark ? 'rgb(163 163 163)' : 'rgb(82 82 82)'} !important;
            font-size: 18px !important;
            padding: 8px !important;
          }

          .mapboxgl-popup-close-button:hover {
            color: ${isDark ? 'white' : 'black'} !important;
            background-color: ${isDark ? 'rgb(64 64 64)' : 'rgb(243 244 246)'} !important;
          }

          /* Ensure map container doesn't resize with zoom */
          .mapboxgl-map {
            height: 100% !important;
            width: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
          }

          .mapboxgl-canvas-container {
            height: 100% !important;
            width: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
          }

          .mapboxgl-canvas {
            height: 100% !important;
            width: 100% !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
          }

          /* Prevent any container from changing size */
          .mapboxgl-ctrl-top-right,
          .mapboxgl-ctrl-bottom-right {
            z-index: 100 !important;
          }
        `}</style>
      </div>
    );
  },
);

MapComponent.displayName = 'MapComponent';

// Enhanced map skeleton with theme awareness
const MapSkeleton = ({ height = 'h-64' }: { height?: string }) => (
  <div className={`w-full ${height} bg-neutral-100 dark:bg-neutral-800 overflow-hidden relative animate-pulse`}>
    <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 dark:from-neutral-700 to-transparent opacity-50" />
    <div className="absolute top-3 right-3 space-y-2">
      <div className="w-8 h-8 bg-neutral-300 dark:bg-neutral-700 rounded shadow-sm" />
      <div className="w-8 h-8 bg-neutral-300 dark:bg-neutral-700 rounded shadow-sm" />
    </div>
    <div className="absolute bottom-3 right-3">
      <div className="w-20 h-3 bg-neutral-300 dark:bg-neutral-700 rounded" />
    </div>
    {/* Mock markers */}
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      <div className="w-6 h-6 bg-blue-400 rounded-full opacity-60"></div>
    </div>
    <div className="absolute top-1/3 right-1/3 transform -translate-x-1/2 -translate-y-1/2">
      <div className="w-6 h-6 bg-blue-400 rounded-full opacity-40"></div>
    </div>
  </div>
);

interface MapContainerProps {
  title: string;
  center: Location;
  places?: Place[];
  loading?: boolean;
  className?: string;
  height?: string;
}

const MapContainer: React.FC<MapContainerProps> = ({
  title,
  center,
  places = [],
  loading = false,
  className = '',
  height = 'h-[400px]',
}) => {
  if (loading) {
    return (
      <div className={`my-4 ${className}`}>
        <h2 className="text-xl font-semibold mb-3 text-neutral-900 dark:text-neutral-100">{title}</h2>
        <MapSkeleton height={height} />
        <div className="mt-3 flex items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
          <div className="animate-pulse">Preparing map view...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`my-4 ${className}`}>
      <h2 className="text-xl font-semibold mb-3 text-neutral-900 dark:text-neutral-100">{title}</h2>
      <MapComponent center={center} places={places} height={height} />
      {places.length > 0 && (
        <div className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
          Showing {places.length} location{places.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export { MapComponent, MapContainer, MapSkeleton };
