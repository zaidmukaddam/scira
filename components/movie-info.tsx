/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Film, Tv, Star, Calendar, Clock, Users } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import Image from 'next/image';

interface MediaDetails {
    id: number;
    media_type: 'movie' | 'tv';
    title?: string;
    name?: string;
    overview: string;
    poster_path: string | null;
    backdrop_path: string | null;
    vote_average: number;
    vote_count: number;
    release_date?: string;
    first_air_date?: string;
    runtime?: number;
    episode_run_time?: number[];
    genres: Array<{ id: number; name: string }>;
    credits: {
        cast: Array<{
            id: number;
            name: string;
            character: string;
            profile_path: string | null;
        }>;
    };
    origin_country?: string[];
    original_language: string;
    production_companies?: Array<{
        id: number;
        name: string;
        logo_path: string | null;
    }>;
}

interface TMDBResultProps {
    result: {
        result: MediaDetails | null;
    };
}

const TMDBResult = ({ result }: TMDBResultProps) => {
    const [showDetails, setShowDetails] = useState(false);
    const isMobile = useMediaQuery("(max-width: 768px)");

    if (!result.result) return null;
    const media = result.result;

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatRuntime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const DetailContent = () => (
        <div className="flex flex-col max-h-[80vh] bg-black">
            {/* Hero Section with Backdrop */}
            <div className="relative w-full aspect-[16/9] sm:aspect-[21/9]">
                {media.backdrop_path ? (
                    <>
                        <Image
                            src={media.backdrop_path}
                            alt={media.title || media.name || ''}
                            fill
                            className="object-cover"
                            priority
                            unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    </>
                ) : (
                    <div className="w-full h-full bg-neutral-900" />
                )}

                {/* Content Box */}
                <div className="absolute bottom-0 left-0 right-0">
                    <div className="relative p-4 sm:p-6 flex flex-col sm:flex-row gap-6 items-end">
                        {/* Poster */}
                        <div className="relative w-[120px] sm:w-[160px] aspect-[2/3] rounded-lg overflow-hidden shadow-2xl hidden sm:block">
                            {media.poster_path ? (
                                <Image
                                    src={media.poster_path}
                                    alt={media.title || media.name || ''}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                                    {media.media_type === 'movie' ? (
                                        <Film className="w-12 h-12 text-neutral-400" />
                                    ) : (
                                        <Tv className="w-12 h-12 text-neutral-400" />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Title and Metadata */}
                        <div className="flex-1 text-white">
                            <h2 className="text-3xl sm:text-5xl font-bold mb-4 text-white">
                                {media.title || media.name}
                            </h2>
                            <div className="flex flex-wrap items-center gap-4 text-sm sm:text-base">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-yellow-500 text-black font-medium">
                                    <Star className="w-4 h-4 fill-current" />
                                    <span>{media.vote_average.toFixed(1)}</span>
                                </div>
                                {(media.release_date || media.first_air_date) && (
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4" />
                                        <span>{formatDate(media.release_date || media.first_air_date || '')}</span>
                                    </div>
                                )}
                                {(media.runtime || media.episode_run_time?.[0]) && (
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-4 h-4" />
                                        <span>{formatRuntime(media.runtime || media.episode_run_time?.[0] || 0)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 overflow-y-auto bg-black">
                <div className="relative p-4 sm:p-6 space-y-8">
                    {/* Genres */}
                    <div className="flex flex-wrap gap-2">
                        {media.genres.map(genre => (
                            <span
                                key={genre.id}
                                className="px-3 py-1 text-sm rounded-full border border-neutral-800 
                                         bg-neutral-900/50 text-neutral-200
                                         hover:bg-neutral-800 transition-colors"
                            >
                                {genre.name}
                            </span>
                        ))}
                    </div>

                    {/* Overview */}
                    <div className="space-y-3 max-w-3xl">
                        <h3 className="text-lg font-semibold text-white">Overview</h3>
                        <p className="text-neutral-300 text-base sm:text-lg leading-relaxed">
                            {media.overview}
                        </p>
                    </div>

                    {/* Cast Section */}
                    {media.credits?.cast && media.credits.cast.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white">Cast</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                                {media.credits.cast.slice(0, media.credits.cast.length).map(person => (
                                    <div
                                        key={person.id}
                                        className="group relative bg-neutral-900 rounded-lg overflow-hidden
                                                 border border-neutral-800 hover:border-neutral-700 
                                                 transition-all duration-300"
                                    >
                                        <div className="aspect-[2/3] relative overflow-hidden">
                                            {person.profile_path ? (
                                                <>
                                                    <Image
                                                        src={person.profile_path}
                                                        alt={person.name}
                                                        fill
                                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </>
                                            ) : (
                                                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                                                    <Users className="w-8 h-8 text-neutral-700" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-2">
                                            <p className="font-medium text-white truncate text-sm">
                                                {person.name}
                                            </p>
                                            <p className="text-xs text-neutral-400 truncate">
                                                {person.character}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="my-4">
            <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative group rounded-xl overflow-hidden cursor-pointer bg-gradient-to-br from-neutral-100 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 border border-neutral-200/50 dark:border-neutral-800/50 backdrop-blur-sm"
                onClick={() => setShowDetails(true)}
            >
                <div className="flex flex-col sm:flex-row gap-4 p-4 sm:p-5">
                    <div className="relative w-[140px] sm:w-[160px] mx-auto sm:mx-0 aspect-[2/3] rounded-lg overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                        {media.poster_path ? (
                            <Image
                                src={media.poster_path}
                                alt={media.title || media.name || ''}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                                {media.media_type === 'movie' ? (
                                    <Film className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
                                ) : (
                                    <Tv className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
                                )}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-3">
                        <div>
                            <h3 className="text-xl sm:text-2xl font-bold text-black dark:text-white mb-2 leading-tight">
                                {media.title || media.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                <span className="px-2.5 py-1 rounded-md bg-primary/10 text-primary capitalize">
                                    {media.media_type}
                                </span>
                                <div className="flex items-center gap-1.5 text-yellow-500">
                                    <Star className="w-4 h-4 fill-current" />
                                    <span className="font-medium">{media.vote_average.toFixed(1)}</span>
                                </div>
                                {(media.release_date || media.first_air_date) && (
                                    <span className="text-black/60 dark:text-white/60">
                                        {formatDate(media.release_date || media.first_air_date || '')}
                                    </span>
                                )}
                            </div>
                        </div>

                        <p className="text-sm sm:text-base text-black/70 dark:text-white/70 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                            {media.overview}
                        </p>

                        {media.credits?.cast && (
                            <div className="pt-2">
                                <div className="flex items-center gap-2 text-xs sm:text-sm text-black/60 dark:text-white/60">
                                    <Users className="w-4 h-4" />
                                    <p className="truncate">
                                        <span className="font-medium">Cast: </span>
                                        {media.credits.cast.slice(0, 3).map(person => person.name).join(', ')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {isMobile ? (
                <Drawer open={showDetails} onOpenChange={setShowDetails}>
                    <DrawerContent className="h-[85vh] p-0 font-sans">
                        <DetailContent />
                    </DrawerContent>
                </Drawer>
            ) : (
                <Dialog open={showDetails} onOpenChange={setShowDetails}>
                    <DialogContent className="max-w-3xl p-0 overflow-hidden font-sans">
                        <DetailContent />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default TMDBResult;