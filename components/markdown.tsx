import 'katex/dist/katex.min.css';

import { Geist_Mono } from 'next/font/google';
import { highlight } from 'sugar-high';
import Image from 'next/image';
import Link from 'next/link';
import Latex from 'react-latex-next';
import Marked, { ReactRenderer } from 'marked-react';
import { Lexer } from 'marked';
import React, { useCallback, useMemo, useState, Fragment, useRef, lazy, Suspense, useEffect, use } from 'react';

import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Check, Copy, WrapText, ArrowLeftRight, Download, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface MarkdownRendererProps {
  content: string;
  isUserMessage?: boolean;
}

interface CitationLink {
  text: string;
  link: string;
  metadata?: {
    title?: string;
    description?: string;
    image?: string;
    logo?: string;
  };
}

interface CitationGroup {
  urls: string[];
  texts: string[];
  id: string;
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
              'p-1 rounded border border-border bg-background shadow-sm transition-colors touch-manipulation',
              isWrapped ? 'text-primary' : 'text-muted-foreground hover:text-foreground active:text-foreground',
            )}
            title={isWrapped ? 'Disable wrap' : 'Enable wrap'}
          >
            {isWrapped ? <ArrowLeftRight size={12} /> : <WrapText size={12} />}
          </button>
          <button
            onClick={handleCopy}
            className={cn(
              'p-1 rounded border border-border bg-background shadow-sm transition-colors touch-manipulation',
              isCopied ? 'text-primary' : 'text-muted-foreground hover:text-foreground active:text-foreground',
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
            isWrapped && 'whitespace-pre-wrap wrap-break-words',
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
              'p-1 rounded border border-border bg-background shadow-sm transition-colors touch-manipulation',
              isWrapped ? 'text-primary' : 'text-muted-foreground hover:text-foreground active:text-foreground',
            )}
            title={isWrapped ? 'Disable wrap' : 'Enable wrap'}
          >
            {isWrapped ? <ArrowLeftRight size={12} /> : <WrapText size={12} />}
          </button>
          <button
            onClick={handleCopy}
            className={cn(
              'p-1 rounded border border-border bg-background shadow-sm transition-colors touch-manipulation',
              isCopied ? 'text-primary' : 'text-muted-foreground hover:text-foreground active:text-foreground',
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
            isWrapped && 'whitespace-pre-wrap wrap-break-word',
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
        <Suspense
          fallback={
            <div className="group relative my-5 rounded-md border border-border bg-accent overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-accent border-b border-border">
                <div className="flex items-center gap-2">
                  {language && (
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {language}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{children.split('\n').length} lines</span>
                </div>
              </div>
              <div className="font-mono text-sm leading-relaxed p-2 text-muted-foreground">
                <div className="animate-pulse">Loading code block...</div>
              </div>
            </div>
          }
        >
          <LazyCodeBlock language={language} elementKey={elementKey}>
            {children}
          </LazyCodeBlock>
        </Suspense>
      );
    }

    // Use synchronous rendering for smaller blocks
    return (
      <SyncCodeBlock language={language} elementKey={elementKey}>
        {children}
      </SyncCodeBlock>
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
          length: match[0].length,
        });
      }

      // Then, find all inline code (single backticks) that don't overlap with triple-backtick blocks
      const inlineCodePattern = /`[^`\n]+`/g;
      while ((match = inlineCodePattern.exec(modifiedContent)) !== null) {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;

        // Check if this inline code is inside a triple-backtick block
        const isInsideTripleBacktick = allCodeMatches.some(
          (m) => matchStart >= m.index && matchEnd <= m.index + m.length,
        );

        if (!isInsideTripleBacktick) {
          allCodeMatches.push({
            match: match[0],
            index: match.index,
            length: match[0].length,
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
        /(^|[\s([>~≈<)])\$\d+(?:,\d{3})*(?:\.\d+)?(?:[kKmMbBtT]|\s+(?:thousand|million|billion|trillion|k|K|M|B|T))?(?:\s+(?:USD|EUR|GBP|CAD|AUD|JPY|CNY|CHF))?(?:\s*(?:per\s+(?:million|thousand|token|month|year)|\/(?:mo|month|yr|year|wk|week|day|token|hr|hour)))?(?=\s|$|[).,;!?<\]])(?![^$]*\\[^$]*\$)/g;

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
            // Match matrix notation with square brackets
            /\$[^\$\n]*\[[^\]]*\][^\$\n]*\$/g,
            // Match absolute value notation with pipes
            /\$[^\$\n]*\|[^\|]*\|[^\$\n]*\$/g,
            // Match $ expressions with multiple letters and equals signs (e.g., $Av = 2v$)
            /\$[a-zA-Z]+[^\$\n]*[=<>≤≥≠][^\$\n]*\$/g,
            // Match $ expressions with single-letter variable followed by operator and number/variable
            /\$[a-zA-Z]\s*[=<>≤≥≠]\s*[0-9a-zA-Z][^\$\n]*\$/g,
            // Match $ expressions with number followed by LaTeX-style operators
            /\$[0-9][^\$\n]*[\\^_≤≥≠∈∉⊂⊃∪∩θΘπΠαβγδεζηλμνξρσςτφχψωΑΒΓΔΕΖΗΛΜΝΞΡΣΤΦΧΨΩ°][^\$\n]*\$/g,
            // Match pure numeric inline math like $5$ or $3.14$
            /\$\d+(?:\.\d+)?\$/g,
            // Match simple mathematical variables (single letter or Greek letters, but not plain numbers)
            /\$[a-zA-ZθΘπΠαβγδεζηλμνξρσςτφχψωΑΒΓΔΕΖΗΛΜΝΞΡΣΤΦΧΨΩ]+\$/g,
            // Match simple single-letter variables (like $ m $, $ b $, $ x $, $ y $)
            /\$\s*[a-zA-Z]\s*\$/g,
          ],
          isBlock: false,
          prefix: '§§§LATEXINLINE_PROTECTED_',
        },
      ];

      for (const { patterns, isBlock, prefix } of allLatexPatterns) {
        for (const pattern of patterns) {
          const matches = [...modifiedContent.matchAll(pattern)];
          let lastIndex = 0;
          let newContent = '';

          for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const full = match[0];

            // Heuristics to avoid misclassifying currency and long cross-dollar spans as LaTeX
            if (!isBlock) {
              const isDollarDelimited = full.startsWith('$') && full.endsWith('$');
              const inner = isDollarDelimited ? full.slice(1, -1) : full; // handles \( ... \) via pattern itself

              // 1) Skip if looks like currency (e.g., $13 billion, $500, $80B)
              const currencyLike =
                /^(\s*)\d{1,3}(?:[,\s]?\d{3})*(?:\.\d+)?(?:\s*(?:k|K|M|B|T|thousand|million|billion|trillion))?(\s*(?:USD|EUR|GBP|CAD|AUD|JPY|CNY|CHF))?\s*$/i.test(
                  inner.replace(/\u00A0/g, ' ').trim(),
                );

              // 2) Skip if it contains obvious URL/link syntax which indicates markdown, not math
              const containsUrlOrMarkdown = /https?:\/\/|\]\(|\[|\]|:\/\//.test(inner);

              // 3) Skip very long spans (likely accidental cross-dollar match)
              const isTooLong = inner.length > 80;

              if (currencyLike || containsUrlOrMarkdown || isTooLong) {
                // Do not replace; keep original content
                newContent += modifiedContent.slice(lastIndex, match.index! + full.length);
                lastIndex = match.index! + full.length;
                continue;
              }
            }

            const id = `${prefix}${latexBlocks.length}§§§`;
            latexBlocks.push({ id, content: full, isBlock });

            newContent += modifiedContent.slice(lastIndex, match.index) + id;
            lastIndex = match.index! + full.length;
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
      // Updated regex to handle brackets and exclamation marks in citation text
      // The pattern now matches text that may contain ] characters before the final ](url) pattern
      // Uses negative lookahead to allow ] in text as long as it's not followed by ( or [
      // Uses + quantifier to ensure at least one character is captured (prevents empty brackets)
      const refWithUrlRegex =
        /(?:\[(?:(?:\[?(PDF|DOC|HTML)\]?\s+)?((?:[^\]]|](?!\s*[(\[]))+))\]|\b([^.!?\n]+?(?:\s+[-–—]\s+\w+|\s+\([^)]+\)))\b)(?:\s*(?:\(|\[\s*|\s+))(https?:\/\/[^\s)]+)(?:\s*[)\]]|\s|$)/g;

      let citationProcessed = '';
      let lastCitationIndex = 0;
      const citationMatches = [...modifiedContent.matchAll(refWithUrlRegex)];

      for (let i = 0; i < citationMatches.length; i++) {
        const match = citationMatches[i];
        const [fullMatch, docType, bracketText, plainText, url] = match;
        const text = bracketText || plainText;
        // Skip if text is empty/undefined to prevent malformed citations
        // Preserve the skipped match's content while keeping position tracking correct
        if (!text) {
          const matchStart = match.index ?? 0;
          const matchEnd = matchStart + fullMatch.length;
          citationProcessed += modifiedContent.slice(lastCitationIndex, matchEnd);
          lastCitationIndex = matchEnd;
          continue;
        }
        const fullText = (docType ? `[${docType}] ` : '') + text;
        const cleanUrl = url.replace(/[.,;:]+$/, '');
        citations.push({ text: fullText.trim(), link: cleanUrl });

        citationProcessed +=
          modifiedContent.slice(lastCitationIndex, match.index) + `[${fullText.trim()}](${cleanUrl})`;
        lastCitationIndex = match.index! + fullMatch.length;
      }

      citationProcessed += modifiedContent.slice(lastCitationIndex);
      modifiedContent = citationProcessed;

      // Group consecutive citations using marked's Lexer for robust link parsing
      const citationGroups: CitationGroup[] = [];

      // Helper function to extract links using marked's Lexer (handles all edge cases)
      // Uses a hybrid approach: Lexer to parse links correctly, then finds positions in text
      function extractLinksWithLexer(text: string): Array<{ raw: string; href: string; text: string; index: number; end: number }> {
        const links: Array<{ raw: string; href: string; text: string; index: number; end: number }> = [];

        try {
          // Tokenize the text to find all links using marked's robust parser
          const tokens = Lexer.lexInline(text);

          // Build a map of link tokens with their hrefs and texts
          const linkTokens: Array<{ href: string; text: string; raw: string }> = [];
          for (const token of tokens) {
            if (token.type === 'link') {
              const linkText = typeof token.text === 'string'
                ? token.text
                : (token.tokens?.map(t => t.raw || '').join('') || '');
              linkTokens.push({
                href: token.href,
                text: linkText,
                raw: token.raw
              });
            }
          }

          // Now find positions of these links in the original text
          // We'll search for each link pattern, but validate against Lexer results
          let searchPos = 0;
          for (const linkToken of linkTokens) {
            // Try to find this link in the text starting from searchPos
            // Use a more flexible regex that handles edge cases, but validate with Lexer
            const escapedHref = linkToken.href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // Match link pattern with flexible bracket/paren handling
            const linkPattern = new RegExp(`\\[([^\\]]+)\\]\\(${escapedHref}\\)`, 'g');
            linkPattern.lastIndex = searchPos;
            const match = linkPattern.exec(text);

            if (match && match[0] === linkToken.raw) {
              // Validate: re-parse this match with Lexer to ensure it's correct
              let isValidated = false;
              try {
                const validateTokens = Lexer.lexInline(match[0]);
                const validateLink = validateTokens.find(t => t.type === 'link');
                if (validateLink && 'href' in validateLink && (validateLink as { href: string }).href === linkToken.href) {
                  isValidated = true;
                }
              } catch {
                // Validation failed, but match looks good - we'll use it anyway since match[0] === linkToken.raw
              }

              // Use the match if validated OR if raw matches (regex found the correct link)
              if (isValidated || match[0] === linkToken.raw) {
                links.push({
                  raw: match[0],
                  href: linkToken.href,
                  text: linkToken.text,
                  index: match.index!,
                  end: match.index! + match[0].length
                });
                searchPos = match.index! + match[0].length;
                continue;
              }
            }

            // Fallback: search for the raw link text directly
            const rawIndex = text.indexOf(linkToken.raw, searchPos);
            if (rawIndex !== -1) {
              links.push({
                raw: linkToken.raw,
                href: linkToken.href,
                text: linkToken.text,
                index: rawIndex,
                end: rawIndex + linkToken.raw.length
              });
              searchPos = rawIndex + linkToken.raw.length;
            } else {
              // Last resort: try to find by href and reconstruct
              // Search backwards from href to find the opening bracket, then match forward
              const hrefIndex = text.indexOf(linkToken.href, searchPos);
              if (hrefIndex !== -1) {
                // Search backwards from href position to find the opening bracket '['
                // Use a reasonable lookback limit (e.g., 500 chars) to handle long link text
                const maxLookback = Math.min(500, hrefIndex);
                const searchStart = Math.max(0, hrefIndex - maxLookback);
                const searchEnd = Math.min(text.length, hrefIndex + linkToken.href.length + 10); // Small lookahead for closing paren
                const searchWindow = text.slice(searchStart, searchEnd);

                // Find the last '[' before the href that could be the start of our link
                // Then match the full link pattern from that position
                const bracketPos = searchWindow.lastIndexOf('[', hrefIndex - searchStart);
                let linkFound = false;

                if (bracketPos !== -1) {
                  // Try to match the full link pattern from this bracket position
                  const patternFromBracket = new RegExp(`\\[([^\\]]+)\\]\\(${escapedHref}\\)`);
                  const matchFromBracket = searchWindow.slice(bracketPos).match(patternFromBracket);
                  if (matchFromBracket) {
                    const absoluteIndex = searchStart + bracketPos;
                    links.push({
                      raw: matchFromBracket[0],
                      href: linkToken.href,
                      text: matchFromBracket[1],
                      index: absoluteIndex,
                      end: absoluteIndex + matchFromBracket[0].length
                    });
                    searchPos = absoluteIndex + matchFromBracket[0].length;
                    linkFound = true;
                  } else {
                    // If direct match fails, try a broader search with the pattern
                    const windowPattern = new RegExp(`\\[([^\\]]+)\\]\\(${escapedHref}\\)`);
                    const windowMatch = searchWindow.match(windowPattern);
                    if (windowMatch) {
                      const absoluteIndex = searchStart + searchWindow.indexOf(windowMatch[0]);
                      links.push({
                        raw: windowMatch[0],
                        href: linkToken.href,
                        text: windowMatch[1],
                        index: absoluteIndex,
                        end: absoluteIndex + windowMatch[0].length
                      });
                      searchPos = absoluteIndex + windowMatch[0].length;
                      linkFound = true;
                    }
                  }
                } else {
                  // No bracket found, try pattern match on the entire window as fallback
                  const windowPattern = new RegExp(`\\[([^\\]]+)\\]\\(${escapedHref}\\)`);
                  const windowMatch = searchWindow.match(windowPattern);
                  if (windowMatch) {
                    const absoluteIndex = searchStart + searchWindow.indexOf(windowMatch[0]);
                    links.push({
                      raw: windowMatch[0],
                      href: linkToken.href,
                      text: windowMatch[1],
                      index: absoluteIndex,
                      end: absoluteIndex + windowMatch[0].length
                    });
                    searchPos = absoluteIndex + windowMatch[0].length;
                    linkFound = true;
                  }
                }

                // If we found the href but couldn't reconstruct the full link, advance searchPos
                // to prevent getting stuck on the same position for subsequent links
                if (!linkFound) {
                  searchPos = hrefIndex + linkToken.href.length;
                }
              } else {
                // href not found at all - advance searchPos to prevent infinite loops
                // Try to find the next potential link position by searching for common link patterns
                const nextBracket = text.indexOf('[', searchPos);
                if (nextBracket !== -1) {
                  searchPos = nextBracket;
                } else {
                  // No more brackets found, advance to end of text to stop searching
                  searchPos = text.length;
                }
              }
            }
          }
        } catch (error) {
          // Fallback to improved regex if Lexer fails
          // This regex handles URLs with parentheses by using balanced matching
          const linkPattern = /\[([^\]]*(?:\\.[^\]]*)*)\]\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g;
          let match;
          while ((match = linkPattern.exec(text)) !== null) {
            links.push({
              raw: match[0],
              href: match[2],
              text: match[1].replace(/\\(.)/g, '$1'), // Unescape
              index: match.index,
              end: match.index + match[0].length
            });
          }
        }

        // Sort by index to ensure correct order
        links.sort((a, b) => a.index - b.index);
        return links;
      }

      // Extract all links using Lexer
      const allLinks = extractLinksWithLexer(modifiedContent);

      if (allLinks.length >= 2) {
        // Find groups of consecutive links (only whitespace between them)
        const groups: Array<{ links: typeof allLinks; startIndex: number; endIndex: number }> = [];
        let currentGroup: typeof allLinks = [allLinks[0]];

        for (let i = 1; i < allLinks.length; i++) {
          const prevLink = allLinks[i - 1];
          const currLink = allLinks[i];
          const between = modifiedContent.slice(prevLink.end, currLink.index);

          // Check if only whitespace between links
          if (/^\s*$/.test(between)) {
            currentGroup.push(currLink);
          } else {
            // End current group if it has 2+ links
            if (currentGroup.length >= 2) {
              groups.push({
                links: currentGroup,
                startIndex: currentGroup[0].index,
                endIndex: currentGroup[currentGroup.length - 1].end
              });
            }
            // Start new group
            currentGroup = [currLink];
          }
        }

        // Don't forget the last group
        if (currentGroup.length >= 2) {
          groups.push({
            links: currentGroup,
            startIndex: currentGroup[0].index,
            endIndex: currentGroup[currentGroup.length - 1].end
          });
        }

        // Replace groups with citation group placeholders (process in reverse to maintain indices)
        if (groups.length > 0) {
          let groupProcessed = modifiedContent;
          for (let g = groups.length - 1; g >= 0; g--) {
            const group = groups[g];
            const urls = group.links.map(l => l.href);
            const texts = group.links.map(l => l.text);
            const groupId = `§§§CITATIONGROUP_${citationGroups.length}§§§`;

            citationGroups.push({ urls, texts, id: groupId });

            // Processing right-to-left means replacements don't affect earlier indices
            groupProcessed = groupProcessed.slice(0, group.startIndex) + groupId + groupProcessed.slice(group.endIndex);
          }
          modifiedContent = groupProcessed;
        }
      }

      // Additionally, process citation groups inside protected table rows
      // Use the same Lexer-based approach for consistency
      if (typeof tableBlocks !== 'undefined' && tableBlocks.length > 0) {
        for (let t = 0; t < tableBlocks.length; t++) {
          let rowContent = tableBlocks[t].content;

          // Extract links using Lexer (same function as above)
          const rowLinks = extractLinksWithLexer(rowContent);

          if (rowLinks.length < 2) continue;

          // Find groups of consecutive links (only whitespace between them)
          const groups: Array<{ links: typeof rowLinks; startIndex: number; endIndex: number }> = [];
          let currentGroup: typeof rowLinks = [rowLinks[0]];

          for (let i = 1; i < rowLinks.length; i++) {
            const prevLink = rowLinks[i - 1];
            const currLink = rowLinks[i];
            const between = rowContent.slice(prevLink.end, currLink.index);

            // Check if only whitespace between links
            if (/^\s*$/.test(between)) {
              currentGroup.push(currLink);
            } else {
              // End current group if it has 2+ links
              if (currentGroup.length >= 2) {
                groups.push({
                  links: currentGroup,
                  startIndex: currentGroup[0].index,
                  endIndex: currentGroup[currentGroup.length - 1].end
                });
              }
              // Start new group
              currentGroup = [currLink];
            }
          }

          // Don't forget the last group
          if (currentGroup.length >= 2) {
            groups.push({
              links: currentGroup,
              startIndex: currentGroup[0].index,
              endIndex: currentGroup[currentGroup.length - 1].end
            });
          }

          if (groups.length === 0) continue;

          // Replace groups with citation group placeholders (process in reverse to maintain indices)
          let newRow = rowContent;
          for (let g = groups.length - 1; g >= 0; g--) {
            const group = groups[g];
            const urls = group.links.map(l => l.href);
            const texts = group.links.map(l => l.text);
            const groupId = `§§§CITATIONGROUP_${citationGroups.length}§§§`;

            citationGroups.push({ urls, texts, id: groupId });

            // Processing right-to-left means replacements don't affect earlier indices
            newRow = newRow.slice(0, group.startIndex) + groupId + newRow.slice(group.endIndex);
          }

          tableBlocks[t].content = newRow;
        }
      }

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
        citationGroups,
        latexBlocks,
        isProcessing: false,
      };
    } catch (error) {
      console.error('Error processing content:', error);
      return {
        processedContent: content,
        citations: [],
        citationGroups: [],
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
        'hover:bg-muted/70 active:bg-muted/70 transition-colors duration-150 cursor-pointer',
        'align-baseline touch-manipulation',
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

// Safe LaTeX wrapper with error handling
const SafeLatex: React.FC<{
  children: string;
  delimiters: Array<{ left: string; right: string; display: boolean }>;
  isBlock?: boolean;
}> = React.memo(({ children, delimiters, isBlock = false }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [children]);

  if (hasError) {
    // Fallback: render raw LaTeX text in a code-style format
    return (
      <code
        className={cn(
          'inline rounded px-1 py-0.5 font-mono text-[0.9em]',
          'bg-muted/50 text-foreground/85',
          isBlock && 'block my-4 p-2',
        )}
        style={{
          fontFamily: geistMono.style.fontFamily,
          fontSize: '0.85em',
        }}
        title="LaTeX rendering failed - showing raw content"
      >
        {children}
      </code>
    );
  }

  try {
    return (
      <Latex delimiters={delimiters} strict={false}>
        {children}
      </Latex>
    );
  } catch (error) {
    console.warn('LaTeX rendering error:', error, 'Content:', children);
    setHasError(true);
    return (
      <code
        className={cn(
          'inline rounded px-1 py-0.5 font-mono text-[0.9em]',
          'bg-muted/50 text-foreground/85',
          isBlock && 'block my-4 p-2',
        )}
        style={{
          fontFamily: geistMono.style.fontFamily,
          fontSize: '0.85em',
        }}
        title="LaTeX rendering failed - showing raw content"
      >
        {children}
      </code>
    );
  }
});

SafeLatex.displayName = 'SafeLatex';

const MarkdownTableWithActions: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isMobile = useIsMobile();

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

  const updateScrollIndicators = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  }, []);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    updateScrollIndicators();
    scrollEl.addEventListener('scroll', updateScrollIndicators);
    const resizeObserver = new ResizeObserver(updateScrollIndicators);
    resizeObserver.observe(scrollEl);

    return () => {
      scrollEl.removeEventListener('scroll', updateScrollIndicators);
      resizeObserver.disconnect();
    };
  }, [updateScrollIndicators]);

  const handleTouchStart = useCallback(() => {
    if (isMobile) {
      setShowActions((prev) => !prev);
    }
  }, [isMobile]);

  return (
    <div
      ref={containerRef}
      className="relative group my-2.5"
      onMouseEnter={() => !isMobile && setShowActions(true)}
      onMouseLeave={() => !isMobile && setShowActions(false)}
      onTouchStart={handleTouchStart}
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
              variant="secondary"
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
      <div className="border border-border rounded-none overflow-hidden">
        <div
          ref={scrollRef}
          className="relative overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          style={{ scrollbarWidth: 'thin' }}
        >
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-linear-to-r from-background to-transparent pointer-events-none z-10" />
          )}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-linear-to-l from-background to-transparent pointer-events-none z-10" />
          )}
          <div>
            <Table className="m-0! min-w-full border-0! [&>div]:overflow-visible! [&>div]:relative!">{children}</Table>
          </div>
        </div>
      </div>
    </div>
  );
});

MarkdownTableWithActions.displayName = 'MarkdownTableWithActions';

// Cache for metadata to avoid redundant fetches
const metadataCache = new Map<string, Promise<any>>();

function fetchMetadata(url: string) {
  if (!metadataCache.has(url)) {
    metadataCache.set(
      url,
      fetch(`https://og.metadata.vision/${encodeURIComponent(url)}`)
        .then((res) => res.json())
        .then((data) => (data.ok && data.data ? data.data : null))
        .catch(() => null)
    );
  }
  return metadataCache.get(url)!;
}

// Preload metadata for all citation URLs in the content
function preloadCitationMetadata(content: string) {
  // Extract all citation URLs from content
  const citationPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  const urls = new Set<string>();
  let match;

  while ((match = citationPattern.exec(content)) !== null) {
    const url = match[2];
    if (isValidUrl(url)) {
      urls.add(url);
    }
  }

  // Start fetching metadata for all URLs in the background
  urls.forEach(url => {
    fetchMetadata(url);
  });
}

const LinkPreviewContent = ({ href, title }: { href: string; title?: string }) => {
  const metadata = use(fetchMetadata(href));
  const [faviconError, setFaviconError] = useState(false);
  const [googleFaviconError, setGoogleFaviconError] = useState(false);
  const [proxyError, setProxyError] = useState(false);

  const domain = useMemo(() => {
    try {
      return new URL(href).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }, [href]);

  if (!domain) return null;

  // Fallback to original text if metadata title is "Access Denied" or empty
  const isAccessDenied = metadata?.title === 'Access Denied';
  const displayTitle = (metadata?.title && !isAccessDenied) ? metadata.title : title;

  const metadataFavicon = metadata?.logo;
  const googleFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  // Determine favicon source based on error states
  let favicon: string;
  let useProxy = false;
  let showIcon = false;

  if (!faviconError && metadataFavicon) {
    // Try metadata logo first
    favicon = metadataFavicon;
  } else if (!googleFaviconError) {
    // If metadata logo failed/doesn't exist, try Google favicon
    favicon = googleFavicon;
  } else if (!proxyError && metadataFavicon) {
    // If Google also failed and we have a metadata logo, try proxying it
    favicon = `/api/proxy-image?url=${encodeURIComponent(metadataFavicon)}`;
    useProxy = true;
  } else {
    // All failed, show globe icon
    showIcon = true;
    favicon = '';
  }

  const handleFaviconError = () => {
    if (metadataFavicon && !faviconError) {
      // Metadata logo failed, try Google next
      setFaviconError(true);
    } else if (!googleFaviconError) {
      // Google favicon failed, try proxy next
      setGoogleFaviconError(true);
    } else if (!proxyError) {
      // Proxy failed, show icon
      setProxyError(true);
    }
  };

  return (
    <div className="flex flex-col bg-muted/30 text-xs m-0">
      <div className="flex items-center space-x-2 px-3 py-2">
        {showIcon ? (
          <div className="w-[14px] h-[14px] flex items-center justify-center text-muted-foreground">
            <Globe size={14} />
          </div>
        ) : useProxy ? (
          <img
            src={favicon}
            alt=""
            width={14}
            height={14}
            className="rounded-sm shrink-0"
            onError={handleFaviconError}
          />
        ) : (
          <Image
            src={favicon}
            alt=""
            width={14}
            height={14}
            className="rounded-sm shrink-0"
            onError={handleFaviconError}
          />
        )}
        <span className="truncate font-medium text-foreground text-[10px]">{domain}</span>
      </div>
      {displayTitle && (
        <div className="px-3 pb-2 pt-1">
          <h3 className="font-normal text-xs m-0 text-foreground/80 line-clamp-3 leading-relaxed">{displayTitle}</h3>
        </div>
      )}
    </div>
  );
};

const LinkPreview = React.memo(({ href, title }: { href: string; title?: string }) => {
  const domain = useMemo(() => {
    try {
      return new URL(href).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }, [href]);

  return (
    <Suspense fallback={
      <div className="flex flex-col bg-muted/30 text-xs m-0">
        <div className="flex items-center space-x-2 px-3 py-2">
          <div className="w-[14px] h-[14px] bg-muted/50 rounded-sm shrink-0 animate-pulse" />
          <span className="truncate font-medium text-foreground text-[10px]">{domain}</span>
        </div>
        <div className="px-3 pb-2 pt-1">
          <div className="h-4 w-3/4 bg-muted/50 animate-pulse rounded"></div>
        </div>
      </div>
    }>
      <LinkPreviewContent href={href} title={title} />
    </Suspense>
  );
});

LinkPreview.displayName = 'LinkPreview';

// Mobile-friendly HoverCard component
const MobileHoverCard: React.FC<{
  href: string;
  text: React.ReactNode;
  isCitation?: boolean;
  citationText?: string;
}> = React.memo(({ href, text, isCitation = false, citationText }) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const title = citationText || (typeof text === 'string' ? text : '');

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isMobile) {
      if (isOpen) {
        // If preview is already open, allow navigation
        // Don't prevent default, let the link work normally
        setIsOpen(false);
      } else {
        // First tap: show preview
        e.preventDefault();
        setIsOpen(true);
      }
    }
    // On desktop, let the link work normally (hover will show preview)
  }, [isMobile, isOpen]);

  // Always use controlled mode to prevent mode switching during hydration
  // On desktop, HoverCard's hover events will trigger onOpenChange naturally
  // On mobile, we explicitly control it via tap interactions
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  return (
    <HoverCard 
      open={isOpen}
      onOpenChange={handleOpenChange}
      openDelay={!isMobile ? 10 : undefined}
    >
      <HoverCardTrigger asChild>
        <Link
          href={href}
          target="_blank"
          onClick={handleClick}
          className={
            isCitation
              ? 'cursor-pointer text-[10px] no-underline py-0.5 px-1.5 m-0! bg-accent/80 border border-border/40 rounded font-mono font-medium inline-block whitespace-nowrap items-center -translate-y-0.5 leading-none hover:bg-accent hover:border-border/60 active:bg-accent active:border-border/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 touch-manipulation'
              : 'text-primary bg-primary/10 no-underline hover:underline font-medium active:underline touch-manipulation'
          }
        >
          {isCitation ? <span className="text-foreground">{text}</span> : text}
        </Link>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-64 p-0 shadow-xl border border-border rounded-lg overflow-hidden bg-background/95 backdrop-blur-sm"
        onClick={(e) => {
          // Allow clicks inside the preview to work normally (for navigation)
          e.stopPropagation();
        }}
      >
        <LinkPreview href={href} title={title} />
      </HoverCardContent>
    </HoverCard>
  );
});

MobileHoverCard.displayName = 'MobileHoverCard';

interface CitationGroupProps {
  urls: string[];
  texts: string[];
  elementKey: string;
}

// Citation item with favicon fallback
const CitationItem = React.memo(({ url, text, domain, itemKey }: { url: string; text: string; domain: string; itemKey: string }) => {
  const [faviconError, setFaviconError] = useState(false);
  const [proxyError, setProxyError] = useState(false);
  const googleFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  const proxiedFavicon = `/api/proxy-image?url=${encodeURIComponent(googleFavicon)}`;

  const handleError = () => {
    if (!faviconError) {
      setFaviconError(true);
    } else {
      setProxyError(true);
    }
  };

  return (
    <Link
      key={itemKey}
      href={url}
      target="_blank"
      className="flex items-center gap-2 px-3 py-2 no-underline hover:bg-muted/50 active:bg-muted/50 transition-all duration-200 touch-manipulation"
    >
      {proxyError ? (
        <div className="w-[14px] h-[14px] flex items-center justify-center text-muted-foreground">
          <Globe size={14} />
        </div>
      ) : faviconError ? (
        <img
          src={proxiedFavicon}
          alt=""
          width={14}
          height={14}
          className="rounded-sm shrink-0"
          onError={handleError}
        />
      ) : (
        <Image
          src={googleFavicon}
          alt=""
          width={14}
          height={14}
          className="rounded-sm shrink-0"
          onError={handleError}
        />
      )}
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <h5 className="text-xs font-medium text-foreground truncate m-0 flex-1">{text}</h5>
        <p className="text-[10px] text-muted-foreground font-mono m-0 shrink-0">{domain}</p>
      </div>
    </Link>
  );
});

CitationItem.displayName = 'CitationItem';

const CitationGroup = React.memo(({ urls, texts, elementKey }: CitationGroupProps) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const firstDomain = useMemo(() => {
    try {
      return new URL(urls[0]).hostname.replace('www.', '');
    } catch {
      return urls[0];
    }
  }, [urls]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    if (isMobile) {
      if (isOpen) {
        // If preview is already open, close it
        setIsOpen(false);
      } else {
        // First tap: show preview
        e.preventDefault();
        setIsOpen(true);
      }
    }
  }, [isMobile, isOpen]);

  // Always use controlled mode to prevent mode switching during hydration
  // On desktop, HoverCard's hover events will trigger onOpenChange naturally
  // On mobile, we explicitly control it via tap interactions
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  return (
    <HoverCard 
      open={isOpen}
      onOpenChange={handleOpenChange}
      openDelay={!isMobile ? 10 : undefined}
    >
      <HoverCardTrigger asChild>
        <span
          onClick={handleClick}
          className="cursor-pointer text-[10px] no-underline py-0.5 px-1.5 m-0! bg-accent/80 border border-border/40 rounded font-mono font-medium inline-block whitespace-nowrap items-center -translate-y-0.5 leading-none hover:bg-accent hover:border-border/60 active:bg-accent active:border-border/60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 touch-manipulation"
        >
          <span className="text-foreground">{firstDomain}</span>
          <span className="text-muted-foreground/60"> +{urls.length - 1}</span>
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-72 p-0 shadow-xl border border-border rounded-lg overflow-hidden bg-background/95 backdrop-blur-sm"
        onClick={(e) => {
          // Allow clicks inside the preview to work normally (for navigation)
          e.stopPropagation();
        }}
      >
        <div className="relative font-mono">
          <div className="px-3 py-2 bg-muted/30">
            <h4 className="text-[10px] font-semibold text-foreground">Sources · {urls.length}</h4>
          </div>
          <div className="max-h-[400px] overflow-y-auto bg-muted/20">
            {urls.map((url, index) => {
              const domain = useMemo(() => {
                try {
                  return new URL(url).hostname.replace('www.', '');
                } catch {
                  return url;
                }
              }, [url]);

              return (
                <CitationItem
                  key={`${elementKey}-${index}`}
                  url={url}
                  text={texts[index]}
                  domain={domain}
                  itemKey={`${elementKey}-${index}`}
                />
              );
            })}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
});

CitationGroup.displayName = 'CitationGroup';

const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(
  ({ content, isUserMessage = false }) => {
    const { processedContent, citations: extractedCitations, citationGroups, latexBlocks, isProcessing } = useProcessedContent(content);
    const citationLinks = extractedCitations;

    // Preload metadata for all citation URLs as content streams in
    useEffect(() => {
      if (!isUserMessage && content) {
        preloadCitationMetadata(content);
      }
    }, [content, isUserMessage]);

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
        return (
          <MobileHoverCard href={href} text={text} isCitation={isCitation} citationText={citationText} />
        );
      },
      [],
    );

    const renderCitation = useCallback(
      (index: number, citationText: string, href: string, key: string) => {
        // Extract root domain from URL
        let domain = '';
        try {
          const url = new URL(href);
          domain = url.hostname.replace('www.', '');
        } catch {
          domain = href;
        }
        return <>{renderHoverCard(href, domain, true, citationText)}</>;
      },
      [renderHoverCard],
    );

    const renderer: Partial<ReactRenderer> = useMemo(
      () => ({
        text(text: string) {
          // Check if text contains any LaTeX patterns or citation groups without mutating regex state
          const hasLatex = text.includes('§§§LATEXBLOCK_PROTECTED_') || text.includes('§§§LATEXINLINE_PROTECTED_');
          const hasCitationGroup = text.includes('§§§CITATIONGROUP_');

          if (!hasLatex && !hasCitationGroup) {
            return text;
          }

          // Create fresh regex patterns for execution
          const blockPattern = /§§§LATEXBLOCK_PROTECTED_(\d+)§§§/g;
          const inlinePattern = /§§§LATEXINLINE_PROTECTED_(\d+)§§§/g;
          const citationGroupPattern = /§§§CITATIONGROUP_(\d+)§§§/g;

          const components: any[] = [];
          let lastEnd = 0;
          const allMatches: Array<{ match: RegExpExecArray; type: 'latex-block' | 'latex-inline' | 'citation-group' }> = [];

          let match;
          while ((match = blockPattern.exec(text)) !== null) {
            allMatches.push({ match, type: 'latex-block' });
          }
          while ((match = inlinePattern.exec(text)) !== null) {
            allMatches.push({ match, type: 'latex-inline' });
          }
          while ((match = citationGroupPattern.exec(text)) !== null) {
            allMatches.push({ match, type: 'citation-group' });
          }

          allMatches.sort((a, b) => a.match.index - b.match.index);

          allMatches.forEach(({ match, type }) => {
            const fullMatch = match[0];
            const start = match.index;

            if (start > lastEnd) {
              const textContent = text.slice(lastEnd, start);
              const key = getElementKey('text', textContent);
              components.push(<span key={key}>{textContent}</span>);
            }

            if (type === 'citation-group') {
              const citationGroup = citationGroups.find((group) => group.id === fullMatch);
              if (citationGroup) {
                const key = getElementKey('link', citationGroup.id);
                components.push(
                  <CitationGroup
                    key={key}
                    urls={citationGroup.urls}
                    texts={citationGroup.texts}
                    elementKey={key}
                  />
                );
              }
            } else {
              const latexBlock = latexBlocks.find((block) => block.id === fullMatch);
              if (latexBlock) {
                const key = getElementKey('text', latexBlock.content);
                if (type === 'latex-block') {
                  components.push(
                    <SafeLatex
                      key={key}
                      delimiters={[
                        { left: '$$', right: '$$', display: true },
                        { left: '\\[', right: '\\]', display: true },
                      ]}
                      isBlock={true}
                    >
                      {latexBlock.content}
                    </SafeLatex>,
                  );
                } else {
                  components.push(
                    <SafeLatex
                      key={key}
                      delimiters={[
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                      ]}
                      isBlock={false}
                    >
                      {latexBlock.content}
                    </SafeLatex>,
                  );
                }
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
                    <SafeLatex
                      delimiters={[
                        { left: '$$', right: '$$', display: true },
                        { left: '\\[', right: '\\]', display: true },
                      ]}
                      isBlock={true}
                    >
                      {latexBlock.content}
                    </SafeLatex>
                  </div>
                );
              }
            }
          }

          return (
            <p
              key={key}
              className={`${isUserMessage ? 'leading-relaxed text-foreground m-0!' : ''} m-0! text-[15px] leading-[1.75] text-foreground/95`}
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
                <span key={key} className="inline-block">
                  {linkText} ({href})
                </span>
              );
            }
            return (
              <span key={key} className="inline-block">
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
          const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
          const sizeClasses =
            {
              1: 'text-[18px] md:text-[22px] font-semibold! my-5!',
              2: 'text-[16px] md:text-[18px] font-semibold! my-4!',
              3: 'text-[15px] md:text-[16px] font-semibold! my-3.5!',
              4: 'text-[14px] md:text-[15px] font-medium my-3!',
              5: 'text-[13px] md:text-[14px] font-medium my-3!',
              6: 'text-[12px] md:text-[13px] font-medium my-3!',
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
                ordered ? 'pl-8' : 'pl-8 list-disc marker:text-primary/70',
              )}
            >
              {children}
            </ListTag>
          );
        },
        listItem(children) {
          const key = getElementKey('listItem');
          return (
            <li key={key} className="pl-2 text-[15px] leading-relaxed text-foreground/90">
              <span className="inline">{children}</span>
            </li>
          );
        },
        blockquote(children) {
          const key = getElementKey('blockquote');
          return (
            <blockquote
              key={key}
              className="my-3 border-l-2 border-border/40 pl-3 text-[14px] leading-relaxed text-muted-foreground"
            >
              {children}
            </blockquote>
          );
        },
        strong(children) {
          const key = getElementKey('text', String(children));
          return (
            <strong key={key} className="font-medium text-foreground">
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

          // Map children with stable keys
          const childrenWithKeys = Array.isArray(children)
            ? children.map((child, index) => <React.Fragment key={`${key}-child-${index}`}>{child}</React.Fragment>)
            : children;

          return isHeader ? (
            <TableHead
              key={key}
              className={cn(
                alignClass,
                'text-[15px] border-r border-border last:border-r-0 bg-muted/50 font-semibold p-2! m-1! whitespace-normal wrap-break-word min-w-[120px]',
              )}
            >
              {childrenWithKeys}
            </TableHead>
          ) : (
            <TableCell
              key={key}
              className={cn(alignClass, 'text-[15px] border-r border-border last:border-r-0 p-2! m-1! whitespace-normal wrap-break-word min-w-[120px]')}
            >
              {childrenWithKeys}
            </TableCell>
          );
        },
        tableHeader(children) {
          const key = getElementKey('table');
          return (
            <TableHeader key={key} className="p-1! m-1!">
              {children}
            </TableHeader>
          );
        },
        tableBody(children) {
          const key = getElementKey('table');
          return (
            <TableBody key={key} className="text-wrap! m-1!">
              {children}
            </TableBody>
          );
        },
      }),
      [latexBlocks, citationGroups, isUserMessage, renderCitation, renderHoverCard, getElementKey, citationLinks],
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
  },
  (prevProps, nextProps) => {
    return prevProps.content === nextProps.content && prevProps.isUserMessage === nextProps.isUserMessage;
  },
);

MarkdownRenderer.displayName = 'MarkdownRenderer';

// Virtual scrolling component for very large content
const VirtualMarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(
  ({ content, isUserMessage = false }) => {
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
          <MarkdownRenderer key={`chunk-${visibleRange.start + index}`} content={chunk} isUserMessage={isUserMessage} />
        ))}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.content === nextProps.content && prevProps.isUserMessage === nextProps.isUserMessage;
  },
);

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
const OptimizedMarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(
  ({ content, isUserMessage = false }) => {
    usePerformanceMonitor(content);

    // Automatically choose the best rendering strategy based on content size
    if (content.length > 100000) {
      return <VirtualMarkdownRenderer content={content} isUserMessage={isUserMessage} />;
    }

    return <MarkdownRenderer content={content} isUserMessage={isUserMessage} />;
  },
  (prevProps, nextProps) => {
    return prevProps.content === nextProps.content && prevProps.isUserMessage === nextProps.isUserMessage;
  },
);

OptimizedMarkdownRenderer.displayName = 'OptimizedMarkdownRenderer';

export { MarkdownRenderer, VirtualMarkdownRenderer, OptimizedMarkdownRenderer as default };
