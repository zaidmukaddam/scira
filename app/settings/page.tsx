'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getUserMessageCount, getSubDetails, getCurrentUser, getExtremeSearchUsageCount, getHistoricalUsage } from '@/app/actions';
import { SEARCH_LIMITS } from '@/lib/constants';
import { authClient } from '@/lib/auth-client';

import {
  Gear,
  Crown,
  MagnifyingGlass,
  Lightning,
  ArrowSquareOut,
  TrendUp,
  Shield,
  Sparkle,
  User,
  ChartLineUp,
  Memory,
  Calendar,
  ArrowLeft,
  House,
} from '@phosphor-icons/react';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { getAllMemories, searchMemories, deleteMemory, MemoryItem } from '@/lib/memory-actions';
import { Loader2, Search, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { UsageGraph } from '@/components/ui/usage-graph';
import { T, useGT, Var, Num, Plural, useLocale } from 'gt-next';

// Component for Profile Information with its own loading state
function ProfileSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: subscriptionDetails, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: getSubDetails,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });


  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const t = useGT();

  useEffect(() => {
    if (userError) {
      console.error('Error fetching user data:', userError);
      toast.error(t('Failed to load profile data'));
    }
  }, [userError, t]);

  const isProUser = subscriptionDetails?.hasSubscription && subscriptionDetails?.subscription?.status === 'active';

  if (userLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          <T>Profile Information</T>
        </CardTitle>
        <CardDescription><T>Update your personal information and profile settings</T></CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.image || ''} />
            <AvatarFallback className="text-lg">
              {name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">{user?.name}</h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {subscriptionLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              isProUser && (
                <Badge className="bg-black text-white border-0 text-xs font-medium">
                  <Crown className="h-3 w-3 mr-1" />
                  PRO
                </Badge>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name"><T>Full Name</T></Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('Enter your full name')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email"><T>Email</T></Label>
            <Input id="email" type="email" value={email} placeholder={t('Enter your email')} disabled className="bg-muted" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={async () => {
              try {
                // Here you would typically call an API to update the user profile
                // For now, we'll just show a success message
                toast.success(t('Profile updated successfully'));
              } catch (error) {
                toast.error(t('Failed to update profile'));
              }
            }}
          >
            <T>Save Changes</T>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setName(user?.name || '');
              setEmail(user?.email || '');
            }}
          >
            <T>Reset</T>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Component for Usage Information with its own loading state
function UsageSection() {
  const t = useGT();
  // Combine all usage-related queries into a single optimized query
  const {
    data: usageData,
    isLoading: usageLoading,
    error: usageError,
    refetch: refetchUsageData,
  } = useQuery({
    queryKey: ['usageData'],
    queryFn: async () => {
      // Fetch all data in parallel for better performance
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
    staleTime: 1000 * 60 * 3, // 3 minutes - longer cache time
    gcTime: 1000 * 60 * 5, // 5 minutes cache retention
    refetchOnWindowFocus: false, // Disable automatic refetch on focus
    retry: 2, // Reduce retry attempts
  });

  // Fetch historical usage data for the graph (only when user is available)
  const {
    data: historicalUsageData,
    isLoading: historicalLoading,
    refetch: refetchHistoricalData,
  } = useQuery({
    queryKey: ['historicalUsage', usageData?.subscriptionDetails?.hasSubscription],
    queryFn: () => getHistoricalUsage(),
    enabled: !!usageData, // Only run when usage data is available
    staleTime: 1000 * 60 * 10, // 10 minutes - historical data changes less frequently
    gcTime: 1000 * 60 * 15, // 15 minutes cache retention
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // Destructure data with fallbacks
  const searchCount = usageData?.searchCount;
  const extremeSearchCount = usageData?.extremeSearchCount;
  const subscriptionDetails = usageData?.subscriptionDetails;

  useEffect(() => {
    if (usageError) {
      console.error('Error fetching usage data:', usageError);
      toast.error(t('Failed to load usage data'));
    }
  }, [usageError, t]);

  const handleRefreshUsage = async () => {
    try {
      await refetchUsageData();
      toast.success(t('Usage data refreshed'));
    } catch (error) {
      toast.error(t('Failed to refresh usage data'));
    }
  };

  const isProUser = subscriptionDetails?.hasSubscription && subscriptionDetails?.subscription?.status === 'active';
  const searchLimit = isProUser ? Infinity : SEARCH_LIMITS.DAILY_SEARCH_LIMIT;
  const usagePercentage = isProUser
    ? 0
    : Math.min(((searchCount?.count || 0) / SEARCH_LIMITS.DAILY_SEARCH_LIMIT) * 100, 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ChartLineUp className="h-5 w-5" />
              <T>Daily Search Usage</T>
            </CardTitle>
            <CardDescription><T>Track your daily search consumption and limits</T></CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefreshUsage}>
            <TrendUp className="h-4 w-4 mr-2" />
            <T>Refresh</T>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Usage Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Searches */}
          <div className="p-4 border rounded-lg bg-card h-32 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                <T><span className="text-xs text-muted-foreground leading-tight">Todays Searches</span></T>
                <T><span className="text-[10px] text-muted-foreground/70">(Other models)</span></T>
              </div>
              <MagnifyingGlass className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            </div>
            <div className="mt-auto">
              {usageLoading ? (
                <Skeleton className="h-7 w-10" />
              ) : (
                <span className="text-xl font-bold leading-tight">{searchCount?.count || 0}</span>
              )}
            </div>
          </div>

          {/* Free Unlimited Models */}
          <div className="p-4 border rounded-lg bg-card h-32 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                <T><span className="text-xs text-muted-foreground leading-tight">Grok 3 Mini & Vision</span></T>
                <T><span className="text-[10px] text-muted-foreground/70">Unlimited access</span></T>
              </div>
              <Sparkle className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            </div>
            <div className="mt-auto">
              <span className="text-xl font-bold leading-tight">∞</span>
            </div>
          </div>

          {/* Extreme Searches (Monthly) */}
          <div className="p-4 border rounded-lg bg-card h-32 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                <T><span className="text-xs text-muted-foreground leading-tight">
                  Extreme Searches <span className="text-[10px] text-muted-foreground/70 align-middle">(Monthly)</span>
                </span></T>
              </div>
              <Lightning className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            </div>
            <div className="mt-auto">
              {usageLoading ? (
                <Skeleton className="h-7 w-10" />
              ) : (
                <span className="text-xl font-bold leading-tight">{extremeSearchCount?.count || 0}</span>
              )}
            </div>
          </div>

          {/* Daily Limit */}
          <div className="p-4 border rounded-lg bg-card h-32 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-0.5">
                <T><span className="text-xs text-muted-foreground leading-tight">Daily Limit</span></T>
                <T><span className="text-[10px] text-muted-foreground/70">(Other models)</span></T>
              </div>
              <Shield className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            </div>
            <div className="mt-auto">
              {usageLoading ? (
                <Skeleton className="h-7 w-10" />
              ) : (
                <span className="text-xl font-bold leading-tight">
                  {isProUser ? '∞' : SEARCH_LIMITS.DAILY_SEARCH_LIMIT}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Usage Trend Graph */}
        {!usageLoading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <T><h4 className="font-medium">Usage Activity</h4></T>
                <T><p className="text-sm text-muted-foreground">Your search activity over the past year</p></T>
              </div>
              <div className="text-sm text-muted-foreground">
                <T>Past 52 weeks</T>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg bg-card">
              {historicalLoading ? (
                <div className="h-32 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full animate-spin mx-auto mb-2" />
                    <T><p className="text-sm text-muted-foreground">Loading usage history...</p></T>
                  </div>
                </div>
              ) : (
                <UsageGraph 
                  data={historicalUsageData || []} 
                />
              )}
            </div>
          </div>
        )}

        {/* Usage Progress Bars for Free Users */}
        {!usageLoading && !isProUser && (
          <div className="space-y-4">
            {/* Free Unlimited Models Notice */}
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200 mb-2">
                <Sparkle className="h-4 w-4" />
                <T><span className="text-sm font-medium">Unlimited Access Available</span></T>
              </div>
              <T><p className="text-xs text-green-700 dark:text-green-300">
                You have unlimited access to Grok 3 Mini and Grok 2 Vision models. Daily limits only apply to other AI
                models.
              </p></T>
            </div>

            {/* Regular Search Usage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <T><span>Search Usage (Other Models Only)</span></T>
                {usageLoading ? <Skeleton className="h-4 w-16" /> : <T><span><Var>{usagePercentage.toFixed(1)}</Var>% used</span></T>}
              </div>
              {usageLoading ? (
                <Skeleton className="h-3 w-full" />
              ) : (
                <Progress value={usagePercentage} className="h-3" />
              )}
              <div className="flex justify-between text-xs text-muted-foreground">
                <T><span>
                  <Num>{searchCount?.count || 0}</Num> of <Num>{SEARCH_LIMITS.DAILY_SEARCH_LIMIT}</Num> searches used today
                </span></T>
                <T><span><Num>{Math.max(0, SEARCH_LIMITS.DAILY_SEARCH_LIMIT - (searchCount?.count || 0))}</Num> remaining</span></T>
              </div>
              {!usageLoading && usagePercentage > 80 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <MagnifyingGlass className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      <T><Var>{usagePercentage >= 100
                        ? 'Daily limit reached for other models!'
                        : 'Approaching daily limit for other models'}</Var></T>
                    </span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    <T><Var>{usagePercentage >= 100
                      ? 'You can still use Grok 3 Mini & Vision unlimited. Upgrade to Pro for unlimited access to all models.'
                      : 'Remember: Grok 3 Mini & Vision are always unlimited. Upgrade to Pro for unlimited access to all models.'}</Var></T>
                  </p>
                </div>
              )}
            </div>

            {/* Extreme Search Usage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <T><span>Extreme Search Usage (Monthly)</span></T>
                {usageLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : (
                  <T><span>
                    <Var>{(((extremeSearchCount?.count || 0) / SEARCH_LIMITS.EXTREME_SEARCH_LIMIT) * 100).toFixed(1)}</Var>% used
                  </span></T>
                )}
              </div>
              {usageLoading ? (
                <Skeleton className="h-3 w-full" />
              ) : (
                <Progress
                  value={((extremeSearchCount?.count || 0) / SEARCH_LIMITS.EXTREME_SEARCH_LIMIT) * 100}
                  className="h-3"
                />
              )}
              {!usageLoading && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <T><span>
                    <Num>{extremeSearchCount?.count || 0}</Num> of <Num>{SEARCH_LIMITS.EXTREME_SEARCH_LIMIT}</Num> extreme searches used this
                    month
                  </span></T>
                  <T><span>
                    <Num>{Math.max(0, SEARCH_LIMITS.EXTREME_SEARCH_LIMIT - (extremeSearchCount?.count || 0))}</Num> remaining
                  </span></T>
                </div>
              )}
              {!usageLoading && (extremeSearchCount?.count || 0) >= SEARCH_LIMITS.EXTREME_SEARCH_LIMIT * 0.8 && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <div className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
                    <Lightning className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      <T><Var>{(extremeSearchCount?.count || 0) >= SEARCH_LIMITS.EXTREME_SEARCH_LIMIT
                        ? 'Monthly extreme search limit reached!'
                        : 'Almost at monthly extreme search limit'}</Var></T>
                    </span>
                  </div>
                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                    <T><Var>{(extremeSearchCount?.count || 0) >= SEARCH_LIMITS.EXTREME_SEARCH_LIMIT
                      ? 'Upgrade to Pro for unlimited extreme searches with advanced AI analysis.'
                      : 'Upgrade to Pro for unlimited extreme searches and premium features.'}</Var></T>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {!usageLoading && !isProUser && (
          <div className="border-t pt-6">
            <div className="space-y-4">
              <div>
                <T><h4 className="font-medium mb-2">Upgrade to Pro</h4></T>
                <T><p className="text-sm text-muted-foreground mb-4">
                  Get unlimited searches and access to premium features
                </p></T>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MagnifyingGlass className="h-4 w-4 text-blue-500" />
                    <T><span className="font-medium text-sm">Unlimited All Models</span></T>
                  </div>
                  <T><p className="text-xs text-muted-foreground">No limits on any AI model, including premium ones</p></T>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkle className="h-4 w-4 text-purple-600" />
                    <T><span className="font-medium text-sm">Premium AI Models</span></T>
                  </div>
                  <T><p className="text-xs text-muted-foreground">Access to Claude, GPT-4, and advanced analysis tools</p></T>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-green-500" />
                    <T><span className="font-medium text-sm">Priority Support</span></T>
                  </div>
                  <T><p className="text-xs text-muted-foreground">Faster response times and dedicated help</p></T>
                </div>
              </div>

              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link href="/pricing">
                    <Crown className="h-4 w-4 mr-2" />
                    <T>Upgrade to Pro</T>
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/pricing">
                    <T>View Plans</T>
                    <ArrowSquareOut className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Types for billing history
interface OrderItem {
  label: string;
  amount: number;
}

interface Order {
  id: string;
  product?: {
    name: string;
  };
  createdAt: string;
  totalAmount: number;
  currency: string;
  status: string;
  subscription?: {
    status: string;
    endedAt?: string;
  };
  items: OrderItem[];
}

interface OrdersResponse {
  result: {
    items: Order[];
  };
}

// Component for Subscription Information with its own loading state
function SubscriptionSection() {
  const t = useGT();
  const locale = useLocale();
  const [orders, setOrders] = useState<OrdersResponse | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const {
    data: subscriptionDetails,
    isLoading: subscriptionLoading,
    error: subscriptionError,
  } = useQuery({
    queryKey: ['subscription'],
    queryFn: getSubDetails,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fetch billing history
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const ordersResponse = await authClient.customer.orders.list({});
        if (ordersResponse.data) {
          setOrders(ordersResponse.data as unknown as OrdersResponse);
        } else {
          setOrders(null);
        }
      } catch (orderError) {
        console.log('Orders fetch failed - customer may not exist yet:', orderError);
        setOrders(null);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, []);

  useEffect(() => {
    if (subscriptionError) {
      console.error('Error fetching subscription data:', subscriptionError);
      toast.error(t('Failed to load subscription data'));
    }
  }, [subscriptionError, t]);

  const handleManageSubscription = async () => {
    try {
      await authClient.customer.portal();
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      toast.error(t('Failed to open subscription management'));
    }
  };

  const isProUser = subscriptionDetails?.hasSubscription && subscriptionDetails?.subscription?.status === 'active';

  if (subscriptionLoading || ordersLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          <T>Subscription Status</T>
        </CardTitle>
        <CardDescription><T>Manage your subscription and billing information</T></CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isProUser ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-950/50 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-black dark:bg-white rounded-full">
                  <Crown className="h-5 w-5 text-white dark:text-black" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">PRO Subscription Active</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Unlimited access to all premium features
                  </p>
                </div>
              </div>
              <Badge className="bg-black text-white border-0 font-medium">ACTIVE</Badge>
            </div>

            {subscriptionDetails?.subscription && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Plan</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">Pro Plan</p>
                    <p className="text-sm text-muted-foreground">
                      ${(subscriptionDetails.subscription.amount / 100).toFixed(2)}/
                      {subscriptionDetails.subscription.recurringInterval}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Next Billing</Label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">
                      {new Date(subscriptionDetails.subscription.currentPeriodEnd).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Auto-renewal {subscriptionDetails.subscription.cancelAtPeriodEnd ? 'disabled' : 'enabled'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleManageSubscription}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Manage Billing
              </Button>
              <Button variant="outline">
                <Gear className="h-4 w-4 mr-2" />
                Update Plan
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center p-8 border border-dashed rounded-lg">
              <T>
                <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Active Subscription</h3>
                <p className="text-muted-foreground mb-6">
                  You&apos;re currently on the free plan with limited daily searches. Upgrade to Pro for unlimited access
                  and premium features.
                </p>

                <div className="space-y-4">
                  <Button asChild size="lg" className="w-full max-w-xs">
                    <Link href="/pricing">
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade to Pro
                    </Link>
                  </Button>

                  <div className="text-sm text-muted-foreground">
                    <Link href="/pricing" className="hover:underline">
                      View all plans and pricing →
                    </Link>
                  </div>
                </div>
              </T>
            </div>

            {subscriptionDetails?.error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200 mb-1">
                  <span className="text-sm font-medium"><T>Subscription Issue</T></span>
                </div>
                <p className="text-xs text-red-700 dark:text-red-300">{subscriptionDetails.error}</p>
                {subscriptionDetails.errorType === 'CANCELED' && (
                  <Button asChild size="sm" className="mt-3">
                    <Link href="/pricing"><T>Reactivate Subscription</T></Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Billing History Section */}
        <div className="border-t pt-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <T>
                <h4 className="text-lg font-medium">Billing History</h4>
                <p className="text-sm text-muted-foreground">View your past and upcoming invoices</p>
              </T>
            </div>
            <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={orders === null}>
              <ExternalLink className="h-4 w-4 mr-2" />
              <T>Manage Subscription</T>
            </Button>
          </div>

          {orders?.result?.items && orders.result.items.length > 0 ? (
            <div className="space-y-3">
              {orders.result.items.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium text-base">{order.product?.name || 'Subscription'}</h5>
                            {order.subscription?.status === 'paid' ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">
                                Paid
                              </Badge>
                            ) : order.subscription?.status === 'canceled' ? (
                              <Badge variant="destructive" className="text-xs">
                                Canceled
                              </Badge>
                            ) : order.subscription?.status === 'refunded' ? (
                              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs">
                                Refunded
                              </Badge>
                            ) : order.subscription?.status ? (
                              <Badge variant="outline" className="text-xs">
                                {order.subscription.status}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {order.status}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString(locale, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                            {order.subscription?.status === 'canceled' && order.subscription.endedAt && (
                              <span className="ml-2">
                                • Canceled on{' '}
                                {new Date(order.subscription.endedAt).toLocaleDateString(locale, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-medium text-base">${(order.totalAmount / 100).toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">{order.currency?.toUpperCase()}</div>
                        </div>
                      </div>

                      {/* Order Items */}
                      {order.items?.length > 0 && (
                        <div className="pt-3 border-t">
                          <ul className="space-y-1.5 text-sm">
                            {order.items.map((item, index: number) => (
                              <li key={`${order.id}-${item.label}-${index}`} className="flex justify-between">
                                <span className="text-muted-foreground truncate max-w-[200px]">{item.label}</span>
                                <span className="font-medium">${(item.amount / 100).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    className="h-10 w-10 text-muted-foreground mb-4"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  <h5 className="mt-4 text-lg font-semibold"><T>No orders found</T></h5>
                  <p className="mb-4 mt-2 text-sm text-muted-foreground">
                    {orders === null
                      ? t('Unable to load billing history. This may be because your account is not yet set up for billing.')
                      : t("You don't have any orders yet. Your billing history will appear here.")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Component for Memories with its own loading state
function MemoriesSection() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const t = useGT();
  const locale = useLocale();

  // Memory queries
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Search query for memories
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
    enabled: false, // Don't run automatically, only when search is triggered
  });

  // Delete memory mutation
  const deleteMutation = useMutation({
    mutationFn: deleteMemory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      toast.success('Memory successfully deleted');
    },
    onError: (error) => {
      console.error('Delete memory error:', error);
      toast.error('Failed to delete memory');
    },
  });

  // Memory helper functions
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
    deleteMutation.mutate(id);
  };

  // Format date in a more readable way
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  // Get memory content based on the response type
  const getMemoryContent = (memory: MemoryItem): string => {
    if (memory.memory) return memory.memory;
    if (memory.name) return memory.name;
    return 'No content available';
  };

  // Determine which memories to display
  const displayedMemories =
    searchQuery.trim() && searchResults
      ? searchResults.memories
      : memoriesData?.pages.flatMap((page) => page.memories) || [];

  // Calculate total memories
  const totalMemories =
    searchQuery.trim() && searchResults
      ? searchResults.total
      : memoriesData?.pages.reduce((acc, page) => acc + page.memories.length, 0) || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <T>
            <Memory className="h-4 w-4" />
            Your Memories
          </T>
        </CardTitle>
        <CardDescription className="text-sm">
          <T>Manage your saved conversation memories</T>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("Search memories...")}
            className="flex-1 h-8"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch(e);
              }
            }}
          />
          <Button
            onClick={handleSearch}
            size="sm"
            variant="secondary"
            disabled={isSearching || !searchQuery.trim()}
            className="h-8 w-8 p-0"
          >
            {isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
          </Button>
          {searchQuery.trim() && (
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={handleClearSearch}>
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="text-xs text-muted-foreground">
            {totalMemories}{' '}
            <Plural n={totalMemories} 
              singular={<T>memory</T>} 
              plural={<T>memories</T>} />
          </span>
        </div>

        <ScrollArea className="h-[300px]">
          {memoriesLoading && !displayedMemories.length ? (
            <div className="flex flex-col justify-center items-center h-[280px]">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-2"><T>Loading...</T></p>
            </div>
          ) : displayedMemories.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-[280px] border border-dashed rounded-md bg-muted/30">
              <Memory className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-muted-foreground"><T>No memories found</T></p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                {searchQuery ? t("Try a different search term") : t("Memories will appear here when you save them")}
              </p>
            </div>
          ) : (
            <div className="space-y-2 pr-3">
              {displayedMemories.map((memory: MemoryItem) => (
                <div
                  key={memory.id}
                  className="group relative p-3 rounded-md border bg-card/50 hover:bg-card transition-colors"
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap flex-1 pr-2">
                      {getMemoryContent(memory)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteMemory(memory.id)}
                      className={cn(
                        'h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0',
                        'opacity-0 group-hover:opacity-100 transition-opacity',
                      )}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(memory.created_at)}</span>
                  </div>
                </div>
              ))}

              {hasNextPage && !searchQuery.trim() && (
                <div className="pt-1 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={!hasNextPage || isFetchingNextPage}
                    size="sm"
                    className="h-7 text-xs"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        <T>Loading...</T>
                      </>
                    ) : (
                      <T>Load More</T>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function SettingsContent() {
  const [currentTab, setCurrentTab] = useState('profile');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get subscription status for the header badge (lightweight query)
  const { data: subscriptionDetails, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: getSubDetails,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Handle URL tab parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'usage', 'subscription', 'memories'].includes(tab)) {
      setCurrentTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  const isProUser = subscriptionDetails?.hasSubscription && subscriptionDetails?.subscription?.status === 'active';

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
      {/* Header - always shows immediately */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" asChild>
            <Link href="/new">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to search</span>
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <House className="h-4 w-4" />
            <span>/</span>
            <T>
              <span className="text-foreground">Settings</span>
            </T>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <T>
              <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
              <p className="text-muted-foreground mt-2">Manage your account, subscription, and usage preferences</p>
            </T>
          </div>
          {subscriptionLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            isProUser && (
              <Badge className="bg-black text-white border-0 font-medium">
                <Crown className="h-3 w-3 mr-1" />
                PRO
              </Badge>
            )
          )}
        </div>
      </div>

      {/* Tabs - always shows immediately */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <T>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="subscription">Subscription</TabsTrigger>
            <TabsTrigger value="memories">Memories</TabsTrigger>
          </T>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Suspense fallback={<div>Loading profile...</div>}>
            <ProfileSection />
          </Suspense>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <Suspense fallback={<div>Loading usage data...</div>}>
            <UsageSection />
          </Suspense>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <Suspense fallback={<div>Loading subscription data...</div>}>
            <SubscriptionSection />
          </Suspense>
        </TabsContent>

        <TabsContent value="memories" className="space-y-4">
          <Suspense fallback={<div>Loading memories...</div>}>
            <MemoriesSection />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto">
          <div>
            <Skeleton className="h-9 w-32 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
