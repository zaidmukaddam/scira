'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef } from 'react';

// Client-safe, route-only prefetching (no server-only imports)
export function useChatPrefetch() {
  const router = useRouter();
  const prefetched = useRef<Set<string>>(new Set());

  const prefetchChatRoute = useCallback(
    (chatId: string) => {
      const path = `/search/${chatId}`;
      if (prefetched.current.has(path)) return;
      try {
        router.prefetch(path);
        prefetched.current.add(path);
      } catch {}
    },
    [router]
  );

  const prefetchOnHover = useCallback(
    (chatId: string) => {
      const tid = setTimeout(() => prefetchChatRoute(chatId), 200);
      return () => clearTimeout(tid);
    },
    [prefetchChatRoute]
  );

  const prefetchOnFocus = useCallback(
    (chatId: string) => {
      prefetchChatRoute(chatId);
    },
    [prefetchChatRoute]
  );

  const prefetchChats = useCallback(
    (chatIds: string[]) => {
      chatIds.forEach((id) => prefetchChatRoute(id));
    },
    [prefetchChatRoute]
  );

  return { prefetchChats, prefetchOnHover, prefetchOnFocus, prefetchChatRoute };
}
