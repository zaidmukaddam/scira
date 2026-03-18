// /components/multi-search.tsx
/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { CustomUIDataTypes, DataQueryCompletionPart } from '@/lib/types';
import type { DataUIPart } from 'ai';
import { Sparkles as SparklesIcon } from 'lucide-react';

// Custom Premium Icons
const Icons = {
  Globe: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  ArrowUpRight: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 17L17 7M17 7H7M17 7v10" />
    </svg>
  ),
  ChevronLeft: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  ChevronRight: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  Close: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  Check: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  Sparkle: ({ className }: { className?: string }) => <SparklesIcon className={className} />,
  Layers: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
};

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

type Topic = 'general' | 'news';

type MultiSearchArgs = {
  queries?: (string | undefined)[] | string | null;
  maxResults?: (number | undefined)[] | number | null;
  topics?: (Topic | undefined)[] | Topic | null;
  quality?: (('default' | 'best') | undefined)[] | ('default' | 'best') | null;
};

type NormalizedMultiSearchArgs = {
  queries: string[];
  maxResults: number[];
  topics: Topic[];
  quality: ('default' | 'best')[];
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
const SourceCard: React.FC<{ result: SearchResult; onClick?: () => void }> = React.memo(({ result, onClick }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const faviconUrl = React.useMemo(() => getFaviconUrl(result.url), [result.url]);
  const hostname = React.useMemo(() => new URL(result.url).hostname.replace('www.', ''), [result.url]);

  return (
    <div
      className={cn(
        'group relative',
        'px-3.5 py-2 transition-colors',
        'hover:bg-muted/10',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5">
        {/* Favicon */}
        <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0 rounded-sm overflow-hidden">
          {faviconUrl ? (
            <img
              src={faviconUrl}
              alt=""
              width={14}
              height={14}
              className={cn('object-contain', !imageLoaded && 'opacity-0')}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                setImageLoaded(true);
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Icons.Globe className="w-3 h-3 text-muted-foreground/50" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-medium text-foreground line-clamp-1 flex-1">{result.title}</h3>
            <Icons.ArrowUpRight className="w-2.5 h-2.5 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground/60 truncate">{hostname}</span>
            {result.author && (
              <>
                <span className="text-[10px] text-muted-foreground/30">·</span>
                <span className="text-[10px] text-muted-foreground/60 truncate">{result.author}</span>
              </>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/50 line-clamp-1 mt-0.5 leading-relaxed">{result.content}</p>
        </div>
      </div>
    </div>
  );
});

SourceCard.displayName = 'SourceCard';

// Sources Sheet Component - Minimal Design
const SourcesSheet: React.FC<{
  searches: SearchQueryResult[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = React.memo(({ searches, open, onOpenChange }) => {
  const isMobile = useIsMobile();
  const totalResults = React.useMemo(
    () => searches.reduce((sum, search) => sum + search.results.length, 0),
    [searches]
  );

  const SheetWrapper = isMobile ? Drawer : Sheet;
  const SheetContentWrapper = isMobile ? DrawerContent : SheetContent;

  return (
    <SheetWrapper open={open} onOpenChange={onOpenChange}>
      <SheetContentWrapper className={cn(isMobile ? 'h-[85vh]' : 'w-[580px] sm:max-w-[580px]', 'p-0')}>
        <div className="flex flex-col h-full bg-background">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border/40">
            <div className="flex items-center gap-2 mb-0.5">
              <Icons.Layers className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">Sources</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {totalResults} from {searches.length} {searches.length === 1 ? 'query' : 'queries'}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {searches.map((search, searchIndex) => (
              <div key={searchIndex} className="border-b border-border/30 last:border-0">
                <div className="px-5 py-2 bg-muted/20 border-b border-border/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">{search.query}</span>
                    <span className="text-[10px] text-muted-foreground/60 tabular-nums">{search.results.length}</span>
                  </div>
                </div>

                <div className="divide-y divide-border/20">
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
      </SheetContentWrapper>
    </SheetWrapper>
  );
});

SourcesSheet.displayName = 'SourcesSheet';

// Image Gallery Component
const ImageGallery = React.memo(({ images }: { images: SearchImage[] }) => {
  const [isClient, setIsClient] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState(0);
  const [isOpen, setIsOpen] = React.useState(false);
  const [failedImages, setFailedImages] = React.useState<Set<string>>(new Set());
  const [imageTransition, setImageTransition] = React.useState<'next' | 'prev' | null>(null);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const validImages = React.useMemo(() => images.filter((img) => !failedImages.has(img.url)), [images, failedImages]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setImageTransition('prev');
        setSelectedImage((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
        setTimeout(() => setImageTransition(null), 300);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setImageTransition('next');
        setSelectedImage((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
        setTimeout(() => setImageTransition(null), 300);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, validImages.length]);

  const displayImages = React.useMemo(() => validImages.slice(0, PREVIEW_IMAGE_COUNT), [validImages]);
  const hasMore = validImages.length > PREVIEW_IMAGE_COUNT;

  const ImageViewer = React.useMemo(() => (isMobile ? Drawer : Dialog), [isMobile]);
  const ImageViewerContent = React.useMemo(() => (isMobile ? DrawerContent : DialogContent), [isMobile]);

  const handleImageClick = React.useCallback((index: number) => {
    setSelectedImage(index);
    setIsOpen(true);
  }, []);

  const handleClose = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  const handlePrevious = React.useCallback(() => {
    setImageTransition('prev');
    setSelectedImage((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
    setTimeout(() => setImageTransition(null), 300);
  }, [validImages.length]);

  const handleNext = React.useCallback(() => {
    setImageTransition('next');
    setSelectedImage((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
    setTimeout(() => setImageTransition(null), 300);
  }, [validImages.length]);

  const handleImageError = React.useCallback((imageUrl: string) => {
    setFailedImages((prev) => new Set(prev).add(imageUrl));
  }, []);

  const currentImage = React.useMemo(() => validImages[selectedImage], [validImages, selectedImage]);

  const gridItemClassName = React.useCallback(
    () =>
      cn(
        'relative rounded-lg overflow-hidden shrink-0',
        'bg-muted/20 border border-border/30',
        'transition-all duration-150 hover:border-border/60',
        'focus:outline-none focus:ring-1 focus:ring-ring',
        'cursor-pointer',
        'w-[200px] h-[112px]',
      ),
    [],
  );

  const shouldShowOverlay = React.useCallback(
    (index: number) => index === displayImages.length - 1 && hasMore,
    [displayImages.length, hasMore],
  );

  const navigationButtonClassName = React.useMemo(
    () =>
      cn(
        'h-8 w-8 rounded-full',
        'flex items-center justify-center',
        'bg-background/80',
        'hover:bg-background',
        'border border-border/40',
        'backdrop-blur-xl',
        'transition-all duration-200',
      ),
    [],
  );

  const viewerContentClassName = React.useMemo(
    () =>
      cn(
        isMobile ? 'h-[92vh]' : 'w-full! max-w-4xl! h-[85vh]',
        'p-0 overflow-hidden',
        !isMobile && 'border border-border shadow-2xl',
      ),
    [isMobile],
  );

  if (!isClient) {
    return <div className="space-y-4" />;
  }

  return (
    <div className="space-y-3">
      {/* Image Gallery - Horizontal Scroll */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 rounded-md">
        {displayImages.map((image, index) => (
          <button key={`${image.url}-${index}`} onClick={() => handleImageClick(index)} className={gridItemClassName()}>
            <img
              src={image.url}
              alt={image.description || ''}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => handleImageError(image.url)}
            />

            {shouldShowOverlay(index) && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  +{validImages.length - displayImages.length}
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Image Viewer */}
      <ImageViewer open={isOpen} onOpenChange={setIsOpen}>
        <ImageViewerContent className={viewerContentClassName}>
          <div className="relative w-full h-full bg-background">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-50 px-4 py-2.5 bg-background/95 backdrop-blur-sm border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">Images</span>
                  <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                    {selectedImage + 1} / {validImages.length}
                  </span>
                  {currentImage?.description && !isMobile && (
                    <span className="text-[10px] text-muted-foreground/40 max-w-md truncate">{currentImage.description}</span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md hover:bg-muted/30"
                  onClick={handleClose}
                >
                  <Icons.Close className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Image Display with Transition */}
            <div className="absolute inset-0 flex items-center justify-center px-4 pt-16 pb-28">
              <div className="relative w-full h-full overflow-hidden">
                {currentImage && (
                  <img
                    key={currentImage.url}
                    src={currentImage.url}
                    alt={currentImage.description || ''}
                    className={cn(
                      'w-full h-full object-contain rounded-lg transition-all duration-300',
                      imageTransition === 'next' && 'opacity-0 scale-95',
                      imageTransition === 'prev' && 'opacity-0 scale-95',
                      !imageTransition && 'opacity-100 scale-100',
                    )}
                    onError={() => handleImageError(currentImage.url)}
                  />
                )}
              </div>
            </div>

            {/* Navigation Buttons */}
            {validImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className={cn('absolute left-6 top-1/2 -translate-y-1/2 z-40', navigationButtonClassName)}
                  aria-label="Previous image"
                >
                  <Icons.ChevronLeft className="h-4.5 w-4.5 text-foreground/90" />
                </button>
                <button
                  onClick={handleNext}
                  className={cn('absolute right-6 top-1/2 -translate-y-1/2 z-40', navigationButtonClassName)}
                  aria-label="Next image"
                >
                  <Icons.ChevronRight className="h-4.5 w-4.5 text-foreground/90" />
                </button>
              </>
            )}

            {/* Thumbnail Strip */}
            {validImages.length > 1 && (
              <div className="absolute bottom-0 left-0 right-0 z-50 px-4 py-3 bg-background/95 backdrop-blur-sm border-t border-border/40">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar justify-center pb-1">
                  {validImages.map((img, index) => (
                    <button
                      key={img.url}
                      onClick={() => {
                        setImageTransition(index > selectedImage ? 'next' : 'prev');
                        setSelectedImage(index);
                        setTimeout(() => setImageTransition(null), 300);
                      }}
                      className={cn(
                        'relative shrink-0 w-14 h-10 rounded-md overflow-hidden',
                        'border transition-all duration-200',
                        selectedImage === index
                          ? 'border-foreground/60 ring-1 ring-foreground/10'
                          : 'border-border/40 opacity-50 hover:opacity-100',
                      )}
                      aria-label={`View image ${index + 1}`}
                    >
                      <img
                        src={img.url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </button>
                  ))}
                </div>
                {currentImage?.description && isMobile && (
                  <p className="text-[10px] text-muted-foreground/60 text-center mt-2 line-clamp-2">
                    {currentImage.description}
                  </p>
                )}
              </div>
            )}

            {/* Single image description */}
            {validImages.length === 1 && currentImage?.description && (
              <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-background/95 backdrop-blur-sm border-t border-border/40">
                <p className="text-[10px] text-muted-foreground/60 text-center max-w-3xl mx-auto">
                  {currentImage.description}
                </p>
              </div>
            )}
          </div>
        </ImageViewerContent>
      </ImageViewer>
    </div>
  );
});

ImageGallery.displayName = 'ImageGallery';

// Loading State Component - Minimal Design
const LoadingState: React.FC<{
  queries: string[];
  annotations: DataUIPart<CustomUIDataTypes>[];
  args: MultiSearchArgs;
}> = React.memo(({ queries, annotations, args }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const totalResults = React.useMemo(
    () => annotations.reduce((sum, a) => sum + a.data.resultsCount, 0),
    [annotations]
  );
  const loadingQueryTagsRef = React.useRef<HTMLDivElement>(null);

  // Add horizontal scroll support with mouse wheel
  const handleWheelScroll = React.useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (e.deltaY === 0) return;
    const canScrollHorizontally = container.scrollWidth > container.clientWidth;
    if (!canScrollHorizontally) return;
    e.stopPropagation();
    const isAtLeftEdge = container.scrollLeft <= 1;
    const isAtRightEdge = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;
    if (!isAtLeftEdge && !isAtRightEdge) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtLeftEdge && e.deltaY > 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtRightEdge && e.deltaY < 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  }, []);

  return (
    <div className="w-full space-y-3">
      {/* Sources Section */}
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card/30">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icons.Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">Sources</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">
              {totalResults || '0'}
            </span>
            <Icons.ChevronDown
              className={cn(
                'h-3 w-3 text-muted-foreground/60 transition-transform duration-200',
                isExpanded && 'rotate-180',
              )}
            />
          </div>
        </button>

        {/* Content */}
        {isExpanded && (
          <div className="border-t border-border/40">
            {/* Query badges */}
            <div
              ref={loadingQueryTagsRef}
              className="px-3.5 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-border/30"
              onWheel={handleWheelScroll}
            >
              {queries.map((query, i) => {
                const isCompleted = annotations.some((a) => a.data.query === query && a.data.status === 'completed');
                const currentQuality = (args.quality ?? ['default'])[i] || 'default';
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 text-[10px] shrink-0"
                  >
                    {isCompleted ? <Icons.Check className="w-2.5 h-2.5 text-muted-foreground" /> : <Spinner className="w-2.5 h-2.5" />}
                    <span className={cn('font-medium', isCompleted ? 'text-foreground' : 'text-muted-foreground')}>{query}</span>
                    {currentQuality === 'best' && (
                      <Icons.Sparkle className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                    )}
                    {i < queries.length - 1 && <span className="text-muted-foreground/30 ml-1">/</span>}
                  </span>
                );
              })}
            </div>

            {/* Skeleton items */}
            <div className="divide-y divide-border/20">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="px-3.5 py-2 flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-sm bg-muted/40 animate-pulse shrink-0" style={{ animationDelay: `${i * 100}ms` }} />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-muted/30 rounded animate-pulse w-3/4" style={{ animationDelay: `${i * 100 + 50}ms` }} />
                    <div className="h-2 bg-muted/20 rounded animate-pulse w-1/2" style={{ animationDelay: `${i * 100 + 80}ms` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Images skeleton */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-[240px] h-[120px] shrink-0 rounded-lg bg-muted/30 border border-border/30 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
    </div>
  );
});

LoadingState.displayName = 'LoadingState';

// Main Component - Minimal Premium Design
const MultiSearch = ({
  result,
  args,
  annotations = [],
}: {
  result: MultiSearchResponse | null;
  args: MultiSearchArgs;
  annotations?: DataQueryCompletionPart[];
}) => {
  const [isClient, setIsClient] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [sourcesOpen, setSourcesOpen] = React.useState(false);

  // Ensure hydration safety
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Normalize args to ensure required arrays for UI rendering
  const normalizedArgs = React.useMemo<NormalizedMultiSearchArgs>(
    () => ({
      queries: (Array.isArray(args.queries) ? args.queries : [args.queries ?? '']).filter(
        (q): q is string => typeof q === 'string' && q.length > 0,
      ),
      maxResults: (Array.isArray(args.maxResults) ? args.maxResults : [args.maxResults ?? 10]).filter(
        (n): n is number => typeof n === 'number',
      ),
      topics: (Array.isArray(args.topics) ? args.topics : [args.topics ?? 'general']).filter(
        (t): t is Topic => t === 'general' || t === 'news',
      ),
      quality: (Array.isArray(args.quality) ? args.quality : [args.quality ?? 'default']).filter(
        (q): q is 'default' | 'best' => q === 'default' || q === 'best',
      ),
    }),
    [args],
  );

  if (!result) {
    return <LoadingState queries={normalizedArgs.queries} annotations={annotations} args={normalizedArgs} />;
  }

  const allImages = React.useMemo(() => result.searches.flatMap((search) => search.images), [result.searches]);
  const allResults = React.useMemo(() => result.searches.flatMap((search) => search.results), [result.searches]);
  const totalResults = allResults.length;

  // Prevent hydration mismatches by only rendering after client-side mount
  if (!isClient) {
    return <div className="w-full space-y-3" />;
  }

  return (
    <div className="w-full space-y-3 p-0!">
      {/* Sources Section */}
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card/30">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icons.Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">Sources</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">{totalResults}</span>
            {totalResults > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSourcesOpen(true);
                }}
                className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 hover:bg-muted/30 rounded flex items-center gap-1"
              >
                View all
                <Icons.ArrowUpRight className="w-2.5 h-2.5" />
              </button>
            )}
            <Icons.ChevronDown
              className={cn(
                'h-3 w-3 text-muted-foreground/60 transition-transform duration-200',
                isExpanded && 'rotate-180',
              )}
            />
          </div>
        </button>

        {/* Content */}
        {isExpanded && (
          <div className="border-t border-border/40">
            {/* Query tags */}
            <div className="px-3.5 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-border/30">
              {result.searches.map((search, i) => {
                const currentQuality = normalizedArgs.quality[i] || 'default';
                return (
                  <span key={i} className="inline-flex items-center gap-1 text-[10px] shrink-0">
                    <span className="font-medium text-foreground/80">{search.query}</span>
                    {currentQuality === 'best' && (
                      <Icons.Sparkle className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                    )}
                    {i < result.searches.length - 1 && <span className="text-muted-foreground/30 ml-1">/</span>}
                  </span>
                );
              })}
            </div>

            {/* Results list */}
            <div className="max-h-80 overflow-y-auto divide-y divide-border/20">
              {allResults.map((result, i) => (
                <a key={i} href={result.url} target="_blank" rel="noopener noreferrer" className="block">
                  <SourceCard result={result} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Images */}
      {allImages.length > 0 && <ImageGallery images={allImages} />}

      {/* Sources Sheet */}
      <SourcesSheet searches={result.searches} open={sourcesOpen} onOpenChange={setSourcesOpen} />
    </div>
  );
};

MultiSearch.displayName = 'MultiSearch';

export default MultiSearch;
