'use client';

import { Suspense } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ChatInterface } from '@/components/chat-interface';

interface ClientWrapperProps {
  initialChatId: string;
  initialMessages: any[];
  initialVisibility: 'public' | 'private';
  isOwner: boolean;
}

export default function ClientWrapper({
  initialChatId,
  initialMessages,
  initialVisibility,
  isOwner,
}: ClientWrapperProps) {
  return (
    <Suspense>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-full">
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              initialChatId={initialChatId}
              initialMessages={initialMessages}
              initialVisibility={initialVisibility}
              isOwner={isOwner}
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Suspense>
  );
}