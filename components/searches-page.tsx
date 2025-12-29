'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Search, Globe, MoreVertical, Check, Pencil, Trash2, Share2, Lock, Plus } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { bulkDeleteChats, getAllChatsWithPreview, searchChatsByTitle, updateChatTitle, deleteChat, updateChatVisibility } from '@/app/actions';
import { formatDistanceToNow } from 'date-fns';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { HugeiconsIcon } from '@hugeicons/react';
import { FolderLibraryIcon } from '@hugeicons/core-free-icons';

interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  visibility: 'public' | 'private';
  preview?: string;
}

interface SearchesPageProps {
  userId: string;
}

const ITEMS_PER_PAGE = 25;

export function SearchesPage({ userId }: SearchesPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
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
  const [chatToShare, setChatToShare] = useState<{ id: string; title: string; visibility: 'public' | 'private' } | null>(null);
  const [isChangingVisibility, setIsChangingVisibility] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch chats (either all or search results) with offset-based pagination
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['searches', userId, debouncedQuery],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam * ITEMS_PER_PAGE;

      if (debouncedQuery.trim().length === 0) {
        const result = await getAllChatsWithPreview(ITEMS_PER_PAGE, offset);
        if ('error' in result) {
          throw new Error(result.error);
        }
        const chats = result.chats as Chat[];
        return chats;
      }

      const result = await searchChatsByTitle(debouncedQuery, ITEMS_PER_PAGE, offset);
      if ('error' in result) {
        throw new Error(result.error);
      }
      const chats = result.chats as Chat[];
      return chats;
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === ITEMS_PER_PAGE ? allPages.length : undefined,
    staleTime: 30000, // 30 seconds
  });

  const pages = data?.pages ?? [];
  const displayedChats = pages.flat();
  const hasMore = !!hasNextPage;

  // Handle select/deselect individual chat
  const toggleChatSelection = useCallback((chatId: string) => {
    setSelectedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      return next;
    });
  }, []);

  // Handle select/deselect all (only for displayed chats)
  const toggleSelectAll = useCallback(() => {
    const displayedIds = new Set(displayedChats.map((c) => c.id));
    const allDisplayedSelected = displayedChats.every((c) => selectedChatIds.has(c.id));
    
    if (allDisplayedSelected) {
      // Deselect all displayed chats
      setSelectedChatIds((prev) => {
        const next = new Set(prev);
        displayedIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all displayed chats
      setSelectedChatIds((prev) => {
        const next = new Set(prev);
        displayedIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [displayedChats, selectedChatIds]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedChatIds.size === 0) return;

    setIsDeleting(true);
    try {
      const ids = Array.from(selectedChatIds);
      const result = await bulkDeleteChats(ids);
      
      toast.success(`${result.deletedCount} chat${result.deletedCount > 1 ? 's' : ''} deleted`);
      
      // Clear selection and exit select mode
      setSelectedChatIds(new Set());
      setIsSelectMode(false);
      setShowDeleteDialog(false);
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['searches', userId] });
      queryClient.invalidateQueries({ queryKey: ['recent-chats', userId] });
    } catch (error) {
      console.error('Failed to delete chats:', error);
      toast.error('Failed to delete chats. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [selectedChatIds, userId, queryClient]);

  const allDisplayedSelected = displayedChats.length > 0 && displayedChats.every(c => selectedChatIds.has(c.id));
  const someDisplayedSelected = displayedChats.some(c => selectedChatIds.has(c.id)) && !allDisplayedSelected;

  // Handle opening rename dialog
  const handleRenameClick = useCallback((chat: Chat) => {
    setRenamingChat({ id: chat.id, title: chat.title });
    setNewTitle(chat.title);
    setShowRenameDialog(true);
    setOpenDropdownId(null); // Close dropdown
  }, []);

  // Handle rename submit
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
      toast.success('Chat renamed successfully');

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['searches', userId] });

      setShowRenameDialog(false);
      setRenamingChat(null);
      setNewTitle('');
    } catch (error) {
      console.error('Failed to rename chat:', error);
      toast.error('Failed to rename chat. Please try again.');
    } finally {
      setIsRenaming(false);
    }
  }, [renamingChat, newTitle, userId, queryClient]);

  // Handle opening delete dialog for single chat
  const handleDeleteClick = useCallback((chat: Chat) => {
    setChatToDelete({ id: chat.id, title: chat.title });
    setShowSingleDeleteDialog(true);
    setOpenDropdownId(null); // Close dropdown
  }, []);

  // Handle confirming single chat delete
  const handleConfirmDelete = useCallback(async () => {
    if (!chatToDelete) return;

    setDeletingChatId(chatToDelete.id);
    try {
      await deleteChat(chatToDelete.id);
      toast.success('Chat deleted');

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['searches', userId] });
      queryClient.invalidateQueries({ queryKey: ['recent-chats', userId] });

      setShowSingleDeleteDialog(false);
      setChatToDelete(null);
    } catch (error) {
      console.error('Failed to delete chat:', error);
      toast.error('Failed to delete chat. Please try again.');
    } finally {
      setDeletingChatId(null);
    }
  }, [chatToDelete, userId, queryClient]);

  // Handle opening visibility change dialog
  const handleShareClick = useCallback((chat: Chat) => {
    setChatToShare({ id: chat.id, title: chat.title, visibility: chat.visibility });
    setShowVisibilityDialog(true);
    setOpenDropdownId(null); // Close dropdown
  }, []);

  // Handle confirming visibility change
  const handleConfirmVisibilityChange = useCallback(async () => {
    if (!chatToShare) return;

    const newVisibility = chatToShare.visibility === 'public' ? 'private' : 'public';
    setIsChangingVisibility(true);
    try {
      await updateChatVisibility(chatToShare.id, newVisibility);
      toast.success(newVisibility === 'public' ? 'Chat is now public' : 'Chat is now private');

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['searches', userId] });

      setShowVisibilityDialog(false);
      setChatToShare(null);
    } catch (error) {
      console.error('Failed to update chat visibility:', error);
      toast.error('Failed to update visibility. Please try again.');
    } finally {
      setIsChangingVisibility(false);
    }
  }, [chatToShare, userId, queryClient]);

  // Handle entering select mode and selecting a chat
  const handleSelectClick = useCallback((chatId: string) => {
    setIsSelectMode(true);
    toggleChatSelection(chatId);
    setOpenDropdownId(null); // Close dropdown
  }, [toggleChatSelection]);

  const handleShowMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  return (
    <div className="w-full h-screen flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden px-8 pt-8 max-w-3xl mx-auto w-full">
        {/* Fixed Header */}
        <div className="shrink-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {/* Mobile sidebar trigger */}
              <div className="md:hidden">
                <SidebarTrigger />
              </div>
              <div className="flex items-center gap-2">
              <HugeiconsIcon icon={FolderLibraryIcon} size={24} strokeWidth={1.5} />
              <h1 className="text-2xl font-normal font-be-vietnam-pro tracking-tight">Search Library</h1>
              </div>
            </div>
            <Link href="/new" prefetch>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Search
              </Button>
            </Link>
          </div>

          {/* Fixed Search Input */}
          <div className="mb-6 relative z-10 bg-background">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search your chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 h-10 text-sm bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Chat count and Select toggle */}
          <div className="flex items-center justify-start gap-2 mb-4">
            {isLoading ? (
              <Skeleton className="h-4 w-16" />
            ) : (
              <p className="text-sm text-muted-foreground">
                {displayedChats.length} {displayedChats.length === 1 ? 'search' : 'searches'} with Scira
              </p>
            )}
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                if (isSelectMode) {
                  // Exit select mode and clear selections
                  setIsSelectMode(false);
                  setSelectedChatIds(new Set());
                } else {
                  // Enter select mode
                  setIsSelectMode(true);
                }
              }}
              className="h-auto p-0 text-sm text-foreground hover:text-primary underline"
            >
              {isSelectMode ? 'Done' : 'Select'}
            </Button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {/* Bulk Actions Bar - Only show when in select mode and items are selected */}
          {isSelectMode && selectedChatIds.size > 0 && (
            <div className="mb-4 flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allDisplayedSelected ? true : someDisplayedSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all displayed chats"
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <button
                  onClick={toggleSelectAll}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {allDisplayedSelected ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {selectedChatIds.size} selected
              </span>
              <span className="text-muted-foreground">·</span>
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                className="h-auto p-0 text-destructive hover:text-destructive/80"
              >
                Delete
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-0">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="py-4 border-b border-border/40">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-4 w-4 rounded shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-muted-foreground mb-2">Failed to load chats</p>
              <p className="text-xs text-muted-foreground">Please try refreshing the page</p>
            </div>
          )}

          {/* Empty State - No Chats */}
          {!isLoading && !error && displayedChats.length === 0 && searchQuery.trim().length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <h3 className="text-base font-normal mb-2 text-muted-foreground">No chats yet</h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
                Start a conversation to see it here
              </p>
              <Link href="/">
                <Button variant="outline" size="sm">Start Chatting</Button>
              </Link>
            </div>
          )}

          {/* Empty State - No Search Results */}
          {!isLoading && !error && displayedChats.length === 0 && searchQuery.trim().length > 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <h3 className="text-base font-normal mb-2 text-muted-foreground">No results found</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                No chats match &ldquo;{searchQuery}&rdquo;
              </p>
            </div>
          )}

          {/* Chat List */}
          {!isLoading && !error && displayedChats.length > 0 && (
            <div className="space-y-0">
              {displayedChats.map((chat, index) => {
                const isSelected = selectedChatIds.has(chat.id);
                const createdDate = new Date(chat.createdAt);
                const isLastItem = index === displayedChats.length - 1 && !hasMore;
                
                return (
                  <div
                    key={chat.id}
                    className={`group relative py-4 ${!isLastItem ? 'border-b border-border/40' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox - only visible when in select mode */}
                      {isSelectMode && (
                        <div className="shrink-0 mt-0.5">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleChatSelection(chat.id)}
                            aria-label={`Select ${chat.title}`}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </div>
                      )}

                      {/* Chat Content */}
                      <Link
                        href={`/search/${chat.id}`}
                        className="flex-1 min-w-0 space-y-1.5"
                      >
                        {/* Title */}
                        <div className="flex items-center gap-2">
                          <h3 className="font-normal text-base truncate group-hover:text-primary/80 transition-colors">
                            {chat.title}
                          </h3>
                          {chat.visibility === 'public' && (
                            <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                          )}
                        </div>

                        {/* Timestamp */}
                        <p className="text-sm text-muted-foreground">
                          Last message {formatDistanceToNow(createdDate, { addSuffix: false })} ago
                        </p>
                      </Link>

                      {/* Three-dots menu - visible on hover */}
                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu open={openDropdownId === chat.id} onOpenChange={(open) => setOpenDropdownId(open ? chat.id : null)}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-muted"
                              onClick={(e) => e.preventDefault()}
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">More options</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                handleSelectClick(chat.id);
                              }}
                              className="gap-2"
                            >
                              <Check className="h-4 w-4" />
                              Select
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                handleShareClick(chat);
                              }}
                              className="gap-2"
                            >
                              {chat.visibility === 'public' ? (
                                <>
                                  <Lock className="h-4 w-4" />
                                  Make private
                                </>
                              ) : (
                                <>
                                  <Share2 className="h-4 w-4" />
                                  Share
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                handleRenameClick(chat);
                              }}
                              className="gap-2"
                            >
                              <Pencil className="h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteClick(chat);
                              }}
                              variant="destructive"
                              className="gap-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Loading Skeleton */}
          {isFetchingNextPage && (
            <div className="space-y-0 border-t border-border/40">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="py-4 border-b border-border/40">
                  <div className="flex items-start gap-3">
                    {isSelectMode && <Skeleton className="h-4 w-4 rounded shrink-0 mt-0.5" />}
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show More Button */}
          {!isLoading && !error && hasMore && (
            <div className="py-6 flex justify-center">
              <Button
                variant="outline"
                onClick={handleShowMore}
                disabled={isFetchingNextPage}
                className="w-full"
              >
                {isFetchingNextPage ? 'Loading...' : 'Show more'}
              </Button>
            </div>
          )}
        </div>

      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chats</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedChatIds.size} chat{selectedChatIds.size > 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
            <DialogDescription>
              Enter a new name for this chat.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter chat name"
              className="w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRenameDialog(false);
                setRenamingChat(null);
                setNewTitle('');
              }}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameSubmit}
              disabled={isRenaming || !newTitle.trim() || newTitle.trim() === renamingChat?.title}
            >
              {isRenaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Chat Delete Confirmation Dialog */}
      <AlertDialog open={showSingleDeleteDialog} onOpenChange={setShowSingleDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{chatToDelete?.title}&rdquo;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deletingChatId !== null}
              onClick={() => {
                setShowSingleDeleteDialog(false);
                setChatToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deletingChatId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingChatId !== null ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Visibility Change Confirmation Dialog */}
      <AlertDialog open={showVisibilityDialog} onOpenChange={setShowVisibilityDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {chatToShare?.visibility === 'public' ? 'Make chat private' : 'Share chat'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {chatToShare?.visibility === 'public' ? (
                <>
                  Are you sure you want to make &ldquo;{chatToShare?.title}&rdquo; private? Only you will be able to access it.
                </>
              ) : (
                <>
                  Are you sure you want to share &ldquo;{chatToShare?.title}&rdquo;? Anyone with the link will be able to view it.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isChangingVisibility}
              onClick={() => {
                setShowVisibilityDialog(false);
                setChatToShare(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmVisibilityChange}
              disabled={isChangingVisibility}
            >
              {isChangingVisibility ? 'Updating...' : chatToShare?.visibility === 'public' ? 'Make private' : 'Share'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
