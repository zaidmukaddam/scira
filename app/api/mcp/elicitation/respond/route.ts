import { getCurrentUser } from '@/app/actions';
import { ChatSDKError } from '@/lib/errors';
import { pendingElicitations } from '@/lib/tools/mcp-client';
import { z } from 'zod';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();
const ELICITATION_RESPONSE_KEY_PREFIX = 'mcp:elicitation:response:';
const ELICITATION_PENDING_KEY_PREFIX = 'mcp:elicitation:pending:';

function getElicitationResponseKey(elicitationId: string) {
  return `${ELICITATION_RESPONSE_KEY_PREFIX}${elicitationId}`;
}

function getElicitationPendingKey(elicitationId: string) {
  return `${ELICITATION_PENDING_KEY_PREFIX}${elicitationId}`;
}

const respondSchema = z.object({
  elicitationId: z.string().min(1),
  action: z.enum(['accept', 'decline', 'cancel']),
  content: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return new ChatSDKError('unauthorized:auth').toResponse();

    const input = respondSchema.parse(await request.json());
    const resolver = pendingElicitations.get(input.elicitationId);
    const responsePayload = {
      action: input.action,
      content: input.content,
    };

    // Always persist response so waiting callback can pick it up cross-instance.
    await redis.set(
      getElicitationResponseKey(input.elicitationId),
      responsePayload,
      { ex: 10 * 60 },
    );

    if (resolver) {
      resolver(responsePayload);
      return Response.json({ ok: true });
    }

    const stillPending = await redis.exists(getElicitationPendingKey(input.elicitationId));
    if (stillPending) return Response.json({ ok: true, accepted: true });
    return Response.json({ ok: false, error: 'Elicitation not found or already resolved' }, { status: 404 });
  } catch (error) {
    if (error instanceof ChatSDKError) return error.toResponse();
    if (error instanceof z.ZodError) {
      return new ChatSDKError('bad_request:api').toResponse();
    }
    return new ChatSDKError('bad_request:api').toResponse();
  }
}
