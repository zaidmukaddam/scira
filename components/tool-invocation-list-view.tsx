/* eslint-disable @next/next/no-img-element */
"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ToolInvocation, UIMessage } from 'ai';
import { motion } from 'framer-motion';
import { Wave } from "@foobar404/wave";
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ArrowUpRight, LucideIcon, User2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

// UI Components
import { BorderTrail } from '@/components/core/border-trail';
import { TextShimmer } from '@/components/core/text-shimmer';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from '@/components/ui/scroll-area';

// Icons
import {
    Book,
    Building,
    ChevronDown,
    Cloud,
    Copy,
    ExternalLink,
    Film,
    Globe,
    Loader2,
    MapPin,
    Pause,
    Plane,
    Play as PlayIcon,
    Server,
    TextIcon,
    TrendingUpIcon,
    Tv,
    XCircle,
    YoutubeIcon,
} from 'lucide-react';
import { Memory, Clock as PhosphorClock, RedditLogo, RoadHorizon } from '@phosphor-icons/react';

// Components
import { FlightTracker } from '@/components/flight-tracker';
import InteractiveChart from '@/components/interactive-charts';
import { MapComponent, MapContainer } from '@/components/map-components';
import TMDBResult from '@/components/movie-info';
import MultiSearch from '@/components/multi-search';
import NearbySearchMapView from '@/components/nearby-search-map-view';
import TrendingResults from '@/components/trending-tv-movies-results';
import AcademicPapersCard from '@/components/academic-papers';
import WeatherChart from '@/components/weather-chart';
import InteractiveStockChart from '@/components/interactive-stock-chart';
import { CurrencyConverter } from '@/components/currency_conv';
import { ExtremeSearch } from '@/components/extreme-search';
import MemoryManager from '@/components/memory-manager';
import MCPServerList from '@/components/mcp-server-list';
import RedditSearch from '@/components/reddit-search';

// Actions
import { generateSpeech } from '@/app/actions';
import Image from 'next/image';

// Interfaces
interface VideoDetails {
    title?: string;
    author_name?: string;
    author_url?: string;
    thumbnail_url?: string;
    type?: string;
    provider_name?: string;
    provider_url?: string;
    height?: number;
    width?: number;
}

interface VideoResult {
    videoId: string;
    url: string;
    details?: VideoDetails;
    captions?: string;
    timestamps?: string[];
    views?: string;
    likes?: string;
    summary?: string;
}

interface YouTubeSearchResponse {
    results: VideoResult[];
}

interface YouTubeCardProps {
    video: VideoResult;
    index: number;
}

// Now adding the SearchLoadingState component
const SearchLoadingState = ({
    icon: Icon,
    text,
    color
}: {
    icon: LucideIcon,
    text: string,
    color: "red" | "green" | "orange" | "violet" | "gray" | "blue"
}) => {
    const colorVariants = {
        red: {
            background: "bg-red-50 dark:bg-red-950",
            border: "from-red-200 via-red-500 to-red-200 dark:from-red-400 dark:via-red-500 dark:to-red-700",
            text: "text-red-500",
            icon: "text-red-500"
        },
        green: {
            background: "bg-green-50 dark:bg-green-950",
            border: "from-green-200 via-green-500 to-green-200 dark:from-green-400 dark:via-green-500 dark:to-green-700",
            text: "text-green-500",
            icon: "text-green-500"
        },
        orange: {
            background: "bg-orange-50 dark:bg-orange-950",
            border: "from-orange-200 via-orange-500 to-orange-200 dark:from-orange-400 dark:via-orange-500 dark:to-orange-700",
            text: "text-orange-500",
            icon: "text-orange-500"
        },
        violet: {
            background: "bg-violet-50 dark:bg-violet-950",
            border: "from-violet-200 via-violet-500 to-violet-200 dark:from-violet-400 dark:via-violet-500 dark:to-violet-700",
            text: "text-violet-500",
            icon: "text-violet-500"
        },
        gray: {
            background: "bg-neutral-50 dark:bg-neutral-950",
            border: "from-neutral-200 via-neutral-500 to-neutral-200 dark:from-neutral-400 dark:via-neutral-500 dark:to-neutral-700",
            text: "text-neutral-500",
            icon: "text-neutral-500"
        },
        blue: {
            background: "bg-blue-50 dark:bg-blue-950",
            border: "from-blue-200 via-blue-500 to-blue-200 dark:from-blue-400 dark:via-blue-500 dark:to-blue-700",
            text: "text-blue-500",
            icon: "text-blue-500"
        }
    };

    const variant = colorVariants[color];

    return (
        <Card className="relative w-full h-[100px] my-4 overflow-hidden shadow-none">
            <BorderTrail
                className={cn(
                    'bg-linear-to-l',
                    variant.border
                )}
                size={80}
            />
            <CardContent className="px-6!">
                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "relative h-10 w-10 rounded-full flex items-center justify-center",
                            variant.background
                        )}>
                            <BorderTrail
                                className={cn(
                                    "bg-linear-to-l",
                                    variant.border
                                )}
                                size={40}
                            />
                            <Icon className={cn("h-5 w-5", variant.icon)} />
                        </div>
                        <div className="space-y-2">
                            <TextShimmer
                                className="text-base font-medium"
                                duration={2}
                            >
                                {text}
                            </TextShimmer>
                            <div className="flex gap-2">
                                {[...Array(3)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse"
                                        style={{
                                            width: `${Math.random() * 40 + 20}px`,
                                            animationDelay: `${i * 0.2}s`
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const YouTubeCard: React.FC<YouTubeCardProps> = ({ video, index }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!video) return null;

    // Format timestamp for accessibility
    const formatTimestamp = (timestamp: string) => {
        const match = timestamp.match(/(\d+:\d+(?::\d+)?) - (.+)/);
        if (match) {
            const [_, time, description] = match;
            return { time, description };
        }
        return { time: "", description: timestamp };
    };

    // Prevent event propagation to allow scrolling during streaming
    const handleScrollableAreaEvents = (e: React.UIEvent) => {
        e.stopPropagation();
    };

    return (
        <div
            className="w-[280px] shrink-0 rounded-lg border dark:border-neutral-800 border-neutral-200 overflow-hidden bg-white dark:bg-neutral-900 shadow-xs hover:shadow-md transition-shadow duration-200"
            onTouchStart={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <Link
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative aspect-video block bg-neutral-100 dark:bg-neutral-800 overflow-hidden"
                aria-label={`Watch ${video.details?.title || 'YouTube video'}`}
            >
                {video.details?.thumbnail_url ? (
                    <img
                        src={video.details.thumbnail_url}
                        alt=""
                        aria-hidden="true"
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <YoutubeIcon className="h-8 w-8 text-red-500" />
                    </div>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="absolute bottom-2 left-2 right-2 text-white text-xs font-medium line-clamp-2">
                        {video.details?.title || 'YouTube Video'}
                    </div>
                    <div className="rounded-full bg-white/90 p-2">
                        <PlayIcon className="h-6 w-6 text-red-600" />
                    </div>
                </div>
            </Link>

            <div className="p-3 flex flex-col gap-2">
                <div>
                    <Link
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium line-clamp-2 hover:text-red-500 transition-colors dark:text-neutral-100"
                    >
                        {video.details?.title || 'YouTube Video'}
                    </Link>

                    {video.details?.author_name && (
                        <Link
                            href={video.details.author_url || video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 group mt-1.5 w-fit"
                            aria-label={`Channel: ${video.details.author_name}`}
                        >
                            <div className="h-5 w-5 rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center shrink-0">
                                <User2 className="h-3 w-3 text-red-500" />
                            </div>
                            <span className="text-xs text-neutral-600 dark:text-neutral-400 group-hover:text-red-500 transition-colors truncate">
                                {video.details.author_name}
                            </span>
                        </Link>
                    )}
                </div>

                {(video.timestamps && video.timestamps?.length > 0 || video.captions) && (
                    <div className="mt-1">
                        <Accordion type="single" collapsible>
                            <AccordionItem value="details" className="border-none">
                                <AccordionTrigger className="py-1 hover:no-underline">
                                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-red-500 dark:hover:text-red-400">
                                        {isExpanded ? 'Hide details' : 'Show details'}
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent>
                                    {video.timestamps && video.timestamps.length > 0 && (
                                        <div className="mt-2 space-y-1.5">
                                            <h4 className="text-xs font-semibold dark:text-neutral-300 text-neutral-700">Key Moments</h4>
                                            <ScrollArea className="h-[120px]">
                                                <div className="pr-4">
                                                    {video.timestamps.map((timestamp, i) => {
                                                        const { time, description } = formatTimestamp(timestamp);
                                                        return (
                                                            <Link
                                                                key={i}
                                                                href={`${video.url}&t=${time.split(':').reduce((acc, time, i, arr) => {
                                                                    if (arr.length === 2) { // MM:SS format
                                                                        return i === 0 ? acc + parseInt(time) * 60 : acc + parseInt(time);
                                                                    } else { // HH:MM:SS format
                                                                        return i === 0 ? acc + parseInt(time) * 3600 :
                                                                            i === 1 ? acc + parseInt(time) * 60 :
                                                                                acc + parseInt(time);
                                                                    }
                                                                }, 0)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-start gap-2 py-1 px-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                                                            >
                                                                <span className="text-xs font-medium text-red-500 whitespace-nowrap">{time}</span>
                                                                <span className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-1">{description}</span>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    )}

                                    {video.captions && (
                                        <div className="mt-3 space-y-1.5">
                                            <h4 className="text-xs font-semibold dark:text-neutral-300 text-neutral-700">Transcript</h4>
                                            <ScrollArea className="h-[120px]">
                                                <div className="text-xs dark:text-neutral-400 text-neutral-600 rounded bg-neutral-50 dark:bg-neutral-800 p-2">
                                                    <p className="whitespace-pre-wrap">
                                                        {video.captions}
                                                    </p>
                                                </div>
                                            </ScrollArea>
                                        </div>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                )}
            </div>
        </div>
    );
};

// Memoize the YouTubeCard component with a more comprehensive equality function
const MemoizedYouTubeCard = React.memo(YouTubeCard, (prevProps, nextProps) => {
    // Deep comparison of video properties that matter for rendering
    return (
        prevProps.video.videoId === nextProps.video.videoId &&
        prevProps.index === nextProps.index &&
        prevProps.video.url === nextProps.video.url &&
        JSON.stringify(prevProps.video.details) === JSON.stringify(nextProps.video.details)
    );
});

// Modern code interpreter components
const LineNumbers = memo(({ count }: { count: number }) => (
    <div className="hidden sm:block select-none w-8 sm:w-10 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800/30 py-0">
        {Array.from({ length: count }, (_, i) => (
            <div
                key={i}
                className="text-[10px] h-[20px] flex items-center justify-end text-neutral-500 dark:text-neutral-400 pr-2 font-mono"
            >
                {i + 1}
            </div>
        ))}
    </div>
));
LineNumbers.displayName = 'LineNumbers';

const StatusBadge = memo(({ status }: { status: 'running' | 'completed' | 'error' }) => {
    if (status === 'completed') return null;

    if (status === 'error') {
        return (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-md text-[9px] font-medium">
                <XCircle className="h-2.5 w-2.5" />
                <span className="hidden sm:inline">Error</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-500/20">
            <Loader2 className="h-2.5 w-2.5 animate-spin text-blue-500" />
            <span className="hidden sm:inline text-[9px] font-medium text-blue-600 dark:text-blue-400">
                Running
            </span>
        </div>
    );
});
StatusBadge.displayName = 'StatusBadge';

const CodeBlock = memo(({
    code,
    language
}: {
    code: string;
    language: string;
}) => {
    const lines = code.split('\n');
    return (
        <div className="flex bg-neutral-50 dark:bg-neutral-900/70">
            <LineNumbers count={lines.length} />
            <div className="overflow-x-auto w-full">
                <pre className="py-0 px-2 sm:px-3 m-0 font-mono text-[11px] sm:text-xs leading-[20px] text-neutral-800 dark:text-neutral-300">
                    {code}
                </pre>
            </div>
        </div>
    );
});
CodeBlock.displayName = 'CodeBlock';

const OutputBlock = memo(({
    output,
    error
}: {
    output?: string;
    error?: string;
}) => {
    if (!output && !error) return null;

    return (
        <div className={cn(
            "font-mono text-[11px] sm:text-xs leading-[20px] py-0 px-2 sm:px-3",
            error
                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                : "bg-neutral-100 dark:bg-neutral-800/50 text-neutral-700 dark:text-neutral-300"
        )}>
            <pre className="whitespace-pre-wrap overflow-x-auto">
                {error || output}
            </pre>
        </div>
    );
});
OutputBlock.displayName = 'OutputBlock';

function CodeInterpreterView({
    code,
    output,
    language = "python",
    title,
    status,
    error,
}: {
    code: string;
    output?: string;
    language?: string;
    title?: string;
    status?: 'running' | 'completed' | 'error';
    error?: string;
}) {
    // Set initial state based on status - expanded while running, collapsed when complete
    const [isExpanded, setIsExpanded] = useState(status !== 'completed');

    // Update expanded state when status changes
    useEffect(() => {
        // If status changes to completed, collapse the code section
        if (status === 'completed' && (output || error)) {
            setIsExpanded(false);
        }
        // Keep expanded during running or error states
        else if (status === 'running' || status === 'error') {
            setIsExpanded(true);
        }
    }, [status, output, error]);

    return (
        <div className="group overflow-hidden bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200 hover:shadow">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between px-2.5 sm:px-3 py-2 bg-neutral-50 dark:bg-neutral-800/30 border-b border-neutral-200 dark:border-neutral-800 gap-2">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-700/50">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <div className="text-[9px] font-medium font-mono text-neutral-500 dark:text-neutral-400 uppercase">
                            {language}
                        </div>
                    </div>
                    <h3 className="text-xs font-medium text-neutral-700 dark:text-neutral-200 truncate max-w-[160px] sm:max-w-xs">
                        {title || "Code Execution"}
                    </h3>
                    <StatusBadge status={status || 'completed'} />
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
                    <CopyButton text={code} />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-6 w-6 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                    >
                        <ChevronDown className={cn(
                            "h-3.5 w-3.5 transition-transform duration-200",
                            isExpanded ? "rotate-180" : ""
                        )} />
                    </Button>
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <div>
                    <div className="max-w-full overflow-x-auto max-h-60 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                        <CodeBlock code={code} language={language} />
                    </div>
                    {(output || error) && (
                        <>
                            <div className="border-t border-neutral-200 dark:border-neutral-800 px-2.5 sm:px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800/30">
                                <div className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                                    {error ? 'Error Output' : 'Execution Result'}
                                </div>
                            </div>
                            <div className="max-w-full overflow-x-auto max-h-60 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                                <OutputBlock output={output} error={error} />
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// Missing icon reference in CollapsibleSection
const Code = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
);

// Missing icon reference in CollapsibleSection
const Check = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

const CopyButton = memo(({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className={cn(
                "h-7 w-7 transition-colors duration-150",
                copied ? "text-green-500" : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            )}
        >
            {copied ? (
                <Check className="h-3.5 w-3.5" />
            ) : (
                <Copy className="h-3.5 w-3.5" />
            )}
        </Button>
    );
});
CopyButton.displayName = 'CopyButton';

// Now let's add the ToolInvocationListView 
const ToolInvocationListView = memo(
    ({ toolInvocations, message, annotations }: { toolInvocations: ToolInvocation[]; message: UIMessage; annotations: any }) => {
        const renderToolInvocation = useCallback(
            (toolInvocation: ToolInvocation, index: number) => {
                const args = JSON.parse(JSON.stringify(toolInvocation.args));
                const result = 'result' in toolInvocation ? JSON.parse(JSON.stringify(toolInvocation.result)) : null;

                if (toolInvocation.toolName === 'find_place') {
                    if (!result) {
                        return <SearchLoadingState
                            icon={MapPin}
                            text="Finding locations..."
                            color="blue"
                        />;
                    }

                    const { features } = result;
                    if (!features || features.length === 0) return null;

                    return (
                        <Card className="w-full my-4 overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                            <div className="relative w-full h-[60vh]">
                                <div className="absolute top-4 left-4 z-10 flex gap-2">
                                    <Badge
                                        variant="secondary"
                                        className="bg-white/90 dark:bg-black/90 backdrop-blur-xs"
                                    >
                                        {features.length} Locations Found
                                    </Badge>
                                </div>

                                <MapComponent
                                    center={{
                                        lat: features[0].geometry.coordinates[1],
                                        lng: features[0].geometry.coordinates[0],
                                    }}
                                    places={features.map((feature: any) => ({
                                        name: feature.name,
                                        location: {
                                            lat: feature.geometry.coordinates[1],
                                            lng: feature.geometry.coordinates[0],
                                        },
                                        vicinity: feature.formatted_address,
                                    }))}
                                    zoom={features.length > 1 ? 12 : 15}
                                />
                            </div>

                            <div className="max-h-[300px] overflow-y-auto border-t border-neutral-200 dark:border-neutral-800">
                                {features.map((place: any, index: any) => {
                                    const isGoogleResult = place.source === 'google';

                                    return (
                                        <div
                                            key={place.id || index}
                                            className={cn(
                                                "p-4",
                                                index !== features.length - 1 && "border-b border-neutral-200 dark:border-neutral-800"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-xl bg-linear-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                                                    {place.feature_type === 'street_address' || place.feature_type === 'street' ? (
                                                        <RoadHorizon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                                    ) : place.feature_type === 'locality' ? (
                                                        <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                                    ) : (
                                                        <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                                                        {place.name}
                                                    </h3>
                                                    {place.formatted_address && (
                                                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                                            {place.formatted_address}
                                                        </p>
                                                    )}
                                                    <Badge variant="secondary" className="mt-2">
                                                        {place.feature_type.replace(/_/g, ' ')}
                                                    </Badge>
                                                </div>

                                                <div className="flex gap-2">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        const coords = `${place.geometry.coordinates[1]},${place.geometry.coordinates[0]}`;
                                                                        navigator.clipboard.writeText(coords);
                                                                        toast.success("Coordinates copied!");
                                                                    }}
                                                                    className="h-10 w-10"
                                                                >
                                                                    <Copy className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Copy Coordinates</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        const url = isGoogleResult
                                                                            ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
                                                                            : `https://www.google.com/maps/search/?api=1&query=${place.geometry.coordinates[1]},${place.geometry.coordinates[0]}`;
                                                                        window.open(url, '_blank');
                                                                    }}
                                                                    className="h-10 w-10"
                                                                >
                                                                    <ExternalLink className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>View in Maps</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    );
                }

                if (toolInvocation.toolName === 'movie_or_tv_search') {
                    if (!result) {
                        return <SearchLoadingState
                            icon={Film}
                            text="Discovering entertainment content..."
                            color="violet"
                        />;
                    }

                    return <TMDBResult result={result} />;
                }

                if (toolInvocation.toolName === 'trending_movies') {
                    if (!result) {
                        return <SearchLoadingState
                            icon={Film}
                            text="Loading trending movies..."
                            color="blue"
                        />;
                    }
                    return <TrendingResults result={result} type="movie" />;
                }

                if (toolInvocation.toolName === 'trending_tv') {
                    if (!result) {
                        return <SearchLoadingState
                            icon={Tv}
                            text="Loading trending TV shows..."
                            color="blue"
                        />;
                    }
                    return <TrendingResults result={result} type="tv" />;
                }

                if (toolInvocation.toolName === 'youtube_search') {
                    if (!result) {
                        return <SearchLoadingState
                            icon={YoutubeIcon}
                            text="Searching YouTube videos..."
                            color="red"
                        />;
                    }

                    const youtubeResult = result as YouTubeSearchResponse;

                    // Filter out videos with no meaningful content
                    const filteredVideos = youtubeResult.results.filter(video =>
                        (video.timestamps && video.timestamps.length > 0) ||
                        video.captions ||
                        video.summary
                    );

                    // If no videos with content, show a message instead
                    if (filteredVideos.length === 0) {
                        return (
                            <div className="rounded-xl overflow-hidden border dark:border-neutral-800 border-neutral-200 bg-white dark:bg-neutral-900 shadow-xs p-4 text-center">
                                <div className="flex flex-col items-center gap-3 py-6">
                                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/30">
                                        <YoutubeIcon className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div className="text-center">
                                        <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                                            No Content Available
                                        </h2>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                            The videos found don&apos;t contain any timestamps or transcripts.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div className="w-full my-4">
                            <Accordion type="single" collapsible defaultValue="videos">
                                <AccordionItem value="videos" className="border dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900 shadow-xs">
                                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center h-9 w-9 rounded-full bg-red-50 dark:bg-red-950/30">
                                                <YoutubeIcon className="h-5 w-5 text-red-600" />
                                            </div>
                                            <div>
                                                <h2 className="text-base font-medium text-neutral-900 dark:text-neutral-100 text-left">
                                                    YouTube Results
                                                </h2>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Badge variant="secondary" className="px-2 py-0 h-5 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                                                        {filteredVideos.length} videos with content
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="relative">
                                            <div className="w-full overflow-x-scroll">
                                                <div className="flex gap-3 p-4">
                                                    {filteredVideos.map((video, index) => (
                                                        <MemoizedYouTubeCard
                                                            key={video.videoId}
                                                            video={video}
                                                            index={index}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                            {filteredVideos.length > 3 && (
                                                <div className="absolute right-0 top-0 bottom-0 w-16 bg-linear-to-l from-white dark:from-neutral-900 to-transparent pointer-events-none" />
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                    );
                }

                if (toolInvocation.toolName === 'academic_search') {
                    if (!result) {
                        return <SearchLoadingState
                            icon={Book}
                            text="Searching academic papers..."
                            color="violet"
                        />;
                    }

                    return <AcademicPapersCard results={result.results} />;
                }

                if (toolInvocation.toolName === 'nearby_search') {
                    if (!result) {
                        return (
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5 text-neutral-700 dark:text-neutral-300 animate-pulse" />
                                    <span className="text-neutral-700 dark:text-neutral-300 text-lg">
                                        Finding nearby {args.type}...
                                    </span>
                                </div>
                                <motion.div className="flex space-x-1">
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
                                                repeatType: "reverse",
                                            }}
                                        />
                                    ))}
                                </motion.div>
                            </div>
                        );
                    }

                    console.log(result);

                    return (
                        <div className="my-4">
                            <NearbySearchMapView
                                center={result.center}
                                places={result.results}
                                type={args.type}
                            />
                        </div>
                    );
                }

                if (toolInvocation.toolName === 'text_search') {
                    if (!result) {
                        return (
                            <div className="flex items-center justify-between w-full">
                                <div className='flex items-center gap-2'>
                                    <MapPin className="h-5 w-5 text-neutral-700 dark:text-neutral-300 animate-pulse" />
                                    <span className="text-neutral-700 dark:text-neutral-300 text-lg">Searching places...</span>
                                </div>
                                <motion.div className="flex space-x-1">
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
                                                repeatType: "reverse",
                                            }}
                                        />
                                    ))}
                                </motion.div>
                            </div>
                        );
                    }

                    const centerLocation = result.results[0]?.geometry?.location;
                    return (
                        <MapContainer
                            title="Search Results"
                            center={centerLocation}
                            places={result.results.map((place: any) => ({
                                name: place.name,
                                location: place.geometry.location,
                                vicinity: place.formatted_address
                            }))}
                        />
                    );
                }

                if (toolInvocation.toolName === 'get_weather_data') {
                    if (!result) {
                        return (
                            <Card className="my-2 py-0 shadow-none bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 gap-0">
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
                                            <div key={i} className="h-7 w-28 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
                                        ))}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="px-3 sm:px-4">
                                        <div className="h-8 w-full bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse mb-4" />
                                        <div className="h-[180px] w-full bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
                                        <div className="flex justify-between mt-4 pb-4 overflow-x-auto no-scrollbar">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className="flex flex-col items-center min-w-[60px] sm:min-w-[70px] p-1.5 sm:p-2 mx-0.5">
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
                    }
                    return <WeatherChart result={result} />;
                }

                if (toolInvocation.toolName === 'currency_converter') {
                    return <CurrencyConverter toolInvocation={toolInvocation} result={result} />;
                }

                if (toolInvocation.toolName === 'stock_chart') {
                    return (
                        <div className="flex flex-col gap-3 w-full mt-4">
                            {/* Only show the badge when loading, hide it after results are loaded */}
                            {!result && (
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "w-fit flex items-center gap-3 px-4 py-2 rounded-full transition-colors duration-200",
                                        "bg-blue-200 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                    )}>
                                    <TrendingUpIcon className="h-4 w-4" />
                                    <span className="font-medium">{args.title}</span>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                </Badge>
                            )}

                            {result?.chart && (
                                <div className="w-full">
                                    <InteractiveStockChart
                                        title={args.title}
                                        chart={{
                                            ...result.chart,
                                            x_scale: 'datetime'
                                        }}
                                        data={result.chart.elements}
                                        stock_symbols={args.stock_symbols}
                                        currency_symbols={args.currency_symbols || args.stock_symbols.map(() => 'USD')}
                                        interval={args.interval}
                                        news_results={result.news_results}
                                    />
                                </div>
                            )}
                        </div>
                    );
                }

                if (toolInvocation.toolName === "code_interpreter") {
                    // Example code for creating charts (useful for reference but not shown to user):
                    // 
                    // # For pie charts:
                    // chart_data = {
                    //     "type": "pie",
                    //     "title": "Distribution of Values",
                    //     "elements": [
                    //         {"label": "Category A", "value": 30},
                    //         {"label": "Category B", "value": 20},
                    //         {"label": "Category C", "value": 15},
                    //         {"label": "Category D", "value": 35}
                    //     ]
                    // }
                    // return {"message": "Chart generated successfully", "chart": chart_data}
                    //
                    // # For line charts:
                    // chart_data = {
                    //     "type": "line",
                    //     "title": "Temperature Trends",
                    //     "x_label": "Date",
                    //     "y_label": "Temperature (°C)",
                    //     "elements": [
                    //         {"label": "Tokyo", "points": [["2023-01", 7], ["2023-02", 8], ["2023-03", 12]]},
                    //         {"label": "New York", "points": [["2023-01", 2], ["2023-02", 3], ["2023-03", 7]]}
                    //     ]
                    // }
                    // return {"message": "Chart generated successfully", "chart": chart_data}

                    return (
                        <div className="space-y-3 w-full overflow-hidden">
                            <CodeInterpreterView
                                code={args.code}
                                output={result?.message}
                                error={result?.error}
                                language="python"
                                title={args.title || "Code Execution"}
                                status={result?.error ? 'error' : (result ? 'completed' : 'running')}
                            />

                            {result?.chart && (
                                <div className="pt-1 overflow-x-auto">
                                    <InteractiveChart chart={result.chart} />
                                </div>
                            )}
                        </div>
                    );
                }

                if (toolInvocation.toolName === 'extreme_search') {
                    return <ExtremeSearch
                        toolInvocation={toolInvocation}
                        annotations={annotations}
                    />;
                }

                if (toolInvocation.toolName === 'web_search') {
                    return (
                        <div className="mt-4">
                            <MultiSearch
                                result={result}
                                args={args}
                                annotations={annotations?.filter(
                                    (a: any) => a.type === 'query_completion'
                                ) || []}
                            />
                        </div>
                    );
                }

                if (toolInvocation.toolName === 'retrieve') {
                    if (!result) {
                        return (
                            <div className="border border-neutral-200 rounded-xl my-4 overflow-hidden dark:border-neutral-800 bg-white dark:bg-neutral-900">
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
                    }

                    // Update the error message UI with better dark mode border visibility
                    if (result.error || (result.results && result.results[0] && result.results[0].error)) {
                        const errorMessage = result.error || (result.results && result.results[0] && result.results[0].error);
                        return (
                            <div className="border border-red-200 dark:border-red-500 rounded-xl my-4 p-4 bg-red-50 dark:bg-red-950/50">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                                        <Globe className="h-4 w-4 text-red-600 dark:text-red-300" />
                                    </div>
                                    <div>
                                        <div className="text-red-700 dark:text-red-300 text-sm font-medium">
                                            Error retrieving content
                                        </div>
                                        <div className="text-red-600/80 dark:text-red-400/80 text-xs mt-1">
                                            {errorMessage}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    // Update the "no content" message UI with better dark mode border visibility
                    if (!result.results || result.results.length === 0) {
                        return (
                            <div className="border border-amber-200 dark:border-amber-500 rounded-xl my-4 p-4 bg-amber-50 dark:bg-amber-950/50">
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

                    // Clean, simplified rendering for Exa AI retrieval:
                    return (
                        <div className="border border-neutral-200 rounded-xl my-4 overflow-hidden dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
                            {result.results[0].image && (
                                <div className="h-36 overflow-hidden relative">
                                    <Image
                                        src={result.results[0].image}
                                        alt={result.results[0].title || "Featured image"}
                                        className="w-full h-full object-cover"
                                        width={128}
                                        height={128}
                                        quality={100}
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
                                                quality={100}
                                                unoptimized
                                                onError={(e) => {
                                                    e.currentTarget.src = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(result.results[0].url)}`;
                                                }}
                                            />
                                        ) : (
                                            <Image
                                                className="w-full h-full object-contain rounded-lg"
                                                src={`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(result.results[0].url)}`}
                                                alt=""
                                                width={64}
                                                height={64}
                                                quality={100}
                                                unoptimized
                                                onError={(e) => {
                                                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'%3E%3Cpath fill='none' d='M0 0h24v24H0z'/%3E%3Cpath d='M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-2.29-2.333A17.9 17.9 0 0 1 8.027 13H4.062a8.008 8.008 0 0 0 5.648 6.667zM10.03 13c.151 2.439.848 4.73 1.97 6.752A15.905 15.905 0 0 0 13.97 13h-3.94zm9.908 0h-3.965a17.9 17.9 0 0 1-1.683 6.667A8.008 8.008 0 0 0 19.938 13zM4.062 11h3.965A17.9 17.9 0 0 1 9.71 4.333 8.008 8.008 0 0 0 4.062 11zm5.969 0h3.938A15.905 15.905 0 0 0 12 4.248 15.905 15.905 0 0 0 10.03 11zm4.259-6.667A17.9 17.9 0 0 1 15.938 11h3.965a8.008 8.008 0 0 0-5.648-6.667z' fill='rgba(128,128,128,0.5)'/%3E%3C/svg%3E";
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
                                                <Badge variant="secondary" className="rounded-md bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/30 text-violet-600 dark:text-violet-400 border-0 transition-colors">
                                                    <User2 className="h-3 w-3 mr-1" />
                                                    {result.results[0].author}
                                                </Badge>
                                            )}
                                            {result.results[0].publishedDate && (
                                                <Badge variant="secondary" className="rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-0 transition-colors">
                                                    <PhosphorClock className="h-3 w-3 mr-1" />
                                                    {new Date(result.results[0].publishedDate).toLocaleDateString()}
                                                </Badge>
                                            )}
                                            {result.response_time && (
                                                <Badge variant="secondary" className="rounded-md bg-sky-50 hover:bg-sky-100 dark:bg-sky-900/20 dark:hover:bg-sky-900/30 text-sky-600 dark:text-sky-400 border-0 transition-colors">
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
                                        <Badge variant="secondary" className="rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-0 transition-colors cursor-pointer">
                                            <a
                                                href={result.results[0].url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5"
                                            >
                                                <ArrowUpRight className="h-3 w-3" />
                                                View source
                                            </a>
                                        </Badge>

                                        {result.results.length > 1 && (
                                            <Badge variant="secondary" className="rounded-md bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-0 transition-colors">
                                                <TextIcon className="h-3 w-3 mr-1" />
                                                {result.results.length} pages
                                            </Badge>
                                        )}
                                    </div>

                                    <Badge variant="secondary" className="rounded-md bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 border-0 transition-colors">
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
                                                    <span>{index === 0 ? "View full content" : `Additional content ${index + 1}`}</span>
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

                if (toolInvocation.toolName === 'text_translate') {
                    return <TranslationTool toolInvocation={toolInvocation} result={result} />;
                }

                if (toolInvocation.toolName === 'track_flight') {
                    if (!result) {
                        return (
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <Plane className="h-5 w-5 text-neutral-700 dark:text-neutral-300 animate-pulse" />
                                    <span className="text-neutral-700 dark:text-neutral-300 text-lg">Tracking flight...</span>
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
                                                repeatType: "reverse",
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    }

                    if (result.error) {
                        return (
                            <div className="text-red-500 dark:text-red-400">
                                Error tracking flight: {result.error}
                            </div>
                        );
                    }

                    return (
                        <div className="my-4">
                            <FlightTracker data={result} />
                        </div>
                    );
                }

                if (toolInvocation.toolName === 'datetime') {
                    if (!result) {
                        return (
                            <div className="flex items-center gap-3 py-4 px-2">
                                <div className="h-5 w-5 relative">
                                    <div className="absolute inset-0 rounded-full border-2 border-neutral-300 dark:border-neutral-700 border-t-blue-500 dark:border-t-blue-400 animate-spin" />
                                </div>
                                <span className="text-neutral-700 dark:text-neutral-300 text-sm font-medium">
                                    Fetching current time...
                                </span>
                            </div>
                        );
                    }

                    // Live Clock component that updates every second
                    const LiveClock = memo(() => {
                        const [time, setTime] = useState(() => new Date());
                        const timerRef = useRef<NodeJS.Timeout>();

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
                        const timezone = result.timezone || new Intl.DateTimeFormat().resolvedOptions().timeZone;
                        const formatter = new Intl.DateTimeFormat('en-US', {
                            hour: 'numeric',
                            minute: 'numeric',
                            second: 'numeric',
                            hour12: true,
                            timeZone: timezone
                        });

                        const formattedParts = formatter.formatToParts(time);
                        const timeParts = {
                            hour: formattedParts.find(part => part.type === 'hour')?.value || '12',
                            minute: formattedParts.find(part => part.type === 'minute')?.value || '00',
                            second: formattedParts.find(part => part.type === 'second')?.value || '00',
                            dayPeriod: formattedParts.find(part => part.type === 'dayPeriod')?.value || 'AM'
                        };

                        return (
                            <div className="mt-3">
                                <div className="flex items-baseline">
                                    <div className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tighter tabular-nums text-neutral-900 dark:text-white">
                                        {timeParts.hour.padStart(2, '0')}
                                    </div>
                                    <div className="mx-1 sm:mx-2 text-4xl sm:text-5xl md:text-6xl font-light text-neutral-400 dark:text-neutral-500">:</div>
                                    <div className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tighter tabular-nums text-neutral-900 dark:text-white">
                                        {timeParts.minute.padStart(2, '0')}
                                    </div>
                                    <div className="mx-1 sm:mx-2 text-4xl sm:text-5xl md:text-6xl font-light text-neutral-400 dark:text-neutral-500">:</div>
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

                    // Determine if this is being used in a greeting context
                    const isGreetingContext = message?.content?.toLowerCase().includes('good morning') ||
                        message?.content?.toLowerCase().includes('good evening') ||
                        message?.content?.toLowerCase().includes('good afternoon') ||
                        message?.content?.toLowerCase().includes('good night') ||
                        message?.content?.toLowerCase().match(/\b(hi|hello|hey|greetings?)\b/);

                    return (
                        <div className="w-full my-6">
                            <div className={cn(
                                "rounded-xl overflow-hidden border",
                                isGreetingContext
                                    ? "bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/30 dark:to-rose-950/30 border-pink-200 dark:border-pink-800/50"
                                    : "bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
                            )}>
                                <div className="p-4 sm:p-6">
                                    <div className="flex flex-col gap-4 sm:gap-6">
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className={cn(
                                                    "text-xs font-medium tracking-wider uppercase",
                                                    isGreetingContext
                                                        ? "text-pink-600 dark:text-pink-400"
                                                        : "text-neutral-500 dark:text-neutral-400"
                                                )}>
                                                    {isGreetingContext ? "Current Time 🕐" : "Current Time"}
                                                </h3>
                                                <div className={cn(
                                                    "rounded px-2 py-1 text-xs font-medium flex items-center gap-1.5",
                                                    isGreetingContext
                                                        ? "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300"
                                                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                                                )}>
                                                    <PhosphorClock weight="regular" className={cn(
                                                        "h-3 w-3",
                                                        isGreetingContext ? "text-pink-500" : "text-blue-500"
                                                    )} />
                                                    {result.timezone || new Intl.DateTimeFormat().resolvedOptions().timeZone}
                                                </div>
                                            </div>
                                            <LiveClock />
                                            <p className={cn(
                                                "text-sm mt-2",
                                                isGreetingContext
                                                    ? "text-pink-600 dark:text-pink-400"
                                                    : "text-neutral-500 dark:text-neutral-400"
                                            )}>
                                                {result.formatted.date}
                                            </p>
                                        </div>

                                        {/* Compact Technical Details - only show if not greeting context */}
                                        {!isGreetingContext && (
                                            <div className="grid grid-cols-2 gap-3 text-xs">
                                                {result.formatted.iso_local && (
                                                    <div className="bg-neutral-50 dark:bg-neutral-900 rounded p-3">
                                                        <div className="text-neutral-500 dark:text-neutral-400 mb-1">Local</div>
                                                        <div className="font-mono text-neutral-700 dark:text-neutral-300 text-[11px]">
                                                            {result.formatted.iso_local}
                                                        </div>
                                                    </div>
                                                )}

                                                {result.timestamp && (
                                                    <div className="bg-neutral-50 dark:bg-neutral-900 rounded p-3">
                                                        <div className="text-neutral-500 dark:text-neutral-400 mb-1">Timestamp</div>
                                                        <div className="font-mono text-neutral-700 dark:text-neutral-300 text-[11px]">
                                                            {result.timestamp}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }

                if (toolInvocation.toolName === 'memory_manager') {
                    if (!result) {
                        return (
                            <SearchLoadingState
                                icon={Memory}
                                text="Managing memories..."
                                color="violet"
                            />
                        );
                    }
                    return <MemoryManager result={result} />;
                }

                if (toolInvocation.toolName === 'mcp_search') {
                    if (!result) {
                        return (
                            <SearchLoadingState
                                icon={Server}
                                text="Searching MCP servers..."
                                color="blue"
                            />
                        );
                    }

                    return (
                        <div className="w-full my-2">
                            <Card className="shadow-none border-neutral-200 dark:border-neutral-800 overflow-hidden">
                                <CardHeader className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-7 w-7 rounded-md bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                            <Server className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">MCP Server Results</CardTitle>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                Search results for &quot;{result.query}&quot;
                                            </p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0 px-3 pb-3">
                                    <MCPServerList
                                        servers={result.servers || []}
                                        query={result.query}
                                        error={result.error}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    );
                }

                if (toolInvocation.toolName === 'reddit_search') {
                    if (!result) {
                        return <SearchLoadingState
                            icon={RedditLogo}
                            text="Searching Reddit..."
                            color="orange"
                        />;
                    }

                    return <RedditSearch result={result} args={args} />;
                }

                return null;
            },
            [annotations]
        );

        const TranslationTool: React.FC<{ toolInvocation: ToolInvocation; result: any }> = ({ toolInvocation, result }) => {
            const [isPlaying, setIsPlaying] = useState(false);
            const [audioUrl, setAudioUrl] = useState<string | null>(null);
            const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
            const audioRef = useRef<HTMLAudioElement | null>(null);
            const canvasRef = useRef<HTMLCanvasElement | null>(null);
            const waveRef = useRef<Wave | null>(null);

            useEffect(() => {
                const _audioRef = audioRef.current
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
                    waveRef.current.addAnimation(new waveRef.current.animations.Lines({
                        lineWidth: 1.5,
                        lineColor: 'rgb(147, 51, 234)',
                        count: 80,
                        mirroredY: true,
                    }));
                }
            }, [audioUrl]);

            const handlePlayPause = async () => {
                if (!audioUrl && !isGeneratingAudio) {
                    setIsGeneratingAudio(true);
                    try {
                        const { audio } = await generateSpeech(result.translatedText);
                        setAudioUrl(audio);
                        setIsGeneratingAudio(false);
                        // Autoplay after a short delay to ensure audio is loaded
                        setTimeout(() => {
                            if (audioRef.current) {
                                audioRef.current.play();
                                setIsPlaying(true);
                            }
                        }, 100);
                    } catch (error) {
                        console.error("Error generating speech:", error);
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

            const handleReset = () => {
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                    setIsPlaying(false);
                }
            };

            if (!result) {
                return (
                    <Card className="w-full my-4 bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
                        <CardContent className="flex items-center justify-center h-24">
                            <div className="animate-pulse flex items-center">
                                <div className="h-4 w-4 bg-primary rounded-full mr-2"></div>
                                <div className="h-4 w-32 bg-primary rounded"></div>
                            </div>
                        </CardContent>
                    </Card>
                );
            }

            return (
                <Card className="w-full my-4 shadow-none bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700">
                    <CardContent className="p-4 sm:p-6">
                        <div className="space-y-4 sm:space-y-6">
                            <div>
                                <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                    The phrase <span className="font-medium text-neutral-900 dark:text-neutral-100">{toolInvocation.args.text}</span> translates from <span className="font-medium text-neutral-900 dark:text-neutral-100">{result.detectedLanguage}</span> to <span className="font-medium text-primary">{result.translatedText}</span>
                                </p>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3">
                                <Button
                                    onClick={handlePlayPause}
                                    disabled={isGeneratingAudio}
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 hover:bg-primary/20 text-primary shrink-0"
                                >
                                    {isGeneratingAudio ? (
                                        <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                                    ) : isPlaying ? (
                                        <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                                    ) : (
                                        <PlayIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                                    )}
                                </Button>

                                <div className="flex-1 h-8 sm:h-10 bg-neutral-100 dark:bg-neutral-900 rounded-md sm:rounded-lg overflow-hidden">
                                    <canvas
                                        ref={canvasRef}
                                        width="800"
                                        height="200"
                                        className="w-full h-full opacity-90 dark:opacity-70"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    {audioUrl && (
                        <audio
                            ref={audioRef}
                            src={audioUrl}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onEnded={() => { setIsPlaying(false); handleReset(); }}
                        />
                    )}
                </Card>
            );
        };

        return (
            <>
                {toolInvocations.map(
                    (toolInvocation: ToolInvocation, toolIndex: number) => (
                        <div key={`tool-${toolIndex}`}>
                            {renderToolInvocation(toolInvocation, toolIndex)}
                        </div>
                    )
                )}
            </>
        );
    },
    (prevProps, nextProps) => {
        return prevProps.toolInvocations === nextProps.toolInvocations &&
            prevProps.message === nextProps.message &&
            prevProps.annotations === nextProps.annotations
    }
);

ToolInvocationListView.displayName = 'ToolInvocationListView';

export default ToolInvocationListView; 