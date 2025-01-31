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
        <div className="flex flex-col max-h-[80vh] bg-white dark:bg-neutral-950">
            <div className="relative w-full aspect-[16/9] sm:aspect-[21/9]">
                {media.backdrop_path ? (
                    <Image
                        src={media.backdrop_path}
                        alt={media.title || media.name || ''}
                        fill
                        className="object-cover opacity-40 sm:opacity-60"
                        priority
                        unoptimized
                    />
                ) : (
                    <div className="w-full h-full bg-neutral-200 dark:bg-neutral-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/90 to-white/70 dark:from-neutral-950 dark:via-neutral-950/90 dark:to-neutral-950/70" />
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-6">
                    <h2 className="text-xl sm:text-3xl font-bold text-black dark:text-white mb-1.5 sm:mb-2">
                        {media.title || media.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-black/90 dark:text-white/90">
                        <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-400" />
                            <span>{media.vote_average.toFixed(1)}</span>
                        </div>
                        {(media.release_date || media.first_air_date) && (
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(media.release_date || media.first_air_date || '')}</span>
                            </div>
                        )}
                        {(media.runtime || media.episode_run_time?.[0]) && (
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>{formatRuntime(media.runtime || media.episode_run_time?.[0] || 0)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-4 sm:p-6 space-y-6">
                    <div className="flex flex-wrap gap-2">
                        {media.genres.map(genre => (
                            <span
                                key={genre.id}
                                className="px-3 py-1 text-sm rounded-full bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white"
                            >
                                {genre.name}
                            </span>
                        ))}
                    </div>

                    <p className="text-black/80 dark:text-white/80 text-base sm:text-lg leading-relaxed">
                        {media.overview}
                    </p>

                    {media.credits?.cast && media.credits.cast.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-black/90 dark:text-white/90">Cast</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {media.credits.cast.slice(0, media.credits.cast.length).map(person => (
                                    <div
                                        key={person.id}
                                        className="bg-neutral-100 dark:bg-neutral-900 rounded-lg p-2 space-y-2"
                                    >
                                        {person.profile_path ? (
                                            <Image
                                                src={person.profile_path}
                                                alt={person.name}
                                                width={185}
                                                height={185}
                                                className="w-full aspect-square rounded-lg object-cover"
                                            />
                                        ) : (
                                            <div className="w-full aspect-square rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                                                <Users className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-black dark:text-white font-medium truncate">{person.name}</p>
                                            <p className="text-black/60 dark:text-white/60 text-sm truncate">{person.character}</p>
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
                className="bg-neutral-100 dark:bg-neutral-900 rounded-xl overflow-hidden cursor-pointer"
                onClick={() => setShowDetails(true)}
            >
                <div className="flex flex-col sm:flex-row gap-3 p-3 sm:p-4">
                    <div className="w-[120px] sm:w-40 mx-auto sm:mx-0 aspect-[2/3] relative rounded-lg overflow-hidden">
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
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-black dark:text-white mb-1.5">
                                {media.title || media.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-black/80 dark:text-white/80">
                                <span className="capitalize">{media.media_type}</span>
                                <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-400" />
                                    <span>{media.vote_average.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-sm sm:text-base text-black/70 dark:text-white/70 line-clamp-2 sm:line-clamp-3">
                            {media.overview}
                        </p>

                        {media.credits?.cast && (
                            <p className="text-xs sm:text-sm text-black/60 dark:text-white/60">
                                <span className="font-medium">Cast: </span>
                                {media.credits.cast.slice(0, 3).map(person => person.name).join(', ')}
                            </p>
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
