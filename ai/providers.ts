import 'server-only';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from 'ai';
import { coderToolMiddleware } from '@/ai/coder-middleware';
import { magpieProtocolMiddleware } from '@/ai/magpie-middleware';
import type { JSONValue } from 'ai';

// ─── Base URL ────────────────────────────────────────────────────────────────
// Strip trailing /v1 if present so we can append it consistently in all paths.
const SCX_BASE = (process.env.SCX_API_URL ?? 'https://api.scx.ai').replace(/\/v1\/?$/, '');
const SCX_KEY = process.env.SCX_API_KEY ?? '';

/** Model IDs that receive `transformMagpieRequestBody` (tool_choice mapping) + SSE line splitting. */
const MAGPIE_MODEL_IDS = new Set(['MAGPiE', 'magpie-small']);

/**
 * MAGPiE request tweaks (SSE body before POST to SCX).
 *
 * We keep OpenAI **function** tool definitions as emitted by the AI SDK — do not rewrite to
 * compact `{ type: 'web_search' }`. Compact tools were preventing the stream from surfacing
 * standard `tool_calls`, so local `streamText` tool execution never ran.
 *
 * Optional: map explicit `tool_choice` when the gateway expects a different tool id.
 */
const SCIRA_FUNCTION_TO_SCX_TOOL_CHOICE: Record<string, string> = {
  web_search: 'web_search',
  stock_price: 'stock_price',
};

/** When SCX stream uses different tool ids than Scira `tool()` keys, map here (empty = skip SSE JSON rewrite). */
const SCX_TOOL_NAME_TO_SCIRA: Record<string, string> = {};

function transformMagpieRequestBody(body: Record<string, unknown>): void {
  const tc = body.tool_choice;
  if (tc && typeof tc === 'object') {
    const o = tc as Record<string, unknown>;
    if (o.type === 'tool' && typeof o.toolName === 'string') {
      const mapped = SCIRA_FUNCTION_TO_SCX_TOOL_CHOICE[o.toolName];
      if (mapped) {
        body.tool_choice = { type: 'tool', toolName: mapped };
      }
    }
    // Do not strip tool_choice for 'auto' / 'required' — SCX may rely on it for tool use.
  }
}

function rewriteStreamToolFunctionNames(node: unknown): void {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const x of node) rewriteStreamToolFunctionNames(x);
    return;
  }
  if (typeof node !== 'object') return;

  const o = node as Record<string, unknown>;

  if (Array.isArray(o.tool_calls)) {
    for (const tc of o.tool_calls) {
      if (tc && typeof tc === 'object') {
        const t = tc as { type?: string; function?: { name?: string; arguments?: string } };
        if (t.function?.name) {
          const scira = SCX_TOOL_NAME_TO_SCIRA[t.function.name] ?? t.function.name;
          t.function.name = scira;
        }
      }
    }
  }

  const fn = o.function;
  if (fn && typeof fn === 'object') {
    const f = fn as { name?: string };
    if (typeof f.name === 'string' && f.name.length > 0) {
      const scira = SCX_TOOL_NAME_TO_SCIRA[f.name] ?? f.name;
      f.name = scira;
    }
  }

  for (const k of Object.keys(o)) {
    rewriteStreamToolFunctionNames(o[k]);
  }
}

function rewriteSseDataLineJson(line: string): string {
  if (!line.startsWith('data: ')) return line;
  const raw = line.slice(6);
  if (raw.trim() === '[DONE]') return line;
  try {
    const obj = JSON.parse(raw) as unknown;
    rewriteStreamToolFunctionNames(obj);
    return `data: ${JSON.stringify(obj)}`;
  } catch {
    return line;
  }
}

// ─── Magpie SSE normalizer + MAGPiE tool wire format ────────────────────────
// 1) SSE: Magpie can emit multiple `data:` lines per logical event without a
//    blank-line separator, so JSON.parse("{a}\n{b}") fails. We flush each `data:`
//    line as its own SSE event.
// 2) MAGPiE: optional SSE JSON tool-name rewrite when SCX_TOOL_NAME_TO_SCIRA is non-empty.
function createMagpieNormalizedFetch(): typeof fetch {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const sseRename =
    Object.keys(SCX_TOOL_NAME_TO_SCIRA).length > 0;
  return async (url, init) => {
    let nextInit = init;
    let rewriteStreamToolIds = false;

    if (init?.method === 'POST' && init.body && typeof init.body === 'string') {
      try {
        const body = JSON.parse(init.body) as Record<string, unknown>;
        const mid = String(body.model ?? '');
        if (MAGPIE_MODEL_IDS.has(mid)) {
          transformMagpieRequestBody(body);
          rewriteStreamToolIds = sseRename;
          nextInit = { ...init, body: JSON.stringify(body) };
        }
      } catch {
        /* pass through */
      }
    }

    const response = await fetch(url, nextInit);
    if (!response.body) return response;
    if (!(response.headers.get('content-type') ?? '').includes('text/event-stream')) {
      return response;
    }

    let buffer = '';
    const transformedBody = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          buffer += decoder.decode(chunk, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          let output = '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const normalized = rewriteStreamToolIds ? rewriteSseDataLineJson(line) : line;
              output += normalized + '\n\n';
            }
          }
          if (output) controller.enqueue(encoder.encode(output));
        },
        flush(controller) {
          const rem = buffer.trim();
          if (!rem) return;
          if (rem.startsWith('data: ')) {
            const normalized = rewriteStreamToolIds ? rewriteSseDataLineJson(rem) : rem;
            controller.enqueue(encoder.encode(normalized + '\n\n'));
          } else {
            controller.enqueue(encoder.encode(rem + '\n'));
          }
        },
      }),
    );

    return new Response(transformedBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}

// ─── Chat model IDs (as served by the SCX OpenAI-compatible API) ─────────────
type ScxChatModelId =
  | 'DeepSeek-V3-0324'
  | 'DeepSeek-V3.1'
  | 'DeepSeek-R1-0528'
  | 'Llama-4-Maverick-17B-128E-Instruct'
  | 'Llama-3.3-Swallow-70B-Instruct-v0.4'
  | 'gpt-oss-120b'
  | 'coder'
  | 'MAGPiE'
  | 'magpie-small';

type ScxEmbeddingModelId = 'E5-Mistral-7B-Instruct';

const scxProvider = createOpenAICompatible<
  ScxChatModelId,
  ScxChatModelId,
  ScxEmbeddingModelId,
  ScxEmbeddingModelId
>({
  name: 'scx',
  baseURL: `${SCX_BASE}/v1`,
  apiKey: SCX_KEY,
  includeUsage: true,
  // Shared fetch: SSE line splitting for all SCX streaming models; MAGPiE-only
  // request/response tool rewriting is gated on model id inside createMagpieNormalizedFetch.
  fetch: createMagpieNormalizedFetch(),
});

// ─── Shared helpers ───────────────────────────────────────────────────────────
function buildHeaders(additional?: Record<string, string | undefined>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SCX_KEY}`,
  };
  if (additional) {
    for (const [k, v] of Object.entries(additional)) {
      if (v !== undefined) headers[k] = v;
    }
  }
  return headers;
}

function collectResponseHeaders(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  res.headers.forEach((v, k) => { out[k] = v; });
  return out;
}

// ─── Embedding (E5-Mistral-7B-Instruct) ──────────────────────────────────────
export type EmbeddingCallOptions = {
  values: string[];
  abortSignal?: AbortSignal;
  providerOptions?: Record<string, Record<string, JSONValue>>;
  headers?: Record<string, string | undefined>;
};

export type EmbeddingResult = {
  embeddings: number[][];
  usage?: { tokens: number };
  providerMetadata?: Record<string, Record<string, JSONValue>>;
  response?: { headers?: Record<string, string>; body?: unknown };
};

export async function doEmbed({
  values,
  abortSignal,
  providerOptions,
  headers,
}: EmbeddingCallOptions): Promise<EmbeddingResult> {
  const body = JSON.stringify({
    model: 'E5-Mistral-7B-Instruct',
    input: values,
    ...(providerOptions?.scx ?? {}),
  });

  const res = await fetch(`${SCX_BASE}/v1/embeddings`, {
    method: 'POST',
    headers: buildHeaders(headers),
    body,
    signal: abortSignal,
  });

  if (!res.ok) {
    throw new Error(`SCX embed failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return {
    embeddings:
      data.data?.map((d: { embedding: number[] }) => d.embedding) ??
      data.map((d: { embedding: number[] }) => d.embedding),
    usage: data.usage
      ? { tokens: data.usage.total_tokens ?? data.usage.prompt_tokens ?? 0 }
      : undefined,
    response: { headers: collectResponseHeaders(res), body: data },
  };
}

// ─── Transcription (Whisper large-v3) ────────────────────────────────────────
export type TranscriptionCallOptions = {
  audio: Uint8Array | string;
  mediaType: string;
  providerOptions?: Record<string, Record<string, JSONValue>>;
  abortSignal?: AbortSignal;
  headers?: Record<string, string | undefined>;
};

export async function doTranscribe({
  audio,
  mediaType,
  providerOptions,
  abortSignal,
  headers,
}: TranscriptionCallOptions) {
  const audioData = audio instanceof Uint8Array ? Buffer.from(audio).toString('base64') : audio;
  const bodyObj = {
    model: 'whisper-large-v3',
    audio: audioData,
    media_type: mediaType,
    ...(providerOptions?.scx ?? {}),
  };
  const body = JSON.stringify(bodyObj);

  const res = await fetch(`${SCX_BASE}/v1/transcriptions`, {
    method: 'POST',
    headers: buildHeaders(headers),
    body,
    signal: abortSignal,
  });

  if (!res.ok) {
    throw new Error(`SCX transcribe failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return {
    text: data.text ?? '',
    segments:
      data.segments?.map((s: { text: string; start: number; end: number }) => ({
        text: s.text,
        startSecond: s.start,
        endSecond: s.end,
      })) ?? [],
    language: data.language as string | undefined,
    durationInSeconds: data.duration as number | undefined,
    warnings: [] as { type: 'other'; message: string }[],
    request: { body },
    response: {
      timestamp: new Date(),
      modelId: 'whisper-large-v3' as const,
      headers: collectResponseHeaders(res),
      body: data,
    },
  };
}

// ─── SCX custom provider ──────────────────────────────────────────────────────
// Reasoning middleware notes:
// - deepseek-r1 / gpt-oss-120b: emit <think>...</think> blocks in content;
//   extractReasoningMiddleware converts them to `reasoning` stream parts.
// - magpie: SSE line splitting + magpieProtocol (<|call|>) + extractReasoning (<think>).
// - deepseek-v3 / v3.1 / llama models: no reasoning output, pass through as-is.
// Re-export model helpers so components importing from '@/ai/providers' still work
export {
  models,
  requiresAuthentication,
  requiresProSubscription,
  hasVisionSupport,
  hasPdfSupport,
  getAcceptedFileTypes,
  shouldBypassRateLimits,
  getFilteredModels,
  isModelRestrictedInRegion,
  supportsExtremeMode,
  supportsFunctionCalling,
  supportsCodeInterpreter,
} from '@/ai/models';

export const scx = customProvider({
  languageModels: {
    'deepseek-v3': scxProvider.languageModel('DeepSeek-V3-0324'),
    'deepseek-v3.1': scxProvider.languageModel('DeepSeek-V3.1'),
    'deepseek-r1': wrapLanguageModel({
      model: scxProvider.languageModel('DeepSeek-R1-0528'),
      middleware: [extractReasoningMiddleware({ tagName: 'think' })],
    }),
    'llama-4': scxProvider.languageModel('Llama-4-Maverick-17B-128E-Instruct'),
    'llama-3.3': scxProvider.languageModel('Llama-3.3-Swallow-70B-Instruct-v0.4'),
    'gpt-oss-120b': wrapLanguageModel({
      model: scxProvider.languageModel('gpt-oss-120b'),
      middleware: [extractReasoningMiddleware({ tagName: 'think' })],
    }),
    // 'coder' is the actual API model ID (verified from /v1/models).
    // It uses a proprietary [TOOL_CALL]...[/TOOL_CALL] text format instead of
    // OpenAI-style function calling. The coderToolMiddleware intercepts that
    // format, executes the code in Daytona, and emits clean markdown output.
    'scx-coder': wrapLanguageModel({
      model: scxProvider.languageModel('coder'),
      middleware: [coderToolMiddleware],
    }),
    // MAGPiE: magpieProtocol (<|call|>) + extractReasoning; OpenAI function tools preserved in POST body.
    magpie: wrapLanguageModel({
      model: scxProvider.languageModel('MAGPiE'),
      middleware: [
        extractReasoningMiddleware({ tagName: 'redacted_thinking' }),
        magpieProtocolMiddleware,
      ],
    }),
    // Internal utility aliases (follow-up suggestions, chat naming, prompt enhancement)
    'scira-follow-up': scxProvider.languageModel('Llama-4-Maverick-17B-128E-Instruct'),
    'scira-name': scxProvider.languageModel('Llama-4-Maverick-17B-128E-Instruct'),
    'scira-enhance': scxProvider.languageModel('Llama-4-Maverick-17B-128E-Instruct'),
  },
});

// Backward-compat alias used by restored files that reference the old name
export const scira = scx;
