/**
 * Magpie Protocol Middleware
 *
 * The magpie model streams responses using a <|call|>-delimited protocol:
 *
 *   {JSON tool args}<|call|>We need to see the tool output.<|call|><|call|><|call|>## Actual answer...
 *
 * Segments are delimited by <|call|> tokens. The FINAL answer is everything
 * after the last run of 2+ consecutive <|call|> tokens.
 *
 * This middleware:
 *  1. Buffers all content during the preamble phase
 *  2. Detects when 2+ consecutive <|call|> tokens appear (marks start of answer)
 *  3. Emits only the answer content as text-delta parts
 *  4. Falls back to emitting everything if no protocol tokens appear (direct responses)
 */

import type { LanguageModelMiddleware } from 'ai';

const CALL_TOKEN = '<|call|>';
const CALL_LEN = CALL_TOKEN.length;

// Regex to strip any remaining protocol tokens from answer content
const PROTOCOL_RE = /<\|[^|]*\|>/g;

export const magpieProtocolMiddleware: LanguageModelMiddleware = {
  specificationVersion: 'v3',

  wrapStream: async ({ doStream }) => {
    const { stream, ...rest } = await doStream();

    let textId: string | null = null;
    let delayedTextStart: { type: 'text-start'; id: string; [key: string]: unknown } | null = null;

    // Buffer all incoming text during the preamble phase.
    // Once we detect 2+ consecutive <|call|> tokens we transition to 'answer' and
    // start streaming the content that follows them.
    // If we never detect the pattern (direct response), we emit the whole buffer on flush.
    let phase: 'preamble' | 'answer' = 'preamble';
    let preambleBuffer = '';

    /**
     * Scan preambleBuffer for a run of 2+ consecutive <|call|> tokens.
     * If found, extract the content after the run as the answer start,
     * transition to answer phase, and emit what we have.
     */
    function detectAndTransition(controller: TransformStreamDefaultController): void {
      let searchFrom = 0;
      let runStart = -1;
      let runCount = 0;

      while (true) {
        const idx = preambleBuffer.indexOf(CALL_TOKEN, searchFrom);
        if (idx === -1) break;

        // Is this call token immediately adjacent to the previous one?
        if (runStart !== -1 && idx === runStart + CALL_LEN * runCount) {
          runCount++;
        } else {
          // New run
          runStart = idx;
          runCount = 1;
        }

        if (runCount >= 2) {
          // Found a consecutive run — find where this run ends
          let runEnd = idx + CALL_LEN;
          while (preambleBuffer.startsWith(CALL_TOKEN, runEnd)) {
            runEnd += CALL_LEN;
          }

          // Everything after the run is the start of the answer
          const answerStart = preambleBuffer.slice(runEnd);
          preambleBuffer = '';
          phase = 'answer';

          if (answerStart && textId) {
            if (delayedTextStart) {
              controller.enqueue(delayedTextStart);
              delayedTextStart = null;
            }
            controller.enqueue({ type: 'text-delta', id: textId, delta: answerStart });
          }
          return;
        }

        searchFrom = idx + CALL_LEN;
      }
    }

    function emitText(
      controller: TransformStreamDefaultController,
      text: string,
    ): void {
      if (!text || !textId) return;
      const cleaned = text.replace(PROTOCOL_RE, '');
      if (!cleaned) return;
      if (delayedTextStart) {
        controller.enqueue(delayedTextStart);
        delayedTextStart = null;
      }
      controller.enqueue({ type: 'text-delta', id: textId, delta: cleaned });
    }

    const transformed = stream.pipeThrough(
      new TransformStream({
        transform(chunk: any, controller) {
          // Hold text-start until we have real content to emit
          if (chunk.type === 'text-start') {
            textId = chunk.id;
            delayedTextStart = chunk;
            return;
          }

          // Only pass text-end through if we already flushed text-start
          if (chunk.type === 'text-end') {
            if (!delayedTextStart) {
              controller.enqueue(chunk);
            }
            delayedTextStart = null;
            return;
          }

          // All non-text-delta chunks (usage, finish, etc.) pass through unchanged
          if (chunk.type !== 'text-delta') {
            controller.enqueue(chunk);
            return;
          }

          const delta = chunk.delta as string;

          if (phase === 'preamble') {
            preambleBuffer += delta;
            detectAndTransition(controller);
          } else {
            // Already in answer phase — stream directly
            emitText(controller, delta);
          }
        },

        flush(controller) {
          if (phase === 'preamble' && preambleBuffer) {
            // Stream ended without detecting the protocol — this is a direct response.
            // Emit everything, stripping any stray protocol tokens.
            const cleaned = preambleBuffer.replace(PROTOCOL_RE, '').trim();
            if (cleaned && textId) {
              if (delayedTextStart) {
                controller.enqueue(delayedTextStart);
              }
              controller.enqueue({ type: 'text-delta', id: textId, delta: cleaned });
            }
          }
          // In 'answer' phase there's no pending buffer — we emit chunks immediately.
        },
      }),
    );

    return { stream: transformed, ...rest };
  },
};
