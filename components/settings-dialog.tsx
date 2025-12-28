'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useSyncedPreferences } from '@/hooks/use-synced-preferences';
import {
  getUserMessageCount,
  getSubDetails,
  getExtremeSearchUsageCount,
  getHistoricalUsage,
  getCustomInstructions,
  saveCustomInstructions,
  deleteCustomInstructionsAction,
  createConnectorAction,
  listUserConnectorsAction,
  deleteConnectorAction,
  manualSyncConnectorAction,
  getConnectorSyncStatusAction,
} from '@/app/actions';
import { SEARCH_LIMITS } from '@/lib/constants';
import { authClient, betterauthClient } from '@/lib/auth-client';
import {
  MagnifyingGlassIcon,
  LightningIcon,
  CalendarIcon,
  TrashIcon,
  FloppyDiskIcon,
  ArrowClockwiseIcon,
  RobotIcon,
} from '@phosphor-icons/react';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getAllMemories, deleteMemory, MemoryItem } from '@/lib/memory-actions';
import { Loader2, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getSearchGroups, type SearchGroupId } from '@/lib/utils';
import { models } from '@/ai/providers';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { useIsProUser } from '@/contexts/user-context';
import { SciraLogo } from './logos/scira-logo';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import {
  Crown02Icon,
  UserAccountIcon,
  Analytics01Icon,
  Settings02Icon,
  Brain02Icon,
  GlobalSearchIcon,
  ConnectIcon,
  InformationCircleIcon,
  Rocket01Icon,
} from '@hugeicons/core-free-icons';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { CONNECTOR_CONFIGS, CONNECTOR_ICONS, type ConnectorProvider } from '@/lib/connectors';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  subscriptionData?: any;
  isProUser?: boolean;
  isProStatusLoading?: boolean;
  isCustomInstructionsEnabled?: boolean;
  setIsCustomInstructionsEnabled?: (value: boolean | ((val: boolean) => boolean)) => void;
  initialTab?: string;
}

// Component for Profile Information
export function ProfileSection({ user, subscriptionData, isProUser, isProStatusLoading }: any) {
  const { isProUser: fastProStatus, isLoading: fastProLoading } = useIsProUser();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Use comprehensive Pro status from user data (includes both Polar + DodoPayments)
  const isProUserActive: boolean = user?.isProUser || fastProStatus || false;
  const showProLoading: boolean = Boolean(fastProLoading || isProStatusLoading);

  return (
    <div>
      <div className={cn('flex flex-col items-center text-center space-y-3', isMobile ? 'pb-2' : 'pb-4')}>
        <Avatar className={isMobile ? 'h-16 w-16' : 'h-20 w-20'}>
          <AvatarImage src={user?.image || ''} />
          <AvatarFallback className={isMobile ? 'text-base' : 'text-lg'}>
            {user?.name
              ? user.name
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
              : 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h3 className={cn('font-semibold', isMobile ? 'text-base' : 'text-lg')}>{user?.name}</h3>
          <p className={cn('text-muted-foreground', isMobile ? 'text-xs' : 'text-sm')}>{user?.email}</p>
          {showProLoading ? (
            <Skeleton className="h-5 w-16 mx-auto" />
          ) : (
            isProUserActive && (
              <span
                className={cn(
                  'font-baumans! px-2 pt-1 pb-2 inline-flex leading-5 mt-2 items-center rounded-lg shadow-sm border-transparent ring-1 ring-ring/35 ring-offset-1 ring-offset-background',
                  'bg-linear-to-br from-secondary/25 via-primary/20 to-accent/25 text-foreground',
                  'dark:bg-linear-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground',
                )}
              >
                pro user
              </span>
            )
          )}
        </div>
      </div>

      <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
        <div className={cn('bg-muted/50 rounded-lg space-y-3', isMobile ? 'p-3' : 'p-4')}>
          <div>
            <Label className="text-xs text-muted-foreground">Full Name</Label>
            <p className="text-sm font-medium mt-1">{user?.name || 'Not provided'}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email Address</Label>
            <p className="text-sm font-medium mt-1 break-all">{user?.email || 'Not provided'}</p>
          </div>
        </div>

        <div className={cn('bg-muted/30 rounded-lg border border-border', isMobile ? 'p-2.5' : 'p-3')}>
          <p className={cn('text-muted-foreground', isMobile ? 'text-[11px]' : 'text-xs')}>
            Profile information is managed through your authentication provider. Contact support to update your details.
          </p>
        </div>
      </div>
    </div>
  );
}

// Icon components for search providers
const ParallelIcon = ({ className }: { className?: string }) => (
  <Image
    src="/parallel-icon.svg"
    alt="Parallel AI"
    width={16}
    height={16}
    className={cn('bg-white rounded-full p-0.5', className)}
  />
);

const ExaIcon = ({ className }: { className?: string }) => (
  <Image src="/exa-color.svg" alt="Exa" width={16} height={16} className={className} />
);

const TavilyIcon = ({ className }: { className?: string }) => (
  <Image src="/tavily-color.svg" alt="Tavily" width={16} height={16} className={className} />
);

const FirecrawlIcon = ({ className }: { className?: string }) => (
  <span className={cn('text-base sm:text-lg mb-3! pr-1!', className)}>🔥</span>
);

// Search Provider Options
const searchProviders = [
  {
    value: 'exa',
    label: 'Exa',
    description: 'Enhanced and faster web search with images and advanced filtering',
    icon: ExaIcon,
    default: true,
  },
  {
    value: 'firecrawl',
    label: 'Firecrawl',
    description: 'Web, news, and image search with content scraping capabilities',
    icon: FirecrawlIcon,
    default: false,
  },
  {
    value: 'parallel',
    label: 'Parallel AI',
    description: 'Base and premium web search along with Firecrawl image search support',
    icon: ParallelIcon,
    default: false,
  },
  {
    value: 'tavily',
    label: 'Tavily',
    description: 'Wide web search with comprehensive results and analysis',
    icon: TavilyIcon,
    default: false,
  },
] as const;

// Extreme Search Provider list
const extremeSearchProviders = [
  {
    value: 'exa',
    label: 'Exa',
    description: 'Neural search engine optimized for high-quality content',
    icon: ExaIcon,
    default: true,
  },
  {
    value: 'parallel',
    label: 'Parallel',
    description: 'AI-powered extraction with enhanced speed and quality',
    icon: ParallelIcon,
    default: false,
  },
] as const;

// Search Provider Selector Component
function SearchProviderSelector({
  value,
  onValueChange,
  disabled,
  className,
}: {
  value: string;
  onValueChange: (value: 'exa' | 'parallel' | 'tavily' | 'firecrawl') => void;
  disabled?: boolean;
  className?: string;
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
        {searchProviders.map((provider) => (
          <button
            key={provider.value}
            onClick={() => onValueChange(provider.value as any)}
            disabled={disabled}
            className={cn(
              'flex flex-col items-start p-4 rounded-lg border transition-all duration-200',
              'hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              value === provider.value
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-border bg-background hover:border-border/80',
            )}
          >
            <div className="flex items-center gap-2.5 w-full mb-2">
              <provider.icon className="text-muted-foreground size-4 shrink-0" />
              <div className="font-medium text-sm flex items-center gap-2">
                {provider.label}
                {provider.default && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0.5 bg-primary/10 text-primary border-0">
                    Default
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed text-left">{provider.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Extreme Search Provider Selector Component
function ExtremeSearchProviderSelector({
  value,
  onValueChange,
  disabled,
  className,
}: {
  value: string;
  onValueChange: (value: 'exa' | 'parallel') => void;
  disabled?: boolean;
  className?: string;
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
        {extremeSearchProviders.map((provider) => (
          <button
            key={provider.value}
            onClick={() => onValueChange(provider.value as any)}
            disabled={disabled}
            className={cn(
              'flex flex-col items-start p-4 rounded-lg border transition-all duration-200',
              'hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              value === provider.value
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-border bg-background hover:border-border/80',
            )}
          >
            <div className="flex items-center gap-2.5 w-full mb-2">
              <provider.icon className="text-muted-foreground size-4 shrink-0" />
              <div className="font-medium text-sm flex items-center gap-2">
                {provider.label}
                {provider.default && (
                  <Badge variant="secondary" className="text-[9px] px-1 py-0.5 bg-primary/10 text-primary border-0">
                    Default
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed text-left">{provider.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Component for Combined Preferences (Search + Custom Instructions)
export function PreferencesSection({
  user,
  isCustomInstructionsEnabled,
  setIsCustomInstructionsEnabled,
}: {
  user: any;
  isCustomInstructionsEnabled?: boolean;
  setIsCustomInstructionsEnabled?: (value: boolean | ((val: boolean) => boolean)) => void;
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [searchProvider, setSearchProvider] = useSyncedPreferences<'exa' | 'parallel' | 'tavily' | 'firecrawl'>(
    'scira-search-provider',
    'exa',
  );

  const [extremeSearchProvider, setExtremeSearchProvider] = useSyncedPreferences<'exa' | 'parallel'>(
    'scira-extreme-search-provider',
    'exa',
  );

  const [locationMetadataEnabled, setLocationMetadataEnabled] = useSyncedPreferences<boolean>(
    'scira-location-metadata-enabled',
    false,
  );

  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Reorder state: groups and models
  const dynamicGroups = useMemo(() => getSearchGroups(searchProvider), [searchProvider]);
  const [groupOrder, setGroupOrder] = useSyncedPreferences<SearchGroupId[]>(
    'scira-group-order',
    dynamicGroups.map((g) => g.id),
  );
  const mergedGroupOrder = useMemo(() => {
    const currentIds = dynamicGroups.map((g) => g.id);
    const filteredExisting = groupOrder.filter((id) => currentIds.includes(id));
    const missing = currentIds.filter((id) => !filteredExisting.includes(id));
    return [...filteredExisting, ...missing] as SearchGroupId[];
  }, [dynamicGroups, groupOrder]);

  const allModelIds = useMemo(() => models.map((m) => m.value), []);
  const [globalModelOrder, setGlobalModelOrder] = useSyncedPreferences<string[]>('scira-model-order-global', allModelIds);
  const mergedModelOrder = useMemo(() => {
    const validSet = new Set(allModelIds);
    const base = (globalModelOrder && globalModelOrder.length > 0 ? globalModelOrder : []).filter((id) =>
      validSet.has(id),
    );
    const missing = allModelIds.filter((id) => !base.includes(id));
    return [...base, ...missing];
  }, [globalModelOrder, allModelIds]);

  const enabled = isCustomInstructionsEnabled ?? true;
  const setEnabled = setIsCustomInstructionsEnabled ?? (() => { });

  const handleSearchProviderChange = (newProvider: 'exa' | 'parallel' | 'tavily' | 'firecrawl') => {
    setSearchProvider(newProvider);
    toast.success(
      `Search provider changed to ${newProvider === 'exa'
          ? 'Exa'
          : newProvider === 'parallel'
            ? 'Parallel AI'
            : newProvider === 'tavily'
              ? 'Tavily'
              : 'Firecrawl'
      }`,
    );
  };

  const handleExtremeSearchProviderChange = (newProvider: 'exa' | 'parallel') => {
    setExtremeSearchProvider(newProvider);
    toast.success(`Extreme search provider changed to ${newProvider === 'exa' ? 'Exa' : 'Parallel AI'}`);
  };

  // Custom Instructions queries and handlers
  const {
    data: customInstructions,
    isLoading: customInstructionsLoading,
    refetch,
  } = useQuery({
    queryKey: ['customInstructions', user?.id],
    queryFn: () => getCustomInstructions(user),
    enabled: !!user,
  });

  useEffect(() => {
    if (customInstructions?.content) {
      setContent(customInstructions.content);
    }
  }, [customInstructions]);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('Please enter some instructions');
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveCustomInstructions(content);
      if (result.success) {
        toast.success('Custom instructions saved successfully');
        refetch();
      } else {
        toast.error(result.error || 'Failed to save instructions');
      }
    } catch (error) {
      toast.error('Failed to save instructions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      const result = await deleteCustomInstructionsAction();
      if (result.success) {
        toast.success('Custom instructions deleted successfully');
        setContent('');
        refetch();
      } else {
        toast.error(result.error || 'Failed to delete instructions');
      }
    } catch (error) {
      toast.error('Failed to delete instructions');
    } finally {
      setIsSaving(false);
    }
  };

  const [preferencesTab, setPreferencesTab] = useState<'general' | 'ordering'>('general');

  return (
    <div className={cn('space-y-4', isMobile ? 'space-y-3' : 'space-y-4')}>
      <Tabs value={preferencesTab} onValueChange={(v) => setPreferencesTab(v as 'general' | 'ordering')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ordering">Ordering</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-4">
          {/* Custom Instructions Section */}
          <div className="space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <RobotIcon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Custom Instructions</h4>
                  <p className="text-xs text-muted-foreground">Customize how the AI responds to you</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start justify-between p-3 rounded-lg border bg-card">
                  <div className="flex-1 mr-3">
                    <Label htmlFor="enable-instructions" className="text-sm font-medium">
                      Enable Custom Instructions
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Toggle to enable or disable custom instructions
                    </p>
                  </div>
                  <Switch id="enable-instructions" checked={enabled} onCheckedChange={setEnabled} />
                </div>

                <div className={cn('space-y-3', !enabled && 'opacity-50')}>
                  <div>
                    <Label htmlFor="instructions" className="text-sm font-medium">
                      Instructions
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                      Guide how the AI responds to your questions
                    </p>
                    {customInstructionsLoading ? (
                      <Skeleton className="h-28 w-full" />
                    ) : (
                      <Textarea
                        id="instructions"
                        placeholder="Enter your custom instructions here... For example: 'Always provide code examples when explaining programming concepts' or 'Keep responses concise and focused on practical applications'"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="min-h-[100px] resize-y text-sm"
                        style={{ maxHeight: '25dvh' }}
                        onFocus={(e) => {
                          // Keep the focused textarea within the drawer's scroll container without jumping the whole viewport
                          try {
                            e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
                          } catch { }
                        }}
                        disabled={isSaving || !enabled}
                      />
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || !content.trim() || customInstructionsLoading || !enabled}
                      size="sm"
                      className="flex-1 h-8"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FloppyDiskIcon className="w-3 h-3 mr-1.5" />
                          Save Instructions
                        </>
                      )}
                    </Button>
                    {customInstructions && (
                      <Button
                        variant="outline"
                        onClick={handleDelete}
                        disabled={isSaving || customInstructionsLoading || !enabled}
                        size="sm"
                        className="h-8 px-2.5"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </Button>
                    )}
                  </div>

                  {customInstructionsLoading ? (
                    <div className="p-2.5 bg-muted/30 rounded-lg">
                      <Skeleton className="h-3 w-28" />
                    </div>
                  ) : customInstructions ? (
                    <div className="p-2.5 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        Last updated: {new Date(customInstructions.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Location Metadata Section */}
          <div className="space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <HugeiconsIcon icon={InformationCircleIcon} className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Location Metadata</h4>
                  <p className="text-xs text-muted-foreground">Include location data in system prompts</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start justify-between p-3 rounded-lg border bg-card">
                  <div className="flex-1 mr-3">
                    <Label htmlFor="location-metadata" className="text-sm font-medium">
                      Enable Location Metadata
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      When enabled, your approximate location (latitude and longitude) will be included in the system
                      prompt to help provide location-aware responses. This is disabled by default for privacy.
                    </p>
                  </div>
                  <Switch
                    id="location-metadata"
                    checked={locationMetadataEnabled}
                    onCheckedChange={setLocationMetadataEnabled}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Search Provider Section */}
          <div className="space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <HugeiconsIcon icon={GlobalSearchIcon} className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Search Provider</h4>
                  <p className="text-xs text-muted-foreground">Choose your preferred search engine</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <SearchProviderSelector value={searchProvider} onValueChange={handleSearchProviderChange} />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Select your preferred search provider for web searches. Changes take effect immediately and will be
                  used for all future searches.
                </p>
              </div>
            </div>
          </div>

          {/* Extreme Search Provider Section */}
          <div className="space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <HugeiconsIcon icon={Rocket01Icon} className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Extreme Search Provider</h4>
                  <p className="text-xs text-muted-foreground">Choose your content extraction engine</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <ExtremeSearchProviderSelector
                  value={extremeSearchProvider}
                  onValueChange={handleExtremeSearchProviderChange}
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Select your preferred provider for extreme search content extraction. This determines how web content
                  is fetched and processed during deep research.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ordering" className="space-y-6 mt-4">
          {/* Reorder Search Groups */}
          <div className="space-y-3">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <HugeiconsIcon icon={Settings02Icon} className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Reorder Search Modes</h4>
                  <p className="text-xs text-muted-foreground">Drag to set your preferred order</p>
                </div>
              </div>

              <ReorderList
                items={mergedGroupOrder.filter((id) => dynamicGroups.some((g) => g.id === id))}
                renderItem={(id) => {
                  const group = dynamicGroups.find((g) => g.id === id)!;
                  return (
                    <div className="flex items-center justify-between p-3 rounded-md border bg-card">
                      <div className="flex items-center gap-2 min-w-0">
                        <HugeiconsIcon icon={group.icon} size={16} color="currentColor" />
                        <span className="text-sm font-medium truncate">{group.name}</span>
                      </div>
                      {'requirePro' in group && group.requirePro && (
                        <Badge variant="secondary" className="text-[10px]">
                          PRO
                        </Badge>
                      )}
                    </div>
                  );
                }}
                onReorder={(ids) => setGroupOrder(ids as SearchGroupId[])}
              />
            </div>
          </div>

          {/* Reorder Models (Pro users only) - simplified single list */}
          {user?.isProUser && (
            <div className="space-y-3">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <HugeiconsIcon icon={Settings02Icon} className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Reorder Models</h4>
                    <p className="text-xs text-muted-foreground">Drag to set your preferred model order</p>
                  </div>
                </div>

                {(() => {
                  const visible = mergedModelOrder.filter((id) => models.some((m) => m.value === id));
                  return (
                    <ReorderList
                      items={visible as string[]}
                      renderItem={(id: string) => {
                        const m = models.find((x) => x.value === id)!;
                        return (
                          <div className="flex flex-col p-3 rounded-md border bg-card">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-sm font-medium truncate">{m.label}</div>
                              {m.pro && (
                                <Badge variant="secondary" className="text-[10px]">
                                  PRO
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-2">{m.description}</div>
                          </div>
                        );
                      }}
                      onReorder={(ids) => setGlobalModelOrder(ids as string[])}
                    />
                  );
                })()}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Generic sortable item component
const SortableItem = memo(function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 select-none">
      <button
        {...attributes}
        {...listeners}
        className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
});

const ReorderList = memo(function ReorderList<T extends string>({
  items,
  renderItem,
  onReorder,
}: {
  items: T[];
  renderItem: (id: T) => React.ReactNode;
  onReorder: (ids: T[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 5,
      },
    }),
  );

  const handleDragEnd = useCallback(
    (event: any) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      onReorder(arrayMove(items, oldIndex, newIndex));
    },
    [items, onReorder],
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((id) => (
            <SortableItem key={id} id={id}>
              {renderItem(id)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
});

// Component for Usage Information
type TimePeriod = '7d' | '30d' | '12m';

export function UsageSection({ user }: any) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('7d');

  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isProUser = user?.isProUser;
  
  // Convert time period to days
  const daysWindow = useMemo(() => {
    switch (timePeriod) {
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '12m':
        return 365; // 12 months
      default:
        return 7;
    }
  }, [timePeriod]);

  const {
    data: usageData,
    isLoading: usageLoading,
    error: usageError,
    refetch: refetchUsageData,
  } = useQuery({
    queryKey: ['usageData'],
    queryFn: async () => {
      const [searchCount, extremeSearchCount, subscriptionDetails] = await Promise.all([
        getUserMessageCount(),
        getExtremeSearchUsageCount(),
        getSubDetails(),
      ]);

      return {
        searchCount,
        extremeSearchCount,
        subscriptionDetails,
      };
    },
    staleTime: 1000 * 60 * 3,
    enabled: !!user,
  });

  const {
    data: historicalUsageData,
    isLoading: historicalLoading,
    refetch: refetchHistoricalData,
  } = useQuery({
    queryKey: ['historicalUsage', user?.id, daysWindow],
    queryFn: () => getHistoricalUsage(user, daysWindow),
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  const searchCount = usageData?.searchCount;
  const extremeSearchCount = usageData?.extremeSearchCount;

  // Transform historical data for chart
  const chartData = useMemo(() => {
    if (!historicalUsageData || historicalUsageData.length === 0) return [];

    // For 12m, group by week; for others, use daily data
    if (timePeriod === '12m') {
      // Group by week for 12 months view
      const weeklyData = new Map<string, { total: number; count: number }>();
      
      historicalUsageData.forEach((item) => {
        const date = new Date(item.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        
        const existing = weeklyData.get(weekKey) || { total: 0, count: 0 };
        weeklyData.set(weekKey, {
          total: existing.total + item.count,
          count: existing.count + 1,
        });
      });

      return Array.from(weeklyData.entries())
        .map(([date, data]) => ({
          date,
          messages: data.total,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } else {
      // Use daily data for 7d and 30d
      return historicalUsageData
        .map((item) => ({
          date: item.date,
          messages: item.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }
  }, [historicalUsageData, timePeriod]);

  const chartConfig: ChartConfig = {
    messages: {
      label: 'Messages',
      theme: {
        light: 'oklch(0.4341 0.0392 41.9938)', // Primary color for light mode
        dark: 'oklch(0.9247 0.0524 66.1732)', // Lighter primary for dark mode
      },
    },
  };

  const handleRefreshUsage = async () => {
    try {
      setIsRefreshing(true);
      await Promise.all([refetchUsageData(), refetchHistoricalData()]);
      toast.success('Usage data refreshed');
    } catch (error) {
      toast.error('Failed to refresh usage data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const usagePercentage = isProUser
    ? 0
    : Math.min(((searchCount?.count || 0) / SEARCH_LIMITS.DAILY_SEARCH_LIMIT) * 100, 100);

  return (
    <div className={cn('flex flex-col gap-4',isMobile ? 'space-y-4' : 'space-y-5', isMobile && !isProUser ? 'pb-4' : '')}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Daily Search Usage</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefreshUsage}
          disabled={isRefreshing}
          className={isMobile ? 'h-7 px-1.5' : 'h-8 px-2'}
        >
          {isRefreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ArrowClockwiseIcon className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      <div className={cn('grid', isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-3')}>
        <div className={cn('bg-muted/50 rounded-lg space-y-1', isMobile ? 'p-3' : 'p-3')}>
          <div className="flex items-center justify-between">
            <span className={cn('text-muted-foreground', isMobile ? 'text-[11px]' : 'text-xs')}>Today</span>
            <MagnifyingGlassIcon className={isMobile ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          </div>
          {usageLoading ? (
            <Skeleton className={cn('font-semibold', isMobile ? 'text-base h-4' : 'text-lg h-5')} />
          ) : (
            <div className={cn('font-semibold', isMobile ? 'text-base' : 'text-lg')}>{searchCount?.count || 0}</div>
          )}
          <p className="text-[10px] text-muted-foreground">Regular searches</p>
        </div>

        <div className={cn('bg-muted/50 rounded-lg space-y-1', isMobile ? 'p-3' : 'p-3')}>
          <div className="flex items-center justify-between">
            <span className={cn('text-muted-foreground', isMobile ? 'text-[11px]' : 'text-xs')}>Extreme</span>
            <LightningIcon className={isMobile ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          </div>
          {usageLoading ? (
            <Skeleton className={cn('font-semibold', isMobile ? 'text-base h-4' : 'text-lg h-5')} />
          ) : (
            <div className={cn('font-semibold', isMobile ? 'text-base' : 'text-lg')}>
              {extremeSearchCount?.count || 0}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">This month</p>
        </div>
      </div>

      {!isProUser && (
        <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
          <div className={cn('bg-muted/30 rounded-lg space-y-2 p-3')}>
            {usageLoading ? (
              <>
                <div className="flex justify-between text-xs">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-1.5 w-full" />
              </>
            ) : (
              <>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">Daily Search Limit</span>
                  <span className="text-muted-foreground">{usagePercentage.toFixed(0)}%</span>
                </div>
                <Progress value={usagePercentage} className="h-1.5 [&>div]:transition-none" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>
                    {searchCount?.count || 0} / {SEARCH_LIMITS.DAILY_SEARCH_LIMIT}
                  </span>
                  <span>{Math.max(0, SEARCH_LIMITS.DAILY_SEARCH_LIMIT - (searchCount?.count || 0))} left</span>
                </div>
              </>
            )}
          </div>
          
          <div className={cn('bg-muted/30 rounded-lg space-y-2 p-3')}>
            {usageLoading ? (
              <>
                <div className="flex justify-between text-xs">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-1.5 w-full" />
              </>
            ) : (
              <>
                <div className="flex justify-between text-xs">
                  <span className="font-medium">Monthly Extreme Search Limit</span>
                  <span className="text-muted-foreground">
                    {Math.min(((extremeSearchCount?.count || 0) / SEARCH_LIMITS.EXTREME_SEARCH_LIMIT) * 100, 100).toFixed(0)}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(((extremeSearchCount?.count || 0) / SEARCH_LIMITS.EXTREME_SEARCH_LIMIT) * 100, 100)} 
                  className="h-1.5 [&>div]:transition-none" 
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>
                    {extremeSearchCount?.count || 0} / {SEARCH_LIMITS.EXTREME_SEARCH_LIMIT}
                  </span>
                  <span>{Math.max(0, SEARCH_LIMITS.EXTREME_SEARCH_LIMIT - (extremeSearchCount?.count || 0))} left</span>
                </div>
              </>
            )}
          </div>

          <div className={cn('bg-card rounded-lg border border-border', isMobile ? 'p-3' : 'p-4')}>
            <div className={cn('flex items-center gap-2', isMobile ? 'mb-1.5' : 'mb-2')}>
              <HugeiconsIcon icon={Crown02Icon} size={isMobile ? 14 : 16} color="currentColor" strokeWidth={1.5} />
              <span className={cn('font-semibold', isMobile ? 'text-xs' : 'text-sm')}>Upgrade to Pro</span>
            </div>
            <p className={cn('text-muted-foreground mb-3', isMobile ? 'text-[11px]' : 'text-xs')}>
              Get unlimited searches and premium features
            </p>
            <Button asChild size="sm" className={cn('w-full', isMobile ? 'h-7 text-xs' : 'h-8')}>
              <Link href="/pricing">Upgrade Now</Link>
            </Button>
          </div>
        </div>
      )}

      {!usageLoading && (
        <div className={cn('space-y-2 w-full', isMobile && !isProUser ? 'pb-4' : '')}>
          <div className="flex items-center justify-between">
          <h4 className={cn('font-semibold text-muted-foreground', isMobile ? 'text-[11px]' : 'text-xs')}>
              Activity
          </h4>
            <ButtonGroup orientation="horizontal" className="h-7">
              <Button
                variant={timePeriod === '7d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimePeriod('7d')}
                className={cn('h-7 px-2 text-[10px]', isMobile && 'px-1.5')}
              >
                7d
              </Button>
              <Button
                variant={timePeriod === '30d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimePeriod('30d')}
                className={cn('h-7 px-2 text-[10px]', isMobile && 'px-1.5')}
              >
                30d
              </Button>
              <Button
                variant={timePeriod === '12m' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimePeriod('12m')}
                className={cn('h-7 px-2 text-[10px]', isMobile && 'px-1.5')}
              >
                12m
              </Button>
            </ButtonGroup>
          </div>
          <div className={cn('bg-muted/50 dark:bg-card rounded-lg p-3 w-full')}>
            {historicalLoading ? (
              <div className="h-[200px] flex items-center justify-center opacity-60">
                <div className="text-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  <p className={cn('text-muted-foreground', isMobile ? 'text-[11px]' : 'text-xs')}>
                    Loading activity data...
                  </p>
                </div>
              </div>
            ) : chartData && chartData.length > 0 ? (
              <div className="w-full min-w-0 overflow-hidden">
                <ChartContainer config={chartConfig} className="h-[200px] w-full min-w-0 flex-col! justify-start!">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: isMobile ? 0 : 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="messagesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-messages)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--color-messages)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value, index) => {
                        const date = new Date(value);
                        let labelInterval: number;
                        let format: (d: Date) => string;
                        
                        if (timePeriod === '7d') {
                          // Show day names for 7d view
                          labelInterval = Math.max(1, Math.floor(chartData.length / 5));
                          format = (d) => d.toLocaleDateString('en-US', { weekday: 'short' });
                        } else if (timePeriod === '30d') {
                          // Show month and day for 30d view
                          labelInterval = Math.max(1, Math.floor(chartData.length / 5));
                          format = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        } else {
                          // Show month for 12m view
                          labelInterval = Math.max(1, Math.floor(chartData.length / 6));
                          format = (d) => d.toLocaleDateString('en-US', { month: 'short' });
                        }
                        
                        // Only show label at intervals, first, and last
                        if (index % labelInterval !== 0 && index !== 0 && index !== chartData.length - 1) {
                          return '';
                        }
                        
                        return format(date);
                      }}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 9 : 11 }}
                      tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                      minTickGap={isMobile ? 15 : 25}
                      interval={0}
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? 'end' : 'middle'}
                      height={isMobile ? 50 : 30}
                    />
                    <YAxis
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
                      tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                      width={isMobile ? 30 : 40}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) => {
                            const date = new Date(value);
                            if (timePeriod === '12m') {
                              const weekEnd = new Date(date);
                              weekEnd.setDate(date.getDate() + 6);
                              return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                            }
                            return date.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            });
                          }}
                          formatter={(value) => {
                            return [`${value}`, ' Messages'] as [string, string];
                          }}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="messages"
                      stroke="var(--color-messages)"
                      strokeWidth={1.5}
                      fill="url(#messagesGradient)"
                      dot={false}
                      activeDot={{ r: 4, stroke: 'var(--color-messages)', strokeWidth: 1.5, fill: 'var(--color-messages)' }}
                    />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center">
                <p className={cn('text-muted-foreground', isMobile ? 'text-[11px]' : 'text-xs')}>No activity data</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Component for Subscription Information
export function SubscriptionSection({ subscriptionData, isProUser, user }: any) {
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Use data from user object (already cached)
  const dodoProStatus = user?.dodoProStatus || null;

  // Fetch Polar orders using React Query
  const { data: polarOrders, isLoading: polarOrdersLoading } = useQuery({
    queryKey: ['polarOrders', user?.id],
    queryFn: async () => {
      try {
        const ordersResponse = await authClient.customer.orders.list({
          query: {
            page: 1,
            limit: 10,
            productBillingType: 'recurring',
          },
        });
        return ordersResponse.data;
      } catch (error) {
        console.log('Failed to fetch Polar orders:', error);
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Fetch Dodo subscriptions using React Query
  const { data: dodoSubscriptions, isLoading: dodoSubscriptionsLoading } = useQuery({
    queryKey: ['dodoSubscriptions', user?.id],
    queryFn: async () => {
      try {
        const { data, error } = await betterauthClient.dodopayments.customer.subscriptions.list();
        if (error) {
          console.log('Failed to fetch Dodo subscriptions:', error);
          return null;
        }
        console.log('Dodo subscriptions response:', data);
        return data;
      } catch (error) {
        console.log('Failed to fetch Dodo subscriptions:', error);
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const handleManageSubscription = async () => {
    // Determine the subscription source
    const getProAccessSource = () => {
      if (hasActiveSubscription) return 'polar';
      if (hasDodoProStatus) return 'dodo';
      return null;
    };

    const proSource = getProAccessSource();

    console.log('proSource', proSource);

    try {
      setIsManagingSubscription(true);

      console.log('Settings Dialog - Provider source:', proSource);
      console.log('User dodoProStatus:', user?.dodoProStatus);
      console.log('User full object keys:', Object.keys(user || {}));

      if (proSource === 'dodo') {
        // Use DodoPayments portal for DodoPayments users
        console.log('Opening DodoPayments portal');
        console.log('User object for DodoPayments:', {
          id: user?.id,
          email: user?.email,
          dodoProStatus: user?.dodoProStatus,
          isProUser: user?.isProUser,
        });
        await betterauthClient.dodopayments.customer.portal();
      } else {
        // Use Polar portal for Polar subscribers
        console.log('Opening Polar portal');
        await authClient.customer.portal();
      }
    } catch (error) {
      console.error('Subscription management error:', error);

      if (proSource === 'dodo') {
        toast.error('Unable to access DodoPayments portal. Please contact support at zaid@scira.ai');
      } else {
        toast.error('Failed to open subscription management');
      }
    } finally {
      setIsManagingSubscription(false);
    }
  };

  // Check for active status from either source
  const hasActiveSubscription =
    subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active';
  const hasDodoProStatus = dodoProStatus?.isProUser || (user?.proSource === 'dodo' && user?.isProUser);
  const isProUserActive = hasActiveSubscription || hasDodoProStatus;
  const subscription = subscriptionData?.subscription;

  // Check if DodoPayments Pro is expiring soon (within 7 days)
  const getDaysUntilExpiration = () => {
    if (!dodoProStatus?.expiresAt) return null;
    const now = new Date();
    const expiresAt = new Date(dodoProStatus.expiresAt);
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilExpiration = getDaysUntilExpiration();
  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 7 && daysUntilExpiration > 0;

  return (
    <div className={isMobile ? 'space-y-3' : 'space-y-4'}>
      {isProUserActive ? (
        <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
          <div className={cn('bg-primary text-primary-foreground rounded-lg', isMobile ? 'p-3' : 'p-4')}>
            <div className={cn('flex items-start justify-between', isMobile ? 'mb-2' : 'mb-3')}>
              <div className="flex items-center gap-2">
                <div className={cn('bg-primary-foreground/20 rounded', isMobile ? 'p-1' : 'p-1.5')}>
                  <HugeiconsIcon icon={Crown02Icon} size={isMobile ? 14 : 16} color="currentColor" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className={cn('font-semibold', isMobile ? 'text-xs' : 'text-sm')}>
                    PRO {hasActiveSubscription ? 'Subscription' : 'Membership'}
                  </h3>
                  <p className={cn('opacity-90', isMobile ? 'text-[10px]' : 'text-xs')}>
                    {hasActiveSubscription
                      ? subscription?.status === 'active'
                        ? 'Active'
                        : subscription?.status || 'Unknown'
                      : 'Active (DodoPayments)'}
                  </p>
                </div>
              </div>
              <Badge
                className={cn(
                  'bg-primary-foreground/20 text-primary-foreground border-0',
                  isMobile ? 'text-[10px] px-1.5 py-0.5' : 'text-xs',
                )}
              >
                ACTIVE
              </Badge>
            </div>
            <div className={cn('opacity-90 mb-3', isMobile ? 'text-[11px]' : 'text-xs')}>
              <p className="mb-1">Unlimited access to all premium features</p>
              {hasActiveSubscription && subscription && (
                <div className="flex gap-4 text-[10px] opacity-75">
                  <span>
                    ${(subscription.amount / 100).toFixed(2)}/{subscription.recurringInterval}
                  </span>
                  <span>Next billing: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                </div>
              )}
              {hasDodoProStatus && !hasActiveSubscription && (
                <div className="space-y-1">
                  <div className="flex gap-4 text-[10px] opacity-75">
                    <span>₹1500/month (auto-renews)</span>
                    <span>🇮🇳 Indian pricing</span>
                  </div>
                  {dodoProStatus?.expiresAt && (
                    <div className="text-[10px] opacity-75">
                      <span>Next billing: {new Date(dodoProStatus.expiresAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {(hasActiveSubscription || hasDodoProStatus) && (
              <Button
                variant="secondary"
                onClick={handleManageSubscription}
                className={cn('w-full', isMobile ? 'h-7 text-xs' : 'h-8')}
                disabled={isManagingSubscription}
              >
                {isManagingSubscription ? (
                  <Loader2 className={isMobile ? 'h-3 w-3 mr-1.5' : 'h-3.5 w-3.5 mr-2'} />
                ) : (
                  <ExternalLink className={isMobile ? 'h-3 w-3 mr-1.5' : 'h-3.5 w-3.5 mr-2'} />
                )}
                {isManagingSubscription ? 'Opening...' : 'Manage Billing'}
              </Button>
            )}
          </div>

          {/* Expiration Warning for DodoPayments */}
          {isExpiringSoon && (
            <div
              className={cn(
                'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg',
                isMobile ? 'p-3' : 'p-4',
              )}
            >
              <div className="flex items-start gap-2">
                <div className={cn('bg-yellow-100 dark:bg-yellow-900/40 rounded', isMobile ? 'p-1' : 'p-1.5')}>
                  <HugeiconsIcon
                    icon={Crown02Icon}
                    size={isMobile ? 14 : 16}
                    color="currentColor"
                    strokeWidth={1.5}
                    className={cn('text-yellow-600 dark:text-yellow-500')}
                  />
                </div>
                <div className="flex-1">
                  <h4
                    className={cn(
                      'font-semibold text-yellow-800 dark:text-yellow-200',
                      isMobile ? 'text-xs' : 'text-sm',
                    )}
                  >
                    Pro Access Expiring Soon
                  </h4>
                  <p
                    className={cn(
                      'text-yellow-700 dark:text-yellow-300',
                      isMobile ? 'text-[11px] mt-1' : 'text-xs mt-1',
                    )}
                  >
                    Your Pro access expires in {daysUntilExpiration} {daysUntilExpiration === 1 ? 'day' : 'days'}. Renew
                    now to continue enjoying unlimited features.
                  </p>
                  <Button
                    asChild
                    size="sm"
                    className={cn(
                      'mt-2 bg-yellow-600 hover:bg-yellow-700 text-white',
                      isMobile ? 'h-7 text-xs' : 'h-8',
                    )}
                  >
                    <Link href="/pricing">Renew Pro Access</Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
          <div className={cn('text-center border-2 border-dashed rounded-lg bg-muted/20', isMobile ? 'p-4' : 'p-6')}>
            <HugeiconsIcon
              icon={Crown02Icon}
              size={isMobile ? 24 : 32}
              color="currentColor"
              strokeWidth={1.5}
              className={cn('mx-auto text-muted-foreground mb-3')}
            />
            <h3 className={cn('font-semibold mb-1', isMobile ? 'text-sm' : 'text-base')}>No Active Subscription</h3>
            <p className={cn('text-muted-foreground mb-4', isMobile ? 'text-[11px]' : 'text-xs')}>
              Upgrade to Pro for unlimited access
            </p>
            <div className="space-y-2">
              <Button asChild size="sm" className={cn('w-full', isMobile ? 'h-8 text-xs' : 'h-9')}>
                <Link href="/pricing">
                  <HugeiconsIcon
                    icon={Crown02Icon}
                    size={isMobile ? 12 : 14}
                    color="currentColor"
                    strokeWidth={1.5}
                    className={isMobile ? 'mr-1.5' : 'mr-2'}
                  />
                  Upgrade to Pro
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className={cn('w-full', isMobile ? 'h-7 text-xs' : 'h-8')}>
                <Link href="/pricing">Compare Plans</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
        <h4 className={cn('font-semibold', isMobile ? 'text-xs' : 'text-sm')}>Billing History</h4>
        {polarOrdersLoading || dodoSubscriptionsLoading ? (
          <div className={cn('border rounded-lg flex items-center justify-center', isMobile ? 'p-3 h-16' : 'p-4 h-20')}>
            <Loader2 className={cn(isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4', 'animate-spin')} />
          </div>
        ) : (
          <div className="space-y-2">
            {/* Show Dodo subscriptions */}
            {dodoSubscriptions &&
              (Array.isArray(dodoSubscriptions) ? dodoSubscriptions : dodoSubscriptions.items || []).length > 0 && (
                <>
                  {(Array.isArray(dodoSubscriptions) ? dodoSubscriptions : dodoSubscriptions.items || [])
                    .slice(0, 3)
                    .map((subscription) => (
                      <div key={subscription.id} className={cn('bg-muted/30 rounded-lg', isMobile ? 'p-2.5' : 'p-3')}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className={cn('font-medium truncate', isMobile ? 'text-xs' : 'text-sm')}>
                              Scira Pro (DodoPayments)
                            </p>
                            <div className="flex items-center gap-2">
                              <p className={cn('text-muted-foreground', isMobile ? 'text-[10px]' : 'text-xs')}>
                                {new Date(subscription.created_at).toLocaleDateString()}
                              </p>
                              <Badge variant="secondary" className="text-[8px] px-1 py-0">
                                🇮🇳 {subscription.currency?.toUpperCase() || 'INR'}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={cn('font-semibold block', isMobile ? 'text-xs' : 'text-sm')}>
                              ₹{subscription.recurring_pre_tax_amount ? subscription.recurring_pre_tax_amount : '—'}
                            </span>
                            <span className={cn('text-muted-foreground', isMobile ? 'text-[9px]' : 'text-xs')}>
                              {subscription.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </>
              )}

            {/* Show Polar orders */}
            {polarOrders?.result?.items && polarOrders.result.items.length > 0 && (
              <>
                {polarOrders.result.items.slice(0, 3).map((order: any) => (
                  <div key={order.id} className={cn('bg-muted/30 rounded-lg', isMobile ? 'p-2.5' : 'p-3')}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-medium truncate', isMobile ? 'text-xs' : 'text-sm')}>
                          {order.product?.name || 'Subscription'}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className={cn('text-muted-foreground', isMobile ? 'text-[10px]' : 'text-xs')}>
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                          <Badge variant="secondary" className="text-[8px] px-1 py-0">
                            🌍 USD
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn('font-semibold block', isMobile ? 'text-xs' : 'text-sm')}>
                          ${(order.totalAmount / 100).toFixed(2)}
                        </span>
                        <span className={cn('text-muted-foreground', isMobile ? 'text-[9px]' : 'text-xs')}>
                          recurring
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Show message if no billing history */}
            {(!dodoSubscriptions ||
              (Array.isArray(dodoSubscriptions)
                ? dodoSubscriptions.length === 0
                : !dodoSubscriptions.items || dodoSubscriptions.items.length === 0)) &&
              (!polarOrders?.result?.items || polarOrders.result.items.length === 0) && (
                <div
                  className={cn(
                    'border rounded-lg text-center bg-muted/20 flex items-center justify-center',
                    isMobile ? 'p-4 h-16' : 'p-6 h-20',
                  )}
                >
                  <p className={cn('text-muted-foreground', isMobile ? 'text-[11px]' : 'text-xs')}>
                    No billing history yet
                  </p>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

// Component for Memories
export function MemoriesSection() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingMemoryIds, setDeletingMemoryIds] = useState<Set<string>>(new Set());

  const {
    data: memoriesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: memoriesLoading,
  } = useInfiniteQuery({
    queryKey: ['memories'],
    queryFn: async ({ pageParam }) => {
      const pageNumber = pageParam as number;
      return await getAllMemories(pageNumber);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const hasMore = lastPage.memories.length >= 20;
      return hasMore ? Number(lastPage.memories[lastPage.memories.length - 1]?.id) : undefined;
    },
    staleTime: 1000 * 60 * 5,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMemory,
    onSuccess: (_, memoryId) => {
      setDeletingMemoryIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(memoryId);
        return newSet;
      });
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      toast.success('Memory deleted successfully');
    },
    onError: (_, memoryId) => {
      setDeletingMemoryIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(memoryId);
        return newSet;
      });
      toast.error('Failed to delete memory');
    },
  });

  const handleDeleteMemory = (id: string) => {
    setDeletingMemoryIds((prev) => new Set(prev).add(id));
    deleteMutation.mutate(id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  const getMemoryContent = (memory: MemoryItem): string => {
    if (memory.summary) return memory.summary;
    if (memory.title) return memory.title;
    if (memory.memory) return memory.memory;
    if (memory.name) return memory.name;
    return 'No content available';
  };

  const displayedMemories = memoriesData?.pages.flatMap((page) => page.memories) || [];

  const totalMemories = memoriesData?.pages.reduce((acc, page) => acc + page.memories.length, 0) || 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {totalMemories} {totalMemories === 1 ? 'memory' : 'memories'} stored
        </p>
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-w-1 scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30">
        {memoriesLoading && !displayedMemories.length ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : displayedMemories.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-32 border border-dashed rounded-lg bg-muted/20">
            <HugeiconsIcon icon={Brain02Icon} className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No memories found</p>
          </div>
        ) : (
          <>
            {displayedMemories.map((memory: MemoryItem) => (
              <div
                key={memory.id}
                className="group relative p-3 rounded-lg border bg-card/50 hover:bg-card transition-all"
              >
                <div className="pr-8">
                  {memory.title && <h4 className="text-sm font-medium mb-1 text-foreground">{memory.title}</h4>}
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {memory.content || getMemoryContent(memory)}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-2">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      <span>{formatDate(memory.createdAt || memory.created_at || '')}</span>
                    </div>
                    {memory.type && (
                      <div className="px-1.5 py-0.5 bg-muted/50 rounded text-[9px] font-medium">{memory.type}</div>
                    )}
                    {memory.status && memory.status !== 'done' && (
                      <div className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded text-[9px] font-medium">
                        {memory.status}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteMemory(memory.id)}
                  disabled={deletingMemoryIds.has(memory.id)}
                  className={cn(
                    'absolute right-2 top-2 h-6 w-6 text-muted-foreground hover:text-destructive',
                    'opacity-0 group-hover:opacity-100 transition-opacity',
                    'touch-manipulation', // Better touch targets on mobile
                  )}
                  style={{ opacity: 1 }} // Always visible on mobile
                >
                  {deletingMemoryIds.has(memory.id) ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <TrashIcon className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}

            {hasNextPage && !searchQuery.trim() && (
              <div className="pt-2 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={!hasNextPage || isFetchingNextPage}
                  size="sm"
                  className="h-8"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-2 justify-center">
        <p className="text-xs text-muted-foreground">powered by</p>
        <Image src="/supermemory.svg" alt="Memories" className="invert dark:invert-0" width={140} height={140} />
      </div>
    </div>
  );
}

// Component for Connectors
export function ConnectorsSection({ user }: { user: any }) {
  const isProUser = user?.isProUser || false;
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [connectingProvider, setConnectingProvider] = useState<ConnectorProvider | null>(null);
  const [syncingProvider, setSyncingProvider] = useState<ConnectorProvider | null>(null);
  const [deletingConnectionId, setDeletingConnectionId] = useState<string | null>(null);

  const {
    data: connectorsData,
    isLoading: connectorsLoading,
    refetch: refetchConnectors,
  } = useQuery({
    queryKey: ['connectors', user?.id],
    queryFn: listUserConnectorsAction,
    enabled: !!user && isProUser,
    staleTime: 1000 * 60 * 2,
  });

  // Query actual connection status for each provider using Supermemory API
  const connectionStatusQueries = useQuery({
    queryKey: ['connectorsStatus', user?.id],
    queryFn: async () => {
      if (!user?.id || !isProUser) return {};

      const statusPromises = Object.keys(CONNECTOR_CONFIGS).map(async (provider) => {
        try {
          const result = await getConnectorSyncStatusAction(provider as ConnectorProvider);
          return { provider, status: result };
        } catch (error) {
          console.error(`Failed to get status for ${provider}:`, error);
          return { provider, status: null };
        }
      });

      const statuses = await Promise.all(statusPromises);
      return statuses.reduce(
        (acc, { provider, status }) => {
          acc[provider] = status;
          return acc;
        },
        {} as Record<string, any>,
      );
    },
    enabled: !!user?.id && isProUser,
    staleTime: 1000 * 60 * 2,
  });

  const handleConnect = async (provider: ConnectorProvider) => {
    setConnectingProvider(provider);
    try {
      const result = await createConnectorAction(provider);
      if (result.success && result.authLink) {
        window.location.href = result.authLink;
      } else {
        toast.error(result.error || 'Failed to connect');
      }
    } catch (error) {
      toast.error('Failed to connect');
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleSync = async (provider: ConnectorProvider) => {
    setSyncingProvider(provider);
    try {
      const result = await manualSyncConnectorAction(provider);
      if (result.success) {
        toast.success(`${CONNECTOR_CONFIGS[provider].name} sync started`);
        refetchConnectors();
        // Refetch connection status after a delay to show updated counts
        setTimeout(() => {
          connectionStatusQueries.refetch();
        }, 2000);
      } else {
        toast.error(result.error || 'Failed to sync');
      }
    } catch (error) {
      toast.error('Failed to sync');
    } finally {
      setSyncingProvider(null);
    }
  };

  const handleDelete = async (connectionId: string, providerName: string) => {
    setDeletingConnectionId(connectionId);
    try {
      const result = await deleteConnectorAction(connectionId);
      if (result.success) {
        toast.success(`${providerName} disconnected`);
        refetchConnectors();
        // Also refetch connection statuses immediately to update the UI
        connectionStatusQueries.refetch();
      } else {
        toast.error(result.error || 'Failed to disconnect');
      }
    } catch (error) {
      toast.error('Failed to disconnect');
    } finally {
      setDeletingConnectionId(null);
    }
  };

  const connections = connectorsData?.connections || [];
  const connectionStatuses = connectionStatusQueries.data || {};

  return (
    <div className={cn('space-y-4', isMobile ? 'space-y-3' : 'space-y-4')}>
      <div>
        <h3 className={cn('font-semibold mb-1', isMobile ? 'text-sm' : 'text-base')}>Connected Services</h3>
        <p className={cn('text-muted-foreground', isMobile ? 'text-[11px] leading-relaxed' : 'text-xs')}>
          Connect your cloud services to search across all your documents in one place
        </p>
      </div>

      {/* Beta Announcement Alert */}
      <Alert className="border-primary/20 bg-primary/5">
        <HugeiconsIcon icon={InformationCircleIcon} className="h-4 w-4 text-primary" />
        <AlertTitle className="text-foreground">Connectors Available in Beta</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Connectors are now available for Pro users! Please note that this feature is in beta and there may be breaking
          changes as we continue to improve the experience.
        </AlertDescription>
      </Alert>

      {!isProUser && (
        <>
          <div className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center bg-primary/5">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-3 rounded-full bg-primary/10">
                <HugeiconsIcon
                  icon={Crown02Icon}
                  size={32}
                  color="currentColor"
                  strokeWidth={1.5}
                  className="text-primary"
                />
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-lg">Pro Feature</h4>
                <p className="text-muted-foreground text-sm max-w-md">
                  Connectors are available for Pro users only. Upgrade to connect your Google Drive, Notion, and
                  OneDrive accounts.
                </p>
              </div>
              <Button asChild className="mt-4">
                <Link href="/pricing">
                  <HugeiconsIcon icon={Crown02Icon} size={16} color="currentColor" strokeWidth={1.5} className="mr-2" />
                  Upgrade to Pro
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}

      {isProUser && (
        <div className="space-y-3">
          {Object.entries(CONNECTOR_CONFIGS).map(([provider, config]) => {
            const connectionStatus = connectionStatuses[provider]?.status;
            const connection = connections.find((c) => c.provider === provider);
            // A connector is connected if we have a connection record OR if status check confirms it
            const isConnected = !!connection || (connectionStatus?.isConnected && connectionStatus !== null);
            const isConnecting = connectingProvider === provider;
            const isSyncing = syncingProvider === provider;
            const isDeleting = connection && deletingConnectionId === connection.id;
            const isStatusLoading = connectionStatusQueries.isLoading;
            const isComingSoon = provider === 'onedrive';

            return (
              <div key={provider} className={cn('border rounded-lg', isMobile ? 'p-3' : 'p-4')}>
                <div className={cn('flex items-center', isMobile ? 'gap-2' : 'justify-between')}>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 mt-0.5">
                      <div className="text-xl">
                        {(() => {
                          const IconComponent = CONNECTOR_ICONS[config.icon];
                          return IconComponent ? <IconComponent /> : null;
                        })()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={cn('font-medium', isMobile ? 'text-[13px]' : 'text-sm')}>{config.name}</h4>
                      <p className={cn('text-muted-foreground', isMobile ? 'text-[10px] leading-tight' : 'text-xs')}>
                        {config.description}
                      </p>
                      {isComingSoon ? (
                        <div className={cn('flex items-center gap-2', isMobile ? 'mt-0.5' : 'mt-1')}>
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span
                            className={cn('text-blue-600 dark:text-blue-400', isMobile ? 'text-[10px]' : 'text-xs')}
                          >
                            Coming Soon
                          </span>
                        </div>
                      ) : isStatusLoading && !connection ? (
                        <div className={cn('flex items-center gap-2', isMobile ? 'mt-0.5' : 'mt-1')}>
                          <div className="w-2 h-2 bg-muted animate-pulse rounded-full"></div>
                          <span className={cn('text-muted-foreground', isMobile ? 'text-[10px]' : 'text-xs')}>
                            Checking connection...
                          </span>
                        </div>
                      ) : isConnected ? (
                        <div className={cn('flex items-center gap-2', isMobile ? 'mt-0.5' : 'mt-1')}>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span
                            className={cn('text-green-600 dark:text-green-400', isMobile ? 'text-[10px]' : 'text-xs')}
                          >
                            Connected
                          </span>
                          {(connectionStatus?.email || connection?.email) && (
                            <span className={cn('text-muted-foreground', isMobile ? 'text-[10px]' : 'text-xs')}>
                              • {connectionStatus?.email || connection?.email}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className={cn('flex items-center gap-2', isMobile ? 'mt-0.5' : 'mt-1')}>
                          <div className="w-2 h-2 bg-muted-foreground/30 rounded-full"></div>
                          <span className={cn('text-muted-foreground', isMobile ? 'text-[10px]' : 'text-xs')}>
                            Not connected
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={cn('flex items-center', isMobile ? 'gap-1' : 'gap-2')}>
                    {isComingSoon ? (
                      <Button
                        size="sm"
                        disabled
                        variant="outline"
                        className={cn(
                          'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
                          isMobile ? 'h-7 text-[10px] px-2' : 'h-8',
                        )}
                      >
                        Coming Soon
                      </Button>
                    ) : isConnected ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(provider as ConnectorProvider)}
                          disabled={isSyncing || isDeleting || isStatusLoading}
                          className={cn(isMobile ? 'h-7 text-[10px] px-2' : 'h-8')}
                        >
                          {isSyncing ? (
                            <>
                              <Loader2 className={cn(isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3', 'animate-spin mr-1')} />
                              Syncing...
                            </>
                          ) : (
                            'Sync'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => connection && handleDelete(connection.id, config.name)}
                          disabled={isDeleting || isSyncing || isStatusLoading}
                          className={cn(
                            'text-destructive hover:text-destructive',
                            isMobile ? 'h-7 text-[10px] px-2' : 'h-8',
                          )}
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className={cn(isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3', 'animate-spin mr-1')} />
                              Disconnecting...
                            </>
                          ) : (
                            'Disconnect'
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnect(provider as ConnectorProvider)}
                        disabled={isConnecting || isStatusLoading}
                        className={cn(isMobile ? 'h-7 text-[10px] px-2' : 'h-8')}
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className={cn(isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3', 'animate-spin mr-1')} />
                            Connecting...
                          </>
                        ) : (
                          'Connect'
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {isConnected && !isComingSoon && (
                  <div className={cn('border-t border-border', isMobile ? 'mt-2 pt-2' : 'mt-3 pt-3')}>
                    <div className={cn('text-xs', isMobile ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-3 gap-4')}>
                      <div>
                        <span className="text-muted-foreground">Document Chunk:</span>
                        <div className="font-medium">
                          {isStatusLoading ? (
                            <span className="text-muted-foreground">Loading...</span>
                          ) : connectionStatus?.documentCount !== undefined ? (
                            connectionStatus.documentCount === 0 ? (
                              <span
                                className="text-amber-600 dark:text-amber-400"
                                title="Documents are being synced from your account"
                              >
                                Syncing...
                              </span>
                            ) : (
                              connectionStatus.documentCount.toLocaleString()
                            )
                          ) : connection?.metadata?.pageToken ? (
                            connection.metadata.pageToken === 0 ? (
                              <span
                                className="text-amber-600 dark:text-amber-400"
                                title="Documents are being synced from your account"
                              >
                                Syncing...
                              </span>
                            ) : (
                              connection.metadata.pageToken.toLocaleString()
                            )
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Last Sync:</span>
                        <div className="font-medium">
                          {isStatusLoading ? (
                            <span className="text-muted-foreground">Loading...</span>
                          ) : connectionStatus?.lastSync || connection?.createdAt ? (
                            new Date(connectionStatus?.lastSync || connection?.createdAt).toLocaleDateString()
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Limit:</span>
                        <div className="font-medium">{config.documentLimit.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className={cn('text-center', isMobile ? 'pt-1' : 'pt-2')}>
        <div className="flex items-center gap-2 justify-center">
          <p className={cn('text-muted-foreground', isMobile ? 'text-[10px]' : 'text-xs')}>powered by</p>
          <Image
            src="/supermemory.svg"
            alt="Connectors"
            className="invert dark:invert-0"
            width={isMobile ? 100 : 120}
            height={isMobile ? 100 : 120}
          />
        </div>
      </div>
    </div>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
  user,
  subscriptionData,
  isProUser,
  isProStatusLoading,
  isCustomInstructionsEnabled,
  setIsCustomInstructionsEnabled,
  initialTab = 'profile',
}: SettingsDialogProps) {
  const [currentTab, setCurrentTab] = useState(initialTab);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Reset tab when initialTab changes or when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentTab(initialTab);
    }
  }, [open, initialTab]);
  // Dynamically stabilize drawer height on mobile when the virtual keyboard opens (PWA/iOS)
  const [mobileDrawerPxHeight, setMobileDrawerPxHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!isMobile || !open) {
      setMobileDrawerPxHeight(null);
      return;
    }

    const updateHeight = () => {
      try {
        // Prefer VisualViewport for accurate height when keyboard is open
        const visualHeight = (window as any).visualViewport?.height ?? window.innerHeight;
        const computed = Math.min(600, Math.round(visualHeight * 0.85));
        setMobileDrawerPxHeight(computed);
      } catch {
        setMobileDrawerPxHeight(null);
      }
    };

    updateHeight();
    const vv: VisualViewport | undefined = (window as any).visualViewport;
    vv?.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);

    return () => {
      vv?.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, [isMobile, open]);

  const tabItems = [
    {
      value: 'profile',
      label: 'Account',
      icon: ({ className }: { className?: string }) => <HugeiconsIcon icon={UserAccountIcon} className={className} />,
    },
    {
      value: 'usage',
      label: 'Usage',
      icon: ({ className }: { className?: string }) => <HugeiconsIcon icon={Analytics01Icon} className={className} />,
    },
    {
      value: 'subscription',
      label: 'Subscription',
      icon: ({ className }: { className?: string }) => <HugeiconsIcon icon={Crown02Icon} className={className} />,
    },
    {
      value: 'preferences',
      label: 'Preferences',
      icon: ({ className }: { className?: string }) => <HugeiconsIcon icon={Settings02Icon} className={className} />,
    },
    {
      value: 'connectors',
      label: 'Connectors',
      icon: ({ className }: { className?: string }) => <HugeiconsIcon icon={ConnectIcon} className={className} />,
    },
    {
      value: 'memories',
      label: 'Memories',
      icon: ({ className }: { className?: string }) => <HugeiconsIcon icon={Brain02Icon} className={className} />,
    },
  ];

  const contentSections = (
    <>
      <TabsContent value="profile" className="mt-0">
        <ProfileSection
          user={user}
          subscriptionData={subscriptionData}
          isProUser={isProUser}
          isProStatusLoading={isProStatusLoading}
        />
      </TabsContent>

      <TabsContent value="usage" className="mt-0">
        <UsageSection user={user} />
      </TabsContent>

      <TabsContent value="subscription" className="mt-0">
        <SubscriptionSection subscriptionData={subscriptionData} isProUser={isProUser} user={user} />
      </TabsContent>

      <TabsContent
        value="preferences"
        className="mt-0 scrollbar-thin! scrollbar-track-transparent! scrollbar-thumb-muted-foreground/20! hover:scrollbar-thumb-muted-foreground/30!"
      >
        <PreferencesSection
          user={user}
          isCustomInstructionsEnabled={isCustomInstructionsEnabled}
          setIsCustomInstructionsEnabled={setIsCustomInstructionsEnabled}
        />
      </TabsContent>

      <TabsContent value="connectors" className="mt-0">
        <ConnectorsSection user={user} />
      </TabsContent>

      <TabsContent value="memories" className="mt-0">
        <MemoriesSection />
      </TabsContent>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className="h-[85vh] max-h-[600px] p-0 data-vaul-drawer:transition-none overflow-hidden"
          style={{
            height: mobileDrawerPxHeight ?? undefined,
            maxHeight: mobileDrawerPxHeight ?? undefined,
          }}
        >
          <div className="flex flex-col h-full max-h-full">
            {/* Header - more compact */}
            <DrawerHeader className="pb-2 px-4 pt-3 shrink-0">
              <DrawerTitle className="text-base font-medium flex items-center gap-2">
                <SciraLogo className="size-6" />
                Settings
              </DrawerTitle>
            </DrawerHeader>

            {/* Content area with tabs */}
            <Tabs
              value={currentTab}
              onValueChange={setCurrentTab}
              className="flex-1 flex flex-col overflow-hidden gap-0"
            >
              {/* Tab content - takes up most space */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4! overscroll-contain scrollbar-w-1! scrollbar-track-transparent! scrollbar-thumb-muted-foreground/20! hover:scrollbar-thumb-muted-foreground/30!">
                {contentSections}
              </div>

              {/* Bottom tab navigation - compact and accessible */}
              <div
                className={cn(
                  'border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shrink-0',
                  currentTab === 'preferences' || currentTab === 'connectors'
                    ? 'pb-[calc(env(safe-area-inset-bottom)+2.5rem)]'
                    : 'pb-[calc(env(safe-area-inset-bottom)+1rem)]',
                )}
              >
                <TabsList className="w-full py-1.5 h-24 bg-transparent rounded-none grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2! px-3 sm:px-4">
                  {tabItems.map((item) => (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className="flex-col gap-0.5 h-full rounded-md data-[state=active]:bg-muted data-[state=active]:shadow-none relative px-2 min-w-0 transition-colors"
                    >
                      <item.icon
                        className={cn(
                          'h-5 w-5 transition-colors',
                          currentTab === item.value ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      />
                      <span
                        className={cn(
                          'text-[10px] mt-0.5 transition-colors',
                          currentTab === item.value ? 'text-foreground font-medium' : 'text-muted-foreground',
                        )}
                      >
                        {item.label}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </Tabs>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl! w-full! max-h-[85vh] p-0! gap-0 overflow-hidden">
        <DialogHeader className="p-4 m-0!">
          <DialogTitle className="text-xl font-medium tracking-normal flex items-center gap-2">
            <SciraLogo className="size-6" color="currentColor" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-48 m-0!">
            <div className="p-2 gap-1! flex flex-col">
              {tabItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setCurrentTab(item.value)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    'hover:bg-muted',
                    currentTab === item.value
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(85vh-120px)] scrollbar-w-1! scrollbar-track-transparent! scrollbar-thumb-muted-foreground/20! hover:scrollbar-thumb-muted-foreground/30!">
              <div className="p-6 pb-8">
                <Tabs value={currentTab} onValueChange={setCurrentTab} orientation="vertical">
                  {contentSections}
                </Tabs>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
