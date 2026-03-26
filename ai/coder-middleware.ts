/**
 * Coder Model Middleware
 *
 * The `coder` model (scx-coder) may use one of two proprietary tool-call formats:
 *
 * Format A — bracket style:
 *   [TOOL_CALL]
 *   {tool => "code_interpreter", args => {
 *     --description "..."
 *     --code "..."
 *   }}
 *   [/TOOL_CALL]
 *
 * Format B — XML style (minimax):
 *   <minimax:tool_call>
 *   <invoke name="code_interpreter">
 *   <parameter name="code">...</parameter>
 *   </invoke>
 *   </minimax:tool_call>
 *
 * This middleware:
 *   1. Buffers the full stream
 *   2. Detects either tool-call format
 *   3. Parses the tool name, description, and code
 *   4. Executes the code in a Daytona sandbox via codeInterpreterTool
 *   5. Emits clean markdown: surrounding text + fenced code block + execution output
 *   6. If no tool call is found, emits the buffer after stripping any raw XML tool tags
 */

import type { LanguageModelMiddleware } from 'ai';
import { codeInterpreterTool } from '@/lib/tools/code-interpreter';

// Format A: [TOOL_CALL]...[/TOOL_CALL]
const BRACKET_TOOL_CALL_RE = /\[TOOL_CALL\]([\s\S]*?)\[\/TOOL_CALL\]/;

// Format B: <minimax:tool_call>...</minimax:tool_call>
const MINIMAX_TOOL_CALL_RE = /<minimax:tool_call>([\s\S]*?)<\/minimax:tool_call>/;

// Any leftover raw tool tags we never want rendered as HTML
const RAW_TAG_RE =
  /<\/?minimax:tool_call>|<\/?invoke[^>]*>|<\/?parameter[^>]*>|\[TOOL_CALL\]|\[\/TOOL_CALL\]/g;

interface CoderToolCall {
  tool: string;
  description: string;
  code: string;
  matchStart: number;
  matchEnd: number;
}

function parseCoderToolCall(text: string): CoderToolCall | null {
  // --- Format A: [TOOL_CALL]...[/TOOL_CALL] ---
  const bracketMatch = BRACKET_TOOL_CALL_RE.exec(text);
  if (bracketMatch) {
    const inner = bracketMatch[1];

    const toolMatch = inner.match(/\{tool => "([^"]+)"/);
    if (!toolMatch) return null;
    const tool = toolMatch[1];

    const descLine = inner.match(/--description\s+"((?:[^"\\]|\\.)*)"/);
    const rawDesc = descLine ? descLine[1] : '';
    let description = rawDesc;
    try {
      description = JSON.parse('"' + rawDesc + '"');
    } catch {
      // keep raw
    }

    const codeLineMatch = inner.match(/--code\s+"((?:[^"\\]|\\.)*)"/);
    if (!codeLineMatch) return null;

    let code: string;
    try {
      code = JSON.parse('"' + codeLineMatch[1] + '"');
    } catch {
      code = codeLineMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }

    return {
      tool,
      description,
      code,
      matchStart: bracketMatch.index!,
      matchEnd: bracketMatch.index! + bracketMatch[0].length,
    };
  }

  // --- Format B: <minimax:tool_call>...</minimax:tool_call> ---
  const mmMatch = MINIMAX_TOOL_CALL_RE.exec(text);
  if (mmMatch) {
    const inner = mmMatch[1];

    const invokeMatch = inner.match(/<invoke name="([^"]+)">/);
    const tool = invokeMatch ? invokeMatch[1] : 'code_interpreter';

    const codeParamMatch = inner.match(/<parameter name="code">([\s\S]*?)<\/parameter>/);
    if (!codeParamMatch) return null;
    const code = codeParamMatch[1].trim();

    const descParamMatch = inner.match(/<parameter name="description">([\s\S]*?)<\/parameter>/);
    const description = descParamMatch ? descParamMatch[1].trim() : '';

    return {
      tool,
      description,
      code,
      matchStart: mmMatch.index!,
      matchEnd: mmMatch.index! + mmMatch[0].length,
    };
  }

  return null;
}

/** Detects GUI-only code that cannot run in a headless sandbox. */
function isGuiCode(code: string): boolean {
  return /\bpygame\b|\btkinter\b|\bwxPython\b|\bPyQt\b|\bPySide\b|\bmatplotlib\.pyplot\b.*\bshow\(\)/.test(
    code,
  );
}

/**
 * Strip any raw tool-call XML/bracket tags from text so they are never
 * passed to the markdown renderer as literal HTML.
 */
function stripRawToolTags(text: string): string {
  return text.replace(RAW_TAG_RE, '');
}

/**
 * Sanitize Daytona execution output so that any HTML printed to stdout
 * (e.g., a game the model generated as HTML) never contains live scripts
 * or inline event handlers.  The content still displays in a fenced code
 * block, but it cannot hijack keyboard events or execute JS in the browser.
 */
function sanitizeCodeOutput(output: string): string {
  return output
    // Remove <script>…</script> blocks (multiline, case-insensitive)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<!-- script removed -->')
    // Remove inline event handler attributes  (onclick=, onkeydown=, …)
    .replace(/\s+on[a-z]{2,}\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
}

function buildResponse(
  before: string,
  after: string,
  description: string,
  code: string,
  output: string | null,
  error: string | null,
): string {
  const parts: string[] = [];

  const intro = before.trim() || description;
  if (intro) parts.push(intro);

  parts.push('```python\n' + code.trimEnd() + '\n```');

  if (output !== null) {
    if (output.trim()) {
      parts.push('**Output:**\n```\n' + output.trim() + '\n```');
    } else {
      parts.push('_No output produced._');
    }
  } else if (error) {
    const isDisplay =
      /No available video device|display|pygame\.error|xcb|cannot connect to X/.test(error);
    const isMissingModule = /No module named/.test(error);

    if (isDisplay) {
      parts.push(
        '> **Note:** This script requires a graphical display and cannot run in the server-side sandbox.\n' +
          '> Copy the code above and run it locally:\n' +
          '> ```bash\n> pip install pygame && python script.py\n> ```',
      );
    } else if (isMissingModule) {
      const mod = error.match(/No module named '([^']+)'/)?.[1] ?? 'the required package';
      parts.push(
        '> **Note:** The sandbox is missing `' +
          mod +
          '`. Run this locally after installing:\n' +
          '> ```bash\n> pip install ' +
          mod +
          ' && python script.py\n> ```',
      );
    } else {
      parts.push('**Execution error:**\n```\n' + error.trim() + '\n```');
    }
  }

  if (after.trim()) parts.push(after.trim());

  return parts.join('\n\n');
}

export const coderToolMiddleware: LanguageModelMiddleware = {
  specificationVersion: 'v3',

  wrapStream: async ({ doStream }) => {
    const { stream, ...rest } = await doStream();

    let textId: string | null = null;
    let textStartChunk: any = null;
    let buffer = '';

    const transformed = stream.pipeThrough(
      new TransformStream<any, any>({
        transform(chunk, controller) {
          if (chunk.type === 'text-start') {
            textId = chunk.id;
            textStartChunk = chunk;
            return;
          }
          if (chunk.type === 'text-end') {
            return;
          }
          if (chunk.type === 'text-delta') {
            buffer += chunk.delta ?? '';
            return;
          }
          controller.enqueue(chunk);
        },

        async flush(controller) {
          const toolCall = parseCoderToolCall(buffer);

          if (toolCall) {
            const before = buffer.slice(0, toolCall.matchStart);
            const after = buffer.slice(toolCall.matchEnd);

            let output: string | null = null;
            let errorMsg: string | null = null;

            if (isGuiCode(toolCall.code)) {
              errorMsg = 'No available video device (GUI application)';
            } else {
              try {
                const raw = await codeInterpreterTool.execute!(
                  { code: toolCall.code, title: toolCall.description || 'Code', icon: 'default' },
                  { toolCallId: 'coder-tool-0', messages: [] },
                );
                type ToolResult = { message: string; chart?: unknown };
                const result: ToolResult =
                  raw != null && Symbol.asyncIterator in (raw as object)
                    ? await (async () => {
                        let last: ToolResult = { message: '' };
                        for await (const chunk of raw as AsyncIterable<ToolResult>) last = chunk;
                        return last;
                      })()
                    : (raw as ToolResult);
                // Sanitize output so HTML printed to stdout never injects
                // live scripts or keyboard-hijacking event handlers into the browser.
                output = sanitizeCodeOutput(result.message);
              } catch (err) {
                errorMsg = err instanceof Error ? err.message : String(err);
              }
            }

            const responseText = buildResponse(
              before,
              after,
              toolCall.description,
              toolCall.code,
              output,
              errorMsg,
            );

            if (textId && textStartChunk) {
              controller.enqueue(textStartChunk);
              controller.enqueue({ type: 'text-delta', id: textId, delta: responseText });
              controller.enqueue({ type: 'text-end', id: textId });
            }
          } else if (buffer.trim()) {
            // No tool call found — strip any raw XML tool tags before emitting
            // so they are never rendered as literal HTML in the browser.
            const safe = stripRawToolTags(buffer);
            if (textId && textStartChunk) {
              controller.enqueue(textStartChunk);
              controller.enqueue({ type: 'text-delta', id: textId, delta: safe });
              controller.enqueue({ type: 'text-end', id: textId });
            }
          }
        },
      }),
    );

    return { stream: transformed, ...rest };
  },
};
