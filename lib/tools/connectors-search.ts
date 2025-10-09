import { tool } from 'ai';
import { z } from 'zod';
import type { ConnectorProvider } from '@/lib/connectors';

export function createConnectorsSearchTool(_userId: string, _selectedConnectors?: ConnectorProvider[]) {
  return tool({
    description: 'Disabled connectors search',
    inputSchema: z.object({ query: z.string(), provider: z.any().optional() }),
    execute: async () => ({ disabled: true }),
  });
}