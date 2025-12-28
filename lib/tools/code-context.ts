import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

export const codeContextTool = tool({
  description: 'Get the context about coding, programming, and development libraries, frameworks, and tools',
  inputSchema: z.object({
    query: z.string().min(1).max(100).describe('The query to search for'),
  }),
  outputSchema: z.object({
    response: z.string().min(1),
    resultsCount: z.number().min(0),
    searchTime: z.number().min(0),
    outputTokens: z.number().min(0),
  }),
  execute: async ({ query }) => {
    const response = await fetch('https://api.exa.ai/context', {
      method: 'POST',
      headers: {
        'x-api-key': serverEnv.EXA_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        tokensNum: 'dynamic',
      }),
    });
    const data = await response.json();
    return data;
  },
});
