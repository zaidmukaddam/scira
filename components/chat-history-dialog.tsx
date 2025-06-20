/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { redirect } from "next/navigation";
import { usePathname, useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Trash, ArrowUpRight, History, Globe, Lock, Search, Calendar, Hash, Check, X, Pencil } from "lucide-react";
import { ListMagnifyingGlass } from "@phosphor-icons/react";
import { isToday, isYesterday, isThisWeek, isThisMonth, subWeeks, differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears } from "date-fns";
import { deleteChat, getUserChats, loadMoreChats, updateChatTitle } from "@/app/actions";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { User } from "@/lib/db/schema";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMutation,
  useQueryClient,
  useInfiniteQuery
} from "@tanstack/react-query";
import { cn, invalidateChatsCache } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ClassicLoader } from "./ui/loading";

// Constants
const SCROLL_BUFFER_MAX = 100;
const SCROLL_THRESHOLD = 0.8;
const INTERSECTION_ROOT_MARGIN = '100px';
const FOCUS_DELAY = 100;
const LOADING_DEBOUNCE = 300;

interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  userId: string;
  visibility: 'public' | 'private';
}

interface ChatHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

// Search modes for different filtering strategies
type SearchMode = 'all' | 'title' | 'date' | 'visibility';

// Helper function to validate chat ID format
function isValidChatId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length > 0;
}

// Helper function to categorize chats by date
function categorizeChatsByDate(chats: Chat[]) {
  const today: Chat[] = [];
  const yesterday: Chat[] = [];
  const thisWeek: Chat[] = [];
  const lastWeek: Chat[] = [];
  const thisMonth: Chat[] = [];
  const older: Chat[] = [];

  const oneWeekAgo = subWeeks(new Date(), 1);

  chats.forEach(chat => {
    const chatDate = new Date(chat.createdAt);

    if (isToday(chatDate)) {
      today.push(chat);
    } else if (isYesterday(chatDate)) {
      yesterday.push(chat);
    } else if (isThisWeek(chatDate)) {
      thisWeek.push(chat);
    } else if (chatDate >= oneWeekAgo && !isThisWeek(chatDate)) {
      lastWeek.push(chat);
    } else if (isThisMonth(chatDate)) {
      thisMonth.push(chat);
    } else {
      older.push(chat);
    }
  });

  return { today, yesterday, thisWeek, lastWeek, thisMonth, older };
}

// Format time in a compact way with memoization
const formatCompactTime = (() => {
  const cache = new Map<string, { result: string; timestamp: number }>();
  const CACHE_DURATION = 30000; // 30 seconds cache duration

  return function (date: Date): string {
    const now = new Date();
    const dateKey = date.getTime().toString();
    const cached = cache.get(dateKey);
    
    // Check if cache is valid (less than 30 seconds old)
    if (cached && (now.getTime() - cached.timestamp) < CACHE_DURATION) {
      return cached.result;
    }

    const seconds = differenceInSeconds(now, date);

    let result: string;
    if (seconds < 60) {
      result = `${seconds}s ago`;
    } else {
      const minutes = differenceInMinutes(now, date);
      if (minutes < 60) {
        result = `${minutes}m ago`;
      } else {
        const hours = differenceInHours(now, date);
        if (hours < 24) {
          result = `${hours}h ago`;
        } else {
          const days = differenceInDays(now, date);
          if (days < 7) {
            result = `${days}d ago`;
          } else {
            const weeks = differenceInWeeks(now, date);
            if (weeks < 4) {
              result = `${weeks}w ago`;
            } else {
              const months = differenceInMonths(now, date);
              if (months < 12) {
                result = `${months}mo ago`;
              } else {
                const years = differenceInYears(now, date);
                result = `${years}y ago`;
              }
            }
          }
        }
      }
    }

    // Keep cache size reasonable
    if (cache.size > 1000) {
      cache.clear();
    }

    cache.set(dateKey, { result, timestamp: now.getTime() });
    return result;
  };
})();

// Custom fuzzy search function
function fuzzySearch(query: string, text: string): boolean {
  if (!query) return true;

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match gets highest priority
  if (textLower.includes(queryLower)) return true;

  // Fuzzy matching - check if all characters in query appear in order
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === queryLower.length;
}

// Function to parse DD/MM/YY date format
function parseDateQuery(dateStr: string): Date | null {
  // Check if the string matches DD/MM/YY format
  const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/;
  const match = dateStr.match(dateRegex);
  
  if (!match) return null;
  
  const [, dayStr, monthStr, yearStr] = match;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10) - 1; // Month is 0-indexed in Date
  const year = 2000 + parseInt(yearStr, 10); // Convert YY to YYYY (assuming 20XX)
  
  // Validate the date components
  if (day < 1 || day > 31 || month < 0 || month > 11) {
    return null;
  }
  
  const date = new Date(year, month, day);
  
  // Check if the date is valid (handles cases like 31/02/25)
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }
  
  return date;
}

// Function to check if two dates are on the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getDate() === date2.getDate() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getFullYear() === date2.getFullYear();
}

// Advanced search function with multiple criteria
function advancedSearch(chat: Chat, query: string, mode: SearchMode): boolean {
  if (!query) return true;

  const queryLower = query.toLowerCase();

  // Handle special search prefixes
  if (query.startsWith('public:')) {
    return chat.visibility === 'public' && fuzzySearch(query.slice(7), chat.title);
  }

  if (query.startsWith('private:')) {
    return chat.visibility === 'private' && fuzzySearch(query.slice(8), chat.title);
  }

  if (query.startsWith('today:')) {
    return isToday(new Date(chat.createdAt)) && fuzzySearch(query.slice(6), chat.title);
  }

  if (query.startsWith('week:')) {
    return isThisWeek(new Date(chat.createdAt)) && fuzzySearch(query.slice(5), chat.title);
  }

  if (query.startsWith('month:')) {
    return isThisMonth(new Date(chat.createdAt)) && fuzzySearch(query.slice(6), chat.title);
  }

  // Handle date: prefix with DD/MM/YY format
  if (query.startsWith('date:')) {
    const dateQuery = query.slice(5).trim();
    const parsedDate = parseDateQuery(dateQuery);
    if (parsedDate) {
      return isSameDay(new Date(chat.createdAt), parsedDate);
    }
    // If not a valid DD/MM/YY format, fall back to fuzzy search on the date query
    return fuzzySearch(dateQuery, new Date(chat.createdAt).toLocaleDateString());
  }

  // Regular search based on mode
  switch (mode) {
    case 'title':
      return fuzzySearch(query, chat.title);
    case 'date':
      // In date mode, first try to parse as DD/MM/YY format
      const parsedDate = parseDateQuery(query.trim());
      if (parsedDate) {
        return isSameDay(new Date(chat.createdAt), parsedDate);
      }
      // If not DD/MM/YY format, fall back to fuzzy search on date string
      const dateStr = new Date(chat.createdAt).toLocaleDateString();
      return fuzzySearch(query, dateStr);
    case 'visibility':
      return fuzzySearch(query, chat.visibility);
    case 'all':
    default:
      return fuzzySearch(query, chat.title) ||
        fuzzySearch(query, chat.visibility) ||
        fuzzySearch(query, new Date(chat.createdAt).toLocaleDateString());
  }
}

// Main component
export function ChatHistoryDialog({ open, onOpenChange, user }: ChatHistoryDialogProps) {
  const pathname = usePathname();
  const router = useRouter();
  const rawChatId = pathname?.startsWith('/search/') ? pathname.split('/')[2] : null;
  const currentChatId = rawChatId && isValidChatId(rawChatId) ? rawChatId : null;

  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>('all');
  const [navigating, setNavigating] = useState<string | null>(null);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [, forceUpdate] = useState({});

  // Focus search input on dialog open
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Use infinite query for pagination
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ['chats', user?.id],
    queryFn: async ({ pageParam }) => {
      if (!user?.id) return { chats: [], hasMore: false };

      if (pageParam) {
        // Load more chats using the last chat ID as cursor
        return await loadMoreChats(user.id, pageParam, 20);
      } else {
        // Initial load
        return await getUserChats(user.id, 20);
      }
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.chats.length === 0) return undefined;
      return lastPage.chats[lastPage.chats.length - 1].id;
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 30000, // 30 seconds
    initialPageParam: undefined,
    // Initialize with empty array when user is null
    initialData: user ? undefined : { pages: [{ chats: [], hasMore: false }], pageParams: [undefined] },
    // Don't keep data in cache when logged out
    gcTime: user ? 5 * 60 * 1000 : 0,
  });

  // Flatten all chats from all pages
  const allChats = data?.pages.flatMap(page => page.chats) || [];

  // Clear delete confirmation state when dialog closes
  useEffect(() => {
    if (!open) {
      setDeletingChatId(null);
      setEditingChatId(null);
      setEditingTitle("");
      setSearchQuery("");
      setSearchMode('all');
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
      // Clear update timer when dialog closes
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      // Focus the search input after a small delay to ensure the dialog is fully rendered
      focusTimeoutRef.current = setTimeout(() => {
        inputRef.current?.focus();
      }, FOCUS_DELAY);
    }
    // Reset search query when dialog opens
    if (open) {
      setSearchQuery("");
      setSearchMode('all');
    }

    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
    };
  }, [open]);

  // Periodic update for real-time timestamps
  useEffect(() => {
    if (!open) return;

    const updateTimes = () => {
      // Force a re-render to update the displayed times
      forceUpdate({});
      
      // Schedule next update
      updateTimerRef.current = setTimeout(updateTimes, 30000); // Update every 30 seconds
    };

    // Start the update cycle
    updateTimerRef.current = setTimeout(updateTimes, 30000);

    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }
    };
  }, [open]);

  // Filter chats based on search query and mode with memoization
  const filteredChats = useMemo(() => {
    return allChats.filter(chat => advancedSearch(chat, searchQuery, searchMode));
  }, [allChats, searchQuery, searchMode]);

  // Categorize filtered chats with memoization
  const categorizedChats = useMemo(() => {
    return categorizeChatsByDate(filteredChats);
  }, [filteredChats]);

  // Explicitly refetch when dialog opens
  useEffect(() => {
    if (open && user?.id) {
      refetch();
    }
  }, [open, user?.id, refetch]);

  // Listen for cache invalidation events
  useEffect(() => {
    const handleCacheInvalidation = () => {
      if (user?.id) {
        refetch();
      }
    };

    window.addEventListener('invalidate-chats-cache', handleCacheInvalidation);
    return () => {
      window.removeEventListener('invalidate-chats-cache', handleCacheInvalidation);
    };
  }, [user?.id, refetch]);

  // Handle mutations with React Query
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteChat(id);
    },
    onSuccess: (_, id) => {
      toast.success("Chat deleted");
      // Update cache after successful deletion
      queryClient.setQueryData(['chats', user?.id], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            chats: page.chats.filter((chat: Chat) => chat.id !== id)
          }))
        };
      });
    },
    onError: (error) => {
      console.error("Failed to delete chat:", error);
      toast.error("Failed to delete chat. Please try again.");
      queryClient.invalidateQueries({ queryKey: ['chats', user?.id] });
    }
  });

  const updateTitleMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      return await updateChatTitle(id, title);
    },
    onSuccess: (updatedChat, { id, title }) => {
      if (updatedChat) {
        toast.success("Title updated");
        // Update cache after successful title update
        queryClient.setQueryData(['chats', user?.id], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              chats: page.chats.map((chat: Chat) => 
                chat.id === id ? { ...chat, title: title } : chat
              )
            }))
          };
        });
      } else {
        toast.error("Failed to update title. Please try again.");
      }
    },
    onError: (error) => {
      console.error("Failed to update chat title:", error);
      toast.error("Failed to update title. Please try again.");
    }
  });

  // Infinite scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrolledPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Load more when user scrolls to threshold
    if (scrolledPercentage > SCROLL_THRESHOLD && hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  // Intersection Observer for more precise infinite scroll with proper cleanup
  useEffect(() => {
    const currentTrigger = loadMoreTriggerRef.current;
    const currentList = listRef.current;

    if (!currentTrigger || !currentList) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !isLoading) {
          fetchNextPage();
        }
      },
      {
        root: currentList,
        rootMargin: INTERSECTION_ROOT_MARGIN,
        threshold: 0.1,
      }
    );

    observer.observe(currentTrigger);

    return () => {
      observer.unobserve(currentTrigger);
    };
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  // prefetch chats
  useEffect(() => {
    if (open) {
      allChats.forEach((chat) => {
        router.prefetch(`/search/${chat.id}`);
        console.log(`Prefetching chat ${chat.id}`);
      });
    }
  }, [open, allChats, router]);

  // Handle chat selection
  const handleSelectChat = useCallback((id: string, title: string) => {
    setNavigating(id);
    const displayTitle = title || 'Untitled Conversation';
    toast.info(`Opening "${displayTitle}"...`);
    invalidateChatsCache();
    onOpenChange(false);
    router.push(`/search/${id}`);
  }, [onOpenChange]);

  // Handle chat deletion with inline confirmation
  const handleDeleteChat = useCallback((e: React.MouseEvent | KeyboardEvent, id: string, title: string) => {
    e.stopPropagation();
    console.log('SETTING DELETING CHAT ID:', id);
    setDeletingChatId(id);
  }, []);

  // Confirm deletion with improved logic
  const confirmDeleteChat = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingChatId(null);

    try {
      await deleteMutation.mutateAsync(id);

      // Smart redirect logic: only redirect to home if deleting current chat
      if (currentChatId === id) {
        redirect("/");
      }
      // If not current chat, stay in the dialog
    } catch (error) {
      // Error handling is done in mutation callbacks, but we should reset state
      console.error("Delete chat error:", error);
      toast.error("Failed to delete chat. Please try again.");
    }
  }, [deleteMutation, currentChatId]);

  // Cancel deletion
  const cancelDeleteChat = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('CANCELING DELETION');
    setDeletingChatId(null);
  }, []);

  // Handle chat title editing
  const handleEditTitle = useCallback((e: React.MouseEvent | KeyboardEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    
    // Prevent editing if chat is in deleting state
    if (deletingChatId === id) {
      console.warn('Cannot edit title while chat is in deleting state');
      return;
    }
    
    setEditingChatId(id);
    setEditingTitle(currentTitle || "");
  }, [deletingChatId]);

  // Save edited title
  const saveEditedTitle = useCallback(async (e: React.MouseEvent | React.KeyboardEvent, id: string) => {
    e.stopPropagation();
    
    if (!editingTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    if (editingTitle.trim().length > 100) {
      toast.error("Title is too long (max 100 characters)");
      return;
    }

    try {
      await updateTitleMutation.mutateAsync({ id, title: editingTitle.trim() });
      setEditingChatId(null);
      setEditingTitle("");
    } catch (error) {
      // Error handling is done in mutation callbacks
      console.error("Save title error:", error);
    }
  }, [editingTitle, updateTitleMutation]);

  // Cancel title editing
  const cancelEditTitle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(null);
    setEditingTitle("");
  }, []);

  // Handle key press in title input
  const handleTitleKeyPress = useCallback((e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      saveEditedTitle(e, id);
    } else if (e.key === 'Escape') {
      cancelEditTitle(e as any);
    }
  }, [saveEditedTitle, cancelEditTitle]);

  // Get search mode icon and label
  const getSearchModeInfo = (mode: SearchMode) => {
    switch (mode) {
      case 'title':
        return { icon: Hash, label: 'Title' };
      case 'date':
        return { icon: Calendar, label: 'Date' };
      case 'visibility':
        return { icon: Globe, label: 'Visibility' };
      case 'all':
      default:
        return { icon: Search, label: 'All' };
    }
  };

  const currentModeInfo = getSearchModeInfo(searchMode);
  const IconComponent = currentModeInfo.icon;

  // Function to cycle search modes
  const cycleSearchMode = useCallback(() => {
    const modes: SearchMode[] = ['all', 'title', 'date', 'visibility'];
    const currentIndex = modes.indexOf(searchMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];
    setSearchMode(nextMode);
  }, [searchMode]);

  // Helper function to render a chat item
  const renderChatItem = (chat: Chat, index: number) => {
    const isCurrentChat = currentChatId === chat.id;
    const isPublic = chat.visibility === 'public';
    const isDeleting = deletingChatId === chat.id;
    const isEditing = editingChatId === chat.id;
    const displayTitle = chat.title || "Untitled Conversation";

    // Comprehensive debug logging
    console.log(`RENDER CHAT ${chat.id}:`, {
      isDeleting,
      isEditing,
      deletingChatId,
      editingChatId,
      willShowNormalActions: !isDeleting && !isEditing
    });

    return (
      <CommandItem
        key={chat.id}
        value={chat.id}
        onSelect={() => !isDeleting && !isEditing && handleSelectChat(chat.id, chat.title)}
        className={cn(
          "flex items-center py-2.5! px-3! mx-1! my-0.5! rounded-md transition-colors",
          isDeleting && "bg-destructive/10! border border-destructive/20 hover:bg-destructive/20!",
          isEditing && "bg-muted/50! border border-muted-foreground/20"
        )}
        disabled={navigating === chat.id}
        data-chat-id={chat.id}
        role="option"
        aria-label={
          isDeleting 
            ? `Delete ${displayTitle}? Press Enter to confirm, Escape to cancel`
            : isEditing
            ? `Editing title: ${displayTitle}`
            : `Open chat: ${displayTitle}`
        }
      >
        <div className="grid grid-cols-[auto_1fr_auto] w-full gap-3 items-center">
          {/* Icon with visibility indicator */}
          <div className="flex items-center justify-center w-5 relative">
            {navigating === chat.id ? (
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-b-2 border-foreground" aria-label="Loading"></div>
            ) : isPublic ? (
              <Globe className={cn(
                "h-4 w-4 shrink-0",
                isCurrentChat ? "text-blue-600 dark:text-blue-400" : "text-blue-500/70 dark:text-blue-500/70"
              )} aria-label="Public chat" />
            ) : (
              <Lock className={cn(
                "h-4 w-4 shrink-0",
                isCurrentChat ? "text-foreground" : "text-muted-foreground"
              )} aria-label="Private chat" />
            )}
          </div>

          {/* Title - editable when in edit mode */}
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => handleTitleKeyPress(e, chat.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-transparent border-none outline-none focus:outline-none text-sm"
                placeholder="Enter title..."
                autoFocus
                maxLength={100}
              />
            ) : (
              <span className={cn(
                "truncate block",
                isCurrentChat && "font-medium",
                isDeleting && "text-foreground/70"
              )}>
                {isDeleting ? `Delete "${displayTitle}"?` : displayTitle}
              </span>
            )}
          </div>

          {/* Meta information and actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isDeleting ? (
              // Delete confirmation actions
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => confirmDeleteChat(e, chat.id)}
                  aria-label="Confirm delete"
                  disabled={deleteMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 text-muted-foreground"
                  onClick={cancelDeleteChat}
                  aria-label="Cancel delete"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : isEditing ? (
              // Edit confirmation actions
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 text-green-600 hover:text-green-600 hover:bg-green-600/10"
                  onClick={(e) => saveEditedTitle(e, chat.id)}
                  aria-label="Save title"
                  disabled={updateTitleMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 text-muted-foreground"
                  onClick={cancelEditTitle}
                  aria-label="Cancel edit"
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              // Normal state actions
              <>
                {console.log(`RENDERING NORMAL ACTIONS for chat ${chat.id}`)}
                {/* Timestamp - more compact */}
                <span className="text-xs text-muted-foreground whitespace-nowrap w-16 text-right">
                  {formatCompactTime(new Date(chat.createdAt))}
                </span>

                {/* Actions - always enabled */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "transition-colors hover:text-blue-600 h-7 w-7 flex-shrink-0",
                    isCurrentChat ? "text-blue-600/70 hover:text-blue-600" : "",
                    !!deletingChatId && "pointer-events-none opacity-50 bg-red-100 dark:bg-red-900"
                  )}
                  onClick={(e) => {
                    console.log(`EDIT BUTTON CLICKED for chat ${chat.id}, deletingChatId: ${deletingChatId}`);
                    if (!!deletingChatId) {
                      console.log('BLOCKED: A chat is in deletion mode!');
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    handleEditTitle(e, chat.id, chat.title);
                  }}
                  aria-label={`Edit title of ${displayTitle}`}
                  disabled={navigating === chat.id || updateTitleMutation.isPending || !!deletingChatId}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "transition-colors hover:text-destructive h-7 w-7 flex-shrink-0",
                    isCurrentChat ? "text-destructive/70 hover:text-destructive" : ""
                  )}
                  onClick={(e) => handleDeleteChat(e, chat.id, chat.title)}
                  aria-label={`Delete ${displayTitle}`}
                  disabled={navigating === chat.id || deleteMutation.isPending}
                >
                  <Trash className="h-4 w-4" />
                </Button>
                <div className="w-6 flex justify-end">
                  {isCurrentChat ? (
                    <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-sm">
                      Current
                    </span>
                  ) : (
                    <ArrowUpRight className="h-3 w-3" />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CommandItem>
    );
  };

  // Redirect to sign in page
  const handleSignIn = () => {
    onOpenChange(false);
    redirect('/sign-in');
  };

  // Show sign in prompt if user is not logged in
  if (!user) {
    return (
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <div className="flex flex-col items-center justify-center p-6 text-center h-full min-h-[250px]">
          <History className="size-8 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-1">Access Your Chat History</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Sign in to view, search, and manage all your previous conversations seamlessly.
          </p>

          <Button
            onClick={handleSignIn}
            className="w-full max-w-[200px]"
          >
            Sign In
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            Your conversations are automatically saved when you are signed in.
          </p>
        </div>
      </CommandDialog>
    );
  }

  return (
    <>
      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <div className="relative">
          {/* Custom search input with mode indicator */}
          <div className="flex h-12 items-center gap-2 border-b px-3 pr-16 sm:pr-20">
            <IconComponent className="size-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 pr-2"
              placeholder={`Search ${currentModeInfo.label.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault();
                  // Cycle through search modes only with plain Tab
                  cycleSearchMode();
                }
              }}
            />
            <div className="flex items-center gap-1 absolute right-12 top-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-1.5 sm:px-2 bg-muted hover:bg-muted/80"
                onClick={cycleSearchMode}
              >
                {currentModeInfo.label}
              </Button>
            </div>
          </div>

          <CommandList
            className="min-h-[520px] max-h-[520px] flex-1 [&>[cmdk-list-sizer]]:space-y-6! [&>[cmdk-list-sizer]]:py-2! scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
            ref={listRef}
            onScroll={handleScroll}
            role="listbox"
            aria-label="Chat history"
          >
            {isLoading ? (
              <div>
                <CommandGroup heading="Recent Conversations">
                  {Array(5).fill(0).map((_, i) => (
                    <CommandItem
                      key={`skeleton-${i}`}
                      className="flex justify-between items-center p-2! px-3! rounded-md gap-2!"
                      disabled
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-grow">
                        <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                        <Skeleton className="h-4 w-[180px]" />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-3 w-[70px]" />
                        <Skeleton className="h-7 w-7 rounded-full" />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            ) : (
              <>
                {allChats.length > 0 ? (
                  <>
                    {[
                      { key: 'today', heading: 'Today' },
                      { key: 'yesterday', heading: 'Yesterday' },
                      { key: 'thisWeek', heading: 'This Week' },
                      { key: 'lastWeek', heading: 'Last Week' },
                      { key: 'thisMonth', heading: 'This Month' },
                      { key: 'older', heading: 'Older' }
                    ].map(({ key, heading, }) => {
                      const chats = categorizedChats[key as keyof typeof categorizedChats];
                      return chats.length > 0 && (
                        <CommandGroup key={key} heading={heading} className="[&_[cmdk-group-heading]]:py-0.5! py-1! mb-0!">
                          {chats.map((chat) => renderChatItem(chat, allChats.indexOf(chat)))}
                        </CommandGroup>
                      );
                    })}

                    {/* Infinite scroll trigger and loading indicator */}
                    {hasNextPage && (
                      <div
                        ref={loadMoreTriggerRef}
                        className="flex items-center justify-center py-2 px-3"
                      >
                        {isFetchingNextPage ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <ClassicLoader size="sm" />
                            Loading more...
                          </div>
                        ) : (
                          <div className="h-1"></div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <CommandEmpty>
                    <div className="py-6 px-4 text-center flex flex-col items-center">
                      <History className="size-10 text-muted-foreground mb-3" />
                      <p className="text-sm font-medium">No conversations found</p>
                      {searchQuery && (
                        <div className="text-xs text-muted-foreground mt-2 space-y-1">
                          <p>Try a different search term or change search mode</p>
                          <div className="text-xs text-muted-foreground/70">
                            <p>Search tips:</p>
                            <p>• <code>public:</code> or <code>private:</code> for visibility</p>
                            <p>• <code>today:</code>, <code>week:</code>, <code>month:</code> for dates</p>
                            <p>• <code>date:22/05/25</code> for specific date (DD/MM/YY)</p>
                            <p>• Switch to Date mode and type <code>22/05/25</code></p>
                          </div>
                        </div>
                      )}
                      {!searchQuery && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Start a new chat to begin
                        </p>
                      )}
                    </div>
                  </CommandEmpty>
                )}
              </>
            )}
          </CommandList>

          {/* Mobile hints */}
          <div className="block sm:hidden bottom-0 left-0 right-0 p-3 text-xs text-center text-muted-foreground border-t border-border bg-background/90">
            <div className="flex justify-center items-center gap-3">
              <span>Tap to open</span>
              <span>•</span>
              <span>Edit to rename</span>
              <span>•</span>
              <span>Trash to delete</span>
            </div>
          </div>

          {/* Desktop keyboard shortcuts */}
          <div className="hidden sm:block bottom-0 left-0 right-0 p-3 text-xs text-center text-muted-foreground border-t border-border bg-background/90">
            <div className="flex justify-between items-center px-2">
              {/* Important navigation shortcuts on the left */}
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><kbd className="rounded border px-1.5 py-0.5 bg-muted text-xs">⏎</kbd> open</span>
                <span className="flex items-center gap-1.5">
                  <kbd className="rounded border px-1.5 py-0.5 bg-muted text-xs">↑</kbd>
                  <kbd className="rounded border px-1.5 py-0.5 bg-muted text-xs">↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1.5"><kbd className="rounded border px-1.5 py-0.5 bg-muted text-xs">Tab</kbd> toggle mode</span>
              </div>

              {/* Less critical shortcuts on the right */}
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground/80">Click edit to rename • Click trash to delete</span>
                <span className="flex items-center gap-1.5"><kbd className="rounded border px-1.5 py-0.5 bg-muted text-xs">Esc</kbd> close</span>
              </div>
            </div>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}

// Navigation Button component for navbar
export function ChatHistoryButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          className="size-8 p-0! m-0!"
          aria-label="Chat History"
        >
          <ListMagnifyingGlass className="size-6"/>
          <span className="sr-only">Chat History</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>Chat History</TooltipContent>
    </Tooltip>
  );
} 