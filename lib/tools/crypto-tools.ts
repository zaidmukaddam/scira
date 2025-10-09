import { tool } from 'ai';
import { z } from 'zod';

export const coinDataTool = tool({
  description: 'Disabled coin data tool',
  inputSchema: z.object({ id: z.string().optional() }),
  execute: async () => ({ disabled: true }),
});

export const coinDataByContractTool = tool({
  description: 'Disabled coin data by contract tool',
  inputSchema: z.object({ contract: z.string().optional(), network: z.string().optional() }),
  execute: async () => ({ disabled: true }),
});

export const coinOhlcTool = tool({
  description: 'Disabled OHLC tool',
  inputSchema: z.object({ id: z.string().optional(), days: z.number().optional() }),
  execute: async () => ({ disabled: true }),
});