import { NextResponse } from 'next/server';
import type { ServerConfiguredProviders } from '@/lib/local-settings';

export const dynamic = 'force-dynamic';

/**
 * Placeholder values commonly left in .env files (e.g. `dummy...`, `your_api_key`)
 * must not count as a configured key, otherwise the UI reports "server key
 * active" for providers that were never actually set up.
 */
const PLACEHOLDER_PATTERN = /^(dummy|your[_-]|api[_-]?key|changeme|change[_-]me|placeholder|todo|xxx+$|sk-xxx)/i;

function isRealKey(value: string | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !PLACEHOLDER_PATTERN.test(trimmed);
}

/**
 * Reports which providers have an API key configured on the server via
 * environment variables. Returns booleans only — never the keys themselves.
 * The Settings UI merges this with locally stored keys to decide which
 * providers/models are usable. `gateway` covers models served through the
 * Vercel AI Gateway and other server-routed backends.
 */
export async function GET() {
  const configured: ServerConfiguredProviders = {
    openai: isRealKey(process.env.OPENAI_API_KEY),
    anthropic: isRealKey(process.env.ANTHROPIC_API_KEY),
    google: isRealKey(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
    groq: isRealKey(process.env.GROQ_API_KEY),
    xai: isRealKey(process.env.XAI_API_KEY),
    mistral: isRealKey(process.env.MISTRAL_API_KEY),
    exa: isRealKey(process.env.EXA_API_KEY),
    firecrawl: isRealKey(process.env.FIRECRAWL_API_KEY),
    tavily: isRealKey(process.env.TAVILY_API_KEY),
    gateway: isRealKey(process.env.AI_GATEWAY_API_KEY),
  };

  return NextResponse.json(configured);
}
