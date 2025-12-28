'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ChatTextHighlighterProps {
  children: React.ReactNode;
  onHighlight?: (text: string) => void;
  className?: string;
  removeHighlightOnClick?: boolean;
}

interface PopupPosition {
  x: number;
  y: number;
  text: string;
}

export const ChatTextHighlighter: React.FC<ChatTextHighlighterProps> = ({ children, onHighlight, className }) => {
  const [popup, setPopup] = useState<PopupPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('Text copied:', text);
    } catch (err) {
      console.error('Copy failed:', err);
      // Fallback method
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        console.log('Fallback copy succeeded');
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  }, []);

  const handleQuote = useCallback(
    (text: string) => {
      if (onHighlight) {
        onHighlight(text);
      }
    },
    [onHighlight],
  );

  const handlePointerUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setPopup(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const text = selection.toString().trim();

    if (!text || text.length < 2) {
      setPopup(null);
      return;
    }

    if (containerRef.current && !containerRef.current.contains(range.commonAncestorContainer)) {
      setPopup(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (containerRect) {
      setPopup({
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top - containerRect.top - 8,
        text,
      });
    }
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as Node;
    if (popupRef.current && popupRef.current.contains(target)) {
      return;
    }
    setPopup(null);
  }, []);

  const closePopup = useCallback(() => {
    setPopup(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    const handleScrollOrResize = () => setPopup(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopup(null);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onPointerUp={handlePointerUp}
      onPointerDown={handlePointerDown}
    >
      {children}

      {popup && (
        <div
          ref={popupRef}
          className="selection-popup absolute z-50 bg-background border border-border rounded-md shadow-lg p-1.5 pointer-events-auto"
          style={{
            left: popup.x,
            top: popup.y,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex gap-1">
            <button
              onClick={async () => {
                await handleCopy(popup.text);
                closePopup();
              }}
              className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Copy
            </button>

            <button
              onClick={() => {
                handleQuote(popup.text);
                closePopup();
              }}
              className="px-2 py-1 text-xs font-medium bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors"
            >
              Quote
            </button>

            <button
              onClick={closePopup}
              className="px-1.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatTextHighlighter;
