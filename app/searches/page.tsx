'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/contexts/user-context';
import { SearchesPage } from '@/components/searches-page';
import { SidebarLayout } from '@/components/sidebar-layout';
import { Skeleton } from '@/components/ui/skeleton';

function SearchesPageSkeleton() {
  return (
    <div className="w-full h-dvh flex flex-col">
      <div className="border-b border-border/50">
        <div className="flex h-14 items-center justify-between px-4 md:px-6 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-6 md:hidden rounded" />
            <Skeleton className="size-4.5 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-7 w-14 rounded-md" />
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        </div>
      </div>
      <main className="flex-1 flex flex-col overflow-hidden max-w-3xl mx-auto w-full px-4 md:px-6">
        <div className="pt-4 pb-3 space-y-2.5">
          <Skeleton className="h-9 w-full rounded-lg" />
          <div className="flex gap-1.5">
            <Skeleton className="h-8 w-52 rounded-lg" />
            <Skeleton className="h-8 w-36 rounded-lg" />
          </div>
        </div>
        <div className="space-y-0.5 pt-1">
          <Skeleton className="h-3 w-10 rounded mb-1 mx-3" />
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 rounded" style={{ width: `${55 + (i % 3) * 15}%` }} />
                <Skeleton className="h-3 w-20 rounded" />
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
