/* eslint-disable @next/next/no-img-element */
'use client';

import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOptimizedScroll } from '@/hooks/use-optimized-scroll';
import type { extremeSearchTool, Research } from '@/lib/tools/extreme-search';
import type { UIToolInvocation } from 'ai';
import React, { useEffect, useState, memo, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Search, Target, Code2, FlaskConical, Lightbulb, Download, Loader2, X, MoreVertical, ExternalLink, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Cambio } from 'cambio';
import { DashLoading } from 'respinner';

import { TextShimmer } from '@/components/core/text-shimmer';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { DataExtremeSearchPart } from '@/lib/types';
import { Tabs as KumoTabs } from '@cloudflare/kumo';
import { XLogoIcon } from '@phosphor-icons/react/dist/ssr';
import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui/spinner';

const Tweet = dynamic(() => import('react-tweet').then(mod => ({ default: mod.Tweet })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[200px] rounded-lg border border-border bg-muted/30 animate-pulse flex items-center justify-center">
      <Spinner className="w-4 h-4" />
    </div>
  ),
});

// Custom minimal icons
const Icons = {
  Globe: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  ExternalLink: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
    </svg>
  ),
  ArrowUpRight: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M7 17L17 7M17 7H7M17 7v10" />
    </svg>
  ),
};

// Fetch image as blob and trigger a real download. Tries direct URL first; on CORS failure uses our proxy.
async function downloadImageBlob(url: string, filename: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, { mode: 'cors' });
  } catch {
    // CORS or network — fetch via same-origin proxy
    res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

// Chart wrapper component with Cambio expand and 3-dot dropdown for actions
const ChartWithFullView = memo(({ chart, index }: { chart: any; index: number }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const chartTitle = chart.title || `Chart ${index + 1}`;
  const sanitizedTitle = chartTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const imageUrl = chart.url;

  const handleDownload = useCallback(async () => {
    if (!imageUrl) return;
    const filename = `${sanitizedTitle}.png`;

    setIsDownloading(true);
    try {
      await downloadImageBlob(imageUrl, filename);
    } catch {
      // CORS or network error — fall back to opening in new tab
      window.open(imageUrl, '_blank');
    } finally {
      setIsDownloading(false);
    }
  }, [imageUrl, sanitizedTitle]);

  const handleOpenInNewTab = useCallback(() => {
    if (imageUrl) window.open(imageUrl, '_blank');
  }, [imageUrl]);

  if (!imageUrl) return null;

  return (
    <div className="relative group h-full">
      <Cambio.Root motion="smooth">
        <Cambio.Trigger className="w-full h-full rounded-lg border border-border overflow-hidden cursor-zoom-in block bg-card shadow-none">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <img src={imageUrl} alt={chartTitle} className="w-full h-full object-cover" draggable={false} loading="lazy" />
          </motion.div>
        </Cambio.Trigger>
        <Cambio.Portal>
          <Cambio.Backdrop className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
          <Cambio.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative">
              <img
                src={imageUrl}
                alt={chartTitle}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
                draggable={false}
              />
              <Cambio.Close className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </Cambio.Close>
            </div>
          </Cambio.Popup>
        </Cambio.Portal>
      </Cambio.Root>
      {/* 3-dot dropdown menu */}
      <div className={cn(
        "absolute top-3 right-3 transition-all duration-200 rotate-90",
        dropdownOpen ? "opacity-100 translate-y-0" : "opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"
      )}>
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-7 w-7 rounded-lg bg-background/95 backdrop-blur-md border border-border/50 shadow-none hover:bg-accent">
              <MoreVertical className="h-3.5 w-3.5" />
              <span className="sr-only">Chart options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4}>
            <DropdownMenuItem onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {isDownloading ? 'Downloading...' : 'Download as PNG'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenInNewTab}>
              <ExternalLink className="h-3.5 w-3.5" />
              Open in new tab
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}, (prev, next) => prev.chart?.url === next.chart?.url && prev.chart?.title === next.chart?.title && prev.index === next.index);

ChartWithFullView.displayName = 'ChartWithFullView';

// Types for Extreme Search
interface ExtremeSearchSource {
  title: string;
  url: string;
  content: string; // 🔧 FIX: Content is always provided by the tool, should not be optional
  favicon?: string;
  publishedDate?: string;
  published_date?: string;
  author?: string;
}

// Utility function for favicon (matching multi-search)
const getFaviconUrl = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
  } catch {
    return null;
  }
};

// Source Card Component for Extreme Search (minimal design)
const ExtremeSourceCard: React.FC<{
  source: ExtremeSearchSource;
  onClick?: () => void;
}> = ({ source, onClick }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const faviconUrl = source.favicon || getFaviconUrl(source.url);

  let hostname = '';
  try {
    hostname = new URL(source.url).hostname.replace('www.', '');
  } catch {
    hostname = source.url;
  }

  return (
    <div
      className={cn(
        'group py-3 px-4 flex items-start gap-3',
        'border-b border-border last:border-0',
        'hover:bg-accent/50 transition-colors duration-200',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      {/* Favicon */}
      <div className="relative w-5 h-5 mt-0.5 flex items-center justify-center shrink-0 rounded-md overflow-hidden bg-muted border border-border/50">
        {faviconUrl ? (
          <img
            src={faviconUrl}
            alt=""
            width={16}
            height={16}
            className={cn('object-contain opacity-70', !imageLoaded && 'opacity-0')}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              setImageLoaded(true);
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <Icons.Globe className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-medium text-sm text-foreground line-clamp-1">{source.title || hostname}</h3>
          <Icons.ArrowUpRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
          {source.content || 'Loading content...'}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="truncate font-medium">{hostname}</span>
          {source.author && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="truncate">{source.author}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Sources Sheet Component for Extreme Search
const ExtremeSourcesSheet: React.FC<{
  sources: ExtremeSearchSource[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ sources, open, onOpenChange }) => {
  const isMobile = useIsMobile();

  const SheetWrapper = isMobile ? Drawer : Sheet;
  const SheetContentWrapper = isMobile ? DrawerContent : SheetContent;

  return (
    <SheetWrapper open={open} onOpenChange={onOpenChange}>
      <SheetContentWrapper
        className={cn(isMobile ? 'h-[85vh]' : 'w-[600px] sm:max-w-[600px]', 'p-0 bg-background border-border')}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-5 border-b border-border bg-card">
            <div>
              <h2 className="text-lg font-semibold text-foreground">All Sources</h2>
              <p className="text-sm text-muted-foreground mt-1">{sources.length} research sources</p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-background">
            <div className="divide-y divide-border">
              {sources.map((source, index) => (
                <a key={index} href={source.url} target="_blank" className="block">
                  <ExtremeSourceCard source={source} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </SheetContentWrapper>
    </SheetWrapper>
  );
};

interface SearchQuery {
  id: string;
  query: string;
  index?: number;
  total?: number;
  status: 'started' | 'reading_content' | 'completed' | 'error';
  sources: ExtremeSearchSource[];
  content: Array<{ title: string; url: string; text: string; favicon?: string }>;
}

interface CodeExecution {
  id: string;
  title: string;
  code: string;
  status: 'running' | 'completed' | 'error';
  result?: string;
  charts?: any[];
}

interface ThinkingExecution {
  id: string;
  thought: string;
  nextStep?: string;
}

interface DoneExecution {
  id: string;
  summary: string;
}

interface XSearchExecution {
  id: string;
  query: string;
  index?: number;
  total?: number;
  startDate: string;
  endDate: string;
  handles?: string[];
  status: 'started' | 'completed' | 'error';
  result?: {
    content: string;
    citations: any[];
    sources: Array<{ text: string; link: string; title?: string }>;
    dateRange: string;
    handles: string[];
  };
}

interface FileQueryExecution {
  id: string;
  query: string;
  index?: number;
  total?: number;
  status: 'started' | 'completed' | 'error';
  results?: Array<{
    fileName: string;
    content: string;
    score: number;
  }>;
}

interface BrowsePageExecution {
  id: string;
  urls: string[];
  index?: number;
  total?: number;
  status: 'started' | 'browsing' | 'completed' | 'error';
  results?: Array<{
    url: string;
    title: string;
    content: string;
    favicon?: string;
    error?: string;
  }>;
}

const ExtremeSearchComponent = ({
  toolInvocation,
  annotations,
}: {
  toolInvocation: UIToolInvocation<ReturnType<typeof extremeSearchTool>>;
  annotations?: DataExtremeSearchPart[];
}) => {
  const { state } = toolInvocation;
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [userExpandedItems, setUserExpandedItems] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>('process');
  const [resultsOpen, setResultsOpen] = useState(true);
  const [sourcesSheetOpen, setSourcesSheetOpen] = useState(false);

  // Timeline container ref for auto-scroll
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineBottomRef = useRef<HTMLDivElement>(null);
  const { scrollToBottom, markManualScroll, resetManualScroll } = useOptimizedScroll(timelineBottomRef);
  const sourcesListRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const citationsListRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fileResultsListRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const codeResultRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleTimelineScroll = useCallback(
    function handleTimelineScroll() {
      const container = timelineRef.current;
      if (!container) return;

      const remaining = container.scrollHeight - container.scrollTop - container.clientHeight;
      const isNearBottom = remaining < 24;
      if (isNearBottom) {
        resetManualScroll();
        return;
      }

      markManualScroll();
    },
    [markManualScroll, resetManualScroll],
  );

  // Check if we're in final result state
  const isCompleted = useMemo(() => {
    // First check if tool has output
    if ('output' in toolInvocation) {
      return true;
    }

    // Also check if annotations indicate completion
    if (annotations?.length) {
      // Check for done annotation
      const doneAnnotation = annotations.find(
        (ann) => ann.type === 'data-extreme_search' && ann.data.kind === 'done',
      );
      if (doneAnnotation) {
        return true;
      }

      const planAnnotations = annotations.filter(
        (ann) => ann.type === 'data-extreme_search' && ann.data.kind === 'plan',
      );
      const latestPlan = planAnnotations[planAnnotations.length - 1];
      const isResearchCompleted =
        latestPlan?.data?.kind === 'plan' && latestPlan.data.status?.title === 'Research completed';

      if (isResearchCompleted) {
        return true;
      }
    }

    return false;
  }, [toolInvocation, annotations]);

  // Extract current status and plan from annotations
  const { currentStatus, planData } = useMemo(() => {
    // Check if we're completed first
    if (isCompleted) {
      return { currentStatus: 'Research completed', planData: null };
    }

    if (!annotations?.length) {
      return {
        currentStatus:
          state === 'input-streaming' || state === 'input-available' ? 'Processing research...' : 'Initializing...',
        planData: null,
      };
    }

    // Check for done annotation (wrapping up state)
    const doneAnnotation = annotations.find(
      (ann) => ann.type === 'data-extreme_search' && ann.data.kind === 'done',
    );
    if (doneAnnotation) {
      return { currentStatus: 'Wrapping up research...', planData: null };
    }

    // Get the latest plan annotation for plan data
    const planAnnotations = annotations.filter((ann) => ann.type === 'data-extreme_search' && ann.data.kind === 'plan');
    const latestPlan = planAnnotations[planAnnotations.length - 1];
    const plan = latestPlan?.data.kind === 'plan' && 'plan' in latestPlan.data ? latestPlan.data.plan : null;
    const hasPlan = plan !== null;

    // Get tool annotations for state tracking
    const queryAnnotations = annotations.filter((ann) => ann.type === 'data-extreme_search' && ann.data.kind === 'query');
    const xSearchAnnotations = annotations.filter((ann) => ann.type === 'data-extreme_search' && ann.data.kind === 'x_search');
    const codeAnnotations = annotations.filter((ann) => ann.type === 'data-extreme_search' && ann.data.kind === 'code');
    const thinkingAnnotations = annotations.filter((ann) => ann.type === 'data-extreme_search' && ann.data.kind === 'thinking');
    const fileQueryAnnotations = annotations.filter((ann) => ann.type === 'data-extreme_search' && ann.data.kind === 'file_query');
    const browsePageAnnotations = annotations.filter((ann) => ann.type === 'data-extreme_search' && ann.data.kind === 'browse_page');

    const hasSearches = queryAnnotations.length > 0 || xSearchAnnotations.length > 0 || fileQueryAnnotations.length > 0 || browsePageAnnotations.length > 0;
    const hasThinking = thinkingAnnotations.length > 0;

    // Get latest states
    const latestQuery = queryAnnotations[queryAnnotations.length - 1];
    const latestXSearch = xSearchAnnotations[xSearchAnnotations.length - 1];
    const latestFileQuery = fileQueryAnnotations[fileQueryAnnotations.length - 1];
    const latestBrowsePage = browsePageAnnotations[browsePageAnnotations.length - 1];
    const latestCode = codeAnnotations[codeAnnotations.length - 1];
    const latestThinking = thinkingAnnotations[thinkingAnnotations.length - 1];
    const latestNextStep = latestThinking?.data?.kind === 'thinking' ? latestThinking.data.nextStep : undefined;

    // Determine current status based on natural flow
    let dynamicStatus = 'Researching...';

    // Phase 1: Planning
    if (!hasPlan) {
      dynamicStatus = 'Planning research...';
    }
    // Phase 2: Research agent starting (plan ready but no searches yet)
    else if (hasPlan && !hasSearches && !hasThinking) {
      dynamicStatus = 'Planning completed, starting up research agent...';
    }
    // Phase 3: Active research
    else {
      // Check if we're in a thinking state (latest annotation is thinking)
      const latestAnnotation = annotations[annotations.length - 1];
      const isCurrentlyThinking = latestAnnotation?.data?.kind === 'thinking';

      // Check if searches/code are actively running
      const isSearching = latestQuery?.data?.kind === 'query' && latestQuery.data.status === 'started';
      const isReadingContent = latestQuery?.data?.kind === 'query' && latestQuery.data.status === 'reading_content';
      const isXSearching = latestXSearch?.data?.kind === 'x_search' && latestXSearch.data.status === 'started';
      const isFileQuerying = latestFileQuery?.data?.kind === 'file_query' && latestFileQuery.data.status === 'started';
      const isBrowsing = latestBrowsePage?.data?.kind === 'browse_page' && (latestBrowsePage.data.status === 'started' || latestBrowsePage.data.status === 'browsing');
      const isRunningCode = latestCode?.data?.kind === 'code' && latestCode.data.status === 'running';

      if (isCurrentlyThinking) {
        dynamicStatus = 'Thinking...';
      } else if (isRunningCode) {
        dynamicStatus = 'Running analysis...';
      } else if (isFileQuerying) {
        dynamicStatus = latestNextStep || 'Searching files...';
      } else if (isBrowsing) {
        dynamicStatus = latestNextStep || 'Browsing pages...';
      } else if (isSearching || isXSearching) {
        // Use nextStep from thinking if available during search
        dynamicStatus = latestNextStep || 'Searching...';
      } else if (isReadingContent) {
        dynamicStatus = 'Reading sources...';
      } else if (hasSearches) {
        // Between steps - analyzing
        dynamicStatus = 'Analyzing results...';
      }
    }

    return {
      currentStatus: dynamicStatus,
      planData: plan,
    };
  }, [annotations, state, isCompleted]);

  // Extract search queries from the ACTUAL tool invocation structure
  const searchQueries = useMemo(() => {
    // Check if we have results in the completed tool
    if ('output' in toolInvocation) {
      const { output } = toolInvocation;
      const researchData = output as { research?: Research } | null;

      if (researchData?.research?.toolResults) {
        const webSearchResults = researchData.research.toolResults.filter((result) => result.toolName === 'webSearch');

        return webSearchResults.flatMap((result, index) => {
          const resultData = result.result || result.output || {};

          if (Array.isArray(resultData)) {
            const query = result.args?.query || result.input?.query || `Query ${index + 1}`;
            const sources = resultData.map((source: any) => ({
              title: source.title || '',
              url: source.url || '',
              content: source.content || '',
              publishedDate: source.publishedDate || '',
              favicon:
                source.favicon ||
                `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(source.url || 'example.com').hostname)}`,
            }));

            return [
              {
                id: result.toolCallId || `query-${index}`,
                query,
                status: 'completed' as const,
                sources,
                content: [],
              },
            ];
          }

          const searches = Array.isArray(resultData.searches) ? resultData.searches : [];
          const total = searches.length || 0;

          return searches.map((search: any, searchIndex: number) => {
            const query =
              search.query ||
              result.args?.queries?.[searchIndex] ||
              result.input?.queries?.[searchIndex] ||
              `Query ${searchIndex + 1}`;
            const sources = (search.results || []).map((source: any) => ({
              title: source.title || '',
              url: source.url || '',
              content: source.content || '',
              publishedDate: source.publishedDate || '',
              favicon:
                source.favicon ||
                `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(source.url || 'example.com').hostname)}`,
            }));

            return {
              id: `${result.toolCallId || `query-${index}`}-${searchIndex}`,
              query,
              index: searchIndex,
              total: total || undefined,
              status: 'completed' as const,
              sources,
              content: [],
            };
          });
        });
      }
    }

    // For in-progress, try to extract from annotations
    if (annotations?.length) {
      const queryMap = new Map<string, SearchQuery>();

      annotations.forEach((ann) => {
        if (ann.type !== 'data-extreme_search') return;

        const { data } = ann;

        if (data.kind === 'query') {
          // Either create new query or update existing one
          const existingQuery = queryMap.get(data.queryId);
          if (existingQuery) {
            // Update existing query status
            existingQuery.status = data.status;
            existingQuery.index = data.index;
            existingQuery.total = data.total;
          } else {
            // Create new query
            queryMap.set(data.queryId, {
              id: data.queryId,
              query: data.query,
              index: data.index,
              total: data.total,
              status: data.status,
              sources: [],
              content: [],
            });
          }
        } else if (data.kind === 'source' && data.source) {
          const query = queryMap.get(data.queryId);
          if (query && !query.sources.find((s) => s.url === data.source.url)) {
            query.sources.push({
              title: data.source.title || '',
              url: data.source.url,
              content: '', // 🔧 Initialize with empty content, will be populated by content annotations
              favicon:
                data.source.favicon ||
                `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(data.source.url).hostname)}`,
            });
          }
        } else if (data.kind === 'content' && data.content) {
          const query = queryMap.get(data.queryId);
          if (query && !query.content.find((c) => c.url === data.content.url)) {
            query.content.push({
              title: data.content.title || '',
              url: data.content.url,
              text: data.content.text || '',
              favicon:
                data.content.favicon ||
                `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(data.content.url).hostname)}`,
            });
          }
        }
      });

      const queries = Array.from(queryMap.values());

      // 🔧 MERGE content data into sources for each query
      queries.forEach((query) => {
        query.sources.forEach((source) => {
          const matchingContent = query.content.find((c) => c.url === source.url);
          if (matchingContent && matchingContent.text) {
            source.content = matchingContent.text;
          }
        });
      });

      return queries;
    }

    return [];
  }, [toolInvocation, annotations]);

  // Extract X search executions from the ACTUAL tool invocation structure
  const xSearchExecutions = useMemo(() => {
    // Check if we have results in the completed tool
    if ('output' in toolInvocation) {
      const { output } = toolInvocation;
      const researchData = output as { research?: Research } | null;

      if (researchData?.research?.toolResults) {
        const xSearchResults = researchData.research.toolResults.filter((result) => result.toolName === 'xSearch');

        return xSearchResults.flatMap((result, index) => {
          const startDate = result.args?.startDate || result.input?.startDate || '';
          const endDate = result.args?.endDate || result.input?.endDate || '';
          const resultData = result.result || result.output || {};
          const handles =
            resultData.handles ||
            result.args?.includeXHandles ||
            result.args?.excludeXHandles ||
            result.input?.includeXHandles ||
            result.input?.excludeXHandles ||
            [];

          if (resultData && Array.isArray(resultData.searches)) {
            const total = resultData.searches.length || 0;
            return resultData.searches.map((search: any, searchIndex: number) => ({
              id: `${result.toolCallId || `x-search-${index}`}-${searchIndex}`,
              query: search.query || `X Search ${searchIndex + 1}`,
              index: searchIndex,
              total: total || undefined,
              startDate,
              endDate,
              handles,
              status: 'completed' as const,
              result: search.result || search,
            }));
          }

          const query = result.args?.query || result.input?.query || `X Search ${index + 1}`;
          return [
            {
              id: result.toolCallId || `x-search-${index}`,
              query,
              startDate,
              endDate,
              handles,
              status: 'completed' as const,
              result: resultData,
            },
          ];
        });
      }
    }

    // For in-progress, try to extract from annotations
    if (annotations?.length) {
      const xSearchMap = new Map<string, XSearchExecution>();

      annotations.forEach((ann) => {
        if (ann.type !== 'data-extreme_search' || ann.data.kind !== 'x_search') return;

        const { data } = ann;
        xSearchMap.set(data.xSearchId, {
          id: data.xSearchId,
          query: data.query,
          index: data.index,
          total: data.total,
          startDate: data.startDate,
          endDate: data.endDate,
          handles: data.handles,
          status: data.status,
          result: data.result,
        });
      });

      return Array.from(xSearchMap.values());
    }

    return [];
  }, [toolInvocation, annotations]);

  const thinkingExecutions = useMemo(() => {
    if ('output' in toolInvocation) {
      const { output } = toolInvocation;
      const researchData = output as { research?: Research } | null;

      if (researchData?.research?.toolResults) {
        const thinkingResults = researchData.research.toolResults.filter((result) => result.toolName === 'thinking');
        return thinkingResults.map((result, index) => {
          const resultData = result.result || result.output || {};
          const thought = resultData.thought || result.args?.thought || result.input?.thought || '';
          const nextStep =
            resultData.nextStep || result.args?.nextStep || result.input?.nextStep || result.args?.next_step;
          return {
            id: result.toolCallId || `thinking-${index}`,
            thought,
            nextStep,
          };
        });
      }
    }

    if (annotations?.length) {
      const thinkingMap = new Map<string, ThinkingExecution>();

      annotations.forEach((ann) => {
        if (ann.type !== 'data-extreme_search' || ann.data.kind !== 'thinking') return;

        thinkingMap.set(ann.data.thinkingId, {
          id: ann.data.thinkingId,
          thought: ann.data.thought,
          nextStep: ann.data.nextStep,
        });
      });

      return Array.from(thinkingMap.values());
    }

    return [];
  }, [toolInvocation, annotations]);

  // Extract code executions from the ACTUAL tool invocation structure
  const codeExecutions = useMemo(() => {
    // Check if we have results in the completed tool
    if ('output' in toolInvocation) {
      const { output } = toolInvocation;
      const researchData = output as { research?: Research } | null;

      if (researchData?.research?.toolResults) {
        const codeResults = researchData.research.toolResults.filter((result) => result.toolName === 'codeRunner');

        return codeResults.map((result, index) => {
          const title = result.args?.title || result.input?.title || `Code Execution ${index + 1}`;
          const code = result.args?.code || result.input?.code || '';
          const resultData = result.result || result.output || {};

          return {
            id: result.toolCallId || `code-${index}`,
            title,
            code,
            status: 'completed' as const,
            result: resultData.result || '',
            charts: resultData.charts || [],
          };
        });
      }
    }

    // For in-progress, try to extract from annotations
    if (annotations?.length) {
      const codeMap = new Map<string, CodeExecution>();

      annotations.forEach((ann) => {
        if (ann.type !== 'data-extreme_search' || ann.data.kind !== 'code') return;

        const { data } = ann;
        codeMap.set(data.codeId, {
          id: data.codeId,
          title: data.title,
          code: data.code,
          status: data.status,
          result: data.result,
          charts: data.charts,
        });
      });

      return Array.from(codeMap.values());
    }

    return [];
  }, [toolInvocation, annotations]);

  // Extract file query executions
  const fileQueryExecutions = useMemo(() => {
    if ('output' in toolInvocation) {
      const { output } = toolInvocation;
      const researchData = output as { research?: Research } | null;

      if (researchData?.research?.toolResults) {
        const fileQueryResults = researchData.research.toolResults.filter((result) => result.toolName === 'fileQuery');
        return fileQueryResults.flatMap((result) => {
          const resultData = result.result || result.output || {};
          const searches = Array.isArray(resultData.searches) ? resultData.searches : [];

          return searches.map((search: any, index: number) => ({
            id: `${result.toolCallId || 'fq'}-${index}`,
            query: search.query || '',
            index,
            total: searches.length,
            status: 'completed' as const,
            results: search.results || [],
          }));
        });
      }
    }

    if (annotations?.length) {
      const fileQueryMap = new Map<string, FileQueryExecution>();

      annotations.forEach((ann) => {
        if (ann.type !== 'data-extreme_search' || ann.data.kind !== 'file_query') return;

        const { data } = ann;
        fileQueryMap.set(data.fileQueryId, {
          id: data.fileQueryId,
          query: data.query,
          index: data.index,
          total: data.total,
          status: data.status,
          results: data.results,
        });
      });

      return Array.from(fileQueryMap.values());
    }

    return [];
  }, [toolInvocation, annotations]);

  const browsePageExecutions = useMemo(() => {
    if ('output' in toolInvocation) {
      const { output } = toolInvocation;
      const researchData = output as { research?: Research } | null;

      if (researchData?.research?.toolResults) {
        const browseResults = researchData.research.toolResults.filter((result) => result.toolName === 'browsePage');
        return browseResults.map((result, index) => {
          const resultData = result.result || result.output || {};
          return {
            id: result.toolCallId || `bp-${index}`,
            urls: result.args?.urls || result.input?.urls || resultData.urls || [],
            status: 'completed' as const,
            results: resultData.results || [],
          };
        });
      }
    }

    if (annotations?.length) {
      const browseMap = new Map<string, BrowsePageExecution>();

      annotations.forEach((ann) => {
        if (ann.type !== 'data-extreme_search' || ann.data.kind !== 'browse_page') return;

        const { data } = ann;
        const existing = browseMap.get(data.browseId);
        browseMap.set(data.browseId, {
          id: data.browseId,
          urls: data.urls,
          index: data.index,
          total: data.total,
          status: data.status,
          results: data.results ?? existing?.results,
        });
      });

      return Array.from(browseMap.values());
    }

    return [];
  }, [toolInvocation, annotations]);

  // Extract done executions
  const doneExecutions = useMemo(() => {
    if ('output' in toolInvocation) {
      const { output } = toolInvocation;
      const researchData = output as { research?: Research } | null;

      if (researchData?.research?.toolResults) {
        const doneResults = researchData.research.toolResults.filter((result) => result.toolName === 'done');
        return doneResults.map((result, index) => {
          const resultData = result.result || result.output || {};
          const summary = resultData.summary || result.args?.summary || result.input?.summary || 'Research completed';
          return {
            id: result.toolCallId || `done-${index}`,
            summary,
          };
        });
      }
    }

    if (annotations?.length) {
      const doneAnnotation = annotations.find(
        (ann) => ann.type === 'data-extreme_search' && ann.data.kind === 'done',
      );

      if (doneAnnotation && doneAnnotation.data.kind === 'done') {
        return [{
          id: 'done-0',
          summary: doneAnnotation.data.summary,
        }];
      }
    }

    return [];
  }, [toolInvocation, annotations]);

  // Build a single chronological list for the timeline
  type QueryGroup = {
    id: string;
    queries: SearchQuery[];
  };

  type XSearchGroup = {
    id: string;
    searches: XSearchExecution[];
  };

  type FileQueryGroup = {
    id: string;
    queries: FileQueryExecution[];
  };

  type TimelineItem =
    | { kind: 'query_group'; item: QueryGroup }
    | { kind: 'x_search_group'; item: XSearchGroup }
    | { kind: 'file_query_group'; item: FileQueryGroup }
    | { kind: 'browse_page_group'; item: { id: string; executions: BrowsePageExecution[] } }
    | { kind: 'code'; item: CodeExecution }
    | { kind: 'thinking'; item: ThinkingExecution }
    | { kind: 'done'; item: DoneExecution };

  const combinedTimelineItems = useMemo<TimelineItem[]>(() => {
    // Completed state: preserve order from toolResults
    if (isCompleted && 'output' in toolInvocation) {
      const { output } = toolInvocation;
      const researchData = output as { research?: Research } | null;
      const toolResults = researchData?.research?.toolResults || [];

      return toolResults
        .flatMap((tr: any): TimelineItem[] => {
          if (tr.toolName === 'webSearch') {
            const resultData = tr.result || tr.output || {};
            const searches = Array.isArray(resultData.searches) ? resultData.searches : [];

            if (searches.length === 0 && Array.isArray(resultData)) {
              const sources = resultData.map((source: any) => ({
                title: source.title || '',
                url: source.url || '',
                content: source.content || '',
                publishedDate: source.publishedDate || '',
                favicon:
                  source.favicon ||
                  `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(source.url || 'example.com').hostname)}`,
              }));
              const query: SearchQuery = {
                id: tr.toolCallId || `query-${Math.random().toString(36).slice(2)}`,
                query: tr.args?.query || tr.input?.query || 'Search',
                status: 'completed',
                sources,
                content: [],
              };
              return [{ kind: 'query_group', item: { id: query.id, queries: [query] } }];
            }

            const groupedQueries = searches.map((search: any, index: number) => {
              const sources = (search.results || []).map((source: any) => ({
                title: source.title || '',
                url: source.url || '',
                content: source.content || '',
                publishedDate: source.publishedDate || '',
                favicon:
                  source.favicon ||
                  `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(source.url || 'example.com').hostname)}`,
              }));
              const query: SearchQuery = {
                id: `${tr.toolCallId || `query-${Math.random().toString(36).slice(2)}`}-${index}`,
                query: search.query || tr.args?.queries?.[index] || tr.input?.queries?.[index] || 'Search',
                index,
                total: searches.length,
                status: 'completed',
                sources,
                content: [],
              };
              return query;
            });
            const groupId = tr.toolCallId || `query-${Math.random().toString(36).slice(2)}`;
            return [{ kind: 'query_group', item: { id: groupId, queries: groupedQueries } }];
          }
          if (tr.toolName === 'xSearch') {
            const resultData = tr.result || tr.output || {};
            const searches = Array.isArray(resultData.searches) ? resultData.searches : [];
            const startDate = tr.args?.startDate || tr.input?.startDate || '';
            const endDate = tr.args?.endDate || tr.input?.endDate || '';
            const handles =
              resultData.handles ||
              tr.args?.includeXHandles ||
              tr.args?.excludeXHandles ||
              tr.input?.includeXHandles ||
              tr.input?.excludeXHandles ||
              [];

            if (searches.length === 0) {
              const xItem: XSearchExecution = {
                id: tr.toolCallId || `x-${Math.random().toString(36).slice(2)}`,
                query: tr.args?.query || tr.input?.query || 'X search',
                startDate,
                endDate,
                handles,
                status: 'completed',
                result: resultData,
              };
              return [{ kind: 'x_search_group', item: { id: xItem.id, searches: [xItem] } }];
            }

            const groupedSearches = searches.map((search: any, index: number) => {
              const xItem: XSearchExecution = {
                id: `${tr.toolCallId || `x-${Math.random().toString(36).slice(2)}`}-${index}`,
                query: search.query || tr.args?.queries?.[index] || tr.input?.queries?.[index] || 'X search',
                index,
                total: searches.length,
                startDate,
                endDate,
                handles,
                status: 'completed',
                result: search.result || search,
              };
              return xItem;
            });
            const groupId = tr.toolCallId || `x-${Math.random().toString(36).slice(2)}`;
            return [{ kind: 'x_search_group', item: { id: groupId, searches: groupedSearches } }];
          }
          if (tr.toolName === 'codeRunner') {
            const codeItem: CodeExecution = {
              id: tr.toolCallId || `code-${Math.random().toString(36).slice(2)}`,
              title: tr.args?.title || tr.input?.title || 'Code Execution',
              code: tr.args?.code || tr.input?.code || '',
              status: 'completed',
              result: (tr.result || tr.output || {}).result || '',
              charts: (tr.result || tr.output || {}).charts || [],
            };
            return [{ kind: 'code', item: codeItem }];
          }
          if (tr.toolName === 'thinking') {
            const resultData = tr.result || tr.output || {};
            const thought = resultData.thought || tr.args?.thought || tr.input?.thought || '';
            const nextStep =
              resultData.nextStep || tr.args?.nextStep || tr.input?.nextStep || tr.args?.next_step;
            const thinkingItem: ThinkingExecution = {
              id: tr.toolCallId || `thinking-${Math.random().toString(36).slice(2)}`,
              thought,
              nextStep,
            };
            return [{ kind: 'thinking', item: thinkingItem }];
          }
          if (tr.toolName === 'fileQuery') {
            const resultData = tr.result || tr.output || {};
            const searches = Array.isArray(resultData.searches) ? resultData.searches : [];

            const groupedQueries = searches.map((search: any, index: number) => {
              const fqItem: FileQueryExecution = {
                id: `${tr.toolCallId || `fq-${Math.random().toString(36).slice(2)}`}-${index}`,
                query: search.query || tr.args?.queries?.[index] || tr.input?.queries?.[index] || 'File search',
                index,
                total: searches.length,
                status: 'completed',
                results: search.results || [],
              };
              return fqItem;
            });
            const groupId = tr.toolCallId || `fq-${Math.random().toString(36).slice(2)}`;
            return [{ kind: 'file_query_group', item: { id: groupId, queries: groupedQueries } }];
          }
          if (tr.toolName === 'browsePage') {
            const resultData = tr.result || tr.output || {};
            const bpItem: BrowsePageExecution = {
              id: tr.toolCallId || `bp-${Math.random().toString(36).slice(2)}`,
              urls: tr.args?.urls || tr.input?.urls || resultData.urls || [],
              status: 'completed',
              results: resultData.results || [],
            };
            return [{ kind: 'browse_page_group', item: { id: bpItem.id, executions: [bpItem] } }];
          }
          return [];
        })
        .filter((item) => item !== null) as TimelineItem[];
    }

    // In-progress: order by annotations arrival
    if (annotations?.length) {
      const seen: Record<string, boolean> = {};
      const items: TimelineItem[] = [];
      for (const ann of annotations) {
        if (ann.type !== 'data-extreme_search') continue;
        const d = ann.data as any;
        if (d.kind === 'query') {
          const baseId = d.queryId.includes('-') ? d.queryId.split('-').slice(0, -1).join('-') : d.queryId;
          if (!seen[`q:${baseId}`]) {
            const groupedQueries = searchQueries.filter((sq) => {
              const sqBaseId = sq.id.includes('-') ? sq.id.split('-').slice(0, -1).join('-') : sq.id;
              return sqBaseId === baseId;
            });
            if (groupedQueries.length > 0) {
              items.push({ kind: 'query_group', item: { id: baseId, queries: groupedQueries } });
              seen[`q:${baseId}`] = true;
            }
          }
        } else if (d.kind === 'x_search') {
          const baseId = d.xSearchId.includes('-') ? d.xSearchId.split('-').slice(0, -1).join('-') : d.xSearchId;
          if (!seen[`x:${baseId}`]) {
            const groupedSearches = xSearchExecutions.filter((xe) => {
              const xeBaseId = xe.id.includes('-') ? xe.id.split('-').slice(0, -1).join('-') : xe.id;
              return xeBaseId === baseId;
            });
            if (groupedSearches.length > 0) {
              items.push({ kind: 'x_search_group', item: { id: baseId, searches: groupedSearches } });
              seen[`x:${baseId}`] = true;
            }
          }
        } else if (d.kind === 'code') {
          const c = codeExecutions.find((ce) => ce.id === d.codeId);
          if (c && !seen[`c:${c.id}`]) {
            items.push({ kind: 'code', item: c });
            seen[`c:${c.id}`] = true;
          }
        } else if (d.kind === 'thinking') {
          const t = thinkingExecutions.find((te) => te.id === d.thinkingId);
          if (t && !seen[`t:${t.id}`]) {
            items.push({ kind: 'thinking', item: t });
            seen[`t:${t.id}`] = true;
          }
        } else if (d.kind === 'file_query') {
          const baseId = d.fileQueryId.includes('-') ? d.fileQueryId.split('-').slice(0, -1).join('-') : d.fileQueryId;
          if (!seen[`fq:${baseId}`]) {
            const groupedQueries = fileQueryExecutions.filter((fq) => {
              const fqBaseId = fq.id.includes('-') ? fq.id.split('-').slice(0, -1).join('-') : fq.id;
              return fqBaseId === baseId;
            });
            if (groupedQueries.length > 0) {
              items.push({ kind: 'file_query_group', item: { id: baseId, queries: groupedQueries } });
              seen[`fq:${baseId}`] = true;
            }
          }
        } else if (d.kind === 'browse_page') {
          if (!seen[`bp:${d.browseId}`]) {
            const execution = browsePageExecutions.find((bp) => bp.id === d.browseId);
            if (execution) {
              items.push({ kind: 'browse_page_group', item: { id: d.browseId, executions: [execution] } });
              seen[`bp:${d.browseId}`] = true;
            }
          }
        } else if (d.kind === 'done') {
          const done = doneExecutions[0];
          if (done && !seen[`d:${done.id}`]) {
            items.push({ kind: 'done', item: done });
            seen[`d:${done.id}`] = true;
          }
        }
      }
      if (items.length === 0) {
        const fallbackItems = [
          ...Object.values(
            searchQueries.reduce<Record<string, QueryGroup>>((acc, query) => {
              const baseId = query.id.includes('-') ? query.id.split('-').slice(0, -1).join('-') : query.id;
              if (!acc[baseId]) acc[baseId] = { id: baseId, queries: [] };
              acc[baseId].queries.push(query);
              return acc;
            }, {}),
          ).map((group) => ({ kind: 'query_group', item: group }) as TimelineItem),
          ...Object.values(
            xSearchExecutions.reduce<Record<string, XSearchGroup>>((acc, search) => {
              const baseId = search.id.includes('-') ? search.id.split('-').slice(0, -1).join('-') : search.id;
              if (!acc[baseId]) acc[baseId] = { id: baseId, searches: [] };
              acc[baseId].searches.push(search);
              return acc;
            }, {}),
          ).map((group) => ({ kind: 'x_search_group', item: group }) as TimelineItem),
          ...codeExecutions.map((c) => ({ kind: 'code', item: c }) as TimelineItem),
          ...thinkingExecutions.map((t) => ({ kind: 'thinking', item: t }) as TimelineItem),
          ...Object.values(
            fileQueryExecutions.reduce<Record<string, FileQueryGroup>>((acc, fq) => {
              const baseId = fq.id.includes('-') ? fq.id.split('-').slice(0, -1).join('-') : fq.id;
              if (!acc[baseId]) acc[baseId] = { id: baseId, queries: [] };
              acc[baseId].queries.push(fq);
              return acc;
            }, {}),
          ).map((group) => ({ kind: 'file_query_group', item: group }) as TimelineItem),
          ...browsePageExecutions.map((bp) => ({ kind: 'browse_page_group', item: { id: bp.id, executions: [bp] } }) as TimelineItem),
          ...doneExecutions.map((d) => ({ kind: 'done', item: d }) as TimelineItem),
        ];

        if (fallbackItems.length > 0) {
          return fallbackItems;
        }

        const hasThinkingAnnotation = annotations.some(
          (ann) => ann.type === 'data-extreme_search' && ann.data.kind === 'thinking',
        );

        return hasThinkingAnnotation ? [{
          kind: 'thinking',
          item: {
            id: 'thinking-pending',
            thought: '',
          },
        }] : [];
      }
      return items;
    }

    return [
      ...Object.values(
        searchQueries.reduce<Record<string, QueryGroup>>((acc, query) => {
          const baseId = query.id.includes('-') ? query.id.split('-').slice(0, -1).join('-') : query.id;
          if (!acc[baseId]) acc[baseId] = { id: baseId, queries: [] };
          acc[baseId].queries.push(query);
          return acc;
        }, {}),
      ).map((group) => ({ kind: 'query_group', item: group }) as TimelineItem),
      ...Object.values(
        xSearchExecutions.reduce<Record<string, XSearchGroup>>((acc, search) => {
          const baseId = search.id.includes('-') ? search.id.split('-').slice(0, -1).join('-') : search.id;
          if (!acc[baseId]) acc[baseId] = { id: baseId, searches: [] };
          acc[baseId].searches.push(search);
          return acc;
        }, {}),
      ).map((group) => ({ kind: 'x_search_group', item: group }) as TimelineItem),
      ...codeExecutions.map((c) => ({ kind: 'code', item: c }) as TimelineItem),
      ...thinkingExecutions.map((t) => ({ kind: 'thinking', item: t }) as TimelineItem),
      ...Object.values(
        fileQueryExecutions.reduce<Record<string, FileQueryGroup>>((acc, fq) => {
          const baseId = fq.id.includes('-') ? fq.id.split('-').slice(0, -1).join('-') : fq.id;
          if (!acc[baseId]) acc[baseId] = { id: baseId, queries: [] };
          acc[baseId].queries.push(fq);
          return acc;
        }, {}),
      ).map((group) => ({ kind: 'file_query_group', item: group }) as TimelineItem),
      ...browsePageExecutions.map((bp) => ({ kind: 'browse_page_group', item: { id: bp.id, executions: [bp] } }) as TimelineItem),
      ...doneExecutions.map((d) => ({ kind: 'done', item: d }) as TimelineItem),
    ];
  }, [isCompleted, toolInvocation, annotations, searchQueries, xSearchExecutions, codeExecutions, thinkingExecutions, fileQueryExecutions, browsePageExecutions, doneExecutions]);

  const hasActiveTimelineItems = useMemo(() => {
    return combinedTimelineItems.some((timelineItem, index) => {
      if (timelineItem.kind === 'query_group') {
        const group = timelineItem.item as QueryGroup;
        return group.queries.some((q) => q.status === 'started' || q.status === 'reading_content');
      }

      if (timelineItem.kind === 'x_search_group') {
        const group = timelineItem.item as XSearchGroup;
        return group.searches.some((s) => s.status === 'started');
      }

      if (timelineItem.kind === 'file_query_group') {
        const group = timelineItem.item as FileQueryGroup;
        return group.queries.some((q) => q.status === 'started');
      }

      if (timelineItem.kind === 'browse_page_group') {
        return timelineItem.item.executions.some((bp) => bp.status === 'started' || bp.status === 'browsing');
      }

      if (timelineItem.kind === 'code') {
        return timelineItem.item.status === 'running';
      }

      if (timelineItem.kind === 'thinking') {
        return index === combinedTimelineItems.length - 1;
      }

      return false;
    });
  }, [combinedTimelineItems]);

  // Auto-scroll effects
  useEffect(() => {
    if (hasActiveTimelineItems) {
      resetManualScroll();
    }
  }, [hasActiveTimelineItems, resetManualScroll]);

  useEffect(() => {
    if (combinedTimelineItems.length > 0 && hasActiveTimelineItems) {
      scrollToBottom();
    }
  }, [combinedTimelineItems, hasActiveTimelineItems, scrollToBottom, annotations]);

  useEffect(() => {
    if (!hasActiveTimelineItems) return;

    const container = timelineRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      scrollToBottom();
    });

    observer.observe(container);
    scrollToBottom();

    return () => observer.disconnect();
  }, [hasActiveTimelineItems, scrollToBottom]);

  useEffect(() => {
    if (!hasActiveTimelineItems) return;

    const raf = requestAnimationFrame(() => {
      combinedTimelineItems.forEach((timelineItem: TimelineItem) => {
        if (timelineItem.kind === 'query_group') {
          const group = timelineItem.item as QueryGroup;
          const isActive = group.queries.some((q) => q.status === 'started' || q.status === 'reading_content');
          if (!isActive) return;

          const container = sourcesListRefs.current[group.id];
          if (container) container.scrollTop = container.scrollHeight;
          return;
        }

        if (timelineItem.kind === 'x_search_group') {
          const group = timelineItem.item as XSearchGroup;
          const isActive = group.searches.some((s) => s.status === 'started');
          if (!isActive) return;

          const container = citationsListRefs.current[group.id];
          if (container) container.scrollTop = container.scrollHeight;
          return;
        }

        if (timelineItem.kind === 'file_query_group') {
          const group = timelineItem.item as FileQueryGroup;
          const isActive = group.queries.some((q) => q.status === 'started');
          if (!isActive) return;

          const container = fileResultsListRefs.current[group.id];
          if (container) container.scrollTop = container.scrollHeight;
          return;
        }

        if (timelineItem.kind === 'code') {
          const code = timelineItem.item as CodeExecution;
          if (code.status !== 'running') return;

          const codeContainer = codeResultRefs.current[`${code.id}-code`];
          if (codeContainer) codeContainer.scrollTop = codeContainer.scrollHeight;
          const resultContainer = codeResultRefs.current[`${code.id}-result`];
          if (resultContainer) resultContainer.scrollTop = resultContainer.scrollHeight;
        }
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [combinedTimelineItems, hasActiveTimelineItems]);

  useEffect(() => {
    if (!hasActiveTimelineItems) return;

    const activeQueryGroupIds = new Set<string>();
    const activeXSearchGroupIds = new Set<string>();
    const activeFileQueryGroupIds = new Set<string>();
    const activeCodeIds = new Set<string>();

    combinedTimelineItems.forEach((timelineItem: TimelineItem) => {
      if (timelineItem.kind === 'query_group') {
        const group = timelineItem.item as QueryGroup;
        const isActive = group.queries.some((q) => q.status === 'started' || q.status === 'reading_content');
        if (isActive) activeQueryGroupIds.add(group.id);
      }

      if (timelineItem.kind === 'x_search_group') {
        const group = timelineItem.item as XSearchGroup;
        const isActive = group.searches.some((s) => s.status === 'started');
        if (isActive) activeXSearchGroupIds.add(group.id);
      }

      if (timelineItem.kind === 'file_query_group') {
        const group = timelineItem.item as FileQueryGroup;
        const isActive = group.queries.some((q) => q.status === 'started');
        if (isActive) activeFileQueryGroupIds.add(group.id);
      }

      if (timelineItem.kind === 'code') {
        const code = timelineItem.item as CodeExecution;
        if (code.status === 'running') activeCodeIds.add(code.id);
      }
    });

    const observers: ResizeObserver[] = [];

    const attachObserver = (node: HTMLDivElement | null, isActive: boolean) => {
      if (!node || !isActive) return;
      node.scrollTop = node.scrollHeight;
      const observer = new ResizeObserver(() => {
        node.scrollTop = node.scrollHeight;
      });
      observer.observe(node);
      observers.push(observer);
    };

    Object.entries(sourcesListRefs.current).forEach(([id, node]) => {
      attachObserver(node, activeQueryGroupIds.has(id));
    });

    Object.entries(citationsListRefs.current).forEach(([id, node]) => {
      attachObserver(node, activeXSearchGroupIds.has(id));
    });

    Object.entries(fileResultsListRefs.current).forEach(([id, node]) => {
      attachObserver(node, activeFileQueryGroupIds.has(id));
    });

    Object.entries(codeResultRefs.current).forEach(([compositeId, node]) => {
      // compositeId is "${code.id}-code" or "${code.id}-result"
      const codeId = compositeId.replace(/-code$/, '').replace(/-result$/, '');
      attachObserver(node, activeCodeIds.has(codeId));
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, [combinedTimelineItems, hasActiveTimelineItems]);

  // Get all sources for final result view
  const allSources = useMemo(() => {
    if (isCompleted && 'output' in toolInvocation) {
      // Completed with tool output
      const { output } = toolInvocation;
      const researchData = output as { research?: Research } | null;
      const research = researchData?.research;

      if (research?.sources?.length) {
        return research.sources.map((s) => ({
          ...s,
          favicon:
            s.favicon ||
            `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(s.url).hostname)}`,
        }));
      }

      if (research?.toolResults) {
        return research.toolResults
          .filter((result) => result.toolName === 'webSearch')
          .flatMap((result) => {
            const resultData = result.result || result.output || {};
            if (Array.isArray(resultData)) {
              return resultData.map((source: any) => ({
                title: source.title || '',
                url: source.url || '',
                content: source.content || '',
                publishedDate: source.publishedDate || '',
                favicon:
                  source.favicon ||
                  `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(source.url || 'example.com').hostname)}`,
              }));
            }

            const searches = Array.isArray(resultData.searches) ? resultData.searches : [];
            return searches.flatMap((search: any) =>
              (search.results || []).map((source: any) => ({
                title: source.title || '',
                url: source.url || '',
                content: source.content || '',
                publishedDate: source.publishedDate || '',
                favicon:
                  source.favicon ||
                  `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(new URL(source.url || 'example.com').hostname)}`,
              })),
            );
          });
      }
    }

    // Use sources from search queries (whether completed or not)
    const querySources = searchQueries.flatMap((q) => q.sources);

    // Remove duplicates by URL
    return Array.from(new Map(querySources.map((s) => [s.url, s])).values());
  }, [isCompleted, toolInvocation, searchQueries]);

  // Get all charts for final result view
  const allCharts = useMemo(() => {
    if (isCompleted && 'output' in toolInvocation) {
      const { output } = toolInvocation;
      const researchData = output as { research: Research } | null;
      const research = researchData?.research;

      if (research?.charts?.length) {
        return research.charts;
      }
    }

    // Use charts from code executions (whether completed or not)
    return codeExecutions.flatMap((c) => c.charts || []);
  }, [isCompleted, toolInvocation, codeExecutions]);

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
    // Track that user manually interacted with this item
    setUserExpandedItems((prev) => ({ ...prev, [itemId]: true }));
  };

  // Auto-expand logic - expand active groups, collapse completed ones
  useEffect(() => {
    // Skip auto-logic in completed state - full manual control
    if (isCompleted) {
      return;
    }

    setExpandedItems((prevExpanded) => {
      const newExpanded = { ...prevExpanded };
      let shouldUpdate = false;

      const lastItemIndex = combinedTimelineItems.length - 1;

      combinedTimelineItems.forEach((timelineItem: TimelineItem, index: number) => {
        const itemId =
          timelineItem.kind === 'query_group' ? timelineItem.item.id :
            timelineItem.kind === 'x_search_group' ? timelineItem.item.id :
              timelineItem.kind === 'file_query_group' ? timelineItem.item.id :
                timelineItem.kind === 'browse_page_group' ? timelineItem.item.id :
                  timelineItem.kind === 'code' ? timelineItem.item.id :
                    timelineItem.kind === 'thinking' ? timelineItem.item.id :
                      timelineItem.kind === 'done' ? timelineItem.item.id : null;

        if (!itemId) return;

        const wasUserControlled = userExpandedItems[itemId];
        if (wasUserControlled) return; // Respect user's manual control

        let isActive = false;
        let isItemCompleted = false;

        if (timelineItem.kind === 'query_group') {
          const group = timelineItem.item;
          isActive = group.queries.some((q) => q.status === 'started' || q.status === 'reading_content');
          isItemCompleted = group.queries.every((q) => q.status === 'completed');
        } else if (timelineItem.kind === 'x_search_group') {
          const group = timelineItem.item;
          isActive = group.searches.some((s) => s.status === 'started');
          isItemCompleted = group.searches.every((s) => s.status === 'completed');
        } else if (timelineItem.kind === 'file_query_group') {
          const group = timelineItem.item;
          isActive = group.queries.some((q) => q.status === 'started');
          isItemCompleted = group.queries.every((q) => q.status === 'completed' || q.status === 'error');
        } else if (timelineItem.kind === 'browse_page_group') {
          isActive = timelineItem.item.executions.some((bp) => bp.status === 'started' || bp.status === 'browsing');
          isItemCompleted = timelineItem.item.executions.every((bp) => bp.status === 'completed' || bp.status === 'error');
        } else if (timelineItem.kind === 'code') {
          isActive = timelineItem.item.status === 'running';
          isItemCompleted = timelineItem.item.status === 'completed';
        } else if (timelineItem.kind === 'thinking') {
          // Thinking is "active" when it's the last item, "completed" when something comes after
          const isLastItem = index === lastItemIndex;
          isActive = isLastItem;
          isItemCompleted = !isLastItem;
        } else if (timelineItem.kind === 'done') {
          // Done items don't need auto-expand
          return;
        }

        // Auto-expand active items
        if (isActive && !prevExpanded[itemId]) {
          newExpanded[itemId] = true;
          shouldUpdate = true;
        }

        // Auto-collapse completed items that were auto-expanded
        if (isItemCompleted && prevExpanded[itemId]) {
          newExpanded[itemId] = false;
          shouldUpdate = true;
        }
      });

      return shouldUpdate ? newExpanded : prevExpanded;
    });
  }, [combinedTimelineItems, userExpandedItems, isCompleted]);

  // Auto-switch to visualizations tab when research completes with charts
  useEffect(() => {
    if (isCompleted && allCharts.length > 0) {
      setActiveTab('visualizations');
    }
  }, [isCompleted, allCharts.length]);

  const renderTimeline = () => (
    <div className="space-y-0 relative ml-4 mb-1">
      <AnimatePresence>
        {combinedTimelineItems.map((timelineItem: TimelineItem, itemIndex: number) => {
          if (timelineItem.kind === 'query_group') {
            const group = timelineItem.item as QueryGroup;
            const activeQuery = group.queries.find(
              (query) => query.status === 'reading_content' || query.status === 'started',
            );
            const primaryQuery = activeQuery || group.queries[0];
            const isLoading = group.queries.some(
              (query) => query.status === 'started' || query.status === 'reading_content',
            );
            const hasResults = group.queries.some((query) => query.sources.length > 0);
            const isReadingContent = group.queries.some((query) => query.status === 'reading_content');
            const unifiedGroupSources = Array.from(
              new Map(group.queries.flatMap((query) => query.sources).map((source) => [source.url, source])).values(),
            );

            // Check if previous item was a thinking step with nextStep
            const prevItem = itemIndex > 0 ? combinedTimelineItems[itemIndex - 1] : null;
            const prevThinkingNextStep =
              prevItem?.kind === 'thinking' ? (prevItem.item as ThinkingExecution).nextStep : undefined;
            const displayTitle = prevThinkingNextStep || primaryQuery?.query || 'Searching';

            const bulletColor = isLoading
              ? 'bg-primary/80 animate-[pulse_0.8s_ease-in-out_infinite]!'
              : hasResults
                ? 'bg-primary'
                : 'bg-muted-foreground/50';

            return (
              <motion.div
                key={group.id}
                className="space-y-0 relative"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1, delay: itemIndex * 0.01 }}
              >
                <div
                  className="absolute rounded-full z-5"
                  style={{ left: '-0.6rem', top: '4px', width: '10px', height: '10px', transform: 'translateX(-50%)' }}
                />

                <div
                  className={`absolute rounded-full ${bulletColor} transition-colors duration-300 z-10`}
                  style={{ left: '-0.6rem', top: '5px', width: '8px', height: '8px', transform: 'translateX(-50%)' }}
                  title={`Status: ${activeQuery?.status || 'completed'}`}
                />

                {itemIndex > 0 && (
                  <div
                    className="absolute bg-secondary"
                    style={{
                      left: '-0.6rem',
                      top: '0',
                      width: '2px',
                      height: '5px',
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}

                <div
                  className="absolute bg-secondary"
                  style={{
                    left: '-0.6rem',
                    top: '13px',
                    width: '2px',
                    height: expandedItems[group.id]
                      ? itemIndex === combinedTimelineItems.length - 1
                        ? 'calc(100% - 13px)'
                        : 'calc(100% - 13px)'
                      : itemIndex === combinedTimelineItems.length - 1
                        ? '0'
                        : 'calc(100% - 9px)',
                    transform: 'translateX(-50%)',
                  }}
                />

                <div
                  className="flex items-start gap-1.5 cursor-pointer py-1 px-1.5 hover:bg-accent/50 rounded-md transition-colors duration-150 relative"
                  onClick={() => toggleItemExpansion(group.id)}
                >
                  <Search className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-foreground text-[11px] min-w-0 flex-1 wrap-break-word leading-snug">
                    {isLoading && !isCompleted ? (
                      <TextShimmer className="w-full" duration={1.5}>
                        {displayTitle}
                      </TextShimmer>
                    ) : (
                      displayTitle
                    )}
                  </span>
                  {group.queries.length > 1 && (
                    <span className="text-[8.5px] text-muted-foreground px-1 py-0.25 rounded-full bg-muted border border-border/50 shrink-0">
                      {group.queries.length} queries
                    </span>
                  )}
                  {expandedItems[group.id] ? (
                    <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </div>

                <AnimatePresence>
                  {expandedItems[group.id] && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ height: { duration: 0.2, ease: 'easeOut' }, opacity: { duration: 0.15 } }}
                      className="overflow-hidden"
                    >
                      <div className="pl-0.5 py-0.5 space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {group.queries.map((query, index) => (
                            <span
                              key={`${query.id}-${index}`}
                              className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground"
                            >
                              <Search className="h-2.5 w-2.5 text-muted-foreground" />
                              <span className="truncate max-w-[180px]">{query.query}</span>
                            </span>
                          ))}
                        </div>

                        {unifiedGroupSources.length > 0 && (
                          <motion.div
                            className="rounded-lg bg-card! border border-border/50! p-2 max-h-[180px] overflow-y-auto mt-1.5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                            ref={(node) => {
                              if (node) {
                                sourcesListRefs.current[group.id] = node;
                                return;
                              }
                              delete sourcesListRefs.current[group.id];
                            }}
                          >
                            {unifiedGroupSources.map((source, index) => {
                              let hostname = '';
                              try {
                                hostname = new URL(source.url).hostname.replace('www.', '');
                              } catch {
                                hostname = source.url;
                              }
                              return (
                                <a
                                  key={index}
                                  href={source.url}
                                  target="_blank"
                                  className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] hover:bg-accent/50 rounded-sm transition-colors"
                                >
                                  <img
                                    src={source.favicon || `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(hostname)}`}
                                    alt=""
                                    className="h-4 w-4 rounded shrink-0"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src =
                                        'https://www.google.com/s2/favicons?sz=128&domain=example.com';
                                      (e.currentTarget as HTMLImageElement).style.filter = 'grayscale(100%)';
                                    }}
                                  />
                                  <div className="flex-1 min-w-0 text-foreground truncate">
                                    {source.title || hostname}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground shrink-0">
                                    {hostname}
                                  </div>
                                </a>
                              );
                            })}
                          </motion.div>
                        )}

                        {(() => {
                          if (isReadingContent && unifiedGroupSources.length > 0 && !isCompleted) {
                            return (
                              <TextShimmer className="text-xs py-0.5" duration={2.5}>
                                Reading content...
                              </TextShimmer>
                            );
                          } else if (isLoading && !isCompleted) {
                            return (
                              <TextShimmer className="text-xs py-0.5" duration={2.5}>
                                Searching sources...
                              </TextShimmer>
                            );
                          } else if (unifiedGroupSources.length === 0 && !isLoading) {
                            return (
                              <p className="text-[11px] text-muted-foreground py-0.5 mt-0.5">
                                No sources found for this search.
                              </p>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          }

          if (timelineItem.kind === 'x_search_group') {
            const group = timelineItem.item as XSearchGroup;
            const activeSearch = group.searches.find((search) => search.status === 'started');
            const primarySearch = activeSearch || group.searches[0];
            const isLoading = group.searches.some((search) => search.status === 'started');
            const hasResults = group.searches.some((search) => (search.result?.citations || []).length > 0);
            const startDate = activeSearch?.startDate || group.searches[0]?.startDate;
            const endDate = activeSearch?.endDate || group.searches[0]?.endDate;
            const handles = group.searches[0]?.handles || [];

            const unifiedCitations = Array.from(
              new Map(
                group.searches
                  .flatMap((search) => search.result?.citations || [])
                  .map((citation: any) => {
                    const url = typeof citation === 'string' ? citation : citation.url;
                    return [url || Math.random().toString(36), citation];
                  }),
              ).values(),
            );

            // Check if previous item was a thinking step with nextStep
            const prevItem = itemIndex > 0 ? combinedTimelineItems[itemIndex - 1] : null;
            const prevThinkingNextStep =
              prevItem?.kind === 'thinking' ? (prevItem.item as ThinkingExecution).nextStep : undefined;
            const displayTitle = prevThinkingNextStep || `X search: ${primarySearch?.query || 'Searching'}`;

            const bulletColor = isLoading
              ? 'bg-primary/80 animate-[pulse_0.8s_ease-in-out_infinite]!'
              : hasResults
                ? 'bg-primary'
                : 'bg-muted-foreground/50';

            return (
              <motion.div
                key={group.id}
                className="space-y-0 relative"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1, delay: itemIndex * 0.01 }}
              >
                <div
                  className="absolute rounded-full bg-background z-5"
                  style={{ left: '-0.6rem', top: '4px', width: '10px', height: '10px', transform: 'translateX(-50%)' }}
                />

                <div
                  className={`absolute rounded-full ${bulletColor} transition-colors duration-300 z-10`}
                  style={{ left: '-0.6rem', top: '5px', width: '8px', height: '8px', transform: 'translateX(-50%)' }}
                  title={`Status: ${activeSearch?.status || 'completed'}`}
                />

                {itemIndex > 0 && (
                  <div
                    className="absolute bg-secondary"
                    style={{
                      left: '-0.6rem',
                      top: '0',
                      width: '2px',
                      height: '5px',
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}

                <div
                  className="absolute bg-secondary"
                  style={{
                    left: '-0.6rem',
                    top: '13px',
                    width: '2px',
                    height: expandedItems[group.id]
                      ? itemIndex === combinedTimelineItems.length - 1
                        ? 'calc(100% - 13px)'
                        : 'calc(100% - 13px)'
                      : itemIndex === combinedTimelineItems.length - 1
                        ? '0'
                        : 'calc(100% - 9px)',
                    transform: 'translateX(-50%)',
                  }}
                />

                <div
                  className="flex items-start gap-1.5 cursor-pointer py-1 px-1.5 hover:bg-accent/50 rounded-md transition-colors duration-150 relative"
                  onClick={() => toggleItemExpansion(group.id)}
                >
                  <div className="p-0.5 rounded bg-foreground shrink-0 mt-0.5">
                    <XLogoIcon className="size-2.5 text-background" />
                  </div>
                  <span className="text-foreground text-[11px] min-w-0 flex-1 wrap-break-word leading-snug">
                    {isLoading && !isCompleted ? (
                      <TextShimmer className="w-full" duration={1.5}>
                        {displayTitle}
                      </TextShimmer>
                    ) : (
                      displayTitle
                    )}
                  </span>
                  {group.searches.length > 1 && (
                    <span className="text-[8.5px] text-muted-foreground px-1 py-0.25 rounded-full bg-muted border border-border/50 shrink-0">
                      {group.searches.length} queries
                    </span>
                  )}
                  {handles.length > 0 && (
                    <span className="text-[8.5px] text-muted-foreground px-1.5 py-0.25 rounded-full bg-muted border border-border/50 shrink-0">
                      {handles.length} handles
                    </span>
                  )}
                  {expandedItems[group.id] ? (
                    <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </div>

                <AnimatePresence>
                  {expandedItems[group.id] && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ height: { duration: 0.2, ease: 'easeOut' }, opacity: { duration: 0.15 } }}
                      className="overflow-hidden"
                    >
                      <div className="pl-0.5 py-0.5 space-y-1">
                        <div className="text-[10px] text-muted-foreground mb-0.5">
                          {startDate} to {endDate}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {group.searches.map((search, index) => (
                            <span
                              key={`${search.id}-${index}`}
                              className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground"
                            >
                              <div className="p-0.5 rounded bg-foreground">
                                <XLogoIcon className="size-2 text-background" />
                              </div>
                              <span className="truncate max-w-[180px]">{search.query}</span>
                            </span>
                          ))}
                        </div>

                        {unifiedCitations.length > 0 && (
                          <motion.div
                            className="rounded-lg bg-card! border border-border/50! p-2 max-h-[160px] overflow-y-auto mt-1.5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                            ref={(node) => {
                              if (node) {
                                citationsListRefs.current[group.id] = node;
                                return;
                              }
                              delete citationsListRefs.current[group.id];
                            }}
                          >
                            {unifiedCitations.map((citation: any, index: number) => {
                              const url = typeof citation === 'string' ? citation : citation.url;
                              let title = typeof citation === 'object' ? citation.title : '';
                              if (!title) title = 'X post';
                              let hostname = '';
                              try {
                                hostname = new URL(url || '').hostname.replace('www.', '');
                              } catch {
                                hostname = url || '';
                              }
                              return (
                                <a
                                  key={index}
                                  href={url}
                                  target="_blank"
                                  className="flex items-center gap-2.5 px-2 py-1.5 text-[12px] hover:bg-accent/50 rounded-sm transition-colors"
                                >
                                  <img
                                    src={
                                      hostname
                                        ? `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(hostname)}`
                                        : 'https://www.google.com/s2/favicons?sz=128&domain=example.com'
                                    }
                                    alt=""
                                    className="h-4 w-4 rounded shrink-0"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src =
                                        'https://www.google.com/s2/favicons?sz=128&domain=example.com';
                                      (e.currentTarget as HTMLImageElement).style.filter = 'grayscale(100%)';
                                    }}
                                  />
                                  <div className="flex-1 min-w-0 text-foreground truncate">
                                    {title}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground shrink-0">
                                    {hostname}
                                  </div>
                                </a>
                              );
                            })}
                          </motion.div>
                        )}

                        {isLoading && !isCompleted && (
                          <TextShimmer className="text-xs py-0.5" duration={2.5}>
                            Searching X posts...
                          </TextShimmer>
                        )}

                        {!isLoading && unifiedCitations.length === 0 && (
                          <p className="text-[11px] text-muted-foreground py-0.5 mt-0.5">
                            No X posts found for this search.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          }

          if (timelineItem.kind === 'thinking') {
            const thinking = timelineItem.item as ThinkingExecution;
            const hasThought = thinking.thought && thinking.thought.trim().length > 0;
            const nextSearchTitle = combinedTimelineItems
              .slice(itemIndex + 1)
              .find((item) => item.kind === 'query_group');
            const nextSearchQuery =
              nextSearchTitle && nextSearchTitle.kind === 'query_group'
                ? nextSearchTitle.item.queries[0]?.query
                : undefined;

            return (
              <motion.div
                key={thinking.id}
                className="space-y-0 relative"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1, delay: itemIndex * 0.01 }}
              >
                <div
                  className="absolute rounded-full bg-background z-5"
                  style={{ left: '-0.6rem', top: '4px', width: '10px', height: '10px', transform: 'translateX(-50%)' }}
                />

                <div
                  className="absolute rounded-full bg-primary transition-colors duration-300 z-10"
                  style={{ left: '-0.6rem', top: '5px', width: '8px', height: '8px', transform: 'translateX(-50%)' }}
                />

                {itemIndex > 0 && (
                  <div
                    className="absolute bg-secondary"
                    style={{
                      left: '-0.6rem',
                      top: '0',
                      width: '2px',
                      height: '5px',
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}

                <div
                  className="absolute bg-secondary"
                  style={{
                    left: '-0.6rem',
                    top: '13px',
                    width: '2px',
                    height: expandedItems[thinking.id]
                      ? itemIndex === combinedTimelineItems.length - 1
                        ? 'calc(100% - 13px)'
                        : 'calc(100% - 13px)'
                      : itemIndex === combinedTimelineItems.length - 1
                        ? '0'
                        : 'calc(100% - 9px)',
                    transform: 'translateX(-50%)',
                  }}
                />

                <div
                  className="flex items-start gap-1.5 cursor-pointer py-1 px-1.5 hover:bg-accent/50 rounded-md transition-colors duration-150 relative"
                  onClick={() => toggleItemExpansion(thinking.id)}
                >
                  <Lightbulb className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-foreground text-[11px] min-w-0 flex-1 wrap-break-word leading-snug">
                    Thinking
                  </span>
                  {expandedItems[thinking.id] ? (
                    <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </div>

                <AnimatePresence>
                  {expandedItems[thinking.id] && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ height: { duration: 0.2, ease: 'easeOut' }, opacity: { duration: 0.15 } }}
                      className="overflow-hidden"
                    >
                      <div className="pl-0.5 py-0.5">
                        {hasThought ? (
                          <p className="text-[11px] text-muted-foreground leading-snug">{thinking.thought}</p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground py-0.5 mt-0.5">
                            No thought captured.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          }

          if (timelineItem.kind === 'file_query_group') {
            const group = timelineItem.item as FileQueryGroup;
            const activeQuery = group.queries.find((q) => q.status === 'started');
            const primaryQuery = activeQuery || group.queries[0];
            const isLoading = group.queries.some((q) => q.status === 'started');
            const hasResults = group.queries.some((q) => (q.results?.length || 0) > 0);

            const unifiedResults = Array.from(
              new Map(
                group.queries
                  .flatMap((q) => q.results || [])
                  .map((result) => [`${result.fileName}-${result.content.slice(0, 50)}`, result]),
              ).values(),
            );

            // Check if previous item was a thinking step with nextStep
            const prevItem = itemIndex > 0 ? combinedTimelineItems[itemIndex - 1] : null;
            const prevThinkingNextStep =
              prevItem?.kind === 'thinking' ? (prevItem.item as ThinkingExecution).nextStep : undefined;
            const displayTitle = prevThinkingNextStep || primaryQuery?.query || 'Searching files';

            const bulletColor = isLoading
              ? 'bg-primary/80 animate-[pulse_0.8s_ease-in-out_infinite]!'
              : hasResults
                ? 'bg-primary'
                : 'bg-muted-foreground/50';

            return (
              <motion.div
                key={group.id}
                className="space-y-0 relative"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1, delay: itemIndex * 0.01 }}
              >
                <div
                  className="absolute rounded-full bg-background z-5"
                  style={{ left: '-0.6rem', top: '4px', width: '10px', height: '10px', transform: 'translateX(-50%)' }}
                />

                <div
                  className={`absolute rounded-full ${bulletColor} transition-colors duration-300 z-10`}
                  style={{ left: '-0.6rem', top: '5px', width: '8px', height: '8px', transform: 'translateX(-50%)' }}
                  title={`Status: ${activeQuery?.status || 'completed'}`}
                />

                {itemIndex > 0 && (
                  <div
                    className="absolute bg-secondary"
                    style={{
                      left: '-0.6rem',
                      top: '0',
                      width: '2px',
                      height: '5px',
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}

                <div
                  className="absolute bg-secondary"
                  style={{
                    left: '-0.6rem',
                    top: '13px',
                    width: '2px',
                    height: expandedItems[group.id]
                      ? itemIndex === combinedTimelineItems.length - 1
                        ? 'calc(100% - 13px)'
                        : 'calc(100% - 13px)'
                      : itemIndex === combinedTimelineItems.length - 1
                        ? '0'
                        : 'calc(100% - 9px)',
                    transform: 'translateX(-50%)',
                  }}
                />

                <div
                  className="flex items-start gap-1.5 cursor-pointer py-1 px-1.5 hover:bg-accent/50 rounded-md transition-colors duration-150 relative"
                  onClick={() => toggleItemExpansion(group.id)}
                >
                  <svg className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <span className="text-foreground text-[11px] min-w-0 flex-1 wrap-break-word leading-snug">
                    {isLoading && !isCompleted ? (
                      <TextShimmer className="w-full" duration={1.5}>
                        {displayTitle}
                      </TextShimmer>
                    ) : (
                      displayTitle
                    )}
                  </span>
                  {group.queries.length > 1 && (
                    <span className="text-[8.5px] text-muted-foreground px-1 py-0.25 rounded-full bg-muted border border-border/50 shrink-0">
                      {group.queries.length} queries
                    </span>
                  )}
                  {expandedItems[group.id] ? (
                    <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </div>

                <AnimatePresence>
                  {expandedItems[group.id] && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ height: { duration: 0.2, ease: 'easeOut' }, opacity: { duration: 0.15 } }}
                      className="overflow-hidden"
                    >
                      <div className="pl-0.5 py-0.5 space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {group.queries.map((query, index) => (
                            <span
                              key={`${query.id}-${index}`}
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground"
                            >
                              <svg className="h-2.5 w-2.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              </svg>
                              <span className="truncate max-w-[180px]">{query.query}</span>
                            </span>
                          ))}
                        </div>

                        {unifiedResults.length > 0 && (
                          <motion.div
                            className="rounded-lg bg-card border border-border/50 p-2 max-h-[180px] overflow-y-auto mt-1.5"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                            ref={(node) => {
                              if (node) {
                                fileResultsListRefs.current[group.id] = node;
                                return;
                              }
                              delete fileResultsListRefs.current[group.id];
                            }}
                          >
                            {unifiedResults.map((result, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-2.5 px-2 py-1.5 text-[11px] rounded transition-colors"
                              >
                                <svg className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                </svg>
                                <div className="flex-1 min-w-0">
                                  <div className="text-foreground font-medium truncate">{result.fileName}</div>
                                  <div className="text-muted-foreground line-clamp-2 mt-0.5">{result.content.slice(0, 150)}...</div>
                                </div>
                                <div className="text-[10px] text-muted-foreground shrink-0">
                                  {Math.round(result.score * 100)}%
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}

                        {isLoading && !isCompleted && (
                          <TextShimmer className="text-xs py-0.5" duration={2.5}>
                            Searching files...
                          </TextShimmer>
                        )}

                        {!isLoading && unifiedResults.length === 0 && (
                          <p className="text-[11px] text-muted-foreground py-0.5 mt-0.5">
                            No results found in files.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          }

          if (timelineItem.kind === 'browse_page_group') {
            const { executions } = timelineItem.item;
            const primaryExecution = executions[0];
            if (!primaryExecution) return null;

            const isLoading = executions.some((bp) => bp.status === 'started' || bp.status === 'browsing');
            const hasResults = executions.some((bp) => (bp.results?.length || 0) > 0);
            const allResults = executions.flatMap((bp) => bp.results || []);
            const allUrls = executions.flatMap((bp) => bp.urls);

            const prevItem = itemIndex > 0 ? combinedTimelineItems[itemIndex - 1] : null;
            const prevThinkingNextStep =
              prevItem?.kind === 'thinking' ? (prevItem.item as ThinkingExecution).nextStep : undefined;
            const displayTitle = prevThinkingNextStep || `Browsing ${allUrls.length} page${allUrls.length !== 1 ? 's' : ''}`;

            const bulletColor = isLoading
              ? 'bg-primary/80 animate-[pulse_0.8s_ease-in-out_infinite]!'
              : hasResults
                ? 'bg-primary'
                : 'bg-muted-foreground/50';

            return (
              <motion.div
                key={timelineItem.item.id}
                className="space-y-0 relative"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1, delay: itemIndex * 0.01 }}
              >
                <div
                  className="absolute rounded-full bg-background z-5"
                  style={{ left: '-0.6rem', top: '4px', width: '10px', height: '10px', transform: 'translateX(-50%)' }}
                />
                <div
                  className={`absolute rounded-full ${bulletColor} transition-colors duration-300 z-10`}
                  style={{ left: '-0.6rem', top: '5px', width: '8px', height: '8px', transform: 'translateX(-50%)' }}
                  title={`Status: ${primaryExecution.status}`}
                />
                {itemIndex > 0 && (
                  <div
                    className="absolute bg-secondary"
                    style={{ left: '-0.6rem', top: '0', width: '2px', height: '5px', transform: 'translateX(-50%)' }}
                  />
                )}
                <div
                  className="absolute bg-secondary"
                  style={{
                    left: '-0.6rem',
                    top: '13px',
                    width: '2px',
                    height: expandedItems[timelineItem.item.id]
                      ? itemIndex === combinedTimelineItems.length - 1
                        ? 'calc(100% - 13px)'
                        : 'calc(100% - 13px)'
                      : itemIndex === combinedTimelineItems.length - 1
                        ? '0'
                        : 'calc(100% - 9px)',
                    transform: 'translateX(-50%)',
                  }}
                />

                <div
                  className="flex items-start gap-1.5 cursor-pointer py-1 px-1.5 hover:bg-accent/50 rounded-md transition-colors duration-150 relative"
                  onClick={() => toggleItemExpansion(timelineItem.item.id)}
                >
                  <Globe className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-foreground text-[11px] min-w-0 flex-1 wrap-break-word leading-snug">
                    {isLoading && !isCompleted ? (
                      <TextShimmer className="w-full" duration={1.5}>
                        {displayTitle}
                      </TextShimmer>
                    ) : (
                      displayTitle
                    )}
                  </span>
                  {allUrls.length > 1 && (
                    <span className="text-[8.5px] text-muted-foreground px-1 py-0.25 rounded-full bg-muted border border-border/50 shrink-0">
                      {allUrls.length} pages
                    </span>
                  )}
                  {expandedItems[timelineItem.item.id] ? (
                    <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </div>

                <AnimatePresence>
                  {expandedItems[timelineItem.item.id] && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ height: { duration: 0.2, ease: 'easeOut' }, opacity: { duration: 0.15 } }}
                      className="overflow-hidden"
                    >
                      <div className="pl-0.5 py-0.5 space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {allUrls.map((url, index) => {
                            const hostname = (() => { try { return new URL(url).hostname; } catch { return url; } })();
                            return (
                              <span
                                key={`${url}-${index}`}
                                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground"
                              >
                                <img
                                  src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=16`}
                                  alt=""
                                  className="h-2.5 w-2.5 rounded-sm object-contain"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <span className="truncate max-w-[160px]">{hostname}</span>
                              </span>
                            );
                          })}
                        </div>

                        {hasResults && (
                          <motion.div
                            className="rounded-lg bg-card border border-border/50 p-2 max-h-[200px] overflow-y-auto mt-1.5 space-y-2"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.15 }}
                          >
                            {allResults.map((result, index) => {
                              const hostname = (() => { try { return new URL(result.url).hostname; } catch { return result.url; } })();
                              return (
                                <div key={index} className="flex items-start gap-2 text-[11px]">
                                  <img
                                    src={result.favicon || `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`}
                                    alt=""
                                    className="h-3.5 w-3.5 rounded-sm object-contain shrink-0 mt-0.5"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span className="font-medium text-foreground truncate">{result.title || hostname}</span>
                                      {result.error && (
                                        <span className="text-[9px] text-destructive shrink-0">(error)</span>
                                      )}
                                    </div>
                                    {result.content && !result.error && (
                                      <p className="text-muted-foreground line-clamp-2 mt-0.5">
                                        {result.content.slice(0, 200)}
                                      </p>
                                    )}
                                    {result.error && (
                                      <p className="text-muted-foreground line-clamp-1 mt-0.5 text-[10px]">
                                        {result.error}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}

                        {isLoading && !isCompleted && (
                          <TextShimmer className="text-xs py-0.5" duration={2.5}>
                            Browsing pages...
                          </TextShimmer>
                        )}

                        {!isLoading && allResults.length === 0 && (
                          <p className="text-[11px] text-muted-foreground py-0.5 mt-0.5">
                            No content retrieved.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          }

          if (timelineItem.kind === 'code') {
            const code = timelineItem.item as CodeExecution;
            const isLoading = code.status === 'running';
            const bulletColor = isLoading ? 'bg-primary/80 animate-[pulse_0.8s_ease-in-out_infinite]!' : 'bg-primary';

            return (
              <motion.div
                key={code.id}
                className="space-y-0 relative"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1, delay: itemIndex * 0.01 }}
              >
                <div
                  className="absolute rounded-full bg-background z-5"
                  style={{ left: '-0.6rem', top: '4px', width: '10px', height: '10px', transform: 'translateX(-50%)' }}
                />

                <div
                  className={`absolute rounded-full ${bulletColor} transition-colors duration-300 z-10`}
                  style={{ left: '-0.6rem', top: '5px', width: '8px', height: '8px', transform: 'translateX(-50%)' }}
                  title={`Status: ${code.status}`}
                />

                {itemIndex > 0 && (
                  <div
                    className="absolute bg-secondary"
                    style={{ left: '-0.6rem', top: '0', width: '2px', height: '5px', transform: 'translateX(-50%)' }}
                  />
                )}

                <div
                  className="absolute bg-secondary"
                  style={{
                    left: '-0.6rem',
                    top: '13px',
                    width: '2px',
                    height: expandedItems[code.id]
                      ? itemIndex === combinedTimelineItems.length - 1
                        ? 'calc(100% - 13px)'
                        : 'calc(100% - 13px)'
                      : itemIndex === combinedTimelineItems.length - 1
                        ? '0'
                        : 'calc(100% - 9px)',
                    transform: 'translateX(-50%)',
                  }}
                />

                <div
                  className="flex items-start gap-1.5 cursor-pointer py-1 px-1.5 hover:bg-accent/50 rounded-md transition-colors duration-150 relative"
                  onClick={() => toggleItemExpansion(code.id)}
                >
                  <Code2 className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground text-[11px] min-w-0 flex-1 wrap-break-word leading-snug">
                    {isLoading && !isCompleted ? (
                      <TextShimmer className="w-full" duration={1.5}>
                        {code.title}
                      </TextShimmer>
                    ) : (
                      code.title
                    )}
                  </span>
                  {expandedItems[code.id] ? (
                    <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </div>

                <AnimatePresence>
                  {expandedItems[code.id] && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ height: { duration: 0.2, ease: 'easeOut' }, opacity: { duration: 0.15 } }}
                      className="overflow-hidden"
                    >
                      <div className="pl-0.5 py-0.5">
                        <div
                          className="bg-muted/50 border border-border p-2 rounded-lg my-1.5 overflow-auto max-h-[120px] text-[11px] font-mono"
                          ref={(node) => {
                            if (node) {
                              codeResultRefs.current[`${code.id}-code`] = node;
                              return;
                            }
                            delete codeResultRefs.current[`${code.id}-code`];
                          }}
                        >
                          <pre className="whitespace-pre-wrap wrap-break-word text-foreground">{code.code}</pre>
                        </div>
                        {code.result && (
                          <div className="mt-3">
                            <div className="text-[11px] text-muted-foreground font-medium mb-1">Result:</div>
                            <div
                              className="bg-muted/50 border border-border p-2 rounded-lg overflow-auto max-h-[90px] text-[11px] font-mono"
                              ref={(node) => {
                                if (node) {
                                  codeResultRefs.current[`${code.id}-result`] = node;
                                  return;
                                }
                                delete codeResultRefs.current[`${code.id}-result`];
                              }}
                            >
                              <pre className="whitespace-pre-wrap wrap-break-word text-foreground">{code.result}</pre>
                            </div>
                          </div>
                        )}
                        {code.charts && code.charts.length > 0 && (
                          <div className="mt-3 mb-1 space-y-4">
                            {code.charts.map((chart: any, chartIndex: number) => (
                              <div key={chartIndex} className="w-full">
                                <ChartWithFullView chart={chart} index={chartIndex} />
                              </div>
                            ))}
                          </div>
                        )}
                        {code.status === 'running' && !isCompleted && (
                          <TextShimmer className="text-xs py-0.5 mt-1" duration={2.5}>
                            Executing code...
                          </TextShimmer>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          }

          if (timelineItem.kind === 'done') {
            const done = timelineItem.item as DoneExecution;

            return (
              <motion.div
                key={done.id}
                className="space-y-0 relative"
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1, delay: itemIndex * 0.01 }}
              >
                <div
                  className="absolute rounded-full bg-background z-5"
                  style={{ left: '-0.6rem', top: '4px', width: '10px', height: '10px', transform: 'translateX(-50%)' }}
                />

                <div
                  className="absolute rounded-full bg-primary transition-colors duration-300 z-10"
                  style={{ left: '-0.6rem', top: '5px', width: '8px', height: '8px', transform: 'translateX(-50%)' }}
                  title="Research completed"
                />

                {itemIndex > 0 && (
                  <div
                    className="absolute bg-secondary"
                    style={{
                      left: '-0.6rem',
                      top: '0',
                      width: '2px',
                      height: '5px',
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}

                <div
                  className="absolute bg-secondary"
                  style={{
                    left: '-0.6rem',
                    top: '13px',
                    width: '2px',
                    height: expandedItems[done.id]
                      ? itemIndex === combinedTimelineItems.length - 1
                        ? 'calc(100% - 13px)'
                        : 'calc(100% - 13px)'
                      : itemIndex === combinedTimelineItems.length - 1
                        ? '0'
                        : 'calc(100% - 9px)',
                    transform: 'translateX(-50%)',
                  }}
                />

                <div
                  className="flex items-start gap-1.5 cursor-pointer py-1 px-1.5 hover:bg-accent/50 rounded-md transition-colors duration-150 relative"
                  onClick={() => toggleItemExpansion(done.id)}
                >
                  <svg className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-foreground text-[11px] min-w-0 flex-1 wrap-break-word leading-snug">
                    Done
                  </span>
                  {expandedItems[done.id] ? (
                    <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </div>

                <AnimatePresence>
                  {expandedItems[done.id] && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ height: { duration: 0.2, ease: 'easeOut' }, opacity: { duration: 0.15 } }}
                      className="overflow-hidden"
                    >
                      <div className="pl-0.5 py-0.5">
                        <p className="text-[11px] text-muted-foreground leading-snug">{done.summary}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          }

          return null;
        })}
      </AnimatePresence>

      {/* Waiting indicator - shows when last item is completed and waiting for next step */}
      {!isCompleted && combinedTimelineItems.length > 0 && (() => {
        const lastItem = combinedTimelineItems[combinedTimelineItems.length - 1];

        // Don't show while the last visible step is still a thinking placeholder
        if (lastItem?.kind === 'done' || lastItem?.kind === 'thinking') return null;

        // Check if last item is still loading
        let isLastItemLoading = false;
        if (lastItem?.kind === 'query_group') {
          isLastItemLoading = lastItem.item.queries.some((q) => q.status === 'started' || q.status === 'reading_content');
        } else if (lastItem?.kind === 'x_search_group') {
          isLastItemLoading = lastItem.item.searches.some((s) => s.status === 'started');
        } else if (lastItem?.kind === 'file_query_group') {
          isLastItemLoading = lastItem.item.queries.some((q) => q.status === 'started');
        } else if (lastItem?.kind === 'browse_page_group') {
          isLastItemLoading = lastItem.item.executions.some((bp) => bp.status === 'started' || bp.status === 'browsing');
        } else if (lastItem?.kind === 'code') {
          isLastItemLoading = lastItem.item.status === 'running';
        }

        // Only show if last item is NOT loading (completed, waiting for next)
        if (isLastItemLoading) return null;

        return (
          <motion.div
            key="waiting"
            className="relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Background circle */}
            <div
              className="absolute rounded-full bg-background z-5"
              style={{ left: '-0.6rem', top: '4px', width: '10px', height: '10px', transform: 'translateX(-50%)' }}
            />
            {/* Pulsing dot - matches timeline color */}
            <div
              className="absolute rounded-full bg-primary/60 animate-pulse z-10"
              style={{ left: '-0.6rem', top: '5px', width: '8px', height: '8px', transform: 'translateX(-50%)' }}
            />
            {/* Line connecting to previous item - extends up to fill gap */}
            <div
              className="absolute bg-secondary"
              style={{ left: '-0.6rem', top: '-12px', width: '2px', height: '17px', transform: 'translateX(-50%)' }}
            />
            {/* Content aligned with other items */}
            <div className="flex items-start gap-1.5 py-1 px-1.5">
              <DashLoading size={14} color="currentColor" strokeWidth={1.5} />
              <span className="text-[11px] text-muted-foreground/60 leading-snug">
                Waiting for agent...
              </span>
            </div>
          </motion.div>
        );
      })()}
    </div>
  );

  // Add horizontal scroll support with mouse wheel (matching multi-search)
  const handleWheelScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;

    // Only handle vertical scrolling
    if (e.deltaY === 0) return;

    // Check if container can scroll horizontally
    const canScrollHorizontally = container.scrollWidth > container.clientWidth;
    if (!canScrollHorizontally) return;

    // Always stop propagation first to prevent page scroll interference
    e.stopPropagation();

    // Check scroll position to determine if we should handle the event
    const isAtLeftEdge = container.scrollLeft <= 1;
    const isAtRightEdge = container.scrollLeft >= container.scrollWidth - container.clientWidth - 1;

    // Only prevent default if we're not at edges OR if we're scrolling in the direction that would move within bounds
    if (!isAtLeftEdge && !isAtRightEdge) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtLeftEdge && e.deltaY > 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    } else if (isAtRightEdge && e.deltaY < 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  };

  // Render sources list (used inside tabs)
  const renderSourcesList = (sources: ExtremeSearchSource[]) => {
    return (
      <div className="bg-background">
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
          {sources.length > 0 ? (
            sources.map((source, index) => (
              <a key={index} href={source.url} target="_blank" className="block">
                <ExtremeSourceCard source={source} />
              </a>
            ))
          ) : (
            <div className="p-6 text-center">
              <p className="text-muted-foreground text-sm">No sources found</p>
            </div>
          )}
        </div>
        {sources.length > 0 && (
          <div className="border-t border-border px-4 py-2">
            <button
              onClick={() => setSourcesSheetOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-md hover:bg-accent/50 transition-colors duration-150"
            >
              View all {sources.length} sources
              <Icons.ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };


  // Final result view
  if (isCompleted) {
    const stepCount = combinedTimelineItems.filter((item) => item.kind !== 'done').length;

    // Pre-compute X Search data
    const completedXSearches = xSearchExecutions.filter((x) => x.status === 'completed' && x.result);
    const xSearchData = completedXSearches.length > 0 ? (() => {
      const handles = Array.from(
        new Set(
          completedXSearches
            .flatMap((x) => x.handles || [])
            .filter((handle): handle is string => typeof handle === 'string' && handle.length > 0),
        ),
      );
      const combinedSearch = {
        content: completedXSearches.map((x) => x.result!.content).join('\n\n'),
        citations: completedXSearches.flatMap((x) => x.result!.citations || []),
        sources: completedXSearches.flatMap((x) => x.result!.sources || []),
        query: completedXSearches.map((x) => x.query).filter(Boolean).join(' | '),
        dateRange: `${completedXSearches[0].startDate || ''} to ${completedXSearches[completedXSearches.length - 1].endDate || ''}`,
        handles,
      };
      return {
        result: { searches: [combinedSearch], dateRange: combinedSearch.dateRange, handles },
        args: {
          queries: completedXSearches.map((x) => x.query).filter((q): q is string => typeof q === 'string' && q.length > 0),
          startDate: completedXSearches[0].startDate,
          endDate: completedXSearches[completedXSearches.length - 1].endDate,
          includeXHandles: handles,
        },
      };
    })() : null;

    // Pre-compute File Query data
    const completedFileQueries = fileQueryExecutions.filter(
      (fq) => fq.status === 'completed' && fq.results && fq.results.length > 0
    );
    const fileQueryData = completedFileQueries.length > 0 ? (() => {
      const allFileResults = Array.from(
        new Map(
          completedFileQueries
            .flatMap((fq) => fq.results || [])
            .map((result) => [`${result.fileName}-${result.content.slice(0, 50)}`, result])
        ).values()
      );
      if (allFileResults.length === 0) return null;
      const queries = completedFileQueries.map((fq) => fq.query).filter(Boolean);
      return { results: allFileResults, queries };
    })() : null;

    return (
      <>
        <div className="border border-border rounded-xl overflow-hidden shadow-none">
          {/* Collapsible header */}
          <button
            onClick={() => setResultsOpen(!resultsOpen)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-accent/10 transition-colors duration-200 bg-background"
          >
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <FlaskConical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground shrink-0">Research Complete</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {stepCount} {stepCount === 1 ? 'step' : 'steps'}
                {allSources.length > 0 && ` · ${allSources.length} sources`}
                {allCharts.length > 0 && ` · ${allCharts.length} ${allCharts.length === 1 ? 'chart' : 'charts'}`}
                {xSearchData && ` · ${xSearchData.result.searches[0]?.citations?.length || 0} posts`}
                {fileQueryData && ` · ${fileQueryData.results.length} ${fileQueryData.results.length === 1 ? 'file' : 'files'}`}
              </span>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200',
                resultsOpen ? 'rotate-180' : '',
              )}
            />
          </button>

          {resultsOpen && (
            <div>
              <div className="px-2.5 py-2 border-t border-b border-border bg-background overflow-x-auto no-scrollbar">
                <KumoTabs
                  variant="segmented"
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full [--color-kumo-tint:var(--accent)] [--color-kumo-base:var(--background)] [--color-kumo-recessed:var(--muted)] [--color-kumo-surface:var(--card)] [--text-color-kumo-default:var(--foreground)] [--text-color-kumo-strong:var(--muted-foreground)] [--text-color-kumo-subtle:var(--muted-foreground)] [--color-kumo-ring:var(--border)]"
                  listClassName="w-full [&>button]:flex-1 [&>button]:justify-center"
                  tabs={[
                    {
                      value: 'process',
                      label: (
                        <span className="inline-flex items-center gap-1.5 leading-none">
                          <FlaskConical className="h-3 w-3 shrink-0" />
                          <span className="hidden sm:inline">Research Process</span>
                          <span className="sm:hidden">Process</span>
                          <span className="text-[10px] opacity-60 translate-y-px tabular-nums">{stepCount}</span>
                        </span>
                      ),
                    },
                    ...(allCharts.length > 0 ? [{
                      value: 'visualizations',
                      label: (
                        <span className="inline-flex items-center gap-1.5 leading-none">
                          <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span>Visualizations</span>
                          <span className="text-[10px] opacity-60 translate-y-px tabular-nums">{allCharts.length}</span>
                        </span>
                      ),
                    }] : []),
                    ...(xSearchData ? [{
                      value: 'xsearch',
                      label: (
                        <span className="inline-flex items-center gap-1.5 leading-none">
                          <XLogoIcon className="h-3 w-3 shrink-0" />
                          <span className="hidden sm:inline">X Search</span>
                          <span className="sm:hidden">X</span>
                          <span className="text-[10px] opacity-60 translate-y-px tabular-nums">{xSearchData.result.searches[0]?.citations?.length || 0}</span>
                        </span>
                      ),
                    }] : []),
                    ...(fileQueryData ? [{
                      value: 'files',
                      label: (
                        <span className="inline-flex items-center gap-1.5 leading-none">
                          <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <span>Files</span>
                          <span className="text-[10px] opacity-60 translate-y-px tabular-nums">{fileQueryData.results.length}</span>
                        </span>
                      ),
                    }] : []),
                    ...(allSources.length > 0 ? [{
                      value: 'sources',
                      label: (
                        <span className="inline-flex items-center gap-1.5 leading-none">
                          <Icons.Globe className="h-3 w-3 shrink-0" />
                          <span>Sources</span>
                          <span className="text-[10px] opacity-60 translate-y-px tabular-nums">{allSources.length}</span>
                        </span>
                      ),
                    }] : []),
                  ]}
                />
              </div>

              {/* Research Process Tab */}
              {activeTab === 'process' && (
                <div className="max-h-[500px] sm:max-h-[450px] overflow-y-auto">
                  <div className="p-4">{renderTimeline()}</div>
                </div>
              )}

              {/* X Search Tab */}
              {activeTab === 'xsearch' && xSearchData && (
                <div>
                  {/* Sticky header with post count, date range, queries */}
                  <div className="px-4 py-2.5 border-b border-border bg-background sticky top-0 z-10">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{xSearchData.result.searches[0]?.citations?.length || 0} posts</span>
                      {xSearchData.result.dateRange && (
                        <>
                          <span className="text-border">·</span>
                          <span>{xSearchData.result.dateRange}</span>
                        </>
                      )}
                      {xSearchData.args.queries.length > 0 && (
                        <span className="text-border">·</span>
                      )}
                      {xSearchData.args.queries.length > 0 && (
                        <span>{xSearchData.args.queries.length} {xSearchData.args.queries.length === 1 ? 'query' : 'queries'}</span>
                      )}
                    </div>
                  </div>

                  {/* Tweet previews - horizontal scroll */}
                  {(() => {
                    const citations = xSearchData.result.searches[0]?.citations || [];
                    const tweetsWithIds = citations.filter((c) => c.tweet_id);
                    if (tweetsWithIds.length === 0) return null;

                    return (
                      <div className="px-3 pt-3">
                        <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
                          {tweetsWithIds.map((citation, index) => (
                            <div
                              key={citation.tweet_id || index}
                              className="shrink-0 w-[260px] sm:w-[300px]"
                            >
                              <div className="tweet-wrapper">
                                <Tweet id={citation.tweet_id!} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* File Query Tab */}
              {activeTab === 'files' && fileQueryData && (
                <div className="max-h-[400px] overflow-y-auto">
                  {fileQueryData.queries.length > 0 && (
                    <div className="px-5 py-3 border-b border-border sticky top-0 z-10 bg-background">
                      <div className="flex flex-wrap gap-1.5">
                        {fileQueryData.queries.map((query, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] text-foreground"
                          >
                            <Search className="h-2.5 w-2.5 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">{query}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="divide-y divide-border">
                    {fileQueryData.results.map((result, index) => (
                      <div key={index} className="px-5 py-3 hover:bg-accent/30 transition-colors">
                        <div className="flex items-start gap-3">
                          <svg className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-foreground truncate">{result.fileName}</span>
                              <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted border border-border/50">
                                {Math.round(result.score * 100)}% match
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-3">{result.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Visualizations Tab */}
              {activeTab === 'visualizations' && allCharts.length > 0 && (
                <div className="max-h-[450px] overflow-y-auto">
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 auto-rows-[200px]">
                    {allCharts.map((chart, index) => (
                      <ChartWithFullView key={index} chart={chart} index={index} />
                    ))}
                  </div>
                </div>
              )}

              {/* Sources Tab */}
              {activeTab === 'sources' && allSources.length > 0 && (
                <div>
                  {renderSourcesList(allSources)}
                </div>
              )}
            </div>
          )}
        </div>

        {allSources.length > 0 && (
          <ExtremeSourcesSheet sources={allSources} open={sourcesSheetOpen} onOpenChange={setSourcesSheetOpen} />
        )}
      </>
    );
  }

  // In-progress view
  const hasTimelineItems = combinedTimelineItems.length > 0;
  const inProgressStepCount = combinedTimelineItems.filter((item) => item.kind !== 'done').length;

  // In-progress X Search data
  const inProgressCompletedX = xSearchExecutions.filter((x) => x.status === 'completed' && x.result);
  const inProgressXSearchData = inProgressCompletedX.length > 0 ? (() => {
    const handles = Array.from(
      new Set(
        inProgressCompletedX
          .flatMap((x) => x.handles || [])
          .filter((handle): handle is string => typeof handle === 'string' && handle.length > 0),
      ),
    );
    const combinedSearch = {
      content: inProgressCompletedX.map((x) => x.result!.content).join('\n\n'),
      citations: inProgressCompletedX.flatMap((x) => x.result!.citations || []),
      sources: inProgressCompletedX.flatMap((x) => x.result!.sources || []),
      query: inProgressCompletedX.map((x) => x.query).filter(Boolean).join(' | '),
      dateRange: `${inProgressCompletedX[0].startDate || ''} to ${inProgressCompletedX[inProgressCompletedX.length - 1].endDate || ''}`,
      handles,
    };
    return {
      result: { searches: [combinedSearch], dateRange: combinedSearch.dateRange, handles },
      args: {
        queries: inProgressCompletedX.map((x) => x.query).filter((q): q is string => typeof q === 'string' && q.length > 0),
      },
    };
  })() : null;

  // In-progress File Query data
  const inProgressFileQueries = fileQueryExecutions.filter(
    (fq) => fq.status === 'completed' && fq.results && fq.results.length > 0
  );
  const inProgressFileData = inProgressFileQueries.length > 0 ? (() => {
    const results = Array.from(
      new Map(
        inProgressFileQueries
          .flatMap((fq) => fq.results || [])
          .map((result) => [`${result.fileName}-${result.content.slice(0, 50)}`, result])
      ).values()
    );
    if (results.length === 0) return null;
    const queries = inProgressFileQueries.map((fq) => fq.query).filter(Boolean);
    return { results, queries };
  })() : null;

  return (
    <div className="border border-border rounded-xl overflow-hidden shadow-none">
      <div>
        <div className="px-2.5 py-2 border-b border-border bg-background overflow-x-auto no-scrollbar">
          <KumoTabs
            variant="segmented"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full [--color-kumo-tint:var(--accent)] [--color-kumo-base:var(--background)] [--color-kumo-recessed:var(--muted)] [--color-kumo-surface:var(--card)] [--text-color-kumo-default:var(--foreground)] [--text-color-kumo-strong:var(--muted-foreground)] [--text-color-kumo-subtle:var(--muted-foreground)] [--color-kumo-ring:var(--border)]"
            listClassName="w-full [&>button]:flex-1 [&>button]:justify-center"
            tabs={[
              {
                value: 'process',
                label: (
                  <span className="inline-flex items-center gap-1.5 leading-none">
                    <FlaskConical className="h-3 w-3 shrink-0" />
                    <span className="hidden sm:inline">Research Process</span>
                    <span className="sm:hidden">Process</span>
                    {inProgressStepCount > 0 && (
                      <span className="text-[10px] opacity-60 translate-y-px tabular-nums">{inProgressStepCount}</span>
                    )}
                  </span>
                ),
              },
              ...(allCharts.length > 0 ? [{
                value: 'visualizations',
                label: (
                  <span className="inline-flex items-center gap-1.5 leading-none">
                    <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Visualizations</span>
                    <span className="text-[10px] opacity-60 translate-y-px tabular-nums">{allCharts.length}</span>
                  </span>
                ),
              }] : []),
              ...(inProgressXSearchData ? [{
                value: 'xsearch',
                label: (
                  <span className="inline-flex items-center gap-1.5 leading-none">
                    <XLogoIcon className="h-3 w-3 shrink-0" />
                    <span className="hidden sm:inline">X Search</span>
                    <span className="sm:hidden">X</span>
                    <span className="text-[10px] opacity-60 translate-y-px tabular-nums">{inProgressXSearchData.result.searches[0]?.citations?.length || 0}</span>
                  </span>
                ),
              }] : []),
              ...(inProgressFileData ? [{
                value: 'files',
                label: (
                  <span className="inline-flex items-center gap-1.5 leading-none">
                    <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span>Files</span>
                    <span className="text-[10px] opacity-60 translate-y-px tabular-nums">{inProgressFileData.results.length}</span>
                  </span>
                ),
              }] : []),
              ...(allSources.length > 0 ? [{
                value: 'sources',
                label: (
                  <span className="inline-flex items-center gap-1.5 leading-none">
                    <Icons.Globe className="h-3 w-3 shrink-0" />
                    <span>Sources</span>
                    <span className="text-[10px] opacity-60 translate-y-px tabular-nums">{allSources.length}</span>
                  </span>
                ),
              }] : []),
            ]}
          />
        </div>

        {/* Research Process Tab */}
        {activeTab === 'process' && (
        <div>
          {/* Status inside the process tab */}
          <div className="py-2 px-4 border-b border-border bg-background">
            <div className="text-sm font-medium text-foreground">
              {state === 'input-streaming' || state === 'input-available' ? (
                <TextShimmer duration={2}>{currentStatus}</TextShimmer>
              ) : (
                currentStatus
              )}
            </div>
          </div>
          <div className="p-4">
            {/* Show plan if available and no timeline items yet */}
            {planData && !hasTimelineItems && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Target className="w-4 h-4 text-primary" />
                  <h4 className="text-[13px] font-semibold text-foreground">Research Strategy</h4>
                </div>

                <div className="space-y-0.5 relative ml-3">
                  {planData.map((item: any, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 2 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="space-y-0 relative"
                    >
                      <div
                        className="absolute rounded-full bg-card z-5"
                        style={{
                          left: '-0.6rem',
                          top: '4px',
                          width: '10px',
                          height: '10px',
                          transform: 'translateX(-50%)',
                        }}
                      />
                      <div
                        className="absolute rounded-full bg-primary transition-colors duration-300 z-10"
                        style={{
                          left: '-0.6rem',
                          top: '5px',
                          width: '8px',
                          height: '8px',
                          transform: 'translateX(-50%)',
                        }}
                      />
                      {index > 0 && (
                        <div
                          className="absolute bg-secondary"
                          style={{
                            left: '-0.6rem',
                            top: '0',
                            width: '2px',
                            height: '5px',
                            transform: 'translateX(-50%)',
                          }}
                        />
                      )}
                      {index < planData.length - 1 && (
                        <div
                          className="absolute bg-secondary"
                          style={{
                            left: '-0.6rem',
                            top: '13px',
                            width: '2px',
                            height: 'calc(100% - 9px)',
                            transform: 'translateX(-50%)',
                          }}
                        />
                      )}
                      <div className="flex items-start gap-1.5 py-1 px-1.5 rounded-md relative">
                        <span className="text-foreground text-[11px] min-w-0 flex-1 font-medium wrap-break-word leading-snug">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded-full">
                          {item.todos?.length || 0} tasks
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Show loading skeletons when no plan and no items */}
            {!planData && !hasTimelineItems && (
              <div className="mb-2.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Target className="w-4 h-4 text-primary/50" />
                  <h4 className="text-[13px] font-semibold text-foreground">Preparing Research Strategy</h4>
                </div>

                <div className="space-y-0.5 relative ml-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-0 relative">
                      <div
                        className="absolute rounded-full bg-card z-5"
                        style={{
                          left: '-0.6rem',
                          top: '4px',
                          width: '10px',
                          height: '10px',
                          transform: 'translateX(-50%)',
                        }}
                      />
                      <Skeleton
                        className="absolute rounded-full z-10"
                        style={{
                          left: '-0.6rem',
                          top: '5px',
                          width: '8px',
                          height: '8px',
                          transform: 'translateX(-50%)',
                        }}
                      />
                      {i > 1 && (
                        <div
                          className="absolute bg-secondary"
                          style={{
                            left: '-0.6rem',
                            top: '0',
                            width: '2px',
                            height: '5px',
                            transform: 'translateX(-50%)',
                          }}
                        />
                      )}
                      {i < 3 && (
                        <div
                          className="absolute bg-secondary"
                          style={{
                            left: '-0.6rem',
                            top: '13px',
                            width: '2px',
                            height: 'calc(100% - 9px)',
                            transform: 'translateX(-50%)',
                          }}
                        />
                      )}
                      <div className="flex items-start gap-1.5 py-1 px-1.5 rounded-md relative">
                        <Skeleton className="w-3 h-3 rounded-full shrink-0 mt-0.5" />
                        <Skeleton className="h-3 flex-1" />
                        <Skeleton className="h-3 w-12 shrink-0 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show timeline when items are available */}
            {hasTimelineItems && (
              <div
                ref={timelineRef}
                className="max-h-[500px] sm:max-h-[400px] overflow-y-auto pr-2"
                onScroll={handleTimelineScroll}
              >
                {renderTimeline()}
                <div ref={timelineBottomRef} />
              </div>
            )}
          </div>
        </div>
        )}

        {/* Visualizations Tab (in-progress) */}
        {activeTab === 'visualizations' && allCharts.length > 0 && (
          <div className="max-h-[450px] overflow-y-auto">
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 auto-rows-[200px]">
              {allCharts.map((chart, index) => (
                <ChartWithFullView key={index} chart={chart} index={index} />
              ))}
            </div>
          </div>
        )}

        {/* X Search Tab (in-progress) */}
        {activeTab === 'xsearch' && inProgressXSearchData && (
          <div>
            <div className="px-4 py-2.5 border-b border-border bg-background sticky top-0 z-10">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{inProgressXSearchData.result.searches[0]?.citations?.length || 0} posts</span>
                {inProgressXSearchData.result.dateRange && (
                  <>
                    <span className="text-border">·</span>
                    <span>{inProgressXSearchData.result.dateRange}</span>
                  </>
                )}
                {inProgressXSearchData.args.queries.length > 0 && (
                  <span className="text-border">·</span>
                )}
                {inProgressXSearchData.args.queries.length > 0 && (
                  <span>{inProgressXSearchData.args.queries.length} {inProgressXSearchData.args.queries.length === 1 ? 'query' : 'queries'}</span>
                )}
              </div>
            </div>
            {(() => {
              const citations = inProgressXSearchData.result.searches[0]?.citations || [];
              const tweetsWithIds = citations.filter((c) => c.tweet_id);
              if (tweetsWithIds.length === 0) return null;
              return (
                <div className="px-3 pt-3">
                  <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
                    {tweetsWithIds.map((citation, index) => (
                      <div key={citation.tweet_id || index} className="shrink-0 w-[260px] sm:w-[300px]">
                        <div className="tweet-wrapper">
                          <Tweet id={citation.tweet_id!} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* File Query Tab (in-progress) */}
        {activeTab === 'files' && inProgressFileData && (
          <div className="max-h-[400px] overflow-y-auto">
            {inProgressFileData.queries.length > 0 && (
              <div className="px-5 py-3 border-b border-border sticky top-0 z-10 bg-background">
                <div className="flex flex-wrap gap-1.5">
                  {inProgressFileData.queries.map((query, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] text-foreground"
                    >
                      <Search className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="truncate max-w-[200px]">{query}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="divide-y divide-border">
              {inProgressFileData.results.map((result, index) => (
                <div key={index} className="px-5 py-3 hover:bg-accent/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <svg className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground truncate">{result.fileName}</span>
                        <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted border border-border/50">
                          {Math.round(result.score * 100)}% match
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">{result.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sources Tab (in-progress) */}
        {activeTab === 'sources' && allSources.length > 0 && (
          <div>
            {renderSourcesList(allSources)}
          </div>
        )}
      </div>
    </div>
  );
};

export const ExtremeSearch = memo(ExtremeSearchComponent);
