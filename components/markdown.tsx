import 'katex/dist/katex.min.css';

import { GeistMono } from 'geist/font/mono';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';
import Latex from 'react-latex-next';
import Marked, { ReactRenderer } from 'marked-react';
import React, { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from '@/lib/utils';
import { Check, Copy, WrapText, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';

interface MarkdownRendererProps {
  content: string;
}

interface CitationLink {
  text: string;
  link: string;
}

const isValidUrl = (str: string) => {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

const preprocessLaTeX = (content: string) => {
  // First, handle escaped delimiters to prevent double processing
  let processedContent = content
    .replace(/\\\[/g, '___BLOCK_OPEN___')
    .replace(/\\\]/g, '___BLOCK_CLOSE___')
    .replace(/\\\(/g, '___INLINE_OPEN___')
    .replace(/\\\)/g, '___INLINE_CLOSE___');

  // Process block equations
  processedContent = processedContent.replace(
    /___BLOCK_OPEN___([\s\S]*?)___BLOCK_CLOSE___/g,
    (_, equation) => `$$${equation.trim()}$$`
  );

  // Process inline equations
  processedContent = processedContent.replace(
    /___INLINE_OPEN___([\s\S]*?)___INLINE_CLOSE___/g,
    (_, equation) => `$${equation.trim()}$`
  );

  // Handle common LaTeX expressions not wrapped in delimiters
  processedContent = processedContent.replace(
    /(\b[A-Z](?:_\{[^{}]+\}|\^[^{}]+|_[a-zA-Z\d]|\^[a-zA-Z\d])+)/g,
    (match) => `$${match}$`
  );

  // Handle any remaining escaped delimiters that weren't part of a complete pair
  processedContent = processedContent
    .replace(/___BLOCK_OPEN___/g, '\\[')
    .replace(/___BLOCK_CLOSE___/g, '\\]')
    .replace(/___INLINE_OPEN___/g, '\\(')
    .replace(/___INLINE_CLOSE___/g, '\\)');

  return processedContent;
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const citationLinks = useMemo<CitationLink[]>(() => {
    // Improved regex to better handle various markdown link formats
    return Array.from(content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)).map(match => {
      const text = match[1]?.trim() || '';
      const link = match[2]?.trim() || '';
      return { text, link };
    });
  }, [content]);

  interface CodeBlockProps {
    language: string | undefined;
    children: string;
  }

  const CodeBlock: React.FC<CodeBlockProps> = ({ language, children }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isWrapped, setIsWrapped] = useState(false);
    const { theme } = useTheme();

    const handleCopy = useCallback(async () => {
      await navigator.clipboard.writeText(children);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }, [children]);

    const toggleWrap = useCallback(() => {
      setIsWrapped(prev => !prev);
    }, []);

    return (
      <div className="group my-5 relative">
        <div className="rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-800 shadow-xs">
          <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <div className="px-2 py-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {language || 'text'}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleWrap}
                className={`
                  px-2 py-1
                  rounded text-xs font-medium
                  transition-all duration-200
                  ${isWrapped ? 'text-primary' : 'text-neutral-500 dark:text-neutral-400'}
                  hover:bg-neutral-200 dark:hover:bg-neutral-700
                  flex items-center gap-1.5
                `}
                aria-label="Toggle line wrapping"
              >
                {isWrapped ? (
                  <>
                    <ArrowLeftRight className="h-3 w-3" />
                    <span className="hidden sm:inline">Unwrap</span>
                  </>
                ) : (
                  <>
                    <WrapText className="h-3 w-3" />
                    <span className="hidden sm:inline">Wrap</span>
                  </>
                )}
              </button>
              <button
                onClick={handleCopy}
                className={`
                  px-2 py-1
                  rounded text-xs font-medium
                  transition-all duration-200
                  ${isCopied ? 'text-primary dark:text-primary' : 'text-neutral-500 dark:text-neutral-400'}
                  hover:bg-neutral-200 dark:hover:bg-neutral-700
                  flex items-center gap-1.5
                `}
                aria-label="Copy code"
              >
                {isCopied ? (
                  <>
                    <Check className="h-3 w-3" />
                    <span className="hidden sm:inline">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <SyntaxHighlighter
            language={language || 'text'}
            style={theme === 'dark' ? oneDark : oneLight}
            customStyle={{
              margin: 0,
              padding: '0.75rem 0.25rem 0.75rem',
              backgroundColor: theme === 'dark' ? '#171717' : 'transparent',
              borderRadius: 0,
              borderBottomLeftRadius: '0.375rem',
              borderBottomRightRadius: '0.375rem',
              fontFamily: GeistMono.style.fontFamily,
            }}
            showLineNumbers={true}
            lineNumberStyle={{
              textAlign: 'right',
              color: theme === 'dark' ? '#6b7280' : '#808080',
              backgroundColor: 'transparent',
              fontStyle: 'normal',
              marginRight: '1em',
              paddingRight: '0.5em',
              fontFamily: GeistMono.style.fontFamily,
              minWidth: '2em'
            }}
            lineNumberContainerStyle={{
              backgroundColor: theme === 'dark' ? '#171717' : '#f5f5f5',
              float: 'left'
            }}
            wrapLongLines={isWrapped}
            codeTagProps={{
              style: {
                fontFamily: GeistMono.style.fontFamily,
                fontSize: '0.85em',
                whiteSpace: isWrapped ? 'pre-wrap' : 'pre',
                overflowWrap: isWrapped ? 'break-word' : 'normal',
                wordBreak: isWrapped ? 'break-word' : 'keep-all'
              }
            }}
          >
            {children}
          </SyntaxHighlighter>
        </div>
      </div>
    );
  };

  CodeBlock.displayName = 'CodeBlock';

  const LinkPreview = ({ href, title }: { href: string, title?: string }) => {
    const domain = new URL(href).hostname;

    return (
      <div className="flex flex-col bg-white dark:bg-neutral-800 text-xs m-0">
        <div className="flex items-center h-6 space-x-1.5 px-2 pt-2 text-xs text-neutral-600 dark:text-neutral-300">
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
            <h3 className="font-normal text-sm m-0 text-neutral-700 dark:text-neutral-200 line-clamp-3">
              {title}
            </h3>
          </div>
        )}
      </div>
    );
  };

  const renderHoverCard = (href: string, text: React.ReactNode, isCitation: boolean = false, citationText?: string) => {
    const title = citationText || (typeof text === 'string' ? text : '');

    return (
      <HoverCard openDelay={10}>
        <HoverCardTrigger asChild>
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={isCitation
              ? "cursor-pointer text-xs text-primary py-0.5 px-1.5 m-0 bg-primary/10 dark:bg-primary/20 rounded-full no-underline font-medium"
              : "text-primary dark:text-primary-light no-underline hover:underline font-medium"}
          >
            {text}
          </Link>
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          align="start"
          sideOffset={5}
          className="w-56 p-0 shadow-xs border border-neutral-200 dark:border-neutral-700 rounded-md overflow-hidden"
        >
          <LinkPreview href={href} title={title} />
        </HoverCardContent>
      </HoverCard>
    );
  };

  const generateKey = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  const renderer: Partial<ReactRenderer> = {
    text(text: string) {
      if (!text.includes('$')) return text;
      return (
        <Latex
          delimiters={[
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ]}
          key={generateKey()}
        >
          {text}
        </Latex>
      );
    },
    paragraph(children) {
      if (typeof children === 'string' && children.includes('$')) {
        return (
          <p className="my-5 leading-relaxed text-neutral-700 dark:text-neutral-300">
            <Latex
              delimiters={[
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
              ]}
              key={generateKey()}
            >
              {children}
            </Latex>
          </p>
        );
      }
      return <p className="my-5 leading-relaxed text-neutral-700 dark:text-neutral-300">{children}</p>;
    },
    code(children, language) {
      return <CodeBlock language={language} key={generateKey()}>{String(children)}</CodeBlock>;
    },
    link(href, text) {
      const citationIndex = citationLinks.findIndex(link => link.link === href);
      if (citationIndex !== -1) {
        // For citations, show the citation text in the hover card
        const citationText = citationLinks[citationIndex].text;
        return (
          <sup key={generateKey()}>
            {renderHoverCard(href, citationIndex + 1, true, citationText)}
          </sup>
        );
      }
      return isValidUrl(href)
        ? renderHoverCard(href, text)
        : <a href={href} className="text-primary dark:text-primary-light hover:underline font-medium">{text}</a>;
    },
    heading(children, level) {
      const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
      const sizeClasses = {
        1: "text-2xl md:text-3xl font-extrabold mt-8 mb-4",
        2: "text-xl md:text-2xl font-bold mt-7 mb-3",
        3: "text-lg md:text-xl font-semibold mt-6 mb-3",
        4: "text-base md:text-lg font-medium mt-5 mb-2",
        5: "text-sm md:text-base font-medium mt-4 mb-2",
        6: "text-xs md:text-sm font-medium mt-4 mb-2",
      }[level] || "";

      return (
        <HeadingTag className={`${sizeClasses} text-neutral-900 dark:text-neutral-50 tracking-tight`}>
          {children}
        </HeadingTag>
      );
    },
    list(children, ordered) {
      const ListTag = ordered ? 'ol' : 'ul';
      return (
        <ListTag className={`my-5 pl-6 space-y-2 text-neutral-700 dark:text-neutral-300 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {children}
        </ListTag>
      );
    },
    listItem(children) {
      return <li className="pl-1 leading-relaxed">{children}</li>;
    },
    blockquote(children) {
      return (
        <blockquote className="my-6 border-l-4 border-primary/30 dark:border-primary/20 pl-4 py-1 text-neutral-700 dark:text-neutral-300 italic bg-neutral-50 dark:bg-neutral-900/50 rounded-r-md">
          {children}
        </blockquote>
      );
    },
    table(children) {
      return (
        <div className="w-full my-6 overflow-hidden rounded-md">
          <div className="w-full overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800 shadow-xs">
            <table className="w-full border-collapse min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 m-0!">
              {children}
            </table>
          </div>
        </div>
      );
    },
    tableRow(children) {
      return (
        <tr className="border-b border-neutral-200 dark:border-neutral-800 last:border-0">
          {children}
        </tr>
      );
    },
    tableCell(children, flags) {
      const align = flags.align ? `text-${flags.align}` : 'text-left';
      const isHeader = flags.header;

      return isHeader ? (
        <th className={cn(
          "px-4 py-2.5 text-sm font-semibold text-neutral-900 dark:text-neutral-50",
          "bg-neutral-100 dark:bg-neutral-800/90",
          "whitespace-nowrap",
          align
        )}>
          {children}
        </th>
      ) : (
        <td className={cn(
          "px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300",
          "bg-white dark:bg-neutral-900",
          align
        )}>
          {children}
        </td>
      );
    },
    tableHeader(children) {
      return (
        <thead className="bg-neutral-100 dark:bg-neutral-800/90">
          {children}
        </thead>
      );
    },
    tableBody(children) {
      return (
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
          {children}
        </tbody>
      );
    },
  };

  return (
    <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none dark:text-neutral-200 font-sans">
      <Marked renderer={renderer}>
        {content}
      </Marked>
    </div>
  );
};

export const CopyButton = ({ text }: { text: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        if (!navigator.clipboard) {
          return;
        }
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast.success("Copied to clipboard");
      }}
      className="h-8 px-2 text-xs rounded-full"
    >
      {isCopied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
};

export { MarkdownRenderer, preprocessLaTeX }; 