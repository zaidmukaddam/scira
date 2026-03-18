'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, MoreHorizontal, Check, Pencil, Trash2, Share2, Lock, Plus, Pin, PinOff, Clock, Cpu, ChevronDown } from 'lucide-react';
import { sileo } from 'sileo';
import Link from 'next/link';
import {
  bulkDeleteChats,
  getAllChatsWithPreview,
  searchChatsByTitle,
  updateChatPinned,
  updateChatTitle,
  deleteChat,
  updateChatVisibility,
} from '@/app/actions';
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisMonth, differenceInDays } from 'date-fns';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { HugeiconsIcon } from '@hugeicons/react';
import { FolderLibraryIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { models } from '@/ai/models';
import { DropdownMenuCheckboxItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';

// Map a raw model value (e.g. "scira-grok-3") to a short display label
function getModelLabel(modelValue: string): string {
  const found = models.find((m) => m.value === modelValue);
  return found?.label ?? modelValue.replace(/^scira-/, '').replace(/-/g, ' ');
}

interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
  visibility: 'public' | 'private';
  preview?: string | null;
  model?: string | null;
}

interface SearchesPageProps {
  userId: string;
}

type VisibilityFilter = 'all' | 'public' | 'private';
type DateFilter = 'all' | 'today' | 'week' | 'month';
type SortOrder = 'newest' | 'oldest';

const ITEMS_PER_PAGE = 25;

function fuzzySearch(query: string, text: string): boolean {
  if (!query) return true;
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  if (textLower.includes(queryLower)) return true;
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) queryIndex++;
  }
  return queryIndex === queryLower.length;
}

function advancedSearch(
  chat: Chat,
  query: string,
  visibilityFilter: VisibilityFilter,
  dateFilter: DateFilter,
): boolean {
  if (visibilityFilter !== 'all' && chat.visibility !== visibilityFilter) return false;

  if (dateFilter !== 'all') {
    const dateToCheck = chat.updatedAt || chat.createdAt;
    const chatDate = dateToCheck instanceof Date ? dateToCheck : new Date(dateToCheck);
    if (isNaN(chatDate.getTime())) return false;
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        if (!isToday(chatDate)) return false;
        break;
      case 'week': {
        const daysDiff = differenceInDays(now, chatDate);
        if (daysDiff < 0 || daysDiff > 7) return false;
        break;
      }
      case 'month':
        if (!isThisMonth(chatDate)) return false;
        break;
    }
  }

  if (!query) return true;

  if (query.startsWith('public:')) return chat.visibility === 'public' && fuzzySearch(query.slice(7), chat.title);
  if (query.startsWith('private:')) return chat.visibility === 'private' && fuzzySearch(query.slice(8), chat.title);
  if (query.startsWith('today:')) return isToday(new Date(chat.updatedAt || chat.createdAt)) && fuzzySearch(query.slice(6), chat.title);
  if (query.startsWith('week:')) {
    const chatDate = new Date(chat.updatedAt || chat.createdAt);
    const daysDiff = differenceInDays(new Date(), chatDate);
    return daysDiff >= 0 && daysDiff <= 7 && fuzzySearch(query.slice(5), chat.title);
  }
  if (query.startsWith('month:')) return isThisMonth(new Date(chat.updatedAt || chat.createdAt)) && fuzzySearch(query.slice(6), chat.title);

  return fuzzySearch(query, chat.title);
}

type TimeGroup = 'pinned' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'earlier';

function getChatTimeGroup(chat: Chat): TimeGroup {
  if (chat.isPinned) return 'pinned';
  const d = new Date(chat.updatedAt || chat.createdAt);
  if (isToday(d)) return 'today';
  if (isYesterday(d)) return 'yesterday';
  if (isThisWeek(d)) return 'this_week';
  if (isThisMonth(d)) return 'this_month';
  return 'earlier';
}

const GROUP_LABELS: Record<TimeGroup, string> = {
  pinned: 'Pinned',
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This week',
  this_month: 'This month',
  earlier: 'Earlier',
};

const GROUP_ORDER: TimeGroup[] = ['pinned', 'today', 'yesterday', 'this_week', 'this_month', 'earlier'];

export function SearchesPage({ userId }: SearchesPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renamingChat, setRenamingChat] = useState<{ id: string; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [showSingleDeleteDialog, setShowSingleDeleteDialog] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<{ id: string; title: string } | null>(null);
  const [showVisibilityDialog, setShowVisibilityDialog] = useState(false);
  const [chatToShare, setChatToShare] = useState<{
    id: string;
    title: string;
    visibility: 'public' | 'private';
  } | null>(null);
  const [isChangingVisibility, setIsChangingVisibility] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['searches', userId, debouncedQuery],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam * ITEMS_PER_PAGE;
      if (debouncedQuery.trim().length === 0) {
        const result = await getAllChatsWithPreview(ITEMS_PER_PAGE, offset);
        if ('error' in result) throw new Error(result.error);
        return result.chats as Chat[];
      }
      const result = await searchChatsByTitle(debouncedQuery, ITEMS_PER_PAGE, offset);
      if ('error' in result) throw new Error(result.error);
      return result.chats as Chat[];
    },
    refetchInterval: 6000,
    refetchOnWindowFocus: true,
    getNextPageParam: (lastPage, allPages) => (lastPage.length === ITEMS_PER_PAGE ? allPages.length : undefined),
    staleTime: 30000,
  });

  const allChats = useMemo(() => (data?.pages ?? []).flat(), [data]);

  const displayedChats = useMemo(() => {
    const filtered = allChats.filter((chat) => advancedSearch(chat, debouncedQuery, visibilityFilter, dateFilter));
    if (sortOrder === 'oldest') {
      return [...filtered].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    }
    return filtered;
  }, [allChats, debouncedQuery, visibilityFilter, dateFilter, sortOrder]);

  const groupedChats = useMemo(() => {
    const groups: Partial<Record<TimeGroup, Chat[]>> = {};
    for (const chat of displayedChats) {
      const group = getChatTimeGroup(chat);
      if (!groups[group]) groups[group] = [];
      groups[group]!.push(chat);
    }
    return groups;
  }, [displayedChats]);

  const hasMore = !!hasNextPage;
  const hasActiveFilters = visibilityFilter !== 'all' || dateFilter !== 'all' || searchQuery.length > 0 || sortOrder !== 'newest';

  const toggleChatSelection = useCallback((chatId: string) => {
    setSelectedChatIds((prev) => {
      const next = new Set(prev);
      next.has(chatId) ? next.delete(chatId) : next.add(chatId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const displayedIds = new Set(displayedChats.map((c) => c.id));
    const allSelected = displayedChats.every((c) => selectedChatIds.has(c.id));
    setSelectedChatIds((prev) => {
      const next = new Set(prev);
      displayedIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }, [displayedChats, selectedChatIds]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedChatIds.size === 0) return;
    setIsDeleting(true);
    try {
      const ids = Array.from(selectedChatIds);
      const result = await bulkDeleteChats(ids);
      sileo.success({ title: `${result.deletedCount} chat${result.deletedCount > 1 ? 's' : ''} deleted` });
      setSelectedChatIds(new Set());
      setIsSelectMode(false);
      setShowDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['searches', userId] });
      queryClient.invalidateQueries({ queryKey: ['recent-chats', userId] });
    } catch {
      sileo.error({ title: 'Failed to delete chats. Please try again.' });
    } finally {
      setIsDeleting(false);
    }
  }, [selectedChatIds, userId, queryClient]);

  const allDisplayedSelected = displayedChats.length > 0 && displayedChats.every((c) => selectedChatIds.has(c.id));
  const someDisplayedSelected = displayedChats.some((c) => selectedChatIds.has(c.id)) && !allDisplayedSelected;

  const handleRenameClick = useCallback((chat: Chat) => {
    setRenamingChat({ id: chat.id, title: chat.title });
    setNewTitle(chat.title);
    setShowRenameDialog(true);
    setOpenDropdownId(null);
  }, []);

  const handleRenameSubmit = useCallback(async () => {
    if (!renamingChat || !newTitle.trim() || newTitle.trim() === renamingChat.title) {
      setShowRenameDialog(false);
      setRenamingChat(null);
      setNewTitle('');
      return;
    }
    setIsRenaming(true);
    try {
      await updateChatTitle(renamingChat.id, newTitle.trim());
      sileo.success({ title: 'Chat renamed successfully' });
      queryClient.invalidateQueries({ queryKey: ['searches', userId] });
      setShowRenameDialog(false);
      setRenamingChat(null);
      setNewTitle('');
    } catch {
      sileo.error({ title: 'Failed to rename chat. Please try again.' });
    } finally {
      setIsRenaming(false);
    }
  }, [renamingChat, newTitle, userId, queryClient]);

  const handleDeleteClick = useCallback((chat: Chat) => {
    setChatToDelete({ id: chat.id, title: chat.title });
    setShowSingleDeleteDialog(true);
    setOpenDropdownId(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!chatToDelete) return;
    setDeletingChatId(chatToDelete.id);
    try {
      await deleteChat(chatToDelete.id);
      sileo.success({ title: 'Chat deleted' });
      queryClient.invalidateQueries({ queryKey: ['searches', userId] });
      queryClient.invalidateQueries({ queryKey: ['recent-chats', userId] });
      setShowSingleDeleteDialog(false);
      setChatToDelete(null);
    } catch {
      sileo.error({ title: 'Failed to delete chat. Please try again.' });
    } finally {
      setDeletingChatId(null);
    }
  }, [chatToDelete, userId, queryClient]);

  const handleShareClick = useCallback((chat: Chat) => {
    setChatToShare({ id: chat.id, title: chat.title, visibility: chat.visibility });
    setShowVisibilityDialog(true);
    setOpenDropdownId(null);
  }, []);

  const handlePinToggle = useCallback(
    async (chat: Chat) => {
      try {
        const updatedChat = await updateChatPinned(chat.id, !chat.isPinned);
        if (!updatedChat) {
          sileo.error({ title: 'Failed to update pinned state. Please try again.' });
          return;
        }
        sileo.success({ title: chat.isPinned ? 'Chat unpinned' : 'Chat pinned' });
        queryClient.invalidateQueries({ queryKey: ['searches', userId] });
        queryClient.invalidateQueries({ queryKey: ['recent-chats', userId] });
      } catch {
        sileo.error({ title: 'Failed to update pinned state. Please try again.' });
      } finally {
        setOpenDropdownId(null);
      }
    },
    [queryClient, userId],
  );

  const handleConfirmVisibilityChange = useCallback(async () => {
    if (!chatToShare) return;
    const newVisibility = chatToShare.visibility === 'public' ? 'private' : 'public';
    setIsChangingVisibility(true);
    try {
      await updateChatVisibility(chatToShare.id, newVisibility);
      sileo.success({ title: newVisibility === 'public' ? 'Chat is now public' : 'Chat is now private' });
      queryClient.invalidateQueries({ queryKey: ['searches', userId] });
      setShowVisibilityDialog(false);
      setChatToShare(null);
    } catch {
      sileo.error({ title: 'Failed to update visibility. Please try again.' });
    } finally {
      setIsChangingVisibility(false);
    }
  }, [chatToShare, userId, queryClient]);

  const handleSelectClick = useCallback(
    (chatId: string) => {
      setIsSelectMode(true);
      toggleChatSelection(chatId);
      setOpenDropdownId(null);
    },
    [toggleChatSelection],
  );

  const renderChatRow = (chat: Chat) => {
    const isSelected = selectedChatIds.has(chat.id);
    const activityDate = new Date(chat.updatedAt || chat.createdAt);
    const modelLabel = chat.model ? getModelLabel(chat.model) : null;

    return (
      <div key={chat.id} className="group relative border-b border-border/30 last:border-0">
        {isSelectMode && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleChatSelection(chat.id)}
            aria-label={`Select ${chat.title}`}
            className="absolute -left-5 md:-left-6 top-[18px] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
        )}
        <div className="flex items-start py-4 px-1">
          <Link href={`/search/${chat.id}`} className="flex-1 min-w-0 space-y-1.5 pr-8">
          {/* Title */}
          <div className="flex items-center gap-1.5">
            <p className="text-[15px] font-medium leading-snug truncate group-hover:text-primary transition-colors duration-150">
              {chat.title}
            </p>
            {chat.isPinned && <Pin className="size-3 shrink-0 text-muted-foreground/40 fill-muted-foreground/20" />}
            {chat.visibility === 'public' && <Globe className="size-3 shrink-0 text-muted-foreground/40" />}
          </div>

          {/* Preview — 2 lines */}
          {chat.preview && (
            <p className="text-sm text-muted-foreground/60 line-clamp-2 leading-relaxed">
              {chat.preview}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            {modelLabel && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/50 border border-border/50 rounded-sm px-1.5 py-0.5 leading-none">
                <Cpu className="size-3" />
                {modelLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/40 tabular-nums">
              <Clock className="size-3" />
              {formatDistanceToNow(activityDate, { addSuffix: true })}
            </span>
          </div>
        </Link>

          {/* Always-visible menu */}
          <div className="absolute right-1 top-4 shrink-0">
            <DropdownMenu open={openDropdownId === chat.id} onOpenChange={(open) => setOpenDropdownId(open ? chat.id : null)}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0 rounded-md text-muted-foreground/40 hover:text-foreground"
                  onClick={(e) => e.preventDefault()}
                  aria-label="More options"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); handlePinToggle(chat); }} className="gap-2 text-xs">
                  {chat.isPinned ? <><PinOff className="size-3.5" />Unpin</> : <><Pin className="size-3.5" />Pin</>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleSelectClick(chat.id); }} className="gap-2 text-xs">
                  <Check className="size-3.5" />Select
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleShareClick(chat); }} className="gap-2 text-xs">
                  {chat.visibility === 'public'
                    ? <><Lock className="size-3.5" />Make private</>
                    : <><Share2 className="size-3.5" />Share</>}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleRenameClick(chat); }} className="gap-2 text-xs">
                  <Pencil className="size-3.5" />Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleDeleteClick(chat); }} variant="destructive" className="gap-2 text-xs">
                  <Trash2 className="size-3.5" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-dvh flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="flex h-14 items-center justify-between px-4 md:px-6 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            <div className="md:hidden">
              <SidebarTrigger />
            </div>
            <HugeiconsIcon icon={FolderLibraryIcon} size={18} strokeWidth={1.5} className="shrink-0 text-foreground/70" />
            <h1 className="text-base font-semibold tracking-tight">Library</h1>
            {!isLoading && displayedChats.length > 0 && (
              <span className="text-xs text-muted-foreground/50 tabular-nums">{displayedChats.length}</span>
            )}
          </div>
          <Link href="/new" prefetch>
            <Button variant="outline" size="sm" className="h-8 text-sm rounded-md gap-1.5 px-3 font-medium">
              <Plus className="size-3.5" />
              New
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden max-w-3xl mx-auto w-full">
        {/* Search — static */}
        <div className="shrink-0 pt-3 pb-2.5 px-4 md:px-6">
          <div className="relative">
            <HugeiconsIcon icon={Search01Icon} size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg bg-muted/50 border-border/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border/40"
            />
          </div>
        </div>

        {/* Filter bar — static */}
        <div className="shrink-0 pb-2.5 flex items-center gap-1.5 px-4 md:px-6">
          {/* Select / Done */}
          <button
            onClick={() => { setIsSelectMode((v) => !v); setSelectedChatIds(new Set()); }}
            className={cn(
              'inline-flex items-center h-7 px-2.5 text-xs rounded-md border transition-colors',
              isSelectMode
                ? 'border-foreground/40 bg-foreground text-background font-medium'
                : 'border-border/60 text-foreground/70 hover:text-foreground hover:border-border',
            )}
          >
            {isSelectMode ? 'Done' : 'Select'}
          </button>

          {/* Date filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                'inline-flex items-center gap-1 h-7 px-2.5 text-xs rounded-md border transition-colors',
                dateFilter !== 'all'
                  ? 'border-foreground/40 text-foreground font-medium'
                  : 'border-border/60 text-foreground/70 hover:text-foreground hover:border-border',
              )}>
                {dateFilter === 'all' ? 'Any time' : dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'Last 7 days' : 'This month'}
                <ChevronDown className="size-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              {([['all', 'Any time'], ['today', 'Today'], ['week', 'Last 7 days'], ['month', 'This month']] as const).map(([v, label]) => (
                <DropdownMenuItem key={v} onClick={() => setDateFilter(v)} className="text-xs gap-2">
                  {label}
                  {dateFilter === v && <Check className="size-3 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Visibility filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                'inline-flex items-center gap-1 h-7 px-2.5 text-xs rounded-md border transition-colors',
                visibilityFilter !== 'all'
                  ? 'border-foreground/40 text-foreground font-medium'
                  : 'border-border/60 text-foreground/70 hover:text-foreground hover:border-border',
              )}>
                {visibilityFilter === 'all' ? 'Type' : visibilityFilter === 'private' ? 'Private' : 'Shared'}
                <ChevronDown className="size-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-32">
              {([['all', 'All'], ['private', 'Private'], ['public', 'Shared']] as const).map(([v, label]) => (
                <DropdownMenuItem key={v} onClick={() => setVisibilityFilter(v)} className="text-xs gap-2">
                  {label}
                  {visibilityFilter === v && <Check className="size-3 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort — right-aligned */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                'inline-flex items-center gap-1 h-7 px-2.5 text-xs rounded-md border transition-colors ml-auto',
                sortOrder !== 'newest'
                  ? 'border-foreground/40 text-foreground font-medium'
                  : 'border-border/60 text-foreground/70 hover:text-foreground hover:border-border',
              )}>
                Sort: {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
                <ChevronDown className="size-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {([['newest', 'Newest first'], ['oldest', 'Oldest first']] as const).map(([v, label]) => (
                <DropdownMenuItem key={v} onClick={() => setSortOrder(v)} className="text-xs gap-2">
                  {label}
                  {sortOrder === v && <Check className="size-3 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Scrollable Chat List */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6">
          {/* Loading State */}
          {isLoading && (
            <div className="space-y-0.5 pt-1">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 rounded" style={{ width: `${50 + (i % 4) * 12}%` }} />
                    <Skeleton className="h-3 rounded" style={{ width: `${65 + (i % 3) * 10}%` }} />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-foreground mb-1">Something went wrong</p>
              <p className="text-xs text-muted-foreground">Failed to load chats — try refreshing the page</p>
            </div>
          )}

          {/* Empty State — No Chats */}
          {!isLoading && !error && displayedChats.length === 0 && !hasActiveFilters && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="size-11 rounded-xl bg-muted/60 flex items-center justify-center mb-4 border border-border/40">
                <HugeiconsIcon icon={FolderLibraryIcon} size={22} strokeWidth={1.5} className="text-muted-foreground/70" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1 text-balance">Your library is empty</p>
              <p className="text-xs text-muted-foreground text-pretty mb-5">Start a conversation and it will appear here</p>
              <Link href="/">
                <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg">
                  Start chatting
                </Button>
              </Link>
            </div>
          )}

          {/* Empty State — No Results */}
          {!isLoading && !error && displayedChats.length === 0 && hasActiveFilters && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-foreground mb-1 text-balance">No results found</p>
              <p className="text-xs text-muted-foreground text-pretty mb-4">
                {searchQuery.trim().length > 0
                  ? <>Nothing matched &ldquo;{searchQuery}&rdquo;</>
                  : dateFilter !== 'all'
                    ? <>No chats from {dateFilter === 'today' ? 'today' : dateFilter === 'week' ? 'the last 7 days' : 'this month'}</>
                    : <>No {visibilityFilter} chats found</>}
              </p>
              <button
                onClick={() => { setSearchQuery(''); setDateFilter('all'); setVisibilityFilter('all'); }}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Grouped Chat List */}
          {!isLoading && !error && displayedChats.length > 0 && (
            <div className="space-y-4 pt-1 pb-4">
              {GROUP_ORDER.map((groupKey) => {
                const chats = groupedChats[groupKey];
                if (!chats || chats.length === 0) return null;
                return (
                  <div key={groupKey}>
                    <p className="text-[11px] font-medium text-muted-foreground/40 uppercase tracking-wide px-1 pb-1 select-none">
                      {GROUP_LABELS[groupKey]}
                    </p>
                    <div>
                      {chats.map(renderChatRow)}
                    </div>
                  </div>
                );
              })}

              {/* Pagination Loading */}
              {isFetchingNextPage && (
                <div className="space-y-0.5">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3.5 rounded" style={{ width: `${50 + (i % 3) * 14}%` }} />
                        <Skeleton className="h-3 rounded" style={{ width: `${60 + (i % 4) * 8}%` }} />
                        <Skeleton className="h-3 w-16 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {hasMore && !isFetchingNextPage && (
                <div className="px-3">
                  <Button
                    variant="ghost"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    size="sm"
                    className="h-8 text-xs w-full text-muted-foreground hover:text-foreground rounded-lg border border-border/50"
                  >
                    Load more
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Floating bulk-action bar */}
      {isSelectMode && selectedChatIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-background border border-border shadow-lg">
          <span className="text-sm text-muted-foreground tabular-nums">
            {selectedChatIds.size} {selectedChatIds.size === 1 ? 'thread' : 'threads'} selected
          </span>
          <button
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 text-sm font-medium bg-destructive text-destructive-foreground px-3 py-1.5 rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50"
          >
            <Trash2 className="size-3.5" />
            Delete {selectedChatIds.size} {selectedChatIds.size === 1 ? 'Thread' : 'Threads'}
          </button>
        </div>
      )}

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedChatIds.size} chat{selectedChatIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
            <DialogDescription>Enter a new name for this chat.</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Chat name"
              className="rounded-lg"
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowRenameDialog(false); setRenamingChat(null); setNewTitle(''); }}
              disabled={isRenaming}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={isRenaming || !newTitle.trim() || newTitle.trim() === renamingChat?.title}
              className="rounded-lg"
            >
              {isRenaming ? 'Renaming…' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Delete Dialog */}
      <AlertDialog open={showSingleDeleteDialog} onOpenChange={setShowSingleDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{chatToDelete?.title}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deletingChatId !== null}
              onClick={() => { setShowSingleDeleteDialog(false); setChatToDelete(null); }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deletingChatId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingChatId !== null ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Visibility Dialog */}
      <AlertDialog open={showVisibilityDialog} onOpenChange={setShowVisibilityDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {chatToShare?.visibility === 'public' ? 'Make private?' : 'Share chat?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {chatToShare?.visibility === 'public'
                ? <>Only you will be able to access &ldquo;{chatToShare?.title}&rdquo;.</>
                : <>Anyone with the link will be able to view &ldquo;{chatToShare?.title}&rdquo;.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isChangingVisibility}
              onClick={() => { setShowVisibilityDialog(false); setChatToShare(null); }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmVisibilityChange} disabled={isChangingVisibility}>
              {isChangingVisibility ? 'Updating…' : chatToShare?.visibility === 'public' ? 'Make private' : 'Share'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
