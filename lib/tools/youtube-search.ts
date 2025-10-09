import { tool } from 'ai';
import { z } from 'zod';

export const youtubeSearchTool = tool({
  description: 'Disabled YouTube search tool',
  inputSchema: z.object({ query: z.string() }),
  execute: async () => ({ disabled: true }),
});