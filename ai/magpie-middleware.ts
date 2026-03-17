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

const PROTOCOL_RE = /<\|[^|]*\|>/g;
const CALL_TOKEN = '<|call|>';

export const magpieProtocolMiddleware: LanguageModelMiddleware = {
  specificationVersion: 'v3',

  wrapStream: async ({ doStream }) => {
    const { stream, ...rest } = await doStream();

    let latestTextId: string | null = null;
    let latestTextStartChunk: any = null;
    let buffer = '';

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
            // Buffer instead of emitting; we need the full text to parse the protocol
            buffer += chunk.delta ?? '';
            return;
          }

          // All other parts (reasoning, tool calls, metadata, finish, etc.) pass through
          controller.enqueue(chunk);
        },

        flush(controller) {
          if (!latestTextId || !latestTextStartChunk) return;

          let answer: string;

          // Find the LAST occurrence of the call token
          const lastCallIdx = buffer.lastIndexOf(CALL_TOKEN);
          if (lastCallIdx !== -1) {
            // Everything after the last <|call|> is the answer
            answer = buffer.slice(lastCallIdx + CALL_TOKEN.length);
          } else {
            // No protocol tokens — direct answer
            answer = buffer;
          }

          // Strip any remaining protocol tokens (e.g. <|im_end|>) and trim
          const cleaned = answer.replace(PROTOCOL_RE, '').trim();

          if (cleaned) {
            controller.enqueue(latestTextStartChunk);
            controller.enqueue({ type: 'text-delta', id: latestTextId, delta: cleaned });
            controller.enqueue({ type: 'text-end', id: latestTextId });
          }
        },
      }),
    );

    return { stream: transformed, ...rest };
  },
};
