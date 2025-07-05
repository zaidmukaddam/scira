import { useQuery } from '@tanstack/react-query';
import { getCurrentUser, getSubDetails } from '@/app/actions';
import { User } from '@/lib/db/schema';
import { shouldBypassRateLimits } from '@/ai/providers';

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
  const { data: subscriptionData, isLoading: subscriptionLoading } = useSubscriptionData(user || null);

  const isProUser = subscriptionData?.hasSubscription && subscriptionData?.subscription?.status === 'active';
  const isLoading = userLoading || (user && subscriptionLoading);

  // Helper function to check if user should have unlimited access for specific models
  const shouldBypassLimitsForModel = (selectedModel: string) => {
    return shouldBypassRateLimits(selectedModel, user);
  };

  return {
    user: (user || null) as User | null,
    subscriptionData,
    isProUser: Boolean(isProUser),
    isLoading: Boolean(isLoading),
    // Pro users should never see limit checks
    shouldCheckLimits: !isLoading && user && !isProUser,
    shouldBypassLimitsForModel,
  };
} 