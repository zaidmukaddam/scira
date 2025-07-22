import React, { useRef, useEffect, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minimize2, Maximize2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import Marked from 'marked-react';

export interface ReasoningPart {
  type: 'reasoning';
  reasoning: string;
  details: Array<{ type: 'text'; text: string }>;
}

interface ReasoningPartViewProps {
  part: ReasoningPart;
  sectionKey: string;
  isComplete: boolean;
  duration: string | null;
  parallelTool: string | null;
  isExpanded: boolean;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
  setIsExpanded: (v: boolean) => void;
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
        <pre key={Math.random()} className="bg-neutral-200 dark:bg-neutral-800 p-2 rounded-md overflow-x-auto my-3">
          <code className="text-neutral-800 dark:text-neutral-300 text-xs">{code}</code>
        </pre>
      );
    },
    codespan(code: string) {
      return (
        <code key={Math.random()} className="bg-neutral-200 dark:bg-neutral-800 px-1 py-0.5 rounded text-xs">
          {code}
        </code>
      );
    },
    paragraph(text: ReactNode) {
      return (
        <p key={Math.random()} className="mb-3 last:mb-0">
          {text}
        </p>
      );
    },
    heading(text: ReactNode, level: number) {
      const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;
      const classes = {
        h1: 'text-base font-bold mb-3 mt-4',
        h2: 'text-sm font-bold mb-2 mt-4',
        h3: 'text-sm font-semibold mb-2 mt-3',
        h4: 'text-xs font-semibold mb-1 mt-2',
        h5: 'text-xs font-medium mb-1 mt-2',
        h6: 'text-xs font-medium mb-1 mt-2',
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
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {text}
        </a>
      );
    },
    list(body: ReactNode, ordered: boolean) {
      const Type = ordered ? 'ol' : 'ul';
      return (
        <Type key={Math.random()} className={`${ordered ? 'list-decimal' : 'list-disc'} pl-5 mb-3 last:mb-1`}>
          {body}
        </Type>
      );
    },
    listItem(text: ReactNode) {
      return (
        <li key={Math.random()} className="mb-1">
          {text}
        </li>
      );
    },
    blockquote(text: ReactNode) {
      return (
        <blockquote
          key={Math.random()}
          className="border-l-2 border-neutral-300 dark:border-neutral-700 pl-3 py-1 my-3 italic"
        >
          {text}
        </blockquote>
      );
    },
    hr() {
      return <hr key={Math.random()} className="my-4 border-t border-neutral-200 dark:border-neutral-800" />;
    },
    table(children: ReactNode[]) {
      return (
        <div key={Math.random()} className="overflow-x-auto mb-3">
          <table className="min-w-full border-collapse text-xs">{children}</table>
        </div>
      );
    },
    tableRow(content: ReactNode) {
      return (
        <tr key={Math.random()} className="border-b border-neutral-200 dark:border-neutral-800">
          {content}
        </tr>
      );
    },
    tableCell(children: ReactNode[], flags: TableFlags) {
      const align = flags.align ? `text-${flags.align}` : '';

      return flags.header ? (
        <th key={Math.random()} className={`px-2 py-1 font-semibold bg-neutral-100 dark:bg-neutral-800 ${align}`}>
          {children}
        </th>
      ) : (
        <td key={Math.random()} className={`px-2 py-1 ${align}`}>
          {children}
        </td>
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
  ({
    part,
    sectionKey,
    isComplete,
    duration,
    parallelTool,
    isExpanded,
    isFullscreen,
    setIsFullscreen,
    setIsExpanded,
  }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new content is added during reasoning
    useEffect(() => {
      if (!isComplete && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [isComplete, part.details]);

    // Also scroll when details change, even if isComplete doesn't change
    useEffect(() => {
      if (!isComplete && scrollRef.current && part.details && part.details.length > 0) {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 10);
      }
    }, [part.details, isComplete]);

    // Check if all content is empty (just newlines or whitespace)
    const hasNonEmptyDetails =
      part.details && part.details.some((detail) => detail.type === 'text' && !isEmptyContent(detail.text));
    const hasNonEmptyReasoning = part.reasoning && !isEmptyContent(part.reasoning);

    // If all content is empty, don't render the reasoning section
    if (!hasNonEmptyDetails && !hasNonEmptyReasoning) {
      return null;
    }

    return (
      <div className="my-3" key={sectionKey}>
        <div
          className={cn(
            'bg-neutral-50 dark:bg-neutral-900',
            'border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden',
            'shadow-sm dark:shadow-md',
          )}
        >
          {/* Header - Always visible */}
          <div
            onClick={() => isComplete && setIsExpanded(!isExpanded)}
            className={cn(
              'flex items-center justify-between py-2.5 px-3',
              isComplete && 'cursor-pointer',
              'bg-white dark:bg-neutral-900',
            )}
          >
            <div className="flex items-center gap-2">
              {!isComplete ? (
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'px-2 py-0.5 rounded-full',
                      'border border-blue-100 dark:border-blue-900/40',
                      'bg-blue-50 dark:bg-blue-900/20',
                      'text-blue-600 dark:text-blue-400',
                      'flex items-center gap-1.5',
                      'shadow-sm',
                      'animate-pulse',
                    )}
                  >
                    <div className="size-3 text-blue-500 dark:text-blue-400">
                      <SpinnerIcon />
                    </div>
                    <span className="text-xs font-medium">Thinking</span>
                    {parallelTool && <span className="text-xs font-normal opacity-70">({parallelTool})</span>}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-500 dark:text-amber-400" strokeWidth={2} />
                  <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Reasoning</div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isComplete && (
                <div className="text-neutral-400 dark:text-neutral-500">
                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </div>
              )}

              {(!isComplete || isExpanded) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFullscreen(!isFullscreen);
                  }}
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-full text-neutral-500 dark:text-neutral-400 transition-colors"
                  aria-label={isFullscreen ? 'Minimize' : 'Maximize'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="size-3.5 text-violet-500 dark:text-violet-400" strokeWidth={2} />
                  ) : (
                    <Maximize2 className="size-3.5 text-violet-500 dark:text-violet-400" strokeWidth={2} />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Content - Shown when in progress or when expanded */}
          <AnimatePresence initial={false}>
            {(!isComplete || isExpanded) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div>
                  <div className="h-px w-full bg-neutral-200 dark:bg-neutral-800"></div>
                  <div
                    ref={scrollRef}
                    className={cn(
                      'overflow-y-auto bg-neutral-50 dark:bg-neutral-900',
                      'scrollbar-thin scrollbar-thumb-rounded-full scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700',
                      'scrollbar-track-transparent',
                      {
                        'max-h-[250px] rounded-b-xl': !isFullscreen,
                        'max-h-[70vh] rounded-b-xl': isFullscreen,
                      },
                    )}
                  >
                    {part.details && part.details.length > 0 ? (
                      part.details
                        .filter((detail) => detail.type === 'text' && !isEmptyContent(detail.text))
                        .map((detail, detailIndex) =>
                          detail.type === 'text' ? (
                            <div
                              key={detailIndex}
                              className={cn(
                                'px-3 py-3 text-xs leading-relaxed',
                                detailIndex !==
                                  part.details.filter((d) => d.type === 'text' && !isEmptyContent(d.text)).length - 1 &&
                                  'border-b border-neutral-200 dark:border-neutral-800/80',
                              )}
                            >
                              <div className="text-neutral-800 dark:text-neutral-300 prose prose-sm dark:prose-invert max-w-none">
                                <MarkdownRenderer content={detail.text} />
                              </div>
                            </div>
                          ) : (
                            '<redacted>'
                          ),
                        )
                    ) : part.reasoning && !isEmptyContent(part.reasoning) ? (
                      <div className="px-3 py-3 text-xs leading-relaxed">
                        <div className="text-neutral-800 dark:text-neutral-300 prose prose-sm dark:prose-invert max-w-none">
                          <MarkdownRenderer content={part.reasoning} />
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 py-3 text-xs">
                        <div className="text-neutral-500 dark:text-neutral-400 italic">Waiting for reasoning...</div>
                      </div>
                    )}
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
