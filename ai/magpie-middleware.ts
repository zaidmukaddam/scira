/**
 * Magpie Protocol Middleware
 *
 * The magpie-small model streams content using a custom channel protocol
 * instead of standard <think>...</think> tags:
 *
 *   <|channel|>analysis<|message|>  ...thinking...  <|end|>
 *   <|start|>assistant<|channel|>commentary...<|call|>   ← internal call (skipped)
 *   <|start|>assistant<|channel|>final<|message|>  ...response text...
 *
 * This middleware intercepts the raw text stream and:
 *  - Emits "analysis" channel content as `reasoning-*` parts  → shown in the thinking indicator
 *  - Emits "final" channel content as `text-delta` parts      → shown as the chat response
 *  - Discards everything else (commentary, protocol tokens)
 *
 * IMPORTANT: Uses AI SDK v3 stream part types:
 *  - text-delta uses `delta` field (not `textDelta`)
 *  - reasoning uses reasoning-start / reasoning-delta / reasoning-end events
 */

import type { LanguageModelMiddleware } from 'ai';

const ANALYSIS_START = '<|channel|>analysis<|message|>';
const FINAL_START = '<|channel|>final<|message|>';
const END_TOKEN = '<|end|>';
const START_TOKEN = '<|start|>';

// All tokens that begin or delimit a protocol section — used to detect
// partial tokens at stream chunk boundaries so we never split one across chunks.
const PROTOCOL_TOKENS = [
  '<|channel|>analysis<|message|>',
  '<|channel|>final<|message|>',
  '<|channel|>',
  '<|message|>',
  '<|end|>',
  '<|start|>',
  '<|call|>',
  '<|constrain|>',
];

const MAX_TOKEN_LEN = Math.max(...PROTOCOL_TOKENS.map((t) => t.length));

/**
 * Returns how many leading bytes of `buffer` are safe to emit immediately —
 * none of the buffer's suffixes could be the start of a protocol token
 * that hasn't fully arrived yet.
 */
function safeEmitLength(buffer: string): number {
  const checkLen = Math.min(buffer.length, MAX_TOKEN_LEN);
  for (let i = checkLen; i >= 1; i--) {
    const tail = buffer.slice(buffer.length - i);
    if (PROTOCOL_TOKENS.some((tok) => tok.startsWith(tail))) {
      return buffer.length - i;
    }
  }
  return buffer.length;
}

type Channel = 'seeking' | 'analysis' | 'final' | 'skip';

export const magpieProtocolMiddleware: LanguageModelMiddleware = {
  specificationVersion: 'v3',

  wrapStream: async ({ doStream }) => {
    const { stream, ...rest } = await doStream();

    let buffer = '';
    let channel: Channel = 'seeking';

    // Track IDs needed for the AI SDK v3 stream part format
    let textId: string | null = null;
    let delayedTextStart: { type: 'text-start'; id: string; [key: string]: unknown } | null = null;
    let reasoningId = 0;
    let reasoningOpen = false;

    const transformed = stream.pipeThrough(
      new TransformStream({
        transform(chunk: any, controller) {
          // Delay text-start until we know we have final-section content to emit
          if (chunk.type === 'text-start') {
            textId = chunk.id;
            delayedTextStart = chunk;
            return;
          }

          // Pass text-end through once text-start has been flushed
          if (chunk.type === 'text-end') {
            if (!delayedTextStart) {
              // text-start was already emitted — pass text-end normally
              controller.enqueue(chunk);
            }
            // If delayedTextStart is still held, we never emitted text at all;
            // discard text-end too (no text block was opened).
            delayedTextStart = null;
            return;
          }

          // Only intercept text-delta — all other chunk types pass through unchanged
          if (chunk.type !== 'text-delta') {
            controller.enqueue(chunk);
            return;
          }

          // chunk.delta (v3 SDK) carries the raw protocol text
          buffer += (chunk.delta as string);

          let advanced = true;
          while (advanced) {
            advanced = false;

            if (channel === 'seeking' || channel === 'skip') {
              const analysisIdx = buffer.indexOf(ANALYSIS_START);
              const finalIdx = buffer.indexOf(FINAL_START);

              if (analysisIdx !== -1 && (finalIdx === -1 || analysisIdx < finalIdx)) {
                buffer = buffer.slice(analysisIdx + ANALYSIS_START.length);
                channel = 'analysis';
                advanced = true;
              } else if (finalIdx !== -1) {
                buffer = buffer.slice(finalIdx + FINAL_START.length);
                channel = 'final';
                advanced = true;
              }

            } else if (channel === 'analysis') {
              const endIdx = buffer.indexOf(END_TOKEN);
              if (endIdx !== -1) {
                const content = buffer.slice(0, endIdx);
                if (content) {
                  if (!reasoningOpen) {
                    controller.enqueue({ type: 'reasoning-start', id: `mag-r-${reasoningId}` });
                    reasoningOpen = true;
                  }
                  controller.enqueue({ type: 'reasoning-delta', id: `mag-r-${reasoningId}`, delta: content });
                }
                if (reasoningOpen) {
                  controller.enqueue({ type: 'reasoning-end', id: `mag-r-${reasoningId}` });
                  reasoningId++;
                  reasoningOpen = false;
                }
                buffer = buffer.slice(endIdx + END_TOKEN.length);
                channel = 'skip';
                advanced = true;
              } else {
                const safe = safeEmitLength(buffer);
                if (safe > 0) {
                  const content = buffer.slice(0, safe);
                  if (!reasoningOpen) {
                    controller.enqueue({ type: 'reasoning-start', id: `mag-r-${reasoningId}` });
                    reasoningOpen = true;
                  }
                  controller.enqueue({ type: 'reasoning-delta', id: `mag-r-${reasoningId}`, delta: content });
                  buffer = buffer.slice(safe);
                }
              }

            } else if (channel === 'final') {
              // Close any open reasoning block before emitting text
              if (reasoningOpen) {
                controller.enqueue({ type: 'reasoning-end', id: `mag-r-${reasoningId}` });
                reasoningId++;
                reasoningOpen = false;
              }

              const startIdx = buffer.indexOf(START_TOKEN);
              if (startIdx !== -1) {
                const content = buffer.slice(0, startIdx);
                if (content && textId) {
                  if (delayedTextStart) {
                    controller.enqueue(delayedTextStart);
                    delayedTextStart = null;
                  }
                  controller.enqueue({ type: 'text-delta', id: textId, delta: content });
                }
                buffer = buffer.slice(startIdx + START_TOKEN.length);
                channel = 'seeking';
                advanced = true;
              } else {
                const safe = safeEmitLength(buffer);
                if (safe > 0 && textId) {
                  if (delayedTextStart) {
                    controller.enqueue(delayedTextStart);
                    delayedTextStart = null;
                  }
                  controller.enqueue({ type: 'text-delta', id: textId, delta: buffer.slice(0, safe) });
                  buffer = buffer.slice(safe);
                }
              }
            }
          }
        },

        flush(controller) {
          if (!buffer) return;

          if (channel === 'analysis') {
            if (!reasoningOpen) {
              controller.enqueue({ type: 'reasoning-start', id: `mag-r-${reasoningId}` });
            }
            controller.enqueue({ type: 'reasoning-delta', id: `mag-r-${reasoningId}`, delta: buffer });
            controller.enqueue({ type: 'reasoning-end', id: `mag-r-${reasoningId}` });
          } else if (channel === 'final' && textId) {
            if (reasoningOpen) {
              controller.enqueue({ type: 'reasoning-end', id: `mag-r-${reasoningId}` });
            }
            if (delayedTextStart) {
              controller.enqueue(delayedTextStart);
            }
            controller.enqueue({ type: 'text-delta', id: textId, delta: buffer });
          }
        },
      }),
    );

    return { stream: transformed, ...rest };
  },
};
