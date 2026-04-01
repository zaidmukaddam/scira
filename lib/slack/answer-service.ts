import { scx } from '@/ai/providers';
import { generateText } from 'ai';
import { slackApiCall, normalizeMessageText } from './utils';
import { webSearchTool, datetimeTool, weatherTool, currencyConverterTool } from '@/lib/tools';

interface SlackQuestionOptions {
  question: string;
  teamId: string;
  channelId: string;
  userId: string;
  threadTs?: string;
  botToken: string;
}

interface SlackMessage {
  ts: string;
  user: string;
  text: string;
  thread_ts?: string;
  type: string;
  subtype?: string;
  bot_id?: string;
}

/**
 * Handle a question from Slack with optional channel context and tool support
 */
export async function handleSlackQuestion(options: SlackQuestionOptions): Promise<string> {
  const { question, channelId, botToken } = options;

  try {
    console.log(`[SLACK ANSWER] Processing question: "${question}"`);

    // Check if the question needs channel context
    const needsChannelContext = checkIfNeedsChannelContext(question);
    let context = '';

    if (needsChannelContext) {
      try {
        // Fetch channel messages for context
        const messages = await fetchChannelMessages(channelId, botToken);

        if (messages && messages.length > 0) {
          console.log(`[SLACK ANSWER] Fetched ${messages.length} messages from channel`);
          context = await buildContextFromMessages(messages, botToken);

          // Limit context to approximately 4000 tokens (16k chars)
          const MAX_CONTEXT_CHARS = 16000;
          if (context.length > MAX_CONTEXT_CHARS) {
            context = truncateContext(context, MAX_CONTEXT_CHARS);
          }
        }
      } catch (error: any) {
        if (error.message?.includes('not_in_channel')) {
          return `🚫 **I need to be added to this channel first!**

To analyse channel conversations, I need to be a member of the channel.

**How to add me:**
1. Type \`/invite @SCX.ai\` in this channel
2. Or click the channel name → "Integrations" → "Add apps" → Select "SCX.ai"

Once I'm added, I'll be able to:
• Analyse your channel conversations
• Summarise discussions and decisions
• Extract action items and insights

For now, I can still help with general questions that don't require channel context!`;
        }
        throw error;
      }
    }

    // Generate answer using LLM with tool support
    const answer = await generateAnswerWithTools(question, context);

    return answer;
  } catch (error) {
    console.error('[SLACK ANSWER] Error handling question:', error);
    return 'Sorry, I encountered an error while processing your question. Please try again.';
  }
}

/**
 * Check if the question likely needs channel context
 */
function checkIfNeedsChannelContext(question: string): boolean {
  const contextKeywords = [
    'discussed',
    'mentioned',
    'said',
    'talked about',
    'conversation',
    'channel',
    'here',
    'yesterday',
    'today',
    'this week',
    'last week',
    'earlier',
    'summary',
    'summarize',
    'summarise',
    'decisions',
    'action items',
    'what did',
    'who said',
    'who is',
    'meeting',
    'analyze',
    'analyse',
    'context',
    'this channel',
    'background',
    'what happened',
    'tell me about',
    'explain',
    "what's happening",
  ];

  const lowerQuestion = question.toLowerCase();
  const hasPeopleReference =
    lowerQuestion.includes('who') || lowerQuestion.includes('@') || lowerQuestion.includes('someone');
  const hasAnalysisRequest =
    lowerQuestion.includes('analys') || lowerQuestion.includes('review') || lowerQuestion.includes('background');

  return contextKeywords.some((keyword) => lowerQuestion.includes(keyword)) || hasPeopleReference || hasAnalysisRequest;
}

/**
 * Fetch all messages from a Slack channel
 */
async function fetchChannelMessages(channelId: string, botToken: string): Promise<SlackMessage[]> {
  const messages: SlackMessage[] = [];
  let cursor: string | undefined;

  try {
    while (true) {
      const params: any = {
        channel: channelId,
        limit: 1000,
      };

      if (cursor) {
        params.cursor = cursor;
      }

      const response = await slackApiCall(botToken, 'conversations.history', params);

      if (!response.ok) {
        throw new Error(`Failed to fetch channel history: ${response.error}`);
      }

      // Filter out bot messages and system messages
      const userMessages = response.messages.filter(
        (msg: SlackMessage) => msg.type === 'message' && !msg.subtype && !msg.bot_id && msg.text && msg.text.length > 0,
      );

      messages.push(...userMessages);

      if (!response.has_more || !response.response_metadata?.next_cursor) {
        break;
      }

      cursor = response.response_metadata.next_cursor;
    }

    return messages;
  } catch (error) {
    console.error('[SLACK ANSWER] Error fetching messages:', error);
    throw error;
  }
}

/**
 * Build context string from messages, including user names
 */
async function buildContextFromMessages(messages: SlackMessage[], botToken: string): Promise<string> {
  // Get unique user IDs
  const userIds = [...new Set(messages.map((m) => m.user).filter(Boolean))];

  // Fetch user names
  const userMap = new Map<string, string>();

  for (const userId of userIds) {
    try {
      const response = await slackApiCall(botToken, 'users.info', {
        user: userId,
      });

      if (response.ok && response.user) {
        userMap.set(userId, response.user.real_name || response.user.name || userId);
      }
    } catch (error) {
      userMap.set(userId, userId);
    }
  }

  // Sort messages by timestamp (oldest first)
  const sortedMessages = messages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));

  // Build context string
  const contextParts = sortedMessages.map((message) => {
    const userName = userMap.get(message.user) || message.user || 'Unknown';
    const timestamp = new Date(parseFloat(message.ts) * 1000).toLocaleString('en-AU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    const cleanText = normalizeMessageText(message.text);

    return `[${timestamp}] ${userName}: ${cleanText}`;
  });

  return contextParts.join('\n');
}

/**
 * Truncate context to fit within token limits, keeping most recent messages
 */
function truncateContext(context: string, maxChars: number): string {
  const lines = context.split('\n');
  let truncated = '';

  // Start from the end and work backwards
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const newContext = line + (truncated ? '\n' + truncated : '');

    if (newContext.length > maxChars) {
      break;
    }

    truncated = newContext;
  }

  return truncated;
}

/**
 * Generate answer using LLM with tool support
 */
async function generateAnswerWithTools(question: string, context: string): Promise<string> {
  const tools = {
    web_search: webSearchTool,
    datetime: datetimeTool,
    get_weather_data: weatherTool,
    currency_converter: currencyConverterTool,
  };

  const systemPrompt = context
    ? `You are SCX.ai, an Australian AI assistant integrated into Slack. You have access to recent channel messages for context. Use Australian spelling and DD/MM/YYYY date format.

Channel Context:
${context}

Use this context to answer questions about what was discussed in the channel. Be concise and helpful.`
    : `You are SCX.ai, an Australian AI assistant integrated into Slack. Use Australian spelling and DD/MM/YYYY date format. Answer questions concisely and helpfully.`;

  try {
    const result = await generateText({
      model: scx.languageModel('llama-3.3'),
      prompt: question,
      system: systemPrompt,
      tools: Object.keys(tools).length > 0 ? (tools as any) : undefined,
      ...({ maxTokens: 1000 } as any),
    });

    return result.text;
  } catch (error) {
    console.error('[SLACK ANSWER] Error generating answer:', error);
    throw error;
  }
}
