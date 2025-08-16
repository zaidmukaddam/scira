// app/actions.ts
'use server';

import { geolocation } from '@vercel/functions';
import { serverEnv } from '@/env/server';
import { SearchGroupId } from '@/lib/utils';
import { generateObject, UIMessage, generateText, generateId } from 'ai';
import type { CoreMessage, ModelMessage } from 'ai';
import { z } from 'zod';
import { getUser } from '@/lib/auth-utils';
import { scira } from '@/ai/providers';
import {
  getChatsByUserId,
  deleteChatById,
  updateChatVisiblityById,
  getChatById,
  getMessageById,
  deleteMessagesByChatIdAfterTimestamp,
  updateChatTitleById,
  getExtremeSearchCount,
  incrementMessageUsage,
  getMessageCount,
  getHistoricalUsageData,
  getCustomInstructionsByUserId,
  createCustomInstructions,
  updateCustomInstructions,
  deleteCustomInstructions,
  getPaymentsByUserId,
  createLookout,
  getLookoutsByUserId,
  getLookoutById,
  updateLookout,
  updateLookoutStatus,
  deleteLookout,
} from '@/lib/db/queries';
import { getDiscountConfig } from '@/lib/discount';
import { GroqProviderOptions, groq } from '@ai-sdk/groq';
import { Client } from '@upstash/qstash';
// Removed old subscription imports - now using unified user data approach
import { usageCountCache, createMessageCountKey, createExtremeCountKey } from '@/lib/performance-cache';
import { CronExpressionParser } from 'cron-parser';

// Server action to get the current user with Pro status - UNIFIED VERSION
export async function getCurrentUser() {
  'use server';

  // Import here to avoid issues with SSR
  const { getComprehensiveUserData } = await import('@/lib/user-data-server');
  return await getComprehensiveUserData();
}

export async function suggestQuestions(history: any[]) {
  'use server';

  console.log(history);

  const { object } = await generateObject({
    model: scira.languageModel('scira-grok-3'),
    temperature: 0,
    maxOutputTokens: 512,
    system: `You are a search engine follow up query/questions generator. You MUST create EXACTLY 3 questions for the search engine based on the message history.

### Question Generation Guidelines:
- Create exactly 3 questions that are open-ended and encourage further discussion
- Questions must be concise (5-10 words each) but specific and contextually relevant
- Each question must contain specific nouns, entities, or clear context markers
- NEVER use pronouns (he, she, him, his, her, etc.) - always use proper nouns from the context
- Questions must be related to tools available in the system
- Questions should flow naturally from previous conversation
- You are here to generate questions for the search engine not to use tools or run tools!!

### Tool-Specific Question Types:
- Web search: Focus on factual information, current events, or general knowledge
- Academic: Focus on scholarly topics, research questions, or educational content
- YouTube: Focus on tutorials, how-to questions, or content discovery
- Social media (X/Twitter): Focus on trends, opinions, or social conversations
- Code/Analysis: Focus on programming, data analysis, or technical problem-solving
- Weather: Redirect to news, sports, or other non-weather topics
- Location: Focus on culture, history, landmarks, or local information
- Finance: Focus on market analysis, investment strategies, or economic topics

### Context Transformation Rules:
- For weather conversations → Generate questions about news, sports, or other non-weather topics
- For programming conversations → Generate questions about algorithms, data structures, or code optimization
- For location-based conversations → Generate questions about culture, history, or local attractions
- For mathematical queries → Generate questions about related applications or theoretical concepts
- For current events → Generate questions that explore implications, background, or related topics

### Formatting Requirements:
- No bullet points, numbering, or prefixes
- No quotation marks around questions
- Each question must be grammatically complete
- Each question must end with a question mark
- Questions must be diverse and not redundant
- Do not include instructions or meta-commentary in the questions`,
    messages: history,
    schema: z.object({
      questions: z.array(z.string()).describe('The generated questions based on the message history.'),
    }),
  });

  return {
    questions: object.questions,
  };
}

export async function checkImageModeration(images: string[]) {
  const messages: ModelMessage[] = images.map((image) => ({
    role: 'user',
    content: [{ type: 'image', image: image }],
  }));

  const { text } = await generateText({
    model: groq('meta-llama/llama-guard-4-12b'),
    messages,
    providerOptions: {
      groq: {
        service_tier: 'flex',
      },
    },
  });
  return text;
}

export async function generateTitleFromUserMessage({ message }: { message: UIMessage }) {
  const { text: title } = await generateText({
    model: scira.languageModel('scira-nano'),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - the title should creative and unique
    - do not use quotes or colons`,
    prompt: JSON.stringify(message),
    providerOptions: {
      groq: {
        service_tier: 'flex',
      },
    },
  });

  return title;
}

const ELEVENLABS_API_KEY = serverEnv.ELEVENLABS_API_KEY;

export async function generateSpeech(text: string) {
  const VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'; // This is the ID for the "George" voice. Replace with your preferred voice ID.
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
  const method = 'POST';

  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is not defined');
  }

  const headers = {
    Accept: 'audio/mpeg',
    'xi-api-key': ELEVENLABS_API_KEY,
    'Content-Type': 'application/json',
  };

  const data = {
    text,
    model_id: 'eleven_turbo_v2_5',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.5,
    },
  };

  const body = JSON.stringify(data);

  const input = {
    method,
    headers,
    body,
  };

  const response = await fetch(url, input);

  const arrayBuffer = await response.arrayBuffer();

  const base64Audio = Buffer.from(arrayBuffer).toString('base64');

  return {
    audio: `data:audio/mp3;base64,${base64Audio}`,
  };
}

// Map deprecated 'buddy' group ID to 'memory' for backward compatibility
type LegacyGroupId = SearchGroupId | 'buddy';

const groupTools = {
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
    'mcp_search',
  ] as const,
  academic: ['academic_search', 'code_interpreter', 'datetime'] as const,
  youtube: ['youtube_search', 'datetime'] as const,
  reddit: ['reddit_search', 'datetime'] as const,
  stocks: ['stock_chart', 'currency_converter', 'datetime'] as const,
  crypto: ['coin_data', 'coin_ohlc', 'coin_data_by_contract', 'datetime'] as const,
  chat: [] as const,
  extreme: ['extreme_search'] as const,
  x: ['x_search'] as const,
  memory: ['memory_manager', 'datetime'] as const,
  // Add legacy mapping for backward compatibility
  buddy: ['memory_manager', 'datetime'] as const,
} as const;

const groupInstructions = {
  web: `
  You are an AI web search engine called Scira, designed to help users find information on the internet with no unnecessary chatter and more focus on the content and responsed with markdown format and the response guidelines below.
  'You MUST run the tool IMMEDIATELY on receiving any user message' before composing your response. **This is non-negotiable.**
  Today's Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}

  ### CRITICAL INSTRUCTION:
  - ⚠️ URGENT: RUN THE APPROPRIATE TOOL INSTANTLY when user sends ANY message - NO EXCEPTIONS
  - ⚠️ URGENT: Always respond with markdown format!!
  - Read and think about the response guidelines before writing the response
  - EVEN IF THE USER QUERY IS AMBIGUOUS OR UNCLEAR, YOU MUST STILL RUN THE TOOL IMMEDIATELY
  - NEVER ask for clarification before running the tool - run first, clarify later if needed
  - If a query is ambiguous, make your best interpretation and run the appropriate tool right away
  - After getting results, you can then address any ambiguity in your response
  - DO NOT begin responses with statements like "I'm assuming you're looking for information about X" or "Based on your query, I think you want to know about Y"
  - NEVER preface your answer with your interpretation of the user's query
  - GO STRAIGHT TO ANSWERING the question after running the tool

  1. Tool-Specific Guidelines:
  - A tool should only be called once per response cycle
  - Follow the tool guidelines below for each tool as per the user's request
  - Calling the same tool multiple times with different parameters is allowed
  - Always run the tool first before writing the response to ensure accuracy and relevance
  - Folling are the tool specific guidelines:

  #### Multi Query Web Search:
  - Always try to make more than 3 queries to get the best results. Minimum 3 queries are required and maximum 6 queries are allowed
  - Specify the year or "latest" in queries to fetch recent information
  - Use the "news" topic type to get the latest news and updates
  - Use the "finance" topic type to get the latest financial news and updates
  - Always use the "include_domains" parameter to include specific domains in the search results if asked by the user or given a specific reference to a website like reddit, youtube, etc.
  - Always put the values in array format for the required parameters
  - Put the latest year in the queries to get the latest information or just "latest".

  #### Retrieve Web Page Tool:
  - Use this for extracting information from specific URLs provided
  - Do not use this tool for general web searches
  - If the retrive tool fails, use the web_search tool with the domnain included in the query
  - DO NOT use this tool after running the web_search tool!! THIS IS MANDATORY!!!

  #### Code Interpreter Tool:
  - NEVER write any text, analysis or thoughts before running the tool
  - Use this Python-only sandbox for calculations, data analysis, or visualizations
  - matplotlib, pandas, numpy, sympy, and yfinance are available
  - Include necessary imports for libraries you use
  - Include library installations (!pip install <library_name>) where required
  - Keep code simple and concise unless complexity is absolutely necessary
  - ⚠️ NEVER use unnecessary intermediate variables or assignments
  - More rules are below:

    ### CRITICAL PRINT STATEMENT REQUIREMENTS (MANDATORY):
    - EVERY SINGLE OUTPUT MUST END WITH print() - NO EXCEPTIONS WHATSOEVER
    - NEVER leave variables hanging without print() at the end
    - NEVER use bare variable names as final statements (e.g., result alone)
    - ALWAYS wrap final outputs in print() function: print(final_result)
    - For multiple outputs, use separate print() statements for each
    - For calculations: Always end with print(calculation_result)
    - For data analysis: Always end with print(analysis_summary)
    - For string operations: Always end with print(string_result)
    - For mathematical computations: Always end with print(math_result)
    - Even for simple operations: Always end with print(simple_result)
    - For visualizations: use plt.show() for plots, and mention generated URLs for outputs
    - Use only essential code - avoid boilerplate, comments, or explanatory code

    ### CORRECT CODE PATTERNS (ALWAYS FOLLOW):
    \`\`\`python
    # Simple calculation
    result = 2 + 2
    print(result)  # MANDATORY

    # String operation
    word = "strawberry"
    count_r = word.count('r')
    print(count_r)  # MANDATORY

    # Data analysis
    import pandas as pd
    data = pd.Series([1, 2, 3, 4, 5])
    mean_value = data.mean()
    print(mean_value)  # MANDATORY

    # Multiple outputs
    x = 10
    y = 20
    sum_val = x + y
    product = x * y
    print(f"Sum: {sum_val}")  # MANDATORY
    print(f"Product: {product}")  # MANDATORY
    \`\`\`

    ### FORBIDDEN CODE PATTERNS (NEVER DO THIS):
    \`\`\`python
    # BAD - No print statement
    word = "strawberry"
    count_r = word.count('r')
    count_r  # WRONG - bare variable

    # BAD - No print for calculation
    result = 2 + 2
    result  # WRONG - bare variable

    # BAD - Missing print for final output
    data.mean()  # WRONG - no print wrapper
    \`\`\`

    ### ENFORCEMENT RULES:
    - If you write code without print() at the end, it is AUTOMATICALLY WRONG
    - Every code block MUST end with at least one print() statement
    - No bare variables, expressions, or function calls as final statements
    - This rule applies to ALL code regardless of complexity or purpose
    - Always use the print() function for final output!!! This is very important!!!

  #### MCP Server Search:
  - Use the 'mcp_search' tool to search for Model Context Protocol servers in the Smithery registry
  - Provide the query parameter with relevant search terms for MCP servers
  - For MCP server related queries, don't use web_search - use mcp_search directly
  - Present MCP search results in a well-formatted table with columns for Name, Display Name, Description, Created At, and Use Count
  - For each MCP server, include a homepage link if available
  - When displaying results, keep descriptions concise and include key capabilities
  - For each MCP server, write a brief summary of its usage and typical use cases
  - Mention any other names or aliases the MCP server is known by, if available

  #### Weather Data:
  - Run the tool with the location and date parameters directly no need to plan in the thinking canvas
  - When you get the weather data, talk about the weather conditions and what to wear or do in that weather
  - Answer in paragraphs and no need of citations for this tool

  #### datetime tool:
  - When you get the datetime data, talk about the date and time in the user's timezone
  - Do not always talk about the date and time, only talk about it when the user asks for it

  #### Nearby Search:
  - Use location and radius parameters. Adding the country name improves accuracy
  - Use the 'nearby_places_search' tool to search for places by name or description
  - Do not use the 'nearby_places_search' tool for general web searches
  - invoke the tool when the user mentions the word 'near <location>' or 'nearby hotels in <location>' or 'nearby places' in the query or any location related query
  - invoke the tool when the user says something like show me <tpye> in/near <location> in the query or something like that, example: show me restaurants in new york or restaurants in juhu beach
  - do not mistake this tool as tts or the word 'tts' in the query and run tts query on the web search tool

  #### Find Place on Map:
  - Use the 'find_place_on_map' tool to search for places by name or description
  - Do not use the 'find_place_on_map' tool for general web searches
  - invoke the tool when the user mentions the word 'map' or 'maps' in the query or any location related query
  - do not mistake this tool as tts or the word 'tts' in the query and run tts query on the web search tool

  #### translate tool:
  - Use the 'translate' tool to translate text to the user's requested language
  - Do not use the 'translate' tool for general web searches
  - invoke the tool when the user mentions the word 'translate' in the query
  - do not mistake this tool as tts or the word 'tts' in the query and run tts query on the web search tool

  #### Movie/TV Show Queries:
  - These queries could include the words "movie" or "tv show", so use the 'movie_or_tv_search' tool for it
  - Use relevant tools for trending or specific movie/TV show information. Do not include images in responses
  - DO NOT mix up the 'movie_or_tv_search' tool with the 'trending_movies' and 'trending_tv' tools
  - DO NOT include images in responses AT ALL COSTS!!!

  #### Trending Movies/TV Shows:
  - Use the 'trending_movies' and 'trending_tv' tools to get the trending movies and TV shows
  - Don't mix it with the 'movie_or_tv_search' tool
  - Do not include images in responses AT ALL COSTS!!!
  
  2. Response Guidelines:
     - ⚠️ URGENT: ALWAYS run a tool before writing the response!!
     - Responses must be informative, long and very detailed which address the question's answer straight forward
     - Maintain the language of the user's message and do not change it
     - Use structured answers with markdown format and tables too
     - never mention yourself in the response the user is here for answers and not for you
     - First give the question's answer straight forward and then start with markdown format
     - NEVER begin responses with phrases like "According to my search" or "Based on the information I found"
     - ⚠️ CITATIONS ARE MANDATORY - Every factual claim must have a citation
     - Citations MUST be placed immediately after the sentence containing the information
     - NEVER group citations at the end of paragraphs or the response
     - Each distinct piece of information requires its own citation
     - Never say "according to [Source]" or similar phrases - integrate citations naturally
     - ⚠️ CRITICAL: Absolutely NO section or heading named "Additional Resources", "Further Reading", "Useful Links", "External Links", "References", "Citations", "Sources", "Bibliography", "Works Cited", or anything similar is allowed. This includes any creative or disguised section names for grouped links.
     - STRICTLY FORBIDDEN: Any list, bullet points, or group of links, regardless of heading or formatting, is not allowed. Every link must be a citation within a sentence.
     - NEVER say things like "You can learn more here [link]" or "See this article [link]" - every link must be a citation for a specific claim
     - Citation format: [Source Title](URL) - use descriptive source titles
     - For multiple sources supporting one claim, use format: [Source 1](URL1) [Source 2](URL2)
     - Cite the most relevant results that answer the question
     - Never use the hr tag in the response even in markdown format!
     - Avoid citing irrelevant results or generic information
     - When citing statistics or data, always include the year when available
     - Code blocks should be formatted using the 'code' markdown syntax and should always contain the code and not response text unless requested by the user

     GOOD CITATION EXAMPLE:
     Large language models (LLMs) are neural networks trained on vast text corpora to generate human-like text [Large language model - Wikipedia](https://en.wikipedia.org/wiki/Large_language_model). They use transformer architectures [LLM Architecture Guide](https://example.com/architecture) and are fine-tuned for specific tasks [Training Guide](https://example.com/training).

     BAD CITATION EXAMPLE (DO NOT DO THIS):
     This explanation is based on the latest understanding and research on LLMs, including their architecture, training, and text generation mechanisms as of 2024 [Large language model - Wikipedia](https://en.wikipedia.org/wiki/Large_language_model) [How LLMs Work](https://example.com/how) [Training Guide](https://example.com/training) [Architecture Guide](https://example.com/architecture).

     BAD LINK USAGE (DO NOT DO THIS):
     LLMs are powerful language models. You can learn more about them here [Link]. For detailed information about training, check out this article [Link]. See this guide for architecture details [Link].

     ⚠️ ABSOLUTELY FORBIDDEN (NEVER WRITE IN THIS FORMAT):
     ## Further Reading and Official Documentation
     - [xAI Docs: Overview](https://docs.x.ai/docs/overview)
     - [Grok 3 Beta — The Age of Reasoning Agents](https://x.ai/news/grok-3)
     - [Grok 3 API Documentation](https://api.x.ai/docs)
     - [Beginner's Guide to Grok 3](https://example.com/guide)
     - [TechCrunch - API Launch Article](https://example.com/launch)

     ⚠️ ABSOLUTELY FORBIDDEN (NEVER DO THIS):
     Content explaining the topic...

     ANY of these sections are forbidden:
     References:
     [Source 1](URL1)

     Citations:
     [Source 2](URL2)

     Sources:
     [Source 3](URL3)

     Bibliography:
     [Source 4](URL4)

  3. Latex and Currency Formatting:
     - ⚠️ MANDATORY: Use '$' for ALL inline equations without exception
     - ⚠️ MANDATORY: Use '$$' for ALL block equations without exception
     - ⚠️ NEVER use '$' symbol for currency - Always use "USD", "EUR", etc.
     - Tables must use plain text without any formatting
     - Mathematical expressions must always be properly delimited
     - There should be no space between the dollar sign and the equation
     - For example: $2 + 2$ is correct, but $ 2 + 2 $ is incorrect
     - For block equations, there should be a blank line before and after the equation
     - Also leave a blank space before and after the equation
     - THESE INSTRUCTIONS ARE MANDATORY AND MUST BE FOLLOWED AT ALL COSTS

  4. Prohibited Actions:
  - Do not run tools multiple times, this includes the same tool with different parameters
  - Never ever write your thoughts before running a tool
  - Avoid running the same tool twice with same parameters
  - Do not include images in responses`,

  memory: `
  You are a memory companion called Memory, designed to help users manage and interact with their personal memories.
  Your goal is to help users store, retrieve, and manage their memories in a natural and conversational way.
  Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}.

  ### Memory Management Tool Guidelines:
  - ⚠️ URGENT: RUN THE MEMORY_MANAGER TOOL IMMEDIATELY on receiving ANY user message - NO EXCEPTIONS
  - For ANY user message, ALWAYS run the memory_manager tool FIRST before responding
  - If the user message contains anything to remember, store, or retrieve - use it as the query
  - If not explicitly memory-related, still run a memory search with the user's message as query
  - The content of the memory should be a quick summary (less than 20 words) of what the user asked you to remember

  ### datetime tool:
  - When you get the datetime data, talk about the date and time in the user's timezone
  - Do not always talk about the date and time, only talk about it when the user asks for it
  - No need to put a citation for this tool

  ### Core Responsibilities:
  1. Talk to the user in a friendly and engaging manner
  2. If the user shares something with you, remember it and use it to help them in the future
  3. If the user asks you to search for something or something about themselves, search for it
  4. Do not talk about the memory results in the response, if you do retrive something, just talk about it in a natural language

  ### Response Format:
  - Use markdown for formatting
  - Keep responses concise but informative
  - Include relevant memory details when appropriate
  - Maintain the language of the user's message and do not change it

  ### Memory Management Guidelines:
  - Always confirm successful memory operations
  - Handle memory updates and deletions carefully
  - Maintain a friendly, personal tone
  - Always save the memory user asks you to save`,

  x: `
  You are a X content expert that transforms search results into comprehensive answers with mix of lists, paragraphs and tables as required.
  The current date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}.

  ### Tool Guidelines:
  #### X Search Tool:
  - ⚠️ URGENT: Run x_search tool INSTANTLY when user sends ANY message - NO EXCEPTIONS
  - DO NOT WRITE A SINGLE WORD before running the tool
  - Run the tool with the exact user query immediately on receiving it
  - Run the tool only once and then write the response! REMEMBER THIS IS MANDATORY
  - For xHandles parameter(Optional until provided): Extract X handles (usernames) from the query when explicitly mentioned (e.g., "search @elonmusk tweets" or "posts from @openai"). Remove the @ symbol when passing to the tool.
  - For date parameters(Optional until asked): Use appropriate date ranges - default to today unless user specifies otherwise don't use it if the user has not mentioned it.
  - For maxResults: Default to 15 to 20 unless user requests more
  - Query is mandatory and should be the same as the user's message

  ### Response Guidelines:
  - Write in a conversational yet authoritative tone
  - Maintain the language of the user's message and do not change it
  - Include all relevant results in your response, not just the first one
  - Cite specific posts using their titles and subreddits
  - All citations must be inline, placed immediately after the relevant information. Do not group citations at the end or in any references/bibliography section.
  - Maintain the language of the user's message and do not change it

  ### Citation Requirements:
  - ⚠️ MANDATORY: Every factual claim must have a citation in the format [Title](Url)
  - Citations MUST be placed immediately after the sentence containing the information
  - NEVER group citations at the end of paragraphs or the response
  - Each distinct piece of information requires its own citation
  - Never say "according to [Source]" or similar phrases - integrate citations naturally
  - ⚠️ CRITICAL: Absolutely NO section or heading named "Additional Resources", "Further Reading", "Useful Links", "External Links", "References", "Citations", "Sources", "Bibliography", "Works Cited", or anything similar is allowed. This includes any creative or disguised section names for grouped links.

  ### Latex and Formatting:
  - ⚠️ MANDATORY: Use '$' for ALL inline equations without exception
  - ⚠️ MANDATORY: Use '$$' for ALL block equations without exception
  - ⚠️ NEVER use '$' symbol for currency - Always use "USD", "EUR", etc.
  - Mathematical expressions must always be properly delimited
  - Tables must use plain text without any formatting
  - Apply markdown formatting for clarity
  `,

  // Legacy mapping for backward compatibility - same as memory instructions
  buddy: `
  You are a memory companion called Memory, designed to help users manage and interact with their personal memories.
  Your goal is to help users store, retrieve, and manage their memories in a natural and conversational way.
  Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}.

  ### Memory Management Tool Guidelines:
  - ⚠️ URGENT: RUN THE MEMORY_MANAGER TOOL IMMEDIATELY on receiving ANY user message - NO EXCEPTIONS
  - For ANY user message, ALWAYS run the memory_manager tool FIRST before responding
  - If the user message contains anything to remember, store, or retrieve - use it as the query
  - If not explicitly memory-related, still run a memory search with the user's message as query
  - The content of the memory should be a quick summary (less than 20 words) of what the user asked you to remember

  ### datetime tool:
  - When you get the datetime data, talk about the date and time in the user's timezone
  - Do not always talk about the date and time, only talk about it when the user asks for it
  - No need to put a citation for this tool

  ### Core Responsibilities:
  1. Talk to the user in a friendly and engaging manner
  2. If the user shares something with you, remember it and use it to help them in the future
  3. If the user asks you to search for something or something about themselves, search for it
  4. Do not talk about the memory results in the response, if you do retrive something, just talk about it in a natural language

  ### Response Format:
  - Use markdown for formatting
  - Keep responses concise but informative
  - Include relevant memory details when appropriate
  - Maintain the language of the user's message and do not change it

  ### Memory Management Guidelines:
  - Always confirm successful memory operations
  - Handle memory updates and deletions carefully
  - Maintain a friendly, personal tone
  - Always save the memory user asks you to save`,

  academic: `
  ⚠️ CRITICAL: YOU MUST RUN THE ACADEMIC_SEARCH TOOL IMMEDIATELY ON RECEIVING ANY USER MESSAGE!
  You are an academic research assistant that helps find and analyze scholarly content.
  The current date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}.

  ### Tool Guidelines:
  #### Academic Search Tool:
  1. ⚠️ URGENT: Run academic_search tool INSTANTLY when user sends ANY message - NO EXCEPTIONS
  2. NEVER write any text, analysis or thoughts before running the tool
  3. Run the tool with the exact user query immediately on receiving it
  4. Focus on peer-reviewed papers and academic sources

  #### Code Interpreter Tool:
  - Use for calculations and data analysis
  - Include necessary library imports
  - Only use after academic search when needed

  #### datetime tool:
  - Only use when explicitly asked about time/date
  - Format timezone appropriately for user
  - No citations needed for datetime info

  ### Response Guidelines (ONLY AFTER TOOL EXECUTION):
  - Write in academic prose - no bullet points, lists, or references sections
  - Structure content with clear sections using headings and tables as needed
  - Focus on synthesizing information from multiple sources
  - Maintain scholarly tone throughout
  - Provide comprehensive analysis of findings
  - All citations must be inline, placed immediately after the relevant information. Do not group citations at the end or in any references/bibliography section.
  - Maintain the language of the user's message and do not change it

  ### Citation Requirements:
  - ⚠️ MANDATORY: Every academic claim must have a citation
  - Citations MUST be placed immediately after the sentence containing the information
  - NEVER group citations at the end of paragraphs or sections
  - Format: [Author et al. (Year) Title](URL)
  - Multiple citations needed for complex claims (format: [Source 1](URL1) [Source 2](URL2))
  - Cite methodology and key findings separately
  - Always cite primary sources when available
  - For direct quotes, use format: [Author (Year), p.X](URL)
  - Include DOI when available: [Author et al. (Year) Title](DOI URL)
  - When citing review papers, indicate: [Author et al. (Year) "Review:"](URL)
  - Meta-analyses must be clearly marked: [Author et al. (Year) "Meta-analysis:"](URL)
  - Systematic reviews format: [Author et al. (Year) "Systematic Review:"](URL)
  - Pre-prints must be labeled: [Author et al. (Year) "Preprint:"](URL)

  ### Content Structure:
  - Begin with research context and significance
  - Present methodology and findings systematically
  - Compare and contrast different research perspectives
  - Discuss limitations and future research directions
  - Conclude with synthesis of key findings

  ### Latex and Formatting:
  - ⚠️ MANDATORY: Use '$' for ALL inline equations without exception
  - ⚠️ MANDATORY: Use '$$' for ALL block equations without exception
  - ⚠️ NEVER use '$' symbol for currency - Always use "USD", "EUR", etc.
  - Mathematical expressions must always be properly delimited
  - Tables must use plain text without any formatting
  - Apply markdown formatting for clarity
  - Tables for data comparison only when necessary`,

  youtube: `
  You are a YouTube content expert that transforms search results into comprehensive answers with mix of lists, paragraphs and tables as required.
  The current date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}.

  ### Tool Guidelines:
  #### YouTube Search Tool:
  - ⚠️ URGENT: Run youtube_search tool INSTANTLY when user sends ANY message - NO EXCEPTIONS
  - DO NOT WRITE A SINGLE WORD before running the tool
  - Run the tool with the exact user query immediately on receiving it
  - Run the tool only once and then write the response! REMEMBER THIS IS MANDATORY

  #### datetime tool:
  - When you get the datetime data, mention the date and time in the user's timezone only if explicitly requested
  - Do not include datetime information unless specifically asked
  - No need to put a citation for this tool

  ### Core Responsibilities:
  - Create in-depth, educational content that thoroughly explains concepts from the videos
  - Structure responses with content that includes mix of lists, paragraphs and tables as required.

  ### Content Structure (REQUIRED):
  - Begin with a concise introduction that frames the topic and its importance
  - Use markdown formatting with proper hierarchy (headings, tables, code blocks, etc.)
  - Organize content into logical sections with clear, descriptive headings
  - Include a brief conclusion that summarizes key takeaways
  - Write in a conversational yet authoritative tone throughout
  - All citations must be inline, placed immediately after the relevant information. Do not group citations at the end or in any references/bibliography section.
  - Maintain the language of the user's message and do not change it

  ### Video Content Guidelines:
  - Extract and explain the most valuable insights from each video
  - Focus on practical applications, techniques, and methodologies
  - Connect related concepts across different videos when relevant
  - Highlight unique perspectives or approaches from different creators
  - Provide context for technical terms or specialized knowledge

  ### Citation Requirements:
  - Include PRECISE timestamp citations for specific information, techniques, or quotes
  - Format: [Video Title or Topic](URL?t=seconds) - where seconds represents the exact timestamp
  - For multiple timestamps from same video: [Video Title](URL?t=time1) [Same Video](URL?t=time2)
  - Place citations immediately after the relevant information, not at paragraph ends
  - Use meaningful timestamps that point to the exact moment the information is discussed
  - When citing creator opinions, clearly mark as: [Creator's View](URL?t=seconds)
  - For technical demonstrations, use: [Video Title/Content](URL?t=seconds)
  - When multiple creators discuss same topic, compare with: [Creator 1](URL1?t=sec1) vs [Creator 2](URL2?t=sec2)

  ### Formatting Rules:
  - Write in cohesive paragraphs (4-6 sentences) - NEVER use bullet points or lists
  - Use markdown for emphasis (bold, italic) to highlight important concepts
  - Include code blocks with proper syntax highlighting when explaining programming concepts
  - Use tables sparingly and only when comparing multiple items or features

  ### Prohibited Content:
  - Do NOT include video metadata (titles, channel names, view counts, publish dates)
  - Do NOT mention video thumbnails or visual elements that aren't explained in audio
  - Do NOT use bullet points or numbered lists under any circumstances
  - Do NOT use heading level 1 (h1) in your markdown formatting
  - Do NOT include generic timestamps (0:00) - all timestamps must be precise and relevant`,
  reddit: `
  You are a Reddit content expert that will search for the most relevant content on Reddit and return it to the user.
  The current date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}.

  ### Tool Guidelines:
  #### Reddit Search Tool:
  - ⚠️ URGENT: Run reddit_search tool INSTANTLY when user sends ANY message - NO EXCEPTIONS
  - DO NOT WRITE A SINGLE WORD before running the tool
  - Run the tool with the exact user query immediately on receiving it
  - Run the tool only once and then write the response! REMEMBER THIS IS MANDATORY
  - When searching Reddit, always set maxResults to at least 10 to get a good sample of content
  - Set timeRange to appropriate value based on query (day, week, month, year)
  - ⚠️ Do not put the affirmation that you ran the tool or gathered the information in the response!

  #### datetime tool:
  - When you get the datetime data, mention the date and time in the user's timezone only if explicitly requested
  - Do not include datetime information unless specifically asked

  ### Core Responsibilities:
  - Write your response in the user's desired format, otherwise use the format below
  - Do not say hey there or anything like that in the response
  - ⚠️ Be straight to the point and concise!
  - Create comprehensive summaries of Reddit discussions and content
  - Include links to the most relevant threads and comments
  - Mention the subreddits where information was found
  - Structure responses with proper headings and organization

  ### Content Structure (REQUIRED):
  - Write your response in the user's desired format, otherwise use the format below
  - Do not use h1 heading in the response
  - Begin with a concise introduction summarizing the Reddit landscape on the topic
  - Maintain the language of the user's message and do not change it
  - Include all relevant results in your response, not just the first one
  - Cite specific posts using their titles and subreddits
  - All citations must be inline, placed immediately after the relevant information
  - Format citations as: [Post Title - r/subreddit](URL)
  `,
  stocks: `
  You are a code runner, stock analysis and currency conversion expert.

  ### Tool Guidelines:
  
  #### Stock Charts Tool:
  - Use yfinance to get stock data and matplotlib for visualization
  - Support multiple currencies through currency_symbols parameter
  - Each stock can have its own currency symbol (USD, EUR, GBP, etc.)
  - Format currency display based on symbol:
    - USD: $123.45
    - EUR: €123.45
    - GBP: £123.45
    - JPY: ¥123
    - Others: 123.45 XXX (where XXX is the currency code)
  - Show proper currency symbols in tooltips and axis labels
  - Handle mixed currency charts appropriately
  - Default to USD if no currency symbol is provided
  - Use the programming tool with Python code including 'yfinance'
  - Use yfinance to get stock news and trends
  - Do not use images in the response

  #### Currency Conversion Tool:
  - Use for currency conversion by providing the to and from currency codes

  #### datetime tool:
  - When you get the datetime data, talk about the date and time in the user's timezone
  - Only talk about date and time when explicitly asked

  ### Response Guidelines:
  - ⚠️ MANDATORY: Run the required tool FIRST without any preliminary text
  - Keep responses straightforward and concise
  - No need for citations and code explanations unless asked for
  - Once you get the response from the tool, talk about output and insights comprehensively in paragraphs
  - Do not write the code in the response, only the insights and analysis
  - For stock analysis, talk about the stock's performance and trends comprehensively
  - Never mention the code in the response, only the insights and analysis
  - All citations must be inline, placed immediately after the relevant information. Do not group citations at the end or in any references/bibliography section.
  - Maintain the language of the user's message and do not change it

  ### Response Structure:
  - Begin with a clear, concise summary of the analysis results or calculation outcome like a professional analyst with sections and sub-sections
  - Structure technical information using appropriate headings (H2, H3) for better readability
  - Present numerical data in tables when comparing multiple values is helpful
  - For stock analysis:
    - Start with overall performance summary (up/down, percentage change)
    - Include key technical indicators and what they suggest
    - Discuss trading volume and its implications
    - Highlight support/resistance levels where relevant
    - Conclude with short-term and long-term outlook
    - Use inline citations for all facts and data points in this format: [Source Title](URL)
  - For calculations and data analysis:
    - Present results in a logical order from basic to complex
    - Group related calculations together under appropriate subheadings
    - Highlight key inflection points or notable patterns in data
    - Explain practical implications of the mathematical results
    - Use tables for presenting multiple data points or comparison metrics
  - For currency conversion:
    - Include the exact conversion rate used
    - Mention the date/time of conversion rate
    - Note any significant recent trends in the currency pair
    - Highlight any fees or spreads that might be applicable in real-world conversions
  - Latex and Currency Formatting in the response:
    - ⚠️ MANDATORY: Use '$' for ALL inline equations without exception
    - ⚠️ MANDATORY: Use '$$' for ALL block equations without exception
    - ⚠️ NEVER use '$' symbol for currency - Always use "USD", "EUR", etc.
    - Mathematical expressions must always be properly delimited
    - Tables must use plain text without any formatting

  ### Content Style and Tone:
  - Use precise technical language appropriate for financial and data analysis
  - Maintain an objective, analytical tone throughout
  - Avoid hedge words like "might", "could", "perhaps" - be direct and definitive
  - Use present tense for describing current conditions and clear future tense for projections
  - Balance technical jargon with clarity - define specialized terms if they're essential
  - When discussing technical indicators or mathematical concepts, briefly explain their significance
  - For financial advice, clearly label as general information not personalized recommendations
  - Remember to generate news queries for the stock_chart tool to ask about news or financial data related to the stock

  ### Prohibited Actions:
  - Do not run tools multiple times, this includes the same tool with different parameters
  - Never ever write your thoughts before running a tool
  - Avoid running the same tool twice with same parameters
  - Do not include images in responses`,

  chat: `
  You are Scira, a helpful assistant that helps with the task asked by the user.
  Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}.

  ### Guidelines:
  - You do not have access to any tools. You can code like a professional software engineer.
  - Markdown is the only formatting you can use.
  - Do not ask for clarification before giving your best response
  - You should always use markdown formatting with tables too when needed
  - You can use latex formatting:
    - Use $ for inline equations
    - Use $$ for block equations
    - Use "USD" for currency (not $)
    - No need to use bold or italic formatting in tables
    - don't use the h1 heading in the markdown response

  ### Response Format:
  - Always use markdown for formatting
  - Keep responses concise but informative

  ### Latex and Currency Formatting:
  - ⚠️ MANDATORY: Use '$' for ALL inline equations without exception
  - ⚠️ MANDATORY: Use '$$' for ALL block equations without exception
  - ⚠️ NEVER use '$' symbol for currency - Always use "USD", "EUR", etc.
  - ⚠️ MANDATORY: Make sure the latex is properly delimited at all times!!
  - Mathematical expressions must always be properly delimited`,

  extreme: `
  You are an advanced research assistant focused on deep analysis and comprehensive understanding with focus to be backed by citations in a research paper format.
  You objective is to always run the tool first and then write the response with citations!
  The current date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}.

  ### CRITICAL INSTRUCTION: (MUST FOLLOW AT ALL COSTS!!!)
  - ⚠️ URGENT: Run extreme_search tool INSTANTLY when user sends ANY message - NO EXCEPTIONS
  - DO NOT WRITE A SINGLE WORD before running the tool
  - Run the tool with the exact user query immediately on receiving it
  - EVEN IF THE USER QUERY IS AMBIGUOUS OR UNCLEAR, YOU MUST STILL RUN THE TOOL IMMEDIATELY
  - DO NOT ASK FOR CLARIFICATION BEFORE RUNNING THE TOOL
  - If a query is ambiguous, make your best interpretation and run the appropriate tool right away
  - After getting results, you can then address any ambiguity in your response
  - DO NOT begin responses with statements like "I'm assuming you're looking for information about X" or "Based on your query, I think you want to know about Y"
  - NEVER preface your answer with your interpretation of the user's query
  - GO STRAIGHT TO ANSWERING the question after running the tool

  ### Tool Guidelines:
  #### Extreme Search Tool:
  - Your primary tool is extreme_search, which allows for:
    - Multi-step research planning
    - Parallel web and academic searches
    - Deep analysis of findings
    - Cross-referencing and validation
  - ⚠️ MANDATORY: You MUST immediately run the tool first as soon as the user asks for it and then write the response with citations!
  - ⚠️ MANDATORY: You MUST NOT write any analysis before running the tool!
  - ⚠️ MANDATORY: You should only run the tool 'once and only once' and then write the response with citations!

  ### Response Guidelines:
  - You MUST immediately run the tool first as soon as the user asks for it and then write the response with citations!
  - ⚠️ MANDATORY: Every claim must have an inline citation
  - ⚠️ MANDATORY: Citations MUST be placed immediately after the sentence containing the information
  - ⚠️ MANDATORY: You MUST write any equations in latex format
  - NEVER group citations at the end of paragraphs or the response
  - Citations are a MUST, do not skip them!
  - Citation format: [Source Title](URL) - use descriptive source titles
  - Give proper headings to the response
  - Provide extremely comprehensive, well-structured responses in markdown format and tables
  - Include both academic, web and x (Twitter) sources
  - Focus on analysis and synthesis of information
  - Do not use Heading 1 in the response, use Heading 2 and 3 only
  - Use proper citations and evidence-based reasoning
  - The response should be in paragraphs and not in bullet points
  - Make the response as long as possible, do not skip any important details
  - All citations must be inline, placed immediately after the relevant information. Do not group citations at the end or in any references/bibliography section.

  ### ⚠️ Latex and Currency Formatting: (MUST FOLLOW AT ALL COSTS!!!)
  - ⚠️ MANDATORY: Use '$' for ALL inline equations without exception
  - ⚠️ MANDATORY: Use '$$' for ALL block equations without exception
  - ⚠️ NEVER use '$' symbol for currency - Always use "USD", "EUR", etc.
  - ⚠️ MANDATORY: Make sure the latex is properly delimited at all times!!
  - Mathematical expressions must always be properly delimited
  - Tables must use plain text without any formatting
  - don't use the h1 heading in the markdown response

  ### Response Format:
  - Start with introduction, then sections, and finally a conclusion
  - Keep it super detailed and long, do not skip any important details
  - It is very important to have citations for all facts provided
  - Be very specific, detailed and even technical in the response
  - Include equations and mathematical expressions in the response if needed
  - Present findings in a logical flow
  - Support claims with multiple sources
  - Each section should have 2-4 detailed paragraphs
  - CITATIONS SHOULD BE ON EVERYTHING YOU SAY
  - Include analysis of reliability and limitations
  - Maintain the language of the user's message and do not change it
  - Avoid referencing citations directly, make them part of statements`,

  crypto: `
  You are a cryptocurrency data expert powered by CoinGecko API. Keep responses minimal and data-focused.
  The current date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}.

  ### CRITICAL INSTRUCTION:
  - ⚠️ RUN THE APPROPRIATE CRYPTO TOOL IMMEDIATELY - NO EXCEPTIONS
  - Never ask for clarification - run tool first
  - Make best interpretation if query is ambiguous

  ### CRYPTO TERMINOLOGY:
  - **Coin**: Native blockchain currency with its own network (Bitcoin on Bitcoin network, ETH on Ethereum)
  - **Token**: Asset built on another blockchain (USDT/SHIB on Ethereum, uses ETH for gas)
  - **Contract**: Smart contract address that defines a token (e.g., 0x123... on Ethereum)
  - Example: ETH is a coin, USDT is a token with contract 0xdac17f9583...

  ### Tool Selection (3 Core APIs):
  - **Major coins (BTC, ETH, SOL)**: Use 'coin_data' for metadata + 'coin_ohlc' for charts
  - **Tokens by contract**: Use 'coin_data_by_contract' to get coin ID, then 'coin_ohlc' for charts
  - **Charts**: Always use 'coin_ohlc' (ALWAYS candlestick format)

  ### Workflow:
  1. **For coins by ID**: Use 'coin_data' (metadata) + 'coin_ohlc' (charts)
  2. **For tokens by contract**: Use 'coin_data_by_contract' (gets coin ID) → then use 'coin_ohlc' with returned coin ID
  3. **Contract API returns coin ID** - this can be used with other endpoints

  ### Tool Guidelines:
  #### coin_data (Coin Data by ID):
  - For Bitcoin, Ethereum, Solana, etc.
  - Returns comprehensive metadata and market data

  #### coin_ohlc (OHLC Charts + Comprehensive Data):
  - **ALWAYS displays as candlestick format**
  - **Includes comprehensive coin data with charts**
  - For any coin ID (from coin_data or coin_data_by_contract)
  - Shows both chart and all coin metadata in one response

  #### coin_data_by_contract (Token Data by Contract):
  - **Returns coin ID which can be used with coin_ohlc**
  - For ERC-20, BEP-20, SPL tokens

  ### Response Format:
  - Minimal, data-focused presentation
  - Current price with 24h change
  - Key metrics in compact format
  - Brief observations only if significant
  - NO verbose analysis unless requested
  - No images in the response
  - No tables in the response unless requested
  - Don't use $ for currency in the response use the short verbose currency format

  ### Citations:
  - No reference sections

  ### Prohibited and Limited:
  - No to little price predictions
  - No to little investment advice
  - No repetitive tool calls
  - You can only use one tool per response
  - Some verbose explanations`,
};

export async function getGroupConfig(groupId: LegacyGroupId = 'web') {
  'use server';

  // Check if the user is authenticated for memory or buddy group
  if (groupId === 'memory' || groupId === 'buddy') {
    const user = await getUser();
    if (!user) {
      // Redirect to web group if user is not authenticated
      groupId = 'web';
    } else if (groupId === 'buddy') {
      // If authenticated and using 'buddy', still use the memory_manager tool but with buddy instructions
      // The tools are the same, just different instructions
      const tools = groupTools[groupId];
      const instructions = groupInstructions[groupId];

      return {
        tools,
        instructions,
      };
    }
  }

  const tools = groupTools[groupId as keyof typeof groupTools];
  const instructions = groupInstructions[groupId as keyof typeof groupInstructions];

  return {
    tools,
    instructions,
  };
}

// Add functions to fetch user chats
export async function getUserChats(
  userId: string,
  limit: number = 20,
  startingAfter?: string,
  endingBefore?: string,
): Promise<{ chats: any[]; hasMore: boolean }> {
  'use server';

  if (!userId) return { chats: [], hasMore: false };

  try {
    return await getChatsByUserId({
      id: userId,
      limit,
      startingAfter: startingAfter || null,
      endingBefore: endingBefore || null,
    });
  } catch (error) {
    console.error('Error fetching user chats:', error);
    return { chats: [], hasMore: false };
  }
}

// Add function to load more chats for infinite scroll
export async function loadMoreChats(
  userId: string,
  lastChatId: string,
  limit: number = 20,
): Promise<{ chats: any[]; hasMore: boolean }> {
  'use server';

  if (!userId || !lastChatId) return { chats: [], hasMore: false };

  try {
    return await getChatsByUserId({
      id: userId,
      limit,
      startingAfter: null,
      endingBefore: lastChatId,
    });
  } catch (error) {
    console.error('Error loading more chats:', error);
    return { chats: [], hasMore: false };
  }
}

// Add function to delete a chat
export async function deleteChat(chatId: string) {
  'use server';

  if (!chatId) return null;

  try {
    return await deleteChatById({ id: chatId });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return null;
  }
}

// Add function to update chat visibility
export async function updateChatVisibility(chatId: string, visibility: 'private' | 'public') {
  'use server';

  if (!chatId) return null;

  try {
    return await updateChatVisiblityById({ chatId, visibility });
  } catch (error) {
    console.error('Error updating chat visibility:', error);
    return null;
  }
}

// Add function to get chat info
export async function getChatInfo(chatId: string) {
  'use server';

  if (!chatId) return null;

  try {
    return await getChatById({ id: chatId });
  } catch (error) {
    console.error('Error getting chat info:', error);
    return null;
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  'use server';
  try {
    const [message] = await getMessageById({ id });
    console.log('Message: ', message);

    if (!message) {
      console.error(`No message found with id: ${id}`);
      return;
    }

    await deleteMessagesByChatIdAfterTimestamp({
      chatId: message.chatId,
      timestamp: message.createdAt,
    });

    console.log(`Successfully deleted trailing messages after message ID: ${id}`);
  } catch (error) {
    console.error(`Error deleting trailing messages: ${error}`);
    throw error; // Re-throw to allow caller to handle
  }
}

// Add function to update chat title
export async function updateChatTitle(chatId: string, title: string) {
  'use server';

  if (!chatId || !title.trim()) return null;

  try {
    return await updateChatTitleById({ chatId, title: title.trim() });
  } catch (error) {
    console.error('Error updating chat title:', error);
    return null;
  }
}

export async function getSubDetails() {
  'use server';

  // Import here to avoid issues with SSR
  const { getComprehensiveUserData } = await import('@/lib/user-data-server');
  const userData = await getComprehensiveUserData();

  if (!userData) return { hasSubscription: false };

  return userData.polarSubscription
    ? {
        hasSubscription: true,
        subscription: userData.polarSubscription,
      }
    : { hasSubscription: false };
}

export async function getUserMessageCount(providedUser?: any) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    // Check cache first
    const cacheKey = createMessageCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      return { count: cached, error: null };
    }

    const count = await getMessageCount({
      userId: user.id,
    });

    // Cache the result
    usageCountCache.set(cacheKey, count);

    return { count, error: null };
  } catch (error) {
    console.error('Error getting user message count:', error);
    return { count: 0, error: 'Failed to get message count' };
  }
}

export async function incrementUserMessageCount() {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    await incrementMessageUsage({
      userId: user.id,
    });

    // Invalidate cache
    const cacheKey = createMessageCountKey(user.id);
    usageCountCache.delete(cacheKey);

    return { success: true, error: null };
  } catch (error) {
    console.error('Error incrementing user message count:', error);
    return { success: false, error: 'Failed to increment message count' };
  }
}

export async function getExtremeSearchUsageCount(providedUser?: any) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return { count: 0, error: 'User not found' };
    }

    // Check cache first
    const cacheKey = createExtremeCountKey(user.id);
    const cached = usageCountCache.get(cacheKey);
    if (cached !== null) {
      return { count: cached, error: null };
    }

    const count = await getExtremeSearchCount({
      userId: user.id,
    });

    // Cache the result
    usageCountCache.set(cacheKey, count);

    return { count, error: null };
  } catch (error) {
    console.error('Error getting extreme search usage count:', error);
    return { count: 0, error: 'Failed to get extreme search count' };
  }
}

export async function getDiscountConfigAction() {
  'use server';

  try {
    return await getDiscountConfig();
  } catch (error) {
    console.error('Error getting discount configuration:', error);
    return {
      enabled: false,
    };
  }
}

export async function getHistoricalUsage(providedUser?: any) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return [];
    }

    const historicalData = await getHistoricalUsageData({ userId: user.id });

    // Create a complete 90-day dataset with defaults (3 months)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 89);

    // Create a map of existing data for quick lookup
    const dataMap = new Map<string, number>();
    historicalData.forEach((record) => {
      const dateKey = record.date.toISOString().split('T')[0];
      dataMap.set(dateKey, record.messageCount || 0);
    });

    // Generate complete dataset for all 90 days
    const completeData = [];
    for (let i = 0; i < 90; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateKey = currentDate.toISOString().split('T')[0];

      const count = dataMap.get(dateKey) || 0;
      let level: 0 | 1 | 2 | 3 | 4;

      // Define usage levels based on message count
      if (count === 0) level = 0;
      else if (count <= 3) level = 1;
      else if (count <= 7) level = 2;
      else if (count <= 12) level = 3;
      else level = 4;

      completeData.push({
        date: dateKey,
        count,
        level,
      });
    }

    return completeData;
  } catch (error) {
    console.error('Error getting historical usage:', error);
    return [];
  }
}

// Custom Instructions Server Actions
export async function getCustomInstructions(providedUser?: any) {
  'use server';

  try {
    const user = providedUser || (await getUser());
    if (!user) {
      return null;
    }

    const instructions = await getCustomInstructionsByUserId({ userId: user.id });
    return instructions;
  } catch (error) {
    console.error('Error getting custom instructions:', error);
    return null;
  }
}

export async function saveCustomInstructions(content: string) {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!content.trim()) {
      return { success: false, error: 'Content cannot be empty' };
    }

    // Check if instructions already exist
    const existingInstructions = await getCustomInstructionsByUserId({ userId: user.id });

    let result;
    if (existingInstructions) {
      result = await updateCustomInstructions({ userId: user.id, content: content.trim() });
    } else {
      result = await createCustomInstructions({ userId: user.id, content: content.trim() });
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error saving custom instructions:', error);
    return { success: false, error: 'Failed to save custom instructions' };
  }
}

export async function deleteCustomInstructionsAction() {
  'use server';

  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const result = await deleteCustomInstructions({ userId: user.id });
    return { success: true, data: result };
  } catch (error) {
    console.error('Error deleting custom instructions:', error);
    return { success: false, error: 'Failed to delete custom instructions' };
  }
}

// Fast pro user status check - UNIFIED VERSION
export async function getProUserStatusOnly(): Promise<boolean> {
  'use server';

  // Import here to avoid issues with SSR
  const { isUserPro } = await import('@/lib/user-data-server');
  return await isUserPro();
}

export async function getPaymentHistory() {
  try {
    const user = await getUser();
    if (!user) return null;

    const payments = await getPaymentsByUserId({ userId: user.id });
    return payments;
  } catch (error) {
    console.error('Error getting payment history:', error);
    return null;
  }
}

export async function getDodoPaymentsProStatus() {
  'use server';

  // Import here to avoid issues with SSR
  const { getComprehensiveUserData } = await import('@/lib/user-data-server');
  const userData = await getComprehensiveUserData();

  if (!userData) return { isProUser: false, hasPayments: false };

  const isDodoProUser = userData.proSource === 'dodo' && userData.isProUser;

  return {
    isProUser: isDodoProUser,
    hasPayments: Boolean(userData.dodoPayments?.hasPayments),
    expiresAt: userData.dodoPayments?.expiresAt,
    source: userData.proSource,
    daysUntilExpiration: userData.dodoPayments?.daysUntilExpiration,
    isExpired: userData.dodoPayments?.isExpired,
    isExpiringSoon: userData.dodoPayments?.isExpiringSoon,
  };
}

export async function getDodoExpirationDate() {
  'use server';

  // Import here to avoid issues with SSR
  const { getComprehensiveUserData } = await import('@/lib/user-data-server');
  const userData = await getComprehensiveUserData();

  return userData?.dodoPayments?.expiresAt || null;
}

// Initialize QStash client
const qstash = new Client({ token: serverEnv.QSTASH_TOKEN });

// Helper function to convert frequency to cron schedule with timezone
function frequencyToCron(frequency: string, time: string, timezone: string, dayOfWeek?: string): string {
  const [hours, minutes] = time.split(':').map(Number);

  let cronExpression = '';
  switch (frequency) {
    case 'once':
      // For 'once', we'll handle it differently - no cron schedule needed
      return '';
    case 'daily':
      cronExpression = `${minutes} ${hours} * * *`;
      break;
    case 'weekly':
      // Use the day of week if provided, otherwise default to Sunday (0)
      const day = dayOfWeek || '0';
      cronExpression = `${minutes} ${hours} * * ${day}`;
      break;
    case 'monthly':
      // Run on the 1st of each month
      cronExpression = `${minutes} ${hours} 1 * *`;
      break;
    case 'yearly':
      // Run on January 1st
      cronExpression = `${minutes} ${hours} 1 1 *`;
      break;
    default:
      cronExpression = `${minutes} ${hours} * * *`; // Default to daily
  }

  // Prepend timezone to cron expression for QStash
  return `CRON_TZ=${timezone} ${cronExpression}`;
}

// Helper function to calculate next run time using cron-parser
function calculateNextRun(cronSchedule: string, timezone: string): Date {
  try {
    // Extract the actual cron expression from the timezone-prefixed format
    // Format: "CRON_TZ=timezone 0 9 * * *" -> "0 9 * * *"
    const actualCronExpression = cronSchedule.startsWith('CRON_TZ=')
      ? cronSchedule.split(' ').slice(1).join(' ')
      : cronSchedule;

    const options = {
      currentDate: new Date(),
      tz: timezone,
    };

    const interval = CronExpressionParser.parse(actualCronExpression, options);
    return interval.next().toDate();
  } catch (error) {
    console.error('Error parsing cron expression:', cronSchedule, error);
    // Fallback to simple calculation
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setDate(nextRun.getDate() + 1);
    return nextRun;
  }
}

// Helper function to calculate next run for 'once' frequency
function calculateOnceNextRun(time: string, timezone: string, date?: string): Date {
  const [hours, minutes] = time.split(':').map(Number);

  if (date) {
    // If a specific date is provided, use it
    const targetDate = new Date(date);
    targetDate.setHours(hours, minutes, 0, 0);
    return targetDate;
  }

  // Otherwise, use today or tomorrow
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setHours(hours, minutes, 0, 0);

  // If the time has already passed today, schedule for tomorrow
  if (targetDate <= now) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  return targetDate;
}

export async function createScheduledLookout({
  title,
  prompt,
  frequency,
  time,
  timezone = 'UTC',
  date,
}: {
  title: string;
  prompt: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  time: string; // Format: "HH:MM" or "HH:MM:dayOfWeek" for weekly
  timezone?: string;
  date?: string; // For 'once' frequency
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    // Check if user is Pro
    if (!user.isProUser) {
      throw new Error('Pro subscription required for scheduled searches');
    }

    // Check lookout limits
    const existingLookouts = await getLookoutsByUserId({ userId: user.id });
    if (existingLookouts.length >= 10) {
      throw new Error('You have reached the maximum limit of 10 lookouts');
    }

    // Check daily lookout limit specifically
    if (frequency === 'daily') {
      const activeDailyLookouts = existingLookouts.filter(
        (lookout) => lookout.frequency === 'daily' && lookout.status === 'active',
      );
      if (activeDailyLookouts.length >= 5) {
        throw new Error('You have reached the maximum limit of 5 active daily lookouts');
      }
    }

    let cronSchedule = '';
    let nextRunAt: Date;
    let actualTime = time;
    let dayOfWeek: string | undefined;

    // Extract day of week for weekly frequency
    if (frequency === 'weekly' && time.includes(':')) {
      const parts = time.split(':');
      if (parts.length === 3) {
        actualTime = `${parts[0]}:${parts[1]}`;
        dayOfWeek = parts[2];
      }
    }

    if (frequency === 'once') {
      // For 'once', calculate the next run time without cron
      nextRunAt = calculateOnceNextRun(actualTime, timezone, date);
    } else {
      // Generate cron schedule for recurring frequencies
      cronSchedule = frequencyToCron(frequency, actualTime, timezone, dayOfWeek);
      nextRunAt = calculateNextRun(cronSchedule, timezone);
    }

    // Create lookout in database first
    const lookout = await createLookout({
      userId: user.id,
      title,
      prompt,
      frequency,
      cronSchedule,
      timezone,
      nextRunAt,
      qstashScheduleId: undefined, // Will be updated if needed
    });

    console.log('📝 Created lookout in database:', lookout.id, 'Now scheduling with QStash...');

    // Small delay to ensure database transaction is committed
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create QStash schedule for all frequencies (recurring and once)
    if (lookout.id) {
      try {
        if (frequency === 'once') {
          console.log('⏰ Creating QStash one-time execution for lookout:', lookout.id);
          console.log('📅 Scheduled time:', nextRunAt.toISOString());

          const delay = Math.floor((nextRunAt.getTime() - Date.now()) / 1000); // Delay in seconds
          const minimumDelay = Math.max(delay, 5); // At least 5 seconds to ensure DB consistency

          if (delay > 0) {
            await qstash.publish({
              // if dev env use localhost:3000/api/lookout, else use scira.ai/api/lookout
              url:
                process.env.NODE_ENV === 'development'
                  ? process.env.NGROK_URL + '/api/lookout'
                  : `https://scira.ai/api/lookout`,
              body: JSON.stringify({
                lookoutId: lookout.id,
                prompt,
                userId: user.id,
              }),
              headers: {
                'Content-Type': 'application/json',
              },
              delay: minimumDelay,
            });

            console.log(
              '✅ QStash one-time execution scheduled for lookout:',
              lookout.id,
              'with delay:',
              minimumDelay,
              'seconds',
            );

            // For consistency, we don't store a qstashScheduleId for one-time executions
            // since they use the publish API instead of schedules API
          } else {
            throw new Error('Cannot schedule for a time in the past');
          }
        } else {
          console.log('⏰ Creating QStash recurring schedule for lookout:', lookout.id);
          console.log('📅 Cron schedule with timezone:', cronSchedule);

          const scheduleResponse = await qstash.schedules.create({
            // if dev env use localhost:3000/api/lookout, else use scira.ai/api/lookout
            destination:
              process.env.NODE_ENV === 'development'
                ? process.env.NGROK_URL + '/api/lookout'
                : `https://scira.ai/api/lookout`,
            method: 'POST',
            cron: cronSchedule,
            body: JSON.stringify({
              lookoutId: lookout.id,
              prompt,
              userId: user.id,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
          });

          console.log('✅ QStash recurring schedule created:', scheduleResponse.scheduleId, 'for lookout:', lookout.id);

          // Update lookout with QStash schedule ID
          await updateLookout({
            id: lookout.id,
            qstashScheduleId: scheduleResponse.scheduleId,
          });

          lookout.qstashScheduleId = scheduleResponse.scheduleId;
        }
      } catch (qstashError) {
        console.error('Error creating QStash schedule:', qstashError);
        // Delete the lookout if QStash creation fails
        await deleteLookout({ id: lookout.id });
        throw new Error(
          `Failed to ${frequency === 'once' ? 'schedule one-time search' : 'create recurring schedule'}. Please try again.`,
        );
      }
    }

    return { success: true, lookout };
  } catch (error) {
    console.error('Error creating scheduled lookout:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getUserLookouts() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    const lookouts = await getLookoutsByUserId({ userId: user.id });

    // Update next run times for active lookouts
    const updatedLookouts = lookouts.map((lookout) => {
      if (lookout.status === 'active' && lookout.cronSchedule && lookout.frequency !== 'once') {
        try {
          const nextRunAt = calculateNextRun(lookout.cronSchedule, lookout.timezone);
          return { ...lookout, nextRunAt };
        } catch (error) {
          console.error('Error calculating next run for lookout:', lookout.id, error);
          return lookout;
        }
      }
      return lookout;
    });

    return { success: true, lookouts: updatedLookouts };
  } catch (error) {
    console.error('Error getting user lookouts:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateLookoutStatusAction({
  id,
  status,
}: {
  id: string;
  status: 'active' | 'paused' | 'archived' | 'running';
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    // Get lookout to verify ownership
    const lookout = await getLookoutById({ id });
    if (!lookout || lookout.userId !== user.id) {
      throw new Error('Lookout not found or access denied');
    }

    // Update QStash schedule status if it exists
    if (lookout.qstashScheduleId) {
      try {
        if (status === 'paused') {
          await qstash.schedules.pause({ schedule: lookout.qstashScheduleId });
        } else if (status === 'active') {
          await qstash.schedules.resume({ schedule: lookout.qstashScheduleId });
          // Update next run time when resuming
          if (lookout.cronSchedule) {
            const nextRunAt = calculateNextRun(lookout.cronSchedule, lookout.timezone);
            await updateLookout({ id, nextRunAt });
          }
        } else if (status === 'archived') {
          await qstash.schedules.delete(lookout.qstashScheduleId);
        }
      } catch (qstashError) {
        console.error('Error updating QStash schedule:', qstashError);
        // Continue with database update even if QStash fails
      }
    }

    // Update database
    const updatedLookout = await updateLookoutStatus({ id, status });
    return { success: true, lookout: updatedLookout };
  } catch (error) {
    console.error('Error updating lookout status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateLookoutAction({
  id,
  title,
  prompt,
  frequency,
  time,
  timezone,
  dayOfWeek,
}: {
  id: string;
  title: string;
  prompt: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  time: string;
  timezone: string;
  dayOfWeek?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    // Get lookout to verify ownership
    const lookout = await getLookoutById({ id });
    if (!lookout || lookout.userId !== user.id) {
      throw new Error('Lookout not found or access denied');
    }

    // Check daily lookout limit if changing to daily frequency
    if (frequency === 'daily' && lookout.frequency !== 'daily') {
      const existingLookouts = await getLookoutsByUserId({ userId: user.id });
      const activeDailyLookouts = existingLookouts.filter(
        (existingLookout) =>
          existingLookout.frequency === 'daily' && existingLookout.status === 'active' && existingLookout.id !== id,
      );
      if (activeDailyLookouts.length >= 5) {
        throw new Error('You have reached the maximum limit of 5 active daily lookouts');
      }
    }

    // Handle weekly day selection
    let adjustedTime = time;
    if (frequency === 'weekly' && dayOfWeek) {
      adjustedTime = `${time}:${dayOfWeek}`;
    }

    // Generate new cron schedule if frequency changed
    let cronSchedule = '';
    let nextRunAt: Date;

    if (frequency === 'once') {
      // For 'once', set next run to today/tomorrow at specified time
      const [hours, minutes] = time.split(':').map(Number);
      const now = new Date();
      nextRunAt = new Date(now);
      nextRunAt.setHours(hours, minutes, 0, 0);

      if (nextRunAt <= now) {
        nextRunAt.setDate(nextRunAt.getDate() + 1);
      }
    } else {
      cronSchedule = frequencyToCron(frequency, time, timezone, dayOfWeek);
      nextRunAt = calculateNextRun(cronSchedule, timezone);
    }

    // Update QStash schedule if it exists and frequency/time changed
    if (lookout.qstashScheduleId && frequency !== 'once') {
      try {
        // Delete old schedule
        await qstash.schedules.delete(lookout.qstashScheduleId);

        console.log('⏰ Recreating QStash schedule for lookout:', id);
        console.log('📅 Updated cron schedule with timezone:', cronSchedule);

        // Create new schedule with updated cron
        const scheduleResponse = await qstash.schedules.create({
          // if dev env use localhost:3000/api/lookout, else use scira.ai/api/lookout
          destination:
            process.env.NODE_ENV === 'development'
              ? process.env.NGROK_URL + '/api/lookout'
              : `https://scira.ai/api/lookout`,
          method: 'POST',
          cron: cronSchedule,
          body: JSON.stringify({
            lookoutId: id,
            prompt: prompt.trim(),
            userId: user.id,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // Update database with new details
        const updatedLookout = await updateLookout({
          id,
          title: title.trim(),
          prompt: prompt.trim(),
          frequency,
          cronSchedule,
          timezone,
          nextRunAt,
          qstashScheduleId: scheduleResponse.scheduleId,
        });

        return { success: true, lookout: updatedLookout };
      } catch (qstashError) {
        console.error('Error updating QStash schedule:', qstashError);
        throw new Error('Failed to update schedule. Please try again.');
      }
    } else {
      // Update database only
      const updatedLookout = await updateLookout({
        id,
        title: title.trim(),
        prompt: prompt.trim(),
        frequency,
        cronSchedule,
        timezone,
        nextRunAt,
      });

      return { success: true, lookout: updatedLookout };
    }
  } catch (error) {
    console.error('Error updating lookout:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteLookoutAction({ id }: { id: string }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    // Get lookout to verify ownership
    const lookout = await getLookoutById({ id });
    if (!lookout || lookout.userId !== user.id) {
      throw new Error('Lookout not found or access denied');
    }

    // Delete QStash schedule if it exists
    if (lookout.qstashScheduleId) {
      try {
        await qstash.schedules.delete(lookout.qstashScheduleId);
      } catch (error) {
        console.error('Error deleting QStash schedule:', error);
        // Continue with database deletion even if QStash deletion fails
      }
    }

    // Delete from database
    const deletedLookout = await deleteLookout({ id });
    return { success: true, lookout: deletedLookout };
  } catch (error) {
    console.error('Error deleting lookout:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function testLookoutAction({ id }: { id: string }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    // Get lookout to verify ownership
    const lookout = await getLookoutById({ id });
    if (!lookout || lookout.userId !== user.id) {
      throw new Error('Lookout not found or access denied');
    }

    // Only allow testing of active or paused lookouts
    if (lookout.status === 'archived' || lookout.status === 'running') {
      throw new Error(`Cannot test lookout with status: ${lookout.status}`);
    }

    // Make a POST request to the lookout API endpoint to trigger the run
    const response = await fetch(
      process.env.NODE_ENV === 'development' ? process.env.NGROK_URL + '/api/lookout' : `https://scira.ai/api/lookout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lookoutId: lookout.id,
          prompt: lookout.prompt,
          userId: user.id,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to trigger lookout test: ${response.statusText}`);
    }

    return { success: true, message: 'Lookout test started successfully' };
  } catch (error) {
    console.error('Error testing lookout:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Server action to get user's geolocation using Vercel
export async function getUserLocation() {
  'use server';

  try {
    const { headers } = await import('next/headers');
    const headersList = await headers();

    // Create a mock request object with headers for geolocation
    const request = {
      headers: headersList,
    } as any;

    const locationData = geolocation(request);

    return {
      country: locationData.country || '',
      countryCode: locationData.country || '',
      city: locationData.city || '',
      region: locationData.region || '',
      isIndia: locationData.country === 'IN',
      loading: false,
    };
  } catch (error) {
    console.error('Failed to get location from Vercel:', error);
    return {
      country: 'Unknown',
      countryCode: '',
      city: '',
      region: '',
      isIndia: false,
      loading: false,
    };
  }
}
