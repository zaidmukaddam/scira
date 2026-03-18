import 'server-only';

import type { UserMcpServer } from '@/lib/db/schema';
import { getMcpAuthHeaders } from '@/lib/mcp/server-config';
import { resolveMcpOAuthAccessToken } from '@/lib/mcp/oauth';

export async function resolveMcpAuthHeaders({
  server,
  userId,
}: {
  server: Pick<
    UserMcpServer,
    | 'id'
    | 'url'
    | 'authType'
    | 'encryptedCredentials'
    | 'oauthIssuerUrl'
    | 'oauthAuthorizationUrl'
    | 'oauthTokenUrl'
    | 'oauthClientId'
    | 'oauthClientSecretEncrypted'
    | 'oauthAccessTokenEncrypted'
    | 'oauthRefreshTokenEncrypted'
    | 'oauthAccessTokenExpiresAt'
  >;
  userId: string;
}) {
  if (server.authType !== 'oauth') return getMcpAuthHeaders(server);

  const accessToken = await resolveMcpOAuthAccessToken({
    server,
    userId,
  });

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}
