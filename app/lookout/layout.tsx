import React from 'react';
import type { Metadata } from 'next';
import { SidebarLayout } from '@/components/sidebar-layout';

export const metadata: Metadata = {
  title: 'Scira Lookout - Automated Search Monitoring',
  description:
    'Schedule automated searches and get notified when they complete. Monitor trends, track developments, and stay informed with intelligent lookouts.',
  keywords: 'automated search, monitoring, scheduled queries, AI lookouts, search automation, trend tracking',
  openGraph: {
    title: 'Scira Lookout - Automated Search Monitoring',
    description:
      'Schedule automated searches and get notified when they complete. Monitor trends, track developments, and stay informed with intelligent lookouts.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scira Lookout - Automated Search Monitoring',
    description:
      'Schedule automated searches and get notified when they complete. Monitor trends, track developments, and stay informed with intelligent lookouts.',
  },
};

interface LookoutLayoutProps {
  children: React.ReactNode;
}

export default function LookoutLayout({ children }: LookoutLayoutProps) {
  return (
    <SidebarLayout>
      <div className="min-h-screen bg-background">
        <div className="flex flex-col min-h-screen">
          <main className="flex-1" role="main" aria-label="Lookout management">
            {children}
          </main>
        </div>
      </div>
    </SidebarLayout>
  );
}
