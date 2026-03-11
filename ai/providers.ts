import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from 'ai';
import type { JSONValue } from 'ai';
import type { LanguageModelMiddleware } from 'ai';
import { magpieProtocolMiddleware } from './magpie-middleware';

// ─── Base URL ────────────────────────────────────────────────────────────────
// Strip trailing /v1 if present so we can append it consistently in all paths.
const SCX_BASE = (process.env.SCX_API_URL ?? 'https://api.scx.ai').replace(/\/v1\/?$/, '');
const SCX_KEY = process.env.SCX_API_KEY ?? '';

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
// - magpie: uses a custom channel protocol (<|channel|>analysis<|message|>
//   ... <|end|> / <|channel|>final<|message|>); magpieProtocolMiddleware parses
//   the protocol and routes analysis→reasoning, final→text, rest→discard.
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
      model: scxProvider.languageModel('magpie'),
      middleware: [magpieProtocolMiddleware as LanguageModelMiddleware],
    }),
    // Internal utility aliases (follow-up suggestions, chat naming, prompt enhancement)
    'scira-follow-up': scxProvider.languageModel('Llama-4-Maverick-17B-128E-Instruct'),
    'scira-name': scxProvider.languageModel('Llama-4-Maverick-17B-128E-Instruct'),
    'scira-enhance': scxProvider.languageModel('Llama-4-Maverick-17B-128E-Instruct'),
  },
});

// Backward-compat alias used by restored files that reference the old name
export const scira = scx;
