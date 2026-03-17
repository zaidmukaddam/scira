import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from 'ai';
import { magpieProtocolMiddleware } from '@/ai/magpie-middleware';
import type { JSONValue } from 'ai';

// ─── Base URL ────────────────────────────────────────────────────────────────
// Strip trailing /v1 if present so we can append it consistently in all paths.
const SCX_BASE = (process.env.SCX_API_URL ?? 'https://api.scx.ai').replace(/\/v1\/?$/, '');
const SCX_KEY = process.env.SCX_API_KEY ?? '';

// ─── Magpie SSE normalizer ────────────────────────────────────────────────────
// Magpie streams with multiple `data:` lines per SSE event (no blank-line
// separator between them). Per the SSE spec those lines are concatenated with
// "\n", so JSON.parse("{chunk1}\n{chunk2}") fails. This fetch wrapper ensures
// every `data:` line is flushed as its own standalone SSE event.
function createMagpieNormalizedFetch(): typeof fetch {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  return async (url, init) => {
    const response = await fetch(url, init);
    if (!response.body) return response;
    if (!(response.headers.get('content-type') ?? '').includes('text/event-stream')) return response;

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
              output += line + '\n\n'; // each data: line → its own SSE event
            }
            // blank lines are dropped; we manage separators ourselves
          }
          if (output) controller.enqueue(encoder.encode(output));
        },
        flush(controller) {
          const rem = buffer.trim();
          if (rem) controller.enqueue(encoder.encode((rem.startsWith('data: ') ? rem + '\n\n' : rem + '\n')));
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
  | 'magpie';

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
});

// Separate provider for Magpie with the SSE-normalizing fetch
const magpieProvider = createOpenAICompatible<'magpie', 'magpie', never, never>({
  name: 'scx-magpie',
  baseURL: `${SCX_BASE}/v1`,
  apiKey: SCX_KEY,
  includeUsage: true,
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
// - magpie: streams reasoning_content + content as separate delta fields (OpenAI
//   compatible format). Uses a dedicated provider with SSE-normalizing fetch so
//   the SDK can parse multiple data: lines per event correctly.
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
    magpie: wrapLanguageModel({
      model: magpieProvider.languageModel('magpie'),
      middleware: [magpieProtocolMiddleware],
    }),
    // Internal utility aliases (follow-up suggestions, chat naming, prompt enhancement)
    'scira-follow-up': scxProvider.languageModel('Llama-4-Maverick-17B-128E-Instruct'),
    'scira-name': scxProvider.languageModel('Llama-4-Maverick-17B-128E-Instruct'),
    'scira-enhance': scxProvider.languageModel('Llama-4-Maverick-17B-128E-Instruct'),
  },
});

// Backward-compat alias used by restored files that reference the old name
export const scira = scx;
