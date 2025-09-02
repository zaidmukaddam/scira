'use client';

/* eslint-disable @next/next/no-img-element */
import React, { memo, useMemo } from 'react';
import Link from 'next/link';
import { Plus, GlobeHemisphereWest } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { UserProfile, NavigationMenu } from '@/components/user-profile';
import { ChatHistoryButton } from '@/components/chat-history-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { ShareButton } from '@/components/share';
import { cn } from '@/lib/utils';

import { useRouter, usePathname } from 'next/navigation';
import { ComprehensiveUserData } from '@/lib/user-data-server';

type VisibilityType = 'public' | 'private';

interface NavbarProps {
  isDialogOpen: boolean;
  chatId: string | null;
  selectedVisibilityType: VisibilityType;
  onVisibilityChange: (visibility: VisibilityType) => void | Promise<void>;
  status: string;
  user: ComprehensiveUserData | null;
  onHistoryClick: () => void;
  isOwner?: boolean;
  subscriptionData?: any;
  isProUser?: boolean;
  isProStatusLoading?: boolean;
  isCustomInstructionsEnabled?: boolean;
  setIsCustomInstructionsEnabled?: (value: boolean | ((val: boolean) => boolean)) => void;
}

const Navbar = memo(
  ({
    isDialogOpen,
    chatId,
    selectedVisibilityType,
    onVisibilityChange,
    status,
    user,
    onHistoryClick,
    isOwner = true,
    subscriptionData,
    isProUser,
    isProStatusLoading,
    isCustomInstructionsEnabled,
    setIsCustomInstructionsEnabled,
  }: NavbarProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const isSearchWithId = useMemo(() => Boolean(pathname && /^\/search\/[^/]+/.test(pathname)), [pathname]);

    // Use passed Pro status directly
    const hasActiveSubscription = isProUser;
    const showProLoading = isProStatusLoading;

    return (
      <>
        <div
          className={cn(
            'fixed left-0 right-0 z-30 top-0 flex justify-between items-center p-3 transition-colors duration-200',
            isDialogOpen
              ? 'bg-transparent pointer-events-none'
              : status === 'streaming' || status === 'ready'
                ? 'bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60'
                : 'bg-background',
          )}
        >
          <div className={cn('flex items-center gap-3', isDialogOpen ? 'pointer-events-auto' : '')}>
            <Link href="/new">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-lg bg-accent hover:bg-accent/80 group transition-all hover:scale-105 pointer-events-auto"
              >
                <Plus size={16} className="group-hover:rotate-90 transition-all" />
                <span className="text-sm ml-1.5 group-hover:block hidden animate-in fade-in duration-300">New</span>
              </Button>
            </Link>

            {/* Mobile-only Upgrade (avoids overlap with share on small screens) */}
            {user && !hasActiveSubscription && !showProLoading && (
              <Button
                variant="default"
                size="sm"
                className="rounded-md h-7 px-2 text-xs sm:hidden"
                onClick={() => router.push('/pricing')}
              >
                Upgrade
              </Button>
            )}
          </div>

          {/* Centered Upgrade Button */}
          {user && !hasActiveSubscription && !showProLoading && (
            <div
              className={cn(
                'hidden sm:flex items-center justify-center absolute left-1/2 transform -translate-x-1/2',
                isDialogOpen ? 'pointer-events-auto' : '',
              )}
            >
              <div className="flex items-center bg-muted/50 rounded-lg border border-border">
                <span className="px-2 py-1.5 text-sm font-medium text-muted-foreground">Free Plan</span>
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-md mr-1.5 h-6"
                  onClick={() => router.push('/pricing')}
                >
                  Upgrade
                </Button>
              </div>
            </div>
          )}
          <div className={cn('flex items-center gap-1', isDialogOpen ? 'pointer-events-auto' : '')}>
            {/* Share functionality using unified component */}
            {chatId && (
              <>
                {user && isOwner ? (
                  /* Authenticated chat owners get share functionality */
                  <ShareButton
                    chatId={chatId}
                    selectedVisibilityType={selectedVisibilityType}
                    onVisibilityChange={async (visibility) => {
                      await Promise.resolve(onVisibilityChange(visibility));
                    }}
                    isOwner={isOwner}
                    user={user}
                    variant="navbar"
                    className="mr-1"
                    disabled={false}
                  />
                ) : (
                  /* Non-owners (authenticated or not) just see indicator */
                  selectedVisibilityType === 'public' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="pointer-events-auto bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 opacity-80 cursor-not-allowed"
                          disabled
                        >
                          <GlobeHemisphereWest size={16} className="text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Shared</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={4}>
                        {user ? "This is someone else's shared page" : 'This is a shared page'}
                      </TooltipContent>
                    </Tooltip>
                  )
                )}
              </>
            )}

            {/* Subscription Status - show loading or Pro status only */}
            {user && isSearchWithId && (
              <>
                {showProLoading ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="rounded-md pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 border border-border">
                        <div className="size-4 rounded-full bg-muted animate-pulse" />
                        <div className="w-8 h-3 bg-muted rounded animate-pulse hidden sm:block" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={4}>
                      Loading subscription status...
                    </TooltipContent>
                  </Tooltip>
                ) : hasActiveSubscription ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="pointer-events-auto mr-1">
                        <span className="font-baumans! px-2.5 pt-0.5 pb-1.75 sm:pt-1 leading-4 inline-flex items-center gap-1 rounded-lg shadow-sm border-transparent ring-1 ring-ring/35 ring-offset-1 ring-offset-background bg-gradient-to-br from-secondary/25 via-primary/20 to-accent/25 text-foreground  dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground">
                          <span>pro</span>
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={4}>
                      Pro Subscribed - Unlimited access
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </>
            )}

            {/* Chat History Button */}
            {user && <ChatHistoryButton onClickAction={onHistoryClick} />}
            {/* Navigation Menu - settings icon for general navigation */}
            <NavigationMenu />
            {/* User Profile - focused on authentication and account management */}
            <UserProfile
              user={user}
              subscriptionData={subscriptionData}
              isProUser={isProUser}
              isProStatusLoading={isProStatusLoading}
              isCustomInstructionsEnabled={isCustomInstructionsEnabled}
              setIsCustomInstructionsEnabled={setIsCustomInstructionsEnabled}
            />
          </div>
        </div>
      </>
    );
  },
);

Navbar.displayName = 'Navbar';

export { Navbar };
