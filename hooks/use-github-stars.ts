import { useQuery } from '@tanstack/react-query';

interface GitHubRepo {
  stargazers_count: number;
  name: string;
  full_name: string;
}

export function useGitHubStars() {
  return useQuery({
    queryKey: ['github-stars'],
    queryFn: async (): Promise<number> => {
      try {
        const response = await fetch('https://api.github.com/repos/zaidmukaddam/scira');
        if (!response.ok) {
          throw new Error('Failed to fetch GitHub stars');
        }
        const data: GitHubRepo = await response.json();
        return data.stargazers_count;
      } catch (error) {
        console.error('Error fetching GitHub stars:', error);
        return 9000;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
  });
}
