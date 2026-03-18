import { createMCPClient } from '@ai-sdk/mcp';
import { getCurrentUser } from '@/app/actions';
import { ChatSDKError } from '@/lib/errors';
import { getUserMcpServerById, updateUserMcpServer } from '@/lib/db/queries';
import { resolveMcpAuthHeaders } from '@/lib/mcp/auth-headers';
import { validateMcpServerUrl } from '@/lib/mcp/server-config';
import { z } from 'zod';

const testMcpServerSchema = z.object({
  serverId: z.string().optional(),
  transportType: z.enum(['http', 'sse']).optional(),
  url: z.string().url().optional(),
  authType: z.enum(['none', 'bearer', 'header', 'oauth']).optional(),
  bearerToken: z.string().optional(),
  headerName: z.string().optional(),
  headerValue: z.string().optional(),
  oauthAccessToken: z.string().optional(),
}).refine(
  (value) => Boolean(value.serverId) || (Boolean(value.transportType) && Boolean(value.url)),
  'Provide serverId or transportType/url',
);

function assertProUser(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) throw new ChatSDKError('unauthorized:auth', 'Authentication required');
  if (!user.isProUser) throw new ChatSDKError('upgrade_required:auth', 'Pro subscription required');
  return user;
}

function normalizeMcpTestErrorMessage(
  message: string,
  context?: { transportType?: 'http' | 'sse'; url?: string },
) {
  const lower = message.toLowerCase();
  const isNotInitialized =
    lower.includes('server not initialized')
    || (lower.includes('"code":-32000') && lower.includes('not initialized'));

  if (isNotInitialized && context?.transportType === 'http') {
    return [
      'This HTTP MCP endpoint rejected requests before initialize.',
      'Try switching this server to SSE transport, or confirm the MCP URL is the correct session endpoint.',
      context.url ? `Checked URL: ${context.url}` : null,
      `Raw error: ${message.slice(0, 260)}`,
    ].filter(Boolean).join(' ');
  }

  return message;
}

export async function POST(request: Request) {
  let userIdForUpdate: string | null = null;
  let serverIdForUpdate: string | null = null;
  let errorContext: { transportType?: 'http' | 'sse'; url?: string } | undefined;

  try {
    const user = assertProUser(await getCurrentUser());
    userIdForUpdate = user.id;
    const input = testMcpServerSchema.parse(await request.json());

    const serverConfig = input.serverId
      ? await (async () => {
        const stored = await getUserMcpServerById({ id: input.serverId!, userId: user.id });
        if (!stored) throw new ChatSDKError('not_found:api', 'MCP server not found');
        serverIdForUpdate = stored.id;
        return {
          transportType: stored.transportType,
          url: stored.url,
          headers: await resolveMcpAuthHeaders({
            server: stored,
            userId: user.id,
          }),
          authType: stored.authType,
        };
      })()
      : (() => {
        validateMcpServerUrl(input.url!);
        const headers: Record<string, string> = {};

        if (input.authType === 'bearer' && input.bearerToken) {
          headers.Authorization = `Bearer ${input.bearerToken}`;
        } else if (input.authType === 'header' && input.headerName && input.headerValue) {
          headers[input.headerName] = input.headerValue;
        } else if (input.authType === 'oauth' && input.oauthAccessToken) {
          headers.Authorization = `Bearer ${input.oauthAccessToken}`;
        }

        return {
          transportType: input.transportType!,
          url: input.url!,
          headers,
          authType: input.authType ?? 'none',
        };
      })();

    validateMcpServerUrl(serverConfig.url);
    errorContext = {
      transportType: serverConfig.transportType,
      url: serverConfig.url,
    };

    const client = await createMCPClient({
      transport: {
        type: serverConfig.transportType,
        url: serverConfig.url,
        headers: serverConfig.headers,
      },
    });

    try {
      const tools = await client.tools();
      const toolNames = Object.keys(tools);

      if (serverIdForUpdate && userIdForUpdate) {
        const values: Parameters<typeof updateUserMcpServer>[0]['values'] = {
          lastTestedAt: new Date(),
          lastError: null,
        };
        if (serverConfig.authType === 'oauth') values.oauthError = null;
        await updateUserMcpServer({
          id: serverIdForUpdate,
          userId: userIdForUpdate,
          values,
        });
      }

      return Response.json({
        ok: true,
        toolCount: toolNames.length,
        toolNames: toolNames.slice(0, 20),
      });
    } finally {
      await client.close();
    }
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : 'Connection test failed';
    const normalizedMessage = normalizeMcpTestErrorMessage(rawMessage, errorContext);

    if (serverIdForUpdate && userIdForUpdate) {
      const server = await getUserMcpServerById({ id: serverIdForUpdate, userId: userIdForUpdate }).catch(() => null);
      const values: Parameters<typeof updateUserMcpServer>[0]['values'] = {
        lastTestedAt: new Date(),
        lastError: normalizedMessage.slice(0, 1000),
      };
      if (server?.authType === 'oauth') {
        values.oauthError = normalizedMessage.slice(0, 1000);
      }
      await updateUserMcpServer({
        id: serverIdForUpdate,
        userId: userIdForUpdate,
        values,
      }).catch(() => null);
    }

    if (error instanceof ChatSDKError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return new ChatSDKError('bad_request:api', error.issues[0]?.message || 'Invalid request payload').toResponse();
    }
    if (error instanceof Error) return new ChatSDKError('bad_request:api', normalizedMessage).toResponse();
    console.error('Failed to test MCP server:', error);
    return new ChatSDKError('bad_request:api', normalizedMessage).toResponse();
  }
}
