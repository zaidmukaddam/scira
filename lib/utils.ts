// /lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  GlobalSearchIcon,
  Database02Icon,
  MicroscopeIcon,
  ChattingIcon,
  Medicine02Icon,
  HospitalIcon,
  StethoscopeIcon,
  HeartCheckIcon,
} from '@hugeicons/core-free-icons';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SearchGroupId =
  | 'medications'
  | 'pharmacies'
  | 'symptoms'
  | 'conditions'
  | 'chat'
  | 'web'
  | 'academic'
  | 'memory';

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
  return `Search across the entire internet powered by ${providerName}`;
}

// Function to get search groups with dynamic descriptions
export function getSearchGroups(searchProvider: SearchProvider = 'parallel') {
  return [
    {
      id: 'medications' as const,
      name: 'Medications',
      description: 'Search for medications, dosages, and drug information',
      icon: Medicine02Icon,
      show: true,
    },
    {
      id: 'pharmacies' as const,
      name: 'Pharmacies',
      description: 'Find nearby pharmacies and check medication availability',
      icon: HospitalIcon,
      show: true,
    },
    {
      id: 'symptoms' as const,
      name: 'Symptoms',
      description: 'Analyze symptoms and get health guidance',
      icon: StethoscopeIcon,
      show: true,
    },
    {
      id: 'conditions' as const,
      name: 'Conditions',
      description: 'Learn about medical conditions and treatments',
      icon: HeartCheckIcon,
      show: true,
    },
    {
      id: 'chat' as const,
      name: 'Chat',
      description: 'Talk to Remi AI directly for personalized healthcare guidance',
      icon: ChattingIcon,
      show: true,
    },
    {
      id: 'web' as const,
      name: 'Web',
      description: getWebSearchDescription(searchProvider),
      icon: GlobalSearchIcon,
      show: true,
    },
    {
      id: 'academic' as const,
      name: 'Academic',
      description: 'Search medical research and academic papers',
      icon: MicroscopeIcon,
      show: true,
    },
    {
      id: 'memory' as const,
      name: 'Memory',
      description: 'Your personal health records and medication history',
      icon: Database02Icon,
      show: true,
      requireAuth: true,
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
