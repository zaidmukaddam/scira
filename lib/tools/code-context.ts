import { tool } from 'ai';
import { z } from 'zod';

export const codeContextTool = tool({
  name: 'code-context',
  description: 'Disabled code context tool',
  inputSchema: z.object({ query: z.string() }),
  execute: async () => ({ disabled: true }),
});