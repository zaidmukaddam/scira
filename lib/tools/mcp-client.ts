import 'server-only';

import { createMCPClient, ElicitationRequestSchema, type MCPClient } from '@ai-sdk/mcp';
import { getUserMcpServersByUserId } from '@/lib/db/queries';
import { resolveMcpAuthHeaders } from '@/lib/mcp/auth-headers';
import { validateMcpServerUrl } from '@/lib/mcp/server-config';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '@/lib/types';
import { randomUUID } from 'node:crypto';
import { all } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';
import { Redis } from '@upstash/redis';

const DEFAULT_MCP_SERVER_LIMIT = Number.MAX_SAFE_INTEGER;
const MCP_TOOL_LOAD_TIMEOUT_MS = 20000;
const ELICITATION_TIMEOUT_MS = 5 * 60 * 1000;

// Module-scope map of pending elicitation resolvers.
// Lives as long as the server process — works for both long-running and
// per-request (same process) serverless invocations.
type ElicitResult = { action: 'accept' | 'decline' | 'cancel'; content?: Record<string, unknown> };
export const pendingElicitations = new Map<string, (result: ElicitResult) => void>();
const redis = Redis.fromEnv();
const ELICITATION_RESPONSE_KEY_PREFIX = 'mcp:elicitation:response:';
const ELICITATION_PENDING_KEY_PREFIX = 'mcp:elicitation:pending:';

function getElicitationResponseKey(elicitationId: string) {
  return `${ELICITATION_RESPONSE_KEY_PREFIX}${elicitationId}`;
}

function getElicitationPendingKey(elicitationId: string) {
  return `${ELICITATION_PENDING_KEY_PREFIX}${elicitationId}`;
}

function getToolUiResourceUri(toolDef: any): string | null {
  const meta = toolDef?._meta;
  if (!meta || typeof meta !== 'object') return null;
  const candidates = [
    meta['ui/resourceUri'],
    meta['ui.resourceUri'],
    meta?.ui?.resourceUri,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.startsWith('ui://')) return value;
  }
  return null;
}

function withMcpAppBridgeMeta({
  result,
  appMeta,
}: {
  result: unknown;
  appMeta: {
    serverId: string;
    serverName: string;
    toolName: string;
    resourceUri: string;
  };
}) {
  if (!result || typeof result !== 'object') return result;
  const resultObj = result as Record<string, unknown>;
  const structuredContent =
    resultObj.structuredContent && typeof resultObj.structuredContent === 'object'
      ? { ...(resultObj.structuredContent as Record<string, unknown>) }
      : {};

  structuredContent.__scira_mcp_app = appMeta;

  return {
    ...resultObj,
    structuredContent,
  };
}

function toSafeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24) || 'server';
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function waitForElicitation(elicitationId: string): Promise<ElicitResult> {
  return new Promise<ElicitResult>((resolve) => {
    const responseKey = getElicitationResponseKey(elicitationId);
    const pendingKey = getElicitationPendingKey(elicitationId);
    let interval: ReturnType<typeof setInterval> | null = null;
    let settled = false;

    const settle = (result: ElicitResult) => {
      if (settled) return;
      settled = true;
      if (interval) clearInterval(interval);
      pendingElicitations.delete(elicitationId);
      resolve(result);
    };

    pendingElicitations.set(elicitationId, (result) => {
      settle(result);
    });

    // Mark as pending so responders can validate/diagnose lifecycle.
    void redis.set(pendingKey, '1', { ex: Math.ceil(ELICITATION_TIMEOUT_MS / 1000) + 60 });

    const pollRedis = async () => {
      try {
        const persisted = await redis.get<ElicitResult>(responseKey);
        if (!persisted || typeof persisted !== 'object') return;
        await redis.del(responseKey);
        settle(persisted);
      } catch {
        // Ignore transient Redis issues; in-process resolver may still complete.
      }
    };

    interval = setInterval(() => { void pollRedis(); }, 500);
    void pollRedis();
  });
}

export interface ResolvedMcpTools {
  tools: Record<string, unknown>;
  closeAll: () => Promise<void>;
  loadedServers: Array<{ id: string; name: string; toolCount: number }>;
  errors: Array<{ id: string; name: string; error: string }>;
}

export async function resolveUserMcpTools({
  userId,
  limit = DEFAULT_MCP_SERVER_LIMIT,
  dataStream,
}: {
  userId: string;
  limit?: number;
  dataStream?: UIMessageStreamWriter<ChatMessage>;
}): Promise<ResolvedMcpTools> {
  const enabledServers = await getUserMcpServersByUserId({ userId, enabledOnly: true });
  const selectedServers = enabledServers.slice(0, Math.max(1, limit));

  const clients: MCPClient[] = [];
  const tools: Record<string, unknown> = {};
  const loadedServers: Array<{ id: string; name: string; toolCount: number }> = [];
  const errors: Array<{ id: string; name: string; error: string }> = [];

  for (const server of selectedServers) {
    try {
      validateMcpServerUrl(server.url);

      const client = await createMCPClient({
        transport: {
          type: server.transportType,
          url: server.url,
          headers: await resolveMcpAuthHeaders({
            server,
            userId,
          }),
        },
        capabilities: {
          elicitation: {},
        },
      });

      // Register elicitation handler if a dataStream is provided.
      if (dataStream) {
        const serverName = server.name;
        client.onElicitationRequest(ElicitationRequestSchema, async (request) => {
          const elicitationId = randomUUID();
          const params = request.params as {
            message: string;
            requestedSchema?: unknown;
            mode?: string;
            url?: string;
          };

          const isUrlMode = params.mode === 'url' && Boolean(params.url);

          dataStream.write({
            type: 'data-mcp_elicitation',
            data: {
              elicitationId,
              serverName,
              message: params.message,
              mode: isUrlMode ? 'url' : 'form',
              requestedSchema: isUrlMode ? undefined : params.requestedSchema,
              url: isUrlMode ? params.url : undefined,
            },
          });

          let result: ElicitResult;
          try {
            result = await withTimeout(
              waitForElicitation(elicitationId),
              ELICITATION_TIMEOUT_MS,
              'Elicitation timed out',
            );
          } catch {
            result = { action: 'cancel' };
          } finally {
            pendingElicitations.delete(elicitationId);
            const responseKey = getElicitationResponseKey(elicitationId);
            const pendingKey = getElicitationPendingKey(elicitationId);
            void redis.del(responseKey, pendingKey);
            dataStream.write({
              type: 'data-mcp_elicitation_done',
              data: { elicitationId },
            });
          }

          return result;
        });
      }

      clients.push(client);
      const serverTools = await withTimeout(
        client.tools(),
        MCP_TOOL_LOAD_TIMEOUT_MS,
        `MCP tool loading timed out after ${MCP_TOOL_LOAD_TIMEOUT_MS}ms`,
      );

      const slug = toSafeSlug(server.name);
      let serverToolCount = 0;

      const disabledForServer: string[] = Array.isArray(server.disabledTools) ? (server.disabledTools as string[]) : [];

      for (const [toolName, toolDef] of Object.entries(serverTools)) {
        // Skip tools the user has disabled for this server
        if (disabledForServer.includes(toolName)) continue;
        const baseName = `mcp_${slug}_${toolName}`;
        let uniqueName = baseName;
        let counter = 2;
        while (tools[uniqueName]) {
          uniqueName = `${baseName}_${counter}`;
          counter += 1;
        }
        const uiResourceUri = getToolUiResourceUri(toolDef);
        if (uiResourceUri && typeof (toolDef as any)?.execute === 'function') {
          const originalExecute = (toolDef as any).execute.bind(toolDef);
          tools[uniqueName] = {
            ...(toolDef as any),
            _meta: {
              ...((toolDef as any)._meta ?? {}),
              __scira_mcp_app: {
                serverId: server.id,
                serverName: server.name,
                toolName,
                resourceUri: uiResourceUri,
              },
            },
            execute: async (...args: any[]) => {
              const result = await originalExecute(...args);
              return withMcpAppBridgeMeta({
                result,
                appMeta: {
                  serverId: server.id,
                  serverName: server.name,
                  toolName,
                  resourceUri: uiResourceUri,
                },
              });
            },
          };
        } else {
          tools[uniqueName] = toolDef;
        }
        serverToolCount += 1;
      }

      loadedServers.push({
        id: server.id,
        name: server.name,
        toolCount: serverToolCount,
      });
    } catch (error) {
      errors.push({
        id: server.id,
        name: server.name,
        error: error instanceof Error ? error.message : 'Unknown MCP connection error',
      });
    }
  }

  async function closeAll() {
    await all(
      Object.fromEntries(clients.map((client, i) => [`client:${i}`, async () => {
        try { await client.close(); } catch { /* ignore close errors */ }
      }])),
      getBetterAllOptions(),
    );
  }

  return {
    tools,
    closeAll,
    loadedServers,
    errors,
  };
}
