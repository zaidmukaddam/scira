'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { ChatHistoryDialog } from '@/components/chat-history-dialog';
import { useUser } from '@/contexts/user-context';

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { user, isProUser } = useUser();
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);

  const handleHistoryClick = useCallback(() => {
    setCommandDialogOpen(true);
  }, []);

  // Keyboard shortcut for opening chat history (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandDialogOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <AppSidebar
        chatId={null}
        selectedVisibilityType="private"
        onVisibilityChange={() => {}}
        user={user || null}
        onHistoryClick={handleHistoryClick}
        isProUser={isProUser}
      />
      <SidebarInset>{children}</SidebarInset>
      
      {/* Chat History Dialog */}
      <ChatHistoryDialog
        open={commandDialogOpen}
        onOpenChange={setCommandDialogOpen}
        user={user ?? null}
      />
    </>
  );
}
