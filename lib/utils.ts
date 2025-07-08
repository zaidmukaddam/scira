// /lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Globe, Book, TelescopeIcon, DollarSign } from 'lucide-react'
import { ChatsCircleIcon, CodeIcon, MemoryIcon, RedditLogoIcon, YoutubeLogoIcon, XLogoIcon } from '@phosphor-icons/react'
import { InlineTranslationOptions } from 'gt-next/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type SearchGroupId = 'web' | 'x' | 'academic' | 'youtube' | 'reddit' | 'analysis' | 'chat' | 'extreme' | 'memory' | 'crypto';

export const getSearchGroups = (t: (content: string, options?: InlineTranslationOptions) => string) => [
  {
    id: 'web' as const,
    name: t('Web'),
    description: t('Search across the entire internet powered by Tavily'),
    icon: Globe,
    show: true,
  },
  {
    id: 'memory' as const,
    name: t('Memory'),
    description: t('Your personal memory companion'),
    icon: MemoryIcon,
    show: true,
    requireAuth: true,
  },
  {
    id: 'analysis' as const,
    name: t('Analysis'),
    description: t('Code, stock and currency stuff'),
    icon: CodeIcon,
    show: true,
  },
  {
    id: 'crypto' as const,
    name: t('Crypto'),
    description: t('Cryptocurrency research powered by CoinGecko'),
    icon: DollarSign,
    show: true,
  },
  {
    id: 'chat' as const,
    name: t('Chat'),
    description: t('Talk to the model directly.'),
    icon: ChatsCircleIcon,
    show: true,
  },
  {
    id: 'x' as const,
    name: t('X'),
    description: t('Search X posts'),
    icon: XLogoIcon,
    show: true,
  },
  {
    id: 'reddit' as const,
    name: t('Reddit'),
    description: t('Search Reddit posts'),
    icon: RedditLogoIcon,
    show: true,
  },
  {
    id: 'academic' as const,
    name: t('Academic'),
    description: t('Search academic papers powered by Exa'),
    icon: Book,
    show: true,
  },
  {
    id: 'youtube' as const,
    name: t('YouTube'),
    description: t('Search YouTube videos powered by Exa'),
    icon: YoutubeLogoIcon,
    show: true,
  },
  {
    id: 'extreme' as const,
    name: t('Extreme'),
    description: t('Deep research with multiple sources and analysis'),
    icon: TelescopeIcon,
    show: false,
  },
] as const;

export type SearchGroup = ReturnType<typeof getSearchGroups>[number];

export function invalidateChatsCache() {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('invalidate-chats-cache');
    window.dispatchEvent(event);
  }
}