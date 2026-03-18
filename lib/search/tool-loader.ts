import 'server-only';

import type { SearchProvider } from '@/lib/utils';

type ExtremeSearchModelId =
  | 'scira-ext-1'
  | 'scira-ext-2'
  | 'scira-ext-4'
  | 'scira-ext-5'
  | 'scira-ext-6'
  | 'scira-ext-7'
  | 'scira-ext-8';

interface LoadConfiguredToolsParams {
  activeToolNames: string[];
  dataStream: any;
  searchProvider: SearchProvider | undefined;
  timezone: string | undefined;
  contextFiles: Array<{ url: string; contentType: string; name?: string }>;
  extremeSearchModel: ExtremeSearchModelId | undefined;
  includeMcpTools: boolean;
  mcpDynamicTools: Record<string, any>;
  lightweightUser: { userId: string; email: string; isProUser: boolean } | null;
  selectedConnectors: any;
}

export async function loadConfiguredTools({
  activeToolNames,
  dataStream,
  searchProvider,
  timezone,
  contextFiles,
  extremeSearchModel,
  includeMcpTools,
  mcpDynamicTools,
  lightweightUser,
  selectedConnectors,
}: LoadConfiguredToolsParams): Promise<Record<string, any>> {
  const tools: Record<string, any> = {};
  const uniqueToolNames = [...new Set(activeToolNames)];
  let memoryTools: { searchMemories: any; addMemory: any } | null = null;

  await Promise.all(
    uniqueToolNames.map(async (toolName) => {
      switch (toolName) {
        case 'stock_chart': {
          const { stockChartTool } = await import('@/lib/tools/stock-chart');
          tools.stock_chart = stockChartTool;
          return;
        }
        case 'currency_converter': {
          const { currencyConverterTool } = await import('@/lib/tools/currency-converter');
          tools.currency_converter = currencyConverterTool;
          return;
        }
        case 'coin_data':
        case 'coin_data_by_contract':
        case 'coin_ohlc': {
          const { coinDataTool, coinDataByContractTool, coinOhlcTool } = await import('@/lib/tools/crypto-tools');
          if (uniqueToolNames.includes('coin_data')) tools.coin_data = tools.coin_data ?? coinDataTool;
          if (uniqueToolNames.includes('coin_data_by_contract'))
            tools.coin_data_by_contract = tools.coin_data_by_contract ?? coinDataByContractTool;
          if (uniqueToolNames.includes('coin_ohlc')) tools.coin_ohlc = tools.coin_ohlc ?? coinOhlcTool;
          return;
        }
        case 'x_search': {
          const { xSearchTool } = await import('@/lib/tools/x-search');
          tools.x_search = xSearchTool(dataStream);
          return;
        }
        case 'web_search': {
          const { webSearchTool } = await import('@/lib/tools/web-search');
          tools.web_search = webSearchTool(dataStream, searchProvider);
          return;
        }
        case 'academic_search': {
          const { academicSearchTool } = await import('@/lib/tools/academic-search');
          tools.academic_search = academicSearchTool(dataStream);
          return;
        }
        case 'youtube_search': {
          const { youtubeSearchTool } = await import('@/lib/tools/youtube-search');
          tools.youtube_search = youtubeSearchTool;
          return;
        }
        case 'spotify_search': {
          const { spotifySearchTool } = await import('@/lib/tools/spotify-search');
          tools.spotify_search = spotifySearchTool;
          return;
        }
        case 'reddit_search': {
          const { redditSearchTool } = await import('@/lib/tools/reddit-search');
          tools.reddit_search = redditSearchTool(dataStream);
          return;
        }
        case 'github_search': {
          const { githubSearchTool } = await import('@/lib/tools/github-search');
          tools.github_search = githubSearchTool(dataStream);
          return;
        }
        case 'prediction_search': {
          const { predictionSearchTool } = await import('@/lib/tools/prediction-search');
          tools.prediction_search = predictionSearchTool(dataStream);
          return;
        }
        case 'retrieve': {
          const { retrieveTool } = await import('@/lib/tools/retrieve');
          tools.retrieve = retrieveTool;
          return;
        }
        case 'movie_or_tv_search': {
          const { movieTvSearchTool } = await import('@/lib/tools/movie-tv-search');
          tools.movie_or_tv_search = movieTvSearchTool;
          return;
        }
        case 'trending_movies': {
          const { trendingMoviesTool } = await import('@/lib/tools/trending-movies');
          tools.trending_movies = trendingMoviesTool;
          return;
        }
        case 'trending_tv': {
          const { trendingTvTool } = await import('@/lib/tools/trending-tv');
          tools.trending_tv = trendingTvTool;
          return;
        }
        case 'find_place_on_map':
        case 'nearby_places_search': {
          const { findPlaceOnMapTool, nearbyPlacesSearchTool } = await import('@/lib/tools/map-tools');
          if (uniqueToolNames.includes('find_place_on_map'))
            tools.find_place_on_map = tools.find_place_on_map ?? findPlaceOnMapTool;
          if (uniqueToolNames.includes('nearby_places_search'))
            tools.nearby_places_search = tools.nearby_places_search ?? nearbyPlacesSearchTool;
          return;
        }
        case 'get_weather_data': {
          const { weatherTool } = await import('@/lib/tools/weather');
          tools.get_weather_data = weatherTool;
          return;
        }
        case 'text_translate': {
          const { textTranslateTool } = await import('@/lib/tools/text-translate');
          tools.text_translate = textTranslateTool;
          return;
        }
        case 'code_interpreter': {
          const { codeInterpreterTool } = await import('@/lib/tools/code-interpreter');
          tools.code_interpreter = codeInterpreterTool;
          return;
        }
        case 'track_flight': {
          const { flightTrackerTool } = await import('@/lib/tools/flight-tracker');
          tools.track_flight = flightTrackerTool;
          return;
        }
        case 'datetime': {
          const { datetimeTool } = await import('@/lib/tools/datetime');
          tools.datetime = datetimeTool;
          return;
        }
        case 'extreme_search': {
          const { extremeSearchTool } = await import('@/lib/tools/extreme-search');
          tools.extreme_search = extremeSearchTool(
            dataStream,
            contextFiles,
            extremeSearchModel || 'scira-ext-1',
            includeMcpTools ? mcpDynamicTools : {},
          );
          return;
        }
        case 'greeting': {
          const { greetingTool } = await import('@/lib/tools/greeting');
          tools.greeting = greetingTool(timezone);
          return;
        }
        case 'code_context': {
          const { codeContextTool } = await import('@/lib/tools/code-context');
          tools.code_context = codeContextTool;
          return;
        }
        case 'file_query_search': {
          if (contextFiles.length === 0) return;
          const { createFileQuerySearchTool } = await import('@/lib/tools/file-query-search');
          tools.file_query_search = createFileQuerySearchTool(contextFiles, dataStream);
          return;
        }
        case 'search_memories':
        case 'add_memory': {
          if (!lightweightUser) return;
          if (!memoryTools) {
            const { createMemoryTools } = await import('@/lib/tools/supermemory');
            memoryTools = createMemoryTools(lightweightUser.userId);
          }
          if (uniqueToolNames.includes('search_memories'))
            tools.search_memories = tools.search_memories ?? memoryTools.searchMemories;
          if (uniqueToolNames.includes('add_memory')) tools.add_memory = tools.add_memory ?? memoryTools.addMemory;
          return;
        }
        case 'connectors_search': {
          if (!lightweightUser) return;
          const { createConnectorsSearchTool } = await import('@/lib/tools/connectors-search');
          tools.connectors_search = createConnectorsSearchTool(lightweightUser.userId, selectedConnectors);
          return;
        }
        default:
          return;
      }
    }),
  );

  if (includeMcpTools) {
    Object.assign(tools, mcpDynamicTools);
  }

  return tools;
}
