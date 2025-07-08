'use client';

import React, { useState, memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession, signOut } from '@/lib/auth-client';
import { redirect } from 'next/navigation';
import { toast } from 'sonner';
import {
  SignOut,
  SignIn,
  UserCircle,
  Bookmark,
  Eye,
  EyeSlash,
  Info,
  FileText,
  Shield,
  GithubLogo,
  Bug,
  Sun,
  Crown,
  Lightning,
  Gear,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { ThemeSwitcher } from './theme-switcher';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { XLogo, InstagramLogoIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { User } from '@/lib/db/schema';
import { T, useGT } from 'gt-next';

const VercelIcon = ({ size = 16 }: { size: number }) => {
  return (
    <svg height={size} strokeLinejoin="round" viewBox="0 0 16 16" width={size} style={{ color: 'currentcolor' }}>
      <path fillRule="evenodd" clipRule="evenodd" d="M8 1L16 15H0L8 1Z" fill="currentColor"></path>
    </svg>
  );
};

// Update the component to use memo
const UserProfile = memo(
  ({
    className,
    user,
    subscriptionData,
    isProUser,
    isProStatusLoading,
  }: {
    className?: string;
    user?: User | null;
    subscriptionData?: any;
    isProUser?: boolean;
    isProStatusLoading?: boolean;
  }) => {
    const [signingOut, setSigningOut] = useState(false);
    const [signingIn, setSigningIn] = useState(false);
    const [showEmail, setShowEmail] = useState(false);
    const { data: session, isPending } = useSession();
    const router = useRouter();
    const t = useGT();

    // Use passed user prop if available, otherwise fall back to session
    const currentUser = user || session?.user;
    const isAuthenticated = !!(user || session);

    // Use passed Pro status instead of calculating it
    const hasActiveSubscription = isProUser;

    if (isPending && !user) {
      return (
        <div className="h-8 w-8 flex items-center justify-center">
          <div className="size-4 rounded-full bg-muted/50 animate-pulse"></div>
        </div>
      );
    }

    // Function to format email for display
    const formatEmail = (email?: string | null) => {
      if (!email) return '';

      // If showing full email, don't truncate it
      if (showEmail) {
        return email;
      }

      // If hiding email, show only first few characters and domain
      const parts = email.split('@');
      if (parts.length === 2) {
        const username = parts[0];
        const domain = parts[1];
        const maskedUsername = username.slice(0, 3) + '•••';
        return `${maskedUsername}@${domain}`;
      }

      // Fallback for unusual email formats
      return email.slice(0, 3) + '•••';
    };

    return (
      <>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                {isAuthenticated ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn('p-0! m-0!', signingOut && 'animate-pulse', className)}
                    asChild
                  >
                    <Avatar className="size-7">
                      <AvatarImage
                        src={currentUser?.image ?? ''}
                        alt={currentUser?.name ?? ''}
                        className="rounded-full"
                      />
                      <AvatarFallback className="rounded-full text-sm">{currentUser?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn('p-0! m-0! hover:bg-transparent!', signingIn && 'animate-pulse', className)}
                  >
                    <UserCircle className="size-6" />
                  </Button>
                )}
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              {isAuthenticated ? t('Account') : t('Sign In')}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent className="w-[240px] z-[110] mr-5">
            {isAuthenticated ? (
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage
                      src={currentUser?.image ?? ''}
                      alt={currentUser?.name ?? ''}
                      className="rounded-full"
                    />
                    <AvatarFallback className="rounded-full">{currentUser?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <p className="font-medium text-sm leading-none truncate">{currentUser?.name}</p>
                    <div className="flex items-center mt-0.5 gap-1">
                      <div
                        className={`text-xs text-muted-foreground ${showEmail ? '' : 'max-w-[160px] truncate'}`}
                        title={currentUser?.email || ''}
                      >
                        {formatEmail(currentUser?.email)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEmail(!showEmail);
                        }}
                        className="size-6 text-muted-foreground hover:text-foreground"
                      >
                        {showEmail ? <EyeSlash size={12} /> : <Eye size={12} />}
                        <span className="sr-only">{showEmail ? t('Hide email') : t('Show email')}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback className="rounded-full">
                      <UserCircle size={18} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <p className="font-medium text-sm leading-none">{t('Guest')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('Sign in to save your progress')}</p>
                  </div>
                </div>
              </div>
            )}
            <DropdownMenuSeparator />

            {/* Subscription Status - show loading or actual status */}
            {isAuthenticated && (
              <>
                {isProStatusLoading ? (
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2.5 text-sm">
                      <div className="size-6 rounded-md bg-muted/50 border border-border flex items-center justify-center">
                        <div className="size-3 rounded-full bg-muted animate-pulse" />
                      </div>
                      <div className="flex flex-col">
                        <div className="w-16 h-3 bg-muted rounded animate-pulse" />
                        <div className="w-20 h-2 bg-muted/50 rounded animate-pulse mt-1" />
                      </div>
                    </div>
                  </div>
                ) : subscriptionData ? (
                  hasActiveSubscription ? (
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2.5 text-sm">
                        <div className="size-6 rounded-md bg-muted/50 border border-border flex items-center justify-center">
                          <Crown size={14} className="text-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground text-sm">{t('Scira Pro')}</span>
                          <span className="text-[10px] text-muted-foreground">{t('Unlimited access to all features')}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <DropdownMenuItem
                      className="cursor-pointer flex items-center gap-2.5 py-1.5"
                      onClick={() => router.push('/pricing')}
                    >
                      <div className="size-6 rounded-md bg-muted/50 border border-border flex items-center justify-center">
                        <Lightning size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{t('Upgrade to Pro')}</span>
                        <span className="text-[10px] text-muted-foreground">{t('Unlimited searches & premium models')}</span>
                      </div>
                    </DropdownMenuItem>
                  )
                ) : null}
                {(subscriptionData || isProStatusLoading) && <DropdownMenuSeparator />}
              </>
            )}

            {isAuthenticated && (
              <>
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <Link href="/settings" className="w-full flex items-center gap-2">
                    <Gear size={16} />
                    <span>{t('Settings')}</span>
                  </Link>
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuItem className="cursor-pointer py-1 hover:bg-transparent!">
              <div className="flex items-center justify-between w-full px-0" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <Sun size={16} />
                  <span className="text-sm">{t('Theme')}</span>
                </div>
                <ThemeSwitcher />
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/* About and Information */}
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link href="/about" className="w-full flex items-center gap-2">
                <Info size={16} />
                <span>{t('About')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link href="/terms" className="w-full flex items-center gap-2">
                <FileText size={16} />
                <span>{t('Terms')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link href="/privacy-policy" className="w-full flex items-center gap-2">
                <Shield size={16} />
                <span>{t('Privacy')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/* Social and External Links */}
            <DropdownMenuItem className="cursor-pointer" asChild>
              <a
                href={'https://git.new/scira'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2"
              >
                <GithubLogo size={16} />
                <span>{t('Github')}</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <a
                href={'https://x.com/sciraai'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2"
              >
                <XLogo size={16} />
                <span>{t('X.com')}</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <a
                href={'https://www.instagram.com/scira.ai'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2"
              >
                <InstagramLogoIcon size={16} />
                <span>{t('Instagram')}</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <a
                href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzaidmukaddam%2Fscira&env=XAI_API_KEY,OPENAI_API_KEY,ANTHROPIC_API_KEY,GROQ_API_KEY,GOOGLE_GENERATIVE_AI_API_KEY,DAYTONA_API_KEY,E2B_API_KEY,DATABASE_URL,BETTER_AUTH_SECRET,GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET,GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,TWITTER_CLIENT_ID,TWITTER_CLIENT_SECRET,REDIS_URL,ELEVENLABS_API_KEY,TAVILY_API_KEY,EXA_API_KEY,TMDB_API_KEY,YT_ENDPOINT,FIRECRAWL_API_KEY,OPENWEATHER_API_KEY,SANDBOX_TEMPLATE_ID,GOOGLE_MAPS_API_KEY,MAPBOX_ACCESS_TOKEN,AVIATION_STACK_API_KEY,CRON_SECRET,BLOB_READ_WRITE_TOKEN,MEM0_API_KEY,MEM0_ORG_ID,MEM0_PROJECT_ID,SMITHERY_API_KEY,NEXT_PUBLIC_MAPBOX_TOKEN,NEXT_PUBLIC_POSTHOG_KEY,NEXT_PUBLIC_POSTHOG_HOST,NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,SCIRA_PUBLIC_API_KEY,NEXT_PUBLIC_SCIRA_PUBLIC_API_KEY&envDescription=API%20keys%20and%20configuration%20required%20for%20Scira%20to%20function"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2"
              >
                <VercelIcon size={14} />
                <span>{t('Deploy with Vercel')}</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" asChild>
              <a
                href={'https://scira.userjot.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2"
              >
                <Bug className="size-4" />
                <span>{t('Feature/Bug Request')}</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/* Auth */}
            {isAuthenticated ? (
              <DropdownMenuItem
                className="cursor-pointer w-full flex items-center justify-between gap-2"
                onClick={() =>
                  signOut({
                    fetchOptions: {
                      onRequest: () => {
                        setSigningOut(true);
                        toast.loading(t('Signing out...'));
                      },
                      onSuccess: () => {
                        setSigningOut(false);
                        localStorage.clear();
                        toast.success(t('Signed out successfully'));
                        toast.dismiss();
                        window.location.href = '/new';
                      },
                      onError: () => {
                        setSigningOut(false);
                        toast.error(t('Failed to sign out'));
                        window.location.reload();
                      },
                    },
                  })
                }
              >
                <span>{t('Sign Out')}</span>
                <SignOut className="size-4" />
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="cursor-pointer w-full flex items-center justify-between gap-2"
                onClick={() => {
                  setSigningIn(true);
                  redirect('/sign-in');
                }}
              >
                <span>{t('Sign In')}</span>
                <SignIn className="size-4" />
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    );
  },
);

// Add a display name for the memoized component for better debugging
UserProfile.displayName = 'UserProfile';

export { UserProfile };
