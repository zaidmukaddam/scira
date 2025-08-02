'use client';

import { clientEnv } from '@/env/client';
import { ThemeProvider } from 'next-themes';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { ReactNode } from 'react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { UserProvider } from '@/contexts/user-context';

if (typeof window !== 'undefined') {
  posthog.init(clientEnv.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: clientEnv.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'always',
  });
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 0.5, // 30 seconds
      refetchOnWindowFocus: true, // Enable for real-time updates
      gcTime: 1000 * 60 * 0.5, // 30 seconds
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <PostHogProvider client={posthog}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <TooltipProvider>{children}</TooltipProvider>
          </ThemeProvider>
        </PostHogProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
