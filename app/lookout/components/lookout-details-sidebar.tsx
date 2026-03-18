'use client';

import React from 'react';
import { format } from 'date-fns';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import {
  Activity01Icon,
  CheckmarkCircle01Icon,
  ArrowUpRightIcon,
  Chart01Icon,
  Settings01Icon,
  PlayIcon,
  AlertCircleIcon,
  Cancel01Icon,
  TestTubeIcon,
} from '@hugeicons/core-free-icons';

import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { BorderTrail } from '@/components/core/border-trail';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { LOOKOUT_SEARCH_MODES } from '../constants';

interface LookoutRun {
  runAt: string;
  chatId: string;
  status: 'success' | 'error' | 'timeout';
  error?: string;
  duration?: number;
  tokensUsed?: number;
  searchesPerformed?: number;
}

interface LookoutWithHistory {
  id: string;
  title: string;
  prompt: string;
  frequency: string;
  timezone: string;
  nextRunAt: Date;
  status: 'active' | 'paused' | 'archived' | 'running';
  searchMode?: string;
  lastRunAt?: Date | null;
  lastRunChatId?: string | null;
  runHistory: LookoutRun[];
  createdAt: Date;
  updatedAt: Date;
}

interface LookoutDetailsSidebarProps {
  lookout: LookoutWithHistory;
  allLookouts: LookoutWithHistory[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLookoutChange?: (lookout: LookoutWithHistory) => void;
  onEditLookout?: (lookout: LookoutWithHistory) => void;
  onTest?: (id: string) => void;
}

export function LookoutDetailsSidebar({
  lookout,
  allLookouts,
  isOpen,
  onOpenChange,
  onLookoutChange,
  onEditLookout,
  onTest,
}: LookoutDetailsSidebarProps) {
  const modeConfig = React.useMemo(() => {
    const resolvedMode = lookout.searchMode || 'extreme';
    return LOOKOUT_SEARCH_MODES.find((m) => m.value === resolvedMode) || null;
  }, [lookout.searchMode]);

  const runHistory = lookout.runHistory || [];
  const totalRuns = runHistory.length;
  const successfulRuns = runHistory.filter((run) => run.status === 'success').length;
  const failedRuns = runHistory.filter((run) => run.status === 'error').length;
  const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;

  const averageDuration =
    runHistory.length > 0 ? runHistory.reduce((sum, run) => sum + (run.duration || 0), 0) / runHistory.length : 0;

  const lastWeekRuns = runHistory.filter(
    (run) => new Date(run.runAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  ).length;

  const runningLookouts = allLookouts.filter((l) => l.status === 'running');

  const [showAnalytics, setShowAnalytics] = React.useState(false);

  const getStatusIcon = (status: string) => {
    const iconMap: Record<string, { icon: typeof CheckmarkCircle01Icon; className: string }> = {
      success: { icon: CheckmarkCircle01Icon, className: 'text-green-500' },
      error: { icon: Cancel01Icon, className: 'text-red-500' },
      timeout: { icon: AlertCircleIcon, className: 'text-yellow-500' },
    };
    const config = iconMap[status] || { icon: Activity01Icon, className: 'text-muted-foreground' };
    return <HugeiconsIcon icon={config.icon} size={14} color="currentColor" strokeWidth={1.5} className={config.className} />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="font-pixel text-[9px] text-green-600 dark:text-green-400 uppercase tracking-wider">Active</span>;
      case 'paused':
        return <span className="font-pixel text-[9px] text-muted-foreground uppercase tracking-wider">Paused</span>;
      case 'running':
        return (
          <Badge variant="default" className="gap-1 bg-primary/10 text-primary border-primary/20 relative overflow-hidden text-xs">
            <BorderTrail className="bg-primary/60" size={20} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
            <HugeiconsIcon icon={PlayIcon} size={10} color="currentColor" strokeWidth={1.5} />
            Running
          </Badge>
        );
      case 'archived':
        return <span className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider">Archived</span>;
      default:
        return <span className="font-pixel text-[9px] text-muted-foreground uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-4 space-y-5 flex-1 overflow-y-auto">
        {showAnalytics ? (
          /* Analytics View */
          <div className="space-y-4">
            <div>
              <p className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-3">Performance</p>
              <div className="rounded-xl border border-border/60 divide-y divide-border/40">
                {[
                  { label: 'Success Rate', value: `${successRate.toFixed(1)}%` },
                  { label: 'Avg Duration', value: averageDuration > 0 ? `${(averageDuration / 1000).toFixed(1)}s` : 'N/A' },
                  { label: 'Total Runs', value: `${totalRuns}` },
                  { label: 'Failed', value: `${failedRuns}`, className: failedRuns > 0 ? 'text-red-500' : '' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className={`text-sm font-medium tabular-nums ${item.className || ''}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-3">Activity</p>
              <div className="rounded-xl border border-border/60 divide-y divide-border/40">
                {[
                  { label: 'This Week', value: `${lastWeekRuns} runs` },
                  { label: 'Frequency', value: lookout.frequency },
                  { label: 'Timezone', value: lookout.timezone },
                  { label: 'Status', value: lookout.status },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-medium capitalize">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {failedRuns > 0 && (
              <div>
                <p className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-3">Recent Errors</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {runHistory
                    .filter((run) => run.status === 'error')
                    .slice(-3)
                    .map((run, index) => (
                      <div key={index} className="rounded-lg border border-red-200/60 dark:border-red-800/40 bg-red-50/30 dark:bg-red-950/20 p-3">
                        <p className="text-[11px] font-medium text-red-700 dark:text-red-400 mb-1">
                          {format(new Date(run.runAt), 'MMM d, h:mm a')}
                        </p>
                        <p className="text-xs text-red-600/80 dark:text-red-300/80 leading-tight">
                          {run.error || 'Unknown error'}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Normal View */
          <>
            {/* Currently Running Lookouts */}
            {runningLookouts.length > 0 && (
              <div>
                <p className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-3">
                  Running ({runningLookouts.length})
                </p>
                <div className="space-y-1.5">
                  {runningLookouts.map((runningLookout) => (
                    <button
                      key={runningLookout.id}
                      type="button"
                      className={`w-full text-left p-3 rounded-xl border transition-colors hover:bg-accent/30 ${
                        runningLookout.id === lookout.id ? 'bg-accent/40 border-primary/30' : 'border-border/60'
                      }`}
                      onClick={() => onLookoutChange?.(runningLookout)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative p-1 rounded-lg border border-primary/20 overflow-hidden">
                          <BorderTrail className="bg-primary/60" size={14} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
                          <HugeiconsIcon icon={PlayIcon} size={10} color="currentColor" strokeWidth={1.5} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{runningLookout.title}</p>
                          <p className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider">
                            {runningLookout.frequency} · {runningLookout.timezone}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Basic Info */}
            <div>
              <h2 className="text-base font-semibold tracking-tight mb-2">{lookout.title}</h2>
              <div className="flex items-center gap-2 mb-3">
                {getStatusBadge(lookout.status)}
                <span className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider">{lookout.frequency}</span>
              </div>

              <div className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider space-y-1 mb-4">
                <p>Created {format(new Date(lookout.createdAt), 'MMM d, yyyy')}</p>
                {lookout.nextRunAt && lookout.status === 'active' && (
                  <p>Next {format(new Date(lookout.nextRunAt), 'MMM d, h:mm a')}</p>
                )}
              </div>

              <div className="rounded-xl border border-border/60 p-3.5">
                <p className="text-xs leading-relaxed">{lookout.prompt}</p>
                {modeConfig && (
                  <div className="border-t border-border/40 mt-3 pt-3">
                    <div className="flex items-center gap-2">
                      <HugeiconsIcon icon={modeConfig.icon} size={12} color="currentColor" strokeWidth={1.5} className="text-muted-foreground" />
                      <span className="text-xs font-medium">{modeConfig.label}</span>
                      <span className="text-xs text-muted-foreground">· {modeConfig.description}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Statistics */}
            <div>
              <p className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-3">Stats</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border/60 p-3">
                  <p className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider mb-1">Runs</p>
                  <p className="text-lg font-semibold tabular-nums">{totalRuns}</p>
                </div>
                <div className="rounded-xl border border-border/60 p-3">
                  <p className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider mb-1">Success</p>
                  <p className="text-lg font-semibold tabular-nums">{successRate.toFixed(0)}%</p>
                  <Progress value={successRate} className="mt-1.5 h-1" />
                </div>
                <div className="rounded-xl border border-border/60 p-3">
                  <p className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider mb-1">This Week</p>
                  <p className="text-lg font-semibold tabular-nums">{lastWeekRuns}</p>
                </div>
                <div className="rounded-xl border border-border/60 p-3">
                  <p className="font-pixel text-[9px] text-muted-foreground/50 uppercase tracking-wider mb-1">Avg Time</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {averageDuration > 0 ? `${(averageDuration / 1000).toFixed(1)}s` : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Runs */}
            <div>
              <p className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider mb-3">
                Runs ({runHistory.length})
              </p>
              <div className="rounded-xl border border-border/60 divide-y divide-border/30 overflow-hidden">
                {runHistory.length > 0 ? (
                  runHistory
                    .slice(-10)
                    .reverse()
                    .map((run, index) => (
                      <div key={`${run.chatId}-${index}`} className="px-3.5 py-2.5 hover:bg-accent/20 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2 flex-1">
                            {getStatusIcon(run.status)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(run.runAt), 'MMM d, h:mm a')}
                                </span>
                                {run.duration && (
                                  <span className="font-pixel text-[8px] text-muted-foreground/40 uppercase tracking-wider">
                                    {(run.duration / 1000).toFixed(1)}s
                                  </span>
                                )}
                              </div>
                              {run.error && <p className="text-xs text-red-600 leading-tight">{run.error}</p>}
                              {typeof run.searchesPerformed === 'number' && (
                                <p className="text-[11px] text-muted-foreground/60">{run.searchesPerformed} searches</p>
                              )}
                            </div>
                          </div>
                          {run.status === 'success' && (
                            <Link href={`/search/${run.chatId}`}>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-md">
                                <HugeiconsIcon icon={ArrowUpRightIcon} size={12} color="currentColor" strokeWidth={1.5} />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 mx-auto mb-3 flex items-center justify-center">
                      <HugeiconsIcon icon={Activity01Icon} size={16} color="currentColor" strokeWidth={1.5} className="text-muted-foreground" />
                    </div>
                    <p className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider">No runs yet</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/40 px-4 py-3 shrink-0">
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8 rounded-lg"
                onClick={() => onEditLookout?.(lookout)}
                disabled={lookout.status === 'running'}
              >
                <HugeiconsIcon icon={Settings01Icon} size={14} color="currentColor" strokeWidth={1.5} className="mr-1" />
                Edit
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{lookout.status === 'running' ? 'Cannot edit while running' : 'Edit lookout settings'}</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8 rounded-lg"
                onClick={() => onTest?.(lookout.id)}
                disabled={lookout.status === 'running' || lookout.status === 'archived'}
              >
                <HugeiconsIcon icon={TestTubeIcon} size={14} color="currentColor" strokeWidth={1.5} className="mr-1" />
                Test
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{lookout.status === 'running' ? 'Cannot test while running' : lookout.status === 'archived' ? 'Cannot test archived' : 'Run test now'}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showAnalytics ? 'default' : 'outline'}
                size="sm"
                className="flex-1 text-xs h-8 rounded-lg"
                onClick={() => setShowAnalytics(!showAnalytics)}
              >
                <HugeiconsIcon icon={Chart01Icon} size={14} color="currentColor" strokeWidth={1.5} className="mr-1" />
                {showAnalytics ? 'Overview' : 'Analytics'}
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>{showAnalytics ? 'Show overview' : 'Show analytics'}</p></TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
