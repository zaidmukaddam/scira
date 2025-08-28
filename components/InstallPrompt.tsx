'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share } from 'lucide-react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { SciraLogo } from '@/components/logos/scira-logo';

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isDismissed, setIsDismissed] = useLocalStorage('installPromptDismissed', false);

  useEffect(() => {
    if (isDismissed) return;

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(navigator as any).standalone && !('MSStream' in window);

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      const timer = setTimeout(() => setShowPrompt(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isDismissed]);

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
  };

  return (
    <AnimatePresence>
      {showPrompt && !isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30, transition: { duration: 0.2 } }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto md:max-w-sm p-3 bg-card text-card-foreground shadow-xl rounded-lg border border-border overflow-hidden z-100"
        >
          <div className="flex items-start justify-between gap-3">
            {/* App Icon */}
            <SciraLogo className="size-9" />
            <div className="flex-grow">
              <p className="text-sm font-semibold text-foreground">Install Scira on your device</p>
              <p className="mt-0.5 text-xs text-muted-foreground inline-flex items-center gap-1">
                Tap <Share className="w-3 h-3 text-primary" /> then &quot;Add to Home Screen&quot;{' '}
                <span role="img" aria-label="plus icon" className="text-primary font-medium">
                  ➕
                </span>
              </p>
            </div>

            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleDismiss}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex-shrink-0 -mr-1 -mt-1"
              aria-label="Close install prompt"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
              </svg>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
