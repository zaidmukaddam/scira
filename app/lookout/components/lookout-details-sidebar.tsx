'use client';

import React from 'react';
import { format } from 'date-fns';
import { HugeiconsIcon } from '@hugeicons/react';
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
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { BorderTrail } from '@/components/core/border-trail';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';

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

  // Get currently running lookouts
  const runningLookouts = allLookouts.filter((l) => l.status === 'running');

  // Analytics view state
  const [showAnalytics, setShowAnalytics] = React.useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <HugeiconsIcon
            icon={CheckmarkCircle01Icon}
            size={14}
            color="currentColor"
            strokeWidth={1.5}
            className="text-green-500"
          />
        );
      case 'error':
        return (
          <HugeiconsIcon
            icon={Cancel01Icon}
            size={14}
            color="currentColor"
            strokeWidth={1.5}
            className="text-red-500"
          />
        );
      case 'timeout':
        return (
          <HugeiconsIcon
            icon={AlertCircleIcon}
            size={14}
            color="currentColor"
            strokeWidth={1.5}
            className="text-yellow-500"
          />
        );
      default:
        return (
          <HugeiconsIcon
            icon={Activity01Icon}
            size={14}
            color="currentColor"
            strokeWidth={1.5}
            className="text-gray-500"
          />
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs"
          >
            Active
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="secondary" className="text-xs">
            Paused
          </Badge>
        );
      case 'running':
        return (
          <Badge
            variant="default"
            className="gap-1 bg-primary/10 text-primary border-primary/20 relative overflow-hidden text-xs"
          >
            <BorderTrail
              className="bg-primary/60"
              size={20}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
            />
            <HugeiconsIcon icon={PlayIcon} size={10} color="currentColor" strokeWidth={1.5} />
            Running
          </Badge>
        );
      case 'archived':
        return (
          <Badge variant="outline" className="text-xs">
            Archived
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        );
    }
  };

  return (
    <Sidebar side="right" className="!w-full h-full border-none shadow-none !max-w-xl rounded-2xl">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HugeiconsIcon icon={Activity01Icon} size={16} color="currentColor" strokeWidth={1.5} />
            <span className="font-medium text-sm">Lookout Details</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-7 w-7 p-0">
            <HugeiconsIcon icon={Cancel01Icon} size={14} color="currentColor" strokeWidth={1.5} />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-4 space-y-6">
        {showAnalytics ? (
          /* Analytics View */
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Performance Metrics</h3>
              <div className="p-3 border rounded-md bg-muted/30 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Success Rate</span>
                  <span className="text-sm font-medium">{successRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Average Duration</span>
                  <span className="text-sm font-medium">
                    {averageDuration > 0 ? `${(averageDuration / 1000).toFixed(1)}s` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total Runs</span>
                  <span className="text-sm font-medium">{totalRuns}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Failed Runs</span>
                  <span className="text-sm font-medium text-red-600">{failedRuns}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Activity Summary</h3>
              <div className="p-3 border rounded-md bg-muted/30 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">This Week</span>
                  <span className="text-sm font-medium">{lastWeekRuns} runs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Frequency</span>
                  <span className="text-sm font-medium capitalize">{lookout.frequency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Timezone</span>
                  <span className="text-sm font-medium">{lookout.timezone}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className="text-sm font-medium capitalize">{lookout.status}</span>
                </div>
              </div>
            </div>

            {failedRuns > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">Recent Errors</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {runHistory
                    .filter((run) => run.status === 'error')
                    .slice(-3)
                    .map((run, index) => (
                      <div
                        key={index}
                        className="p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200 dark:border-red-800"
                      >
                        <div className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                          {format(new Date(run.runAt), 'MMM d, h:mm a')}
                        </div>
                        <div className="text-xs text-red-600 dark:text-red-300 leading-tight">
                          {run.error || 'Unknown error'}
                        </div>
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
              <>
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    Currently Running ({runningLookouts.length})
                  </h3>
                  <div className="space-y-2">
                    {runningLookouts.map((runningLookout) => (
                      <div
                        key={runningLookout.id}
                        className={`p-3 border rounded-md cursor-pointer transition-colors hover:bg-muted/50 ${
                          runningLookout.id === lookout.id ? 'bg-muted border-primary/30' : ''
                        }`}
                        onClick={() => onLookoutChange?.(runningLookout)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="relative p-1 rounded border border-primary/20 overflow-hidden">
                            <BorderTrail
                              className="bg-primary/60"
                              size={14}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'linear',
                              }}
                            />
                            <HugeiconsIcon
                              icon={PlayIcon}
                              size={10}
                              color="currentColor"
                              strokeWidth={1.5}
                              className="text-primary"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{runningLookout.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {runningLookout.frequency} • {runningLookout.timezone}
                            </p>
                          </div>
                          {runningLookout.id === lookout.id && (
                            <Badge variant="outline" className="text-xs">
                              Current
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Basic Info */}
            <div>
              <div className="mb-4">
                <h2 className="text-base font-semibold text-foreground mb-2">{lookout.title}</h2>
                <div className="flex items-center gap-2">
                  {getStatusBadge(lookout.status)}
                  <Badge variant="outline" className="text-xs">
                    {lookout.frequency}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground mb-4">
                <p>Created {format(new Date(lookout.createdAt), 'MMM d, yyyy')}</p>
                {lookout.nextRunAt && lookout.status === 'active' && (
                  <p>Next run {format(new Date(lookout.nextRunAt), 'MMM d, h:mm a')}</p>
                )}
              </div>

              <div className="p-3 bg-muted/50 rounded-md border gap-2">
                <p className="text-xs leading-relaxed">{lookout.prompt}</p>
                <p className="text-xs leading-relaxed border-t mt-2 pt-2">Grok 4・Extreme Research</p>
              </div>
            </div>

            {/* Statistics */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Statistics</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-md bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-1">Total Runs</div>
                  <div className="text-lg font-semibold">{totalRuns}</div>
                </div>

                <div className="p-3 border rounded-md bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
                  <div className="text-lg font-semibold">{successRate.toFixed(1)}%</div>
                  <Progress value={successRate} className="mt-2 h-1" />
                </div>

                <div className="p-3 border rounded-md bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-1">This Week</div>
                  <div className="text-lg font-semibold">{lastWeekRuns}</div>
                </div>

                <div className="p-3 border rounded-md bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-1">Avg Duration</div>
                  <div className="text-lg font-semibold">
                    {averageDuration > 0 ? `${(averageDuration / 1000).toFixed(1)}s` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Runs */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Recent Runs ({runHistory.length})</h3>
              <div className="space-y-2">
                {runHistory
                  .slice(-10)
                  .reverse()
                  .map((run, index) => (
                    <div
                      key={`${run.chatId}-${index}`}
                      className="p-3 border rounded-md hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1">
                          {getStatusIcon(run.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(run.runAt), 'MMM d, h:mm a')}
                              </span>
                              {run.duration && (
                                <Badge variant="outline" className="text-xs h-4">
                                  {(run.duration / 1000).toFixed(1)}s
                                </Badge>
                              )}
                            </div>
                            {run.error && <p className="text-xs text-red-600 mb-1 leading-tight">{run.error}</p>}
                            {typeof run.searchesPerformed === 'number' && (
                              <p className="text-xs text-muted-foreground">{run.searchesPerformed} searches</p>
                            )}
                          </div>
                        </div>
                        {run.status === 'success' && (
                          <Link href={`/search/${run.chatId}`}>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <HugeiconsIcon icon={ArrowUpRightIcon} size={12} color="currentColor" strokeWidth={1.5} />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}

                {runHistory.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="p-3 rounded-full bg-muted/50 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <HugeiconsIcon
                        icon={Activity01Icon}
                        size={16}
                        color="currentColor"
                        strokeWidth={1.5}
                        className="opacity-50"
                      />
                    </div>
                    <p className="text-xs">No runs yet</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t px-4 py-3">
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={() => onEditLookout?.(lookout)}
                disabled={lookout.status === 'running'}
              >
                <HugeiconsIcon
                  icon={Settings01Icon}
                  size={14}
                  color="currentColor"
                  strokeWidth={1.5}
                  className="mr-1"
                />
                Edit
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{lookout.status === 'running' ? 'Cannot edit while running' : 'Edit lookout settings'}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={() => onTest?.(lookout.id)}
                disabled={lookout.status === 'running' || lookout.status === 'archived'}
              >
                <HugeiconsIcon icon={TestTubeIcon} size={14} color="currentColor" strokeWidth={1.5} className="mr-1" />
                Test
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {lookout.status === 'running'
                  ? 'Cannot test while running'
                  : lookout.status === 'archived'
                    ? 'Cannot test archived lookout'
                    : 'Run test now'}
              </p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showAnalytics ? 'default' : 'outline'}
                size="sm"
                className="flex-1 text-xs h-8"
                onClick={() => setShowAnalytics(!showAnalytics)}
              >
                <HugeiconsIcon icon={Chart01Icon} size={14} color="currentColor" strokeWidth={1.5} className="mr-1" />
                {showAnalytics ? 'Overview' : 'Analytics'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{showAnalytics ? 'Show overview' : 'Show analytics'}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
