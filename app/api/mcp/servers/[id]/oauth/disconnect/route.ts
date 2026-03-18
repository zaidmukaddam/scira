import { getCurrentUser } from '@/app/actions';
import { getUserMcpServerById, updateUserMcpServer } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

function assertProUser(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) throw new ChatSDKError('unauthorized:auth', 'Authentication required');
  if (!user.isProUser) throw new ChatSDKError('upgrade_required:auth', 'Pro subscription required');
  return user;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = assertProUser(await getCurrentUser());
    const { id } = await params;
    const server = await getUserMcpServerById({ id, userId: user.id });
    if (!server) return new ChatSDKError('not_found:api', 'MCP server not found').toResponse();

    await updateUserMcpServer({
      id,
      userId: user.id,
      values: {
        oauthAccessTokenEncrypted: null,
        oauthRefreshTokenEncrypted: null,
        oauthAccessTokenExpiresAt: null,
        oauthConnectedAt: null,
        oauthError: null,
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    return new ChatSDKError('bad_request:api', 'Failed to disconnect OAuth').toResponse();
  }
}
