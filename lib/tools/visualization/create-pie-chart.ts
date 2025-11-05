import { tool as createTool } from 'ai';
import { z } from 'zod';

export const createPieChartTool = createTool({
  description: 'Create a pie chart',
  inputSchema: z.object({
    data: z.array(z.object({ label: z.string(), value: z.number() })),
    title: z.string(),
    description: z.string().nullable(),
    unit: z.string().nullable(),
  }),
  execute: async () => {
    return 'Success';
  },
});
