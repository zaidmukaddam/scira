import './globals.css';
import 'katex/dist/katex.min.css';
import 'leaflet/dist/leaflet.css';

import { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Baumans } from 'next/font/google';
import localFont from 'next/font/local';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from '@/components/ui/sonner';
import { ClientAnalytics } from '@/components/client-analytics';
import { SidebarProvider } from '@/components/ui/sidebar';

import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://scira.ai'),
  title: {
    default: 'Scira AI - Agentic Research Platform.',
    template: '%s | Scira AI',
  },
  description:
    'Scira is a free Agentic Research Platform that finds, analyzes, and cites information from the live web. $15/month—fast answers; 11000+ stars on GitHub.',
  openGraph: {
    url: 'https://scira.ai',
    siteName: 'Scira AI',
  },
  keywords: [
    'agentic research platform',
    'agentic research',
    'agentic search',
    'agentic search engine',
    'agentic search platform',
    'agentic search tool',
    'agentic search tool',
    'scira.ai',
    'free ai search',
    'ai search',
    'ai research tool',
    'ai search tool',
    'perplexity ai alternative',
    'perplexity alternative',
    'chatgpt alternative',
    'ai search engine',
    'search engine',
    'scira ai',
    'Scira AI',
    'scira AI',
    'SCIRA.AI',
    'scira github',
    'ai search engine',
    'Scira',
    'scira',
    'scira.app',
    'scira ai',
    'scira ai app',
    'scira',
    'MiniPerplx',
    'Scira AI',
    'Perplexity alternatives',
    'Perplexity AI alternatives',
    'open source ai search engine',
    'minimalistic ai search engine',
    'minimalistic ai search alternatives',
    'ai search',
    'minimal ai search',
    'minimal ai search alternatives',
    'Scira (Formerly MiniPerplx)',
    'AI Search Engine',
    'mplx.run',
    'mplx ai',
    'zaid mukaddam',
    'scira.how',
    'search engine',
    'AI',
    'perplexity',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F9F9F9' },
    { media: '(prefers-color-scheme: dark)', color: '#111111' },
  ],
};

const sfPro = localFont({
  src: [
    {
      path: '../public/fonts/SF-Pro.ttf',
      weight: '100 900',
      style: 'normal',
    },
    {
      path: '../public/fonts/SF-Pro-Italic.ttf',
      weight: '100 900',
      style: 'italic',
    },
  ],
  variable: '--font-sans',
  preload: true,
  display: 'swap',
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin'],
  variable: '--font-be-vietnam-pro',
  preload: true,
  display: 'swap',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
});

const baumans = Baumans({
  subsets: ['latin'],
  variable: '--font-baumans',
  preload: true,
  display: 'swap',
  weight: ['400'],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sfPro.variable} ${beVietnamPro.variable} ${baumans.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <NuqsAdapter>
          <Providers>
            <SidebarProvider>
              <Toaster position="top-center" />
              {children}
            </SidebarProvider>
          </Providers>
        </NuqsAdapter>
        <ClientAnalytics />
      </body>
    </html>
  );
}
