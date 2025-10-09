import { tool, type Tool } from 'ai';
import { z } from 'zod';

export function createMemoryTools(_userId: string) {
  const searchMemories = tool({
    description: 'Disabled memory search tool',
    inputSchema: z.object({ informationToGet: z.string() }),
    execute: async () => ({ success: false, error: 'disabled' }),
  });

  const addMemory = tool({
    description: 'Disabled memory add tool',
    inputSchema: z.object({ memory: z.string() }),
    execute: async () => ({ success: false, error: 'disabled' }),
  });

  return { searchMemories, addMemory };
}

export type SearchMemoryTool = Tool<{ informationToGet: string }, { success: boolean; results?: any[]; count?: number; error?: string }>;
export type AddMemoryTool = Tool<{ memory: string }, { success: boolean; memory?: any; error?: string }>;