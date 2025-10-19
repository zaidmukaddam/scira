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
  HierarchyIcon,
  MagicWandIcon,
  File01Icon,
} from '@hugeicons/core-free-icons';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SearchGroupId =
  | 'web'
  | 'x'
  | 'academic'
  | 'youtube'
  | 'reddit'
  | 'stocks'
  | 'chat'
  | 'extreme'
  | 'memory'
  | 'crypto'
  | 'code'
  | 'connectors'
  | 'cyrus'
  | 'libeller'
  | 'nomenclature'
  | 'pdfExcel';

// Search provider information for dynamic descriptions
export const searchProviderInfo = {
  parallel: 'Parallel AI',
  exa: 'Exa',
  tavily: 'Tavily',
  firecrawl: 'Firecrawl',
} as const;

export type SearchProvider = keyof typeof searchProviderInfo;

// Function to get dynamic web search description based on selected provider
export function getWebSearchDescription(provider: SearchProvider = 'parallel'): string {
  const providerName = searchProviderInfo[provider];
  return `Recherchez sur tout Internet avec ${providerName}`;
}

// Function to get search groups with dynamic descriptions
export function getSearchGroups(searchProvider: SearchProvider = 'parallel') {
  return [
    {
      id: 'web' as const,
      name: 'Web',
      description: getWebSearchDescription(searchProvider),
      icon: GlobalSearchIcon,
      show: true,
    },
    {
      id: 'x' as const,
      name: 'X',
      description: 'Rechercher des publications sur X',
      icon: NewTwitterIcon,
      show: true,
    },
    {
      id: 'stocks' as const,
      name: 'Stocks',
      description: 'Informations sur les actions et les devises',
      icon: AppleStocksIcon,
      show: true,
    },
    {
      id: 'connectors' as const,
      name: 'Connectors',
      description: 'Recherchez des documents Google Drive, Notion et OneDrive',
      icon: ConnectIcon,
      show: true,
      requireAuth: true,
      requirePro: true,
    },
    {
      id: 'code' as const,
      name: 'Code',
      description: 'Obtenez du contexte sur les langages et frameworks',
      icon: CodeCircleIcon,
      show: true,
    },
    {
      id: 'academic' as const,
      name: 'Recherche académique',
      description: 'Recherche d’articles académiques via Exa',
      icon: MicroscopeIcon,
      show: true,
    },
    {
      id: 'chat' as const,
      name: 'Chat',
      description: 'Discutez directement avec le modèle.',
      icon: ChattingIcon,
      show: true,
    },
    {
      id: 'extreme' as const,
      name: 'Extreme',
      description: 'Recherche approfondie avec multiples sources et analyse',
      icon: AtomicPowerIcon,
      show: true,
      requireAuth: true,
    },
    {
      id: 'memory' as const,
      name: 'Memory',
      description: 'Votre compagnon de mémoire personnel',
      icon: Database02Icon,
      show: true,
      requireAuth: true,
    },
    {
      id: 'reddit' as const,
      name: 'Reddit',
      description: 'Rechercher des publications Reddit',
      icon: RedditIcon,
      show: true,
    },
    {
      id: 'crypto' as const,
      name: 'Crypto',
      description: 'Recherche de cryptomonnaies via CoinGecko',
      icon: Bitcoin02Icon,
      show: true,
    },
    {
      id: 'youtube' as const,
      name: 'Recherche YouTube',
      description: 'Recherche de vidéos YouTube via Exa',
      icon: YoutubeIcon,
      show: true,
    },
    {
      id: 'cyrus' as const,
      name: 'Cyrus Structure',
      description: 'Classifie les articles par hiérarchie (Markdown)',
      icon: HierarchyIcon,
      show: true,
    },
    {
      id: 'libeller' as const,
      name: 'Correction Libeller',
      description: 'Nettoie et standardise des libellés produits (Markdown)',
      icon: MagicWandIcon,
      show: true,
    },
    {
      id: 'nomenclature' as const,
      name: 'Nomenclature',
      description: 'Classification douanière et taxes (table Markdown)',
      icon: AppleStocksIcon,
      show: true,
    },
    {
      id: 'pdfExcel' as const,
      name: 'PDF → Excel',
      description: 'Extraction de tableaux depuis des PDFs (Markdown) + export .xlsx',
      icon: File01Icon,
      show: true,
    },
  ] as const;
}

// Keep the static searchGroups for backward compatibility
export const searchGroups = getSearchGroups();

export type SearchGroup = (typeof searchGroups)[number];

export function invalidateChatsCache() {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('invalidate-chats-cache');
    window.dispatchEvent(event);
  }
}

export function isAnonymousUser(userId: string): boolean {
  return typeof userId === 'string' && userId.startsWith('arka:');
}
