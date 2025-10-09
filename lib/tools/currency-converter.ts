import { tool } from 'ai';
import { z } from 'zod';

export const currencyConverterTool = tool({
  description: 'Disabled currency converter',
  inputSchema: z.object({ from: z.string(), to: z.string(), amount: z.number() }),
  execute: async () => ({ disabled: true }),
});