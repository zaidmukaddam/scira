import { tool } from 'ai';
import { z } from 'zod';

export const retrieveTool = tool({
  description: 'Disabled retrieve tool',
  inputSchema: z.object({ url: z.string() }),
  execute: async () => ({ disabled: true }),
});