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
    <Card className="shadow-none h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 w-3/4" />
          {showActions && <Skeleton className="h-6 w-6 rounded-md shrink-0" />}
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1 flex flex-col">
        {/* Prompt preview skeleton */}
        <div className="space-y-1.5 mb-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        
        {/* Status and run info footer */}
        <div className="mt-auto space-y-2">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-3 w-1/2" />
        </div>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: validCount }).map((_, index) => (
        <LookoutSkeleton key={index} showActions={showActions} />
      ))}
    </div>
  );
}
