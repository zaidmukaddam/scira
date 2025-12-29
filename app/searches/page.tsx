'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import { SearchesPage } from '@/components/searches-page';
import { SidebarLayout } from '@/components/sidebar-layout';
import { Skeleton } from '@/components/ui/skeleton';

function SearchesPageSkeleton() {
  return (
    <div className="w-full h-screen flex flex-col">
      <main className="flex-1 flex flex-col overflow-hidden px-4 pt-4 md:px-8 md:pt-8 max-w-3xl mx-auto w-full">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 md:hidden" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-6 w-32 sm:w-40" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 sm:w-28" />
        </div>

        {/* Search input skeleton */}
        <Skeleton className="h-10 w-full mb-6" />

        {/* Count skeleton */}
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-12" />
        </div>

        {/* Chat list skeleton */}
        <div className="space-y-0 flex-1">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="py-4 border-b border-border/40">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-8 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function Page() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  // Redirect non-authenticated users
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <SidebarLayout>
        <SearchesPageSkeleton />
      </SidebarLayout>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <SidebarLayout>
      <SearchesPage userId={user.id} />
    </SidebarLayout>
  );
}
