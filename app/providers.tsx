'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { UserProvider } from '@/contexts/user-context';
import { DataStreamProvider } from '@/components/data-stream-provider';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - increased to reduce unnecessary refetches
      refetchOnWindowFocus: false, // Disabled globally for better performance - enable per-query if needed
      refetchOnMount: false, // Use cached data when available
      gcTime: 1000 * 60 * 30, // 30 minutes - keep cached data much longer
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Use structural sharing to prevent unnecessary re-renders
      structuralSharing: true,
      // Keep showing placeholder data while fetching new data
      notifyOnChangeProps: ['data', 'error', 'isLoading'],
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <DataStreamProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </DataStreamProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
