'use client';

import React from 'react';
import Link from 'next/link';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import { BinocularsIcon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BorderTrail } from '@/components/core/border-trail';
import { StatusBadge } from './status-badge';
import { RunStatusBadge, type LookoutRunStatus } from './run-status-badge';
import { ActionButtons } from './action-buttons';
import { formatNextRun } from '../utils/time-utils';

interface LookoutRun {
  runAt: string;
  chatId: string;
  status: LookoutRunStatus;
  error?: string;
  duration?: number;
  tokensUsed?: number;
  searchesPerformed?: number;
}

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
  runHistory?: LookoutRun[];
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
  const lastRunStatus = React.useMemo(() => {
    const history = lookout.runHistory ?? [];
    if (!history.length) return null;
    return history[history.length - 1]?.status ?? null;
  }, [lookout.runHistory]);

  const handleCardClick = () => {
    onOpenDetails(lookout);
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      className={`shadow-none cursor-pointer relative overflow-hidden group transition-all duration-200 border border-border/60 hover:border-primary/30 h-full flex flex-col rounded-xl ${
        lookout.status === 'running' ? 'border-primary/40' : ''
      } ${lookout.status === 'archived' ? 'opacity-60' : ''}`}
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

      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
          {lookout.title}
        </CardTitle>
        {showActions && (
          <div onClick={handleActionClick} className="mt-2">
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
      </CardHeader>

      <CardContent className="pt-0 flex-1 flex flex-col">
        {/* Prompt preview */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {lookout.prompt.slice(0, 100)}{lookout.prompt.length > 100 ? '...' : ''}
        </p>

        {/* Status and run info footer */}
        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusBadge status={lookout.status} />
            {lastRunStatus && lookout.lastRunAt && <RunStatusBadge status={lastRunStatus} />}
          </div>

          <div className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider space-y-0.5">
            {/* Next run information */}
            {lookout.nextRunAt && lookout.status === 'active' && (
              <p>Next: {formatNextRun(lookout.nextRunAt, lookout.timezone)}</p>
            )}

            {/* Last run information */}
            {lookout.lastRunAt && (
              <div className="flex items-center justify-between gap-2">
                <p>Last: {formatNextRun(lookout.lastRunAt, lookout.timezone)}</p>
                {lookout.lastRunChatId && (
                  <Link
                    href={`/search/${lookout.lastRunChatId}`}
                    className="inline-flex items-center gap-0.5 text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                    <HugeiconsIcon icon={ArrowRight01Icon} size={10} color="currentColor" strokeWidth={2} />
                  </Link>
                )}
              </div>
            )}

            {/* Completed state for once frequency */}
            {!lookout.lastRunAt && lookout.frequency === 'once' && lookout.status === 'paused' && (
              <p>Completed</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
