/**
 * Coder Model Middleware
 *
 * Intercepts the scx-coder model's proprietary tool-call text formats:
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
 * Format C — bare style (no outer brackets):
 *   {tool => "code_interpreter", args => {
 *     --language "python"
 *     --code "..."
 *   }}
 *
 * Execution strategy:
 *   - HTML / JS / CSS → rendered via srcdoc iframe in the preview panel
 *     (no Daytona needed — fully in-browser, sandboxed)
 *   - Python (no GUI) → executed in Daytona sandbox, stdout shown inline
 *   - Python (GUI, e.g. Pygame) → not executed; user is told to convert to HTML5
 *
 * The preview panel auto-opens because PreviewUrlBlock dispatches
 * the `scx-open-preview` CustomEvent on mount.
 */

import type { LanguageModelMiddleware } from 'ai';
import { getCurrentChatId } from '@/lib/sandbox-context';
import {
  getOrCreateSandbox,
  executeInSandbox,
  runCommandInSandbox,
  uploadFileToSandbox,
  runServerBackground,
  waitForPort,
  readSandboxLog,
  getPreviewUrl,
} from '@/lib/sandbox-manager';

// ─── Tool-call format detection ───────────────────────────────────────────────

const BRACKET_TOOL_CALL_RE = /\[TOOL_CALL\]([\s\S]*?)\[\/TOOL_CALL\]/;
const MINIMAX_TOOL_CALL_RE = /<minimax:tool_call>([\s\S]*?)<\/minimax:tool_call>/;
const BARE_TOOL_CALL_START_RE = /\{tool\s*=>\s*"code_interpreter"/;
const RAW_TAG_RE =
  /<\/?minimax:tool_call>|<\/?invoke[^>]*>|<\/?parameter[^>]*>|\[TOOL_CALL\]|\[\/TOOL_CALL\]/g;

interface CoderToolCall {
  tool: string;
  description: string;
  code: string;
  matchStart: number;
  matchEnd: number;
}

// ─── Parsing helpers ──────────────────────────────────────────────────────────

function decodeCodeString(raw: string): string {
  try {
    return JSON.parse('"' + raw + '"');
  } catch {
    return raw
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
}

function parseArgsBlock(inner: string): { tool: string; description: string; code: string } | null {
  const toolMatch = inner.match(/\{?\s*tool\s*=>\s*"([^"]+)"/);
  const tool = toolMatch ? toolMatch[1] : 'code_interpreter';

  const descLine = inner.match(/--description\s+"((?:[^"\\]|\\.)*)"/);
  const description = descLine ? decodeCodeString(descLine[1]) : '';

  const codeLineMatch = inner.match(/--code\s+"((?:[^"\\]|\\.)*)"/);
  if (!codeLineMatch) return null;
  const code = decodeCodeString(codeLineMatch[1]);

  return { tool, description, code };
}

function parseCoderToolCall(text: string): CoderToolCall | null {
  // Format A — [TOOL_CALL]...[/TOOL_CALL]
  const bracketMatch = BRACKET_TOOL_CALL_RE.exec(text);
  if (bracketMatch) {
    const parsed = parseArgsBlock(bracketMatch[1]);
    if (!parsed) return null;
    return {
      ...parsed,
      matchStart: bracketMatch.index!,
      matchEnd: bracketMatch.index! + bracketMatch[0].length,
    };
  }

  // Format B — <minimax:tool_call>...</minimax:tool_call>
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

    return { tool, description, code, matchStart: mmMatch.index!, matchEnd: mmMatch.index! + mmMatch[0].length };
  }

  // Format C — bare {tool => "code_interpreter", args => { --code "..." }}
  const bareIdx = text.search(BARE_TOOL_CALL_START_RE);
  if (bareIdx >= 0) {
    const fromBare = text.slice(bareIdx);

    // Find the start of the --code argument value
    const codeArgMatch = fromBare.match(/--code\s+"/);
    if (!codeArgMatch || codeArgMatch.index === undefined) return null;

    const codeValueStart = codeArgMatch.index + codeArgMatch[0].length;
    let rawCode = fromBare.slice(codeValueStart);

    // The code ends just before the closing `"}}` syntax.
    // HTML/JS will contain unescaped `"` chars, so we can't use a quote-terminated
    // regex — instead strip the closing bare-format syntax from the end.
    rawCode = rawCode.replace(/"\s*\}\s*\}\s*$/, '').replace(/\s*\}\s*\}\s*$/, '');

    // Decode escape sequences (but don't JSON.parse — that breaks on unescaped quotes in HTML)
    const code = rawCode
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');

    // Also try to grab description (it comes before --code and is short, so safe with regex)
    const descMatch = fromBare.match(/--description\s+"((?:[^"\\]|\\.)*)"/);
    const description = descMatch ? decodeCodeString(descMatch[1]) : '';

    return { tool: 'code_interpreter', description, code, matchStart: bareIdx, matchEnd: text.length };
  }

  return null;
}

// ─── Code type detection ──────────────────────────────────────────────────────

type CodeType = 'html' | 'node' | 'static-web' | 'python';

/**
 * Extract HTML content embedded in Python as triple-quoted strings.
 * e.g. html_content = '''<!DOCTYPE html>...'''
 */
function extractHtmlFromPython(code: string): string | null {
  const m =
    code.match(/(?:html_content|html|page|content)\s*=\s*'''([\s\S]*?)'''/i) ||
    code.match(/(?:html_content|html|page|content)\s*=\s*"""([\s\S]*?)"""/i);
  if (m && /<html[\s>]|<!doctype\s+html/i.test(m[1])) return m[1].trim();
  return null;
}

function detectCodeType(code: string): CodeType {
  if (/<html[\s>]|<!doctype\s+html/i.test(code)) return 'html';
  if (/import\s+React|from\s+['"]react['"]|"react"\s*:/.test(code)) return 'node';
  if (/\bdef\s+\w+|^import\s+\w|^from\s+\w+\s+import|print\s*\(/m.test(code)) {
    if (extractHtmlFromPython(code) !== null) return 'html';
    return 'python';
  }
  if (/<[a-z][^>]*>/i.test(code) && /[<>]/.test(code)) return 'static-web';
  return 'python';
}

function isGuiCode(code: string): boolean {
  return /\bpygame\b|\btkinter\b|\bwxPython\b|\bPyQt\b|\bPySide\b|\bmatplotlib\.pyplot\b.*\bshow\(\)/.test(code);
}

/**
 * Detect whether Python code starts a long-running server (Flask, FastAPI,
 * http.server, aiohttp, uvicorn, etc.) and extract the port it will listen on.
 *
 * Returns null if the code is not server code.
 */
function detectServerPort(code: string): number | null {
  // Flask / FastAPI / aiohttp app.run(port=NNNN)
  const flaskPortMatch = code.match(/\.run\s*\([^)]*port\s*=\s*(\d{2,5})/);
  if (flaskPortMatch) return parseInt(flaskPortMatch[1], 10);

  // uvicorn.run("app:app", port=NNNN)
  const uvicornPortMatch = code.match(/uvicorn\.run\s*\([^)]*port\s*=\s*(\d{2,5})/);
  if (uvicornPortMatch) return parseInt(uvicornPortMatch[1], 10);

  // http.server NNNN or HTTPServer(("", NNNN))
  const httpServerMatch = code.match(/http\.server\s+(\d{2,5})|HTTPServer\s*\(\s*\(\s*['"]?['"]?\s*,\s*(\d{2,5})/);
  if (httpServerMatch) return parseInt(httpServerMatch[1] ?? httpServerMatch[2], 10);

  // socketserver / BaseHTTPServer on port NNNN
  const socketMatch = code.match(/server_address\s*=\s*\(\s*['"]?[^'"]*['"]?\s*,\s*(\d{2,5})/);
  if (socketMatch) return parseInt(socketMatch[1], 10);

  // Generic: port = NNNN variable then some server/socket call
  const portVarMatch = code.match(/\bport\s*=\s*(\d{2,5})/);
  if (portVarMatch && /\bapp\.run\b|\buvicorn\b|\bsocket\b|\bserve\b|\blisten\b|\bHTTPServer\b/.test(code)) {
    return parseInt(portVarMatch[1], 10);
  }

  return null;
}

/**
 * Build a friendly chat response for a running server.
 */
function buildServerLaunchResponse(
  before: string,
  after: string,
  description: string,
  port: number,
  previewUrl: string,
  title: string,
): string {
  const parts: string[] = [];
  const intro = before || description;
  if (intro) parts.push(intro);

  parts.push(
    `**Server running on port ${port}** — Daytona has tunnelled it to a public URL:\n\n` +
    `\`\`\`preview-url\n${JSON.stringify({ url: previewUrl, title })}\n\`\`\``,
  );

  if (after) parts.push(after);
  return parts.filter(Boolean).join('\n\n');
}

function stripRawToolTags(text: string): string {
  return text
    .replace(RAW_TAG_RE, '')
    // Also strip bare tool-call syntax so it never leaks into the chat as raw text
    .replace(/\{tool\s*=>\s*"code_interpreter"[\s\S]*?\}\s*\}/g, '')
    .trim();
}

/**
 * Clean up "before" text extracted from around a tool call.
 * Strips stray code fences and raw tool-call markup that the model may have
 * emitted as preamble, so they never appear in the chat output.
 */
function cleanBeforeText(text: string): string {
  return stripRawToolTags(text)
    // Remove empty/stray fenced code blocks (e.g. ``` ``` with nothing inside)
    .replace(/```[^\n`]*\n\s*```/g, '')
    // Remove orphaned opening/closing fences
    .replace(/^```[^\n]*$/gm, '')
    .trim();
}

function sanitizeCodeOutput(output: string): string {
  return output
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<!-- script removed -->')
    .replace(/\s+on[a-z]{2,}\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
}

// ─── Ensure HTML has full document structure ──────────────────────────────────

function wrapAsHtmlDocument(code: string, title: string): string {
  const trimmed = code.trim();
  // Already a full document
  if (/<html[\s>]|<!doctype\s+html/i.test(trimmed)) return trimmed;
  // Bare JavaScript — wrap in a minimal HTML shell
  if (!/<[a-z][^>]*>/i.test(trimmed)) {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>html,body{margin:0;padding:0;background:#111;}</style></head>
<body>
<canvas id="canvas" style="display:block;margin:auto;"></canvas>
<script>
${trimmed}
</script>
</body></html>`;
  }
  // Has HTML elements but no full doc — wrap
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>html,body{margin:0;padding:0;}</style></head>
<body>${trimmed}</body></html>`;
}

// ─── Response builders ────────────────────────────────────────────────────────

/**
 * Build the chat response for web content (HTML/JS).
 * Shows a minimal launch card instead of the full code dump —
 * the game lives in the preview panel, not in the chat.
 */
function buildWebLaunchResponse(before: string, after: string, description: string): string {
  const parts: string[] = [];
  const intro = before.trim() || description;
  if (intro) parts.push(intro);
  if (after.trim()) parts.push(after.trim());
  return parts.filter(Boolean).join('\n\n');
}

function buildPythonResponse(
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
      parts.push('**Output:**\n```\n' + sanitizeCodeOutput(output).trim() + '\n```');
    } else {
      parts.push('_No output produced._');
    }
  } else if (error) {
    const isDisplay = /No available video device|display|pygame\.error|xcb|cannot connect to X/.test(error);
    const isMissingModule = /No module named/.test(error);

    if (isDisplay) {
      parts.push(
        '> **Note:** Pygame requires a local graphical display and cannot run in the browser sandbox.\n' +
        '> \n' +
        '> **To play this in the browser:** ask me to _"rewrite this as an HTML5 Canvas game"_ — I\'ll convert it to a single-file HTML version that opens in the preview panel.\n' +
        '> \n' +
        '> **To run locally:**\n' +
        '> ```bash\n> pip install pygame && python script.py\n> ```',
      );
    } else if (isMissingModule) {
      const mod = error.match(/No module named '([^']+)'/)?.[1] ?? 'the required package';
      parts.push(
        '> **Note:** The sandbox is missing `' + mod + '`. Run this locally after installing:\n' +
        '> ```bash\n> pip install ' + mod + ' && python script.py\n> ```',
      );
    } else {
      parts.push('**Execution error:**\n```\n' + error.trim() + '\n```');
    }
  }

  if (after.trim()) parts.push(after.trim());
  return parts.join('\n\n');
}

// ─── Execution handlers ───────────────────────────────────────────────────────

async function handlePythonCode(
  chatId: string | undefined,
  code: string,
): Promise<{ output: string } | { error: string }> {
  if (!chatId) {
    try {
      const { codeInterpreterTool } = await import('@/lib/tools/code-interpreter');
      const raw = await codeInterpreterTool.execute!(
        { code, title: 'Code', icon: 'default' },
        { toolCallId: 'coder-tool-0', messages: [] },
      );
      type ToolResult = { message: string };
      const result: ToolResult =
        raw != null && Symbol.asyncIterator in (raw as object)
          ? await (async () => {
              let last: ToolResult = { message: '' };
              for await (const chunk of raw as AsyncIterable<ToolResult>) last = chunk;
              return last;
            })()
          : (raw as ToolResult);
      return { output: result.message };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  }

  try {
    await getOrCreateSandbox(chatId);
    const result = await executeInSandbox(chatId, code);
    const output = result.stdout || result.result;
    return { output };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Detect Python package imports in server code and return a pip install
 * command for any third-party packages that need to be installed.
 */
function buildPipInstallCommand(code: string): string | null {
  const STDLIB = new Set([
    'os', 'sys', 'json', 'time', 'math', 'random', 'datetime', 'pathlib',
    'threading', 'subprocess', 'socket', 'http', 'urllib', 'collections',
    'itertools', 'functools', 'typing', 'abc', 'io', 'contextlib', 'logging',
    'hashlib', 'base64', 'struct', 'copy', 're', 'string', 'textwrap',
    'enum', 'dataclasses', 'asyncio', 'concurrent', 'multiprocessing',
    'queue', 'signal', 'traceback', 'inspect', 'importlib', 'unittest',
    '__future__', 'builtins',
  ]);

  const THIRD_PARTY_MAP: Record<string, string> = {
    flask: 'flask',
    fastapi: 'fastapi uvicorn',
    uvicorn: 'uvicorn',
    aiohttp: 'aiohttp',
    tornado: 'tornado',
    starlette: 'starlette uvicorn',
    django: 'django',
    requests: 'requests',
    httpx: 'httpx',
    pydantic: 'pydantic',
    sqlalchemy: 'sqlalchemy',
    numpy: 'numpy',
    pandas: 'pandas',
    pil: 'pillow',
    cv2: 'opencv-python',
    sklearn: 'scikit-learn',
    scipy: 'scipy',
  };

  const packages = new Set<string>();
  const importRe = /^\s*(?:import|from)\s+([a-zA-Z_][a-zA-Z0-9_]*)/gm;
  let m;
  while ((m = importRe.exec(code)) !== null) {
    const mod = m[1].toLowerCase();
    if (!STDLIB.has(mod) && THIRD_PARTY_MAP[mod]) {
      packages.add(THIRD_PARTY_MAP[mod]);
    }
  }

  if (packages.size === 0) return null;
  return `pip install -q ${[...packages].join(' ')}`;
}

/**
 * Run a Python server script in the background inside the Daytona sandbox,
 * poll until the port is reachable, then return the public Daytona preview URL.
 */
async function handleServerCode(
  chatId: string,
  code: string,
  port: number,
): Promise<{ previewUrl: string } | { error: string }> {
  try {
    await getOrCreateSandbox(chatId);

    // 1. Write the Python script via Daytona filesystem API (reliable — avoids
    //    heredoc / shell-escaping issues with complex Python code).
    const scriptPath = `/tmp/scx_server_${Date.now()}.py`;
    await uploadFileToSandbox(chatId, scriptPath, code);

    // 2. Install any required third-party packages (Flask, FastAPI, etc.)
    const pipCmd = buildPipInstallCommand(code);
    if (pipCmd) {
      await runCommandInSandbox(chatId, pipCmd);
    }

    // 3. Launch with nohup so the server survives after the parent shell exits.
    await runServerBackground(chatId, `python3 ${scriptPath}`, port);

    // 4. Poll until the port is actually accepting connections (up to 20 s).
    const ready = await waitForPort(chatId, port, 20000);
    if (!ready) {
      const logs = await readSandboxLog(chatId, `/tmp/scx_server_${port}.log`);
      const logSnippet = logs ? `\n\n**Server logs:**\n\`\`\`\n${logs.trim()}\n\`\`\`` : '';
      return { error: `Server did not start on port ${port} within 20 seconds.${logSnippet}` };
    }

    // 5. Get the public Daytona preview URL for the port.
    const preview = await getPreviewUrl(chatId, port);
    if (!preview) {
      return { error: `Server is running on port ${port} but Daytona could not provide a preview URL.` };
    }

    return { previewUrl: preview.url };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export const coderToolMiddleware: LanguageModelMiddleware = {
  specificationVersion: 'v3',

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wrapStream: async ({ doStream }): Promise<any> => {
    const { stream, ...rest } = await doStream();
    const chatId = getCurrentChatId();

    let textId: string | null = null;
    let textStartChunk: unknown = null;
    let buffer = '';

    const transformed = stream.pipeThrough(
      new TransformStream<unknown, unknown>({
        transform(chunk, controller) {
          const c = chunk as { type?: string; id?: string; delta?: string };
          if (c.type === 'text-start') {
            textId = c.id ?? null;
            textStartChunk = chunk;
            return;
          }
          if (c.type === 'text-end') return;
          if (c.type === 'text-delta') {
            buffer += c.delta ?? '';
            return;
          }
          controller.enqueue(chunk);
        },

        async flush(controller) {
          const enqueueText = (text: string) => {
            if (textId && textStartChunk) {
              controller.enqueue(textStartChunk);
              controller.enqueue({ type: 'text-delta', id: textId, delta: text });
              controller.enqueue({ type: 'text-end', id: textId });
            }
          };

          const toolCall = parseCoderToolCall(buffer);

          // A "filename-only" code value like "snake_game.html" or "app.py" is
          // a bogus tool call — the model used a file reference instead of
          // actual code. Skip execution and emit the before-text (which
          // typically contains a previously-generated preview block).
          if (
            toolCall &&
            !toolCall.code.includes('\n') &&
            toolCall.code.length < 120 &&
            /^[\w\-./]+\.\w{1,5}$/.test(toolCall.code.trim())
          ) {
            // Bogus filename-only reference — emit only the cleaned before-text
            // (e.g. a previously-generated preview block the model echoed back)
            const beforeText = cleanBeforeText(buffer.slice(0, toolCall.matchStart));
            if (beforeText) enqueueText(beforeText);
            return;
          }

          if (!toolCall) {
            // Safety net: if the buffer looks like a bare tool call but parsing failed
            // (e.g. HTML with unescaped quotes that evaded the parser), try to extract
            // the HTML block directly so it never leaks raw code into the chat.
            if (BARE_TOOL_CALL_START_RE.test(buffer)) {
              const htmlStart = buffer.search(/<!DOCTYPE\s+html|<html[\s>]/i);
              if (htmlStart >= 0) {
                let htmlCode = buffer.slice(htmlStart);
                // Strip any bare-format closing syntax that may be appended
                htmlCode = htmlCode.replace(/"\s*\}\s*\}\s*$/, '').trim();
                const title = 'Preview';
                const srcdoc = wrapAsHtmlDocument(htmlCode, title);
                const previewPayload = JSON.stringify({ srcdoc, title });
                enqueueText('```preview-url\n' + previewPayload + '\n```');
                return;
              }
            }
            // No tool call and no extractable HTML — emit cleaned-up buffer
            if (buffer.trim()) enqueueText(stripRawToolTags(buffer));
            return;
          }

          const before = cleanBeforeText(buffer.slice(0, toolCall.matchStart));
          const after = cleanBeforeText(buffer.slice(toolCall.matchEnd));
          const codeType = detectCodeType(toolCall.code);

          // ── HTML / JS / static web → srcdoc iframe (no Daytona) ──────────
          if (codeType === 'html' || codeType === 'static-web' || codeType === 'node') {
            // If it's Python that contains an HTML triple-quoted string, extract it
            let htmlCode = toolCall.code;
            if (codeType !== 'node') {
              const extracted = extractHtmlFromPython(toolCall.code);
              if (extracted) htmlCode = extracted;
            }

            const title = toolCall.description || 'Preview';
            const srcdoc = wrapAsHtmlDocument(htmlCode, title);

            // Emit a preview-url block with the srcdoc payload.
            // PreviewUrlBlock will auto-open the panel on mount.
            const previewPayload = JSON.stringify({ srcdoc, title });
            const previewBlock = '```preview-url\n' + previewPayload + '\n```';

            const textParts: string[] = [];
            // Only include `before` if it has meaningful non-whitespace content
            // (not just raw tool-call preamble that was stripped away)
            if (before) textParts.push(before);
            textParts.push(previewBlock);
            if (after) textParts.push(after);

            enqueueText(textParts.filter(Boolean).join('\n\n'));
            return;
          }

          // ── Pygame / GUI Python → cannot run headlessly ───────────────────
          if (isGuiCode(toolCall.code)) {
            const responseText = buildPythonResponse(
              before, after, toolCall.description,
              toolCall.code, null, 'No available video device',
            );
            enqueueText(responseText);
            return;
          }

          // ── Python server (Flask/FastAPI/http.server/etc.) → run in background,
          //    return Daytona public preview URL ──────────────────────────────
          const serverPort = detectServerPort(toolCall.code);
          if (serverPort && chatId) {
            const serverResult = await handleServerCode(chatId, toolCall.code, serverPort);
            if ('previewUrl' in serverResult) {
              const title = toolCall.description || `Server on port ${serverPort}`;
              enqueueText(
                buildServerLaunchResponse(before, after, toolCall.description, serverPort, serverResult.previewUrl, title),
              );
            } else {
              // Server failed to start — fall through and show the code with the error
              enqueueText(buildPythonResponse(before, after, toolCall.description, toolCall.code, null, serverResult.error));
            }
            return;
          }

          // ── Plain Python → execute in Daytona sandbox ─────────────────────
          const result = await handlePythonCode(chatId, toolCall.code);
          if ('output' in result) {
            enqueueText(buildPythonResponse(before, after, toolCall.description, toolCall.code, result.output, null));
          } else {
            enqueueText(buildPythonResponse(before, after, toolCall.description, toolCall.code, null, result.error));
          }
        },
      }),
    );

    return { stream: transformed, ...rest };
  },
};
