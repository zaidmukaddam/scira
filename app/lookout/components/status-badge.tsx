'use client';

import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Clock01Icon,
  PauseIcon,
  PlayIcon,
  Archive01Icon,
} from '@hugeicons/core-free-icons';
import { Badge } from '@/components/ui/badge';
import { BorderTrail } from '@/components/core/border-trail';

interface StatusBadgeProps {
  status: 'active' | 'paused' | 'running' | 'archived';
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const iconSize = size === 'sm' ? 12 : 16;
  const badgeClasses = size === 'sm' ? 'gap-1 px-2 py-0.5 text-xs' : 'gap-1.5 px-3 py-1 text-sm';

  const statusConfig = {
    active: {
      variant: 'default' as const,
      icon: Clock01Icon,
      label: 'Scheduled',
      className: badgeClasses,
    },
    paused: {
      variant: 'secondary' as const,
      icon: PauseIcon,
      label: 'Paused',
      className: badgeClasses,
    },
    running: {
      variant: 'outline' as const,
      icon: PlayIcon,
      label: 'Running',
      className: `${badgeClasses} bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 transition-colors relative overflow-hidden`,
    },
    archived: {
      variant: 'outline' as const,
      icon: Archive01Icon,
      label: 'Archived',
      className: badgeClasses,
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={config.className}>
      {status === 'running' && (
        <BorderTrail
          className="bg-primary/60"
          size={20}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}
      <HugeiconsIcon
        icon={config.icon}
        size={iconSize}
        color="currentColor"
        strokeWidth={1.5}
      />
      {config.label}
    </Badge>
  );
}
