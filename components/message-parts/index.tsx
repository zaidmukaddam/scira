import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import isEqual from 'fast-deep-equal';
import { ReasoningUIPart, DataUIPart, isToolUIPart } from 'ai';
import { ReasoningPartView } from '@/components/reasoning-part';
import { MarkdownRenderer } from '@/components/markdown';
import { ChatTextHighlighter } from '@/components/chat-text-highlighter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { deleteTrailingMessages, generateSpeech } from '@/app/actions';
import { toast } from 'sonner';
import { Wave } from '@foobar404/wave';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ShareButton } from '@/components/share';
import { HugeiconsIcon } from '@hugeicons/react';
import { RepeatIcon, Copy01Icon, CpuIcon } from '@hugeicons/core-free-icons';
import { ChatMessage, CustomUIDataTypes, DataQueryCompletionPart, DataExtremeSearchPart, ChatTools } from '@/lib/types';
import { UseChatHelpers } from '@ai-sdk/react';
import { SciraLogoHeader } from '@/components/scira-logo-header';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';

// Tool-specific components (lazy loaded)
import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { SearchLoadingState } from '@/components/tool-invocation-list-view';
import {
  MapPin,
  Film,
  Tv,
  Book,
  Cloud,
  DollarSign,
  TrendingUpIcon,
  Plane,
  User2,
  Server,
  XCircle,
  Loader2,
  Clock,
  Globe,
  YoutubeIcon,
  ArrowUpRight,
  TextIcon,
  Pause,
  Play as PlayIcon,
  Info,
  Code,
  Copy,
} from 'lucide-react';
import {
  RedditLogoIcon,
  XLogoIcon,
  ClockIcon as PhosphorClockIcon,
  MemoryIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  SigmaIcon,
} from '@phosphor-icons/react';
import { getModelConfig } from '@/ai/providers';
import { ComprehensiveUserData } from '@/lib/user-data-server';
import { Spinner } from '../ui/spinner';

// Lazy load tool components
const FlightTracker = lazy(() =>
  import('@/components/flight-tracker').then((module) => ({ default: module.FlightTracker })),
);
const InteractiveChart = lazy(() => import('@/components/interactive-charts'));
const MapComponent = lazy(() =>
  import('@/components/map-components').then((module) => ({ default: module.MapComponent })),
);
const TMDBResult = lazy(() => import('@/components/movie-info'));
const MultiSearch = lazy(() => import('@/components/multi-search'));
const NearbySearchMapView = lazy(() => import('@/components/nearby-search-map-view'));
const TrendingResults = lazy(() => import('@/components/trending-tv-movies-results'));
const AcademicPapersCard = lazy(() => import('@/components/academic-papers'));
const WeatherChart = lazy(() => import('@/components/weather-chart'));
const MCPServerList = lazy(() => import('@/components/mcp-server-list'));
const RedditSearch = lazy(() => import('@/components/reddit-search'));
const XSearch = lazy(() => import('@/components/x-search'));
const ExtremeSearch = lazy(() =>
  import('@/components/extreme-search').then((module) => ({ default: module.ExtremeSearch })),
);
const CryptoCoinsData = lazy(() =>
  import('@/components/crypto-coin-data').then((module) => ({ default: module.CoinData })),
);
const CurrencyConverter = lazy(() =>
  import('@/components/currency_conv').then((module) => ({ default: module.CurrencyConverter })),
);
const InteractiveStockChart = lazy(() => import('@/components/interactive-stock-chart'));

// Simple loader component for stock chart - no useEffect needed
const StockChartLoader = ({ title }: { title?: string; input?: any }) => {
  return (
    <div className="flex flex-col gap-3 w-full mt-4">
      <Badge
        variant="secondary"
        className={cn(
          'w-fit flex items-center gap-3 px-4 py-2 rounded-full transition-colors duration-200',
          'bg-blue-200 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        )}
      >
        <TrendingUpIcon className="h-4 w-4" />
        <span className="font-medium">{title || 'Loading Stock Chart'}</span>
        <Spinner className="size-5" />
      </Badge>
    </div>
  );
};
const CryptoChart = lazy(() =>
  import('@/components/crypto-charts').then((module) => ({ default: module.CryptoChart })),
);
const OnChainCryptoComponents = lazy(() =>
  import('@/components/onchain-crypto-components').then((module) => ({ default: module.OnChainTokenPrice })),
);
const CryptoTickers = lazy(() =>
  import('@/components/crypto-charts').then((module) => ({ default: module.CryptoTickers })),
);

const YouTubeSearchResults = lazy(() =>
  import('@/components/youtube-search-results').then((module) => ({ default: module.YouTubeSearchResults })),
);
const ConnectorsSearchResults = lazy(() =>
  import('@/components/connectors-search-results').then((module) => ({ default: module.ConnectorsSearchResults })),
);
const CodeInterpreterView = lazy(() =>
  import('@/components/tool-invocation-list-view').then((module) => ({ default: module.CodeInterpreterView })),
);
const NearbySearchSkeleton = lazy(() =>
  import('@/components/tool-invocation-list-view').then((module) => ({ default: module.NearbySearchSkeleton })),
);

// Loading component for lazy-loaded components
const ComponentLoader = () => (
  <div className="flex space-x-2 mt-2">
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
);

// Error component for tool errors
const ToolErrorDisplay = ({ errorText, toolName }: { errorText: string; toolName: string }) => (
  <div className="w-full my-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
    <div className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-900 dark:text-red-100">{toolName} failed</h3>
          <p className="text-xs text-red-700 dark:text-red-300 mt-1">{errorText}</p>
        </div>
      </div>
    </div>
  </div>
);

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
  onHighlight?: (text: string) => void;
  annotations?: DataUIPart<CustomUIDataTypes>[];
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
    onHighlight,
    annotations,
  }) => {
    const [isRegenerating, setIsRegenerating] = useState(false);

    // Handle text parts
    if (part.type === 'text') {
      // Check if there are any reasoning parts in the message
      const hasReasoningParts = parts.some((p) => p.type === 'reasoning');

      // For empty text parts in a streaming message, show loading animation only if no tool invocations and no reasoning parts are present
      if ((!part.text || part.text.trim() === '') &&( status === 'streaming' || status === 'submitted') && !hasActiveToolInvocations && !hasReasoningParts) {
        return (
          <div
            key={`${messageIndex}-${partIndex}-loading`}
            className="flex flex-col min-h-[calc(100vh-18rem)] !m-0 !p-0 !mt-4"
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
      if (prevPart?.type === 'step-start' && nextPart?.type.includes('tool-')) {
        return null;
      }

      return (
        <div key={`${messageIndex}-${partIndex}-text`} className="mt-2">
          <div>
            <ChatTextHighlighter onHighlight={onHighlight} removeHighlightOnClick={true}>
              <MarkdownRenderer content={part.text} />
            </ChatTextHighlighter>
          </div>

          {/* Add compact buttons below the text with tooltips */}
          {status === 'ready' && (
            <div className="flex flex-row items-center justify-between gap-2 mt-2.5 mb-5 !-ml-1 flex-wrap">
              {/* Left side - Action buttons container */}
              <div className="flex flex-wrap items-center gap-1">
                {/* Only show reload for owners OR unauthenticated users on private chats */}
                {((user && isOwner) || (!user && selectedVisibilityType === 'private')) && (
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

                              // Step 1: Delete trailing messages if user is authenticated
                              if (user && lastUserMessage.id) {
                                await deleteTrailingMessages({
                                  id: lastUserMessage.id,
                                });
                              }

                              // Step 2: Update local state to remove assistant messages
                              const newMessages = [];
                              // Find the index of the last user message
                              for (let i = 0; i < messages.length; i++) {
                                newMessages.push(messages[i]);
                                if (messages[i].id === lastUserMessage.id) {
                                  break;
                                }
                              }

                              // Step 3: Update UI state
                              setMessages(newMessages);
                              setSuggestedQuestions([]);

                              // Step 4: Reload
                              await regenerate();
                            } catch (error) {
                              console.error('Error in reload:', error);
                            } finally {
                              setIsRegenerating(false);
                            }
                          }}
                          className="size-8 p-0 rounded-full"
                        >
                          <HugeiconsIcon icon={RepeatIcon} size={32} color="currentColor" strokeWidth={2} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Rewrite</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {/* Share button using unified component */}
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
                    className="rounded-full"
                  />
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(part.text);
                          toast.success('Copied to clipboard');
                        }}
                        className="size-8 p-0 rounded-full"
                      >
                        <HugeiconsIcon icon={Copy01Icon} size={32} color="currentColor" strokeWidth={2} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Right side - Message metadata stats popover */}
              {meta && (
                <div className="flex items-center">
                  <HoverCard openDelay={100} closeDelay={100}>
                    <HoverCardTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 p-0 rounded-full touch-manipulation"
                        onTouchStart={() => { }} // Enable touch events
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
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Handle reasoning parts
    if (part.type === 'reasoning') {
      // If previous part is also reasoning, skip rendering to avoid duplicate sections
      const prevPart = parts[partIndex - 1];
      if (prevPart && prevPart.type === 'reasoning') {
        return null;
      }

      // Merge consecutive reasoning parts into a single block
      let nextIndex = partIndex;
      const mergedTexts: string[] = [];
      while (nextIndex < parts.length && parts[nextIndex]?.type === 'reasoning') {
        const r = parts[nextIndex] as unknown as ReasoningUIPart;
        if (typeof r.text === 'string' && r.text.length > 0) {
          mergedTexts.push(r.text);
        }
        nextIndex += 1;
      }

      const mergedPart: ReasoningUIPart = { ...(part as ReasoningUIPart), text: mergedTexts.join('\n\n') };

      const sectionKey = `${messageIndex}-${partIndex}`;
      const hasParallelToolInvocation = parts.some((p: ChatMessage['parts'][number]) => p.type.startsWith('tool-'));
      const isComplete = parts.some(
        (p: ChatMessage['parts'][number], i: number) =>
          i > partIndex && (p.type === 'text' || p.type.startsWith('tool-')),
      );
      const parallelTool = hasParallelToolInvocation
        ? (parts.find((p: ChatMessage['parts'][number]) => p.type.includes('tool-'))?.type.split('-')[1] ?? null)
        : null;

      const isExpanded = reasoningVisibilityMap[sectionKey] ?? !isComplete;
      const isFullscreen = reasoningFullscreenMap[sectionKey] ?? false;

      const setIsExpanded = (v: boolean) => setReasoningVisibilityMap((prev) => ({ ...prev, [sectionKey]: v }));
      const setIsFullscreen = (v: boolean) => setReasoningFullscreenMap((prev) => ({ ...prev, [sectionKey]: v }));

      return (
        <ReasoningPartView
          key={sectionKey}
          part={mergedPart}
          sectionKey={sectionKey}
          parallelTool={parallelTool}
          isExpanded={isExpanded}
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
          <div key={`${messageIndex}-${partIndex}-step-start-logo`} className="!m-0 !p-0">
            <SciraLogoHeader />
          </div>
        );
      }
      return <div key={`${messageIndex}-${partIndex}-step-start`}></div>;
    }

    // Handle tool parts with new granular states system
    if (isToolUIPart(part)) {
      // Check if this part has the new state system
      if ('state' in part && part.state) {
        switch (part.type) {
          case 'tool-find_place_on_map':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing location search...
                  </div>
                );
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
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
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
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
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
                      <Suspense fallback={<ComponentLoader />}>
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
                      </Suspense>
                    </div>

                    {/* Results list */}
                    <div className="p-3 divide-y divide-[hsl(var(--border))]">
                      {places.map((place: any, index: number) => (
                        <div key={place.place_id || index} className="py-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center">
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
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing search...
                  </div>
                );
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
                return (
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <TMDBResult result={part.output} />
                  </Suspense>
                );
            }
            break;

          case 'tool-stock_chart':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div
                    key={`${messageIndex}-${partIndex}-tool`}
                    className="flex items-center gap-3 w-full mt-4 p-3 bg-muted/30 rounded-lg border border-border/40"
                  >
                    <TrendingUpIcon className="h-4 w-4 text-primary/80" />
                    <span className="text-sm text-muted-foreground">Preparing financial analysis...</span>
                  </div>
                );
              case 'input-available':
                return (
                  <StockChartLoader
                    key={`${messageIndex}-${partIndex}-tool`}
                    title={part.input?.title}
                    input={part.input}
                  />
                );
              case 'output-available':
                return (
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <InteractiveStockChart
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
                  </Suspense>
                );
            }
            break;

          case 'tool-get_weather_data':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing weather request...
                  </div>
                );
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
                return (
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <WeatherChart result={part.output} />
                  </Suspense>
                );
            }
            break;

          case 'tool-web_search':
            switch (part.state) {
              case 'input-streaming':
              case 'input-available':
              case 'output-available':
                return (
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <MultiSearch
                      result={part.output || null}
                      args={part.input ? part.input : {}}
                      annotations={annotations as DataQueryCompletionPart[]}
                    />
                  </Suspense>
                );
            }
            break;

          case 'tool-datetime':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing time request...
                  </div>
                );
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
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <ExtremeSearch
                      // @ts-ignore - Complex type intersection resolved to never
                      toolInvocation={{ toolName: 'extreme_search', input: part.input, result: part.output }}
                      annotations={
                        (annotations?.filter(
                          (annotation) => annotation.type === 'data-extreme_search',
                        ) as DataExtremeSearchPart[]) || []
                      }
                    />
                  </Suspense>
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
                  <TranslationTool key={`${messageIndex}-${partIndex}-tool`} args={part.input} result={part.output} />
                );
            }
            break;

          case 'tool-code_context':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing code context...
                  </div>
                );
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

          case 'tool-trending_movies':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing trending movies...
                  </div>
                );
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
                return (
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <TrendingResults result={part.output} type="movie" />
                  </Suspense>
                );
            }
            break;

          case 'tool-trending_tv':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing trending TV shows...
                  </div>
                );
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
                return (
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <TrendingResults result={part.output} type="tv" />
                  </Suspense>
                );
            }
            break;

          case 'tool-academic_search':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing academic search...
                  </div>
                );
              case 'input-available':
                return (
                  <SearchLoadingState
                    key={`${messageIndex}-${partIndex}-tool`}
                    icon={Book}
                    text="Searching academic papers..."
                    color="gray"
                  />
                );
              case 'output-available':
                return (
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <AcademicPapersCard
                      response={part.output ? {
                        searches: part.output.searches?.map((search: any) => ({
                          query: search.query,
                          results: search.results?.map((result: any) => ({
                            ...result,
                            title: result.title || ('name' in result ? String(result.name) : null) || 'Untitled',
                          })) || [],
                        })) || [],
                      } : null}
                      args={part.input ? part.input : {}}
                    />
                  </Suspense>
                );
            }
            break;

          case 'tool-track_flight':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing flight tracking...
                  </div>
                );
              case 'input-available':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Plane className="h-5 w-5 text-neutral-700 dark:text-neutral-300 animate-pulse" />
                      <span className="text-neutral-700 dark:text-neutral-300 text-lg">
                        Tracking flight {part.input.carrierCode}
                        {part.input.flightNumber}...
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      {[0, 1, 2].map((index) => (
                        <motion.div
                          key={index}
                          className="w-2 h-2 bg-neutral-400 dark:bg-neutral-600 rounded-full"
                          initial={{ opacity: 0.3 }}
                          animate={{ opacity: 1 }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.8,
                            delay: index * 0.2,
                            repeatType: 'reverse',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              case 'output-available':
                return (
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <FlightTracker data={part.output} />
                  </Suspense>
                );
            }
            break;

          case 'tool-reddit_search':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing Reddit search...
                  </div>
                );
              case 'input-available':
                return (
                  <SearchLoadingState
                    key={`${messageIndex}-${partIndex}-tool`}
                    icon={RedditLogoIcon}
                    text="Searching Reddit..."
                    color="orange"
                  />
                );
              case 'output-available':
                return (
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <RedditSearch
                      result={part.output || null}
                      args={part.input ? part.input : {}}
                    />
                  </Suspense>
                );
            }
            break;

          case 'tool-x_search':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing X search...
                  </div>
                );
              case 'input-available':
                return (
                  <SearchLoadingState
                    key={`${messageIndex}-${partIndex}-tool`}
                    icon={XLogoIcon}
                    text="Searching X (Twitter)..."
                    color="gray"
                  />
                );
              case 'output-available':
                return (
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <XSearch
                      result={{
                        ...part.output,
                        searches: part.output.searches?.map((search: any) => ({
                          ...search,
                          query: search.query || '',
                          sources: search.sources?.filter((s: any): s is NonNullable<typeof s> => s !== null) || [],
                          citations:
                            search.citations?.map((citation: any) => ({
                              ...citation,
                              title: citation.title || ('url' in citation ? citation.url : citation.id) || 'Citation',
                              url: 'url' in citation ? citation.url : citation.id,
                            })) || [],
                        })) || [],
                        dateRange: part.output.dateRange || '',
                        handles: part.output.handles || [],
                      }}
                      args={part.input ? part.input : {}}
                    />
                  </Suspense>
                );
            }
            break;

          case 'tool-youtube_search':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing YouTube search...
                  </div>
                );
              case 'input-available':
                return (
                  <SearchLoadingState
                    key={`${messageIndex}-${partIndex}-tool`}
                    icon={YoutubeIcon}
                    text="Searching YouTube..."
                    color="red"
                  />
                );
              case 'output-available':
                return (
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <YouTubeSearchResults results={part.output} />
                  </Suspense>
                );
            }
            break;

          case 'tool-search_memories':
            switch (part.state) {
              case 'input-streaming':
                return <div className="text-sm text-neutral-500">Preparing memory search...</div>;
              case 'input-available':
                return <SearchLoadingState icon={MemoryIcon} text="Searching memories..." color="blue" />;
              case 'output-available':
                // Handle error responses
                if (!part.output.success) {
                  return (
                    <div className="w-full my-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
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
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
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
                return <div className="text-sm text-neutral-500">Preparing to add memory...</div>;
              case 'input-available':
                return <SearchLoadingState icon={MemoryIcon} text="Adding memory..." color="green" />;
              case 'output-available':
                // Handle error responses
                if (!part.output.success) {
                  return (
                    <div className="w-full my-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center">
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
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Searching your connected documents...
                  </div>
                );
              case 'input-available':
                return (
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <ConnectorsSearchResults
                      results={[]}
                      query={part.input?.query || ''}
                      totalResults={0}
                      isLoading={true}
                    />
                  </Suspense>
                );
              case 'output-available':
                return (
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <ConnectorsSearchResults
                      results={part.output?.success ? part.output.results : []}
                      query={part.output?.success ? part.output.query : ''}
                      totalResults={part.output?.success ? part.output.count : 0}
                    />
                  </Suspense>
                );
            }
            break;

          case 'tool-nearby_places_search':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing nearby search...
                  </div>
                );
              case 'input-available':
                return (
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <NearbySearchSkeleton type={part.input?.type || 'places'} />
                  </Suspense>
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
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <NearbySearchMapView
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
                  </Suspense>
                );
            }
            break;

          case 'tool-currency_converter':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing currency conversion...
                  </div>
                );
              case 'input-available':
              case 'output-available':
                return (
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <CurrencyConverter
                      toolInvocation={{ toolName: 'currency_converter', input: part.input, result: part.output }}
                      result={part.output}
                    />
                  </Suspense>
                );
            }
            break;

          case 'tool-code_interpreter':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing code execution...
                  </div>
                );
              case 'input-available':
              case 'output-available':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="space-y-3 w-full overflow-hidden">
                    <Suspense fallback={<ComponentLoader />}>
                      <CodeInterpreterView
                        code={part.input?.code}
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
                    </Suspense>

                    {part.output?.chart && (
                      <div className="pt-1 overflow-x-auto">
                        <Suspense fallback={<ComponentLoader />}>
                          <InteractiveChart chart={part.output.chart} />
                        </Suspense>
                      </div>
                    )}
                  </div>
                );
            }
            break;

          case 'tool-retrieve':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing content retrieval...
                  </div>
                );
              case 'input-available':
                return (
                  <div
                    key={`${messageIndex}-${partIndex}-tool`}
                    className="border border-neutral-200 rounded-xl my-4 overflow-hidden dark:border-neutral-800 bg-white dark:bg-neutral-900"
                  >
                    <div className="h-36 bg-neutral-50 dark:bg-neutral-800/50 animate-pulse relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/10 dark:to-black/10" />
                    </div>
                    <div className="p-4">
                      <div className="flex gap-3">
                        <div className="relative w-12 h-12 shrink-0 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse">
                          <Globe className="h-5 w-5 text-neutral-300 dark:text-neutral-700 absolute inset-0 m-auto" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="space-y-2">
                            <div className="h-6 w-full bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-md" />
                            <div className="flex gap-2">
                              <div className="h-4 w-24 bg-violet-100 dark:bg-violet-900/30 animate-pulse rounded-md" />
                              <div className="h-4 w-32 bg-emerald-100 dark:bg-emerald-900/30 animate-pulse rounded-md" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-md" />
                            <div className="h-3 w-4/5 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-md" />
                          </div>
                          <div className="flex justify-between items-center pt-2">
                            <div className="h-4 w-24 bg-blue-100 dark:bg-blue-900/30 animate-pulse rounded-md" />
                            <div className="h-4 w-32 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-md" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-neutral-200 dark:border-neutral-800">
                      <div className="p-3 flex items-center gap-2">
                        <div className="h-4 w-4 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded" />
                        <div className="h-4 w-28 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-md" />
                      </div>
                    </div>
                  </div>
                );
              case 'output-available':
                // Handle error responses
                if (
                  (part.output && 'error' in part.output && part.output.error) ||
                  (part.output.results &&
                    part.output.results[0] &&
                    'error' in part.output.results[0] &&
                    part.output.results[0].error)
                ) {
                  const errorMessage = String(
                    (part.output && 'error' in part.output && part.output.error) ||
                    (part.output.results &&
                      part.output.results[0] &&
                      'error' in part.output.results[0] &&
                      part.output.results[0].error),
                  );
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
                          <div className="text-red-600/80 dark:text-red-400/80 text-xs mt-1">{errorMessage}</div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Handle no content
                if (!part.output.results || part.output.results.length === 0) {
                  return (
                    <div
                      key={`${messageIndex}-${partIndex}-tool`}
                      className="border border-amber-200 dark:border-amber-500 rounded-xl my-4 p-4 bg-amber-50 dark:bg-amber-950/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
                          <Globe className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                        </div>
                        <div className="text-amber-700 dark:text-amber-300 text-sm font-medium">
                          No content available
                        </div>
                      </div>
                    </div>
                  );
                }

                // Beautiful, sophisticated rendering for Exa AI retrieval
                const result = part.output;
                return (
                  <div
                    key={`${messageIndex}-${partIndex}-tool`}
                    className="border border-neutral-200 rounded-xl my-4 overflow-hidden dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm"
                  >
                    {result.results[0].image && (
                      <div className="h-36 overflow-hidden relative">
                        <Image
                          src={result.results[0].image}
                          alt={result.results[0].title || 'Featured image'}
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
                          {result.results[0].favicon ? (
                            <Image
                              className="w-full h-full object-contain rounded-lg"
                              src={result.results[0].favicon}
                              alt=""
                              width={64}
                              height={64}
                              unoptimized
                              onError={(e) => {
                                e.currentTarget.src = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(
                                  result.results[0].url,
                                )}`;
                              }}
                            />
                          ) : (
                            <Image
                              className="w-full h-full object-contain rounded-lg"
                              src={`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(
                                result.results[0].url,
                              )}`}
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
                              {result.results[0].title || 'Retrieved Content'}
                            </h2>
                            <div className="hidden group-hover:block absolute bg-white dark:bg-neutral-900 shadow-lg rounded-lg p-2 -mt-1 max-w-lg z-10 border border-neutral-200 dark:border-neutral-800">
                              <p className="text-sm text-neutral-900 dark:text-neutral-100">
                                {result.results[0].title || 'Retrieved Content'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {result.results[0].author && (
                              <Badge
                                variant="secondary"
                                className="rounded-md bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-0 transition-colors"
                              >
                                <User2 className="h-3 w-3 mr-1" />
                                {result.results[0].author}
                              </Badge>
                            )}
                            {result.results[0].publishedDate && (
                              <Badge
                                variant="secondary"
                                className="rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-0 transition-colors"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(result.results[0].publishedDate).toLocaleDateString()}
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
                        {result.results[0].description || 'No description available'}
                      </p>

                      <div className="mt-3 flex justify-between items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-0 transition-colors cursor-pointer"
                          >
                            <a
                              href={result.results[0].url}
                              target="_blank"
                              className="inline-flex items-center gap-1.5"
                            >
                              <ArrowUpRight className="h-3 w-3" />
                              View source
                            </a>
                          </Badge>

                          {result.results.length > 1 && (
                            <Badge
                              variant="secondary"
                              className="rounded-md bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-0 transition-colors"
                            >
                              <TextIcon className="h-3 w-3 mr-1" />
                              {result.results.length} pages
                            </Badge>
                          )}
                        </div>

                        <Badge
                          variant="secondary"
                          className="rounded-md bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 border-0 transition-colors"
                        >
                          <Globe className="h-3 w-3 mr-1" />
                          {new URL(result.results[0].url).hostname.replace('www.', '')}
                        </Badge>
                      </div>
                    </div>

                    <div className="border-t border-neutral-200 dark:border-neutral-800">
                      <Accordion type="single" collapsible>
                        {result.results.map((resultItem: any, index: number) => (
                          <AccordionItem value={`content${index}`} key={index} className="border-0">
                            <AccordionTrigger className="group px-4 py-3 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors no-underline! rounded-t-none! data-[state=open]:rounded-b-none! data-[state=open]:bg-neutral-50 dark:data-[state=open]:bg-neutral-800/50 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-neutral-500 [&>svg]:transition-transform [&>svg]:duration-200">
                              <div className="flex items-center gap-2">
                                <TextIcon className="h-3.5 w-3.5 text-neutral-400" />
                                <span>{index === 0 ? 'View full content' : `Additional content ${index + 1}`}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-0">
                              <div className="max-h-[50vh] overflow-y-auto p-4 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700">
                                <div className="prose prose-neutral dark:prose-invert prose-sm max-w-none">
                                  <ReactMarkdown>{resultItem.content || 'No content available'}</ReactMarkdown>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  </div>
                );
            }
            break;

          case 'tool-coin_ohlc':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing OHLC data...
                  </div>
                );
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
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <CryptoChart result={part.output} coinId={part.input.coinId} chartType="candlestick" />
                  </Suspense>
                );
            }
            break;

          case 'tool-coin_data':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing coin data...
                  </div>
                );
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
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <CryptoCoinsData result={part.output} coinId={part.input.coinId} />
                  </Suspense>
                );
            }
            break;

          case 'tool-coin_data_by_contract':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing token data...
                  </div>
                );
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
                  <Suspense fallback={<ComponentLoader />} key={`${messageIndex}-${partIndex}-tool`}>
                    <CryptoCoinsData result={part.output} contractAddress={part.input.contractAddress} />
                  </Suspense>
                );
            }
            break;

          case 'tool-greeting':
            switch (part.state) {
              case 'input-streaming':
                return (
                  <div key={`${messageIndex}-${partIndex}-tool`} className="text-sm text-neutral-500">
                    Preparing greeting...
                  </div>
                );
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
                    toast.success('Code context copied to clipboard');
                  }}
                  className="h-6 w-6 p-0 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <HugeiconsIcon
                    icon={Copy01Icon}
                    size={12}
                    color="currentColor"
                    strokeWidth={2}
                    className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                  />
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
                      <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed break-words">
                        {!isExpanded && previewText}
                      </div>
                      <AccordionTrigger className="py-2 hover:no-underline text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                        {isExpanded ? 'Show less' : 'Show full context'}
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed break-words whitespace-pre-wrap pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60">
                          {responseText}
                        </div>
                      </AccordionContent>
                    </div>
                  </AccordionItem>
                </Accordion>
              ) : (
                <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed break-words whitespace-pre-wrap">
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

// Translation tool component with audio features
const TranslationTool: React.FC<{ args: any; result: any }> = ({ args, result }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveRef = useRef<Wave | null>(null);

  useEffect(() => {
    const _audioRef = audioRef.current;
    return () => {
      if (_audioRef) {
        _audioRef.pause();
        _audioRef.src = '';
      }
    };
  }, []);

  useEffect(() => {
    if (audioUrl && audioRef.current && canvasRef.current) {
      waveRef.current = new Wave(audioRef.current, canvasRef.current);
      waveRef.current.addAnimation(
        new waveRef.current.animations.Lines({
          lineWidth: 3,
          lineColor: 'rgb(82, 82, 91)',
          count: 80,
          mirroredY: true,
        }),
      );
    }
  }, [audioUrl]);

  const handlePlayPause = async () => {
    if (!audioUrl && !isGeneratingAudio) {
      setIsGeneratingAudio(true);
      try {
        const { audio } = await generateSpeech(result.translatedText);
        setAudioUrl(audio);
        setIsGeneratingAudio(false);
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
          }
        }, 100);
      } catch (error) {
        console.error('Error generating speech:', error);
        setIsGeneratingAudio(false);
      }
    } else if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

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

  return (
    <div className="group my-2 rounded-md border border-neutral-200/60 dark:border-neutral-700/60 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm hover:border-neutral-300 dark:hover:border-neutral-600 transition-all duration-200">
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-5 h-5 rounded-md bg-neutral-600 flex items-center justify-center">
            <TextIcon className="w-2.5 h-2.5 text-white" />
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">Translation</span>
              <span className="text-neutral-400">•</span>
              <span className="text-neutral-500 dark:text-neutral-400">
                {result.detectedLanguage} → {args ? args.to : ''}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="group/text">
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 opacity-70">
                  {result.detectedLanguage}
                </div>
                <div className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed break-words">
                  {args ? args.text : ''}
                </div>
              </div>

              <div className="group/text">
                <div className="text-xs text-neutral-600 dark:text-neutral-400 mb-1 opacity-70">
                  {args ? args.to : ''}
                </div>
                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 leading-relaxed break-words">
                  {result.translatedText}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handlePlayPause}
                disabled={isGeneratingAudio}
                className={cn(
                  'w-5 h-5 rounded-sm flex items-center justify-center transition-all duration-150',
                  isPlaying
                    ? 'bg-neutral-700 text-white shadow-sm'
                    : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200',
                )}
              >
                {isGeneratingAudio ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-2.5 h-2.5" />
                ) : (
                  <PlayIcon className="w-2.5 h-2.5" />
                )}
              </button>

              <div className="flex-1 h-5 bg-neutral-100/80 dark:bg-neutral-800/80 rounded-sm overflow-hidden">
                {!audioUrl && !isGeneratingAudio && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-full h-0.5 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  width="800"
                  height="40"
                  className="w-full h-full"
                  style={{ imageRendering: 'crisp-edges' }}
                />
              </div>

              <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                {isGeneratingAudio ? '...' : audioUrl ? '●' : '○'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
        />
      )}
    </div>
  );
};

MessagePartRenderer.displayName = 'MessagePartRenderer';
