'use client';

import React, { useEffect, useRef, useState, memo } from 'react';
import L from 'leaflet';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';

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
    const mapInstance = useRef<L.Map | null>(null);
    const markersRef = useRef<L.Marker[]>([]);
    const [mapError, setMapError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { theme, resolvedTheme } = useTheme();

    // Determine if we should use dark theme
    const isDark = resolvedTheme === 'dark';

    useEffect(() => {
      if (!mapRef.current || mapInstance.current) return;

      try {
        // Initialize Leaflet map
        mapInstance.current = L.map(mapRef.current, {
          center: [center.lat, center.lng],
          zoom,
          zoomControl: false,
          attributionControl: false,
        });

        const map = mapInstance.current;

        // Tile layers for light and dark themes (Carto base maps)
        const lightTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap, &copy; CARTO',
          maxZoom: 20,
        });
        const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap, &copy; CARTO',
          maxZoom: 20,
        });

        // Add initial tile layer based on theme
        (isDark ? darkTiles : lightTiles).addTo(map);

        // Add custom zoom control bottom-right to avoid header badges
        const ZoomControl = L.Control.extend({
          onAdd: function (map: L.Map) {
            const container = L.DomUtil.create('div', 'custom-zoom-control leaflet-bar');

            const zoomInBtn = L.DomUtil.create('button', 'zoom-btn zoom-in', container);
            zoomInBtn.type = 'button';
            zoomInBtn.setAttribute('aria-label', 'Zoom in');
            zoomInBtn.innerHTML = '+';

            const divider = L.DomUtil.create('div', 'divider', container);
            divider.setAttribute('aria-hidden', 'true');

            const zoomOutBtn = L.DomUtil.create('button', 'zoom-btn zoom-out', container);
            zoomOutBtn.type = 'button';
            zoomOutBtn.setAttribute('aria-label', 'Zoom out');
            zoomOutBtn.innerHTML = '&minus;';

            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            const handleZoomIn = () => map.zoomIn();
            const handleZoomOut = () => map.zoomOut();
            zoomInBtn.addEventListener('click', handleZoomIn);
            zoomOutBtn.addEventListener('click', handleZoomOut);

            const updateDisabled = () => {
              const z = map.getZoom();
              zoomInBtn.disabled = z >= map.getMaxZoom();
              zoomOutBtn.disabled = z <= map.getMinZoom();
            };
            map.on('zoomend zoomlevelschange', updateDisabled);
            setTimeout(updateDisabled, 0);

            // Cleanup when control is removed
            (this as any).onRemove = () => {
              zoomInBtn.removeEventListener('click', handleZoomIn);
              zoomOutBtn.removeEventListener('click', handleZoomOut);
              map.off('zoomend zoomlevelschange', updateDisabled);
            };

            return container;
          },
        });

        new (ZoomControl as any)({ position: 'bottomright' }).addTo(map);

        // Handle tile load/error
        let activeTiles = isDark ? darkTiles : lightTiles;
        activeTiles.on('load', () => {
          setIsLoading(false);
          setMapError(null);
          setTimeout(() => map.invalidateSize(), 0);
        });
        activeTiles.on('tileerror', () => {
          setMapError('Failed to load map tiles. Please try again later.');
          setIsLoading(false);
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
      // Swap tile layers on theme change
      if (!mapInstance.current || isLoading) return;
      const map = mapInstance.current;
      // Remove all tile layers, then add the appropriate one
      map.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer);
        }
      });
      const tiles = isDark
        ? L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap, &copy; CARTO',
            maxZoom: 20,
          })
        : L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap, &copy; CARTO',
            maxZoom: 20,
          });
      tiles.addTo(map);
    }, [isDark, isLoading]);

    useEffect(() => {
      if (mapInstance.current && !isLoading) {
        mapInstance.current.flyTo([center.lat, center.lng], zoom, { duration: 1 });
      }
    }, [center, zoom, isLoading]);

    useEffect(() => {
      if (!mapInstance.current || isLoading) return;

      // Clear existing markers (avoid duplicates)
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      // Also remove any stray root-level markers in case of legacy leftovers
      mapInstance.current.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.Marker) {
          mapInstance.current?.removeLayer(layer);
        }
      });

      const map = mapInstance.current;

      // Add markers for each place
      places.forEach((place) => {
        // Use shadcn-like tokens (Tailwind CSS variables) for theme-aware colors
        const markerBg = 'bg-primary';
        const ringColor = 'ring-[hsl(var(--border))]';

        const html = `
          <div class="group relative">
            <div class="w-6 h-6 ${markerBg} text-primary-foreground rounded-full flex items-center justify-center shadow-sm border-2 ${ringColor} transform-gpu transition-all group-hover:scale-110 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>`;

        const isMobile = map.getSize().x < 640;
        const iconPx = isMobile ? 22 : 24;
        const divIcon = L.divIcon({
          html,
          className: 'custom-marker-wrapper rounded-full',
          iconSize: [iconPx, iconPx],
          iconAnchor: [iconPx / 2, iconPx / 2],
        });

        const marker = L.marker([place.location.lat, place.location.lng], { icon: divIcon }).addTo(map);

        // Popup content
        const popupBg = isDark ? 'bg-neutral-900' : 'bg-white';
        const popupBorder = isDark ? 'border-neutral-700' : 'border-neutral-200';
        const titleColor = isDark ? 'text-white' : 'text-neutral-900';
        const textColor = isDark ? 'text-neutral-300' : 'text-neutral-600';
        const tagBg = isDark ? 'bg-neutral-800' : 'bg-neutral-100';
        const tagColor = isDark ? 'text-neutral-400' : 'text-neutral-600';

        const popupContent = `
          <div class="p-3 min-w-[220px] max-w-[320px] ${popupBg} rounded-lg shadow-sm border ${popupBorder}">
            <h3 class="font-semibold text-sm ${titleColor} mb-2">${place.name}</h3>
            ${
              place.vicinity || place.formatted_address
                ? `<p class="text-xs ${textColor} mb-2 leading-relaxed">${place.vicinity || place.formatted_address}</p>`
                : ''
            }
            ${
              place.rating
                ? `<div class="flex items-center gap-1.5 text-xs mb-2"><span class="text-yellow-500 text-sm">★</span><span class="${titleColor} font-medium">${place.rating}</span></div>`
                : ''
            }
            ${
              place.types && place.types.length > 0
                ? `<div class="flex flex-wrap gap-1">${place.types
                    .slice(0, 2)
                    .map(
                      (type) =>
                        `<span class="text-[10px] px-2 py-1 ${tagBg} rounded-full ${tagColor} capitalize">${type.replace(
                          /_/g,
                          ' ',
                        )}</span>`,
                    )
                    .join('')}</div>`
                : ''
            }
          </div>`;

        marker.bindPopup(popupContent, { closeButton: true, autoClose: false, closeOnClick: false, maxWidth: 320 });

        marker.on('click', () => {
          if (onMarkerClick) onMarkerClick(place);
          marker.openPopup();
        });

        markersRef.current.push(marker);
      });

      // Fit bounds if multiple markers
      if (places.length > 1 && mapInstance.current) {
        const bounds = L.latLngBounds(places.map((p) => [p.location.lat, p.location.lng]) as [number, number][]);
        mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
      }
    }, [places, onMarkerClick, isLoading, isDark]);

    // Error state
    if (mapError) {
      return (
        <div
          className={`w-full ${height} flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 rounded-lg ${className}`}
        >
          <div className="text-center p-6">
            <WarningCircleIcon size={32} className="text-red-500 mx-auto mb-3" weight="duotone" />
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
        className={`w-full ${height} relative overflow-hidden z-0 ${className}`}
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
