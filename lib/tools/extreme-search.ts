import { tool } from 'ai';
import { z } from 'zod';
import type { UIMessageStreamWriter } from 'ai';
import type { ChatMessage } from '../types';

type SearchSource = {
  title: string;
  url: string;
  content: string;
  favicon?: string;
  publishedDate?: string;
  author?: string;
};

function getFavicon(url: string) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?sz=128&domain=${u.hostname}`;
  } catch {
    return undefined;
  }
}

async function parallelSearch(objective: string, queries: string[], maxResults = 20, maxChars = 1200) {
  const key = process.env.PARALLEL_API_KEY || '';
  if (!key) return [] as SearchSource[];
  const body = {
    objective,
    search_queries: queries,
    processor: 'base',
    max_results: Math.min(maxResults, 50),
    max_chars_per_result: maxChars,
  } as any;
  const res = await fetch('https://api.parallel.ai/alpha/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return [] as SearchSource[];
  const json: any = await res.json();
  const items: any[] = json?.results || json?.data || [];
  return items
    .map((r: any) => ({
      title: r.title || r.page_title || r.url || 'Result',
      url: r.url || r.link || '',
      content: r.excerpt || r.content || r.text || '',
      publishedDate: r.published_date || r.date || undefined,
      favicon: getFavicon(r.url || r.link || ''),
    }))
    .filter((x: any) => x.url);
}

async function exaSearch(query: string, opts?: { numResults?: number; includeDomains?: string[] }) {
  const key = process.env.EXA_API_KEY || '';
  if (!key) return [] as SearchSource[];
  const body: any = {
    query,
    numResults: Math.min(opts?.numResults ?? 20, 50),
    useAutoprompt: true,
  };
  if (opts?.includeDomains?.length) body.includeDomains = opts.includeDomains;
  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return [] as SearchSource[];
  const json: any = await res.json();
  const items: any[] = json?.results || [];
  return items
    .map((r: any) => ({
      title: r.title || r.pageTitle || r.url || 'Result',
      url: r.url || '',
      content: r.text || r.excerpt || '',
      publishedDate: r.publishedDate || r.published_date || undefined,
      favicon: getFavicon(r.url || ''),
      author: r.author || undefined,
    }))
    .filter((x: any) => x.url);
}

async function firecrawlRetrieve(url: string) {
  const key = process.env.FIRECRAWL_API_KEY || '';
  if (!key) return null as null | { url: string; title?: string; text?: string };
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
    },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) return null;
  const json: any = await res.json();
  const text = json?.data?.markdown || json?.data?.content || json?.content || '';
  const title = json?.data?.title || json?.title || undefined;
  return { url, title, text };
}

function uniqByUrl(arr: SearchSource[]) {
  const map = new Map<string, SearchSource>();
  for (const s of arr) {
    if (!s.url) continue;
    if (!map.has(s.url)) map.set(s.url, s);
  }
  return Array.from(map.values());
}

export type Research = {
  sources: SearchSource[];
  toolResults: Array<{
    toolName: string;
    args: any;
    result: any;
    toolCallId?: string;
  }>;
  charts?: any[];
};

export function extremeSearchTool(_dataStream: UIMessageStreamWriter<ChatMessage> | undefined) {
  return tool({
    description: 'Extreme research using Parallel (web), Exa (academic & YouTube) and Firecrawl retrieval',
    inputSchema: z.object({ prompt: z.string(), maxSources: z.number().optional() }),
    execute: async ({ prompt, maxSources }) => {
      const writer = _dataStream;
      const PLAN_ID = `plan-${Date.now()}`;
      writer?.write({ type: 'data-extreme_search', data: { kind: 'plan', status: { title: 'Initializing research' }, plan: [
        { title: 'Web search (Parallel)', todos: ['Form queries', 'Collect top results'] },
        { title: 'Academic (Exa)', todos: ['Find papers and sources'] },
        { title: 'YouTube (Exa)', todos: ['Find videos and timestamps if present'] },
        { title: 'Retrieve page content (Firecrawl)', todos: ['Read full text for top sources'] },
      ] } });

      const totalCap = Math.min(Math.max(Number(maxSources || 300), 20), 300);

      const queriesWeb = [prompt, `${prompt} latest`, `${prompt} overview`, `${prompt} key facts`];
      const queryIdWeb = `q-web-${Date.now()}`;
      writer?.write({ type: 'data-extreme_search', data: { kind: 'query', queryId: queryIdWeb, query: queriesWeb[0], status: 'started' } });
      const webResults = await parallelSearch(prompt, queriesWeb, Math.min(60, totalCap));
      const webSources = webResults.slice(0, Math.min(60, totalCap));
      for (const s of webSources.slice(0, 20)) {
        writer?.write({ type: 'data-extreme_search', data: { kind: 'source', queryId: queryIdWeb, source: { title: s.title, url: s.url, favicon: s.favicon } } });
      }
      writer?.write({ type: 'data-extreme_search', data: { kind: 'query', queryId: queryIdWeb, query: queriesWeb[0], status: 'completed' } });

      const academicDomains = ['arxiv.org', 'nature.com', 'sciencedirect.com', 'springer.com', 'ieee.org', 'acm.org', 'openaccess.thecvf.com'];
      const queryIdAcad = `q-acad-${Date.now()}`;
      writer?.write({ type: 'data-extreme_search', data: { kind: 'query', queryId: queryIdAcad, query: `${prompt} academic research`, status: 'started' } });
      const acadResults = await exaSearch(`${prompt} academic research`, { numResults: 40, includeDomains: academicDomains });
      for (const s of acadResults.slice(0, 20)) {
        writer?.write({ type: 'data-extreme_search', data: { kind: 'source', queryId: queryIdAcad, source: { title: s.title, url: s.url, favicon: s.favicon } } });
      }
      writer?.write({ type: 'data-extreme_search', data: { kind: 'query', queryId: queryIdAcad, query: `${prompt} academic research`, status: 'completed' } });

      const queryIdYt = `q-yt-${Date.now()}`;
      writer?.write({ type: 'data-extreme_search', data: { kind: 'query', queryId: queryIdYt, query: `${prompt} site:youtube.com`, status: 'started' } });
      const ytResults = await exaSearch(prompt, { numResults: 30, includeDomains: ['youtube.com', 'youtu.be'] });
      for (const s of ytResults.slice(0, 15)) {
        writer?.write({ type: 'data-extreme_search', data: { kind: 'source', queryId: queryIdYt, source: { title: s.title, url: s.url, favicon: s.favicon } } });
      }
      writer?.write({ type: 'data-extreme_search', data: { kind: 'query', queryId: queryIdYt, query: `${prompt} site:youtube.com`, status: 'completed' } });

      let aggregated = uniqByUrl([...webSources, ...acadResults, ...ytResults]).slice(0, totalCap);

      const toRetrieve = aggregated.filter((s) => !s.content || s.content.length < 200).slice(0, 25);
      for (const s of toRetrieve) {
        writer?.write({ type: 'data-extreme_search', data: { kind: 'query', queryId: `read-${s.url}`, query: s.url, status: 'reading_content' } });
        try {
          const fetched = await firecrawlRetrieve(s.url);
          if (fetched?.text) {
            s.content = fetched.text;
            writer?.write({ type: 'data-extreme_search', data: { kind: 'content', queryId: queryIdWeb, content: { title: s.title, url: s.url, text: fetched.text.slice(0, 2000), favicon: s.favicon } } });
          }
        } catch {}
      }

      aggregated = uniqByUrl(aggregated).slice(0, totalCap);

      const research: Research = {
        sources: aggregated,
        toolResults: [
          { toolName: 'webSearch', args: { queries: queriesWeb }, result: webSources },
          { toolName: 'academicSearch', args: { provider: 'exa', query: `${prompt} academic research` }, result: acadResults },
          { toolName: 'youtubeSearch', args: { provider: 'exa', query: prompt }, result: ytResults },
        ],
      };

      writer?.write({ type: 'data-extreme_search', data: { kind: 'plan', status: { title: 'Research completed' } } });

      return { research };
    },
  });
}
