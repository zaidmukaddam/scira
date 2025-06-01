// /lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Globe, Book, TelescopeIcon, Heart } from 'lucide-react';
import { ChatsCircle, Code, Memory, RedditLogo, YoutubeLogo } from '@phosphor-icons/react';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type SearchGroupId =
    | 'web'
    | 'academic'
    | 'youtube'
    | 'reddit'
    | 'analysis'
    | 'chat'
    | 'extreme'
    | 'memory'
    | 'greeting';

export const searchGroups = [
    {
        id: 'web' as const,
        name: 'Web',
        description: 'Search across the entire internet',
        icon: Globe,
        show: true,
    },
    {
        id: 'memory' as const,
        name: 'Memory',
        description: 'Your personal memory companion',
        icon: Memory,
        show: true,
        requireAuth: true,
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
        id: 'greeting' as const,
        name: 'Greeting',
        description: 'Warm greetings and social interactions',
        icon: Heart,
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
        icon: YoutubeLogo,
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

export type SearchGroup = (typeof searchGroups)[number];

export function invalidateChatsCache() {
    if (typeof window !== 'undefined') {
        const event = new CustomEvent('invalidate-chats-cache');
        window.dispatchEvent(event);
    }
}
