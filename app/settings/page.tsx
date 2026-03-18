'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/contexts/user-context';
import {
  UsageSection,
  PreferencesSection,
  SubscriptionSection,
  ConnectorsSection,
  MemoriesSection,
  UploadsSection,
} from '@/components/settings-dialog';
import { cn } from '@/lib/utils';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import {
  Analytics01Icon,
  Settings02Icon,
  Crown02Icon,
  ConnectIcon,
  Brain02Icon,
  Attachment01Icon,
} from '@hugeicons/core-free-icons';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Suspense, useState } from 'react';
import { useSyncedPreferences } from '@/hooks/use-synced-preferences';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SidebarLayout } from '@/components/sidebar-layout';
import { signOut } from '@/lib/auth-client';
import { useQueryClient } from '@tanstack/react-query';
import { sileo } from 'sileo';
import { Button } from '@/components/ui/button';
import { LogoutIcon } from '@hugeicons/core-free-icons';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useRouter } from 'next/navigation';

function SettingsContent() {
  const { user, isProUser, isLoading, subscriptionData } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'usage';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isCustomInstructionsEnabled, setIsCustomInstructionsEnabled] = useSyncedPreferences<boolean>(
    'scira-custom-instructions-enabled',
    true,
  );
  const [blurPersonalInfo, setBlurPersonalInfo] = useSyncedPreferences<boolean>('scira-blur-personal-info', false);

  const tabs = [
    { value: 'usage', label: 'Usage', icon: Analytics01Icon },
    { value: 'subscription', label: 'Subscription', icon: Crown02Icon },
    { value: 'preferences', label: 'Preferences', icon: Settings02Icon },
    { value: 'connectors', label: 'Connectors', icon: ConnectIcon },
    { value: 'memories', label: 'Memories', icon: Brain02Icon },
    { value: 'uploads', label: 'Uploads', icon: Attachment01Icon },
  ].map((item, index) => ({ ...item, number: String(index + 1).padStart(2, '0') }));

  const handleSignOut = async () => {
    queryClient.removeQueries({ queryKey: ['comprehensive-user-data'] });
    localStorage.removeItem('scira-user-data');
    sileo.promise(
      signOut().then(() => router.push('/sign-in')),
      {
        loading: { title: 'Signing out...' },
        success: () => ({ title: 'Signed out successfully' }),
        error: () => ({ title: 'Failed to sign out' }),
      },
    );
  };

  return (
    <div className="w-full">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b border-border/40">
        <div className="flex h-14 items-center justify-between px-4 md:px-6 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
              <span className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-[0.15em] hidden sm:inline-block">
                {tabs.find((t) => t.value === activeTab)?.number || '01'}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {tabs.find((t) => t.value === activeTab)?.label}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6 max-w-7xl mx-auto w-full">
        {/* User Profile - Mobile */}
        <div className="lg:hidden mb-6">
          <Card className="p-4 shadow-none border-border/60">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 overflow-hidden rounded-full ring-2 ring-border/50 ring-offset-2 ring-offset-background mask-[radial-gradient(white,black)] [-webkit-mask-image:-webkit-radial-gradient(white,black)]">
                <AvatarImage src={user?.image || ''} className={cn(blurPersonalInfo && 'blur-sm')} />
                <AvatarFallback className="text-sm font-medium">
                  {user?.name
                    ? user.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                    : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={cn('font-semibold text-base truncate', blurPersonalInfo && 'blur-sm')}>
                    {user?.name || 'User'}
                  </h3>
                  {isProUser && (
                    <span className="inline-block font-baumans! leading-4 mb-1! px-2.5! pt-0! pb-1! rounded-xl shadow-sm bg-linear-to-br from-secondary/25 via-primary/20 to-accent/25 text-foreground ring-1 ring-ring/35 ring-offset-1 ring-offset-background dark:bg-linear-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground">
                      {user?.isMaxUser ? 'max' : 'pro'}
                    </span>
                  )}
                </div>
                <p className={cn('text-xs text-muted-foreground truncate', blurPersonalInfo && 'blur-sm')}>
                  {user?.email}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Label htmlFor="blur-personal-mobile" className="text-xs text-muted-foreground">
                Blur personal info
              </Label>
              <Switch id="blur-personal-mobile" checked={!!blurPersonalInfo} onCheckedChange={setBlurPersonalInfo} />
            </div>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
              >
                <HugeiconsIcon icon={LogoutIcon} size={16} strokeWidth={1.5} />
                Sign Out
              </Button>
            </div>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col lg:flex-row gap-6">
          {/* Mobile Dropdown */}
          <div className="lg:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {tabs.find((t) => t.value === activeTab) && (
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={tabs.find((t) => t.value === activeTab)!.icon} size={16} strokeWidth={1.5} />
                      <span>{tabs.find((t) => t.value === activeTab)!.label}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tabs.map((tab) => (
                  <SelectItem key={tab.value} value={tab.value}>
                    <div className="flex items-center gap-2">
                      <span className="font-pixel-grid text-[9px] text-muted-foreground/40 w-4">{tab.number}</span>
                      <HugeiconsIcon icon={tab.icon} size={16} strokeWidth={1.5} />
                      <span>{tab.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Sidebar Navigation */}
          <aside className="hidden lg:block lg:w-64 shrink-0 space-y-4">
            {/* User Profile Card */}
            <Card className="p-6 shadow-none border-border/60">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-border/50 ring-offset-2 ring-offset-background mask-[radial-gradient(white,black)] [-webkit-mask-image:-webkit-radial-gradient(white,black)]">
                    <AvatarImage src={user?.image || ''} className={cn(blurPersonalInfo && 'blur-sm')} />
                    <AvatarFallback className={cn('text-lg', blurPersonalInfo && 'blur-sm')}>
                      {user?.name
                        ? user.name
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .toUpperCase()
                        : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="space-y-1 w-full">
                  <h3 className={cn('font-semibold text-base', blurPersonalInfo && 'blur-sm')}>
                    {user?.name || 'User'}
                  </h3>
                  <p className={cn('text-xs text-muted-foreground break-all', blurPersonalInfo && 'blur-sm')}>
                    {user?.email}
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-5 w-16 mx-auto mt-2" />
                  ) : (
                    isProUser && (
                      <span className="inline-block font-baumans! leading-4 px-2! pt-0.5! pb-1.5! rounded-xl shadow-sm bg-linear-to-br from-secondary/25 via-primary/20 to-accent/25 text-foreground ring-1 ring-ring/35 ring-offset-1 ring-offset-background dark:bg-linear-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground mt-2">
                        {user?.isMaxUser ? 'max' : 'pro'}
                      </span>
                    )
                  )}
                </div>
                <div className="w-full pt-3 flex items-center justify-between">
                  <Label htmlFor="blur-personal-desktop" className="text-xs text-muted-foreground">
                    Blur personal info
                  </Label>
                  <Switch
                    id="blur-personal-desktop"
                    checked={!!blurPersonalInfo}
                    onCheckedChange={setBlurPersonalInfo}
                  />
                </div>
                <div className="w-full pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-muted-foreground hover:text-foreground"
                    onClick={handleSignOut}
                  >
                    <HugeiconsIcon icon={LogoutIcon} size={16} strokeWidth={1.5} />
                    Sign Out
                  </Button>
                </div>
              </div>
            </Card>

            {/* Tabs */}
            <Card className="p-2 shadow-none border-border/60">
              <TabsList className="flex flex-col h-auto w-full bg-transparent gap-0.5">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      'w-full justify-start gap-3 px-3 py-2.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground',
                      'hover:bg-accent/50 transition-colors shadow-none! rounded-lg',
                    )}
                  >
                    <span className="font-pixel-grid text-[9px] text-muted-foreground/40 w-4">{tab.number}</span>
                    <HugeiconsIcon icon={tab.icon} size={16} strokeWidth={1.5} />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Card>
          </aside>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <Card className="p-0 shadow-none bg-transparent border-none">
              <TabsContent value="usage" className="m-0">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-pixel-grid text-xs text-muted-foreground/30">01</span>
                      <h2 className="text-lg font-semibold">Usage Statistics</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">Track your daily and monthly usage</p>
                  </div>
                  <UsageSection user={user} />
                </div>
              </TabsContent>

              <TabsContent value="subscription" className="m-0">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-pixel-grid text-xs text-muted-foreground/30">02</span>
                      <h2 className="text-lg font-semibold">Subscription</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">Manage your subscription and billing</p>
                  </div>
                  <SubscriptionSection subscriptionData={subscriptionData} isProUser={isProUser} user={user} />
                </div>
              </TabsContent>

              <TabsContent value="preferences" className="m-0">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-pixel-grid text-xs text-muted-foreground/30">03</span>
                      <h2 className="text-lg font-semibold">Preferences</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">Customize your search and AI experience</p>
                  </div>
                  <PreferencesSection
                    user={user}
                    isCustomInstructionsEnabled={isCustomInstructionsEnabled}
                    setIsCustomInstructionsEnabledAction={setIsCustomInstructionsEnabled}
                  />
                </div>
              </TabsContent>

              <TabsContent value="connectors" className="m-0">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-pixel-grid text-xs text-muted-foreground/30">04</span>
                      <h2 className="text-lg font-semibold">Connectors</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">Connect your external services and data sources</p>
                  </div>
                  <ConnectorsSection user={user} />
                </div>
              </TabsContent>

              <TabsContent value="memories" className="m-0">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-pixel-grid text-xs text-muted-foreground/30">06</span>
                      <h2 className="text-lg font-semibold">Memories</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">Manage your stored memories and context</p>
                  </div>
                  <MemoriesSection />
                </div>
              </TabsContent>

              <TabsContent value="uploads" className="m-0">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-pixel-grid text-xs text-muted-foreground/30">07</span>
                      <h2 className="text-lg font-semibold">Uploads</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">View and manage files you&apos;ve uploaded in chats</p>
                  </div>
                  <UploadsSection />
                </div>
              </TabsContent>
            </Card>
          </div>
        </Tabs>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <SidebarLayout>
      <Suspense
        fallback={
          <div className="w-full">
            <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/40">
              <div className="flex h-14 items-center justify-between px-4 md:px-6 max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-3">
                  <div className="md:hidden h-6 w-6 bg-muted rounded" />
                  <div className="h-5 w-24 bg-muted rounded" />
                </div>
              </div>
            </header>
            <main className="flex-1 overflow-auto p-4 md:p-6 max-w-7xl mx-auto w-full">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="hidden lg:block lg:w-64 shrink-0 space-y-4">
                  <div className="rounded-xl border border-border/60 p-6">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="h-20 w-20 bg-muted rounded-full" />
                      <div className="space-y-2 w-full">
                        <div className="h-4 w-24 bg-muted rounded mx-auto" />
                        <div className="h-3 w-32 bg-muted rounded mx-auto" />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 p-2 space-y-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <div key={i} className="h-10 bg-muted/30 rounded-lg" />
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="h-8 w-40 bg-muted rounded mb-4" />
                  <div className="h-64 w-full bg-muted/30 rounded-xl" />
                </div>
              </div>
            </main>
          </div>
        }
      >
        <SettingsContent />
      </Suspense>
    </SidebarLayout>
  );
}
