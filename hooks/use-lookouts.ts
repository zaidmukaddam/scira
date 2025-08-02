'use client';

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createScheduledLookout,
  getUserLookouts,
  updateLookoutStatusAction,
  updateLookoutAction,
  deleteLookoutAction,
  testLookoutAction,
} from '@/app/actions';

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
  createdAt: Date;
  cronSchedule?: string;
}

// Query key factory
export const lookoutKeys = {
  all: ['lookouts'] as const,
  lists: () => [...lookoutKeys.all, 'list'] as const,
  list: (filters: string) => [...lookoutKeys.lists(), { filters }] as const,
  details: () => [...lookoutKeys.all, 'detail'] as const,
  detail: (id: string) => [...lookoutKeys.details(), id] as const,
};

// Custom hook for lookouts
export function useLookouts() {
  const queryClient = useQueryClient();

  // Track previous lookouts state to detect completion
  const previousLookutsRef = React.useRef<Lookout[]>([]);

  // Track if create mutation was actually triggered by user
  const isActualCreateRef = React.useRef<boolean>(false);

  // Track recent completions to prevent duplicate toasts
  const recentCompletionsRef = React.useRef<Set<string>>(new Set());

  // Query for fetching lookouts
  const {
    data: lookouts = [],
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: lookoutKeys.lists(),
    queryFn: async () => {
      const result = await getUserLookouts();
      if (result.success) {
        return (result.lookouts || []) as Lookout[];
      }
      throw new Error(result.error || 'Failed to load lookouts');
    },
    staleTime: 1000 * 2, // Consider data fresh for 2 seconds
    refetchInterval: 1000 * 5, // Refetch every 5 seconds for real-time updates
    refetchIntervalInBackground: false, // Don't poll when tab is not focused
    gcTime: 1000 * 30, // Keep in cache for 30 seconds
    networkMode: 'always', // Always try to refetch
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true, // Always refetch when component mounts
    retry: (failureCount, error) => {
      // Retry up to 3 times with exponential backoff
      if (failureCount < 3) return true;
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Enable query deduplication for performance
    structuralSharing: true,

    // Prevent unnecessary re-renders
    notifyOnChangeProps: ['data', 'error', 'isLoading'],
  });

  // Detect lookout completions and show appropriate toast
  React.useEffect(() => {
    if (!lookouts.length || !previousLookutsRef.current.length) {
      previousLookutsRef.current = lookouts;
      return;
    }

    // Check for lookouts that transitioned from 'running' to 'active' or 'paused'
    const completedLookouts = lookouts.filter((current) => {
      const previous = previousLookutsRef.current.find((prev) => prev.id === current.id);
      const completionKey = `${current.id}-${current.lastRunAt?.getTime()}`;

      return (
        previous?.status === 'running' &&
        (current.status === 'active' || current.status === 'paused') &&
        current.lastRunAt !== previous.lastRunAt && // Ensure it's a new completion
        !recentCompletionsRef.current.has(completionKey) // Prevent duplicate toasts
      );
    });

    // Show completion toast for each completed lookout with debouncing
    completedLookouts.forEach((lookout) => {
      const completionKey = `${lookout.id}-${lookout.lastRunAt?.getTime()}`;
      recentCompletionsRef.current.add(completionKey);

      const statusText = lookout.frequency === 'once' ? 'completed' : 'run finished';
      toast.success(`Lookout "${lookout.title}" ${statusText} successfully!`);

      // Clear completion key after 30 seconds to allow future notifications
      setTimeout(() => {
        recentCompletionsRef.current.delete(completionKey);
      }, 30000);
    });

    previousLookutsRef.current = lookouts;
  }, [lookouts]);

  // Create lookout mutation
  const createMutation = useMutation({
    mutationFn: async (params: {
      title: string;
      prompt: string;
      frequency: 'once' | 'daily' | 'weekly' | 'monthly';
      time: string;
      timezone: string;
      date?: string;
      onSuccess?: () => void;
    }) => {
      const { onSuccess: successCallback, ...mutationParams } = params;
      const result = await createScheduledLookout(mutationParams);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create lookout');
      }
      return { result, onSuccess: successCallback };
    },
    onSuccess: (data) => {
      // Only show create toast for actual user-initiated creation
      if (isActualCreateRef.current) {
        toast.success('Lookout created successfully!');
        isActualCreateRef.current = false; // Reset flag
      }
      // Immediate cache invalidation for real-time updates
      queryClient.invalidateQueries({ queryKey: lookoutKeys.lists() });
      queryClient.refetchQueries({ queryKey: lookoutKeys.lists() });
      if (data.onSuccess) {
        data.onSuccess();
      }
    },
    onError: (error: Error) => {
      isActualCreateRef.current = false; // Reset flag on error
      toast.error(error.message);
    },
  });

  // Update lookout status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (params: { id: string; status: 'active' | 'paused' | 'archived' | 'running' }) => {
      const result = await updateLookoutStatusAction(params);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update lookout');
      }
      return { ...params, result };
    },
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: lookoutKeys.lists() });

      // Snapshot the previous value
      const previousLookouts = queryClient.getQueryData<Lookout[]>(lookoutKeys.lists());

      // Optimistically update
      queryClient.setQueryData<Lookout[]>(lookoutKeys.lists(), (old = []) =>
        old.map((lookout) => (lookout.id === id ? { ...lookout, status } : lookout)),
      );

      return { previousLookouts };
    },
    onSuccess: (data) => {
      const statusText =
        data.status === 'active'
          ? 'activated'
          : data.status === 'paused'
            ? 'paused'
            : data.status === 'archived'
              ? 'archived'
              : 'updated';
      toast.success(`Lookout ${statusText}`);
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousLookouts) {
        queryClient.setQueryData(lookoutKeys.lists(), context.previousLookouts);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      // Always refetch after error or success for real-time updates
      queryClient.invalidateQueries({ queryKey: lookoutKeys.lists() });
      queryClient.refetchQueries({ queryKey: lookoutKeys.lists() });
    },
  });

  // Update lookout mutation
  const updateMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      title: string;
      prompt: string;
      frequency: 'once' | 'daily' | 'weekly' | 'monthly';
      time: string;
      timezone: string;
      onSuccess?: () => void;
    }) => {
      const { onSuccess: successCallback, ...mutationParams } = params;
      const result = await updateLookoutAction(mutationParams);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update lookout');
      }
      return { result, onSuccess: successCallback };
    },
    onSuccess: (data) => {
      toast.success('Lookout updated successfully!');
      // Immediate cache invalidation and refetch for real-time updates
      queryClient.invalidateQueries({ queryKey: lookoutKeys.lists() });
      queryClient.refetchQueries({ queryKey: lookoutKeys.lists() });
      if (data.onSuccess) {
        data.onSuccess();
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete lookout mutation
  const deleteMutation = useMutation({
    mutationFn: async (params: { id: string }) => {
      const result = await deleteLookoutAction(params);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete lookout');
      }
      return params;
    },
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: lookoutKeys.lists() });

      // Snapshot the previous value
      const previousLookouts = queryClient.getQueryData<Lookout[]>(lookoutKeys.lists());

      // Optimistically update
      queryClient.setQueryData<Lookout[]>(lookoutKeys.lists(), (old = []) =>
        old.filter((lookout) => lookout.id !== id),
      );

      return { previousLookouts };
    },
    onSuccess: () => {
      toast.success('Lookout deleted successfully');
      // Force immediate refetch after delete
      queryClient.refetchQueries({ queryKey: lookoutKeys.lists() });
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousLookouts) {
        queryClient.setQueryData(lookoutKeys.lists(), context.previousLookouts);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      // Always refetch after error or success for real-time updates
      queryClient.invalidateQueries({ queryKey: lookoutKeys.lists() });
      queryClient.refetchQueries({ queryKey: lookoutKeys.lists() });
    },
  });

  // Test lookout mutation
  const testMutation = useMutation({
    mutationFn: async (params: { id: string }) => {
      const result = await testLookoutAction(params);
      if (!result.success) {
        throw new Error(result.error || 'Failed to test lookout');
      }
      return params;
    },
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: lookoutKeys.lists() });

      // Snapshot the previous value
      const previousLookouts = queryClient.getQueryData<Lookout[]>(lookoutKeys.lists());

      // Optimistically update to 'running' status
      queryClient.setQueryData<Lookout[]>(lookoutKeys.lists(), (old = []) =>
        old.map((lookout) => (lookout.id === id ? { ...lookout, status: 'running' as const } : lookout)),
      );

      return { previousLookouts };
    },
    onSuccess: () => {
      toast.success("Test run started - you'll be notified when complete!");
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousLookouts) {
        queryClient.setQueryData(lookoutKeys.lists(), context.previousLookouts);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      // Always refetch after error or success to get real status
      queryClient.invalidateQueries({ queryKey: lookoutKeys.lists() });
      queryClient.refetchQueries({ queryKey: lookoutKeys.lists() });
    },
  });

  // Manual refresh function for immediate updates
  const manualRefresh = async () => {
    // Cancel any in-flight queries first
    await queryClient.cancelQueries({ queryKey: lookoutKeys.lists() });
    // Invalidate and refetch with fresh data
    await queryClient.invalidateQueries({ queryKey: lookoutKeys.lists() });
    return queryClient.refetchQueries({
      queryKey: lookoutKeys.lists(),
      type: 'active', // Only refetch active queries
    });
  };

  // Optimized cache invalidation for running lookouts
  React.useEffect(() => {
    const hasRunningLookouts = lookouts.some((lookout) => lookout.status === 'running');

    if (!hasRunningLookouts) return;

    const interval = setInterval(() => {
      // Only invalidate if there are still running lookouts
      const currentRunning = lookouts.some((lookout) => lookout.status === 'running');
      if (currentRunning) {
        queryClient.invalidateQueries({ queryKey: lookoutKeys.lists() });
      }
    }, 3000); // Check every 3 seconds when there are running lookouts

    return () => clearInterval(interval);
  }, [lookouts, queryClient]);

  return {
    // Data
    lookouts,
    isLoading,
    error,

    // Actions
    refetch,
    manualRefresh,

    // Metadata
    lastUpdated: dataUpdatedAt,
    createLookout: (params: any) => {
      isActualCreateRef.current = true; // Mark as actual create
      createMutation.mutate(params);
    },
    updateStatus: updateStatusMutation.mutate,
    updateLookout: updateMutation.mutate,
    deleteLookout: deleteMutation.mutate,
    testLookout: testMutation.mutate,

    // Loading states
    isCreating: createMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTesting: testMutation.isPending,

    // For backwards compatibility with existing optimistic update patterns
    isPending:
      createMutation.isPending ||
      updateStatusMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      testMutation.isPending,
  };
}

// Helper hook for filtered lookouts
export function useFilteredLookouts(filter: 'active' | 'archived' | 'all' = 'all') {
  const { lookouts, ...rest } = useLookouts();

  const filteredLookouts = lookouts.filter((lookout) => {
    if (filter === 'active')
      return lookout.status === 'active' || lookout.status === 'paused' || lookout.status === 'running';
    if (filter === 'archived') return lookout.status === 'archived';
    return true;
  });

  return {
    lookouts: filteredLookouts,
    ...rest,
  };
}
