/**
 * Dynamic Suggestions Service
 * 
 * Generates and caches model-specific suggestions based on recent news/events.
 * Uses Redis for caching with fallback to static suggestions.
 */

import { generateText } from 'ai';
import { z } from 'zod';
import { jsonrepair } from 'jsonrepair';
import { getRedisClient } from '@/lib/redis-config';
import { scx } from '@/ai/providers';

// =============================================================================
// Types
// =============================================================================

export type ModelSuggestionType =
  | 'scira-magpie'
  | 'scx-default'
  | 'scira-llama-4'
  | 'pro-user'
  | 'free-user';

export interface Suggestion {
  text: string;
  category?: string;
}

export interface ModelSuggestions {
  modelType: ModelSuggestionType;
  suggestions: Suggestion[];
  generatedAt: string;
  expiresAt: string;
}

export interface SuggestionConfig {
  modelType: ModelSuggestionType;
  count: number;
  systemPrompt: string;
  newsCategories: string[];
  staticFallback: Suggestion[];
}

// =============================================================================
// Configuration
// =============================================================================

const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const CACHE_KEY_PREFIX = 'suggestions';

/**
 * Model-specific configuration for suggestion generation
 */
export const SUGGESTION_CONFIGS: Record<ModelSuggestionType, SuggestionConfig> = {
  'scira-magpie': {
    modelType: 'scira-magpie',
    count: 6,
    newsCategories: ['australia news', 'australian politics', 'australia economy', 'australian environment'],
    systemPrompt: `You are generating suggested questions for SCX.ai's Magpie model — an Australian reasoning and analysis assistant.

CRITICAL REQUIREMENTS:
- This model does NOT use tools; questions must be answerable from knowledge and reasoning
- ALL suggestions MUST be focused on Australia and Australian context
- Questions should encourage deep thinking, analysis, and step-by-step reasoning
- Use phrases like "Explain step-by-step", "Think through", "Reason through", "Analyse", "Compare"
- Cover topics: government policy, economy, environment, history, culture, society
- Questions should be educational and thought-provoking
- NO questions about real-time data (stock prices, weather, movies, restaurants)

Based on recent Australian news and developments, generate 6 reasoning-focused questions.`,
    staticFallback: [
      { text: "Explain step-by-step how Australia's federal budget process works", category: "government" },
      { text: "Think through the pros and cons of nuclear energy for Australia", category: "environment" },
      { text: "Reason through Australia's housing affordability crisis and possible solutions", category: "economics" },
      { text: "Write a detailed analysis of the Great Barrier Reef's ecological importance", category: "environment" },
      { text: "Compare Australia's Medicare system with the UK's NHS", category: "policy" },
      { text: "Create a persuasive essay arguing for Australia becoming a republic", category: "politics" },
    ],
  },

  'scx-default': {
    modelType: 'scx-default',
    count: 6,
    newsCategories: ['australia news', 'world news', 'technology', 'business', 'science'],
    systemPrompt: `You are generating suggested questions for SCX.ai's GPT-OSS model — a general-purpose Australian AI assistant with full tool access.

CRITICAL REQUIREMENTS:
- Questions should leverage the available tools: web search, stock prices, maps/restaurants, movies, text translation, diagram generation
- Include Australian-focused questions
- Show variety across the available tools
- Questions should feel timely and relevant to current events
- Make questions practical and action-oriented

Available tools: web_search (current news/facts), stock_price (ASX/NYSE share prices), find_place_on_map / nearby_places_search (locations, restaurants, businesses), movie_or_tv_search / trending_movies / trending_tv (entertainment), text_translate (translates into ONE target language only — never suggest translating into multiple languages at once), create_diagram (mermaid flowcharts/diagrams).

Based on recent Australian news and what's happening today, generate 6 tool-leveraging questions.`,
    staticFallback: [
      { text: "What's the current share price of CBA?", category: "finance" },
      { text: "Find Italian restaurants near Sydney CBD", category: "local" },
      { text: "Show me trending movies this week", category: "entertainment" },
      { text: "What's happening in Australian tech news today?", category: "news" },
      { text: "Translate 'Good morning, how are you?' into French", category: "translation" },
      { text: "Draw a flowchart of the software development lifecycle", category: "diagram" },
    ],
  },

  'scira-llama-4': {
    modelType: 'scira-llama-4',
    count: 6,
    newsCategories: ['australia news', 'technology', 'science', 'business'],
    systemPrompt: `You are generating suggested questions for SCX.ai's Llama model — a general knowledge, coding and writing assistant.

CRITICAL REQUIREMENTS:
- This model does NOT use tools; questions must be answerable from knowledge
- Questions should showcase coding, writing, analysis, and reasoning capabilities
- Include some Australian-focused questions
- Cover diverse topics: programming, data, writing, explanation, history, science
- NO questions about real-time data (stock prices, weather, movies, restaurants)

Based on recent developments, generate 6 practical and engaging questions.`,
    staticFallback: [
      { text: "Write a Python script to fetch and display live stock prices", category: "coding" },
      { text: "Explain the difference between machine learning and deep learning", category: "technology" },
      { text: "Help me write a professional email declining a job offer", category: "writing" },
      { text: "Summarise the key events of World War II in 300 words", category: "history" },
      { text: "Create a SQL query to find the top 10 customers by revenue", category: "coding" },
      { text: "Explain how Australia's superannuation system works", category: "finance" },
    ],
  },

  'pro-user': {
    modelType: 'pro-user',
    count: 6,
    newsCategories: ['australia news', 'world news', 'technology', 'finance australia', 'asx stocks'],
    systemPrompt: `You are generating suggested questions for SCX.ai — an Australian AI assistant with full tool access.

CRITICAL REQUIREMENTS:
- Questions should leverage the available tools: web search, stock prices, maps/restaurants, movies, text translation, diagram generation
- Include Australian-focused questions
- Show variety: news, finance (ASX stocks), local search, entertainment, translation, diagrams
- Questions should feel timely and relevant to current events

Available tools: web_search, stock_price (ASX/NYSE), find_place_on_map, nearby_places_search, movie_or_tv_search, trending_movies, trending_tv, text_translate (ONE target language only), create_diagram.

Based on recent news and what's happening today, generate 6 tool-leveraging questions.`,
    staticFallback: [
      { text: "What's the current share price of BHP?", category: "finance" },
      { text: "Find cafes near Melbourne CBD", category: "local" },
      { text: "Show me trending TV shows right now", category: "entertainment" },
      { text: "What's happening in Australian news today?", category: "news" },
      { text: "Translate 'Thank you very much' into Japanese", category: "translation" },
      { text: "Draw a diagram of how a neural network works", category: "diagram" },
    ],
  },

  'free-user': {
    modelType: 'free-user',
    count: 6,
    newsCategories: ['australia news', 'world news', 'technology'],
    systemPrompt: `You are generating suggested questions for SCX.ai — an Australian AI assistant.

CRITICAL REQUIREMENTS:
- Generate exactly 6 suggestions
- Mix tool-based questions (news, stocks, movies) with knowledge questions (writing, explanation)
- At least two should be Australian-focused
- Questions should showcase the AI's breadth of capabilities

Available tools: web_search, stock_price, nearby_places_search, movie_or_tv_search, trending_movies, text_translate (ONE target language only), create_diagram.

Based on recent news, generate 6 diverse and engaging questions.`,
    staticFallback: [
      { text: "What's happening in Australian news today?", category: "news" },
      { text: "What's the share price of CBA?", category: "finance" },
      { text: "Show me trending movies this week", category: "entertainment" },
      { text: "Find restaurants near me", category: "local" },
      { text: "Translate 'Hello, how are you?' into Spanish", category: "translation" },
      { text: "Write a short poem about the Sydney Opera House", category: "creative" },
    ],
  },
};

// =============================================================================
// Cache Key Generation
// =============================================================================

/**
 * Generate cache key for suggestions
 * Format: suggestions:{modelType}:{date}
 */
function getCacheKey(modelType: ModelSuggestionType): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${CACHE_KEY_PREFIX}:${modelType}:${today}`;
}

// =============================================================================
// News Fetching (Placeholder - can be extended with real news API)
// =============================================================================

/**
 * Fetch recent news/trends for context
 * This is a simplified version - can be extended with NewsAPI, Google News RSS, etc.
 */
async function fetchRecentContext(categories: string[]): Promise<string> {
  // For now, return a prompt that asks the model to consider current date
  // In production, this could fetch from NewsAPI, Google News RSS, etc.
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-AU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `Today is ${dateStr}. Consider recent events and trending topics in: ${categories.join(', ')}.
  
Think about what users might be curious about given:
- Current season in Australia (${getAustralianSeason(today)})
- Day of week (${today.toLocaleDateString('en-AU', { weekday: 'long' })})
- Any major events, holidays, or observances around this time
- Trending topics in the specified categories`;
}

/**
 * Get current Australian season
 */
function getAustralianSeason(date: Date): string {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'Autumn';
  if (month >= 5 && month <= 7) return 'Winter';
  if (month >= 8 && month <= 10) return 'Spring';
  return 'Summer';
}

// =============================================================================
// Suggestion Generation
// =============================================================================

/** Same as title generation, stock tools, Slack: scx + llama-3.3 (see app/actions.ts). */
const SUGGESTIONS_MODEL_IDS = ['llama-3.3', 'llama-4'] as const;

function parseSuggestionsFromText(text: string, count: number): Suggestion[] | null {
  const trimmed = text.trim();
  // Strip markdown code block if present (e.g. ```json\n[...]\n```)
  const stripped = trimmed.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  try {
    const parsed = JSON.parse(stripped) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) =>
        typeof item === 'string' ? { text: item } : { text: String((item as { text?: string }).text ?? ''), category: (item as { category?: string }).category }
      ).filter((s) => s.text.length > 0).slice(0, count);
    }
    if (parsed && typeof parsed === 'object' && 'suggestions' in parsed && Array.isArray((parsed as { suggestions: unknown }).suggestions)) {
      const arr = (parsed as { suggestions: Array<{ text?: string; category?: string } | string> }).suggestions;
      return arr.map((item) =>
        typeof item === 'string' ? { text: item } : { text: item.text ?? '', category: item.category }
      ).filter((s) => s.text.length > 0).slice(0, count);
    }
  } catch {
    // not valid JSON
  }
  return null;
}

/** When API returns 400 "Model did not output valid JSON", recover from error_model_output. */
function parseSuggestionsFrom400Error(err: unknown, count: number): Suggestion[] | null {
  if (!err || typeof err !== 'object') return null;
  const body =
    typeof (err as { responseBody?: string }).responseBody === 'string'
      ? (err as { responseBody: string }).responseBody
      : undefined;
  if (!body) return null;
  try {
    const data = JSON.parse(body) as { error_model_output?: string };
    const raw = data?.error_model_output;
    if (typeof raw !== 'string') return null;
    return parseSuggestionsFromText(raw, count);
  } catch {
    return null;
  }
}

/**
 * Generate suggestions using LLM with automatic fallback: scx first, then SambaNova.
 * Uses generateText + parse for SambaNova to avoid "invalid JSON" 400 from its API.
 */
async function generateSuggestionsWithLLM(config: SuggestionConfig): Promise<Suggestion[]> {
  const context = await fetchRecentContext(config.newsCategories);

  const promptBase = `${context}

Generate exactly ${config.count} suggested questions. Each should be:
- Concise (under 80 characters ideally)
- Specific and actionable
- Diverse (don't repeat similar questions)
- Relevant to current events or timeless topics`;

  const schema = z.object({
    suggestions: z.array(
      z.object({
        text: z.string().max(150),
        category: z.string().optional(),
      })
    ).min(config.count).max(config.count),
  });

  const promptForText = `${promptBase}

Respond with ONLY a JSON object in this format (no markdown, no explanation):
{"suggestions": [{"text": "question here", "category": "optional category"}, ...]}`;

  let lastError: unknown;

  for (const modelId of SUGGESTIONS_MODEL_IDS) {
    try {
      console.log(`[SUGGESTIONS] Trying ${modelId}`);
      const { text } = await generateText({
        model: scx.languageModel(modelId),
        system: config.systemPrompt,
        prompt: promptForText,
      });

      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const rawJSON = fenced ? fenced[1].trim() : (text.match(/\{[\s\S]*\}/) ?? [text])[0];
      const repaired = jsonrepair(rawJSON);
      const parsed = JSON.parse(repaired);
      const result = schema.parse(parsed);

      console.log(`[SUGGESTIONS] Successfully generated with ${modelId}`);
      return result.suggestions;
    } catch (err) {
      lastError = err;
      const isNoModelError =
        (err && typeof err === 'object' && 'modelId' in err) ||
        (err instanceof Error && err.message.includes('No such languageModel'));
      const isAuthError =
        (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode?: number }).statusCode === 401) ||
        (err instanceof Error && (err.message.includes('Unauthorized') || err.message.includes('Authorization')));
      if (isNoModelError) {
        console.warn(`[SUGGESTIONS] Model ${modelId} not available, trying next`);
        continue;
      }
      if (isAuthError) {
        console.warn(`[SUGGESTIONS] API key missing or invalid (401), trying next model`);
        continue;
      }
      const is400 = (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode?: number }).statusCode === 400);
      if (is400) {
        const recovered = parseSuggestionsFrom400Error(err, config.count);
        if (recovered && recovered.length >= config.count) {
          console.log(`[SUGGESTIONS] Recovered ${recovered.length} suggestions from ${modelId} 400 response`);
          return recovered.slice(0, config.count);
        }
      }
      console.error(`[SUGGESTIONS] Error with ${modelId}:`, err);
      throw err;
    }
  }

  console.error('[SUGGESTIONS] No suggestion model available:', lastError);
  throw lastError;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get suggestions for a model type
 * Checks cache first, falls back to static suggestions if not found
 */
export async function getSuggestions(modelType: ModelSuggestionType): Promise<Suggestion[]> {
  const config = SUGGESTION_CONFIGS[modelType];
  if (!config) {
    console.warn(`[SUGGESTIONS] Unknown model type: ${modelType}`);
    return [];
  }

  try {
    const redis = await getRedisClient();
    if (redis) {
      const cacheKey = getCacheKey(modelType);
      const cached = await redis.get(cacheKey);

      if (cached) {
        const parsed: ModelSuggestions = JSON.parse(cached);
        console.log(`[SUGGESTIONS] Cache hit for ${modelType}`);
        return parsed.suggestions;
      }
      console.log(`[SUGGESTIONS] Cache miss for ${modelType}, generating on demand`);
    }
  } catch (error) {
    console.error('[SUGGESTIONS] Error reading from cache:', error);
  }

  // On cache miss: try to generate dynamic suggestions and cache them
  try {
    const result = await generateAndCacheSuggestions(modelType);
    if (result.success && result.suggestions && result.suggestions.length > 0) {
      console.log(`[SUGGESTIONS] Served on-demand generated suggestions for ${modelType}`);
      return result.suggestions;
    }
  } catch (error) {
    console.error(`[SUGGESTIONS] On-demand generation failed for ${modelType}:`, error);
  }

  // Final fallback to static suggestions
  return config.staticFallback;
}

/** Map UI model IDs (short names from model switcher) to suggestion config types */
const MODEL_TO_SUGGESTION_TYPE: Record<string, ModelSuggestionType> = {
  // Magpie models
  'scira-magpie': 'scira-magpie',
  magpie: 'scira-magpie',
  // General / tool-capable models (all get the same tool-rich suggestions)
  'scx-default': 'scx-default',
  'scira-default': 'scx-default', // localStorage default — map to same as gpt-oss
  'deepseek-v3': 'scx-default',
  'deepseek-v3.1': 'scx-default',
  'deepseek-r1': 'scx-default',
  'gpt-oss-120b': 'scx-default',
  'llama-3.3': 'scx-default',
  // Llama 4
  'scira-llama-4': 'scira-llama-4',
  'llama-4': 'scira-llama-4',
};

/**
 * Get suggestions for the chat interface based on model and user status
 */
export async function getChatSuggestions(
  selectedModel: string,
  isProUser: boolean
): Promise<Suggestion[]> {
  const suggestionType: ModelSuggestionType =
    MODEL_TO_SUGGESTION_TYPE[selectedModel] ?? (isProUser ? 'pro-user' : 'free-user');
  return getSuggestions(suggestionType);
}

/**
 * Instant cache-only lookup — never triggers LLM generation.
 * Returns cached suggestions if available, otherwise static fallback.
 * Used by the UI so the home screen is always instant.
 * The cron job keeps the cache warm so cached results are the normal case.
 */
export async function getSuggestionsInstant(modelType: ModelSuggestionType): Promise<Suggestion[]> {
  const config = SUGGESTION_CONFIGS[modelType];
  if (!config) return [];

  try {
    const redis = await getRedisClient();
    if (redis) {
      const cached = await redis.get(getCacheKey(modelType));
      if (cached) {
        const parsed: ModelSuggestions = JSON.parse(cached);
        return parsed.suggestions;
      }
    }
  } catch {
    // silently fall through to static
  }

  return config.staticFallback;
}

/**
 * Instant version of getChatSuggestions for UI use.
 */
export async function getChatSuggestionsInstant(
  selectedModel: string,
  isProUser: boolean
): Promise<Suggestion[]> {
  const suggestionType: ModelSuggestionType =
    MODEL_TO_SUGGESTION_TYPE[selectedModel] ?? (isProUser ? 'pro-user' : 'free-user');
  return getSuggestionsInstant(suggestionType);
}

/**
 * Generate and cache suggestions for all model types
 * Called by cron job
 */
export async function generateAndCacheAllSuggestions(): Promise<{
  success: boolean;
  results: Record<ModelSuggestionType, { success: boolean; error?: string }>;
}> {
  const results: Record<string, { success: boolean; error?: string }> = {};

  const redis = await getRedisClient();
  if (!redis) {
    console.error('[SUGGESTIONS] Redis not available, cannot cache suggestions');
    return { success: false, results: {} as any };
  }

  const modelTypes = Object.keys(SUGGESTION_CONFIGS) as ModelSuggestionType[];

  for (const modelType of modelTypes) {
    const config = SUGGESTION_CONFIGS[modelType];

    try {
      console.log(`[SUGGESTIONS] Generating suggestions for ${modelType}...`);
      const suggestions = await generateSuggestionsWithLLM(config);

      const now = new Date();
      const expiresAt = new Date(now.getTime() + CACHE_TTL_SECONDS * 1000);

      const cacheData: ModelSuggestions = {
        modelType,
        suggestions,
        generatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      const cacheKey = getCacheKey(modelType);
      await redis.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(cacheData));

      console.log(`[SUGGESTIONS] Cached ${suggestions.length} suggestions for ${modelType}`);
      results[modelType] = { success: true };
    } catch (error) {
      console.error(`[SUGGESTIONS] Error generating suggestions for ${modelType}:`, error);
      results[modelType] = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  const allSuccess = Object.values(results).every((r) => r.success);
  return { success: allSuccess, results: results as any };
}

/**
 * Generate and cache suggestions for a specific model type
 */
export async function generateAndCacheSuggestions(modelType: ModelSuggestionType): Promise<{
  success: boolean;
  suggestions?: Suggestion[];
  error?: string;
}> {
  const config = SUGGESTION_CONFIGS[modelType];
  if (!config) {
    return { success: false, error: `Unknown model type: ${modelType}` };
  }

  try {
    const suggestions = await generateSuggestionsWithLLM(config);

    const redis = await getRedisClient();
    if (redis) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + CACHE_TTL_SECONDS * 1000);

      const cacheData: ModelSuggestions = {
        modelType,
        suggestions,
        generatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      const cacheKey = getCacheKey(modelType);
      await redis.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(cacheData));
      console.log(`[SUGGESTIONS] Cached ${suggestions.length} suggestions for ${modelType}`);
    }

    return { success: true, suggestions };
  } catch (error) {
    console.error(`[SUGGESTIONS] Error generating suggestions for ${modelType}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Clear cached suggestions (useful for testing/debugging)
 */
export async function clearSuggestionsCache(): Promise<boolean> {
  try {
    const redis = await getRedisClient();
    if (!redis) return false;

    const modelTypes = Object.keys(SUGGESTION_CONFIGS) as ModelSuggestionType[];
    for (const modelType of modelTypes) {
      const cacheKey = getCacheKey(modelType);
      await redis.del(cacheKey);
    }

    console.log('[SUGGESTIONS] Cache cleared');
    return true;
  } catch (error) {
    console.error('[SUGGESTIONS] Error clearing cache:', error);
    return false;
  }
}
