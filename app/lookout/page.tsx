'use client';

import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PlusSignIcon, BinocularsIcon, RefreshIcon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import { useLookouts } from '@/hooks/use-lookouts';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { LookoutDetailsSidebar } from './components/lookout-details-sidebar';
import { toast } from 'sonner';

// Import our new components
import { Navbar } from './components/navbar';
import { LoadingSkeletons } from './components/loading-skeleton';
import { NoActiveLookoutsEmpty, NoArchivedLookoutsEmpty } from './components/empty-state';
import { TotalLimitWarning, DailyLimitWarning } from './components/warning-card';
import { LookoutCard } from './components/lookout-card';
import { ProUpgradeScreen } from './components/pro-upgrade-screen';
import { LookoutForm } from './components/lookout-form';
import { useLookoutForm } from './hooks/use-lookout-form';
import { getRandomExamples, LOOKOUT_LIMITS, timezoneOptions } from './constants';
import { formatFrequency } from './utils/time-utils';

interface Lookout {
  id: string;
  title: string;
  prompt: string;
  frequency: string;
  timezone: string;
  nextRunAt: Date;
  status: 'active' | 'paused' | 'archived' | 'running';
  lastRunAt?: Date | null;
  lastRunChatId?: string | null;
  createdAt: Date;
  cronSchedule?: string;
}

export default function LookoutPage() {
  const [activeTab, setActiveTab] = React.useState('active');
  const isMobile = useIsMobile();

  // Random examples state
  const [randomExamples, setRandomExamples] = React.useState(() => getRandomExamples(3));

  // Sidebar state for lookout details
  const [selectedLookout, setSelectedLookout] = React.useState<Lookout | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  // Delete dialog state
  const [lookoutToDelete, setLookoutToDelete] = React.useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  // Authentication and Pro status
  const { user, isProUser, isLoading: isProStatusLoading } = useUser();
  const router = useRouter();

  // Lookouts data and mutations
  const {
    lookouts: allLookouts,
    isLoading,
    error,
    createLookout,
    updateStatus,
    updateLookout,
    deleteLookout,
    testLookout,
    manualRefresh,
    isPending: isMutating,
  } = useLookouts();

  // Detect user timezone on client with fallback to available options
  const [detectedTimezone, setDetectedTimezone] = React.useState<string>('UTC');

  React.useEffect(() => {
    try {
      const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('🌍 Detected system timezone:', systemTimezone);

      // Check if the detected timezone is in our options list
      const matchingOption = timezoneOptions.find((option) => option.value === systemTimezone);
      console.log('📍 Found matching option:', matchingOption);

      if (matchingOption) {
        console.log('✅ Using exact match:', systemTimezone);
        setDetectedTimezone(systemTimezone);
      } else {
        // Try to find a close match based on common patterns
        let fallbackTimezone = 'UTC';

        if (systemTimezone.includes('America/')) {
          if (
            systemTimezone.includes('New_York') ||
            systemTimezone.includes('Montreal') ||
            systemTimezone.includes('Toronto')
          ) {
            fallbackTimezone = 'America/New_York';
          } else if (systemTimezone.includes('Chicago') || systemTimezone.includes('Winnipeg')) {
            fallbackTimezone = 'America/Chicago';
          } else if (systemTimezone.includes('Denver') || systemTimezone.includes('Edmonton')) {
            fallbackTimezone = 'America/Denver';
          } else if (systemTimezone.includes('Los_Angeles') || systemTimezone.includes('Vancouver')) {
            fallbackTimezone = 'America/Los_Angeles';
          }
        } else if (systemTimezone.includes('Europe/')) {
          if (systemTimezone.includes('London')) {
            fallbackTimezone = 'Europe/London';
          } else if (
            systemTimezone.includes('Paris') ||
            systemTimezone.includes('Berlin') ||
            systemTimezone.includes('Rome')
          ) {
            fallbackTimezone = 'Europe/Paris';
          }
        } else if (systemTimezone.includes('Asia/')) {
          if (systemTimezone.includes('Tokyo')) {
            fallbackTimezone = 'Asia/Tokyo';
          } else if (systemTimezone.includes('Shanghai') || systemTimezone.includes('Beijing')) {
            fallbackTimezone = 'Asia/Shanghai';
          } else if (systemTimezone.includes('Singapore')) {
            fallbackTimezone = 'Asia/Singapore';
          } else if (systemTimezone.includes('Kolkata') || systemTimezone.includes('Mumbai')) {
            fallbackTimezone = 'Asia/Kolkata';
          }
        } else if (systemTimezone.includes('Australia/')) {
          if (systemTimezone.includes('Sydney') || systemTimezone.includes('Melbourne')) {
            fallbackTimezone = 'Australia/Sydney';
          } else if (systemTimezone.includes('Perth')) {
            fallbackTimezone = 'Australia/Perth';
          }
        }

        console.log('🔄 Using fallback timezone:', fallbackTimezone);
        setDetectedTimezone(fallbackTimezone);
      }
    } catch {
      console.log('❌ Timezone detection failed, using UTC');
      setDetectedTimezone('UTC');
    }
  }, []);

  // Form logic hook
  const formHook = useLookoutForm(detectedTimezone);

  // Redirect non-authenticated users
  React.useEffect(() => {
    if (!isProStatusLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, isProStatusLoading, router]);

  // Handle error display
  React.useEffect(() => {
    if (error) {
      toast.error('Failed to load lookouts');
    }
  }, [error]);

  // Calculate limits and counts
  const activeDailyLookouts = allLookouts.filter(
    (l: Lookout) => l.frequency === 'daily' && l.status === 'active',
  ).length;
  const totalLookouts = allLookouts.filter((l: Lookout) => l.status !== 'archived').length;
  const canCreateMore = totalLookouts < LOOKOUT_LIMITS.TOTAL_LOOKOUTS;
  const canCreateDailyMore = activeDailyLookouts < LOOKOUT_LIMITS.DAILY_LOOKOUTS;

  // Filter lookouts by tab
  const filteredLookouts = allLookouts.filter((lookout: Lookout) => {
    if (activeTab === 'active')
      return lookout.status === 'active' || lookout.status === 'paused' || lookout.status === 'running';
    if (activeTab === 'archived') return lookout.status === 'archived';
    return true;
  });

  // Event handlers
  const handleStatusChange = async (id: string, status: 'active' | 'paused' | 'archived' | 'running') => {
    updateStatus({ id, status });
  };

  const handleDelete = (id: string) => {
    setLookoutToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleTest = (id: string) => {
    testLookout({ id });
  };

  const handleManualRefresh = async () => {
    await manualRefresh();
  };

  const confirmDelete = () => {
    if (lookoutToDelete) {
      deleteLookout({ id: lookoutToDelete });
      setLookoutToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleOpenLookoutDetails = (lookout: Lookout) => {
    setSelectedLookout(lookout);
    setIsSidebarOpen(true);
  };

  const handleEditLookout = (lookout: Lookout) => {
    formHook.populateFormForEdit(lookout);
    setIsSidebarOpen(false);
  };

  const handleLookoutChange = (newLookout: Lookout) => {
    setSelectedLookout(newLookout);
  };

  // Show loading state while checking authentication
  if (isProStatusLoading) {
    return (
      <>
        <Navbar user={user} isProUser={isProUser} isProStatusLoading={isProStatusLoading} showProBadge={false} />
        <div className="flex-1 flex flex-col justify-center py-8">
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            <LoadingSkeletons count={3} />
          </div>
        </div>
      </>
    );
  }

  // Show upgrade prompt for non-Pro users
  if (!isProUser) {
    return <ProUpgradeScreen user={user} isProUser={isProUser} isProStatusLoading={isProStatusLoading} />;
  }

  return (
    <>
      {/* Lookout Details Sidebar */}
      {selectedLookout && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-40 transition-all duration-300 ease-out ${
              isSidebarOpen
                ? 'bg-black/10 backdrop-blur-sm opacity-100'
                : 'bg-black/0 backdrop-blur-0 opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsSidebarOpen(false)}
          />

          {/* Sidebar */}
          <div
            className={`fixed right-0 top-0 h-screen w-full sm:max-w-xl bg-background border-l z-50 shadow-xl transform transition-all duration-500 ease-out overflow-y-auto ${
              isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="border-b px-3 sm:px-4 py-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={BinocularsIcon} size={16} color="currentColor" strokeWidth={1.5} />
                    <span className="font-medium text-sm">Lookout Details</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen(false)} className="h-7 w-7 p-0">
                    <HugeiconsIcon icon={Cancel01Icon} size={14} color="currentColor" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                <LookoutDetailsSidebar
                  lookout={selectedLookout as any}
                  allLookouts={allLookouts as any}
                  isOpen={isSidebarOpen}
                  onOpenChange={setIsSidebarOpen}
                  onLookoutChange={handleLookoutChange as any}
                  onEditLookout={handleEditLookout as any}
                  onTest={handleTest}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex-1 min-h-screen flex flex-col justify-center">
        {/* Navbar */}
        <Navbar user={user} isProUser={isProUser} isProStatusLoading={isProStatusLoading} showProBadge={true} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center py-8">
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
            {/* Header with Title, Tabs and Actions */}
            <div className="mb-6 space-y-4">
              {/* Title - Always at top */}
              <div className="flex items-center justify-center gap-2">
                <HugeiconsIcon icon={BinocularsIcon} size={32} color="currentColor" strokeWidth={1.5} />
                <h1 className="text-2xl font-semibold font-be-vietnam-pro">Scira Lookout</h1>
              </div>

              {isMobile ? (
                /* Mobile Layout: Actions first, then Tabs */
                <div className="space-y-3">
                  {/* Action buttons - prominent on mobile */}
                  <div className="flex gap-3">
                    <Drawer open={formHook.isCreateDialogOpen} onOpenChange={formHook.handleDialogOpenChange}>
                      <DrawerTrigger asChild>
                        <Button className="flex-1" disabled={!canCreateMore}>
                          <HugeiconsIcon
                            icon={PlusSignIcon}
                            size={16}
                            color="currentColor"
                            strokeWidth={1.5}
                            className="mr-2"
                          />
                          Add New Lookout
                        </Button>
                      </DrawerTrigger>
                      <DrawerContent className="max-h-[85vh]">
                        <DrawerHeader className="pb-4">
                          <DrawerTitle className="text-lg">
                            {formHook.editingLookout ? 'Edit Lookout' : 'Create New Lookout'}
                          </DrawerTitle>
                        </DrawerHeader>

                        <div className="px-4 pb-4 overflow-y-auto flex-1">
                          <LookoutForm
                            formHook={formHook}
                            isMutating={isMutating}
                            activeDailyLookouts={activeDailyLookouts}
                            totalLookouts={totalLookouts}
                            canCreateMore={canCreateMore}
                            canCreateDailyMore={canCreateDailyMore}
                            createLookout={createLookout}
                            updateLookout={updateLookout}
                          />
                        </div>
                      </DrawerContent>
                    </Drawer>
                    
                    <Button
                      variant="outline"
                      onClick={handleManualRefresh}
                      disabled={isMutating}
                      title="Refresh lookouts"
                      className="px-3"
                    >
                      <HugeiconsIcon
                        icon={RefreshIcon}
                        size={16}
                        color="currentColor"
                        strokeWidth={1.5}
                        className={isMutating ? 'animate-spin' : ''}
                      />
                    </Button>
                  </div>
                  
                  {/* Tabs for mobile */}
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-muted w-full">
                      <TabsTrigger value="active" className="flex-1">Active</TabsTrigger>
                      <TabsTrigger value="archived" className="flex-1">Archived</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              ) : (
                /* Desktop Layout: Tabs and Actions side by side */
                <div className="flex justify-between items-center">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-muted">
                      <TabsTrigger value="active">Active</TabsTrigger>
                      <TabsTrigger value="archived">Archived</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleManualRefresh}
                      disabled={isMutating}
                      title="Refresh lookouts"
                    >
                      <HugeiconsIcon
                        icon={RefreshIcon}
                        size={16}
                        color="currentColor"
                        strokeWidth={1.5}
                        className={isMutating ? 'animate-spin' : ''}
                      />
                      <span className="ml-1.5">Refresh</span>
                    </Button>
                    <Dialog open={formHook.isCreateDialogOpen} onOpenChange={formHook.handleDialogOpenChange}>
                      <DialogTrigger asChild>
                        <Button size="sm" disabled={!canCreateMore}>
                          <HugeiconsIcon
                            icon={PlusSignIcon}
                            size={16}
                            color="currentColor"
                            strokeWidth={1.5}
                            className="mr-1"
                          />
                          Add new
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader className="pb-4">
                          <DialogTitle className="text-lg">
                            {formHook.editingLookout ? 'Edit Lookout' : 'Create New Lookout'}
                          </DialogTitle>
                        </DialogHeader>

                        <LookoutForm
                          formHook={formHook}
                          isMutating={isMutating}
                          activeDailyLookouts={activeDailyLookouts}
                          totalLookouts={totalLookouts}
                          canCreateMore={canCreateMore}
                          canCreateDailyMore={canCreateDailyMore}
                          createLookout={createLookout}
                          updateLookout={updateLookout}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}
            </div>

            {/* Limit Warnings */}
            {!canCreateMore && <TotalLimitWarning />}
            {canCreateMore && !canCreateDailyMore && <DailyLimitWarning />}

            {/* Main Content Tabs */}
            <Tabs value={activeTab} defaultValue="active" className="space-y-6">
              <TabsContent value="active" className="space-y-6">
                {isLoading ? (
                  <LoadingSkeletons count={3} />
                ) : filteredLookouts.length === 0 ? (
                  <NoActiveLookoutsEmpty />
                ) : (
                  <div className="space-y-3">
                    {filteredLookouts.map((lookout) => (
                      <LookoutCard
                        key={lookout.id}
                        lookout={lookout}
                        isMutating={isMutating}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onTest={handleTest}
                        onOpenDetails={handleOpenLookoutDetails}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="archived">
                {isLoading ? (
                  <LoadingSkeletons count={2} showActions={false} />
                ) : filteredLookouts.length === 0 ? (
                  <NoArchivedLookoutsEmpty />
                ) : (
                  <div className="space-y-3">
                    {filteredLookouts.map((lookout) => (
                      <LookoutCard
                        key={lookout.id}
                        lookout={lookout}
                        isMutating={isMutating}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onTest={handleTest}
                        onOpenDetails={handleOpenLookoutDetails}
                        showActions={false}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Example Cards */}
            <div className="mt-12">
              <h2 className="text-lg font-semibold mb-4">Example Lookouts</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-hidden">
                {randomExamples.map((example, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer transition-all duration-200 group !pb-0 !mb-0 max-h-96 h-full border hover:border-primary/30 shadow-none"
                    onClick={() => formHook.handleUseExample(example)}
                  >
                    <CardHeader>
                      <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">
                        {example.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="bg-accent/50 border !-mb-1 border-accent rounded-t-lg mx-3 p-4 grow h-28 group-hover:bg-accent/70 group-hover:border-primary/20 transition-all duration-200">
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {example.prompt.slice(0, 100)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFrequency(example.frequency, example.time)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="mx-4 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lookout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lookout? This action cannot be undone and will permanently remove all
              run history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
