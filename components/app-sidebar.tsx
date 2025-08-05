'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderOpen, Crown } from '@phosphor-icons/react';
import { Search } from 'lucide-react';
import { useUserData } from '@/hooks/use-user-data';
import { useSession } from '@/lib/auth-client';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user, isLoading } = useUserData();
  const { data: session, isPending: sessionPending } = useSession();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const isAuthenticated = !!(user || session);
  const authCheckComplete = mounted && !isLoading && !sessionPending;
  const showLibrary = authCheckComplete && isAuthenticated;
  
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-2 pointer-events-none select-none">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg overflow-hidden bg-black">
                <Image src="/atlas.png" alt="Atlas logo" width={32} height={32} className="size-full object-cover" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Atlas</span>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/' || pathname.startsWith('/search')}>
              <Link href="/" className="flex items-center gap-3">
                <Search size={20} />
                <span>Search</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {showLibrary && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/library'}>
                <Link href="/library" className="flex items-center gap-3">
                  <FolderOpen size={20} />
                  <span>Library</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/pricing" className="flex items-center gap-3">
                <Crown size={20} />
                <span>Upgrade to Pro</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
