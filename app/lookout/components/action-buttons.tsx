'use client';

import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PauseIcon, PlayIcon, Archive01Icon, Delete02Icon, TestTubeIcon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { BorderTrail } from '@/components/core/border-trail';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ActionButtonsProps {
  lookoutId: string;
  status: 'active' | 'paused' | 'running' | 'archived';
  isMutating?: boolean;
  onStatusChange: (id: string, status: 'active' | 'paused' | 'archived' | 'running') => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
}

export function ActionButtons({
  lookoutId,
  status,
  isMutating = false,
  onStatusChange,
  onDelete,
  onTest,
}: ActionButtonsProps) {
  const handleStatusChange = (newStatus: 'active' | 'paused' | 'archived' | 'running') => {
    onStatusChange(lookoutId, newStatus);
  };

  const handleDelete = () => {
    onDelete(lookoutId);
  };

  const handleTest = () => {
    onTest(lookoutId);
  };

  // Don't show actions for archived lookouts in main view - they only get delete
  if (status === 'archived') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDelete} disabled={isMutating}>
            <HugeiconsIcon icon={Delete02Icon} size={16} color="currentColor" strokeWidth={1.5} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Delete lookout</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {/* Primary action button - pause/resume/running indicator */}
      {status === 'active' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleStatusChange('paused')}
              disabled={isMutating}
            >
              <HugeiconsIcon icon={PauseIcon} size={16} color="currentColor" strokeWidth={1.5} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Pause lookout</p>
          </TooltipContent>
        </Tooltip>
      )}

      {status === 'paused' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleStatusChange('active')}
              disabled={isMutating}
            >
              <HugeiconsIcon icon={PlayIcon} size={16} color="currentColor" strokeWidth={1.5} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Resume lookout</p>
          </TooltipContent>
        </Tooltip>
      )}

      {status === 'running' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative overflow-hidden" disabled={true}>
              <BorderTrail
                className="bg-primary/60"
                size={24}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              <HugeiconsIcon
                icon={PlayIcon}
                size={16}
                color="currentColor"
                strokeWidth={1.5}
                className="text-primary"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Lookout is currently running</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Test button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleTest}
            disabled={isMutating || status === 'running'}
          >
            <HugeiconsIcon icon={TestTubeIcon} size={16} color="currentColor" strokeWidth={1.5} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{status === 'running' ? 'Cannot test while running' : 'Test lookout now'}</p>
        </TooltipContent>
      </Tooltip>

      {/* Archive button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleStatusChange('archived')}
            disabled={isMutating || status === 'running'}
          >
            <HugeiconsIcon icon={Archive01Icon} size={16} color="currentColor" strokeWidth={1.5} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{status === 'running' ? 'Cannot archive while running' : 'Archive lookout'}</p>
        </TooltipContent>
      </Tooltip>

      {/* Delete button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDelete}
            disabled={isMutating || status === 'running'}
          >
            <HugeiconsIcon icon={Delete02Icon} size={16} color="currentColor" strokeWidth={1.5} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{status === 'running' ? 'Cannot delete while running' : 'Delete lookout'}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
