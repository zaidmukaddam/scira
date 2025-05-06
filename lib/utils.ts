// /lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Globe, Book, YoutubeIcon, TelescopeIcon } from 'lucide-react'
import { ChatsCircle, Code, Memory, RedditLogo, XLogo } from '@phosphor-icons/react'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 15)}`;
}

export function getUserId(): string {
  if (typeof window === 'undefined') return '';
  
  let userId = localStorage.getItem('mem0_user_id');
  if (!userId) {
    userId = generateId('user');
    localStorage.setItem('mem0_user_id', userId);
  }
  return userId;
}

export type SearchGroupId = 'web' | 'academic' | 'youtube' | 'reddit' | 'analysis' | 'chat' | 'extreme' | 'buddy';

export const searchGroups = [
  {
    id: 'web' as const,
    name: 'Web',
    description: 'Search across the entire internet',
    icon: Globe,
    show: true,
  },
  {
    id: 'buddy' as const,
    name: 'Buddy',
    description: 'Your personal memory companion',
    icon: Memory,
    show: true,
  },
  {
    id: 'analysis' as const,
    name: 'Analysis',
    description: 'Code, stock and currency stuff',
    icon: Code,
    show: true,
  },
  {
    id: 'chat' as const,
    name: 'Chat',
    description: 'Talk to the model directly.',
    icon: ChatsCircle,
    show: true,
  },
  {
    id: 'reddit' as const,
    name: 'Reddit',
    description: 'Search Reddit posts',
    icon: RedditLogo,
    show: true,
  },
  {
    id: 'academic' as const,
    name: 'Academic',
    description: 'Search academic papers powered by Exa',
    icon: Book,
    show: true,
  },
  {
    id: 'youtube' as const,
    name: 'YouTube',
    description: 'Search YouTube videos powered by Exa',
    icon: YoutubeIcon,
    show: true,
  },
  {
    id: 'extreme' as const,
    name: 'Extreme',
    description: 'Deep research with multiple sources and analysis',
    icon: TelescopeIcon,
    show: false,
  },
] as const;

export type SearchGroup = typeof searchGroups[number];
