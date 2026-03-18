// /app/api/lookout/route.ts
import { generateTitleFromUserMessage } from '@/app/actions';
import { convertToModelMessages, streamText, createUIMessageStream, stepCountIs, JsonToSseTransformStream } from 'ai';
import { scira, shouldBypassRateLimits } from '@/ai/providers';
import {
  createStreamId,
  incrementExtremeSearchUsage,
  incrementMessageUsage,
  updateChatTitleById,
  getLookoutById,
  updateLookoutLastRun,
  updateLookout,
  updateLookoutStatus,
  getUserById,
} from '@/lib/db/queries';
import { createResumableUIMessageStream } from 'ai-resumable-stream';
import { getResumableStreamClients } from '@/lib/redis';
import { after } from 'next/server';
import { v7 as uuidv7 } from 'uuid';
import { CronExpressionParser } from 'cron-parser';
import { sendLookoutCompletionEmail } from '@/lib/email';
import { db, maindb } from '@/lib/db';
import { chat as chatTable, message as messageTable, subscription, dodosubscription } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { all, flow } from 'better-all';
import { getBetterAllOptions } from '@/lib/better-all';
import { getCachedUserPreferencesByUserId } from '@/lib/user-data-server';

// Import search tools
import {
  extremeSearchTool,
  webSearchTool,
  academicSearchTool,
  youtubeSearchTool,
  redditSearchTool,
  githubSearchTool,
  stockChartTool,
  currencyConverterTool,
  coinDataTool,
  coinOhlcTool,
  coinDataByContractTool,
  codeContextTool,
  xSearchTool,
  datetimeTool,
  greetingTool,
  retrieveTool,
  weatherTool,
  codeInterpreterTool,
  findPlaceOnMapTool,
  nearbyPlacesSearchTool,
  flightTrackerTool,
  movieTvSearchTool,
  trendingMoviesTool,
  trendingTvTool,
  textTranslateTool,
} from '@/lib/tools';
import { ChatMessage } from '@/lib/types';
import { type UIMessageStreamWriter } from 'ai';
import { XaiProviderOptions } from '@ai-sdk/xai';

/**
 * Truncates markdown at a natural paragraph boundary to avoid broken links,
 * incomplete list items, or mid-sentence cuts.
 */
function truncateMarkdown(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const softLimit = Math.min(text.length, maxLength + 400);

  function scanUntil(endIndex: number) {
    let isInInlineCode = false;
    let isInFence = false;
    let fenceTickCount = 0;

    let linkTextDepth = 0;
    let linkUrlDepth = 0;
    let shouldOpenUrlOnNextParen = false;
    let lastLinkStartIndex: number | null = null;

    let lastDoubleNewline = -1;
    let lastNewline = -1;
    let lastWhitespace = -1;
    let lastSentenceEnd = -1;

    for (let i = 0; i < endIndex; i++) {
      const char = text[i] ?? '';
      const nextTwo = text.slice(i, i + 3);

      if (nextTwo === '```') {
        isInFence = !isInFence;
        fenceTickCount = 0;
        i += 2;
        continue;
      }

      if (!isInFence) {
        if (char === '`') isInInlineCode = !isInInlineCode;

        if (!isInInlineCode) {
          if (char === '\n') {
            if (text[i - 1] === '\n') lastDoubleNewline = i + 1;
            lastNewline = i + 1;
          }

          if (/\s/.test(char)) lastWhitespace = i + 1;

          if ((char === '.' || char === '!' || char === '?') && /\s/.test(text[i + 1] ?? '')) lastSentenceEnd = i + 2;

          if (char === '[') {
            if (linkTextDepth === 0) lastLinkStartIndex = i;
            linkTextDepth += 1;
            shouldOpenUrlOnNextParen = false;
          } else if (char === ']') {
            if (linkTextDepth > 0) linkTextDepth -= 1;
            shouldOpenUrlOnNextParen = linkTextDepth === 0;
          } else if (char === '(') {
            if (shouldOpenUrlOnNextParen) {
              linkUrlDepth += 1;
              shouldOpenUrlOnNextParen = false;
            } else if (linkUrlDepth > 0) {
              // allow nested parens inside the URL
              linkUrlDepth += 1;
            }
          } else if (char === ')') {
            if (linkUrlDepth > 0) linkUrlDepth -= 1;
          } else if (char !== ' ' && char !== '\t') {
            // any non-space breaks the immediate `](` pattern
            shouldOpenUrlOnNextParen = false;
          }
        }
      } else {
        // within fences, don't treat markdown punctuation as structure
        if (char === '`') fenceTickCount += 1;
        else fenceTickCount = 0;
      }
    }

    return {
      isInInlineCode,
      isInFence,
      linkTextDepth,
      linkUrlDepth,
      lastLinkStartIndex,
      lastDoubleNewline,
      lastNewline,
      lastWhitespace,
      lastSentenceEnd,
    };
  }

  let cutIndex = maxLength;
  let stateAtCut = scanUntil(cutIndex);

  // If we are mid-markdown-link at the cut, extend forward a bit to close it cleanly.
  if (stateAtCut.linkTextDepth > 0 || stateAtCut.linkUrlDepth > 0) {
    for (let i = maxLength + 1; i <= softLimit; i++) {
      const nextState = scanUntil(i);
      if (nextState.linkTextDepth === 0 && nextState.linkUrlDepth === 0) {
        cutIndex = i;
        stateAtCut = nextState;
        break;
      }
    }

    // If we couldn't close the link within the soft limit, back up to before the link started.
    if (stateAtCut.linkTextDepth > 0 || stateAtCut.linkUrlDepth > 0) {
      const fallbackIndex = stateAtCut.lastLinkStartIndex ?? stateAtCut.lastNewline ?? stateAtCut.lastWhitespace;
      cutIndex = Math.max(0, Math.min(maxLength, fallbackIndex ?? maxLength));
      stateAtCut = scanUntil(cutIndex);
    }
  }

  // If we ended inside a list item line, try to finish the line (avoid half-rendered bullets).
  if (cutIndex < softLimit) {
    const nextNewlineIndex = text.indexOf('\n', cutIndex);
    if (nextNewlineIndex !== -1 && nextNewlineIndex <= softLimit) cutIndex = nextNewlineIndex;
  }

  // Prefer cutting at clean boundaries (in order).
  const boundaryState = scanUntil(cutIndex);
  const preferredBoundary =
    boundaryState.lastDoubleNewline > 0
      ? boundaryState.lastDoubleNewline
      : boundaryState.lastNewline > 0
        ? boundaryState.lastNewline
        : boundaryState.lastSentenceEnd > 0
          ? boundaryState.lastSentenceEnd
          : boundaryState.lastWhitespace > 0
            ? boundaryState.lastWhitespace
            : cutIndex;

  const safeIndex = Math.max(0, Math.min(cutIndex, preferredBoundary));
  const truncated = text.slice(0, safeIndex).trimEnd();
  return `${truncated}`;
}

// Static tool instances (already created, don't need to be called as functions)
const STATIC_TOOLS: Record<string, any> = {
  youtube_search: youtubeSearchTool,
  stock_chart: stockChartTool,
  currency_converter: currencyConverterTool,
  coin_data: coinDataTool,
  coin_ohlc: coinOhlcTool,
  coin_data_by_contract: coinDataByContractTool,
  code_context: codeContextTool,
  datetime: datetimeTool,
  greeting: greetingTool,
  retrieve: retrieveTool,
  get_weather_data: weatherTool,
  code_interpreter: codeInterpreterTool,
  find_place_on_map: findPlaceOnMapTool,
  nearby_places_search: nearbyPlacesSearchTool,
  track_flight: flightTrackerTool,
  movie_or_tv_search: movieTvSearchTool,
  trending_movies: trendingMoviesTool,
  trending_tv: trendingTvTool,
  text_translate: textTranslateTool,
};

// Tool factories that need dataStream parameter
const DATASTREAM_TOOL_FACTORIES: Record<string, (dataStream: UIMessageStreamWriter<ChatMessage>) => any> = {
  extreme_search: (dataStream) => extremeSearchTool(dataStream), // overridden in getToolsForSearchMode when modelId is available
  web_search: webSearchTool,
  academic_search: academicSearchTool,
  reddit_search: redditSearchTool,
  github_search: githubSearchTool,
  x_search: xSearchTool,
};

// Search mode to tools mapping (matching groupTools from actions.ts)
const SEARCH_MODE_TOOLS: Record<string, readonly string[]> = {
  extreme: ['extreme_search'],
  web: [
    'web_search',
    'greeting',
    'code_interpreter',
    'get_weather_data',
    'retrieve',
    'text_translate',
    'nearby_places_search',
    'track_flight',
    'movie_or_tv_search',
    'trending_movies',
    'find_place_on_map',
    'trending_tv',
    'datetime',
  ],
  academic: ['academic_search', 'code_interpreter', 'datetime'],
  youtube: ['youtube_search', 'datetime'],
  reddit: ['reddit_search', 'datetime'],
  github: ['github_search', 'datetime'],
  stocks: ['stock_chart', 'currency_converter', 'datetime'],
  code: ['code_context'],
  x: ['x_search'],
  chat: [],
};

// Get tools for a search mode
function getToolsForSearchMode(
  searchMode: string,
  dataStream: UIMessageStreamWriter<ChatMessage>,
  options?: {
    extremeSearchModelId?:
      | 'scira-ext-1'
      | 'scira-ext-2'
      | 'scira-ext-4'
      | 'scira-ext-5'
      | 'scira-ext-6'
      | 'scira-ext-7'
      | 'scira-ext-8';
  },
): Record<string, any> {
  const toolNames = SEARCH_MODE_TOOLS[searchMode] || SEARCH_MODE_TOOLS.extreme;
  const tools: Record<string, any> = {};

  for (const toolName of toolNames) {
    // Check if it's a tool that needs dataStream
    if (toolName === 'extreme_search') {
      tools[toolName] = extremeSearchTool(dataStream, [], options?.extremeSearchModelId || 'scira-ext-1');
    } else if (toolName in DATASTREAM_TOOL_FACTORIES) {
      tools[toolName] = DATASTREAM_TOOL_FACTORIES[toolName](dataStream);
    } else if (toolName in STATIC_TOOLS) {
      // Static tool - use directly
      tools[toolName] = STATIC_TOOLS[toolName];
    }
  }

  return tools;
}

// Get system prompt for a search mode
function getSystemPromptForSearchMode(searchMode: string): string {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    weekday: 'short',
  });

  const toolNamesForMode = SEARCH_MODE_TOOLS[searchMode] || SEARCH_MODE_TOOLS.extreme;
  const primaryToolName = toolNamesForMode[0];

  const linkFormatRules =
    searchMode === 'reddit'
      ? `

---

## 🔗 CITATION FORMAT - REDDIT SPECIFIC RULES

### Link Formatting (MANDATORY FOR REDDIT)
- ⚠️ **USE POST TITLE FORMAT**: Citations must use format \`[Post Title](url)\` with the actual Reddit post title
- ⚠️ **NO NUMBERED FOOTNOTES**: Never use [1], [2], [3] style references
- ⚠️ **NO REFERENCE SECTIONS**: Never create separate "References", "Sources", or "Links" sections
- ⚠️ **INLINE ONLY**: Citations must appear immediately after the sentence they support
- ⚠️ **USE ACTUAL POST TITLES**: Never use generic link text like "text", "source", "link"
- ⚠️ **NO BARE URLs**: Never include bare URLs
- ⚠️ **NO FULL STOPS AFTER LINKS**: Never place a period (.) immediately after a citation link
- ⚠️ **NO PIPE CHARACTERS**: Never use pipe characters (|) between links or inside citation text
`
      : `

---

## 🔗 CITATION FORMAT - CRITICAL RULES

### Link Formatting (MANDATORY)
- ⚠️ **USE INLINE TEXT CITATIONS**: Citations must use markdown link format with text as display text
- ⚠️ **FORMAT**: \`[text](url)\`
- ⚠️ **NO NUMBERED FOOTNOTES**: Never use [1], [2], [3] style references
- ⚠️ **NO REFERENCE SECTIONS**: Never create separate "References", "Sources", or "Links" sections
- ⚠️ **INLINE ONLY**: Citations must appear immediately after the sentence they support
- ⚠️ **NO GENERIC LINK TEXT**: Never use generic link text like "text", "source", "link" — use the actual page/article/title text
- ⚠️ **NO BARE URLs**: Never include bare URLs
- ⚠️ **NO FULL STOPS AFTER LINKS**: Never place a period (.) immediately after a citation link
- ⚠️ **NO PIPE CHARACTERS**: Never use pipe characters (|) between links or inside citation text
`;

  const basePrompt = `# Scira AI Scheduled Research Assistant

You are an advanced research assistant focused on deep analysis and comprehensive understanding, with a focus on being backed by citations.

**Today's Date:** ${today}

---

## 🚨 CRITICAL OPERATION RULES

### Immediate Tool Execution
- ⚠️ **MANDATORY**: ${primaryToolName ? `Run \`${primaryToolName}\` INSTANTLY when processing ANY scheduled query` : 'Do NOT call tools unless required by the user'} - NO EXCEPTIONS
- ⚠️ **NO PRE-ANALYSIS**: Do NOT write any text before running the tool (if a tool is required)
- ⚠️ **ONE TOOL ONLY**: Run the tool once and only once per scheduled search
- ⚠️ **NO CLARIFICATION**: Never ask for clarification - make best interpretation and proceed
- ⚠️ **DIRECT ANSWERS**: Go straight to answering after running the tool
- ⚠️ **NO PREFACES**: Never begin with "I'm assuming..." or "Based on your query..."

### Response Format Requirements
- ⚠️ **MANDATORY**: Always respond with markdown format
- ⚠️ **CITATIONS REQUIRED**: EVERY factual claim MUST have a citation
- ⚠️ **IMMEDIATE CITATIONS**: Citations must appear immediately after each sentence with factual content
- ⚠️ **NO END CITATIONS**: Never put citations at the end of paragraphs/sections
- ⚠️ **STRICT MARKDOWN**: All responses must use proper markdown formatting throughout

### Response Structure - MANDATORY
- ⚠️ **CRITICAL**: ALWAYS start your response with "## Key Points" followed by a bulleted list of main findings
- ⚠️ **MINIMUM REQUIRED**: The "## Key Points" section MUST contain at least 10 bullet points (10+). If you have fewer than 10, keep researching/synthesizing until you have 10.
- After Key Points, write well formatted super detailed sections and finish with a conclusion`;

  // Add mode-specific instructions
  const modeInstructions: Record<string, string> = {
    extreme: `

## 🛠️ TOOL GUIDELINES

### Extreme Search Tool
- **Purpose**: Multi-step research planning with parallel web and academic searches
- **Output**: Comprehensive 3-page research paper with citations`,
    web: `

## 🛠️ TOOL GUIDELINES

### Web Search Tool
- **Purpose**: Search across the web for relevant information
- **Output**: Well-structured summary with citations from web sources`,
    academic: `

## 🛠️ TOOL GUIDELINES

### Academic Search Tool
- **Purpose**: Search academic papers and research publications
- **Output**: Academic summary with proper citations from research sources`,
    youtube: `

## 🛠️ TOOL GUIDELINES

### YouTube Search Tool
- **Purpose**: Search YouTube videos for relevant content
- **Output**: Summary of video content with links to relevant videos`,
    reddit: `

## 🛠️ TOOL GUIDELINES

### Reddit Search Tool - MULTI-QUERY FORMAT REQUIRED
- ⚠️ **MANDATORY**: ALWAYS use MULTIPLE QUERIES (3-5 queries) in ARRAY FORMAT - NO SINGLE QUERIES ALLOWED
- ⚠️ **FORMAT**: Use queries: ["query1", "query2", "query3"] - NEVER use a single string query
- **Query Range**: 3-5 queries minimum (3 required, 5 maximum) - create variations and related searches
- **All Parameters in Arrays**: queries, maxResults, timeRange must all be arrays
- When searching Reddit, set maxResults array to at least [10, 10, 10] or higher for each query
- Set timeRange array with appropriate values based on query (["week", "week", "month"], etc.)

**Multi-Query Examples:**
- ✅ CORRECT: queries: ["best AI tools 2025", "AI productivity tools Reddit", "latest AI software recommendations"]
- ✅ CORRECT: queries: ["Python tips", "Python best practices", "Python coding advice"], timeRange: ["month", "month", "month"]
- ❌ WRONG: query: "best AI tools" (single query - FORBIDDEN)
- ❌ WRONG: queries: ["single query only"] (only one query - FORBIDDEN)

### Content Structure (REQUIRED)
- Begin with a concise introduction summarizing the Reddit landscape on the topic
- Include all relevant results in your response, not just the first one
- Cite specific posts using their actual titles
- All citations must be inline, placed immediately after the relevant information
- Format citations as: [Actual Post Title](URL)

### Citation Format - Reddit Specific
- ⚠️ **MANDATORY FORMAT**: Use [Post Title](URL) for all Reddit citations - use the actual post title from Reddit
- ⚠️ **INLINE PLACEMENT**: Citations must appear immediately after the sentence containing the information
- ⚠️ **NO REFERENCE SECTIONS**: Never create separate "References", "Sources", or "Links" sections
- ⚠️ **NO NUMBERED FOOTNOTES**: Never use [1], [2], [3] style references
- ⚠️ **MULTIPLE SOURCES**: For multiple Reddit posts, use: [Post Title 1](url1) [Post Title 2](url2)
- ⚠️ **USE ACTUAL POST TITLES**: Always use the exact post title from Reddit, not generic text like "Source" or "Link"

**Correct Reddit Citation Examples:**
- "Many users recommend Python for beginners [Python Learning Guide](https://reddit.com/r/learnprogramming/...)"
- "The community discusses AI safety [AI Safety Discussion](url1) [Ethics in AI](url2)"

**Incorrect Examples (NEVER DO THIS):**
- ❌ "[Source](url)" or "[Link](url)" - too generic, must use actual post title
- ❌ "Post Title [1]" with "[1] https://..." at the end - numbered footnotes forbidden
- ❌ Bare URLs: "See https://reddit.com/r/..."`,
    github: `

## 🛠️ TOOL GUIDELINES

### GitHub Search Tool - MULTI-QUERY FORMAT REQUIRED
- ⚠️ **MANDATORY**: ALWAYS use MULTIPLE QUERIES (3-5 queries) in ARRAY FORMAT - NO SINGLE QUERIES ALLOWED
- ⚠️ **FORMAT**: Use queries: ["query1", "query2", "query3"] - NEVER use a single string query
- **Query Range**: 3-5 queries minimum (3 required, 5 maximum) - create variations and related searches
- When searching GitHub, set maxResults array to at least [10, 10, 10] or higher for each query
- Use startDate and endDate for time-based filtering when relevant

**Multi-Query Examples:**
- ✅ CORRECT: queries: ["react state management", "react redux alternatives", "react zustand tutorial"]
- ✅ CORRECT: queries: ["machine learning python", "ML frameworks comparison", "deep learning libraries"]
- ❌ WRONG: query: "react state management" (single query - FORBIDDEN)
- ❌ WRONG: queries: ["single query only"] (only one query - FORBIDDEN)

### Content Structure (REQUIRED)
- Begin with a concise introduction summarizing the GitHub landscape on the topic
- Include all relevant results in your response, not just the first one
- Cite specific repositories using their names
- Mention stars, languages, and other relevant metadata when available
- All citations must be inline, placed immediately after the relevant information`,
    stocks: `

## 🛠️ TOOL GUIDELINES

### Stock Chart Tool
- **Purpose**: Get stock market data and charts
- **Output**: Stock analysis with current prices and trends`,
    code: `

## 🛠️ TOOL GUIDELINES

### Code Context Tool
- **Purpose**: Retrieve technical context about languages/frameworks/libraries
- **Output**: Technical explanation with concrete code examples`,
    x: `

## 🛠️ TOOL GUIDELINES

### X Search Tool - MULTI-QUERY FORMAT REQUIRED
- ⚠️ **MANDATORY**: ALWAYS use MULTIPLE QUERIES (3-5 queries) in ARRAY FORMAT - NO SINGLE QUERIES ALLOWED
- ⚠️ **FORMAT**: Use queries: ["query1", "query2", "query3"] - NEVER use a single string query
- **Query Range**: 3-5 queries minimum (3 required, 5 maximum) - create variations and related searches
- **All Parameters in Arrays**: queries, maxResults must be in array format

### Query Writing Rules - CRITICAL
- ⚠️ **NATURAL LANGUAGE ONLY**: Write queries in natural language - describe what you're looking for
- ⚠️ **NO TWITTER SYNTAX**: NEVER use Twitter search syntax like "from:handle", "to:handle", "filter:links", etc.
- ⚠️ **NO HANDLES IN QUERIES**: Do NOT include handles or "@username" in the query strings themselves
- ⚠️ **EXTRACT HANDLES SEPARATELY**: When user mentions a handle (e.g., "@openai", "from @elonmusk"), extract it to the includeXHandles parameter
- ⚠️ **CLEAN QUERIES**: Keep queries focused on the topic/content, not the author syntax

### Handle Extraction and Usage
- **When to extract handles**: If user explicitly mentions a handle (e.g., "tweets from @openai", "posts by @elonmusk", "what did @sama say")
- **How to extract**: Identify handles from user message (look for @username patterns)
- **Parameter usage**: Use includeXHandles parameter with array of handles WITHOUT @ symbol (e.g., ["openai", "elonmusk"])
- **Query adjustment**: Remove handle references from queries - write queries about the topic/content instead
- **Example transformation**:
  - User: "What did @openai post about GPT-5?"
  - ✅ CORRECT: queries: ["GPT-5 updates", "GPT-5 features", "GPT-5 release"], includeXHandles: ["openai"]
  - ❌ WRONG: queries: ["from:openai GPT-5", "GPT-5 @openai"] (contains Twitter syntax or handles in query)

### Date Parameters
- **Optional**: Only use date parameters if user explicitly requests a specific date range
- **Default behavior**: Tool defaults to past 15 days - don't specify dates unless user asks
- **Format**: Use YYYY-MM-DD format for startDate and endDate

**Multi-Query Examples:**
- ✅ CORRECT: queries: ["AI developments 2025", "latest AI news", "AI breakthrough today"]
- ✅ CORRECT: queries: ["Python tips", "Python best practices", "Python coding tricks"]
- ✅ CORRECT (with handles): queries: ["AI safety research", "AI alignment progress"], includeXHandles: ["openai"]
- ❌ WRONG: query: "AI news" (single query - FORBIDDEN)
- ❌ WRONG: queries: ["from:openai AI updates"] (contains Twitter syntax - FORBIDDEN)
- ❌ WRONG: queries: ["@openai GPT-5"] (contains handle in query - use includeXHandles instead)

### Citation Requirements
- ⚠️ **MANDATORY**: Every factual claim must have a citation in the format [Title](Url)
- Citations MUST be placed immediately after the sentence containing the information
- ⚠️ **MINIMUM CITATION REQUIREMENT**: Every part of the answer must have more than 3 citations
- NEVER group citations at the end of paragraphs or the response
- Each distinct piece of information requires its own citation
- ⚠️ **NO REFERENCE SECTIONS**: Never create "References", "Sources", or "Links" sections`,
    chat: `

## 🛠️ TOOL GUIDELINES

### Chat Mode
- **Purpose**: Respond directly without tool usage
- **Output**: Helpful, concise answer in markdown`,
  };

  return basePrompt + linkFormatRules + (modeInstructions[searchMode] || modeInstructions.extreme);
}

// Helper function to check if a user is pro by userId.
// Uses flow() to race both queries — exits as soon as either finds an active subscription.
async function checkUserIsProById(userId: string): Promise<boolean> {
  try {
    const result = await flow<boolean>(
      {
        async polarSubscriptions() {
          const subs = await db.select().from(subscription).where(eq(subscription.userId, userId));
          const now = new Date();
          const active = subs.find((sub) => sub.status === 'active' && new Date(sub.currentPeriodEnd) > now);
          if (active) this.$end(true);
          return subs;
        },
        async dodoSubscriptions() {
          const subs = await db.select().from(dodosubscription).where(eq(dodosubscription.userId, userId));
          const now = new Date();
          const active = subs.find(
            (sub) => sub.status === 'active' && (!sub.currentPeriodEnd || new Date(sub.currentPeriodEnd) > now),
          );
          if (active) this.$end(true);
          return subs;
        },
      },
      getBetterAllOptions(),
    );
    return result ?? false;
  } catch (error) {
    console.error('Error checking pro status:', error);
    return false; // Fail closed - don't allow access if we can't verify
  }
}

export async function POST(req: Request) {
  console.log('🔍 Lookout API endpoint hit from QStash');

  const requestStartTime = Date.now();
  let runDuration = 0;
  let runError: string | undefined;

  try {
    const { lookoutId, prompt, userId } = await req.json();

    console.log('--------------------------------');
    console.log('Lookout ID:', lookoutId);
    console.log('User ID:', userId);
    console.log('Prompt:', prompt);
    console.log('--------------------------------');

    // Verify lookout exists and get details with retry logic
    let lookout: any = null;
    let retryCount = 0;
    const maxRetries = 3;

    while (!lookout && retryCount < maxRetries) {
      lookout = await getLookoutById({ id: lookoutId });
      if (!lookout) {
        retryCount++;
        if (retryCount < maxRetries) {
          // Actual exponential backoff: 500ms, 1000ms, 2000ms
          const delay = 500 * Math.pow(2, retryCount - 1);
          console.log(`Lookout not found on attempt ${retryCount}, retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (!lookout) {
      console.error('Lookout not found after', maxRetries, 'attempts:', lookoutId);
      return new Response('Lookout not found', { status: 404 });
    }

    // Get user details, check pro status, and fetch preferences in parallel (eliminate waterfall)
    const { userResult, isUserPro, userPrefs } = await all(
      {
        async userResult() {
          return getUserById(userId);
        },
        async isUserPro() {
          return checkUserIsProById(userId);
        },
        async userPrefs() {
          return getCachedUserPreferencesByUserId(userId);
        },
      },
      getBetterAllOptions(),
    );

    if (!userResult) {
      console.error('User not found:', userId);
      return new Response('User not found', { status: 404 });
    }

    if (!isUserPro) {
      console.error('User is not pro, cannot run lookout:', userId);
      return new Response('Lookouts require a Pro subscription', { status: 403 });
    }

    // Generate a new chat ID for this scheduled search
    const chatId = uuidv7();
    const streamId = 'stream-' + uuidv7();

    // Create the chat
    await maindb.insert(chatTable).values({
      id: chatId,
      createdAt: new Date(),
      userId: userResult.id,
      title: `Scheduled: ${lookout.title}`,
      visibility: 'private',
    });

    // Verify chat persisted on primary (fail-fast)
    const persistedChat = await maindb.query.chat.findFirst({ where: eq(chatTable.id, chatId) });
    if (!persistedChat) {
      throw new Error(`Failed to persist lookout chat (chatId=${chatId})`);
    }

    // Create user message
    const userMessage = {
      id: uuidv7(),
      role: 'user' as const,
      content: prompt,
      parts: [{ type: 'text' as const, text: prompt }],
      experimental_attachments: [],
    };
    const initialMessageIds = new Set([userMessage.id]);

    // Insert user message first (required for FK constraint)
    await maindb
      .insert(messageTable)
      .values([
        {
          chatId,
          id: userMessage.id,
          role: 'user',
          parts: userMessage.parts,
          attachments: [],
          createdAt: new Date(),
          model: 'scira-default',
          completionTime: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
      ])
      .onConflictDoNothing({ target: messageTable.id });

    // Run verification, stream creation, and status update in parallel
    // (these are independent operations after message insert)
    await all(
      {
        async verifyMessage() {
          const msg = await maindb.query.message.findFirst({ where: eq(messageTable.id, userMessage.id) });
          if (!msg) {
            throw new Error(`Failed to persist lookout user message (messageId=${userMessage.id}, chatId=${chatId})`);
          }
        },
        async createStream() {
          await createStreamId({ streamId, chatId });
        },
        async updateStatus() {
          await updateLookoutStatus({
            id: lookoutId,
            status: 'running',
          });
        },
      },
      getBetterAllOptions(),
    );

    // Get search mode from lookout (default to 'extreme' for backward compatibility)
    const searchMode = lookout.searchMode || 'extreme';
    console.log('🔍 Using search mode:', searchMode);

    // Create data stream with execute function
    const abortController = new AbortController();

    const stream = createUIMessageStream<ChatMessage>({
      execute: async ({ writer: dataStream }) => {
        const streamStartTime = Date.now();

        // Get tools and system prompt for the search mode
        const extremeSearchModelId = userPrefs?.preferences?.['scira-extreme-search-model'] as
          | 'scira-ext-1'
          | 'scira-ext-2'
          | 'scira-ext-4'
          | 'scira-ext-5'
          | 'scira-ext-6'
          | 'scira-ext-7'
          | 'scira-ext-8'
          | undefined;
        const tools = getToolsForSearchMode(searchMode, dataStream, { extremeSearchModelId });
        const activeToolNames = Object.keys(tools);
        const systemPrompt = getSystemPromptForSearchMode(searchMode);

        console.log('🛠️ Active tools:', activeToolNames);

        // Start streaming
        const result = streamText({
          model: scira.languageModel('scira-default'),
          messages: await convertToModelMessages([userMessage]),
          stopWhen: stepCountIs(2),
          maxRetries: 10,
          abortSignal: abortController.signal,
          activeTools: activeToolNames,
          system: systemPrompt,
          toolChoice: 'auto',
          tools,
          providerOptions: {
            xai: {
              parallel_function_calling: false,
            } satisfies XaiProviderOptions,
          },
          onChunk(event) {
            if (event.chunk.type === 'tool-call') {
              console.log('Called Tool: ', event.chunk.toolName);
            }
          },
          onStepFinish(event) {
            if (event.warnings) {
              console.log('Warnings: ', event.warnings);
            }
          },
          onFinish: async (event) => {
            console.log('Finish reason: ', event.finishReason);
            console.log('Steps: ', event.steps);
            console.log('Usage: ', event.usage);

            if (event.finishReason === 'stop') {
              try {
                // Track usage (matches /app/api/search/route.ts)
                if (!shouldBypassRateLimits('scira-default', userResult)) {
                  await incrementMessageUsage({ userId: userResult.id });
                }

                // Generate title for the chat
                const title = await generateTitleFromUserMessage({
                  message: userMessage,
                });

                console.log('Generated title: ', title);

                // Update the chat with the generated title
                await updateChatTitleById({
                  chatId,
                  title: `Scheduled: ${title}`,
                });

                // Track extreme search usage
                const extremeSearchUsed = event.steps?.some((step) =>
                  step.toolCalls?.some((toolCall) => toolCall.toolName === 'extreme_search'),
                );

                if (extremeSearchUsed) {
                  console.log('Extreme search was used, incrementing count');
                  await incrementExtremeSearchUsage({ userId: userResult.id });
                }

                // Calculate run duration
                runDuration = Date.now() - requestStartTime;

                // Count tool calls performed (across any tool; persisted as `searchesPerformed` for backward compatibility)
                const searchesPerformed =
                  event.steps?.reduce((total, step) => {
                    return total + (step.toolCalls?.length ?? 0);
                  }, 0) ?? 0;

                // Update lookout with last run info including metrics
                await updateLookoutLastRun({
                  id: lookoutId,
                  lastRunAt: new Date(),
                  lastRunChatId: chatId,
                  runStatus: 'success',
                  duration: runDuration,
                  tokensUsed: event.usage?.totalTokens,
                  searchesPerformed,
                });

                // Calculate next run time for recurring lookouts
                if (lookout.frequency !== 'once' && lookout.cronSchedule) {
                  try {
                    const options = {
                      currentDate: new Date(),
                      tz: lookout.timezone,
                    };

                    // Strip CRON_TZ= prefix if present
                    const cleanCronSchedule = lookout.cronSchedule.startsWith('CRON_TZ=')
                      ? lookout.cronSchedule.split(' ').slice(1).join(' ')
                      : lookout.cronSchedule;

                    const interval = CronExpressionParser.parse(cleanCronSchedule, options);
                    const nextRunAt = interval.next().toDate();

                    await updateLookout({
                      id: lookoutId,
                      nextRunAt,
                    });
                  } catch (error) {
                    console.error('Error calculating next run time:', error);
                  }
                } else if (lookout.frequency === 'once') {
                  // Mark one-time lookouts as paused after running
                  await updateLookoutStatus({
                    id: lookoutId,
                    status: 'paused',
                  });
                }

                // Send completion email to user
                if (userResult.email) {
                  try {
                    // Extract assistant response - use event.text which contains the full response
                    let assistantResponseText = event.text || '';

                    // If event.text is empty, try extracting from messages
                    if (!assistantResponseText.trim()) {
                      const assistantMessages = event.response.messages.filter((msg: any) => msg.role === 'assistant');

                      for (const msg of assistantMessages) {
                        if (typeof msg.content === 'string') {
                          assistantResponseText += msg.content + '\n';
                        } else if (Array.isArray(msg.content)) {
                          const textContent = msg.content
                            .filter((part: any) => part.type === 'text')
                            .map((part: any) => part.text)
                            .join('\n');
                          assistantResponseText += textContent + '\n';
                        }
                      }
                    }

                    console.log('📧 Assistant response length:', assistantResponseText.length);
                    console.log('📧 First 200 chars:', assistantResponseText.substring(0, 200));

                    const trimmedResponse = assistantResponseText.trim() || 'No response available.';
                    const finalResponse = truncateMarkdown(trimmedResponse, 2000);

                    await sendLookoutCompletionEmail({
                      to: userResult.email,
                      chatTitle: title,
                      assistantResponse: finalResponse,
                      chatId,
                    });
                  } catch (emailError) {
                    console.error('Failed to send completion email:', emailError);
                  }
                }

                // Set lookout status back to active after successful completion
                await updateLookoutStatus({
                  id: lookoutId,
                  status: 'active',
                });

                console.log('Scheduled search completed successfully');
              } catch (error) {
                console.error('Error in onFinish:', error);
              }
            }

            // Calculate and log overall request processing time
            const requestEndTime = Date.now();
            const processingTime = (requestEndTime - requestStartTime) / 1000;
            console.log('--------------------------------');
            console.log(`Total request processing time: ${processingTime.toFixed(2)} seconds`);
            console.log('--------------------------------');
          },
          onError: async (event) => {
            console.log('Error: ', event.error);

            // Calculate run duration and capture error
            runDuration = Date.now() - requestStartTime;
            runError = (event.error as string) || 'Unknown error occurred';

            // Update lookout with failed run info
            try {
              await updateLookoutLastRun({
                id: lookoutId,
                lastRunAt: new Date(),
                lastRunChatId: chatId,
                runStatus: 'error',
                error: runError,
                duration: runDuration,
              });
            } catch (updateError) {
              console.error('Failed to update lookout with error info:', updateError);
            }

            // Set lookout status back to active on error
            try {
              await updateLookoutStatus({
                id: lookoutId,
                status: 'active',
              });
              console.log('Reset lookout status to active after error');
            } catch (statusError) {
              console.error('Failed to reset lookout status after error:', statusError);
            }

            const requestEndTime = Date.now();
            const processingTime = (requestEndTime - requestStartTime) / 1000;
            console.log('--------------------------------');
            console.log(`Request processing time (with error): ${processingTime.toFixed(2)} seconds`);
            console.log('--------------------------------');
          },
        });

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
            messageMetadata: ({ part }) => {
              if (part.type === 'finish') {
                console.log('Finish part: ', part);
                const processingTime = (Date.now() - streamStartTime) / 1000;
                return {
                  model: 'scira-default',
                  completionTime: processingTime,
                  createdAt: new Date().toISOString(),
                  totalTokens: part.totalUsage?.totalTokens ?? null,
                  inputTokens: part.totalUsage?.inputTokens ?? null,
                  outputTokens: part.totalUsage?.outputTokens ?? null,
                };
              }
            },
          }),
        );
      },
      onError(error) {
        console.log('Error: ', error);
        return 'Oops, an error occurred in scheduled search!';
      },
      onFinish: async ({ messages: streamedMessages }) => {
        const newMessages = streamedMessages.filter((message) => !initialMessageIds.has(message.id));

        if (newMessages.length === 0) {
          return;
        }

        await maindb
          .insert(messageTable)
          .values(
            newMessages.map((message) => {
              const attachments = (message as any).experimental_attachments ?? [];
              const createdAt =
                typeof message.metadata?.createdAt === 'string' ? new Date(message.metadata.createdAt) : new Date();

              return {
                id: message.id,
                role: message.role,
                parts: message.parts,
                createdAt,
                attachments,
                chatId,
                model: 'scira-default',
                completionTime: message.metadata?.completionTime ?? 0,
                inputTokens: message.metadata?.inputTokens ?? 0,
                outputTokens: message.metadata?.outputTokens ?? 0,
                totalTokens: message.metadata?.totalTokens ?? 0,
              };
            }),
          )
          .onConflictDoNothing({ target: messageTable.id });
      },
    });

    const clients = getResumableStreamClients();

    if (clients) {
      const context = await createResumableUIMessageStream({
        streamId,
        publisher: clients.publisher,
        subscriber: clients.subscriber,
        abortController,
        waitUntil: after,
      });
      const resumableStream = await context.startStream(stream as ReadableStream<any>);
      return new Response(resumableStream.pipeThrough(new JsonToSseTransformStream()));
    }

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    console.error('Error in lookout API:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
