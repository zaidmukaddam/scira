import { tool } from 'ai';
import { z } from 'zod';

export const textTranslateTool = tool({
  description: 'Disabled text translate tool',
  inputSchema: z.object({ text: z.string(), to: z.string().optional() }),
  execute: async () => ({ disabled: true }),
});