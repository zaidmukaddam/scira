import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'X Wrapped 2025 - Your Year on X',
  description:
    'Discover your 2025 on X! Get personalized insights about your posting activity, top topics, sentiment analysis, and more with X Wrapped powered by Scira AI.',
  openGraph: {
    title: 'X Wrapped 2025 - Your Year on X',
    description: 'Discover your personalized year-in-review on X with AI-powered insights and beautiful visualizations.',
    type: 'website',
    url: 'https://scira.ai/x-wrapped',
    images: [
      {
        url: 'https://scira.ai/api/og/x-wrapped',
        width: 1200,
        height: 630,
        alt: 'X Wrapped 2025',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'X Wrapped 2025',
    description: 'Get your personalized year-in-review on X',
    images: ['https://scira.ai/api/og/x-wrapped'],
  },
};

export default function XWrappedLayout({ children }: { children: React.ReactNode }) {
  return children;
}

