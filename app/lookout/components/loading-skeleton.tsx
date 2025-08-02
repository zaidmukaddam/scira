'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface LoadingSkeletonProps {
  count?: number;
  showActions?: boolean;
}

export function LookoutSkeleton({ showActions = true }: { showActions?: boolean }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-32" />
            </div>
          </div>
          {showActions && (
            <div className="flex items-center gap-1">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  );
}

export function LoadingSkeletons({ count = 3, showActions = true }: LoadingSkeletonProps) {
  // Ensure count is a positive number to prevent rendering issues
  const validCount = Math.max(0, count || 3);

  if (validCount === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: validCount }).map((_, index) => (
        <LookoutSkeleton key={index} showActions={showActions} />
      ))}
    </div>
  );
}
