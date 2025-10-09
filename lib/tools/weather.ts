import { tool } from 'ai';
import { z } from 'zod';

export const weatherTool = tool({
  description: 'Disabled weather tool',
  inputSchema: z.object({ location: z.string().optional() }),
  execute: async () => ({ disabled: true }),
});