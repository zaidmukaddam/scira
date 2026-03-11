import './globals.css';
import 'katex/dist/katex.min.css';
import 'leaflet/dist/leaflet.css';

import { Metadata, Viewport } from 'next';
import { Inter, Be_Vietnam_Pro, Baumans } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from '@/components/ui/sonner';
import { ClientAnalytics } from '@/components/client-analytics';
import { SidebarProvider } from '@/components/ui/sidebar';

import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://chat.southerncrossai.com.au'),
  title: {
    default: 'SCX.ai',
    template: '%s | SCX.ai',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
  description:
    'SCX.ai is a sovereign Australian AI chat engine powered by GPT-OSS, MAGPiE, and Llama models. Free Pro access until 31 March 2026.',
  openGraph: {
    url: 'https://chat.southerncrossai.com.au',
    siteName: 'SCX.ai',
    title: 'SCX.ai',
    description:
      'SCX.ai is a sovereign Australian AI chat engine powered by GPT-OSS, MAGPiE, and Llama models. Free Pro access until 31 March 2026.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'SCX.ai - Sovereign Australian AI Chat Engine',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SCX.ai',
    description:
      'SCX.ai is a sovereign Australian AI chat engine powered by GPT-OSS, MAGPiE, and Llama models. Free Pro access until 31 March 2026.',
    images: ['/opengraph-image'],
  },
  keywords: [
    'southerncrossai.com.au',
    'free ai search',
    'ai search',
    'ai research tool',
    'ai search tool',
    'perplexity ai alternative',
    'perplexity alternative',
    'chatgpt alternative',
    'ai search engine',
    'search engine',
    'southerncross ai',
    'SCX.ai',
    'southerncross AI',
    'SOUTHERNCROSS.AI',
    'southerncross github',
    'SouthernCross',
    'southerncross',
    'southerncross.app',
    'southerncross ai app',
    'MiniPerplx',
    'Perplexity alternatives',
    'Perplexity AI alternatives',
    'open source ai search engine',
    'minimalistic ai search engine',
    'AI Search Engine',
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

const inter = Inter({
  subsets: ['latin'],
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
        className={`${inter.variable} ${beVietnamPro.variable} ${baumans.variable} font-sans antialiased`}
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
