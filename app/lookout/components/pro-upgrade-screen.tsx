'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Crown02Icon, AlarmClockIcon, Clock01Icon } from '@hugeicons/core-free-icons';
import { Lightning } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from './navbar';

interface ProUpgradeScreenProps {
  user: any;
  isProUser: boolean;
  isProStatusLoading: boolean;
}

export function ProUpgradeScreen({ user, isProUser, isProStatusLoading }: ProUpgradeScreenProps) {
  const router = useRouter();

  return (
    <>
      <Navbar user={user} isProUser={isProUser} isProStatusLoading={isProStatusLoading} showProBadge={false} />

      {/* Pro upgrade prompt */}
      <div className="pt-20 flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <Card className="max-w-md w-full text-center shadow-none">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
                <HugeiconsIcon
                  icon={Crown02Icon}
                  size={32}
                  color="currentColor"
                  strokeWidth={1.5}
                  className="text-primary-foreground"
                />
              </div>
              <CardTitle className="text-xl">Pro Feature</CardTitle>
              <CardDescription>
                Lookouts are available for Pro users only. Schedule automated searches and get notified when they
                complete.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <HugeiconsIcon
                    icon={AlarmClockIcon}
                    size={16}
                    color="currentColor"
                    strokeWidth={1.5}
                    className="text-primary"
                  />
                  <span>Automated scheduled searches</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <HugeiconsIcon
                    icon={Clock01Icon}
                    size={16}
                    color="currentColor"
                    strokeWidth={1.5}
                    className="text-primary"
                  />
                  <span>Custom frequency and timezone</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Lightning className="h-4 w-4 text-primary" />
                  <span>Up to 10 active lookouts</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => router.push('/new')}>
                  Back to Search
                </Button>
                <Button className="flex-1" onClick={() => router.push('/pricing')}>
                  <HugeiconsIcon icon={Crown02Icon} size={16} color="currentColor" strokeWidth={1.5} className="mr-2" />
                  Upgrade to Pro
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
