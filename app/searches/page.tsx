'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import { SearchesPage } from '@/components/searches-page';
import { SidebarLayout } from '@/components/sidebar-layout';
import { Skeleton } from '@/components/ui/skeleton';

function SearchesPageSkeleton() {
  return (
    <div className="w-full">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6 max-w-5xl mx-auto w-full">
        <Skeleton className="h-11 w-full mb-6" />
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <Skeleton className="h-3 w-16 shrink-0" />
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
