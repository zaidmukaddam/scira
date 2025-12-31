'use client';

import React, { memo, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  SunIcon,
  MoonIcon,
  UsersIcon,
} from '@phosphor-icons/react';
import { Crown02Icon, BinocularsIcon, SearchList02Icon, FolderLibraryIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@/components/ui/hugeicons';
import {
  RocketIcon as VercelIcon,
  MonitorIcon,
  Globe,
  ChevronsUpDown,
  MoreHorizontal,
  Pencil,
  Share2,
  Trash2,
  Keyboard,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteChat, getUserChats, updateChatTitle, updateChatVisibility } from '@/app/actions';
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
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useTheme } from 'next-themes';
import { Button } from './ui/button';
import { useSyncedPreferences } from '@/hooks/use-synced-preferences';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AudioLinesIcon } from '@/components/ui/audio-lines';
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
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type VisibilityType = 'public' | 'private';

type SignedOutLink = {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  external?: boolean;
};

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
  setIsCustomInstructionsEnabled?: (value: boolean | ((val: boolean) => boolean)) => void;
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
    const chatDate = new Date(chat.createdAt);
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
  const { theme, setTheme } = useTheme();
  const [blurPersonalInfo] = useSyncedPreferences<boolean>('scira-blur-personal-info', false);
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

  // Fetch recent chats - optimized with smart caching
  const { data: chatsData, isLoading: isChatsLoading } = useQuery({
    queryKey: ['recent-chats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { chats: [], hasMore: false };
      return await getUserChats(user.id, 8); // Get 8 recent chats
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false, // Disable refetch on window focus for better performance
    refetchOnMount: false, // Use cached data when available instead of always refetching
    staleTime: 0, // Always consider data stale so refetch works immediately
    gcTime: 1000 * 60 * 30, // 30 minutes - keep in cache much longer
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching new
    refetchOnReconnect: false, // Don't refetch on reconnect
  });

  const recentChats = chatsData?.chats || [];

  // Group chats by date
  const groupedChats = useMemo(() => groupChatsByDate(recentChats), [recentChats]);

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

  const handleRenameSubmit = async () => {
    if (!renameTarget) return;
    const next = renameValue.trim();

    if (!next) {
      toast.error('Title cannot be empty');
      return;
    }

    if (next.length > 100) {
      toast.error('Title is too long (max 100 characters)');
      return;
    }

    setIsRenaming(true);
    try {
      const updated = await updateChatTitle(renameTarget.id, next);
      if (updated) {
        toast.success('Chat renamed');
        closeRenameDialog();
        invalidateRecentChats();
      } else {
        toast.error('Failed to rename chat');
      }
    } catch (error) {
      console.error('Rename chat error:', error);
      toast.error('Failed to rename chat');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleShareVisibilityChange = async (visibility: VisibilityType) => {
    if (!shareTarget) return;

    try {
      await updateChatVisibility(shareTarget.id, visibility);
      setShareVisibility(visibility);
      toast.success(visibility === 'public' ? 'Chat shared' : 'Chat is now private');
      invalidateRecentChats();
    } catch (error) {
      console.error('Share visibility error:', error);
      toast.error('Failed to update visibility');
      throw error;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteChat(deleteTarget.id);
      toast.success('Chat deleted');
      closeDeleteDialog();
      invalidateRecentChats();
    } catch (error) {
      console.error('Delete chat error:', error);
      toast.error('Failed to delete chat');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleTheme = () => {
    // Cycle through system → light → dark → system...
    if (theme === 'system') {
      setTheme('light');
    } else if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('system');
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'system':
        return <MonitorIcon size={18} />;
      case 'light':
        return <SunIcon size={18} weight="regular" />;
      case 'dark':
        return <MoonIcon size={18} weight="regular" />;
      default:
        return <MonitorIcon size={18} />;
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="shadow-none! border-none! **:data-[slot=sidebar-inner]:dark:bg-primary/4 **:data-[slot=sidebar-inner]:bg-primary/10 **:data-[slot=sidebar-inner]:text-sidebar-foreground **:data-[slot=sidebar-gap]:bg-transparent"
    >
      {/* Header */}
      <SidebarHeader className="p-0!">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="relative flex items-center w-full h-12 px-2 overflow-visible">
              <div className="flex items-center gap-1 w-full group-data-[collapsible=icon]:justify-center">
                <div className="flex items-center justify-center size-8 transition-opacity duration-200 group-data-[collapsible=icon]:group-hover:opacity-0">
                  <SciraLogo width={26} height={26} />
                </div>
                <div className="flex flex-row items-center gap-2 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="font-be-vietnam-pro font-light tracking-tighter text-xl">scira</span>
                  {user && isProUser && (
                    <div className="w-fit">
                      <span className="animate-shimmer text-xs font-baumans inline-flex items-center justify-center min-w-6 h-4 px-1.5 pt-0 pb-0.5 rounded-md shadow-sm bg-linear-to-br from-secondary/30 via-primary/25 to-accent/30 text-foreground ring-1 ring-primary/25 ring-offset-1 ring-offset-background dark:bg-linear-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground dark:ring-primary/40">
                        pro
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded state trigger on the right of the logo */}
              <div className="absolute top-2 right-2 group-data-[collapsible=icon]:hidden">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarTrigger className="size-8" />
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" hidden={state !== 'expanded' || isMobile}>
                    Close Sidebar <span className='text-xs text-secondary pl-0.5'>⌘B</span>
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
                    <span className='text-xs text-secondary pl-1'>⌘B</span>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main Content */}
      <SidebarContent className="p-2">
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
                <span className="group-data-[collapsible=icon]:hidden">New Chat</span>
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
                  prefetch={true}
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
              <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                Tools
              </span>
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
                  prefetch={true}
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

          {/* XQL */}
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="XQL (Beta) - X/Twitter Search"
                className={cn(
                  'hover:bg-primary/10 transition-all duration-200',
                  pathname === '/xql' ? 'bg-primary/15 text-foreground font-medium' : ''
                )}
              >
                <Link
                  prefetch={true}
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
                  pathname === '/voice' ? 'bg-primary/15 text-foreground font-medium' : ''
                )}
              >
                <Link
                  prefetch={true}
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

          {/* X Wrapped */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="X Wrapped 2025"
              className={cn(
                'hover:bg-primary/10 transition-all duration-200',
                pathname === '/x-wrapped' ? 'bg-primary/15 text-foreground font-medium' : ''
              )}
            >
              <Link
                prefetch={true}
                href="/x-wrapped"
                onClick={closeMobileSidebar}
                className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
              >
                <XLogoIcon size={18} weight="regular" />
                <span className="group-data-[collapsible=icon]:hidden">X Wrapped</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* API */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="API"
              className="hover:bg-primary/10 transition-all duration-200"
            >
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
                      <a href={link.href} target="_blank" rel="noopener noreferrer" onClick={closeMobileSidebar} className="flex items-center gap-2 w-full">
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

          {/* Recent Chats - With Date Grouping */}
          {user && (
            <>
              {/* Expanded state - Accordion with date groups */}
              <div className="group-data-[collapsible=icon]:hidden">
                <Accordion type="single" collapsible defaultValue="recent" className="w-full">
                  <AccordionItem value="recent" className="border-none">
                    <SidebarMenuItem>
                      <AccordionTrigger className="px-2 py-2 hover:no-underline [&>svg]:size-3 [&>svg]:text-sidebar-foreground/50">
                        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                          Recent Chats
                        </span>
                      </AccordionTrigger>
                    </SidebarMenuItem>
                    <AccordionContent className="pb-0">
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
                          {/* Date-grouped chats */}
                          {groupedChats.map((group) => (
                            <div key={group.label} className="mb-2">
                              <div className="px-2 py-1">
                                <span className="text-[10px] font-medium text-muted-foreground/50 uppercase">
                                  {group.label}
                                </span>
                              </div>
                              {group.chats.map((chat: any) => {
                                const isCurrentChat = pathname?.includes(chat.id);
                                const isPublic = chat.visibility === 'public';
                                const normalizedVisibility: VisibilityType = isPublic ? 'public' : 'private';
                                const isMenuOpen = openMenuChatId === chat.id;

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
                                          isCurrentChat || isMenuOpen
                                            ? 'bg-primary/15'
                                            : 'hover:bg-primary/8',
                                        )}
                                      >
                                        <Link
                                          prefetch={true}
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
                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 text-muted-foreground hover:text-foreground shrink-0 mr-1 transition-opacity duration-150"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">Open chat actions</span>
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" side="right" sideOffset={20}>
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
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                {/* View All Button - Outside accordion */}
                {recentChats.length > 0 && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => { closeMobileSidebar(); onHistoryClick(); }}
                      className="hover:bg-primary/10 w-full transition-all duration-200"
                    >
                      <HugeiconsIcon icon={SearchList02Icon} size={18} />
                      <span className="text-sm">View All</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </div>

              {/* Collapsed state - Show only View All button */}
              <div className="hidden group-data-[collapsible=icon]:block">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => { closeMobileSidebar(); onHistoryClick(); }}
                    tooltip="View All Chats"
                    className="hover:bg-primary/10 transition-all duration-200"
                  >
                    <HugeiconsIcon icon={SearchList02Icon} size={18} />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </div>
            </>
          )}

        </SidebarMenu>

        {/* Upgrade */}
        {user && !isProUser && (
          <SidebarGroup className="p-0 mt-auto">
            <SidebarGroupContent>
              <SidebarMenu className="p-0">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Upgrade to Pro">
                    <Link
                      prefetch={true}
                      href="/pricing"
                      onClick={closeMobileSidebar}
                      className="relative overflow-hidden w-full flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
                    >
                      <div className="absolute inset-0 bg-linear-to-r from-primary/20 via-primary/15 to-primary/20 rounded-md" />
                      <HugeiconsIcon icon={Crown02Icon} size={18} className="text-primary relative z-10" />
                      <span className="group-data-[collapsible=icon]:sr-only font-medium text-primary relative z-10">
                        Upgrade to Pro
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer - User Account with Dropdown Menu */}
      <SidebarFooter>
        {user ? (
          <SidebarMenu>
            <SidebarMenuItem>
              {/* Expanded state - full user card as dropdown trigger */}
              <div className="group-data-[collapsible=icon]:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center justify-between w-full p-2 rounded-md hover:bg-primary/8 transition-all duration-200 cursor-pointer focus:outline-none! focus:ring-0! focus:ring-offset-0! active:scale-[0.98]">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0 overflow-hidden rounded-lg mask-[radial-gradient(white,black)] [-webkit-mask-image:-webkit-radial-gradient(white,black)]">
                          <AvatarImage
                            src={user.image || ''}
                            className={cn(blurPersonalInfo && 'blur-sm')}
                          />
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
                        <div className="flex flex-col gap-0.5 leading-none flex-1 min-w-0 items-start">
                          <span
                            className={cn(
                              'font-semibold text-sm truncate text-sidebar-foreground text-left w-full',
                              blurPersonalInfo && 'blur-sm',
                            )}
                          >
                            {user.name || 'User'}
                          </span>
                          <span className="text-xs text-sidebar-foreground/70 truncate text-left w-full">
                            {isProUser ? 'Scira Pro' : 'Scira Free'}
                          </span>
                        </div>
                      </div>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) bg-background border shadow-lg" sideOffset={4} collisionPadding={{ bottom: 20 }}>
                    {/* Settings */}
                    <DropdownMenuItem asChild>
                      <Link href="/settings" onClick={closeMobileSidebar}>
                        <GearIcon size={16} weight="regular" className="mr-2" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Theme Switcher in dropdown */}
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span className="text-sm">Theme</span>
                      <ThemeSwitcher />
                    </div>

                    <DropdownMenuSeparator />

                    {/* Information Submenu */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <InfoIcon size={16} weight="regular" className="mr-2" />
                        <span>Information</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent sideOffset={8} alignOffset={-20} collisionPadding={{ bottom: 20 }} className="bg-background border shadow-lg">
                        <DropdownMenuItem onClick={() => { closeMobileSidebar(); setKeyboardShortcutsOpen(true); }}>
                          <Keyboard size={16} className="mr-2" />
                          <span>Shortcuts</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/about" onClick={closeMobileSidebar}>
                            <InfoIcon size={16} weight="regular" className="mr-2" />
                            <span>About</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/blog" target="_blank" rel="noopener noreferrer" onClick={closeMobileSidebar}>
                            <BookIcon size={16} weight="regular" className="mr-2" />
                            <span>Blog</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/terms" onClick={closeMobileSidebar}>
                            <FileTextIcon size={16} weight="regular" className="mr-2" />
                            <span>Terms</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/privacy-policy" onClick={closeMobileSidebar}>
                            <ShieldIcon size={16} weight="regular" className="mr-2" />
                            <span>Privacy</span>
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    {/* Community Submenu */}
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <UsersIcon size={16} weight="regular" className="mr-2" />
                        <span>Community</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent sideOffset={8} alignOffset={-20} collisionPadding={{ bottom: 20 }} className="bg-background border shadow-lg">
                        <DropdownMenuItem asChild>
                          <a href="https://git.new/scira" target="_blank" rel="noopener noreferrer" onClick={closeMobileSidebar}>
                            <GithubLogoIcon size={16} weight="regular" className="mr-2" />
                            <span>GitHub</span>
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href="https://x.com/sciraai" target="_blank" rel="noopener noreferrer" onClick={closeMobileSidebar}>
                            <XLogoIcon size={16} weight="regular" className="mr-2" />
                            <span>X.com</span>
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href="https://www.instagram.com/scira.ai" target="_blank" rel="noopener noreferrer" onClick={closeMobileSidebar}>
                            <InstagramLogoIcon size={16} weight="regular" className="mr-2" />
                            <span>Instagram</span>
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href="https://scira.userjot.com" target="_blank" rel="noopener noreferrer" onClick={closeMobileSidebar}>
                            <BugIcon size={16} weight="regular" className="mr-2" />
                            <span>Feedback</span>
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a
                            href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzaidmukaddam%2Fscira"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={closeMobileSidebar}
                          >
                            <VercelIcon size={16} className="mr-2" />
                            <span>Deploy</span>
                          </a>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Collapsed state - avatar with dropdown */}
              <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                      <Avatar className="h-6 w-6 overflow-hidden rounded-full mask-[radial-gradient(white,black)] [-webkit-mask-image:-webkit-radial-gradient(white,black)]">
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
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="end" className="w-56 bg-popover border shadow-lg">
                    {/* User info header */}
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-semibold">{user.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{isProUser ? 'Scira Pro' : 'Scira Free'}</p>
                    </div>

                    <DropdownMenuSeparator />

                    {/* Settings */}
                    <DropdownMenuItem asChild>
                      <Link href="/settings" onClick={closeMobileSidebar}>
                        <GearIcon size={16} weight="regular" className="mr-2" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>

                    {/* Theme toggle */}
                    <DropdownMenuItem onClick={toggleTheme}>
                      {getThemeIcon()}
                      <span className="ml-2">{({ 'system': 'System', 'light': 'Light', 'dark': 'Dark' }[theme as string] || 'System')} Theme</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {/* Quick links */}
                    <DropdownMenuItem onClick={() => { closeMobileSidebar(); setKeyboardShortcutsOpen(true); }}>
                      <Keyboard size={16} className="mr-2" />
                      <span>Shortcuts</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/about" onClick={closeMobileSidebar}>
                        <InfoIcon size={16} weight="regular" className="mr-2" />
                        <span>About</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="https://git.new/scira" target="_blank" rel="noopener noreferrer" onClick={closeMobileSidebar}>
                        <GithubLogoIcon size={16} weight="regular" className="mr-2" />
                        <span>GitHub</span>
                      </a>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Sign In">
                <Link prefetch={true} href="/sign-in" onClick={closeMobileSidebar}>
                  <SignIn size={18} weight="regular" />
                  <span className="group-data-[collapsible=icon]:sr-only">Sign In</span>
                </Link>
              </SidebarMenuButton>
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
                  <span className="font-medium text-foreground">{deleteTarget?.title || 'this chat'}</span> and all of its
                  content.
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
