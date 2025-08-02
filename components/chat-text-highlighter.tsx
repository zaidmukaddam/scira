'use client';

import React, { useCallback } from 'react';
import { TextHighlighter, TextSelection } from 'lisere';
import { cn } from '@/lib/utils';

interface ChatTextHighlighterProps {
  children: React.ReactNode;
  onHighlight?: (text: string) => void;
  className?: string;
  removeHighlightOnClick?: boolean;
}

export const ChatTextHighlighter: React.FC<ChatTextHighlighterProps> = ({
  children,
  onHighlight,
  className,
  removeHighlightOnClick = false,
}) => {
  const handleTextHighlighted = useCallback((selection: TextSelection) => {
    // This is called when text is initially highlighted
    console.log('Highlighted:', selection.text);
  }, []);

  const handleHighlightRemoved = useCallback((selection: TextSelection) => {
    // This is called when a highlight is removed
    console.log('Removed:', selection.text);
  }, []);

  const handleQuote = useCallback(
    (text: string) => {
      if (onHighlight) {
        onHighlight(text);
      }
    },
    [onHighlight],
  );

  return (
    <div className={cn('relative', className)}>
      <TextHighlighter
        className={className}
        highlightStyle={{
          className:
            'bg-foreground text-background rounded px-1 py-0.5 border border-accent-foreground cursor-pointer shadow-sm font-medium transition-all',
        }}
        onTextHighlighted={handleTextHighlighted}
        onHighlightRemoved={handleHighlightRemoved}
        removeHighlightOnClick={removeHighlightOnClick}
        selectionBoundary="word"
        renderSelectionUI={({ selection, modifyHighlight, onClose }) => (
          <div className="selection-popup absolute z-50 bg-background border border-border rounded-lg shadow-lg p-3 min-w-[320px] -translate-y-[calc(65%+12px)] before:absolute before:content-[''] before:bottom-[-8px] before:left-[24px] before:w-4 before:h-4 before:bg-background before:border-r before:border-b before:border-border before:rotate-45 before:transform">
            <span className="text-sm text-foreground block mb-3">
              Quote &ldquo;{selection.text.length > 50 ? selection.text.substring(0, 50) + '...' : selection.text}
              &rdquo;?
            </span>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleQuote(selection.text);
                  modifyHighlight?.(selection, false);
                  onClose?.();
                }}
                className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Quote
              </button>

              <button
                onClick={() => {
                  modifyHighlight?.(selection, true);
                  onClose?.();
                }}
                className="px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      >
        {children}
      </TextHighlighter>
    </div>
  );
};

export default ChatTextHighlighter;
