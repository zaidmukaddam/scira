'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

interface PreviewState {
  isOpen: boolean;
  /** External URL (Daytona sandbox for Python output, etc.) */
  url: string;
  /** Inline HTML content — rendered via srcdoc for HTML/JS games */
  srcdoc: string;
  title: string;
}

interface CodePreviewContextValue {
  preview: PreviewState;
  openPreview: (url: string, title?: string, srcdoc?: string) => void;
  closePreview: () => void;
  refreshPreview: () => void;
}

const CodePreviewContext = createContext<CodePreviewContextValue | null>(null);

export function CodePreviewProvider({ children }: { children: React.ReactNode }) {
  const [preview, setPreview] = useState<PreviewState>({
    isOpen: false,
    url: '',
    srcdoc: '',
    title: '',
  });

  const openPreview = useCallback((url: string, title?: string, srcdoc?: string) => {
    setPreview({ isOpen: true, url, srcdoc: srcdoc || '', title: title || 'Preview' });
  }, []);

  const closePreview = useCallback(() => {
    setPreview((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const refreshPreview = useCallback(() => {
    setPreview((prev) => {
      if (prev.srcdoc) {
        // For srcdoc, toggling isOpen forces a remount
        return { ...prev, isOpen: false };
      }
      if (!prev.url) return prev;
      const separator = prev.url.includes('?') ? '&' : '?';
      const base = prev.url.replace(/[?&]_r=\d+/, '');
      return { ...prev, url: `${base}${separator}_r=${Date.now()}` };
    });
    // Re-open after reset (for srcdoc case)
    setTimeout(() => {
      setPreview((prev) => ({ ...prev, isOpen: true }));
    }, 50);
  }, []);

  return (
    <CodePreviewContext.Provider value={{ preview, openPreview, closePreview, refreshPreview }}>
      {children}
    </CodePreviewContext.Provider>
  );
}

export function useCodePreview(): CodePreviewContextValue {
  const ctx = useContext(CodePreviewContext);
  if (!ctx) {
    throw new Error('useCodePreview must be used within a CodePreviewProvider');
  }
  return ctx;
}
