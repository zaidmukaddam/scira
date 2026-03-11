'use client';

import React, { memo, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  PlusIcon,
  GearIcon,
  CodeIcon,
  SignIn,
  InstagramLogoIcon,
  InfoIcon,
  FileTextIcon,
  ShieldIcon,
  MoonIcon,
  SunIcon,
  UsersIcon,
  FolderOpenIcon,
  CrownSimpleIcon,
  KeyIcon,
} from '@phosphor-icons/react';
import { Crown02Icon, SearchList02Icon } from '@hugeicons/core-free-icons';
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
import { PRIMARY_ADMIN_EMAILS } from '@/lib/admin-constants';
import { SouthernCrossLogo } from '@/components/logos/southerncross-logo';
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
import { SignInPromptDialog } from '@/components/sign-in-prompt-dialog';
import { toast } from 'sonner';

type VisibilityType = 'public' | 'private';

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

// Group chats by date bucket
const groupChatsByDate = (chats: any[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todayChats: any[] = [];
  const yesterdayChats: any[] = [];
  const thisWeekChats: any[] = [];
  const olderChats: any[] = [];

  chats.forEach((chat) => {
    const chatDay = new Date(new Date(chat.createdAt).setHours(0, 0, 0, 0));
    if (chatDay.getTime() === today.getTime()) todayChats.push(chat);
    else if (chatDay.getTime() === yesterday.getTime()) yesterdayChats.push(chat);
    else if (chatDay > weekAgo) thisWeekChats.push(chat);
    else olderChats.push(chat);
  });

  const groups: { label: string; chats: any[] }[] = [];
  if (todayChats.length) groups.push({ label: 'Today', chats: todayChats });
  if (yesterdayChats.length) groups.push({ label: 'Yesterday', chats: yesterdayChats });
  if (thisWeekChats.length) groups.push({ label: 'This Week', chats: thisWeekChats });
  if (olderChats.length) groups.push({ label: 'Older', chats: olderChats });
  return groups;
};

export const AppSidebar = memo(({ user, onHistoryClick, isProUser }: AppSidebarProps) => {
  const { theme, setTheme } = useTheme();
  const [blurPersonalInfo] = useSyncedPreferences<boolean>('scira-blur-personal-info', false);
  const { state, isMobile, setOpenMobile } = useSidebar();
  const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] = React.useState(false);
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // Dialog state
  const [renameTarget, setRenameTarget] = React.useState<{ id: string; title?: string | null } | null>(null);
  const [renameValue, setRenameValue] = React.useState('');
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [shareTarget, setShareTarget] = React.useState<{ id: string; visibility?: VisibilityType } | null>(null);
  const [shareVisibility, setShareVisibility] = React.useState<VisibilityType>('private');
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; title?: string | null } | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [openMenuChatId, setOpenMenuChatId] = React.useState<string | null>(null);
  const [signInOpen, setSignInOpen] = React.useState(false);

  const closeMobileSidebar = React.useCallback(() => {
    if (isMobile) setOpenMobile(false);
  }, [isMobile, setOpenMobile]);

  // Fetch recent chats
  const { data: chatsData, isLoading: isChatsLoading } = useQuery({
    queryKey: ['recent-chats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { chats: [], hasMore: false };
      return await getUserChats(user.id, 50);
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 0,
    gcTime: 1000 * 60 * 30,
    placeholderData: (previousData) => previousData,
  });

  const recentChats = chatsData?.chats || [];
  const groupedChats = useMemo(() => groupChatsByDate(recentChats), [recentChats]);

  const invalidateRecentChats = () => {
    if (user?.id) queryClient.refetchQueries({ queryKey: ['recent-chats', user.id] });
  };

  const handleRenameSubmit = async () => {
    if (!renameTarget) return;
    const next = renameValue.trim();
    if (!next) { toast.error('Title cannot be empty'); return; }
    if (next.length > 100) { toast.error('Title is too long (max 100 characters)'); return; }
    setIsRenaming(true);
    try {
      const updated = await updateChatTitle(renameTarget.id, next);
      if (updated) { toast.success('Chat renamed'); setRenameTarget(null); setRenameValue(''); invalidateRecentChats(); }
      else toast.error('Failed to rename chat');
    } catch { toast.error('Failed to rename chat'); }
    finally { setIsRenaming(false); }
  };

  const handleShareVisibilityChange = async (visibility: VisibilityType) => {
    if (!shareTarget) return;
    try {
      await updateChatVisibility(shareTarget.id, visibility);
      setShareVisibility(visibility);
      toast.success(visibility === 'public' ? 'Chat shared' : 'Chat is now private');
      invalidateRecentChats();
    } catch { toast.error('Failed to update visibility'); throw new Error('Failed'); }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteChat(deleteTarget.id);
      toast.success('Chat deleted');
      setDeleteTarget(null);
      invalidateRecentChats();
    } catch { toast.error('Failed to delete chat'); }
    finally { setIsDeleting(false); }
  };

  const isAdmin = useMemo(() => {
    const email = user?.email;
    if (!email) return false;
    if (PRIMARY_ADMIN_EMAILS.includes(email)) return true;
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (adminEmail && email === adminEmail) return true;
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map((e) => e.trim()) ?? [];
    return adminEmails.includes(email);
  }, [user?.email]);

  const toggleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <SunIcon size={18} weight="regular" />;
      case 'dark': return <MoonIcon size={18} weight="regular" />;
      default: return <MonitorIcon size={18} />;
    }
  };

  // Bottom feature nav items (always visible for signed-in users)
  const featureLinks: { id: string; label: string; icon: React.ReactElement; href: string; external?: boolean }[] = user
    ? [
        { id: 'files', label: 'Files', icon: <FolderOpenIcon size={18} weight="regular" />, href: '/files' },
        { id: 'api-keys', label: 'API Playground', icon: <CodeIcon size={18} weight="regular" />, href: '/api-keys' },
      ]
    : [];

  return (
    <Sidebar
      collapsible="icon"
      className="shadow-none! border-none! **:data-[slot=sidebar-inner]:dark:bg-primary/4 **:data-[slot=sidebar-inner]:bg-primary/10 **:data-[slot=sidebar-inner]:text-sidebar-foreground **:data-[slot=sidebar-gap]:bg-transparent"
    >
      {/* ── Header ── */}
      <SidebarHeader className="p-0!">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="relative flex items-center w-full h-12 px-2 overflow-visible">
              <div className="flex items-center gap-1 w-full group-data-[collapsible=icon]:justify-center">
                <div className="flex items-center justify-center size-8 transition-opacity duration-200 group-data-[collapsible=icon]:group-hover:opacity-0">
                  <SouthernCrossLogo variant="square" width={26} height={26} />
                </div>
                <div className="flex flex-row items-center gap-2 leading-none group-data-[collapsible=icon]:hidden">
                  <span className="font-be-vietnam-pro font-light tracking-tighter text-xl">SCX.ai</span>
                  {user && isProUser && (
                    <span className="animate-shimmer text-xs font-baumans inline-flex items-center justify-center min-w-6 h-4 px-1.5 pt-0 pb-0.5 rounded-md shadow-sm bg-linear-to-br from-secondary/30 via-primary/25 to-accent/30 text-foreground ring-1 ring-primary/25 ring-offset-1 ring-offset-background dark:bg-linear-to-br dark:from-primary dark:via-secondary dark:to-primary dark:text-foreground dark:ring-primary/40">
                      pro
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded: collapse trigger */}
              <div className="absolute top-2 right-2 group-data-[collapsible=icon]:hidden">
                <Tooltip>
                  <TooltipTrigger asChild><SidebarTrigger className="size-8" /></TooltipTrigger>
                  <TooltipContent side="right" hidden={state !== 'expanded' || isMobile}>
                    Close Sidebar <span className="text-xs text-secondary pl-0.5">⌘B</span>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Collapsed: open trigger on hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 pointer-events-none group-data-[collapsible=icon]:group-hover:opacity-100 group-data-[collapsible=icon]:group-hover:pointer-events-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarTrigger className="size-8 opacity-0 group-data-[collapsible=icon]:group-hover:opacity-100" />
                  </TooltipTrigger>
                  <TooltipContent side="right" hidden={state !== 'collapsed' || isMobile}>
                    Open Sidebar <span className="text-xs text-secondary pl-1">⌘B</span>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Main Content ── */}
      <SidebarContent className="flex flex-col overflow-hidden p-2">

        {/* New Chat */}
        <SidebarMenu className="shrink-0 group-data-[collapsible=icon]:items-center">
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="New Chat"
              className="bg-primary/10 hover:bg-primary/20 text-sidebar-accent-foreground font-medium transition-all duration-200 active:scale-[0.98]"
            >
              <Link prefetch href="/new" onClick={closeMobileSidebar}
                className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
                <PlusIcon size={18} weight="bold" />
                <span className="group-data-[collapsible=icon]:hidden">New Chat</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* ── TOP SECTION: Scrollable Chat History ── */}
        {user && (
          <div className="flex-1 overflow-y-auto min-h-0 mt-3 group-data-[collapsible=icon]:hidden scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            {/* Section label */}
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                Chat History
              </span>
              {recentChats.length > 0 && (
                <button
                  onClick={() => { closeMobileSidebar(); onHistoryClick(); }}
                  className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors uppercase tracking-wider"
                >
                  View all
                </button>
              )}
            </div>

            {isChatsLoading && !recentChats.length ? (
              // Loading skeletons
              <div className="space-y-1 px-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
                    <Skeleton className="h-4 flex-1 bg-primary/10 rounded" />
                  </div>
                ))}
              </div>
            ) : recentChats.length > 0 ? (
              <div className="space-y-3">
                {groupedChats.map((group) => (
                  <div key={group.label}>
                    <div className="px-2 py-0.5">
                      <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">
                        {group.label}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {group.chats.map((chat: any) => {
                        const isCurrentChat = pathname?.includes(chat.id);
                        const isPublic = chat.visibility === 'public';
                        const normalizedVisibility: VisibilityType = isPublic ? 'public' : 'private';
                        const isMenuOpen = openMenuChatId === chat.id;

                        return (
                          <DropdownMenu
                            key={chat.id}
                            open={isMenuOpen}
                            onOpenChange={(open) => setOpenMenuChatId(open ? chat.id : null)}
                          >
                            <div className={cn(
                              'group flex items-center w-full rounded-md transition-all duration-150',
                              isCurrentChat || isMenuOpen ? 'bg-primary/15' : 'hover:bg-primary/8',
                            )}>
                              <Link
                                prefetch
                                href={`/search/${chat.id}`}
                                onClick={closeMobileSidebar}
                                className={cn('flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1.5', isCurrentChat && 'font-medium')}
                              >
                                {isPublic && <Globe className="h-3 w-3 shrink-0 opacity-50" />}
                                <span className="truncate flex-1 text-sm">{chat.title || 'Untitled Chat'}</span>
                              </Link>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 text-muted-foreground hover:text-foreground shrink-0 mr-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                  <span className="sr-only">Chat actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" side="right" sideOffset={20}>
                                <DropdownMenuItem onClick={() => { setRenameTarget({ id: chat.id, title: chat.title }); setRenameValue(chat.title || 'Untitled Chat'); }}>
                                  <Pencil className="h-4 w-4 mr-2" />Edit title
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setShareTarget({ id: chat.id, visibility: normalizedVisibility }); setShareVisibility(normalizedVisibility); setShareDialogOpen(true); }}>
                                  <Share2 className="h-4 w-4 mr-2" />Share
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDeleteTarget({ id: chat.id, title: chat.title })} className="text-destructive focus:text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2 text-destructive" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </div>
                          </DropdownMenu>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-2 py-2">
                <span className="text-sm text-sidebar-foreground/40">No chats yet</span>
              </div>
            )}
          </div>
        )}

        {/* Collapsed state: single icon for all chats */}
        {user && (
          <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center mt-2">
            <SidebarMenuButton
              onClick={() => { closeMobileSidebar(); onHistoryClick(); }}
              tooltip="Chat History"
              className="hover:bg-primary/10 transition-all duration-200"
            >
              <HugeiconsIcon icon={SearchList02Icon} size={18} />
            </SidebarMenuButton>
          </div>
        )}

        {/* ── BOTTOM SECTION: Feature buttons ── */}
        {user && (
          <div className="shrink-0 mt-auto pt-2 border-t border-border/40">
            {/* Section label (expanded only) */}
            <div className="px-2 pb-1 group-data-[collapsible=icon]:hidden">
              <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                Tools
              </span>
            </div>

            <SidebarMenu className="group-data-[collapsible=icon]:items-center">
              {featureLinks.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    className={cn(
                      'hover:bg-primary/10 transition-all duration-200',
                      !item.external && (pathname === `/${item.id}` || pathname?.startsWith(`/${item.id}/`))
                        ? 'bg-primary/15 text-foreground font-medium'
                        : '',
                    )}
                  >
                    {item.external ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer" onClick={closeMobileSidebar}
                        className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
                        {item.icon}
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </a>
                    ) : (
                      <Link prefetch href={item.href} onClick={closeMobileSidebar}
                        className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
                        {item.icon}
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Upgrade to Pro */}
              {!isProUser && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Upgrade to Pro">
                    <Link prefetch href="/pricing" onClick={closeMobileSidebar}
                      className="relative overflow-hidden w-full flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
                      <div className="absolute inset-0 bg-linear-to-r from-primary/20 via-primary/15 to-primary/20 rounded-md" />
                      <HugeiconsIcon icon={Crown02Icon} size={18} className="text-primary relative z-10" />
                      <span className="group-data-[collapsible=icon]:sr-only font-medium text-primary relative z-10">
                        Upgrade to Pro
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </div>
        )}

        {/* Signed-out links */}
        {!user && (
          <SidebarMenu className="mt-2 group-data-[collapsible=icon]:items-center">
            {[
              { id: 'about', label: 'About', icon: <InfoIcon size={18} weight="regular" />, href: '/about' },
              { id: 'terms', label: 'Terms', icon: <FileTextIcon size={18} weight="regular" />, href: '/terms' },
              { id: 'privacy', label: 'Privacy', icon: <ShieldIcon size={18} weight="regular" />, href: '/privacy-policy' },
            ].map((link) => (
              <SidebarMenuItem key={link.id}>
                <SidebarMenuButton asChild tooltip={link.label} className="hover:bg-primary/10">
                  <Link prefetch href={link.href} onClick={closeMobileSidebar}
                    className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                    {link.icon}
                    <span className="group-data-[collapsible=icon]:hidden">{link.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarContent>

      {/* ── Footer: User account ── */}
      <SidebarFooter>
        {user ? (
          <SidebarMenu>
            <SidebarMenuItem>
              {/* Expanded */}
              <div className="group-data-[collapsible=icon]:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center justify-between w-full p-2 rounded-md hover:bg-primary/8 transition-all duration-200 cursor-pointer focus:outline-none! focus:ring-0! active:scale-[0.98]">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0 overflow-hidden rounded-lg">
                          <AvatarImage src={user.image || ''} className={cn(blurPersonalInfo && 'blur-sm')} />
                          <AvatarFallback className={cn('bg-primary text-primary-foreground font-semibold', blurPersonalInfo && 'blur-sm')}>
                            {user.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-0.5 leading-none flex-1 min-w-0 items-start">
                          <span className={cn('font-semibold text-sm truncate text-sidebar-foreground text-left w-full', blurPersonalInfo && 'blur-sm')}>
                            {user.name || 'User'}
                          </span>
                          <span className="text-xs text-sidebar-foreground/70 truncate text-left w-full">
                            {isProUser ? 'SCX Pro' : 'SCX Free'}
                          </span>
                        </div>
                      </div>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) bg-background border shadow-lg" sideOffset={4} collisionPadding={{ bottom: 20 }}>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" onClick={closeMobileSidebar}>
                        <GearIcon size={16} weight="regular" className="mr-2" /><span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin" onClick={closeMobileSidebar}>
                            <CrownSimpleIcon size={16} weight="regular" className="mr-2" /><span>Admin Dashboard</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/api-keys" onClick={closeMobileSidebar}>
                            <KeyIcon size={16} weight="regular" className="mr-2" /><span>API Keys</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span className="text-sm">Theme</span>
                      <ThemeSwitcher />
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <InfoIcon size={16} weight="regular" className="mr-2" /><span>Information</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent sideOffset={8} alignOffset={-20} collisionPadding={{ bottom: 20 }} className="bg-background border shadow-lg">
                        <DropdownMenuItem onClick={() => { closeMobileSidebar(); setKeyboardShortcutsOpen(true); }}>
                          <Keyboard size={16} className="mr-2" /><span>Shortcuts</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/about" onClick={closeMobileSidebar}>
                            <InfoIcon size={16} weight="regular" className="mr-2" /><span>About</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/terms" onClick={closeMobileSidebar}>
                            <FileTextIcon size={16} weight="regular" className="mr-2" /><span>Terms</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/privacy-policy" onClick={closeMobileSidebar}>
                            <ShieldIcon size={16} weight="regular" className="mr-2" /><span>Privacy</span>
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <UsersIcon size={16} weight="regular" className="mr-2" /><span>Community</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent sideOffset={8} alignOffset={-20} collisionPadding={{ bottom: 20 }} className="bg-background border shadow-lg">
                        <DropdownMenuItem asChild>
                          <a href="https://www.instagram.com/southerncrossai" target="_blank" rel="noopener noreferrer" onClick={closeMobileSidebar}>
                            <InstagramLogoIcon size={16} weight="regular" className="mr-2" /><span>Instagram</span>
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzaidmukaddam%2Fscira" target="_blank" rel="noopener noreferrer" onClick={closeMobileSidebar}>
                            <VercelIcon size={16} className="mr-2" /><span>Deploy</span>
                          </a>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Collapsed */}
              <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                      <Avatar className="h-6 w-6 overflow-hidden rounded-full">
                        <AvatarImage src={user.image || ''} className={cn(blurPersonalInfo && 'blur-sm')} />
                        <AvatarFallback className={cn('bg-primary text-primary-foreground font-semibold text-xs', blurPersonalInfo && 'blur-sm')}>
                          {user.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="end" className="w-56 bg-popover border shadow-lg">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-semibold">{user.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{isProUser ? 'SCX Pro' : 'SCX Free'}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/settings" onClick={closeMobileSidebar}>
                        <GearIcon size={16} weight="regular" className="mr-2" /><span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={toggleTheme}>
                      {getThemeIcon()}<span className="ml-2">{({ system: 'System', light: 'Light', dark: 'Dark' }[theme as string] || 'System')} Theme</span>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin" onClick={closeMobileSidebar}>
                            <CrownSimpleIcon size={16} weight="regular" className="mr-2" /><span>Admin Dashboard</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/admin/api-keys" onClick={closeMobileSidebar}>
                            <KeyIcon size={16} weight="regular" className="mr-2" /><span>API Keys</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { closeMobileSidebar(); setKeyboardShortcutsOpen(true); }}>
                      <Keyboard size={16} className="mr-2" /><span>Shortcuts</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/about" onClick={closeMobileSidebar}>
                        <InfoIcon size={16} weight="regular" className="mr-2" /><span>About</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <a href="https://www.instagram.com/southerncrossai" target="_blank" rel="noopener noreferrer" onClick={closeMobileSidebar}>
                        <InstagramLogoIcon size={16} weight="regular" className="mr-2" /><span>Instagram</span>
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
              <SidebarMenuButton tooltip="Sign In" onClick={() => { closeMobileSidebar(); setSignInOpen(true); }}>
                <SignIn size={18} weight="regular" />
                <span className="group-data-[collapsible=icon]:sr-only">Sign In</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>

      {/* Sign-in dialog for unauthenticated users */}
      <SignInPromptDialog open={signInOpen} onOpenChange={setSignInOpen} />

      {/* Dialogs */}
      {user && (
        <>
          <Dialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && (setRenameTarget(null), setRenameValue(''))}>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader><DialogTitle>Edit title</DialogTitle></DialogHeader>
              <div className="pt-2">
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRenameSubmit(); } if (e.key === 'Escape') { e.preventDefault(); setRenameTarget(null); } }}
                  maxLength={100}
                  placeholder="Enter title..."
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
                <Button onClick={handleRenameSubmit} disabled={isRenaming}>{isRenaming ? 'Saving…' : 'Save'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ShareDialog
            isOpen={Boolean(shareDialogOpen && shareTarget)}
            onOpenChange={(open) => { if (open) { setShareDialogOpen(true); } else { setShareTarget(null); setShareDialogOpen(false); } }}
            chatId={shareTarget?.id ?? null}
            selectedVisibilityType={shareVisibility}
            onVisibilityChange={handleShareVisibilityChange}
            isOwner
            user={user}
          />

          <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete{' '}
                  <span className="font-medium text-foreground">{deleteTarget?.title || 'this chat'}</span> and all of its content.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
