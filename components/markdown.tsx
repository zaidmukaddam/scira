import 'katex/dist/katex.min.css';

import { Geist_Mono } from 'next/font/google';
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
    }
  },
  {
    name: 'arXiv',
    pattern: /arXiv:(\d+\.\d+)/i,
    urlGenerator: (title: string, source: string) => {
      const match = source.match(/arXiv:(\d+\.\d+)/i);
      return match ? `https://arxiv.org/abs/${match[1]}` : null;
    }
  },
  {
    name: 'GitHub',
    pattern: /github\.com\/[^\/]+\/[^\/\s]+/i,
    urlGenerator: (title: string, source: string) => {
      const match = source.match(/(https?:\/\/github\.com\/[^\/]+\/[^\/\s]+)/i);
      return match ? match[1] : null;
    }
  },
  {
    name: 'DOI',
    pattern: /doi:(\S+)/i,
    urlGenerator: (title: string, source: string) => {
      const match = source.match(/doi:(\S+)/i);
      return match ? `https://doi.org/${match[1]}` : null;
    }
  }
];

// Helper function to process citations
const processCitation = (title: string, source: string): { text: string, url: string } | null => {
  for (const citationSource of citationSources) {
    if (citationSource.pattern.test(source)) {
      const url = citationSource.urlGenerator(title, source);
      if (url) {
        return {
          text: `${title} - ${source}`,
          url
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

const preprocessLaTeX = (content: string) => {
  // This function is kept for backward compatibility but is no longer used
  // The new LaTeX processing is integrated directly into the MarkdownRenderer
  return content;
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Table row counter for zebra striping
  const [tableRowCounter, setTableRowCounter] = useState(0);

  const [processedContent, extractedCitations, latexBlocks] = useMemo(() => {
    const citations: CitationLink[] = [];
    
    // First, extract and protect LaTeX blocks
    const latexBlocks: Array<{id: string, content: string, isBlock: boolean}> = [];
    let modifiedContent = content;
    
    // Extract block equations first (they need to be standalone)
    const blockPatterns = [
      { pattern: /\\\[([\s\S]*?)\\\]/g, isBlock: true },
      { pattern: /\$\$([\s\S]*?)\$\$/g, isBlock: true }
    ];
    
    blockPatterns.forEach(({pattern, isBlock}) => {
      modifiedContent = modifiedContent.replace(pattern, (match) => {
        const id = `LATEXBLOCK${latexBlocks.length}END`;
        latexBlocks.push({ id, content: match, isBlock });
        return id;
      });
    });
    
    // Extract inline equations - improved regex to handle complex cases
    const inlinePatterns = [
      { pattern: /\\\(([\s\S]*?)\\\)/g, isBlock: false },
      // Better inline LaTeX regex that handles nested braces and special chars
      { pattern: /\$(?!\d)(?:[^\$\\]|\\.|\\\{[^}]*\})*\$/g, isBlock: false }
    ];
    
    inlinePatterns.forEach(({pattern, isBlock}) => {
      modifiedContent = modifiedContent.replace(pattern, (match) => {
        const id = `LATEXINLINE${latexBlocks.length}END`;
        latexBlocks.push({ id, content: match, isBlock });
        return id;
      });
    });
    
    // Now process citations (LaTeX is already protected)
    // Process standard markdown links
    const stdLinkRegex = /\[([^\]]+)\]\(((?:\([^()]*\)|[^()])*)\)/g;
    modifiedContent = modifiedContent.replace(stdLinkRegex, (match, text, url) => {
      citations.push({ text, link: url });
      return `[${text}](${url})`;
    });
    
    // Process references followed by URLs
    const refWithUrlRegex = /(?:\[(?:(?:\[?(PDF|DOC|HTML)\]?\s+)?([^\]]+))\]|\b([^.!?\n]+?(?:\s+[-–—]\s+\w+|\s+\([^)]+\)))\b)(?:\s*(?:\(|\[\s*|\s+))(https?:\/\/[^\s)]+)(?:\s*[)\]]|\s|$)/g;
    modifiedContent = modifiedContent.replace(refWithUrlRegex, (match, docType, bracketText, plainText, url) => {
      const text = bracketText || plainText;
      const fullText = (docType ? `[${docType}] ` : '') + text;
      const cleanUrl = url.replace(/[.,;:]+$/, '');
      
      citations.push({ text: fullText.trim(), link: cleanUrl });
      return `[${fullText.trim()}](${cleanUrl})`;
    });
    
    // Process quoted paper titles
    const quotedTitleRegex = /"([^"]+)"(?:\s+([^.!?\n]+?)(?:\s+[-–—]\s+(?:[A-Z][a-z]+(?:\.[a-z]+)?|\w+:\S+)))/g;
    modifiedContent = modifiedContent.replace(quotedTitleRegex, (match, title, source) => {
      const citation = processCitation(title, source);
      if (citation) {
        citations.push({ text: citation.text.trim(), link: citation.url });
        return `[${citation.text.trim()}](${citation.url})`;
      }
      return match;
    });
    
    // Process raw URLs to documents
    const rawUrlRegex = /(https?:\/\/[^\s]+\.(?:pdf|doc|docx|ppt|pptx|xls|xlsx))\b/gi;
    modifiedContent = modifiedContent.replace(rawUrlRegex, (match, url) => {
      const filename = url.split('/').pop() || url;
      const alreadyLinked = citations.some(citation => citation.link === url);
      if (!alreadyLinked) {
        citations.push({ text: filename, link: url });
      }
      return match;
    });
    
    return [modifiedContent, citations, latexBlocks];
  }, [content]);
  
  const citationLinks = extractedCitations;

  interface CodeBlockProps {
    language: string | undefined;
    children: string;
  }

  const CodeBlock: React.FC<CodeBlockProps> = ({ language, children }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [isWrapped, setIsWrapped] = useState(false);
    const { resolvedTheme } = useTheme();

    const handleCopy = useCallback(async () => {
      await navigator.clipboard.writeText(children);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }, [children]);

    const toggleWrap = useCallback(() => {
      setIsWrapped(prev => !prev);
    }, []);

    return (
      <div className="group relative my-5 rounded-md border border-neutral-200/50 dark:border-neutral-800/50 bg-neutral-50/50 dark:bg-neutral-900/50 overflow-hidden">
        {/* Floating Controls */}
        <div className="absolute top-3 right-3 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={toggleWrap}
            className={cn(
              "p-1 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm transition-colors",
              isWrapped ? "text-blue-600 dark:text-blue-400" : "text-neutral-500 dark:text-neutral-400"
            )}
            title={isWrapped ? "Disable wrap" : "Enable wrap"}
          >
            {isWrapped ? <ArrowLeftRight size={12} /> : <WrapText size={12} />}
          </button>
          <button
            onClick={handleCopy}
            className={cn(
              "p-1 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm transition-colors",
              isCopied ? "text-green-600 dark:text-green-400" : "text-neutral-500 dark:text-neutral-400"
            )}
            title={isCopied ? "Copied!" : "Copy code"}
          >
            {isCopied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>

        <SyntaxHighlighter
          language={language || 'text'}
          style={resolvedTheme === 'dark' ? oneDark : oneLight}
          customStyle={{
            margin: 0,
            padding: '1rem',
            backgroundColor: 'transparent',
            fontSize: '0.775rem',
            lineHeight: '1.5',
            fontFamily: geistMono.style.fontFamily,
          }}
          showLineNumbers={true}
          lineNumberStyle={{
            color: resolvedTheme === 'dark' ? '#525252' : '#a3a3a3',
            paddingRight: '1rem',
            minWidth: '2rem',
            textAlign: 'right',
            userSelect: 'none',
            fontFamily: geistMono.style.fontFamily,
          }}
          codeTagProps={{
            style: {
              fontFamily: geistMono.style.fontFamily,
              whiteSpace: isWrapped ? 'pre-wrap' : 'pre',
              wordBreak: 'normal',
              overflowWrap: isWrapped ? 'break-word' : 'normal',
            }
          }}
        >
          {children}
        </SyntaxHighlighter>
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
              ? "cursor-pointer text-xs no-underline text-[#ff8c37] dark:text-[#ff9f57] py-0.5 px-1.25 m-0! bg-[#ff8c37]/10 dark:bg-[#ff9f57]/10 rounded-sm font-medium inline-flex items-center -translate-y-[1px] leading-none hover:bg-[#ff8c37]/20 dark:hover:bg-[#ff9f57]/20 focus:outline-none focus:ring-1 focus:ring-[#ff8c37] align-baseline"
              : "text-primary bg-primary/10 dark:text-primary-light no-underline hover:underline font-medium"}
          >
            {text}
          </Link>
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          align="start"
          sideOffset={5}
          className="w-64 p-0 shadow-lg border border-[#ff8c37]/30 dark:border-[#ff9f57]/30 rounded-md overflow-hidden bg-white dark:bg-neutral-900"
        >
          <LinkPreview href={href} title={title} />
        </HoverCardContent>
      </HoverCard>
    );
  };

  const generateKey = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  const renderCitation = (index: number, citationText: string, href: string) => {
    return (
      <span className="inline-flex items-baseline relative whitespace-normal" key={generateKey()}>
        {renderHoverCard(href, index + 1, true, citationText)}
      </span>
    );
  };

  const renderer: Partial<ReactRenderer> = {
    text(text: string) {
      // Check if this text contains any LaTeX placeholders
      const blockPattern = /LATEXBLOCK(\d+)END/g;
      const inlinePattern = /LATEXINLINE(\d+)END/g;
      
      // If no LaTeX placeholders, return text as-is
      if (!blockPattern.test(text) && !inlinePattern.test(text)) {
        return text;
      }
      
      // Reset regex state
      blockPattern.lastIndex = 0;
      inlinePattern.lastIndex = 0;
      
      // Process the text to replace placeholders with LaTeX components
      let processedText = text;
      const components: any[] = [];
      let lastEnd = 0;
      
      // Collect all matches (both block and inline)
      const allMatches: Array<{match: RegExpExecArray, isBlock: boolean}> = [];
      
      let match;
      while ((match = blockPattern.exec(text)) !== null) {
        allMatches.push({ match, isBlock: true });
      }
      
      while ((match = inlinePattern.exec(text)) !== null) {
        allMatches.push({ match, isBlock: false });
      }
      
      // Sort matches by position
      allMatches.sort((a, b) => a.match.index - b.match.index);
      
      // Process matches in order
      allMatches.forEach(({ match, isBlock }) => {
        const fullMatch = match[0];
        const start = match.index;
        
        // Add text before this match
        if (start > lastEnd) {
          components.push(text.slice(lastEnd, start));
        }
        
        // Find the corresponding LaTeX block
        const latexBlock = latexBlocks.find(block => block.id === fullMatch);
        if (latexBlock) {
          if (isBlock) {
            // Don't wrap block equations in div here - let paragraph handler do it
            components.push(
              <Latex
                key={`latex-${components.length}-${generateKey()}`}
                delimiters={[
                  { left: '$$', right: '$$', display: true },
                  { left: '\\[', right: '\\]', display: true }
                ]}
                strict={false}
              >
                {latexBlock.content}
              </Latex>
            );
          } else {
            components.push(
              <Latex
                key={`latex-${components.length}-${generateKey()}`}
                delimiters={[
                  { left: '$', right: '$', display: false },
                  { left: '\\(', right: '\\)', display: false }
                ]}
                strict={false}
              >
                {latexBlock.content}
              </Latex>
            );
          }
        } else {
          components.push(fullMatch); // fallback
        }
        
        lastEnd = start + fullMatch.length;
      });
      
      // Add any remaining text
      if (lastEnd < text.length) {
        components.push(text.slice(lastEnd));
      }
      
      return components.length === 1 ? components[0] : <>{components}</>;
    },
    paragraph(children) {
      // Check if the paragraph contains only a LaTeX block placeholder
      if (typeof children === 'string') {
        const blockMatch = children.match(/^LATEXBLOCK(\d+)END$/);
        if (blockMatch) {
          const latexBlock = latexBlocks.find(block => block.id === children);
          if (latexBlock && latexBlock.isBlock) {
            // Render block equations outside of paragraph tags
            return (
              <div className="my-6 text-center" key={generateKey()}>
                <Latex
                  delimiters={[
                    { left: '$$', right: '$$', display: true },
                    { left: '\\[', right: '\\]', display: true }
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
        return renderCitation(citationIndex, citationText, href);
      }
      return isValidUrl(href)
        ? renderHoverCard(href, text)
        : <a href={href} className="text-primary dark:text-primary-light hover:underline font-medium">{text}</a>;
    },
    heading(children, level) {
      const HeadingTag = `h${level}` as keyof React.JSX.IntrinsicElements;
      const sizeClasses = {
        1: "text-2xl md:text-3xl font-extrabold mt-4 mb-4",
        2: "text-xl md:text-2xl font-bold mt-4 mb-3",
        3: "text-lg md:text-xl font-semibold mt-4 mb-3",
        4: "text-base md:text-lg font-medium mt-4 mb-2",
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
      // Reset row counter for each table
      setTableRowCounter(0);
      return (
        <div className="w-full my-6">
          <div className="overflow-hidden rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse m-0!">
                {children}
              </table>
            </div>
          </div>
        </div>
      );
    },
    tableRow(children) {
      const currentRow = tableRowCounter;
      setTableRowCounter(prev => prev + 1);
      
      // Skip zebra striping for header rows
      const isEvenRow = currentRow > 0 && currentRow % 2 === 0;
      
      return (
        <tr className={cn(
          "border-b border-neutral-200 dark:border-neutral-700 last:border-b-0",
          "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors duration-200",
          isEvenRow && "bg-neutral-50/50 dark:bg-neutral-800/30"
        )}>
          {children}
        </tr>
      );
    },
    tableCell(children, flags) {
      const alignClass = flags.align 
        ? `text-${flags.align}` 
        : 'text-left';
      const isHeader = flags.header;

      return isHeader ? (
        <th className={cn(
          "px-4 py-3 text-sm font-semibold text-neutral-900 dark:text-neutral-50",
          "bg-neutral-100 dark:bg-neutral-800",
          "border-b border-neutral-200 dark:border-neutral-700",
          "break-words",
          alignClass
        )}>
          <div className="font-medium">
            {children}
          </div>
        </th>
      ) : (
        <td className={cn(
          "px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300",
          "border-r border-neutral-100 dark:border-neutral-800 last:border-r-0",
          "break-words",
          alignClass
        )}>
          <div className="leading-relaxed">
            {children}
          </div>
        </td>
      );
    },
    tableHeader(children) {
      return (
        <thead>
          {children}
        </thead>
      );
    },
    tableBody(children) {
      return (
        <tbody>
          {children}
        </tbody>
      );
    },
  };

  return (
    <div className="mt-3 markdown-body prose prose-neutral dark:prose-invert max-w-none dark:text-neutral-200 font-sans">
      <Marked renderer={renderer}>
        {processedContent}
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