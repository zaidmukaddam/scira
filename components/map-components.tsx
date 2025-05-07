// /app/components/map-components.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { clientEnv } from "@/env/client";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import React, { useEffect, useRef } from "react";
import { T } from "gt-next";

mapboxgl.accessToken = clientEnv.NEXT_PUBLIC_MAPBOX_TOKEN || "";

interface Location {
	lat: number;
	lng: number;
}

export interface Place {
	name: string;
	location: Location;
	vicinity?: string;
}

interface MapProps {
	center: Location;
	places?: Place[];
	zoom?: number;
	onMarkerClick?: (place: Place) => void;
}

const MapComponent = ({
	center,
	places = [],
	zoom = 14,
	onMarkerClick,
}: MapProps & { onMarkerClick?: (place: Place) => void }) => {
	const mapRef = useRef<HTMLDivElement>(null);
	const mapInstance = useRef<mapboxgl.Map | null>(null);
	const markersRef = useRef<mapboxgl.Marker[]>([]);

	useEffect(() => {
		if (!mapRef.current || mapInstance.current) return;
		if (!mapboxgl.accessToken) {
			console.error("Mapbox access token is not set");
			return;
		}

		mapInstance.current = new mapboxgl.Map({
			container: mapRef.current,
			style: "mapbox://styles/mapbox/dark-v11",
			center: [center.lng, center.lat],
			zoom,
			attributionControl: false,
		});

		// Add zoom and rotation controls
		mapInstance.current.addControl(
			new mapboxgl.NavigationControl(),
			"top-right",
		);

		// Add attribution control in bottom-left
		mapInstance.current.addControl(
			new mapboxgl.AttributionControl({ compact: true }),
			"bottom-left",
		);

		// Add fullscreen control
		mapInstance.current.addControl(
			new mapboxgl.FullscreenControl(),
			"top-right",
		);

		return () => {
			mapInstance.current?.remove();
			mapInstance.current = null;
		};
	}, [center.lat, center.lng, zoom]);

	useEffect(() => {
		if (mapInstance.current) {
			mapInstance.current.flyTo({
				center: [center.lng, center.lat],
				zoom,
				essential: true,
				duration: 1000,
				padding: { top: 50, bottom: 50, left: 50, right: 50 },
			});
		}
	}, [center, zoom]);

	useEffect(() => {
		if (!mapInstance.current) return;

		markersRef.current.forEach((marker) => marker.remove());
		markersRef.current = [];

		places.forEach((place) => {
			// Create custom marker element
			const el = document.createElement("div");
			el.className = "custom-marker";
			el.innerHTML = `
        <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg transform-gpu transition-transform hover:scale-110">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
          </svg>
        </div>
      `;

			const marker = new mapboxgl.Marker(el)
				.setLngLat([place.location.lng, place.location.lat])
				.setPopup(
					new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div class="p-2 min-w-[200px] bg-white dark:bg-neutral-800 m-0">
            <h3 class="font-semibold text-sm text-neutral-900 dark:text-white">${place.name}</h3>
            ${place.vicinity ? `<p class="text-xs mt-1 text-neutral-600 dark:text-neutral-300">${place.vicinity}</p>` : ""}
          </div>
        `),
				)
				.addTo(mapInstance.current!);

			marker.getElement().addEventListener("click", () => {
				if (onMarkerClick) {
					onMarkerClick(place);
				}
			});

			markersRef.current.push(marker);
		});
	}, [places, onMarkerClick]);

	return (
		<div className="w-full h-[60vh] rounded-t-xl overflow-hidden shadow-lg">
			<div ref={mapRef} className="w-full h-full" />
		</div>
	);
};

export default React.memo(MapComponent, (prevProps, nextProps) => {
	return (
		prevProps.center.lat === nextProps.center.lat &&
		prevProps.center.lng === nextProps.center.lng &&
		prevProps.zoom === nextProps.zoom &&
		JSON.stringify(prevProps.places) === JSON.stringify(nextProps.places)
	);
});

const MapSkeleton = () => (
	<Skeleton className="w-full h-64 bg-neutral-200 dark:bg-neutral-700" />
);

interface PlaceDetailsProps extends Place {
	onDirectionsClick?: () => void;
	onWebsiteClick?: () => void;
	onCallClick?: () => void;
}

interface MapContainerProps {
	title: string;
	center: Location;
	places?: Place[];
	loading?: boolean;
}

const MapContainer: React.FC<MapContainerProps> = ({
	title,
	center,
	places = [],
	loading = false,
}) => {
	if (loading) {
		return (
			<T id="components.map_components.0">
				<div className="my-4">
					<MapSkeleton />
					<p>Loading map...</p>
				</div>
			</T>
		);
	}

	return (
		<div className="my-4">
			<h2 className="text-xl font-semibold mb-2">{title}</h2>
			<MapComponent center={center} places={places} />
		</div>
	);
};

export { MapComponent, MapContainer, MapSkeleton };
