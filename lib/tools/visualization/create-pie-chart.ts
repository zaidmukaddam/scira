import { tool as createTool } from 'ai';
import { z } from 'zod';

export const createPieChartTool = createTool({
  description: 'Create a pie chart',
  inputSchema: z.object({
    data: z
      .array(
        z.object({
          label: z.string().min(1),
          value: z.preprocess((v) => (typeof v === 'string' ? Number(v) : v), z.number()),
        }),
      )
      .min(1),
    title: z.string().min(1),
    description: z.string().nullable(),
    unit: z.string().nullable(),
  }),
  execute: async () => {
    return 'Success';
  },
});
