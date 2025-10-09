import { tool } from 'ai';
import { z } from 'zod';

export const academicSearchTool = tool({
  description: 'Disabled academic search tool',
  inputSchema: z.object({ query: z.string().describe('Search query') }),
  execute: async () => ({ disabled: true }),
});