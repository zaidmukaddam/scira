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
    const isProUser = useMemo(
      () => Boolean(user?.isProUser),
      [user?.isProUser],
    );

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

    const currentModel = useMemo(
      () => availableModels.find((m) => m.value === selectedModel),
      [availableModels, selectedModel],
    );

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
                          className={cn(
                            'h-4 w-4 shrink-0',
                            selectedModel === model.value ? 'opacity-100' : 'opacity-0',
                          )}
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
                              return (
                                <LockIcon className={cn('text-muted-foreground', isMobile ? 'size-4' : 'size-3')} />
                              );
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
                            className={cn(
                              'h-4 w-4 shrink-0',
                              selectedModel === model.value ? 'opacity-100' : 'opacity-0',
                            )}
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
                                return (
                                  <LockIcon className={cn('text-muted-foreground', isMobile ? 'size-4' : 'size-3')} />
                                );
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
        <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <DialogContent className="p-0 overflow-hidden gap-0 bg-background sm:max-w-[450px]" showCloseButton={false}>
            <DialogHeader className="p-2">
              <div className="relative w-full p-6 rounded-md text-white overflow-hidden">
                <div className="absolute inset-0 bg-[url('/placeholder.png')] bg-cover bg-center rounded-sm">
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/30 to-black/10"></div>
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
                              <ProBadge className="text-white! bg-white/20! ring-white/30! font-extralight!" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xl sm:text-2xl font-be-vietnam-pro">Scira</span>
                          <ProBadge className="text-white! bg-white/20! ring-white/30! font-extralight!" />
                        </div>
                      )}
                    </div>
                  </DialogTitle>
                  <DialogDescription className="text-white/90">
                    {discountConfig?.enabled && discountConfig?.isStudentDiscount && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-white text-sm font-medium">
                          🎓 Student Discount
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {pricing.inr ? (
                        // Show INR pricing when available
                        (pricing.inr.hasDiscount ? (<>
                          <span className="text-lg text-white/60 line-through">₹{pricing.inr.originalPrice}</span>
                          <span className="text-2xl font-bold">₹{pricing.inr.finalPrice}</span>
                        </>) : (<span className="text-2xl font-bold">₹{pricing.inr.finalPrice}</span>))
                      ) : // Show USD pricing for non-Indian users
                        pricing.usd.hasDiscount ? (
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
                <CheckIcon className="size-4 text-primary shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Advanced AI Models</p>
                  <p className="text-xs text-muted-foreground">
                    Access to all AI models including Grok 4, Claude and GPT-5
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Unlimited Searches</p>
                  <p className="text-xs text-muted-foreground">No daily limits on your research</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Prompt Enhancement</p>
                  <p className="text-xs text-muted-foreground">AI-powered prompt optimization</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary shrink-0" />
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
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/30 to-black/10"></div>
                </div>
                <div className="relative z-10 flex flex-col gap-4">
                  <DialogTitle className="flex items-center gap-3 text-white">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
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
                <CheckIcon className="size-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Access better models</p>
                  <p className="text-xs text-muted-foreground">GPT-5 Nano and more premium models</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Save search history</p>
                  <p className="text-xs text-muted-foreground">Keep track of your conversations</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary shrink-0" />
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
        'shadow-none!',
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
          'shadow-none!',
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
  lastSubmittedQueryRef: React.RefObject<string>;
  selectedGroup: SearchGroupId;
  setSelectedGroup: React.Dispatch<React.SetStateAction<SearchGroupId>>;
  showExperimentalModels: boolean;
  status: UseChatHelpers<ChatMessage>['status'];
  setHasSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
  isLimitBlocked?: boolean;
  onOpenSettings?: (tab?: string) => void;
  selectedConnectors?: ConnectorProvider[];
  setSelectedConnectors?: React.Dispatch<React.SetStateAction<ConnectorProvider[]>>;
  usageData?: { messageCount: number; extremeSearchCount: number; error: string | null } | null;
}

interface GroupSelectorProps {
  selectedGroup: SearchGroupId;
  onGroupSelect: (group: SearchGroup) => void;
  status: UseChatHelpers<ChatMessage>['status'];
  onOpenSettings?: (tab?: string) => void;
  isProUser?: boolean;
  isAuthenticated?: boolean;
  usageData?: { messageCount: number; extremeSearchCount: number; error: string | null } | null;
}

interface ConnectorSelectorProps {
  selectedConnectors: ConnectorProvider[];
  onConnectorToggle: (provider: ConnectorProvider) => void;
  user: ComprehensiveUserData | null;
  isProUser?: boolean;
}

// Connector Selector Component
const ConnectorSelector: React.FC<ConnectorSelectorProps> = React.memo(
  ({ selectedConnectors, onConnectorToggle, user, isProUser }) => {
    const [open, setOpen] = useState(false);
    const isMobile = useIsMobile();

    // Get user's connected connectors
    const { data: connectorsData, isLoading: connectorsLoading } = useQuery({
      queryKey: ['connectors', user?.id],
      queryFn: listUserConnectorsAction,
      enabled: !!user && isProUser,
      staleTime: 1000 * 60 * 2,
    });

    const connectedProviders = connectorsData?.connections?.map((conn) => conn.provider) || [];
    const availableConnectors = Object.entries(CONNECTOR_CONFIGS).filter(([provider]) =>
      connectedProviders.includes(provider as ConnectorProvider),
    );

    const selectedCount = selectedConnectors.length;
    const isAllSelected = selectedConnectors.length === availableConnectors.length;
    const isSingleConnector = availableConnectors.length === 1;

    // Auto-select all connectors if none selected (must be before early return to maintain hook order)
    React.useEffect(() => {
      if (isProUser && selectedCount === 0 && availableConnectors.length > 0) {
        availableConnectors.forEach(([provider]) => {
          onConnectorToggle(provider as ConnectorProvider);
        });
      }
    }, [isProUser, selectedCount, availableConnectors, onConnectorToggle]);

    if (!isProUser || availableConnectors.length === 0) {
      return null;
    }

    const handleSelectAll = () => {
      // Don't allow deselecting all if only one connector
      if (isSingleConnector) return;

      if (isAllSelected) {
        // Deselect all
        availableConnectors.forEach(([provider]) => {
          if (selectedConnectors.includes(provider as ConnectorProvider)) {
            onConnectorToggle(provider as ConnectorProvider);
          }
        });
      } else {
        // Select all
        availableConnectors.forEach(([provider]) => {
          if (!selectedConnectors.includes(provider as ConnectorProvider)) {
            onConnectorToggle(provider as ConnectorProvider);
          }
        });
      }
    };

    const handleConnectorToggle = (provider: ConnectorProvider) => {
      // Don't allow deselecting if only one connector
      if (isSingleConnector && selectedConnectors.includes(provider)) {
        return;
      }
      onConnectorToggle(provider);
    };

    if (isMobile) {
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => setOpen(true)}>
            <HugeiconsIcon icon={ConnectIcon} size={16} color="currentColor" strokeWidth={1.5} />
            <span className="ml-1">{selectedCount > 0 ? `${selectedCount} active` : 'Select'}</span>
          </Button>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader className="pb-1">
              <DialogTitle className="text-sm">Select Connectors</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-auto space-y-2">
              {availableConnectors.map(([provider, config]) => (
                <div key={provider} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-4 h-4">
                      {(() => {
                        const IconComponent = CONNECTOR_ICONS[config.icon];
                        return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
                      })()}
                    </div>
                    <span className="font-medium text-sm">{config.name}</span>
                  </div>
                  <Switch
                    checked={selectedConnectors.includes(provider as ConnectorProvider)}
                    onCheckedChange={() => handleConnectorToggle(provider as ConnectorProvider)}
                    disabled={isSingleConnector && selectedConnectors.includes(provider as ConnectorProvider)}
                  />
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
            <HugeiconsIcon icon={ConnectIcon} size={16} color="currentColor" strokeWidth={1.5} />
            <span className="ml-1">{selectedCount > 0 ? `${selectedCount} active` : 'Select'}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-2" align="start">
          <div className="space-y-1 max-h-64 overflow-auto">
            {availableConnectors.map(([provider, config]) => (
              <div key={provider} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-4 h-4">
                    {(() => {
                      const IconComponent = CONNECTOR_ICONS[config.icon];
                      return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
                    })()}
                  </div>
                  <span className="font-medium text-sm">{config.name}</span>
                </div>
                <Switch
                  checked={selectedConnectors.includes(provider as ConnectorProvider)}
                  onCheckedChange={() => handleConnectorToggle(provider as ConnectorProvider)}
                  disabled={isSingleConnector && selectedConnectors.includes(provider as ConnectorProvider)}
                />
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  },
);

ConnectorSelector.displayName = 'ConnectorSelector';

const WEB_SEARCH_PROVIDERS: Array<{
  value: SearchProvider;
  label: string;
  description: string;
}> = [
    {
      value: 'exa',
      label: 'Exa',
      description: 'Enhanced and faster neural web search with images and filtering.',
    },
    {
      value: 'firecrawl',
      label: 'Firecrawl',
      description: 'Web, news, and image search with content scraping capabilities.',
    },
    {
      value: 'parallel',
      label: 'Parallel AI',
      description: 'Base and premium web search with Parallel’s Firecrawl image support.',
    },
    {
      value: 'tavily',
      label: 'Tavily',
      description: 'Wide-reaching search with comprehensive summaries and analysis.',
    },
  ];

const GroupModeToggle: React.FC<GroupSelectorProps> = React.memo(
  ({ selectedGroup, onGroupSelect, onOpenSettings, isProUser, isAuthenticated, usageData }) => {
    const [open, setOpen] = useState(false);
    const isMobile = useIsMobile();
    const isExtreme = selectedGroup === 'extreme';

    // Check usage limits
    const messageCountExceeded = Boolean(
      !isProUser && usageData && usageData.messageCount >= SEARCH_LIMITS.DAILY_SEARCH_LIMIT,
    );
    const extremeSearchCountExceeded = Boolean(
      !isProUser && usageData && usageData.extremeSearchCount >= SEARCH_LIMITS.EXTREME_SEARCH_LIMIT,
    );

    // Get search provider from localStorage with reactive updates
    const [searchProvider, setSearchProvider] = useLocalStorage<SearchProvider>('scira-search-provider', 'exa');
    const [providerMenuOpen, setProviderMenuOpen] = useState(false);
    const currentProviderOption = useMemo(
      () => WEB_SEARCH_PROVIDERS.find((option) => option.value === searchProvider) ?? WEB_SEARCH_PROVIDERS[0],
      [searchProvider],
    );

    // Get dynamic search groups based on the selected search provider
    const dynamicSearchGroups = useMemo(() => getSearchGroups(searchProvider), [searchProvider]);

    // Memoize visible groups calculation
    const visibleGroups = useMemo(
      () =>
        dynamicSearchGroups.filter((group) => {
          if (!group.show) return false;
          if ('requireAuth' in group && group.requireAuth && !isAuthenticated) return false;
          // Don't filter out Pro-only groups, show them with Pro indicator
          if (group.id === 'extreme') return false; // Exclude extreme from dropdown
          return true;
        }),
      [dynamicSearchGroups, isAuthenticated],
    );

    // Persisted order for groups - must match settings-dialog.tsx
    const [groupOrder] = useSyncedPreferences<SearchGroupId[]>(
      'scira-group-order',
      dynamicSearchGroups.map((g) => g.id),
    );

    // Merge group order with current groups (same logic as settings-dialog.tsx)
    const mergedGroupOrder = useMemo(() => {
      const currentIds = dynamicSearchGroups.map((g) => g.id);
      const filteredExisting = (groupOrder || []).filter((id) => currentIds.includes(id));
      const missing = currentIds.filter((id) => !filteredExisting.includes(id));
      return [...filteredExisting, ...missing] as SearchGroupId[];
    }, [dynamicSearchGroups, groupOrder]);

    const orderedVisibleGroups = useMemo(() => {
      const order = mergedGroupOrder;
      const byId = new Map(visibleGroups.map((g) => [g.id, g] as const));
      const ordered = order.map((id) => byId.get(id)).filter((g): g is NonNullable<typeof g> => Boolean(g));
      const remaining = visibleGroups.filter((g) => !order.includes(g.id));
      return [...ordered, ...remaining];
    }, [visibleGroups, mergedGroupOrder]);

    const selectedGroupData = useMemo(
      () => orderedVisibleGroups.find((group) => group.id === selectedGroup),
      [orderedVisibleGroups, selectedGroup],
    );

    const groupTooltipContent = useMemo(() => {
      if (isExtreme) {
        return (
          <div className="grid gap-2 text-left">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <HugeiconsIcon icon={GlobalSearchIcon} size={16} color="currentColor" />
              </div>
              <p className="text-xs font-semibold text-foreground">Switch back to search modes</p>
            </div>
            <p className="text-xs leading-snug text-muted-foreground">
              Choose a different search experience from the list.
            </p>
            {!isProUser && messageCountExceeded && (
              <div className="grid gap-1.5 border-t border-border pt-2">
                <p className="text-[11px] text-destructive/90">
                  Daily limit reached ({SEARCH_LIMITS.DAILY_SEARCH_LIMIT} searches)
                </p>
                <a
                  href="/pricing"
                  className="group inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Upgrade for unlimited
                  <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </div>
            )}
          </div>
        );
      }

      if (!selectedGroupData) {
        return <p className="text-xs text-muted-foreground">Choose a search mode to get started.</p>;
      }

      return (
        <div className="grid gap-2 text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HugeiconsIcon icon={selectedGroupData.icon} size={16} color="currentColor" strokeWidth={2} />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold text-foreground">{selectedGroupData.name} Active</p>
              {'requirePro' in selectedGroupData && selectedGroupData.requirePro && !isProUser && (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                  PRO
                </span>
              )}
            </div>
          </div>
          <p className="text-xs leading-snug text-muted-foreground">{selectedGroupData.description}</p>
          {!isProUser && usageData && (
            <p className="text-[11px] text-muted-foreground/80">
              {usageData.messageCount} / {SEARCH_LIMITS.DAILY_SEARCH_LIMIT} searches used today
            </p>
          )}
          <p className="text-[11px] text-muted-foreground/80 italic">Click to switch search mode.</p>
          {!isProUser && (
            <div className="grid gap-1.5 border-t border-border pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Crown02Icon} size={16} color="currentColor" strokeWidth={2} />
                </div>
                <span>
                  {'requirePro' in selectedGroupData && selectedGroupData.requirePro
                    ? 'Unlock with Pro'
                    : 'Unlimited with Pro'}
                </span>
              </div>
              <a
                href="/pricing"
                className="group inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                {'requirePro' in selectedGroupData && selectedGroupData.requirePro
                  ? 'Explore pricing'
                  : 'Upgrade to Pro'}
                <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          )}
        </div>
      );
    }, [isExtreme, selectedGroupData, isProUser, messageCountExceeded, usageData]);

    const extremeTooltipContent = useMemo(() => {
      // Check if extreme search limit is exceeded
      if (!isProUser && extremeSearchCountExceeded && !isExtreme) {
        return (
          <div className="grid gap-2 text-left">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                <HugeiconsIcon icon={AtomicPowerIcon} size={16} color="currentColor" strokeWidth={2} />
              </div>
              <p className="text-xs font-semibold text-foreground">Monthly Limit Reached</p>
            </div>
            <p className="text-xs leading-snug text-muted-foreground">
              You've used {SEARCH_LIMITS.EXTREME_SEARCH_LIMIT} extreme searches this month.
            </p>
            <div className="grid gap-1.5 border-t border-border pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Crown02Icon} size={16} color="currentColor" strokeWidth={2} />
                </div>
                <span>Unlimited with Pro</span>
              </div>
              <a
                href="/pricing"
                className="group inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                Upgrade to Pro
                <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          </div>
        );
      }

      const title = isExtreme ? 'Extreme Search Active' : isAuthenticated ? 'Extreme Search' : 'Sign in Required';

      return (
        <div className="grid gap-2 text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <HugeiconsIcon icon={AtomicPowerIcon} size={16} color="currentColor" strokeWidth={2} />
            </div>
            <p className="text-xs font-semibold text-foreground">{title}</p>
          </div>
          <p className="text-xs leading-snug text-muted-foreground">
            Deep research with multiple sources and in-depth analysis with 3x sources.
          </p>
          {!isProUser && usageData && (
            <p className="text-[11px] text-muted-foreground/80">
              {usageData.extremeSearchCount} / {SEARCH_LIMITS.EXTREME_SEARCH_LIMIT} used this month
            </p>
          )}
          {!isProUser && (
            <div className="grid gap-1.5 border-t border-border pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Crown02Icon} size={16} color="currentColor" strokeWidth={2} />
                </div>
                <span>Unlimited with Pro</span>
              </div>
              <a
                href="/pricing"
                className="group inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                Explore pricing
                <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>
          )}
        </div>
      );
    }, [isExtreme, isProUser, isAuthenticated, extremeSearchCountExceeded, usageData]);

    const handleToggleExtreme = useCallback(() => {
      if (isExtreme) {
        // Switch back to web mode
        const webGroup = dynamicSearchGroups.find((group) => group.id === 'web');
        if (webGroup) {
          onGroupSelect(webGroup);
        }
      } else {
        // Check if user is authenticated before allowing extreme mode
        if (!isAuthenticated) {
          // Redirect to sign in page
          window.location.href = '/sign-in';
          return;
        }

        // Check if extreme search limit is exceeded (for non-Pro users)
        if (!isProUser && extremeSearchCountExceeded) {
          // Don't switch - user has exceeded their limit
          return;
        }

        // Switch to extreme mode
        const extremeGroup = dynamicSearchGroups.find((group) => group.id === 'extreme');
        if (extremeGroup) {
          onGroupSelect(extremeGroup);
        }
      }
    }, [isExtreme, onGroupSelect, dynamicSearchGroups, isAuthenticated, isProUser, extremeSearchCountExceeded]);

    const handleWebProviderChange = useCallback(
      (provider: SearchProvider) => {
        setSearchProvider(provider);
        const label = WEB_SEARCH_PROVIDERS.find((option) => option.value === provider)?.label ?? provider;
        toast.success(`Web search provider switched to ${label}`);
      },
      [setSearchProvider],
    );

    const renderWebProviderMenu = useCallback(() => {
      return (
        <Popover open={providerMenuOpen} onOpenChange={setProviderMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-5 rounded-full border border-border px-2 text-[10px] font-medium text-foreground/90 flex items-center gap-1 shadow-none"
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <span className="truncate">{currentProviderOption.label}</span>
              <CaretDownIcon className="h-2.5 w-2.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-0" align="end" side="right" sideOffset={8}>
            <Command>
              <CommandList>
                {WEB_SEARCH_PROVIDERS.map((provider) => (
                  <CommandItem
                    key={provider.value}
                    value={provider.value}
                    onSelect={(value) => {
                      handleWebProviderChange(value as SearchProvider);
                      setProviderMenuOpen(false);
                    }}
                    className="flex items-center justify-between px-3 py-1.5 text-[12px]"
                  >
                    <span className="font-medium text-foreground">{provider.label}</span>
                    {searchProvider === provider.value && <Check className="h-4 w-4 text-primary" />}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }, [currentProviderOption.label, handleWebProviderChange, providerMenuOpen, searchProvider]);

    // Shared handler for group selection
    const handleGroupSelect = useCallback(
      async (currentValue: string) => {
        const selectedGroup = visibleGroups.find((g) => g.id === currentValue);

        if (selectedGroup) {
          // Check if this is a Pro-only group and user is not Pro
          if ('requirePro' in selectedGroup && selectedGroup.requirePro && !isProUser) {
            // Redirect to pricing page to upgrade
            window.location.href = '/pricing';
            setOpen(false);
            return;
          }

          // Check if connectors group is selected but no connectors are connected
          if (selectedGroup.id === 'connectors' && isAuthenticated && onOpenSettings && isProUser) {
            try {
              const { listUserConnectorsAction } = await import('@/app/actions');
              const result = await listUserConnectorsAction();
              if (result.success && result.connections.length === 0) {
                // No connectors connected, open settings dialog to connectors tab
                onOpenSettings('connectors');
                setOpen(false);
                return;
              }
            } catch (error) {
              console.error('Error checking connectors:', error);
              // If there's an error, still allow group selection
            }
          }

          onGroupSelect(selectedGroup);
          setOpen(false);
        }
      },
      [visibleGroups, isProUser, onOpenSettings, isAuthenticated, onGroupSelect],
    );

    // Handle opening the dropdown/drawer
    const handleOpenChange = useCallback(
      (newOpen: boolean) => {
        if (newOpen && isExtreme) {
          // If trying to open in extreme mode, switch back to web mode instead
          const webGroup = dynamicSearchGroups.find((group) => group.id === 'web');
          if (webGroup) {
            onGroupSelect(webGroup);
          }
          return;
        }
        setOpen(newOpen);
      },
      [isExtreme, onGroupSelect, dynamicSearchGroups],
    );

    // Handle group selector button click (mobile only)
    const handleGroupSelectorClick = useCallback(() => {
      if (isExtreme) {
        // Switch back to web mode when clicking groups in extreme mode
        const webGroup = dynamicSearchGroups.find((group) => group.id === 'web');
        if (webGroup) {
          onGroupSelect(webGroup);
        }
      } else {
        setOpen(true);
      }
    }, [isExtreme, onGroupSelect, dynamicSearchGroups]);

    // Shared content component
    const GroupSelectionContent = () => (
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
            {orderedVisibleGroups.map((group) => {
              const isGroupDisabled =
                !isProUser && messageCountExceeded && !('requirePro' in group && group.requirePro);
              return (
                <CommandItem
                  key={group.id}
                  value={group.id}
                  onSelect={(value) => {
                    if (!isGroupDisabled) {
                      handleGroupSelect(value);
                    }
                  }}
                  disabled={isGroupDisabled}
                  className={cn(
                    'flex flex-col gap-2 px-2 py-2 mb-0.5 rounded-lg text-xs',
                    'transition-all duration-200',
                    isGroupDisabled
                      ? 'opacity-50 cursor-not-allowed hover:bg-transparent'
                      : 'hover:bg-accent data-[selected=true]:bg-accent',
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <HugeiconsIcon icon={group.icon} size={30} color="currentColor" />
                    <div className="flex flex-col min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1">
                        <span className="font-medium truncate text-[11px] text-foreground">{group.name}</span>
                        {'requirePro' in group && group.requirePro && !isProUser && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-medium bg-primary/10 text-primary border border-primary/20">
                            PRO
                          </span>
                        )}
                        {isGroupDisabled && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
                            LIMIT
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-muted-foreground truncate leading-tight text-wrap!">
                        {group.description}
                      </div>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <Check className={cn('h-4 w-4', selectedGroup === group.id ? 'opacity-100' : 'opacity-0')} />
                    </div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    );

    return (
      <div className="flex items-center">
        {/* Toggle Switch Container */}
        <div className="flex items-center bg-background border border-accent/50 rounded-lg gap-1! py-1! px-0.75! h-8!">
          {/* Group Selector Side - Conditional Rendering for Mobile/Desktop */}
          {isMobile ? (
            <Drawer open={open} onOpenChange={handleOpenChange}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DrawerTrigger asChild>
                    <Button
                      variant="ghost"
                      role="combobox"
                      aria-expanded={open}
                      size="sm"
                      onClick={handleGroupSelectorClick}
                      disabled={!isProUser && !isExtreme && messageCountExceeded}
                      className={cn(
                        'flex items-center gap-1.5 m-0! px-1.5! h-6! rounded-md! transition-all',
                        !isExtreme
                          ? !isProUser && messageCountExceeded
                            ? 'bg-accent/50 text-muted-foreground cursor-not-allowed opacity-50'
                            : 'bg-accent text-foreground hover:bg-accent/80 cursor-pointer'
                          : 'text-muted-foreground hover:bg-accent cursor-pointer',
                      )}
                    >
                      {selectedGroupData && !isExtreme && (
                        <>
                          <HugeiconsIcon icon={selectedGroupData.icon} size={30} color="currentColor" />
                          <CaretDownIcon
                            size={18}
                            color="currentColor"
                            strokeWidth={1.5}
                            className={cn(open ? 'rotate-180' : 'rotate-0', 'transition-transform duration-200')}
                          />
                        </>
                      )}
                      {isExtreme && (
                        <>
                          <HugeiconsIcon icon={GlobalSearchIcon} size={30} color="currentColor" />
                        </>
                      )}
                    </Button>
                  </DrawerTrigger>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-[200px] rounded-lg border border-border bg-popover p-2 text-left [&_svg.bg-primary]:bg-popover! [&_svg.fill-primary]:fill-popover!"
                >
                  {groupTooltipContent}
                </TooltipContent>
              </Tooltip>
              <DrawerContent className="max-h-[80vh]">
                <DrawerHeader className="text-left pb-4">
                  <DrawerTitle>Choose Search Mode</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6 max-h-[calc(80vh-100px)] overflow-y-auto">
                  <div className="space-y-2">
                    {orderedVisibleGroups.map((group) => {
                      const isGroupDisabled =
                        !isProUser && messageCountExceeded && !('requirePro' in group && group.requirePro);
                      return (
                        <div key={group.id} className="space-y-2">
                          <button
                            onClick={() => {
                              if (!isGroupDisabled) {
                                handleGroupSelect(group.id);
                              }
                            }}
                            disabled={isGroupDisabled}
                            className={cn(
                              'w-full flex items-center justify-between p-4 rounded-lg text-left transition-all',
                              'border border-border',
                              isGroupDisabled ? 'opacity-50 cursor-not-allowed bg-background' : 'hover:bg-accent',
                              selectedGroup === group.id ? 'bg-accent border-primary/20' : 'bg-background',
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <HugeiconsIcon icon={group.icon} size={24} color="currentColor" />
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm text-foreground">{group.name}</span>
                                  {'requirePro' in group && group.requirePro && !isProUser && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                      PRO
                                    </span>
                                  )}
                                  {isGroupDisabled && (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                                      LIMIT
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">{group.description}</div>
                              </div>
                            </div>
                            <div className="ml-3 flex items-center gap-1.5">
                              <Check
                                className={cn(
                                  'h-5 w-5 shrink-0',
                                  selectedGroup === group.id ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          ) : (
            <Popover open={open} onOpenChange={handleOpenChange}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      role="combobox"
                      aria-expanded={open}
                      size="sm"
                      disabled={!isProUser && !isExtreme && messageCountExceeded}
                      className={cn(
                        'flex items-center m-0! px-2! h-6! rounded-md! transition-all',
                        !isExtreme
                          ? !isProUser && messageCountExceeded
                            ? 'bg-accent/50 text-muted-foreground cursor-not-allowed opacity-50'
                            : 'bg-accent text-foreground hover:bg-accent/80 cursor-pointer'
                          : 'text-muted-foreground hover:bg-accent cursor-pointer',
                      )}
                    >
                      {selectedGroupData && !isExtreme && (
                        <>
                          <HugeiconsIcon
                            icon={selectedGroupData.icon}
                            size={30}
                            color="currentColor"
                            strokeWidth={1.5}
                          />
                          <CaretDownIcon
                            size={18}
                            color="currentColor"
                            strokeWidth={1.5}
                            className={cn(open ? 'rotate-180' : 'rotate-0', 'transition-transform duration-200')}
                          />
                        </>
                      )}
                      {isExtreme && (
                        <HugeiconsIcon icon={GlobalSearchIcon} size={30} color="currentColor" strokeWidth={1.5} />
                      )}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-[200px] rounded-lg border border-border bg-popover p-2 text-left [&_svg.bg-primary]:bg-popover! [&_svg.fill-primary]:fill-popover!"
                >
                  {groupTooltipContent}
                </TooltipContent>
              </Tooltip>
              <PopoverContent
                className="w-[90vw] sm:w-[14em] max-w-[14em] p-0 font-sans rounded-lg bg-popover z-50 border shadow-none!"
                align="start"
                side="bottom"
                sideOffset={4}
                avoidCollisions={true}
                collisionPadding={8}
              >
                <GroupSelectionContent />
              </PopoverContent>
            </Popover>
          )}

          {/* Extreme Mode Side */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleExtreme}
                disabled={!isProUser && extremeSearchCountExceeded && !isExtreme}
                className={cn(
                  'flex items-center gap-1.5 px-3 h-6 rounded-md transition-all',
                  isExtreme
                    ? 'bg-accent text-foreground hover:bg-accent/80'
                    : !isAuthenticated
                      ? 'text-muted-foreground/50 cursor-pointer'
                      : !isProUser && extremeSearchCountExceeded
                        ? 'text-muted-foreground/30 cursor-not-allowed'
                        : 'text-muted-foreground hover:bg-accent',
                )}
              >
                <HugeiconsIcon icon={AtomicPowerIcon} size={30} color="currentColor" strokeWidth={1.5} />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="max-w-[200px] rounded-lg border border-border bg-popover p-2 text-left [&_svg.bg-primary]:bg-popover! [&_svg.fill-primary]:fill-popover!"
            >
              {extremeTooltipContent}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    );
  },
);

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
  onOpenSettings,
  usageData,
  selectedConnectors = [],
  setSelectedConnectors,
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
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const [discountConfig, setDiscountConfig] = useState<DiscountConfig | null>(null);

  // Combined state for animations to avoid restart issues
  const isEnhancementActive = isEnhancing || isTypewriting;
  const audioLinesRef = useRef<any>(null);
  const gripIconRef = useRef<any>(null);

  const location = useLocation();
  const isMobile = useIsMobile();

  const isProUser = useMemo(
    () => Boolean(user?.isProUser),
    [user?.isProUser],
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
  }, [isRecording, input, setInput, inputRef]);

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
        // Check if user is signed in
        if (!user) {
          setShowSignInDialog(true);
          return;
        }

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
  }, [isRecording, cleanupMediaRecorder, setInput, user, setShowSignInDialog]);

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

        // Auto-switch to extreme-enabled model when extreme mode is selected
        if (group.id === 'extreme' && !supportsExtremeMode(selectedModel)) {
          // Get all available models and filter for extreme support
          const allModels = models;
          const extremeModels = allModels.filter((model) => {
            // Check if model supports extreme mode
            if (!supportsExtremeMode(model.value)) return false;

            // Check authentication requirement
            if (requiresAuthentication(model.value) && !user) return false;

            // Check pro requirement
            if (requiresProSubscription(model.value) && !isProUser) return false;

            return true;
          });

          if (extremeModels.length > 0) {
            // Prioritize: scira-default if available, otherwise first free model, then first available
            const defaultModel = extremeModels.find((m) => m.value === 'scira-default');
            const firstFreeModel = extremeModels.find((m) => !m.pro);
            const fallbackModel = extremeModels[0];

            const targetModel = defaultModel || firstFreeModel || fallbackModel;

            console.log(`Auto-switching to extreme-enabled model '${targetModel.value}' for extreme mode`);
            setSelectedModel(targetModel.value);
            toast.info(`Switched to ${targetModel.label} for extreme mode`);
          }
        }

        inputRef.current?.focus();
      }
    },
    [setSelectedGroup, inputRef, isEnhancing, isTypewriting, selectedModel, setSelectedModel, user, isProUser],
  );

  const handleConnectorToggle = useCallback(
    (provider: ConnectorProvider) => {
      if (!setSelectedConnectors) return;

      setSelectedConnectors((prev) => {
        if (prev.includes(provider)) {
          return prev.filter((p) => p !== provider);
        } else {
          return [...prev, provider];
        }
      });
    },
    [setSelectedConnectors],
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
    async (index: number) => {
      // Get the attachment to delete
      const attachmentToDelete = attachments[index];

      // Delete from Vercel Blob if it's a blob URL
      if (attachmentToDelete?.url && attachmentToDelete.url.includes('blob.vercel-storage.com')) {
        try {
          await fetch('/api/upload', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: attachmentToDelete.url }),
          });
        } catch (error) {
          console.error('Failed to delete file from storage:', error);
          // Continue with local removal even if API call fails
        }
      }

      // Remove from state
      setAttachments((prev) => prev.filter((_, i) => i !== index));
    },
    [attachments, setAttachments],
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
  }, [status, inputRef]);

  const updateChatUrl = useCallback((chatIdToAdd: string) => {
    const currentPath = window.location.pathname;
    if (currentPath === '/') {
      window.history.pushState({}, '', `/search/${chatIdToAdd}`);
      return;
    }
  }, []);

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

        setHasSubmitted(true);
        lastSubmittedQueryRef.current = input.trim();

        // Send the message
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

        // Update URL immediately after sending message for authenticated users
        // This keeps the URL in sync without triggering Next.js navigation

        if (user && typeof window !== 'undefined') {
          updateChatUrl(chatId);
        }

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
      setInput,
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

  // Create a ref to track if submission is in progress
  const isSubmittingRef = useRef(false);

  const submitForm = useCallback(() => {
    // Prevent multiple rapid submissions
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    onSubmit({ preventDefault: () => { }, stopPropagation: () => { } } as React.FormEvent<HTMLFormElement>);
    resetSuggestedQuestions();

    // Handle iOS keyboard behavior differently
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      inputRef.current?.blur();
    } else {
      inputRef.current?.focus();
    }

    // Reset the flag after a short delay
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 500);
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
      if (event.key === 'Enter' && !isCompositionActive.current) {
        if (isMobile) {
          // On mobile, allow Enter to create new lines only
          // Don't submit the form - users should use the send button
          // Just let the default behavior happen (newline insertion)
          return;
        } else {
          // Desktop behavior: Enter submits, Shift+Enter creates newline
          if (event.shiftKey) {
            return;
          }
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
      }
    },
    [isProcessing, isRecording, selectedModel, user, isLimitBlocked, submitForm, inputRef, isMobile],
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

  // Handle cursor positioning: move to end if cursor is at start when textarea has value
  // This handles both initial mount (from localStorage) and external value changes (example selection)
  const handleTextareaFocus = useCallback((e: React.FocusEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    if (textarea.value.length > 0 && textarea.selectionStart === 0 && textarea.selectionEnd === 0) {
      // Cursor is at start, move it to end
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    }
  }, []);

  return (
    <div className={cn('flex flex-col w-full max-w-2xl mx-auto')}>
      <TooltipProvider>
        <div
          className={cn(
            'relative w-full flex flex-col gap-1 rounded-xl transition-all duration-300 font-sans!',
            hasInteracted ? 'z-50' : 'z-10',
            isDragging && 'ring-1 ring-border',
            attachments.length > 0 || uploadQueue.length > 0
              ? 'bg-primary/5 border border-ring/20 backdrop-blur-md! p-1 shadow-none!'
              : 'bg-transparent',
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
                className="absolute inset-0 backdrop-blur-md bg-background/90 rounded-lg border border-dashed border-border/60 flex items-center justify-center z-50 m-2 shadow-xl shadow-black/10 dark:shadow-black/25"
              >
                <div className="flex items-center gap-4 px-6 py-8">
                  <div className="p-3 rounded-full bg-muted shadow-none!">
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
                  onRemove={() => { }}
                  isUploading={true}
                />
              ))}
            </div>
          )}

          {/* Form container */}
          <div className="relative">
            {/* Shadow-like background blur effect */}
            <div className="absolute -inset-1 rounded-2xl bg-primary/3 dark:bg-primary/3 blur-sm! pointer-events-none z-9999 shadow" />
            <div
              className={cn(
                'relative rounded-xl bg-muted! border border-ring/10 focus-within:border-ring/5 transition-all duration-200',
                (isEnhancing || isTypewriting) && 'bg-muted!',
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
                    'bg-muted!',
                    'border-0!',
                    'text-muted-foreground!',
                    'focus:ring-0! focus-visible:ring-0!',
                    'px-4! py-4!',
                    'touch-manipulation',
                    'whatsize',
                    'text-center',
                    'cursor-not-allowed',
                    'shadow-none!',
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
                  onFocus={handleTextareaFocus}
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
                    'bg-muted!',
                    'border-0!',
                    'text-foreground!',
                    'focus:ring-0! focus-visible:ring-0!',
                    'px-4! py-4!',
                    'touch-manipulation',
                    'whatsize',
                    'shadow-none!',
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
                  'bg-muted!',
                  'border-0!',
                  'p-2 gap-2 shadow-none',
                  'transition-all duration-200',
                  (isEnhancing || isTypewriting) && 'pointer-events-none',
                  isRecording && 'bg-muted! text-muted-foreground!',
                )}
              >
                <div className={cn('flex items-center gap-2')}>
                  <GroupModeToggle
                    selectedGroup={selectedGroup}
                    onGroupSelect={handleGroupSelect}
                    status={status}
                    onOpenSettings={onOpenSettings}
                    isProUser={isProUser}
                    isAuthenticated={!!user}
                    usageData={usageData}
                  />

                  {selectedGroup === 'connectors' && setSelectedConnectors && (
                    <ConnectorSelector
                      selectedConnectors={selectedConnectors}
                      onConnectorToggle={handleConnectorToggle}
                      user={user}
                      isProUser={isProUser}
                    />
                  )}

                  <ModelSwitcher
                    selectedModel={selectedModel}
                    setSelectedModel={setSelectedModel}
                    attachments={attachments}
                    messages={messages}
                    status={status}
                    onModelSelect={(model) => {
                      setSelectedModel(model.value);
                    }}
                    subscriptionData={subscriptionData}
                    user={user}
                    selectedGroup={selectedGroup}
                  />
                </div>

                <div className={cn('flex items-center shrink-0 gap-1')}>
                  {hasVisionSupport(selectedModel) && (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="group rounded-full transition-colors duration-200 size-8! border-0 shadow-none! hover:bg-primary/30 hover:border-0!"
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
                        className="border-0 backdrop-blur-xs py-2 px-3 shadow-none!"
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
                            'group rounded-full transition-colors duration-200 size-8! border-0 shadow-none! hover:bg-primary/30 hover:border-0!',
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
                        className="border-0 backdrop-blur-xs py-2 px-3 shadow-none!"
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
                          className="group rounded-full transition-colors duration-200 size-8!"
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
                        className="border-0 backdrop-blur-xs py-2 px-3 shadow-none!"
                      >
                        <span className="font-medium text-[11px]">Stop Generation</span>
                      </TooltipContent>
                    </Tooltip>
                  ) : input.length === 0 && attachments.length === 0 && !isEnhancing && !isTypewriting ? (
                    /* Show Voice Recording Button when no input */
                    (<Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          variant={isRecording ? 'destructive' : 'default'}
                          className={cn('group rounded-full m-auto transition-colors duration-200 size-8!')}
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
                        className="border-0 backdrop-blur-xs py-2 px-3 shadow-none!"
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
                    </Tooltip>)
                  ) : (
                    /* Show Send Button when there is input */
                    (<Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <Button
                          size="icon"
                          className="group rounded-full flex m-auto transition-colors duration-200 size-8!"
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
                        className="border-0 backdrop-blur-xs py-2 px-3 shadow-none!"
                      >
                        <div className="text-center">
                          <div className="font-medium text-[11px] mb-1">Send Message</div>
                          {!isMobile && (
                            <div className="text-[10px] text-accent space-y-0.5">
                              <div className="flex items-center justify-center gap-1.5">
                                <KbdGroup>
                                  <Kbd className="rounded text-[9px] px-0.5 h-4 min-w-4">Shift</Kbd>
                                  <span>+</span>
                                  <Kbd className="rounded text-[9px] px-0.5 h-4 min-w-4">Enter</Kbd>
                                </KbdGroup>
                                <span>for new line</span>
                              </div>
                              <div className="flex items-center justify-center gap-1.5">
                                <Kbd className="rounded text-[9px] px-0.5 h-4 min-w-4">Enter</Kbd>
                                <span>to send</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>)
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
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/30 to-black/10"></div>
                </div>
                <div className="relative z-10 flex flex-col gap-4">
                  <DialogTitle className="flex items-center gap-3 text-white">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xl sm:text-2xl font-bold">Unlock</span>
                      <ProBadge className="text-white! bg-white/20! ring-white/30! font-extralight! mb-0.5!" />
                    </div>
                  </DialogTitle>
                  <DialogDescription className="text-white/90">
                    {discountConfig?.enabled && discountConfig?.isStudentDiscount && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-white text-sm font-medium">
                          🎓 Student Discount
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      {pricing.inr ? (
                        // Show INR pricing when available
                        (pricing.inr.hasDiscount ? (<>
                          <span className="text-lg text-white/60 line-through">₹{pricing.inr.originalPrice}</span>
                          <span className="text-2xl font-bold">₹{pricing.inr.finalPrice}</span>
                        </>) : (<span className="text-2xl font-bold">₹{pricing.inr.finalPrice}</span>))
                      ) : // Show USD pricing for non-Indian users
                        pricing.usd.hasDiscount ? (
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
                    Upgrade to Pro
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 py-6 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Prompt Enhancement</p>
                  <p className="text-xs text-muted-foreground">AI-powered prompt optimization</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Unlimited Searches</p>
                  <p className="text-xs text-muted-foreground">No daily limits on your research</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Advanced AI Models</p>
                  <p className="text-xs text-muted-foreground">
                    Access to all AI models including Grok 4, Claude and GPT-5
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary shrink-0" />
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

        {/* Sign In Dialog */}
        <Dialog open={showSignInDialog} onOpenChange={setShowSignInDialog}>
          <DialogContent className="sm:max-w-[420px] p-0 gap-0 bg-background" showCloseButton={false}>
            <DialogHeader className="p-2">
              <div className="relative w-full p-6 rounded-md text-white overflow-hidden">
                <div className="absolute inset-0 bg-[url('/placeholder.png')] bg-cover bg-center rounded-sm">
                  <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/30 to-black/10"></div>
                </div>
                <div className="relative z-10 flex flex-col gap-4">
                  <DialogTitle className="flex items-center gap-3 text-white">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
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
                      <span className="text-sm text-white/70 truncate">for Voice Input</span>
                    </div>
                  </DialogTitle>
                  <DialogDescription className="text-white/90">
                    <p className="text-sm text-white/80 text-left">
                      Voice input requires an account to access. Create an account to unlock this feature and more.
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
                <CheckIcon className="size-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Voice Input</p>
                  <p className="text-xs text-muted-foreground">Record and transcribe voice messages</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Access better models</p>
                  <p className="text-xs text-muted-foreground">GPT-5 Nano and more premium models</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Save search history</p>
                  <p className="text-xs text-muted-foreground">Keep track of your conversations</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <CheckIcon className="size-4 text-primary shrink-0" />
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
      </TooltipProvider>
    </div>
  );
};

export default FormComponent;
