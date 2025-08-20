'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useState, memo, useMemo } from 'react';
import Link from 'next/link';
import { Plus, GlobeHemisphereWest, Lock, Copy, Check, Share } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { UserProfile, NavigationMenu } from '@/components/user-profile';
import { ChatHistoryButton } from '@/components/chat-history-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { LinkedinLogo, RedditLogo, XLogo } from '@phosphor-icons/react';
import { ClassicLoader } from '@/components/ui/loading';
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
    const [copied, setCopied] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [privateDropdownOpen, setPrivateDropdownOpen] = useState(false);
    const [isChangingVisibility, setIsChangingVisibility] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const isSearchWithId = useMemo(() => Boolean(pathname && /^\/search\/[^/]+/.test(pathname)), [pathname]);

    // Use passed Pro status directly
    const hasActiveSubscription = isProUser;
    const showProLoading = isProStatusLoading;

    const handleCopyLink = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!chatId) return;

      const url = `https://scira.ai/search/${chatId}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard');

      setTimeout(() => setCopied(false), 2000);
    };

    // Generate the share URL
    const shareUrl = chatId ? `https://scira.ai/search/${chatId}` : '';

    // Social media share handlers
    const handleShareLinkedIn = (e: React.MouseEvent) => {
      e.preventDefault();
      const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
      window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
    };

    const handleShareTwitter = (e: React.MouseEvent) => {
      e.preventDefault();
      const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
      window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    };

    const handleShareReddit = (e: React.MouseEvent) => {
      e.preventDefault();
      const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}`;
      window.open(redditUrl, '_blank', 'noopener,noreferrer');
    };

    const handleVisibilityChange = async (newVisibility: VisibilityType) => {
      setIsChangingVisibility(true);
      try {
        await onVisibilityChange(newVisibility);
        // If changing from private to public, open the public dropdown immediately
        if (newVisibility === 'public') {
          setDropdownOpen(true);
        }
      } finally {
        setIsChangingVisibility(false);
        setPrivateDropdownOpen(false);
      }
    };

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
            {/* Visibility indicator or toggle based on authentication and ownership */}
            {chatId && (
              <>
                {user && isOwner ? (
                  /* Authenticated chat owners get toggle and share option */
                  <>
                    {selectedVisibilityType === 'public' ? (
                      /* Public chat - show dropdown for copying link */
                      <DropdownMenu
                        open={dropdownOpen}
                        onOpenChange={!isChangingVisibility ? setDropdownOpen : undefined}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="pointer-events-auto bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            disabled={isChangingVisibility}
                          >
                            {isChangingVisibility ? (
                              <>
                                <ClassicLoader size="sm" className="text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Saving...</span>
                              </>
                            ) : (
                              <>
                                <GlobeHemisphereWest size={16} className="text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Shared</span>
                                <Copy size={14} className="ml-1 text-blue-600 dark:text-blue-400 opacity-70" />
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 sm:w-72 p-3 ml-2 sm:m-auto">
                          <div className="space-y-3">
                            <header className="flex justify-between items-center">
                              <h4 className="text-sm font-medium">Share Link</h4>
                              <div className="flex gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleVisibilityChange('private')}
                                  disabled={isChangingVisibility}
                                >
                                  <Lock size={12} className="mr-1" />
                                  Make Private
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() => setDropdownOpen(false)}
                                  disabled={isChangingVisibility}
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M18 6 6 18" />
                                    <path d="m6 6 12 12" />
                                  </svg>
                                </Button>
                              </div>
                            </header>

                            <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2 border border-border">
                              <div className="truncate flex-1 text-xs text-muted-foreground font-mono">{shareUrl}</div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                onClick={handleCopyLink}
                                title="Copy to clipboard"
                              >
                                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                              </Button>
                            </div>

                            <footer className="flex flex-col space-y-2">
                              <div className="flex justify-center items-center">
                                <p className="text-xs text-muted-foreground">
                                  Anyone with this link can view this page
                                </p>
                              </div>

                              <div className="flex justify-center gap-2 pt-1">
                                {typeof navigator !== 'undefined' && 'share' in navigator && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="size-8"
                                    onClick={() => {
                                      navigator
                                        .share({
                                          title: 'Shared Page',
                                          url: shareUrl,
                                        })
                                        .catch(console.error);
                                    }}
                                  >
                                    <Share size={16} />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="size-8"
                                  onClick={handleShareLinkedIn}
                                  title="Share on LinkedIn"
                                >
                                  <LinkedinLogo size={16} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="size-8"
                                  onClick={handleShareTwitter}
                                  title="Share on X (Twitter)"
                                >
                                  <XLogo size={16} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="size-8"
                                  onClick={handleShareReddit}
                                  title="Share on Reddit"
                                >
                                  <RedditLogo size={16} />
                                </Button>
                              </div>
                            </footer>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      /* Private chat - dropdown prompt to make public */
                      <DropdownMenu
                        open={privateDropdownOpen}
                        onOpenChange={!isChangingVisibility ? setPrivateDropdownOpen : undefined}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="!p-1 !m-0 h-7 gap-1 rounded-sm pointer-events-auto bg-muted/50 border border-border hover:bg-muted/70 transition-colors"
                            disabled={isChangingVisibility}
                          >
                            {isChangingVisibility ? (
                              <>
                                <ClassicLoader size="sm" className="text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">Saving...</span>
                              </>
                            ) : (
                              <>
                                <Share size={14} className="text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">Share</span>
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64 sm:w-72 p-3 ml-2 sm:m-auto">
                          <div className="space-y-3">
                            <header className="flex justify-between items-center">
                              <h4 className="text-sm font-medium">Share</h4>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => setPrivateDropdownOpen(false)}
                                disabled={isChangingVisibility}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M18 6 6 18" />
                                  <path d="m6 6 12 12" />
                                </svg>
                              </Button>
                            </header>

                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">
                                Share this page to make it accessible to anyone with the link.
                              </p>
                            </div>

                            <footer className="flex justify-end gap-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => setPrivateDropdownOpen(false)}
                                disabled={isChangingVisibility}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="text-xs"
                                onClick={() => handleVisibilityChange('public')}
                                disabled={isChangingVisibility}
                              >
                                <Share size={12} className="mr-1" />
                                Share
                              </Button>
                            </footer>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </>
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
