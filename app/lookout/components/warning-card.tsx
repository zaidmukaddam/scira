'use client';

import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Alert02Icon, AlarmClockIcon } from '@hugeicons/core-free-icons';
import { Card, CardContent } from '@/components/ui/card';

interface WarningCardProps {
  type: 'total-limit' | 'daily-limit' | 'custom';
  icon?: any;
  message?: string;
  className?: string;
}

const warningConfig = {
  'total-limit': {
    icon: Alert02Icon,
    message: "You've reached the maximum of 10 lookouts. Delete existing lookouts to create new ones.",
  },
  'daily-limit': {
    icon: AlarmClockIcon,
    message: "You've reached the maximum of 5 active daily lookouts. Pause or delete existing daily lookouts to create new ones.",
  },
  custom: {
    icon: Alert02Icon,
    message: '',
  },
};

export function WarningCard({
  type,
  icon,
  message,
  className = ''
}: WarningCardProps) {
  const config = warningConfig[type];
  const IconComponent = icon || config.icon;
  const displayMessage = message || config.message;

  return (
    <Card className={`mb-6 border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20 shadow-none ${className}`}>
      <CardContent className="flex items-center gap-2 py-3">
        <HugeiconsIcon
          icon={IconComponent}
          size={16}
          color="currentColor"
          strokeWidth={1.5}
          className="text-orange-600 dark:text-orange-400 flex-shrink-0"
        />
        <p className="text-sm text-orange-600 dark:text-orange-400">
          {displayMessage}
        </p>
      </CardContent>
    </Card>
  );
}

// Preset warning components for common scenarios
export function TotalLimitWarning() {
  return <WarningCard type="total-limit" />;
}

export function DailyLimitWarning() {
  return <WarningCard type="daily-limit" />;
}
