import React from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { BinocularsIcon, BookOpen01Icon } from '@hugeicons/core-free-icons';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { ChatHistoryDialog } from '@/components/chat-history-dialog';
import { SignInPromptDialog } from '@/components/sign-in-prompt-dialog';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CheckIcon } from 'lucide-react';
import { PRICING } from '@/lib/constants';
import { DiscountConfig } from '@/lib/discount';
import { getDiscountConfigAction } from '@/app/actions';
import { useState, useEffect, useMemo } from 'react';

// Pro Badge Component
const ProBadge = ({ className = '' }: { className?: string }) => (
  <span
    className={`font-baumans! inline-flex items-center gap-1 rounded-lg shadow-sm border-transparent ring-offset-1 ring-offset-background/50 bg-gradient-to-br from-secondary/25 via-primary/20 to-accent/25 text-foreground px-2.5 pb-2.5 pt-1.5 leading-3 dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground ${className}`}
  >
    <span>pro</span>
  </span>
);

interface PostMessageUpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PostMessageUpgradeDialog = React.memo(({ open, onOpenChange }: PostMessageUpgradeDialogProps) => {
  const [discountConfig, setDiscountConfig] = useState<DiscountConfig | null>(null);

  useEffect(() => {
    const fetchDiscountConfig = async () => {
      try {
        const config = await getDiscountConfigAction();
        setDiscountConfig(config);
      } catch (error) {
        console.warn('Failed to fetch discount config:', error);
      }
    };

    if (open) {
      fetchDiscountConfig();
    }
  }, [open]);

  const pricing = useMemo(() => {
    const defaultUSDPrice = PRICING.PRO_MONTHLY;
    const defaultINRPrice = PRICING.PRO_MONTHLY_INR;

    if (!discountConfig) {
      return {
        usd: { finalPrice: defaultUSDPrice, hasDiscount: false, originalPrice: defaultUSDPrice },
        inr: { finalPrice: defaultINRPrice, hasDiscount: false, originalPrice: defaultINRPrice },
      };
    }

    // Check if discount should be applied
    const isDevMode = discountConfig?.dev || process.env.NODE_ENV === 'development';
    const shouldApplyDiscount = isDevMode
      ? discountConfig?.code && discountConfig?.message
      : discountConfig?.enabled && discountConfig?.code && discountConfig?.message;

    // Calculate USD pricing with discount
    const usdOriginalPrice: number = defaultUSDPrice;
    let usdFinalPrice: number = defaultUSDPrice;
    let hasUSDDiscount = false;

    if (shouldApplyDiscount) {
      if (discountConfig.finalPrice && discountConfig.finalPrice < defaultUSDPrice) {
        usdFinalPrice = discountConfig.finalPrice;
        hasUSDDiscount = true;
      } else if (discountConfig.percentage) {
        usdFinalPrice = Number((defaultUSDPrice * (1 - discountConfig.percentage / 100)).toFixed(2));
        hasUSDDiscount = true;
      }
    }

    // Calculate INR pricing with discount
    const inrOriginalPrice: number = defaultINRPrice;
    let inrFinalPrice: number = defaultINRPrice;
    let hasINRDiscount = false;

    if (shouldApplyDiscount && discountConfig.inrPrice && discountConfig.inrPrice < defaultINRPrice) {
      inrFinalPrice = discountConfig.inrPrice;
      hasINRDiscount = true;
    }

    return {
      usd: {
        finalPrice: usdFinalPrice,
        originalPrice: usdOriginalPrice,
        hasDiscount: hasUSDDiscount,
      },
      inr: discountConfig.inrPrice
        ? {
            finalPrice: inrFinalPrice,
            originalPrice: inrOriginalPrice,
            hasDiscount: hasINRDiscount,
          }
        : null,
    };
  }, [discountConfig]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden gap-0 bg-background sm:max-w-[420px]" showCloseButton={false}>
        <DialogHeader className="p-0">
          <div className="relative h-80 overflow-hidden rounded-t-lg">
            <Image
              src="/placeholder.png"
              alt="Scira Pro"
              width={1200}
              height={630}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <div className="mb-3">
                {discountConfig &&
                  (() => {
                    const isDevMode = discountConfig.dev || process.env.NODE_ENV === 'development';
                    const shouldShowDiscount = isDevMode
                      ? discountConfig.code && discountConfig.message
                      : discountConfig.enabled && discountConfig.code && discountConfig.message;

                    return (
                      shouldShowDiscount && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-white text-sm font-medium">
                          {pricing.usd.hasDiscount
                            ? discountConfig.percentage
                              ? `${discountConfig.percentage}% OFF`
                              : `$${(pricing.usd.originalPrice - pricing.usd.finalPrice).toFixed(2)} OFF`
                            : discountConfig.message || 'Special Offer'}
                        </div>
                      )
                    );
                  })()}
              </div>
              <DialogTitle className="flex items-center gap-3 text-white mb-2">
                <span className="text-4xl font-medium flex items-center gap-2 font-be-vietnam-pro">
                  scira
                  <ProBadge className="!text-white !bg-white/20 !ring-white/30 font-light text-xl !tracking-normal" />
                </span>
              </DialogTitle>
              <DialogDescription className="text-white/90">
                <div className="flex items-center gap-2 mb-2">
                  {pricing.usd.hasDiscount ? (
                    <>
                      <span className="text-lg text-white/60 line-through">${pricing.usd.originalPrice}</span>
                      <span className="text-2xl font-bold">${pricing.usd.finalPrice.toFixed(2)}</span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold">${pricing.usd.finalPrice}</span>
                  )}
                  <span className="text-sm text-white/80">/month</span>
                </div>
                {pricing.inr && (
                  <div className="flex items-center gap-2 mb-2">
                    {pricing.inr.hasDiscount ? (
                      <>
                        <span className="text-sm text-white/60 line-through">₹{pricing.inr.originalPrice}</span>
                        <span className="text-lg font-semibold">₹{pricing.inr.finalPrice}</span>
                      </>
                    ) : (
                      <span className="text-lg font-semibold">₹{pricing.inr.finalPrice}</span>
                    )}
                    <span className="text-sm text-white/80">for a month</span>
                  </div>
                )}
                <p className="text-sm text-white/80 text-left">
                  Unlock unlimited searches, advanced AI models, and premium features to supercharge your research.
                </p>
              </DialogDescription>
              <Button
                onClick={() => {
                  window.location.href = '/pricing';
                }}
                className="backdrop-blur-md bg-white/90 border border-white/20 text-black hover:bg-white w-full font-medium mt-3"
              >
                {discountConfig?.buttonText || 'Upgrade to Pro'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-6 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <CheckIcon className="size-4 text-primary flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Scira Lookout</p>
              <p className="text-xs text-muted-foreground">Automated search monitoring on your schedule</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <CheckIcon className="size-4 text-primary flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Unlimited Searches</p>
              <p className="text-xs text-muted-foreground">No daily limits on your research</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <CheckIcon className="size-4 text-primary flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Advanced AI Models</p>
              <p className="text-xs text-muted-foreground">
                Access to all AI models including Grok 4, Claude 4 Sonnet and GPT-5
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <CheckIcon className="size-4 text-primary flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Priority Support</p>
              <p className="text-xs text-muted-foreground">Get help when you need it most</p>
            </div>
          </div>

          <div className="flex gap-2 w-full items-center mt-4">
            <div className="flex-1 border-b border-foreground/10" />
            <p className="text-xs text-foreground/50">Cancel anytime • Secure payment</p>
            <div className="flex-1 border-b border-foreground/10" />
          </div>

          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-muted-foreground hover:text-foreground mt-2"
            size="sm"
          >
            Not now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

PostMessageUpgradeDialog.displayName = 'PostMessageUpgradeDialog';

interface LookoutAnnouncementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LookoutAnnouncementDialog = React.memo(({ open, onOpenChange }: LookoutAnnouncementDialogProps) => {
  const router = useRouter();
  const [isMac, setIsMac] = React.useState(false);

  React.useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!open) return;

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        router.push('/lookout');
        onOpenChange(false);
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        router.push('/blog');
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [open, router, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg p-0 gap-0 max-h-[85svh] sm:max-h-[90vh] overflow-y-auto bg-background"
        showCloseButton={false}
      >
        <DialogHeader className="p-0">
          <div className="relative h-40 sm:h-48 overflow-hidden rounded-t-lg">
            <Image
              src="/lookout-promo.png"
              alt="Scira Lookout"
              width={1200}
              height={630}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-white text-sm font-medium mb-3">
                New Feature
              </div>
              <DialogTitle className="text-white text-xl sm:text-2xl font-bold tracking-tight">
                Introducing Scira Lookout
              </DialogTitle>
              <DialogDescription className="text-white/80 text-sm mt-1">
                Automated search monitoring on your schedule
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-6 space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Set up searches that track trends, monitor developments, and keep you informed without manual effort.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">Schedule searches to run automatically</span>
              </div>
              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">Receive notifications when results are ready</span>
              </div>
              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">Access comprehensive search history</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => {
                  router.push('/lookout');
                  onOpenChange(false);
                }}
                className="w-full sm:flex-1 group"
              >
                <HugeiconsIcon icon={BinocularsIcon} size={16} color="currentColor" strokeWidth={2} className="mr-2" />
                Explore Lookout
                <span className="sm:ml-auto text-xs font-mono hidden sm:inline opacity-60">⌘ ⏎</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  router.push('/blog');
                  onOpenChange(false);
                }}
                className="w-full sm:flex-1 group shadow-none"
              >
                <HugeiconsIcon icon={BookOpen01Icon} size={16} color="currentColor" strokeWidth={2} className="mr-2" />
                Read Blog
                <span className="sm:ml-auto font-mono text-xs hidden sm:inline opacity-60">
                  {isMac ? '⌘' : 'Ctrl'} B
                </span>
              </Button>
            </div>

            <div className="flex gap-2 w-full items-center mt-4">
              <div className="flex-1 border-b border-foreground/10" />
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                size="sm"
                className="text-muted-foreground hover:text-foreground text-xs px-3"
              >
                Maybe later
              </Button>
              <div className="flex-1 border-b border-foreground/10" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

LookoutAnnouncementDialog.displayName = 'LookoutAnnouncementDialog';

interface ChatDialogsProps {
  commandDialogOpen: boolean;
  setCommandDialogOpen: (open: boolean) => void;
  showSignInPrompt: boolean;
  setShowSignInPrompt: (open: boolean) => void;
  hasShownSignInPrompt: boolean;
  setHasShownSignInPrompt: (value: boolean) => void;
  showUpgradeDialog: boolean;
  setShowUpgradeDialog: (open: boolean) => void;
  hasShownUpgradeDialog: boolean;
  setHasShownUpgradeDialog: (value: boolean) => void;
  showLookoutAnnouncement: boolean;
  setShowLookoutAnnouncement: (open: boolean) => void;
  hasShownLookoutAnnouncement: boolean;
  setHasShownLookoutAnnouncement: (value: boolean) => void;
  user: any;
  setAnyDialogOpen: (open: boolean) => void;
}

export const ChatDialogs = React.memo(
  ({
    commandDialogOpen,
    setCommandDialogOpen,
    showSignInPrompt,
    setShowSignInPrompt,
    hasShownSignInPrompt,
    setHasShownSignInPrompt,
    showUpgradeDialog,
    setShowUpgradeDialog,
    hasShownUpgradeDialog,
    setHasShownUpgradeDialog,
    showLookoutAnnouncement,
    setShowLookoutAnnouncement,
    hasShownLookoutAnnouncement,
    setHasShownLookoutAnnouncement,
    user,
    setAnyDialogOpen,
  }: ChatDialogsProps) => {
    return (
      <>
        {/* Chat History Dialog */}
        <ChatHistoryDialog
          open={commandDialogOpen}
          onOpenChange={(open) => {
            setCommandDialogOpen(open);
            setAnyDialogOpen(open);
          }}
          user={user}
        />

        {/* Sign-in Prompt Dialog */}
        <SignInPromptDialog
          open={showSignInPrompt}
          onOpenChange={(open) => {
            setShowSignInPrompt(open);
            if (!open) {
              setHasShownSignInPrompt(true);
            }
          }}
        />

        {/* Post-Message Upgrade Dialog */}
        <PostMessageUpgradeDialog
          open={showUpgradeDialog}
          onOpenChange={(open) => {
            setShowUpgradeDialog(open);
            if (!open) {
              setHasShownUpgradeDialog(true);
            }
          }}
        />

        {/* Lookout Announcement Dialog */}
        <LookoutAnnouncementDialog
          open={showLookoutAnnouncement}
          onOpenChange={(open) => {
            setShowLookoutAnnouncement(open);
            if (!open) {
              setHasShownLookoutAnnouncement(true);
            }
          }}
        />
      </>
    );
  },
);

ChatDialogs.displayName = 'ChatDialogs';
