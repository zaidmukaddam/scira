import { tool } from 'ai';

export const mcpSearchTool = tool({
  description: 'Disabled MCP search tool',
  inputSchema: (/* any */) => ({}) as any,
  execute: async () => ({ disabled: true }),
});