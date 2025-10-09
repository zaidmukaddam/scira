import { tool } from 'ai';

export const trendingTvTool = tool({
  description: 'Disabled trending TV tool',
  inputSchema: (/* any */) => ({}) as any,
  execute: async () => ({ disabled: true }),
});