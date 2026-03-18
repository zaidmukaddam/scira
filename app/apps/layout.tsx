import React from 'react';
import type { Metadata } from 'next';
import { SidebarLayout } from '@/components/sidebar-layout';

const title = 'Apps';
const description =
  'Browse and connect apps to power your AI workflows. Integrate with GitHub, Notion, Linear, Figma, Stripe, and 50+ more services.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: 'https://scira.ai/apps',
    siteName: 'Scira AI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    creator: '@sciraai',
  },
  alternates: {
    canonical: 'https://scira.ai/apps',
  },
};

export default function AppsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarLayout>
      <div className="min-h-screen bg-background">{children}</div>
    </SidebarLayout>
  );
}
