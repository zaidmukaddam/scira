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

const PREVIEW_IMAGE_COUNT = 4;

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

    const displayImages = showAll ? images : images.slice(0, PREVIEW_IMAGE_COUNT);
    const hasMore = images.length > PREVIEW_IMAGE_COUNT;

    const ImageViewer = () => (
        <div className="relative w-full h-full rounded-xl">
            <div className="absolute right-4 top-4 z-50 flex items-center gap-2 rounded-xl">
                <span className="px-2 py-1 rounded-md bg-black/20 backdrop-blur-sm text-xs text-white">
                    {selectedImage + 1} / {images.length}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-black/20 backdrop-blur-sm text-white hover:bg-black/40"
                    onClick={() => setIsOpen(false)}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <img
                src={images[selectedImage].url}
                alt={images[selectedImage].description}
                className="w-full h-full object-contain rounded-lg"
            />

            <div className="absolute inset-y-0 left-0 flex items-center px-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-black/20 backdrop-blur-sm text-white hover:bg-black/40"
                    onClick={() => setSelectedImage(prev => prev === 0 ? images.length - 1 : prev - 1)}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
            </div>

            <div className="absolute inset-y-0 right-0 flex items-center px-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 bg-black/20 backdrop-blur-sm text-white hover:bg-black/40"
                    onClick={() => setSelectedImage(prev => prev === images.length - 1 ? 0 : prev + 1)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {images[selectedImage].description && (
                <div className="absolute rounded-xl inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 via-black/40 to-transparent">
                    <p className="text-sm text-white">
                        {images[selectedImage].description}
                    </p>
                </div>
            )}
        </div>
    );

    {
        isDesktop ? (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] p-0 rounded-xl overflow-hidden">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Image Gallery</DialogTitle>
                    </DialogHeader>
                    <div className="rounded-xl overflow-hidden">
                        <ImageViewer />
                    </div>
                </DialogContent>
            </Dialog>
        ) : (
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
                <DrawerContent className="p-0 rounded-t-xl overflow-hidden">
                    <DrawerHeader className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/60 to-transparent rounded-t-xl">
                        <DrawerTitle className="text-white">Image Gallery</DrawerTitle>
                    </DrawerHeader>
                    <div className="h-[calc(100vh-4rem)] rounded-t-xl overflow-hidden">
                        <ImageViewer />
                    </div>
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {displayImages.map((image, index) => (
                    // Update ImageGrid image container styles
                    <motion.button
                        key={index}
                        className="relative aspect-square rounded-lg overflow-hidden group hover:ring-2 hover:ring-neutral-400 hover:ring-offset-2 transition-all"
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
                            className="w-full h-full object-cover rounded-lg"
                        />
                        {image.description && (
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-3">
                                <p className="text-xs text-white line-clamp-3">{image.description}</p>
                            </div>
                        )}
                        {!showAll && index === PREVIEW_IMAGE_COUNT - 1 && hasMore && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
                                <span className="text-xl font-medium text-white">+{images.length - PREVIEW_IMAGE_COUNT}</span>
                            </div>
                        )}
                    </motion.button>
                ))}
            </div>

            {isDesktop ? (
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogContent className="max-w-4xl max-h-[85vh] p-0">
                        <DialogHeader className="sr-only">
                            <DialogTitle>Image Gallery</DialogTitle>
                        </DialogHeader>
                        <ImageViewer />
                    </DialogContent>
                </Dialog>
            ) : (
                <Drawer open={isOpen} onOpenChange={setIsOpen}>
                    <DrawerContent>
                        <DrawerHeader>
                            <DrawerTitle>Image Gallery</DrawerTitle>
                        </DrawerHeader>
                        <div className="p-4">
                            <ImageViewer />
                        </div>
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
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                <Globe className="h-4 w-4 text-neutral-500" />
                            </div>
                            <div>
                                <h2 className="font-medium text-left">Web Search</h2>
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