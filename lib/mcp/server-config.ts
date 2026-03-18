import 'server-only';

import type { UserMcpServer } from '@/lib/db/schema';
import { decryptMcpCredentials, encryptMcpCredentials } from '@/lib/mcp/crypto';

export type McpAuthType = 'none' | 'bearer' | 'header' | 'oauth';
export type McpTransportType = 'http' | 'sse';

export interface McpCredentialPayload {
  bearerToken?: string;
  headerName?: string;
  headerValue?: string;
}

export interface McpOAuthCredentialPayload {
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface McpServerInput {
  name: string;
  transportType: McpTransportType;
  url: string;
  authType: McpAuthType;
  bearerToken?: string;
  headerName?: string;
  headerValue?: string;
  oauthIssuerUrl?: string;
  oauthAuthorizationUrl?: string;
  oauthTokenUrl?: string;
  oauthScopes?: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  isEnabled?: boolean;
}

export function validateMcpServerUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL');
  }

  const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  const isDev = process.env.NODE_ENV !== 'production';
  const isHttps = parsed.protocol === 'https:';
  const isAllowedLocalHttp = isDev && isLocalhost && parsed.protocol === 'http:';

  if (!isHttps && !isAllowedLocalHttp) {
    throw new Error('Only https URLs are allowed in production (http localhost allowed in development)');
  }
}

export function getEncryptedMcpCredentials(input: McpServerInput) {
  if (input.authType === 'none') return null;
  if (input.authType === 'bearer') {
    const token = input.bearerToken?.trim();
    if (!token) throw new Error('Bearer token is required');
    return encryptMcpCredentials(JSON.stringify({ bearerToken: token } satisfies McpCredentialPayload));
  }

  if (input.authType === 'header') {
    const headerName = input.headerName?.trim();
    const headerValue = input.headerValue?.trim();
    if (!headerName || !headerValue) throw new Error('Custom header name and value are required');

    return encryptMcpCredentials(
      JSON.stringify({ headerName, headerValue } satisfies McpCredentialPayload),
    );
  }

  return null;
}

export function getMcpCredentialPayload(server: Pick<UserMcpServer, 'authType' | 'encryptedCredentials'>) {
  if (server.authType === 'none') return {};
  if (!server.encryptedCredentials) throw new Error('Missing encrypted credentials');

  const decrypted = decryptMcpCredentials(server.encryptedCredentials);
  return JSON.parse(decrypted) as McpCredentialPayload;
}

export function getMcpAuthHeaders(server: Pick<UserMcpServer, 'authType' | 'encryptedCredentials'>) {
  if (server.authType === 'none') return {};
  if (server.authType === 'oauth') return {};

  const payload = getMcpCredentialPayload(server);
  if (server.authType === 'bearer') {
    if (!payload.bearerToken) throw new Error('Invalid bearer credential payload');
    return { Authorization: `Bearer ${payload.bearerToken}` };
  }

  if (!payload.headerName || !payload.headerValue) throw new Error('Invalid header credential payload');
  return { [payload.headerName]: payload.headerValue };
}

export function getEncryptedOAuthValue(value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) return null;
  return encryptMcpCredentials(JSON.stringify({ value: normalized }));
}

export function decryptOAuthValue(encrypted: string | null | undefined) {
  if (!encrypted) return null;
  try {
    const raw = decryptMcpCredentials(encrypted);
    const parsed = JSON.parse(raw) as { value?: string };
    return parsed.value?.trim() || null;
  } catch {
    return null;
  }
}

export function normalizeMcpScopes(scopes: string | undefined) {
  if (!scopes) return null;
  const cleaned = scopes
    .split(/[,\s]+/)
    .map((scope) => scope.trim())
    .filter(Boolean)
    .join(' ');
  return cleaned || null;
}

export function validateMcpOAuthConfig(input: Pick<
  McpServerInput,
  'authType' | 'oauthIssuerUrl' | 'oauthAuthorizationUrl' | 'oauthTokenUrl' | 'oauthClientId'
>) {
  if (input.authType !== 'oauth') return;

  const issuerUrl = input.oauthIssuerUrl?.trim();
  const authUrl = input.oauthAuthorizationUrl?.trim();
  const tokenUrl = input.oauthTokenUrl?.trim();
  const clientId = input.oauthClientId?.trim();

  if (!issuerUrl && (authUrl || tokenUrl) && (!authUrl || !tokenUrl)) {
    throw new Error('Provide both authorization and token URLs when using manual OAuth endpoints');
  }

  if (issuerUrl) validateMcpServerUrl(issuerUrl);
  if (authUrl) validateMcpServerUrl(authUrl);
  if (tokenUrl) validateMcpServerUrl(tokenUrl);
  if (clientId && /^https?:\/\//i.test(clientId)) validateMcpServerUrl(clientId);
}
