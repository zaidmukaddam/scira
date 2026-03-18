import { createMCPClient } from '@ai-sdk/mcp';
import { getCurrentUser } from '@/app/actions';
import { getUserMcpServerById } from '@/lib/db/queries';
import { resolveMcpAuthHeaders } from '@/lib/mcp/auth-headers';
import { validateMcpServerUrl } from '@/lib/mcp/server-config';
import { ChatSDKError } from '@/lib/errors';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) return new ChatSDKError('unauthorized:auth').toResponse();

    const { id } = await params;
    const server = await getUserMcpServerById({ id, userId: user.id });
    if (!server) return new ChatSDKError('not_found:api', 'MCP server not found').toResponse();

    validateMcpServerUrl(server.url);

    const client = await createMCPClient({
      transport: {
        type: server.transportType,
        url: server.url,
        headers: await resolveMcpAuthHeaders({ server, userId: user.id }),
      },
    });

    try {
      const toolsResult = await client.listTools();
      const tools = toolsResult.tools.map((t) => ({
        name: t.name,
        title: t.title ?? null,
        description: t.description ?? null,
      }));
      return Response.json({ ok: true, tools });
    } finally {
      await client.close();
    }
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    if (error instanceof Error) {
      return new ChatSDKError('bad_request:api', error.message).toResponse();
    }
    return new ChatSDKError('bad_request:api', 'Failed to list MCP server tools').toResponse();
  }
}
