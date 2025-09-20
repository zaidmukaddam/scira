'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { deleteMemory, getAllMemories, MemoryItem, searchMemories } from '@/lib/memory-actions';
import { Loader2, Search, Trash2, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { MemoryIcon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export function MemoryDialog() {
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

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
      toast.success('MemoryIcon successfully deleted');
    },
    onError: (error) => {
      console.error('Delete memory error:', error);
      toast.error('Failed to delete memory');
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
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
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
        <DialogTitle className="flex items-center gap-2 text-xl">
          <MemoryIcon className="h-5 w-5" />
          Your Memories
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          View and manage your saved memories
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="flex-1"
          />
          <Button type="submit" size="icon" variant="secondary" disabled={isSearching || !searchQuery.trim()}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {totalMemories} {totalMemories === 1 ? 'memory' : 'memories'} found
          </span>
          {searchQuery.trim() && (
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={handleClearSearch}>
              Clear search
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px] pr-4 -mr-4">
          {isLoading && !displayedMemories.length ? (
            <div className="flex flex-col justify-center items-center h-[400px]">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-4">Loading memories...</p>
            </div>
          ) : displayedMemories.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-[350px] py-12 px-4 border border-dashed rounded-lg bg-muted/50 m-1">
              <MemoryIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No memories found</p>
              {searchQuery && <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>}
              {!searchQuery && (
                <p className="text-xs text-muted-foreground mt-1">Memories will appear here when you save them</p>
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
                        <span>{formatDate(memory.createdAt)}</span>
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
                        Loading more...
                      </>
                    ) : (
                      'Load More'
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
