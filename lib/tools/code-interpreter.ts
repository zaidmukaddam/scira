import { tool } from 'ai';
import { z } from 'zod';

export const codeInterpreterTool = tool({
  description: 'Disabled code interpreter',
  inputSchema: z.object({ title: z.string(), code: z.string(), icon: z.enum(['stock','date','calculation','default']) }),
  execute: async () => ({ disabled: true }),
});