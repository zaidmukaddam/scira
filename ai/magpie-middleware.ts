/**
 * Magpie Protocol Middleware
 *
 * The magpie model prepends a tool-call preamble before its actual answer:
 *
 *   {JSON}<|call|>We need to see the tool output.<|call|><|call|><|call|>## Answer
 *   {JSON}<|call|>## Answer          (single separator variant)
 *   ## Direct answer                  (no preamble, direct response)
 *
 * The number of <|call|> tokens is variable. The answer is always the content
 * that follows the LAST <|call|> token in the response.
 *
 * Strategy: buffer ALL text-delta chunks (no incremental emit), then in flush:
 *   1. Find the LAST <|call|> token in the buffer
 *   2. Emit everything after it (stripped of any remaining protocol tokens)
 *   3. If no <|call|> tokens present, emit everything cleaned (direct answer)
 *
 * Non-text parts (tool invocations, metadata, etc.) pass through immediately.
 *
 * Trade-off: text appears all at once rather than streaming. This is acceptable
 * because the preamble makes incremental emit impossible without seeing the full
 * output first.
 */

import type { LanguageModelMiddleware } from 'ai';
import { extractThinkingTags } from '@/ai/thinking-tags';

const PROTOCOL_RE = /<\|[^|]*\|>/g;
const CALL_TOKEN = '<|call|>';

let reasoningSeq = 0;

/**
 * Emit any <thinking>…</thinking> blocks found in `preamble` as reasoning-* stream
 * parts, then emit the cleaned answer text as text-* parts.
 */
function emitParsedBuffer(
  controller: TransformStreamDefaultController | ReadableStreamDefaultController,
  preamble: string,
  answer: string,
  textId: string,
  textStartChunk: unknown,
): void {
  // Extract reasoning blocks from the preamble that was discarded after <|call|>.
  const { parts: preambleParts } = extractThinkingTags(preamble);
  for (const p of preambleParts) {
    if (p.type === 'reasoning' && p.content) {
      const rid = `magpie-reasoning-${reasoningSeq++}`;
      controller.enqueue({ type: 'reasoning-start', id: rid });
      controller.enqueue({ type: 'reasoning-delta', id: rid, delta: p.content });
      controller.enqueue({ type: 'reasoning-end', id: rid });
    }
    // Non-reasoning parts in the preamble are protocol noise — discard.
  }

  // Also check the answer itself for any remaining <thinking> blocks (edge case).
  const { parts: answerParts } = extractThinkingTags(answer);
  let hasText = false;
  for (const p of answerParts) {
    if (p.type === 'reasoning' && p.content) {
      const rid = `magpie-reasoning-${reasoningSeq++}`;
      controller.enqueue({ type: 'reasoning-start', id: rid });
      controller.enqueue({ type: 'reasoning-delta', id: rid, delta: p.content });
      controller.enqueue({ type: 'reasoning-end', id: rid });
    } else if (p.type === 'text' && p.content) {
      if (!hasText) {
        controller.enqueue(textStartChunk);
        hasText = true;
      }
      controller.enqueue({ type: 'text-delta', id: textId, delta: p.content });
    }
  }
  if (hasText) {
    controller.enqueue({ type: 'text-end', id: textId });
  }
}

export const magpieProtocolMiddleware: LanguageModelMiddleware = {
  specificationVersion: 'v3',

  wrapStream: async ({ doStream }) => {
    const { stream, ...rest } = await doStream();

    let latestTextId: string | null = null;
    let latestTextStartChunk: any = null;
    let buffer = '';

    const logMiddleware = process.env.LOG_MAGPIE_MIDDLEWARE === '1';

    const emitBuffer = (controller: TransformStreamDefaultController) => {
      if (!latestTextId || !latestTextStartChunk || !buffer) return;

      if (logMiddleware) {
        console.log('[MAGPiE middleware] full buffer:\n', JSON.stringify(buffer));
      }

      const lastCallIdx = buffer.lastIndexOf(CALL_TOKEN);
      let preamble: string;
      let answer: string;
      if (lastCallIdx !== -1) {
        preamble = buffer.slice(0, lastCallIdx).replace(PROTOCOL_RE, '');
        answer = buffer.slice(lastCallIdx + CALL_TOKEN.length).replace(PROTOCOL_RE, '').trim();
      } else {
        preamble = '';
        answer = buffer.replace(PROTOCOL_RE, '').trim();
      }

      if (logMiddleware) {
        console.log('[MAGPiE middleware] preamble:\n', JSON.stringify(preamble));
        console.log('[MAGPiE middleware] answer:\n', JSON.stringify(answer));
      }

      emitParsedBuffer(controller, preamble, answer, latestTextId, latestTextStartChunk);
    };

    const transformed = stream.pipeThrough(
      new TransformStream({
        transform(chunk: any, controller) {
          if (chunk.type === 'text-start') {
            // Store it; emit only when we're ready to emit the answer in flush
            latestTextId = chunk.id;
            latestTextStartChunk = chunk;
            return;
          }

          if (chunk.type === 'text-end') {
            // Suppress until flush emits it after the answer delta
            return;
          }

          if (chunk.type === 'text-delta') {
            // Upstream middleware may emit text-delta without a preceding text-start (e.g. Harmony
            // flush fallback). Without ids, emitBuffer would no-op and the user sees a blank reply.
            if (!latestTextId) {
              const id = chunk.id ?? 'magpie-text';
              latestTextId = id;
              latestTextStartChunk = { type: 'text-start', id };
            }
            buffer += chunk.delta ?? '';
            return;
          }

          // All other parts (reasoning, tool calls, metadata, finish, etc.) pass through
          controller.enqueue(chunk);
        },

        flush(controller) {
          // Normal completion: emit whatever we buffered
          emitBuffer(controller);
        },
      }),
    );

    // If the upstream stream errors (network drop, server crash), pipeThrough will
    // reject the readable side. Catch that and emit any buffered text so the user
    // sees a partial response rather than a blank bubble.
    const safeTransformed = new ReadableStream({
      start(controller) {
        const reader = transformed.getReader();
        const pump = () =>
          reader.read().then(
            ({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              controller.enqueue(value);
              pump();
            },
            (err) => {
              // Stream errored — emit whatever we buffered (including any reasoning) before closing
              if (latestTextId && latestTextStartChunk && buffer) {
                const lastCallIdx = buffer.lastIndexOf(CALL_TOKEN);
                let preamble: string;
                let answer: string;
                if (lastCallIdx !== -1) {
                  preamble = buffer.slice(0, lastCallIdx).replace(PROTOCOL_RE, '');
                  answer = buffer.slice(lastCallIdx + CALL_TOKEN.length).replace(PROTOCOL_RE, '').trim();
                } else {
                  preamble = '';
                  answer = buffer.replace(PROTOCOL_RE, '').trim();
                }
                emitParsedBuffer(controller, preamble, answer, latestTextId, latestTextStartChunk);
              }
              controller.error(err);
            },
          );
        pump();
      },
    });

    return { stream: safeTransformed, ...rest };
  },
};
