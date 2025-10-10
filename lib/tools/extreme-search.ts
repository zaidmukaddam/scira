import { tool } from 'ai';
import { z } from 'zod';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '../types';

export type Research = any;

export function extremeSearchTool(_dataStream: UIMessageStreamWriter<ChatMessage> | undefined) {
  return tool({
    description: 'Disabled extreme search tool',
    inputSchema: z.object({ prompt: z.string() }),
    execute: async () => ({ disabled: true }),
  });
}