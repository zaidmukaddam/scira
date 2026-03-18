'use client';

import { Badge } from '@/components/ui/badge';

export type LookoutRunStatus = 'success' | 'error' | 'timeout';

interface RunStatusBadgeProps {
  status: LookoutRunStatus;
  size?: 'sm' | 'md';
}

export function RunStatusBadge({ status, size = 'sm' }: RunStatusBadgeProps) {
  const badgeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  if (status === 'success') {
    return (
      <Badge
        variant="outline"
        className={`${badgeClasses} bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-900`}
      >
        Success
      </Badge>
    );
  }

  if (status === 'timeout') {
    return (
      <Badge
        variant="outline"
        className={`${badgeClasses} bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 dark:border-yellow-900`}
      >
        Timed out
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`${badgeClasses} bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900`}
    >
      Failed
    </Badge>
  );
}

