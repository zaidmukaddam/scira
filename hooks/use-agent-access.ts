import { useQuery } from '@tanstack/react-query';
import { useLocalSession } from './use-local-session';

export function useAgentAccess(userId?: string) {
  const { data: session } = useLocalSession();
  const targetUserId = userId || session?.user?.id;
  const isAdminContext = !!userId;

  return useQuery({
    queryKey: ['agent-access', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      
      const endpoint = isAdminContext
        ? `/api/admin/users/${targetUserId}/agents`
        : `/api/user/agent-access`;
      
      const res = await fetch(endpoint, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error('Failed to fetch agent access');
      }
      return res.json();
    },
    enabled: !!targetUserId,
    staleTime: 5000,
    gcTime: 1000 * 60 * 10,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 10000,
  });
}
