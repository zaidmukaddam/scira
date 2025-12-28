import { z } from 'zod';
import type {
  academicSearchTool,
  codeInterpreterTool,
  coinDataByContractTool,
  coinDataTool,
  coinOhlcTool,
  currencyConverterTool,
  redditSearchTool,
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
} from '@/lib/tools';

import type { InferUITool, UIMessage } from 'ai';

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
      };
};

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
  model: z.string(),
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
type extremeSearch = InferUITool<ReturnType<typeof extremeSearchTool>>;
type movieTvSearchTool = InferUITool<typeof movieTvSearchTool>;
type trendingTvTool = InferUITool<typeof trendingTvTool>;
type youtubeSearchTool = InferUITool<typeof youtubeSearchTool>;
type coinDataByContractTool = InferUITool<typeof coinDataByContractTool>;
type datetimeTool = InferUITool<typeof datetimeTool>;
type createConnectorsSearchTool = InferUITool<ReturnType<typeof createConnectorsSearchTool>>;
type createMemoryTools = InferUITool<SearchMemoryTool>;
type addMemoryTools = InferUITool<AddMemoryTool>;
type codeContextTool = InferUITool<typeof codeContextTool>;

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
  academic_search: academicSearchTool;
  youtube_search: youtubeSearchTool;
  reddit_search: redditSearchTool;
  retrieve: retrieveTool;

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
  extreme_search: extremeSearch;
  greeting: greetingTool;

  connectors_search: createConnectorsSearchTool;
  search_memories: createMemoryTools;
  add_memory: addMemoryTools;

  code_context: codeContextTool;
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
  extreme_search: DataExtremeSearchPart['data'];
  chat_title: { title: string };
};

export type ChatMessage = UIMessage<MessageMetadata, CustomUIDataTypes, ChatTools>;

export interface Attachment {
  name: string;
  url: string;
  contentType?: string;
  mediaType?: string;
}
