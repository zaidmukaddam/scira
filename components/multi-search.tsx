// /components/multi-search.tsx
/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Search, ExternalLink, Calendar, ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
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

const PREVIEW_IMAGE_COUNT = 3;

// Loading state component
const SearchLoadingState = ({ queries }: { queries: string[] }) => (
    <div className="w-full space-y-4">
        <Accordion type="single" collapsible defaultValue="search" className="w-full">
            <AccordionItem value="search" className="border-none">
                <AccordionTrigger
                    className={cn(
                        "p-4 bg-white dark:bg-neutral-900 rounded-xl hover:no-underline border border-neutral-200 dark:border-neutral-800 shadow-sm",
                        "[&[data-state=open]]:rounded-b-none"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                            <Globe className="h-4 w-4 text-neutral-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-medium text-left">Running Web Search</h2>
                                <span className="flex gap-1">
                                    <span className="w-1 h-1 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.3s]" />
                                    <span className="w-1 h-1 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-1 h-1 rounded-full bg-neutral-400 animate-bounce" />
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="secondary" className="animate-pulse">
                                    Searching...
                                </Badge>
                            </div>
                        </div>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="mt-0 pt-0 border-0">
                    <div className="py-3 px-4 bg-white dark:bg-neutral-900 rounded-b-xl border-t-0 border border-neutral-200 dark:border-neutral-800 shadow-sm">
                        <div className="flex overflow-x-auto gap-2 mb-3 no-scrollbar pb-1">
                            {queries.map((query, i) => (
                                <Badge
                                    key={i}
                                    variant="secondary"
                                    className="px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 flex-shrink-0"
                                >
                                    <Search className="h-3 w-3 mr-1.5" />
                                    {query}
                                </Badge>
                            ))}
                        </div>
                        <div className="flex overflow-x-auto gap-3 no-scrollbar">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="w-[300px] flex-shrink-0 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                                    <div className="p-4 animate-pulse">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-20 h-8 rounded-sm bg-neutral-100 dark:bg-neutral-800" />
                                            <div className="space-y-2">
                                                <div className="h-4 w-32 bg-neutral-100 dark:bg-neutral-800 rounded" />
                                                <div className="h-3 w-24 bg-neutral-100 dark:bg-neutral-800 rounded" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800 rounded" />
                                            <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800 rounded" />
                                            <div className="h-3 w-2/3 bg-neutral-100 dark:bg-neutral-800 rounded" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
            ))}
        </div>
    </div>
);

const ResultCard = ({ result }: { result: SearchResult }) => (
    <div className="w-[300px] flex-shrink-0 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all">
        <div className="p-4">
            <div className="flex items-center gap-2.5 mb-3">
                <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden">
                    <img
                        src={`https://www.google.com/s2/favicons?sz=128&domain=${new URL(result.url).hostname}`}
                        alt=""
                        className="w-6 h-6 object-contain"
                        onError={(e) => {
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
                        className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 flex items-center gap-1"
                    >
                        {new URL(result.url).hostname}
                        <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3 mb-3">
                {result.content}
            </p>

            {result.published_date && (
                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <time className="text-xs text-neutral-500 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {new Date(result.published_date).toLocaleDateString()}
                    </time>
                </div>
            )}
        </div>
    </div>
);

interface ImageGridProps {
    images: SearchImage[];
    showAll?: boolean;
}

const ImageGrid = ({ images, showAll = false }: ImageGridProps) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [selectedImage, setSelectedImage] = React.useState(0);
    const isDesktop = useMediaQuery("(min-width: 768px)");

    const displayImages = showAll ? images : images.slice(0, isDesktop ? 5 : PREVIEW_IMAGE_COUNT);
    const hasMore = images.length > (isDesktop ? 5 : PREVIEW_IMAGE_COUNT);

    const ImageViewer = () => (
        <div className="relative bg-black/95 w-full h-full">
            {/* Header */}
            <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/40 to-transparent z-50">
                <div className="flex items-center justify-between">
                    <div className="text-white">
                        <h2 className="text-xl font-semibold">Search Images</h2>
                        <p className="text-sm text-neutral-400">
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
            </div>

            {/* Main Image */}
            <div className="absolute inset-0 flex items-center justify-center p-12 mt-[60px] mb-[60px]">
                <img
                    src={images[selectedImage].url}
                    alt={images[selectedImage].description}
                    className="w-full h-full object-contain"
                />
            </div>

            {/* Navigation Arrows */}
            <button
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                onClick={() => setSelectedImage(prev => prev === 0 ? images.length - 1 : prev - 1)}
            >
                <ChevronLeft className="h-6 w-6" />
            </button>
            <button
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                onClick={() => setSelectedImage(prev => prev === images.length - 1 ? 0 : prev + 1)}
            >
                <ChevronRight className="h-6 w-6" />
            </button>

            {/* Description */}
            {images[selectedImage].description && (
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/60 via-black/40 to-transparent">
                    <p className="text-sm text-white">
                        {images[selectedImage].description}
                    </p>
                </div>
            )}
        </div>
    );

    return (
        <div>
            <div className="grid grid-cols-3 sm:grid-cols-4 auto-rows-[60px] sm:auto-rows-[80px] gap-1 sm:gap-2 mt-1.5 sm:mt-2">
                {displayImages.map((image, index) => (
                    <motion.button
                        key={index}
                        className={cn(
                            "relative rounded-md overflow-hidden group hover:ring-1 hover:ring-neutral-400 hover:ring-offset-1 transition-all",
                            // Make first image larger but with reduced span on mobile
                            index === 0 ? "col-span-2 row-span-2" : "",
                            // Lighter shadow
                            "shadow-xs"
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
                            className="w-full h-full object-cover"
                        />
                        {image.description && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1">
                                <p className="text-[9px] sm:text-[10px] text-white line-clamp-2">{image.description}</p>
                            </div>
                        )}
                        {!showAll && index === (isDesktop ? 3 : 2) && hasMore && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                <span className="text-xs sm:text-sm font-medium text-white">+{images.length - (isDesktop ? 5 : 3)}</span>
                            </div>
                        )}
                    </motion.button>
                ))}
            </div>

            {isDesktop ? (
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="max-w-5xl h-[80vh] p-0 !rounded-none border-0">
                        <ImageViewer />
                    </DialogContent>
                </Dialog>
            ) : (
                <Drawer open={isOpen} onOpenChange={setIsOpen}>
                    <DrawerContent className="p-0 h-[80vh]">
                        <ImageViewer />
                    </DrawerContent>
                </Drawer>
            )}
        </div>
    );
};

const MultiSearch: React.FC<{ result: MultiSearchResponse | null; args: MultiSearchArgs }> = ({
    result,
    args
}) => {
    if (!result) {
        return <SearchLoadingState queries={args.queries} />;
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