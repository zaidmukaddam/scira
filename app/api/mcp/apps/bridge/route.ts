import { createMCPClient } from '@ai-sdk/mcp';
import { z } from 'zod';
import { getCurrentUser } from '@/app/actions';
import { getUserMcpServerById } from '@/lib/db/queries';
import { resolveMcpAuthHeaders } from '@/lib/mcp/auth-headers';
import { validateMcpServerUrl } from '@/lib/mcp/server-config';
import { ChatSDKError } from '@/lib/errors';

const bridgeRequestSchema = z.object({
  serverId: z.string().min(1),
  method: z.enum([
    'tools/call',
    'resources/list',
    'resources/read',
    'resources/templates/list',
    'prompts/list',
  ]),
  params: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return new ChatSDKError('unauthorized:auth').toResponse();

    const input = bridgeRequestSchema.parse(await request.json());
    const server = await getUserMcpServerById({ id: input.serverId, userId: user.id });
    if (!server) return new ChatSDKError('not_found:api', 'MCP server not found').toResponse();

    validateMcpServerUrl(server.url);

    const client = await createMCPClient({
      transport: {
        type: server.transportType,
        url: server.url,
        headers: await resolveMcpAuthHeaders({
          server,
          userId: user.id,
        }),
      },
    });

    try {
      const params = input.params ?? {};

      if (input.method === 'tools/call') {
        const toolName = typeof params.name === 'string' ? params.name : '';
        const toolArgs = params.arguments && typeof params.arguments === 'object'
          ? params.arguments as Record<string, unknown>
          : {};
        if (!toolName) {
          return new ChatSDKError('bad_request:api', 'Tool name is required').toResponse();
        }

        const toolSet = await client.tools();
        const tool = toolSet[toolName] as any;
        if (!tool?.execute) {
          return new ChatSDKError('not_found:api', `Tool not found: ${toolName}`).toResponse();
        }

        const result = await tool.execute(toolArgs, {});
        return Response.json({
          ok: true,
          result,
        });
      }

      if (input.method === 'resources/list') {
        const result = await client.listResources();
        return Response.json({ ok: true, result });
      }

      if (input.method === 'resources/read') {
        const uri = typeof params.uri === 'string' ? params.uri : '';
        if (!uri) return new ChatSDKError('bad_request:api', 'Resource URI is required').toResponse();
        const result = await client.readResource({ uri });
        return Response.json({ ok: true, result });
      }

      if (input.method === 'resources/templates/list') {
        const result = await client.listResourceTemplates();
        return Response.json({ ok: true, result });
      }

      const result = await client.experimental_listPrompts();
      return Response.json({ ok: true, result });
    } finally {
      await client.close();
    }
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return new ChatSDKError('bad_request:api', error.issues[0]?.message || 'Invalid request payload').toResponse();
    }
    if (error instanceof Error) {
      return new ChatSDKError('bad_request:api', error.message).toResponse();
    }
    return new ChatSDKError('bad_request:api', 'Failed to handle MCP app bridge request').toResponse();
  }
}
