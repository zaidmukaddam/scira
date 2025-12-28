/* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Globe, User2, Clock, Server, ArrowUpRight, TextIcon, ChevronDown, Layers } from 'lucide-react';
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
const SourceCard: React.FC<{ result: RetrieveResult; onClick?: () => void }> = ({ result, onClick }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const faviconUrl = getFaviconUrl(result.url, result.favicon);
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
        'border-b border-border',
        'py-2.5 px-3 transition-all duration-150',
        'hover:bg-accent/50',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2.5">
        {/* Favicon */}
        <div className="relative w-4 h-4 mt-0.5 flex items-center justify-center shrink-0 rounded-full overflow-hidden bg-muted">
          {faviconUrl ? (
            <img
              src={faviconUrl}
              alt=""
              width={16}
              height={16}
              className={cn('object-contain opacity-60', !imageLoaded && 'opacity-0')}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                setImageLoaded(true);
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          {/* Title and Domain */}
          <div className="flex items-baseline gap-1.5">
            <h3 className="font-medium text-[13px] text-foreground line-clamp-1 flex-1">{result.title}</h3>
            <ArrowUpRight className="w-3 h-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate">{hostname}</span>
            {result.author && (
              <>
                <span>·</span>
                <span className="truncate">{result.author}</span>
              </>
            )}
          </div>

          {/* Description */}
          <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">{result.description}</p>
        </div>
      </div>
    </div>
  );
};


// Single URL Result Component - Original detailed card design
export const RetrieveSingleResult: React.FC<{ result: RetrieveResponse }> = ({ result }) => {
  const singleResult = result.results[0];

  if (!singleResult) {
    return (
      <div className="border border-amber-200 dark:border-amber-500 rounded-xl my-4 p-4 bg-amber-50 dark:bg-amber-950/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
            <Globe className="h-4 w-4 text-amber-600 dark:text-amber-300" />
          </div>
          <div className="text-amber-700 dark:text-amber-300 text-sm font-medium">No content available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-neutral-200 rounded-xl my-4 overflow-hidden dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
      {singleResult.image && (
        <div className="h-36 overflow-hidden relative">
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
          <div className="relative w-12 h-12 shrink-0">
            {singleResult.favicon ? (
              <Image
                className="w-full h-full object-contain rounded-lg"
                src={getProxiedImageUrl(singleResult.favicon)}
                alt=""
                width={64}
                height={64}
                unoptimized
                onError={(e) => {
                  e.currentTarget.src = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(
                    singleResult.url,
                  )}`;
                }}
              />
            ) : (
              <Image
                className="w-full h-full object-contain rounded-lg"
                src={`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(singleResult.url)}`}
                alt=""
                width={64}
                height={64}
                unoptimized
                onError={(e) => {
                  e.currentTarget.src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'%3E%3Cpath fill='none' d='M0 0h24v24H0z'/%3E%3Cpath d='M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-2.29-2.333A17.9 17.9 0 0 1 8.027 13H4.062a8.008 8.008 0 0 0 5.648 6.667zM10.03 13c.151 2.439.848 4.73 1.97 6.752A15.905 15.905 0 0 0 13.97 13h-3.94zm9.908 0h-3.965a17.9 17.9 0 0 1-1.683 6.667A8.008 8.008 0 0 0 19.938 13zM4.062 11h3.965A17.9 17.9 0 0 1 9.71 4.333 8.008 8.008 0 0 0 4.062 11zm5.969 0h3.938A15.905 15.905 0 0 0 12 4.248 15.905 15.905 0 0 0 10.03 11zm4.259-6.667A17.9 17.9 0 0 1 15.938 11h3.965a8.008 8.008 0 0 0-5.648-6.667z' fill='rgba(128,128,128,0.5)'/%3E%3C/svg%3E";
                }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="group">
              <h2 className="font-medium text-base text-neutral-900 dark:text-neutral-100 tracking-tight truncate">
                {singleResult.title || 'Retrieved Content'}
              </h2>
              <div className="hidden group-hover:block absolute bg-white dark:bg-neutral-900 shadow-lg rounded-lg p-2 -mt-1 max-w-lg z-10 border border-neutral-200 dark:border-neutral-800">
                <p className="text-sm text-neutral-900 dark:text-neutral-100">
                  {singleResult.title || 'Retrieved Content'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {singleResult.author && (
                <Badge
                  variant="secondary"
                  className="rounded-md bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-0 transition-colors"
                >
                  <User2 className="h-3 w-3 mr-1" />
                  {singleResult.author}
                </Badge>
              )}
              {singleResult.publishedDate && (
                <Badge
                  variant="secondary"
                  className="rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-0 transition-colors"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(singleResult.publishedDate).toLocaleDateString()}
                </Badge>
              )}
              {result.response_time && (
                <Badge
                  variant="secondary"
                  className="rounded-md bg-sky-50 hover:bg-sky-100 dark:bg-sky-900/20 dark:hover:bg-sky-900/30 text-sky-600 dark:text-sky-400 border-0 transition-colors"
                >
                  <Server className="h-3 w-3 mr-1" />
                  {result.response_time.toFixed(1)}s
                </Badge>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-3 line-clamp-2">
          {singleResult.description || 'No description available'}
        </p>

        <div className="mt-3 flex justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            {singleResult.url && (
              <Badge
                variant="secondary"
                className="rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-0 transition-colors cursor-pointer"
              >
                <a
                  href={singleResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5"
                >
                  <ArrowUpRight className="h-3 w-3" />
                  View source
                </a>
              </Badge>
            )}

            {/* Show source badge for Supadata */}
            {result.sources[0] === 'supadata' && (
              <Badge
                variant="secondary"
                className="rounded-md bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-0 transition-colors"
              >
                {singleResult.metadata?.platform || 'Social Media'}
              </Badge>
            )}
          </div>

          {singleResult.url && (() => {
            try {
              const hostname = new URL(singleResult.url).hostname.replace('www.', '');
              return (
                <Badge
                  variant="secondary"
                  className="rounded-md bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 border-0 transition-colors"
                >
                  <Globe className="h-3 w-3 mr-1" />
                  {hostname}
                </Badge>
              );
            } catch {
              return null;
            }
          })()}
        </div>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800">
        <Accordion type="single" collapsible>
          <AccordionItem value="content0" className="border-0">
            <AccordionTrigger className="group px-4 py-3 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors no-underline! rounded-t-none! data-[state=open]:rounded-b-none! data-[state=open]:bg-neutral-50 dark:data-[state=open]:bg-neutral-800/50 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-neutral-500 [&>svg]:transition-transform [&>svg]:duration-200">
              <div className="flex items-center gap-2">
                <TextIcon className="h-3.5 w-3.5 text-neutral-400" />
                <span>View full content</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              <div className="max-h-[50vh] overflow-y-auto p-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700">
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

// Enhanced Source Card for Multi-URL - Inspired by single URL design
const EnhancedSourceCard: React.FC<{ result: RetrieveResult; index: number }> = ({ result }) => {
  const faviconUrl = getFaviconUrl(result.url, result.favicon);
  const hostname = React.useMemo(() => {
    try {
      return new URL(result.url).hostname.replace('www.', '');
    } catch {
      return result.url;
    }
  }, [result.url]);

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 last:border-0">
      <div className="flex">
        {/* Image on left - 20% (only if image exists) */}
        {result.image && (
          <div className="w-[20%] shrink-0">
            <div className="h-full min-h-[120px] overflow-hidden relative">
              <Image
                src={getProxiedImageUrl(result.image)}
                alt={result.title || 'Featured image'}
                className="w-full h-full object-cover"
                width={128}
                height={128}
                unoptimized
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        )}

        {/* Content - takes full width if no image, 80% if image exists */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex gap-3">
            {/* Favicon */}
            <div className="relative w-10 h-10 shrink-0">
              {faviconUrl ? (
                <Image
                  className="w-full h-full object-contain rounded-lg"
                  src={faviconUrl}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                  onError={(e) => {
                    e.currentTarget.src = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(result.url)}`;
                  }}
                />
              ) : (
                <div className="w-full h-full rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-neutral-400" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className="font-medium text-sm text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug">
                {result.title}
              </h3>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {result.author && (
                  <Badge
                    variant="secondary"
                    className="rounded-md bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-0 text-[10px] h-5"
                  >
                    <User2 className="h-2.5 w-2.5 mr-1" />
                    {result.author}
                  </Badge>
                )}
                {result.publishedDate && (
                  <Badge
                    variant="secondary"
                    className="rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-0 text-[10px] h-5"
                  >
                    <Clock className="h-2.5 w-2.5 mr-1" />
                    {new Date(result.publishedDate).toLocaleDateString()}
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className="rounded-md bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 border-0 text-[10px] h-5"
                >
                  <Globe className="h-2.5 w-2.5 mr-1" />
                  {hostname}
                </Badge>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2.5 line-clamp-2 leading-relaxed">
            {result.description}
          </p>

          {/* Action button */}
          <div className="mt-3">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
            >
              <ArrowUpRight className="h-3 w-3" />
              View source
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// Multi URL Result Component - Rich card design inspired by single URL
export const RetrieveMultiResults: React.FC<{ result: RetrieveResponse }> = ({ result }) => {
  const [isExpanded, setIsExpanded] = React.useState(true); // Default to expanded for better UX

  if (result.results.length === 0) {
    return (
      <div className="border border-amber-200 dark:border-amber-500 rounded-xl p-4 bg-amber-50 dark:bg-amber-950/50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
            <Globe className="h-4 w-4 text-amber-600 dark:text-amber-300" />
          </div>
          <div>
            <div className="text-amber-700 dark:text-amber-300 text-sm font-medium">No content available</div>
            {result.error && <div className="text-amber-600/80 dark:text-amber-400/80 text-xs mt-1">{result.error}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Main card container */}
      <div className="border border-neutral-200 rounded-xl overflow-hidden dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors border-b border-neutral-200 dark:border-neutral-800"
        >
          <div className="flex items-center gap-2.5">
            <Layers className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Retrieved from {result.results.length} sources</span>
            {result.response_time && (
              <Badge
                variant="secondary"
                className="rounded-md border-0 text-[10px] h-5"
              >
                <LightningIcon className="h-2.5 w-2.5" />
                {result.response_time.toFixed(1)}s
              </Badge>
            )}
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-neutral-500 dark:text-neutral-400 transition-transform duration-200',
              isExpanded && 'rotate-180',
            )}
          />
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div>
            {/* Rich source cards */}
            <div className="max-h-[600px] overflow-y-auto">
              {result.results.map((resultItem, index) => (
                <EnhancedSourceCard key={index} result={resultItem} index={index} />
              ))}
            </div>

            {/* Footer with errors if any */}
            {result.partial_errors && result.partial_errors.length > 0 && (
              <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-800">
                <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  Some sources failed to load:
                </div>
                <div className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                  {result.partial_errors.join('; ')}
                </div>
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
  // Auto-detect if this is single or multiple URLs
  if (result.urls.length === 1) {
    return <RetrieveSingleResult result={result} />;
  }

  return <RetrieveMultiResults result={result} />;
};
