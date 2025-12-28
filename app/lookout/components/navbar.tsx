'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import { ArrowLeft01Icon, Crown02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/components/user-profile';

interface NavbarProps {
  user: any;
  isProUser: boolean;
  isProStatusLoading: boolean;
  showProBadge?: boolean;
}

export function Navbar({ user, isProUser, isProStatusLoading, showProBadge = false }: NavbarProps) {
  return (
    <div className="fixed left-0 right-0 top-0 z-30 flex justify-between items-center p-3 bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-lg bg-accent hover:bg-accent/80 group transition-all hover:scale-105"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} color="currentColor" strokeWidth={1.5} />
            <span className="text-sm ml-1.5 hidden sm:inline">Back to Search</span>
            <span className="text-sm ml-1.5 sm:hidden">Back</span>
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {isProStatusLoading ? (
          <div className="rounded-md flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 border border-border">
            <div className="size-4 rounded-full bg-muted animate-pulse" />
            <div className="w-8 h-3 bg-muted rounded animate-pulse" />
          </div>
        ) : showProBadge && isProUser ? (
          <div className="pointer-events-auto">
            <span className="font-baumans! inline-flex items-center gap-1 rounded-lg shadow-sm border-transparent ring-1 ring-ring/35 ring-offset-1 ring-offset-background bg-gradient-to-br from-secondary/25 via-primary/20 to-accent/25 text-foreground px-2.5 pt-0.5 pb-2 sm:pt-1 leading-3 dark:bg-gradient-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground">
              <span>pro</span>
            </span>
          </div>
        ) : null}

        <UserProfile
          user={user || null}
          subscriptionData={
            user?.polarSubscription
              ? {
                  hasSubscription: true,
                  subscription: user.polarSubscription,
                }
              : { hasSubscription: false }
          }
          isProUser={isProUser}
          isProStatusLoading={isProStatusLoading}
        />
      </div>
    </div>
  );
}
