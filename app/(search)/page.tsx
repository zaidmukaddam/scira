'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { Plus } from '@phosphor-icons/react';
import { ChatInterface } from '@/components/chat-interface';
import { InstallPrompt } from '@/components/InstallPrompt';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@radix-ui/react-separator';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/components/user-profile';
import { ChatHistoryButton } from '@/components/chat-history-dialog';
import { useUserData } from '@/hooks/use-user-data';
import { useLocalStorage } from '@/hooks/use-local-storage';

const Home = () => {
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [isCustomInstructionsEnabled, setIsCustomInstructionsEnabled] = useLocalStorage(
    'atlas-custom-instructions-enabled',
    true,
  );
  const { user, subscriptionData, isProUser, isLoading: isProStatusLoading } = useUserData();

  return (
    <Suspense>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-full">
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
            <div className="flex items-center gap-1">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Link href="/">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-lg bg-accent hover:bg-accent/80 group transition-all hover:scale-105"
                >
                  <Plus size={16} className="group-hover:rotate-90 transition-all" />
                  <span className="text-sm ml-1.5 group-hover:block hidden animate-in fade-in duration-300">New</span>
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <ChatHistoryButton onClickAction={() => setCommandDialogOpen(true)} />
              <UserProfile
                user={user}
                subscriptionData={subscriptionData}
                isProUser={isProUser}
                isProStatusLoading={isProStatusLoading}
                isCustomInstructionsEnabled={isCustomInstructionsEnabled}
                setIsCustomInstructionsEnabled={setIsCustomInstructionsEnabled}
              />
            </div>
          </header>
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              onHistoryClick={() => setCommandDialogOpen(true)}
              commandDialogOpen={commandDialogOpen}
              setCommandDialogOpen={setCommandDialogOpen}
            />
          </div>
          <InstallPrompt />
        </SidebarInset>
      </SidebarProvider>
    </Suspense>
  );
};

export default Home;
