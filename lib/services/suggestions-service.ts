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
    newsCategories: ['australia news', 'australian culture', 'australia economy', 'australian environment'],
    systemPrompt: `You are generating suggested questions for an Australian AI assistant that excels at reasoning and step-by-step thinking.

CRITICAL REQUIREMENTS:
- ALL suggestions MUST be focused on Australia and Australian context
- Questions should encourage deep thinking, analysis, and reasoning
- Use phrases like "Explain step-by-step", "Think through", "Reason through", "Analyse"
- Cover topics: government, economy, environment, culture, history, society
- Questions should be educational and thought-provoking

Based on recent Australian news and developments, generate reasoning-focused questions.`,
    staticFallback: [
      { text: "Explain step-by-step how the Australian government works", category: "government" },
      { text: "Think through the pros and cons of renewable energy in Australia", category: "environment" },
      { text: "Reason through why the Great Barrier Reef is important to Australia", category: "environment" },
      { text: "Create a detailed poem about the Australian outback", category: "creative" },
      { text: "Explain the difference between Australian and American English", category: "language" },
      { text: "Think step-by-step about Australia's role in the Asia-Pacific region", category: "geopolitics" },
    ],
  },

  'scx-default': {
    modelType: 'scx-default',
    count: 6,
    newsCategories: ['australia news', 'world news', 'technology', 'science'],
    systemPrompt: `You are generating suggested questions for a general-purpose Australian AI assistant.

CRITICAL REQUIREMENTS:
- Suggestions should be diverse covering different topics
- Include mix of Australian-focused and general knowledge questions
- Topics: current events, history, culture, science, technology, practical help
- Questions should be accessible to general users
- Make questions engaging and interesting

Based on recent news and trending topics, generate diverse and engaging questions.`,
    staticFallback: [
      { text: "Explain how the Australian electoral system works", category: "government" },
      { text: "Write a short story set in the Australian outback", category: "creative" },
      { text: "Compare the economies of Australia and New Zealand", category: "economics" },
      { text: "Help me write a professional email to my manager", category: "productivity" },
      { text: "Explain the history of Indigenous Australians", category: "history" },
      { text: "Create a meal plan using Australian ingredients", category: "lifestyle" },
    ],
  },

  'scira-llama-4': {
    modelType: 'scira-llama-4',
    count: 6,
    newsCategories: ['australia news', 'technology', 'science', 'business'],
    systemPrompt: `You are generating suggested questions for Meta's Llama 4 model optimised for Australian context.

CRITICAL REQUIREMENTS:
- Include Australian-focused questions
- Cover diverse topics: current events, technology, science, business, culture
- Questions should showcase the model's capabilities
- Make questions practical and useful

Based on recent news and developments, generate engaging questions.`,
    staticFallback: [
      { text: "Explain how the Australian electoral system works", category: "government" },
      { text: "Write a short story set in the Australian outback", category: "creative" },
      { text: "Compare the economies of Australia and New Zealand", category: "economics" },
      { text: "Help me write a professional email to my manager", category: "productivity" },
      { text: "Explain the history of Indigenous Australians", category: "history" },
      { text: "Create a meal plan using Australian ingredients", category: "lifestyle" },
    ],
  },

  'pro-user': {
    modelType: 'pro-user',
    count: 6,
    newsCategories: ['australia news', 'world news', 'technology', 'finance', 'weather australia'],
    systemPrompt: `You are generating suggested questions for Pro users of an Australian AI search assistant with full tool access.

CRITICAL REQUIREMENTS:
- Questions should leverage the AI's tools: web search, weather, stock prices, maps, movies, academic search
- Include Australian-focused questions
- Show variety: news, weather, finance, local search, entertainment
- Questions should feel timely and relevant to current events
- Make questions practical and action-oriented

Based on recent news and what's happening today, generate tool-utilizing questions.`,
    staticFallback: [
      { text: "What's happening in Australian news today?", category: "news" },
      { text: "Find the best restaurants near me", category: "local" },
      { text: "Analyse the latest academic papers on quantum mechanics", category: "academic" },
      { text: "What's the weather forecast for Melbourne this week?", category: "weather" },
      { text: "What's the share price of CBA?", category: "finance" },
      { text: "Show me trending movies", category: "entertainment" },
    ],
  },

  'free-user': {
    modelType: 'free-user',
    count: 3,
    newsCategories: ['australia news', 'world news'],
    systemPrompt: `You are generating suggested questions for free users of an Australian AI search assistant.

CRITICAL REQUIREMENTS:
- Generate exactly 3 suggestions
- Include a mix: one news-related, one creative, one practical
- Questions should be engaging and showcase the AI's capabilities
- At least one should be Australian-focused

Based on recent news, generate 3 diverse and engaging questions.`,
    staticFallback: [
      { text: "What's happening in Australian news today?", category: "news" },
      { text: "Create a poem about the fall of the Roman Empire", category: "creative" },
      { text: "Analyse www.scx.ai", category: "analysis" },
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
  'scira-magpie': 'scira-magpie',
  magpie: 'scira-magpie',
  'scx-default': 'scx-default',
  'deepseek-v3': 'scx-default',
  'deepseek-v3.1': 'scx-default',
  'deepseek-r1': 'scx-default',
  'gpt-oss-120b': 'scx-default',
  'llama-3.3': 'scx-default',
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
