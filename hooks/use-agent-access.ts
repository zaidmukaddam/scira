import { useQuery } from '@tanstack/react-query';
import { useLocalSession } from './use-local-session';

export function useAgentAccess(userId?: string) {
  const { data: session } = useLocalSession();
  const targetUserId = userId || session?.user?.id;

  return useQuery({
    queryKey: ['agent-access', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const res = await fetch(`/api/admin/users/${targetUserId}/agents`);
      if (!res.ok) throw new Error('Failed to fetch agent access');
      return res.json();
    },
    enabled: !!targetUserId,
    staleTime: 30000,
  });
}
