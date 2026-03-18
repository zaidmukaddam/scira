'use client';

import React from 'react';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import { BinocularsIcon, Archive01Icon } from '@hugeicons/core-free-icons';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon?: any;
  title: string;
  description: string;
  children?: React.ReactNode;
  variant?: 'default' | 'dashed';
}

export function EmptyState({
  icon = BinocularsIcon,
  title,
  description,
  children,
  variant = 'dashed',
}: EmptyStateProps) {
  return (
    <Card className={`shadow-none rounded-xl ${variant === 'dashed' ? 'border-dashed border-border/60' : 'border-border/60'}`}>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
          <HugeiconsIcon
            icon={icon}
            size={20}
            color="currentColor"
            strokeWidth={1.5}
            className="text-muted-foreground"
          />
        </div>
        <h3 className="text-sm font-semibold mb-1">{title}</h3>
        <p className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider text-center max-w-xs mb-4">{description}</p>
        {children}
      </CardContent>
    </Card>
  );
}

// Preset empty states for common scenarios
export function NoActiveLookoutsEmpty() {
  return (
    <EmptyState
      icon={BinocularsIcon}
      title="No lookouts yet"
      description="Create a lookout to automate searches on a schedule"
    />
  );
}

export function NoArchivedLookoutsEmpty() {
  return (
    <EmptyState
      icon={Archive01Icon}
      title="No archived lookouts"
      description="Archived lookouts will appear here"
      variant="default"
    />
  );
}
