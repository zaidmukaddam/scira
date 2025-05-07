/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import PlaceCard from "./place-card";
import { Badge } from "./ui/badge";
import { Var, T } from "gt-next";

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

// Dynamic import for the map component
const InteractiveMap = dynamic(() => import("./interactive-maps"), {
	ssr: false,
});

interface NearbySearchMapViewProps {
	center: {
		lat: number;
		lng: number;
	};
	places: Place[];
	type: string;
}

const NearbySearchMapView: React.FC<NearbySearchMapViewProps> = ({
	center,
	places,
	type,
}) => {
	const [viewMode, setViewMode] = useState<"map" | "list">("map");
	const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

	return (
		<T id="components.nearby_search_map_view.0">
			<div className="relative w-full h-[70vh] bg-white dark:bg-neutral-900 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
				<Badge variant={"secondary"} className="absolute top-4 left-4 z-10">
					Beta
				</Badge>
				{/* View Toggle */}
				<div className="absolute top-4 right-4 z-10 flex rounded-full bg-white dark:bg-black border border-neutral-200 dark:border-neutral-700 p-0.5 shadow-lg">
					<button
						onClick={() => setViewMode("list")}
						className={cn(
							"px-4 py-1 rounded-full text-sm font-medium transition-colors",
							viewMode === "list"
								? "bg-black dark:bg-white text-white dark:text-black"
								: "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white",
						)}
					>
						List
					</button>
					<button
						onClick={() => setViewMode("map")}
						className={cn(
							"px-4 py-1 rounded-full text-sm font-medium transition-colors",
							viewMode === "map"
								? "bg-black dark:bg-white text-white dark:text-black"
								: "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white",
						)}
					>
						Map
					</button>
				</div>

				<div
					className={cn(
						"w-full h-full flex flex-col",
						viewMode === "list"
							? "divide-y divide-neutral-200 dark:divide-neutral-800"
							: "",
					)}
				>
					{/* Map Container */}
					<div
						className={cn(
							"w-full transition-all duration-300",
							viewMode === "map" ? "h-full" : "h-[40%]",
						)}
					>
						<InteractiveMap
							center={center}
							places={places}
							selectedPlace={selectedPlace}
							onPlaceSelect={setSelectedPlace}
						/>

						{/* Selected Place Overlay - Only show in map view */}
						<Var>
							{selectedPlace && viewMode === "map" && (
								<div className="absolute left-4 right-4 bottom-4 z-0">
									<PlaceCard
										place={selectedPlace}
										onClick={() => {}}
										isSelected={true}
										variant="overlay"
									/>
								</div>
							)}
						</Var>
					</div>

					{/* List Container */}
					<Var>
						{viewMode === "list" && (
							<div className="h-[60%] bg-white dark:bg-neutral-900">
								<div className="h-full overflow-y-auto">
									<div className="max-w-3xl mx-auto p-4 space-y-4">
										{places.map((place, index) => (
											<PlaceCard
												key={index}
												place={place}
												onClick={() => setSelectedPlace(place)}
												isSelected={selectedPlace?.place_id === place.place_id}
												variant="list"
											/>
										))}
									</div>
								</div>
							</div>
						)}
					</Var>
				</div>
			</div>
		</T>
	);
};

export default NearbySearchMapView;
