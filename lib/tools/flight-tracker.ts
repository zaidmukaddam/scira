import { tool } from 'ai';
import { z } from 'zod';

export const flightTrackerTool = tool({
  description: 'Disabled flight tracker tool',
  inputSchema: z.object({ flightNumber: z.string().optional() }),
  execute: async () => ({ disabled: true }),
});