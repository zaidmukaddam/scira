import 'katex/dist/katex.min.css';

import { Geist_Mono } from 'next/font/google';
import { highlight } from 'sugar-high';
import Image from 'next/image';
import Link from 'next/link';
import Latex from 'react-latex-next';
import Marked, { ReactRenderer } from 'marked-react';
import React, { useCallback, useMemo, useState, Fragment, useRef, lazy, Suspense, useEffect } from 'react';

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

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  preload: true,
  display: 'swap',
});

const isValidUrl = (str: string) => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};


interface CodeBlockProps {
  language: string | undefined;
  children: string;
  elementKey: string;
}

// Lazy-loaded CodeBlock component for large blocks
const LazyCodeBlockComponent: React.FC<CodeBlockProps> = ({ children, language, elementKey }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);
  const lineCount = useMemo(() => children.split('\n').length, [children]);

  // Synchronous highlighting for better performance
  const highlightedCode = useMemo(() => {
    try {
      return children.length < 10000 ? highlight(children) : children;
    } catch (error) {
      console.warn('Syntax highlighting failed, using plain text:', error);
      return children;
    }
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
};

const LazyCodeBlock = lazy(() => Promise.resolve({ default: LazyCodeBlockComponent }));

// Synchronous CodeBlock component for smaller blocks
const SyncCodeBlock: React.FC<CodeBlockProps> = ({ language, children, elementKey }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isWrapped, setIsWrapped] = useState(false);
  const lineCount = useMemo(() => children.split('\n').length, [children]);

  const highlightedCode = useMemo(() => {
    try {
      return highlight(children);
    } catch (error) {
      console.warn('Syntax highlighting failed, using plain text:', error);
      return children;
    }
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
};

const CodeBlock: React.FC<CodeBlockProps> = React.memo(
  ({ language, children, elementKey }) => {
    // Use lazy loading for large code blocks
    if (children.length > 5000) {
      return (
        <Suspense fallback={
          <div className="group relative my-5 rounded-md border border-border bg-accent overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-accent border-b border-border">
              <div className="flex items-center gap-2">
                {language && (
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{language}</span>
                )}
                <span className="text-xs text-muted-foreground">{children.split('\n').length} lines</span>
              </div>
            </div>
            <div className="font-mono text-sm leading-relaxed p-2 text-muted-foreground">
              <div className="animate-pulse">Loading code block...</div>
            </div>
          </div>
        }>
          <LazyCodeBlock language={language} elementKey={elementKey}>
            {children}
          </LazyCodeBlock>
        </Suspense>
      );
    }

    // Use synchronous rendering for smaller blocks
    return <SyncCodeBlock language={language} elementKey={elementKey}>{children}</SyncCodeBlock>;
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

// Optimized synchronous content processor using useMemo
const useProcessedContent = (content: string) => {
  return useMemo(() => {
    const citations: CitationLink[] = [];
    const latexBlocks: Array<{ id: string; content: string; isBlock: boolean }> = [];
    let modifiedContent = content;

    try {
      // Extract and protect code blocks FIRST
      const codeBlocks: Array<{ id: string; content: string }> = [];

      // Combined pattern that matches triple backticks first (longer matches), then single backticks
      // This prevents the issue where single backticks match parts of already-protected content
      const allCodeMatches: Array<{ match: string; index: number; length: number }> = [];

      // First, find all triple-backtick code blocks
      const tripleBacktickPattern = /```[\s\S]*?```/g;
      let match;
      while ((match = tripleBacktickPattern.exec(modifiedContent)) !== null) {
        allCodeMatches.push({
          match: match[0],
          index: match.index,
          length: match[0].length
        });
      }

      // Then, find all inline code (single backticks) that don't overlap with triple-backtick blocks
      const inlineCodePattern = /`[^`\n]+`/g;
      while ((match = inlineCodePattern.exec(modifiedContent)) !== null) {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;

        // Check if this inline code is inside a triple-backtick block
        const isInsideTripleBacktick = allCodeMatches.some(
          (m) => matchStart >= m.index && matchEnd <= m.index + m.length
        );

        if (!isInsideTripleBacktick) {
          allCodeMatches.push({
            match: match[0],
            index: match.index,
            length: match[0].length
          });
        }
      }

      // Sort by index to process in order
      allCodeMatches.sort((a, b) => a.index - b.index);

      // Replace all code blocks with placeholders
      let newContent = '';
      let lastIndex = 0;

      for (const codeMatch of allCodeMatches) {
        // Use very unique placeholder that won't match markdown syntax
        const id = `<<<CODEBLOCK_PROTECTED_${codeBlocks.length}>>>`;
        codeBlocks.push({ id, content: codeMatch.match });

        newContent += modifiedContent.slice(lastIndex, codeMatch.index) + id;
        lastIndex = codeMatch.index + codeMatch.length;
      }

      newContent += modifiedContent.slice(lastIndex);
      modifiedContent = newContent;

      // Protect table rows to preserve pipe delimiters
      const tableBlocks: Array<{ id: string; content: string }> = [];
      const tableRowPattern = /^\|.+\|$/gm;
      const tableMatches = [...modifiedContent.matchAll(tableRowPattern)];

      if (tableMatches.length > 0) {
        let lastIndex = 0;
        let newContent = '';

        for (let i = 0; i < tableMatches.length; i++) {
          const match = tableMatches[i];
          const id = `TABLEROW${tableBlocks.length}END`;
          tableBlocks.push({ id, content: match[0] });

          newContent += modifiedContent.slice(lastIndex, match.index) + id;
          lastIndex = match.index! + match[0].length;
        }

        newContent += modifiedContent.slice(lastIndex);
        modifiedContent = newContent;
      }

      // Extract monetary amounts FIRST to protect them from LaTeX patterns
      const monetaryBlocks: Array<{ id: string; content: string }> = [];
      // Match monetary amounts with optional scale words and currency codes
      // Exclude mathematical expressions by using negative lookahead for backslashes or ending $
      const monetaryRegex =
        /(^|[\s([>~≈<)])\$\d+(?:,\d{3})*(?:\.\d+)?(?:[kKmMbBtT]|\s+(?:thousand|million|billion|trillion|k|K|M|B|T))?(?:\s+(?:USD|EUR|GBP|CAD|AUD|JPY|CNY|CHF))?(?:\s*(?:per\s+(?:million|thousand|token|month|year)|\/(?:month|year|token)))?(?=\s|$|[).,;!?<\]])(?![^$]*\\[^$]*\$)/g;

      let monetaryProcessed = '';
      let lastMonetaryIndex = 0;
      const monetaryMatches = [...modifiedContent.matchAll(monetaryRegex)];

      for (let i = 0; i < monetaryMatches.length; i++) {
        const match = monetaryMatches[i];
        const prefix = match[1];
        const id = `MONETARY${monetaryBlocks.length}END`;
        monetaryBlocks.push({ id, content: match[0].slice(prefix.length) });

        monetaryProcessed += modifiedContent.slice(lastMonetaryIndex, match.index) + prefix + id;
        lastMonetaryIndex = match.index! + match[0].length;
      }

      monetaryProcessed += modifiedContent.slice(lastMonetaryIndex);
      modifiedContent = monetaryProcessed;

      // Also protect monetary amounts inside protected table rows
      if (typeof tableBlocks !== 'undefined' && tableBlocks.length > 0) {
        for (let t = 0; t < tableBlocks.length; t++) {
          let rowContent = tableBlocks[t].content;
          const rowMonetaryMatches = [...rowContent.matchAll(monetaryRegex)];
          if (rowMonetaryMatches.length === 0) continue;
          let lastIndex = 0;
          let newRow = '';
          for (let i = 0; i < rowMonetaryMatches.length; i++) {
            const match = rowMonetaryMatches[i];
            const prefix = match[1];
            const id = `MONETARY${monetaryBlocks.length}END`;
            monetaryBlocks.push({ id, content: match[0].slice(prefix.length) });
            newRow += rowContent.slice(lastIndex, match.index) + prefix + id;
            lastIndex = match.index! + match[0].length;
          }
          newRow += rowContent.slice(lastIndex);
          tableBlocks[t].content = newRow;
        }
      }

      // Extract LaTeX blocks AFTER monetary amounts are protected
      const allLatexPatterns = [
        { patterns: [/\\\[([\s\S]*?)\\\]/g, /\$\$([\s\S]*?)\$\$/g], isBlock: true, prefix: '§§§LATEXBLOCK_PROTECTED_' },
        {
          patterns: [
            /\\\(([\s\S]*?)\\\)/g,
            // Match $ expressions containing LaTeX commands, superscripts, subscripts, or braces
            /\$[^\$\n]*[\\^_{}][^\$\n]*\$/g,
            // Match algebraic expressions with parentheses and variables
            /\$[^\$\n]*\([^\)]*[a-zA-Z][^\)]*\)[^\$\n]*\$/g,
            // Match absolute value notation with pipes
            /\$[^\$\n]*\|[^\|]*\|[^\$\n]*\$/g,
            // Match $ expressions with single-letter variable followed by operator and number/variable
            /\$[a-zA-Z]\s*[=<>≤≥≠]\s*[0-9a-zA-Z][^\$\n]*\$/g,
            // Match $ expressions with number followed by LaTeX-style operators
            /\$[0-9][^\$\n]*[\\^_≤≥≠∈∉⊂⊃∪∩θΘπΠαβγδεζηλμνξρσςτφχψωΑΒΓΔΕΖΗΛΜΝΞΡΣΤΦΧΨΩ°][^\$\n]*\$/g,
            // Match pure numeric inline math like $5$ or $3.14$
            /\$\d+(?:\.\d+)?\$/g,
            // Match simple mathematical variables (single letter or Greek letters, but not plain numbers)
            /\$[a-zA-ZθΘπΠαβγδεζηλμνξρσςτφχψωΑΒΓΔΕΖΗΛΜΝΞΡΣΤΦΧΨΩ]+\$/g,
            // Match simple single-letter variables (like $ m $, $ b $, $ x $, $ y $)
            /\$\s*[a-zA-Z]\s*\$/g
          ],
          isBlock: false,
          prefix: '§§§LATEXINLINE_PROTECTED_'
        },
      ];

      for (const { patterns, isBlock, prefix } of allLatexPatterns) {
        for (const pattern of patterns) {
          const matches = [...modifiedContent.matchAll(pattern)];
          let lastIndex = 0;
          let newContent = '';

          for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const id = `${prefix}${latexBlocks.length}§§§`;
            latexBlocks.push({ id, content: match[0], isBlock });

            newContent += modifiedContent.slice(lastIndex, match.index) + id;
            lastIndex = match.index! + match[0].length;
          }

          newContent += modifiedContent.slice(lastIndex);
          modifiedContent = newContent;
        }
      }

      // Additionally, extract LaTeX inside protected table rows so it renders later
      if (typeof tableBlocks !== 'undefined' && tableBlocks.length > 0) {
        for (let t = 0; t < tableBlocks.length; t++) {
          let rowContent = tableBlocks[t].content;
          for (const { patterns, isBlock, prefix } of allLatexPatterns) {
            for (const pattern of patterns) {
              const matches = [...rowContent.matchAll(pattern)];
              if (matches.length === 0) continue;
              let lastIndex = 0;
              let newRow = '';
              for (let i = 0; i < matches.length; i++) {
                const match = matches[i];
                const id = `${prefix}${latexBlocks.length}§§§`;
                latexBlocks.push({ id, content: match[0], isBlock });
                newRow += rowContent.slice(lastIndex, match.index) + id;
                lastIndex = match.index! + match[0].length;
              }
              newRow += rowContent.slice(lastIndex);
              rowContent = newRow;
            }
          }
          tableBlocks[t].content = rowContent;
        }
      }

      // Escape unescaped pipe characters inside explicit markdown link texts to avoid table cell splits
      // Example: [A | B](url) -> [A \| B](url)
      try {
        const explicitLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
        const linkMatches = [...modifiedContent.matchAll(explicitLinkPattern)];
        if (linkMatches.length > 0) {
          let rebuilt = '';
          let lastPos = 0;
          for (let i = 0; i < linkMatches.length; i++) {
            const m = linkMatches[i];
            const full = m[0];
            const textPart = m[1];
            const urlPart = m[2];
            // Replace only unescaped '|'
            const fixedText = textPart.replace(/(^|[^\\])\|/g, '$1\\|');
            rebuilt += modifiedContent.slice(lastPos, m.index!) + `[${fixedText}](${urlPart})`;
            lastPos = m.index! + full.length;
          }
          rebuilt += modifiedContent.slice(lastPos);
          modifiedContent = rebuilt;
        }
      } catch { }

      // Process citations (simplified for performance)
      const refWithUrlRegex =
        /(?:\[(?:(?:\[?(PDF|DOC|HTML)\]?\s+)?([^\]]+))\]|\b([^.!?\n]+?(?:\s+[-–—]\s+\w+|\s+\([^)]+\)))\b)(?:\s*(?:\(|\[\s*|\s+))(https?:\/\/[^\s)]+)(?:\s*[)\]]|\s|$)/g;

      let citationProcessed = '';
      let lastCitationIndex = 0;
      const citationMatches = [...modifiedContent.matchAll(refWithUrlRegex)];

      for (let i = 0; i < citationMatches.length; i++) {
        const match = citationMatches[i];
        const [fullMatch, docType, bracketText, plainText, url] = match;
        const text = bracketText || plainText;
        const fullText = (docType ? `[${docType}] ` : '') + text;
        const cleanUrl = url.replace(/[.,;:]+$/, '');
        citations.push({ text: fullText.trim(), link: cleanUrl });

        citationProcessed += modifiedContent.slice(lastCitationIndex, match.index) + `[${fullText.trim()}](${cleanUrl})`;
        lastCitationIndex = match.index! + fullMatch.length;
      }

      citationProcessed += modifiedContent.slice(lastCitationIndex);
      modifiedContent = citationProcessed;

      // Restore protected blocks in the main content and in collected citation texts
      // Use replaceAll or global regex to ensure ALL instances are replaced
      monetaryBlocks.forEach(({ id, content }) => {
        const regex = new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        modifiedContent = modifiedContent.replace(regex, content);
        // Also restore inside citation titles so hover cards don't show placeholders
        for (let i = 0; i < citations.length; i++) {
          citations[i].text = citations[i].text.replace(regex, content);
        }
      });

      codeBlocks.forEach(({ id, content }) => {
        const regex = new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        modifiedContent = modifiedContent.replace(regex, content);
        for (let i = 0; i < citations.length; i++) {
          citations[i].text = citations[i].text.replace(regex, content);
        }
      });

      // Restore table rows LAST so they render with all LaTeX processed
      tableBlocks.forEach(({ id, content }) => {
        // Restore any protected monetary or code placeholders within the row content first
        let restoredRow = content;
        monetaryBlocks.forEach(({ id: mid, content: mcontent }) => {
          const mregex = new RegExp(mid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          restoredRow = restoredRow.replace(mregex, mcontent);
        });
        codeBlocks.forEach(({ id: cid, content: ccontent }) => {
          const cregex = new RegExp(cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          restoredRow = restoredRow.replace(cregex, ccontent);
        });

        const tregex = new RegExp(id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        modifiedContent = modifiedContent.replace(tregex, restoredRow);
        for (let i = 0; i < citations.length; i++) {
          citations[i].text = citations[i].text.replace(tregex, restoredRow);
        }
      });

      return {
        processedContent: modifiedContent,
        citations,
        latexBlocks,
        isProcessing: false,
      };
    } catch (error) {
      console.error('Error processing content:', error);
      return {
        processedContent: content,
        citations: [],
        latexBlocks: [],
        isProcessing: false,
      };
    }
  }, [content]);
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

const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({ content, isUserMessage = false }) => {
  const { processedContent, citations: extractedCitations, latexBlocks, isProcessing } = useProcessedContent(content);
  const citationLinks = extractedCitations;

  // Optimized element key generation using content hash instead of indices
  const contentHash = useMemo(() => {
    // Simple hash for stable keys
    let hash = 0;
    const str = content.slice(0, 200); // Use first 200 chars for hash
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }, [content]);

  // Use closures to maintain counters without re-creating on each render
  const getElementKey = useMemo(() => {
    const counters = {
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

    return (type: keyof typeof counters, content?: string) => {
      const count = counters[type]++;
      const contentPrefix = content ? content.slice(0, 20) : '';
      return `${contentHash}-${type}-${count}-${contentPrefix}`.replace(/[^a-zA-Z0-9-]/g, '');
    };
  }, [contentHash]);

  const renderHoverCard = useCallback(
    (href: string, text: React.ReactNode, isCitation: boolean = false, citationText?: string) => {
      const title = citationText || (typeof text === 'string' ? text : '');

      return (
        <HoverCard openDelay={10}>
          <HoverCardTrigger asChild>
            <Link
              href={href}
              target="_blank"
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
        const blockPattern = /§§§LATEXBLOCK_PROTECTED_(\d+)§§§/g;
        const inlinePattern = /§§§LATEXINLINE_PROTECTED_(\d+)§§§/g;

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

        allMatches.forEach(({ match, isBlock }) => {
          const fullMatch = match[0];
          const start = match.index;

          if (start > lastEnd) {
            const textContent = text.slice(lastEnd, start);
            const key = getElementKey('text', textContent);
            components.push(<span key={key}>{textContent}</span>);
          }

          const latexBlock = latexBlocks.find((block) => block.id === fullMatch);
          if (latexBlock) {
            const key = getElementKey('text', latexBlock.content);
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
          const key = getElementKey('text', textContent);
          components.push(<span key={key}>{textContent}</span>);
        }

        return components.length === 1 ? components[0] : <Fragment>{components}</Fragment>;
      },
      hr() {
        return <></>;
      },
      paragraph(children) {
        const key = getElementKey('paragraph', String(children));

        if (typeof children === 'string') {
          const blockMatch = children.match(/^§§§LATEXBLOCK_PROTECTED_(\d+)§§§$/);
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
            className={`${isUserMessage ? 'leading-relaxed text-foreground !m-0' : ''} my-5 leading-[1.75] text-foreground/95`}
          >
            {children}
          </p>
        );
      },
      code(children, language) {
        const key = getElementKey('code', String(children));
        return (
          <CodeBlock language={language} elementKey={key} key={key}>
            {String(children)}
          </CodeBlock>
        );
      },
      codespan(code) {
        const codeString = typeof code === 'string' ? code : String(code || '');
        const key = getElementKey('code', codeString);
        return <InlineCode key={key} elementKey={key} code={codeString} />;
      },
      link(href, text) {
        const key = getElementKey('link', href);

        if (href.startsWith('mailto:')) {
          const email = href.replace('mailto:', '');
          return (
            <span key={key} className="break-all">
              {email}
            </span>
          );
        }

        const linkText = typeof text === 'string' ? text : href;

        // For user messages, keep raw text to avoid accidental linkification changes
        if (isUserMessage) {
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

        // If there's descriptive link text, render a normal anchor with hover preview.
        // This preserves full text inside tables and prevents truncation to citation chips.
        if (linkText && linkText !== href) {
          return renderHoverCard(href, linkText, false);
        }

        // For bare URLs, render as citation chips
        let citationIndex = citationLinks.findIndex((link) => link.link === href);
        if (citationIndex === -1) {
          citationLinks.push({ text: href, link: href });
          citationIndex = citationLinks.length - 1;
        }
        const citationText = citationLinks[citationIndex].text;
        return renderCitation(citationIndex, citationText, href, key);
      },
      heading(children, level) {
        const key = getElementKey('heading', String(children));
        const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements;
        const sizeClasses =
          {
            1: 'text-2xl md:text-3xl font-extrabold mt-8 mb-4 border-b border-border/50 pb-2',
            2: 'text-xl md:text-2xl font-bold mt-7 mb-4',
            3: 'text-lg md:text-xl font-semibold mt-6 mb-3',
            4: 'text-base md:text-lg font-semibold mt-5 mb-3',
            5: 'text-sm md:text-base font-semibold mt-4 mb-2',
            6: 'text-xs md:text-sm font-semibold mt-4 mb-2',
          }[level] || '';

        return (
          <HeadingTag key={key} className={`${sizeClasses} text-foreground tracking-tight scroll-mt-20`}>
            {children}
          </HeadingTag>
        );
      },
      list(children, ordered) {
        const key = getElementKey('list');
        const ListTag = ordered ? 'ol' : 'ul';
        return (
          <ListTag
            key={key}
            className={cn(
              'my-6 space-y-3 text-foreground',
              ordered ? 'pl-8' : 'pl-8 list-disc marker:text-primary/70'
            )}
          >
            {children}
          </ListTag>
        );
      },
      listItem(children) {
        const key = getElementKey('listItem');
        return (
          <li key={key} className="pl-2 leading-relaxed text-foreground/90">
            <span className="inline">{children}</span>
          </li>
        );
      },
      blockquote(children) {
        const key = getElementKey('blockquote');
        return (
          <blockquote
            key={key}
            className="my-6 border-l-4 border-primary/30 pl-4 py-2 text-foreground/90 italic bg-muted/50 rounded-r-md"
          >
            {children}
          </blockquote>
        );
      },
      strong(children) {
        const key = getElementKey('text', String(children));
        return (
          <strong key={key} className="font-bold text-foreground">
            {children}
          </strong>
        );
      },
      em(children) {
        const key = getElementKey('text', String(children));
        return (
          <em key={key} className="italic text-foreground/95">
            {children}
          </em>
        );
      },
      table(children) {
        const key = getElementKey('table');
        return <MarkdownTableWithActions key={key}>{children}</MarkdownTableWithActions>;
      },
      tableRow(children) {
        const key = getElementKey('tableRow');
        return <TableRow key={key}>{children}</TableRow>;
      },
      tableCell(children, flags) {
        const key = getElementKey('tableCell');
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
        const key = getElementKey('table');
        return (
          <TableHeader key={key} className="!p-1 !m-1">
            {children}
          </TableHeader>
        );
      },
      tableBody(children) {
        const key = getElementKey('table');
        return (
          <TableBody key={key} className="!text-wrap !m-1">
            {children}
          </TableBody>
        );
      },
    }),
    [latexBlocks, isUserMessage, renderCitation, renderHoverCard, getElementKey, citationLinks],
  );

  // Show a progressive loading state for large content
  if (isProcessing && content.length > 15000) {
    return (
      <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none text-foreground font-sans">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            Processing content ({Math.round(content.length / 1024)}KB)...
          </div>
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-full"></div>
            <div className="h-3 bg-muted rounded w-5/6"></div>
            <div className="h-8 bg-muted rounded w-2/3"></div>
            <div className="h-3 bg-muted rounded w-4/5"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none text-foreground font-sans">
      <Marked renderer={renderer}>{processedContent}</Marked>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.isUserMessage === nextProps.isUserMessage
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

// Virtual scrolling component for very large content
const VirtualMarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({ content, isUserMessage = false }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Split content into chunks for virtual scrolling
  const contentChunks = useMemo(() => {
    const lines = content.split('\n');
    const chunkSize = 20; // Lines per chunk
    const chunks = [];

    for (let i = 0; i < lines.length; i += chunkSize) {
      chunks.push(lines.slice(i, i + chunkSize).join('\n'));
    }

    return chunks;
  }, [content]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, clientHeight } = containerRef.current;
    const lineHeight = 24; // Approximate line height
    const start = Math.floor(scrollTop / lineHeight);
    const end = Math.min(start + Math.ceil(clientHeight / lineHeight) + 10, contentChunks.length);

    setVisibleRange({ start: Math.max(0, start - 5), end });
  }, [contentChunks.length]);

  // Only use virtual scrolling for very large content
  if (content.length < 50000) {
    return <MarkdownRenderer content={content} isUserMessage={isUserMessage} />;
  }

  return (
    <div
      ref={containerRef}
      className="markdown-body prose prose-neutral dark:prose-invert max-w-none text-foreground font-sans max-h-96 overflow-y-auto"
      onScroll={handleScroll}
    >
      {contentChunks.slice(visibleRange.start, visibleRange.end).map((chunk, index) => (
        <MarkdownRenderer
          key={`chunk-${visibleRange.start + index}`}
          content={chunk}
          isUserMessage={isUserMessage}
        />
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.isUserMessage === nextProps.isUserMessage
  );
});

VirtualMarkdownRenderer.displayName = 'VirtualMarkdownRenderer';

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

// Performance monitoring hook
const usePerformanceMonitor = (content: string) => {
  const renderStartTime = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
  }, [content]);

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    if (renderTime > 100) {
      console.warn(`Markdown render took ${renderTime.toFixed(2)}ms for ${content.length} characters`);
    }
  }, [content.length]);
};

// Main optimized markdown component with automatic optimization selection
const OptimizedMarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({ content, isUserMessage = false }) => {
  usePerformanceMonitor(content);

  // Automatically choose the best rendering strategy based on content size
  if (content.length > 100000) {
    return <VirtualMarkdownRenderer content={content} isUserMessage={isUserMessage} />;
  }

  return <MarkdownRenderer content={content} isUserMessage={isUserMessage} />;
}, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.isUserMessage === nextProps.isUserMessage
  );
});

OptimizedMarkdownRenderer.displayName = 'OptimizedMarkdownRenderer';

export { MarkdownRenderer, VirtualMarkdownRenderer, OptimizedMarkdownRenderer as default };
