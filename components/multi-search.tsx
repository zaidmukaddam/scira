// /components/multi-search.tsx
/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Search, ExternalLink, Calendar, X, ChevronLeft, ChevronRight, Check, ArrowUpRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import PlaceholderImage from './placeholder-image';
import { T, useGT, Num, useLocale } from 'gt-next';

// Types
type SearchImage = {
  url: string;
  description: string;
};

type SearchResult = {
  url: string;
  title: string;
  content: string;
  published_date?: string;
  author?: string;
};

type SearchQueryResult = {
  query: string;
  results: SearchResult[];
  images: SearchImage[];
};

type MultiSearchResponse = {
  searches: SearchQueryResult[];
};

type MultiSearchArgs = {
  queries: string[];
  maxResults: number[];
  topics: ('general' | 'news' | 'finance')[];
  searchDepth: ('basic' | 'advanced')[];
};

type QueryCompletion = {
  type: 'query_completion';
  data: {
    query: string;
    index: number;
    total: number;
    status: 'completed';
    resultsCount: number;
    imagesCount: number;
  };
};

// Constants
const PREVIEW_IMAGE_COUNT = 5;

// Utility function for favicon
const getFaviconUrl = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
  } catch {
    return null;
  }
};

// Source Card Component
const SourceCard: React.FC<{ result: SearchResult; onClick?: () => void }> = ({ result, onClick }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const faviconUrl = getFaviconUrl(result.url);
  const hostname = new URL(result.url).hostname.replace('www.', '');
  const locale = useLocale();

  return (
    <div
      className={cn(
        'group relative bg-white dark:bg-neutral-900',
        'border border-neutral-200 dark:border-neutral-800',
        'rounded-xl p-4 transition-all duration-200',
        'hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="relative w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
          {!imageLoaded && <div className="absolute inset-0 animate-pulse" />}
          {faviconUrl ? (
            <Image
              src={faviconUrl}
              alt=""
              width={24}
              height={24}
              className={cn('object-contain', !imageLoaded && 'opacity-0')}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                setImageLoaded(true);
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Globe className="w-5 h-5 text-neutral-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-neutral-900 dark:text-neutral-100 line-clamp-1 mb-1">
            {result.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="truncate">{hostname}</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">{result.content}</p>

      {/* Date */}
      {result.published_date && (
        <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <time className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {new Date(result.published_date).toLocaleDateString(locale, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </time>
        </div>
      )}
    </div>
  );
};

// Sources Sheet Component
const SourcesSheet: React.FC<{
  searches: SearchQueryResult[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ searches, open, onOpenChange }) => {
  const isMobile = useIsMobile();
  const totalResults = searches.reduce((sum, search) => sum + search.results.length, 0);

  const SheetWrapper = isMobile ? Drawer : Sheet;
  const SheetContentWrapper = isMobile ? DrawerContent : SheetContent;

  return (
    <SheetWrapper open={open} onOpenChange={onOpenChange}>
      <SheetContentWrapper className={cn(isMobile ? 'h-[85vh]' : 'w-[600px] sm:max-w-[600px]', 'p-0')}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <T>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">All Sources</h2>
              </T>
              <T>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                  <Num>{totalResults}</Num> results from <Num>{searches.length}</Num> searches
                </p>
              </T>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {searches.map((search, searchIndex) => (
                <div key={searchIndex}>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="secondary" className="rounded-full text-xs px-3 py-1">
                      <Search className="w-3 h-3 mr-1.5" />
                      {search.query}
                    </Badge>
                    <T>
                      <span className="text-xs text-neutral-500"><Num>{search.results.length}</Num> results</span>
                    </T>
                  </div>

                  <div className="space-y-3">
                    {search.results.map((result, resultIndex) => (
                      <a
                        key={resultIndex}
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <SourceCard result={result} />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContentWrapper>
    </SheetWrapper>
  );
};

// Image Gallery Component
const ImageGallery: React.FC<{ images: SearchImage[] }> = ({ images }) => {
  const [selectedImage, setSelectedImage] = React.useState(0);
  const [isOpen, setIsOpen] = React.useState(false);
  const [imageStates, setImageStates] = React.useState<Record<number, { loaded: boolean; error: boolean }>>({});
  const isMobile = useIsMobile();

  const displayImages = images.slice(0, PREVIEW_IMAGE_COUNT);
  const hasMore = images.length > PREVIEW_IMAGE_COUNT;

  const updateImageState = (index: number, state: { loaded?: boolean; error?: boolean }) => {
    setImageStates((prev) => ({
      ...prev,
      [index]: { ...prev[index], ...state },
    }));
  };

  const ImageViewer = isMobile ? Drawer : Dialog;
  const ImageViewerContent = isMobile ? DrawerContent : DialogContent;

  return (
    <>
      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-2 gap-2 h-[140px] md:h-[160px]">
        {displayImages.map((image, index) => {
          const state = imageStates[index] || { loaded: false, error: false };
          const isLast = index === displayImages.length - 1;

          return (
            <button
              key={index}
              onClick={() => {
                setSelectedImage(index);
                setIsOpen(true);
              }}
              className={cn(
                'relative rounded-lg overflow-hidden',
                'bg-neutral-100 dark:bg-neutral-800',
                'transition-all duration-200 hover:scale-[1.02]',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                index === 0 ? 'md:col-span-2 md:row-span-2' : '',
              )}
            >
              {!state.loaded && !state.error && <div className="absolute inset-0 animate-pulse" />}

              {state.error ? (
                <PlaceholderImage variant="compact" />
              ) : (
                <Image
                  src={image.url}
                  alt={image.description || ''}
                  fill
                  className={cn('object-cover', !state.loaded && 'opacity-0')}
                  onLoad={() => updateImageState(index, { loaded: true })}
                  onError={() => updateImageState(index, { error: true, loaded: true })}
                />
              )}

              {/* Overlay for last image if there are more */}
              {isLast && hasMore && !state.error && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <T>
                    <span className="text-white text-sm font-medium">+<Num>{images.length - displayImages.length}</Num> more</span>
                  </T>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Image Viewer */}
      <ImageViewer open={isOpen} onOpenChange={setIsOpen}>
        <ImageViewerContent
          className={cn(
            isMobile ? 'h-[90vh]' : 'w-full! max-w-2xl! h-3/5',
            'p-0 overflow-hidden',
            !isMobile && 'border border-neutral-200 dark:border-neutral-800 shadow-lg',
          )}
        >
          <div className="relative w-full h-full bg-white dark:bg-neutral-900">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className="rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                >
                  <T>
                    <Num>{selectedImage + 1}</Num> of <Num>{images.length}</Num>
                  </T>
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Image Display */}
            <div className="absolute inset-0 flex items-center justify-center p-4 pt-16 pb-16">
              <AnimatePresence mode="wait">
                {imageStates[selectedImage]?.error ? (
                  <motion.div
                    key={`error-${selectedImage}`}
                    className="w-full max-w-md h-64"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PlaceholderImage />
                  </motion.div>
                ) : (
                  <motion.div
                    key={selectedImage}
                    className="relative w-full h-full"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Image
                      src={images[selectedImage].url}
                      alt={images[selectedImage].description || ''}
                      fill
                      className="object-contain rounded-lg"
                      onError={() => updateImageState(selectedImage, { error: true, loaded: true })}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-lg',
                'bg-white/90 dark:bg-neutral-800/90',
                'hover:bg-neutral-100 dark:hover:bg-neutral-700',
                'border border-neutral-200 dark:border-neutral-700',
                'shadow-sm',
              )}
              onClick={() => setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-lg',
                'bg-white/90 dark:bg-neutral-800/90',
                'hover:bg-neutral-100 dark:hover:bg-neutral-700',
                'border border-neutral-200 dark:border-neutral-700',
                'shadow-sm',
              )}
              onClick={() => setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            {/* Description */}
            {images[selectedImage].description && !imageStates[selectedImage]?.error && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border-t border-neutral-200 dark:border-neutral-800">
                <p className="text-sm text-neutral-600 dark:text-neutral-400 text-center max-w-3xl mx-auto">
                  {images[selectedImage].description}
                </p>
              </div>
            )}
          </div>
        </ImageViewerContent>
      </ImageViewer>
    </>
  );
};

// Loading State Component
const LoadingState: React.FC<{
  queries: string[];
  annotations: QueryCompletion[];
}> = ({ queries, annotations }) => {
  const completedCount = annotations.length;
  const totalResults = annotations.reduce((sum, a) => sum + a.data.resultsCount, 0);
  const loadingQueryTagsRef = React.useRef<HTMLDivElement>(null);
  const loadingSkeletonRef = React.useRef<HTMLDivElement>(null);

  // Add horizontal scroll support with mouse wheel
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Sources Accordion */}
      <Accordion type="single" collapsible defaultValue="sources" className="w-full">
        <AccordionItem value="sources" className="border-none">
          <AccordionTrigger
            className={cn(
              'py-3 px-4 rounded-xl hover:no-underline',
              'bg-white dark:bg-neutral-900',
              'border border-neutral-200 dark:border-neutral-800',
              'data-[state=open]:rounded-b-none',
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800">
                  <Globe className="h-3.5 w-3.5 text-neutral-500" />
                </div>
                <T>
                  <h2 className="font-medium text-sm">Sources</h2>
                </T>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full text-xs px-2.5 py-0.5">
                  <Num>{totalResults || 0}</Num>
                </Badge>
                {totalResults > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <T>View all</T>
                    <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="p-0">
            <div
              className={cn(
                'p-2 space-y-3',
                'bg-white dark:bg-neutral-900',
                'border-x border-b border-neutral-200 dark:border-neutral-800',
                'rounded-b-xl',
              )}
            >
              {/* Query badges */}
              <div 
                ref={loadingQueryTagsRef}
                className="flex gap-2 overflow-x-auto no-scrollbar"
                onWheel={handleWheelScroll}
              >
                {queries.map((query, i) => {
                  const isCompleted = annotations.some((a) => a.data.query === query);
                  return (
                    <Badge
                      key={i}
                      variant="outline"
                      className={cn(
                        'rounded-full text-xs px-3 py-1 shrink-0 transition-all',
                        isCompleted
                          ? 'bg-neutral-100 dark:bg-neutral-800'
                          : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-400',
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-3 h-3 mr-1.5" />
                      ) : (
                        <div className="w-3 h-3 mr-1.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      )}
                      {query}
                    </Badge>
                  );
                })}
              </div>

              {/* Skeleton cards */}
              <div 
                ref={loadingSkeletonRef}
                className="flex gap-3 overflow-x-auto no-scrollbar pb-1"
                onWheel={handleWheelScroll}
              >
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-[320px] bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
                      <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Images skeleton */}
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-2 gap-2 h-[140px] md:h-[160px]">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={cn(
                'rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse',
                i === 0 ? 'md:col-span-2 md:row-span-2' : '',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Main Component
const MultiSearch: React.FC<{
  result: MultiSearchResponse | null;
  args: MultiSearchArgs;
  annotations?: QueryCompletion[];
}> = ({ result, args, annotations = [] }) => {
  const [sourcesOpen, setSourcesOpen] = React.useState(false);
  const queryTagsRef = React.useRef<HTMLDivElement>(null);
  const previewResultsRef = React.useRef<HTMLDivElement>(null);

  // Add horizontal scroll support with mouse wheel
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  if (!result) {
    return <LoadingState queries={args.queries} annotations={annotations} />;
  }

  const allImages = result.searches.flatMap((search) => search.images);
  const allResults = result.searches.flatMap((search) => search.results);
  const totalResults = allResults.length;

  // Show all results in horizontal scroll
  const previewResults = allResults;

  return (
    <div className="w-full space-y-4">
      {/* Sources Accordion */}
      <Accordion type="single" collapsible defaultValue="sources" className="w-full">
        <AccordionItem value="sources" className="border-none">
          <AccordionTrigger
            className={cn(
              'py-3 px-4 rounded-xl hover:no-underline',
              'bg-white dark:bg-neutral-900',
              'border border-neutral-200 dark:border-neutral-800',
              'data-[state=open]:rounded-b-none',
            )}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800">
                  <Globe className="h-3.5 w-3.5 text-neutral-500" />
                </div>
                <T>
                  <h2 className="font-medium text-sm">Sources</h2>
                </T>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full text-xs px-2.5 py-0.5">
                  <Num>{totalResults}</Num>
                </Badge>
                {totalResults > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSourcesOpen(true);
                    }}
                  >
                    <T>View all</T>
                    <ArrowUpRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="p-0">
            <div
              className={cn(
                'p-3 space-y-3',
                'bg-white dark:bg-neutral-900',
                'border-x border-b border-neutral-200 dark:border-neutral-800',
                'rounded-b-xl',
              )}
            >
              {/* Query tags */}
              <div 
                ref={queryTagsRef}
                className="flex gap-2 overflow-x-auto no-scrollbar"
                onWheel={handleWheelScroll}
              >
                {result.searches.map((search, i) => (
                  <Badge key={i} variant="outline" className="rounded-full text-xs px-3 py-1 shrink-0">
                    <Search className="w-3 h-3 mr-1.5" />
                    {search.query}
                  </Badge>
                ))}
              </div>

              {/* Preview results */}
              <div 
                ref={previewResultsRef}
                className="flex gap-3 overflow-x-auto no-scrollbar pb-1"
                onWheel={handleWheelScroll}
              >
                {previewResults.map((result, i) => (
                  <a
                    key={i}
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block flex-shrink-0 w-[320px]"
                  >
                    <SourceCard result={result} />
                  </a>
                ))}
              </div>


            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Images */}
      {allImages.length > 0 && (
        <div>
          <ImageGallery images={allImages} />
        </div>
      )}

      {/* Sources Sheet */}
      <SourcesSheet searches={result.searches} open={sourcesOpen} onOpenChange={setSourcesOpen} />
    </div>
  );
};

export default MultiSearch;
