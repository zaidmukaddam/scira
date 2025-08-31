import 'katex/dist/katex.min.css';

import { Geist_Mono } from 'next/font/google';
import { highlight } from 'sugar-high';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import Latex from 'react-latex-next';
import Marked, { ReactRenderer } from 'marked-react';
import React, { useCallback, useMemo, useState, Fragment, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Check, Copy, WrapText, ArrowLeftRight, Download } from 'lucide-react';
import { toast } from 'sonner';

interface MarkdownRendererProps {
  content: string;
  isUserMessage?: boolean;
}

interface CitationLink {
  text: string;
  link: string;
}

// Citation source configuration
interface CitationSourceConfig {
  name: string;
  pattern: RegExp;
  urlGenerator: (title: string, source: string) => string | null;
}

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  preload: true,
  display: 'swap',
});

const citationSources: CitationSourceConfig[] = [
  {
    name: 'Wikipedia',
    pattern: /Wikipedia/i,
    urlGenerator: (title: string, source: string) => {
      const searchTerm = `${title} ${source.replace(/\s+[-–—]\s+Wikipedia/i, '')}`.trim();
      return `https://en.wikipedia.org/wiki/${encodeURIComponent(searchTerm.replace(/\s+/g, '_'))}`;
    },
  },
  {
    name: 'arXiv',
    pattern: /arXiv:(\d+\.\d+)/i,
    urlGenerator: (title: string, source: string) => {
      const match = source.match(/arXiv:(\d+\.\d+)/i);
      return match ? `https://arxiv.org/abs/${match[1]}` : null;
    },
  },
  {
    name: 'GitHub',
    pattern: /github\.com\/[^\/]+\/[^\/\s]+/i,
    urlGenerator: (title: string, source: string) => {
      const match = source.match(/(https?:\/\/github\.com\/[^\/]+\/[^\/\s]+)/i);
      return match ? match[1] : null;
    },
  },
  {
    name: 'DOI',
    pattern: /doi:(\S+)/i,
    urlGenerator: (title: string, source: string) => {
      const match = source.match(/doi:(\S+)/i);
      return match ? `https://doi.org/${match[1]}` : null;
    },
  },
];

// Helper function to process citations
const processCitation = (title: string, source: string): { text: string; url: string } | null => {
  for (const citationSource of citationSources) {
    if (citationSource.pattern.test(source)) {
      const url = citationSource.urlGenerator(title, source);
      if (url) {
        return {
          text: `${title} - ${source}`,
          url,
        };
      }
    }
  }
  return null;
};

const isValidUrl = (str: string) => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

// Stable key generator based on content hash
const generateStableKey = (content: string, index: number): string => {
  // Use a simple hash function for stability
  let hash = 0;
  const str = `${content.slice(0, 50)}-${index}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `key-${Math.abs(hash)}-${index}`;
};

interface CodeBlockProps {
  language: string | undefined;
  children: string;
  elementKey: string;
}

// Memoized CodeBlock with lazy syntax highlighting
const CodeBlock: React.FC<CodeBlockProps> = React.memo(
  ({ language, children, elementKey }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isWrapped, setIsWrapped] = useState(false);
    const [highlightedCode, setHighlightedCode] = useState<string>(() => {
      return highlight(children);
    });

    const lineCount = useMemo(() => children.split('\n').length, [children]);

    useEffect(() => {
      let cancelled = false;

      const performHighlight = async () => {
        if (children.length >= 5000) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }

        if (!cancelled) {
          setHighlightedCode(highlight(children));
        }
      };

      performHighlight();

      return () => {
        cancelled = true;
      };
    }, [children]);

    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(children);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast.success('Code copied to clipboard');
      } catch (error) {
        console.error('Failed to copy code:', error);
        toast.error('Failed to copy code');
      }
    }, [children]);

    const toggleWrap = useCallback(() => {
      setIsWrapped((prev) => {
        const newState = !prev;
        toast.success(newState ? 'Code wrap enabled' : 'Code wrap disabled');
        return newState;
      });
    }, []);

    return (
      <div className="group relative my-5 rounded-md border border-border bg-accent overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-accent border-b border-border">
          <div className="flex items-center gap-2">
            {language && (
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{language}</span>
            )}
            <span className="text-xs text-muted-foreground">{lineCount} lines</span>
          </div>

          <div className="flex gap-1">
            <button
              onClick={toggleWrap}
              className={cn(
                'p-1 rounded border border-border bg-background shadow-sm transition-colors',
                isWrapped ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
              title={isWrapped ? 'Disable wrap' : 'Enable wrap'}
            >
              {isWrapped ? <ArrowLeftRight size={12} /> : <WrapText size={12} />}
            </button>
            <button
              onClick={handleCopy}
              className={cn(
                'p-1 rounded border border-border bg-background shadow-sm transition-colors',
                isCopied ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
              title={isCopied ? 'Copied!' : 'Copy code'}
            >
              {isCopied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        <div className="relative">
          <div
            className={cn(
              'font-mono text-sm leading-relaxed p-2',
              isWrapped && 'whitespace-pre-wrap break-words',
              !isWrapped && 'whitespace-pre overflow-x-auto',
            )}
            style={{
              fontFamily: geistMono.style.fontFamily,
            }}
            dangerouslySetInnerHTML={{
              __html: highlightedCode,
            }}
          />
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.children === nextProps.children &&
      prevProps.language === nextProps.language &&
      prevProps.elementKey === nextProps.elementKey
    );
  },
);

CodeBlock.displayName = 'CodeBlock';

// Optimized content processor with chunking
const useProcessedContent = (content: string, maxProcessingTime = 50) => {
  const [result, setResult] = useState<{
    processedContent: string;
    citations: CitationLink[];
    latexBlocks: Array<{ id: string; content: string; isBlock: boolean }>;
    isProcessing: boolean;
  }>({
    processedContent: content,
    citations: [],
    latexBlocks: [],
    isProcessing: true,
  });

  useEffect(() => {
    let cancelled = false;

    const processContent = async () => {
      const startTime = performance.now();
      const citations: CitationLink[] = [];
      const latexBlocks: Array<{ id: string; content: string; isBlock: boolean }> = [];
      let modifiedContent = content;

      // Process in chunks if content is large
      const shouldChunk = content.length > 10000;

      try {
        // Extract and protect code blocks
        const codeBlocks: Array<{ id: string; content: string }> = [];
        const codeBlockPatterns = [/```[\s\S]*?```/g, /`[^`\n]+`/g];

        for (const pattern of codeBlockPatterns) {
          modifiedContent = modifiedContent.replace(pattern, (match) => {
            const id = `CODEBLOCK${codeBlocks.length}END`;
            codeBlocks.push({ id, content: match });
            return id;
          });

          if (shouldChunk && performance.now() - startTime > maxProcessingTime) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        // Extract monetary amounts
        const monetaryBlocks: Array<{ id: string; content: string }> = [];
        const monetaryRegex =
          /(^|[\s([>])\$\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:per\s+(?:million|thousand|token|month|year)|\/(?:month|year|token)|(?:million|thousand|billion|k|K|M|B)))?(?=$|[\s).,;!?<\]])/g;

        modifiedContent = modifiedContent.replace(monetaryRegex, (match, prefix: string) => {
          const id = `MONETARY${monetaryBlocks.length}END`;
          monetaryBlocks.push({ id, content: match.slice(prefix.length) });
          return `${prefix}${id}`;
        });

        // Extract LaTeX blocks
        const blockPatterns = [
          { pattern: /\\\[([\s\S]*?)\\\]/g, isBlock: true },
          { pattern: /\$\$([\s\S]*?)\$\$/g, isBlock: true },
        ];

        for (const { pattern, isBlock } of blockPatterns) {
          modifiedContent = modifiedContent.replace(pattern, (match) => {
            const id = `LATEXBLOCK${latexBlocks.length}END`;
            latexBlocks.push({ id, content: match, isBlock });
            return id;
          });
        }

        const inlinePatterns = [
          { pattern: /\\\(([\s\S]*?)\\\)/g, isBlock: false },
          { pattern: /\$(?![{#])[^\$\n]+?\$/g, isBlock: false },
        ];

        for (const { pattern, isBlock } of inlinePatterns) {
          modifiedContent = modifiedContent.replace(pattern, (match) => {
            const id = `LATEXINLINE${latexBlocks.length}END`;
            latexBlocks.push({ id, content: match, isBlock });
            return id;
          });
        }

        // Process citations (simplified for performance)
        const refWithUrlRegex =
          /(?:\[(?:(?:\[?(PDF|DOC|HTML)\]?\s+)?([^\]]+))\]|\b([^.!?\n]+?(?:\s+[-–—]\s+\w+|\s+\([^)]+\)))\b)(?:\s*(?:\(|\[\s*|\s+))(https?:\/\/[^\s)]+)(?:\s*[)\]]|\s|$)/g;

        modifiedContent = modifiedContent.replace(refWithUrlRegex, (match, docType, bracketText, plainText, url) => {
          const text = bracketText || plainText;
          const fullText = (docType ? `[${docType}] ` : '') + text;
          const cleanUrl = url.replace(/[.,;:]+$/, '');
          citations.push({ text: fullText.trim(), link: cleanUrl });
          return `[${fullText.trim()}](${cleanUrl})`;
        });

        // Restore protected blocks
        monetaryBlocks.forEach(({ id, content }) => {
          modifiedContent = modifiedContent.replace(id, content);
        });

        codeBlocks.forEach(({ id, content }) => {
          modifiedContent = modifiedContent.replace(id, content);
        });

        if (!cancelled) {
          setResult({
            processedContent: modifiedContent,
            citations,
            latexBlocks,
            isProcessing: false,
          });
        }
      } catch (error) {
        console.error('Error processing content:', error);
        if (!cancelled) {
          setResult({
            processedContent: content,
            citations: [],
            latexBlocks: [],
            isProcessing: false,
          });
        }
      }
    };

    processContent();

    return () => {
      cancelled = true;
    };
  }, [content, maxProcessingTime]);

  return result;
};

const InlineCode: React.FC<{ code: string; elementKey: string }> = React.memo(({ code }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
      toast.success('Code copied to clipboard');
    } catch (error) {
      console.error('Failed to copy code:', error);
      toast.error('Failed to copy code');
    }
  }, [code]);

  return (
    <code
      className={cn(
        'inline rounded px-1 py-0.5 font-mono text-[0.9em]',
        'bg-muted/50',
        'text-foreground/85',
        'before:content-none after:content-none',
        'hover:bg-muted/70 transition-colors duration-150 cursor-pointer',
        'align-baseline',
        isCopied && 'ring-1 ring-primary/30 bg-primary/5',
      )}
      style={{
        fontFamily: geistMono.style.fontFamily,
        fontSize: '0.85em',
        lineHeight: 'inherit',
      }}
      onClick={handleCopy}
      title={isCopied ? 'Copied!' : 'Click to copy'}
    >
      {code}
    </code>
  );
});

InlineCode.displayName = 'InlineCode';

const MarkdownTableWithActions: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showActions, setShowActions] = useState(false);

  const csvUtils = useMemo(
    () => ({
      escapeCsvValue: (value: string): string => {
        const needsQuotes = /[",\n]/.test(value);
        const escaped = value.replace(/"/g, '""');
        return needsQuotes ? `"${escaped}"` : escaped;
      },
      buildCsvFromTable: (table: HTMLTableElement): string => {
        const rows = Array.from(table.querySelectorAll('tr')) as HTMLTableRowElement[];
        const csvLines: string[] = [];
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('th,td')) as HTMLTableCellElement[];
          if (cells.length > 0) {
            const line = cells
              .map((cell) => csvUtils.escapeCsvValue(cell.innerText.replace(/\u00A0/g, ' ').trim()))
              .join(',');
            csvLines.push(line);
          }
        }
        return csvLines.join('\n');
      },
    }),
    [],
  );

  const handleDownloadCsv = useCallback(() => {
    const tableEl = containerRef.current?.querySelector('[data-slot="table"]') as HTMLTableElement | null;
    if (!tableEl) return;

    try {
      const csv = csvUtils.buildCsvFromTable(tableEl);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:T]/g, '-').replace(/\..+/, '');
      a.href = url;
      a.download = `table-${timestamp}.csv`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download CSV:', error);
    }
  }, [csvUtils]);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={cn(
          'absolute -top-3 -right-3 z-10 transition-opacity duration-200',
          showActions ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover:opacity-100',
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              className="size-7 text-xs shadow-sm rounded-sm"
              onClick={handleDownloadCsv}
              aria-label="Download CSV"
            >
              <Download className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={2}>
            Download CSV
          </TooltipContent>
        </Tooltip>
      </div>
      <div ref={containerRef}>
        <Table className="!border !rounded-lg !m-0">{children}</Table>
      </div>
    </div>
  );
});

MarkdownTableWithActions.displayName = 'MarkdownTableWithActions';

const LinkPreview = React.memo(({ href, title }: { href: string; title?: string }) => {
  const domain = useMemo(() => {
    try {
      return new URL(href).hostname;
    } catch {
      return '';
    }
  }, [href]);

  if (!domain) return null;

  return (
    <div className="flex flex-col bg-accent text-xs m-0">
      <div className="flex items-center h-6 space-x-1.5 px-2 pt-2 text-xs text-muted-foreground">
        <Image
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt=""
          width={12}
          height={12}
          className="rounded-sm"
        />
        <span className="truncate font-medium">{domain}</span>
      </div>
      {title && (
        <div className="px-2 pb-2 pt-1">
          <h3 className="font-normal text-sm m-0 text-foreground line-clamp-3">{title}</h3>
        </div>
      )}
    </div>
  );
});

LinkPreview.displayName = 'LinkPreview';

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isUserMessage = false }) => {
  const { processedContent, citations: extractedCitations, latexBlocks, isProcessing } = useProcessedContent(content);
  const citationLinks = extractedCitations;

  // Track element indices for stable keys
  const elementIndices = useRef({
    paragraph: 0,
    code: 0,
    heading: 0,
    list: 0,
    listItem: 0,
    blockquote: 0,
    table: 0,
    tableRow: 0,
    tableCell: 0,
    link: 0,
    text: 0,
    hr: 0,
  });

  // Reset indices when content changes
  useEffect(() => {
    elementIndices.current = {
      paragraph: 0,
      code: 0,
      heading: 0,
      list: 0,
      listItem: 0,
      blockquote: 0,
      table: 0,
      tableRow: 0,
      tableCell: 0,
      link: 0,
      text: 0,
      hr: 0,
    };
  }, [content]);

  const renderHoverCard = useCallback(
    (href: string, text: React.ReactNode, isCitation: boolean = false, citationText?: string) => {
      const title = citationText || (typeof text === 'string' ? text : '');

      return (
        <HoverCard openDelay={10}>
          <HoverCardTrigger asChild>
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={
                isCitation
                  ? 'cursor-pointer text-xs no-underline text-primary py-0.5 px-1.25 m-0! bg-primary/10 rounded-sm font-medium inline-flex items-center -translate-y-[1px] leading-none hover:bg-primary/20 focus:outline-none focus:ring-1 focus:ring-primary align-baseline'
                  : 'text-primary bg-primary/10 no-underline hover:underline font-medium'
              }
            >
              {text}
            </Link>
          </HoverCardTrigger>
          <HoverCardContent
            side="top"
            align="start"
            sideOffset={5}
            className="w-64 p-0 shadow-lg border border-primary/30 rounded-md overflow-hidden bg-background"
          >
            <LinkPreview href={href} title={title} />
          </HoverCardContent>
        </HoverCard>
      );
    },
    [],
  );

  const renderCitation = useCallback(
    (index: number, citationText: string, href: string, key: string) => {
      return (
        <span className="inline-flex items-baseline relative whitespace-normal" key={key}>
          {renderHoverCard(href, index + 1, true, citationText)}
        </span>
      );
    },
    [renderHoverCard],
  );

  const renderer: Partial<ReactRenderer> = useMemo(
    () => ({
      text(text: string) {
        const blockPattern = /LATEXBLOCK(\d+)END/g;
        const inlinePattern = /LATEXINLINE(\d+)END/g;

        if (!blockPattern.test(text) && !inlinePattern.test(text)) {
          return text;
        }

        blockPattern.lastIndex = 0;
        inlinePattern.lastIndex = 0;

        const components: any[] = [];
        let lastEnd = 0;
        const allMatches: Array<{ match: RegExpExecArray; isBlock: boolean }> = [];

        let match;
        while ((match = blockPattern.exec(text)) !== null) {
          allMatches.push({ match, isBlock: true });
        }
        while ((match = inlinePattern.exec(text)) !== null) {
          allMatches.push({ match, isBlock: false });
        }

        allMatches.sort((a, b) => a.match.index - b.match.index);

        allMatches.forEach(({ match, isBlock }, idx) => {
          const fullMatch = match[0];
          const start = match.index;

          if (start > lastEnd) {
            const textContent = text.slice(lastEnd, start);
            const key = generateStableKey(textContent, elementIndices.current.text++);
            components.push(<span key={key}>{textContent}</span>);
          }

          const latexBlock = latexBlocks.find((block) => block.id === fullMatch);
          if (latexBlock) {
            const key = generateStableKey(latexBlock.content, elementIndices.current.text++);
            if (isBlock) {
              components.push(
                <Latex
                  key={key}
                  delimiters={[
                    { left: '$$', right: '$$', display: true },
                    { left: '\\[', right: '\\]', display: true },
                  ]}
                  strict={false}
                >
                  {latexBlock.content}
                </Latex>,
              );
            } else {
              components.push(
                <Latex
                  key={key}
                  delimiters={[
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false },
                  ]}
                  strict={false}
                >
                  {latexBlock.content}
                </Latex>,
              );
            }
          }

          lastEnd = start + fullMatch.length;
        });

        if (lastEnd < text.length) {
          const textContent = text.slice(lastEnd);
          const key = generateStableKey(textContent, elementIndices.current.text++);
          components.push(<span key={key}>{textContent}</span>);
        }

        return components.length === 1 ? components[0] : <Fragment>{components}</Fragment>;
      },
      hr() {
        const key = generateStableKey('hr', elementIndices.current.hr++);
        return <hr key={key} className="my-6 border-border" />;
      },
      paragraph(children) {
        const key = generateStableKey(String(children).slice(0, 50), elementIndices.current.paragraph++);

        if (typeof children === 'string') {
          const blockMatch = children.match(/^LATEXBLOCK(\d+)END$/);
          if (blockMatch) {
            const latexBlock = latexBlocks.find((block) => block.id === children);
            if (latexBlock && latexBlock.isBlock) {
              return (
                <div className="my-6 text-center" key={key}>
                  <Latex
                    delimiters={[
                      { left: '$$', right: '$$', display: true },
                      { left: '\\[', right: '\\]', display: true },
                    ]}
                    strict={false}
                  >
                    {latexBlock.content}
                  </Latex>
                </div>
              );
            }
          }
        }

        return (
          <p
            key={key}
            className={`${isUserMessage ? 'leading-relaxed text-foreground !m-0' : ''} my-5 leading-relaxed text-foreground`}
          >
            {children}
          </p>
        );
      },
      code(children, language) {
        const key = generateStableKey(String(children).slice(0, 50), elementIndices.current.code++);
        return (
          <CodeBlock language={language} elementKey={key} key={key}>
            {String(children)}
          </CodeBlock>
        );
      },
      codespan(code) {
        const codeString = typeof code === 'string' ? code : String(code || '');
        const key = generateStableKey(codeString, elementIndices.current.code++);
        return <InlineCode key={key} elementKey={key} code={codeString} />;
      },
      link(href, text) {
        const key = generateStableKey(href, elementIndices.current.link++);

        if (href.startsWith('mailto:')) {
          const email = href.replace('mailto:', '');
          return (
            <span key={key} className="break-all">
              {email}
            </span>
          );
        }

        if (isUserMessage) {
          const linkText = typeof text === 'string' ? text : href;
          if (linkText !== href && linkText !== '') {
            return (
              <span key={key} className="break-all">
                {linkText} ({href})
              </span>
            );
          }
          return (
            <span key={key} className="break-all">
              {href}
            </span>
          );
        }

        let citationIndex = citationLinks.findIndex((link) => link.link === href);
        if (citationIndex !== -1) {
          const citationText = citationLinks[citationIndex].text;
          return renderCitation(citationIndex, citationText, href, key);
        }

        if (isValidUrl(href)) {
          citationLinks.push({ text: typeof text === 'string' ? text : href, link: href });
          citationIndex = citationLinks.length - 1;
          const citationText = citationLinks[citationIndex].text;
          return renderCitation(citationIndex, citationText, href, key);
        } else {
          citationLinks.push({ text: typeof text === 'string' ? text : href, link: href });
          citationIndex = citationLinks.length - 1;
          const citationText = citationLinks[citationIndex].text;
          return renderCitation(citationIndex, citationText, href, key);
        }
      },
      heading(children, level) {
        const key = generateStableKey(String(children).slice(0, 50), elementIndices.current.heading++);
        const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements;
        const sizeClasses =
          {
            1: 'text-2xl md:text-3xl font-extrabold mt-4 mb-4',
            2: 'text-xl md:text-2xl font-bold mt-4 mb-3',
            3: 'text-lg md:text-xl font-semibold mt-4 mb-3',
            4: 'text-base md:text-lg font-medium mt-4 mb-2',
            5: 'text-sm md:text-base font-medium mt-4 mb-2',
            6: 'text-xs md:text-sm font-medium mt-4 mb-2',
          }[level] || '';

        return (
          <HeadingTag key={key} className={`${sizeClasses} text-foreground tracking-tight`}>
            {children}
          </HeadingTag>
        );
      },
      list(children, ordered) {
        const key = generateStableKey('list', elementIndices.current.list++);
        const ListTag = ordered ? 'ol' : 'ul';
        return (
          <ListTag
            key={key}
            className={`my-5 pl-6 space-y-2 text-foreground ${ordered ? 'list-decimal' : 'list-disc'}`}
          >
            {children}
          </ListTag>
        );
      },
      listItem(children) {
        const key = generateStableKey('listitem', elementIndices.current.listItem++);
        return (
          <li key={key} className="pl-1 leading-relaxed">
            {children}
          </li>
        );
      },
      blockquote(children) {
        const key = generateStableKey('blockquote', elementIndices.current.blockquote++);
        return (
          <blockquote
            key={key}
            className="my-6 border-l-4 border-primary/30 pl-4 py-1 text-foreground italic bg-muted/50 rounded-r-md"
          >
            {children}
          </blockquote>
        );
      },
      table(children) {
        const key = generateStableKey('table', elementIndices.current.table++);
        return <MarkdownTableWithActions key={key}>{children}</MarkdownTableWithActions>;
      },
      tableRow(children) {
        const key = generateStableKey('tablerow', elementIndices.current.tableRow++);
        return <TableRow key={key}>{children}</TableRow>;
      },
      tableCell(children, flags) {
        const key = generateStableKey('tablecell', elementIndices.current.tableCell++);
        const alignClass = flags.align ? `text-${flags.align}` : 'text-left';
        const isHeader = flags.header;

        return isHeader ? (
          <TableHead
            key={key}
            className={cn(
              alignClass,
              'border-r border-border last:border-r-0 bg-muted/50 font-semibold !p-2 !m-1 !text-wrap',
            )}
          >
            {children}
          </TableHead>
        ) : (
          <TableCell
            key={key}
            className={cn(alignClass, 'border-r border-border last:border-r-0 !p-2 !m-1 !text-wrap')}
          >
            {children}
          </TableCell>
        );
      },
      tableHeader(children) {
        const key = generateStableKey('tableheader', elementIndices.current.table++);
        return (
          <TableHeader key={key} className="!p-1 !m-1">
            {children}
          </TableHeader>
        );
      },
      tableBody(children) {
        const key = generateStableKey('tablebody', elementIndices.current.table++);
        return (
          <TableBody key={key} className="!text-wrap !m-1">
            {children}
          </TableBody>
        );
      },
    }),
    [latexBlocks, isUserMessage, renderCitation, renderHoverCard],
  );

  // Show a loading state for very large content
  if (isProcessing && content.length > 50000) {
    return (
      <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none text-foreground font-sans">
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-muted rounded w-full mb-4"></div>
          <div className="h-4 bg-muted rounded w-5/6 mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none text-foreground font-sans">
      <Marked renderer={renderer}>{processedContent}</Marked>
    </div>
  );
};

export const CopyButton = React.memo(({ text }: { text: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = React.useCallback(async () => {
    if (!navigator.clipboard) {
      return;
    }
    await navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success('Copied to clipboard');
  }, [text]);

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2 text-xs rounded-full">
      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
});

CopyButton.displayName = 'CopyButton';

export { MarkdownRenderer };
