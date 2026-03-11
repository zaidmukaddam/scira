/**
 * generateJSON — structured JSON extraction via generateText.
 *
 * Uses generateText (not generateObject) so no `response_format` header is
 * sent to the API. This makes it compatible with models on the SCX API that
 * do not support JSON schema structured outputs (e.g. DeepSeek variants).
 *
 * The model is prompted to return raw JSON, then the output is:
 *  1. Extracted from markdown code fences if present
 *  2. Repaired with jsonrepair (handles trailing commas, missing quotes, etc.)
 *  3. Validated against the provided Zod schema
 */

import { generateText, type LanguageModel } from 'ai';
import { jsonrepair } from 'jsonrepair';
import { z } from 'zod';

export interface GenerateJSONParams<T> {
  model: LanguageModel;
  prompt: string;
  schema: z.ZodType<T>;
  system?: string;
}

function extractJSON(raw: string): string {
  // 1. Strip ```json ... ``` or ``` ... ``` blocks
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) return fenceMatch[1].trim();

  // 2. Find the first { or [ and the matching last } or ]
  const firstBrace = raw.indexOf('{');
  const firstBracket = raw.indexOf('[');

  let start = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    start = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    start = firstBrace;
  } else if (firstBracket !== -1) {
    start = firstBracket;
  }

  if (start !== -1) {
    const lastBrace = raw.lastIndexOf('}');
    const lastBracket = raw.lastIndexOf(']');
    const end = Math.max(lastBrace, lastBracket);
    if (end > start) return raw.slice(start, end + 1).trim();
  }

  return raw.trim();
}

export async function generateJSON<T>(params: GenerateJSONParams<T>): Promise<T> {
  const { model, system, schema, prompt } = params;

  const { text } = await generateText({
    model,
    system: system ?? 'You are a helpful assistant that returns structured data as JSON.',
    prompt: `${prompt}\n\nIMPORTANT: Return ONLY a valid JSON object with no explanation, no markdown, no code fences.`,
  });

  const extracted = extractJSON(text);
  const repaired = jsonrepair(extracted);
  const parsed: unknown = JSON.parse(repaired);
  return schema.parse(parsed);
}
