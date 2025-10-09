import { tool } from 'ai';
import { z } from 'zod';

export const movieTvSearchTool = tool({
  description: 'Disabled movie/TV search tool',
  inputSchema: z.object({ query: z.string() }),
  execute: async () => ({ disabled: true }),
});