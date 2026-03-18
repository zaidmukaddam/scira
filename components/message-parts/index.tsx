import React, { memo, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AppsIcon } from '@/components/icons/apps-icon';
import isEqual from 'fast-deep-equal';
import { ReasoningUIPart, DataUIPart, isStaticToolUIPart } from 'ai';
import { ReasoningPartView } from '@/components/reasoning-part';
import { MarkdownRenderer } from '@/components/markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { ChatTextHighlighter } from '@/components/chat-text-highlighter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { deleteTrailingMessages, branchOutChat } from '@/app/actions';
import { sileo } from 'sileo';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ShareButton } from '@/components/share';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import { CpuIcon, SplitIcon, Chart03Icon } from '@hugeicons/core-free-icons';
import { ChatMessage, CustomUIDataTypes, DataQueryCompletionPart, DataExtremeSearchPart, DataBuildSearchPart } from '@/lib/types';
import {
  BoxExecResult,
  BoxWriteResult,
  BoxReadResult,
  BoxListResult,
  BoxDownloadResult,
  BoxAgentResult,
  BoxCodeResult,
} from '@/components/build-search';
import { SPEC_DATA_PART_TYPE } from '@json-render/core';
import { useJsonRenderMessage } from '@json-render/react';
import { CanvasRendererView } from '@/components/canvas-renderer';
import { UseChatHelpers } from '@ai-sdk/react';
import Image from 'next/image';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

// Tool-specific components (eagerly loaded for better UX)
import { SearchLoadingState } from '@/components/tool-invocation-list-view';
import { MapPin, Film, Tv, Cloud, DollarSign, TrendingUpIcon, Plane, User2, Loader2, Clock, Globe, YoutubeIcon, Info, Code, Copy, Check, X, AlertCircle } from 'lucide-react';
import {
  ClockIcon as PhosphorClockIcon,
  MemoryIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  SigmaIcon,
  FilePdf,
  FileDoc,
  FileMd,
} from '@phosphor-icons/react';

function IconArrowInbox(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M20.25 14.75V17.25C20.25 18.9069 18.9069 20.25 17.25 20.25H6.75C5.09315 20.25 3.75 18.9069 3.75 17.25V14.75M12 15V3.75M12 15L8.5 11.5M12 15L15.5 11.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function isToolPartType(partType: string) {
  return partType.startsWith('tool-') || partType === 'dynamic-tool';
}


function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M7.75 7.75V6.75C7.75 5.09315 9.09315 3.75 10.75 3.75H17.25C18.9069 3.75 20.25 5.09315 20.25 6.75V13.26C20.25 14.9169 18.9069 16.26 17.25 16.26H16.25M3.75 10.75V17.25C3.75 18.9069 5.09315 20.25 6.75 20.25H13.25C14.9069 20.25 16.25 18.9069 16.25 17.25V10.75C16.25 9.09315 14.9069 7.75 13.25 7.75H6.75C5.09315 7.75 3.75 9.09315 3.75 10.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TryAgainIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M10.75 1.5L14.25 4.75L10.75 8M13.25 16L9.75 19.25L13.25 22.5M10.75 19.25H14C18.0041 19.25 21.25 16.0041 21.25 12C21.25 9.81504 20.2834 7.85583 18.7546 6.52661M13.25 4.75H10C5.99593 4.75 2.75 7.99594 2.75 12C2.75 14.1854 3.71696 16.145 5.24638 17.4742"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getModelConfig } from '@/ai/models';
import { ComprehensiveUserData } from '@/lib/user-data-server';
import { Spinner } from '../ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

// Eagerly load tool components for better UX (except browser-only components)
import dynamic from 'next/dynamic';
import { FlightTracker } from '@/components/flight-tracker';
import TMDBResult from '@/components/movie-info';
import MultiSearch from '@/components/multi-search';
import TrendingResults from '@/components/trending-tv-movies-results';
import AcademicPapersCard from '@/components/academic-papers';
import WeatherChart from '@/components/weather-chart';
import RedditSearch from '@/components/reddit-search';
import GitHubSearch from '@/components/github-search';
import PredictionSearch from '@/components/prediction-search';
import { TextTranslate } from '@/components/text-translate';
import XSearch from '@/components/x-search';
import { ExtremeSearch } from '@/components/extreme-search';
import { CoinData as CryptoCoinsData } from '@/components/crypto-coin-data';
import { CurrencyConverter } from '@/components/currency_conv';
import { YouTubeSearchResults } from '@/components/youtube-search-results';
import { SpotifySearchResults } from '@/components/spotify-search-results';
import { ConnectorsSearchResults } from '@/components/connectors-search-results';
import { CodeInterpreterView, NearbySearchSkeleton } from '@/components/tool-invocation-list-view';
import { RetrieveResults } from '@/components/retrieve-results';
import FileQuerySearch from '@/components/file-query-search';
import { useDataStream } from '../data-stream-provider';
import {
  AppBridge,
  PostMessageTransport,
  buildAllowAttribute,
  getToolUiResourceUri,
  type McpUiHostContext,
  type McpUiResourceMeta,
} from '@modelcontextprotocol/ext-apps/app-bridge';
import { Tabs as KumoTabs } from '@cloudflare/kumo';
import { useTheme } from 'next-themes';

// Components that require browser APIs (Leaflet, charts) - load dynamically with ssr: false
const InteractiveChart = dynamic(() => import('@/components/interactive-charts'), { ssr: false });
const MapComponent = dynamic(() => import('@/components/map-components').then((m) => ({ default: m.MapComponent })), {
  ssr: false,
});
const NearbySearchMapView = dynamic(() => import('@/components/nearby-search-map-view'), { ssr: false });
const InteractiveStockChart = dynamic(() => import('@/components/interactive-stock-chart'), { ssr: false });
const CryptoChart = dynamic(() => import('@/components/crypto-charts').then((m) => ({ default: m.CryptoChart })), {
  ssr: false,
});
const CryptoTickers = dynamic(() => import('@/components/crypto-charts').then((m) => ({ default: m.CryptoTickers })), {
  ssr: false,
});

// Loading state for stock chart — mirrors the real accordion header + chart + flat rows layout
const StockChartLoader = ({ title, input }: { title?: string; input?: any }) => {
  const companies = input?.companies || [];
  return (
    <div className="w-full mt-4 rounded-xl border border-border/60 overflow-hidden bg-card/30">
      {/* Header — matches AccordionTrigger layout */}
      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-md bg-primary/10">
            <HugeiconsIcon icon={Chart03Icon} className="size-3.5 text-primary animate-pulse" strokeWidth={2} />
          </div>
          <div className="flex flex-col items-start gap-0.5 min-w-0">
            <span className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-wider">Stock Analysis</span>
            <span className="text-xs font-medium text-foreground/80 truncate max-w-[280px]">{title || 'Preparing financial analysis...'}</span>
          </div>
        </div>
        <Spinner className="size-4 text-primary/60" />
      </div>

      {/* Content — matches p-4 space-y-4 body */}
      <div className="p-4 space-y-4">
        {/* Interval skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-3 w-14 rounded bg-muted/30 animate-pulse" />
          <span className="text-[9px] text-muted-foreground/30">/</span>
          <div className="h-3 w-16 rounded bg-muted/25 animate-pulse" />
        </div>

        {/* Chart skeleton — matches h-56 md:h-72 */}
        <div className="w-full h-56 md:h-72 rounded-lg border border-border/40 bg-muted/10 flex items-end p-4 gap-1">
          {Array.from({ length: 28 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-primary/6 animate-pulse"
              style={{
                height: `${20 + Math.sin(i * 0.5) * 30 + Math.random() * 25}%`,
                animationDelay: `${i * 40}ms`,
              }}
            />
          ))}
        </div>

        {/* Stock rows skeleton — matches flat divided rows */}
        {companies.length > 0 && (
          <div className="rounded-lg border border-border/40 divide-y divide-border/30 overflow-hidden">
            {companies.slice(0, 6).map((company: string, i: number) => (
              <div key={i} className="flex items-center justify-between px-3.5 py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/15 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                  <span className="text-xs font-medium text-muted-foreground/50">{company}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-4 w-16 rounded bg-muted/35 animate-pulse" style={{ animationDelay: `${i * 100 + 50}ms` }} />
                  <div className="h-3 w-12 rounded bg-muted/25 animate-pulse" style={{ animationDelay: `${i * 100 + 80}ms` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Intentionally hidden: tool errors are suppressed in the message stream UI.
const ToolErrorDisplay = (_: { errorText: string; toolName: string }) => null;

function formatDynamicToolName(partType: string, dynamicToolName?: string) {
  const normalizedName = partType === 'dynamic-tool' ? (dynamicToolName || 'dynamic_tool') : partType.replace(/^tool-/, '');
  if (normalizedName.startsWith('mcp_')) {
    // Strip mcp_<server_slug>_ prefix, keep just the tool name
    const withoutMcp = normalizedName.replace(/^mcp_[^_]+_/, '');
    return withoutMcp.replace(/_/g, ' ');
  }
  return normalizedName.replace(/_/g, ' ');
}

function getDynamicStepState(part: any): 'loading' | 'done' | 'error' {
  if (part.state === 'output-error') return 'error';
  if (part.state === 'output-available') return 'done';
  return 'loading';
}

function getDynamicOutputText(output: any): string | null {
  if (!output) return null;
  if (typeof output === 'string') return output;
  if (typeof output?.text === 'string') return output.text;

  if (Array.isArray(output?.content)) {
    const textParts = output.content
      .map((contentPart: any) => {
        if (typeof contentPart === 'string') return contentPart;
        if (contentPart?.type === 'text' && typeof contentPart?.text === 'string') return contentPart.text;
        return null;
      })
      .filter((value: string | null): value is string => Boolean(value));

    if (textParts.length > 0) {
      return textParts.join('\n\n');
    }
  }

  return null;
}

// Pill that shows inline input params (e.g. query="…") like other tool headers
const McpInputPill = ({ input }: { input: Record<string, unknown> }) => {
  const entries = Object.entries(input).slice(0, 3);
  if (!entries.length) return null;

  function formatValue(val: unknown): string {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-1.5 mb-2">
      {entries.map(([key, val]) => (
        <span key={key} className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[10px] text-foreground max-w-[220px] truncate">
          <span className="text-muted-foreground">{key}</span>
          <span className="truncate">{formatValue(val).slice(0, 60)}</span>
        </span>
      ))}
    </div>
  );
};

const STRUCTURED_CONTENT_BLOCKLIST = new Set([
  '__scira_mcp_app',
  'SYSTEM_MESSAGE', 'system_message', 'systemMessage',
  '_meta', '__meta', '__internal',
  'requiresApproval', 'approvalToken', 'instructions',
]);

function extractStructuredContent(output: unknown): Record<string, unknown> | null {
  if (!output || typeof output !== 'object') return null;
  const obj = output as Record<string, unknown>;
  const sc = obj.structuredContent;
  if (!sc || typeof sc !== 'object' || Array.isArray(sc)) return null;
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(sc as Record<string, unknown>)) {
    if (!STRUCTURED_CONTENT_BLOCKLIST.has(k) && !k.startsWith('__')) {
      cleaned[k] = v;
    }
  }
  if (Object.keys(cleaned).length === 0) return null;
  return cleaned;
}

function isMarkdownLike(val: unknown): val is string {
  if (typeof val !== 'string' || val.length < 10) return false;
  return /[*_`#\n\[\]]/.test(val) || val.includes('\n');
}

function isTableLike(val: unknown): val is Record<string, unknown>[] {
  if (!Array.isArray(val) || val.length === 0) return false;
  return val.every((item) => item !== null && typeof item === 'object' && !Array.isArray(item));
}

const StructuredContentTable = ({ rows }: { rows: Record<string, unknown>[] }) => {
  const cols = useMemo(() => {
    const keys = new Set<string>();
    rows.slice(0, 20).forEach((row) => Object.keys(row).forEach((k) => keys.add(k)));
    return Array.from(keys).slice(0, 8);
  }, [rows]);

  return (
    <div className="overflow-x-auto rounded-md border border-border/50">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="bg-muted/40 border-b border-border/50">
            {cols.map((col) => (
              <th key={col} className="px-2.5 py-1.5 text-left font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row, i) => (
            <tr key={i} className={cn('border-b border-border/30 last:border-0', i % 2 === 0 ? '' : 'bg-muted/20')}>
              {cols.map((col) => {
                const val = row[col];
                const display = val === null || val === undefined ? '—' : typeof val === 'object' ? JSON.stringify(val) : String(val);
                return (
                  <td key={col} className="px-2.5 py-1.5 text-foreground/80 max-w-[200px] truncate">{display}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 50 && (
        <div className="px-2.5 py-1.5 text-[10px] text-muted-foreground/60 border-t border-border/30">
          Showing 50 of {rows.length} rows
        </div>
      )}
    </div>
  );
};

const StructuredContentView = ({ data }: { data: Record<string, unknown> }) => {
  const entries = Object.entries(data);

  // Single markdown string value
  if (entries.length === 1 && isMarkdownLike(entries[0][1])) {
    return (
      <div className="px-3.5 py-2.5 text-[12px] leading-relaxed text-foreground/85 prose-sm max-w-none">
        <MarkdownRenderer content={entries[0][1] as string} />
      </div>
    );
  }

  return (
    <div className="px-3.5 py-2.5 space-y-2.5">
      {entries.map(([key, val]) => {
        if (isTableLike(val)) {
          return (
            <div key={key} className="space-y-1.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide block">{key}</span>
              <StructuredContentTable rows={val as Record<string, unknown>[]} />
            </div>
          );
        }

        if (isMarkdownLike(val)) {
          return (
            <div key={key} className="space-y-0.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{key}</span>
              <div className="text-[12px] leading-relaxed text-foreground/85 pl-0.5">
                <MarkdownRenderer content={val} />
              </div>
            </div>
          );
        }

        if (Array.isArray(val)) {
          return (
            <div key={key} className="space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{key}</span>
              <div className="flex flex-wrap gap-1">
                {(val as unknown[]).slice(0, 30).map((item, i) => (
                  <span key={i} className="inline-flex items-center rounded-sm border border-border bg-muted px-1.5 py-0.5 text-[10px] text-foreground/80 max-w-[180px] truncate">
                    {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                  </span>
                ))}
                {val.length > 30 && (
                  <span className="text-[10px] text-muted-foreground/60">+{val.length - 30} more</span>
                )}
              </div>
            </div>
          );
        }

        if (typeof val === 'boolean') {
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{key}</span>
              <span className={cn(
                'text-[10px] font-medium rounded px-1.5 py-0.5 border',
                val ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : 'text-muted-foreground bg-muted/50 border-border/50'
              )}>
                {String(val)}
              </span>
            </div>
          );
        }

        if (typeof val === 'number') {
          return (
            <div key={key} className="flex items-baseline gap-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">{key}</span>
              <span className="text-[12px] font-medium text-amber-600 dark:text-amber-400 tabular-nums">{val}</span>
            </div>
          );
        }

        if (typeof val === 'object' && val !== null) {
          return (
            <div key={key} className="space-y-0.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{key}</span>
              <div className="rounded-md bg-muted/40 border border-border/40 px-2.5 py-1.5 text-[11px] text-foreground/80 font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(val, null, 2)}
              </div>
            </div>
          );
        }

        // Plain string / null / undefined
        const display = val === null || val === undefined ? '—' : String(val);
        return (
          <div key={key} className="flex gap-3 items-start">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide shrink-0 pt-px min-w-[80px]">{key}</span>
            <span className="text-[12px] text-foreground/85 break-all">{display}</span>
          </div>
        );
      })}
    </div>
  );
};

const McpOutputBlock = ({ output }: { output: unknown }) => {
  const [showRaw, setShowRaw] = useState(false);
  const structuredContent = useMemo(() => extractStructuredContent(output), [output]);

  const codeString = useMemo(
    () => (typeof output === 'string' ? output : JSON.stringify(output, null, 2)),
    [output],
  );

  if (structuredContent && !showRaw) {
    return (
      <div>
        <StructuredContentView data={structuredContent} />
        <div className="px-3.5 pb-2.5">
          <button
            type="button"
            onClick={() => setShowRaw(true)}
            className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Show raw
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3.5 py-2.5 max-h-64 overflow-y-auto">
      {structuredContent && (
        <div className="mb-1.5 flex justify-end">
          <button
            type="button"
            onClick={() => setShowRaw(false)}
            className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Show structured
          </button>
        </div>
      )}
      <SyntaxHighlighter
        language="json"
        useInlineStyles={false}
        customStyle={{
          margin: 0,
          padding: '0.625rem',
          fontSize: '11px',
          lineHeight: '1.5',
          borderRadius: '0.375rem',
          background: 'transparent',
        }}
        className="bg-muted/50! rounded-md **:text-shadow-none! [&_.token.property]:text-primary [&_.token.string]:text-emerald-600 dark:[&_.token.string]:text-emerald-400 [&_.token.number]:text-amber-600 dark:[&_.token.number]:text-amber-400 [&_.token.boolean]:text-violet-600 dark:[&_.token.boolean]:text-violet-400 [&_.token.null]:text-muted-foreground [&_.token.punctuation]:text-muted-foreground [&_.token.operator]:text-muted-foreground [&_code]:text-foreground/80 [&_pre]:whitespace-pre-wrap! [&_pre]:wrap-break-word! [&_pre]:overflow-wrap-anywhere! [&_code]:whitespace-pre-wrap! [&_code]:wrap-break-word! [&_code]:overflow-wrap-anywhere!"
        wrapLongLines
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
};

interface McpApprovalData {
  requiresApproval: true;
  approvalToken: string;
  expiresInMinutes?: number;
  preview?: Record<string, string>;
  instructions?: string;
}

function extractApprovalData(output: unknown): McpApprovalData | null {
  if (!output) return null;
  // Try structuredContent directly
  const check = (obj: any): McpApprovalData | null => {
    if (obj?.requiresApproval === true && obj?.approvalToken) return obj as McpApprovalData;
    if (obj?.structuredContent?.requiresApproval === true && obj?.structuredContent?.approvalToken) return obj.structuredContent as McpApprovalData;
    return null;
  };
  if (typeof output === 'object') return check(output);
  if (typeof output === 'string') {
    try { return check(JSON.parse(output)); } catch { return null; }
  }
  return null;
}

interface McpAppRenderData {
  kind: 'iframe-url' | 'iframe-html' | 'ui-resource';
  url?: string;
  html?: string;
  resourceUri?: string;
  serverId?: string;
  serverName?: string;
  toolName?: string;
}

const SANDBOX_ORIGIN = process.env.NEXT_PUBLIC_MCP_SANDBOX_ORIGIN || '';

// Module-level cache: serverId:resourceUri -> { html, resourceMeta }
// Survives accordion close/reopen and tab switches without re-fetching
const mcpHtmlCache = new Map<string, { html: string; resourceMeta: McpUiResourceMeta | null }>();

function getSandboxUrl(resourceUri: string): string | null {
  if (!SANDBOX_ORIGIN) return null;
  return SANDBOX_ORIGIN.replace(/\/+$/, '');
}

function getSafeToolUiResourceUri(candidate: unknown): string | undefined {
  if (!candidate || typeof candidate !== 'object') return undefined;
  try {
    return getToolUiResourceUri(candidate as { _meta?: Record<string, unknown> });
  } catch {
    return undefined;
  }
}

function logMcpAppDebug(event: string, details?: Record<string, unknown>) {
  console.debug('[mcp-app]', event, details ?? {});
}

function extractMcpAppRenderData(output: unknown): McpAppRenderData | null {
  if (!output) return null;

  const check = (obj: any): McpAppRenderData | null => {
    if (!obj || typeof obj !== 'object') return null;

    // Direct URL-style app outputs
    const directUrl = obj?.structuredContent?.appUrl
      || obj?.structuredContent?.ui?.url
      || obj?.appUrl
      || obj?.url;
    const stampedAppMeta = obj?.structuredContent?.__scira_mcp_app;
    if (
      stampedAppMeta
      && typeof stampedAppMeta === 'object'
      && typeof stampedAppMeta?.resourceUri === 'string'
      && stampedAppMeta.resourceUri.startsWith('ui://')
    ) {
      return {
        kind: 'ui-resource',
        resourceUri: stampedAppMeta.resourceUri,
        serverId: typeof stampedAppMeta.serverId === 'string' ? stampedAppMeta.serverId : undefined,
        serverName: typeof stampedAppMeta.serverName === 'string' ? stampedAppMeta.serverName : undefined,
        toolName: typeof stampedAppMeta.toolName === 'string' ? stampedAppMeta.toolName : undefined,
      };
    }

    if (typeof directUrl === 'string' && /^https?:\/\//i.test(directUrl)) {
      return { kind: 'iframe-url', url: directUrl };
    }

    // Prefer the SDK helper so we stay compatible with both current and
    // legacy tool metadata formats while still supporting our stamped fallback.
    const uiResourceUri = getSafeToolUiResourceUri(obj)
      || getSafeToolUiResourceUri({ _meta: obj?.meta })
      || obj?.resourceUri;
    if (typeof uiResourceUri === 'string' && uiResourceUri.startsWith('ui://')) {
      return { kind: 'ui-resource', resourceUri: uiResourceUri };
    }

    // Content array variants
    if (Array.isArray(obj?.content)) {
      for (const item of obj.content) {
        if (!item || typeof item !== 'object') continue;
        const candidateUri = item?.uri || item?.resource?.uri;
        if (typeof candidateUri === 'string') {
          if (/^https?:\/\//i.test(candidateUri)) return { kind: 'iframe-url', url: candidateUri };
          if (candidateUri.startsWith('ui://')) return { kind: 'ui-resource', resourceUri: candidateUri };
        }
        const mime = item?.mimeType || item?.resource?.mimeType;
        const html = item?.text || item?.resource?.text;
        if (typeof html === 'string' && typeof mime === 'string' && mime.includes('text/html')) {
          return { kind: 'iframe-html', html };
        }
      }
    }

    return null;
  };

  if (typeof output === 'object') return check(output);
  if (typeof output === 'string') {
    try { return check(JSON.parse(output)); } catch { return null; }
  }
  return null;
}

function normalizeMcpAppToolResult(output: unknown): { content: Array<Record<string, unknown>>; [key: string]: unknown } | null {
  if (output === null || output === undefined) return null;

  if (typeof output === 'string') {
    return { content: [{ type: 'text', text: output }] };
  }

  if (typeof output !== 'object') {
    return { content: [{ type: 'text', text: String(output) }] };
  }

  const record = output as Record<string, unknown>;
  if (record.toolResult && typeof record.toolResult === 'object') {
    const toolResult = record.toolResult as Record<string, unknown>;
    if (Array.isArray(toolResult.content)) {
      return toolResult as { content: Array<Record<string, unknown>>; [key: string]: unknown };
    }
    return {
      ...toolResult,
      content: [],
    };
  }

  if (
    Array.isArray(record.content)
    || 'structuredContent' in record
    || 'isError' in record
    || '_meta' in record
  ) {
    if (Array.isArray(record.content)) return record as { content: Array<Record<string, unknown>>; [key: string]: unknown };
    return {
      ...record,
      content: [],
    };
  }

  try {
    return {
      structuredContent: record,
      content: [{ type: 'text', text: JSON.stringify(record, null, 2) }],
    };
  } catch {
    return {
      content: [{ type: 'text', text: String(record) }],
    };
  }
}

function McpAppOutputBlock({
  app,
  toolInput,
  toolOutput,
  sendMessage,
}: {
  app: McpAppRenderData;
  toolInput?: Record<string, unknown>;
  toolOutput?: unknown;
  sendMessage?: UseChatHelpers<ChatMessage>['sendMessage'];
}) {
  const { resolvedTheme } = useTheme();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const bridgeRef = useRef<AppBridge | null>(null);
  const sentInputRef = useRef<string | null>(null);
  const sentResultRef = useRef<string | null>(null);
  // Stable refs for callbacks and data — prevents bridge from rebuilding on every render
  const sendMessageRef = useRef(sendMessage);
  const closeFullscreenRef = useRef<() => void>(() => {});
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);
  const [resolvedHtml, setResolvedHtml] = useState<string | null>(app.kind === 'iframe-html' ? app.html ?? null : null);
  const [resourceMeta, setResourceMeta] = useState<McpUiResourceMeta | null>(null);
  // resourceMeta ref — read at call time in bridge so it doesn't re-trigger the bridge effect
  const resourceMetaRef = useRef<McpUiResourceMeta | null>(null);
  useEffect(() => { resourceMetaRef.current = resourceMeta; }, [resourceMeta]);
  const [isBridgeReady, setIsBridgeReady] = useState(false);
  const [iframeHeight, setIframeHeight] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(app.kind === 'ui-resource');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isClosingFullscreen, setIsClosingFullscreen] = useState(false);
  const buildHostContextRef = useRef<() => McpUiHostContext>(() => ({
    displayMode: 'inline',
  }));

  const closeFullscreen = useCallback(() => {
    setIsClosingFullscreen(true);
    setTimeout(() => {
      setIsFullscreen(false);
      setIsClosingFullscreen(false);
    }, 180);
  }, []);

  useEffect(() => { closeFullscreenRef.current = closeFullscreen; }, [closeFullscreen]);
  const sandboxUrl = useMemo(() => app.kind === 'ui-resource' && app.resourceUri ? getSandboxUrl(app.resourceUri) : null, [app.kind, app.resourceUri]);
  const useSandbox = !!sandboxUrl;
  const buildHostContext = useCallback((): McpUiHostContext => {
    const inlineHeight = iframeHeight ? Math.max(320, iframeHeight - 2) : 420;
    const inlineWidth = iframeRef.current?.clientWidth;

    return {
      theme: resolvedTheme === 'dark' ? 'dark' : 'light',
      displayMode: isFullscreen ? 'fullscreen' : 'inline',
      availableDisplayModes: ['inline', 'fullscreen'],
      platform: 'web',
      locale: navigator.language,
      userAgent: 'scira-web',
      containerDimensions: isFullscreen
        ? { width: window.innerWidth, height: window.innerHeight }
        : typeof inlineWidth === 'number' && inlineWidth > 0
          ? { width: inlineWidth, height: inlineHeight }
          : undefined,
      toolInfo: app.toolName
        ? {
          tool: {
            name: app.toolName,
            title: app.toolName,
            inputSchema: { type: 'object', additionalProperties: true },
          } as NonNullable<McpUiHostContext['toolInfo']>['tool'],
        }
        : undefined,
    };
  }, [app.toolName, iframeHeight, isFullscreen, resolvedTheme]);
  useEffect(() => { buildHostContextRef.current = buildHostContext; }, [buildHostContext]);

  const proxyBridgeRequest = useCallback(async (method: string, params: Record<string, unknown> = {}) => {
    if (!app.serverId) throw new Error('Missing MCP server metadata for app bridge');
    const response = await fetch('/api/mcp/apps/bridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serverId: app.serverId,
        method,
        params,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.cause || payload?.message || `Bridge request failed: ${method}`);
    }
    return payload?.result;
  }, [app.serverId]);

  useEffect(() => {
    if (app.kind === 'iframe-html') {
      logMcpAppDebug('using-inline-html-app', {
        toolName: app.toolName,
      });
      setResolvedHtml(app.html ?? null);
      setResourceMeta(null);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    if (app.kind !== 'ui-resource' || !app.resourceUri || !app.serverId) return;

    // Check module-level cache first — avoids re-fetching on accordion reopen
    const cacheKey = `${app.serverId}:${app.resourceUri}`;
    const cached = mcpHtmlCache.get(cacheKey);
    if (cached) {
      logMcpAppDebug('resource-cache-hit', {
        serverId: app.serverId,
        resourceUri: app.resourceUri,
      });
      setResolvedHtml(cached.html);
      setResourceMeta(cached.resourceMeta);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    setResolvedHtml(null);
    setResourceMeta(null);

    void (async () => {
      try {
        logMcpAppDebug('resource-read-start', {
          serverId: app.serverId,
          resourceUri: app.resourceUri,
        });
        const response = await fetch('/api/mcp/apps/resource/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serverId: app.serverId,
            resourceUri: app.resourceUri,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.cause || payload?.message || 'Failed to load MCP app resource');
        }
        if (cancelled) return;
        const html = typeof payload?.html === 'string' ? payload.html : null;
        const meta = (payload?.resourceMeta ?? null) as McpUiResourceMeta | null;
        logMcpAppDebug('resource-read-success', {
          serverId: app.serverId,
          resourceUri: app.resourceUri,
          htmlLength: html?.length ?? 0,
          useSandbox: !!sandboxUrl,
          sandboxUrl,
          hasCsp: !!meta?.csp,
          hasPermissions: !!meta?.permissions,
        });
        if (html) mcpHtmlCache.set(cacheKey, { html, resourceMeta: meta });
        setResolvedHtml(html);
        setResourceMeta(meta);
      } catch (error) {
        if (!cancelled) {
          logMcpAppDebug('resource-read-error', {
            serverId: app.serverId,
            resourceUri: app.resourceUri,
            error: error instanceof Error ? error.message : String(error),
          });
          setLoadError(error instanceof Error ? error.message : 'Failed to load MCP app resource');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [app.kind, app.resourceUri, app.serverId, app.html]);

  useEffect(() => {
    if (app.kind !== 'ui-resource' || !app.serverId) return;
    // Sandbox mode: wait for iframe to load the proxy page (no resolvedHtml needed)
    // srcDoc mode: need resolvedHtml
    if (!useSandbox && !resolvedHtml) return;
    const iframe = iframeRef.current;
    const targetWindow = iframe?.contentWindow;
    if (!iframe || !targetWindow) return;

    let cancelled = false;
    logMcpAppDebug('bridge-effect-start', {
      toolName: app.toolName,
      serverId: app.serverId,
      resourceUri: app.resourceUri,
      useSandbox,
      sandboxUrl,
      hasResolvedHtml: !!resolvedHtml,
    });
    setIsBridgeReady(false);
    sentInputRef.current = null;
    sentResultRef.current = null;

    const bridge = new AppBridge(
      null,
      { name: 'Scira', version: '1.0.0' },
      {
        openLinks: {},
        downloadFile: {},
        serverTools: {},
        serverResources: {},
        updateModelContext: { text: {}, structuredContent: {} },
        message: { text: {}, structuredContent: {} },
        logging: {},
        ...(resourceMetaRef.current
          ? {
            sandbox: {
              csp: resourceMetaRef.current.csp,
              permissions: resourceMetaRef.current.permissions,
            },
          }
          : {}),
      },
      {
        hostContext: buildHostContextRef.current(),
      },
    );

    bridge.oninitialized = () => {
      logMcpAppDebug('bridge-initialized', {
        toolName: app.toolName,
        useSandbox,
      });
      if (!cancelled) setIsBridgeReady(true);
    };

    bridge.onsizechange = ({ width: _w, height }) => {
      logMcpAppDebug('bridge-size-change', {
        toolName: app.toolName,
        height,
        isFullscreen,
      });
      if (cancelled || !Number.isFinite(height) || !height) return;
      // Ignore size updates while fullscreen — the app reports viewport height
      // which would corrupt the inline height on close
      setIframeHeight((prev) => {
        if (isFullscreen) return prev;
        return Math.max(450, Number(height));
      });
    };

    bridge.onopenlink = async ({ url }) => {
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
        return {};
      } catch {
        return { isError: true };
      }
    };

    bridge.onmessage = async ({ role, content }) => {
      const sm = sendMessageRef.current;
      if (role !== 'user' || !sm || !Array.isArray(content)) return {};
      const text = content
        .filter((part) => part && typeof part === 'object' && (part as any).type === 'text' && typeof (part as any).text === 'string')
        .map((part) => (part as any).text as string)
        .join('\n')
        .trim();
      if (!text) return {};
      sm({ text });
      return {};
    };

    bridge.ondownloadfile = async ({ contents }) => {
      try {
        const item = contents?.[0] as any;
        if (!item) return { isError: true };

        const resource = item?.resource ?? item;
        const filename = typeof resource?.name === 'string' ? resource.name : 'mcp-app-download';
        const mimeType = typeof resource?.mimeType === 'string' ? resource.mimeType : 'application/octet-stream';
        const hrefData = typeof resource?.text === 'string'
          ? `data:${mimeType};charset=utf-8,${encodeURIComponent(resource.text)}`
          : typeof resource?.blob === 'string'
            ? `data:${mimeType};base64,${resource.blob}`
            : null;

        if (!hrefData) return { isError: true };
        const anchor = document.createElement('a');
        anchor.href = hrefData;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        return {};
      } catch {
        return { isError: true };
      }
    };

    bridge.onupdatemodelcontext = async () => ({});
    bridge.onrequestdisplaymode = async ({ mode }) => {
      if (mode === 'fullscreen') setIsFullscreen(true);
      else if (mode === 'inline') closeFullscreenRef.current();
      return { mode: mode ?? 'inline' };
    };
    bridge.oncalltool = async (params) => proxyBridgeRequest('tools/call', params as Record<string, unknown>);
    bridge.onlistresources = async (params) => proxyBridgeRequest('resources/list', params as Record<string, unknown>);
    bridge.onreadresource = async (params) => proxyBridgeRequest('resources/read', params as Record<string, unknown>);
    bridge.onlistresourcetemplates = async (params) => proxyBridgeRequest('resources/templates/list', params as Record<string, unknown>);
    bridge.onlistprompts = async (params) => proxyBridgeRequest('prompts/list', params as Record<string, unknown>);

    bridgeRef.current = bridge;

    if (useSandbox) {
      // Sandbox proxy mode: wait for proxy-ready, send HTML, then connect bridge
      bridge.onsandboxready = () => {
        logMcpAppDebug('sandbox-proxy-ready', {
          toolName: app.toolName,
          sandboxUrl,
          hasResolvedHtml: !!resolvedHtml,
        });
        if (cancelled || !resolvedHtml) return;
        logMcpAppDebug('sandbox-resource-ready-send', {
          toolName: app.toolName,
          sandboxUrl,
          htmlLength: resolvedHtml.length,
          hasCsp: !!resourceMetaRef.current?.csp,
          hasPermissions: !!resourceMetaRef.current?.permissions,
        });
        void bridge.sendSandboxResourceReady({
          html: resolvedHtml,
          sandbox: 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads',
          csp: resourceMetaRef.current?.csp,
          permissions: resourceMetaRef.current?.permissions,
        }).then(() => {
          logMcpAppDebug('sandbox-resource-ready-sent', {
            toolName: app.toolName,
            sandboxUrl,
          });
        }).catch((error) => {
          logMcpAppDebug('sandbox-resource-ready-error', {
            toolName: app.toolName,
            sandboxUrl,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      };

      void (async () => {
        try {
          logMcpAppDebug('bridge-connect-start', {
            toolName: app.toolName,
            mode: 'sandbox',
            sandboxUrl,
          });
          const transport = new PostMessageTransport(targetWindow, targetWindow);
          await bridge.connect(transport);
          logMcpAppDebug('bridge-connect-success', {
            toolName: app.toolName,
            mode: 'sandbox',
            sandboxUrl,
          });
        } catch (error) {
          if (!cancelled) {
            logMcpAppDebug('bridge-connect-error', {
              toolName: app.toolName,
              mode: 'sandbox',
              sandboxUrl,
              error: error instanceof Error ? error.message : String(error),
            });
            setLoadError(error instanceof Error ? error.message : 'Failed to initialize MCP App bridge');
          }
        }
      })();
    } else {
      // srcDoc fallback: connect directly
      void (async () => {
        try {
          logMcpAppDebug('bridge-connect-start', {
            toolName: app.toolName,
            mode: 'srcdoc',
          });
          const transport = new PostMessageTransport(targetWindow, targetWindow);
          await bridge.connect(transport);
          logMcpAppDebug('bridge-connect-success', {
            toolName: app.toolName,
            mode: 'srcdoc',
          });
        } catch (error) {
          if (!cancelled) {
            logMcpAppDebug('bridge-connect-error', {
              toolName: app.toolName,
              mode: 'srcdoc',
              error: error instanceof Error ? error.message : String(error),
            });
            setLoadError(error instanceof Error ? error.message : 'Failed to initialize MCP App bridge');
          }
        }
      })();
    }

    return () => {
      cancelled = true;
      logMcpAppDebug('bridge-effect-cleanup', {
        toolName: app.toolName,
        useSandbox,
      });
      setIsBridgeReady(false);
      const currentBridge = bridgeRef.current;
      bridgeRef.current = null;
      if (currentBridge) {
        void currentBridge.teardownResource({}).catch(() => {});
        void (currentBridge as any).close?.();
      }
    };
  }, [app.kind, app.serverId, resolvedHtml, useSandbox, proxyBridgeRequest]);

  // Keep the app in sync when the host theme or display mode changes
  useEffect(() => {
    if (!isBridgeReady || !bridgeRef.current) return;
    const syncHostContext = () => bridgeRef.current?.setHostContext(buildHostContext());
    syncHostContext();
    window.addEventListener('resize', syncHostContext);
    return () => window.removeEventListener('resize', syncHostContext);
  }, [buildHostContext, isBridgeReady]);

  useEffect(() => {
    if (!isBridgeReady || !bridgeRef.current) return;
    const serializedInput = JSON.stringify(toolInput ?? {});
    if (sentInputRef.current === serializedInput) return;
    sentInputRef.current = serializedInput;
    void bridgeRef.current.sendToolInput({
      arguments: (toolInput ?? {}) as Record<string, unknown>,
    }).catch(() => {});
  }, [isBridgeReady, toolInput]);

  useEffect(() => {
    if (!isBridgeReady || !bridgeRef.current) return;
    const resultPayload = normalizeMcpAppToolResult(toolOutput);
    if (!resultPayload) return;

    const serializedResult = JSON.stringify(resultPayload);
    if (sentResultRef.current === serializedResult) return;
    sentResultRef.current = serializedResult;

    void bridgeRef.current.sendToolResult(resultPayload as any).catch(() => {});
  }, [isBridgeReady, toolOutput]);

  if (isLoading) {
    return (
      <div className="px-3.5 py-2.5">
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3 text-[11px] text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-3 animate-spin" />
          Loading app UI…
        </div>
      </div>
    );
  }

  if (resolvedHtml || (useSandbox && sandboxUrl)) {
    const permissionAllow = buildAllowAttribute(resourceMeta?.permissions);
    const resolvedHeight = iframeHeight ? iframeHeight - 2 : 420;

    const iframeProps: Record<string, unknown> = useSandbox && sandboxUrl
      ? { src: sandboxUrl }
      : { srcDoc: resolvedHtml! };

    if (!useSandbox) {
      iframeProps.sandbox = 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads';
    }

    return (
      <div className={cn(
        'bg-background relative group',
        isFullscreen
          ? isClosingFullscreen
            ? 'fixed inset-0 z-50 flex flex-col overflow-hidden animate-out fade-out zoom-out-95 duration-180'
            : 'fixed inset-0 z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200'
          : 'w-full overflow-hidden',
      )}>
        {/* Fullscreen close button */}
        {isFullscreen && (
          <button
            type="button"
            onClick={closeFullscreen}
            className="absolute top-4 right-4 z-30 flex items-center gap-2 px-3 py-2 rounded-full bg-foreground text-background text-xs font-medium shadow-lg hover:opacity-90 transition-opacity animate-in fade-in slide-in-from-top-2 duration-300 delay-100"
            title="Exit fullscreen"
          >
            <X className="size-3.5" />
            Close
          </button>
        )}

        <iframe
          ref={iframeRef}
          title={app.toolName ? `${app.toolName} app` : 'MCP App'}
          allow={permissionAllow || undefined}
          onLoad={() => {
            logMcpAppDebug('iframe-load', {
              toolName: app.toolName,
              useSandbox,
              sandboxUrl,
            });
          }}
          className="block w-full border-0"
          style={isFullscreen
            ? { height: '100%', flex: '1 1 0%', minHeight: 0 }
            : { height: `${resolvedHeight}px`, transition: 'height 150ms' }
          }
          {...iframeProps}
        />

        {/* Expand button — inline only */}
        {!isFullscreen && (
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-background/80 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-background opacity-0 group-hover:opacity-100 transition-all shadow-sm"
            title="Open fullscreen"
          >
            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  if (app.kind === 'iframe-url' && app.url) {
    return (
      <div className="px-3.5 py-2.5 space-y-2">
        <div className="rounded-lg border border-border/60 overflow-hidden bg-background">
          <iframe
            title="MCP App"
            src={app.url}
            sandbox="allow-scripts allow-forms allow-popups allow-same-origin allow-downloads"
            referrerPolicy="no-referrer"
            className="w-full h-[420px] border-0"
          />
        </div>
        <a
          href={app.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Open app in new tab
          <ArrowRightIcon className="size-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="px-3.5 py-2.5">
      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-[11px] text-muted-foreground space-y-1.5">
        <p className="text-foreground/90 font-medium">MCP App detected</p>
        {loadError
          ? <p>Failed to load MCP App resource: {loadError}</p>
          : <p>Server returned a UI resource reference. Missing server metadata prevented loading.</p>}
        {app.serverName && <p className="text-[10px] text-muted-foreground/80">Server: {app.serverName}</p>}
        {app.resourceUri && <code className="block text-[10px] text-muted-foreground/80 break-all">{app.resourceUri}</code>}
      </div>
    </div>
  );
}

const McpApprovalCard = ({
  approval,
  toolLabel,
  sendMessage,
  onStatusChange,
}: {
  approval: McpApprovalData;
  toolLabel: string;
  sendMessage?: UseChatHelpers<ChatMessage>['sendMessage'];
  onStatusChange?: (status: 'confirmed' | 'cancelled') => void;
}) => {
  const [sent, setSent] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const previewEntries = approval.preview ? Object.entries(approval.preview) : [];

  const handleConfirm = () => {
    if (!sendMessage || sent || cancelled) return;
    setSent(true);
    onStatusChange?.('confirmed');
    sendMessage({ text: `Approved. Please proceed — approvalToken: ${approval.approvalToken}` });
  };

  const handleCancel = () => {
    if (!sendMessage || sent || cancelled) return;
    setCancelled(true);
    onStatusChange?.('cancelled');
    sendMessage({ text: 'Cancel — do not proceed with this action.' });
  };

  const isDone = sent || cancelled;

  return (
    <div className="px-3.5 py-3 space-y-3">
      {/* Preview fields */}
      {previewEntries.length > 0 && (
        <div className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-amber-500" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Preview</span>
          </div>
          <div className="divide-y divide-border/30">
            {previewEntries.map(([key, val]) => (
              <div key={key} className="px-3 py-1.5 flex gap-3 items-start">
                <span className="text-[11px] text-muted-foreground/60 capitalize w-20 shrink-0 pt-px">{key}</span>
                <span className="text-[11px] text-foreground/80 break-all">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expiry */}
      {approval.expiresInMinutes && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
          <Clock className="size-3" />
          Expires in {approval.expiresInMinutes} min
        </div>
      )}

      {/* Action buttons */}
      {isDone ? (
        <div className={cn(
          'rounded-lg px-3 py-2 text-[11px] font-medium',
          sent ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-muted/50 border border-border/50 text-muted-foreground'
        )}>
          {sent ? '✓ Confirmed — action sent' : '✕ Cancelled'}
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-foreground text-background text-[12px] font-medium px-3 py-2 hover:opacity-90 transition-opacity"
          >
            <Check className="size-3.5" />
            Confirm & Send
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-muted/30 text-muted-foreground text-[12px] font-medium px-3 py-2 hover:bg-muted/60 transition-colors"
          >
            <X className="size-3.5" />
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

const DynamicToolInvocationCard = ({
  part,
  compact = false,
  sendMessage,
}: {
  part: any;
  compact?: boolean;
  sendMessage?: UseChatHelpers<ChatMessage>['sendMessage'];
}) => {
  const toolLabel = formatDynamicToolName(part.type, part.toolName);
  const hasRawOutput = 'output' in part && part.output !== undefined;
  const isStreaming = part.state === 'input-streaming' || part.state === 'input-available';
  const isError = part.state === 'output-error';
  const approval = hasRawOutput ? extractApprovalData(part.output) : null;
  const appOutput = hasRawOutput ? extractMcpAppRenderData(part.output) : null;
  const [isExpanded, setIsExpanded] = useState(!!approval || !!appOutput);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'confirmed' | 'cancelled'>('pending');

  if (isStreaming) {
    return (
      <div className={cn('rounded-xl border border-border/60 overflow-hidden bg-card/30', compact ? 'mt-1' : 'w-full my-3')}>
        <div className="px-4 py-2.5 flex items-center gap-2">
          <AppsIcon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0 animate-pulse" />
          <span className="font-pixel text-[10px] text-muted-foreground/70 uppercase tracking-wider truncate">{toolLabel}</span>
          <Spinner className="h-3 w-3 text-muted-foreground/40 shrink-0 ml-auto" />
        </div>
        {part.input && Object.keys(part.input).length > 0 && (
          <div className="px-4 pb-4">
            <McpInputPill input={part.input} />
          </div>
        )}
      </div>
    );
  }

  if (isError) {
    return (
      <ToolErrorDisplay
        errorText={part.errorText || 'Dynamic tool execution failed'}
        toolName={toolLabel}
      />
    );
  }

  return (
    <div className={cn('rounded-xl border border-border/60 overflow-hidden bg-card/30', compact ? 'mt-1' : 'w-full my-3')}>
      {/* Header row */}
      <button
        type="button"
        onClick={() => setIsExpanded((p) => !p)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <AppsIcon className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
          <span className="font-pixel text-[10px] text-muted-foreground/80 uppercase tracking-wider truncate">
            {toolLabel}
          </span>
          {approval && (
            <span className={cn(
              'text-[10px] font-medium rounded px-1.5 py-0.5 shrink-0 border transition-colors duration-300',
              approvalStatus === 'confirmed'
                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : approvalStatus === 'cancelled'
                  ? 'text-muted-foreground bg-muted/50 border-border/50'
                  : 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20'
            )}>
              {approvalStatus === 'confirmed' ? '✓ Confirmed' : approvalStatus === 'cancelled' ? '✕ Cancelled' : 'Awaiting approval'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <svg
            className={cn('h-3 w-3 text-muted-foreground/60 transition-transform duration-200', isExpanded && 'rotate-180')}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border/40 overflow-hidden">
          {appOutput ? (
            <McpAppOutputBlock app={appOutput} toolInput={part.input} toolOutput={part.output} sendMessage={sendMessage} />
          ) : (
            <>
              {/* Input pills */}
              {part.input && Object.keys(part.input).length > 0 && (
                <div className="px-3.5 py-2 border-b border-border/30">
                  <McpInputPill input={part.input} />
                </div>
              )}
              {/* Approval card or raw output */}
              {hasRawOutput && (
                approval
                  ? <McpApprovalCard approval={approval} toolLabel={toolLabel} sendMessage={sendMessage} onStatusChange={setApprovalStatus} />
                  : <McpOutputBlock output={part.output} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

type McpTimelineEntry =
  | { kind: 'tool'; part: any; originalIndex: number; id: string }
  | { kind: 'reasoning'; text: string; state?: ReasoningUIPart['state']; id: string }
  | { kind: 'text'; text: string; id: string };

interface InlineElicitationData {
  elicitationId: string;
  serverName: string;
  message: string;
  mode: 'form' | 'url';
  requestedSchema?: unknown;
  url?: string;
}

interface InlineSchemaProperty {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  oneOf?: Array<{ const: string; title: string }>;
  format?: string;
}

interface InlineRequestedSchema {
  type?: string;
  properties?: Record<string, InlineSchemaProperty>;
  required?: string[];
}

function parseInlineSchema(raw: unknown): InlineRequestedSchema {
  if (!raw || typeof raw !== 'object') return {};
  return raw as InlineRequestedSchema;
}

function getInlineDefaultValue(prop: InlineSchemaProperty): unknown {
  if (prop.default !== undefined) return prop.default;
  if (prop.type === 'boolean') return false;
  if (prop.type === 'number' || prop.type === 'integer') return undefined;
  return '';
}

function buildInlineElicitationContent(
  values: Record<string, unknown>,
  properties: Record<string, InlineSchemaProperty>,
) {
  const content: Record<string, unknown> = {};

  for (const [name, prop] of Object.entries(properties)) {
    const raw = values[name];
    if (raw === undefined || raw === null || raw === '') continue;

    if (prop.type === 'boolean') {
      content[name] = Boolean(raw);
      continue;
    }
    if (prop.type === 'number' || prop.type === 'integer') {
      const numeric = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(numeric)) continue;
      content[name] = prop.type === 'integer' ? Math.trunc(numeric) : numeric;
      continue;
    }
    content[name] = String(raw);
  }

  return content;
}

function getPendingInlineElicitations(
  dataStream: DataUIPart<CustomUIDataTypes>[],
  ignoredIds: Set<string>,
): InlineElicitationData[] {
  const doneIds = new Set<string>();
  const seenIds = new Set<string>();
  const pending: InlineElicitationData[] = [];

  // First pass: collect all done IDs
  for (const part of dataStream) {
    if (part?.type === 'data-mcp_elicitation_done') {
      const doneId = part.data?.elicitationId;
      if (doneId) doneIds.add(doneId);
    }
  }

  // Second pass: collect unique pending elicitations in order
  for (const part of dataStream) {
    if (part?.type !== 'data-mcp_elicitation') continue;
    const elicitation = part.data as InlineElicitationData;
    if (!elicitation?.elicitationId) continue;
    if (ignoredIds.has(elicitation.elicitationId)) continue;
    if (doneIds.has(elicitation.elicitationId)) continue;
    if (seenIds.has(elicitation.elicitationId)) continue;
    seenIds.add(elicitation.elicitationId);
    pending.push(elicitation);
  }

  return pending;
}

function McpInlineElicitationCard({
  elicitation,
  onResolved,
}: {
  elicitation: InlineElicitationData;
  onResolved: (elicitationId: string) => void;
}) {
  const [submitting, setSubmitting] = useState<'accept' | 'decline' | 'cancel' | null>(null);
  const schema = useMemo(() => parseInlineSchema(elicitation.requestedSchema), [elicitation.requestedSchema]);
  const properties = schema.properties ?? {};
  const requiredFields = schema.required ?? [];
  const hasFields = elicitation.mode === 'form' && Object.keys(properties).length > 0;
  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const nextValues = Object.fromEntries(
      Object.entries(properties).map(([k, p]) => [k, getInlineDefaultValue(p)]),
    );
    setValues(nextValues);
  }, [elicitation.elicitationId, properties]);

  const respond = async (action: 'accept' | 'decline' | 'cancel') => {
    if (submitting) return;
    setSubmitting(action);
    try {
      if (action === 'accept' && elicitation.mode === 'url' && elicitation.url) {
        window.open(elicitation.url, '_blank', 'noopener,noreferrer');
      }
      const content = action === 'accept' && elicitation.mode === 'form'
        ? buildInlineElicitationContent(values, properties)
        : undefined;
      const response = await fetch('/api/mcp/elicitation/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elicitationId: elicitation.elicitationId,
          action,
          content,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = payload?.error || payload?.message || 'Could not submit approval response.';
        // Server-side resolver already gone (timed out / already handled). Remove stale inline card.
        if (response.status === 404 && /not found|already resolved/i.test(String(message))) {
          onResolved(elicitation.elicitationId);
          return;
        }
        throw new Error(message);
      }
      onResolved(elicitation.elicitationId);
    } catch (error) {
      sileo.error({
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'Could not submit approval response.',
      });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-2.5 pt-0.5">
      <p className="text-[12px] text-foreground/80 leading-relaxed text-pretty">{elicitation.message}</p>

      {hasFields && (
        <div className="space-y-2.5">
          {Object.entries(properties).map(([name, prop]) => {
            const label = prop.title || name;
            const value = values[name];
            const isEnum = Array.isArray(prop.enum) && prop.enum.length > 0;
            const isOneOf = Array.isArray(prop.oneOf) && prop.oneOf.length > 0;

            if (prop.type === 'boolean') {
              return (
                <div key={name} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-foreground/90 leading-snug">
                      {label}
                      {requiredFields.includes(name) ? <span className="text-destructive ml-1">*</span> : null}
                    </p>
                    {prop.description ? <p className="text-[11px] text-muted-foreground text-pretty mt-0.5">{prop.description}</p> : null}
                  </div>
                  <Switch
                    checked={Boolean(value ?? false)}
                    onCheckedChange={(checked) => setValues((prev) => ({ ...prev, [name]: checked }))}
                  />
                </div>
              );
            }

            if (isEnum || isOneOf) {
              const options = isEnum
                ? prop.enum!.map((opt) => ({ value: opt, label: opt }))
                : prop.oneOf!.map((opt) => ({ value: opt.const, label: opt.title }));
              return (
                <div key={name} className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">
                    {label}
                    {requiredFields.includes(name) ? <span className="text-destructive ml-1">*</span> : null}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {options.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setValues((prev) => ({ ...prev, [name]: opt.value }))}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-[11px] border transition-colors',
                          value === opt.value
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-background/60 text-muted-foreground border-border/60 hover:border-foreground/30',
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            const inputType = prop.type === 'number' || prop.type === 'integer'
              ? 'number'
              : prop.format === 'email' ? 'email'
              : prop.format === 'uri' ? 'url'
              : 'text';

            return (
              <div key={name} className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground">
                  {label}
                  {requiredFields.includes(name) ? <span className="text-destructive ml-1">*</span> : null}
                </p>
                {prop.description ? <p className="text-[11px] text-muted-foreground/60 text-pretty">{prop.description}</p> : null}
                <Input
                  type={inputType}
                  className="h-7 text-[12px] bg-background/60"
                  value={String(value ?? '')}
                  onChange={(e) => setValues((prev) => ({ ...prev, [name]: e.target.value }))}
                />
              </div>
            );
          })}
        </div>
      )}

      {elicitation.mode === 'url' && elicitation.url && (
        <p className="text-[11px] text-muted-foreground/70 break-all font-mono">{elicitation.url}</p>
      )}

      <div className="flex items-center gap-1.5 pt-0.5">
        <Button size="sm" className="h-7 px-3 text-[11px] rounded-lg" disabled={Boolean(submitting)} onClick={() => respond('accept')}>
          {submitting === 'accept' ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
          {elicitation.mode === 'url' ? 'Open' : hasFields ? 'Submit' : 'Approve'}
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-3 text-[11px] rounded-lg" disabled={Boolean(submitting)} onClick={() => respond('decline')}>
          {submitting === 'decline' ? <Loader2 className="size-3 animate-spin" /> : null}
          Decline
        </Button>
        <button
          type="button"
          disabled={Boolean(submitting)}
          onClick={() => respond('cancel')}
          className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors disabled:opacity-40 px-1"
        >
          {submitting === 'cancel' ? <Loader2 className="size-3 animate-spin inline mr-1" /> : null}
          Cancel
        </button>
      </div>
    </div>
  );
}

const DynamicToolStepper = ({
  entries,
  messageIndex,
  startIndex,
  sendMessage,
  inlineElicitations,
  onInlineElicitationResolved,
}: {
  entries: McpTimelineEntry[];
  sendMessage?: UseChatHelpers<ChatMessage>['sendMessage'];
  messageIndex: number;
  startIndex: number;
  inlineElicitations?: InlineElicitationData[];
  onInlineElicitationResolved?: (elicitationId: string) => void;
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const runningEntryEndRef = useRef<HTMLDivElement>(null);
  const prevEntryCountRef = useRef(entries.length);
  const userScrolledUpRef = useRef(false);
  const lastTouchYRef = useRef<number | null>(null);
  const previousScrollTopRef = useRef(0);
  const [accordionValue, setAccordionValue] = useState<string>('steps');
  const scrollStepperToTarget = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = scrollContainerRef.current;
    const target = runningEntryEndRef.current ?? bottomRef.current;
    if (!container || !target) return;

    // Keep scrolling confined to the stepper container (never page-level).
    const nextTop = Math.max(0, target.offsetTop - container.clientHeight + target.offsetHeight);
    container.scrollTo({ top: nextTop, behavior });
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const RESUME_AUTOSCROLL_THRESHOLD = 24;
    const notifyRootScrollInteraction = (userScrolledUp = false) => {
      window.dispatchEvent(
        new CustomEvent('scira:nested-scroll-active', {
          detail: { active: true, userScrolledUp },
        }),
      );
    };

    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      const scrolledUp = container.scrollTop < previousScrollTopRef.current - 1;
      previousScrollTopRef.current = container.scrollTop;

      if (scrolledUp && distanceFromBottom > RESUME_AUTOSCROLL_THRESHOLD) {
        userScrolledUpRef.current = true;
      }

      // Keep autoscroll paused once user scrolls up, and only resume near bottom.
      if (distanceFromBottom <= RESUME_AUTOSCROLL_THRESHOLD) {
        userScrolledUpRef.current = false;
      }
    };

    const handleWheel = (event: WheelEvent) => {
      notifyRootScrollInteraction(event.deltaY < 0);
      if (event.deltaY < 0) {
        userScrolledUpRef.current = true;
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      notifyRootScrollInteraction();
      lastTouchYRef.current = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY;
      if (y == null || lastTouchYRef.current == null) return;
      const isUserScrollingUp = y > lastTouchYRef.current + 3;
      notifyRootScrollInteraction(isUserScrollingUp);
      if (isUserScrollingUp) {
        userScrolledUpRef.current = true;
      }
      lastTouchYRef.current = y;
    };

    const handleTouchEnd = () => {
      lastTouchYRef.current = null;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    previousScrollTopRef.current = container.scrollTop;

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    if (entries.length !== prevEntryCountRef.current) {
      prevEntryCountRef.current = entries.length;
      if (!userScrolledUpRef.current) {
        scrollStepperToTarget('smooth');
      }
    }
  }, [entries.length, scrollStepperToTarget]);

  const lastLoadingEntryIndex = useMemo(() => {
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const entry = entries[index];
      if (
        (entry.kind === 'tool' &&
          (entry.part.state === 'input-streaming' || entry.part.state === 'input-available')) ||
        (entry.kind === 'reasoning' && entry.state === 'streaming')
      ) {
        return index;
      }
    }

    return -1;
  }, [entries]);

  useEffect(() => {
    if (userScrolledUpRef.current) return;
    scrollStepperToTarget('smooth');
  }, [entries, lastLoadingEntryIndex, scrollStepperToTarget]);

  const toolEntries = entries.filter((entry): entry is Extract<McpTimelineEntry, { kind: 'tool' }> => entry.kind === 'tool');
  const isAnyLoading = entries.some(
    (entry) =>
      (entry.kind === 'tool' &&
        (entry.part.state === 'input-streaming' || entry.part.state === 'input-available')) ||
      (entry.kind === 'reasoning' && entry.state === 'streaming'),
  );
  const doneCount = toolEntries.filter((entry) => entry.part.state === 'output-available' || entry.part.state === 'output-error').length;
  const hasErrors = toolEntries.some((entry) => entry.part.state === 'output-error');

  // Collect ALL completed tool entries that have an app UI — shown stacked in the App tab
  const appEntries = useMemo(() => {
    const result: Array<{ entry: Extract<McpTimelineEntry, { kind: 'tool' }>; appData: McpAppRenderData }> = [];
    for (const entry of toolEntries) {
      if (entry.part.state === 'output-available' && 'output' in entry.part) {
        const appData = extractMcpAppRenderData(entry.part.output);
        if (appData) result.push({ entry, appData });
      }
    }
    return result;
  }, [toolEntries]);

  const hasApp = appEntries.length > 0;
  const [activeTab, setActiveTab] = useState<string>(hasApp ? 'app' : 'steps');

  // Switch to app tab when app output first appears
  useEffect(() => {
    if (hasApp) setActiveTab('app');
  }, [hasApp]);

  return (
    <div key={`${messageIndex}-${startIndex}-dynamic-stepper`} className="w-full my-3">
      <Accordion type="single" collapsible value={accordionValue} onValueChange={setAccordionValue}>
        <AccordionItem value="steps" className="rounded-xl border border-border/60 bg-card/30 overflow-hidden border-b!">
          {/* Trigger */}
          <AccordionTrigger className="px-4 py-2.5 hover:bg-muted/20 hover:no-underline transition-colors [&>svg]:hidden">
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <AppsIcon className={cn(
                  'h-3.5 w-3.5 shrink-0 transition-colors',
                  isAnyLoading && 'text-muted-foreground/60 animate-pulse',
                  hasErrors && !isAnyLoading && 'text-red-500',
                  !isAnyLoading && !hasErrors && 'text-foreground/70',
                )} />
                <span className="font-pixel text-[10px] text-muted-foreground/80 uppercase tracking-wider">
                  Apps
                </span>
                <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                  {`${toolEntries.length} ${toolEntries.length === 1 ? 'step' : 'steps'}`}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <svg
                  className="h-3 w-3 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]:rotate-180"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="pb-0">
            {/* Tab bar — only shown when there's an app output */}
            {hasApp && (
              <div className="px-2.5 py-2 border-t border-b border-border bg-background overflow-x-auto no-scrollbar">
                <KumoTabs
                  variant="segmented"
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full [--color-kumo-tint:var(--muted)] [--text-color-kumo-strong:var(--muted-foreground)] [--text-color-kumo-default:var(--foreground)] [--color-kumo-overlay:var(--background)] [--color-kumo-fill-hover:var(--border)]"
                  listClassName="w-full [&>button]:flex-1 [&>button]:justify-center"
                  tabs={[
                    {
                      value: 'app',
                      label: (
                        <span className="inline-flex items-center gap-1.5 leading-none">
                          <AppsIcon className="h-3 w-3 shrink-0" />
                          <span>App</span>
                          {appEntries.length > 1 && (
                            <span className="text-[10px] opacity-60 translate-y-px tabular-nums">{appEntries.length}</span>
                          )}
                        </span>
                      ),
                    },
                    {
                      value: 'steps',
                      label: (
                        <span className="inline-flex items-center gap-1.5 leading-none">
                          <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                          <span>Steps</span>
                          <span className="text-[10px] opacity-60 translate-y-px tabular-nums">{toolEntries.length}</span>
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
            )}

            {/* App tab — all app outputs stacked */}
            {hasApp && activeTab === 'app' && (
              <div className="overflow-hidden divide-y divide-border/40">
                {appEntries.map(({ entry, appData }, idx) => (
                  <McpAppOutputBlock
                    key={entry.id ?? idx}
                    app={appData}
                    toolInput={entry.part.input}
                    toolOutput={entry.part.output}
                    sendMessage={sendMessage}
                  />
                ))}
              </div>
            )}

            {/* Steps tab (or only content when no app) */}
            {(!hasApp || activeTab === 'steps') && (
              <div ref={scrollContainerRef} className={cn('border-t border-border/40 px-4 py-3 max-h-[62vh] overflow-y-auto overscroll-contain', hasApp && 'border-t-0')}>
                <div className="flex flex-col">
                  {entries.map((entry, index) => {
                    const stepState = entry.kind === 'tool'
                      ? getDynamicStepState(entry.part)
                      : entry.kind === 'reasoning'
                        ? (entry.state === 'streaming' ? 'loading' : 'done')
                        : 'done';
                    const isLast = index === entries.length - 1 && !(inlineElicitations?.length);
                    const isLastLoadingEntry = index === lastLoadingEntryIndex;

                    return (
                      <div key={entry.id} className="flex gap-2.5 w-full min-w-0">
                        {/* Left: dot + line */}
                        <div className={cn('relative flex flex-col items-center shrink-0 pt-[3px]', !isLast && 'pb-3')}>
                          <div className={cn(
                            'relative z-10 size-4 rounded-full border flex items-center justify-center shrink-0',
                            stepState === 'error' && 'border-red-500 bg-red-50 dark:bg-red-950',
                            stepState === 'loading' && 'border-border bg-muted',
                            stepState === 'done' && 'border-border bg-muted',
                          )}>
                            {stepState === 'loading' && <Spinner className="h-2.5 w-2.5 text-muted-foreground" />}
                            {stepState === 'done' && <Check className="h-2.5 w-2.5 text-foreground/70" />}
                            {stepState === 'error' && <X className="h-2.5 w-2.5 text-red-500" />}
                          </div>
                          {!isLast && (
                            <div className="absolute left-1/2 -translate-x-1/2 w-px bg-border/60" style={{ top: '19px', bottom: '-4px' }} />
                          )}
                        </div>
                        {/* Right: label + content */}
                        <div className={cn('flex-1 min-w-0', !isLast && 'pb-3')}>
                          <span className={cn(
                            'font-pixel! text-[10px] uppercase tracking-wider truncate block leading-[1.6]',
                            stepState === 'error' && 'text-red-600 dark:text-red-400',
                            stepState === 'loading' && 'text-muted-foreground',
                            stepState === 'done' && 'text-foreground',
                          )}>
                            {entry.kind === 'tool'
                              ? formatDynamicToolName(entry.part.type, entry.part.toolName)
                              : entry.kind === 'reasoning'
                                ? 'Reasoning'
                                : 'Text'}
                          </span>
                          <div className="mt-1 min-w-0">
                            {entry.kind === 'tool' ? (
                              <DynamicToolInvocationCard
                                part={entry.part}
                                compact={true}
                                sendMessage={sendMessage}
                              />
                            ) : entry.kind === 'reasoning' ? (
                              <Accordion type="single" collapsible defaultValue={stepState === 'loading' ? 'reasoning' : undefined}>
                                <AccordionItem value="reasoning" className="border-0">
                                  <AccordionTrigger className="py-1 text-[10px] text-muted-foreground/70 hover:no-underline hover:text-muted-foreground font-pixel! uppercase tracking-wider">
                                    Details
                                  </AccordionTrigger>
                                  <AccordionContent className="pb-1">
                                    <div className="text-[12px] text-foreground/80 leading-relaxed font-pixel! **:text-xs! **:font-be-vietnam-pro!">
                                      <MarkdownRenderer content={entry.text} />
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              </Accordion>
                            ) : (
                              <div className="text-[12px] text-foreground/85 leading-relaxed whitespace-pre-wrap wrap-break-word">
                                <MarkdownRenderer content={entry.text} />
                              </div>
                            )}
                          </div>
                          {isLastLoadingEntry ? <div ref={runningEntryEndRef} className="h-px w-full" /> : null}
                        </div>
                      </div>
                    );
                  })}
                  {inlineElicitations && inlineElicitations.length > 0 && onInlineElicitationResolved && inlineElicitations.map((elicitation, eli) => {
                    const isLastElicitation = eli === inlineElicitations.length - 1;
                    return (
                      <div key={elicitation.elicitationId} className="flex gap-2.5 w-full min-w-0">
                        <div className={cn('relative flex flex-col items-center shrink-0 pt-[3px]', !isLastElicitation && 'pb-3')}>
                          <div className="relative z-10 size-4 rounded-full border flex items-center justify-center shrink-0 border-border bg-muted">
                            <AlertCircle className="h-2.5 w-2.5 text-amber-500" />
                          </div>
                          {!isLastElicitation && (
                            <div className="absolute left-1/2 -translate-x-1/2 w-px bg-border/60" style={{ top: '19px', bottom: '-4px' }} />
                          )}
                        </div>
                        <div className={cn('flex-1 min-w-0', !isLastElicitation ? 'pb-3' : 'pb-3')}>
                          <span className="font-pixel! text-[10px] uppercase tracking-wider truncate block leading-[1.6] text-foreground">
                            {inlineElicitations.length > 1 ? `Approval needed · ${elicitation.serverName}` : 'Approval needed'}
                          </span>
                          <div className="mt-1 min-w-0">
                            <McpInlineElicitationCard
                              elicitation={elicitation}
                              onResolved={onInlineElicitationResolved}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

interface MessagePartRendererProps {
  part: ChatMessage['parts'][number];
  messageIndex: number;
  partIndex: number;
  parts: ChatMessage['parts'][number][];
  message: ChatMessage;
  status: string;
  hasActiveToolInvocations: boolean;
  reasoningVisibilityMap: Record<string, boolean>;
  reasoningFullscreenMap: Record<string, boolean>;
  setReasoningVisibilityMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setReasoningFullscreenMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  messages: ChatMessage[];
  user?: ComprehensiveUserData;
  isOwner?: boolean;
  selectedVisibilityType?: 'public' | 'private';
  chatId?: string;
  onVisibilityChange?: (visibility: 'public' | 'private') => void;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  setSuggestedQuestions: (questions: string[]) => void;
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  stop: UseChatHelpers<ChatMessage>['stop'];
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  onHighlight?: (text: string) => void;
  annotations?: DataUIPart<CustomUIDataTypes>[];
}

// Helper component for rendering canvas specs (uses hooks, so must be a proper component)
function CanvasSpecRenderer({ parts, isStreaming }: { parts: ChatMessage['parts'][number][]; isStreaming: boolean }) {
  const { spec, hasSpec } = useJsonRenderMessage(parts);
  if (!hasSpec) return null;
  return (
    <div className="mt-4">
      <CanvasRendererView spec={spec} loading={isStreaming} />
    </div>
  );
}

export const MessagePartRenderer = memo<MessagePartRendererProps>(
  ({
    part,
    messageIndex,
    partIndex,
    parts,
    message,
    status,
    hasActiveToolInvocations,
    reasoningVisibilityMap,
    reasoningFullscreenMap,
    setReasoningVisibilityMap,
    setReasoningFullscreenMap,
    messages,
    user,
    isOwner,
    selectedVisibilityType,
    chatId,
    onVisibilityChange,
    setMessages,
    setSuggestedQuestions,
    regenerate,
    stop,
    sendMessage,
    onHighlight,
    annotations,
  }) => {
    const { dataStream } = useDataStream();
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isBranchingOut, setIsBranchingOut] = useState(false);
    const [inlineElicitationVersion, setInlineElicitationVersion] = useState(0);
    const ignoredInlineElicitationIdsRef = useRef<Set<string>>(new Set());
    const router = useRouter();
    const queryClient = useQueryClient();
    const inlineElicitations = useMemo(
      () => getPendingInlineElicitations(dataStream ?? [], ignoredInlineElicitationIdsRef.current),
      [dataStream, inlineElicitationVersion],
    );

    // Handle text parts
    if (part.type === 'text') {
      // Check if there are any reasoning parts in the message
      const hasReasoningParts = parts.some((p) => p.type === 'reasoning');

      // For empty text parts in a streaming message, show loading animation only if no tool invocations and no reasoning parts are present
      if (
        (!part.text || part.text.trim() === '') &&
        (status === 'streaming' || status === 'submitted') &&
        !hasActiveToolInvocations &&
        !hasReasoningParts
      ) {
        return (
          <div
            key={`${messageIndex}-${partIndex}-loading`}
            className="flex flex-col min-h-[calc(100vh-18rem)] m-0! p-0! mt-4!"
          >
            <div className="flex space-x-2 ml-8 mt-2">
              <div
                className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce"
                style={{ animationDelay: '0ms' }}
              ></div>
              <div
                className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce"
                style={{ animationDelay: '150ms' }}
              ></div>
              <div
                className="w-2 h-2 rounded-full bg-muted-foreground dark:bg-muted-foreground animate-bounce"
                style={{ animationDelay: '300ms' }}
              ></div>
            </div>
          </div>
        );
      }

      // Skip empty text parts entirely for non-streaming states, but allow them during streaming with active tool invocations
      if (!part.text || part.text.trim() === '') {
        // Only skip if we're not streaming or if there are no active tool invocations
        if (status !== 'streaming' || !hasActiveToolInvocations) {
          return null;
        }
        // If we're streaming with active tool invocations, don't render anything for empty text but don't block other parts
        return <div key={`${messageIndex}-${partIndex}-empty`}></div>;
      }

      // Pre-compute metadata presentation values
      const meta = message?.metadata;
      const modelConfig = meta?.model ? getModelConfig(meta.model) : null;
      const modelLabel = modelConfig?.label ?? meta?.model ?? null;
      const tokenTotal = (meta?.totalTokens ?? (meta?.inputTokens ?? 0) + (meta?.outputTokens ?? 0)) || null;
      const inputCount = meta?.inputTokens ?? null;
      const outputCount = meta?.outputTokens ?? null;

      // Detect text sandwiched between step-start and tool-invocation
      const prevPart = parts[partIndex - 1];
      const nextPart = parts[partIndex + 1];
      if (prevPart?.type === 'step-start' && nextPart && isToolPartType(nextPart.type)) {
        return null;
      }

      // Detect text sandwiched between reasoning and tool-invocation
      if (prevPart?.type === 'reasoning' && nextPart && isToolPartType(nextPart.type)) {
        return null;
      }

      // Skip text parts that are ONLY <|im_end|> after a tool call
      const hasToolInvocationBefore = parts.slice(0, partIndex).some((p) => isToolPartType(p.type));
      if (hasToolInvocationBefore && part.text.trim() === '<|im_end|>') {
        return null;
      }

      // Determine if this is the last assistant message
      const isLastAssistantMessage = messageIndex === messages.length - 1 && message.role === 'assistant';

      // Show action buttons when:
      // 1. Status is ready (no streaming happening), OR
      // 2. This is NOT the last assistant message (previous messages keep their buttons)
      const shouldShowActionButtons = status === 'ready' || !isLastAssistantMessage;

      // Clean the text by removing box markers and special tokens
      const cleanText = part.text
        .replace(/<\|begin_of_box\|>/g, '')
        .replace(/<\|end_of_box\|>/g, '')
        .replace(/<\|im_end\|>/g, '');

      const actionIconButtonClassName =
        'h-8 w-8 rounded-sm border border-border bg-background/40 text-muted-foreground shadow-none backdrop-blur-sm transition-colors hover:bg-accent/60 hover:text-foreground supports-[backdrop-filter]:bg-background/30';

      // Check if the message has canvas spec data parts — only render after the LAST text part
      const lastTextIndex = parts.reduce((acc, p, idx) => (p.type === 'text' ? idx : acc), -1);
      const hasCanvasSpec = partIndex === lastTextIndex && parts.some((p) => p.type === SPEC_DATA_PART_TYPE);

      return (
        <div key={`${messageIndex}-${partIndex}-text`} className="mt-2">
          <div>
            <ChatTextHighlighter onHighlight={onHighlight} removeHighlightOnClick={true}>
              <MarkdownRenderer content={cleanText} />
            </ChatTextHighlighter>
          </div>

          {/* Canvas spec rendering (between text and action buttons) */}
          {hasCanvasSpec && <CanvasSpecRenderer parts={parts} isStreaming={status === 'streaming'} />}

          {/* Action buttons below the text */}
          {shouldShowActionButtons && (
            <div className="flex items-center justify-between mt-3 mb-4">
              {/* Left side - Action buttons */}
              <div className="flex items-center gap-1.5">
                {/* Rewrite button - only for owners or unauthenticated users on private chats, and only on last assistant message */}
                {((user && isOwner) || (!user && selectedVisibilityType === 'private')) && isLastAssistantMessage && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isRegenerating}
                          onClick={async () => {
                            if (isRegenerating) return;

                            try {
                              setIsRegenerating(true);
                              const lastUserMessage = messages.findLast((m) => m.role === 'user');
                              if (!lastUserMessage) return;

                              // Step 1: Stop any in-flight stream first to prevent the old response's
                              // onFinish from saving stale messages to DB after we delete them
                              await stop();

                              // Step 2: Small delay to allow the abort to propagate and any in-flight
                              // server-side onFinish to complete before we delete
                              await new Promise((resolve) => setTimeout(resolve, 100));

                              // Step 3: Delete trailing messages from DB
                              if (user && lastUserMessage.id) {
                                await deleteTrailingMessages({
                                  id: lastUserMessage.id,
                                });
                              }

                              // Step 4: Update local state to remove assistant messages
                              const newMessages = [];
                              for (let i = 0; i < messages.length; i++) {
                                newMessages.push(messages[i]);
                                if (messages[i].id === lastUserMessage.id) {
                                  break;
                                }
                              }

                              setMessages(newMessages);
                              setSuggestedQuestions([]);

                              // Step 5: Regenerate
                              await regenerate();
                            } catch (error) {
                              console.error('Error in reload:', error);
                            } finally {
                              setIsRegenerating(false);
                            }
                          }}
                          className={actionIconButtonClassName}
                        >
                          <TryAgainIcon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={4}>Try Again</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Share button */}
                {onVisibilityChange && (
                  <ShareButton
                    chatId={chatId || null}
                    selectedVisibilityType={selectedVisibilityType || 'private'}
                    onVisibilityChange={async (visibility) => {
                      await Promise.resolve(onVisibilityChange(visibility));
                    }}
                    isOwner={isOwner}
                    user={user}
                    variant="icon"
                    size="sm"
                    className={actionIconButtonClassName}
                  />
                )}

                {/* Copy button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(cleanText);
                          sileo.success({
                            title: 'Copied to clipboard',
                            description: 'You can now paste it anywhere',
                            icon: <Copy className="h-4 w-4" />
                          });
                        }}
                        className={actionIconButtonClassName}
                      >
                        <CopyIcon className="h-[18px] w-[18px]" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={4}>Copy</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Branch Out button - only for owners or unauthenticated users on private chats, and only on assistant messages */}
                {((user && isOwner) || (!user && selectedVisibilityType === 'private')) &&
                  message.role === 'assistant' && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isBranchingOut}
                            onClick={async () => {
                              if (isBranchingOut) return;

                              try {
                                setIsBranchingOut(true);

                                // Find the corresponding user message (the one before this assistant message)
                                const currentMessageIndex = messages.findIndex((m) => m.id === message.id);
                                if (currentMessageIndex === -1) {
                                  sileo.error({ title: 'Could not find message' });
                                  return;
                                }

                                // Find the last user message before this assistant message
                                let userMessage: ChatMessage | undefined;
                                for (let i = currentMessageIndex - 1; i >= 0; i--) {
                                  if (messages[i].role === 'user') {
                                    userMessage = messages[i];
                                    break;
                                  }
                                }

                                if (!userMessage) {
                                  sileo.error({ title: 'Could not find corresponding user message' });
                                  return;
                                }

                                // Branch out the chat
                                const result = await branchOutChat({
                                  userMessage: userMessage as any,
                                  assistantMessage: message as any,
                                });

                                if (result.success && result.chatId) {
                                  // Invalidate recent chats cache to show the new chat in sidebar
                                  if (user?.id) {
                                    queryClient.refetchQueries({ queryKey: ['recent-chats', user.id] });
                                  }
                                  sileo.success({ title: 'Chat branched out successfully' });
                                  await new Promise((resolve) => setTimeout(resolve, 100));
                                  // Navigate to the new chat
                                  router.push(`/search/${result.chatId}`);
                                } else {
                                  sileo.error({ title: result.error || 'Failed to branch out chat' });
                                }
                              } catch (error) {
                                console.error('Error branching out chat:', error);
                                sileo.error({ title: 'Failed to branch out chat' });
                              } finally {
                                setIsBranchingOut(false);
                              }
                            }}
                            className={actionIconButtonClassName}
                          >
                            {isBranchingOut ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <HugeiconsIcon icon={SplitIcon} size={16} color="currentColor" className="rotate-90" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={4}>Branch Out</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                {/* Export dropdown */}
                {message.role === 'assistant' && (
                  <DropdownMenu>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={actionIconButtonClassName}
                            >
                              <IconArrowInbox className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={4}>Export</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <DropdownMenuContent className="min-w-[140px]" align="start" sideOffset={4}>
                      <DropdownMenuItem
                        className="cursor-pointer gap-2"
                        onClick={async () => {
                          try {
                            const textParts = (message.parts || [])
                              .filter((p) => p.type === 'text' && (p as any).text)
                              .map((p: any) => String(p.text).trim())
                              .filter((s: string) => s.length > 0);
                            const content = textParts.join('\n\n');
                            if (!content) {
                              sileo.error({
                                title: 'Nothing to export',
                                description: 'No content found in this message',
                                icon: <AlertCircle className="h-4 w-4" />
                              });
                              return;
                            }

                            const payload = {
                              title: 'Scira AI',
                              content,
                              meta: {
                                modelLabel: modelLabel || null,
                                createdAt: (message as any)?.createdAt || Date.now(),
                              },
                            };

                            const res = await fetch('/api/export/pdf', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(payload),
                            });
                            if (!res.ok) {
                              const errText = await res.text();
                              throw new Error(errText || 'Failed to generate PDF');
                            }
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `scira-export-${message.id || Date.now()}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                            sileo.success({
                              title: 'PDF downloaded',
                              description: 'Your PDF file is ready',
                              icon: <FilePdf className="h-4 w-4" />
                            });
                          } catch (e) {
                            console.error('Export PDF error:', e);
                            sileo.error({
                              title: 'Failed to export PDF',
                              description: 'Please try again',
                              icon: <X className="h-4 w-4" />
                            });
                          }
                        }}
                      >
                        <FilePdf className="h-4 w-4" />
                        <span>PDF</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer gap-2"
                        onClick={async () => {
                          try {
                            const textParts = (message.parts || [])
                              .filter((p) => p.type === 'text' && (p as any).text)
                              .map((p: any) => String(p.text).trim())
                              .filter((s: string) => s.length > 0);
                            const content = textParts.join('\n\n');
                            if (!content) {
                              sileo.error({
                                title: 'Nothing to export',
                                description: 'No content found in this message',
                                icon: <AlertCircle className="h-4 w-4" />
                              });
                              return;
                            }

                            const payload = {
                              title: 'Scira AI',
                              content,
                              meta: {
                                modelLabel: modelLabel || null,
                                createdAt: (message as any)?.createdAt || Date.now(),
                              },
                            };

                            const res = await fetch('/api/export/docx', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(payload),
                            });
                            if (!res.ok) {
                              const errText = await res.text();
                              throw new Error(errText || 'Failed to generate Word document');
                            }
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `scira-export-${message.id || Date.now()}.docx`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                            sileo.success({
                              title: 'Word document downloaded',
                              description: 'Your Word file is ready',
                              icon: <FileDoc className="h-4 w-4" />
                            });
                          } catch (e) {
                            console.error('Export Word error:', e);
                            sileo.error({
                              title: 'Failed to export Word document',
                              description: 'Please try again',
                              icon: <X className="h-4 w-4" />
                            });
                          }
                        }}
                      >
                        <FileDoc className="h-4 w-4" />
                        <span>Word</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="cursor-pointer gap-2"
                        onClick={() => {
                          try {
                            const textParts = (message.parts || [])
                              .filter((p) => p.type === 'text' && (p as any).text)
                              .map((p: any) => String(p.text).trim())
                              .filter((s: string) => s.length > 0);
                            const content = textParts.join('\n\n');
                            if (!content) {
                              sileo.error({
                                title: 'Nothing to export',
                                description: 'No content found in this message',
                                icon: <AlertCircle className="h-4 w-4" />
                              });
                              return;
                            }

                            const links: { text: string; url: string }[] = [];
                            const seen = new Set<string>();

                            const inlineLinkRegex = /\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g;
                            let m: RegExpExecArray | null;
                            while ((m = inlineLinkRegex.exec(content)) !== null) {
                              const text = m[1];
                              const url = m[2].replace(/[.,;:]+$/, '');
                              if (!seen.has(url)) {
                                seen.add(url);
                                links.push({ text, url });
                              }
                            }

                            const bareUrlRegex = /(?:^|\s)(https?:\/\/[^\s)]+)(?=$|\s)/g;
                            while ((m = bareUrlRegex.exec(content)) !== null) {
                              const url = m[1].replace(/[.,;:]+$/, '');
                              if (!seen.has(url)) {
                                seen.add(url);
                                links.push({ text: url, url });
                              }
                            }

                            const references =
                              links.length > 0
                                ? '\n\n## References\n\n' + links.map((l) => `- [${l.text}](${l.url})`).join('\n')
                                : '';

                            const finalMd = content + references;

                            const blob = new Blob([finalMd], { type: 'text/markdown;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `scira-export-${message.id || Date.now()}.md`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                            sileo.success({
                              title: 'Markdown downloaded',
                              description: 'Your Markdown file is ready',
                              icon: <FileMd className="h-4 w-4" />
                            });
                          } catch (e) {
                            console.error('Export Markdown error:', e);
                            sileo.error({
                              title: 'Failed to export Markdown',
                              description: 'Please try again',
                              icon: <X className="h-4 w-4" />
                            });
                          }
                        }}
                      >
                        <FileMd className="h-4 w-4" />
                        <span>Markdown</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Right side - Message metadata */}
              {meta && (
                <HoverCard openDelay={0} closeDelay={100}>
                  <HoverCardTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        actionIconButtonClassName,
                        'touch-manipulation lg:pointer-events-auto',
                      )}
                      onTouchStart={() => { }}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    className="w-72 max-w-[calc(100vw-2rem)]"
                    side="top"
                    align="end"
                    sideOffset={8}
                    alignOffset={-8}
                    avoidCollisions={true}
                    collisionPadding={16}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        <h4 className="font-semibold text-sm">Response Info</h4>
                      </div>

                      {modelLabel && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Model</span>
                          <div className="flex items-center gap-1 text-xs bg-primary text-primary-foreground rounded-lg px-2 py-1">
                            <HugeiconsIcon icon={CpuIcon} size={12} />
                            {modelLabel}
                          </div>
                        </div>
                      )}

                      {typeof meta.completionTime === 'number' && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Generation Time</span>
                          <div className="flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            {meta.completionTime.toFixed(1)}s
                          </div>
                        </div>
                      )}

                      {(inputCount != null || outputCount != null) && (
                        <div className="space-y-2">
                          <span className="text-sm text-muted-foreground">Token Usage</span>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {inputCount != null && (
                              <div className="flex items-center justify-between bg-muted rounded-lg px-2 py-1">
                                <span className="flex items-center gap-1">
                                  <ArrowLeftIcon weight="regular" className="h-3 w-3" />
                                  Input
                                </span>
                                <span className="font-medium">{inputCount.toLocaleString()}</span>
                              </div>
                            )}
                            {outputCount != null && (
                              <div className="flex items-center justify-between bg-muted rounded-lg px-2 py-1">
                                <span className="flex items-center gap-1">
                                  <ArrowRightIcon weight="regular" className="h-3 w-3" />
                                  Output
                                </span>
                                <span className="font-medium">{outputCount.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                          {tokenTotal != null && (
                            <div className="flex items-center justify-between bg-accent rounded-lg px-2 py-1 text-xs">
                              <span className="flex items-center gap-1 font-medium">
                                <SigmaIcon className="h-3 w-3" weight="regular" />
                                Total
                              </span>
                              <span className="font-semibold">{tokenTotal.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              )}
            </div>
          )}
        </div>
      );
    }

    // Handle reasoning parts
    if (part.type === 'reasoning') {
      const mcpDynamicToolIndices = parts
        .map((messagePart, index) =>
          messagePart.type === 'dynamic-tool' && (messagePart as any).toolName?.startsWith('mcp_')
            ? index
            : -1,
        )
        .filter((index) => index >= 0);

      if (mcpDynamicToolIndices.length > 0) {
        const firstMcpToolIndex = mcpDynamicToolIndices[0]!;
        const lastMcpToolIndex = mcpDynamicToolIndices[mcpDynamicToolIndices.length - 1]!;

        let mcpTimelineStartIndex = firstMcpToolIndex;
        for (let i = firstMcpToolIndex - 1; i >= 0; i--) {
          const p = parts[i];
          if (!p) break;
          if (p.type === 'reasoning' || p.type === 'step-start' || p.type === 'text') {
            mcpTimelineStartIndex = i;
          } else {
            break;
          }
        }

        const finalTextIndex = parts.findIndex(
          (messagePart, index) =>
            index > lastMcpToolIndex &&
            messagePart.type === 'text' &&
            typeof (messagePart as any).text === 'string' &&
            (messagePart as any).text.trim().length > 50,
        );
        const mcpTimelineEndIndex =
          finalTextIndex === -1 ? parts.length - 1 : finalTextIndex - 1;

        if (partIndex >= mcpTimelineStartIndex && partIndex <= mcpTimelineEndIndex) {
          return null;
        }
      }

      const prevPart = parts[partIndex - 1];
      if (prevPart && prevPart.type === 'reasoning') {
        return null;
      }

      // Merge consecutive reasoning parts into a single block
      let nextIndex = partIndex;
      const mergedTexts: string[] = [];
      const reasoningStates: Array<ReasoningUIPart['state']> = [];
      while (nextIndex < parts.length && parts[nextIndex]?.type === 'reasoning') {
        const r = parts[nextIndex] as unknown as ReasoningUIPart;
        if (typeof r.text === 'string' && r.text.length > 0) {
          mergedTexts.push(r.text);
        }
        if (r.state) {
          reasoningStates.push(r.state);
        }
        nextIndex += 1;
      }

      const mergedState: ReasoningUIPart['state'] =
        reasoningStates.includes('streaming') ? 'streaming' : reasoningStates.includes('done') ? 'done' : undefined;

      // Detect whether this provider streams token-by-token or in whole chunks.
      // BPE tokens are virtually never longer than ~15 chars; if any part exceeds
      // 30 chars it must be a chunk-based model (GPT, Gemini) whose chunks don't
      // carry trailing newlines and therefore need an explicit paragraph separator.
      // Token-by-token models (Minimax) already embed all whitespace in the token
      // stream, so plain concatenation preserves their structure.
      const isChunkBased = mergedTexts.some((t) => t.length > 30);
      const mergedText = mergedTexts.join(isChunkBased ? '\n\n' : '');


      const mergedPart: ReasoningUIPart = {
        ...(part as ReasoningUIPart),
        text: mergedText,
        state: mergedState,
      };

      const sectionKey = `${messageIndex}-${partIndex}`;
      const hasParallelToolInvocation = parts.some((p: ChatMessage['parts'][number]) => isToolPartType(p.type));
      const hasFollowingOutput = parts.some(
        (p: ChatMessage['parts'][number], i: number) =>
          i > partIndex && (p.type === 'text' || isToolPartType(p.type)),
      );
      const parallelTool = hasParallelToolInvocation
        ? (() => {
          const firstToolPart = parts.find((p: ChatMessage['parts'][number]) => isToolPartType(p.type)) as any;
          if (!firstToolPart) return null;
          if (firstToolPart.type === 'dynamic-tool') return formatDynamicToolName('dynamic-tool', firstToolPart.toolName);
          return firstToolPart.type.split('-')[1] ?? null;
        })()
        : null;

      // "Done reasoning" is controlled by the reasoning part state (if present),
      // otherwise we fall back to "did we already see output after reasoning".
      const isCompleteForView = mergedState === 'done' || (mergedState == null && hasFollowingOutput);

      // Default UX:
      // - while streaming: expanded (so user can see it updating)
      // - once complete: collapsed (so it "closes" automatically)
      // If the user manually toggles it, that preference wins.
      const expandedOverride = reasoningVisibilityMap[sectionKey];
      const isFullscreen = reasoningFullscreenMap[sectionKey] ?? false;

      const setIsExpanded = (v: boolean) => setReasoningVisibilityMap((prev) => ({ ...prev, [sectionKey]: v }));
      const setIsFullscreen = (v: boolean) => setReasoningFullscreenMap((prev) => ({ ...prev, [sectionKey]: v }));

      return (
        <ReasoningPartView
          key={sectionKey}
          part={mergedPart}
          sectionKey={sectionKey}
          parallelTool={parallelTool}
          isComplete={isCompleteForView}
          expandedOverride={expandedOverride}
          isFullscreen={isFullscreen}
          setIsExpanded={setIsExpanded}
          setIsFullscreen={setIsFullscreen}
        />
      );
    }

    // Handle step-start parts
    if (part.type === 'step-start') {
      const firstStepStartIndex = parts.findIndex((p) => p.type === 'step-start');
      if (partIndex === firstStepStartIndex) {
        return (
          <div key={`${messageIndex}-${partIndex}-step-start-logo`} className="p-0 py-1.5" />
        );
      }
      return <div key={`${messageIndex}-${partIndex}-step-start`}></div>;
    }

    // Skip canvas spec data parts (rendered inline after text via CanvasSpecRenderer)
    if (part.type === SPEC_DATA_PART_TYPE) {
      return null;
    }

    if (part.type === 'dynamic-tool') {
      const mcpDynamicToolIndices = parts
        .map((messagePart, index) =>
          messagePart.type === 'dynamic-tool' && (messagePart as any).toolName?.startsWith('mcp_')
            ? index
            : -1,
        )
        .filter((index) => index >= 0);

      if (mcpDynamicToolIndices.length > 0) {
        const firstMcpToolIndex = mcpDynamicToolIndices[0]!;
        const lastMcpToolIndex = mcpDynamicToolIndices[mcpDynamicToolIndices.length - 1]!;

        let mcpTimelineStartIndex = firstMcpToolIndex;
        for (let i = firstMcpToolIndex - 1; i >= 0; i--) {
          const p = parts[i];
          if (!p) break;
          if (p.type === 'reasoning' || p.type === 'step-start' || p.type === 'text') {
            mcpTimelineStartIndex = i;
          } else {
            break;
          }
        }

        const finalTextIndex = parts.findIndex(
          (messagePart, index) =>
            index > lastMcpToolIndex &&
            messagePart.type === 'text' &&
            typeof (messagePart as any).text === 'string' &&
            (messagePart as any).text.trim().length > 50,
        );
        const mcpTimelineEndIndex =
          finalTextIndex === -1 ? parts.length - 1 : finalTextIndex - 1;
        const currentPartIsMcpTool = (part as any).toolName?.startsWith('mcp_');

        if (!currentPartIsMcpTool) {
          return (
            <DynamicToolInvocationCard
              part={part}
            />
          );
        }

        if (partIndex !== firstMcpToolIndex) {
          return null;
        }

        const entries: McpTimelineEntry[] = [];
        let cursor = mcpTimelineStartIndex;

        while (cursor <= mcpTimelineEndIndex) {
          const currentPart = parts[cursor] as any;

          if (currentPart?.type === 'dynamic-tool' && currentPart?.toolName?.startsWith('mcp_')) {
            entries.push({
              kind: 'tool',
              part: currentPart,
              originalIndex: cursor,
              id: currentPart.toolCallId || `mcp-tool-${messageIndex}-${cursor}`,
            });
            cursor += 1;
            continue;
          }

          if (currentPart?.type === 'reasoning') {
            const reasoningTexts: string[] = [];
            const reasoningStates: Array<ReasoningUIPart['state']> = [];
            const reasoningStartIndex = cursor;

            while (cursor <= mcpTimelineEndIndex && parts[cursor]?.type === 'reasoning') {
              const reasoningPart = parts[cursor] as unknown as ReasoningUIPart;
              if (typeof reasoningPart.text === 'string' && reasoningPart.text.length > 0) {
                reasoningTexts.push(reasoningPart.text);
              }
              if (reasoningPart.state) {
                reasoningStates.push(reasoningPart.state);
              }
              cursor += 1;
            }

            if (reasoningTexts.length > 0) {
              const isChunkBased = reasoningTexts.some((text) => text.length > 30);
              const mergedText = reasoningTexts.join(isChunkBased ? '\n\n' : '');
              const mergedState: ReasoningUIPart['state'] =
                reasoningStates.includes('streaming')
                  ? 'streaming'
                  : reasoningStates.includes('done')
                    ? 'done'
                    : undefined;

              entries.push({
                kind: 'reasoning',
                text: mergedText,
                state: mergedState,
                id: `mcp-reasoning-${messageIndex}-${reasoningStartIndex}`,
              });
            }
            continue;
          }

          if (currentPart?.type === 'text') {
            const textStartIndex = cursor;
            const textChunks: string[] = [];

            while (cursor <= mcpTimelineEndIndex && parts[cursor]?.type === 'text') {
              const textPart = parts[cursor] as { text?: string };
              if (typeof textPart.text === 'string' && textPart.text.length > 0) {
                const cleaned = textPart.text
                  .replace(/<\|begin_of_box\|>/g, '')
                  .replace(/<\|end_of_box\|>/g, '')
                  .replace(/<\|im_end\|>/g, '')
                  .trim();
                if (cleaned.length > 0) {
                  textChunks.push(cleaned);
                }
              }
              cursor += 1;
            }

            const isBetweenTools =
              textStartIndex > firstMcpToolIndex &&
              textStartIndex < lastMcpToolIndex;

            if (isBetweenTools && textChunks.length > 0) {
              entries.push({
                kind: 'text',
                text: textChunks.join('\n\n'),
                id: `mcp-text-${messageIndex}-${textStartIndex}`,
              });
            }
            continue;
          }

          cursor += 1;
        }

        const resolveInlineElicitation = (elicitationId: string) => {
          ignoredInlineElicitationIdsRef.current.add(elicitationId);
          setInlineElicitationVersion((v) => v + 1);
        };

        if (entries.length > 1 || inlineElicitations.length > 0) {
          return (
            <DynamicToolStepper
              entries={entries}
              messageIndex={messageIndex}
              startIndex={partIndex}
              sendMessage={sendMessage}
              inlineElicitations={inlineElicitations}
              onInlineElicitationResolved={resolveInlineElicitation}
            />
          );
        }

        const onlyEntry = entries[0];
        if (onlyEntry?.kind === 'tool') {
          return (
            <DynamicToolInvocationCard
              part={onlyEntry.part}
              sendMessage={sendMessage}
            />
          );
        }

        if (onlyEntry?.kind === 'reasoning') {
          return (
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card/30 mt-1">
              <div className="px-3.5 py-2.5 text-[12px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
                <MarkdownRenderer content={onlyEntry.text} />
              </div>
            </div>
          );
        }

        if (onlyEntry?.kind === 'text') {
          return (
            <div className="rounded-xl border border-border/60 overflow-hidden bg-card/30 mt-1">
              <div className="px-3.5 py-2.5 text-[12px] text-foreground/80 leading-relaxed whitespace-pre-wrap wrap-break-word">
                <MarkdownRenderer content={onlyEntry.text} />
              </div>
            </div>
          );
        }
      }

      const firstDynamicToolIndex = parts.findIndex((messagePart) => messagePart.type === 'dynamic-tool');
      if (partIndex !== firstDynamicToolIndex) {
        return null;
      }

      const dynamicSequenceEntries = parts
        .map((messagePart, index) =>
          messagePart.type === 'dynamic-tool'
            ? {
              kind: 'tool' as const,
              part: messagePart,
              originalIndex: index,
              id: (messagePart as any).toolCallId || `dynamic-tool-${messageIndex}-${index}`,
            }
            : null,
        )
        .filter((entry): entry is { kind: 'tool'; part: any; originalIndex: number; id: string } => Boolean(entry));

      if (dynamicSequenceEntries.length > 1) {
        return (
          <DynamicToolStepper
            entries={dynamicSequenceEntries}
            messageIndex={messageIndex}
            startIndex={partIndex}
            sendMessage={sendMessage}
          />
        );
      }

      return (
        <DynamicToolInvocationCard
          part={part}
          sendMessage={sendMessage}
        />
      );
    }

    // Handle tool parts with new granular states system
    if (isStaticToolUIPart(part)) {
      // Check if this part has the new state system
      if ('state' in part && part.state) {
        switch (part.type) {
          case 'tool-find_place_on_map':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <SearchLoadingState
                    key={`${messageIndex}-${partIndex}-tool`}
                    icon={MapPin}
                    text="Finding locations..."
                    color="blue"
                  />
                );
              case 'output-available':
                // Handle error responses
                if (!part.output.success) {
                  return (
                    <div
                      key={`${messageIndex}-${partIndex}-tool`}
                      className="w-full my-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950"
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-900 dark:text-red-100">
                              Location search failed
                            </h3>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">{part.output.error}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                const { places } = part.output;
                if (!places || places.length === 0) {
                  return (
                    <div
                      key={`${messageIndex}-${partIndex}-tool`}
                      className="w-full my-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950"
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">
                              No locations found
                            </h3>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                              Try searching with different keywords or check the spelling.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={`${messageIndex}-${partIndex}-tool`}
                    className="w-full my-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] shadow-sm overflow-hidden"
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center">
                          <MapPin className="h-4 w-4 text-[hsl(var(--primary))]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold truncate">
                              {places.length} Location{places.length !== 1 ? 's' : ''} Found
                            </h3>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]">
                              {part.output.search_type === 'forward' ? 'Address Search' : 'Coordinate Search'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Map */}
                    <div className="relative h-[360px] sm:h-[400px] bg-[hsl(var(--muted))]">
                      <MapComponent
                        center={{ lat: places[0].location.lat, lng: places[0].location.lng }}
                        places={places.map((place: any) => ({
                          name: place.name,
                          location: place.location,
                          address: place.formatted_address,
                          place_id: place.place_id,
                          types: place.types,
                        }))}
                        zoom={places.length === 1 ? 15 : 12}
                      />
                    </div>

                    {/* Results list */}
                    <div className="p-3 divide-y divide-[hsl(var(--border))]">
                      {places.map((place: any, index: number) => (
                        <div key={place.place_id || index} className="py-3">
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 w-9 h-9 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center">
                              <MapPin className="h-4 w-4 text-[hsl(var(--primary))]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3">
                                <h4 className="text-sm font-medium text-ellipsis overflow-hidden whitespace-nowrap">
                                  {place.name}
                                </h4>
                                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                                  {place.location.lat.toFixed(4)}, {place.location.lng.toFixed(4)}
                                </span>
                              </div>
                              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2">
                                {place.formatted_address}
                              </p>
                              {place.types && place.types.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {place.types.slice(0, 3).map((type: string, typeIndex: number) => (
                                    <span
                                      key={typeIndex}
                                      className="text-[10px] px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] capitalize"
                                    >
                                      {type.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              case 'output-error':
                return (
                  <ToolErrorDisplay
                    key={`${messageIndex}-${partIndex}-tool`}
                    errorText={part.errorText}
                    toolName="Location Search"
                  />
                );
            }
            break;

          case 'tool-movie_or_tv_search':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <SearchLoadingState
                    key={`${messageIndex}-${partIndex}-tool`}
                    icon={Film}
                    text="Discovering entertainment content..."
                    color="violet"
                  />
                );
              case 'output-available':
                return <TMDBResult result={part.output} key={`${messageIndex}-${partIndex}-tool`} />;
            }
            break;

          case 'tool-stock_chart':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <StockChartLoader
                    key={`${messageIndex}-${partIndex}-tool`}
                    title={part.input?.title || 'Preparing financial analysis...'}
                    input={part.input}
                  />
                );
              case 'output-available':
                return (
                  <InteractiveStockChart
                    key={`${messageIndex}-${partIndex}-tool`}
                    title={part.input.title}
                    chart={{
                      ...part.output.chart,
                      x_scale: 'datetime',
                    }}
                    data={part.output.chart.elements}
                    stock_symbols={part.input.companies || []}
                    currency_symbols={
                      part.output.currency_symbols ||
                      part.input.currency_symbols ||
                      part.input.companies?.map(() => 'USD') || ['USD']
                    }
                    interval={part.input.time_period || '1 year'}
                    resolved_companies={
                      part.output.resolved_companies?.map((company) => ({
                        ...company,
                        ticker: company.ticker || company.name || 'N/A',
                      })) || []
                    }
                    earnings_data={
                      part.output.earnings_data?.map((earning) => ({
                        ...earning,
                        ticker: earning.ticker || 'N/A',
                      })) || []
                    }
                    news_results={part.output.news_results}
                    sec_filings={
                      part.output.sec_filings?.map((filing) => ({
                        id: filing.id,
                        title: filing.title,
                        url: filing.url,
                        content: filing.content,
                        metadata: filing.metadata,
                        requestedCompany: 'requestedCompany' in filing ? String(filing.requestedCompany) : 'N/A',
                        requestedFilingType:
                          'requestedFilingType' in filing
                            ? String(filing.requestedFilingType)
                            : 'form_type' in filing
                              ? String(filing.form_type)
                              : '10-K',
                      })) || []
                    }
                    company_statistics={part.output.company_statistics}
                    balance_sheets={part.output.balance_sheets}
                    income_statements={part.output.income_statements}
                    cash_flows={part.output.cash_flows}
                    dividends_data={part.output.dividends_data}
                    insider_transactions={part.output.insider_transactions}
                    market_movers={part.output.market_movers}
                  />
                );
            }
            break;

          case 'tool-get_weather_data':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <Card
                    key={`${messageIndex}-${partIndex}-tool`}
                    className="my-2 py-0 shadow-none bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 gap-0"
                  >
                    <CardHeader className="py-2 px-3 sm:px-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                          <div className="flex items-center mt-1 gap-2">
                            <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                            <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                          </div>
                        </div>
                        <div className="flex items-center ml-4">
                          <div className="text-right">
                            <div className="h-8 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                            <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-md mt-1 animate-pulse" />
                          </div>
                          <div className="h-12 w-12 flex items-center justify-center ml-2">
                            <Cloud className="h-8 w-8 text-neutral-300 dark:text-neutral-700 animate-pulse" />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className="h-7 w-28 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse"
                          />
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="px-3 sm:px-4">
                        <div className="h-8 w-full bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse mb-4" />
                        <div className="h-[180px] w-full bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
                        <div className="flex justify-between mt-4 pb-4 overflow-x-auto no-scrollbar">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className="flex flex-col items-center min-w-[60px] sm:min-w-[70px] p-1.5 sm:p-2 mx-0.5"
                            >
                              <div className="h-4 w-12 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-2" />
                              <div className="h-8 w-8 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse mb-2" />
                              <div className="h-3 w-8 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="border-t border-neutral-200 dark:border-neutral-800 py-0! px-4 m-0!">
                      <div className="w-full flex justify-end items-center py-1">
                        <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                      </div>
                    </CardFooter>
                  </Card>
                );
              case 'output-available':
                return <WeatherChart result={part.output} key={`${messageIndex}-${partIndex}-tool`} />;
            }
            break;

          case 'tool-web_search':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
              case 'output-available':
                return (
                  <MultiSearch
                    key={`${messageIndex}-${partIndex}-tool`}
                    result={part.output || null}
                    args={part.input ? part.input : {}}
                    annotations={annotations as DataQueryCompletionPart[]}
                  />
                );
            }
            break;

          case 'tool-datetime':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="flex items-center gap-3 py-4 px-2">
                    <div className="h-5 w-5 relative">
                      <div className="absolute inset-0 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-blue-500 dark:border-t-blue-400 animate-spin" />
                    </div>
                    <span className="text-neutral-700 dark:text-neutral-300 text-sm font-medium">
                      Fetching current time...
                    </span>
                  </div>
                );
              case 'output-available':
                // Live Clock component that updates every second
                const LiveClock = memo(() => {
                  const [time, setTime] = useState(() => new Date());
                  const timerRef = useRef<NodeJS.Timeout | null>(null);

                  useEffect(() => {
                    // Sync with the nearest second
                    const now = new Date();
                    const delay = 1000 - now.getMilliseconds();

                    // Initial sync
                    const timeout = setTimeout(() => {
                      setTime(new Date());

                      // Then start the interval
                      timerRef.current = setInterval(() => {
                        setTime(new Date());
                      }, 1000);
                    }, delay);

                    return () => {
                      clearTimeout(timeout);
                      if (timerRef.current) {
                        clearInterval(timerRef.current);
                      }
                    };
                  }, []);

                  // Format the time according to the specified timezone
                  const timezone = part.output.timezone || new Intl.DateTimeFormat().resolvedOptions().timeZone;
                  const formatter = new Intl.DateTimeFormat('en-US', {
                    hour: 'numeric',
                    minute: 'numeric',
                    second: 'numeric',
                    hour12: true,
                    timeZone: timezone,
                  });

                  const formattedParts = formatter.formatToParts(time);
                  const timeParts = {
                    hour: formattedParts.find((part) => part.type === 'hour')?.value || '12',
                    minute: formattedParts.find((part) => part.type === 'minute')?.value || '00',
                    second: formattedParts.find((part) => part.type === 'second')?.value || '00',
                    dayPeriod: formattedParts.find((part) => part.type === 'dayPeriod')?.value || 'AM',
                  };

                  return (
                    <div className="mt-3">
                      <div className="flex items-baseline">
                        <div className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tighter tabular-nums text-neutral-900 dark:text-white">
                          {timeParts.hour.padStart(2, '0')}
                        </div>
                        <div className="mx-1 sm:mx-2 text-4xl sm:text-5xl md:text-6xl font-light text-neutral-400 dark:text-neutral-500">
                          :
                        </div>
                        <div className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tighter tabular-nums text-neutral-900 dark:text-white">
                          {timeParts.minute.padStart(2, '0')}
                        </div>
                        <div className="mx-1 sm:mx-2 text-4xl sm:text-5xl md:text-6xl font-light text-neutral-400 dark:text-neutral-500">
                          :
                        </div>
                        <div className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tighter tabular-nums text-neutral-900 dark:text-white">
                          {timeParts.second.padStart(2, '0')}
                        </div>
                        <div className="ml-2 sm:ml-4 text-xl sm:text-2xl font-light self-center text-neutral-400 dark:text-neutral-500">
                          {timeParts.dayPeriod}
                        </div>
                      </div>
                    </div>
                  );
                });

                LiveClock.displayName = 'LiveClock';

                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="w-full my-6">
                    <div className="bg-white dark:bg-neutral-950 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
                      <div className="p-4 sm:p-6">
                        <div className="flex flex-col gap-4 sm:gap-6">
                          <div>
                            <div className="flex justify-between items-center mb-2">
                              <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 tracking-wider uppercase">
                                Current Time
                              </h3>
                              <div className="bg-neutral-100 dark:bg-neutral-800 rounded px-2 py-1 text-xs text-neutral-600 dark:text-neutral-300 font-medium flex items-center gap-1.5">
                                <PhosphorClockIcon weight="regular" className="h-3 w-3 text-blue-500" />
                                {part.output.timezone || new Intl.DateTimeFormat().resolvedOptions().timeZone}
                              </div>
                            </div>
                            <LiveClock />
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                              {part.output.formatted?.date}
                            </p>
                          </div>

                          {/* Compact Technical Details */}
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {part.output.formatted?.iso_local && (
                              <div className="bg-neutral-50 dark:bg-neutral-900 rounded p-3">
                                <div className="text-neutral-500 dark:text-neutral-400 mb-1">Local</div>
                                <div className="font-mono text-neutral-700 dark:text-neutral-300 text-[11px]">
                                  {part.output.formatted.iso_local}
                                </div>
                              </div>
                            )}

                            {part.output.timestamp && (
                              <div className="bg-neutral-50 dark:bg-neutral-900 rounded p-3">
                                <div className="text-neutral-500 dark:text-neutral-400 mb-1">Timestamp</div>
                                <div className="font-mono text-neutral-700 dark:text-neutral-300 text-[11px]">
                                  {part.output.timestamp}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
            }
            break;

          case 'tool-extreme_search':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing extreme search...
                  </div>
                );
              case 'input-available':
              case 'output-available':
                return (
                  <ExtremeSearch
                    key={`${messageIndex}-${partIndex}-tool`}
                    // @ts-ignore - Complex type intersection resolved to never
                    toolInvocation={{ toolName: 'extreme_search', input: part.input, result: part.output }}
                    annotations={
                      (annotations?.filter(
                        (annotation) => annotation.type === 'data-extreme_search',
                      ) as DataExtremeSearchPart[]) || []
                    }
                  />
                );
            }
            break;

          case 'tool-text_translate':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing translation...
                  </div>
                );
              case 'input-available':
              case 'output-available':
                return (
                  <TextTranslate key={`${messageIndex}-${partIndex}-tool`} args={part.input} result={part.output} />
                );
            }
            break;

          case 'tool-code_context':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <SearchLoadingState
                    key={`${messageIndex}-${partIndex}-tool`}
                    icon={Code}
                    text="Getting code context..."
                    color="blue"
                  />
                );
              case 'output-available':
                return (
                  <CodeContextTool key={`${messageIndex}-${partIndex}-tool`} args={part.input} result={part.output} />
                );
            }
            break;

          case 'tool-file_query_search':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
              case 'output-available':
                const fileQuerySearchInput = part.input;
                const fileQuerySearchOutput = part.output;
                return (
                  <FileQuerySearch
                    key={`${messageIndex}-${partIndex}-tool`}
                    result={fileQuerySearchOutput || null}
                    args={fileQuerySearchInput ? fileQuerySearchInput : {}}
                    annotations={annotations as DataQueryCompletionPart[]}
                  />
                );
            }
            break;

          case 'tool-trending_movies':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <SearchLoadingState
                    key={`${messageIndex}-${partIndex}-tool`}
                    icon={Film}
                    text="Loading trending movies..."
                    color="blue"
                  />
                );
              case 'output-available':
                return <TrendingResults result={part.output} type="movie" key={`${messageIndex}-${partIndex}-tool`} />;
            }
            break;

          case 'tool-trending_tv':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <SearchLoadingState
                    key={`${messageIndex}-${partIndex}-tool`}
                    icon={Tv}
                    text="Loading trending TV shows..."
                    color="blue"
                  />
                );
              case 'output-available':
                return <TrendingResults result={part.output} type="tv" key={`${messageIndex}-${partIndex}-tool`} />;
            }
            break;

          case 'tool-academic_search':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
              case 'output-available':
                const academicSearchInput = part.input;
                const academicSearchOutput = part.output;
                return (
                  <AcademicPapersCard
                    key={`${messageIndex}-${partIndex}-tool`}
                    response={academicSearchOutput || null}
                    args={academicSearchInput ? academicSearchInput : {}}
                    annotations={annotations as DataQueryCompletionPart[]}
                  />
                );
            }
            break;

          case 'tool-track_flight':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="w-full max-w-2xl mx-auto">
                    <div className="border rounded-md bg-card overflow-hidden shadow-2xs">
                      {/* Compact Header Skeleton */}
                      <div className="px-4 py-2 border-b bg-muted/40">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                          </div>
                        </div>
                      </div>

                      {/* Compact Body Skeleton */}
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          {/* Left */}
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <Skeleton className="h-7 w-20" />
                            <Skeleton className="h-6 w-16" />
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-2.5 w-20" />
                          </div>

                          {/* Middle */}
                          <div className="flex flex-col items-center justify-center w-28 shrink-0">
                            <div className="flex items-center gap-2 w-full">
                              <div className="flex-1 h-px bg-border"></div>
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
                                <Plane className="h-3.5 w-3.5 text-primary animate-pulse" />
                              </div>
                              <div className="flex-1 h-px bg-border"></div>
                            </div>
                            <Skeleton className="h-3 w-12 mt-1" />
                          </div>

                          {/* Right */}
                          <div className="text-right min-w-0 flex-1 space-y-1.5">
                            <Skeleton className="h-7 w-20 ml-auto" />
                            <Skeleton className="h-6 w-16 ml-auto" />
                            <Skeleton className="h-3 w-32 ml-auto" />
                            <Skeleton className="h-2.5 w-20 ml-auto" />
                          </div>
                        </div>

                        {/* Inline meta skeleton */}
                        <div className="mt-3 pt-2 border-t flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              case 'output-available':
                return <FlightTracker data={part.output} key={`${messageIndex}-${partIndex}-tool`} />;
            }
            break;

          case 'tool-reddit_search':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
              case 'output-available':
                const redditSearchInput = part.input;
                const redditSearchOutput = part.output;
                return (
                  <RedditSearch
                    key={`${messageIndex}-${partIndex}-tool`}
                    result={redditSearchOutput || null}
                    args={redditSearchInput ? redditSearchInput : {}}
                    annotations={annotations as DataQueryCompletionPart[]}
                  />
                );
            }
            break;

          case 'tool-github_search':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
              case 'output-available':
                const githubSearchInput = part.input;
                const githubSearchOutput = part.output;
                return (
                  <GitHubSearch
                    key={`${messageIndex}-${partIndex}-tool`}
                    result={githubSearchOutput || null}
                    args={githubSearchInput ? githubSearchInput : {}}
                    annotations={annotations as DataQueryCompletionPart[]}
                  />
                );
            }
            break;

          case 'tool-prediction_search':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
              case 'output-available':
                const predictionSearchInput = part.input;
                const predictionSearchOutput = part.output;
                return (
                  <PredictionSearch
                    key={`${messageIndex}-${partIndex}-tool`}
                    result={predictionSearchOutput || null}
                    args={predictionSearchInput ? predictionSearchInput : {}}
                    annotations={annotations as DataQueryCompletionPart[]}
                  />
                );
            }
            break;

          case 'tool-x_search':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
              case 'output-available':
                const rawXSearchInput = part.input ?? {};
                const xSearchInput = {
                  ...rawXSearchInput,
                  includeXHandles: rawXSearchInput.includeXHandles?.filter((h): h is string => h !== undefined),
                  excludeXHandles: rawXSearchInput.excludeXHandles?.filter((h): h is string => h !== undefined),
                };
                const xSearchOutput = part.output;

                const normalizeCitation = (citation: any) => {
                  if (!citation) return null;
                  if (typeof citation === 'string') {
                    return { url: citation, title: citation, description: '' };
                  }
                  const url = typeof citation.url === 'string' ? citation.url : '';
                  const title = typeof citation.title === 'string' && citation.title.length > 0 ? citation.title : url || 'Citation';
                  return { ...citation, url, title };
                };

                return (
                  <XSearch
                    key={`${messageIndex}-${partIndex}-tool`}
                    result={
                      xSearchOutput
                        ? {
                          ...xSearchOutput,
                          searches:
                            xSearchOutput.searches?.map((search: any) => ({
                              ...search,
                              query: search.query || '',
                              sources: search.sources?.filter((s: any): s is NonNullable<typeof s> => s !== null) || [],
                              citations: (search.citations ?? []).map(normalizeCitation).filter(Boolean),
                            })) || [],
                          dateRange: xSearchOutput.dateRange || '',
                          handles: xSearchOutput.handles || [],
                        }
                        : null
                    }
                    args={xSearchInput}
                    annotations={annotations as DataQueryCompletionPart[]}
                  />
                );
            }
            break;

          case 'tool-youtube_search':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <SearchLoadingState
                    key={`${messageIndex}-${partIndex}-tool`}
                    icon={YoutubeIcon}
                    text="Searching YouTube..."
                    color="red"
                  />
                );
              case 'output-available': {
                const parseLegacyCount = (value: unknown): number | undefined => {
                  if (typeof value === 'number' && Number.isFinite(value)) {
                    return value;
                  }
                  if (typeof value === 'string') {
                    const digits = value.replace(/[^0-9]/g, '');
                    if (!digits) return undefined;
                    const parsed = Number(digits);
                    return Number.isFinite(parsed) ? parsed : undefined;
                  }
                  return undefined;
                };

                const normalizedResults = Array.isArray(part.output?.results)
                  ? part.output.results.map((video: any) => {
                    if (!video) return video;
                    if (video.stats) return video;
                    const views = parseLegacyCount(video.views);
                    const likes = parseLegacyCount(video.likes);

                    if (views == null && likes == null) {
                      return video;
                    }

                    return {
                      ...video,
                      stats: {
                        ...(views != null ? { views } : {}),
                        ...(likes != null ? { likes } : {}),
                      },
                    };
                  })
                  : [];

                return (
                  <YouTubeSearchResults
                    results={{
                      ...(part.output ?? { results: [] }),
                      results: normalizedResults,
                    }}
                    key={`${messageIndex}-${partIndex}-tool`}
                  />
                );
              }
            }
            break;

          case 'tool-spotify_search':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <SpotifySearchResults
                    key={`${messageIndex}-${partIndex}-tool`}
                    result={{ success: true, query: part.input?.query || '', searchTypes: ['track'], tracks: [], artists: [], albums: [], playlists: [], totals: { tracks: 0, artists: 0, albums: 0, playlists: 0 } }}
                    isLoading={true}
                  />
                );
              case 'output-available':
                return (
                  <SpotifySearchResults
                    key={`${messageIndex}-${partIndex}-tool`}
                    result={part.output}
                  />
                );
            }
            break;

          case 'tool-search_memories':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <SearchLoadingState
                    key={`${messageIndex}-${partIndex}-tool`}
                    icon={MemoryIcon}
                    text="Searching memories..."
                    color="blue"
                  />
                );
              case 'output-available':
                // Handle error responses
                if (!part.output.success) {
                  return (
                    <div className="w-full my-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
                            <MemoryIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-900 dark:text-red-100">Memory search failed</h3>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">{part.output.error}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                const { results, count } = part.output;
                if (!results || results.length === 0) {
                  return (
                    <div className="w-full my-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                            <MemoryIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">
                              No memories found
                            </h3>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                              No memories match your search query. Try different keywords.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="w-full my-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="px-2 py-2 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))]">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center shrink-0">
                            <MemoryIcon className="h-4 w-4 text-[hsl(var(--primary))]" />
                          </div>
                          <h3 className="text-sm font-semibold">
                            {count} Memor{count !== 1 ? 'ies' : 'y'} Found
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Image
                            src="/supermemory.svg"
                            alt="Supermemory"
                            width={100}
                            height={16}
                            className="opacity-60 hover:opacity-80 transition-opacity invert dark:invert-0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Results list */}
                    <div className="">
                      {results.map((memory: any, index: number) => (
                        <div key={memory.id || index} className="px-4 py-2">
                          <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2">
                            • {memory.chunks[0].content || memory.memory || ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
            }
            break;

          case 'tool-add_memory':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <SearchLoadingState
                    key={`${messageIndex}-${partIndex}-tool`}
                    icon={MemoryIcon}
                    text="Adding memory..."
                    color="green"
                  />
                );
              case 'output-available':
                // Handle error responses
                if (!part.output.success) {
                  return (
                    <div className="w-full my-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
                            <MemoryIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-red-900 dark:text-red-100">Failed to add memory</h3>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">{part.output.error}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                const { memory: addedMemory } = part.output;
                return (
                  <div className="w-full my-4 rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 shadow-sm overflow-hidden">
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <MemoryIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">
                              Memory Added Successfully
                            </h3>
                            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                              Your information has been saved to memory for future reference.
                            </p>
                          </div>
                        </div>
                        <Image
                          src="/supermemory.svg"
                          alt="Supermemory"
                          width={100}
                          height={16}
                          className="opacity-60 hover:opacity-80 transition-opacity shrink-0 invert dark:invert-0"
                        />
                      </div>

                      {addedMemory && (
                        <div className="mt-3 p-3 bg-white dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          {addedMemory.title && (
                            <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                              {addedMemory.title}
                            </h4>
                          )}
                          <p className="text-xs text-green-700 dark:text-green-300">
                            {addedMemory.summary || addedMemory.content || part.input.memory || 'Memory stored'}
                          </p>
                          {addedMemory.type && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300">
                                {addedMemory.type}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
            }
            break;

          case 'tool-connectors_search':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <ConnectorsSearchResults
                    key={`${messageIndex}-${partIndex}-tool`}
                    results={[]}
                    query={part.input?.query || ''}
                    totalResults={0}
                    isLoading={true}
                  />
                );
              case 'output-available':
                return (
                  <ConnectorsSearchResults
                    key={`${messageIndex}-${partIndex}-tool`}
                    results={part.output?.success ? part.output.results : []}
                    query={part.output?.success ? part.output.query : ''}
                    totalResults={part.output?.success ? part.output.count : 0}
                  />
                );
            }
            break;

          case 'tool-nearby_places_search':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <NearbySearchSkeleton type={part.input?.type || 'places'} key={`${messageIndex}-${partIndex}-tool`} />
                );
              case 'output-available':
                // Handle error cases or missing data
                if (!part.output.success || !part.output.center) {
                  return (
                    <div
                      key={`${messageIndex}-${partIndex}-tool`}
                      className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg"
                    >
                      <p className="text-red-700 dark:text-red-300">
                        {part.output.error ||
                          'Unable to find nearby places. Please try a different location or search term.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <NearbySearchMapView
                    key={`${messageIndex}-${partIndex}-tool`}
                    center={{
                      lat: part.output.center?.lat || 0,
                      lng: part.output.center?.lng || 0,
                    }}
                    places={
                      part.output.places?.map((place: any) => ({
                        name: place.name,
                        location: place.location,
                        place_id: place.place_id,
                        vicinity: place.formatted_address,
                        rating: place.rating,
                        reviews_count: place.reviews_count,
                        reviews: place.reviews,
                        price_level: place.price_level,
                        photos: place.photos,
                        is_closed: !place.is_open,
                        type: place.types?.[0]?.replace(/_/g, ' '),
                        source: place.source,
                        phone: place.phone,
                        website: place.website,
                        hours: place.opening_hours,
                        distance: place.distance,
                      })) || []
                    }
                    type={part.output.type || ''}
                    query={part.output.query || ''}
                    searchRadius={'radius' in part.output ? Number(part.output.radius) || 1000 : 1000}
                  />
                );
            }
            break;

          case 'tool-currency_converter':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
              case 'output-available':
                return (
                  <CurrencyConverter
                    key={`${messageIndex}-${partIndex}-tool`}
                    toolInvocation={{ toolName: 'currency_converter', input: part.input || {}, result: part.output || null }}
                    result={part.output}
                  />
                );
            }
            break;

          case 'tool-code_interpreter':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
              case 'output-available':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="space-y-3 w-full overflow-hidden">
                    <CodeInterpreterView
                      code={part.input?.code || ''}
                      output={part.output?.message}
                      error={part.output && 'error' in part.output ? String(part.output.error) : undefined}
                      language="python"
                      title={part.input?.title || 'Code Execution'}
                      status={
                        part.output && 'error' in part.output && part.output.error
                          ? 'error'
                          : part.output
                            ? 'completed'
                            : 'running'
                      }
                    />

                    {part.output?.chart && (
                      <div className="pt-1 overflow-x-auto">
                        <InteractiveChart chart={part.output.chart} />
                      </div>
                    )}
                  </div>
                );
            }
            break;

          case 'tool-retrieve':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <div
                    key={`${messageIndex}-${partIndex}-tool`}
                    className="rounded-xl border border-border/60 my-4 overflow-hidden bg-card/30"
                  >
                    {/* Header */}
                    <div className="px-4 py-2.5 border-b border-border/40 flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground/40 animate-pulse" />
                      <span className="font-pixel text-xs text-muted-foreground/80 uppercase tracking-wider">Retrieving</span>
                      <Spinner className="size-3 text-muted-foreground/40 ml-auto" />
                    </div>
                    <div className="p-4">
                      <div className="flex gap-3">
                        <div className="relative w-10 h-10 shrink-0 rounded-lg bg-muted/30 animate-pulse flex items-center justify-center">
                          <Globe className="h-4 w-4 text-muted-foreground/20" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-2.5">
                          <div className="h-4 w-3/4 bg-muted/30 animate-pulse rounded" />
                          <div className="flex gap-2">
                            <div className="h-3 w-20 bg-muted/20 animate-pulse rounded" style={{ animationDelay: '50ms' }} />
                            <div className="h-3 w-28 bg-muted/20 animate-pulse rounded" style={{ animationDelay: '100ms' }} />
                          </div>
                          <div className="space-y-1">
                            <div className="h-2.5 w-full bg-muted/20 animate-pulse rounded" style={{ animationDelay: '150ms' }} />
                            <div className="h-2.5 w-4/5 bg-muted/15 animate-pulse rounded" style={{ animationDelay: '200ms' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              case 'output-available':
                // Handle error responses
                if (part.output && 'error' in part.output && part.output.error && !part.output.results?.length) {
                  return (
                    <div
                      key={`${messageIndex}-${partIndex}-tool`}
                      className="border border-red-200 dark:border-red-500 rounded-xl my-4 p-4 bg-red-50 dark:bg-red-950/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                          <Globe className="h-4 w-4 text-red-600 dark:text-red-300" />
                        </div>
                        <div>
                          <div className="text-red-700 dark:text-red-300 text-sm font-medium">
                            Error retrieving content
                          </div>
                          <div className="text-red-600/80 dark:text-red-400/80 text-xs mt-1">{String(part.output.error)}</div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Use the new RetrieveResults component for both single and multi-URL
                return <RetrieveResults key={`${messageIndex}-${partIndex}-tool`} result={part.output} />;
            }
            break;

          case 'tool-coin_ohlc':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <SearchLoadingState
                    key={`${messageIndex}-${partIndex}-tool`}
                    icon={TrendingUpIcon}
                    text="Loading OHLC candlestick data..."
                    color="green"
                  />
                );
              case 'output-available':
                return (
                  <CryptoChart
                    result={part.output}
                    coinId={part.input.coinId}
                    chartType="candlestick"
                    key={`${messageIndex}-${partIndex}-tool`}
                  />
                );
            }
            break;

          case 'tool-coin_data':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <SearchLoadingState
                    key={`${messageIndex}-${partIndex}-tool`}
                    icon={DollarSign}
                    text="Fetching comprehensive coin data..."
                    color="blue"
                  />
                );
              case 'output-available':
                return (
                  <CryptoCoinsData
                    result={part.output}
                    coinId={part.input.coinId}
                    key={`${messageIndex}-${partIndex}-tool`}
                  />
                );
            }
            break;

          case 'tool-coin_data_by_contract':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <SearchLoadingState
                    key={`${messageIndex}-${partIndex}-tool`}
                    icon={DollarSign}
                    text="Fetching token data by contract..."
                    color="violet"
                  />
                );
              case 'output-available':
                return (
                  <CryptoCoinsData
                    result={part.output}
                    contractAddress={part.input.contractAddress}
                    key={`${messageIndex}-${partIndex}-tool`}
                  />
                );
            }
            break;

          case 'tool-greeting':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
                return (
                  <SearchLoadingState
                    key={`${messageIndex}-${partIndex}-tool`}
                    icon={User2}
                    text="Preparing greeting..."
                    color="gray"
                  />
                );
              case 'output-available':
                return (
                  <div
                    key={`${messageIndex}-${partIndex}-tool`}
                    className="group my-2 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm hover:border-neutral-300 dark:hover:border-neutral-600 transition-all duration-200"
                  >
                    <div className="p-3">
                      <div className="flex items-start gap-3">
                        {part.output.timeEmoji && (
                          <div className="mt-0.5 w-5 h-5 rounded-md bg-neutral-600 flex items-center justify-center">
                            <span className="text-xs">{part.output.timeEmoji}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-medium text-neutral-900 dark:text-neutral-100">
                              {part.output.greeting}
                            </span>
                            <span className="text-neutral-400">•</span>
                            <span className="text-neutral-500 dark:text-neutral-400">{part.output.dayOfWeek}</span>
                          </div>
                          <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                            {part.output.professionalMessage}
                          </div>
                          {part.output.helpfulTip && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {part.output.helpfulTip}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
            }
            break;
          case 'tool-box_exec': {
            const buildAnnotations = (annotations?.filter(
              (a) => a.type === 'data-build_search',
            ) as DataBuildSearchPart[]) || [];
            const execAnns = buildAnnotations.filter((a) => a.data.kind === 'exec');
            const latestAnn = execAnns[execAnns.length - 1]?.data;
            return (
              <BoxExecResult
                key={`${messageIndex}-${partIndex}-tool`}
                input={part.input}
                result={part.output}
                state={part.state}
                annotation={latestAnn}
              />
            );
          }

          case 'tool-box_write': {
            const buildAnnotations = (annotations?.filter(
              (a) => a.type === 'data-build_search',
            ) as DataBuildSearchPart[]) || [];
            const writeAnns = buildAnnotations.filter((a) => a.data.kind === 'write');
            const latestAnn = writeAnns[writeAnns.length - 1]?.data;
            return (
              <BoxWriteResult
                key={`${messageIndex}-${partIndex}-tool`}
                input={part.input}
                result={part.output}
                state={part.state}
                annotation={latestAnn}
              />
            );
          }

          case 'tool-box_read': {
            const buildAnnotations = (annotations?.filter(
              (a) => a.type === 'data-build_search',
            ) as DataBuildSearchPart[]) || [];
            const readAnns = buildAnnotations.filter((a) => a.data.kind === 'read');
            const latestAnn = readAnns[readAnns.length - 1]?.data;
            return (
              <BoxReadResult
                key={`${messageIndex}-${partIndex}-tool`}
                input={part.input}
                result={part.output}
                state={part.state}
                annotation={latestAnn}
              />
            );
          }

          case 'tool-box_list_files': {
            const buildAnnotations = (annotations?.filter(
              (a) => a.type === 'data-build_search',
            ) as DataBuildSearchPart[]) || [];
            const listAnns = buildAnnotations.filter((a) => a.data.kind === 'list');
            const latestAnn = listAnns[listAnns.length - 1]?.data;
            return (
              <BoxListResult
                key={`${messageIndex}-${partIndex}-tool`}
                input={part.input}
                result={part.output}
                state={part.state}
                annotation={latestAnn}
              />
            );
          }

          case 'tool-box_download': {
            const buildAnnotations = (annotations?.filter(
              (a) => a.type === 'data-build_search',
            ) as DataBuildSearchPart[]) || [];
            const dlAnns = buildAnnotations.filter((a) => a.data.kind === 'download');
            const latestAnn = dlAnns[dlAnns.length - 1]?.data;
            return (
              <BoxDownloadResult
                key={`${messageIndex}-${partIndex}-tool`}
                input={part.input}
                result={part.output}
                state={part.state}
                annotation={latestAnn}
              />
            );
          }

          case 'tool-box_agent': {
            const buildAnnotations = (annotations?.filter(
              (a) => a.type === 'data-build_search',
            ) as DataBuildSearchPart[]) || [];
            const agentAnns = buildAnnotations.filter((a) => a.data.kind === 'agent');
            return (
              <BoxAgentResult
                key={`${messageIndex}-${partIndex}-tool`}
                input={part.input}
                result={part.output}
                state={part.state}
                annotations={agentAnns}
              />
            );
          }

          case 'tool-box_code': {
            const buildAnnotations = (annotations?.filter(
              (a) => a.type === 'data-build_search',
            ) as DataBuildSearchPart[]) || [];
            const codeAnns = buildAnnotations.filter((a) => a.data.kind === 'code');
            const latestAnn = codeAnns[codeAnns.length - 1]?.data;
            return (
              <BoxCodeResult
                key={`${messageIndex}-${partIndex}-tool`}
                input={part.input}
                result={part.output}
                state={part.state}
                annotation={latestAnn}
              />
            );
          }

          case 'tool-box_browse_page': {
            return (
              <SearchLoadingState
                key={`${messageIndex}-${partIndex}-tool`}
                icon={Globe}
                text={part.state === 'output-available' ? 'Browsed pages' : 'Browsing pages...'}
                color="blue"
              />
            );
          }

          default:
            return (
              <DynamicToolInvocationCard
                part={part}
                compact={true}
              />
            );
        }
      } else {
        // Legacy tool invocation without state - show as loading or fallback
        console.warn('Legacy tool part without state:', part);
        return (
          <div
            key={`${messageIndex}-${partIndex}-tool-legacy`}
            className="my-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg"
          >
            <h3 className="font-medium mb-2">Tool: Unknown</h3>
            <pre className="text-xs overflow-auto">{JSON.stringify(part, null, 2)}</pre>
          </div>
        );
      }
    }

    // Log unhandled part types for debugging
    console.log(
      'Unhandled part type:',
      typeof part === 'object' && part !== null && 'type' in part ? part.type : 'unknown',
      part,
    );

    return null;
  },
  (prevProps: MessagePartRendererProps, nextProps: MessagePartRendererProps) => {
    const areEqual =
      isEqual(prevProps.part, nextProps.part) &&
      prevProps.messageIndex === nextProps.messageIndex &&
      prevProps.partIndex === nextProps.partIndex &&
      isEqual(prevProps.parts, nextProps.parts) &&
      isEqual(prevProps.message, nextProps.message) &&
      prevProps.status === nextProps.status &&
      prevProps.hasActiveToolInvocations === nextProps.hasActiveToolInvocations &&
      isEqual(prevProps.reasoningVisibilityMap, nextProps.reasoningVisibilityMap) &&
      isEqual(prevProps.reasoningFullscreenMap, nextProps.reasoningFullscreenMap) &&
      prevProps.user?.id === nextProps.user?.id &&
      prevProps.isOwner === nextProps.isOwner &&
      prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
      prevProps.chatId === nextProps.chatId &&
      isEqual(prevProps.annotations, nextProps.annotations);

    // Debug logging (can be removed in production)
    if (!areEqual) {
      console.log('MessagePartRenderer re-rendering');
    }

    return areEqual;
  },
);

// Code Context tool component
const CodeContextTool: React.FC<{ args: any; result: any }> = ({ args, result }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!result) {
    return (
      <div className="group my-2 p-3 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-neutral-50/30 dark:bg-neutral-900/30">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-md bg-neutral-600 flex items-center justify-center opacity-80">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="h-2.5 w-20 bg-neutral-300 dark:bg-neutral-600 rounded-sm animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const responseText = result?.response || result;
  const shouldShowAccordion = responseText && responseText.length > 500;
  const previewText = shouldShowAccordion ? responseText.slice(0, 400) + '...' : responseText;

  return (
    <div className="group my-2 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm hover:border-neutral-300 dark:hover:border-neutral-600 transition-all duration-200">
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center">
            <Code className="w-2.5 h-2.5 text-white" />
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-neutral-900 dark:text-neutral-100">Code Context</span>
                <span className="text-neutral-400">•</span>
                <span className="text-neutral-500 dark:text-neutral-400 truncate max-w-[200px]">
                  {args ? args.query : ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Copy button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(responseText);
                    sileo.success({ title: 'Code context copied to clipboard' });
                  }}
                  className="h-6 w-6 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <CopyIcon className="h-[15px] w-[15px] text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200" />
                </Button>

                {/* Metadata badges */}
                {result?.resultsCount !== undefined && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-0 text-xs px-2 py-0.5"
                    >
                      {result.resultsCount} results
                    </Badge>
                    {result.outputTokens && (
                      <Badge
                        variant="secondary"
                        className="rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-0 text-xs px-2 py-0.5"
                      >
                        {result.outputTokens} tokens
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
              {shouldShowAccordion ? (
                <Accordion
                  type="single"
                  collapsible
                  value={isExpanded ? 'context' : ''}
                  onValueChange={(value) => setIsExpanded(!!value)}
                >
                  <AccordionItem value="context" className="border-0">
                    <div className="space-y-2">
                      <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed wrap-break-word">
                        {!isExpanded && previewText}
                      </div>
                      <AccordionTrigger className="py-2 hover:no-underline text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                        {isExpanded ? 'Show less' : 'Show full context'}
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed wrap-break-word whitespace-pre-wrap pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                          {responseText}
                        </div>
                      </AccordionContent>
                    </div>
                  </AccordionItem>
                </Accordion>
              ) : (
                <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed wrap-break-word whitespace-pre-wrap">
                  {responseText}
                </div>
              )}

              {/* Footer metadata */}
              {result?.searchTime && (
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-200/30 dark:border-neutral-700/30">
                  <Clock className="w-3 h-3 text-neutral-400" />
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Search completed in {(result.searchTime / 1000).toFixed(2)}s
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

MessagePartRenderer.displayName = 'MessagePartRenderer';
