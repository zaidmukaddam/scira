/* eslint-disable @next/next/no-img-element */
import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import PlaceholderImage from "./placeholder-image";
import { T, Var } from "gt-next";

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
	distance?: string;
	bearing?: string;
}

interface PlaceCardProps {
	place: Place;
	onClick: () => void;
	variant?: "overlay" | "list";
}

const PlaceCard: React.FC<PlaceCardProps> = ({
	place,
	onClick,
	variant = "list",
}) => {
	const isOverlay = variant === "overlay";

	return (
		<T id="components.list_view.7">
			<div
				onClick={onClick}
				className={cn(
					"bg-black text-white rounded-lg transition-transform",
					isOverlay ? "bg-opacity-90 backdrop-blur-xs" : "hover:bg-opacity-80",
					"cursor-pointer p-4",
				)}
			>
				<div className="flex gap-4">
					<div className="w-24 h-24 rounded-lg overflow-hidden shrink-0">
						<Var>
							{place.photos?.[0]?.medium ? (
								<img
									src={place.photos[0].medium}
									alt={place.name}
									className="w-full h-full object-cover"
								/>
							) : (
								<PlaceholderImage />
							)}
						</Var>
					</div>

					<div className="flex-1 min-w-0">
						<h3 className="text-xl font-medium mb-1">
							<Var>{place.name}</Var>
						</h3>

						<div className="flex items-center gap-2 mb-1">
							<span
								className={cn(
									"text-sm font-medium",
									place.is_closed ? "text-red-500" : "text-green-500",
								)}
							>
								<Var>
									{place.is_closed ? (
										<T id="components.list_view.0">{"Closed"}</T>
									) : (
										<T id="components.list_view.1">{"Open now"}</T>
									)}
								</Var>
							</span>
							<Var>
								{place.next_open_close && (
									<T id="components.list_view.2">
										<>
											<span className="text-neutral-400">·</span>
											<T id="components.list_view.8">
												<span className="text-sm text-neutral-400">
													until <Var>{place.next_open_close}</Var>
												</span>
											</T>
										</>
									</T>
								)}
							</Var>
							<Var>
								{place.type && (
									<>
										<span className="text-neutral-400">·</span>
										<span className="text-sm text-neutral-400 capitalize">
											{place.type}
										</span>
									</>
								)}
							</Var>
						</div>

						<div className="flex items-center gap-2 text-sm mb-2">
							<Var>
								{place.rating && <span>{place.rating.toFixed(1)}</span>}
							</Var>
							<Var>
								{place.reviews_count && (
									<T id="components.list_view.3">
										<span className="text-neutral-400">
											(<Var>{place.reviews_count}</Var> reviews)
										</span>
									</T>
								)}
							</Var>
							<Var>
								{place.price_level && (
									<>
										<span className="text-neutral-400">·</span>
										<span>{place.price_level}</span>
									</>
								)}
							</Var>
						</div>

						<Var>
							{place.description && (
								<p className="text-sm text-neutral-400 line-clamp-2 mb-3">
									{place.description}
								</p>
							)}
						</Var>

						<div className="flex gap-2">
							<Button
								variant="secondary"
								size="sm"
								className="bg-neutral-800 hover:bg-neutral-700 text-white"
								onClick={(e) => {
									e.stopPropagation();
									window.open(
										`https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}`,
										"_blank",
									);
								}}
							>
								Directions
							</Button>
							<Var>
								{place.website && (
									<T id="components.list_view.4">
										<Button
											variant="secondary"
											size="sm"
											className="bg-neutral-800 hover:bg-neutral-700 text-white"
											onClick={(e) => {
												e.stopPropagation();
												window.open(place.website, "_blank");
											}}
										>
											Website
										</Button>
									</T>
								)}
							</Var>
							<Var>
								{place.phone && (
									<T id="components.list_view.5">
										<Button
											variant="secondary"
											size="sm"
											className="bg-neutral-800 hover:bg-neutral-700 text-white"
											onClick={(e) => {
												e.stopPropagation();
												window.open(`tel:${place.phone}`, "_blank");
											}}
										>
											Call
										</Button>
									</T>
								)}
							</Var>
							<Var>
								{place.place_id && (
									<T id="components.list_view.6">
										<Button
											variant="secondary"
											size="sm"
											className="bg-neutral-800 hover:bg-neutral-700 text-white"
											onClick={(e) => {
												e.stopPropagation();
												window.open(
													`https://www.tripadvisor.com/${place.place_id}`,
													"_blank",
												);
											}}
										>
											TripAdvisor
										</Button>
									</T>
								)}
							</Var>
						</div>
					</div>
				</div>
			</div>
		</T>
	);
};

export default PlaceCard;
