import { tool as createTool } from 'ai';
import { z } from 'zod';

export const createBarChartTool = createTool({
  description: 'Create a bar chart with multiple data series',
  inputSchema: z.object({
    data: z
      .array(
        z.object({
          xAxisLabel: z.string().min(1),
          series: z.array(
            z.object({
              seriesName: z.string().min(1),
              value: z.preprocess((v) => (typeof v === 'string' ? Number(v) : v), z.number()),
            }),
          ).min(1),
        }),
      )
      .min(1)
      .describe('Chart data with x-axis labels and series values'),
    title: z.string().min(1),
    description: z.string().nullable(),
    yAxisLabel: z.string().nullable().describe('Label for Y-axis'),
  }),
  execute: async () => {
    return 'Success';
  },
});
