"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ExternalLink, ChevronLeft, ChevronRight, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProductResult = {
  title: string;
  url: string;
  content: string;
  price?: string;
  images: string[];
  supplier?: string;
  ean: string;
  publishedDate?: string;
  favicon?: string;
};

interface EANSearchResultsProps {
  barcode: string;
  results: ProductResult[];
  images: string[];
  totalResults: number;
}

const ProductCard: React.FC<{ product: ProductResult; onClick?: () => void }> = ({ 
  product, 
  onClick 
}) => {
  const faviconUrl = product.favicon || `https://www.google.com/s2/favicons?domain=${new URL(product.url).hostname}&sz=128`;
  const hostname = new URL(product.url).hostname.replace('www.', '');

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="group block p-4 rounded-lg border hover:border-blue-500 hover:bg-accent/50 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="relative w-5 h-5 mt-0.5 flex-shrink-0 rounded-full overflow-hidden bg-muted">
          <img src={faviconUrl} alt="" className="w-full h-full object-contain" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-baseline gap-2">
            <h3 className="font-medium text-sm text-foreground line-clamp-2 flex-1">
              {product.title}
            </h3>
            <ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
            <span className="truncate">{hostname}</span>
            {product.supplier && (
              <>
                <span>•</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {product.supplier}
                </Badge>
              </>
            )}
            {product.price && (
              <>
                <span>•</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {product.price}
                </span>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {product.content}
          </p>
        </div>
      </div>
    </a>
  );
};

const ProductImageGallery: React.FC<{ images: string[]; productName: string }> = ({ 
  images, 
  productName 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const validImages = images.filter(Boolean);
  
  // Debug logging
  React.useEffect(() => {
    console.log('[ProductImageGallery] Images received:', {
      total: images?.length || 0,
      valid: validImages.length,
      images: validImages.slice(0, 3)
    });
  }, [images]);
  
  // Filter out images that failed to load
  const loadableImages = validImages.filter((_, idx) => !imageErrors.has(idx));
  
  // Handle image load error
  const handleImageError = (index: number) => {
    console.log(`[ProductImageGallery] Image ${index} failed to load:`, validImages[index]);
    setImageErrors(prev => new Set(prev).add(index));
    // Move to next image if current image fails
    if (index === currentIndex && loadableImages.length > 1) {
      const nextIndex = currentIndex < loadableImages.length - 1 ? currentIndex + 1 : 0;
      setCurrentIndex(nextIndex);
    }
  };
  
  if (loadableImages.length === 0) {
    console.log('[ProductImageGallery] No valid images to display');
    return null;
  }

  const handleSwipe = (_event: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold && currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    } else if (info.offset.x < -threshold && currentIndex < validImages.length - 1) {
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < loadableImages.length - 1) {
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? 300 : -300, opacity: 0 }),
  };

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.img
            key={currentIndex}
            src={loadableImages[currentIndex]}
            alt={`${productName} - Image ${currentIndex + 1}`}
            className="w-full h-full object-contain"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleSwipe}
            onError={() => handleImageError(currentIndex)}
            loading="lazy"
          />
        </AnimatePresence>

        {currentIndex > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-black/90 hover:bg-white dark:hover:bg-black"
            onClick={goToPrevious}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}
        {currentIndex < loadableImages.length - 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 dark:bg-black/90 hover:bg-white dark:hover:bg-black"
            onClick={goToNext}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        )}

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
          {currentIndex + 1} / {loadableImages.length}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {loadableImages.map((img, idx) => (
          <button
            key={idx}
            onClick={() => {
              setDirection(idx > currentIndex ? 1 : -1);
              setCurrentIndex(idx);
            }}
            className={cn(
              "relative flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden transition-all",
              currentIndex === idx 
                ? "border-blue-500 ring-2 ring-blue-500/50" 
                : "border-transparent hover:border-blue-300"
            )}
          >
            <img 
              src={img} 
              alt="" 
              className="w-full h-full object-cover" 
              loading="lazy"
              onError={(e) => {
                // Hide thumbnail if it fails to load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export function EANSearchResults({ barcode, results, images, totalResults }: EANSearchResultsProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // Debug logging
  React.useEffect(() => {
    console.log('[EANSearchResults] Received props:', {
      barcode,
      resultsCount: results?.length || 0,
      imagesCount: images?.length || 0,
      totalResults,
      images: images?.slice(0, 3) // Log first 3 images
    });
  }, [barcode, results, images, totalResults]);
  
  const displayResults = results.slice(0, 3);
  const remainingResults = results.slice(3);

  return (
    <Card className="w-full my-4 shadow-sm">
      <CardContent className="p-0">
        <Accordion type="single" collapsible defaultValue="results">
          <AccordionItem value="results" className="border-none">
            <AccordionTrigger className="py-3 px-4 hover:no-underline bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-t-lg">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <div className="text-left">
                    <h3 className="font-semibold text-sm">Résultats pour le code-barres</h3>
                    <p className="text-xs text-muted-foreground font-mono">{barcode}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="ml-2">
                  {totalResults} résultat{totalResults > 1 ? 's' : ''}
                </Badge>
              </div>
            </AccordionTrigger>
            
            <AccordionContent className="px-4 pb-4 space-y-4">
              {images && images.length > 0 ? (
                <ProductImageGallery 
                  images={images} 
                  productName={results[0]?.title || 'Produit'} 
                />
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                  📸 Aucune image disponible pour ce produit
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Fournisseurs et informations
                </h4>
                {displayResults.map((product, idx) => (
                  <ProductCard key={idx} product={product} />
                ))}
              </div>

              {remainingResults.length > 0 && (
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="w-full">
                      Voir tous les résultats ({remainingResults.length} de plus)
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5" />
                        Tous les résultats - {barcode}
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-3">
                      {results.map((product, idx) => (
                        <ProductCard key={idx} product={product} />
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
