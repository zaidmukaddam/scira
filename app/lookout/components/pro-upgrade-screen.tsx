'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import { Crown02Icon, AlarmClockIcon, Clock01Icon } from '@hugeicons/core-free-icons';
import { LightningIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProUpgradeScreenProps {
  user: any;
  isProUser: boolean;
  isProStatusLoading: boolean;
}

export function ProUpgradeScreen({ user, isProUser, isProStatusLoading }: ProUpgradeScreenProps) {
  const router = useRouter();

  return (
    <>
      {/* Pro upgrade prompt */}
      <div className="flex-1 flex flex-col">
        <div className="w-full min-h-svh flex items-center justify-center px-6 py-16">
          <Card className="mx-auto w-full max-w-2xl text-center border border-border/80">
            <CardHeader className="pb-0">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                <HugeiconsIcon icon={Crown02Icon} size={14} color="currentColor" strokeWidth={1.5} />
                <span>Pro feature</span>
              </div>
              <CardTitle className="mt-4 text-3xl tracking-tight">Unlock Lookouts</CardTitle>
              <CardDescription className="mt-2 leading-relaxed">
                Automate searches and get notified when results are ready. Stay ahead with flexible schedules and
                timezone-aware notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
                <div className="rounded-lg border border-border/80 bg-card p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <HugeiconsIcon
                      icon={AlarmClockIcon}
                      size={16}
                      color="currentColor"
                      strokeWidth={1.5}
                      className="text-primary"
                    />
                    <span>Scheduled runs</span>
                  </div>
                </div>
                <div className="rounded-lg border border-border/80 bg-card p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <HugeiconsIcon
                      icon={Clock01Icon}
                      size={16}
                      color="currentColor"
                      strokeWidth={1.5}
                      className="text-primary"
                    />
                    <span>Custom frequency</span>
                  </div>
                </div>
                <div className="rounded-lg border border-border/80 bg-card p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <LightningIcon className="h-4 w-4 text-primary" />
                    <span>10 active lookouts</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" className="sm:flex-1" onClick={() => router.push('/new')}>
                  Back to Search
                </Button>
                <Button className="sm:flex-1" onClick={() => router.push('/pricing')}>
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
