'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useLocalStorage } from '@/hooks/use-local-storage';
import {
  getUserMessageCount,
  getSubDetails,
  getExtremeSearchUsageCount,
  getHistoricalUsage,
  getCustomInstructions,
  saveCustomInstructions,
  deleteCustomInstructionsAction,
} from '@/app/actions';
import { SEARCH_LIMITS } from '@/lib/constants';
import { authClient, betterauthClient } from '@/lib/auth-client';
import {
  MagnifyingGlass,
  Lightning,
  User,
  ChartLineUp,
  Memory,
  Calendar,
  NotePencil,
  Brain,
  Trash,
  FloppyDisk,
  ArrowClockwise,
  Globe,
  Robot,
} from '@phosphor-icons/react';

import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getAllMemories, searchMemories, deleteMemory, MemoryItem } from '@/lib/memory-actions';
import { Loader2, Search, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';
import { useIsProUser } from '@/contexts/user-context';
import { SciraLogo } from './logos/scira-logo';
import { Search as SearchIcon, Check, ChevronsUpDown } from 'lucide-react';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Crown02Icon,
  UserAccountIcon,
  Analytics01Icon,
  Settings02Icon,
  BrainIcon,
  GlobalSearchIcon,
} from '@hugeicons/core-free-icons';
import {
  ContributionGraph,
  ContributionGraphCalendar,
  ContributionGraphBlock,
  ContributionGraphFooter,
  ContributionGraphLegend,
  ContributionGraphTotalCount,
} from '@/components/ui/kibo-ui/contribution-graph';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  subscriptionData?: any;
  isProUser?: boolean;
  isProStatusLoading?: boolean;
  isCustomInstructionsEnabled?: boolean;
  setIsCustomInstructionsEnabled?: (value: boolean | ((val: boolean) => boolean)) => void;
}

// Component for Profile Information
function ProfileSection({ user, subscriptionData, isProUser, isProStatusLoading }: any) {
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
                  'bg-gradient-to-br from-secondary/25 via-primary/20 to-accent/25 text-foreground',
                  'dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground',
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
  <span className={cn('text-base sm:text-lg !mb-3 !pr-1', className)}>🔥</span>
);

// Search Provider Options
const searchProviders = [
  {
    value: 'parallel',
    label: 'Parallel AI',
    description: 'Base and premium web search along with Firecrawl image search support',
    icon: ParallelIcon,
    default: true,
  },
  {
    value: 'exa',
    label: 'Exa',
    description: 'Enhanced and faster web search with images and advanced filtering',
    icon: ExaIcon,
    default: false,
  },
  {
    value: 'tavily',
    label: 'Tavily',
    description: 'Wide web search with comprehensive results and analysis',
    icon: TavilyIcon,
    default: false,
  },
  {
    value: 'firecrawl',
    label: 'Firecrawl',
    description: 'Web, news, and image search with content scraping capabilities',
    icon: FirecrawlIcon,
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
  const currentProvider = searchProviders.find((provider) => provider.value === value);

  return (
    <div className="w-full">
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          className={cn(
            'w-full h-auto min-h-14',
            'border border-input bg-background',
            'transition-all duration-200',
            'focus:outline-none focus:ring-0 focus:ring-offset-0',
            disabled && 'opacity-50 cursor-not-allowed',
            isMobile ? 'py-2.5 px-3' : 'py-3',
            className,
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {currentProvider && (
              <>
                <currentProvider.icon className="text-muted-foreground size-4 flex-shrink-0" />
                <div className="text-left flex-1 min-w-0">
                  <div className="font-medium text-sm flex items-center gap-2 mb-0.5">
                    {currentProvider.label}
                    {currentProvider.default && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0.5 bg-primary/10 text-primary border-0">
                        Default
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground leading-tight line-clamp-2 text-wrap">
                    {currentProvider.description}
                  </div>
                </div>
              </>
            )}
          </div>
        </SelectTrigger>
        <SelectContent className={cn('rounded-xl', isMobile ? 'max-h-[60vh]' : 'max-h-[280px]')}>
          {searchProviders.map((provider) => (
            <SelectItem
              key={provider.value}
              value={provider.value}
              className={cn(
                'cursor-pointer rounded-lg',
                'focus:bg-accent focus:text-accent-foreground',
                isMobile ? 'min-h-[64px] p-4' : 'min-h-[48px] p-2.5',
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <provider.icon className={cn('text-muted-foreground flex-shrink-0', isMobile ? 'size-5' : 'size-4')} />
                <div className="flex flex-col min-w-0 flex-1">
                  <div className={cn('font-medium flex items-center gap-2 mb-0.5', isMobile ? 'text-base' : 'text-sm')}>
                    {provider.label}
                    {provider.default && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          'bg-primary/10 text-primary border-0',
                          isMobile ? 'text-[10px] px-1.5 py-0.5' : 'text-[9px] px-1 py-0.5',
                        )}
                      >
                        Default
                      </Badge>
                    )}
                  </div>
                  <div
                    className={cn('text-muted-foreground leading-tight line-clamp-2', isMobile ? 'text-sm' : 'text-xs')}
                  >
                    {provider.description}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Component for Combined Preferences (Search + Custom Instructions)
function PreferencesSection({
  user,
  isCustomInstructionsEnabled,
  setIsCustomInstructionsEnabled,
}: {
  user: any;
  isCustomInstructionsEnabled?: boolean;
  setIsCustomInstructionsEnabled?: (value: boolean | ((val: boolean) => boolean)) => void;
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [searchProvider, setSearchProvider] = useLocalStorage<'exa' | 'parallel' | 'tavily' | 'firecrawl'>(
    'scira-search-provider',
    'parallel',
  );

  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const enabled = isCustomInstructionsEnabled ?? true;
  const setEnabled = setIsCustomInstructionsEnabled ?? (() => {});

  const handleSearchProviderChange = (newProvider: 'exa' | 'parallel' | 'tavily' | 'firecrawl') => {
    setSearchProvider(newProvider);
    toast.success(
      `Search provider changed to ${
        newProvider === 'exa'
          ? 'Exa'
          : newProvider === 'parallel'
            ? 'Parallel AI'
            : newProvider === 'tavily'
              ? 'Tavily'
              : 'Firecrawl'
      }`,
    );
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

  return (
    <div className={cn('space-y-6', isMobile ? 'space-y-4' : 'space-y-6')}>
      <div>
        <h3 className={cn('font-semibold mb-1.5', isMobile ? 'text-sm' : 'text-base')}>Preferences</h3>
        <p className={cn('text-muted-foreground', isMobile ? 'text-xs leading-relaxed' : 'text-xs')}>
          Configure your search provider and customize how the AI responds to your questions.
        </p>
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
              Select your preferred search provider for web searches. Changes take effect immediately and will be used
              for all future searches.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Instructions Section */}
      <div className="space-y-3">
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Robot className="h-3.5 w-3.5 text-primary" />
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
                <p className="text-xs text-muted-foreground mt-0.5">Toggle to enable or disable custom instructions</p>
              </div>
              <Switch id="enable-instructions" checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className={cn('space-y-3', !enabled && 'opacity-50')}>
              <div>
                <Label htmlFor="instructions" className="text-sm font-medium">
                  Instructions
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">Guide how the AI responds to your questions</p>
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
                      } catch {}
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
                      <FloppyDisk className="w-3 h-3 mr-1.5" />
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
                    <Trash className="w-3 h-3" />
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
    </div>
  );
}

// Component for Usage Information
function UsageSection({ user }: any) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isProUser = user?.isProUser;

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
    queryKey: ['historicalUsage', user?.id, isMobile ? 6 : 9],
    queryFn: () => getHistoricalUsage(user, isMobile ? 6 : 9),
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  const searchCount = usageData?.searchCount;
  const extremeSearchCount = usageData?.extremeSearchCount;

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
    <div className={cn(isMobile ? 'space-y-3' : 'space-y-4', isMobile && !isProUser ? 'pb-4' : '')}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Daily Search Usage</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefreshUsage}
          disabled={isRefreshing}
          className={isMobile ? 'h-7 px-1.5' : 'h-8 px-2'}
        >
          {isRefreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowClockwise className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <div className={cn('grid grid-cols-2', isMobile ? 'gap-2' : 'gap-3')}>
        <div className={cn('bg-muted/50 rounded-lg space-y-1', isMobile ? 'p-2.5' : 'p-3')}>
          <div className="flex items-center justify-between">
            <span className={cn('text-muted-foreground', isMobile ? 'text-[11px]' : 'text-xs')}>Today</span>
            <MagnifyingGlass className={isMobile ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          </div>
          {usageLoading ? (
            <Skeleton className={cn('font-semibold', isMobile ? 'text-base h-4' : 'text-lg h-5')} />
          ) : (
            <div className={cn('font-semibold', isMobile ? 'text-base' : 'text-lg')}>{searchCount?.count || 0}</div>
          )}
          <p className="text-[10px] text-muted-foreground">Regular searches</p>
        </div>

        <div className={cn('bg-muted/50 rounded-lg space-y-1', isMobile ? 'p-2.5' : 'p-3')}>
          <div className="flex items-center justify-between">
            <span className={cn('text-muted-foreground', isMobile ? 'text-[11px]' : 'text-xs')}>Extreme</span>
            <Lightning className={isMobile ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
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
        <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
          <div className={cn('bg-muted/30 rounded-lg space-y-2', isMobile ? 'p-2.5' : 'p-3')}>
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
                  <span className="font-medium">Daily Limit</span>
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
        <div className={cn('space-y-2', isMobile && !isProUser ? 'pb-4' : '')}>
          <h4 className={cn('font-semibold text-muted-foreground', isMobile ? 'text-[11px]' : 'text-xs')}>
            Activity (Past {isMobile ? '6' : '9'} Months)
          </h4>
          <div className={cn('bg-muted/50 dark:bg-card rounded-lg', isMobile ? 'p-2' : 'p-3')}>
            {historicalLoading ? (
              <div className="h-24 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : historicalUsageData && historicalUsageData.length > 0 ? (
              <TooltipProvider>
                <ContributionGraph
                  data={historicalUsageData}
                  blockSize={isMobile ? 10 : 12}
                  blockMargin={4}
                  fontSize={isMobile ? 10 : 12}
                  labels={{
                    totalCount: '{{count}} total messages in {{year}}',
                    legend: {
                      less: 'Less',
                      more: 'More',
                    },
                  }}
                  className="w-full"
                >
                  <ContributionGraphCalendar
                    hideMonthLabels={isMobile}
                    className={cn('text-muted-foreground', isMobile ? 'text-[10px]' : 'text-xs')}
                  >
                    {({ activity, dayIndex, weekIndex }) => (
                      <Tooltip key={`${weekIndex}-${dayIndex}`}>
                        <TooltipTrigger asChild>
                          <g className="cursor-help">
                            <ContributionGraphBlock
                              activity={activity}
                              dayIndex={dayIndex}
                              weekIndex={weekIndex}
                              className={cn(
                                'data-[level="0"]:fill-muted',
                                'data-[level="1"]:fill-primary/20',
                                'data-[level="2"]:fill-primary/40',
                                'data-[level="3"]:fill-primary/60',
                                'data-[level="4"]:fill-primary',
                              )}
                            />
                          </g>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-center">
                            <p className="font-medium">
                              {activity.count} {activity.count === 1 ? 'message' : 'messages'}
                            </p>
                            <p className="text-xs text-muted">
                              {new Date(activity.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </ContributionGraphCalendar>
                  <ContributionGraphFooter className={cn('pt-1', isMobile ? 'gap-1' : 'gap-2')}>
                    <ContributionGraphTotalCount
                      className={cn('text-muted-foreground', isMobile ? 'text-[10px]' : 'text-xs')}
                    />
                    <ContributionGraphLegend className="text-muted-foreground">
                      {({ level }) => {
                        const getTooltipText = (level: number) => {
                          switch (level) {
                            case 0:
                              return 'No messages';
                            case 1:
                              return '1-3 messages';
                            case 2:
                              return '4-7 messages';
                            case 3:
                              return '8-12 messages';
                            case 4:
                              return '13+ messages';
                            default:
                              return `${level} messages`;
                          }
                        };

                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <svg height={isMobile ? 10 : 12} width={isMobile ? 10 : 12} className="cursor-help">
                                <rect
                                  className={cn(
                                    'stroke-[1px] stroke-border/50',
                                    'data-[level="0"]:fill-muted',
                                    'data-[level="1"]:fill-primary/20',
                                    'data-[level="2"]:fill-primary/40',
                                    'data-[level="3"]:fill-primary/60',
                                    'data-[level="4"]:fill-primary',
                                  )}
                                  data-level={level}
                                  height={isMobile ? 10 : 12}
                                  rx={2}
                                  ry={2}
                                  width={isMobile ? 10 : 12}
                                />
                              </svg>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{getTooltipText(level)}</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }}
                    </ContributionGraphLegend>
                  </ContributionGraphFooter>
                </ContributionGraph>
              </TooltipProvider>
            ) : (
              <div className="h-24 flex items-center justify-center">
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
function SubscriptionSection({ subscriptionData, isProUser, user }: any) {
  const [orders, setOrders] = useState<any>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [isManagingSubscription, setIsManagingSubscription] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Use data from user object (already cached)
  const paymentHistory = user?.paymentHistory || null;
  const dodoProStatus = user?.dodoProStatus || null;

  useEffect(() => {
    const fetchPolarOrders = async () => {
      try {
        setOrdersLoading(true);

        // Only fetch Polar orders (DodoPayments data comes from user cache)
        const ordersResponse = await authClient.customer.orders
          .list({
            query: {
              page: 1,
              limit: 10,
              productBillingType: 'recurring',
            },
          })
          .catch(() => ({ data: null }));

        setOrders(ordersResponse.data);
      } catch (error) {
        console.log('Failed to fetch Polar orders:', error);
        setOrders(null);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchPolarOrders();
  }, []);

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
                    <span>₹1500 (One-time payment)</span>
                    <span>🇮🇳 Indian pricing</span>
                  </div>
                  {dodoProStatus?.expiresAt && (
                    <div className="text-[10px] opacity-75">
                      <span>Expires: {new Date(dodoProStatus.expiresAt).toLocaleDateString()}</span>
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
        {ordersLoading ? (
          <div className={cn('border rounded-lg flex items-center justify-center', isMobile ? 'p-3 h-16' : 'p-4 h-20')}>
            <Loader2 className={cn(isMobile ? 'w-3.5 h-3.5' : 'w-4 h-4', 'animate-spin')} />
          </div>
        ) : (
          <div className="space-y-2">
            {/* Show DodoPayments history */}
            {paymentHistory && paymentHistory.length > 0 && (
              <>
                {paymentHistory.slice(0, 3).map((payment: any) => (
                  <div key={payment.id} className={cn('bg-muted/30 rounded-lg', isMobile ? 'p-2.5' : 'p-3')}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={cn('font-medium truncate', isMobile ? 'text-xs' : 'text-sm')}>
                          Scira Pro (DodoPayments)
                        </p>
                        <div className="flex items-center gap-2">
                          <p className={cn('text-muted-foreground', isMobile ? 'text-[10px]' : 'text-xs')}>
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </p>
                          <Badge variant="secondary" className="text-[8px] px-1 py-0">
                            🇮🇳 INR
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn('font-semibold block', isMobile ? 'text-xs' : 'text-sm')}>
                          ₹{(payment.totalAmount / 100).toFixed(0)}
                        </span>
                        <span className={cn('text-muted-foreground', isMobile ? 'text-[9px]' : 'text-xs')}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Show Polar orders */}
            {orders?.result?.items && orders.result.items.length > 0 && (
              <>
                {orders.result.items.slice(0, 3).map((order: any) => (
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
            {(!paymentHistory || paymentHistory.length === 0) &&
              (!orders?.result?.items || orders.result.items.length === 0) && (
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
function MemoriesSection() {
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

  const {
    data: searchResults,
    isLoading: isSearching,
    refetch: performSearch,
  } = useQuery({
    queryKey: ['memories', 'search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { memories: [], total: 0 };
      return await searchMemories(searchQuery);
    },
    enabled: true,
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await performSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    queryClient.invalidateQueries({ queryKey: ['memories', 'search'] });
  };

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
    if (memory.memory) return memory.memory;
    if (memory.name) return memory.name;
    return 'No content available';
  };

  const displayedMemories =
    searchQuery.trim() && searchResults
      ? searchResults.memories
      : memoriesData?.pages.flatMap((page) => page.memories) || [];

  const totalMemories =
    searchQuery.trim() && searchResults
      ? searchResults.total
      : memoriesData?.pages.reduce((acc, page) => acc + page.memories.length, 0) || 0;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="relative">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="pr-20 h-9 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch(e);
              }
            }}
          />
          <div className="absolute right-1 top-1 flex gap-1">
            <Button
              onClick={handleSearch}
              size="sm"
              variant="ghost"
              disabled={isSearching || !searchQuery.trim()}
              className="h-7 w-7 p-0"
            >
              {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            </Button>
            {searchQuery.trim() && (
              <Button variant="ghost" size="sm" onClick={handleClearSearch} className="h-7 px-2 text-xs">
                Clear
              </Button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {totalMemories} {totalMemories === 1 ? 'memory' : 'memories'} stored
        </p>
      </div>

      <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 scrollbar-w-1 scrollbar-track-transparent scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/30">
        {memoriesLoading && !displayedMemories.length ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : displayedMemories.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-32 border border-dashed rounded-lg bg-muted/20">
            <Brain className="h-6 w-6 text-muted-foreground mb-2" />
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
                  <p className="text-sm leading-relaxed">{getMemoryContent(memory)}</p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(memory.created_at)}</span>
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
                    <Trash className="h-3 w-3" />
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
}: SettingsDialogProps) {
  const [currentTab, setCurrentTab] = useState('profile');
  const isMobile = useMediaQuery('(max-width: 768px)');
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
      value: 'memories',
      label: 'Memories',
      icon: ({ className }: { className?: string }) => <HugeiconsIcon icon={BrainIcon} className={className} />,
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
        className="mt-0 !scrollbar-thin !scrollbar-track-transparent !scrollbar-thumb-muted-foreground/20 hover:!scrollbar-thumb-muted-foreground/30"
      >
        <PreferencesSection
          user={user}
          isCustomInstructionsEnabled={isCustomInstructionsEnabled}
          setIsCustomInstructionsEnabled={setIsCustomInstructionsEnabled}
        />
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
          className="h-[85vh] max-h-[600px] p-0 [&[data-vaul-drawer]]:transition-none overflow-hidden"
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
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 !pb-4 overscroll-contain !scrollbar-w-1 !scrollbar-track-transparent !scrollbar-thumb-muted-foreground/20 hover:!scrollbar-thumb-muted-foreground/30">
                {contentSections}
              </div>

              {/* Bottom tab navigation - compact and accessible */}
              <div
                className={cn(
                  'border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0',
                  currentTab === 'preferences'
                    ? 'pb-[calc(env(safe-area-inset-bottom)+2.5rem)]'
                    : 'pb-[calc(env(safe-area-inset-bottom)+1rem)]',
                )}
              >
                <TabsList className="w-full py-1 h-14 bg-transparent rounded-none grid grid-cols-5 gap-1 !mb-2 px-4">
                  {tabItems.map((item) => (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className="flex-col gap-0.5 h-full rounded-md data-[state=active]:bg-muted data-[state=active]:shadow-none relative px-1 transition-colors"
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
      <DialogContent className="!max-w-4xl !w-full max-h-[85vh] !p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 !m-0">
          <DialogTitle className="text-xl font-medium tracking-normal flex items-center gap-2">
            <SciraLogo className="size-6" color="currentColor" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-48 !m-0">
            <div className="p-2 !gap-1 flex flex-col">
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
            <ScrollArea className="h-[calc(85vh-120px)] !scrollbar-w-1 !scrollbar-track-transparent !scrollbar-thumb-muted-foreground/20 hover:!scrollbar-thumb-muted-foreground/30">
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
