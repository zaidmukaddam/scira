'use client';

import React, { useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ExternalLink, RefreshCw, X } from 'lucide-react';
import { useCodePreview } from '@/hooks/use-code-preview';

export function CodePreviewPanel() {
  const { preview, closePreview, refreshPreview } = useCodePreview();

  const handleOpenInTab = useCallback(() => {
    if (preview.srcdoc) {
      const blob = new Blob([preview.srcdoc], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } else if (preview.url) {
      window.open(preview.url, '_blank', 'noopener,noreferrer');
    }
  }, [preview.url, preview.srcdoc]);

  const hasSrcdoc = Boolean(preview.srcdoc);
  const hasContent = hasSrcdoc || Boolean(preview.url);

  return (
    <Sheet open={preview.isOpen} onOpenChange={(open) => !open && closePreview()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[55vw] sm:max-w-[900px] p-0 gap-0 flex flex-col [&>button]:hidden"
      >
        <SheetHeader className="flex flex-row items-center justify-between px-4 py-3 border-b shrink-0 bg-background">
          <SheetTitle className="text-sm font-semibold truncate">
            {preview.title || 'Preview'}
          </SheetTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={refreshPreview}
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleOpenInTab}
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={closePreview}
              title="Close"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 relative bg-white dark:bg-zinc-900 overflow-hidden">
          {hasContent ? (
            hasSrcdoc ? (
              /**
               * srcdoc iframe: renders HTML/JS games and apps entirely in-browser.
               * No Daytona required. Fully sandboxed — scripts run but cannot
               * access parent page DOM, cookies, or localStorage.
               */
              <iframe
                key={preview.title + preview.srcdoc.slice(0, 40)}
                srcDoc={preview.srcdoc}
                sandbox="allow-scripts allow-forms allow-modals allow-popups"
                className="absolute inset-0 w-full h-full border-0"
                title={preview.title || 'Code Preview'}
              />
            ) : (
              <iframe
                key={preview.url}
                src={preview.url}
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                className="absolute inset-0 w-full h-full border-0"
                title={preview.title || 'Code Preview'}
              />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Loading preview...
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
