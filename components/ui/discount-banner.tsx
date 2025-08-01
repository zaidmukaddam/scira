'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, Question, Clock, Percent } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardAction } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DiscountConfig } from '@/lib/discount';
import { cn } from '@/lib/utils';
import { PRICING } from '@/lib/constants';
import { SlidingNumber } from '@/components/core/sliding-number';
import { useLocation } from '@/hooks/use-location';

interface DiscountBannerProps {
  discountConfig: DiscountConfig;
  onClose?: () => void;
  onClaim?: (code: string) => void;
  className?: string;
}

export function DiscountBanner({ discountConfig, onClose, onClaim, className }: DiscountBannerProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [countdownTime, setCountdownTime] = useState<{ days: number; hours: number; minutes: number; seconds: number }>(
    {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    },
  );

  // Calculate time remaining
  useEffect(() => {
    if (!discountConfig.startsAt && !discountConfig.expiresAt) return;

    const updateTimeLeft = () => {
      const now = new Date().getTime();

      // Check if discount hasn't started yet
      if (discountConfig.startsAt) {
        const startTime = discountConfig.startsAt.getTime();
        if (now < startTime) {
          const difference = startTime - now;
          const days = Math.floor(difference / (1000 * 60 * 60 * 24));
          const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);

          setCountdownTime({ days, hours, minutes, seconds });

          if (days > 0) {
            setTimeLeft(`Starts in ${days}d ${hours}h`);
          } else if (hours > 0) {
            setTimeLeft(`Starts in ${hours}h ${minutes}m`);
          } else {
            setTimeLeft(`Starts in ${minutes}m`);
          }
          return;
        }
      }

      // Check if discount has expired
      if (discountConfig.expiresAt) {
        const expiry = discountConfig.expiresAt.getTime();
        const difference = expiry - now;

        if (difference > 0) {
          const days = Math.floor(difference / (1000 * 60 * 60 * 24));
          const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);

          setCountdownTime({ days, hours, minutes, seconds });

          if (days > 0) {
            setTimeLeft(`Expires in ${days}d ${hours}h`);
          } else if (hours > 0) {
            setTimeLeft(`Expires in ${hours}h ${minutes}m`);
          } else {
            setTimeLeft(`Expires in ${minutes}m`);
          }
        } else {
          setTimeLeft('Expired');
          setCountdownTime({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          setIsVisible(false);
        }
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000); // Update every second for precise countdown

    return () => clearInterval(interval);
  }, [discountConfig.startsAt, discountConfig.expiresAt]);

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
    // Use actual pricing constants
    const defaultUSDPrice = PRICING.PRO_MONTHLY;
    const defaultINRPrice = PRICING.PRO_MONTHLY_INR;

    // Calculate USD pricing
    let usdPricing = null;
    if (discountConfig.percentage) {
      const usdSavings = (defaultUSDPrice * discountConfig.percentage) / 100;
      const usdFinalPrice = defaultUSDPrice - usdSavings;
      usdPricing = {
        originalPrice: defaultUSDPrice,
        finalPrice: usdFinalPrice,
        savings: usdSavings,
      };
    }

    // Calculate INR pricing (only for India)
    let inrPricing = null;
    if (location.isIndia) {
      if (discountConfig.inrPrice) {
        inrPricing = {
          originalPrice: defaultINRPrice,
          finalPrice: discountConfig.inrPrice,
          savings: defaultINRPrice - discountConfig.inrPrice,
        };
      } else if (discountConfig.percentage) {
        const inrSavings = (defaultINRPrice * discountConfig.percentage) / 100;
        const inrFinalPrice = defaultINRPrice - inrSavings;
        inrPricing = {
          originalPrice: defaultINRPrice,
          finalPrice: inrFinalPrice,
          savings: inrSavings,
        };
      }
    }

    if (usdPricing || inrPricing) {
      return {
        usd: usdPricing,
        inr: inrPricing,
        hasBothCurrencies: true,
      };
    }

    return null;
  };

  const pricing = calculatePricing();

  // In dev mode, ignore enabled flag; otherwise check if enabled
  const isDevMode = discountConfig.dev || process.env.NODE_ENV === 'development';
  const shouldShow = isDevMode
    ? discountConfig.code && discountConfig.message
    : discountConfig.enabled && discountConfig.code && discountConfig.message;

  if (!shouldShow || !isVisible) {
    return null;
  }

  const getVariantStyles = () => {
    switch (discountConfig.variant) {
      case 'urgent':
        return 'border-amber-200 dark:border-amber-800/50';
      case 'success':
        return 'border-green-200 dark:border-green-800/50';
      default:
        return '';
    }
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-lg font-semibold">
                {discountConfig.message || 'Special Offer Available'}
              </CardTitle>
              {discountConfig.percentage && (
                <Badge variant="secondary" className="text-sm font-medium px-2.5 py-1">
                  {discountConfig.percentage}% OFF
                </Badge>
              )}
            </div>
          </div>

          {/* Countdown Timer */}
          {timeLeft && timeLeft !== 'Expired' && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Clock className="h-3 w-3" />
                <span>Offer ends in:</span>
              </div>
              <div className="flex items-center gap-1.5">
                {countdownTime.days > 0 && (
                  <>
                    <div className="bg-background border border-border p-2 rounded-md min-w-[40px] text-center">
                      <div className="text-sm font-semibold">
                        <SlidingNumber value={countdownTime.days} padStart={true} />
                      </div>
                      <span className="text-xs text-muted-foreground">days</span>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">:</span>
                  </>
                )}
                <div className="bg-background border border-border p-2 rounded-md min-w-[40px] text-center">
                  <div className="text-sm font-semibold">
                    <SlidingNumber value={countdownTime.hours} padStart={true} />
                  </div>
                  <span className="text-xs text-muted-foreground">hrs</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">:</span>
                <div className="bg-background border border-border p-2 rounded-md min-w-[40px] text-center">
                  <div className="text-sm font-semibold">
                    <SlidingNumber value={countdownTime.minutes} padStart={true} />
                  </div>
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">:</span>
                <div className="bg-background border border-border p-2 rounded-md min-w-[40px] text-center">
                  <div className="text-sm font-semibold">
                    <SlidingNumber value={countdownTime.seconds} padStart={true} />
                  </div>
                  <span className="text-xs text-muted-foreground">sec</span>
                </div>
              </div>
            </div>
          )}

          {onClose && (
            <CardAction>
              <Button variant="ghost" size="icon" onClick={handleClose} className="h-7 w-7">
                <X className="h-3 w-3" />
                <span className="sr-only">Close</span>
              </Button>
            </CardAction>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Pricing Information */}
        {pricing && (
          <div className="p-4 bg-background/50 dark:bg-background/30 rounded-lg border border-border/50 space-y-4">
            {/* USD Pricing */}
            {pricing.usd && (
              <div>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground line-through">
                      ${pricing.usd.originalPrice}/month
                    </span>
                    <span className="text-lg font-semibold text-foreground">
                      ${pricing.usd.finalPrice.toFixed(2)}/month
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Save ${pricing.usd.savings.toFixed(2)}/month
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  💳 Monthly recurring subscription
                  {discountConfig.discountAvail && (
                    <span className="block text-green-600 dark:text-green-400 font-medium">
                      {discountConfig.discountAvail}
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* INR Pricing */}
            {pricing.inr && (
              <div>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground line-through">₹{pricing.inr.originalPrice}</span>
                    <span className="text-lg font-semibold text-foreground">₹{pricing.inr.finalPrice}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Save ₹{pricing.inr.savings}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">🇮🇳 One month access • Discount applied at checkout</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {discountConfig.code && onClaim && (
            <Button
              onClick={handleClaim}
              variant={isCopied ? 'secondary' : 'default'}
              className="flex-1"
              disabled={isCopied}
            >
              {isCopied ? (
                <>
                  <Check className="h-4 w-4" />
                  Code copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  {discountConfig.buttonText || `Copy code: ${discountConfig.code}`}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Redemption Instructions */}
        {discountConfig.code && (
          <Accordion type="single" collapsible className="border-0">
            <AccordionItem value="instructions" className="border-0">
              <AccordionTrigger className="py-2 px-0 hover:no-underline text-sm text-muted-foreground hover:text-foreground">
                <div className="flex items-center gap-2">
                  <Question className="h-4 w-4" />
                  <span>How to redeem this code?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-0">
                <div className="space-y-3 text-sm">
                  {[
                    { step: 1, title: 'Click upgrade', desc: 'Start by clicking the upgrade button' },
                    { step: 2, title: 'Find discount section', desc: 'Look for "Discount" on checkout page' },
                    { step: 3, title: 'Enter code', desc: `Paste: ${discountConfig.code}` },
                    { step: 4, title: 'Click apply', desc: 'Click "Apply" to activate discount' },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                        {step}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{title}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

export default DiscountBanner;
