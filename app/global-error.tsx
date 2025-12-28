'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, TriangleAlert, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Be_Vietnam_Pro, Baumans } from 'next/font/google';
import localFont from 'next/font/local';
import { AnimatePresence, motion } from 'framer-motion';

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
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  preload: true,
});

const baumans = Baumans({
  subsets: ['latin'],
  variable: '--font-baumans',
  weight: '400',
  display: 'swap',
  preload: true,
});

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Central place to hook real error reporting (Sentry, PostHog, etc.)
    // e.g. reportError(error);
    // eslint-disable-next-line no-console
    console.error('[GlobalErrorBoundary]', error);
  }, [error]);

  const details = [
    error.message && `Message: ${error.message}`,
    error.name && `Name: ${error.name}`,
    error.digest && `Digest: ${error.digest}`,
    error.stack && `Stack:\n${error.stack}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // swallow
    }
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sfPro.variable} ${beVietnamPro.variable} ${baumans.variable} font-sans antialiased bg-background text-foreground`}
        suppressHydrationWarning
      >
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="w-full max-w-lg"
          >
            <div className="relative rounded-2xl border bg-card/60 backdrop-blur-sm shadow-lg p-8 overflow-hidden">
              {/* Subtle background decoration */}
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 -right-20 size-56 rounded-full bg-primary/10 blur-3xl dark:bg-primary/15" />
                <div className="absolute -bottom-28 -left-20 size-72 rounded-full bg-secondary/10 blur-3xl dark:bg-secondary/20" />
              </div>

              <div className="relative flex flex-col items-center text-center gap-5">
                <div className="inline-flex items-center justify-center rounded-full border bg-accent/30 dark:bg-accent/20 size-16 shadow-sm">
                  <TriangleAlert className="size-8 text-destructive" />
                </div>

                <h1 className="font-be-vietnam-pro text-3xl md:text-4xl font-semibold tracking-tight">
                  Something broke
                </h1>

                <p className="text-muted-foreground leading-relaxed">
                  A global application error occurred. You can try to recover, or head back to the home page. If this
                  keeps happening, feel free to report it.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Button onClick={reset} className="rounded-full">
                    <RefreshCw className="size-4" />
                    Try again
                  </Button>

                  <Link href="/" prefetch>
                    <Button variant="outline" className="rounded-full">
                      <Home className="size-4" />
                      Home
                    </Button>
                  </Link>

                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => setShowDetails((s) => !s)}
                  >
                    {showDetails ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    {showDetails ? 'Hide details' : 'Show details'}
                  </Button>
                </div>

                <AnimatePresence initial={false}>
                  {showDetails && (
                    <motion.div
                      key="details"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="w-full overflow-hidden"
                    >
                      <div className="relative mt-2 rounded-lg border bg-muted/40 dark:bg-muted/30 text-left">
                        <pre className="text-xs leading-relaxed p-4 max-h-72 overflow-auto whitespace-pre-wrap font-mono scrollbar-thin">
                          {details || 'No additional diagnostic information available.'}
                        </pre>

                        {details && (
                          <div className="flex justify-end gap-2 px-4 pb-4 -mt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1.5"
                              onClick={handleCopy}
                            >
                              <Copy className="size-3.5" />
                              {copied ? 'Copied' : 'Copy'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-xs text-muted-foreground pt-4">
                  Error boundary: global / Root. Runtime may have partial state loss.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </body>
    </html>
  );
}
