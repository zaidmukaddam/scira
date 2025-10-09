import { tool } from 'ai';

export const trendingMoviesTool = tool({
  description: 'Disabled trending movies tool',
  inputSchema: (/* any */) => ({}) as any,
  execute: async () => ({ disabled: true }),
});