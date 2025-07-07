'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAllMemories, searchMemories, deleteMemory, MemoryItem } from '@/lib/memory-actions';
import { Loader2, Search, Trash2, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Memory } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { T, useGT, Plural, useLocale } from 'gt-next';

export function MemoryDialog() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const t = useGT();
  const locale = useLocale();

  // Infinite query for memories with pagination
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['memories'],
    queryFn: async ({ pageParam }) => {
      const pageNumber = pageParam as number;
      return await getAllMemories(pageNumber);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const hasMore = lastPage.memories.length >= 20;
      return hasMore ? Number(lastPage.memories[lastPage.memories.length - 1]?.id) : undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Search query
  const {
    data: searchResults,
    isLoading: isSearching,
    refetch: performSearch,
  } = useQuery({
    queryKey: ['memories', 'search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { memories: [], total: 0 };
      return await searchMemories(searchQuery);
    },
    enabled: false, // Don't run automatically, only when search is triggered
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteMemory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories'] });
      toast.success(t('Memory successfully deleted'));
    },
    onError: (error) => {
      console.error('Delete memory error:', error);
      toast.error(t('Failed to delete memory'));
    },
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      await performSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    queryClient.invalidateQueries({ queryKey: ['memories', 'search'] });
  };

  const handleDeleteMemory = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Format date in a more readable way
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  };

  // Get memory content based on the response type
  const getMemoryContent = (memory: MemoryItem): string => {
    if (memory.memory) return memory.memory;
    if (memory.name) return memory.name;
    return 'No content available';
  };

  // Determine which memories to display
  const displayedMemories =
    searchQuery.trim() && searchResults ? searchResults.memories : data?.pages.flatMap((page) => page.memories) || [];

  // Calculate total memories
  const totalMemories =
    searchQuery.trim() && searchResults
      ? searchResults.total
      : data?.pages.reduce((acc, page) => acc + page.memories.length, 0) || 0;

  return (
    <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col p-6">
      <DialogHeader className="pb-4">
        <T><DialogTitle className="flex items-center gap-2 text-xl">
          <Memory className="h-5 w-5" />
          Your Memories
        </DialogTitle></T>
        <T><DialogDescription className="text-sm text-muted-foreground">
          View and manage your saved memories
        </DialogDescription></T>
      </DialogHeader>

      <div className="space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('Search memories...')}
            className="flex-1"
          />
          <Button type="submit" size="icon" variant="secondary" disabled={isSearching || !searchQuery.trim()}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            <T><Plural branch={totalMemories} one='{count} memory found' other='{count} memories found' variables={{ count: totalMemories }} /></T>
          </span>
          {searchQuery.trim() && (
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handleClearSearch}>
              <T>Clear search</T>
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px] pr-4 -mr-4">
          {isLoading && !displayedMemories.length ? (
            <div className="flex flex-col justify-center items-center h-[400px]">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              <T><p className="text-sm text-muted-foreground mt-4">Loading memories...</p></T>
            </div>
          ) : displayedMemories.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-[350px] py-12 px-4 border border-dashed rounded-lg bg-muted/50 m-1">
              <Memory className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <T><p className="font-medium">No memories found</p></T>
              {searchQuery && <T><p className="text-xs text-muted-foreground mt-1">Try a different search term</p></T>}
              {!searchQuery && (
                <T><p className="text-xs text-muted-foreground mt-1">Memories will appear here when you save them</p></T>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedMemories.map((memory: MemoryItem) => (
                <div
                  key={memory.id}
                  className="group relative p-4 rounded-lg border bg-card transition-all hover:shadow-sm"
                >
                  <div className="flex flex-col gap-2">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{getMemoryContent(memory)}</p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{formatDate(memory.created_at)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMemory(memory.id)}
                        className={cn(
                          'h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10',
                          'transition-opacity opacity-0 group-hover:opacity-100',
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {hasNextPage && !searchQuery.trim() && (
                <div className="pt-2 pb-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={!hasNextPage || isFetchingNextPage}
                    className="w-full text-xs py-1 h-8"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        <T>Loading more...</T>
                      </>
                    ) : (
                      <T>Load More</T>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </DialogContent>
  );
}
