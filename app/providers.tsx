'use client';

import { clientEnv } from '@/env/client';
import { ThemeProvider } from 'next-themes';
import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { ReactNode } from 'react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PostHogProvider client={posthog}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </PostHogProvider>
    </QueryClientProvider>
  );
}
