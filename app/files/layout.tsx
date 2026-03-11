import React from 'react';
import { SidebarLayout } from '@/components/sidebar-layout';

export default function FilesLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarLayout>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </SidebarLayout>
  );
}
