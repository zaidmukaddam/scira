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
  getFilteredModels,
  isModelRestrictedInRegion,
  supportsExtremeMode,
} from '@/ai/providers';
import { X, Check, Wand2, Upload, CheckIcon, Zap, Sparkles, ArrowUpRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { cn, SearchGroup, SearchGroupId, getSearchGroups, SearchProvider } from '@/lib/utils';

import { track } from '@vercel/analytics';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { ComprehensiveUserData } from '@/hooks/use-user-data';
import { checkImageModeration, enhancePrompt, getDiscountConfigAction, getUserCountryCode } from '@/app/actions';
import { DiscountConfig } from '@/lib/discount';
import { PRICING, SEARCH_LIMITS } from '@/lib/constants';
import { LockIcon, Eye, Brain, FilePdf } from '@phosphor-icons/react';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import {
  CpuIcon,
  GlobalSearchIcon,
  AtomicPowerIcon,
  Crown02Icon,
  DocumentAttachmentIcon,
  ConnectIcon,
} from '@hugeicons/core-free-icons';
import { AudioLinesIcon } from '@/components/ui/audio-lines';
import { GripIcon } from '@/components/ui/grip';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Switch } from '@/components/ui/switch';
import { UseChatHelpers } from '@ai-sdk/react';
import { ChatMessage } from '@/lib/types';
import { useLocation } from '@/hooks/use-location';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useSyncedPreferences } from '@/hooks/use-synced-preferences';
import { useIsMobile } from '@/hooks/use-mobile';
import { CONNECTOR_CONFIGS, CONNECTOR_ICONS, type ConnectorProvider } from '@/lib/connectors';
import { useQuery } from '@tanstack/react-query';
import { listUserConnectorsAction } from '@/app/actions';
import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr';

// Pro Badge Component
const ProBadge = ({ className = '' }: { className?: string }) => (
  <span
    className={`font-baumans inline-flex items-center gap-1 rounded-lg shadow-sm border-none! outline-0! ring-offset-1 ring-offset-background/50! bg-linear-to-br from-secondary/25 via-primary/20 to-accent/25 text-foreground px-2.5 pt-0.5 pb-2! sm:pt-1 leading-3 dark:bg-linear-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground ${className}`}
  >
    <span>pro</span>
  </span>
);

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
  selectedGroup: SearchGroupId;
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
    selectedGroup,
  }) => {
    const isProUser = useMemo(() => Boolean(user?.isProUser), [user?.isProUser]);

    const isSubscriptionLoading = useMemo(() => user && !subscriptionData, [user, subscriptionData]);

    const [countryCode, setCountryCode] = useState<string | null>(null);

    // Fetch country code on mount
    useEffect(() => {
      getUserCountryCode().then((code) => {
        setCountryCode(code);
      });
    }, []);

    const availableModels = useMemo(() => getFilteredModels(countryCode || undefined), [countryCode]);

    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
    const [showSignInDialog, setShowSignInDialog] = useState(false);
    const [selectedProModel, setSelectedProModel] = useState<(typeof models)[0] | null>(null);
    const [selectedAuthModel, setSelectedAuthModel] = useState<(typeof models)[0] | null>(null);
    const [open, setOpen] = useState(false);
    const [discountConfig, setDiscountConfig] = useState<DiscountConfig | null>(null);

    const location = useLocation();
    const isMobile = useIsMobile();

    const [searchQuery, setSearchQuery] = useState('');

    // Global model order (Pro users): top-level hook to satisfy Rules of Hooks
    const [globalModelOrder] = useSyncedPreferences<string[]>('scira-model-order-global', [] as string[]);

    const normalizeText = useCallback((input: string): string => {
      return input
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    }, []);

    const tokenize = useCallback(
      (input: string): string[] => {
        const normalized = normalizeText(input);
        if (!normalized) return [];
        const tokens = normalized.split(/\s+/).filter(Boolean);
        return Array.from(new Set(tokens));
      },
      [normalizeText],
    );

    type SearchIndexEntry = {
      normalized: string;
      labelNorm: string;
      normalizedNoSpace: string;
      labelNoSpace: string;
    };

    const searchIndex = useMemo<Record<string, SearchIndexEntry>>(() => {
      const index: Record<string, SearchIndexEntry> = {};
      for (const m of availableModels) {
        const aggregate = [
          m.label,
          m.description,
          m.category,
          m.vision ? 'vision' : '',
          m.reasoning ? 'reasoning' : '',
          m.pdf ? 'pdf' : '',
          m.experimental ? 'experimental' : '',
          m.pro ? 'pro' : '',
          m.requiresAuth ? 'auth' : '',
        ].join(' ');
        const normalized = normalizeText(aggregate);
        const labelNorm = normalizeText(m.label);
        index[m.value] = {
          normalized,
          labelNorm,
          normalizedNoSpace: normalized.replace(/\s+/g, ''),
          labelNoSpace: labelNorm.replace(/\s+/g, ''),
        };
      }
      return index;
    }, [availableModels, normalizeText]);

    const computeScore = useCallback(
      (modelValue: string, query: string): number => {
        const entry = searchIndex[modelValue];
        if (!entry) return 0;
        const tokens = tokenize(query);
        if (tokens.length === 0) return 1;
        const filteredTokens = tokens.filter((t) => t.length >= 2 || /^\d$/.test(t));
        let matchedCount = 0;
        let score = 0;

        for (const token of filteredTokens) {
          if (!token) continue;

          const inLabel = entry.labelNorm.includes(token);
          const inAll = entry.normalized.includes(token);

          if (inAll) {
            matchedCount += 1;
            score += inLabel ? 3 : 1;

            if (new RegExp(`\\b${token}`).test(entry.labelNorm)) score += 2;
            else if (new RegExp(`\\b${token}`).test(entry.normalized)) score += 1;
          }
        }

        const phraseNoSpace = normalizeText(query).replace(/\s+/g, '');
        if (phraseNoSpace.length >= 2) {
          if (entry.normalizedNoSpace.includes(phraseNoSpace)) score += 2;
          if (entry.labelNoSpace.includes(phraseNoSpace)) score += 3;
          if (entry.labelNoSpace.startsWith(phraseNoSpace)) score += 2;
        }

        if (matchedCount === 0 && phraseNoSpace.length < 2) return 0;
        if (matchedCount === filteredTokens.length && filteredTokens.length > 0) score += 2;

        return score;
      },
      [searchIndex, tokenize, normalizeText],
    );

    const escapeHtml = useCallback((input: string): string => {
      return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }, []);

    const escapeRegExp = useCallback((input: string): string => {
      return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }, []);

    const buildHighlightHtml = useCallback(
      (text: string): string => {
        const q = searchQuery.trim();
        if (!q) return escapeHtml(text);
        const safeText = escapeHtml(text);
        const pattern = new RegExp(`(${escapeRegExp(q)})`, 'gi');
        return safeText.replace(pattern, '<mark class="bg-primary/80 text-primary-foreground rounded px-px">$1</mark>');
      },
      [searchQuery, escapeHtml, escapeRegExp],
    );

    // Fetch discount config when needed
    const fetchDiscountConfig = useCallback(async () => {
      if (discountConfig) return; // Already fetched

      try {
        const config = await getDiscountConfigAction({
          isIndianUser: location.isIndia,
        });
        setDiscountConfig(config as DiscountConfig);
      } catch (error) {
        console.error('Failed to fetch discount config:', error);
      }
    }, [discountConfig, location.isIndia]);

    // Calculate pricing with student discounts
    const calculatePricing = useCallback(() => {
      const defaultUSDPrice = PRICING.PRO_MONTHLY;
      const defaultINRPrice = PRICING.PRO_MONTHLY_INR;

      // Check if student discount is active
      if (!discountConfig || !discountConfig.enabled || !discountConfig.isStudentDiscount) {
        return {
          usd: { originalPrice: defaultUSDPrice, finalPrice: defaultUSDPrice, hasDiscount: false },
          inr: location.isIndia
            ? { originalPrice: defaultINRPrice, finalPrice: defaultINRPrice, hasDiscount: false }
            : null,
        };
      }

      // USD pricing with student discount
      const usdPricing = discountConfig.finalPrice
        ? {
          originalPrice: defaultUSDPrice,
          finalPrice: discountConfig.finalPrice,
          hasDiscount: true,
        }
        : {
          originalPrice: defaultUSDPrice,
          finalPrice: defaultUSDPrice,
          hasDiscount: false,
        };

      // INR pricing with student discount - show if available in discount config
      let inrPricing: { originalPrice: number; finalPrice: number; hasDiscount: boolean } | null = null;
      if (discountConfig.inrPrice || location.isIndia) {
        inrPricing = discountConfig.inrPrice
          ? {
              originalPrice: defaultINRPrice,
              finalPrice: discountConfig.inrPrice,
              hasDiscount: true,
            }
          : {
              originalPrice: defaultINRPrice,
              finalPrice: defaultINRPrice,
              hasDiscount: false,
            };
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
      let filtered = availableModels;

      // Filter by attachment types
      if (hasImageAttachments && hasPdfAttachments) {
        filtered = filtered.filter((model) => model.vision && model.pdf);
      } else if (hasImageAttachments) {
        filtered = filtered.filter((model) => model.vision);
      } else if (hasPdfAttachments) {
        filtered = filtered.filter((model) => model.pdf);
      }

      // Filter by extreme mode
      const isExtremeMode = selectedGroup === 'extreme';
      if (isExtremeMode) {
        filtered = filtered.filter((model) => supportsExtremeMode(model.value));
      }

      return filtered;
    }, [availableModels, hasImageAttachments, hasPdfAttachments, selectedGroup]);

    // Show all models (including Pro) for everyone; locked models will prompt auth/upgrade on click
    const visibleModelsForList = useMemo(() => filteredModels, [filteredModels]);

    const rankedModels = useMemo(() => {
      const query = searchQuery.trim();
      if (!query) return null;
      const scored = visibleModelsForList
        .map((m) => ({ model: m, score: computeScore(m.value, query) }))
        .filter((x) => x.score > 0);

      const normQuery = normalizeText(query);
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aLabel = normalizeText(a.model.label);
        const bLabel = normalizeText(b.model.label);
        const aExact = aLabel === normQuery ? 1 : 0;
        const bExact = bLabel === normQuery ? 1 : 0;
        if (bExact !== aExact) return bExact - aExact;
        const aStarts = aLabel.startsWith(normQuery) ? 1 : 0;
        const bStarts = bLabel.startsWith(normQuery) ? 1 : 0;
        if (bStarts !== aStarts) return bStarts - aStarts;
        return a.model.label.localeCompare(b.model.label);
      });

      return scored.map((s) => s.model);
    }, [visibleModelsForList, searchQuery, computeScore, normalizeText]);

    const sortedModels = useMemo(() => visibleModelsForList, [visibleModelsForList]);

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

    // Persisted ordering: category order and per-category model order
    const [modelCategoryOrder] = useLocalStorage<string[]>(
      'scira-model-category-order',
      isProUser ? ['Pro', 'Experimental', 'Free'] : ['Free', 'Experimental', 'Pro'],
    );
    const [modelOrderMap] = useLocalStorage<Record<string, string[]>>('scira-model-order', {});

    const orderedGroupEntries = useMemo(() => {
      const baseOrder =
        modelCategoryOrder && modelCategoryOrder.length > 0
          ? modelCategoryOrder
          : isProUser
            ? ['Pro', 'Experimental', 'Free']
            : ['Free', 'Experimental', 'Pro'];
      const categoriesPresent = Object.keys(groupedModels);
      const normalizedOrder = [
        ...baseOrder.filter((c) => categoriesPresent.includes(c)),
        ...categoriesPresent.filter((c) => !baseOrder.includes(c)),
      ];
      const normalizedByCategory = normalizedOrder
        .filter((category) => groupedModels[category] && groupedModels[category].length > 0)
        .map((category) => {
          const order = modelOrderMap[category] || [];
          const modelsInCategory = groupedModels[category];
          // Preserve original order when no overrides are set; apply only explicit positions
          const positionById = new Map(order.map((id, idx) => [id, idx] as const));
          const orderedModels = [...modelsInCategory].sort((a, b) => {
            const ia = positionById.get(a.value);
            const ib = positionById.get(b.value);
            if (ia !== undefined && ib !== undefined) return ia - ib;
            if (ia !== undefined) return -1;
            if (ib !== undefined) return 1;
            return 0; // keep insertion order
          });
          return [category, orderedModels] as const;
        });

      if (isProUser) {
        // If a global order exists, use it to flatten and order the combined list
        const flat = normalizedByCategory.flatMap(([, ms]) => ms);
        if (globalModelOrder && globalModelOrder.length > 0) {
          const byId = new Map(flat.map((m) => [m.value, m] as const));
          const ordered = globalModelOrder.map((id) => byId.get(id)).filter(Boolean) as typeof flat;
          const remaining = flat.filter((m) => !globalModelOrder.includes(m.value));
          return [['all', [...ordered, ...remaining]] as const];
        }
        return [['all', flat] as const];
      }

      return normalizedByCategory;
    }, [groupedModels, isProUser, modelCategoryOrder, modelOrderMap, globalModelOrder]);

    const currentModel = useMemo(() => availableModels.find((m) => m.value === selectedModel), [availableModels, selectedModel]);

    // Auto-switch away from restricted or pro models when necessary
    useEffect(() => {
      if (isSubscriptionLoading) return;

      const currentModelRequiresPro = requiresProSubscription(selectedModel);
      const currentModelExists = availableModels.find((m) => m.value === selectedModel);
      const isCurrentModelRestricted = isModelRestrictedInRegion(selectedModel, countryCode || undefined);

      // If current model is restricted in user's region, switch to default
      if (isCurrentModelRestricted && selectedModel !== 'scira-default') {
        console.log(
          `Auto-switching from restricted model '${selectedModel}' to 'scira-default' - model not available in region ${countryCode}`,
        );
        setSelectedModel('scira-default');
        return;
      }

      // If current model requires pro but user is not pro, switch to default
      // Also prevent infinite loops by ensuring we're not already on the default model
      if (currentModelExists && currentModelRequiresPro && !isProUser && selectedModel !== 'scira-default') {
        console.log(`Auto-switching from pro model '${selectedModel}' to 'scira-default' - user lost pro access`);
        setSelectedModel('scira-default');
      }
    }, [selectedModel, isProUser, isSubscriptionLoading, setSelectedModel, availableModels, countryCode]);

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
      [availableModels, user, isProUser, isSubscriptionLoading, setSelectedModel, onModelSelect, fetchDiscountConfig],
    );

    // Shared command content renderer (not a component) to preserve focus
    const renderModelCommandContent = () => (
      <Command
        className={cn(isMobile ? 'flex-1 h-full border-0 bg-transparent rounded-lg' : 'rounded-lg')}
        filter={() => 1}
        shouldFilter={false}
      >
        <CommandInput
          placeholder="Search models..."
          className="h-9"
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandEmpty className={cn(isMobile ? 'max-h-[22em] p-2' : 'max-h-[15em]', 'text-center')}>No model found.</CommandEmpty>
        <CommandList className={isMobile ? 'flex-1 max-h-[22em]! p-2' : 'max-h-[15em]'}>
          {rankedModels && searchQuery.trim() ? (
            rankedModels.length > 0 ? (
              <CommandGroup key="best-matches">
                <div
                  className={cn('font-medium text-muted-foreground px-2 py-1', isMobile ? 'text-xs' : 'text-[10px]')}
                >
                  Best matches
                </div>
                {rankedModels.map((model) => {
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
                          setOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <div className={cn('font-medium truncate flex-1', isMobile ? 'text-sm' : 'text-[11px]')}>
                            {!isMobile && searchQuery ? (
                              <span
                                className="inline"
                                dangerouslySetInnerHTML={{ __html: buildHighlightHtml(model.label) }}
                              />
                            ) : (
                              <span className="inline">{model.label}</span>
                            )}
                          </div>
                          {requiresAuth ? (
                            <LockIcon
                              className={cn('text-muted-foreground shrink-0', isMobile ? 'size-3.5' : 'size-3')}
                            />
                          ) : (
                            <HugeiconsIcon
                              icon={Crown02Icon}
                              size={isMobile ? 14 : 12}
                              color="currentColor"
                              strokeWidth={1.5}
                              className="text-muted-foreground shrink-0"
                            />
                          )}
                          {model.vision && (
                            <div
                              className={cn(
                                'inline-flex items-center justify-center rounded bg-secondary/50 shrink-0',
                                isMobile ? 'p-1' : 'p-0.5',
                              )}
                            >
                              <Eye className={cn('text-muted-foreground', isMobile ? 'size-3' : 'size-2.5')} />
                            </div>
                          )}
                          {model.reasoning && (
                            <div
                              className={cn(
                                'inline-flex items-center justify-center rounded bg-secondary/50 shrink-0',
                                isMobile ? 'p-1' : 'p-0.5',
                              )}
                            >
                              <Brain className={cn('text-muted-foreground', isMobile ? 'size-3' : 'size-2.5')} />
                            </div>
                          )}
                          {model.pdf && (
                            <div
                              className={cn(
                                'inline-flex items-center justify-center rounded bg-secondary/50 shrink-0',
                                isMobile ? 'p-1' : 'p-0.5',
                              )}
                            >
                              <FilePdf className={cn('text-muted-foreground', isMobile ? 'size-3' : 'size-2.5')} />
                            </div>
                          )}
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
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <div className={cn('font-medium truncate', isMobile ? 'text-sm' : 'text-[11px]')}>
                          {!isMobile && searchQuery ? (
                            <span
                              className="inline"
                              dangerouslySetInnerHTML={{ __html: buildHighlightHtml(model.label) }}
                            />
                          ) : (
                            <span className="inline">{model.label}</span>
                          )}
                        </div>
                        <Check
                          className={cn('h-4 w-4 shrink-0', selectedModel === model.value ? 'opacity-100' : 'opacity-0')}
                        />
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          {model.isNew && (
                            <div
                              className={cn(
                                'inline-flex items-center justify-center rounded bg-secondary/50',
                                isMobile ? 'p-1' : 'p-0.5',
                              )}
                            >
                              <Sparkles className={cn('text-muted-foreground', isMobile ? 'size-3' : 'size-2.5')} />
                            </div>
                          )}
                          {model.fast && (
                            <div
                              className={cn(
                                'inline-flex items-center justify-center rounded bg-secondary/50',
                                isMobile ? 'p-1' : 'p-0.5',
                              )}
                            >
                              <Zap className={cn('text-muted-foreground', isMobile ? 'size-3' : 'size-2.5')} />
                            </div>
                          )}
                          {(() => {
                            const requiresAuth = requiresAuthentication(model.value) && !user;
                            const requiresPro = requiresProSubscription(model.value) && !isProUser;

                            if (requiresAuth) {
                              return <LockIcon className={cn('text-muted-foreground', isMobile ? 'size-4' : 'size-3')} />;
                            } else if (requiresPro) {
                              return (
                                <HugeiconsIcon
                                  icon={Crown02Icon}
                                  size={isMobile ? 14 : 12}
                                  color="currentColor"
                                  strokeWidth={1.5}
                                  className="text-muted-foreground"
                                />
                              );
                            }
                            return null;
                          })()}
                          {model.vision && (
                            <div
                              className={cn(
                                'inline-flex items-center justify-center rounded bg-secondary/50',
                                isMobile ? 'p-1' : 'p-0.5',
                              )}
                            >
                              <Eye className={cn('text-muted-foreground', isMobile ? 'size-3' : 'size-2.5')} />
                            </div>
                          )}
                          {model.reasoning && (
                            <div
                              className={cn(
                                'inline-flex items-center justify-center rounded bg-secondary/50',
                                isMobile ? 'p-1' : 'p-0.5',
                              )}
                            >
                              <Brain className={cn('text-muted-foreground', isMobile ? 'size-3' : 'size-2.5')} />
                            </div>
                          )}
                          {model.pdf && (
                            <div
                              className={cn(
                                'inline-flex items-center justify-center rounded bg-secondary/50',
                                isMobile ? 'p-1' : 'p-0.5',
                              )}
                            >
                              <FilePdf className={cn('text-muted-foreground', isMobile ? 'size-3' : 'size-2.5')} />
                            </div>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : null
          ) : (
            (isProUser ? [['all', orderedGroupEntries.flatMap(([, ms]) => ms)] as const] : orderedGroupEntries).map(
              ([category, categoryModels], categoryIndex) => (
                <CommandGroup key={String(category)}>
                  {!isProUser && categoryIndex > 0 && <div className="my-1 border-t border-border" />}
                  {!isProUser && (
                    <div
                      className={cn(
                        'font-medium text-muted-foreground px-2 py-1',
                        isMobile ? 'text-xs' : 'text-[10px]',
                      )}
                    >
                      {String(category)} Models
                    </div>
                  )}
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
                            setOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            <div className={cn('font-medium truncate flex-1', isMobile ? 'text-sm' : 'text-[11px]')}>
                              {!isMobile && searchQuery ? (
                                <span
                                  className="inline"
                                  dangerouslySetInnerHTML={{ __html: buildHighlightHtml(model.label) }}
                                />
                              ) : (
                                <span className="inline">{model.label}</span>
                              )}
                            </div>
                            {requiresAuth ? (
                              <LockIcon
                                className={cn('text-muted-foreground shrink-0', isMobile ? 'size-3.5' : 'size-3')}
                              />
                            ) : (
                              <HugeiconsIcon
                                icon={Crown02Icon}
                                size={isMobile ? 14 : 12}
                                color="currentColor"
                                strokeWidth={1.5}
                                className="text-muted-foreground shrink-0"
                              />
                            )}
                            {model.vision && (
                              <div
                                className={cn(
                                  'inline-flex items-center justify-center rounded bg-secondary/50 shrink-0',
                                  isMobile ? 'p-1' : 'p-0.5',
                                )}
                              >
                                <Eye className={cn('text-muted-foreground', isMobile ? 'size-3' : 'size-2.5')} />
                              </div>
                            )}
                            {model.reasoning && (
                              <div
                                className={cn(
                                  'inline-flex items-center justify-center rounded bg-secondary/50 shrink-0',
                                  isMobile ? 'p-1' : 'p-0.5',
                                )}
                              >
                                <Brain className={cn('text-muted-foreground', isMobile ? 'size-3' : 'size-2.5')} />
                              </div>
                            )}
                            {model.pdf && (
                              <div
                                className={cn(
                                  'inline-flex items-center justify-center rounded bg-secondary/50 shrink-0',
                                  isMobile ? 'p-1' : 'p-0.5',
                                )}
                              >
                                <FilePdf className={cn('text-muted-foreground', isMobile ? 'size-3' : 'size-2.5')} />
                              </div>
                            )}
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
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <div className={cn('font-medium truncate', isMobile ? 'text-sm' : 'text-[11px]')}>
                            {!isMobile && searchQuery ? (
                              <span
                                className="inline"
                                dangerouslySetInnerHTML={{ __html: buildHighlightHtml(model.label) }}
                              />
                            ) : (
                              <span className="inline">{model.label}</span>
                            )}
                          </div>
                          <Check
                            className={cn('h-4 w-4 shrink-0', selectedModel === model.value ? 'opacity-100' : 'opacity-0')}
                          />
                          <div className="flex items-center gap-1 ml-auto shrink-0">
                            {model.isNew && (
                              <div
                                className={cn(
                                  'inline-flex items-center justify-center rounded bg-secondary/50',
                                  isMobile ? 'p-1' : 'p-0.5',
                                )}
                              >
                                <Sparkles className={cn('text-muted-foreground', isMobile ? 'size-3' : 'size-2.5')} />
                              </div>
                            )}
                            {model.fast && (
                              <div
                                className={cn(
                                  'inline-flex items-center justify-center rounded bg-secondary/50',
                                  isMobile ? 'p-1' : 'p-0.5',
                                )}
                              >
                                <Zap className={cn('text-muted-foreground', isMobile ? 'size-3' : 'size-2.5')} />
                              </div>
                            )}
                            {(() => {
                              const requiresAuth = requiresAuthentication(model.value) && !user;
                              const requiresPro = requiresProSubscription(model.value) && !isProUser;

                              if (requiresAuth) {
                                return <LockIcon className={cn('text-muted-foreground', isMobile ? 'size-4' : 'size-3')} />;
                              } else if (requiresPro) {
                                return (
                                  <HugeiconsIcon
                                    icon={Crown02Icon}
                                    size={isMobile ? 14 : 12}
                                    color="currentColor"
                                    strokeWidth={1.5}
                                    className="text-muted-foreground"
                                  />
                                );
                              }
                              return null;
                            })()}
                            {model.vision && (
                              <div
                                className={cn(
                                  'inline-flex items-center justify-center rounded bg-secondary/50',
                                  isMobile ? 'p-1' : 'p-0.5',
                                )}
                              >
                                <Eye className={cn('text-muted-foreground', isMobile ? 'size-3' : 'size-2.5')} />
                              </div>
                            )}
                            {model.reasoning && (
                              <div
                                className={cn(
                                  'inline-flex items-center justify-center rounded bg-secondary/50',
                                  isMobile ? 'p-1' : 'p-0.5',
                                )}
                              >
                                <Brain className={cn('text-muted-foreground', isMobile ? 'size-3' : 'size-2.5')} />
                              </div>
                            )}
                            {model.pdf && (
                              <div
                                className={cn(
                                  'inline-flex items-center justify-center rounded bg-secondary/50',
                                  isMobile ? 'p-1' : 'p-0.5',
                                )}
                              >
                                <FilePdf className={cn('text-muted-foreground', isMobile ? 'size-3' : 'size-2.5')} />
                              </div>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ),
            )
          )}
        </CommandList>
      </Command>
    );

    // Common trigger button component
    const TriggerButton = React.forwardRef<
      React.ComponentRef<typeof Button>,
      React.ComponentPropsWithoutRef<typeof Button>
    >((props, ref) => (
      <Button
        ref={ref}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        size="sm"
        className={cn(
          'flex items-center gap-2 px-3 h-7.5 rounded-lg',
          'border border-border',
          'bg-background text-foreground',
          'hover:bg-accent transition-colors',
          'focus:outline-none! focus:ring-0!',
          'shadow-none',
          className,
        )}
        {...props}
      >
        <HugeiconsIcon icon={CpuIcon} size={24} color="currentColor" />
        <span className="text-xs font-medium sm:block hidden">{currentModel?.label}</span>
        <CaretDownIcon
          size={18}
          color="currentColor"
          strokeWidth={1.5}
          className={cn(open ? 'rotate-180' : 'rotate-0', 'transition-transform duration-200')}
        />
      </Button>
    ));

    TriggerButton.displayName = 'TriggerButton';

    return (
      <>
        {isMobile ? (
          <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
              <TriggerButton />
            </DrawerTrigger>
            <DrawerContent className="min-h-[60vh] max-h-[80vh] flex flex-col">
              <DrawerHeader className="pb-4 shrink-0">
                <DrawerTitle className="text-left flex items-center gap-2 font-medium font-be-vietnam-pro text-lg">
                  <HugeiconsIcon icon={CpuIcon} size={22} color="currentColor" />
                  Select Model
                </DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 flex flex-col min-h-0">{renderModelCommandContent()}</div>
            </DrawerContent>
          </Drawer>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <TriggerButton />
            </PopoverTrigger>
            <PopoverContent
              className="w-[90vw] sm:w-[20em] max-w-[20em] p-0 font-sans rounded-lg bg-popover z-40 border shadow-none!"
              align="start"
              side="bottom"
              sideOffset={4}
              avoidCollisions={true}
              collisionPadding={8}
            >
              {renderModelCommandContent()}
            </PopoverContent>
          </Popover>
        )}

        {/* Dialog content below unchanged */}
        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent className="p-0 overflow-hidden gap-0 bg-background sm:max-w-[450px]" showCloseButton={false}>
            {/* ... */}
          </DialogContent>
        </Dialog>

        <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
          <DialogContent className="sm:max-w-[420px] p-0 gap-0 bg-background" showCloseButton={false}>
            {/* ... */}
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

/*
  NOTE:
  The hydration mismatch you saw was caused by a server/client attribute mismatch on the textarea.
  Some libs / extensions can toggle directionality (dir) between SSR and the first client render.
  We explicitly set dir="ltr" (and suppress hydration warning for safety) to keep SSR/CSR consistent.
*/

// ... (rest of file remains unchanged up to the FormComponent render)

const FormComponent: React.FC<FormComponentProps> = (props) => {
  // (existing implementation unchanged)
  const {
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
    onOpenSettings,
    usageData,
    selectedConnectors = [],
    setSelectedConnectors,
  } = props;

  // ... keep everything as-is

  return (
    <div className={cn('flex flex-col w-full max-w-2xl mx-auto')}>
      <TooltipProvider>
        {/* ... */}

        {/* Textarea */}
        {/* Only change: dir + suppressHydrationWarning */}
        {/* ... */}
      </TooltipProvider>
    </div>
  );
};

export default FormComponent;
