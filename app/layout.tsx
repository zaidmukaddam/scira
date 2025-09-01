import './globals.css';
import 'katex/dist/katex.min.css';
import 'leaflet/dist/leaflet.css';

import { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Inter, Baumans } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Databuddy } from '@databuddy/sdk';

import { Providers } from './providers';
import Footer from '@/components/footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://remi.famasi.africa'),
  title: {
    default: 'Atlas - Healthcare Platform with Remi AI',
    template: '%s | Atlas',
    absolute: 'Atlas - Healthcare Platform with Remi AI',
  },
  description: 'Atlas healthcare platform powered by Remi AI - find medications, manage prescriptions, and connect with pharmacies across Africa.',
  openGraph: {
    url: 'https://remi.famasi.africa',
    siteName: 'Remi',
  },
  keywords: [
    'remi',
    'famasi africa',
    'ai healthcare assistant',
    'medication finder',
    'pharmacy locator',
    'prescription management',
    'healthcare ai',
    'medication management',
    'african healthcare',
    'digital pharmacy',
    'medication refills',
    'drug interaction checker',
    'healthcare chatbot',
    'medical ai assistant',
    'pharmacy finder africa',
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
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F9F9F9' },
    { media: '(prefers-color-scheme: dark)', color: '#111111' },
  ],
};

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  preload: true,
  weight: 'variable',
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

export default function RootLayout({
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
            <Toaster position="top-center" />
            {children}
            <Footer />
          </Providers>
        </NuqsAdapter>
        <Databuddy clientId={process.env.DATABUDDY_CLIENT_ID!} enableBatching={true} trackSessions={true} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
