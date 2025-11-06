import { tool as createTool } from 'ai';
import { z } from 'zod';

export const createTableTool = createTool({
  description:
    'Create an interactive table with data. The table will automatically have sorting, filtering, and search functionality.',
  inputSchema: z.object({
    title: z.string().describe('Table title'),
    description: z.string().nullable().describe('Optional table description'),
    columns: z
      .array(
        z.object({
          key: z.string().min(1).describe('Column key that matches the data object keys'),
          label: z.string().min(1).describe('Display label for the column header'),
          type: z
            .enum(['string', 'number', 'date', 'boolean'])
            .nullable()
            .default('string')
            .describe('Data type for proper sorting and formatting'),
        }),
      )
      .min(1)
      .describe('Column configuration array'),
    data: z
      .array(
        z
          .object({})
          .catchall(z.any())
          .describe(
            'Array of row objects. Each object should have keys matching the column names.',
          ),
      )
      .min(1)
      .describe(
        'Array of row objects. Each object should have keys matching the column names.',
      ),
  }),
  execute: async () => {
    return 'Success';
  },
});
