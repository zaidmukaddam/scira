// /components/multi-search.tsx
/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Search, ExternalLink, Calendar, ImageIcon, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

type SearchImage = {
    url: string;
    description: string;
};

type SearchResult = {
    url: string;
    title: string;
    content: string;
    raw_content: string;
    published_date?: string;
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
    topics: ("general" | "news")[];
    searchDepth: ("basic" | "advanced")[];
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

const PREVIEW_IMAGE_COUNT = {
    MOBILE: 4,
    DESKTOP: 5
};

// Loading state component
const SearchLoadingState = ({ 
    queries,
    annotations 
}: { 
    queries: string[];
    annotations: QueryCompletion[];
}) => {
    const completedQueries = annotations.length;
    const totalResults = annotations.reduce((sum, a) => sum + a.data.resultsCount, 0);
    const totalImages = annotations.reduce((sum, a) => sum + a.data.imagesCount, 0);

    return (
        <div className="w-full space-y-4">
            <Accordion type="single" collapsible defaultValue="search" className="w-full">
                <AccordionItem value="search" className="border-none">
                    <AccordionTrigger
                        className={cn(
                            "p-4 bg-white dark:bg-neutral-900 rounded-xl hover:no-underline border border-neutral-200 dark:border-neutral-800 shadow-sm",
                            "[&[data-state=open]]:rounded-b-none"
                        )}
                    >
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                    <Globe className="h-4 w-4 text-neutral-500" />
                                </div>
                                <h2 className="font-medium text-left">Sources Found</h2>
                            </div>
                            <div className="flex items-center gap-2 mr-2">
                                <Badge
                                    variant="secondary"
                                    className="rounded-full px-3 py-1 bg-neutral-100 dark:bg-neutral-800"
                                >
                                    <Search className="h-3 w-3 mr-1.5" />
                                    {totalResults || '0'} Results
                                </Badge>
                            </div>
                        </div>
                    </AccordionTrigger>

                    <AccordionContent className="mt-0 pt-0 border-0">
                        <div className="py-3 px-4 bg-white dark:bg-neutral-900 rounded-b-xl border-t-0 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                            {/* Query badges */}
                            <div className="flex overflow-x-auto gap-2 mb-3 no-scrollbar pb-1">
                                {queries.map((query, i) => {
                                    const annotation = annotations.find(a => a.data.query === query);
                                    return (
                                        <Badge
                                            key={i}
                                            variant="secondary"
                                            className={cn(
                                                "px-3 py-1.5 rounded-full flex-shrink-0 flex items-center gap-1.5",
                                                annotation 
                                                    ? "bg-neutral-100 dark:bg-neutral-800" 
                                                    : "bg-neutral-50 dark:bg-neutral-900 text-neutral-400"
                                            )}
                                        >
                                            {annotation ? (
                                                <Check className="h-3 w-3" />
                                            ) : (
                                                <div className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                            )}
                                            {query}
                                        </Badge>
                                    );
                                })}
                            </div>

                            {/* Horizontal scrolling results skeleton */}
                            <div className="flex overflow-x-auto gap-3 no-scrollbar pb-1">
                                {[...Array(6)].map((_, i) => (
                                    <div 
                                        key={i}
                                        className="w-[300px] flex-shrink-0 bg-background rounded-xl border border-border shadow-sm"
                                    >
                                        <div className="p-4">
                                            <div className="flex items-center gap-2.5 mb-3">
                                                <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded-md animate-pulse w-3/4" />
                                                    <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded-md animate-pulse w-1/2" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded-md animate-pulse w-full" />
                                                <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded-md animate-pulse w-5/6" />
                                                <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded-md animate-pulse w-4/6" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            {/* Images section skeleton */}
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "aspect-[4/3] rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse",
                            i === 0 && "sm:row-span-2 sm:col-span-2"
                        )}
                    />
                ))}
            </div>
        </div>
    );
};

const ResultCard = ({ result }: { result: SearchResult }) => {
    const [imageLoaded, setImageLoaded] = React.useState(false);

    return (
        <div className="w-[300px] flex-shrink-0 bg-background rounded-xl border border-border shadow-sm hover:shadow-md transition-all">
            <div className="p-4">
                <div className="flex items-center gap-2.5 mb-3">
                    <div className="relative w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {!imageLoaded && (
                            <div className="absolute inset-0 animate-pulse bg-muted-foreground/10" />
                        )}
                        <img
                            src={`https://www.google.com/s2/favicons?sz=128&domain=${new URL(result.url).hostname}`}
                            alt=""
                            className={cn(
                                "w-6 h-6 object-contain",
                                !imageLoaded && "opacity-0"
                            )}
                            onLoad={() => setImageLoaded(true)}
                            onError={(e) => {
                                setImageLoaded(true);
                                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cline x1='12' y1='8' x2='12' y2='16'/%3E%3Cline x1='8' y1='12' x2='16' y2='12'/%3E%3C/svg%3E";
                            }}
                        />
                    </div>
                    <div>
                        <h3 className="font-medium text-sm line-clamp-1">{result.title}</h3>
                        <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                            {new URL(result.url).hostname}
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {result.content}
                </p>

                {result.published_date && (
                    <div className="pt-3 border-t border-border">
                        <time className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            {new Date(result.published_date).toLocaleDateString()}
                        </time>
                    </div>
                )}
            </div>
        </div>
    );
};

interface ImageGridProps {
    images: SearchImage[];
    showAll?: boolean;
}

const ImageGrid = ({ images, showAll = false }: ImageGridProps) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedImage, setSelectedImage] = React.useState(0);
    const isDesktop = useMediaQuery("(min-width: 768px)");

    const displayImages = showAll 
        ? images 
        : images.slice(0, isDesktop ? PREVIEW_IMAGE_COUNT.DESKTOP : PREVIEW_IMAGE_COUNT.MOBILE);
    const hasMore = images.length > (isDesktop ? PREVIEW_IMAGE_COUNT.DESKTOP : PREVIEW_IMAGE_COUNT.MOBILE);

    return (
        <div>
            {/* Mobile: 2 columns with first image large if multiple images */}
            {/* Desktop: 3-4 columns with first image large */}
            <div className={cn(
                "grid gap-2",
                // Mobile layout
                "grid-cols-2",
                displayImages.length === 1 && "grid-cols-1",
                // Tablet layout
                "sm:grid-cols-3",
                // Desktop layout
                "lg:grid-cols-4",
                // Reduced height with aspect ratio
                "[&>*]:aspect-[4/3]",
                // First image larger on desktop or when it's the only image
                "[&>*:first-child]:row-span-1 [&>*:first-child]:col-span-1",
                isDesktop && displayImages.length > 1 && "[&>*:first-child]:row-span-2 [&>*:first-child]:col-span-2",
                displayImages.length === 1 && "!grid-cols-1 [&>*:first-child]:!row-span-2 [&>*:first-child]:!col-span-1"
            )}>
                {displayImages.map((image, index) => (
                    <motion.button
                        key={index}
                        className={cn(
                            "relative rounded-xl overflow-hidden group",
                            "hover:ring-2 hover:ring-primary hover:ring-offset-2",
                            "transition-all duration-200",
                            "shadow-sm bg-primary/5 dark:bg-primary/10"
                        )}
                        onClick={() => {
                            setSelectedImage(index);
                            setIsOpen(true);
                        }}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                        <img
                            src={image.url}
                            alt={image.description}
                            className={cn(
                                "w-full h-full object-cover",
                                "transition-all duration-500",
                                "group-hover:scale-105",
                                "opacity-0 [&.loaded]:opacity-100"
                            )}
                            onLoad={(e) => {
                                e.currentTarget.classList.add('loaded');
                            }}
                        />
                        {image.description && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2">
                                <p className="text-xs text-white line-clamp-3">{image.description}</p>
                            </div>
                        )}
                        {!showAll && hasMore && index === displayImages.length - 1 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                <span className="text-sm font-medium text-white">
                                    +{images.length - displayImages.length}
                                </span>
                            </div>
                        )}
                    </motion.button>
                ))}
            </div>

            {isDesktop ? (
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="max-w-5xl h-[80vh] p-0">
                        <div className="relative bg-background w-full h-full rounded-lg overflow-hidden">
                            <motion.div 
                                className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/40 to-transparent z-50"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="text-white">
                                        <h2 className="text-xl font-medium">Search Images</h2>
                                        <p className="text-sm text-white/80">
                                            {selectedImage + 1} of {images.length}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-white hover:bg-white/20"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            </motion.div>

                            <div className="absolute inset-0 flex items-center justify-center p-12 mt-[60px] mb-[60px]">
                                <motion.img
                                    key={images[selectedImage].url}
                                    src={images[selectedImage].url}
                                    alt={images[selectedImage].description}
                                    className="w-full h-full object-contain"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>

                            <Button
                                className={cn(
                                    "absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full",
                                    "bg-white/80 dark:bg-black/50 text-black dark:text-white",
                                    "hover:bg-white/90 dark:hover:bg-black/70 transition-colors",
                                    "border border-neutral-200 dark:border-white/10"
                                )}
                                onClick={() => {
                                    setSelectedImage(prev => prev === 0 ? images.length - 1 : prev - 1);
                                }}
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <Button
                                className={cn(
                                    "absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full",
                                    "bg-white/80 dark:bg-black/50 text-black dark:text-white",
                                    "hover:bg-white/90 dark:hover:bg-black/70 transition-colors",
                                    "border border-neutral-200 dark:border-white/10"
                                )}
                                onClick={() => {
                                    setSelectedImage(prev => prev === images.length - 1 ? 0 : prev + 1);
                                }}
                            >
                                <ChevronRight className="h-6 w-6" />
                            </Button>

                            {images[selectedImage].description && (
                                <motion.div 
                                    className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/40 dark:from-black/60 via-black/20 dark:via-black/40 to-transparent"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <p className="text-sm text-white">
                                        {images[selectedImage].description}
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            ) : (
                <Drawer open={isOpen} onOpenChange={setIsOpen}>
                    <DrawerContent className="p-0 h-[80vh] bg-background">
                        <div className="relative w-full h-full rounded-t-lg overflow-hidden">
                            <motion.div 
                                className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/40 to-transparent z-50"
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="text-white">
                                        <h2 className="text-xl font-medium">Search Images</h2>
                                        <p className="text-sm text-white/80">
                                            {selectedImage + 1} of {images.length}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-white hover:bg-white/20"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            </motion.div>

                            <div className="absolute inset-0 flex items-center justify-center p-12 mt-[60px] mb-[60px]">
                                <motion.img
                                    key={images[selectedImage].url}
                                    src={images[selectedImage].url}
                                    alt={images[selectedImage].description}
                                    className="w-full h-full object-contain"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>

                            <Button
                                className={cn(
                                    "absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full",
                                    "bg-white/80 dark:bg-black/50 text-black dark:text-white",
                                    "hover:bg-white/90 dark:hover:bg-black/70 transition-colors",
                                    "border border-neutral-200 dark:border-white/10"
                                )}
                                onClick={() => {
                                    setSelectedImage(prev => prev === 0 ? images.length - 1 : prev - 1);
                                }}
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                            <Button
                                className={cn(
                                    "absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full",
                                    "bg-white/80 dark:bg-black/50 text-black dark:text-white",
                                    "hover:bg-white/90 dark:hover:bg-black/70 transition-colors",
                                    "border border-neutral-200 dark:border-white/10"
                                )}
                                onClick={() => {
                                    setSelectedImage(prev => prev === images.length - 1 ? 0 : prev + 1);
                                }}
                            >
                                <ChevronRight className="h-6 w-6" />
                            </Button>

                            {images[selectedImage].description && (
                                <motion.div 
                                    className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/40 dark:from-black/60 via-black/20 dark:via-black/40 to-transparent"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <p className="text-sm text-white">
                                        {images[selectedImage].description}
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </DrawerContent>
                </Drawer>
            )}
        </div>
    );
};

const MultiSearch: React.FC<{ 
    result: MultiSearchResponse | null; 
    args: MultiSearchArgs;
    annotations?: QueryCompletion[];
}> = ({
    result,
    args,
    annotations = []
}) => {
    if (!result) {
        return <SearchLoadingState queries={args.queries} annotations={annotations} />;
    }

    // Collect all images from all searches
    const allImages = result.searches.reduce<SearchImage[]>((acc, search) => {
        return [...acc, ...search.images];
    }, []);

    const totalResults = result.searches.reduce((sum, search) => sum + search.results.length, 0);

    return (
        <div className="w-full space-y-4">
            <Accordion type="single" collapsible defaultValue="search" className="w-full">
                <AccordionItem value="search" className="border-none">
                    <AccordionTrigger
                        className={cn(
                            "p-4 bg-white dark:bg-neutral-900 rounded-xl hover:no-underline border border-neutral-200 dark:border-neutral-800 shadow-sm",
                            "[&[data-state=open]]:rounded-b-none"
                        )}
                    >
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                    <Globe className="h-4 w-4 text-neutral-500" />
                                </div>
                                <h2 className="font-medium text-left">Sources Found</h2>
                            </div>
                            <div className="flex items-center gap-2 mr-2">
                                <Badge
                                    variant="secondary"
                                    className="rounded-full px-3 py-1 bg-neutral-100 dark:bg-neutral-800"
                                >
                                    <Search className="h-3 w-3 mr-1.5" />
                                    {totalResults} Results
                                </Badge>
                            </div>
                        </div>
                    </AccordionTrigger>

                    <AccordionContent className="mt-0 pt-0 border-0">
                        <div className="py-3 px-4 bg-white dark:bg-neutral-900 rounded-b-xl border-t-0 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                            {/* Query badges */}
                            <div className="flex overflow-x-auto gap-2 mb-3 no-scrollbar pb-1">
                                {result.searches.map((search, i) => (
                                    <Badge
                                        key={i}
                                        variant="secondary"
                                        className="px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex-shrink-0"
                                    >
                                        <Search className="h-3 w-3 mr-1.5" />
                                        {search.query}
                                    </Badge>
                                ))}
                            </div>

                            {/* Horizontal scrolling results */}
                            <div className="flex overflow-x-auto gap-3 no-scrollbar">
                                {result.searches.map(search =>
                                    search.results.map((result, resultIndex) => (
                                        <motion.div
                                            key={`${search.query}-${resultIndex}`}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3, delay: resultIndex * 0.1 }}
                                        >
                                            <ResultCard result={result} />
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            {/* Images section outside accordion */}
            {allImages.length > 0 && <ImageGrid images={allImages} />}
        </div>
    );
};

export default MultiSearch;
