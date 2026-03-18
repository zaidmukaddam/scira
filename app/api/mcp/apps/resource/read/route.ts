import { createMCPClient } from '@ai-sdk/mcp';
import { z } from 'zod';
import { getCurrentUser } from '@/app/actions';
import { getUserMcpServerById } from '@/lib/db/queries';
import { resolveMcpAuthHeaders } from '@/lib/mcp/auth-headers';
import { validateMcpServerUrl } from '@/lib/mcp/server-config';
import { ChatSDKError } from '@/lib/errors';

const readMcpAppResourceSchema = z.object({
  serverId: z.string().min(1),
  resourceUri: z.string().min(1),
});

function extractUiResourceMeta(resource: unknown, content: unknown) {
  const resourceMeta = (resource as any)?._meta;
  const contentMeta = (content as any)?._meta;
  const uiMeta = (contentMeta?.ui ?? resourceMeta?.ui ?? {}) as Record<string, unknown>;

  const csp = uiMeta.csp ?? contentMeta?.['ui/csp'] ?? resourceMeta?.['ui/csp'];
  const permissions = uiMeta.permissions ?? contentMeta?.['ui/permissions'] ?? resourceMeta?.['ui/permissions'];
  const prefersBorder = uiMeta.prefersBorder ?? contentMeta?.['ui/prefersBorder'] ?? resourceMeta?.['ui/prefersBorder'];
  const domain = uiMeta.domain ?? contentMeta?.['ui/domain'] ?? resourceMeta?.['ui/domain'];

  return {
    csp: csp && typeof csp === 'object' ? csp : undefined,
    permissions: permissions && typeof permissions === 'object' ? permissions : undefined,
    prefersBorder: typeof prefersBorder === 'boolean' ? prefersBorder : undefined,
    domain: typeof domain === 'string' ? domain : undefined,
  };
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return new ChatSDKError('unauthorized:auth').toResponse();

    const input = readMcpAppResourceSchema.parse(await request.json());
    if (!input.resourceUri.startsWith('ui://')) {
      return new ChatSDKError('bad_request:api', 'Only ui:// resources are supported').toResponse();
    }

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
      const resource = await client.readResource({ uri: input.resourceUri });
      const htmlContent = resource.contents.find(
        (content) =>
          typeof (content as any)?.text === 'string'
          && typeof (content as any)?.mimeType === 'string'
          && ((content as any).mimeType as string).includes('text/html'),
      ) as { text?: string; mimeType?: string; uri?: string; _meta?: Record<string, unknown> } | undefined;

      if (!htmlContent?.text) {
        return new ChatSDKError('bad_request:api', 'Resource did not return HTML content').toResponse();
      }

      const resourceMeta = extractUiResourceMeta(resource, htmlContent);

      return Response.json({
        ok: true,
        html: htmlContent.text,
        mimeType: htmlContent.mimeType,
        uri: htmlContent.uri ?? input.resourceUri,
        resourceMeta,
      });
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
    return new ChatSDKError('bad_request:api', 'Failed to read MCP app resource').toResponse();
  }
}

