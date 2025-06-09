"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, memo, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Globe, GlobeHemisphereWest, Lock, Copy, Check, Crown, Lightning, Eye, DotsThree } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/components/user-profile';
import { ChatHistoryButton } from '@/components/chat-history-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { User } from '@/lib/db/schema';
import { LinkedinLogo, RedditLogo, Share, XLogo } from '@phosphor-icons/react';
import { ClassicLoader } from '@/components/ui/loading';
import { useRouter } from 'next/navigation';


type VisibilityType = 'public' | 'private';

interface NavbarProps {
    isDialogOpen: boolean;
    chatId: string | null;
    selectedVisibilityType: VisibilityType;
    onVisibilityChange: (visibility: VisibilityType) => void | Promise<void>;
    status: string;
    user: User | null;
    onHistoryClick: () => void;
    isOwner?: boolean;
    subscriptionData?: any;
    subscriptionLoading?: boolean;
}

const Navbar = memo(({
    isDialogOpen,
    chatId,
    selectedVisibilityType,
    onVisibilityChange,
    status,
    user,
    onHistoryClick,
    isOwner = true,
    subscriptionData,
    subscriptionLoading
}: NavbarProps) => {
    const [copied, setCopied] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [privateDropdownOpen, setPrivateDropdownOpen] = useState(false);
    const [isChangingVisibility, setIsChangingVisibility] = useState(false);
    const router = useRouter();

    // Determine subscription status
    const hasActiveSubscription = subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active';

    const handleCopyLink = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!chatId) return;

        const url = `https://scira.ai/search/${chatId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Link copied to clipboard");

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

    const visibilityContent = useMemo(() => {
        const isPrivate = selectedVisibilityType === 'private';
        return {
            icon: isPrivate ? <Lock className="h-3 w-3" /> : <Eye className="h-3 w-3" />,
            label: isPrivate ? 'Private' : 'Public',
            tooltip: isPrivate 
                ? 'This chat is private and only visible to you' 
                : 'This chat is publicly accessible via link'
        };
    }, [selectedVisibilityType]);

    return (
        <div className={cn(
            "fixed top-0 left-0 right-0 z-30 flex justify-between items-center p-3 transition-colors duration-200",
            isDialogOpen
                ? "bg-transparent pointer-events-none"
                : (status === "streaming" || status === 'ready'
                    ? "bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60"
                    : "bg-background")
        )}>
            <div className={cn("flex items-center gap-4", isDialogOpen ? "pointer-events-auto" : "")}>
                <Link href="/new">
                    <Button
                        type="button"
                        variant={'secondary'}
                        className="rounded-full bg-accent hover:bg-accent/80 backdrop-blur-xs group transition-all hover:scale-105 pointer-events-auto"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-all m-1.5" />
                        <span className="text-sm ml-2 group-hover:block hidden animate-in fade-in duration-300">
                            New
                        </span>
                    </Button>
                </Link>
            </div>
            <div className={cn('flex items-center space-x-2', isDialogOpen ? "pointer-events-auto" : "")}>
                {/* Visibility indicator or toggle based on authentication and ownership */}
                {chatId && (
                    <>
                        {user && isOwner ? (
                            /* Authenticated chat owners get toggle and share option */
                            <>
                                {selectedVisibilityType === 'public' ? (
                                    /* Public chat - show dropdown for copying link */
                                    <DropdownMenu open={dropdownOpen} onOpenChange={!isChangingVisibility ? setDropdownOpen : undefined}>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="secondary"
                                                className="rounded-md pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/80 border border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors focus:outline-none! focus:ring-0!"
                                                disabled={isChangingVisibility}
                                            >
                                                {isChangingVisibility ? (
                                                    <>
                                                        <ClassicLoader size="sm" className="text-blue-600 dark:text-blue-300" />
                                                        <span className="text-sm font-medium text-blue-700 dark:text-blue-200">Saving...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <GlobeHemisphereWest size={16} className="text-blue-600 dark:text-blue-300" />
                                                        <span className="text-sm font-medium text-blue-700 dark:text-blue-200">Public</span>
                                                        <Copy size={14} className="ml-1.5 text-blue-600 dark:text-blue-300 opacity-80" />
                                                    </>
                                                )}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-70 p-3">
                                            <div className="space-y-3">
                                                <header className="flex justify-between items-center">
                                                    <h4 className="text-sm font-medium">Share Link</h4>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            className="h-7 text-xs focus:outline-none"
                                                            onClick={() => handleVisibilityChange('private')}
                                                            disabled={isChangingVisibility}
                                                        >
                                                            <Lock size={12} className="mr-1" />
                                                            Make Private
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 focus:outline-none"
                                                            onClick={() => setDropdownOpen(false)}
                                                            disabled={isChangingVisibility}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M18 6 6 18" />
                                                                <path d="m6 6 12 12" />
                                                            </svg>
                                                        </Button>
                                                    </div>
                                                </header>

                                                <div className="flex items-center gap-2 bg-muted/50 rounded-md p-2 border border-border">
                                                    <div className="truncate flex-1 text-xs text-muted-foreground font-mono">
                                                        {shareUrl}
                                                    </div>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 focus:outline-none"
                                                        onClick={handleCopyLink}
                                                        title="Copy to clipboard"
                                                    >
                                                        {copied ? (
                                                            <Check size={14} className="text-green-500" />
                                                        ) : (
                                                            <Copy size={14} />
                                                        )}
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
                                                                className="h-8 w-8 focus:outline-none"
                                                                onClick={() => {
                                                                    navigator.share({
                                                                        title: 'Shared Page',
                                                                        url: shareUrl
                                                                    }).catch(console.error);
                                                                }}
                                                            >
                                                                <Share size={18} />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 focus:outline-none"
                                                            onClick={handleShareLinkedIn}
                                                            title="Share on LinkedIn"
                                                        >
                                                            <LinkedinLogo size={18} />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 focus:outline-none"
                                                            onClick={handleShareTwitter}
                                                            title="Share on X (Twitter)"
                                                        >
                                                            <XLogo size={18} />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8 focus:outline-none"
                                                            onClick={handleShareReddit}
                                                            title="Share on Reddit"
                                                        >
                                                            <RedditLogo size={18} />
                                                        </Button>
                                                    </div>
                                                </footer>
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                ) : (
                                    /* Private chat - dropdown prompt to make public */
                                    <DropdownMenu open={privateDropdownOpen} onOpenChange={!isChangingVisibility ? setPrivateDropdownOpen : undefined}>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="secondary"
                                                className="rounded-md pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors focus:outline-none"
                                                disabled={isChangingVisibility}
                                            >
                                                {isChangingVisibility ? (
                                                    <>
                                                        <ClassicLoader size="sm" className="text-neutral-500" />
                                                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Saving...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Lock size={16} className="text-neutral-500" />
                                                        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Private</span>
                                                    </>
                                                )}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-70 p-3">
                                            <div className="space-y-3">
                                                <header className="flex justify-between items-center">
                                                    <h4 className="text-sm font-medium">Make Public</h4>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 focus:outline-none"
                                                        onClick={() => setPrivateDropdownOpen(false)}
                                                        disabled={isChangingVisibility}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M18 6 6 18" />
                                                            <path d="m6 6 12 12" />
                                                        </svg>
                                                    </Button>
                                                </header>

                                                <div className="space-y-2">
                                                    <p className="text-sm text-muted-foreground">
                                                        Making this page public will allow anyone with the link to view it.
                                                    </p>
                                                </div>

                                                <footer className="flex justify-end gap-2 pt-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs focus:outline-none"
                                                        onClick={() => setPrivateDropdownOpen(false)}
                                                        disabled={isChangingVisibility}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="text-xs focus:outline-none"
                                                        onClick={() => handleVisibilityChange('public')}
                                                        disabled={isChangingVisibility}
                                                    >
                                                        <GlobeHemisphereWest size={12} className="mr-1" />
                                                        Make Public
                                                    </Button>
                                                </footer>
                                            </div>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </>
                        ) :
                            /* Non-owners (authenticated or not) just see indicator */
                            selectedVisibilityType === 'public' && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="secondary"
                                            className="rounded-md pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-800 border border-blue-300 dark:border-blue-700 opacity-80 cursor-not-allowed focus:outline-none"
                                            disabled
                                        >
                                            <GlobeHemisphereWest size={16} className="text-blue-600 dark:text-blue-300" />
                                            <span className="text-sm font-medium text-blue-700 dark:text-blue-200">Public</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" sideOffset={4}>
                                        {user ? "This is someone else's public page" : "This is a public page shared with you"}
                                    </TooltipContent>
                                </Tooltip>
                            )
                        }
                    </>
                )}

                {/* Subscription Status - only show if we have subscription data */}
                {user && subscriptionData && (
                    <>
                        {hasActiveSubscription ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="rounded-md pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 border border-border">
                                        <Crown size={16} className="text-foreground" />
                                        <span className="text-sm font-medium text-foreground hidden sm:inline">Pro</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" sideOffset={4}>
                                    Pro Subscribed - Unlimited access
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="rounded-md pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 text-sm border-border hover:bg-muted/50 transition-colors focus:outline-none"
                                        onClick={() => router.push("/pricing")}
                                    >
                                        <Lightning size={16} />
                                        <span className="text-sm font-medium hidden sm:inline">Upgrade</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" sideOffset={4}>
                                    Upgrade to Pro for unlimited searches
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </>
                )}

                {/* Chat History Button */}
                <ChatHistoryButton onClick={onHistoryClick} />

                {/* Memoized UserProfile component */}
                <UserProfile user={user} subscriptionData={subscriptionData} subscriptionLoading={subscriptionLoading} />
            </div>
        </div>
    );
});

Navbar.displayName = 'Navbar';

export { Navbar }; 