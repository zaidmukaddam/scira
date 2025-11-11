'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/contexts/user-context';
import {
  UsageSection,
  PreferencesSection,
  SubscriptionSection,
  ConnectorsSection,
  MemoriesSection,
} from '@/components/settings-dialog';
import { cn } from '@/lib/utils';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Analytics01Icon,
  Settings02Icon,
  Crown02Icon,
  ConnectIcon,
  Brain02Icon,
} from '@hugeicons/core-free-icons';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Suspense, useState } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { signOut } from '@/lib/auth-client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeftIcon } from '@phosphor-icons/react';

function SettingsPageInner() {
  const router = useRouter();
  const { user, isProUser, isLoading, subscriptionData } = useUser();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'usage';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isCustomInstructionsEnabled, setIsCustomInstructionsEnabled] = useLocalStorage(
    'scira-custom-instructions-enabled',
    true,
  );
  const [blurPersonalInfo, setBlurPersonalInfo] = useLocalStorage<boolean>('scira-blur-personal-info', false);

  const tabs = [
    { value: 'usage', label: 'Usage', icon: Analytics01Icon },
    { value: 'subscription', label: 'Subscription', icon: Crown02Icon },
    { value: 'preferences', label: 'Preferences', icon: Settings02Icon },
    { value: 'connectors', label: 'Connectors', icon: ConnectIcon },
    { value: 'memories', label: 'Memories', icon: Brain02Icon },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header with actions */}
      <div className="mt-6">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant={"secondary"}
              size="sm"
              className="h-8 gap-2 !shadow-none"
              onClick={() => router.push('/new')}
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="text-sm">Back to Search</span>
            </Button>
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <ThemeSwitcher />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await signOut({
                    fetchOptions: {
                      onRequest: () => { toast.loading('Signing out...'); },
                      onSuccess: () => {
                        toast.dismiss();
                        toast.success('Signed out');
                        if (typeof window !== 'undefined') window.location.href = '/new';
                      },
                      onError: () => {
                        toast.dismiss();
                        toast.error('Failed to sign out');
                      },
                    },
                  });
                } catch (e) {
                  toast.error('Failed to sign out');
                }
              }}
              className="h-7 px-3 text-xs !shadow-none"
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* User Profile - Mobile */}
        <div className="lg:hidden mb-6">
          <Card className="p-4 shadow-none">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user?.image || ''} className={cn(blurPersonalInfo && 'blur-sm')} />
                <AvatarFallback>
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
                  <h3 className={cn('font-semibold text-lg truncate', blurPersonalInfo && 'blur-sm')}>{user?.name || 'User'}</h3>
                  {isProUser && (
                    <span className="inline-block !font-baumans leading-4 !mb-1 !px-2.5 !pt-0 !pb-1 rounded-xl shadow-sm bg-gradient-to-br from-secondary/25 via-primary/20 to-accent/25 text-foreground ring-1 ring-ring/35 ring-offset-1 ring-offset-background dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground">
                      pro
                    </span>
                  )}
                </div>
                <p className={cn('text-xs text-muted-foreground truncate', blurPersonalInfo && 'blur-sm')}>{user?.email}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Label htmlFor="blur-personal-mobile" className="text-xs text-muted-foreground">Blur personal info</Label>
              <Switch id="blur-personal-mobile" checked={!!blurPersonalInfo} onCheckedChange={setBlurPersonalInfo} />
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
                      <HugeiconsIcon
                        icon={tabs.find((t) => t.value === activeTab)!.icon}
                        size={16}
                        strokeWidth={1.5}
                      />
                      <span>{tabs.find((t) => t.value === activeTab)!.label}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tabs.map((tab) => (
                  <SelectItem key={tab.value} value={tab.value}>
                    <div className="flex items-center gap-2">
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
            <Card className="p-6 shadow-none">
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="h-20 w-20">
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
                <div className="space-y-1 w-full">
                  <h3 className={cn('font-semibold text-base', blurPersonalInfo && 'blur-sm')}>{user?.name || 'User'}</h3>
                  <p className={cn('text-xs text-muted-foreground break-all', blurPersonalInfo && 'blur-sm')}>{user?.email}</p>
                  {isLoading ? (
                    <Skeleton className="h-5 w-16 mx-auto mt-2" />
                  ) : (
                    isProUser && (
                      <span className="inline-block !font-baumans leading-4 !px-2 !pt-0.5 !pb-1.5 rounded-xl shadow-sm bg-gradient-to-br from-secondary/25 via-primary/20 to-accent/25 text-foreground ring-1 ring-ring/35 ring-offset-1 ring-offset-background dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground mt-2">
                        pro
                      </span>
                    )
                  )}
                </div>
                <div className="w-full pt-3 flex items-center justify-between">
                  <Label htmlFor="blur-personal-desktop" className="text-xs text-muted-foreground">Blur personal info</Label>
                  <Switch id="blur-personal-desktop" checked={!!blurPersonalInfo} onCheckedChange={setBlurPersonalInfo} />
                </div>
              </div>
            </Card>

            {/* Tabs */}
            <Card className="p-2 shadow-none">
              <TabsList className="flex flex-col h-auto w-full bg-transparent gap-1">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className={cn(
                      'w-full justify-start gap-3 px-4 py-3 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground',
                      'hover:bg-accent/50 transition-colors !shadow-none',
                    )}
                  >
                    <HugeiconsIcon icon={tab.icon} size={18} strokeWidth={1.5} />
                    <span className="font-medium">{tab.label}</span>
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
                    <h2 className="text-lg font-semibold">Usage Statistics</h2>
                    <p className="text-sm text-muted-foreground">Track your daily and monthly usage</p>
                  </div>
                  <UsageSection user={user} />
                </div>
              </TabsContent>

              <TabsContent value="subscription" className="m-0">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Subscription</h2>
                    <p className="text-sm text-muted-foreground">Manage your subscription and billing</p>
                  </div>
                  <SubscriptionSection subscriptionData={subscriptionData} isProUser={isProUser} user={user} />
                </div>
              </TabsContent>

              <TabsContent value="preferences" className="m-0">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Preferences</h2>
                    <p className="text-sm text-muted-foreground">Customize your search and AI experience</p>
                  </div>
                  <PreferencesSection
                    user={user}
                    isCustomInstructionsEnabled={isCustomInstructionsEnabled}
                    setIsCustomInstructionsEnabled={setIsCustomInstructionsEnabled}
                  />
                </div>
              </TabsContent>

              <TabsContent value="connectors" className="m-0">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Connectors</h2>
                    <p className="text-sm text-muted-foreground">Connect your external services and data sources</p>
                  </div>
                  <ConnectorsSection user={user} />
                </div>
              </TabsContent>

              <TabsContent value="memories" className="m-0">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Memories</h2>
                    <p className="text-sm text-muted-foreground">Manage your stored memories and context</p>
                  </div>
                  <MemoriesSection />
                </div>
              </TabsContent>
            </Card>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <div className="border-b border-border/40">
            <div className="container mx-auto px-4 py-3 flex items-center gap-3">
              <div className="h-8 w-8" />
              <div className="h-5 w-24 bg-muted rounded" />
            </div>
          </div>
          <div className="container mx-auto px-4 py-6">
            <div className="h-10 w-40 bg-muted rounded mb-4" />
            <div className="h-64 w-full bg-muted rounded" />
          </div>
        </div>
      }
    >
      <SettingsPageInner />
    </Suspense>
  );
}
