/* eslint-disable @next/next/no-img-element */
// /components/ui/form-component.tsx
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  models,
  requiresAuthentication,
  requiresProSubscription,
  hasVisionSupport,
  hasPdfSupport,
  getAcceptedFileTypes,
  shouldBypassRateLimits,
} from '@/ai/providers';
import { X, Check, ChevronsUpDown, Wand2, Upload, CheckIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { cn, SearchGroup, SearchGroupId, getSearchGroups, SearchProvider } from '@/lib/utils';

// Pro Badge Component
const ProBadge = ({ className = '' }: { className?: string }) => (
  <span
    className={`font-baumans inline-flex items-center gap-1 rounded-lg shadow-sm !border-none !outline-0 ring-offset-1 !ring-offset-background/50 bg-gradient-to-br from-secondary/25 via-primary/20 to-accent/25 text-foreground px-2.5 pt-0.5 !pb-2 sm:pt-1 leading-3 dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground ${className}`}
  >
    <span>pro</span>
  </span>
);
import { track } from '@vercel/analytics';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ComprehensiveUserData } from '@/hooks/use-user-data';
import { useSession } from '@/lib/auth-client';
import { checkImageModeration, enhancePrompt, getDiscountConfigAction } from '@/app/actions';
import { DiscountConfig } from '@/lib/discount';
import { PRICING } from '@/lib/constants';
import { LockIcon, MagicWandIcon } from '@phosphor-icons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  CpuIcon,
  GlobalSearchIcon,
  AiMicIcon,
  AtomicPowerIcon,
  Crown02Icon,
  DocumentAttachmentIcon,
  BinocularsIcon,
} from '@hugeicons/core-free-icons';
import { AudioLinesIcon } from '@/components/ui/audio-lines';
import { GripIcon } from '@/components/ui/grip';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UseChatHelpers } from '@ai-sdk/react';
import { ChatMessage } from '@/lib/types';
import { useLocation } from '@/hooks/use-location';
import { useLocalStorage } from '@/hooks/use-local-storage';

interface ModelSwitcherProps {
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  className?: string;
  attachments: Array<Attachment>;
  messages: Array<ChatMessage>;
  status: UseChatHelpers<ChatMessage>['status'];
  onModelSelect?: (model: (typeof models)[0]) => void;
  subscriptionData?: any;
  user?: ComprehensiveUserData | null;
}

const ModelSwitcher: React.FC<ModelSwitcherProps> = React.memo(
  ({
    selectedModel,
    setSelectedModel,
    className,
    attachments,
    messages,
    status,
    onModelSelect,
    subscriptionData,
    user,
  }) => {
    const isProUser = useMemo(
      () =>
        user?.isProUser || (subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active'),
      [user?.isProUser, subscriptionData?.hasSubscription, subscriptionData?.subscription?.status],
    );

    const isSubscriptionLoading = useMemo(() => user && !subscriptionData, [user, subscriptionData]);

    const availableModels = useMemo(() => models, []);

    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const [showSignInDialog, setShowSignInDialog] = useState(false);
    const [selectedProModel, setSelectedProModel] = useState<(typeof models)[0] | null>(null);
    const [selectedAuthModel, setSelectedAuthModel] = useState<(typeof models)[0] | null>(null);
    const [open, setOpen] = useState(false);
    const [discountConfig, setDiscountConfig] = useState<DiscountConfig | null>(null);

    const location = useLocation();

    // Fetch discount config when needed
    const fetchDiscountConfig = useCallback(async () => {
      if (discountConfig) return; // Already fetched

      try {
        const config = await getDiscountConfigAction();
        setDiscountConfig(config);
      } catch (error) {
        console.error('Failed to fetch discount config:', error);
      }
    }, [discountConfig]);

    // Calculate pricing with discounts
    const calculatePricing = useCallback(() => {
      const defaultUSDPrice = PRICING.PRO_MONTHLY;
      const defaultINRPrice = PRICING.PRO_MONTHLY_INR;

      // Check if discount should be applied
      const isDevMode = discountConfig?.dev || process.env.NODE_ENV === 'development';
      const shouldApplyDiscount = isDevMode
        ? discountConfig?.code && discountConfig?.message
        : discountConfig?.enabled && discountConfig?.code && discountConfig?.message;

      if (!discountConfig || !shouldApplyDiscount) {
        return {
          usd: { originalPrice: defaultUSDPrice, finalPrice: defaultUSDPrice, hasDiscount: false },
          inr: location.isIndia
            ? { originalPrice: defaultINRPrice, finalPrice: defaultINRPrice, hasDiscount: false }
            : null,
        };
      }

      // USD pricing: prefer explicit finalPrice over percentage
      let usdPricing: { originalPrice: number; finalPrice: number; hasDiscount: boolean } = {
        originalPrice: defaultUSDPrice,
        finalPrice: defaultUSDPrice,
        hasDiscount: false,
      };
      if (typeof discountConfig.finalPrice === 'number') {
        const original =
          typeof discountConfig.originalPrice === 'number' ? discountConfig.originalPrice : defaultUSDPrice;
        usdPricing = {
          originalPrice: original,
          finalPrice: discountConfig.finalPrice,
          hasDiscount: true,
        };
      } else if (typeof discountConfig.percentage === 'number') {
        const base = typeof discountConfig.originalPrice === 'number' ? discountConfig.originalPrice : defaultUSDPrice;
        const usdSavings = (base * discountConfig.percentage) / 100;
        const usdFinalPrice = base - usdSavings;
        usdPricing = {
          originalPrice: base,
          finalPrice: usdFinalPrice,
          hasDiscount: true,
        };
      }

      // INR pricing: prefer explicit inrPrice, otherwise derive from percentage
      let inrPricing: { originalPrice: number; finalPrice: number; hasDiscount: boolean } | null = null;
      if (location.isIndia) {
        if (typeof discountConfig.inrPrice === 'number') {
          inrPricing = {
            originalPrice: defaultINRPrice,
            finalPrice: discountConfig.inrPrice,
            hasDiscount: true,
          };
        } else if (typeof discountConfig.percentage === 'number') {
          const inrSavings = (defaultINRPrice * discountConfig.percentage) / 100;
          const inrFinalPrice = defaultINRPrice - inrSavings;
          inrPricing = {
            originalPrice: defaultINRPrice,
            finalPrice: inrFinalPrice,
            hasDiscount: true,
          };
        } else {
          inrPricing = {
            originalPrice: defaultINRPrice,
            finalPrice: defaultINRPrice,
            hasDiscount: false,
          };
        }
      }

      return {
        usd: usdPricing,
        inr: inrPricing,
      };
    }, [discountConfig, location.isIndia]);

    const pricing = calculatePricing();

    const isFilePart = useCallback((p: unknown): p is { type: 'file'; mediaType?: string } => {
      return (
        typeof p === 'object' &&
        p !== null &&
        'type' in (p as Record<string, unknown>) &&
        (p as { type: unknown }).type === 'file'
      );
    }, []);

    const hasImageAttachments = useMemo(() => {
      const attachmentHasImage = attachments.some((att) => {
        const ct = att.contentType || att.mediaType || '';
        return ct.startsWith('image/');
      });
      const messagesHaveImage = messages.some((msg) =>
        (msg.parts || []).some(
          (part) => isFilePart(part) && typeof part.mediaType === 'string' && part.mediaType.startsWith('image/'),
        ),
      );
      return attachmentHasImage || messagesHaveImage;
    }, [attachments, messages, isFilePart]);

    const hasPdfAttachments = useMemo(() => {
      const attachmentHasPdf = attachments.some((att) => {
        const ct = att.contentType || att.mediaType || '';
        return ct === 'application/pdf';
      });
      const messagesHavePdf = messages.some((msg) =>
        (msg.parts || []).some(
          (part) => isFilePart(part) && typeof part.mediaType === 'string' && part.mediaType === 'application/pdf',
        ),
      );
      return attachmentHasPdf || messagesHavePdf;
    }, [attachments, messages, isFilePart]);

    const filteredModels = useMemo(() => {
      if (!hasImageAttachments && !hasPdfAttachments) {
        return availableModels;
      }
      if (hasImageAttachments && hasPdfAttachments) {
        return availableModels.filter((model) => model.vision && model.pdf);
      }
      if (hasImageAttachments) {
        return availableModels.filter((model) => model.vision);
      }
      // Only PDFs attached
      return availableModels.filter((model) => model.pdf);
    }, [availableModels, hasImageAttachments, hasPdfAttachments]);

    const sortedModels = useMemo(() => filteredModels, [filteredModels]);

    const groupedModels = useMemo(
      () =>
        sortedModels.reduce(
          (acc, model) => {
            const category = model.category;
            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push(model);
            return acc;
          },
          {} as Record<string, typeof availableModels>,
        ),
      [sortedModels],
    );

    const orderedGroupEntries = useMemo(() => {
      const groupOrder = ['Free', 'Pro', 'Experimental'];
      return groupOrder
        .filter((category) => groupedModels[category] && groupedModels[category].length > 0)
        .map((category) => [category, groupedModels[category]] as const);
    }, [groupedModels]);

    const currentModel = useMemo(
      () => availableModels.find((m) => m.value === selectedModel),
      [availableModels, selectedModel],
    );

    // Auto-switch away from pro models when user loses pro access
    useEffect(() => {
      if (isSubscriptionLoading) return;

      const currentModelRequiresPro = requiresProSubscription(selectedModel);
      const currentModelExists = availableModels.find((m) => m.value === selectedModel);

      // If current model requires pro but user is not pro, switch to default
      // Also prevent infinite loops by ensuring we're not already on the default model
      if (currentModelExists && currentModelRequiresPro && !isProUser && selectedModel !== 'scira-default') {
        console.log(`Auto-switching from pro model '${selectedModel}' to 'scira-default' - user lost pro access`);
        setSelectedModel('scira-default');

        // Show a toast notification to inform the user
        toast.info('Switched to default model - Pro subscription required for premium models');
      }
    }, [selectedModel, isProUser, isSubscriptionLoading, setSelectedModel, availableModels]);

    const handleModelChange = useCallback(
      (value: string) => {
        const model = availableModels.find((m) => m.value === value);
        if (!model) return;

        const requiresAuth = requiresAuthentication(model.value) && !user;
        const requiresPro = requiresProSubscription(model.value) && !isProUser;

        if (isSubscriptionLoading) {
          return;
        }

        if (requiresAuth) {
          setSelectedAuthModel(model);
          setShowSignInDialog(true);
          return;
        }

        if (requiresPro && !isProUser) {
          setSelectedProModel(model);
          fetchDiscountConfig();
          setShowUpgradeDialog(true);
          return;
        }

        console.log('Selected model:', model.value);
        setSelectedModel(model.value.trim());

        if (onModelSelect) {
          onModelSelect(model);
        }
      },
      [availableModels, user, isProUser, isSubscriptionLoading, setSelectedModel, onModelSelect],
    );

    return (
      <>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              size="sm"
              className={cn(
                'flex items-center gap-2 px-3 h-7.5 rounded-lg',
                'border border-border',
                'bg-background text-foreground',
                'hover:bg-accent transition-colors',
                'focus:!outline-none focus:!ring-0',
                'shadow-none',
                className,
              )}
            >
              <HugeiconsIcon icon={CpuIcon} size={24} color="currentColor" strokeWidth={2} />
              <span className="text-xs font-medium sm:block hidden">{currentModel?.label || 'Select Model'}</span>
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[90vw] sm:w-[16em] max-w-[16em] p-0 font-sans rounded-lg bg-popover z-40 border !shadow-none"
            align="start"
            side="bottom"
            sideOffset={4}
            avoidCollisions={true}
            collisionPadding={8}
          >
            <Command
              className="rounded-lg"
              filter={(value, search) => {
                const model = availableModels.find((m) => m.value === value);
                if (!model || !search) return 1;

                const searchTerm = search.toLowerCase();
                const searchableFields = [
                  model.label,
                  model.description,
                  model.category,
                  model.vision ? 'vision' : '',
                  model.reasoning ? 'reasoning' : '',
                  model.pdf ? 'pdf' : '',
                  model.experimental ? 'experimental' : '',
                  model.pro ? 'pro' : '',
                  model.requiresAuth ? 'auth' : '',
                ]
                  .join(' ')
                  .toLowerCase();

                return searchableFields.includes(searchTerm) ? 1 : 0;
              }}
            >
              <CommandInput placeholder="Search models..." className="h-9" />
              <CommandEmpty>No model found.</CommandEmpty>
              <CommandList className="max-h-[15em]">
                {orderedGroupEntries.map(([category, categoryModels], categoryIndex) => (
                  <CommandGroup key={category}>
                    {categoryIndex > 0 && <div className="my-1 border-t border-border" />}
                    <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground">{category} Models</div>
                    {categoryModels.map((model) => {
                      const requiresAuth = requiresAuthentication(model.value) && !user;
                      const requiresPro = requiresProSubscription(model.value) && !isProUser;
                      const isLocked = requiresAuth || requiresPro;

                      if (isLocked) {
                        return (
                          <div
                            key={model.value}
                            className={cn(
                              'flex items-center justify-between px-2 py-1.5 mb-0.5 rounded-lg text-xs cursor-pointer',
                              'transition-all duration-200',
                              'opacity-50 hover:opacity-70 hover:bg-accent',
                            )}
                            onClick={() => {
                              if (isSubscriptionLoading) {
                                return;
                              }

                              if (requiresAuth) {
                                setSelectedAuthModel(model);
                                setShowSignInDialog(true);
                              } else if (requiresPro && !isProUser) {
                                setSelectedProModel(model);
                                fetchDiscountConfig();
                                setShowUpgradeDialog(true);
                              }
                            }}
                          >
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="font-medium truncate text-[11px] flex items-center gap-1">
                                {model.label}
                                {requiresAuth ? (
                                  <LockIcon className="size-3 text-muted-foreground" />
                                ) : (
                                  <HugeiconsIcon
                                    icon={Crown02Icon}
                                    size={12}
                                    color="currentColor"
                                    strokeWidth={1.5}
                                    className="text-muted-foreground"
                                  />
                                )}
                              </div>
                              <div className="text-[9px] text-muted-foreground truncate leading-tight">
                                {model.description}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <CommandItem
                          key={model.value}
                          value={model.value}
                          onSelect={(currentValue) => {
                            handleModelChange(currentValue);
                            setOpen(false);
                          }}
                          className={cn(
                            'flex items-center justify-between px-2 py-1.5 mb-0.5 rounded-lg text-xs',
                            'transition-all duration-200',
                            'hover:bg-accent',
                            'data-[selected=true]:bg-accent',
                          )}
                        >
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="font-medium truncate text-[11px] flex items-center gap-1">
                              {model.label}
                              {(() => {
                                const requiresAuth = requiresAuthentication(model.value) && !user;
                                const requiresPro = requiresProSubscription(model.value) && !isProUser;

                                if (requiresAuth) {
                                  return <LockIcon className="size-3 text-muted-foreground" />;
                                } else if (requiresPro) {
                                  return (
                                    <HugeiconsIcon
                                      icon={Crown02Icon}
                                      size={12}
                                      color="currentColor"
                                      strokeWidth={1.5}
                                      className="text-muted-foreground"
                                    />
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <div className="text-[9px] text-muted-foreground truncate leading-tight">
                              {model.description}
                            </div>
                          </div>
                          <Check
                            className={cn(
                              'ml-auto h-4 w-4',
                              selectedModel === model.value ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent className="p-0 overflow-hidden gap-0 bg-background sm:max-w-[450px]" showCloseButton={false}>
            <DialogHeader className="p-2">
              <div className="relative w-full p-6 rounded-md text-white overflow-hidden">
                <div className="absolute inset-0 bg-[url('/placeholder.png')] bg-cover bg-center rounded-sm">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10"></div>
                </div>
                <div className="relative z-10 flex flex-col gap-4">
                  <DialogTitle className="flex items-start gap-3 text-white">
                    <div className="flex flex-col gap-2 min-w-0 flex-1">
                      {selectedProModel?.label ? (
                        <>
                          <div className="flex flex-col gap-1">
                            <span className="text-lg sm:text-xl font-bold truncate">{selectedProModel.label}</span>
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-white/80">requires</span>
                              <ProBadge className="!text-white !bg-white/20 !ring-white/30 font-extralight" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xl sm:text-2xl font-be-vietnam-pro">Scira</span>
                          <ProBadge className="!text-white !bg-white/20 !ring-white/30 font-extralight" />
                        </div>
                      )}
                    </div>
                  </DialogTitle>
                  <DialogDescription className="text-white/90">
                    {discountConfig &&
                      (() => {
                        const isDevMode = discountConfig.dev || process.env.NODE_ENV === 'development';
                        const shouldShowDiscount = isDevMode
                          ? discountConfig.code && discountConfig.message && discountConfig.percentage
                          : discountConfig.enabled &&
                            discountConfig.code &&
                            discountConfig.message &&
                            discountConfig.percentage;

                        if (shouldShowDiscount && discountConfig.showPrice && discountConfig.finalPrice) {
                          return (
                            <div className="flex items-center gap-2 mb-2">
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-white text-sm font-medium">
                                {discountConfig.showPrice && discountConfig.finalPrice
                                  ? `$${PRICING.PRO_MONTHLY - discountConfig.finalPrice} OFF for a year`
                                  : discountConfig.percentage
                                    ? `${discountConfig.percentage}% OFF`
                                    : 'DISCOUNT'}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    <div className="flex items-center gap-2">
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
                    <p className="text-sm text-white/80 text-left mt-2">
                      {selectedProModel?.label
                        ? 'Upgrade to access premium AI models and features'
                        : 'Unlock advanced AI models, unlimited searches, and premium features'}
                    </p>
                  </DialogDescription>
                  <Button
                    onClick={() => {
                      window.location.href = '/pricing';
                    }}
                    className="backdrop-blur-md bg-white/90 border border-white/20 text-black hover:bg-white w-full font-medium"
                  >
                    Upgrade to Pro
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 py-6 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Advanced AI Models</p>
                  <p className="text-xs text-muted-foreground">
                    Access to all AI models including Grok 4, Claude and GPT-5
                  </p>
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
                  <p className="text-sm font-medium text-foreground">Prompt Enhancement</p>
                  <p className="text-xs text-muted-foreground">AI-powered prompt optimization</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Scira Lookout</p>
                  <p className="text-xs text-muted-foreground">Automated search monitoring on your schedule</p>
                </div>
              </div>

              <div className="flex gap-2 w-full items-center mt-4">
                <div className="flex-1 border-b border-foreground/10" />
                <p className="text-xs text-foreground/50">Cancel anytime • Secure payment</p>
                <div className="flex-1 border-b border-foreground/10" />
              </div>

              <Button
                variant="ghost"
                onClick={() => setShowUpgradeDialog(false)}
                className="w-full text-muted-foreground hover:text-foreground mt-2"
                size="sm"
              >
                Not now
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
          <DialogContent className="sm:max-w-[420px] p-0 gap-0 bg-background" showCloseButton={false}>
            <DialogHeader className="p-2">
              <div className="relative w-full p-6 rounded-md text-white overflow-hidden">
                <div className="absolute inset-0 bg-[url('/placeholder.png')] bg-cover bg-center rounded-sm">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10"></div>
                </div>
                <div className="relative z-10 flex flex-col gap-4">
                  <DialogTitle className="flex items-center gap-3 text-white">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4 text-white"
                      >
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <span className="text-lg sm:text-xl font-bold">Sign in required</span>
                      {selectedAuthModel?.label && (
                        <span className="text-sm text-white/70 truncate">for {selectedAuthModel.label}</span>
                      )}
                    </div>
                  </DialogTitle>
                  <DialogDescription className="text-white/90">
                    <p className="text-sm text-white/80 text-left">
                      {selectedAuthModel?.label
                        ? `${selectedAuthModel.label} requires an account to access`
                        : 'Create an account to access this AI model and unlock additional features'}
                    </p>
                  </DialogDescription>
                  <Button
                    onClick={() => {
                      window.location.href = '/sign-in';
                    }}
                    className="backdrop-blur-md bg-white/90 border border-white/20 text-black hover:bg-white w-full font-medium"
                  >
                    Sign in
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 py-6 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Access better models</p>
                  <p className="text-xs text-muted-foreground">GPT-5 Nano and more premium models</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Save search history</p>
                  <p className="text-xs text-muted-foreground">Keep track of your conversations</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Free to start</p>
                  <p className="text-xs text-muted-foreground">No payment required for basic features</p>
                </div>
              </div>

              <div className="flex gap-2 w-full items-center mt-4">
                <div className="flex-1 border-b border-foreground/10" />
                <Button
                  variant="ghost"
                  onClick={() => setShowSignInDialog(false)}
                  size="sm"
                  className="text-muted-foreground hover:text-foreground text-xs px-3"
                >
                  Maybe later
                </Button>
                <div className="flex-1 border-b border-foreground/10" />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  },
);

ModelSwitcher.displayName = 'ModelSwitcher';

interface Attachment {
  name: string;
  contentType?: string;
  mediaType?: string;
  url: string;
  size: number;
}

const ArrowUpIcon = ({ size = 16 }: { size?: number }) => {
  return (
    <svg height={size} strokeLinejoin="round" viewBox="0 0 16 16" width={size} style={{ color: 'currentcolor' }}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.70711 1.39644C8.31659 1.00592 7.68342 1.00592 7.2929 1.39644L2.21968 6.46966L1.68935 6.99999L2.75001 8.06065L3.28034 7.53032L7.25001 3.56065V14.25V15H8.75001V14.25V3.56065L12.7197 7.53032L13.25 8.06065L14.3107 6.99999L13.7803 6.46966L8.70711 1.39644Z"
        fill="currentColor"
      ></path>
    </svg>
  );
};

const StopIcon = ({ size = 16 }: { size?: number }) => {
  return (
    <svg height={size} viewBox="0 0 16 16" width={size} style={{ color: 'currentcolor' }}>
      <path fillRule="evenodd" clipRule="evenodd" d="M3 3H13V13H3V3Z" fill="currentColor"></path>
    </svg>
  );
};

const PaperclipIcon = ({ size = 16 }: { size?: number }) => {
  return (
    <svg
      height={size}
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      width={size}
      style={{ color: 'currentcolor' }}
      className="-rotate-45"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.8591 1.70735C10.3257 1.70735 9.81417 1.91925 9.437 2.29643L3.19455 8.53886C2.56246 9.17095 2.20735 10.0282 2.20735 10.9222C2.20735 11.8161 2.56246 12.6734 3.19455 13.3055C3.82665 13.9376 4.68395 14.2927 5.57786 14.2927C6.47178 14.2927 7.32908 13.9376 7.96117 13.3055L14.2036 7.06304L14.7038 6.56287L15.7041 7.56321L15.204 8.06337L8.96151 14.3058C8.06411 15.2032 6.84698 15.7074 5.57786 15.7074C4.30875 15.7074 3.09162 15.2032 2.19422 14.3058C1.29682 13.4084 0.792664 12.1913 0.792664 10.9222C0.792664 9.65305 1.29682 8.43592 2.19422 7.53852L8.43666 1.29609C9.07914 0.653606 9.95054 0.292664 10.8591 0.292664C11.7678 0.292664 12.6392 0.653606 13.2816 1.29609C13.9241 1.93857 14.2851 2.80997 14.2851 3.71857C14.2851 4.62718 13.9241 5.49858 13.2816 6.14106L13.2814 6.14133L7.0324 12.3835C7.03231 12.3836 7.03222 12.3837 7.03213 12.3838C6.64459 12.7712 6.11905 12.9888 5.57107 12.9888C5.02297 12.9888 4.49731 12.7711 4.10974 12.3835C3.72217 11.9959 3.50444 11.4703 3.50444 10.9222C3.50444 10.3741 3.72217 9.8484 4.10974 9.46084L4.11004 9.46054L9.877 3.70039L10.3775 3.20051L11.3772 4.20144L10.8767 4.70131L5.11008 10.4612C5.11005 10.4612 5.11003 10.4612 5.11 10.4613C4.98779 10.5835 4.91913 10.7493 4.91913 10.9222C4.91913 11.0951 4.98782 11.2609 5.11008 11.3832C5.23234 11.5054 5.39817 11.5741 5.57107 11.5741C5.74398 11.5741 5.9098 11.5054 6.03206 11.3832L6.03233 11.3829L12.2813 5.14072C12.2814 5.14063 12.2815 5.14054 12.2816 5.14045C12.6586 4.7633 12.8704 4.25185 12.8704 3.71857C12.8704 3.18516 12.6585 2.6736 12.2813 2.29643C11.9041 1.91925 11.3926 1.70735 10.8591 1.70735Z"
        fill="currentColor"
      ></path>
    </svg>
  );
};

const MAX_FILES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_INPUT_CHARS = 50000;

const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Debounce utility function
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
};

const truncateFilename = (filename: string, maxLength: number = 20) => {
  if (filename.length <= maxLength) return filename;
  const extension = filename.split('.').pop();
  const name = filename.substring(0, maxLength - 4);
  return `${name}...${extension}`;
};

const AttachmentPreview: React.FC<{
  attachment: Attachment | UploadingAttachment;
  onRemove: () => void;
  isUploading: boolean;
}> = React.memo(({ attachment, onRemove, isUploading }) => {
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB' + (bytes > MAX_FILE_SIZE ? ' (exceeds 5MB limit)' : '');
  }, []);

  const isUploadingAttachment = useCallback(
    (attachment: Attachment | UploadingAttachment): attachment is UploadingAttachment => {
      return 'progress' in attachment;
    },
    [],
  );

  const isPdf = useCallback(
    (attachment: Attachment | UploadingAttachment): boolean => {
      if (isUploadingAttachment(attachment)) {
        return attachment.file.type === 'application/pdf';
      }
      return (attachment as Attachment).contentType === 'application/pdf';
    },
    [isUploadingAttachment],
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative flex items-center',
        'bg-background/90 backdrop-blur-xs',
        'border border-border/80',
        'rounded-lg p-2 pr-8 gap-2.5',
        'shrink-0 z-0',
        'hover:bg-background',
        'transition-all duration-200',
        'group',
        '!shadow-none',
      )}
    >
      {isUploading ? (
        <div className="w-8 h-8 flex items-center justify-center">
          <svg
            className="animate-spin h-4 w-4 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      ) : isUploadingAttachment(attachment) ? (
        <div className="w-8 h-8 flex items-center justify-center">
          <div className="relative w-6 h-6">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                className="text-muted stroke-current"
                strokeWidth="8"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
              ></circle>
              <circle
                className="text-primary stroke-current"
                strokeWidth="8"
                strokeLinecap="round"
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                strokeDasharray={`${attachment.progress * 251.2}, 251.2`}
                transform="rotate(-90 50 50)"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-medium text-foreground">{Math.round(attachment.progress * 100)}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted shrink-0 ring-1 ring-border flex items-center justify-center">
          {isPdf(attachment) ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-500"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <path d="M9 15v-2h6v2"></path>
              <path d="M12 18v-5"></path>
            </svg>
          ) : (
            <img
              src={(attachment as Attachment).url}
              alt={`Preview of ${attachment.name}`}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      )}
      <div className="grow min-w-0">
        {!isUploadingAttachment(attachment) && (
          <p className="text-xs font-medium truncate text-foreground">{truncateFilename(attachment.name)}</p>
        )}
        <p className="text-[10px] text-muted-foreground">
          {isUploadingAttachment(attachment) ? 'Uploading...' : formatFileSize((attachment as Attachment).size)}
        </p>
      </div>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className={cn(
          'absolute -top-1.5 -right-1.5 p-0.5 m-0 rounded-full',
          'bg-background/90 backdrop-blur-xs',
          'border border-border/80',
          'transition-all duration-200 z-20',
          'opacity-0 group-hover:opacity-100',
          'scale-75 group-hover:scale-100',
          'hover:bg-muted/50',
          '!shadow-none',
        )}
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </motion.button>
    </motion.div>
  );
});

AttachmentPreview.displayName = 'AttachmentPreview';

interface UploadingAttachment {
  file: File;
  progress: number;
}

interface FormComponentProps {
  input: string;
  setInput: (input: string) => void;
  attachments: Array<Attachment>;
  setAttachments: React.Dispatch<React.SetStateAction<Array<Attachment>>>;
  chatId: string;
  user: ComprehensiveUserData | null;
  subscriptionData?: any;
  fileInputRef: React.RefObject<HTMLInputElement>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  stop: () => void;
  messages: Array<ChatMessage>;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  selectedModel: string;
  setSelectedModel: (value: string) => void;
  resetSuggestedQuestions: () => void;
  lastSubmittedQueryRef: React.MutableRefObject<string>;
  selectedGroup: SearchGroupId;
  setSelectedGroup: React.Dispatch<React.SetStateAction<SearchGroupId>>;
  showExperimentalModels: boolean;
  status: UseChatHelpers<ChatMessage>['status'];
  setHasSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
  isLimitBlocked?: boolean;
}

interface GroupSelectorProps {
  selectedGroup: SearchGroupId;
  onGroupSelect: (group: SearchGroup) => void;
  status: UseChatHelpers<ChatMessage>['status'];
}

const GroupModeToggle: React.FC<GroupSelectorProps> = React.memo(({ selectedGroup, onGroupSelect, status }) => {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const isExtreme = selectedGroup === 'extreme';

  // Get search provider from localStorage with reactive updates
  const [searchProvider] = useLocalStorage<SearchProvider>('scira-search-provider', 'parallel');

  // Get dynamic search groups based on the selected search provider
  const dynamicSearchGroups = useMemo(() => getSearchGroups(searchProvider), [searchProvider]);

  // Memoize visible groups calculation
  const visibleGroups = useMemo(
    () =>
      dynamicSearchGroups.filter((group) => {
        if (!group.show) return false;
        if ('requireAuth' in group && group.requireAuth && !session) return false;
        if (group.id === 'extreme') return false; // Exclude extreme from dropdown
        return true;
      }),
    [dynamicSearchGroups, session],
  );

  const selectedGroupData = useMemo(
    () => visibleGroups.find((group) => group.id === selectedGroup),
    [visibleGroups, selectedGroup],
  );

  const handleToggleExtreme = useCallback(() => {
    if (isExtreme) {
      // Switch back to web mode
      const webGroup = dynamicSearchGroups.find((group) => group.id === 'web');
      if (webGroup) {
        onGroupSelect(webGroup);
      }
    } else {
      // Switch to extreme mode
      const extremeGroup = dynamicSearchGroups.find((group) => group.id === 'extreme');
      if (extremeGroup) {
        onGroupSelect(extremeGroup);
      }
    }
  }, [isExtreme, onGroupSelect, dynamicSearchGroups]);

  return (
    <div className="flex items-center">
      {/* Toggle Switch Container */}
      <div className="flex items-center bg-background border border-border rounded-lg !gap-1 !py-1 !px-0.75 h-8">
        {/* Group Selector Side */}
        <Popover open={open && !isExtreme} onOpenChange={(newOpen) => !isExtreme && setOpen(newOpen)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  role="combobox"
                  aria-expanded={open && !isExtreme}
                  size="sm"
                  onClick={() => {
                    if (isExtreme) {
                      // Switch back to web mode when clicking groups in extreme mode
                      const webGroup = dynamicSearchGroups.find((group) => group.id === 'web');
                      if (webGroup) {
                        onGroupSelect(webGroup);
                      }
                    } else {
                      setOpen(!open);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-1.5 !m-0 !px-1.5 h-6 !rounded-md transition-all cursor-pointer',
                    !isExtreme
                      ? 'bg-accent text-foreground hover:bg-accent/80'
                      : 'text-muted-foreground hover:bg-accent',
                  )}
                >
                  {selectedGroupData && !isExtreme && (
                    <>
                      <HugeiconsIcon icon={selectedGroupData.icon} size={30} color="currentColor" strokeWidth={2} />
                      <ChevronsUpDown className="size-4.5 opacity-50" />
                    </>
                  )}
                  {isExtreme && (
                    <>
                      <HugeiconsIcon icon={GlobalSearchIcon} size={30} color="currentColor" strokeWidth={2} />
                    </>
                  )}
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{isExtreme ? 'Switch back to search modes' : 'Choose search mode'}</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            className="w-[90vw] sm:w-[14em] max-w-[14em] p-0 font-sans rounded-lg bg-popover z-50 border !shadow-none"
            align="start"
            side="bottom"
            sideOffset={4}
            avoidCollisions={true}
            collisionPadding={8}
          >
            <Command
              className="rounded-lg"
              filter={(value, search) => {
                const group = visibleGroups.find((g) => g.id === value);
                if (!group || !search) return 1;

                const searchTerm = search.toLowerCase();
                const searchableFields = [group.name, group.description, group.id].join(' ').toLowerCase();

                return searchableFields.includes(searchTerm) ? 1 : 0;
              }}
            >
              <CommandInput placeholder="Search modes..." className="h-9" />
              <CommandEmpty>No search mode found.</CommandEmpty>
              <CommandList className="max-h-[240px]">
                <CommandGroup>
                  <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground">Search Mode</div>
                  {visibleGroups.map((group) => {
                    const Icon = group.icon;
                    return (
                      <CommandItem
                        key={group.id}
                        value={group.id}
                        onSelect={(currentValue) => {
                          const selectedGroup = visibleGroups.find((g) => g.id === currentValue);
                          if (selectedGroup) {
                            onGroupSelect(selectedGroup);
                            setOpen(false);
                          }
                        }}
                        className={cn(
                          'flex items-center justify-between px-2 py-2 mb-0.5 rounded-lg text-xs',
                          'transition-all duration-200',
                          'hover:bg-accent',
                          'data-[selected=true]:bg-accent',
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-4">
                          <HugeiconsIcon icon={group.icon} size={30} color="currentColor" strokeWidth={2} />
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="font-medium truncate text-[11px] text-foreground">{group.name}</div>
                            <div className="text-[9px] text-muted-foreground truncate leading-tight text-wrap!">
                              {group.description}
                            </div>
                          </div>
                        </div>
                        <Check
                          className={cn('ml-auto h-4 w-4', selectedGroup === group.id ? 'opacity-100' : 'opacity-0')}
                        />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Extreme Mode Side */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleExtreme}
              className={cn(
                'flex items-center gap-1.5 px-3 h-6 rounded-md transition-all',
                isExtreme ? 'bg-accent text-foreground hover:bg-accent/80' : 'text-muted-foreground hover:bg-accent',
              )}
            >
              <HugeiconsIcon icon={AtomicPowerIcon} size={30} color="currentColor" strokeWidth={2} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{isExtreme ? 'Extreme Search mode on' : 'Switch to Extreme Search mode'}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});

GroupModeToggle.displayName = 'GroupModeToggle';

const FormComponent: React.FC<FormComponentProps> = ({
  chatId,
  user,
  subscriptionData,
  input,
  setInput,
  attachments,
  setAttachments,
  sendMessage,
  fileInputRef,
  inputRef,
  stop,
  selectedModel,
  setSelectedModel,
  resetSuggestedQuestions,
  lastSubmittedQueryRef,
  selectedGroup,
  setSelectedGroup,
  messages,
  status,
  setHasSubmitted,
  isLimitBlocked = false,
}) => {
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);
  const isMounted = useRef(true);
  const isCompositionActive = useRef(false);
  const postSubmitFileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isTypewriting, setIsTypewriting] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [discountConfig, setDiscountConfig] = useState<DiscountConfig | null>(null);

  // Combined state for animations to avoid restart issues
  const isEnhancementActive = isEnhancing || isTypewriting;
  const audioLinesRef = useRef<any>(null);
  const gripIconRef = useRef<any>(null);

  const location = useLocation();

  const isProUser = useMemo(
    () => user?.isProUser || (subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active'),
    [user?.isProUser, subscriptionData?.hasSubscription, subscriptionData?.subscription?.status],
  );

  const isProcessing = useMemo(() => status === 'submitted' || status === 'streaming', [status]);

  const hasInteracted = useMemo(() => messages.length > 0, [messages.length]);

  const cleanupMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      cleanupMediaRecorder();
    };
  }, [cleanupMediaRecorder]);

  // Fetch discount config when needed
  const fetchDiscountConfigForm = useCallback(async () => {
    if (discountConfig) return; // Already fetched

    try {
      const config = await getDiscountConfigAction();
      setDiscountConfig(config);
    } catch (error) {
      console.error('Failed to fetch discount config:', error);
    }
  }, [discountConfig]);

  // Calculate pricing with discounts
  const calculatePricing = useCallback(() => {
    const defaultUSDPrice = PRICING.PRO_MONTHLY;
    const defaultINRPrice = PRICING.PRO_MONTHLY_INR;

    console.log('calculatePricing called with:', {
      discountConfig,
      isIndia: location.isIndia,
      nodeEnv: process.env.NODE_ENV,
    });

    // Check if discount should be applied
    const isDevMode = discountConfig?.dev || process.env.NODE_ENV === 'development';
    const shouldApplyDiscount = isDevMode
      ? discountConfig?.code && discountConfig?.message
      : discountConfig?.enabled && discountConfig?.code && discountConfig?.message;

    console.log('Discount check:', {
      isDevMode,
      shouldApplyDiscount,
      enabled: discountConfig?.enabled,
      code: discountConfig?.code,
      message: discountConfig?.message,
      percentage: discountConfig?.percentage,
    });

    if (!discountConfig || !shouldApplyDiscount) {
      console.log('No discount applied - returning default pricing');
      return {
        usd: { originalPrice: defaultUSDPrice, finalPrice: defaultUSDPrice, hasDiscount: false },
        inr: location.isIndia
          ? { originalPrice: defaultINRPrice, finalPrice: defaultINRPrice, hasDiscount: false }
          : null,
      };
    }

    // USD pricing: prefer explicit finalPrice over percentage
    let usdPricing: { originalPrice: number; finalPrice: number; hasDiscount: boolean } = {
      originalPrice: defaultUSDPrice,
      finalPrice: defaultUSDPrice,
      hasDiscount: false,
    };
    if (typeof discountConfig.finalPrice === 'number') {
      const original =
        typeof discountConfig.originalPrice === 'number' ? discountConfig.originalPrice : defaultUSDPrice;
      usdPricing = {
        originalPrice: original,
        finalPrice: discountConfig.finalPrice,
        hasDiscount: true,
      };
    } else if (typeof discountConfig.percentage === 'number') {
      const base = typeof discountConfig.originalPrice === 'number' ? discountConfig.originalPrice : defaultUSDPrice;
      const usdSavings = (base * discountConfig.percentage) / 100;
      const usdFinalPrice = base - usdSavings;
      usdPricing = {
        originalPrice: base,
        finalPrice: usdFinalPrice,
        hasDiscount: true,
      };
    }

    // INR pricing: prefer explicit inrPrice, otherwise derive from percentage
    let inrPricing: { originalPrice: number; finalPrice: number; hasDiscount: boolean } | null = null;
    if (location.isIndia) {
      if (typeof discountConfig.inrPrice === 'number') {
        inrPricing = {
          originalPrice: defaultINRPrice,
          finalPrice: discountConfig.inrPrice,
          hasDiscount: true,
        };
      } else if (typeof discountConfig.percentage === 'number') {
        const inrSavings = (defaultINRPrice * discountConfig.percentage) / 100;
        const inrFinalPrice = defaultINRPrice - inrSavings;
        inrPricing = {
          originalPrice: defaultINRPrice,
          finalPrice: inrFinalPrice,
          hasDiscount: true,
        };
      } else {
        inrPricing = {
          originalPrice: defaultINRPrice,
          finalPrice: defaultINRPrice,
          hasDiscount: false,
        };
      }
    }

    return {
      usd: usdPricing,
      inr: inrPricing,
    };
  }, [discountConfig, location.isIndia]);

  const pricing = calculatePricing();

  // Control audio lines animation
  useEffect(() => {
    if (audioLinesRef.current) {
      if (isRecording) {
        audioLinesRef.current.startAnimation();
      } else {
        audioLinesRef.current.stopAnimation();
      }
    }
  }, [isRecording]);

  // Control grip icon animation using combined state to avoid restarts
  useEffect(() => {
    if (gripIconRef.current) {
      if (isEnhancementActive) {
        gripIconRef.current.startAnimation();
      } else {
        gripIconRef.current.stopAnimation();
      }
    }
  }, [isEnhancementActive]);

  // Global typing detection to auto-focus form
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Don't interfere if user is already typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true' ||
        target.closest('[contenteditable="true"]')
      ) {
        return;
      }

      // Don't interfere with keyboard shortcuts (Ctrl/Cmd + key)
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      // Don't interfere with function keys, arrow keys, etc.
      if (
        event.key.length > 1 && // Multi-character keys like 'Enter', 'Escape', etc.
        !['Backspace', 'Delete', 'Space'].includes(event.key)
      ) {
        return;
      }

      // Don't focus if form is already focused
      if (inputRef.current && document.activeElement === inputRef.current) {
        return;
      }

      // Don't focus if recording is active
      if (isRecording) {
        return;
      }

      // Focus the input and add the typed character
      if (inputRef.current && event.key.length === 1) {
        inputRef.current.focus();
        // If it's a printable character, add it to the input
        if (event.key !== ' ' || input.length > 0) {
          // Allow space only if there's already content
          setInput(input + event.key);
          event.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isRecording, input, setInput]);

  // Typewriter effect for enhanced text
  const typewriterText = useCallback(
    (text: string, speed: number = 5) => {
      if (!inputRef.current) return;

      setIsTypewriting(true);
      let currentIndex = 0;

      const typeNextChar = () => {
        if (currentIndex <= text.length && inputRef.current) {
          const currentText = text.substring(0, currentIndex);
          setInput(currentText);

          // Auto-resize textarea during typing
          if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
          }

          currentIndex++;

          if (currentIndex <= text.length) {
            setTimeout(typeNextChar, speed);
          } else {
            setIsTypewriting(false);
          }
        }
      };

      typeNextChar();
    },
    [setInput, inputRef],
  );

  const handleEnhance = useCallback(async () => {
    if (!isProUser) {
      fetchDiscountConfigForm();
      setShowUpgradeDialog(true);
      return;
    }
    if (!input || input.trim().length === 0) {
      toast.error('Please enter a prompt to enhance');
      return;
    }
    if (isProcessing || isEnhancing) return;

    const originalInput = input;

    try {
      setIsEnhancing(true);
      toast.loading('Enhancing your prompt...', { id: 'enhance-prompt' });

      const result = await enhancePrompt(input);

      if (result?.success && result.enhanced) {
        // Clear input and start typewriter
        setInput('');
        typewriterText(result.enhanced);

        toast.success('✨ Prompt enhanced successfully!', { id: 'enhance-prompt' });
        setIsEnhancing(false);
        inputRef.current?.focus();
      } else {
        setInput(originalInput);
        toast.error(result?.error || 'Failed to enhance prompt', { id: 'enhance-prompt' });
        setIsEnhancing(false);
      }
    } catch (e) {
      setInput(originalInput);
      toast.error('Failed to enhance prompt', { id: 'enhance-prompt' });
      setIsEnhancing(false);
    }
  }, [
    input,
    isProcessing,
    isProUser,
    setInput,
    inputRef,
    typewriterText,
    isEnhancing,
    setShowUpgradeDialog,
    fetchDiscountConfigForm,
  ]);

  const handleRecord = useCallback(async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      cleanupMediaRecorder();
    } else {
      try {
        // Environment and feature checks
        if (typeof window === 'undefined') {
          toast.error('Voice recording is only available in the browser.');
          return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          toast.error('Voice recording is not supported in this browser.');
          return;
        }

        // Best-effort permissions hint (not supported in all browsers)
        try {
          const permApi: any = (navigator as any).permissions;
          if (permApi?.query) {
            const status = await permApi.query({ name: 'microphone' as any });
            if (status?.state === 'denied') {
              toast.error('Microphone access is denied. Enable it in your browser settings.');
              return;
            }
          }
        } catch {
          // Ignore permissions API errors; proceed to request directly
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Pick a supported MIME type to maximize cross-browser compatibility (e.g., Safari)
        const candidateMimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4;codecs=mp4a.40.2',
          'audio/mp4',
          'audio/ogg;codecs=opus',
          'audio/mpeg',
        ];
        const isTypeSupported = (type: string) =>
          typeof MediaRecorder !== 'undefined' && (MediaRecorder as any).isTypeSupported?.(type);
        const selectedMimeType = candidateMimeTypes.find((t) => isTypeSupported(t));

        let recorder: MediaRecorder;
        try {
          recorder = selectedMimeType
            ? new MediaRecorder(stream, { mimeType: selectedMimeType })
            : new MediaRecorder(stream);
        } catch (e) {
          // Fallback: try without options
          recorder = new MediaRecorder(stream);
        }
        mediaRecorderRef.current = recorder;

        recorder.addEventListener('dataavailable', async (event) => {
          if (event.data.size > 0) {
            const audioBlob = event.data;

            try {
              const formData = new FormData();
              const extension = (() => {
                const type = (audioBlob?.type || '').toLowerCase();
                if (type.includes('mp4')) return 'mp4';
                if (type.includes('ogg')) return 'ogg';
                if (type.includes('mpeg')) return 'mp3';
                return 'webm';
              })();
              formData.append('audio', audioBlob, `recording.${extension}`);
              const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
              });

              if (!response.ok) {
                throw new Error(`Transcription failed: ${response.statusText}`);
              }

              const data = await response.json();

              if (data.text) {
                setInput(data.text);
              } else {
                console.error('Transcription response did not contain text:', data);
              }
            } catch (error) {
              console.error('Error during transcription request:', error);
              toast.error('Failed to transcribe audio. Please try again.');
            } finally {
              cleanupMediaRecorder();
            }
          }
        });

        recorder.addEventListener('error', (e) => {
          console.error('MediaRecorder error:', e);
          toast.error('Recording failed. Please try again or switch browser.');
          cleanupMediaRecorder();
        });

        recorder.addEventListener('stop', () => {
          stream.getTracks().forEach((track) => track.stop());
        });

        recorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast.error('Could not access microphone. Please allow mic permission.');
        setIsRecording(false);
      }
    }
  }, [isRecording, cleanupMediaRecorder, setInput]);

  const handleInput = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      event.preventDefault();
      const newValue = event.target.value;

      if (newValue.length > MAX_INPUT_CHARS) {
        setInput(newValue);
        toast.error(`Your input exceeds the maximum of ${MAX_INPUT_CHARS} characters.`);
      } else {
        setInput(newValue);
      }
    },
    [setInput],
  );

  const handleGroupSelect = useCallback(
    (group: SearchGroup) => {
      if (!isEnhancing && !isTypewriting) {
        setSelectedGroup(group.id);
        inputRef.current?.focus();
      }
    },
    [setSelectedGroup, inputRef, isEnhancing, isTypewriting],
  );

  const uploadFile = useCallback(async (file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('Uploading file:', file.name, file.type, file.size);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Upload successful:', data);
        return data;
      } else {
        const errorText = await response.text();
        console.error('Upload failed with status:', response.status, errorText);
        throw new Error(`Failed to upload file: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) {
        console.log('No files selected in file input');
        return;
      }

      console.log(
        'Files selected:',
        files.map((f) => `${f.name} (${f.type})`),
      );

      const imageFiles: File[] = [];
      const pdfFiles: File[] = [];
      const unsupportedFiles: File[] = [];
      const oversizedFiles: File[] = [];
      const blockedPdfFiles: File[] = [];

      files.forEach((file) => {
        if (file.size > MAX_FILE_SIZE) {
          oversizedFiles.push(file);
          return;
        }

        if (file.type.startsWith('image/')) {
          imageFiles.push(file);
        } else if (file.type === 'application/pdf') {
          if (!isProUser) {
            blockedPdfFiles.push(file);
          } else {
            pdfFiles.push(file);
          }
        } else {
          unsupportedFiles.push(file);
        }
      });

      if (unsupportedFiles.length > 0) {
        console.log(
          'Unsupported files:',
          unsupportedFiles.map((f) => `${f.name} (${f.type})`),
        );
        toast.error(`Some files are not supported: ${unsupportedFiles.map((f) => f.name).join(', ')}`);
      }

      if (blockedPdfFiles.length > 0) {
        console.log(
          'Blocked PDF files for non-Pro user:',
          blockedPdfFiles.map((f) => f.name),
        );
        toast.error(`PDF uploads require Pro subscription. Upgrade to access PDF analysis.`, {
          action: {
            label: 'Upgrade',
            onClick: () => (window.location.href = '/pricing'),
          },
        });
      }

      if (imageFiles.length === 0 && pdfFiles.length === 0) {
        console.log('No supported files found');
        event.target.value = '';
        return;
      }

      const currentModelData = models.find((m) => m.value === selectedModel);
      if (pdfFiles.length > 0 && (!currentModelData || !currentModelData.pdf)) {
        console.log('PDFs detected, switching to compatible model');

        const compatibleModel = models.find((m) => m.pdf && m.vision);

        if (compatibleModel) {
          console.log('Switching to compatible model:', compatibleModel.value);
          setSelectedModel(compatibleModel.value);
        } else {
          console.warn('No PDF-compatible model found');
          toast.error('PDFs are only supported by Gemini and Claude models');

          if (imageFiles.length === 0) {
            event.target.value = '';
            return;
          }
        }
      }

      let validFiles: File[] = [...imageFiles];
      if (hasPdfSupport(selectedModel) || pdfFiles.length > 0) {
        validFiles = [...validFiles, ...pdfFiles];
      }

      console.log(
        'Valid files for upload:',
        validFiles.map((f) => f.name),
      );

      const totalAttachments = attachments.length + validFiles.length;
      if (totalAttachments > MAX_FILES) {
        toast.error(`You can only attach up to ${MAX_FILES} files.`);
        event.target.value = '';
        return;
      }

      if (validFiles.length === 0) {
        console.error('No valid files to upload');
        event.target.value = '';
        return;
      }

      if (imageFiles.length > 0) {
        try {
          console.log('Checking image moderation for', imageFiles.length, 'images');
          toast.info('Checking images for safety...');

          const imageDataURLs = await Promise.all(imageFiles.map((file) => fileToDataURL(file)));

          const moderationResult = await checkImageModeration(imageDataURLs);
          console.log('Moderation result:', moderationResult);

          if (moderationResult !== 'safe') {
            const [status, category] = moderationResult.split('\n');
            if (status === 'unsafe') {
              console.warn('Unsafe image detected, category:', category);
              toast.error(`Image content violates safety guidelines (${category}). Please choose different images.`);
              event.target.value = '';
              return;
            }
          }

          console.log('Images passed moderation check');
        } catch (error) {
          console.error('Error during image moderation:', error);
          toast.error('Unable to verify image safety. Please try again.');
          event.target.value = '';
          return;
        }
      }

      setUploadQueue(validFiles.map((file) => file.name));

      try {
        console.log('Starting upload of', validFiles.length, 'files');

        const uploadedAttachments: Attachment[] = [];
        for (const file of validFiles) {
          try {
            console.log(`Uploading file: ${file.name} (${file.type})`);
            const attachment = await uploadFile(file);
            uploadedAttachments.push(attachment);
            console.log(`Successfully uploaded: ${file.name}`);
          } catch (err) {
            console.error(`Failed to upload ${file.name}:`, err);
          }
        }

        console.log('Upload completed for', uploadedAttachments.length, 'files');

        if (uploadedAttachments.length > 0) {
          setAttachments((currentAttachments) => [...currentAttachments, ...uploadedAttachments]);

          toast.success(
            `${uploadedAttachments.length} file${uploadedAttachments.length > 1 ? 's' : ''} uploaded successfully`,
          );
        } else {
          toast.error('No files were successfully uploaded');
        }
      } catch (error) {
        console.error('Error uploading files!', error);
        toast.error('Failed to upload one or more files. Please try again.');
      } finally {
        setUploadQueue([]);
        event.target.value = '';
      }
    },
    [attachments.length, setAttachments, selectedModel, setSelectedModel, isProUser, uploadFile],
  );

  const removeAttachment = useCallback(
    (index: number) => {
      setAttachments((prev) => prev.filter((_, i) => i !== index));
    },
    [setAttachments],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (attachments.length >= MAX_FILES) return;

      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        const hasFile = Array.from(e.dataTransfer.items).some((item) => item.kind === 'file');
        if (hasFile) {
          setIsDragging(true);
        }
      }
    },
    [attachments.length],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const getFirstVisionModel = useCallback(() => {
    return models.find((model) => model.vision)?.value || selectedModel;
  }, [selectedModel]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const allFiles = Array.from(e.dataTransfer.files);
      console.log(
        'Raw files dropped:',
        allFiles.map((f) => `${f.name} (${f.type})`),
      );

      if (allFiles.length === 0) {
        toast.error('No files detected in drop');
        return;
      }

      toast.info(`Detected ${allFiles.length} dropped files`);

      const imageFiles: File[] = [];
      const pdfFiles: File[] = [];
      const unsupportedFiles: File[] = [];
      const oversizedFiles: File[] = [];
      const blockedPdfFiles: File[] = [];

      allFiles.forEach((file) => {
        console.log(`Processing file: ${file.name} (${file.type})`);

        if (file.size > MAX_FILE_SIZE) {
          oversizedFiles.push(file);
          return;
        }

        if (file.type.startsWith('image/')) {
          imageFiles.push(file);
        } else if (file.type === 'application/pdf') {
          if (!isProUser) {
            blockedPdfFiles.push(file);
          } else {
            pdfFiles.push(file);
          }
        } else {
          unsupportedFiles.push(file);
        }
      });

      console.log(
        `Images: ${imageFiles.length}, PDFs: ${pdfFiles.length}, Unsupported: ${unsupportedFiles.length}, Oversized: ${oversizedFiles.length}`,
      );

      if (unsupportedFiles.length > 0) {
        console.log(
          'Unsupported files:',
          unsupportedFiles.map((f) => `${f.name} (${f.type})`),
        );
        toast.error(`Some files not supported: ${unsupportedFiles.map((f) => f.name).join(', ')}`);
      }

      if (oversizedFiles.length > 0) {
        console.log(
          'Oversized files:',
          oversizedFiles.map((f) => `${f.name} (${f.size} bytes)`),
        );
        toast.error(`Some files exceed the 5MB limit: ${oversizedFiles.map((f) => f.name).join(', ')}`);
      }

      if (blockedPdfFiles.length > 0) {
        console.log(
          'Blocked PDF files for non-Pro user:',
          blockedPdfFiles.map((f) => f.name),
        );
        toast.error(`PDF uploads require Pro subscription. Upgrade to access PDF analysis.`, {
          action: {
            label: 'Upgrade',
            onClick: () => (window.location.href = '/pricing'),
          },
        });
      }

      if (imageFiles.length === 0 && pdfFiles.length === 0) {
        toast.error('Only image and PDF files are supported');
        return;
      }

      const currentModelData = models.find((m) => m.value === selectedModel);
      if (pdfFiles.length > 0 && (!currentModelData || !currentModelData.pdf)) {
        console.log('PDFs detected, switching to compatible model');

        const compatibleModel = models.find((m) => m.pdf && m.vision);

        if (compatibleModel) {
          console.log('Switching to compatible model:', compatibleModel.value);
          setSelectedModel(compatibleModel.value);
          toast.info(`Switching to ${compatibleModel.label} to support PDF files`);
        } else {
          console.warn('No PDF-compatible model found');
          toast.error('PDFs are only supported by Gemini and Claude models');
          if (imageFiles.length === 0) return;
        }
      }

      let validFiles: File[] = [...imageFiles];
      if (hasPdfSupport(selectedModel) || pdfFiles.length > 0) {
        validFiles = [...validFiles, ...pdfFiles];
      }

      console.log(
        'Files to upload:',
        validFiles.map((f) => `${f.name} (${f.type})`),
      );

      const totalAttachments = attachments.length + validFiles.length;
      if (totalAttachments > MAX_FILES) {
        toast.error(`You can only attach up to ${MAX_FILES} files.`);
        return;
      }

      if (validFiles.length === 0) {
        console.error('No valid files to upload after filtering');
        toast.error('No valid files to upload');
        return;
      }

      if (imageFiles.length > 0) {
        try {
          console.log('Checking image moderation for', imageFiles.length, 'images');
          toast.info('Checking images for safety...');

          const imageDataURLs = await Promise.all(imageFiles.map((file) => fileToDataURL(file)));

          const moderationResult = await checkImageModeration(imageDataURLs);
          console.log('Moderation result:', moderationResult);

          if (moderationResult !== 'safe') {
            const [status, category] = moderationResult.split('\n');
            if (status === 'unsafe') {
              console.warn('Unsafe image detected, category:', category);
              toast.error(`Image content violates safety guidelines (${category}). Please choose different images.`);
              return;
            }
          }

          console.log('Images passed moderation check');
        } catch (error) {
          console.error('Error during image moderation:', error);
          toast.error('Unable to verify image safety. Please try again.');
          return;
        }
      }

      if (!currentModelData?.vision) {
        let visionModel: string;

        if (pdfFiles.length > 0) {
          const pdfCompatibleModel = models.find((m) => m.vision && m.pdf);
          if (pdfCompatibleModel) {
            visionModel = pdfCompatibleModel.value;
          } else {
            visionModel = getFirstVisionModel();
          }
        } else {
          visionModel = getFirstVisionModel();
        }

        console.log('Switching to vision model:', visionModel);
        setSelectedModel(visionModel);
      }

      setUploadQueue(validFiles.map((file) => file.name));
      toast.info(`Starting upload of ${validFiles.length} files...`);

      setTimeout(async () => {
        try {
          console.log('Beginning upload of', validFiles.length, 'files');

          const uploadedAttachments: Attachment[] = [];
          for (const file of validFiles) {
            try {
              console.log(`Uploading file: ${file.name} (${file.type})`);
              const attachment = await uploadFile(file);
              uploadedAttachments.push(attachment);
              console.log(`Successfully uploaded: ${file.name}`);
            } catch (err) {
              console.error(`Failed to upload ${file.name}:`, err);
            }
          }

          console.log('Upload completed for', uploadedAttachments.length, 'files');

          if (uploadedAttachments.length > 0) {
            setAttachments((currentAttachments) => [...currentAttachments, ...uploadedAttachments]);

            toast.success(
              `${uploadedAttachments.length} file${uploadedAttachments.length > 1 ? 's' : ''} uploaded successfully`,
            );
          } else {
            toast.error('No files were successfully uploaded');
          }
        } catch (error) {
          console.error('Error during file upload:', error);
          toast.error('Upload failed. Please check console for details.');
        } finally {
          setUploadQueue([]);
        }
      }, 100);
    },
    [attachments.length, setAttachments, uploadFile, selectedModel, setSelectedModel, getFirstVisionModel, isProUser],
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItems = items.filter((item) => item.type.startsWith('image/'));

      if (imageItems.length === 0) return;

      e.preventDefault();

      const totalAttachments = attachments.length + imageItems.length;
      if (totalAttachments > MAX_FILES) {
        toast.error(`You can only attach up to ${MAX_FILES} files.`);
        return;
      }

      const files = imageItems.map((item) => item.getAsFile()).filter(Boolean) as File[];
      const oversizedFiles = files.filter((file) => file.size > MAX_FILE_SIZE);

      if (oversizedFiles.length > 0) {
        console.log(
          'Oversized files:',
          oversizedFiles.map((f) => `${f.name} (${f.size} bytes)`),
        );
        toast.error(`Some files exceed the 5MB limit: ${oversizedFiles.map((f) => f.name || 'unnamed').join(', ')}`);

        const validFiles = files.filter((file) => file.size <= MAX_FILE_SIZE);
        if (validFiles.length === 0) return;
      }

      const currentModel = models.find((m) => m.value === selectedModel);
      if (!currentModel?.vision) {
        const visionModel = getFirstVisionModel();
        setSelectedModel(visionModel);
      }

      const filesToUpload = oversizedFiles.length > 0 ? files.filter((file) => file.size <= MAX_FILE_SIZE) : files;

      if (filesToUpload.length > 0) {
        try {
          console.log('Checking image moderation for', filesToUpload.length, 'pasted images');
          toast.info('Checking pasted images for safety...');

          const imageDataURLs = await Promise.all(filesToUpload.map((file) => fileToDataURL(file)));

          const moderationResult = await checkImageModeration(imageDataURLs);
          console.log('Moderation result:', moderationResult);

          if (moderationResult !== 'safe') {
            const [status, category] = moderationResult.split('\n');
            if (status === 'unsafe') {
              console.warn('Unsafe pasted image detected, category:', category);
              toast.error(
                `Pasted image content violates safety guidelines (${category}). Please choose different images.`,
              );
              return;
            }
          }

          console.log('Pasted images passed moderation check');
        } catch (error) {
          console.error('Error during pasted image moderation:', error);
          toast.error('Unable to verify pasted image safety. Please try again.');
          return;
        }
      }

      setUploadQueue(filesToUpload.map((file, i) => file.name || `Pasted Image ${i + 1}`));

      try {
        const uploadPromises = filesToUpload.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);

        setAttachments((currentAttachments) => [...currentAttachments, ...uploadedAttachments]);

        toast.success('Image pasted successfully');
      } catch (error) {
        console.error('Error uploading pasted files!', error);
        toast.error('Failed to upload pasted image. Please try again.');
      } finally {
        setUploadQueue([]);
      }
    },
    [attachments.length, setAttachments, uploadFile, selectedModel, setSelectedModel, getFirstVisionModel],
  );

  useEffect(() => {
    if (status !== 'ready' && inputRef.current) {
      const focusTimeout = setTimeout(() => {
        if (isMounted.current && inputRef.current) {
          inputRef.current.focus({
            preventScroll: true,
          });
        }
      }, 300);

      return () => clearTimeout(focusTimeout);
    }
  }, [status]);

  const onSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (status !== 'ready') {
        toast.error('Please wait for the current response to complete!');
        return;
      }

      if (isRecording) {
        toast.error('Please stop recording before submitting!');
        return;
      }

      const shouldBypassLimitsForThisModel = shouldBypassRateLimits(selectedModel, user);

      if (isLimitBlocked && !shouldBypassLimitsForThisModel) {
        toast.error('Daily search limit reached. Please upgrade to Pro for unlimited searches.');
        return;
      }

      if (input.length > MAX_INPUT_CHARS) {
        toast.error(`Your input exceeds the maximum of ${MAX_INPUT_CHARS} characters. Please shorten your message.`);
        return;
      }

      if (input.trim() || attachments.length > 0) {
        track('model_selected', {
          model: selectedModel,
        });

        if (user) {
          window.history.replaceState({}, '', `/search/${chatId}`);
        }

        setHasSubmitted(true);
        lastSubmittedQueryRef.current = input.trim();

        sendMessage({
          role: 'user',
          parts: [
            ...attachments.map((attachment) => ({
              type: 'file' as const,
              url: attachment.url,
              name: attachment.name,
              mediaType: attachment.contentType || attachment.mediaType || '',
            })),
            {
              type: 'text',
              text: input,
            },
          ],
        });

        setInput('');
        setAttachments([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        toast.error('Please enter a search query or attach an image.');
      }
    },
    [
      input,
      attachments,
      sendMessage,
      setAttachments,
      fileInputRef,
      lastSubmittedQueryRef,
      status,
      selectedModel,
      setHasSubmitted,
      isLimitBlocked,
      user,
      isRecording,
      chatId,
    ],
  );

  const submitForm = useCallback(() => {
    onSubmit({ preventDefault: () => {}, stopPropagation: () => {} } as React.FormEvent<HTMLFormElement>);
    resetSuggestedQuestions();

    inputRef.current?.focus();
  }, [onSubmit, resetSuggestedQuestions, inputRef]);

  const triggerFileInput = useCallback(() => {
    if (attachments.length >= MAX_FILES) {
      toast.error(`You can only attach up to ${MAX_FILES} images.`);
      return;
    }

    if (status === 'ready') {
      postSubmitFileInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  }, [attachments.length, status, fileInputRef]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey && !isCompositionActive.current) {
        event.preventDefault();
        if (isProcessing) {
          toast.error('Please wait for the response to complete!');
        } else if (isRecording) {
          toast.error('Please stop recording before submitting!');
        } else {
          const shouldBypassLimitsForThisModel = shouldBypassRateLimits(selectedModel, user);

          if (isLimitBlocked && !shouldBypassLimitsForThisModel) {
            toast.error('Daily search limit reached. Please upgrade to Pro for unlimited searches.');
          } else {
            submitForm();
            setTimeout(() => {
              inputRef.current?.focus();
            }, 100);
          }
        }
      }
    },
    [isProcessing, isRecording, selectedModel, user, isLimitBlocked, submitForm, inputRef],
  );

  const resizeTextarea = useCallback(() => {
    if (!inputRef.current) return;

    const target = inputRef.current;

    target.style.height = 'auto';

    const scrollHeight = target.scrollHeight;
    const maxHeight = 300;

    if (scrollHeight > maxHeight) {
      target.style.height = `${maxHeight}px`;
      target.style.overflowY = 'auto';
    } else {
      target.style.height = `${scrollHeight}px`;
      target.style.overflowY = 'hidden';
    }
  }, [inputRef]);

  // Debounced resize function
  const debouncedResize = useMemo(() => debounce(resizeTextarea, 100), [resizeTextarea]);

  // Resize textarea when input value changes
  useEffect(() => {
    debouncedResize();
  }, [input, debouncedResize]);

  return (
    <div className={cn('flex flex-col w-full max-w-2xl mx-auto')}>
      <TooltipProvider>
        <div
          className={cn(
            'relative w-full flex flex-col gap-1 rounded-lg transition-all duration-300 font-sans!',
            hasInteracted ? 'z-50' : 'z-10',
            isDragging && 'ring-1 ring-border',
            attachments.length > 0 || uploadQueue.length > 0 ? 'bg-muted/50 p-1' : 'bg-transparent',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 backdrop-blur-[2px] bg-background/80 rounded-lg border border-dashed border-border flex items-center justify-center z-50 m-2"
              >
                <div className="flex items-center gap-4 px-6 py-8">
                  <div className="p-3 rounded-full bg-muted !shadow-none">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-medium text-foreground">Drop images or PDFs here</p>
                    <p className="text-xs text-muted-foreground">Max {MAX_FILES} files (5MB per file)</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            multiple
            onChange={handleFileChange}
            accept={getAcceptedFileTypes(
              selectedModel,
              user?.isProUser ||
                (subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active'),
            )}
            tabIndex={-1}
          />
          <input
            type="file"
            className="hidden"
            ref={postSubmitFileInputRef}
            multiple
            onChange={handleFileChange}
            accept={getAcceptedFileTypes(
              selectedModel,
              user?.isProUser ||
                (subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active'),
            )}
            tabIndex={-1}
          />

          {(attachments.length > 0 || uploadQueue.length > 0) && (
            <div className="flex flex-row gap-2 overflow-x-auto py-2 max-h-28 z-10 px-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {attachments.map((attachment, index) => (
                <AttachmentPreview
                  key={attachment.url}
                  attachment={attachment}
                  onRemove={() => removeAttachment(index)}
                  isUploading={false}
                />
              ))}
              {uploadQueue.map((filename) => (
                <AttachmentPreview
                  key={filename}
                  attachment={
                    {
                      url: '',
                      name: filename,
                      contentType: '',
                      size: 0,
                    } as Attachment
                  }
                  onRemove={() => {}}
                  isUploading={true}
                />
              ))}
            </div>
          )}

          {/* Form container */}
          <div className="relative">
            <div
              className={cn(
                'rounded-xl !bg-muted border border-border focus-within:border-ring transition-all duration-200',
                (isEnhancing || isTypewriting) && '!bg-muted',
              )}
            >
              {isRecording ? (
                <Textarea
                  ref={inputRef}
                  placeholder=""
                  value="◉ Recording..."
                  disabled={true}
                  className={cn(
                    'w-full rounded-xl rounded-b-none md:text-base!',
                    'text-base leading-relaxed',
                    '!bg-muted',
                    'border-0!',
                    '!text-muted-foreground',
                    'focus:ring-0! focus-visible:ring-0!',
                    'px-4! py-4!',
                    'touch-manipulation',
                    'whatsize',
                    'text-center',
                    'cursor-not-allowed',
                    '!shadow-none',
                  )}
                  style={{
                    WebkitUserSelect: 'text',
                    WebkitTouchCallout: 'none',
                    minHeight: undefined,
                    resize: 'none',
                  }}
                  rows={1}
                />
              ) : (
                <Textarea
                  ref={inputRef}
                  placeholder={
                    isEnhancing
                      ? '✨ Enhancing your prompt...'
                      : isTypewriting
                        ? '✨ Writing enhanced prompt...'
                        : hasInteracted
                          ? 'Ask a new question...'
                          : 'Ask a question...'
                  }
                  value={input}
                  onChange={handleInput}
                  disabled={isEnhancing || isTypewriting}
                  onInput={(e) => {
                    // Auto-resize textarea based on content
                    const target = e.target as HTMLTextAreaElement;

                    // Reset height to auto first to get the actual scroll height
                    target.style.height = 'auto';

                    const scrollHeight = target.scrollHeight;
                    const maxHeight = 300; // Increased max height for desktop

                    if (scrollHeight > maxHeight) {
                      target.style.height = `${maxHeight}px`;
                      target.style.overflowY = 'auto';
                    } else {
                      target.style.height = `${scrollHeight}px`;
                      target.style.overflowY = 'hidden';
                    }

                    // Ensure the cursor position is visible by scrolling to bottom if needed
                    requestAnimationFrame(() => {
                      const cursorPosition = target.selectionStart;
                      if (cursorPosition === target.value.length) {
                        target.scrollTop = target.scrollHeight;
                      }
                    });
                  }}
                  className={cn(
                    'w-full rounded-xl rounded-b-none md:text-base!',
                    'text-base leading-relaxed',
                    '!bg-muted',
                    '!border-0',
                    'text-foreground',
                    'focus:!ring-0 focus-visible:!ring-0',
                    '!px-4 !py-4',
                    'touch-manipulation',
                    'whatsize',
                    '!shadow-none',
                    'transition-all duration-200',
                    (isEnhancing || isTypewriting) && 'text-muted-foreground cursor-wait',
                  )}
                  style={{
                    WebkitUserSelect: 'text',
                    WebkitTouchCallout: 'none',
                    minHeight: undefined,
                    resize: 'none',
                  }}
                  rows={1}
                  autoFocus={!isEnhancing && !isTypewriting}
                  onCompositionStart={() => (isCompositionActive.current = true)}
                  onCompositionEnd={() => (isCompositionActive.current = false)}
                  onKeyDown={isEnhancing || isTypewriting ? undefined : handleKeyDown}
                  onPaste={isEnhancing || isTypewriting ? undefined : handlePaste}
                />
              )}

              {/* Toolbar as a separate block - no absolute positioning */}
              <div
                className={cn(
                  'flex justify-between items-center rounded-t-none rounded-b-xl',
                  '!bg-muted',
                  '!border-t-0 !border-border',
                  'p-2 gap-2 shadow-none',
                  'transition-all duration-200',
                  (isEnhancing || isTypewriting) && 'pointer-events-none',
                  isRecording && '!bg-muted text-muted-foreground',
                )}
              >
                <div className={cn('flex items-center gap-2')}>
                  <GroupModeToggle selectedGroup={selectedGroup} onGroupSelect={handleGroupSelect} status={status} />

                  <ModelSwitcher
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    attachments={attachments}
                    messages={messages}
                    status={status}
                    onModelSelect={(model) => {
                      setSelectedModel(model.value);
                      const isVisionModel = hasVisionSupport(model.value);
                      toast.message(`Switched to ${model.label}`, {
                        description: isVisionModel ? 'You can now upload images to the model.' : undefined,
                      });
                    }}
                    subscriptionData={subscriptionData}
                    user={user}
                  />
                </div>

                <div className={cn('flex items-center flex-shrink-0 gap-1')}>
                  {hasVisionSupport(selectedModel) && (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="group rounded-full transition-colors duration-200 !size-8 border-0 !shadow-none hover:!bg-primary/30 hover:!border-0"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!isEnhancing && !isTypewriting) {
                              triggerFileInput();
                            }
                          }}
                          disabled={isEnhancing || isTypewriting}
                        >
                          <span className="block">
                            <HugeiconsIcon icon={DocumentAttachmentIcon} size={16} />
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className="border-0 backdrop-blur-xs py-2 px-3 !shadow-none"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[11px]">Attach File</span>
                          <span className="text-[10px] text-accent leading-tight">
                            {hasPdfSupport(selectedModel) ? 'Upload an image or PDF document' : 'Upload an image'}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Show enhance button when there's input */}
                  {(input.length > 0 || isEnhancing || isTypewriting) && (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          className={cn(
                            'group rounded-full transition-colors duration-200 !size-8 border-0 !shadow-none hover:!bg-primary/30 hover:!border-0',
                            isEnhancementActive && 'bg-primary/10 border-primary/20',
                          )}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!isEnhancing && !isTypewriting) {
                              handleEnhance();
                            }
                          }}
                          disabled={
                            isEnhancing ||
                            isTypewriting ||
                            uploadQueue.length > 0 ||
                            status !== 'ready' ||
                            isLimitBlocked
                          }
                        >
                          <span className="block">
                            {isEnhancementActive ? (
                              <GripIcon ref={gripIconRef} size={16} className="text-primary" />
                            ) : (
                              <Wand2 className="h-4 w-4" />
                            )}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className="border-0 backdrop-blur-xs py-2 px-3 !shadow-none"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[11px]">
                            {isEnhancing ? 'Enhancing…' : isTypewriting ? 'Writing…' : 'Enhance Prompt'}
                          </span>
                          <span className="text-[10px] text-accent leading-tight">
                            {isEnhancing
                              ? 'Using AI to improve your prompt'
                              : isTypewriting
                                ? 'Typing enhanced prompt'
                                : isProUser
                                  ? 'Enhance your prompt with AI'
                                  : 'Enhance your prompt with AI (Pro feature)'}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {isProcessing ? (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="group rounded-full transition-colors duration-200 !size-8"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!isEnhancing && !isTypewriting) {
                              stop();
                            }
                          }}
                          disabled={isEnhancing || isTypewriting}
                        >
                          <span className="block">
                            <StopIcon size={14} />
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className="border-0 backdrop-blur-xs py-2 px-3 !shadow-none"
                      >
                        <span className="font-medium text-[11px]">Stop Generation</span>
                      </TooltipContent>
                    </Tooltip>
                  ) : input.length === 0 && attachments.length === 0 && !isEnhancing && !isTypewriting ? (
                    /* Show Voice Recording Button when no input */
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant={isRecording ? 'destructive' : 'default'}
                          className={cn('group rounded-full m-auto transition-colors duration-200 !size-8')}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!isEnhancing && !isTypewriting) {
                              handleRecord();
                            }
                          }}
                          disabled={isEnhancing || isTypewriting}
                        >
                          <span className="block">
                            <AudioLinesIcon ref={audioLinesRef} size={16} />
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className="border-0 backdrop-blur-xs py-2 px-3 !shadow-none"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[11px]">
                            {isRecording ? 'Stop Recording' : 'Voice Input'}
                          </span>
                          <span className="text-[10px] text-accent leading-tight">
                            {isRecording ? 'Click to stop recording' : 'Record your voice message'}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    /* Show Send Button when there is input */
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          className="group rounded-full flex m-auto transition-colors duration-200 !size-8"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!isEnhancing && !isTypewriting) {
                              submitForm();
                            }
                          }}
                          disabled={
                            (input.length === 0 && attachments.length === 0 && !isEnhancing && !isTypewriting) ||
                            uploadQueue.length > 0 ||
                            status !== 'ready' ||
                            isLimitBlocked ||
                            isEnhancing ||
                            isTypewriting
                          }
                        >
                          <span className="block">
                            <ArrowUpIcon size={16} />
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        sideOffset={6}
                        className="border-0 backdrop-blur-xs py-2 px-3 !shadow-none"
                      >
                        <span className="font-medium text-[11px]">Send Message</span>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Upgrade Dialog */}
        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent className="p-0 overflow-hidden gap-0 bg-background sm:max-w-[450px]" showCloseButton={false}>
            <DialogHeader className="p-2">
              <div className="relative w-full p-6 rounded-md text-white overflow-hidden">
                <div className="absolute inset-0 bg-[url('/placeholder.png')] bg-cover bg-center rounded-sm">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/10"></div>
                </div>
                <div className="relative z-10 flex flex-col gap-4">
                  <DialogTitle className="flex items-center gap-3 text-white">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xl sm:text-2xl font-bold">Unlock</span>
                      <ProBadge className="!text-white !bg-white/20 !ring-white/30 font-extralight mb-0.5" />
                    </div>
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
                    <p className="text-sm text-white/80 text-left">
                      Get enhanced capabilities including prompt enhancement and unlimited features
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
                  <p className="text-sm font-medium text-foreground">Prompt Enhancement</p>
                  <p className="text-xs text-muted-foreground">AI-powered prompt optimization</p>
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
                    Access to all AI models including Grok 4, Claude and GPT-5
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Scira Lookout</p>
                  <p className="text-xs text-muted-foreground">Automated search monitoring on your schedule</p>
                </div>
              </div>

              <div className="flex gap-2 w-full items-center mt-4">
                <div className="flex-1 border-b border-foreground/10" />
                <p className="text-xs text-foreground/50">Cancel anytime • Secure payment</p>
                <div className="flex-1 border-b border-foreground/10" />
              </div>

              <Button
                variant="ghost"
                onClick={() => setShowUpgradeDialog(false)}
                className="w-full text-muted-foreground hover:text-foreground mt-2"
                size="sm"
              >
                Not now
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </div>
  );
};

export default FormComponent;
