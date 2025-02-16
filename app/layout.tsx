import { Analytics } from "@vercel/analytics/react";
import { GeistSans } from 'geist/font/sans';
import 'katex/dist/katex.min.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Metadata, Viewport } from "next";
import { Instrument_Serif, Syne } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL("https://scira.app"),
  title: "Scira",
  description: "Scira is a minimalistic AI-powered search engine that helps you find information on the internet.",
  openGraph: {
    url: "https://scira.app",
    siteName: "Scira",
  },
  keywords: [
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
    { media: '(prefers-color-scheme: dark)', color: '#171717' }
  ],
}

const syne = Syne({ 
  subsets: ['latin'], 
  variable: '--font-syne',
   preload: true,
  display: 'swap',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${syne.variable} font-sans antialiased`}>
        <NuqsAdapter>
          <Providers>
            <Toaster position="top-center" richColors />
            {children}
          </Providers>
        </NuqsAdapter>
        <Analytics />
      </body>
    </html>
  );
}
