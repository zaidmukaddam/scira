/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Globe, ArrowUpRight, TextIcon, ChevronDown, Layers } from 'lucide-react';
import { LightningIcon } from '@phosphor-icons/react';

// Types
interface RetrieveResult {
  url: string;
  content: string;
  title: string;
  description: string;
  author?: string;
  publishedDate?: string;
  image?: string;
  favicon?: string;
  language?: string;
  metadata?: {
    platform?: string;
    type?: string;
    stats?: any;
    verified?: boolean;
    tags?: string[];
    hasTranscript?: boolean;
  };
}

interface RetrieveResponse {
  urls: string[];
  results: RetrieveResult[];
  sources: string[];
  response_time: number;
  error?: string;
  partial_errors?: string[];
}

// Helper function to proxy images from social media
const getProxiedImageUrl = (url: string) => {
  const needsProxy =
    url.includes('ytimg.com') ||
    url.includes('youtube.com') ||
    url.includes('yt3.ggpht.com') ||
    url.includes('tiktokcdn.com') ||
    url.includes('pbs.twimg.com') ||
    url.includes('cdninstagram.com') ||
    url.includes('fbcdn.net');

  return needsProxy ? `/api/proxy-image?url=${encodeURIComponent(url)}` : url;
};

// Get favicon URL
const getFaviconUrl = (url: string, favicon?: string) => {
  if (favicon) {
    return getProxiedImageUrl(favicon);
  }
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
  } catch {
    return null;
  }
};

// Source Card Component - For multi-URL display
const SourceCard: React.FC<{ result: RetrieveResult; onClick?: () => void }> = React.memo(({ result, onClick }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const faviconUrl = React.useMemo(() => getFaviconUrl(result.url, result.favicon), [result.url, result.favicon]);
  const hostname = React.useMemo(() => {
    try {
      return new URL(result.url).hostname.replace('www.', '');
    } catch {
      return result.url;
    }
  }, [result.url]);

  return (
    <div
      className={cn(
        'group relative',
        'px-3.5 py-2 transition-colors',
        'hover:bg-muted/10',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2.5">
        <div className="relative w-3.5 h-3.5 flex items-center justify-center shrink-0 rounded-sm overflow-hidden">
          {faviconUrl ? (
            <img
              src={faviconUrl}
              alt=""
              width={14}
              height={14}
              className={cn('object-contain', !imageLoaded && 'opacity-0')}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                setImageLoaded(true);
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Globe className="w-3 h-3 text-muted-foreground/50" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-medium text-foreground line-clamp-1 flex-1">{result.title}</h3>
            <ArrowUpRight className="w-2.5 h-2.5 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground/60 truncate">{hostname}</span>
            {result.author && (
              <>
                <span className="text-[10px] text-muted-foreground/30">·</span>
                <span className="text-[10px] text-muted-foreground/60 truncate">{result.author}</span>
              </>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/50 line-clamp-1 mt-0.5 leading-relaxed">{result.description}</p>
        </div>
      </div>
    </div>
  );
});

SourceCard.displayName = 'SourceCard';

// Single URL Result Component
export const RetrieveSingleResult: React.FC<{ result: RetrieveResponse }> = ({ result }) => {
  const singleResult = result.results[0];

  if (!singleResult) {
    return (
      <div className="rounded-xl border border-amber-500/20 my-4 p-4 bg-amber-500/5">
        <div className="flex items-center gap-2.5">
          <Globe className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">No content available</span>
        </div>
      </div>
    );
  }

  const hostname = (() => {
    try { return new URL(singleResult.url).hostname.replace('www.', ''); } catch { return singleResult.url; }
  })();

  return (
    <div className="rounded-xl border border-border/60 my-4 overflow-hidden bg-card/30">
      {singleResult.image && (
        <div className="h-32 overflow-hidden relative">
          <Image
            src={getProxiedImageUrl(singleResult.image)}
            alt={singleResult.title || 'Featured image'}
            className="w-full h-full object-cover"
            width={128}
            height={128}
            unoptimized
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex gap-3">
          <div className="relative w-10 h-10 shrink-0">
            {singleResult.favicon ? (
              <Image
                className="w-full h-full object-contain rounded-lg"
                src={getProxiedImageUrl(singleResult.favicon)}
                alt=""
                width={48}
                height={48}
                unoptimized
                onError={(e) => {
                  e.currentTarget.src = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(singleResult.url)}`;
                }}
              />
            ) : (
              <Image
                className="w-full h-full object-contain rounded-lg"
                src={`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(singleResult.url)}`}
                alt=""
                width={48}
                height={48}
                unoptimized
                onError={(e) => {
                  e.currentTarget.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'%3E%3Cpath fill='none' d='M0 0h24v24H0z'/%3E%3Cpath d='M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z' fill='rgba(128,128,128,0.3)'/%3E%3C/svg%3E";
                }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-medium text-foreground truncate">{singleResult.title || 'Retrieved Content'}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              {singleResult.author && (
                <span className="text-[10px] text-muted-foreground/60">{singleResult.author}</span>
              )}
              {singleResult.author && singleResult.publishedDate && <span className="text-[10px] text-muted-foreground/30">·</span>}
              {singleResult.publishedDate && (
                <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                  {new Date(singleResult.publishedDate).toLocaleDateString()}
                </span>
              )}
              {result.response_time && (
                <>
                  <span className="text-[10px] text-muted-foreground/30">·</span>
                  <span className="text-[10px] text-muted-foreground/40 tabular-nums">{result.response_time.toFixed(1)}s</span>
                </>
              )}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/60 mt-3 line-clamp-2 leading-relaxed">
          {singleResult.description || 'No description available'}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <a
            href={singleResult.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
          >
            <ArrowUpRight className="h-2.5 w-2.5" />
            View source
          </a>
          <span className="text-[10px] text-muted-foreground/40">{hostname}</span>
        </div>
      </div>

      <div className="border-t border-border/40">
        <Accordion type="single" collapsible>
          <AccordionItem value="content0" className="border-0">
            <AccordionTrigger className="group px-4 py-2.5 text-xs text-muted-foreground hover:bg-muted/20 transition-colors no-underline! [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-muted-foreground/50">
              <div className="flex items-center gap-2">
                <TextIcon className="h-3 w-3 text-muted-foreground/40" />
                <span className="font-pixel text-[10px] text-muted-foreground/60 tracking-wider">Full content</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              <div className="max-h-[50vh] overflow-y-auto p-4 bg-muted/10 border-t border-border/30">
                <div className="prose prose-neutral dark:prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{singleResult.content || 'No content available'}</ReactMarkdown>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};

// Enhanced Source Card for Multi-URL
const EnhancedSourceCard: React.FC<{ result: RetrieveResult; index: number }> = React.memo(({ result }) => {
  const faviconUrl = React.useMemo(() => getFaviconUrl(result.url, result.favicon), [result.url, result.favicon]);
  const hostname = React.useMemo(() => {
    try {
      return new URL(result.url).hostname.replace('www.', '');
    } catch {
      return result.url;
    }
  }, [result.url]);

  return (
    <div className="px-3.5 py-2.5 hover:bg-muted/10 transition-colors group">
      <div className="flex gap-3">
        {result.image && (
          <div className="w-16 h-12 shrink-0 rounded-md overflow-hidden bg-muted/20">
            <Image
              src={getProxiedImageUrl(result.image)}
              alt={result.title || ''}
              className="w-full h-full object-cover"
              width={64}
              height={48}
              unoptimized
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {faviconUrl && (
              <Image
                className="w-3.5 h-3.5 object-contain rounded-sm shrink-0"
                src={faviconUrl}
                alt=""
                width={14}
                height={14}
                unoptimized
                onError={(e) => {
                  e.currentTarget.src = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(result.url)}`;
                }}
              />
            )}
            <h3 className="text-xs font-medium text-foreground line-clamp-1 flex-1">{result.title}</h3>
            <ArrowUpRight className="w-2.5 h-2.5 shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground/60">{hostname}</span>
            {result.author && (
              <>
                <span className="text-[10px] text-muted-foreground/30">·</span>
                <span className="text-[10px] text-muted-foreground/60 truncate">{result.author}</span>
              </>
            )}
            {result.publishedDate && (
              <>
                <span className="text-[10px] text-muted-foreground/30">·</span>
                <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                  {new Date(result.publishedDate).toLocaleDateString()}
                </span>
              </>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground/50 mt-0.5 line-clamp-1 leading-relaxed">{result.description}</p>
        </div>
      </div>
    </div>
  );
});

EnhancedSourceCard.displayName = 'EnhancedSourceCard';

// Multi URL Result Component
export const RetrieveMultiResults: React.FC<{ result: RetrieveResponse }> = ({ result }) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  if (result.results.length === 0) {
    return (
      <div className="rounded-xl border border-amber-500/20 p-4 bg-amber-500/5">
        <div className="flex items-center gap-2.5">
          <Globe className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">No content available</span>
            {result.error && <p className="text-[10px] text-amber-600/70 mt-0.5">{result.error}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="rounded-xl border border-border/60 overflow-hidden bg-card/30">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">Retrieved</span>
            <span className="text-[10px] text-muted-foreground/60 tabular-nums">{result.results.length} sources</span>
            {result.response_time && (
              <span className="text-[10px] text-muted-foreground/40 tabular-nums flex items-center gap-0.5">
                <LightningIcon className="h-2.5 w-2.5" />
                {result.response_time.toFixed(1)}s
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              'h-3 w-3 text-muted-foreground/60 transition-transform duration-200',
              isExpanded && 'rotate-180',
            )}
          />
        </button>

        {isExpanded && (
          <div className="border-t border-border/40">
            <div className="max-h-[600px] overflow-y-auto divide-y divide-border/20">
              {result.results.map((resultItem, index) => (
                <a key={index} href={resultItem.url} target="_blank" rel="noopener noreferrer" className="block">
                  <EnhancedSourceCard result={resultItem} index={index} />
                </a>
              ))}
            </div>

            {result.partial_errors && result.partial_errors.length > 0 && (
              <div className="px-4 py-2.5 bg-amber-500/5 border-t border-amber-500/20">
                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                  Some sources failed: {result.partial_errors.join('; ')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Main component that auto-detects single vs multi
export const RetrieveResults: React.FC<{ result: RetrieveResponse }> = ({ result }) => {
  if (result.urls.length === 1) {
    return <RetrieveSingleResult result={result} />;
  }

  return <RetrieveMultiResults result={result} />;
};
