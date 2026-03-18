import 'server-only';

import type { UserMcpServer } from '@/lib/db/schema';
import { getEncryptedOAuthValue } from '@/lib/mcp/server-config';

const MANAGED_SERVERS: Record<string, { clientIdEnv: string; clientSecretEnv: string; defaultScopes?: string }> = {
  'https://api.githubcopilot.com/mcp': { clientIdEnv: 'GITHUB_MCP_CLIENT_ID', clientSecretEnv: 'GITHUB_MCP_CLIENT_SECRET' },
  'https://mcp.box.com': { clientIdEnv: 'BOX_MCP_CLIENT_ID', clientSecretEnv: 'BOX_MCP_CLIENT_SECRET', defaultScopes: 'root_readwrite' },
  'https://mcp.dropbox.com/mcp': { clientIdEnv: 'DROPBOX_MCP_CLIENT_ID', clientSecretEnv: 'DROPBOX_MCP_CLIENT_SECRET' },
  'https://mcp.slack.com/mcp': { clientIdEnv: 'SLACK_MCP_CLIENT_ID', clientSecretEnv: 'SLACK_MCP_CLIENT_SECRET' },
  'https://mcp.hubspot.com': { clientIdEnv: 'HUBSPOT_MCP_CLIENT_ID', clientSecretEnv: 'HUBSPOT_MCP_CLIENT_SECRET' },
};

type ManagedServer = Pick<UserMcpServer,
  | 'id' | 'url' | 'authType'
  | 'oauthClientId' | 'oauthClientSecretEncrypted'
  | 'oauthIssuerUrl' | 'oauthAuthorizationUrl' | 'oauthTokenUrl'
  | 'oauthScopes' | 'oauthAccessTokenEncrypted' | 'oauthRefreshTokenEncrypted'
  | 'oauthAccessTokenExpiresAt'
>;

export function injectManagedOAuthCredentials<T extends ManagedServer>(server: T): T {
  const normalizedUrl = server.url.replace(/\/+$/, '');
  const managed = MANAGED_SERVERS[normalizedUrl];
  if (!managed) return server;

  const clientId = process.env[managed.clientIdEnv]?.trim();
  if (!clientId) return server;

  const clientSecret = process.env[managed.clientSecretEnv]?.trim();
  return {
    ...server,
    oauthClientId: clientId,
    oauthClientSecretEncrypted: clientSecret
      ? getEncryptedOAuthValue(clientSecret)
      : server.oauthClientSecretEncrypted,
    // Override scopes with the managed default if the server has unsupported scopes
    oauthScopes: managed.defaultScopes ?? server.oauthScopes,
  };
}
