'use client';

import React, { memo, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  PlusIcon,
  GearIcon,
  CodeIcon,
  SignIn,
  XLogoIcon,
  GithubLogoIcon,
  InstagramLogoIcon,
  InfoIcon,
  BookIcon,
  FileTextIcon,
  ShieldIcon,
  BugIcon,
  UsersIcon,
} from '@phosphor-icons/react';
import {
  Crown02Icon,
  BinocularsIcon,
  SearchList02Icon,
  FolderLibraryIcon,
  Mail02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import {
  RocketIcon as VercelIcon,
  Globe,
  ChevronsUpDown,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  Keyboard,
  X,
  Check,
  AlertCircle,
  MessageSquare,
  ExternalLink,
  LogOut,
  Pin,
  PinOff,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteChat,
  getRecentChats,
  getUserChats,
  updateChatPinned,
  updateChatTitle,
  updateChatVisibility,
} from '@/app/actions';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ComprehensiveUserData } from '@/lib/user-data-server';
import { SciraLogo } from '@/components/logos/scira-logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';
import { Button } from './ui/button';
import { useSyncedPreferences } from '@/hooks/use-synced-preferences';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AudioLinesIcon } from '@/components/ui/audio-lines';
import { McpLogoIcon } from '@/components/icons/mcp-logo';
import { AppsIcon } from '@/components/icons/apps-icon';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShareDialog } from '@/components/share/share-dialog';
import { sileo } from 'sileo';
import { signOut } from '@/lib/auth-client';

type VisibilityType = 'public' | 'private';

type SignedOutLink = {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  external?: boolean;
};

interface UserDropdownContentProps {
  user: ComprehensiveUserData;
  isProUser: boolean;
  blurPersonalInfo: boolean;
  closeMobileSidebar: () => void;
  onShortcutsOpen: () => void;
  isMobile: boolean;
}

function UserDropdownContent({
  user,
  isProUser,
  blurPersonalInfo,
  closeMobileSidebar,
  onShortcutsOpen,
  isMobile,
}: UserDropdownContentProps) {
  const { theme: currentTheme, setTheme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [themeOpen, setThemeOpen] = React.useState(false);
  const [infoOpen, setInfoOpen] = React.useState(false);

  const handleSignOut = async () => {
    closeMobileSidebar();
    queryClient.removeQueries({ queryKey: ['comprehensive-user-data'] });
    localStorage.removeItem('scira-user-data');

    sileo.promise(
      signOut().then(() => router.push('/sign-in')),
      {
        loading: { title: 'Signing out...' },
        success: () => ({ title: 'Signed out successfully' }),
        error: () => ({ title: 'Failed to sign out' }),
      },
    );
  };

  const themes = [
    { value: 'system', label: 'Sys', colors: ['#F9F9F9', '#6B5B4F', '#E8DFD5'] },
    { value: 'light', label: 'Light', colors: ['#FAFAFA', '#6B5B4F', '#EBE0C8'] },
    { value: 'dark', label: 'Dark', colors: ['#1A1A1A', '#E8D5A3', '#3A3020'] },
    { value: 'colourful', label: 'Color', colors: ['#3D3428', '#C4A96A', '#5A4D3A'] },
    { value: 't3chat', label: 'T3', colors: ['#2A1F35', '#9B2B5A', '#4A2D5A'] },
    { value: 'claudedark', label: 'CD', colors: ['#352F28', '#C07A3E', '#2A2520'] },
    { value: 'claudelight', label: 'CL', colors: ['#F5F0E8', '#B86030', '#E8DDD0'] },
    { value: 'neutrallight', label: 'NL', colors: ['#FFFFFF', '#BF6E35', '#F1F1F1'] },
    { value: 'neutraldark', label: 'ND', colors: ['#252525', '#9C5B2C', '#434343'] },
  ];

  return (
    <>
      <DropdownMenuLabel className="py-2">
        <div className="flex flex-col gap-0.5">
          <p className={cn('text-sm font-semibold leading-none', blurPersonalInfo && 'blur-sm')}>
            {user.name || 'User'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isProUser ? (
              <span>
                Scira{' '}
                <span className="font-pixel text-[10px] uppercase tracking-wider">
                  {user.isMaxUser ? 'Max' : 'Pro'}
                </span>
              </span>
            ) : (
              'Scira Free'
            )}
          </p>
        </div>
      </DropdownMenuLabel>

      <DropdownMenuSeparator />

      {/* Main actions */}
      <DropdownMenuGroup>
        <DropdownMenuItem asChild>
          <Link href="/settings" onClick={closeMobileSidebar}>
            <GearIcon size={16} weight="regular" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            closeMobileSidebar();
            onShortcutsOpen();
          }}
        >
          <Keyboard size={16} />
          <span>Shortcuts</span>
        </DropdownMenuItem>
        <div>
          <button
            onClick={() => {
              setThemeOpen((prev) => !prev);
              setInfoOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-default"
          >
            <svg width={16} height={16} viewBox="0 0 20 20" className="shrink-0 rounded-[3px] overflow-hidden">
              <rect
                width="20"
                height="20"
                fill={themes.find((t) => t.value === currentTheme)?.colors[0] || '#1A1A1A'}
              />
              <circle
                cx="7"
                cy="10"
                r="4"
                fill={themes.find((t) => t.value === currentTheme)?.colors[1] || '#E8D5A3'}
              />
              <rect
                x="12"
                y="6"
                width="6"
                height="8"
                rx="1.5"
                fill={themes.find((t) => t.value === currentTheme)?.colors[2] || '#3A3020'}
              />
            </svg>
            <span className="text-sm">Theme</span>
            <ChevronDown
              size={14}
              className={cn(
                'ml-auto text-muted-foreground transition-transform duration-200',
                themeOpen && 'rotate-180',
              )}
            />
          </button>
          <div
            className={cn(
              'grid transition-all duration-200 ease-in-out',
              themeOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
            )}
          >
            <div className="overflow-hidden">
              <div
                className={cn(
                  'flex flex-col gap-0.5 pt-1 pb-0.5 ml-[17px] pl-3 border-l border-border/60 transition-colors duration-200',
                  themeOpen ? 'border-border/60' : 'border-transparent',
                )}
              >
                {themes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={cn(
                      'w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-left transition-colors duration-150',
                      currentTheme === t.value
                        ? 'bg-accent/50 text-foreground'
                        : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
                    )}
                  >
                    <svg
                      width={20}
                      height={20}
                      viewBox="0 0 20 20"
                      className="shrink-0 rounded-[4px] border border-border/50 overflow-hidden"
                    >
                      <rect width="20" height="20" fill={t.colors[0]} />
                      <circle cx="7" cy="10" r="4" fill={t.colors[1]} />
                      <rect x="12" y="6" width="6" height="8" rx="1.5" fill={t.colors[2]} />
                    </svg>
                    <span className="text-xs font-medium">{t.label}</span>
                    {currentTheme === t.value && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DropdownMenuGroup>

      <DropdownMenuSeparator />

      {/* Info & Community - accordion */}
      <div>
        <button
          onClick={() => {
            setInfoOpen((prev) => !prev);
            setThemeOpen(false);
          }}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-default"
        >
          <InfoIcon size={16} weight="regular" />
          <span className="text-sm">Info & Links</span>
          <ChevronDown
            size={14}
            className={cn('ml-auto text-muted-foreground transition-transform duration-200', infoOpen && 'rotate-180')}
          />
        </button>
        <div
          className={cn(
            'grid transition-all duration-200 ease-in-out',
            infoOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div
              className={cn(
                'flex flex-col gap-0.5 pt-1 pb-0.5 ml-[17px] pl-3 border-l transition-colors duration-200',
                infoOpen ? 'border-border/60' : 'border-transparent',
              )}
            >
              <Link
                href="/about"
                onClick={closeMobileSidebar}
                className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors duration-150"
              >
                <InfoIcon size={16} weight="regular" />
                <span>About</span>
              </Link>
              <Link
                href="/blog"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileSidebar}
                className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors duration-150"
              >
                <BookIcon size={16} weight="regular" />
                <span>Blog</span>
              </Link>
              <Link
                href="/terms"
                onClick={closeMobileSidebar}
                className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors duration-150"
              >
                <FileTextIcon size={16} weight="regular" />
                <span>Terms</span>
              </Link>
              <Link
                href="/privacy-policy"
                onClick={closeMobileSidebar}
                className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors duration-150"
              >
                <ShieldIcon size={16} weight="regular" />
                <span>Privacy</span>
              </Link>
              <div className="h-px bg-border/40 my-1" />
              <a
                href="https://git.new/scira"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileSidebar}
                className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors duration-150"
              >
                <GithubLogoIcon size={16} weight="regular" />
                <span>GitHub</span>
              </a>
              <a
                href="https://x.com/sciraai"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileSidebar}
                className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors duration-150"
              >
                <XLogoIcon size={16} weight="regular" />
                <span>X.com</span>
              </a>
              <a
                href="https://www.instagram.com/scira.ai"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileSidebar}
                className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors duration-150"
              >
                <InstagramLogoIcon size={16} weight="regular" />
                <span>Instagram</span>
              </a>
              <a
                href="https://scira.userjot.com"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileSidebar}
                className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors duration-150"
              >
                <BugIcon size={16} weight="regular" />
                <span>Feedback</span>
              </a>
              <a
                href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzaidmukaddam%2Fscira"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileSidebar}
                className="flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors duration-150"
              >
                <VercelIcon size={16} />
                <span>Deploy</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <DropdownMenuSeparator />

      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          void handleSignOut();
        }}
      >
        <LogOut size={16} />
        <span>Sign Out</span>
      </DropdownMenuItem>
    </>
  );
}

interface AppSidebarProps {
  chatId: string | null;
  selectedVisibilityType: VisibilityType;
  onVisibilityChange: (visibility: VisibilityType) => void | Promise<void>;
  user: ComprehensiveUserData | null;
  onHistoryClick: () => void;
  isOwner?: boolean;
  subscriptionData?: any;
  isProUser?: boolean;
  isProStatusLoading?: boolean;
  isCustomInstructionsEnabled?: boolean;
  setIsCustomInstructionsEnabledAction?: (value: boolean | ((val: boolean) => boolean)) => void;
  settingsOpen?: boolean;
  setSettingsOpen?: (open: boolean) => void;
  settingsInitialTab?: string;
}

// Helper function to group chats by date
const groupChatsByDate = (chats: any[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: { label: string; chats: any[] }[] = [];
  const todayChats: any[] = [];
  const yesterdayChats: any[] = [];
  const thisWeekChats: any[] = [];
  const olderChats: any[] = [];

  chats.forEach((chat) => {
    const chatDate = new Date(chat.updatedAt || chat.createdAt);
    const chatDay = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());

    if (chatDay.getTime() === today.getTime()) {
      todayChats.push(chat);
    } else if (chatDay.getTime() === yesterday.getTime()) {
      yesterdayChats.push(chat);
    } else if (chatDay > weekAgo) {
      thisWeekChats.push(chat);
    } else {
      olderChats.push(chat);
    }
  });

  if (todayChats.length > 0) groups.push({ label: 'Today', chats: todayChats });
  if (yesterdayChats.length > 0) groups.push({ label: 'Yesterday', chats: yesterdayChats });
  if (thisWeekChats.length > 0) groups.push({ label: 'This Week', chats: thisWeekChats });
  if (olderChats.length > 0) groups.push({ label: 'Older', chats: olderChats });

  return groups;
};

export const AppSidebar = memo(({ user, onHistoryClick, isProUser }: AppSidebarProps) => {
  const [blurPersonalInfo] = useSyncedPreferences<boolean>('scira-blur-personal-info', false);
  const [isRecentCollapsed, setIsRecentCollapsed] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = window.localStorage.getItem('scira-recent-collapsed');
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });
  React.useEffect(() => {
    try {
      window.localStorage.setItem('scira-recent-collapsed', JSON.stringify(isRecentCollapsed));
    } catch {
      // ignore
    }
  }, [isRecentCollapsed]);

  const { state, isMobile, setOpenMobile } = useSidebar();
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = React.useState(false);

  // Close mobile sidebar when navigating
  const closeMobileSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [renameTarget, setRenameTarget] = React.useState<{ id: string; title?: string | null } | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [shareTarget, setShareTarget] = React.useState<{ id: string; visibility?: VisibilityType } | null>(null);
  const [shareVisibility, setShareVisibility] = React.useState<VisibilityType>('private');
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; title?: string | null } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [openMenuChatId, setOpenMenuChatId] = React.useState<string | null>(null);

  // Fetch recent chats - lightweight query optimized for sidebar (only id, title, createdAt, visibility)
  const { data: chatsData, isLoading: isChatsLoading } = useQuery({
    queryKey: ['recent-chats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { chats: [], hasMore: false };
      return await getRecentChats(user.id, 8);
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    refetchOnReconnect: true,
  });

  const recentChats = chatsData?.chats || [];

  const pinnedRecentChats = useMemo(() => recentChats.filter((chat) => chat.isPinned), [recentChats]);

  const unpinnedRecentChats = useMemo(() => recentChats.filter((chat) => !chat.isPinned), [recentChats]);

  // Group chats by date
  const groupedChats = useMemo(() => groupChatsByDate(unpinnedRecentChats), [unpinnedRecentChats]);

  const signedOutLinks: SignedOutLink[] = [
    {
      id: 'about',
      label: 'About',
      icon: InfoIcon,
      href: '/about',
    },
    {
      id: 'blog',
      label: 'Blog',
      icon: BookIcon,
      href: '/blog',
    },
    {
      id: 'terms',
      label: 'Terms',
      icon: FileTextIcon,
      href: '/terms',
    },
    {
      id: 'privacy',
      label: 'Privacy',
      icon: ShieldIcon,
      href: '/privacy-policy',
    },
    {
      id: 'github',
      label: 'GitHub',
      icon: GithubLogoIcon,
      href: 'https://git.new/scira',
      external: true,
    },
    {
      id: 'feedback',
      label: 'Feedback',
      icon: BugIcon,
      href: 'https://scira.userjot.com',
      external: true,
    },
  ];

  const invalidateRecentChats = () => {
    if (user?.id) {
      queryClient.refetchQueries({ queryKey: ['recent-chats', user.id] });
    }
  };

  const closeRenameDialog = () => {
    setRenameTarget(null);
    setRenameValue('');
  };

  const closeShareDialog = () => {
    setShareTarget(null);
    setShareDialogOpen(false);
  };

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
  };

  const togglePinnedChat = async (chatId: string) => {
    const selectedChat = recentChats.find((chat) => chat.id === chatId);
    if (!selectedChat) return;

    try {
      const updatedChat = await updateChatPinned(chatId, !selectedChat.isPinned);
      if (!updatedChat) {
        sileo.error({ title: 'Failed to update pinned state' });
        return;
      }

      queryClient.setQueryData(['recent-chats', user?.id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          chats: oldData.chats.map((chat: any) =>
            chat.id === chatId ? { ...chat, isPinned: !selectedChat.isPinned } : chat,
          ),
        };
      });
      invalidateRecentChats();
    } catch (error) {
      console.error('Failed to update pinned state:', error);
      sileo.error({ title: 'Failed to update pinned state' });
    }
  };

  const handleRenameSubmit = async () => {
    if (!renameTarget) return;
    const next = renameValue.trim();

    if (!next) {
      sileo.error({
        title: 'Title cannot be empty',
        description: 'Please enter a valid title',
        icon: <AlertCircle className="h-4 w-4" />,
      });
      return;
    }

    if (next.length > 100) {
      sileo.error({
        title: 'Title is too long (max 100 characters)',
        description: 'Please shorten your title',
        icon: <AlertCircle className="h-4 w-4" />,
      });
      return;
    }

    setIsRenaming(true);
    try {
      const updated = await updateChatTitle(renameTarget.id, next);
      if (updated) {
        sileo.success({
          title: 'Chat renamed',
          description: 'The chat title has been updated',
          icon: <Pencil className="h-4 w-4" />,
        });
        closeRenameDialog();
        invalidateRecentChats();
      } else {
        sileo.error({
          title: 'Failed to rename chat',
          description: 'Please try again',
          icon: <X className="h-4 w-4" />,
        });
      }
    } catch (error) {
      console.error('Rename chat error:', error);
      sileo.error({
        title: 'Failed to rename chat',
        description: 'Please try again',
        icon: <X className="h-4 w-4" />,
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleShareVisibilityChange = async (visibility: VisibilityType) => {
    if (!shareTarget) return;

    try {
      await updateChatVisibility(shareTarget.id, visibility);
      setShareVisibility(visibility);
      const shareUrl = visibility === 'public' ? `https://scira.ai/share/${shareTarget.id}` : '';
      sileo.success({
        title: visibility === 'public' ? 'Chat shared' : 'Chat is now private',
        description: visibility === 'public' ? 'Your chat is now publicly accessible' : 'Your chat is now private',
        icon: <Share2 className="h-4 w-4" />,
        ...(visibility === 'public' && shareUrl
          ? {
              button: {
                title: 'Open link',
                onClick: () => window.open(shareUrl, '_blank', 'noopener,noreferrer'),
              },
            }
          : {}),
      });
      invalidateRecentChats();
    } catch (error) {
      console.error('Share visibility error:', error);
      sileo.error({
        title: 'Failed to update visibility',
        description: 'Please try again',
        icon: <X className="h-4 w-4" />,
      });
      throw error;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteChat(deleteTarget.id);
      sileo.success({
        title: 'Chat deleted',
        description: 'The chat has been permanently removed',
        icon: <Trash2 className="h-4 w-4" />,
      });
      closeDeleteDialog();
      invalidateRecentChats();
    } catch (error) {
      console.error('Delete chat error:', error);
      sileo.error({ title: 'Failed to delete chat' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="shadow-none! border-none! **:data-[slot=sidebar-inner]:light:bg-primary/10 **:data-[slot=sidebar-inner]:dark:bg-primary/4 **:data-[slot=sidebar-inner]:colourful:bg-primary/10 **:data-[slot=sidebar-inner]:text-sidebar-foreground **:data-[slot=sidebar-gap]:bg-transparent"
    >
      {/* Header */}
      <SidebarHeader className="p-0!">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="relative flex items-center w-full h-12 px-2 overflow-visible">
              <Button
                asChild
                variant="ghost"
                className="h-auto w-fit group-data-[collapsible=icon]:p-0 py-1 px-2 justify-start hover:bg-primary/10!"
              >
                <Link
                  href="/new"
                  onClick={closeMobileSidebar}
                  aria-label="New chat"
                  className="inline-flex items-center gap-1 w-fit group-data-[collapsible=icon]:mx-auto"
                >
                  <div className="flex items-center justify-center size-6 shrink-0 transition-opacity duration-200 group-data-[collapsible=icon]:group-hover:opacity-0">
                    <SciraLogo className="size-6" />
                  </div>
                  <div className="flex flex-row items-center gap-2 leading-none group-data-[collapsible=icon]:hidden">
                    <span className="font-be-vietnam-pro font-light tracking-tighter text-xl">scira</span>
                    {user && isProUser && (
                      <div className="w-fit">
                        <span className="animate-shimmer text-xs font-baumans inline-flex items-center justify-center min-w-6 h-4 px-1.5 pt-0 pb-0.5 rounded-md shadow-sm bg-linear-to-br from-secondary/30 via-primary/25 to-accent/30 text-foreground ring-1 ring-primary/25 ring-offset-1 ring-offset-background dark:bg-linear-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground dark:ring-primary/40">
                          {user.isMaxUser ? 'max' : 'pro'}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              </Button>

              {/* Expanded state trigger on the right of the logo */}
              <div className="absolute top-2 right-2 group-data-[collapsible=icon]:hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarTrigger className="size-8" />
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" hidden={state !== 'expanded' || isMobile}>
                    Close Sidebar <span className="text-xs text-secondary pl-0.5">⌘B</span>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Collapsed state: show trigger on hover overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none group-data-[collapsible=icon]:group-hover:opacity-100 group-data-[collapsible=icon]:group-hover:pointer-events-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarTrigger className="size-8 transition-opacity duration-200 opacity-0 group-data-[collapsible=icon]:group-hover:opacity-100" />
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" hidden={state !== 'collapsed' || isMobile}>
                    Open Sidebar
                    <span className="text-xs text-secondary pl-1">⌘B</span>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Static Navigation - does not scroll */}
      <SidebarGroup className="p-2 pb-0 gap-0 shrink-0">
        <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
          {/* New Chat - Primary Action */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="New Chat"
              className="bg-primary/10 hover:bg-primary/20 text-sidebar-accent-foreground font-medium transition-all duration-200 active:scale-[0.98]"
            >
              <Link
                prefetch
                href="/new"
                onClick={closeMobileSidebar}
                className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
              >
                <PlusIcon size={18} weight="bold" />
                <span className="group-data-[collapsible=icon]:hidden">New Search</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Search Library"
                className={cn(
                  'hover:bg-primary/10 transition-all duration-200',
                  pathname === '/searches' || pathname?.startsWith('/searches/')
                    ? 'bg-primary/15 text-foreground font-medium'
                    : '',
                )}
              >
                <Link
                  href="/searches"
                  onClick={closeMobileSidebar}
                  className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
                >
                  <HugeiconsIcon icon={FolderLibraryIcon} size={18} />
                  <span className="group-data-[collapsible=icon]:hidden">Search Library</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Tools Section Label */}
          {user && (
            <div className="px-2 py-1.5 group-data-[collapsible=icon]:hidden">
              <span className="font-pixel text-[11px] text-muted-foreground/60 uppercase tracking-[0.12em]">Tools</span>
            </div>
          )}

          {/* Lookout */}
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Lookout"
                className={cn(
                  'hover:bg-primary/10 transition-all duration-200',
                  pathname === '/lookout' || pathname?.startsWith('/lookout/')
                    ? 'bg-primary/15 text-foreground font-medium'
                    : '',
                )}
              >
                <Link
                  href="/lookout"
                  onClick={closeMobileSidebar}
                  className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
                >
                  <HugeiconsIcon icon={BinocularsIcon} size={18} />
                  <span className="group-data-[collapsible=icon]:hidden">Lookout</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Apps */}
          {user && process.env.NEXT_PUBLIC_MCP_ENABLED === 'true' && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Apps"
                className={cn(
                  'hover:bg-primary/10 transition-all duration-200',
                  pathname === '/apps' || pathname?.startsWith('/apps/')
                    ? 'bg-primary/15 text-foreground font-medium'
                    : '',
                )}
              >
                <Link
                  href="/apps"
                  onClick={closeMobileSidebar}
                  className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
                >
                  <AppsIcon width={18} height={18} />
                  <span className="group-data-[collapsible=icon]:hidden">Apps</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* XQL */}
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="XQL (Beta) - X/Twitter Search"
                className={cn(
                  'hover:bg-primary/10 transition-all duration-200',
                  pathname === '/xql' ? 'bg-primary/15 text-foreground font-medium' : '',
                )}
              >
                <Link
                  href="/xql"
                  onClick={closeMobileSidebar}
                  className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
                >
                  <XLogoIcon size={18} weight="regular" />
                  <span className="group-data-[collapsible=icon]:hidden">XQL (Beta)</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Voice */}
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Voice"
                className={cn(
                  'hover:bg-primary/10 transition-all duration-200',
                  pathname === '/voice' ? 'bg-primary/15 text-foreground font-medium' : '',
                )}
              >
                <Link
                  href="/voice"
                  onClick={closeMobileSidebar}
                  className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
                >
                  <AudioLinesIcon size={18} />
                  <span className="group-data-[collapsible=icon]:hidden">Voice</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Build */}
          {/* {user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Build"
                className={cn(
                  'hover:bg-primary/10 transition-all duration-200',
                  pathname === '/build' || pathname?.startsWith('/build/')
                    ? 'bg-primary/15 text-foreground font-medium'
                    : ''
                )}
              >
                <Link
                  href="/build"
                  onClick={closeMobileSidebar}
                  className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 12l-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9" /><path d="M17.64 15 22 10.64" /><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91" /></svg>
                  <span className="group-data-[collapsible=icon]:hidden">Build</span>
                  <span className="group-data-[collapsible=icon]:hidden text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary font-medium ml-auto">Pro</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )} */}

          {/* InMail */}
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="InMail - AI Email Research Agent"
                className="hover:bg-primary/10 transition-all duration-200"
              >
                <a
                  href="https://inmail.scira.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMobileSidebar}
                  className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
                >
                  <HugeiconsIcon icon={Mail02Icon} size={18} />
                  <span className="group-data-[collapsible=icon]:hidden">InMail</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* API */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="API" className="hover:bg-primary/10 transition-all duration-200">
              <a
                href="https://api.scira.ai/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileSidebar}
                className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
              >
                <CodeIcon size={18} weight="regular" />
                <span className="group-data-[collapsible=icon]:hidden">API</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Guest Info Links when signed out */}
          {!user &&
            signedOutLinks.map((link) => {
              const Icon = link.icon;
              const content = (
                <>
                  <Icon size={18} weight="regular" />
                  <span className="group-data-[collapsible=icon]:hidden">{link.label}</span>
                </>
              );

              return (
                <SidebarMenuItem key={link.id}>
                  <SidebarMenuButton asChild tooltip={link.label} className="hover:bg-primary/10">
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={closeMobileSidebar}
                        className="flex items-center gap-2 w-full"
                      >
                        {content}
                      </a>
                    ) : (
                      <Link
                        prefetch
                        href={link.href}
                        onClick={closeMobileSidebar}
                        className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
                      >
                        {content}
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
        </SidebarMenu>

        {/* Recent section title - fixed, does not scroll */}
        {user && (
          <button
            type="button"
            onClick={() => setIsRecentCollapsed((prev) => !prev)}
            className="px-2 pt-2 pb-1 group-data-[collapsible=icon]:hidden flex w-full items-center justify-between text-left text-muted-foreground/80 hover:text-foreground transition-colors"
            aria-expanded={!isRecentCollapsed}
          >
            <span className="font-pixel text-[11px] uppercase tracking-[0.12em]">Recent</span>
            <ChevronDown
              className={cn('h-3 w-3 transition-transform duration-150', isRecentCollapsed ? '-rotate-90' : 'rotate-0')}
            />
          </button>
        )}
      </SidebarGroup>

      {/* Scrollable Content - only recent chats scroll */}
      <SidebarContent className="p-2 pt-0">
        <SidebarMenu className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
          {/* Recent Chats - With Date Grouping */}
          {user && !isRecentCollapsed && (
            <>
              {/* Expanded state - chat list */}
              <div className="group-data-[collapsible=icon]:hidden">
                {isChatsLoading && !recentChats.length ? (
                  // Loading skeletons with staggered animation
                  Array.from({ length: 5 }).map((_, index) => (
                    <SidebarMenuItem key={`chat-skeleton-${index}`}>
                      <div
                        className="flex items-center w-full gap-2 rounded-md px-2 py-1.5 animate-pulse"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <Skeleton className="h-4 flex-1 bg-primary/10 rounded" />
                      </div>
                    </SidebarMenuItem>
                  ))
                ) : recentChats.length > 0 ? (
                  <>
                    {pinnedRecentChats.length > 0 && (
                      <div className="mb-2">
                        <div className="px-2 py-1">
                          <span className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-[0.12em]">
                            Pinned
                          </span>
                        </div>
                        {pinnedRecentChats.map((chat: any) => {
                          const isCurrentChat = pathname?.includes(chat.id);
                          const isPublic = chat.visibility === 'public';
                          const normalizedVisibility: VisibilityType = isPublic ? 'public' : 'private';
                          const isMenuOpen = openMenuChatId === chat.id;
                          const isPinned = Boolean(chat.isPinned);

                          const handleRenameClick = () => {
                            setRenameTarget({ id: chat.id, title: chat.title });
                            setRenameValue(chat.title || 'Untitled Chat');
                          };

                          const handleShareClick = () => {
                            setShareTarget({ id: chat.id, visibility: normalizedVisibility });
                            setShareVisibility(normalizedVisibility);
                            setShareDialogOpen(true);
                          };

                          const handleDeleteClick = () => {
                            setDeleteTarget({ id: chat.id, title: chat.title });
                          };

                          return (
                            <SidebarMenuItem key={chat.id}>
                              <DropdownMenu
                                open={isMenuOpen}
                                onOpenChange={(open) => setOpenMenuChatId(open ? chat.id : null)}
                              >
                                <div
                                  className={cn(
                                    'group flex items-center w-full rounded-md transition-all duration-200',
                                    isCurrentChat || isMenuOpen ? 'bg-primary/15' : 'hover:bg-primary/8',
                                  )}
                                >
                                  <Link
                                    prefetch
                                    href={`/search/${chat.id}`}
                                    onClick={closeMobileSidebar}
                                    className={cn(
                                      'flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5',
                                      isCurrentChat && 'font-medium',
                                    )}
                                  >
                                    {isPublic && <Globe className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                                    <span className="truncate flex-1 text-sm">{chat.title || 'Untitled Chat'}</span>
                                  </Link>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 opacity-60 hover:opacity-100 data-[state=open]:opacity-100 text-muted-foreground hover:text-foreground shrink-0 mr-1 transition-opacity duration-150"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Open chat actions</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" side="right" sideOffset={20}>
                                    <DropdownMenuItem onClick={() => togglePinnedChat(chat.id)}>
                                      {isPinned ? (
                                        <PinOff className="h-4 w-4 mr-2" />
                                      ) : (
                                        <Pin className="h-4 w-4 mr-2" />
                                      )}
                                      {isPinned ? 'Unpin' : 'Pin'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleRenameClick}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit title
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleShareClick}>
                                      <Share2 className="h-4 w-4 mr-2" />
                                      Share
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={handleDeleteClick}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </div>
                              </DropdownMenu>
                            </SidebarMenuItem>
                          );
                        })}
                      </div>
                    )}
                    {/* Date-grouped chats */}
                    {groupedChats.map((group) => (
                      <div key={group.label} className="mb-2">
                        <div className="px-2 py-1">
                          <span className="font-pixel text-[10px] text-muted-foreground/50 uppercase tracking-[0.12em]">
                            {group.label}
                          </span>
                        </div>
                        {group.chats.map((chat: any) => {
                          const isCurrentChat = pathname?.includes(chat.id);
                          const isPublic = chat.visibility === 'public';
                          const normalizedVisibility: VisibilityType = isPublic ? 'public' : 'private';
                          const isMenuOpen = openMenuChatId === chat.id;
                          const isPinned = Boolean(chat.isPinned);

                          const handleRenameClick = () => {
                            setRenameTarget({ id: chat.id, title: chat.title });
                            setRenameValue(chat.title || 'Untitled Chat');
                          };

                          const handleShareClick = () => {
                            setShareTarget({ id: chat.id, visibility: normalizedVisibility });
                            setShareVisibility(normalizedVisibility);
                            setShareDialogOpen(true);
                          };

                          const handleDeleteClick = () => {
                            setDeleteTarget({ id: chat.id, title: chat.title });
                          };

                          return (
                            <SidebarMenuItem key={chat.id}>
                              <DropdownMenu
                                open={isMenuOpen}
                                onOpenChange={(open) => setOpenMenuChatId(open ? chat.id : null)}
                              >
                                <div
                                  className={cn(
                                    'group flex items-center w-full rounded-md transition-all duration-200',
                                    isCurrentChat || isMenuOpen ? 'bg-primary/15' : 'hover:bg-primary/8',
                                  )}
                                >
                                  <Link
                                    prefetch
                                    href={`/search/${chat.id}`}
                                    onClick={closeMobileSidebar}
                                    className={cn(
                                      'flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5',
                                      isCurrentChat && 'font-medium',
                                    )}
                                  >
                                    {isPublic && <Globe className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                                    <span className="truncate flex-1 text-sm">{chat.title || 'Untitled Chat'}</span>
                                  </Link>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 opacity-60 hover:opacity-100 data-[state=open]:opacity-100 text-muted-foreground hover:text-foreground shrink-0 mr-1 transition-opacity duration-150"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">Open chat actions</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" side="right" sideOffset={20}>
                                    <DropdownMenuItem onClick={() => togglePinnedChat(chat.id)}>
                                      {isPinned ? (
                                        <PinOff className="h-4 w-4 mr-2" />
                                      ) : (
                                        <Pin className="h-4 w-4 mr-2" />
                                      )}
                                      {isPinned ? 'Unpin' : 'Pin'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleRenameClick}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit title
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleShareClick}>
                                      <Share2 className="h-4 w-4 mr-2" />
                                      Share
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={handleDeleteClick}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </div>
                              </DropdownMenu>
                            </SidebarMenuItem>
                          );
                        })}
                      </div>
                    ))}
                  </>
                ) : (
                  <SidebarMenuItem>
                    <div className="px-2 py-1.5">
                      <span className="text-sm text-sidebar-foreground/50">No chats yet</span>
                    </div>
                  </SidebarMenuItem>
                )}
              </div>
            </>
          )}
        </SidebarMenu>

        {/* Upgrade */}
        {user && !isProUser && (
          <SidebarGroup className="p-0 mt-auto">
            <SidebarGroupContent>
              {/* Expanded state */}
              <div className="group-data-[collapsible=icon]:hidden">
                <Link
                  prefetch={true}
                  href="/pricing"
                  onClick={closeMobileSidebar}
                  className="relative flex flex-col gap-1.5 rounded-2xl p-4 pb-3 bg-muted hover:bg-muted/80 transition-colors overflow-hidden group/upgrade"
                >
                  <span className="text-base font-medium">Upgrade to Pro</span>
                  <span className="text-xs text-muted-foreground pr-12">
                    Unlimited searches, 100+ apps, voice & more
                  </span>
                  <div className="absolute -bottom-2 -right-2 flex items-center justify-center size-14 rounded-full bg-background group-hover/upgrade:scale-110 transition-transform duration-300">
                    <HugeiconsIcon icon={Crown02Icon} size={22} className="text-foreground" />
                  </div>
                </Link>
              </div>

              {/* Collapsed state */}
              <div className="hidden group-data-[collapsible=icon]:block">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      prefetch={true}
                      href="/pricing"
                      onClick={closeMobileSidebar}
                      className="flex items-center justify-center size-8 mx-auto rounded-full bg-muted hover:bg-muted/80 transition-colors"
                    >
                      <HugeiconsIcon icon={Crown02Icon} size={16} className="text-foreground" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center">
                    Upgrade to Pro
                  </TooltipContent>
                </Tooltip>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer - User Account with Dropdown Menu */}
      <SidebarFooter className="group-data-[collapsible=icon]:border-none border-t border-border p-0 gap-0">
        {user ? (
          <SidebarMenu className="gap-0">
            <SidebarMenuItem>
              {/* Expanded state - full user card as dropdown trigger */}
              <div className="group-data-[collapsible=icon]:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex w-full items-center justify-between gap-2 px-3 py-4 text-left outline-hidden ring-0 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-0 active:bg-primary/20 active:text-sidebar-accent-foreground">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative shrink-0">
                          <div className={cn('rounded-full', isProUser && 'p-[1.5px] bg-primary')}>
                            <Avatar
                              className={cn(
                                'h-8 w-8 overflow-hidden rounded-full mask-[radial-gradient(white,black)] [-webkit-mask-image:-webkit-radial-gradient(white,black)]',
                                isProUser && 'ring-[1.5px] ring-sidebar',
                              )}
                            >
                              <AvatarImage src={user.image || ''} className={cn(blurPersonalInfo && 'blur-sm')} />
                              <AvatarFallback
                                className={cn(
                                  'bg-primary text-primary-foreground font-semibold',
                                  blurPersonalInfo && 'blur-sm',
                                )}
                              >
                                {user.name
                                  ? user.name
                                      .split(' ')
                                      .map((n: string) => n[0])
                                      .join('')
                                      .toUpperCase()
                                  : 'U'}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          {isProUser && (
                            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-center justify-center h-3.5 px-1 pb-0.5 rounded-full text-[10px] font-baumans leading-none bg-primary text-primary-foreground shadow-xs">
                              {user?.isMaxUser ? 'max' : 'pro'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.25 leading-none flex-1 min-w-0 items-start">
                          <span
                            className={cn(
                              'font-semibold text-sm truncate text-sidebar-foreground text-left w-full',
                              blurPersonalInfo && 'blur-sm',
                            )}
                          >
                            {user.name || 'User'}
                          </span>
                          <span className="text-xs text-sidebar-foreground/70 truncate text-left w-full">
                            {isProUser ? (
                              <span>
                                Scira{' '}
                                <span className="font-pixel text-[10px] uppercase tracking-wider">
                                  {user?.isMaxUser ? 'Max' : 'Pro'}
                                </span>
                              </span>
                            ) : (
                              'Scira Free'
                            )}
                          </span>
                        </div>
                      </div>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="top"
                    align="center"
                    className="w-62"
                    sideOffset={4}
                    collisionPadding={{ bottom: 20 }}
                  >
                    <UserDropdownContent
                      user={user}
                      isProUser={Boolean(isProUser)}
                      blurPersonalInfo={Boolean(blurPersonalInfo)}
                      closeMobileSidebar={closeMobileSidebar}
                      onShortcutsOpen={() => setKeyboardShortcutsOpen(true)}
                      isMobile={Boolean(isMobile)}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Collapsed state - avatar with dropdown */}
              <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center py-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 p-0 overflow-visible">
                      <div className="relative">
                        <div className={cn('rounded-full', isProUser && 'p-[1.5px] bg-primary')}>
                          <Avatar
                            className={cn(
                              'h-6 w-6 overflow-hidden rounded-full mask-[radial-gradient(white,black)] [-webkit-mask-image:-webkit-radial-gradient(white,black)]',
                              isProUser && 'ring-[1.5px] ring-sidebar',
                            )}
                          >
                            <AvatarImage src={user.image || ''} className={cn(blurPersonalInfo && 'blur-sm')} />
                            <AvatarFallback
                              className={cn(
                                'bg-primary text-primary-foreground font-semibold text-xs',
                                blurPersonalInfo && 'blur-sm',
                              )}
                            >
                              {user.name
                                ? user.name
                                    .split(' ')
                                    .map((n: string) => n[0])
                                    .join('')
                                    .toUpperCase()
                                : 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        {isProUser && (
                          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-center justify-center h-3 px-1 pb-0.5 rounded-full text-[9px] font-baumans leading-none bg-primary text-primary-foreground shadow-xs">
                            {user?.isMaxUser ? 'max' : 'pro'}
                          </span>
                        )}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="end" className="w-60">
                    <UserDropdownContent
                      user={user}
                      isProUser={Boolean(isProUser)}
                      blurPersonalInfo={Boolean(blurPersonalInfo)}
                      closeMobileSidebar={closeMobileSidebar}
                      onShortcutsOpen={() => setKeyboardShortcutsOpen(true)}
                      isMobile={Boolean(isMobile)}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <SidebarMenu className="gap-0 p-2">
            {/* Expanded state */}
            <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
              <Link
                prefetch={true}
                href="/sign-in"
                onClick={closeMobileSidebar}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10">
                  <SignIn size={16} weight="regular" className="text-primary" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium truncate">Sign In</span>
                  <span className="font-pixel text-[8px] text-muted-foreground uppercase tracking-wider truncate">
                    Free &middot; No credit card
                  </span>
                </div>
              </Link>
            </SidebarMenuItem>

            {/* Collapsed state */}
            <SidebarMenuItem className="hidden group-data-[collapsible=icon]:block">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    prefetch={true}
                    href="/sign-in"
                    onClick={closeMobileSidebar}
                    className="flex items-center justify-center size-8 mx-auto rounded-md bg-primary/10 hover:bg-primary/15 transition-colors"
                  >
                    <SignIn size={16} weight="regular" className="text-primary" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" align="center">
                  Sign In
                </TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>

      {user && (
        <>
          <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => (!open ? closeRenameDialog() : null)}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>Edit title</DialogTitle>
              </DialogHeader>
              <div className="pt-2">
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRenameSubmit();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      closeRenameDialog();
                    }
                  }}
                  maxLength={100}
                  placeholder="Enter title..."
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeRenameDialog}>
                  Cancel
                </Button>
                <Button onClick={handleRenameSubmit} disabled={isRenaming}>
                  {isRenaming ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ShareDialog
            isOpen={Boolean(shareDialogOpen && shareTarget)}
            onOpenChange={(open) => {
              if (open) {
                setShareDialogOpen(true);
              } else {
                closeShareDialog();
              }
            }}
            chatId={shareTarget?.id ?? null}
            selectedVisibilityType={shareVisibility}
            onVisibilityChange={handleShareVisibilityChange}
            isOwner
            user={user}
          />

          <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => (!open ? closeDeleteDialog() : null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete{' '}
                  <span className="font-medium text-foreground">{deleteTarget?.title || 'this chat'}</span> and all of
                  its content.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      <KeyboardShortcutsDialog open={keyboardShortcutsOpen} onOpenChange={setKeyboardShortcutsOpen} />
    </Sidebar>
  );
});

AppSidebar.displayName = 'AppSidebar';
