import React from 'react';
import type { Metadata } from 'next';
import { SidebarLayout } from '@/components/sidebar-layout';

export const metadata: Metadata = {
  title: 'Admin | SCX.ai',
  description: 'Admin dashboard for SCX.ai — system metrics, service health, and API key management.',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarLayout>
      <div className="min-h-screen bg-background">
        <main className="flex-1">{children}</main>
      </div>
    </SidebarLayout>
  );
}
