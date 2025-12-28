'use client';

import { useEffect } from 'react';
import { useUserData } from '@/hooks/use-user-data';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { type ComprehensiveUserData } from '@/lib/user-data';
import { shouldBypassRateLimits } from '@/ai/providers';

export function useCachedUserData() {
  // Get fresh data from the existing hook
  const { user: freshUser, isLoading: isFreshLoading, error, refetch, isRefetching, ...otherUserData } = useUserData();

  // Cache user data in localStorage
  const [cachedUser, setCachedUser] = useLocalStorage<ComprehensiveUserData | null>('scira-user-data', null);

  // Update cache when fresh data is available
  useEffect(() => {
    if (freshUser && !isFreshLoading) {
      setCachedUser(freshUser);
    }
  }, [freshUser, isFreshLoading, setCachedUser]);

  // Clear cache when user logs out (no fresh user and not loading)
  useEffect(() => {
    if (!freshUser && !isFreshLoading && cachedUser) {
      setCachedUser(null);
    }
  }, [freshUser, isFreshLoading, cachedUser, setCachedUser]);

  // Use cached data if available, otherwise use fresh data
  const user = cachedUser || freshUser;

  // Show loading only if we have no cached data and fresh data is loading
  const isLoading = !cachedUser && isFreshLoading;

  // Recalculate derived properties based on current user data
  const isProUser = Boolean(user?.isProUser);
  const proSource = user?.proSource || 'none';
  const subscriptionStatus = user?.subscriptionStatus || 'none';

  // Helper function to check if user should have unlimited access for specific models
  const shouldBypassLimitsForModel = (selectedModel: string) => {
    return shouldBypassRateLimits(selectedModel, user);
  };

  return {
    // Core user data
    user,
    isLoading,
    error,
    refetch,
    isRefetching,

    // Quick access to commonly used properties
    isProUser,
    proSource,
    subscriptionStatus,

    // Polar subscription details
    polarSubscription: user?.polarSubscription,
    hasPolarSubscription: Boolean(user?.polarSubscription),

    // Dodo Subscription details
    dodoSubscription: user?.dodoSubscription,
    hasDodoSubscription: Boolean(user?.dodoSubscription?.hasSubscriptions),
    dodoExpiresAt: user?.dodoSubscription?.expiresAt,
    isDodoExpiring: Boolean(user?.dodoSubscription?.isExpiringSoon),
    isDodoExpired: Boolean(user?.dodoSubscription?.isExpired),

    // Subscription history
    subscriptionHistory: user?.subscriptionHistory || [],

    // Rate limiting helpers
    shouldCheckLimits: Boolean(!isLoading && user && !user.isProUser),
    shouldBypassLimitsForModel,

    // Subscription status checks
    hasActiveSubscription: user?.subscriptionStatus === 'active',
    isSubscriptionCanceled: user?.subscriptionStatus === 'canceled',
    isSubscriptionExpired: user?.subscriptionStatus === 'expired',
    hasNoSubscription: user?.subscriptionStatus === 'none',

    // Legacy compatibility helpers
    subscriptionData: user?.polarSubscription
      ? {
          hasSubscription: true,
          subscription: user.polarSubscription,
        }
      : { hasSubscription: false },

    // Map dodoSubscription to legacy dodoProStatus structure for settings dialog
    dodoProStatus: user?.dodoSubscription
      ? {
          isProUser: proSource === 'dodo' && isProUser,
          hasSubscriptions: user.dodoSubscription.hasSubscriptions,
          expiresAt: user.dodoSubscription.expiresAt,
          mostRecentSubscription: user.dodoSubscription.mostRecentSubscription,
          daysUntilExpiration: user.dodoSubscription.daysUntilExpiration,
          isExpired: user.dodoSubscription.isExpired,
          isExpiringSoon: user.dodoSubscription.isExpiringSoon,
          source: proSource,
        }
      : null,

    expiresAt: user?.dodoSubscription?.expiresAt,

    // Additional utilities
    isCached: Boolean(cachedUser),
    clearCache: () => setCachedUser(null),
  };
}

// Lightweight hook for components that only need to know if user is pro
export function useCachedIsProUser() {
  const { isProUser, isLoading } = useCachedUserData();
  return { isProUser, isLoading };
}

// Hook for components that need subscription status but not all user data
export function useCachedSubscriptionStatus() {
  const {
    subscriptionStatus,
    proSource,
    hasActiveSubscription,
    isSubscriptionCanceled,
    isSubscriptionExpired,
    hasNoSubscription,
    isLoading,
  } = useCachedUserData();

  return {
    subscriptionStatus,
    proSource,
    hasActiveSubscription,
    isSubscriptionCanceled,
    isSubscriptionExpired,
    hasNoSubscription,
    isLoading,
  };
}
