"use client"; // Add this line to make it a client component

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Geist } from 'next/font/google';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import 'katex/dist/katex.min.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Metadata, Viewport } from "next";
import { Syne } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL("https://scira.ai"),
  title: {
    default: "Scira AI",
    template: "%s | Scira AI",
    absolute: "Scira AI",
  },
  description: "Scira AI is a minimalistic AI-powered search engine that helps you find information on the internet.",
  openGraph: {
    url: "https://scira.ai",
    siteName: "Scira AI",
  },
  keywords: [
    "scira.ai",
    "scira ai",
    "Scira AI",
    "scira AI",
    "SCIRA.AI",
    "scira github",
    "ai search engine",
    "Scira",
    "scira",
    "scira.app",
    "scira ai",
    "scira ai app",
    "scira",
    "MiniPerplx",
    "Scira AI",
    "open source ai search engine",
    "minimalistic ai search engine",
    "ai search engine",
    "Scira (Formerly MiniPerplx)",
    "AI Search Engine",
    "mplx.run",
    "mplx ai",
    "zaid mukaddam",
    "scira.how",
    "search engine",
    "AI",
    "perplexity",
  ]
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' }
  ],
}

const syne = Syne({ 
  subsets: ['latin'], 
  variable: '--font-syne',
   preload: true,
  display: 'swap',
});

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  preload: true,
  display: 'swap',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { i18n } = useTranslation(); // Get i18n instance
  return (
    <html lang={i18n.language} dir={i18n.dir()} suppressHydrationWarning>
      <body className={`${geist.variable} ${syne.variable} font-sans antialiased`} suppressHydrationWarning>
        <NuqsAdapter>
          <Providers>
            <Toaster position="top-center" />
            {children}
          </Providers>
        </NuqsAdapter>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
