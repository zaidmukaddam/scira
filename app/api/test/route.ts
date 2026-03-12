import { NextRequest, NextResponse } from 'next/server';
import { generateText, streamText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { scx } from '@/ai/providers';
import { models, supportsFunctionCalling, hasReasoningSupport, getModelParameters, getMaxOutputTokens } from '@/ai/models';
import { serverEnv } from '@/env/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TestStatus = 'pass' | 'fail' | 'skip';

export interface ModelTestResult {
  model: string;
  label: string;
  status: TestStatus;
  responseMs: number;
  preview?: string;
  error?: string;
}

export interface ToolTestResult {
  tool: string;
  status: TestStatus;
  responseMs: number;
  preview?: string;
  error?: string;
  skipReason?: string;
}

export interface AutoGroupTestResult {
  model: string;
  label: string;
  status: TestStatus;
  responseMs: number;
  toolCalled?: string;
  preview?: string;
  error?: string;
  note?: string;
}

export interface StreamTestResult {
  model: string;
  label: string;
  status: TestStatus;
  ttftMs: number;
  totalMs: number;
  charCount: number;
  preview?: string;
  error?: string;
}

export interface TestReport {
  timestamp: string;
  models: ModelTestResult[];
  tools: ToolTestResult[];
  autoGroup: AutoGroupTestResult[];
  streams: StreamTestResult[];
  summary: {
    modelsPass: number;
    modelsFail: number;
    modelsSkip: number;
    toolsPass: number;
    toolsFail: number;
    toolsSkip: number;
    autoPass: number;
    autoFail: number;
    autoSkip: number;
    streamsPass: number;
    streamsFail: number;
    totalMs: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = Date.now();
  return fn().then((result) => ({ result, ms: Date.now() - start }));
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms),
  );
  return Promise.race([promise, timer]);
}

function truncate(s: string, n = 120): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// ─── Model tests ──────────────────────────────────────────────────────────────

async function testModel(modelValue: string, label: string): Promise<ModelTestResult> {
  const isReasoning = hasReasoningSupport(modelValue);

  try {
    const { result, ms } = await timed(() =>
      withTimeout(
        generateText({
          model: scx.languageModel(modelValue as any),
          prompt: 'Say the word "hello" and nothing else.',
          maxOutputTokens: 50,
          ...getModelParameters(modelValue),
        }),
        20_000,
      ),
    );

    const text = result.text?.trim() ?? '';
    const reasoningParts: Array<{ type: string; text: string }> = (result as any).reasoning ?? [];
    const reasoningText = Array.isArray(reasoningParts)
      ? reasoningParts.map((p) => p.text ?? '').join('').trim()
      : '';
    const hasOutput = text.length > 0 || (isReasoning && reasoningText.length > 0);

    return {
      model: modelValue,
      label,
      status: hasOutput ? 'pass' : 'fail',
      responseMs: ms,
      preview: truncate(text || reasoningText || '(no output)'),
      error: hasOutput ? undefined : 'Empty response',
    };
  } catch (err: any) {
    return {
      model: modelValue,
      label,
      status: 'fail',
      responseMs: 0,
      error: truncate(err?.message ?? String(err)),
    };
  }
}

// ─── Streaming tests ──────────────────────────────────────────────────────────

async function testStream(modelValue: string, label: string): Promise<StreamTestResult> {
  const start = Date.now();
  const isReasoning = hasReasoningSupport(modelValue);

  try {
    const streamResult = await withTimeout(
      (async () => {
        let ttftMs = -1;
        let charCount = 0;
        let preview = '';

        // Use fullStream so we capture both text-delta and reasoning parts.
        // Reasoning models (gpt-oss-120b, magpie) produce reasoning chunks rather
        // than text chunks, so textStream alone would yield nothing for them.
        const { fullStream } = streamText({
          model: scx.languageModel(modelValue as any),
          prompt: 'Say the word "hello" and nothing else.',
          // Give reasoning models enough budget to produce output.
          maxOutputTokens: isReasoning ? 500 : 50,
          ...getModelParameters(modelValue),
        });

        for await (const part of fullStream) {
          let delta = '';

          if (part.type === 'text-delta') {
            // AI SDK v5: text-delta uses `text` field; cast to handle both SDK variants
            delta = (part as any).text ?? (part as any).textDelta ?? '';
          } else if (part.type === 'reasoning-delta') {
            // reasoning-delta shape: { type: 'reasoning-delta', delta: string }
            delta = (part as any).delta ?? (part as any).text ?? '';
            if (delta && ttftMs === -1) preview = `[thinking] ${delta.slice(0, 60)}`;
          }

          if (delta.length > 0) {
            if (ttftMs === -1) {
              ttftMs = Date.now() - start;
              if (!preview) preview = delta;
            }
            charCount += delta.length;
          }
          if (charCount > 500) break;
        }

        return { ttftMs, totalMs: Date.now() - start, charCount, preview };
      })(),
      25_000,
    );

    return {
      model: modelValue,
      label,
      status: streamResult.charCount > 0 ? 'pass' : 'fail',
      ttftMs: streamResult.ttftMs,
      totalMs: streamResult.totalMs,
      charCount: streamResult.charCount,
      preview: streamResult.preview.trim() || '(no output)',
      error: streamResult.charCount > 0 ? undefined : 'No tokens streamed',
    };
  } catch (err: any) {
    return {
      model: modelValue,
      label,
      status: 'fail',
      ttftMs: -1,
      totalMs: Date.now() - start,
      charCount: 0,
      error: truncate(err?.message ?? String(err)),
    };
  }
}

// ─── Tool tests ───────────────────────────────────────────────────────────────

type ToolTest = {
  tool: string;
  run: () => Promise<unknown>;
  requiredEnv?: string[];
  validate?: (output: unknown) => boolean;
};

function buildToolTests(): ToolTest[] {
  return [
    // ── Active auto-group tools ───────────────────────────────────────────────
    {
      tool: 'web_search',
      requiredEnv: ['EXA_API_KEY'],
      run: async () => {
        const { webSearchTool } = await import('@/lib/tools/web-search');
        const t = webSearchTool(undefined, 'exa');
        return (t as any).execute({
          queries: ['SCX.ai Australia sovereign AI'],
          maxResults: [3],
          topics: ['general'],
          quality: ['default'],
        }, {});
      },
      validate: (o: any) => Array.isArray(o?.searches) && o.searches.length > 0,
    },
    {
      tool: 'retrieve',
      requiredEnv: ['EXA_API_KEY'],
      run: async () => {
        const { retrieveTool } = await import('@/lib/tools/retrieve');
        return (retrieveTool as any).execute({ url: ['https://www.abc.net.au/news'] }, {});
      },
      validate: (o: any) => o != null && (Array.isArray(o?.results) || o?.content != null || o?.title != null),
    },
    {
      tool: 'extreme_search',
      requiredEnv: ['EXA_API_KEY'],
      run: async () => {
        const { extremeSearchTool } = await import('@/lib/tools/extreme-search');
        const t = extremeSearchTool(undefined, 'exa');
        return (t as any).execute({ prompt: 'What is SCX.ai and what does it do in Australia?' }, {});
      },
      validate: (o: any) => o != null && (o?.research != null || o?.sources != null),
    },
    {
      tool: 'get_weather_data',
      run: async () => {
        const { weatherTool } = await import('@/lib/tools/weather');
        return (weatherTool as any).execute({ location: 'Sydney, Australia' }, {});
      },
      validate: (o: any) => o != null && (o?.list != null || o?.city != null || o?.current != null || o?.location != null),
    },
    {
      tool: 'datetime',
      run: async () => {
        const { datetimeTool } = await import('@/lib/tools/datetime');
        return (datetimeTool as any).execute({ timezone: 'Australia/Sydney' }, {});
      },
      validate: (o: any) => o != null && (typeof o?.iso === 'string' || typeof o?.timestamp === 'number' || typeof o?.datetime === 'string'),
    },
    {
      tool: 'text_translate',
      run: async () => {
        const { textTranslateTool } = await import('@/lib/tools/text-translate');
        return (textTranslateTool as any).execute({ text: 'Hello world', to: 'fr' }, {});
      },
      validate: (o: any) => typeof o?.translatedText === 'string' && o.translatedText.length > 0,
    },
    {
      tool: 'currency_converter',
      run: async () => {
        const { currencyConverterTool } = await import('@/lib/tools/currency-converter');
        return (currencyConverterTool as any).execute({ from: 'USD', to: 'AUD', amount: 1 }, {});
      },
      validate: (o: any) => typeof o?.convertedAmount === 'number' || typeof o?.rate === 'number' || typeof o?.forwardRate === 'number',
    },
    {
      tool: 'stock_price',
      run: async () => {
        const { stockPriceTool } = await import('@/lib/tools/stock-price');
        return (stockPriceTool as any).execute({ symbol: 'AAPL', preferredExchange: 'NASDAQ' }, {});
      },
      validate: (o: any) => o?.success === true && typeof o?.last_price === 'number',
    },
    {
      tool: 'nearby_places_search',
      run: async () => {
        const { nearbyPlacesSearchTool } = await import('@/lib/tools/map-tools');
        return (nearbyPlacesSearchTool as any).execute({
          location: 'Sydney CBD, Australia',
          type: 'cafe',
          radius: 500,
        }, {});
      },
      validate: (o: any) => o?.success === true || Array.isArray(o?.places),
    },
    {
      tool: 'find_place_on_map',
      run: async () => {
        const { findPlaceOnMapTool } = await import('@/lib/tools/map-tools');
        return (findPlaceOnMapTool as any).execute({ query: 'Sydney Opera House' }, {});
      },
      validate: (o: any) => o?.success === true || Array.isArray(o?.places) || o?.name != null,
    },
    {
      tool: 'trending_movies',
      run: async () => {
        const { trendingMoviesTool } = await import('@/lib/tools/trending-movies');
        return (trendingMoviesTool as any).execute({}, {});
      },
      validate: (o: any) => Array.isArray(o?.results) && o.results.length > 0,
    },
    {
      tool: 'trending_tv',
      run: async () => {
        const { trendingTvTool } = await import('@/lib/tools/trending-tv');
        return (trendingTvTool as any).execute({}, {});
      },
      validate: (o: any) => Array.isArray(o?.results) && o.results.length > 0,
    },
    {
      tool: 'movie_or_tv_search',
      run: async () => {
        const { movieTvSearchTool } = await import('@/lib/tools/movie-tv-search');
        return (movieTvSearchTool as any).execute({ query: 'Inception', type: 'movie' }, {});
      },
      validate: (o: any) => o?.result != null || o?.title != null || Array.isArray(o?.results),
    },
    {
      tool: 'generate_document',
      run: async () => {
        const { generateDocumentTool } = await import('@/lib/tools/generate-document');
        return (generateDocumentTool as any).execute({
          title: 'Test Document',
          content: '## Overview\n\nThis is a test document generated by the health check.',
          documentType: 'report',
        }, {});
      },
      validate: (o: any) => o?.content != null || o?.markdown != null || o?.title != null || o?.success === true,
    },
    {
      tool: 'code_interpreter',
      run: async () => {
        const { codeInterpreterTool } = await import('@/lib/tools/code-interpreter');
        return (codeInterpreterTool as any).execute({ code: 'print(2 + 2)', title: 'Test' }, {});
      },
      validate: (o: any) => o?.message != null || o?.output != null || o?.result != null,
    },

    // ── Non-active tools (tested for regression) ──────────────────────────────
    {
      tool: 'stock_chart_simple',
      run: async () => {
        const { stockChartSimpleTool } = await import('@/lib/tools/stock-chart-simple');
        return (stockChartSimpleTool as any).execute({ companies: ['BHP'], time_period: '1 month' }, {});
      },
      validate: (o: any) => o?.success === true,
    },
    {
      tool: 'track_flight',
      requiredEnv: ['AMADEUS_API_KEY', 'AMADEUS_API_SECRET'],
      run: async () => {
        const today = new Date().toISOString().split('T')[0];
        const { flightTrackerTool } = await import('@/lib/tools/flight-tracker');
        return (flightTrackerTool as any).execute({
          carrierCode: 'QF',
          flightNumber: '1',
          scheduledDepartureDate: today,
        }, {});
      },
      validate: (o: any) => o != null,
    },
    {
      tool: 'academic_search',
      requiredEnv: ['EXA_API_KEY'],
      run: async () => {
        const { academicSearchTool } = await import('@/lib/tools/academic-search');
        const t = academicSearchTool(undefined);
        return (t as any).execute({ queries: ['machine learning Australia'], maxResults: [3] }, {});
      },
      validate: (o: any) => Array.isArray(o?.searches) || Array.isArray(o?.results),
    },
    {
      tool: 'reddit_search',
      requiredEnv: ['PARALLEL_API_KEY'],
      run: async () => {
        const { redditSearchTool } = await import('@/lib/tools/reddit-search');
        const t = redditSearchTool(undefined);
        return (t as any).execute({ queries: ['Australia tech news'], maxResults: [3] }, {});
      },
      validate: (o: any) => Array.isArray(o?.results) || Array.isArray(o?.searches),
    },
    {
      tool: 'x_search',
      requiredEnv: ['XAI_API_KEY'],
      run: async () => {
        const { xSearchTool } = await import('@/lib/tools/x-search');
        const t = xSearchTool(undefined);
        return (t as any).execute({ queries: ['Australia AI news'] }, {});
      },
      validate: (o: any) => Array.isArray(o?.results) || Array.isArray(o?.searches),
    },
    {
      tool: 'trove_search',
      requiredEnv: ['TROVE_API_KEY'],
      run: async () => {
        const { troveSearchTool } = await import('@/lib/tools/trove-search');
        return (troveSearchTool as any).execute({ query: 'Australian history 1900', maxResults: 3 }, {});
      },
      validate: (o: any) => Array.isArray(o?.results) || o?.error != null,
    },
    {
      tool: 'travel_advisor',
      requiredEnv: ['TRIPADVISOR_API_KEY'],
      run: async () => {
        const { travelAdvisorTool } = await import('@/lib/tools/travel-advisor');
        return (travelAdvisorTool as any).execute({
          query: 'restaurants in Sydney',
          category: 'restaurants',
          location: 'Sydney',
        }, {});
      },
      validate: (o: any) => o != null && (Array.isArray(o?.results) || o?.success === true || typeof o === 'string'),
    },
    {
      tool: 'coin_data',
      run: async () => {
        const { coinDataTool } = await import('@/lib/tools/crypto-tools');
        return (coinDataTool as any).execute({ coinId: 'bitcoin' }, {});
      },
      validate: (o: any) => o?.success === true || o?.id != null || o?.data?.id != null,
    },
    {
      tool: 'mermaid_diagram',
      run: async () => {
        const { mermaidDiagramTool } = await import('@/lib/tools/mermaid-diagram');
        return (mermaidDiagramTool as any).execute({
          diagram: 'graph LR\n  A --> B',
          title: 'Test',
          format: 'svg',
          theme: 'default',
        }, {});
      },
      validate: (o: any) => o?.success === true || o?.svg != null,
    },
    {
      tool: 'rag_search',
      run: async () => {
        const { ragSearchTool } = await import('@/lib/tools/rag-search');
        return (ragSearchTool as any).execute({ query: 'test', userId: 'test-user' }, {});
      },
      validate: (o: any) => o != null,
    },
    {
      tool: 'flight_live_tracker',
      requiredEnv: ['OPENSKY_CLIENT_ID'],
      run: async () => {
        const { flightLiveTrackerTool } = await import('@/lib/tools/flight-live-tracker');
        return (flightLiveTrackerTool as any).execute({ flightIcao: 'QFA001' }, {});
      },
      validate: (o: any) => o != null,
    },
  ];
}

// ─── Auto group tests ─────────────────────────────────────────────────────────

async function testAutoGroup(modelValue: string, label: string): Promise<AutoGroupTestResult> {
  const canUseTools = supportsFunctionCalling(modelValue);

  // Models that don't support function calling are skipped — in production,
  // llama-4 handles tool repair via experimental_repairToolCall.
  if (!canUseTools) {
    return {
      model: modelValue,
      label,
      status: 'skip',
      responseMs: 0,
      note: 'Does not support function calling — llama-4 handles tool repair in production',
    };
  }

  try {
    let toolCalled: string | undefined;

    const { result, ms } = await timed(() =>
      withTimeout(
        generateText({
          model: scx.languageModel(modelValue as any),
          prompt: 'What is the current date and time in Sydney, Australia? Use the datetime tool.',
          stopWhen: stepCountIs(3),
          ...getModelParameters(modelValue),
          maxOutputTokens: getMaxOutputTokens(modelValue),
          tools: {
            datetime: tool({
              description: 'Get current date/time for a timezone.',
              inputSchema: z.object({ timezone: z.string().describe('IANA timezone name') }),
              execute: async ({ timezone }) => {
                toolCalled = 'datetime';
                const now = new Date().toLocaleString('en-AU', { timeZone: timezone as string });
                return { datetime: now, timezone };
              },
            }),
          },
        }),
        25_000,
      ),
    );

    const text = result.text?.trim() ?? '';
    const passed = toolCalled != null && text.length > 0;
    return {
      model: modelValue,
      label,
      status: passed ? 'pass' : 'fail',
      responseMs: ms,
      toolCalled,
      preview: truncate(text),
      error: passed ? undefined : toolCalled ? 'Tool called but empty response' : 'Tool was not called',
    };
  } catch (err: any) {
    return {
      model: modelValue,
      label,
      status: 'fail',
      responseMs: 0,
      error: truncate(err?.message ?? String(err)),
    };
  }
}

// ─── Tool runner ──────────────────────────────────────────────────────────────

function checkEnvs(required?: string[]): string | null {
  if (!required || required.length === 0) return null;
  const missing = required.filter((k) => !process.env[k]);
  return missing.length > 0 ? `Missing env: ${missing.join(', ')}` : null;
}

async function runToolTest(test: ToolTest): Promise<ToolTestResult> {
  const missingEnv = checkEnvs(test.requiredEnv);
  if (missingEnv) {
    return { tool: test.tool, status: 'skip', responseMs: 0, skipReason: missingEnv };
  }

  try {
    const { result, ms } = await timed(() => withTimeout(test.run(), 30_000));
    const passed = test.validate ? test.validate(result) : result != null;
    return {
      tool: test.tool,
      status: passed ? 'pass' : 'fail',
      responseMs: ms,
      preview: truncate(JSON.stringify(result)),
      error: passed ? undefined : 'Validation failed — unexpected output shape',
    };
  } catch (err: any) {
    return {
      tool: test.tool,
      status: 'fail',
      responseMs: 0,
      error: truncate(err?.message ?? String(err)),
    };
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  const expectedSecret = serverEnv.ADMIN_EMAIL;
  if (expectedSecret && secret !== expectedSecret && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = req.nextUrl.searchParams.get('scope');
  const itemId = req.nextUrl.searchParams.get('id');

  // ── Per-item retry mode ──────────────────────────────────────────────────────
  if (scope && itemId) {
    if (scope === 'model') {
      const m = models.find((m) => m.value === itemId);
      if (!m) return NextResponse.json({ error: 'Model not found' }, { status: 404 });
      return NextResponse.json({ type: 'model', result: await testModel(m.value, m.label) });
    }
    if (scope === 'stream') {
      const m = models.find((m) => m.value === itemId);
      if (!m) return NextResponse.json({ error: 'Model not found' }, { status: 404 });
      return NextResponse.json({ type: 'stream', result: await testStream(m.value, m.label) });
    }
    if (scope === 'auto') {
      const m = models.find((m) => m.value === itemId);
      if (!m) return NextResponse.json({ error: 'Model not found' }, { status: 404 });
      return NextResponse.json({ type: 'auto', result: await testAutoGroup(m.value, m.label) });
    }
    if (scope === 'tool') {
      const test = buildToolTests().find((t) => t.tool === itemId);
      if (!test) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
      return NextResponse.json({ type: 'tool', result: await runToolTest(test) });
    }
    return NextResponse.json({ error: 'Unknown scope' }, { status: 400 });
  }

  // ── Full test run ────────────────────────────────────────────────────────────
  const globalStart = Date.now();

  const [modelResults, toolResults, autoResults, streamResults] = await Promise.all([
    Promise.all(models.map((m) => testModel(m.value, m.label))),
    Promise.all(buildToolTests().map(runToolTest)),
    Promise.all(models.map((m) => testAutoGroup(m.value, m.label))),
    Promise.all(models.map((m) => testStream(m.value, m.label))),
  ]);

  const report: TestReport = {
    timestamp: new Date().toISOString(),
    models: modelResults,
    tools: toolResults,
    autoGroup: autoResults,
    streams: streamResults,
    summary: {
      modelsPass: modelResults.filter((r) => r.status === 'pass').length,
      modelsFail: modelResults.filter((r) => r.status === 'fail').length,
      modelsSkip: modelResults.filter((r) => r.status === 'skip').length,
      toolsPass: toolResults.filter((r) => r.status === 'pass').length,
      toolsFail: toolResults.filter((r) => r.status === 'fail').length,
      toolsSkip: toolResults.filter((r) => r.status === 'skip').length,
      autoPass: autoResults.filter((r) => r.status === 'pass').length,
      autoFail: autoResults.filter((r) => r.status === 'fail').length,
      autoSkip: autoResults.filter((r) => r.status === 'skip').length,
      streamsPass: streamResults.filter((r) => r.status === 'pass').length,
      streamsFail: streamResults.filter((r) => r.status === 'fail').length,
      totalMs: Date.now() - globalStart,
    },
  };

  return NextResponse.json(report);
}
