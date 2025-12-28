'use client';

import React from 'react';
import Link from 'next/link';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import { BinocularsIcon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BorderTrail } from '@/components/core/border-trail';
import { StatusBadge } from './status-badge';
import { ActionButtons } from './action-buttons';
import { formatNextRun } from '../utils/time-utils';

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

interface LookoutCardProps {
  lookout: Lookout;
  isMutating?: boolean;
  onStatusChange: (id: string, status: 'active' | 'paused' | 'archived' | 'running') => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onOpenDetails: (lookout: Lookout) => void;
  showActions?: boolean;
}

export function LookoutCard({
  lookout,
  isMutating = false,
  onStatusChange,
  onDelete,
  onTest,
  onOpenDetails,
  showActions = true,
}: LookoutCardProps) {
  const handleCardClick = () => {
    onOpenDetails(lookout);
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      className={`shadow-none border border-primary/50 cursor-pointer relative overflow-hidden hover:border-primary/40 ${
        lookout.status === 'running' ? 'border-primary/30' : ''
      } ${lookout.status === 'archived' ? 'opacity-75' : ''}`}
      onClick={handleCardClick}
    >
      {/* Border trail for running lookouts */}
      {lookout.status === 'running' && (
        <BorderTrail
          className="bg-primary/60"
          size={40}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-medium hover:text-primary transition-colors">
              {lookout.title}
            </CardTitle>
            <CardDescription className="text-sm">
              <StatusBadge status={lookout.status} />
            </CardDescription>
          </div>

          {showActions && (
            <div onClick={handleActionClick}>
              <ActionButtons
                lookoutId={lookout.id}
                status={lookout.status}
                isMutating={isMutating}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
                onTest={onTest}
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-1">
          {/* Next run information */}
          {lookout.nextRunAt && lookout.status === 'active' && (
            <p className="text-xs text-muted-foreground">
              Next Run: {formatNextRun(lookout.nextRunAt, lookout.timezone)}
            </p>
          )}

          {/* Last run information */}
          {lookout.lastRunAt && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Last Run: {formatNextRun(lookout.lastRunAt, lookout.timezone)}
              </p>
              {lookout.lastRunChatId && (
                <Link
                  href={`/search/${lookout.lastRunChatId}`}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <HugeiconsIcon icon={BinocularsIcon} size={12} color="currentColor" strokeWidth={1.5} />
                  View Results
                </Link>
              )}
            </div>
          )}

          {/* Completed state for once frequency */}
          {!lookout.lastRunAt && lookout.frequency === 'once' && lookout.status === 'paused' && (
            <p className="text-xs text-muted-foreground">Completed</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
