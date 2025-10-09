import { tool } from 'ai';
import { z } from 'zod';

export const stockChartTool = tool({
  description: 'Disabled stock chart tool',
  inputSchema: z.object({ ticker: z.string().optional() }),
  execute: async () => ({ disabled: true }),
});