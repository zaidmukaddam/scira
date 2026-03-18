import { getCurrentUser } from '@/app/actions';
import { ChatSDKError } from '@/lib/errors';
import {
  deleteUserMcpServer,
  getUserMcpServerById,
  updateUserMcpServer,
} from '@/lib/db/queries';
import {
  getEncryptedMcpCredentials,
  getEncryptedOAuthValue,
  normalizeMcpScopes,
  validateMcpOAuthConfig,
  validateMcpServerUrl,
} from '@/lib/mcp/server-config';
import { z } from 'zod';

const optionalUrlField = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().url().optional(),
);

const updateMcpServerSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  transportType: z.enum(['http', 'sse']).optional(),
  url: z.string().trim().url().optional(),
  authType: z.enum(['none', 'bearer', 'header', 'oauth']).optional(),
  bearerToken: z.string().optional(),
  headerName: z.string().optional(),
  headerValue: z.string().optional(),
  oauthIssuerUrl: optionalUrlField,
  oauthAuthorizationUrl: optionalUrlField,
  oauthTokenUrl: optionalUrlField,
  oauthScopes: z.string().optional(),
  oauthClientId: z.string().optional(),
  oauthClientSecret: z.string().optional(),
  isEnabled: z.boolean().optional(),
  disabledTools: z.array(z.string()).optional(),
  clearOAuthTokens: z.boolean().optional(),
  clearCredentials: z.boolean().optional(),
});

function assertProUser(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) throw new ChatSDKError('unauthorized:auth', 'Authentication required');
  if (!user.isProUser) throw new ChatSDKError('upgrade_required:auth', 'Pro subscription required');
  return user;
}

function serializeMcpServer(server: {
  id: string;
  name: string;
  transportType: 'http' | 'sse';
  url: string;
  authType: 'none' | 'bearer' | 'header' | 'oauth';
  isEnabled: boolean;
  disabledTools?: string[] | null;
  lastTestedAt: Date | null;
  lastError: string | null;
  oauthConnectedAt: Date | null;
  oauthError: string | null;
  createdAt: Date;
  updatedAt: Date;
  encryptedCredentials: string | null;
  oauthClientId: string | null;
  oauthIssuerUrl: string | null;
  oauthAuthorizationUrl: string | null;
  oauthTokenUrl: string | null;
  oauthScopes: string | null;
  oauthAccessTokenEncrypted: string | null;
  oauthRefreshTokenEncrypted: string | null;
}) {
  return {
    id: server.id,
    name: server.name,
    transportType: server.transportType,
    url: server.url,
    authType: server.authType,
    isEnabled: server.isEnabled,
    disabledTools: server.disabledTools ?? [],
    hasCredentials: Boolean(server.encryptedCredentials),
    isOAuthConnected: Boolean(
      server.oauthAccessTokenEncrypted ||
      server.oauthRefreshTokenEncrypted ||
      server.oauthConnectedAt,
    ),
    oauthConfigured: server.authType === 'oauth',
    oauthIssuerUrl: server.oauthIssuerUrl,
    oauthAuthorizationUrl: server.oauthAuthorizationUrl,
    oauthTokenUrl: server.oauthTokenUrl,
    oauthScopes: server.oauthScopes,
    oauthClientId: server.oauthClientId,
    oauthError: server.oauthError,
    oauthConnectedAt: server.oauthConnectedAt,
    lastTestedAt: server.lastTestedAt,
    lastError: server.lastError,
    createdAt: server.createdAt,
    updatedAt: server.updatedAt,
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = assertProUser(await getCurrentUser());
    const { id } = await params;
    const existing = await getUserMcpServerById({ id, userId: user.id });
    if (!existing) return new ChatSDKError('not_found:api', 'MCP server not found').toResponse();

    const input = updateMcpServerSchema.parse(await request.json());
    if (input.url) validateMcpServerUrl(input.url);

    const nextAuthType = input.authType ?? existing.authType;
    validateMcpOAuthConfig({
      authType: nextAuthType,
      oauthIssuerUrl: input.oauthIssuerUrl ?? existing.oauthIssuerUrl ?? undefined,
      oauthAuthorizationUrl: input.oauthAuthorizationUrl ?? existing.oauthAuthorizationUrl ?? undefined,
      oauthTokenUrl: input.oauthTokenUrl ?? existing.oauthTokenUrl ?? undefined,
      oauthClientId: input.oauthClientId ?? existing.oauthClientId ?? undefined,
    });

    let encryptedCredentials = existing.encryptedCredentials;
    let oauthAccessTokenEncrypted = existing.oauthAccessTokenEncrypted;
    let oauthRefreshTokenEncrypted = existing.oauthRefreshTokenEncrypted;
    let oauthAccessTokenExpiresAt = existing.oauthAccessTokenExpiresAt;
    let oauthConnectedAt = existing.oauthConnectedAt;
    let oauthError = existing.oauthError;

    if (input.clearCredentials === true || nextAuthType === 'none' || nextAuthType === 'oauth') {
      encryptedCredentials = null;
    } else if (
      nextAuthType === 'bearer' && input.bearerToken
      || nextAuthType === 'header' && input.headerName && input.headerValue
    ) {
      encryptedCredentials = getEncryptedMcpCredentials({
        name: input.name ?? existing.name,
        transportType: input.transportType ?? existing.transportType,
        url: input.url ?? existing.url,
        authType: nextAuthType,
        bearerToken: input.bearerToken,
        headerName: input.headerName,
        headerValue: input.headerValue,
      });
    }

    if (nextAuthType !== 'oauth') {
      oauthAccessTokenEncrypted = null;
      oauthRefreshTokenEncrypted = null;
      oauthAccessTokenExpiresAt = null;
      oauthConnectedAt = null;
      oauthError = null;
    } else {
      if (input.clearOAuthTokens === true) {
        oauthAccessTokenEncrypted = null;
        oauthRefreshTokenEncrypted = null;
        oauthAccessTokenExpiresAt = null;
        oauthConnectedAt = null;
      }
      if (input.oauthClientSecret !== undefined) {
        // Empty string clears client secret.
        oauthError = null;
      }
    }

    const updated = await updateUserMcpServer({
      id,
      userId: user.id,
      values: {
        name: input.name,
        transportType: input.transportType,
        url: input.url,
        authType: input.authType,
        isEnabled: input.isEnabled,
        disabledTools: input.disabledTools,
        encryptedCredentials,
        oauthIssuerUrl: input.oauthIssuerUrl === undefined ? undefined : (input.oauthIssuerUrl.trim() || null),
        oauthAuthorizationUrl: input.oauthAuthorizationUrl === undefined ? undefined : (input.oauthAuthorizationUrl.trim() || null),
        oauthTokenUrl: input.oauthTokenUrl === undefined ? undefined : (input.oauthTokenUrl.trim() || null),
        oauthScopes: input.oauthScopes === undefined ? undefined : normalizeMcpScopes(input.oauthScopes),
        oauthClientId: input.oauthClientId === undefined ? undefined : (input.oauthClientId.trim() || null),
        oauthClientSecretEncrypted: input.oauthClientSecret === undefined ? undefined : getEncryptedOAuthValue(input.oauthClientSecret),
        oauthAccessTokenEncrypted,
        oauthRefreshTokenEncrypted,
        oauthAccessTokenExpiresAt,
        oauthConnectedAt,
        oauthError,
      },
    });

    if (!updated) return new ChatSDKError('not_found:api', 'MCP server not found').toResponse();
    return Response.json({ server: serializeMcpServer(updated) });
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return new ChatSDKError('bad_request:api', error.issues[0]?.message || 'Invalid request payload').toResponse();
    }
    if (error instanceof Error) {
      return new ChatSDKError('bad_request:api', error.message).toResponse();
    }
    console.error('Failed to update MCP server:', error);
    return new ChatSDKError('bad_request:api', 'Failed to update MCP server').toResponse();
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = assertProUser(await getCurrentUser());
    const { id } = await params;
    const deleted = await deleteUserMcpServer({ id, userId: user.id });
    if (!deleted) return new ChatSDKError('not_found:api', 'MCP server not found').toResponse();

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    console.error('Failed to delete MCP server:', error);
    return new ChatSDKError('bad_request:api', 'Failed to delete MCP server').toResponse();
  }
}
