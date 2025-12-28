import { useQuery } from '@tanstack/react-query';
import { getUserMessageCount, getUserExtremeSearchCount } from '@/app/actions';
import { User } from '@/lib/db/schema';

export function useUsageData(user: User | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['user-usage', user?.id],
    queryFn: async () => {
      const [messageData, extremeData] = await Promise.all([
        getUserMessageCount(),
        getUserExtremeSearchCount(),
      ]);

      return {
        messageCount: messageData.count || 0,
        extremeSearchCount: extremeData.count || 0,
        error: messageData.error || extremeData.error || null,
      };
    },
    enabled: enabled && !!user,
    staleTime: 1000 * 30, // 30 seconds - keep data fresh but avoid excessive refetches
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: true,
  });
}
