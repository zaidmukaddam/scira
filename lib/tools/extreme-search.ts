// extremeSearch(researchPrompt)
// --> Plan research using LLM to generate a structured research plan
// ----> Break research into components with discrete search queries
// ----> For each search query, search web and collect sources
// ----> Use structured source collection to provide comprehensive research results
// ----> Return all collected sources and research data to the user

import Exa from 'exa-js';
import { Daytona } from '@daytonaio/sdk';
import { Output, generateText, hasToolCall, stepCountIs, tool } from 'ai';
import type { UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import { serverEnv } from '@/env/server';
import { scira } from '@/ai/providers';
import { ChatMessage } from '../types';
import FirecrawlApp from '@mendable/firecrawl-js';
import { getTweet } from 'react-tweet/api';
import { all } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';
import { xai } from '@ai-sdk/xai';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '@/lib/r2';
import { nanoid } from 'nanoid';
import { VectorStoreIndex, BaseRetriever } from '@vectorstores/core';
import { PDFReader } from '@vectorstores/readers/pdf';
import { CSVReader } from '@vectorstores/readers/csv';
import { DocxReader } from '@vectorstores/readers/docx';
import { ExcelReader } from '@vectorstores/excel';
import { vercelEmbedding } from '@vectorstores/vercel';
import { cohere } from '@ai-sdk/cohere';
import { rerank } from 'ai';
import { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import { AnthropicProviderOptions } from '@ai-sdk/anthropic';
import { SNAPSHOT_NAME } from '../constants';
import { gateway, GatewayProviderOptions } from '@ai-sdk/gateway';
import { GoogleGenerativeAIProviderOptions, GoogleLanguageModelOptions } from '@ai-sdk/google';
import { TokenClient } from 'tokenc';
import { scrapeWebpageWithNotte } from '@/lib/notte';

const ttc = new TokenClient({ apiKey: process.env.TTC_API_KEY! });

interface CitationSource {
  sourceType?: string;
  url?: string;
}

const pythonLibsAvailable = [
  'numpy',
  'pandas',
  'matplotlib',
  'scipy',
  'scikit-learn',
  'yfinance',
  'requests',
  'uv',
  'seaborn',
  'plotly',
  'sympy',
  'pydantic',
  'regex',
  'PyPDF2',
  'pdfplumber',
  'pymupdf',
  'tabula-py',
  'httpx',
  'aiohttp',
  'urllib3',
  'beautifulsoup4',
  'lxml',
  'scrapy',
  'selenium',
];

// File query search helpers
const FILE_READERS = {
  'application/pdf': () => new PDFReader(),
  'text/csv': () => new CSVReader(),
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': () => new DocxReader(),
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': () =>
    new ExcelReader({ sheetSpecifier: 0, concatRows: true, fieldSeparator: ',', keyValueSeparator: ':' }),
  'application/vnd.ms-excel': () =>
    new ExcelReader({ sheetSpecifier: 0, concatRows: true, fieldSeparator: ',', keyValueSeparator: ':' }),
} as const;

type SupportedMimeType = keyof typeof FILE_READERS;

function isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
  return mimeType in FILE_READERS;
}

interface FileQueryResult {
  fileName: string;
  content: string;
  score: number;
}

interface ChartArtifact {
  png?: string;
  url?: string;
  title?: string;
  [key: string]: unknown;
}

async function createFileRetriever(file: { url: string; contentType: string; name?: string }): Promise<BaseRetriever> {
  const mimeType = file.contentType;
  if (!isSupportedMimeType(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  const response = await fetch(file.url);
  if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);

  const content = new Uint8Array(await response.arrayBuffer());
  const reader = FILE_READERS[mimeType]();
  const documents = await reader.loadDataAsContent(content);

  const index = await VectorStoreIndex.fromDocuments(documents, {
    embedFunc: vercelEmbedding(cohere.embedding('embed-v4.0')),
  });

  return index.asRetriever({ similarityTopK: 10 });
}

async function buildFileRetrievers(files: { url: string; contentType: string; name?: string }[]) {
  const retrieversByUrl = new Map<string, BaseRetriever>();

  await all(
    Object.fromEntries(
      files.map((file, index) => [
        `file:${index}`,
        async () => {
          try {
            const retriever = await createFileRetriever(file);
            retrieversByUrl.set(file.url, retriever);
          } catch (error) {
            console.error(`Error indexing file ${file.name}:`, error);
          }
        },
      ]),
    ),
    getBetterAllOptions(),
  );

  return retrieversByUrl;
}

async function searchFilesForQuery(
  query: string,
  files: { url: string; contentType: string; name?: string }[],
  retrieversByUrl: Map<string, BaseRetriever>,
  maxResults: number = 5,
  shouldRerank: boolean = false,
): Promise<FileQueryResult[]> {
  const allResults: FileQueryResult[] = [];

  await all(
    Object.fromEntries(
      files.map((file, index) => [
        `file:${index}`,
        async () => {
          const retriever = retrieversByUrl.get(file.url);
          if (!retriever) return;

          try {
            const nodes = await retriever.retrieve({ query });
            for (const nodeWithScore of nodes) {
              const node = nodeWithScore.node as any;
              allResults.push({
                fileName: file.name || new URL(file.url).pathname.split('/').pop() || 'unknown',
                content: node.text || node.getContent?.() || '',
                score: nodeWithScore.score || 0,
              });
            }
          } catch (error) {
            console.error(`Error searching file ${file.name}:`, error);
          }
        },
      ]),
    ),
    getBetterAllOptions(),
  );

  if (shouldRerank && allResults.length > 0) {
    const { ranking } = await rerank({
      model: cohere.reranking('rerank-v4.0-pro'),
      query,
      documents: allResults.map((r) => r.content),
      topN: maxResults,
    });

    return ranking.map((r) => ({
      ...allResults[r.originalIndex],
      score: r.score,
    }));
  }

  allResults.sort((a, b) => b.score - a.score);
  return allResults.slice(0, maxResults);
}

const daytona = new Daytona({
  apiKey: serverEnv.DAYTONA_API_KEY,
  target: 'us',
});

const runCode = async (code: string, installLibs: string[] = []) => {
  const sandbox = await daytona.create({
    snapshot: SNAPSHOT_NAME,
  });

  if (installLibs.length > 0) {
    console.log('Installing missing libs:', installLibs);
    await sandbox.process.executeCommand(`pip install ${installLibs.join(' ')}`, undefined, undefined, 60);
  }

  const result = await sandbox.process.codeRun(code);
  sandbox.delete().catch(() => {}); // cleanup in background
  return result;
};

// Content extraction provider strategies
interface ContentExtractionStrategy {
  getContents(links: string[]): Promise<SearchResult[]>;
}

interface MetadataSciraResponse {
  url?: string;
  canonical?: string;
  ogUrl?: string;
  title?: string;
  description?: string;
  siteName?: string | null;
  image?: string;
  favicon?: string;
  finalUrl?: string;
}

function isHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function buildMetadataFallbackContent(params: {
  title: string;
  description?: string;
  canonical?: string;
  finalUrl?: string;
}) {
  const description = (params.description || '').trim();
  const parts = [params.title.trim(), description].filter(Boolean);

  if (params.canonical && params.canonical !== params.finalUrl) parts.push(`Canonical: ${params.canonical}`);
  if (params.finalUrl) parts.push(`Final URL: ${params.finalUrl}`);

  const content = parts.join('\n\n').trim();
  return content || params.title.trim();
}

function getHostnameForUrl(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function inferTitleFromMarkdown(markdown: string, fallback: string) {
  const lines = markdown
    .split('\n')
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .filter(Boolean);

  const title = lines.find((line) => line.length > 3 && line.length <= 140);
  return title || fallback;
}

async function getMetadataFallbackResults(urls: string[], logPrefix: string): Promise<SearchResult[]> {
  const uniqueUrls = Array.from(new Set(urls)).filter(isHttpUrl);
  if (uniqueUrls.length === 0) return [];

  console.log(`[${logPrefix}] Using metadata.scira.app fallback for ${uniqueUrls.length} URLs:`, uniqueUrls);

  const metadataResults = await all(
    Object.fromEntries(
      uniqueUrls.map((url, index) => [
        `md:${index}`,
        async () => {
          try {
            const endpoint = new URL('https://metadata.scira.app/');
            endpoint.searchParams.set('url', url);

            const response = await fetch(endpoint.toString(), { method: 'GET' });
            if (!response.ok) {
              console.error(
                `[${logPrefix}] metadata.scira.app failed for ${url}:`,
                response.status,
                response.statusText,
              );
              return null;
            }

            const data = (await response.json()) as MetadataSciraResponse;
            const parsedUrl = new URL(url);

            const title =
              (data.title || '').trim() || parsedUrl.hostname || url.split('/').pop() || 'Retrieved Content';
            const content = buildMetadataFallbackContent({
              title,
              description: data.description,
              canonical: data.canonical,
              finalUrl: data.finalUrl,
            }).slice(0, 3000);

            const favicon = data.favicon || `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=128`;

            return {
              title,
              url,
              content,
              publishedDate: '',
              favicon,
              description: data.description,
              canonical: data.canonical,
              ogUrl: data.ogUrl,
              finalUrl: data.finalUrl,
              siteName: data.siteName,
              image: data.image,
            } satisfies SearchResult;
          } catch (error) {
            console.error(`[${logPrefix}] metadata.scira.app error for ${url}:`, error);
            return null;
          }
        },
      ]),
    ),
    getBetterAllOptions(),
  );

  const results: SearchResult[] = [];
  for (const key of Object.keys(metadataResults)) {
    const result = metadataResults[key];
    if (result) results.push(result);
  }

  return results;
}

// Exa content extraction strategy
class ExaContentStrategy implements ContentExtractionStrategy {
  constructor(
    private exa: Exa,
    private firecrawl: FirecrawlApp,
  ) {}

  async getContents(links: string[]): Promise<SearchResult[]> {
    console.log(`[Exa] getContents called with ${links.length} URLs:`, links);
    const results: SearchResult[] = [];
    const failedUrls: string[] = [];

    // First, try Exa for all URLs
    try {
      const result = await this.exa.getContents(links, {
        text: {
          maxCharacters: 3000,
          includeHtmlTags: false,
        },
        livecrawl: 'preferred',
      });
      console.log(`[Exa] getContents received ${result.results.length} results from Exa API`);

      // Process Exa results
      for (const r of result.results) {
        if (r.text && r.text.trim()) {
          results.push({
            title: r.title || r.url.split('/').pop() || 'Retrieved Content',
            url: r.url,
            content: r.text,
            publishedDate: r.publishedDate || '',
            favicon: r.favicon || `https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=128`,
          });
        } else {
          // Add URLs with no content to failed list for Firecrawl fallback
          failedUrls.push(r.url);
        }
      }

      // Add any URLs that weren't returned by Exa to the failed list
      const exaUrls = result.results.map((r) => r.url);
      const missingUrls = links.filter((url) => !exaUrls.includes(url));
      failedUrls.push(...missingUrls);
    } catch (error) {
      console.error('[Exa] API error:', error);
      console.log('[Exa] Adding all URLs to Firecrawl fallback list');
      failedUrls.push(...links);
    }

    // Use Firecrawl as fallback for failed URLs - parallelize scraping
    if (failedUrls.length > 0) {
      console.log(`[Exa] Using Firecrawl fallback for ${failedUrls.length} URLs:`, failedUrls);

      const firecrawlResults = await all(
        Object.fromEntries(
          failedUrls.map((url, index) => [
            `fc:${index}`,
            async () => {
              try {
                const scrapeResponse = await this.firecrawl.scrape(url, {
                  formats: ['markdown'],
                  proxy: 'auto',
                  storeInCache: true,
                  parsers: ['pdf'],
                });

                if (scrapeResponse.markdown) {
                  console.log(`[Exa] Firecrawl successfully scraped ${url}`);
                  return {
                    title: scrapeResponse.metadata?.title || url.split('/').pop() || 'Retrieved Content',
                    url: url,
                    content: scrapeResponse.markdown.slice(0, 3000),
                    publishedDate: (scrapeResponse.metadata?.publishedDate as string) || '',
                    favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`,
                  };
                }
                console.error(`[Exa] Firecrawl failed for ${url}:`, scrapeResponse);
                return null;
              } catch (firecrawlError) {
                console.error(`[Exa] Firecrawl error for ${url}:`, firecrawlError);
                return null;
              }
            },
          ]),
        ),
        getBetterAllOptions(),
      );

      // Collect successful results
      for (const key of Object.keys(firecrawlResults)) {
        const result = firecrawlResults[key];
        if (result) {
          results.push(result);
        }
      }
    }

    const resolvedUrls = new Set(results.map((r) => r.url));
    const missingUrls = links.filter((url) => !resolvedUrls.has(url));
    if (missingUrls.length > 0) {
      const metadataFallback = await getMetadataFallbackResults(missingUrls, 'Exa');
      results.push(...metadataFallback);
    }

    console.log(`[Exa] getContents returning ${results.length} total results`);
    return results;
  }
}

interface SearchResult {
  title: string;
  url: string;
  content: string;
  publishedDate: string;
  favicon: string;
  description?: string;
  canonical?: string;
  ogUrl?: string;
  finalUrl?: string;
  siteName?: string | null;
  image?: string;
}

export type Research = {
  // text: string;
  toolResults: any[];
  sources: SearchResult[];
  charts: any[];
};

enum SearchCategory {
  NEWS = 'news',
  COMPANY = 'company',
  RESEARCH_PAPER = 'research paper',
  GITHUB = 'github',
  FINANCIAL_REPORT = 'financial report',
}

// Search provider strategy interface
interface SearchProviderStrategy {
  search(
    query: string,
    category?: SearchCategory,
    include_domains?: string[],
    startDate?: string,
  ): Promise<SearchResult[]>;
}

// Exa search strategy
class ExaSearchStrategy implements SearchProviderStrategy {
  constructor(private exa: Exa) {}

  async search(
    query: string,
    category?: SearchCategory,
    include_domains?: string[],
    startDate?: string,
  ): Promise<SearchResult[]> {
    console.log(`[Exa] searchWeb called with query: "${query}", category: ${category}, startDate: ${startDate}`);
    try {
      // Format dates for Exa (ISO format)
      const startPublishedDate = startDate ? new Date(startDate).toISOString() : undefined;
      const endPublishedDate = startDate ? new Date().toISOString() : undefined;

      // Valid Exa categories (matching the Exa API type)
      type ExaCategory =
        | 'news'
        | 'company'
        | 'research paper'
        | 'financial report'
        | 'pdf'
        | 'tweet'
        | 'personal site'
        | 'people';
      const validExaCategories: ExaCategory[] = [
        'news',
        'company',
        'research paper',
        'financial report',
        'pdf',
        'tweet',
        'personal site',
        'people',
      ];
      const exaCategory =
        category && validExaCategories.includes(category as ExaCategory) ? (category as ExaCategory) : undefined;

      const { results } = await this.exa.search(query, {
        numResults: 8,
        type: 'auto',
        ...(exaCategory && { category: exaCategory }),
        ...(include_domains && { include_domains }),
        ...(startPublishedDate && { startPublishedDate }),
        ...(endPublishedDate && { endPublishedDate }),
      });
      console.log(`[Exa] searchWeb received ${results.length} results from Exa API`);

      const mappedResults = results.map((r) => ({
        title: r.title || '',
        url: r.url,
        content: '',
        publishedDate: r.publishedDate || '',
        favicon: r.favicon || `https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=128`,
      })) as SearchResult[];

      console.log(`[Exa] searchWeb returning ${mappedResults.length} results`);
      return mappedResults;
    } catch (error) {
      console.error('[Exa] Error in searchWeb:', error);
      return [];
    }
  }
}

interface FileContext {
  url: string;
  contentType: string;
  name?: string;
}

async function extremeSearch(
  prompt: string,
  dataStream: UIMessageStreamWriter<ChatMessage> | undefined,
  files: FileContext[] = [],
  modelId:
    | 'scira-ext-1'
    | 'scira-ext-2'
    | 'scira-ext-4'
    | 'scira-ext-5'
    | 'scira-ext-6'
    | 'scira-ext-7'
    | 'scira-ext-8' = 'scira-ext-1',
  _mcpDynamicTools: Record<string, any> = {},
): Promise<Research> {
  const allSources: SearchResult[] = [];

  // Initialize clients
  const exa = new Exa(serverEnv.EXA_API_KEY);
  const firecrawl = new FirecrawlApp({ apiKey: serverEnv.FIRECRAWL_API_KEY });

  const searchStrategy: SearchProviderStrategy = new ExaSearchStrategy(exa);
  const contentStrategy: ContentExtractionStrategy = new ExaContentStrategy(exa, firecrawl);

  console.log('[ExtremeSearch] Using Exa as search and content extraction provider');

  // Filter supported files early for planner and later file indexing
  const supportedFiles = files.filter((f) => isSupportedMimeType(f.contentType));
  const fileNames = supportedFiles.map((f) => f.name || 'unnamed file').join(', ');
  const hasFilesForPlanning = supportedFiles.length > 0;

  if (dataStream) {
    dataStream.write({
      type: 'data-extreme_search',
      data: {
        kind: 'plan',
        status: { title: 'Planning research' },
      },
    });
  }

  // plan out the research

  const { output: result } = await generateText({
    model: scira.languageModel('scira-ext-1'),
    output: Output.object({
      schema: z.object({
        plan: z
          .array(
            z.object({
              title: z.string().min(10).max(70).describe('A title for the research topic'),
              todos: z.array(z.string()).min(3).max(5).describe('A list of what to research for the given title'),
            }),
          )
          .min(1)
          .max(5),
      }),
    }),
    prompt: `
Plan out the research for the following topic: ${prompt}.

Today's Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}
${
  hasFilesForPlanning
    ? `
Available Files: ${fileNames}
- The user has uploaded document files that can be searched using the fileQuery tool
- Include steps to search these files for relevant information when appropriate
- File search uses semantic search to find relevant content from the documents
`
    : ''
}
Plan Guidelines:
- Break down the topic into key aspects to research
- Generate specific, diverse search queries for each aspect
- The research agent has up to 75 steps and will judge when it has sufficient coverage
- Follow up with more specific queries as you learn more
- IMPORTANT: Alternate between thinking and tool steps (thinking → tool → thinking → tool...)
- Start with a thinking step, then a tool call, then thinking to analyze, etc.
- Each webSearch step should use multi-query (3-5 queries) when possible
- No need to synthesize your findings into a comprehensive response, just return the results
- The plan should be concise and to the point, no more than 10 items
- Keep the titles concise and to the point, no more than 70 characters
- The user query may indicate a need for a specific tool, include it explicitly in the plan

Tool selection guidance:
- webSearch: default for most research — broad queries, news, research papers, company info
- browsePage: use when you have SPECIFIC URLs to read in full (official docs, blog posts, release notes, product pages, changelogs, GitHub READMEs, any URL the user provides). Plan explicit browsePage steps with the target URLs whenever the research involves reading specific pages. browsePage retrieves full rendered page content including JS-rendered text.
- xSearch: real-time X/Twitter discussions, public opinion, breaking news, social media reactions
- codeRunner: data analysis, math calculations, visualizations explicitly requested
- fileQuery: search uploaded documents${hasFilesForPlanning ? ' (files available: ' + fileNames + ')' : ''}

When to include browsePage in the plan (be proactive):
- User mentions a specific URL or website to read → always include a browsePage step for that URL
- Research involves official announcements, release notes, changelogs, or docs → plan a browsePage step to read the source page directly
- Topic requires reading full article/blog post content (not just search snippets) → plan browsePage
- webSearch results are likely to be thin or paywalled → plan browsePage as a follow-up

${hasFilesForPlanning ? '- Include file search steps when the uploaded files are relevant to the research topic\n' : ''}- Note: The research agent will call the done tool automatically after using most of the 75 available steps - do not include it in the plan
- Make the plan technical and specific to the topic`,
  });

  console.log(result.plan);

  const plan = result.plan;

  // calculate the total number of todos
  const totalTodos = plan.reduce((acc, curr) => acc + curr.todos.length, 0);
  console.log(`Total todos: ${totalTodos}`);

  if (dataStream) {
    dataStream.write({
      type: 'data-extreme_search',
      data: {
        kind: 'plan',
        status: { title: 'Research plan ready, starting up research agent' },
        plan,
      },
    });
  }

  let toolResults: any[] = [];

  // Index files for file query search if available
  let fileRetrievers = new Map<string, BaseRetriever>();

  if (supportedFiles.length > 0) {
    console.log(`[ExtremeSearch] Indexing ${supportedFiles.length} files for file query search`);
    fileRetrievers = await buildFileRetrievers(supportedFiles);
  }

  const hasFiles = supportedFiles.length > 0 && fileRetrievers.size > 0;
  const baseActiveTools = hasFiles
    ? ['codeRunner', 'webSearch', 'browsePage', 'xSearch', 'thinking', 'fileQuery', 'done']
    : ['codeRunner', 'webSearch', 'browsePage', 'xSearch', 'thinking', 'done'];

  // Create the autonomous research agent with tools
  const { text: _ } = await generateText({
    model: scira.languageModel(modelId),
    stopWhen: [stepCountIs(75), hasToolCall('done')],
    activeTools: baseActiveTools as any,
    maxRetries: 10,
    system: `
You are an autonomous deep research analyst. Your goal run a focused research plan thoroughly with the given tools.

### ⚠️ HOW TO CONCLUDE RESEARCH — READ FIRST
You MUST end every research run by calling the **done** tool. There is no other way to finish.
- Stopping without calling done breaks the UI and is a critical failure.
- When you have gathered enough information to fully answer the question, your final action MUST be: call the done tool with a brief summary.
- Never return plain text instead of calling done. Never assume the run is "finished" without calling done.

Today's Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}.

### PRIMARY FOCUS: DEEP INFORMATION GATHERING
Your main job is to gather comprehensive, accurate and complete information using ALL tools available — webSearch, browsePage, xSearch, fileQuery, and codeRunner.
The research should be complete and thorough, do not stop until you have all the information asked for by the user!
Even if the user asks for a specific topic, you should still gather information from multiple sources and angles to ensure you have a complete understanding of the topic.

⚠️ DATE AWARENESS — CRITICAL:
- Today is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}
- You have a training knowledge cutoff — TREAT EVERYTHING IN YOUR MEMORY AS POTENTIALLY OUTDATED OR WRONG
- NEVER state facts, figures, prices, versions, events, or statuses from your own memory — always verify via tools
- Always search for the CURRENT state of things. If something may have changed since your training, search for it
- Use today's date as a reference point for all searches — prefer results published recently
- If a search returns old results, explicitly search for newer data using the startDate parameter

Go deep in the search for information — gather enough to confidently and completely answer the user's question from multiple angles and sources.
Cross-verify important claims. Do NOT rely on a single source.
YOUR KNOWLEDGE BASE IS ZERO — treat it as such. Every fact must come from the tools.

⚠️ IMP: You have up to 75 steps — use as many as needed to get comprehensive, high-quality results. Do NOT stop prematurely.
⚠️ IMP: DO NOT RUN PARALLEL TOOL CALLS FOR SEARCHING!
⚠️ IMP: CONCLUDE BY CALLING done — You MUST call the done tool to end research. Stopping without calling done breaks the UI and is never acceptable. Your last step when research is complete must always be: call done with a short summary.

For searching:
- PRIORITIZE SEARCH OVER CODE - Search first, search often, search comprehensively
- SEARCH FOR ALL THE INFORMATION YOU CAN GET FROM THE TOOLS YOU HAVE AVAILABLE! DO NOT MISS ANYTHING! THIS IS THE MOST IMPORTANT RULE!
- Do not run all search tool calls at once, run them one by one, wait for the results before running the next call
- When calling webSearch, always provide 3-5 queries in the queries array
- Make 3-5 targeted searches per research topic to get different angles and perspectives
- After initial searches, assess: do you have enough depth? If not, continue with follow-up searches for alternative perspectives, recent updates, or expert opinions
- Search queries should be specific and focused, 5-15 words maximum
- You can use include domains to filter results by specific websites or sources
- Use startDate parameter (YYYY-MM-DD format) to filter results by publication date — always anchor to today's date when searching for current info, prices, versions, or events
- If a topic is time-sensitive (prices, news, software versions, company info, etc.), always set startDate to a recent date to avoid stale results
- Vary your search approaches: broad overview → specific details → recent developments → expert opinions
- Use different categories strategically: news, research papers, company info, financial reports, github
- Use X search for real-time discussions, public opinion, breaking news, and social media trends
- Follow up initial searches with more targeted queries based on what you learn
- Cross-verify information by searching for the same topic from different angles
- Do not use the same query twice to avoid duplicates
- Add more searches if needed to get the most information after the initial searches
- Search for contradictory information to get balanced perspectives
- Include exact metrics, dates, technical terms, and proper nouns in queries
- Make searches progressively more specific as you gather context
- Search for recent developments, trends, and updates on topics
- Always verify information with multiple searches from different sources
- Do not use any operators like OR, AND, NOT, etc. in the queries, just do plain text queries
- NEVER use Google dork syntax (site:, intitle:, filetype:, inurl:, etc.) - these degrade search quality significantly
- Write queries as natural language phrases, not search engine commands

For X search:
- The X search tool uses native X API to search for recent information and discussions on X (formerly Twitter)
- When calling xSearch, always provide 3-5 queries in the queries array
- The queries parameter contains search queries - make each query specific and focused, avoid hashtags or non-search terms
- If the user gives you a link to a post, use that link directly as the query
- Use the startDate and endDate parameters to limit the date range (YYYY-MM-DD format, defaults to last 15 days)
- Use includeXHandles to filter results to specific X handles (max 10), cannot be used with excludeXHandles
- Use excludeXHandles to exclude specific X handles from results (max 10), cannot be used with includeXHandles
- Do not use any operators like OR, AND, NOT, from:, to:, etc. in the queries - just do plain text queries
- NEVER use Google dork or Twitter search syntax (site:, from:, to:, filter:, lang:, etc.) - these degrade search quality
- Write queries as natural conversational phrases, not search engine commands

### TOOL STRATEGY EXAMPLES:
- Topic: "AI model performance" → webSearch: "GPT-4 benchmark results 2025", then browsePage the official model card or blog post URL for full specs
- Topic: "Company financials" → webSearch: "Tesla Q3 2025 earnings report", then browsePage the investor relations page for full numbers
- Topic: "Technical implementation" → webSearch: "React Server Components best practices", then browsePage the official docs URL for complete reference
- Topic: "New product/release announcement" → webSearch to find the announcement URL, then browsePage that URL for the full content
- Topic: "Public opinion on topic" → X Search: "GPT-4 user reactions", "Tesla stock price discussions"
- Topic: "Breaking news or events" → X Search: "OpenAI latest announcements", then browsePage the linked article for full story
- Topic: "GitHub project or library" → webSearch to find the repo, then browsePage the README or docs URL directly

### WHEN TO USE browsePage (be proactive, not reluctant):
- You found a URL in webSearch results that you want to read in full → browsePage it
- The plan mentions a specific website, blog, docs page, or URL → browsePage it immediately
- webSearch snippets are cut off or don't have enough detail → browsePage the source URL
- The topic involves official announcements, release notes, changelogs, or product pages → browsePage the official source
- A source URL looks authoritative (company blog, official docs, GitHub) → browsePage it for full content
- User provides or mentions a URL → ALWAYS browsePage it


Only use codeRunner when the plan specifically requests it:
- You need to process or analyze data that was found through searches
- Mathematical calculations are required that cannot be found through search
- Creating visualizations of data trends that were discovered through research
- The research plan specifically requests data analysis or calculations or visualizations
- STRICTLY create only ONE chart per code execution. Never create multiple charts in a single run. If you need more charts, use separate codeRunner calls — one chart per call.
- Do not use code for absurd or silly questions or topics, only use code when it is absolutely necessary and relevant to the research topic or if the user query indicates a need for a specific tool
- The codeRunner is strictly for DATA PROCESSING, ANALYSIS, and VISUALIZATION — NOT for web scraping or fetching content. Use webSearch/xSearch tools for gathering information. NEVER use requests, httpx, aiohttp, beautifulsoup4, scrapy, selenium, or any HTTP/scraping library to fetch web pages or APIs in codeRunner unless it is an absolute last resort and no other tool can get the data.

Code guidelines (when absolutely necessary):
- Keep code simple and focused on the specific calculation or analysis needed
- Always end with print() statements for any results
- Prefer data visualization (line charts, bar charts only) when showing trends or any comparisons or other visualizations. Only ONE chart per code execution — never call plt.show() more than once per run.
- Pre-installed libraries: ${pythonLibsAvailable.join(', ')}. Any other packages will be auto-installed via pip before execution.
- IMPORTANT: Use plt.show() to display charts, NEVER use plt.savefig() as it does not work in this environment
- If the code fails fix it and then run it again, do not skip the fix.
- Do NOT use scraping/HTTP libraries (requests, httpx, beautifulsoup4, selenium, scrapy, etc.) to fetch web content — use the search tools instead. These libraries are only available as a last resort for accessing structured data APIs that search tools cannot reach.

For browsePage:
- browsePage retrieves the FULL rendered content of a page — use it proactively whenever you have a specific URL worth reading in depth
- Use it for: official blog posts, release notes, documentation pages, product pages, changelogs, GitHub READMEs, news articles, any URL the user mentions
- Use it after webSearch to follow up on promising URLs found in results — don't just rely on search snippets
- Max 5 URLs per call; pass all related URLs together in one call
- browsePage is complementary to webSearch, not a last resort — use both together routinely

### RESEARCH WORKFLOW:
1. Start with webSearch to map the topic landscape and discover key URLs
2. Use browsePage on the most authoritative/relevant URLs found to get full content
3. Drill down with more specific webSearch queries based on what you learned
4. Use xSearch for real-time opinions, social reactions, and breaking news angles
5. Use browsePage on any specific URLs mentioned in the plan or by the user
6. Cross-validate with more searches and browsing from different sources
7. Use codeRunner only if data analysis or visualization is explicitly needed
8. After each research cycle, check: "Is the coverage comprehensive enough to fully answer the question?" — if not, continue; if yes, call done

### WHEN TO CALL DONE (REQUIRED TO FINISH):
- You MUST call the done tool to conclude research — there is no other valid way to end the run.
- Call done when ALL of these are true:
  - You have covered all major angles of the topic from multiple sources
  - Key claims are cross-verified from at least 2-3 independent sources
  - You have the most up-to-date information available (searched with recent dates)
  - Additional searches would only return the same information you already have
- Do NOT stay stuck in a loop searching the same topic over and over — if you've verified a point, move on and then call done.
- When in doubt: if coverage is sufficient, call done. Do not stop without calling it.

For research:
- Carefully follow the plan, do not skip any steps
- Do not use the same query twice to avoid duplicates
- Up to 75 steps are available — use as many as the topic genuinely requires
- After completing the plan, ask yourself: "Do I have enough high-quality, cross-verified information to fully answer the question?" If yes, call done. If no, keep going.
- Do NOT stop just because initial searches returned results — assess coverage quality, not step count
- Plan is limited to 75 actions, do not exceed this limit

CRITICAL - Thinking Before Every Tool Call:
- ALWAYS call the thinking tool BEFORE every other tool call (webSearch, browsePage, xSearch, fileQuery, codeRunner)
- The thinking tool helps you plan your next action and provides context to the user
- Pattern: thinking → tool → thinking → tool → thinking → tool...
- Never call multiple search/code tools in a row without a thinking step between them

Thinking Tool Guidelines:
- The thought field must ONLY contain one of two things:
  1. What you are about to do next and why (before an action)
  2. A brief summary of what the previous action returned and what you will do next
- NEVER write analysis, conclusions, bullet points, headers, or long explanations in thought
- STRICTLY NO markdown — no **, no __, no #, no -, no *, no backticks, no numbered lists, nothing. Plain sentences only.
- NEVER mention any tool names (webSearch, browsePage, xSearch, fileQuery, codeRunner, thinking, done) in the thought or nextStep fields — describe the action in plain human language instead
- Keep it short: 1-3 plain sentences maximum
- If you catch yourself about to state a fact from memory, stop — search for it instead
- The nextStep field should be a SHORT human-readable action phrase (under 60 chars) — no tool names, ever:
  - "Searching for world models" not "calling webSearch for world models"
  - "Reading the official release notes" not "browsePage on release notes URL"
  - "Checking recent X posts about AI" not "xSearch for AI opinions"
  - "Looking through the uploaded document" not "fileQuery on document.pdf"
  - "Running the data analysis" not "codeRunner for analysis"

Done Tool Guidelines (REQUIRED to conclude research):
- ⚠️ CRITICAL: The done tool is the ONLY way to finish. You MUST call it when research is complete. Stopping without calling done breaks the UI — never acceptable.
- Call done when you have genuinely comprehensive coverage: all major angles covered, claims cross-verified from multiple sources, recent data gathered.
- Before calling done, ask: "Have I covered all key angles? Cross-verified claims? Checked for recent data?" — if any answer is no, keep going; if yes, call done.
- Do NOT stay in a loop — if you have verified something thoroughly, move on and then call done.
- Provide a brief 1-2 sentence summary of what was researched and key findings in the summary parameter.
${
  hasFiles
    ? `
### FILE QUERY SEARCH
You have access to uploaded files: ${supportedFiles.map((f) => f.name || 'file').join(', ')}
- Use the fileQuery tool to search and retrieve information from these uploaded documents
- This is useful for finding specific information mentioned in the files
- Combine file search results with web search for comprehensive research
`
    : ''
}
⚠️ FINAL REMINDER: Conclude research by calling the done tool. You MUST call done when you finish — stopping without it is a critical failure and breaks the user experience. No exceptions.

Research Plan:
${JSON.stringify(plan)}
`,
    prompt,
    temperature: 0,
    providerOptions: {
      xai: {
        parallel_function_calling: false,
        parallel_tool_calls: false,
      },
      openai: {
        parallelToolCalls: false,
        reasoningEffort: 'none',
      } satisfies OpenAIResponsesProviderOptions,
      anthropic: {
        disableParallelToolUse: true,
      } satisfies AnthropicProviderOptions,
      ...(modelId === 'scira-ext-5'
        ? {
            gateway: {
              only: ['moonshotai', 'fireworks'],
              order: ['fireworks', 'moonshotai'],
            } satisfies GatewayProviderOptions,
          }
        : {}),

      moonshotai: {
        ...(modelId === 'scira-ext-5'
          ? {
              thinking: { type: 'disabled' },
            }
          : {}),
      },
      fireworks: {
        ...(modelId === 'scira-ext-5'
          ? {
              thinking: { type: 'disabled' },
            }
          : {}),
      },
      google: {
        thinkingConfig: {
          thinkingLevel: 'medium',
          includeThoughts: false,
        },
      } satisfies GoogleGenerativeAIProviderOptions,
      vertex: {
        thinkingConfig: {
          thinkingLevel: 'medium',
          includeThoughts: false,
        },
      } satisfies GoogleLanguageModelOptions,
      alibaba: {
        ...(modelId === 'scira-ext-7'
          ? {
              enable_thinking: false,
            }
          : {}),
      },
    },
    ...(modelId === 'scira-ext-7'
      ? {
          temperature: 1,
          topP: 0.95,
          topK: 20,
          minP: 0,
          presencePenalty: 1.5,
          frequencyPenalty: 1.0,
        }
      : {}),
    headers: {
      'anthropic-beta': 'context-1m-2025-08-07',
    },
    tools: {
      thinking: {
        description:
          'Record a brief thought before or after an action. ONLY describe what you are about to do next in plain human language, or briefly summarize what the last action returned. NO markdown, NO bullet points, NO headers, NO bold/italic. Plain sentences only, 1-3 sentences max. NEVER mention any tool names.',
        inputSchema: z.object({
          thought: z
            .string()
            .describe(
              '1-3 plain sentences only. Either: what you are about to do and why, OR a brief summary of what the last action returned. NO markdown formatting whatsoever — no **, no #, no -, no lists. NEVER name any tools (webSearch, browsePage, xSearch, fileQuery, codeRunner, thinking, done) — use plain human language only.',
            ),
          nextStep: z
            .string()
            .optional()
            .describe(
              'A SHORT human-readable action phrase (under 60 chars). NEVER include tool names. Good: "Searching for world models", "Reading the release notes", "Checking recent posts about AI". Bad: "Calling webSearch", "Running browsePage", "Using xSearch".',
            ),
        }),
        execute: async ({ thought, nextStep }, { toolCallId }) => {
          if (dataStream) {
            dataStream.write({
              type: 'data-extreme_search',
              data: {
                kind: 'thinking',
                thinkingId: toolCallId,
                thought,
                nextStep,
              },
            });
          }

          return { thought, nextStep };
        },
      },
      ...(hasFiles
        ? {
            fileQuery: {
              description: `Search through uploaded files (${supportedFiles.map((f) => f.name || 'file').join(', ')}) to find relevant information using semantic search.`,
              inputSchema: z.object({
                queries: z
                  .array(z.string())
                  .min(1)
                  .max(3)
                  .describe('Array of search queries (1-3) to find information in the uploaded files'),
              }),
              execute: async ({ queries }, { toolCallId }) => {
                console.log('File query search:', queries);

                const total = queries.length;
                const normalizedQueries = queries as string[];
                const searchTasks = normalizedQueries.reduce(
                  (
                    tasks: Record<string, () => Promise<{ query: string; results: FileQueryResult[] }>>,
                    query: string,
                    index: number,
                  ) => {
                    tasks[`query-${index}`] = async () => {
                      const queryId = `${toolCallId}-${index}`;

                      if (dataStream) {
                        dataStream.write({
                          type: 'data-extreme_search',
                          data: {
                            kind: 'file_query',
                            fileQueryId: queryId,
                            query,
                            index,
                            total,
                            status: 'started',
                          },
                        });
                      }

                      try {
                        const results = await searchFilesForQuery(query, supportedFiles, fileRetrievers, 5, false);

                        if (dataStream) {
                          dataStream.write({
                            type: 'data-extreme_search',
                            data: {
                              kind: 'file_query',
                              fileQueryId: queryId,
                              query,
                              index,
                              total,
                              status: 'completed',
                              results,
                            },
                          });
                        }

                        return { query, results };
                      } catch (error) {
                        console.error(`File query error for "${query}":`, error);

                        if (dataStream) {
                          dataStream.write({
                            type: 'data-extreme_search',
                            data: {
                              kind: 'file_query',
                              fileQueryId: queryId,
                              query,
                              index,
                              total,
                              status: 'error',
                              results: [],
                            },
                          });
                        }

                        return { query, results: [] };
                      }
                    };
                    return tasks;
                  },
                  {},
                );
                const searchResultsByQuery = await all(searchTasks, getBetterAllOptions());
                const searchResults = normalizedQueries.map((query, index) => searchResultsByQuery[`query-${index}`]);

                // Push file query results into the outer allSources for research.sources
                searchResults.forEach(({ results }) => {
                  results.forEach((fileResult) => {
                    const matchingFile = supportedFiles.find((f) => (f.name || 'file') === fileResult.fileName);
                    if (!matchingFile) return;
                    allSources.push({
                      title: fileResult.fileName,
                      url: matchingFile.url,
                      content: fileResult.content,
                      publishedDate: '',
                      favicon: '',
                    });
                  });
                });

                return {
                  success: true,
                  searches: searchResults,
                  filesSearched: supportedFiles.map((f) => f.name || 'file'),
                };
              },
            },
          }
        : {}),
      codeRunner: {
        description: `Run Python code in a sandbox. IMPORTANT: Only ONE chart per execution — never create multiple charts in a single run. Use plt.show() to display charts, NOT plt.savefig() which does not work in this environment. Pre-installed libraries: ${pythonLibsAvailable.join(', ')}. Other packages will be auto-installed via pip.`,
        inputSchema: z.object({
          title: z.string().describe('The title of what you are running the code for'),
          code: z.string().describe('The Python code to run. Use plt.show() for charts, NOT savefig().'),
        }),
        execute: async ({ title, code: rawCode }) => {
          // Decode HTML entities that may have been introduced
          const code = rawCode
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&apos;/g, "'");

          console.log('Running code:', code);
          // Detect all imported top-level package names from the code
          const importedPackages = new Set<string>();
          // Match: import X, import X as Y, import X.sub, from X import Y, from X.sub import Y
          for (const match of code.matchAll(/^\s*import\s+([\w]+)/gm)) {
            importedPackages.add(match[1]);
          }
          for (const match of code.matchAll(/^\s*from\s+([\w]+)/gm)) {
            importedPackages.add(match[1]);
          }
          const missingLibs = Array.from(importedPackages).filter((lib) => !pythonLibsAvailable.includes(lib));

          // Generate consistent codeId for both running and completed states
          const codeId = `code-${nanoid()}`;

          if (dataStream) {
            dataStream.write({
              type: 'data-extreme_search',
              data: {
                kind: 'code',
                codeId,
                title: title,
                code: code,
                status: 'running',
              },
            });
          }
          const response = await runCode(code, missingLibs);

          // Upload chart PNGs to R2 and return only { url, title }
          const chartsInput = (response.artifacts?.charts || []) as ChartArtifact[];
          const chartTasks = chartsInput.reduce<Record<string, () => Promise<{ url: string; title?: string } | null>>>(
            (tasks, chart, index) => {
              tasks[`chart-${index}`] = async () => {
                if (chart.png) {
                  try {
                    const base64Data = chart.png.replace(/^data:image\/\w+;base64,/, '');
                    const buffer = Buffer.from(base64Data, 'base64');
                    const chartId = nanoid();
                    const key = `scira/charts/${chartId}.png`;

                    await r2Client.send(
                      new PutObjectCommand({
                        Bucket: R2_BUCKET_NAME,
                        Key: key,
                        Body: buffer,
                        ContentType: 'image/png',
                      }),
                    );

                    return {
                      url: `${R2_PUBLIC_URL}/${key}`,
                      title: chart.title || title || `Chart ${index + 1}`,
                    };
                  } catch (uploadError) {
                    console.error('Failed to upload chart to R2:', uploadError);
                    return null;
                  }
                }
                // If chart already has a URL (no png), pass it through
                if (chart.url) {
                  return { url: chart.url, title: chart.title || title || `Chart ${index + 1}` };
                }
                return null;
              };
              return tasks;
            },
            {},
          );
          const charts = Object.values(await all(chartTasks, getBetterAllOptions())).filter(Boolean);

          console.log('Charts uploaded:', charts);

          if (dataStream) {
            dataStream.write({
              type: 'data-extreme_search',
              data: {
                kind: 'code',
                codeId,
                title: title,
                code: code,
                status: 'completed',
                result: response.result,
                charts: charts,
              },
            });
          }

          return {
            title,
            result: response.result,
            charts: charts,
          };
        },
      },
      webSearch: {
        description: 'Search the web for information on a topic',
        inputSchema: z.object({
          queries: z.array(z.string().describe('Search queries to achieve the todo').max(150)).min(1).max(5),
          category: z.enum(SearchCategory).optional().describe('The category of the search if relevant'),
          includeDomains: z.array(z.string()).optional().describe('The domains to include in the search for results'),
          startDate: z
            .string()
            .optional()
            .describe(
              'The start date for filtering search results in YYYY-MM-DD format. Results will be filtered to show only content published after this date. Default to 3 days ago if not specified.',
            ),
        }),
        execute: async ({ queries, category, includeDomains, startDate }, { toolCallId }) => {
          console.log('Web search queries:', queries);
          console.log('Category:', category);
          console.log('Start date:', startDate);

          const total = queries.length;
          const searchPromises = queries.map(async (query: string, index: number) => {
            const queryId = `${toolCallId}-${index}`;

            if (dataStream) {
              dataStream.write({
                type: 'data-extreme_search',
                data: {
                  kind: 'query',
                  queryId,
                  query,
                  index,
                  total,
                  status: 'started',
                },
              });
            }

            let results = await searchStrategy.search(query, category, includeDomains, startDate);
            console.log(`Found ${results.length} results for query "${query}"`);

            allSources.push(...results);

            if (dataStream) {
              results.forEach((source) => {
                dataStream.write({
                  type: 'data-extreme_search',
                  data: {
                    kind: 'source',
                    queryId,
                    source: {
                      title: source.title,
                      url: source.url,
                      favicon: source.favicon,
                    },
                  },
                });
              });
            }

            if (results.length > 0) {
              try {
                if (dataStream) {
                  dataStream.write({
                    type: 'data-extreme_search',
                    data: {
                      kind: 'query',
                      queryId,
                      query,
                      index,
                      total,
                      status: 'reading_content',
                    },
                  });
                }

                const urls = results.map((r) => r.url);
                const contentsResults = await contentStrategy.getContents(urls);

                if (contentsResults && contentsResults.length > 0) {
                  if (dataStream) {
                    contentsResults.forEach((content) => {
                      dataStream.write({
                        type: 'data-extreme_search',
                        data: {
                          kind: 'content',
                          queryId,
                          content: {
                            title: content.title || '',
                            url: content.url,
                            text: (content.content || '').slice(0, 500) + '...',
                            favicon: content.favicon || '',
                          },
                        },
                      });
                    });
                  }

                  results = contentsResults.map((content) => {
                    const originalResult = results.find((r) => r.url === content.url);
                    return {
                      title: content.title || originalResult?.title || '',
                      url: content.url,
                      content: content.content || originalResult?.content || '',
                      publishedDate: content.publishedDate || originalResult?.publishedDate || '',
                      favicon: content.favicon || originalResult?.favicon || '',
                    };
                  }) as SearchResult[];
                } else {
                  console.log('getContents returned no results, using original search results');
                }
              } catch (error) {
                console.error('Error fetching content:', error);
                console.log('Using original search results due to error');
              }
            }

            if (dataStream) {
              dataStream.write({
                type: 'data-extreme_search',
                data: {
                  kind: 'query',
                  queryId,
                  query,
                  index,
                  total,
                  status: 'completed',
                },
              });
            }

            return {
              query,
              results: results.map((result) => ({
                title: result.title,
                url: result.url,
                content: result.content,
                publishedDate: result.publishedDate,
                favicon: result.favicon,
              })),
            };
          });

          const searchMap = await all(
            Object.fromEntries(
              searchPromises.map((promise: Promise<any>, index: number) => [`q:${index}`, async () => promise]),
            ),
            getBetterAllOptions(),
          );
          const searches = queries.map((_: string, index: number) => searchMap[`q:${index}`]);

          return { searches };
        },
      },
      browsePage: {
        description:
          'Browse 1-5 specific URLs using rendered page scraping. Use when pages are JavaScript-heavy, need full-page content, or when search snippets are not enough.',
        inputSchema: z.object({
          urls: z
            .array(z.string().describe('URL to browse'))
            .min(1)
            .max(5)
            .describe('Array of 1-5 URLs to scrape for full rendered content'),
          reason: z.string().optional().describe('Brief reason for reading the page in full'),
        }),
        execute: async ({ urls, reason }, { toolCallId }) => {
          console.log('[BrowsePage] Browsing URLs:', urls, 'Reason:', reason);

          const browseId = toolCallId;
          const total = urls.length;

          if (dataStream) {
            dataStream.write({
              type: 'data-extreme_search',
              data: {
                kind: 'browse_page',
                browseId,
                urls,
                index: 0,
                total,
                status: 'started',
              },
            });
          }

          const browseTasks = Object.fromEntries(
            urls.map((url: string, index: number) => [
              `browse-${index}`,
              async () => {
                try {
                  if (dataStream) {
                    dataStream.write({
                      type: 'data-extreme_search',
                      data: {
                        kind: 'browse_page',
                        browseId,
                        urls,
                        index,
                        total,
                        status: 'browsing',
                      },
                    });
                  }

                  const hostname = getHostnameForUrl(url);
                  const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;

                  let title = hostname;
                  let content = '';
                  const isPdf = /\.pdf(\?.*)?$/i.test(url);

                  if (!content) {
                    try {
                      const notteResult = await scrapeWebpageWithNotte({
                        url,
                        headless: true,
                        maxDurationMinutes: 3,
                        idleTimeoutMinutes: 3,
                        browserType: 'chromium',
                        screenshotType: 'last_action',
                        scrapeLinks: true,
                        scrapeImages: false,
                        onlyMainContent: false,
                      });

                      if (notteResult.markdown?.trim()) {
                        content = notteResult.markdown.trim();
                        title = inferTitleFromMarkdown(content, hostname);
                        console.log(`[BrowsePage][${url}] Notte scrape succeeded, length: ${content.length}`);
                      }
                    } catch (notteError) {
                      console.error(`[BrowsePage][${url}] Notte scrape failed:`, notteError);
                    }
                  }

                  if (!content && !isPdf) {
                    console.log(`[BrowsePage][${url}] Notte returned empty, trying Exa fallback`);
                    try {
                      const exaResult = await exa.getContents([url], {
                        text: { maxCharacters: 10000, includeHtmlTags: false },
                        livecrawl: 'preferred',
                      });
                      const exaContent = exaResult.results?.[0];
                      if (exaContent?.text?.trim()) {
                        title = exaContent.title || title;
                        content = exaContent.text.trim();
                        console.log(`[BrowsePage][${url}] Exa fallback succeeded, length: ${content.length}`);
                      }
                    } catch (exaErr) {
                      console.error(`[BrowsePage][${url}] Exa fallback failed:`, exaErr);
                    }
                  }

                  if (!content) {
                    console.log(`[BrowsePage][${url}] trying Firecrawl scrape fallback`);
                    try {
                      const scrapeResult = await firecrawl.scrape(url, {
                        formats: ['markdown'],
                        proxy: 'auto',
                        waitFor: 2000,
                        parsers: ['pdf'],
                      });
                      if (scrapeResult.markdown?.trim()) {
                        title = scrapeResult.metadata?.title || title;
                        content = scrapeResult.markdown.trim();
                        console.log(
                          `[BrowsePage][${url}] Firecrawl scrape fallback succeeded, length: ${content.length}`,
                        );
                      }
                    } catch (fcErr) {
                      console.error(`[BrowsePage][${url}] Firecrawl scrape fallback failed:`, fcErr);
                    }
                  }

                  // if (content) {
                  //   try {
                  //     const compressed = await ttc.compressInput({
                  //       input: content,
                  //       model: 'bear-1.2',
                  //       aggressiveness: 0.1,
                  //       maxOutputTokens: 10000,
                  //     });
                  //     console.log(
                  //       `[BrowsePage][${url}] TTC compression: ${compressed.originalInputTokens} → ${compressed.outputTokens} tokens (saved ${compressed.tokensSaved})`,
                  //     );
                  //     content = compressed.output;
                  //   } catch (ttcErr) {
                  //     console.warn(`[BrowsePage][${url}] TTC compression failed, using raw content:`, ttcErr);
                  //   }
                  // }

                  allSources.push({
                    title,
                    url,
                    content,
                    publishedDate: '',
                    favicon,
                  });

                  return { url, title, content, favicon };
                } catch (error) {
                  console.error(`[BrowsePage] Error browsing ${url}:`, error);
                  return { url, title: url, content: '', error: String(error) };
                }
              },
            ]),
          );

          const browseResultsMap = await all(browseTasks, getBetterAllOptions());
          const results = urls.map((_: string, index: number) => browseResultsMap[`browse-${index}`]).filter(Boolean);

          if (dataStream) {
            dataStream.write({
              type: 'data-extreme_search',
              data: {
                kind: 'browse_page',
                browseId,
                urls,
                index: total - 1,
                total,
                status: 'completed',
                results,
              },
            });
          }

          return { urls, results };
        },
      },
      xSearch: {
        description:
          'Search X (formerly Twitter) posts using X API for the past 15 days by default otherwise user can specify a date range.',
        inputSchema: z.object({
          queries: z
            .array(
              z
                .string()
                .describe(
                  'Search queries for X posts. If the user gives you a link to a post then use that link directly.',
                ),
            )
            .min(1)
            .max(5),
          startDate: z
            .string()
            .describe(
              'The start date of the search in the format YYYY-MM-DD (always default to 15 days ago if not specified)',
            )
            .optional(),
          endDate: z
            .string()
            .describe('The end date of the search in the format YYYY-MM-DD (default to today if not specified)')
            .optional(),
          includeXHandles: z
            .array(z.string())
            .max(10)
            .optional()
            .describe('The X handles to include in the search (max 10). Cannot be used with excludeXHandles.'),
          excludeXHandles: z
            .array(z.string())
            .max(10)
            .optional()
            .describe('The X handles to exclude in the search (max 10). Cannot be used with includeXHandles.'),
        }),
        execute: async ({ queries, startDate, endDate, includeXHandles, excludeXHandles }, { toolCallId }) => {
          console.log('X search queries:', queries);
          console.log('X search parameters:', { startDate, endDate, includeXHandles, excludeXHandles });

          const sanitizeHandle = (handle: string) => handle.replace(/^@+/, '').trim();
          const extractTweetId = (url: string) => url.match(/status\/(\d+)/)?.[1] || null;
          const canonicalTweetLink = (tweetId: string | null, fallback: string | undefined) =>
            tweetId ? `https://x.com/i/status/${tweetId}` : fallback || '';
          const toYMD = (d: Date) => d.toISOString().slice(0, 10);

          const normalizedInclude = Array.isArray(includeXHandles)
            ? includeXHandles.map(sanitizeHandle).filter(Boolean)
            : undefined;
          const normalizedExclude = Array.isArray(excludeXHandles)
            ? excludeXHandles.map(sanitizeHandle).filter(Boolean)
            : undefined;

          const today = new Date();
          const daysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
          const effectiveStart = startDate && startDate.trim().length > 0 ? startDate : toYMD(daysAgo);
          const effectiveEnd = endDate && endDate.trim().length > 0 ? endDate : toYMD(today);
          const total = queries.length;

          const searchPromises = queries.map(async (query: string, index: number) => {
            const xSearchId = `${toolCallId}-${index}`;

            if (dataStream) {
              dataStream.write({
                type: 'data-extreme_search',
                data: {
                  kind: 'x_search',
                  xSearchId,
                  query,
                  index,
                  total,
                  startDate: effectiveStart,
                  endDate: effectiveEnd,
                  handles: normalizedInclude || normalizedExclude || [],
                  status: 'started',
                },
              });
            }

            try {
              const xSearchToolConfig: Parameters<typeof xai.tools.xSearch>[0] = {
                fromDate: effectiveStart,
                toDate: effectiveEnd,
              };

              if (normalizedInclude?.length) {
                xSearchToolConfig.allowedXHandles = normalizedInclude;
              }

              const { text, sources } = await generateText({
                model: xai.responses('grok-4-1-fast-non-reasoning'),
                system: `You are a helpful assistant that searches for X content with all the tools available to you. Do not use user search tool. Max limit of results is 30. You can search for the thread or the content of the post. You can also search for the content of the post using thread fetch tool. NO NEED TO WRITE A SINGLE WORD AFTER RUNNING THE TOOLs AT ALL COSTS!!`,
                messages: [
                  {
                    role: 'user',
                    content: query,
                  },
                ],
                maxOutputTokens: 1,
                stopWhen: stepCountIs(1),
                tools: {
                  x_search: xai.tools.xSearch(xSearchToolConfig),
                },
                onStepFinish: (step) => {
                  console.log(`[X search step for "${query}"]: `, step);
                },
              });

              console.log(`[X search data for "${query}"]: `, text);

              const citations = (Array.isArray(sources) ? sources : []) as CitationSource[];
              let xSources: any[] = [];

              if (citations.length > 0) {
                const seenCitationUrls = new Set<string>();
                const uniqueCitations = citations
                  .filter((link) => link.sourceType === 'url')
                  .filter((link) => {
                    const url = link.url || '';
                    const tweetId = extractTweetId(url);
                    const key = tweetId || url;
                    if (key && !seenCitationUrls.has(key)) {
                      seenCitationUrls.add(key);
                      return true;
                    }
                    return false;
                  });

                const tweetFetchPromises = uniqueCitations.map(async (link) => {
                  try {
                    const tweetUrl = link.url || '';
                    const tweetId = extractTweetId(tweetUrl);

                    if (!tweetId) return null;

                    const tweetData = await getTweet(tweetId);
                    if (!tweetData) return null;

                    const tweetText = tweetData.text;
                    if (!tweetText) return null;

                    const userHandle = tweetData.user?.screen_name || 'unknown';
                    const createdAt = tweetData.created_at || '';

                    return {
                      text: tweetText,
                      link: canonicalTweetLink(tweetId, tweetUrl),
                      id: tweetId,
                      author: `@${userHandle}`,
                      publishedDate: createdAt,
                      title: `Post from @${userHandle}`,
                    };
                  } catch (error) {
                    console.error(`Error fetching tweet data for ${link.url}:`, error);
                    return null;
                  }
                });

                const tweetMap = await all(
                  Object.fromEntries(tweetFetchPromises.map((promise, idx) => [`t:${idx}`, async () => promise])),
                  getBetterAllOptions(),
                );
                const tweetResults = tweetFetchPromises.map((_, idx) => tweetMap[`t:${idx}`]);

                const validTweets = tweetResults.filter((result) => result !== null);

                const seenSourceLinks = new Set<string>();
                const uniqueTweets = validTweets.filter((tweet) => {
                  const key = tweet?.link || tweet?.id;
                  if (tweet && key && !seenSourceLinks.has(key)) {
                    seenSourceLinks.add(key);
                    return true;
                  }
                  return false;
                });

                xSources.push(...uniqueTweets);
              }

              // Push X search results into the outer allSources for research.sources
              xSources.forEach((source: any) => {
                if (source.link) {
                  allSources.push({
                    title: source.title || source.author || 'X post',
                    url: source.link,
                    content: source.text || '',
                    publishedDate: source.publishedDate || '',
                    favicon: `https://www.google.com/s2/favicons?domain=x.com&sz=128`,
                  });
                }
              });

              const enrichedCitations = xSources.map((source: any) => ({
                url: source.link,
                title: source.title || source.author || 'X post',
                description: source.text,
                tweet_id: source.id,
                author: source.author,
                created_at: source.publishedDate,
              }));

              const result = {
                content: text,
                citations: enrichedCitations,
                sources: xSources,
                dateRange: `${effectiveStart} to ${effectiveEnd}`,
                handles: normalizedInclude || normalizedExclude || [],
              };

              if (dataStream) {
                dataStream.write({
                  type: 'data-extreme_search',
                  data: {
                    kind: 'x_search',
                    xSearchId,
                    query,
                    index,
                    total,
                    startDate: effectiveStart,
                    endDate: effectiveEnd,
                    handles: normalizedInclude || normalizedExclude || [],
                    status: 'completed',
                    result,
                  },
                });
              }

              console.log(`[X search via xAI] Found ${xSources.length} results for query "${query}"`);
              return {
                query,
                result,
              };
            } catch (error) {
              console.error('X search error:', error);

              if (dataStream) {
                dataStream.write({
                  type: 'data-extreme_search',
                  data: {
                    kind: 'x_search',
                    xSearchId,
                    query,
                    index,
                    total,
                    startDate: effectiveStart,
                    endDate: effectiveEnd,
                    handles: normalizedInclude || normalizedExclude || [],
                    status: 'error',
                  },
                });
              }

              return {
                query,
                result: {
                  content: '',
                  citations: [],
                  sources: [],
                  dateRange: `${effectiveStart} to ${effectiveEnd}`,
                  handles: normalizedInclude || normalizedExclude || [],
                },
              };
            }
          });

          const searchMap = await all(
            Object.fromEntries(
              searchPromises.map((promise: Promise<any>, index: number) => [`q:${index}`, async () => promise]),
            ),
            getBetterAllOptions(),
          );
          const searches = queries.map((_: string, index: number) => searchMap[`q:${index}`]);

          return {
            searches,
            dateRange: `${effectiveStart} to ${effectiveEnd}`,
            handles: normalizedInclude || normalizedExclude || [],
          };
        },
      },
      done: {
        description:
          'REQUIRED to conclude research. You MUST call this tool when research is complete — it is the only valid way to finish. Stopping without calling done breaks the UI. Call with a brief summary of what was researched and found.',
        inputSchema: z.object({
          summary: z.string().describe('A brief summary (1-2 sentences) of what was researched and key findings'),
        }),
        execute: async ({ summary }) => {
          if (dataStream) {
            dataStream.write({
              type: 'data-extreme_search',
              data: {
                kind: 'done',
                summary,
              },
            });
          }
          return { done: true, summary };
        },
      },
    },
    onStepFinish: (step) => {
      console.log('Finish reason [extreme-search]:', step);
      console.log('Step finished [extreme-search]:', step.finishReason);
      if (step.toolResults) {
        console.log('Tool results [extreme-search]:', step.toolResults);
        toolResults.push(...step.toolResults);
      }
    },
    onFinish: (event) => {
      console.log('Finish reason [extreme-search]:', event.finishReason);
      console.log('Steps [extreme-search]:', event.steps);
      console.log('Tool calls [extreme-search]:', event.toolCalls);
      console.log('Tool results [extreme-search]:', event.toolResults);
      console.log('Response [extreme-search]:', event.response);
      console.log('Provider metadata [extreme-search]:', event.providerMetadata);
    },
    prepareStep: async ({ steps }) => {
      // Check if done tool was called in any previous step
      const doneToolCalled = steps.some((step) => step.toolCalls.some((tc) => tc?.toolName === 'done'));

      // Stop tool calls if done tool was already called
      if (doneToolCalled) {
        console.log('[ExtremeSearch] Done tool called, stopping further tool calls');
        return {
          toolChoice: 'none' as const,
        };
      }

      // Force the model to always call a tool — it cannot stop by returning plain text.
      // done is always available; the model decides when research is complete.
      return {
        toolChoice: 'required' as const,
      };
    },
  });

  if (dataStream) {
    dataStream.write({
      type: 'data-extreme_search',
      data: {
        kind: 'plan',
        status: { title: 'Research completed' },
      },
    });
  }

  const chartResults = toolResults.filter((result) => {
    const output = result.output ?? result.result;
    return result.toolName === 'codeRunner' && typeof output === 'object' && output !== null && 'charts' in output;
  });

  console.log('Chart results:', chartResults);

  const charts = chartResults.flatMap((result) => {
    const output = (result.output ?? result.result) as any;
    const codeTitle = output.title as string | undefined;
    return (output.charts || []).map((chart: { url: string; title?: string }, i: number) => ({
      ...chart,
      title:
        chart.title && !chart.title.startsWith('Chart ') ? chart.title : codeTitle || chart.title || `Chart ${i + 1}`,
    }));
  });

  console.log('Tool results:', toolResults);
  console.log('Charts:', charts);
  console.log('Source 2:', allSources[2]);

  return {
    // text,
    toolResults,
    sources: Array.from(
      new Map(allSources.map((s) => [s.url, { ...s, content: s.content.slice(0, 3000) + '...' }])).values(),
    ),
    charts,
  };
}

export function extremeSearchTool(
  dataStream: UIMessageStreamWriter<ChatMessage> | undefined,
  files: Array<{ url: string; contentType: string; name?: string }> = [],
  modelId:
    | 'scira-ext-1'
    | 'scira-ext-2'
    | 'scira-ext-4'
    | 'scira-ext-5'
    | 'scira-ext-6'
    | 'scira-ext-7'
    | 'scira-ext-8' = 'scira-ext-1',
  mcpDynamicTools: Record<string, any> = {},
) {
  return tool({
    description: `Use this tool to conduct an extreme search on a given topic using Exa for content extraction.${files.length > 0 ? ` Has access to ${files.length} uploaded file(s) for document search.` : ''}`,
    inputSchema: z.object({
      prompt: z
        .string()
        .describe(
          "This should take the user's exact prompt. Extract from the context but do not infer or change in any way.",
        ),
    }),
    execute: async ({ prompt }) => {
      console.log({ prompt, filesCount: files.length, modelId });

      const research = await extremeSearch(prompt, dataStream, files, modelId, mcpDynamicTools);

      return {
        research: {
          // text: research.text,
          // toolResults: research.toolResults,
          sources: research.sources,
          charts: research.charts,
        },
      };
    },
  });
}
