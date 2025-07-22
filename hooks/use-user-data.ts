import { useQuery } from '@tanstack/react-query';
import { getSubDetails, getCurrentUser, getProUserStatusOnly } from '@/app/actions';
import { User } from '@/lib/db/schema';
import { shouldBypassRateLimits } from '@/ai/providers';

export type UserWithProStatus = User & {
  isProUser: boolean;
  subscriptionData?: any;
};

// Hook for user data
export function useUserData() {
  return useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60 * 5, // 5 minutes - user data doesn't change often
    gcTime: 1000 * 60 * 10, // 10 minutes cache retention
    refetchOnWindowFocus: false, // Don't refetch on focus
    retry: 2, // Retry failed requests twice
  });
}

// Fast hook for just pro user status - optimized for navbar/settings
export function useProStatusOnly() {
  return useQuery({
    queryKey: ['pro-status-only'],
    queryFn: getProUserStatusOnly,
    staleTime: 1000 * 60 * 30, // 30 minutes - matches server cache
    gcTime: 1000 * 60 * 60, // 1 hour cache retention
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

// Hook for subscription data with user dependency
export function useSubscriptionData(user: User | null) {
  return useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: getSubDetails,
    enabled: !!user, // Only run when user exists
    staleTime: 1000 * 60 * 30, // 30 minutes - Pro status doesn't change frequently
    gcTime: 1000 * 60 * 60 * 2, // 2 hours cache retention for subscription data
    refetchOnWindowFocus: false, // Don't refetch on focus
    retry: 1, // Only retry once for subscription checks
  });
}

// Combined hook for Pro user status with optimized caching
export function useProUserStatus() {
  const { data: user, isLoading: userLoading } = useUserData();

  // Helper function to check if user should have unlimited access for specific models
  const shouldBypassLimitsForModel = (selectedModel: string) => {
    return shouldBypassRateLimits(selectedModel, user);
  };

  return {
    user: (user || null) as UserWithProStatus | null,
    subscriptionData: user?.subscriptionData,
    isProUser: Boolean(user?.isProUser),
    isLoading: Boolean(userLoading),
    // Pro users should never see limit checks
    shouldCheckLimits: !userLoading && user && !user.isProUser,
    shouldBypassLimitsForModel,
  };
}

// Fast hook for components that only need pro status (navbar, settings)
export function useFastProStatus() {
  const { data: isProUser, isLoading } = useProStatusOnly();

  return {
    isProUser: Boolean(isProUser),
    isLoading,
  };
}
