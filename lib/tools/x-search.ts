import { tool } from 'ai';
import { z } from 'zod';

export const xSearchTool = tool({
  description: 'Disabled X search tool',
  inputSchema: z.object({ query: z.string() }),
  execute: async () => ({ disabled: true }),
});