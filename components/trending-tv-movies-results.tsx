/* eslint-disable @next/next/no-img-element */
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Film, Tv, Star, Calendar, ChevronRight, X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

interface TrendingItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  popularity: number;
}

interface TrendingResultsProps {
  result: {
    results: TrendingItem[];
  };
  type: 'movie' | 'tv';
}

const TrendingResults = ({ result, type }: TrendingResultsProps) => {
  const [selectedItem, setSelectedItem] = useState<TrendingItem | null>(null);
  const [showAll, setShowAll] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const displayedResults = useMemo(() => {
    return showAll ? result.results : result.results.slice(0, isMobile ? 4 : 10);
  }, [result.results, showAll, isMobile]);

  const genreMap: Record<number, string> = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Sci-Fi',
    53: 'Thriller',
    10752: 'War',
    37: 'Western',
    10759: 'Action & Adventure',
    10765: 'Sci-Fi & Fantasy',
    10768: 'War & Politics',
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  };

  const DetailView = () => {
    if (!selectedItem) return null;

    const content = (
      <div className="flex flex-col">
        <div className="relative aspect-16/9 sm:aspect-21/9 w-full">
          {selectedItem.backdrop_path ? (
            <>
              <img
                src={selectedItem.backdrop_path}
                alt={selectedItem.title || selectedItem.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-linear-to-br from-neutral-900 to-neutral-800" />
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <h2 className="text-xl sm:text-3xl font-bold text-white line-clamp-2">
              {selectedItem.title || selectedItem.name}
            </h2>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5 text-yellow-400">
                <Star className="w-4 h-4 fill-current" />
                <span className="font-medium">{selectedItem.vote_average.toFixed(1)}</span>
              </div>
              {(selectedItem.release_date || selectedItem.first_air_date) && (
                <div className="flex items-center gap-1.5 text-neutral-300">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(selectedItem.release_date || selectedItem.first_air_date || '')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex flex-wrap gap-2">
            {selectedItem.genre_ids.map((genreId) => (
              <span
                key={genreId}
                className="px-3 py-1 text-xs font-medium rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200"
              >
                {genreMap[genreId]}
              </span>
            ))}
          </div>

          <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">{selectedItem.overview}</p>
        </div>
      </div>
    );

    if (isMobile) {
      return (
        <Drawer open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
          <DrawerContent className="max-h-[85vh] overflow-y-auto">
            {content}
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-3xl! p-0 overflow-hidden">{content}</DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="w-full my-4 sm:my-6">
      <header className="flex items-center justify-between mb-4 sm:mb-6 px-4 sm:px-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
            {type === 'movie' ? (
              <Film className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-900 dark:text-neutral-100" />
            ) : (
              <Tv className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-900 dark:text-neutral-100" />
            )}
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">
              Trending {type === 'movie' ? 'Movies' : 'Shows'}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">Top picks for today</p>
          </div>
        </div>
        <button
          onClick={() => setShowAll(!showAll)}
          className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          {showAll ? 'Show Less' : 'View All'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </header>

      <div
        className={`grid ${
          isMobile
            ? 'grid-cols-2 gap-2'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4'
        } px-4 sm:px-0`}
      >
        {displayedResults.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="group cursor-pointer"
            onClick={() => setSelectedItem(item)}
          >
            <div className="relative aspect-2/3 rounded-lg sm:rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
              {item.poster_path ? (
                <img
                  src={item.poster_path}
                  alt={item.title || item.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {type === 'movie' ? (
                    <Film className="w-8 h-8 text-neutral-400" />
                  ) : (
                    <Tv className="w-8 h-8 text-neutral-400" />
                  )}
                </div>
              )}
              <div
                className="absolute inset-0 bg-linear-to-t
                  from-black/90 via-black/40 to-transparent 
                  opacity-0 group-hover:opacity-100 
                  transition-opacity duration-300
                  flex flex-col justify-end p-3 sm:p-4"
              >
                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <div className="flex items-center gap-1.5 text-yellow-400 mb-1.5">
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                    <span className="text-xs sm:text-sm font-medium text-white">
                      {item.vote_average.toFixed(1)}
                    </span>
                  </div>
                  <h3 className="text-white text-sm sm:text-base font-medium line-clamp-2 mb-1">
                    {item.title || item.name}
                  </h3>
                  <p className="text-neutral-300 text-xs sm:text-sm">
                    {formatDate(item.release_date || item.first_air_date || '')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {isMobile && showAll && (
        <Drawer open={showAll} onOpenChange={() => setShowAll(false)}>
          <DrawerContent className="bg-white dark:bg-neutral-900">
            <div className="flex flex-col h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h3 className="text-lg font-semibold">
                  All Trending {type === 'movie' ? 'Movies' : 'Shows'}
                </h3>
                <button
                  onClick={() => setShowAll(false)}
                  className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2 p-4">
                  {result.results.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="group cursor-pointer"
                      onClick={() => {
                        setSelectedItem(item);
                        setShowAll(false);
                      }}
                    >
                      <div className="relative aspect-2/3 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                        {item.poster_path ? (
                          <img
                            src={item.poster_path}
                            alt={item.title || item.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {type === 'movie' ? (
                              <Film className="w-8 h-8 text-neutral-400" />
                            ) : (
                              <Tv className="w-8 h-8 text-neutral-400" />
                            )}
                          </div>
                        )}
                        <div
                          className="absolute inset-0 bg-linear-to-t
                           from-black/90 via-black/40 to-transparent
                           opacity-0 group-hover:opacity-100
                           transition-opacity duration-300
                           flex flex-col justify-end p-3"
                        >
                          <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <div className="flex items-center gap-1.5 text-yellow-400 mb-1.5">
                              <Star className="w-3 h-3 fill-current" />
                              <span className="text-xs font-medium text-white">
                                {item.vote_average.toFixed(1)}
                              </span>
                            </div>
                            <h3 className="text-white text-sm font-medium line-clamp-2 mb-1">
                              {item.title || item.name}
                            </h3>
                            <p className="text-neutral-300 text-xs">
                              {formatDate(item.release_date || item.first_air_date || '')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      <DetailView />
    </div>
  );
};

export default TrendingResults;