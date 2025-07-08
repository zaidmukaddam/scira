import './globals.css';
import 'katex/dist/katex.min.css';
import 'mapbox-gl/dist/mapbox-gl.css';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Geist } from 'next/font/google';

import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from 'sonner';

import { Providers } from './providers';
import { getLocale, getGT } from "gt-next/server";
import { GTProvider } from "gt-next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getGT();
  return {
    metadataBase: new URL('https://scira.ai'),
    title: {
      default: 'Scira AI',
      template: `%s | ${'Scira AI'}`,
      absolute: 'Scira AI'
    },
    description: t('Scira AI is a minimalistic AI-powered search engine that helps you find information on the internet.'),
    openGraph: {
      url: 'https://scira.ai',
      siteName: 'Scira AI'
    },
    keywords: [
    'scira.ai',
    'ai search engine',
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
    'perplexity']
  };
}


export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
  { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' }]

};

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  preload: true,
  display: 'swap'
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin'],
  variable: '--font-be-vietnam-pro',
  preload: true,
  display: 'swap',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900']
});

export default async function RootLayout({
  children


}: Readonly<{children: React.ReactNode;}>) {
  return (
  <html suppressHydrationWarning lang={await getLocale()}>
      <body className={`${geist.variable} ${beVietnamPro.variable} font-sans antialiased`} suppressHydrationWarning><GTProvider>
        <NuqsAdapter>
          <Providers>
            <Toaster position="top-center" />
            {children}
          </Providers>
        </NuqsAdapter>
        <Analytics />
        <SpeedInsights />
      </GTProvider></body>
    </html>
  );
}