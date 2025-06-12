'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, Question } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DiscountConfig } from '@/lib/discount';
import { cn } from '@/lib/utils';

interface DiscountBannerProps {
  discountConfig: DiscountConfig;
  onClose?: () => void;
  onClaim?: (code: string) => void;
  className?: string;
}

export function DiscountBanner({
  discountConfig,
  onClose,
  onClaim,
  className
}: DiscountBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  // Calculate time remaining
  useEffect(() => {
    if (!discountConfig.expiresAt) return;

    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = discountConfig.expiresAt!.getTime();
      const difference = expiry - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`${minutes}m`);
        }
      } else {
        setTimeLeft('Expired');
        setIsVisible(false);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [discountConfig.expiresAt]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  const handleClaim = () => {
    if (discountConfig.code) {
      onClaim?.(discountConfig.code);
      setIsCopied(true);
      // Reset the copied state after 2 seconds
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Calculate pricing if not provided but percentage and originalPrice are available
  const calculatePricing = () => {
    // Handle first month only pricing
    if (discountConfig.isFirstMonthOnly && discountConfig.firstMonthPrice && discountConfig.originalPrice) {
      return {
        originalPrice: discountConfig.originalPrice,
        firstMonthPrice: discountConfig.firstMonthPrice,
        savings: discountConfig.originalPrice - discountConfig.firstMonthPrice,
        isFirstMonthOnly: true
      };
    }
    
    if (discountConfig.finalPrice && discountConfig.originalPrice) {
      return {
        originalPrice: discountConfig.originalPrice,
        finalPrice: discountConfig.finalPrice,
        savings: discountConfig.originalPrice - discountConfig.finalPrice,
        isFirstMonthOnly: false
      };
    }
    
    if (discountConfig.percentage && discountConfig.originalPrice) {
      const savings = (discountConfig.originalPrice * discountConfig.percentage) / 100;
      const finalPrice = discountConfig.originalPrice - savings;
      return {
        originalPrice: discountConfig.originalPrice,
        finalPrice: finalPrice,
        firstMonthPrice: discountConfig.isFirstMonthOnly ? finalPrice : undefined,
        savings: savings,
        isFirstMonthOnly: discountConfig.isFirstMonthOnly || false
      };
    }
    
    return null;
  };

  const pricing = calculatePricing();

  if (!discountConfig.enabled || !isVisible) {
    return null;
  }

  return (
    <div className={cn(
      'bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden',
      className
    )}>
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
              <h3 className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100 tracking-[-0.01em]">
                {discountConfig.message || 'Special Offer Available'}
              </h3>
              {discountConfig.percentage && (
                <Badge className="bg-black dark:bg-white text-white dark:text-black px-2.5 py-1 text-xs font-medium w-fit">
                  {discountConfig.percentage}% OFF
                </Badge>
              )}
            </div>

            {/* Pricing Information */}
            {pricing && (
              <div className="mb-4 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
                {pricing.isFirstMonthOnly ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400 line-through">
                          ${pricing.originalPrice}/month
                        </span>
                        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                          ${pricing.firstMonthPrice}/month
                        </span>
                        <span className="text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded">
                          First month
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Then ${pricing.originalPrice}/month • Save ${pricing.savings.toFixed(2)} on your first month
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-500 dark:text-zinc-400 line-through">
                        ${pricing.originalPrice}/month
                      </span>
                      <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        ${pricing.finalPrice ? pricing.finalPrice.toFixed(2) : pricing.firstMonthPrice}/month
                      </span>
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                      Save ${pricing.savings.toFixed(2)}/month
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Action buttons and expiry */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
              {discountConfig.code && onClaim && (
                <button
                  onClick={handleClaim}
                  className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4 flex-shrink-0" />
                      <span>Code copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 flex-shrink-0" />
                      <span className="sm:hidden">Copy {discountConfig.code}</span>
                      <span className="hidden sm:inline">Copy code: <span className="font-mono text-zinc-900 dark:text-zinc-100">{discountConfig.code}</span></span>
                    </>
                  )}
                </button>
              )}
              
              {timeLeft && timeLeft !== 'Expired' && (
                <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  Expires in {timeLeft}
                </span>
              )}
            </div>

            {/* Redemption Instructions */}
            {discountConfig.code && (
              <Accordion type="single" collapsible>
                <AccordionItem value="instructions" className="border-0">
                  <AccordionTrigger className="py-2 px-0 hover:no-underline text-xs">
                    <div className="flex items-center gap-2">
                      <Question className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-zinc-600 dark:text-zinc-400">How to redeem this code?</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-0">
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 bg-zinc-800 dark:bg-zinc-200 text-zinc-100 dark:text-zinc-800 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 mt-0.5">
                          1
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">Click upgrade</p>
                          <p className="text-zinc-500 dark:text-zinc-500 text-[11px]">Start by clicking the upgrade button</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 bg-zinc-800 dark:bg-zinc-200 text-zinc-100 dark:text-zinc-800 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 mt-0.5">
                          2
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">Find discount section</p>
                          <p className="text-zinc-500 dark:text-zinc-500 text-[11px]">Look for &quot;Discount&quot; on checkout page</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 bg-zinc-800 dark:bg-zinc-200 text-zinc-100 dark:text-zinc-800 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 mt-0.5">
                          3
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">Enter code</p>
                          <p className="text-zinc-500 dark:text-zinc-500 text-[11px]">
                            Paste: <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">{discountConfig.code}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 bg-zinc-800 dark:bg-zinc-200 text-zinc-100 dark:text-zinc-800 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0 mt-0.5">
                          4
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">Click apply</p>
                          <p className="text-zinc-500 dark:text-zinc-500 text-[11px]">Click &quot;Apply&quot; to activate discount</p>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
          
          {onClose && (
            <button
              onClick={handleClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1 self-start sm:self-auto"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DiscountBanner; 