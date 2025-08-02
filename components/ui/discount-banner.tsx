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
    const interval = setInterval(updateTimeLeft, 1000);
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
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Calculate pricing if not provided but percentage and originalPrice are available
  const calculatePricing = () => {
    const defaultUSDPrice = PRICING.PRO_MONTHLY;
    const defaultINRPrice = PRICING.PRO_MONTHLY_INR;

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

  const isDevMode = discountConfig.dev || process.env.NODE_ENV === 'development';
  const shouldShow = isDevMode
    ? discountConfig.code && discountConfig.message
    : discountConfig.enabled && discountConfig.code && discountConfig.message;

  if (!shouldShow || !isVisible) {
    return null;
  }

  return (
    <Card className={cn('border border-border/50 bg-gradient-to-r from-background to-muted/20', className)}>
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Message and Discount */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {discountConfig.percentage && (
                <Badge
                  variant="secondary"
                  className="h-5 px-2 text-xs font-medium bg-primary/10 text-primary border-primary/20"
                >
                  <Percent className="h-3 w-3 mr-1" />
                  {discountConfig.percentage}% OFF
                </Badge>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground leading-tight">
                {discountConfig.message || 'Special Offer Available'}
              </p>
              {pricing && (
                <div className="flex items-center gap-2 mt-0.5">
                  {pricing.usd && (
                    <span className="text-xs text-muted-foreground">
                      <span className="line-through">${pricing.usd.originalPrice}</span>
                      <span className="ml-1 font-medium text-foreground">${pricing.usd.finalPrice.toFixed(2)}/mo</span>
                    </span>
                  )}
                  {pricing.inr && (
                    <span className="text-xs text-muted-foreground">
                      <span className="line-through">₹{pricing.inr.originalPrice}</span>
                      <span className="ml-1 font-medium text-foreground">₹{pricing.inr.finalPrice}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center: Countdown Timer */}
          {timeLeft && timeLeft !== 'Expired' && (
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <div className="flex items-center gap-1">
                {countdownTime.days > 0 && (
                  <>
                    <div className="bg-muted border rounded px-1.5 py-0.5 min-w-[28px] text-center">
                      <span className="text-xs font-mono font-medium">
                        <SlidingNumber value={countdownTime.days} padStart={true} />
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">d</span>
                  </>
                )}
                <div className="bg-muted border rounded px-1.5 py-0.5 min-w-[28px] text-center">
                  <span className="text-xs font-mono font-medium">
                    <SlidingNumber value={countdownTime.hours} padStart={true} />
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">h</span>
                <div className="bg-muted border rounded px-1.5 py-0.5 min-w-[28px] text-center">
                  <span className="text-xs font-mono font-medium">
                    <SlidingNumber value={countdownTime.minutes} padStart={true} />
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">m</span>
                <div className="bg-muted border rounded px-1.5 py-0.5 min-w-[28px] text-center">
                  <span className="text-xs font-mono font-medium">
                    <SlidingNumber value={countdownTime.seconds} padStart={true} />
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">s</span>
              </div>
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {discountConfig.code && onClaim && (
              <Button
                onClick={handleClaim}
                variant={isCopied ? 'secondary' : 'default'}
                size="sm"
                className="h-7 px-3 text-xs"
                disabled={isCopied}
              >
                {isCopied ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 mr-1" />
                    {discountConfig.code}
                  </>
                )}
              </Button>
            )}

            {onClose && (
              <Button variant="ghost" size="sm" onClick={handleClose} className="h-7 w-7 p-0">
                <X className="h-3 w-3" />
                <span className="sr-only">Close</span>
              </Button>
            )}
          </div>
        </div>

        {/* Expandable Instructions */}
        {discountConfig.code && (
          <Accordion type="single" collapsible className="mt-2">
            <AccordionItem value="instructions" className="border-0">
              <AccordionTrigger className="py-1 px-0 hover:no-underline text-xs text-muted-foreground hover:text-foreground data-[state=open]:text-foreground">
                <div className="flex items-center gap-1.5">
                  <Question className="h-3 w-3" />
                  <span>How to redeem?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {[
                    { step: '1', text: 'Click upgrade' },
                    { step: '2', text: 'Find discount section' },
                    { step: '3', text: `Enter ${discountConfig.code}` },
                    { step: '4', text: 'Click apply' },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                        {step}
                      </div>
                      <span className="text-muted-foreground">{text}</span>
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
