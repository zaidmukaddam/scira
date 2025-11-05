import { tool as createTool } from 'ai';
import { z } from 'zod';

export const createMermaidDiagramTool = createTool({
  description: 'Render a Mermaid diagram supporting any official Mermaid syntax.',
  inputSchema: z.object({
    chart: z
      .string()
      .min(1, 'Mermaid chart definition is required')
      .describe('Complete Mermaid definition (flowchart, sequenceDiagram, gantt, stateDiagram, etc.)'),
    description: z
      .string()
      .nullable()
      .optional()
      .describe('Optional description or context for the diagram'),
  }),
  execute: async () => {
    return 'Success';
  },
});
