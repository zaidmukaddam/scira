import { tool } from 'ai';
import { z } from 'zod';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '../types';

export function webSearchTool(_dataStream?: UIMessageStreamWriter<ChatMessage>, _searchProvider?: 'exa'|'parallel'|'tavily'|'firecrawl') {
  return tool({
    description: 'Disabled web search tool',
    inputSchema: z.object({
      queries: z.array(z.string()),
      maxResults: z.array(z.number()).optional(),
      topics: z.array(z.enum(['general','news'])).optional(),
      quality: z.array(z.enum(['default','best'])).optional(),
    }),
    execute: async () => ({ searches: [] }),
  });
}