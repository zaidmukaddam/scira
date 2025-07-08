import { tool } from 'ai';
import { z } from 'zod';
import MemoryClient from 'mem0ai';
import { serverEnv } from '@/env/server';

export const memoryManagerTool = tool({
  description: 'Manage personal memories with add and search operations.',
  parameters: z.object({
    action: z.enum(['add', 'search']).describe('The memory operation to perform'),
    content: z.string().describe('The memory content for add operation'),
    query: z.string().describe('The search query for search operations'),
  }),
  execute: async ({
    action,
    content,
    query,
  }: {
    action: 'add' | 'search';
    content?: string;
    query?: string;
  }) => {
    const client = new MemoryClient({ apiKey: serverEnv.MEM0_API_KEY });

    console.log('action', action);
    console.log('content', content);
    console.log('query', query);

    try {
      switch (action) {
        case 'add': {
          if (!content) {
            return {
              success: false,
              action: 'add',
              message: 'Content is required for add operation',
            };
          }
          const result = await client.add(
            [
              {
                role: 'user',
                content: content,
              },
            ],
            {
              user_id: 'anonymous',
              org_id: serverEnv.MEM0_ORG_ID,
              project_id: serverEnv.MEM0_PROJECT_ID,
            },
          );
          if (result.length === 0) {
            return {
              success: false,
              action: 'add',
              message: 'No memory added',
            };
          }
          console.log('result', result);
          return {
            success: true,
            action: 'add',
            memory: result[0],
          };
        }
        case 'search': {
          if (!query) {
            return {
              success: false,
              action: 'search',
              message: 'Query is required for search operation',
            };
          }
          const searchFilters = {
            AND: [{ user_id: 'anonymous' }],
          };
          const result = await client.search(query, {
            filters: searchFilters,
            api_version: 'v2',
          });
          if (!result || !result[0]) {
            return {
              success: false,
              action: 'search',
              message: 'No results found for the search query',
            };
          }
          return {
            success: true,
            action: 'search',
            results: result[0],
          };
        }
      }
    } catch (error) {
      console.error('Memory operation error:', error);
      throw error;
    }
  },
}); 