import { z } from 'zod';
import type {
  academicSearchTool,
  codeInterpreterTool,
  coinDataByContractTool,
  coinDataTool,
  coinOhlcTool,
  currencyConverterTool,
  redditSearchTool,
  githubSearchTool,
  retrieveTool,
  trendingMoviesTool,
  textTranslateTool,
  xSearchTool,
  stockChartTool,
  webSearchTool,
  youtubeSearchTool,
  weatherTool,
  findPlaceOnMapTool,
  nearbyPlacesSearchTool,
  flightTrackerTool,
  datetimeTool,
  // mcpSearchTool,
  extremeSearchTool,
  greetingTool,
  movieTvSearchTool,
  trendingTvTool,
  createConnectorsSearchTool,
  createMemoryTools,
  SearchMemoryTool,
  AddMemoryTool,
  codeContextTool,
  createFileQuerySearchTool,
  spotifySearchTool,
  predictionSearchTool,
  createBuildTools,
} from '@/lib/tools';

import type { InferUITool, UIMessage } from 'ai';
import type { SpecDataPart } from '@json-render/core';

export type DataPart = { type: 'append-message'; message: string };
export type DataQueryCompletionPart = {
  type: 'data-query_completion';
  data: {
    query: string;
    index: number;
    total: number;
    status: 'started' | 'completed' | 'error';
    resultsCount: number;
    imagesCount: number;
  };
};

export type DataExtremeSearchPart = {
  type: 'data-extreme_search';
  data:
    | {
        kind: 'plan';
        status: { title: string };
        plan?: Array<{ title: string; todos: string[] }>;
      }
    | {
        kind: 'query';
        queryId: string;
        query: string;
        index: number;
        total: number;
        status: 'started' | 'reading_content' | 'completed' | 'error';
      }
    | {
        kind: 'source';
        queryId: string;
        source: { title: string; url: string; favicon?: string };
      }
    | {
        kind: 'content';
        queryId: string;
        content: { title: string; url: string; text: string; favicon?: string };
      }
    | {
        kind: 'thinking';
        thinkingId: string;
        thought: string;
        nextStep?: string;
      }
    | {
        kind: 'code';
        codeId: string;
        title: string;
        code: string;
        status: 'running' | 'completed' | 'error';
        result?: string;
        charts?: any[];
      }
    | {
        kind: 'x_search';
        xSearchId: string;
        query: string;
        index: number;
        total: number;
        startDate: string;
        endDate: string;
        handles?: string[];
        status: 'started' | 'completed' | 'error';
        result?: {
          content: string;
          citations: any[];
          sources: Array<{ text: string; link: string; title?: string }>;
          dateRange: string;
          handles: string[];
        };
      }
    | {
        kind: 'file_query';
        fileQueryId: string;
        query: string;
        index: number;
        total: number;
        status: 'started' | 'completed' | 'error';
        results?: Array<{
          fileName: string;
          content: string;
          score: number;
        }>;
      }
    | {
        kind: 'browse_page';
        browseId: string;
        urls: string[];
        index: number;
        total: number;
        status: 'started' | 'browsing' | 'completed' | 'error';
        results?: Array<{
          url: string;
          title: string;
          content: string;
          favicon?: string;
          error?: string;
        }>;
      }
    | {
        kind: 'done';
        summary: string;
      };
};

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
  model: z.string(),
  multiAgentMode: z.boolean().optional(),
  completionTime: z.number().nullable(),
  inputTokens: z.number().nullable(),
  outputTokens: z.number().nullable(),
  totalTokens: z.number().nullable(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof weatherTool>;
type academicSearchTool = InferUITool<ReturnType<typeof academicSearchTool>>;
type codeInterpreterTool = InferUITool<typeof codeInterpreterTool>;
type coinDataTool = InferUITool<typeof coinDataTool>;
type coinOhlcTool = InferUITool<typeof coinOhlcTool>;
type currencyConverterTool = InferUITool<typeof currencyConverterTool>;
type redditSearchTool = InferUITool<ReturnType<typeof redditSearchTool>>;
type githubSearchTool = InferUITool<ReturnType<typeof githubSearchTool>>;
type retrieveTool = InferUITool<typeof retrieveTool>;
type trendingMoviesTool = InferUITool<typeof trendingMoviesTool>;
type textTranslateTool = InferUITool<typeof textTranslateTool>;
type xSearchTool = InferUITool<ReturnType<typeof xSearchTool>>;
type stockChartTool = InferUITool<typeof stockChartTool>;
type greetingTool = InferUITool<ReturnType<typeof greetingTool>>;
type flightTrackerTool = InferUITool<typeof flightTrackerTool>;
type findPlaceOnMapTool = InferUITool<typeof findPlaceOnMapTool>;
type nearbyPlacesSearchTool = InferUITool<typeof nearbyPlacesSearchTool>;
type webSearch = InferUITool<ReturnType<typeof webSearchTool>>;
type extremeSearchTool = InferUITool<ReturnType<typeof extremeSearchTool>>;
type movieTvSearchTool = InferUITool<typeof movieTvSearchTool>;
type trendingTvTool = InferUITool<typeof trendingTvTool>;
type youtubeSearchTool = InferUITool<typeof youtubeSearchTool>;
type coinDataByContractTool = InferUITool<typeof coinDataByContractTool>;
type datetimeTool = InferUITool<typeof datetimeTool>;
type createConnectorsSearchTool = InferUITool<ReturnType<typeof createConnectorsSearchTool>>;
type createMemoryTools = InferUITool<SearchMemoryTool>;
type addMemoryTools = InferUITool<AddMemoryTool>;
type codeContextTool = InferUITool<typeof codeContextTool>;
type fileQuerySearchTool = InferUITool<ReturnType<typeof createFileQuerySearchTool>>;
type spotifySearchTool = InferUITool<typeof spotifySearchTool>;
type predictionSearchTool = InferUITool<ReturnType<typeof predictionSearchTool>>;

type BuildTools = ReturnType<typeof createBuildTools> extends { tools: infer T } ? T : never;
type boxInitTool = InferUITool<BuildTools[keyof BuildTools]>;
type boxExecTool = InferUITool<BuildTools[keyof BuildTools]>;
type boxWriteTool = InferUITool<BuildTools[keyof BuildTools]>;
type boxReadTool = InferUITool<BuildTools[keyof BuildTools]>;
type boxListFilesTool = InferUITool<BuildTools[keyof BuildTools]>;
type boxDownloadTool = InferUITool<BuildTools[keyof BuildTools]>;
type boxAgentTool = InferUITool<BuildTools[keyof BuildTools]>;
type boxCodeTool = InferUITool<BuildTools[keyof BuildTools]>;
type boxBrowsePageTool = InferUITool<BuildTools[keyof BuildTools]>;

// type mcpSearchTool = InferUITool<typeof mcpSearchTool>;

export type ChatTools = {
  stock_chart: stockChartTool;
  currency_converter: currencyConverterTool;
  coin_data: coinDataTool;
  coin_data_by_contract: coinDataByContractTool;
  coin_ohlc: coinOhlcTool;

  // Search & Content Tools
  x_search: xSearchTool;
  web_search: webSearch;
  xai_web_search: webSearch;
  academic_search: academicSearchTool;
  youtube_search: youtubeSearchTool;
  spotify_search: spotifySearchTool;
  reddit_search: redditSearchTool;
  github_search: githubSearchTool;
  prediction_search: predictionSearchTool;
  retrieve: retrieveTool;
  xai_x_search: xSearchTool;

  // Media & Entertainment
  movie_or_tv_search: movieTvSearchTool;
  trending_movies: trendingMoviesTool;
  trending_tv: trendingTvTool;

  // Location & Maps
  find_place_on_map: findPlaceOnMapTool;
  nearby_places_search: nearbyPlacesSearchTool;
  get_weather_data: weatherTool;

  // Utility Tools
  text_translate: textTranslateTool;
  code_interpreter: codeInterpreterTool;
  track_flight: flightTrackerTool;
  datetime: datetimeTool;
  // mcp_search: mcpSearchTool;
  extreme_search: extremeSearchTool;
  greeting: greetingTool;

  connectors_search: createConnectorsSearchTool;
  search_memories: createMemoryTools;
  add_memory: addMemoryTools;

  code_context: codeContextTool;
  file_query_search: fileQuerySearchTool;

  // Build Mode Tools
  box_init: boxInitTool;
  box_exec: boxExecTool;
  box_write: boxWriteTool;
  box_read: boxReadTool;
  box_list_files: boxListFilesTool;
  box_download: boxDownloadTool;
  box_agent: boxAgentTool;
  box_code: boxCodeTool;
  box_browse_page: boxBrowsePageTool;
  build_web_search: boxExecTool;
};

export type AgentStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call'; toolName: string; input: Record<string, unknown> }
  | { type: 'finish'; usage: { inputTokens: number; outputTokens: number } };

export type DataBuildSearchPart = {
  type: 'data-build_search';
  data:
    | {
        kind: 'exec';
        execId: string;
        command: string;
        status: 'running' | 'completed' | 'error';
        stdout?: string;
        stderr?: string;
        exitCode?: number;
      }
    | {
        kind: 'write';
        writeId: string;
        path: string;
        contentPreview: string;
        status: 'completed';
      }
    | {
        kind: 'read';
        readId: string;
        path: string;
        content: string;
        status: 'completed';
      }
    | {
        kind: 'list';
        listId: string;
        path: string;
        files: Array<{ name: string; isDir: boolean; size?: number }>;
        status: 'completed';
      }
    | {
        kind: 'download';
        downloadId: string;
        path: string;
        url: string;
        filename: string;
        status: 'completed';
      }
    | {
        kind: 'preview';
        previewId: string;
        port: number;
        url: string;
        status: 'completed';
        token?: string;
        username?: string;
        password?: string;
      }
    | {
        kind: 'agent';
        agentId: string;
        prompt: string;
        status: 'running' | 'streaming' | 'completed' | 'error';
        event?: AgentStreamEvent;
        result?: string;
        cost?: { inputTokens: number; outputTokens: number; totalUsd?: number; computeMs?: number };
      }
    | {
        kind: 'code';
        codeId: string;
        code: string;
        lang: string;
        status: 'running' | 'completed' | 'error';
        result?: string;
        exitCode?: number;
      }
    | {
        kind: 'search_query';
        searchId: string;
        queryId: string;
        query: string;
        index: number;
        total: number;
        status: 'started' | 'reading_content' | 'completed' | 'error';
        actionTitle?: string;
      }
    | {
        kind: 'search_source';
        searchId: string;
        queryId: string;
        source: { title: string; url: string; favicon?: string };
      }
    | {
        kind: 'search_content';
        searchId: string;
        queryId: string;
        content: { title: string; url: string; text: string; favicon?: string };
      };
};

export type DataPredictionResultsPart = {
  type: 'data-prediction_results';
  data: {
    query: string;
    markets: Array<{
      id: string;
      title: string;
      description: string;
      url: string;
      source: 'Polymarket' | 'Kalshi';
      category: string | null;
      totalVolume: number;
      totalLiquidity?: number;
      totalOpenInterest?: number;
      endDate: string | null;
      markets: Array<{
        id: string;
        title: string;
        outcomes: Array<{
          name: string;
          probability: number;
          price: number;
        }>;
        volume: number;
        volume24h: number;
        liquidity?: number;
        openInterest?: number;
        endDate: string;
        active: boolean;
        closed: boolean;
      }>;
      relevanceScore: number;
    }>;
    totalResults: number;
    sources: {
      web: number;
      proprietary: number;
    };
  };
};

export type CustomUIDataTypes = {
  appendMessage: string;
  id: string;
  'message-annotations': any;
  query_completion: {
    query: string;
    index: number;
    total: number;
    status: 'started' | 'completed' | 'error';
    resultsCount: number;
    imagesCount: number;
  };
  auto_routed_model: { model: string; route: string };
  extreme_search: DataExtremeSearchPart['data'];
  prediction_results: DataPredictionResultsPart['data'];
  chat_title: { title: string };
  spec: SpecDataPart;
  mcp_elicitation: {
    elicitationId: string;
    serverName: string;
    message: string;
    mode: 'form' | 'url';
    requestedSchema?: unknown;
    url?: string;
  };
  mcp_elicitation_done: { elicitationId: string };
  build_search: DataBuildSearchPart['data'];
};

export type ChatMessage = UIMessage<MessageMetadata, CustomUIDataTypes, ChatTools>;

export interface Attachment {
  name: string;
  url: string;
  contentType?: string;
  mediaType?: string;
}
