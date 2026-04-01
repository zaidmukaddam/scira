/**
 * When a tool throws or times out, run web_search with a derived query so the user
 * still gets content instead of an empty assistant message or a hard tool error.
 */

import { WEB_SEARCH_DEFAULT_MAX_RESULTS_PER_QUERY } from '@/lib/tools/web-search';

const DEFAULT_TOOL_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let id: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    id = setTimeout(() => reject(new Error(`tool_timeout_after_${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (id !== undefined) clearTimeout(id);
  }) as Promise<T>;
}

/** Build a single web search query from the failed tool name + arguments. */
export function buildWebSearchFallbackQuery(toolName: string, args: unknown): string {
  const yr = new Date().getFullYear();
  try {
    const a =
      args && typeof args === 'object' ? (args as Record<string, unknown>) : {};
    switch (toolName) {
      case 'get_weather_data':
        return `current weather and forecast ${String(a.location ?? '')}`;
      case 'stock_price':
        return `${String(a.symbol ?? a.ticker ?? '')} stock price ${yr}`;
      case 'stock_chart_simple':
        return `stock chart ${String(a.companies ?? '')} ${String(a.time_period ?? '')}`;
      case 'movie_or_tv_search':
        return `movie or TV show ${String(a.query ?? '')}`;
      case 'find_place_on_map':
        return `map location ${String(a.query ?? '')}`;
      case 'nearby_places_search':
        return `${String(a.type ?? 'places')} near ${String(a.location ?? '')}`;
      case 'retrieve':
        return `summary ${String(a.url ?? '')}`;
      case 'extreme_search':
        return String(a.prompt ?? '');
      case 'text_translate':
        return `translate to ${String(a.to ?? '')}: ${String(a.text ?? '').slice(0, 200)}`;
      case 'currency_converter':
        return `${a.amount} ${a.from} to ${a.to} exchange rate`;
      case 'youtube_search':
        return String(a.query ?? 'youtube');
      case 'academic_search':
        return String(a.query ?? 'research');
      case 'x_search':
        return String(a.query ?? 'twitter x');
      case 'reddit_search':
        return String(a.query ?? 'reddit');
      case 'mcp_search':
        return String(a.query ?? '');
      case 'trove_search':
        return String(a.query ?? 'trove');
      case 'travel_advisor':
        return String(a.destination ?? a.query ?? 'travel');
      case 'rag_search':
        return String(a.query ?? '');
      case 'flight_tracker':
      case 'flight_live_tracker':
        return [a.flight, a.callsign, a.icao24].filter(Boolean).join(' ') || `flight ${yr}`;
      case 'code_interpreter':
        return `python calculation ${String(a.title ?? '')}`;
      case 'generate_document':
        return String(a.title ?? 'document');
      default:
        break;
    }
    const s = JSON.stringify(args);
    if (s && s !== '{}' && s.length < 800) return `${toolName}: ${s}`;
    return `${toolName} latest information ${yr}`;
  } catch {
    return `${toolName} ${yr}`;
  }
}

type Toolish = {
  execute?: (input: unknown, options?: unknown) => Promise<unknown> | unknown;
};

/** Run web_search with the same payload shape as the main tool. */
export async function runWebSearchFallbackExecute(
  webSearchToolInstance: Toolish,
  query: string,
): Promise<unknown> {
  const exec = webSearchToolInstance.execute;
  if (!exec) {
    return minimalFallbackPayload(query, 'web_search had no execute');
  }
  try {
    return await exec({
      queries: [query],
      topics: ['general'],
      maxResults: [WEB_SEARCH_DEFAULT_MAX_RESULTS_PER_QUERY],
      quality: ['default'],
    });
  } catch (err) {
    console.error('[search] web_search fallback execution failed', err);
    return minimalFallbackPayload(
      query,
      err instanceof Error ? err.message : String(err),
    );
  }
}

function minimalFallbackPayload(query: string, reason: string) {
  return {
    searches: [
      {
        query,
        results: [
          {
            url: '',
            title: 'Could not load live data',
            content: `Something went wrong (${reason}). Please try again in a moment.`,
          },
        ],
        images: [] as { url: string; description: string }[],
      },
    ],
  };
}

const SKIP_FALLBACK = new Set(['web_search']);

/**
 * Wrap every tool's execute (except web_search): on failure or timeout, run web_search.
 *
 * IMPORTANT: We only replace the `execute` function, never the top-level tool object itself.
 * The AI SDK reads `inputSchema`, `description`, etc. directly from the tool object reference
 * that is registered in the `tools` map. If we spread the tool into a plain object we lose
 * the prototype chain and any non-enumerable properties the SDK relies on. So we mutate
 * only the `execute` property in-place.
 */
export function wrapToolsWithWebSearchFallback<T extends Record<string, Toolish>>(
  tools: T,
  options: {
    enabled: boolean;
    webSearchToolInstance: Toolish;
    timeoutMs?: number;
  },
): T {
  if (!options.enabled) {
    return tools;
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TOOL_TIMEOUT_MS;

  for (const name of Object.keys(tools)) {
    if (SKIP_FALLBACK.has(name)) continue;
    const t = tools[name as keyof T];
    if (!t?.execute) continue;

    const original = t.execute.bind(t);
    // Mutate only `execute` — leave all other properties (inputSchema, description, etc.) intact.
    t.execute = async (input: unknown, execOptions?: unknown) => {
      try {
        const p = Promise.resolve(original(input, execOptions));
        return await withTimeout(p, timeoutMs);
      } catch (err) {
        const q = buildWebSearchFallbackQuery(name, input);
        console.warn(`[search] tool "${name}" failed or timed out; falling back to web_search`, err);
        return runWebSearchFallbackExecute(options.webSearchToolInstance, q);
      }
    };
  }

  return tools;
}
