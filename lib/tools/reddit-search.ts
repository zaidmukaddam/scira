import { tool } from 'ai';
import { z } from 'zod';

export const redditSearchTool = tool({
  description: 'Disabled Reddit search tool',
  inputSchema: z.object({ query: z.string(), maxResults: z.number().optional(), timeRange: z.string().optional() }),
  execute: async () => ({ disabled: true }),
});