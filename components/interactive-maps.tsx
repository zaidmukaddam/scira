'use client';

import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import type * as Leaflet from 'leaflet';
import { useCallback, useEffect, useRef, useState, memo } from 'react';
import { useTheme } from 'next-themes';

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

interface InteractiveMapProps {
  center: Location;
  places: Place[];
  selectedPlace: Place | null;
  onPlaceSelect: (place: Place | null) => void;
  className?: string;
  viewMode?: 'map' | 'list';
  tileStyle?: 'osm' | 'carto' | 'carto-voyager' | 'esri-imagery' | 'opentopo';
}

const InteractiveMapComponent = memo<InteractiveMapProps>(
  ({ center, places, selectedPlace, onPlaceSelect, className, viewMode = 'map', tileStyle = 'carto' }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<Leaflet.Map | null>(null);
    const [mapError, setMapError] = useState<string | null>(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const popupRef = useRef<Leaflet.Popup | null>(null);
    const markersGroupRef = useRef<Leaflet.LayerGroup | null>(null);
    const tileLayerRef = useRef<Leaflet.TileLayer | null>(null);
    const leafletRef = useRef<typeof Leaflet | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const { resolvedTheme } = useTheme();
    const [isLeafletReady, setIsLeafletReady] = useState(false);

    // Ensure component only renders on client
    useEffect(() => {
      setIsMounted(true);
    }, []);

    // Helper to create a tile layer based on style and theme
    const createTileLayer = useCallback(
      (style: InteractiveMapProps['tileStyle'], theme: string | undefined): Leaflet.TileLayer => {
        const L = leafletRef.current!;
        const isDark = theme === 'dark';
        switch (style) {
          case 'carto':
            return L.tileLayer(
              isDark
                ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
              {
                attribution: '&copy; OpenStreetMap, &copy; CARTO',
                maxZoom: 20,
              },
            );
          case 'carto-voyager':
            return L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
              attribution: '&copy; OpenStreetMap, &copy; CARTO',
              maxZoom: 20,
            });
          case 'esri-imagery':
            return L.tileLayer(
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              {
                attribution: 'Tiles &copy; Esri',
                maxZoom: 19,
              },
            );
          case 'opentopo':
            return L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
              attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
              maxZoom: 17,
            });
          case 'osm':
          default:
            return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; OpenStreetMap contributors',
              maxZoom: 20,
            });
        }
      },
      [],
    );

    // Initialize map
    useEffect(() => {
      if (!mapContainerRef.current || !isMounted) return;

      try {
        const init = async () => {
          // Load Leaflet only on client
          if (!leafletRef.current) {
            const mod = await import('leaflet');
            leafletRef.current = mod;
            setIsLeafletReady(true);
          }
          const L = leafletRef.current!;

          mapRef.current = L.map(mapContainerRef.current!, {
            center: [center.lat, center.lng],
            zoom: 14,
            zoomControl: false,
            attributionControl: false,
          });

          const map = mapRef.current;

          // Add tiles and mark as loaded on first tile load
          const tiles = createTileLayer(tileStyle, resolvedTheme);
          tiles.addTo(map);
          tileLayerRef.current = tiles;
          tiles.once('load', () => {
            setIsMapLoaded(true);
            setMapError(null);
          });
          // Fallback: ensure map marks as loaded
          setTimeout(() => {
            map.invalidateSize();
            setIsMapLoaded(true);
          }, 0);

          // Custom zoom control
          class ZoomControl extends L.Control {
            public onAdd(mapInstance: Leaflet.Map): HTMLElement {
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

              const handleZoomIn = () => mapInstance.zoomIn();
              const handleZoomOut = () => mapInstance.zoomOut();
              zoomInBtn.addEventListener('click', handleZoomIn);
              zoomOutBtn.addEventListener('click', handleZoomOut);

              const updateDisabled = () => {
                const z = mapInstance.getZoom();
                const min = mapInstance.getMinZoom();
                const max = mapInstance.getMaxZoom();
                zoomInBtn.disabled = z >= max;
                zoomOutBtn.disabled = z <= min;
              };
              mapInstance.on('zoomend zoomlevelschange', updateDisabled);
              setTimeout(updateDisabled, 0);

              // Cleanup when control is removed
              (this as unknown as { onRemove?: () => void }).onRemove = () => {
                zoomInBtn.removeEventListener('click', handleZoomIn);
                zoomOutBtn.removeEventListener('click', handleZoomOut);
                mapInstance.off('zoomend zoomlevelschange', updateDisabled);
              };

              return container;
            }
          }

          new ZoomControl({ position: 'bottomright' }).addTo(map);
          // Dedicated layer group to hold markers
          markersGroupRef.current = L.layerGroup().addTo(map);

          return () => {
            if (popupRef.current) {
              popupRef.current.removeFrom(map);
            }
            map.remove();
            mapRef.current = null;
            setIsMapLoaded(false);
          };
        };
        void init();
      } catch (error) {
        console.error('Failed to initialize map:', error);
        setMapError('Failed to initialize map. Please check your connection.');
      }
    }, [center.lat, center.lng, createTileLayer, isMounted, tileStyle, resolvedTheme]);

    // Swap tile layer when style or theme changes
    useEffect(() => {
      if (!mapRef.current) return;
      const map = mapRef.current;
      const next = createTileLayer(tileStyle, resolvedTheme);
      next.addTo(map);
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }
      tileLayerRef.current = next;
    }, [tileStyle, resolvedTheme, createTileLayer]);

    // Update places data
    useEffect(() => {
      if (!mapRef.current || !isMapLoaded || !leafletRef.current) return;
      const L = leafletRef.current!;

      const map = mapRef.current;

      // Maintain a dedicated markers group via ref
      if (!markersGroupRef.current) {
        markersGroupRef.current = L.layerGroup().addTo(map);
      }
      // Remove any stray root-level markers (from previous versions) to avoid duplicates
      const strayLayers: L.Layer[] = [];
      map.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.Marker) {
          strayLayers.push(layer);
        }
      });
      strayLayers.forEach((l) => map.removeLayer(l));
      if (markersGroupRef.current) {
        markersGroupRef.current.clearLayers();
      }

      // Add compact, polished markers (responsive size)
      places.forEach((place, index) => {
        const isSelected = selectedPlace?.place_id === place.place_id;
        const isMobile = map.getSize().x < 640;
        const markerPx = isMobile ? 28 : 32;
        // Use shadcn theme tokens via Tailwind to adapt to theme
        const bg = isSelected ? 'bg-primary' : 'bg-background';
        const text = isSelected ? 'text-primary-foreground' : 'text-foreground';
        const border = isSelected ? 'border-[hsl(var(--primary))]' : 'border-[hsl(var(--border))]';
        const html = `
          <div class="group relative">
            <div style="width:${markerPx}px;height:${markerPx}px"
                 class="${bg} ${text} rounded-full border-2 ${border} shadow-sm flex items-center justify-center transition-transform group-hover:scale-105">
              <span class="text-[11px] sm:text-[12px] font-semibold">${index + 1}</span>
            </div>
          </div>`;
        const icon = L.divIcon({
          html,
          className: 'cluster-marker rounded-full',
          iconSize: [markerPx, markerPx],
          iconAnchor: [markerPx / 2, markerPx / 2],
        });
        const marker = L.marker([place.location.lat, place.location.lng], { icon });
        if (markersGroupRef.current) {
          markersGroupRef.current.addLayer(marker);
        } else {
          marker.addTo(map);
        }
        marker.on('click', () => onPlaceSelect(place));
      });
    }, [places, selectedPlace, isMapLoaded, onPlaceSelect]);

    // Fly to selected place; when overlay is visible (map view with selectedPlace), bias center upward
    useEffect(() => {
      if (!mapRef.current || !selectedPlace || !isMapLoaded || !leafletRef.current) return;
      const L = leafletRef.current!;

      const map = mapRef.current;
      let latlng = L.latLng(selectedPlace.location.lat, selectedPlace.location.lng);
      const bounds = map.getBounds();
      const currentZoom = map.getZoom();

      // Calculate comfort margins using pixel coordinates
      const container = map.getContainer();
      const { width, height } = container.getBoundingClientRect();
      const point = map.latLngToContainerPoint(latlng);
      const marginX = width * 0.25;
      const marginY = height * 0.25;
      const isComfortablyVisible =
        point.x > marginX && point.x < width - marginX && point.y > marginY && point.y < height - marginY;

      const shouldMove = !bounds.contains(latlng) || !isComfortablyVisible || currentZoom < 12;

      if (shouldMove) {
        const targetZoom = currentZoom < 12 ? 14 : Math.max(currentZoom, 13);
        // Offset center upward by converting to container point and shifting when overlay likely covers bottom
        const container = map.getContainer();
        const isOverlay = !!selectedPlace; // in this context true
        let targetPoint = map.latLngToContainerPoint(latlng);
        if (isOverlay) {
          targetPoint = L.point(targetPoint.x, targetPoint.y + Math.min(container.clientHeight * 0.15, 160));
          latlng = map.containerPointToLatLng(targetPoint);
        }
        map.flyTo(latlng, targetZoom, { duration: 0.6 });
      }
      // If marker is already comfortably visible and zoom is adequate, do nothing!
    }, [selectedPlace, isMapLoaded]);

    // Fit bounds to show all markers. When list view is active, add top padding so markers remain visible above list.
    useEffect(() => {
      if (!mapRef.current || !isMapLoaded || places.length === 0 || !leafletRef.current) return;
      const L = leafletRef.current!;

      // Small delay to ensure data is loaded
      const timeout = setTimeout(() => {
        const bounds = L.latLngBounds(places.map((p) => [p.location.lat, p.location.lng]) as [number, number][]);
        // Detect if parent has list-view class to apply asymmetric padding
        const container = mapRef.current!.getContainer();
        const isListView = container.closest('.nearby-search-map')?.classList.contains('list-view');
        const isMobile = container.clientWidth < 640;

        // Handle single-point bounds separately to allow precise vertical offset
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        const isSinglePoint = ne.equals(sw);

        if (isSinglePoint) {
          // Center to single marker, with vertical bias when list view is active (especially on mobile)
          let target = L.latLng(ne.lat, ne.lng);
          if (isListView) {
            const px = mapRef.current!.latLngToContainerPoint(target);
            const dy = isMobile ? Math.round(container.clientHeight * 0.25) : 100;
            const shifted = mapRef.current!.containerPointToLatLng(L.point(px.x, px.y + dy));
            mapRef.current!.setView(shifted, Math.max(mapRef.current!.getZoom(), 14), { animate: true });
          } else {
            mapRef.current!.setView(target, Math.max(mapRef.current!.getZoom(), 14), { animate: true });
          }
          return;
        }

        if (isListView) {
          const topPad = isMobile ? Math.round(container.clientHeight * 0.45) : 140;
          const bottomPad = isMobile ? 16 : 40;
          mapRef.current!.fitBounds(bounds, { paddingTopLeft: [80, topPad], paddingBottomRight: [80, bottomPad] });
        } else {
          mapRef.current!.fitBounds(bounds, { padding: [80, 80] });
        }
      }, 100);

      return () => clearTimeout(timeout);
    }, [places, isMapLoaded]);

    // Handle resize when viewMode changes (align with 500ms CSS transition)
    useEffect(() => {
      if (!mapRef.current || !isMapLoaded) return;

      const timeout = setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 550);

      return () => clearTimeout(timeout);
    }, [viewMode, isMapLoaded]);

    // Observe container size changes and invalidate Leaflet map size responsively
    useEffect(() => {
      if (!mapRef.current || !mapContainerRef.current || !isMapLoaded) return;

      let rafId: number | null = null;
      let trailingTimeout: number | null = null;

      const handleResize = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          mapRef.current?.invalidateSize();
          if (trailingTimeout) window.clearTimeout(trailingTimeout);
          trailingTimeout = window.setTimeout(() => {
            mapRef.current?.invalidateSize();
          }, 300);
        });
      };

      const ro = new ResizeObserver(handleResize);
      ro.observe(mapContainerRef.current);

      return () => {
        ro.disconnect();
        if (rafId) cancelAnimationFrame(rafId);
        if (trailingTimeout) window.clearTimeout(trailingTimeout);
      };
    }, [isMapLoaded]);

    // Don't render anything on server
    if (!isMounted) {
      return <div className={cn('w-full h-full bg-neutral-50 dark:bg-neutral-900', className)} />;
    }

    // Error state
    if (mapError) {
      return (
        <div
          className={cn(
            'w-full h-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-900 z-0',
            className,
          )}
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
      <div className={cn('w-full h-full relative z-0', className)}>
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
