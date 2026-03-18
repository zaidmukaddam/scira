// /lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  GlobalSearchIcon,
  Database02Icon,
  AtomicPowerIcon,
  Bitcoin02Icon,
  MicroscopeIcon,
  NewTwitterIcon,
  RedditIcon,
  YoutubeIcon,
  ChattingIcon,
  AppleStocksIcon,
  ConnectIcon,
  CodeCircleIcon,
  Github01Icon,
  SpotifyIcon,
  Chart03Icon,
  CanvasIcon,
} from '@hugeicons/core-free-icons';
import { AppsIcon } from '@/components/icons/apps-icon';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (/websocket|ws connection|connection (closed|failed|lost)|1006|1011|1012/i.test(msg))
    return 'Connection lost. Please check your internet and try again.';
  if (/oauth|authoriz|token|forbidden|403/i.test(msg))
    return 'Authorization failed. The app may have rejected the request.';
  if (/timeout|timed? ?out/i.test(msg))
    return 'This took too long. Please try again.';
  if (/network|fetch failed|ECONNREFUSED|ENOTFOUND/i.test(msg))
    return 'Could not connect. Please check your internet and try again.';
  return 'Something went wrong. Please try again.';
}

export type SearchGroupId =
  | 'web'
  | 'x'
  | 'academic'
  | 'youtube'
  | 'spotify'
  | 'reddit'
  | 'github'
  | 'stocks'
  | 'chat'
  | 'extreme'
  | 'memory'
  | 'crypto'
  | 'code'
  | 'connectors'
  | 'mcp'
  | 'prediction'
  | 'canvas';

// Search provider information for dynamic descriptions
export const searchProviderInfo = {
  parallel: 'Parallel AI',
  exa: 'Exa',
  tavily: 'Tavily',
  firecrawl: 'Firecrawl',
} as const;

export type SearchProvider = keyof typeof searchProviderInfo;

// Function to get dynamic web search description based on selected provider
export function getWebSearchDescription(provider: SearchProvider = 'exa'): string {
  const providerName = searchProviderInfo[provider];
  return `Search across the entire internet powered by ${providerName}`;
}

// Function to get search groups with dynamic descriptions
export function getSearchGroups(searchProvider: SearchProvider = 'exa') {
  return [
    {
      id: 'web' as const,
      name: 'Web',
      description: getWebSearchDescription(searchProvider),
      icon: GlobalSearchIcon,
      show: true,
    },
    {
      id: 'chat' as const,
      name: 'Chat',
      description: 'Talk to the model directly.',
      icon: ChattingIcon,
      show: true,
    },
    {
      id: 'x' as const,
      name: 'X',
      description: 'Search X posts',
      icon: NewTwitterIcon,
      show: true,
    },
    {
      id: 'stocks' as const,
      name: 'Stocks',
      description: 'Stock and currency information',
      icon: AppleStocksIcon,
      show: true,
    },
    {
      id: 'connectors' as const,
      name: 'Connectors',
      description: 'Search Google Drive, Notion and OneDrive documents',
      icon: ConnectIcon,
      show: true,
      requireAuth: true,
      requirePro: true,
    },
    {
      id: 'mcp' as const,
      name: 'Apps',
      description: 'Use tools from your connected apps',
      icon: AppsIcon,
      show: process.env.NEXT_PUBLIC_MCP_ENABLED === 'true',
      requireAuth: true,
      requirePro: true,
    },
    {
      id: 'code' as const,
      name: 'Code',
      description: 'Get context about languages and frameworks',
      icon: CodeCircleIcon,
      show: true,
    },
    {
      id: 'academic' as const,
      name: 'Academic',
      description: 'Search academic papers and pdfs powered by Firecrawl',
      icon: MicroscopeIcon,
      show: true,
    },
    {
      id: 'extreme' as const,
      name: 'Extreme',
      description: 'Deep research with multiple sources and analysis',
      icon: AtomicPowerIcon,
      show: true,
      requireAuth: true,
    },
    {
      id: 'memory' as const,
      name: 'Memory',
      description: 'Your personal memory companion',
      icon: Database02Icon,
      show: true,
      requireAuth: true,
    },
    {
      id: 'reddit' as const,
      name: 'Reddit',
      description: 'Search Reddit posts powered by Parallel',
      icon: RedditIcon,
      show: true,
    },
    {
      id: 'github' as const,
      name: 'GitHub',
      description: 'Search GitHub repositories, code, and discussions',
      icon: Github01Icon,
      show: true,
    },
    {
      id: 'crypto' as const,
      name: 'Crypto',
      description: 'Cryptocurrency research powered by CoinGecko',
      icon: Bitcoin02Icon,
      show: true,
    },
    {
      id: 'prediction' as const,
      name: 'Prediction',
      description: 'Search prediction markets from Polymarket and Kalshi',
      icon: Chart03Icon,
      show: true,
    },
    {
      id: 'youtube' as const,
      name: 'YouTube',
      description: 'Search content inside YouTube videos, channels and playlists',
      icon: YoutubeIcon,
      show: true,
    },
    {
      id: 'spotify' as const,
      name: 'Spotify',
      description: 'Search songs, artists, and albums on Spotify',
      icon: SpotifyIcon,
      show: true,
    },
    {
      id: 'canvas' as const,
      name: 'Canvas',
      description: 'Research and generate interactive dashboards and visual reports',
      icon: CanvasIcon,
      show: true,
      requireAuth: true,
      requirePro: true,
    },
  ] as const;
}

// Keep the static searchGroups for backward compatibility
export const searchGroups = getSearchGroups();

export type SearchGroup = (typeof searchGroups)[number];
