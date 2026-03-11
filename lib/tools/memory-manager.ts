import { tool } from 'ai';
import { z } from 'zod';
import MemoryClient from 'mem0ai';
import { getUser } from '@/lib/auth-utils';
import { serverEnv } from '@/env/server';

const memoryManagerParams = z.object({
  action: z.enum(['add', 'search']).describe('The memory operation to perform'),
  content: z.string().describe('The memory content for add operation'),
  query: z.string().describe('The search query for search operations'),
});

export const memoryManagerTool = tool({
  description: 'Manage personal memories with add and search operations.',
  inputSchema: memoryManagerParams,
  execute: async ({ action, content, query }: z.infer<typeof memoryManagerParams>) => {
    // Get the authenticated user
    const user = await getUser();

    if (!user) {
      throw new Error('Authentication required for memory operations');
    }

    // Bypassing serverEnv for this key to debug hanging issue.
    const apiKey = process.env.MEM0_API_KEY;

    if (!apiKey) {
      throw new Error('MEM0_API_KEY is not defined in the environment.');
    }

    const client = new MemoryClient({ apiKey });

    console.log('action', action);
    console.log('content', content);
    console.log('query', query);
    console.log('user_id', user.id);

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

          console.log('DEBUG: Calling mem0.ai with the following config:');
          console.log(`DEBUG: MEM0_API_KEY loaded: ${!!serverEnv.MEM0_API_KEY}`);
          console.log(`DEBUG: MEM0_ORG_ID: ${serverEnv.MEM0_ORG_ID}`);
          console.log(`DEBUG: MEM0_PROJECT_ID: ${serverEnv.MEM0_PROJECT_ID}`);

          console.log('DEBUG: About to call client.add() at:', new Date().toISOString());

          // Wrap in a promise with timeout to prevent hanging
          const addMemory = () =>
            new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Mem0 API call timed out after 30 seconds'));
              }, 30000);

              client
                .add(
                  [
                    {
                      role: 'user',
                      content: content,
                    },
                  ],
                  {
                    user_id: user.id,
                    org_id: serverEnv.MEM0_ORG_ID,
                    project_id: serverEnv.MEM0_PROJECT_ID,
                  },
                )
                .then((result) => {
                  clearTimeout(timeout);
                  resolve(result);
                })
                .catch((error) => {
                  clearTimeout(timeout);
                  console.error('Mem0 client.add() error:', error);
                  reject(error);
                });
            });

          const result = (await addMemory()) as any[];
          console.log('DEBUG: client.add() completed at:', new Date().toISOString());

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
            AND: [{ user_id: user.id }],
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
      console.error('MEM0_ADD_ERROR:', JSON.stringify(error, null, 2));
      throw error;
    }
  },
});
