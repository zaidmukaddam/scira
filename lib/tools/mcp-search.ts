import { tool } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';

export const mcpSearchTool = tool({
  description: `Search for mcp servers and get the information about them. VERY IMPORTANT: DO NOT USE THIS TOOL FOR GENERAL WEB SEARCHES, ONLY USE IT FOR MCP SERVER SEARCHES.`,
  inputSchema: z.object({
    query: z.string().describe('The query to search for'),
  }),
  execute: async ({ query }: { query: string }) => {
    try {
      const response = await fetch(`https://registry.smithery.ai/servers?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${serverEnv.SMITHERY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Smithery API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      const detailedServers = await Promise.all(
        data.servers.map(async (server: any) => {
          const detailResponse = await fetch(
            `https://registry.smithery.ai/servers/${encodeURIComponent(server.qualifiedName)}`,
            {
              headers: {
                Authorization: `Bearer ${serverEnv.SMITHERY_API_KEY}`,
                'Content-Type': 'application/json',
              },
            },
          );

          if (!detailResponse.ok) {
            console.warn(`Failed to fetch details for ${server.qualifiedName}`);
            return server;
          }

          const details = await detailResponse.json();
          return {
            ...server,
            deploymentUrl: details.deploymentUrl,
            connections: details.connections,
          };
        }),
      );

      return {
        servers: detailedServers,
        pagination: data.pagination,
        query: query,
      };
    } catch (error) {
      console.error('Smithery search error:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: query,
      };
    }
  },
});
