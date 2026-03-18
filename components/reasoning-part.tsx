import React, { useRef, useEffect, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minimize2, Maximize2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import Marked from 'marked-react';
import { ReasoningUIPart } from 'ai';
import remend from 'remend';

interface ReasoningPartViewProps {
  part: ReasoningUIPart;
  sectionKey: string;
  parallelTool: string | null;
  isComplete: boolean;
  expandedOverride?: boolean;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
  setIsExpanded: (v: boolean) => void; // user override setter
}

// Type definition for table flags
interface TableFlags {
  header?: boolean;
  align?: 'center' | 'left' | 'right' | null;
}

const SpinnerIcon = React.memo(() => (
  <svg className="animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
));
SpinnerIcon.displayName = 'SpinnerIcon';

// Custom renderer for Marked
const MarkdownRenderer = React.memo(({ content }: { content: string }) => {
  // Define custom renderer with proper types
  const renderer = {
    code(code: string, language?: string) {
      return (
        <pre
          key={Math.random()}
          className="bg-muted/70 dark:bg-muted/50 border border-border/60 rounded px-2 py-1.5 text-xs overflow-x-auto my-2"
        >
          <code className="text-foreground/90">{code}</code>
        </pre>
      );
    },
    codespan(code: string) {
      return (
        <code
          key={Math.random()}
          className="bg-muted/70 dark:bg-muted/50 text-foreground px-1 py-0.5 rounded border border-border/50 text-[11px]"
        >
          {code}
        </code>
      );
    },
    paragraph(text: ReactNode) {
      return (
        <p key={Math.random()} className="mb-2 last:mb-0 text-muted-foreground">
          {text}
        </p>
      );
    },
    strong(text: ReactNode) {
      return (
        <strong key={Math.random()} className="text-foreground font-semibold">
          {text}
        </strong>
      );
    },
    heading(text: ReactNode, level: number) {
      const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      const classes = {
        h1: 'text-lg font-semibold mb-2 mt-3 text-foreground',
        h2: 'text-base font-semibold mb-1.5 mt-2.5 text-foreground',
        h3: 'text-base font-medium mb-1.5 mt-2 text-foreground',
        h4: 'text-base font-medium mb-1 mt-1.5 text-foreground',
        h5: 'text-base font-normal mb-1 mt-1.5 text-foreground',
        h6: 'text-base font-normal mb-1 mt-1.5 text-foreground',
      };

      const className = classes[`h${level}` as keyof typeof classes] || '';
      return (
        <Tag key={Math.random()} className={className}>
          {text}
        </Tag>
      );
    },
    link(href: string, text: ReactNode) {
      return (
        <a
          key={Math.random()}
          href={href}
          target="_blank"
          className="text-primary hover:text-primary underline-offset-2 hover:underline"
        >
          {text}
        </a>
      );
    },
    list(body: ReactNode, ordered: boolean) {
      const Type = ordered ? 'ol' : 'ul';
      return (
        <Type
          key={Math.random()}
          className={`${ordered ? 'list-decimal' : 'list-disc'} pl-4 mb-2 last:mb-1 marker:text-muted-foreground/60 text-muted-foreground`}
        >
          {body}
        </Type>
      );
    },
    listItem(text: ReactNode) {
      return (
        <li key={Math.random()} className="mb-0.5 text-muted-foreground">
          {text}
        </li>
      );
    },
    blockquote(text: ReactNode) {
      return (
        <blockquote
          key={Math.random()}
          className="border-l-2 border-border pl-2 py-1 my-2 italic bg-muted/30 text-muted-foreground rounded"
        >
          {text}
        </blockquote>
      );
    },
    hr() {
      return <hr key={Math.random()} className="my-3 border-t border-border/80" />;
    },
    table(children: ReactNode[]) {
      return (
        <div key={Math.random()} className="overflow-x-auto mb-2">
          <table className="min-w-full border border-border/60 rounded text-xs">{children}</table>
        </div>
      );
    },
    tableRow(content: ReactNode) {
      return (
        <tr key={Math.random()} className="border-b border-border/80">
          {content}
        </tr>
      );
    },
    tableCell(children: ReactNode[], flags: TableFlags) {
      const align = flags.align ? `text-${flags.align}` : '';

      // Map children with stable keys
      const childrenWithKeys = Array.isArray(children)
        ? children.map((child, index) => <React.Fragment key={`cell-child-${index}`}>{child}</React.Fragment>)
        : children;

      return flags.header ? (
        <th className={`px-1.5 py-1 font-medium bg-muted/60 text-foreground border border-border/60 ${align}`}>
          {childrenWithKeys}
        </th>
      ) : (
        <td className={`px-1.5 py-1 text-muted-foreground border border-border/60 ${align}`}>{childrenWithKeys}</td>
      );
    },
  };

  return (
    <div className="markdown-content space-y-1">
      <Marked value={content} renderer={renderer} />
    </div>
  );
});
MarkdownRenderer.displayName = 'MarkdownRenderer';

// Helper function to check if content is empty (just newlines)
const isEmptyContent = (content: string): boolean => {
  return !content || content.trim() === '' || /^\n+$/.test(content);
};

export const ReasoningPartView: React.FC<ReasoningPartViewProps> = React.memo(
  ({ part, sectionKey, parallelTool, isComplete, expandedOverride, isFullscreen, setIsFullscreen, setIsExpanded }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [autoExpanded, setAutoExpanded] = React.useState(true);
    const collapseTimerRef = useRef<number | null>(null);

    // isThinking drives the header spinner and label. For token-by-token models
    // (e.g. Minimax) isComplete flickers true/false between every token because
    // each token part gets state:'done' the moment it's emitted. A 150 ms debounce
    // on the false→true transition for isThinking absorbs those sub-token gaps so
    // the header never flickers "Thinking ↔ Reasoning" mid-stream.
    const [isThinking, setIsThinking] = React.useState(!isComplete);
    const thinkingTimerRef = useRef<number | null>(null);

    useEffect(() => {
      if (!isComplete) {
        // Immediately back to thinking whenever a new token arrives.
        if (thinkingTimerRef.current != null) {
          window.clearTimeout(thinkingTimerRef.current);
          thinkingTimerRef.current = null;
        }
        setIsThinking(true);
      } else {
        // Debounce: only leave thinking mode if isComplete stays true for 150 ms.
        if (thinkingTimerRef.current == null) {
          thinkingTimerRef.current = window.setTimeout(() => {
            setIsThinking(false);
            thinkingTimerRef.current = null;
          }, 150);
        }
      }
      return () => {
        if (thinkingTimerRef.current != null) {
          window.clearTimeout(thinkingTimerRef.current);
          thinkingTimerRef.current = null;
        }
      };
    }, [isComplete, part.text]);

    // Auto-scroll to bottom when new content is added during reasoning
    useEffect(() => {
      if (isThinking && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [isThinking, part.text]);

    // Also scroll when details change, even if isThinking doesn't change
    useEffect(() => {
      if (isThinking && scrollRef.current && part.text && part.text.length > 0) {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 10);
      }
    }, [part.text, isThinking]);

    const hasNonEmptyReasoning = part.text && !isEmptyContent(part.text);
    const isExpanded = expandedOverride ?? autoExpanded;

    // Avoid "close then open" flicker when providers emit back-to-back reasoning parts.
    // We only auto-collapse after reasoning stays complete for a moment.
    useEffect(() => {
      if (collapseTimerRef.current != null) {
        window.clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }

      // Manual toggle always wins
      if (expandedOverride !== undefined) return;

      if (isThinking) {
        setAutoExpanded(true);
        return;
      }

      collapseTimerRef.current = window.setTimeout(() => {
        setAutoExpanded(false);
        collapseTimerRef.current = null;
      }, 900);

      return () => {
        if (collapseTimerRef.current != null) {
          window.clearTimeout(collapseTimerRef.current);
          collapseTimerRef.current = null;
        }
      };
    }, [expandedOverride, isThinking, part.text]);

    // Hide empty reasoning only once we're done thinking; during streaming we still want the "Thinking" UI.
    if (!hasNonEmptyReasoning && !isThinking) {
      return null;
    }

    return (
      <div className="my-2" key={sectionKey}>
        <div className={cn('bg-accent', 'border border-border/80 rounded-lg overflow-hidden')}>
          {/* Header - Always visible */}
          <div
            onClick={() => !isThinking && setIsExpanded(!isExpanded)}
            className={cn(
              'flex items-center justify-between py-2 px-2.5',
              !isThinking && 'cursor-pointer hover:bg-muted/50 transition-colors',
              'bg-background/80',
            )}
          >
            <div className="flex items-center gap-2">
              {isThinking ? (
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'px-1.5 py-0.5 rounded-md',
                      'border border-border/80',
                      'bg-muted/50',
                      'text-muted-foreground',
                      'flex items-center gap-1.5',
                      'animate-pulse',
                    )}
                  >
                    <div className="size-2.5 text-muted-foreground">
                      <SpinnerIcon />
                    </div>
                    <span className="text-xs font-normal">Thinking</span>
                    {parallelTool && <span className="text-xs font-normal opacity-60">({parallelTool})</span>}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3 text-muted-foreground" strokeWidth={2} />
                  <div className="text-xs font-normal text-muted-foreground">Reasoning</div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isThinking && (
                <div className="text-muted-foreground">
                  {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </div>
              )}

              {(isThinking || isExpanded) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFullscreen(!isFullscreen);
                  }}
                  className="p-0.5 hover:bg-muted rounded text-muted-foreground transition-colors"
                  aria-label={isFullscreen ? 'Minimize' : 'Maximize'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="size-3 text-muted-foreground" strokeWidth={2} />
                  ) : (
                    <Maximize2 className="size-3 text-muted-foreground" strokeWidth={2} />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Content - Shown when in progress or when expanded */}
          <AnimatePresence initial={false}>
            {(isThinking || isExpanded) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div>
                  <div className="h-px w-full bg-border/80"></div>
                  <div
                    ref={scrollRef}
                    className={cn(
                      'overflow-y-auto bg-muted/20',
                      'scrollbar-thin scrollbar-thumb-rounded-full scrollbar-thumb-border',
                      'scrollbar-track-transparent',
                      {
                        'max-h-[180px] rounded-b-lg': !isFullscreen,
                        'max-h-[60vh] rounded-b-lg': isFullscreen,
                      },
                    )}
                  >
                    <div className="px-2.5 py-2 text-xs leading-relaxed">
                      <div className="text-muted-foreground prose prose-sm max-w-none">
                        {hasNonEmptyReasoning ? (
                          !isThinking ? (
                            <MarkdownRenderer content={remend(part.text)} />
                          ) : (
                            <p className="text-muted-foreground whitespace-pre-wrap wrap-break-words">{part.text}</p>
                          )
                        ) : (
                          <div className="text-xs text-muted-foreground/70">Thinking…</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  },
);

ReasoningPartView.displayName = 'ReasoningPartView';
