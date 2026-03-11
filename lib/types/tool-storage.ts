/**
 * Tool Storage Types
 *
 * This module defines standardized types for serializing, storing, and
 * deserializing tool call results. These types ensure consistent storage
 * format across all tools and enable proper UI rendering on page refresh.
 *
 * Schema version: 1
 */

// =============================================================================
// Base Types
// =============================================================================

/** Current schema version for migrations */
export const TOOL_STORAGE_VERSION = 1 as const;

/** Tool execution state lifecycle */
export type ToolState =
  | 'input-streaming' // Tool call is being prepared
  | 'input-available' // Tool input ready, awaiting execution
  | 'output-available' // Tool execution completed successfully
  | 'error'; // Tool execution failed

/** Error information for failed tool executions */
export interface ToolError {
  code: string;
  message: string;
  retryable: boolean;
}

/** Display configuration hints for UI rendering */
export interface ToolDisplayConfig {
  /** Whether the tool result should be collapsed by default */
  collapsed?: boolean;
  /** Rendering priority */
  priority?: 'high' | 'normal' | 'low';
  /** Render mode for the component */
  renderMode?: 'full' | 'compact' | 'inline';
}

/**
 * Base interface for all stored tool parts.
 * Every tool part must extend this interface.
 */
export interface StoredToolPartBase<TInput, TOutput> {
  /** Schema version for future migrations */
  version: typeof TOOL_STORAGE_VERSION;
  /** Tool type identifier (e.g., 'tool-web_search') */
  type: `tool-${string}`;
  /** Unique identifier for this tool invocation */
  toolId: string;
  /** ISO timestamp of when the tool was invoked */
  timestamp: string;
  /** Current execution state */
  state: ToolState;
  /** Tool input parameters */
  input: TInput;
  /** Tool output (present when state is 'output-available') */
  output?: TOutput;
  /** Error details (present when state is 'error') */
  error?: ToolError;
  /** Optional display configuration hints */
  displayConfig?: ToolDisplayConfig;
}

// =============================================================================
// Common Shared Types
// =============================================================================

/** Location coordinates */
export interface Coordinates {
  lat: number;
  lng: number;
}

/** Search result item (common across search tools) */
export interface SearchResultItem {
  url: string;
  title: string;
  content: string;
  published_date?: string;
  author?: string;
}

/** Image result item */
export interface ImageResultItem {
  url: string;
  description: string;
}

/** Source reference */
export interface SourceReference {
  title?: string;
  url: string;
}

// =============================================================================
// Web Search Tool
// =============================================================================

export interface WebSearchInput {
  queries: string[];
  maxResults?: number | number[] | null;
  topics?: string | string[] | null;
  quality?: string | string[] | null;
}

export interface WebSearchOutput {
  searches: Array<{
    query: string;
    results: SearchResultItem[];
    images: ImageResultItem[];
  }>;
}

export type WebSearchToolPart = StoredToolPartBase<WebSearchInput, WebSearchOutput>;

// =============================================================================
// YouTube Search Tool
// =============================================================================

export interface YouTubeSearchInput {
  query: string;
  timeRange: 'day' | 'week' | 'month' | 'year' | 'anytime';
}

export interface YouTubeVideoDetails {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  type?: string;
  provider_name?: string;
  provider_url?: string;
}

export interface YouTubeVideoResult {
  videoId: string;
  url: string;
  details?: YouTubeVideoDetails;
  captions?: string;
  timestamps?: string[];
  views?: string;
  likes?: string;
  summary?: string;
  publishedDate?: string;
}

export interface YouTubeSearchOutput {
  results: YouTubeVideoResult[];
}

export type YouTubeSearchToolPart = StoredToolPartBase<YouTubeSearchInput, YouTubeSearchOutput>;

// =============================================================================
// X (Twitter) Search Tool
// =============================================================================

export interface XSearchInput {
  query?: string | string[] | null;
  startDate?: string | null;
  endDate?: string | null;
  xHandles?: string[] | string | null;
  maxResults?: number | number[] | null;
}

export interface XSearchSource {
  text: string;
  link: string;
  title?: string;
}

export interface XSearchOutput {
  content: string;
  citations: string[];
  sources: XSearchSource[];
  query: string | null;
  dateRange: string;
  handles: string[];
  error?: string;
}

export type XSearchToolPart = StoredToolPartBase<XSearchInput, XSearchOutput>;

// =============================================================================
// Academic Search Tool
// =============================================================================

export interface AcademicSearchInput {
  query: string;
  maxResults?: number;
}

export interface AcademicPaper {
  title: string;
  authors: string[];
  abstract?: string;
  url: string;
  publishedDate?: string;
  journal?: string;
  citations?: number;
  doi?: string;
}

export interface AcademicSearchOutput {
  papers: AcademicPaper[];
  query: string;
}

export type AcademicSearchToolPart = StoredToolPartBase<AcademicSearchInput, AcademicSearchOutput>;

// =============================================================================
// Reddit Search Tool
// =============================================================================

export interface RedditSearchInput {
  query: string;
  subreddit?: string | null;
  sortBy?: 'relevance' | 'hot' | 'top' | 'new' | 'comments';
  timeFilter?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
}

export interface RedditPost {
  id: string;
  title: string;
  selftext?: string;
  url: string;
  permalink: string;
  subreddit: string;
  author: string;
  score: number;
  numComments: number;
  createdUtc: number;
  thumbnail?: string;
}

export interface RedditSearchOutput {
  posts: RedditPost[];
  query: string;
  subreddit?: string;
}

export type RedditSearchToolPart = StoredToolPartBase<RedditSearchInput, RedditSearchOutput>;

// =============================================================================
// Stock Price Tool
// =============================================================================

export interface StockPriceInput {
  symbol: string;
  preferredExchange?: string | null;
}

export interface MarketStatus {
  isOpen: boolean;
  message: string;
}

export interface StockPriceOutput {
  success: boolean;
  symbol: string;
  original_symbol?: string;
  name?: string;
  last_price?: number;
  currency?: string;
  exchange?: string;
  last_update?: string;
  change?: number;
  change_percent?: number;
  open?: number;
  high?: number;
  low?: number;
  previous_close?: number;
  volume?: number;
  market_cap?: number;
  market_status?: MarketStatus;
  formatted_price?: string;
  price_movement?: string;
  day_range?: string | null;
  summary?: string;
  sources?: SourceReference[];
  error?: string;
}

export type StockPriceToolPart = StoredToolPartBase<StockPriceInput, StockPriceOutput>;

// =============================================================================
// Stock Chart Tool
// =============================================================================

export interface StockChartInput {
  symbol: string;
  period?: string;
  interval?: string;
}

export interface StockChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockChartOutput {
  success: boolean;
  symbol: string;
  period?: string;
  interval?: string;
  data?: StockChartDataPoint[];
  company_name?: string;
  currency?: string;
  exchange?: string;
  error?: string;
}

export type StockChartToolPart = StoredToolPartBase<StockChartInput, StockChartOutput>;

// =============================================================================
// Currency Converter Tool
// =============================================================================

export interface CurrencyConverterInput {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
}

export interface CurrencyConverterOutput {
  success: boolean;
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  convertedAmount?: number;
  exchangeRate?: number;
  timestamp?: string;
  error?: string;
}

export type CurrencyConverterToolPart = StoredToolPartBase<CurrencyConverterInput, CurrencyConverterOutput>;

// =============================================================================
// Crypto Tools
// =============================================================================

export interface CoinDataInput {
  coinId: string;
  localization?: boolean;
  tickers?: boolean;
  marketData?: boolean;
  communityData?: boolean;
  developerData?: boolean;
}

export interface CoinDataOutput {
  success: boolean;
  coinId: string;
  data?: Record<string, unknown>;
  source?: string;
  url?: string;
  error?: string;
}

export type CoinDataToolPart = StoredToolPartBase<CoinDataInput, CoinDataOutput>;

export interface CoinDataByContractInput {
  platformId: string;
  contractAddress: string;
  localization?: boolean;
  tickers?: boolean;
  marketData?: boolean;
  communityData?: boolean;
  developerData?: boolean;
}

export interface CoinDataByContractOutput {
  success: boolean;
  contractAddress: string;
  platformId: string;
  data?: Record<string, unknown>;
  source?: string;
  url?: string;
  error?: string;
}

export type CoinDataByContractToolPart = StoredToolPartBase<CoinDataByContractInput, CoinDataByContractOutput>;

export interface CoinOhlcInput {
  coinId: string;
  vsCurrency?: string | null;
  days?: number | null;
}

export interface CoinOhlcDataPoint {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface CoinOhlcChart {
  title: string;
  type: 'candlestick';
  data: CoinOhlcDataPoint[];
  elements: CoinOhlcDataPoint[];
  x_scale: string;
  y_scale: string;
}

export interface CoinOhlcOutput {
  success: boolean;
  coinId: string;
  vsCurrency?: string;
  days?: number;
  chart?: CoinOhlcChart;
  coinData?: Record<string, unknown>;
  source?: string;
  url?: string;
  error?: string;
}

export type CoinOhlcToolPart = StoredToolPartBase<CoinOhlcInput, CoinOhlcOutput>;

// =============================================================================
// Map Tools
// =============================================================================

export interface FindPlaceOnMapInput {
  query?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PlaceAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface PlaceViewport {
  northeast: Coordinates;
  southwest: Coordinates;
}

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  location: Coordinates;
  types: string[];
  address_components?: PlaceAddressComponent[];
  viewport?: PlaceViewport;
  source: string;
}

export interface FindPlaceOnMapOutput {
  success: boolean;
  search_type?: 'forward' | 'reverse';
  query?: string;
  places: PlaceResult[];
  count?: number;
  error?: string;
}

export type FindPlaceOnMapToolPart = StoredToolPartBase<FindPlaceOnMapInput, FindPlaceOnMapOutput>;

export interface NearbyPlacesSearchInput {
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  type: string;
  radius: number;
  keyword?: string | null;
}

export interface PlacePhoto {
  photo_reference: string;
  width: number;
  height: number;
  url: string;
}

export interface PlaceReview {
  author_name: string;
  rating: number;
  text: string;
  time_description: string;
}

export interface NearbyPlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  location: Coordinates;
  rating?: number;
  price_level?: string;
  types: string[];
  distance: number;
  is_open?: boolean;
  photos?: PlacePhoto[];
  phone?: string;
  website?: string;
  opening_hours?: string[];
  reviews_count?: number;
  reviews?: PlaceReview[];
  source: string;
}

export interface NearbyPlacesSearchOutput {
  success: boolean;
  query?: string;
  type?: string;
  center: Coordinates | null;
  places: NearbyPlaceResult[];
  count?: number;
  error?: string;
}

export type NearbyPlacesSearchToolPart = StoredToolPartBase<NearbyPlacesSearchInput, NearbyPlacesSearchOutput>;

// =============================================================================
// Weather Tool
// =============================================================================

export interface WeatherInput {
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface WeatherGeocodingData {
  latitude: number;
  longitude: number;
  name?: string;
  country?: string;
  timezone?: string;
}

export interface WeatherOutput {
  cod?: string;
  message?: number;
  cnt?: number;
  list?: Array<Record<string, unknown>>;
  city?: Record<string, unknown>;
  geocoding?: WeatherGeocodingData;
  air_pollution?: Record<string, unknown>;
  air_pollution_forecast?: Record<string, unknown>;
  daily_forecast?: Record<string, unknown>;
}

export type WeatherToolPart = StoredToolPartBase<WeatherInput, WeatherOutput>;

// =============================================================================
// Flight Tracker Tool
// =============================================================================

export interface FlightTrackerInput {
  flightNumber: string;
  date?: string | null;
}

export interface FlightInfo {
  flightNumber: string;
  airline?: string;
  status?: string;
  departure?: {
    airport: string;
    city?: string;
    scheduledTime?: string;
    actualTime?: string;
    terminal?: string;
    gate?: string;
  };
  arrival?: {
    airport: string;
    city?: string;
    scheduledTime?: string;
    actualTime?: string;
    terminal?: string;
    gate?: string;
  };
  aircraft?: {
    model?: string;
    registration?: string;
  };
  duration?: string;
}

export interface FlightTrackerOutput {
  success: boolean;
  flight?: FlightInfo;
  error?: string;
}

export type FlightTrackerToolPart = StoredToolPartBase<FlightTrackerInput, FlightTrackerOutput>;

// =============================================================================
// Code Interpreter Tool
// =============================================================================

export interface CodeInterpreterInput {
  title: string;
  code: string;
  icon: 'stock' | 'date' | 'calculation' | 'default';
}

export interface ChartData {
  type: string;
  title: string;
  elements: unknown[];
  png?: string;
}

export interface CodeInterpreterOutput {
  message: string;
  chart?: ChartData;
  error?: string;
}

export type CodeInterpreterToolPart = StoredToolPartBase<CodeInterpreterInput, CodeInterpreterOutput>;

// =============================================================================
// Mermaid Diagram Tool
// =============================================================================

export interface MermaidDiagramInput {
  title: string;
  diagram: string;
}

export interface MermaidDiagramOutput {
  success: boolean;
  title: string;
  diagram: string;
  error?: string;
}

export type MermaidDiagramToolPart = StoredToolPartBase<MermaidDiagramInput, MermaidDiagramOutput>;

// =============================================================================
// Text Translate Tool
// =============================================================================

export interface TextTranslateInput {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string | null;
}

export interface TextTranslateOutput {
  success: boolean;
  originalText: string;
  translatedText?: string;
  sourceLanguage?: string;
  targetLanguage: string;
  error?: string;
}

export type TextTranslateToolPart = StoredToolPartBase<TextTranslateInput, TextTranslateOutput>;

// =============================================================================
// Datetime Tool
// =============================================================================

export interface DatetimeInput {
  timezone?: string | null;
  format?: string | null;
}

export interface DatetimeOutput {
  success: boolean;
  datetime: string;
  timezone: string;
  formatted?: string;
  timestamp?: number;
  error?: string;
}

export type DatetimeToolPart = StoredToolPartBase<DatetimeInput, DatetimeOutput>;

// =============================================================================
// Movie/TV Search Tool
// =============================================================================

export interface MovieTvSearchInput {
  query: string;
  type?: 'movie' | 'tv' | 'both';
}

export interface MovieTvResult {
  id: number;
  title: string;
  overview?: string;
  releaseDate?: string;
  posterPath?: string;
  backdropPath?: string;
  voteAverage?: number;
  voteCount?: number;
  mediaType: 'movie' | 'tv';
  genres?: string[];
}

export interface MovieTvSearchOutput {
  success: boolean;
  results: MovieTvResult[];
  query: string;
  error?: string;
}

export type MovieTvSearchToolPart = StoredToolPartBase<MovieTvSearchInput, MovieTvSearchOutput>;

// =============================================================================
// Trending Movies/TV Tools
// =============================================================================

export interface TrendingMoviesInput {
  timeWindow?: 'day' | 'week';
}

export interface TrendingMoviesOutput {
  success: boolean;
  results: MovieTvResult[];
  timeWindow?: string;
  error?: string;
}

export type TrendingMoviesToolPart = StoredToolPartBase<TrendingMoviesInput, TrendingMoviesOutput>;

export interface TrendingTvInput {
  timeWindow?: 'day' | 'week';
}

export interface TrendingTvOutput {
  success: boolean;
  results: MovieTvResult[];
  timeWindow?: string;
  error?: string;
}

export type TrendingTvToolPart = StoredToolPartBase<TrendingTvInput, TrendingTvOutput>;

// =============================================================================
// Retrieve Tool (RAG)
// =============================================================================

export interface RetrieveInput {
  query: string;
  maxResults?: number;
}

export interface RetrieveDocument {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  score?: number;
}

export interface RetrieveOutput {
  success: boolean;
  documents: RetrieveDocument[];
  query: string;
  error?: string;
}

export type RetrieveToolPart = StoredToolPartBase<RetrieveInput, RetrieveOutput>;

// =============================================================================
// Extreme Search Tool
// =============================================================================

export interface ExtremeSearchInput {
  query: string;
  maxQueries?: number;
  includeCode?: boolean;
  includeX?: boolean;
}

export interface ExtremeSearchOutput {
  success: boolean;
  summary?: string;
  sources?: Array<{
    title: string;
    url: string;
    content?: string;
  }>;
  codeResults?: Array<{
    title: string;
    code: string;
    result?: string;
  }>;
  xResults?: Array<{
    content: string;
    sources: XSearchSource[];
  }>;
  error?: string;
}

export type ExtremeSearchToolPart = StoredToolPartBase<ExtremeSearchInput, ExtremeSearchOutput>;

// =============================================================================
// Memory Tools
// =============================================================================

export interface SearchMemoriesInput {
  query: string;
  limit?: number;
}

export interface Memory {
  id: string;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface SearchMemoriesOutput {
  success: boolean;
  memories: Memory[];
  query: string;
  error?: string;
}

export type SearchMemoriesToolPart = StoredToolPartBase<SearchMemoriesInput, SearchMemoriesOutput>;

export interface AddMemoryInput {
  content: string;
  metadata?: Record<string, unknown>;
}

export interface AddMemoryOutput {
  success: boolean;
  memory?: Memory;
  error?: string;
}

export type AddMemoryToolPart = StoredToolPartBase<AddMemoryInput, AddMemoryOutput>;

// =============================================================================
// Connectors Search Tool
// =============================================================================

export interface ConnectorsSearchInput {
  query: string;
  connectors?: string[];
}

export interface ConnectorResult {
  connector: string;
  results: Array<{
    title: string;
    content: string;
    url?: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface ConnectorsSearchOutput {
  success: boolean;
  results: ConnectorResult[];
  query: string;
  error?: string;
}

export type ConnectorsSearchToolPart = StoredToolPartBase<ConnectorsSearchInput, ConnectorsSearchOutput>;

// =============================================================================
// Code Context Tool
// =============================================================================

export interface CodeContextInput {
  query: string;
  repository?: string;
  branch?: string;
}

export interface CodeContextOutput {
  success: boolean;
  files?: Array<{
    path: string;
    content: string;
    language?: string;
  }>;
  summary?: string;
  error?: string;
}

export type CodeContextToolPart = StoredToolPartBase<CodeContextInput, CodeContextOutput>;

// =============================================================================
// Legal RAG Tool
// =============================================================================

export interface LegalRagInput {
  query: string;
  jurisdiction?: string;
  documentTypes?: string[];
}

export interface LegalDocument {
  id: string;
  title: string;
  content: string;
  citation?: string;
  jurisdiction?: string;
  documentType?: string;
  date?: string;
  url?: string;
  score?: number;
}

export interface LegalRagOutput {
  success: boolean;
  documents: LegalDocument[];
  query: string;
  summary?: string;
  error?: string;
}

export type LegalRagToolPart = StoredToolPartBase<LegalRagInput, LegalRagOutput>;

// =============================================================================
// Greeting Tool
// =============================================================================

export interface GreetingInput {
  name?: string;
}

export interface GreetingOutput {
  message: string;
}

export type GreetingToolPart = StoredToolPartBase<GreetingInput, GreetingOutput>;

// =============================================================================
// Union Types
// =============================================================================

/**
 * Union of all tool input types
 */
export type AnyToolInput =
  | WebSearchInput
  | YouTubeSearchInput
  | XSearchInput
  | AcademicSearchInput
  | RedditSearchInput
  | StockPriceInput
  | StockChartInput
  | CurrencyConverterInput
  | CoinDataInput
  | CoinDataByContractInput
  | CoinOhlcInput
  | FindPlaceOnMapInput
  | NearbyPlacesSearchInput
  | WeatherInput
  | FlightTrackerInput
  | CodeInterpreterInput
  | MermaidDiagramInput
  | TextTranslateInput
  | DatetimeInput
  | MovieTvSearchInput
  | TrendingMoviesInput
  | TrendingTvInput
  | RetrieveInput
  | ExtremeSearchInput
  | SearchMemoriesInput
  | AddMemoryInput
  | ConnectorsSearchInput
  | CodeContextInput
  | LegalRagInput
  | GreetingInput;

/**
 * Union of all tool output types
 */
export type AnyToolOutput =
  | WebSearchOutput
  | YouTubeSearchOutput
  | XSearchOutput
  | AcademicSearchOutput
  | RedditSearchOutput
  | StockPriceOutput
  | StockChartOutput
  | CurrencyConverterOutput
  | CoinDataOutput
  | CoinDataByContractOutput
  | CoinOhlcOutput
  | FindPlaceOnMapOutput
  | NearbyPlacesSearchOutput
  | WeatherOutput
  | FlightTrackerOutput
  | CodeInterpreterOutput
  | MermaidDiagramOutput
  | TextTranslateOutput
  | DatetimeOutput
  | MovieTvSearchOutput
  | TrendingMoviesOutput
  | TrendingTvOutput
  | RetrieveOutput
  | ExtremeSearchOutput
  | SearchMemoriesOutput
  | AddMemoryOutput
  | ConnectorsSearchOutput
  | CodeContextOutput
  | LegalRagOutput
  | GreetingOutput;

/**
 * Union of all stored tool part types
 */
export type StoredToolPart =
  | WebSearchToolPart
  | YouTubeSearchToolPart
  | XSearchToolPart
  | AcademicSearchToolPart
  | RedditSearchToolPart
  | StockPriceToolPart
  | StockChartToolPart
  | CurrencyConverterToolPart
  | CoinDataToolPart
  | CoinDataByContractToolPart
  | CoinOhlcToolPart
  | FindPlaceOnMapToolPart
  | NearbyPlacesSearchToolPart
  | WeatherToolPart
  | FlightTrackerToolPart
  | CodeInterpreterToolPart
  | MermaidDiagramToolPart
  | TextTranslateToolPart
  | DatetimeToolPart
  | MovieTvSearchToolPart
  | TrendingMoviesToolPart
  | TrendingTvToolPart
  | RetrieveToolPart
  | ExtremeSearchToolPart
  | SearchMemoriesToolPart
  | AddMemoryToolPart
  | ConnectorsSearchToolPart
  | CodeContextToolPart
  | LegalRagToolPart
  | GreetingToolPart;

/**
 * Map of tool type strings to their corresponding StoredToolPart types
 */
export interface ToolTypeMap {
  'tool-web_search': WebSearchToolPart;
  'tool-youtube_search': YouTubeSearchToolPart;
  'tool-x_search': XSearchToolPart;
  'tool-academic_search': AcademicSearchToolPart;
  'tool-reddit_search': RedditSearchToolPart;
  'tool-stock_price': StockPriceToolPart;
  'tool-stock_chart': StockChartToolPart;
  'tool-stock_chart_simple': StockChartToolPart;
  'tool-currency_converter': CurrencyConverterToolPart;
  'tool-coin_data': CoinDataToolPart;
  'tool-coin_data_by_contract': CoinDataByContractToolPart;
  'tool-coin_ohlc': CoinOhlcToolPart;
  'tool-find_place_on_map': FindPlaceOnMapToolPart;
  'tool-nearby_places_search': NearbyPlacesSearchToolPart;
  'tool-get_weather_data': WeatherToolPart;
  'tool-track_flight': FlightTrackerToolPart;
  'tool-code_interpreter': CodeInterpreterToolPart;
  'tool-mermaid_diagram': MermaidDiagramToolPart;
  'tool-text_translate': TextTranslateToolPart;
  'tool-datetime': DatetimeToolPart;
  'tool-movie_or_tv_search': MovieTvSearchToolPart;
  'tool-trending_movies': TrendingMoviesToolPart;
  'tool-trending_tv': TrendingTvToolPart;
  'tool-retrieve': RetrieveToolPart;
  'tool-extreme_search': ExtremeSearchToolPart;
  'tool-search_memories': SearchMemoriesToolPart;
  'tool-add_memory': AddMemoryToolPart;
  'tool-connectors_search': ConnectorsSearchToolPart;
  'tool-code_context': CodeContextToolPart;
  'tool-legal_rag': LegalRagToolPart;
  'tool-greeting': GreetingToolPart;
}

/**
 * All valid tool type strings
 */
export type ToolTypeName = keyof ToolTypeMap;

/**
 * Type guard to check if a string is a valid tool type
 */
export function isValidToolType(type: string): type is ToolTypeName {
  return (
    type.startsWith('tool-') &&
    type in
      ({
        'tool-web_search': true,
        'tool-youtube_search': true,
        'tool-x_search': true,
        'tool-academic_search': true,
        'tool-reddit_search': true,
        'tool-stock_price': true,
        'tool-stock_chart': true,
        'tool-stock_chart_simple': true,
        'tool-currency_converter': true,
        'tool-coin_data': true,
        'tool-coin_data_by_contract': true,
        'tool-coin_ohlc': true,
        'tool-find_place_on_map': true,
        'tool-nearby_places_search': true,
        'tool-get_weather_data': true,
        'tool-track_flight': true,
        'tool-code_interpreter': true,
        'tool-mermaid_diagram': true,
        'tool-text_translate': true,
        'tool-datetime': true,
        'tool-movie_or_tv_search': true,
        'tool-trending_movies': true,
        'tool-trending_tv': true,
        'tool-retrieve': true,
        'tool-extreme_search': true,
        'tool-search_memories': true,
        'tool-add_memory': true,
        'tool-connectors_search': true,
        'tool-code_context': true,
        'tool-legal_rag': true,
        'tool-greeting': true,
      } as Record<string, boolean>)
  );
}

/**
 * Type guard to check if an object is a StoredToolPart
 */
export function isStoredToolPart(obj: unknown): obj is StoredToolPart {
  if (typeof obj !== 'object' || obj === null) return false;
  const part = obj as Record<string, unknown>;
  return (
    typeof part.type === 'string' &&
    part.type.startsWith('tool-') &&
    typeof part.state === 'string' &&
    ['input-streaming', 'input-available', 'output-available', 'error'].includes(part.state)
  );
}

/**
 * Helper type to get the StoredToolPart type for a given tool type name
 */
export type GetToolPart<T extends ToolTypeName> = ToolTypeMap[T];
