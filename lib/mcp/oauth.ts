import 'server-only';

import { createHash, createHmac, randomBytes } from 'node:crypto';
import type { UserMcpServer } from '@/lib/db/schema';
import { updateUserMcpServer } from '@/lib/db/queries';
import { decryptOAuthValue, getEncryptedOAuthValue, validateMcpServerUrl } from '@/lib/mcp/server-config';

interface OAuthEndpointConfig {
  authorizationUrl: string;
  tokenUrl: string;
  resource: string;
  suggestedScope: string | null;
  registrationUrl: string | null;
  clientMetadataSupported: boolean;
}

interface OAuthStatePayload {
  userId: string;
  serverId: string;
  verifier: string;
  nonce: string;
  exp: number;
}

interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
  // Slack v2 user flow nests the user token here
  authed_user?: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
}

interface OAuthServerMetadata {
  authorization_endpoint?: string;
  token_endpoint?: string;
  code_challenge_methods_supported?: string[];
  registration_endpoint?: string;
  client_id_metadata_document_supported?: boolean;
  scopes_supported?: string[];
}

interface OAuthProtectedResourceMetadata {
  authorization_servers?: string[];
  scopes_supported?: string[];
}

const SLACK_MCP_RESOURCE_HOST = 'mcp.slack.com';
const SLACK_AUTHORIZATION_ENDPOINT = 'https://slack.com/oauth/v2_user/authorize';
const SLACK_TOKEN_ENDPOINT = 'https://slack.com/api/oauth.v2.user.access';
// Bot scopes required by Slack even in user-token-only flows
const SLACK_DEFAULT_BOT_SCOPES = 'search:read.files search:read.public users:read users:read.email';
const SLACK_DEFAULT_USER_SCOPES = [
  'canvases:read',
  'canvases:write',
  'channels:history',
  'chat:write',
  'groups:history',
  'im:history',
  'mpim:history',
  'search:read',
  'search:read.files',
  'search:read.im',
  'search:read.mpim',
  'search:read.private',
  'search:read.public',
  'search:read.users',
  'users:read',
  'users:read.email',
].join(' ');

const OIDC_ONLY_SCOPES = new Set(['openid', 'offline_access']);

function stripOidcScopes(scope: string | null): string | null {
  if (!scope) return null;
  const filtered = scope
    .split(/\s+/)
    .filter((s) => !OIDC_ONLY_SCOPES.has(s))
    .join(' ')
    .trim();
  return filtered || null;
}

function isGitHubOAuthEndpoint(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase() === 'github.com' && parsed.pathname.startsWith('/login/oauth/');
  } catch {
    return false;
  }
}

function isSlackOAuthEndpoint(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase() === 'slack.com' && parsed.pathname.startsWith('/oauth/v2_');
  } catch {
    return false;
  }
}

function isSlackUserOAuthEndpoint(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase() === 'slack.com' && parsed.pathname === '/oauth/v2_user/authorize';
  } catch {
    return false;
  }
}

function isVercelOAuthEndpoint(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase() === 'vercel.com' && parsed.pathname.startsWith('/oauth/');
  } catch {
    return false;
  }
}

function isCanvaOAuthEndpoint(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase() === 'mcp.canva.com';
  } catch {
    return false;
  }
}

function getTrustedAppOrigin(requestOrigin: string) {
  const oauthOrigin = process.env.MCP_OAUTH_CALLBACK_ORIGIN?.trim();
  if (oauthOrigin) return oauthOrigin.replace(/\/+$/, '');
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return requestOrigin.replace(/\/+$/, '');
}

function getConfiguredAppOrigin() {
  const oauthOrigin = process.env.MCP_OAUTH_CALLBACK_ORIGIN?.trim();
  if (oauthOrigin) return oauthOrigin.replace(/\/+$/, '');
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return null;
}

function getOAuthCallbackUri(origin: string) {
  return `${origin}/api/mcp/oauth/callback`;
}

function toBase64Url(input: Buffer | string) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLength), 'base64');
}

function getStateSigningKey() {
  const key = process.env.MCP_CREDENTIALS_ENCRYPTION_KEY;
  if (!key) throw new Error('Missing MCP_CREDENTIALS_ENCRYPTION_KEY');
  return key;
}

function createCodeVerifier() {
  return toBase64Url(randomBytes(48));
}

function createCodeChallenge(verifier: string) {
  return toBase64Url(createHash('sha256').update(verifier).digest());
}

function signStatePayload(payloadBase64: string) {
  return toBase64Url(createHmac('sha256', getStateSigningKey()).update(payloadBase64).digest());
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeOrigin(value: string) {
  return value.replace(/\/+$/, '');
}

function canonicalizeResourceUri(rawUrl: string) {
  const parsed = new URL(rawUrl);
  validateMcpServerUrl(parsed.toString());
  parsed.hash = '';
  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();
  if (parsed.pathname === '/' && !parsed.search) parsed.pathname = '';
  return parsed.toString();
}

function parseChallengeParams(challenge: string) {
  const params: Record<string, string> = {};
  const pairs = challenge.match(/([a-zA-Z_]+)\s*=\s*("[^"]*"|[^,\s]+)/g) ?? [];
  for (const pair of pairs) {
    const [rawKey, rawValue] = pair.split('=');
    if (!rawKey || !rawValue) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rawValue.trim().replace(/^"|"$/g, '');
    params[key] = value;
  }
  return params;
}

function parseBearerChallenge(header: string | null) {
  if (!header) return { resourceMetadataUrl: null, scope: null };
  const bearerMatch = header.match(/Bearer\s+(.+)/i);
  if (!bearerMatch?.[1]) return { resourceMetadataUrl: null, scope: null };
  const params = parseChallengeParams(bearerMatch[1]);
  return {
    resourceMetadataUrl: params.resource_metadata ?? null,
    scope: params.scope ?? null,
  };
}

function getProtectedResourceMetadataUrls(serverUrl: string) {
  const parsed = new URL(serverUrl);
  const origin = normalizeOrigin(parsed.origin);
  const path = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
  const urls: string[] = [];
  if (path) urls.push(`${origin}/.well-known/oauth-protected-resource${path}`);
  urls.push(`${origin}/.well-known/oauth-protected-resource`);
  return urls;
}

function getAuthorizationServerMetadataUrls(issuerUrl: string) {
  const issuer = new URL(issuerUrl);
  const origin = normalizeOrigin(issuer.origin);
  const path = issuer.pathname === '/' ? '' : issuer.pathname.replace(/^\/+|\/+$/g, '');
  const urls: string[] = [];

  if (path) {
    urls.push(`${origin}/.well-known/oauth-authorization-server/${path}`);
    urls.push(`${origin}/.well-known/openid-configuration/${path}`);
    urls.push(`${normalizeOrigin(issuer.toString())}/.well-known/openid-configuration`);
  } else {
    urls.push(`${origin}/.well-known/oauth-authorization-server`);
    urls.push(`${origin}/.well-known/openid-configuration`);
  }

  return urls;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const text = await response.text();
  return safeJsonParse<T>(text);
}

async function discoverProtectedResourceMetadata(serverUrl: string) {
  const challengeResponse = await fetch(serverUrl, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  }).catch(() => null);

  const bearerChallenge = parseBearerChallenge(challengeResponse?.headers.get('www-authenticate') ?? null);
  const metadataCandidates = [
    ...(bearerChallenge.resourceMetadataUrl ? [bearerChallenge.resourceMetadataUrl] : []),
    ...getProtectedResourceMetadataUrls(serverUrl),
  ];

  const attempted = new Set<string>();
  for (const candidate of metadataCandidates) {
    if (!candidate || attempted.has(candidate)) continue;
    attempted.add(candidate);
    let metadataUrl: string;
    try {
      metadataUrl = new URL(candidate).toString();
      validateMcpServerUrl(metadataUrl);
    } catch {
      continue;
    }
    const metadata = await fetchJson<OAuthProtectedResourceMetadata>(metadataUrl);
    if (!metadata) continue;
    const discoveredIssuer = metadata.authorization_servers?.[0]?.trim() || null;
    if (discoveredIssuer) {
      validateMcpServerUrl(discoveredIssuer);
      const scopeFromChallenge = stripOidcScopes(bearerChallenge.scope?.trim() || null);
      const scopeFromMetadata = stripOidcScopes(metadata.scopes_supported?.join(' ').trim() || null);
      return {
        issuerUrl: discoveredIssuer,
        suggestedScope: scopeFromChallenge || scopeFromMetadata,
      };
    }
  }

  return {
    issuerUrl: null,
    suggestedScope: bearerChallenge.scope?.trim() || null,
  };
}

async function discoverAuthorizationServerMetadata(issuerUrl: string) {
  validateMcpServerUrl(issuerUrl);
  const candidates = getAuthorizationServerMetadataUrls(issuerUrl);
  for (const url of candidates) {
    const metadata = await fetchJson<OAuthServerMetadata>(url);
    if (!metadata) continue;
    if (!metadata.authorization_endpoint || !metadata.token_endpoint) continue;
    validateMcpServerUrl(metadata.authorization_endpoint);
    validateMcpServerUrl(metadata.token_endpoint);
    const methods = metadata.code_challenge_methods_supported;
    if (!Array.isArray(methods) || !methods.includes('S256')) {
      throw new Error('OAuth authorization server must support PKCE S256');
    }
    const registrationUrl = metadata.registration_endpoint ?? null;
    if (registrationUrl) validateMcpServerUrl(registrationUrl);

    return {
      authorizationUrl: metadata.authorization_endpoint,
      tokenUrl: metadata.token_endpoint,
      registrationUrl,
      clientMetadataSupported: metadata.client_id_metadata_document_supported === true,
      suggestedScope: stripOidcScopes(metadata.scopes_supported?.join(' ').trim() || null),
    };
  }
  throw new Error('Failed to discover OAuth authorization server metadata');
}

async function postTokenRequest(tokenUrl: string, body: URLSearchParams) {
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
    cache: 'no-store',
  });

  const text = await response.text();
  const parsed = safeJsonParse<OAuthTokenResponse>(text);

  if (!response.ok) {
    const reason = parsed?.error_description || parsed?.error || text.slice(0, 200) || 'OAuth token request failed';
    throw new Error(reason);
  }

  // Slack v2 user flow wraps the user token in authed_user
  if (!parsed?.access_token && parsed?.authed_user?.access_token) {
    return {
      ...parsed,
      access_token: parsed.authed_user.access_token,
      refresh_token: parsed.authed_user.refresh_token ?? parsed.refresh_token,
      expires_in: parsed.authed_user.expires_in ?? parsed.expires_in,
    };
  }
  if (!parsed?.access_token) throw new Error('OAuth provider did not return an access token');
  return parsed;
}

function resolveOAuthClientId({
  serverId,
  configuredClientId,
  requestOrigin,
}: {
  serverId: string;
  configuredClientId: string | null | undefined;
  requestOrigin?: string;
}) {
  const clientId = configuredClientId?.trim();
  if (clientId) return clientId;

  const baseOrigin = requestOrigin ? getTrustedAppOrigin(requestOrigin) : getConfiguredAppOrigin();
  if (!baseOrigin) {
    throw new Error('Missing app origin for OAuth client metadata. Set MCP_OAUTH_CALLBACK_ORIGIN.');
  }

  const parsedOrigin = new URL(baseOrigin);
  const isLocalhost = parsedOrigin.hostname === 'localhost' || parsedOrigin.hostname === '127.0.0.1';
  if (parsedOrigin.protocol !== 'https:' || isLocalhost) {
    throw new Error(
      'Auto OAuth connect needs a public HTTPS app URL. In local/dev, add a provider client ID in Advanced OAuth fields.',
    );
  }

  return `${baseOrigin}/api/mcp/oauth/client-metadata/${serverId}`;
}

async function registerDynamicOAuthClient({
  registrationUrl,
  serverId,
  requestOrigin,
}: {
  registrationUrl: string;
  serverId: string;
  requestOrigin: string;
}) {
  validateMcpServerUrl(registrationUrl);
  const origin = getTrustedAppOrigin(requestOrigin);
  const redirectUri = getOAuthCallbackUri(origin);
  const response = await fetch(registrationUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_name: 'Scira AI',
      client_uri: origin,
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }),
    cache: 'no-store',
  });

  const text = await response.text();
  const parsed = safeJsonParse<{
    client_id?: string;
    client_secret?: string;
    error?: string;
    error_description?: string;
  }>(text);

  if (!response.ok || !parsed?.client_id) {
    const reason =
      parsed?.error_description || parsed?.error || text.slice(0, 200) || 'Dynamic OAuth client registration failed';
    throw new Error(reason);
  }

  return {
    clientId: parsed.client_id,
    clientSecret: parsed.client_secret ?? null,
  };
}

export async function resolveOAuthEndpoints(
  server: Pick<UserMcpServer, 'url' | 'oauthIssuerUrl' | 'oauthAuthorizationUrl' | 'oauthTokenUrl'>,
): Promise<OAuthEndpointConfig> {
  const resource = canonicalizeResourceUri(server.url);
  const isSlackMcpResource = (() => {
    try {
      return new URL(resource).hostname.toLowerCase() === SLACK_MCP_RESOURCE_HOST;
    } catch {
      return false;
    }
  })();
  const protectedMetadata = await discoverProtectedResourceMetadata(resource);
  const discoveredIssuer = protectedMetadata.issuerUrl;
  const configuredIssuer = server.oauthIssuerUrl?.trim() || null;
  if (configuredIssuer) validateMcpServerUrl(configuredIssuer);

  const issuerForDiscovery = configuredIssuer || discoveredIssuer;
  if (issuerForDiscovery) {
    const endpoints = await discoverAuthorizationServerMetadata(issuerForDiscovery);
    if (isSlackMcpResource) {
      return {
        ...endpoints,
        authorizationUrl: SLACK_AUTHORIZATION_ENDPOINT,
        tokenUrl: SLACK_TOKEN_ENDPOINT,
        resource,
        suggestedScope: protectedMetadata.suggestedScope || endpoints.suggestedScope || SLACK_DEFAULT_USER_SCOPES,
      };
    }
    return {
      ...endpoints,
      resource,
      suggestedScope: protectedMetadata.suggestedScope || endpoints.suggestedScope || null,
    };
  }

  // Some MCP servers omit oauth-protected-resource metadata but still expose
  // authorization server metadata on the resource origin.
  try {
    const resourceOriginIssuer = new URL(resource).origin;
    const endpoints = await discoverAuthorizationServerMetadata(resourceOriginIssuer);
    if (isSlackMcpResource) {
      return {
        ...endpoints,
        authorizationUrl: SLACK_AUTHORIZATION_ENDPOINT,
        tokenUrl: SLACK_TOKEN_ENDPOINT,
        resource,
        suggestedScope: protectedMetadata.suggestedScope || endpoints.suggestedScope || SLACK_DEFAULT_USER_SCOPES,
      };
    }
    return {
      ...endpoints,
      resource,
      suggestedScope: protectedMetadata.suggestedScope || endpoints.suggestedScope || null,
    };
  } catch {
    // Continue to explicit endpoint fallback below.
  }

  if (server.oauthAuthorizationUrl && server.oauthTokenUrl) {
    validateMcpServerUrl(server.oauthAuthorizationUrl);
    validateMcpServerUrl(server.oauthTokenUrl);
    const authorizationUrl = isSlackMcpResource ? SLACK_AUTHORIZATION_ENDPOINT : server.oauthAuthorizationUrl;
    const tokenUrl = isSlackMcpResource ? SLACK_TOKEN_ENDPOINT : server.oauthTokenUrl;
    return {
      authorizationUrl,
      tokenUrl,
      resource,
      suggestedScope: protectedMetadata.suggestedScope || (isSlackMcpResource ? SLACK_DEFAULT_USER_SCOPES : null),
      registrationUrl: null,
      clientMetadataSupported: false,
    };
  }

  if (isSlackMcpResource) {
    return {
      authorizationUrl: SLACK_AUTHORIZATION_ENDPOINT,
      tokenUrl: SLACK_TOKEN_ENDPOINT,
      resource,
      suggestedScope: protectedMetadata.suggestedScope || SLACK_DEFAULT_USER_SCOPES,
      registrationUrl: null,
      clientMetadataSupported: false,
    };
  }

  throw new Error(
    'Unable to discover OAuth authorization server. Provide issuer URL or valid MCP protected resource metadata.',
  );
}

export async function buildMcpOAuthAuthorizationUrl({
  server,
  userId,
  requestOrigin,
}: {
  server: Pick<
    UserMcpServer,
    'id' | 'url' | 'oauthIssuerUrl' | 'oauthAuthorizationUrl' | 'oauthTokenUrl' | 'oauthClientId' | 'oauthScopes'
  >;
  userId: string;
  requestOrigin: string;
}) {
  const endpoints = await resolveOAuthEndpoints(server);
  const isGitHubOAuthFlow =
    isGitHubOAuthEndpoint(endpoints.authorizationUrl) || isGitHubOAuthEndpoint(endpoints.tokenUrl);
  const isSlackOAuthFlow = isSlackOAuthEndpoint(endpoints.authorizationUrl) || isSlackOAuthEndpoint(endpoints.tokenUrl);
  const isSlackUserOAuthFlow = isSlackUserOAuthEndpoint(endpoints.authorizationUrl);
  const isVercelOAuthFlow =
    isVercelOAuthEndpoint(endpoints.authorizationUrl) || isVercelOAuthEndpoint(endpoints.tokenUrl);
  const isCanvaOAuthFlow = isCanvaOAuthEndpoint(endpoints.authorizationUrl) || isCanvaOAuthEndpoint(endpoints.tokenUrl);
  let clientId = server.oauthClientId?.trim() || null;
  let clientSecret = null as string | null;
  if (!clientId) {
    let registrationError: Error | null = null;
    if (endpoints.registrationUrl) {
      try {
        const registered = await registerDynamicOAuthClient({
          registrationUrl: endpoints.registrationUrl,
          serverId: server.id,
          requestOrigin,
        });
        clientId = registered.clientId;
        clientSecret = registered.clientSecret;
        await updateUserMcpServer({
          id: server.id,
          userId,
          values: {
            oauthClientId: clientId,
            oauthClientSecretEncrypted: getEncryptedOAuthValue(clientSecret ?? undefined),
            oauthError: null,
          },
        });
      } catch (error) {
        registrationError = error instanceof Error ? error : new Error('Dynamic OAuth client registration failed');
      }
    }

    if (!clientId) {
      if (isGitHubOAuthFlow || isSlackOAuthFlow || isVercelOAuthFlow || isCanvaOAuthFlow) {
        const providerName = isGitHubOAuthFlow
          ? 'GitHub'
          : isSlackOAuthFlow
            ? 'Slack'
            : isVercelOAuthFlow
              ? 'Vercel'
              : 'Canva';
        throw new Error(
          isVercelOAuthFlow
            ? 'Vercel MCP OAuth requires an approved Vercel app/client ID. Auto client metadata is not supported. Configure approved credentials, then reconnect.'
            : isCanvaOAuthFlow
              ? 'Canva MCP OAuth requires a Canva app Client ID/Secret with your app host allowed. Auto client metadata is not supported. Configure credentials, then reconnect.'
              : `${providerName} OAuth requires a ${providerName} app Client ID. Add Client ID/Secret in Apps setup, then reconnect.`,
        );
      }
      try {
        clientId = resolveOAuthClientId({
          serverId: server.id,
          configuredClientId: server.oauthClientId,
          requestOrigin,
        });
      } catch (metadataError) {
        if (registrationError) {
          throw new Error(
            `${registrationError.message}. Auto fallback also failed: ${
              metadataError instanceof Error ? metadataError.message : 'unable to resolve client metadata'
            }`,
          );
        }
        throw metadataError;
      }
    }

    if (!clientId && registrationError) {
      throw registrationError;
    }
  }
  if (!clientId) throw new Error('Unable to resolve OAuth client ID');
  const verifier = createCodeVerifier();
  const challenge = createCodeChallenge(verifier);
  const nonce = toBase64Url(randomBytes(16));
  const exp = Date.now() + 10 * 60 * 1000;
  const payload: OAuthStatePayload = {
    userId,
    serverId: server.id,
    verifier,
    nonce,
    exp,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signStatePayload(encodedPayload);
  const state = `${encodedPayload}.${signature}`;

  const origin = getTrustedAppOrigin(requestOrigin);
  const redirectUri = getOAuthCallbackUri(origin);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });

  if (!isGitHubOAuthFlow && !isSlackOAuthFlow) {
    params.set('resource', endpoints.resource);
  }
  const rawScope = server.oauthScopes?.trim() || endpoints.suggestedScope || '';
  let scopedValue = !isGitHubOAuthFlow && !isSlackOAuthFlow ? (stripOidcScopes(rawScope) ?? '') : rawScope;
  // Vercel requires offline_access scope to issue a refresh token
  if (isVercelOAuthFlow && !scopedValue.split(/\s+/).includes('offline_access')) {
    scopedValue = scopedValue ? `${scopedValue} offline_access` : 'offline_access';
  }
  if (isSlackUserOAuthFlow) {
    // Slack requires bot scopes alongside user scopes even in user-token-only flows
    params.set('scope', SLACK_DEFAULT_BOT_SCOPES);
    if (scopedValue) params.set('user_scope', scopedValue);
    params.set('granular_bot_scope', '1');
    params.set('user_default', '0');
  } else if (scopedValue) {
    params.set('scope', scopedValue);
  }

  const url = new URL(endpoints.authorizationUrl);
  url.search = params.toString();

  return { authorizationUrl: url.toString() };
}

export function verifyMcpOAuthState({
  state,
  expectedUserId,
  expectedServerId,
}: {
  state: string;
  expectedUserId: string;
  expectedServerId?: string;
}) {
  const [payloadBase64, signature] = state.split('.');
  if (!payloadBase64 || !signature) throw new Error('Invalid OAuth state');

  const expectedSignature = signStatePayload(payloadBase64);
  if (signature !== expectedSignature) throw new Error('Invalid OAuth state signature');

  const payloadRaw = fromBase64Url(payloadBase64).toString('utf8');
  const payload = safeJsonParse<OAuthStatePayload>(payloadRaw);
  if (!payload) throw new Error('Invalid OAuth state payload');
  if (payload.exp < Date.now()) throw new Error('OAuth state expired');
  if (payload.userId !== expectedUserId) {
    throw new Error('OAuth state mismatch');
  }
  if (expectedServerId && payload.serverId !== expectedServerId) {
    throw new Error('OAuth state mismatch');
  }

  return payload;
}

export async function exchangeMcpOAuthCode({
  server,
  userId,
  code,
  verifier,
  requestOrigin,
}: {
  server: Pick<
    UserMcpServer,
    | 'id'
    | 'url'
    | 'oauthIssuerUrl'
    | 'oauthAuthorizationUrl'
    | 'oauthTokenUrl'
    | 'oauthClientId'
    | 'oauthClientSecretEncrypted'
  >;
  userId: string;
  code: string;
  verifier: string;
  requestOrigin: string;
}) {
  const endpoints = await resolveOAuthEndpoints(server);
  const isGitHubOAuthFlow =
    isGitHubOAuthEndpoint(endpoints.authorizationUrl) || isGitHubOAuthEndpoint(endpoints.tokenUrl);
  const isSlackOAuthFlow = isSlackOAuthEndpoint(endpoints.authorizationUrl) || isSlackOAuthEndpoint(endpoints.tokenUrl);
  const clientId = resolveOAuthClientId({
    serverId: server.id,
    configuredClientId: server.oauthClientId,
    requestOrigin,
  });
  const origin = getTrustedAppOrigin(requestOrigin);
  const redirectUri = getOAuthCallbackUri(origin);
  const clientSecret = decryptOAuthValue(server.oauthClientSecretEncrypted);
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  });
  if (!isGitHubOAuthFlow && !isSlackOAuthFlow) {
    body.set('resource', endpoints.resource);
  }

  if (clientSecret) body.set('client_secret', clientSecret);

  const token = await postTokenRequest(endpoints.tokenUrl, body);
  const accessTokenEncrypted = getEncryptedOAuthValue(token.access_token);
  const refreshTokenEncrypted = getEncryptedOAuthValue(token.refresh_token);
  const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null;

  await updateUserMcpServer({
    id: server.id,
    userId,
    values: {
      oauthClientId: clientId,
      oauthAccessTokenEncrypted: accessTokenEncrypted,
      oauthRefreshTokenEncrypted: refreshTokenEncrypted,
      oauthAccessTokenExpiresAt: expiresAt,
      oauthConnectedAt: new Date(),
      oauthError: null,
    },
  });
}

export async function resolveMcpOAuthAccessToken({
  server,
  userId,
}: {
  server: Pick<
    UserMcpServer,
    | 'id'
    | 'url'
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
  const existingAccessToken = decryptOAuthValue(server.oauthAccessTokenEncrypted);
  const refreshToken = decryptOAuthValue(server.oauthRefreshTokenEncrypted);
  const clientSecret = decryptOAuthValue(server.oauthClientSecretEncrypted);
  const expiresAt = server.oauthAccessTokenExpiresAt?.getTime() ?? null;
  const isUsable = existingAccessToken && (!expiresAt || expiresAt - Date.now() > 60_000);
  if (isUsable) return existingAccessToken;

  if (!refreshToken) {
    // Clear stored tokens so the UI marks this server as disconnected and shows the Connect button.
    await updateUserMcpServer({
      id: server.id,
      userId,
      values: {
        oauthAccessTokenEncrypted: null,
        oauthRefreshTokenEncrypted: null,
        oauthAccessTokenExpiresAt: null,
        oauthConnectedAt: null,
        oauthError: 'OAuth session expired. Please reconnect.',
      },
    }).catch(() => null);
    throw new Error('OAuth session expired. Please reconnect this MCP server.');
  }
  const clientId = resolveOAuthClientId({
    serverId: server.id,
    configuredClientId: server.oauthClientId,
  });

  const endpoints = await resolveOAuthEndpoints(server);
  const isGitHubOAuthFlow =
    isGitHubOAuthEndpoint(endpoints.authorizationUrl) || isGitHubOAuthEndpoint(endpoints.tokenUrl);
  const isSlackOAuthFlow = isSlackOAuthEndpoint(endpoints.authorizationUrl) || isSlackOAuthEndpoint(endpoints.tokenUrl);
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
  });
  if (!isGitHubOAuthFlow && !isSlackOAuthFlow) {
    body.set('resource', endpoints.resource);
  }
  if (clientSecret) body.set('client_secret', clientSecret);

  const token = await postTokenRequest(endpoints.tokenUrl, body);
  const accessTokenEncrypted = getEncryptedOAuthValue(token.access_token);
  const refreshTokenEncrypted = getEncryptedOAuthValue(token.refresh_token || refreshToken);
  const nextExpiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null;

  await updateUserMcpServer({
    id: server.id,
    userId,
    values: {
      oauthAccessTokenEncrypted: accessTokenEncrypted,
      oauthRefreshTokenEncrypted: refreshTokenEncrypted,
      oauthAccessTokenExpiresAt: nextExpiresAt,
      oauthConnectedAt: new Date(),
      oauthError: null,
    },
  });

  const resolved = decryptOAuthValue(accessTokenEncrypted);
  if (!resolved) throw new Error('Failed to decode refreshed OAuth access token');
  return resolved;
}
