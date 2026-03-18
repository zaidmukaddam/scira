import { getCurrentUser } from '@/app/actions';
import { getUserMcpServerById } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { buildMcpOAuthAuthorizationUrl } from '@/lib/mcp/oauth';
import { validateMcpOAuthConfig } from '@/lib/mcp/server-config';
import { injectManagedOAuthCredentials } from '@/lib/mcp/managed-credentials';

function assertProUser(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) throw new ChatSDKError('unauthorized:auth', 'Authentication required');
  if (!user.isProUser) throw new ChatSDKError('upgrade_required:auth', 'Pro subscription required');
  return user;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = assertProUser(await getCurrentUser());
    const { id } = await params;
    const rawServer = await getUserMcpServerById({ id, userId: user.id });
    if (!rawServer) return new ChatSDKError('not_found:api', 'MCP server not found').toResponse();
    if (rawServer.authType !== 'oauth') return new ChatSDKError('bad_request:api', 'Server auth type is not OAuth').toResponse();

    const server = injectManagedOAuthCredentials(rawServer);

    validateMcpOAuthConfig({
      authType: 'oauth',
      oauthIssuerUrl: server.oauthIssuerUrl ?? undefined,
      oauthAuthorizationUrl: server.oauthAuthorizationUrl ?? undefined,
      oauthTokenUrl: server.oauthTokenUrl ?? undefined,
      oauthClientId: server.oauthClientId ?? undefined,
    });

    const requestOrigin = new URL(request.url).origin;
    const { authorizationUrl } = await buildMcpOAuthAuthorizationUrl({
      server,
      userId: user.id,
      requestOrigin,
    });

    return Response.json({ authorizationUrl });
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    if (error instanceof Error) {
      return new ChatSDKError('bad_request:api', error.message).toResponse();
    }
    return new ChatSDKError('bad_request:api', 'Failed to start OAuth flow').toResponse();
  }
}
