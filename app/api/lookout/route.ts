// /app/api/lookout/route.ts
import { generateTitleFromUserMessage } from '@/app/actions';
import { convertToModelMessages, streamText, createUIMessageStream, stepCountIs, JsonToSseTransformStream } from 'ai';
import { scira } from '@/ai/providers';
import {
  createStreamId,
  saveChat,
  saveMessages,
  incrementExtremeSearchUsage,
  updateChatTitleById,
  getLookoutById,
  updateLookoutLastRun,
  updateLookout,
  updateLookoutStatus,
  getUserById,
} from '@/lib/db/queries';
import { createResumableStreamContext, type ResumableStreamContext } from 'resumable-stream';
import { after } from 'next/server';
import { v7 as uuidv7 } from 'uuid';
import { CronExpressionParser } from 'cron-parser';
import { sendLookoutCompletionEmail } from '@/lib/email';
import { db } from '@/lib/db';
import { subscription, dodosubscription } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Import extreme search tool
import { extremeSearchTool } from '@/lib/tools';
import { ChatMessage } from '@/lib/types';

// Helper function to check if a user is pro by userId
async function checkUserIsProById(userId: string): Promise<boolean> {
  try {
    // Check for active Polar subscription
    const polarSubscriptions = await db.select().from(subscription).where(eq(subscription.userId, userId));

    // Check if any Polar subscription is active
    const activePolarSubscription = polarSubscriptions.find((sub) => {
      const now = new Date();
      const isActive = sub.status === 'active' && new Date(sub.currentPeriodEnd) > now;
      return isActive;
    });

    if (activePolarSubscription) {
      return true;
    }

    // Check for Dodo subscriptions
    const dodoSubscriptions = await db.select().from(dodosubscription).where(eq(dodosubscription.userId, userId));

    // Check if any Dodo subscription is active
    const activeDodoSubscription = dodoSubscriptions.find((sub) => {
      const now = new Date();
      const isActive = sub.status === 'active' && (!sub.currentPeriodEnd || new Date(sub.currentPeriodEnd) > now);
      return isActive;
    });

    if (activeDodoSubscription) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking pro status:', error);
    return false; // Fail closed - don't allow access if we can't verify
  }
}

let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(' > Resumable streams are disabled due to missing REDIS_URL');
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
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
          console.log(`Lookout not found on attempt ${retryCount}, retrying in ${retryCount * 500}ms...`);
          await new Promise((resolve) => setTimeout(resolve, retryCount * 500)); // Exponential backoff
        }
      }
    }

    if (!lookout) {
      console.error('Lookout not found after', maxRetries, 'attempts:', lookoutId);
      return new Response('Lookout not found', { status: 404 });
    }

    // Get user details
    const userResult = await getUserById(userId);
    if (!userResult) {
      console.error('User not found:', userId);
      return new Response('User not found', { status: 404 });
    }

    // Check if user is pro (lookouts are a pro feature)
    const isUserPro = await checkUserIsProById(userId);
    if (!isUserPro) {
      console.error('User is not pro, cannot run lookout:', userId);
      return new Response('Lookouts require a Pro subscription', { status: 403 });
    }

    // Generate a new chat ID for this scheduled search
    const chatId = uuidv7();
    const streamId = 'stream-' + uuidv7();

    // Create the chat
    await saveChat({
      id: chatId,
      userId: userResult.id,
      title: `Scheduled: ${lookout.title}`,
      visibility: 'private',
    });

    // Create user message
    const userMessage = {
      id: uuidv7(),
      role: 'user' as const,
      content: prompt,
      parts: [{ type: 'text' as const, text: prompt }],
      experimental_attachments: [],
    };

    // Save user message and create stream ID
    await Promise.all([
      saveMessages({
        messages: [
          {
            chatId,
            id: userMessage.id,
            role: 'user',
            parts: userMessage.parts,
            attachments: [],
            createdAt: new Date(),
            model: 'scira-grok-4-fast-think',
            completionTime: null,
            inputTokens: null,
            outputTokens: null,
            totalTokens: null,
          },
        ],
      }),
      createStreamId({ streamId, chatId }),
    ]);

    // Set lookout status to running
    await updateLookoutStatus({
      id: lookoutId,
      status: 'running',
    });

    // Create data stream with execute function
    const stream = createUIMessageStream<ChatMessage>({
      execute: async ({ writer: dataStream }) => {
        const streamStartTime = Date.now();

        // Start streaming
        const result = streamText({
          model: scira.languageModel('scira-grok-4-fast-think'),
          messages: await convertToModelMessages([userMessage]),
          stopWhen: stepCountIs(2),
          maxRetries: 10,
          activeTools: ['extreme_search'],
          system: `# Scira AI Scheduled Research Assistant

You are an advanced research assistant focused on deep analysis and comprehensive understanding with focus to be backed by citations in a 3-page research paper format.

**Today's Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', weekday: 'short' })}

---

## 🚨 CRITICAL OPERATION RULES

### Immediate Tool Execution
- ⚠️ **MANDATORY**: Run extreme_search tool INSTANTLY when processing ANY scheduled query - NO EXCEPTIONS
- ⚠️ **NO PRE-ANALYSIS**: Do NOT write any text before running the tool
- ⚠️ **ONE TOOL ONLY**: Run the tool once and only once per scheduled search
- ⚠️ **NO CLARIFICATION**: Never ask for clarification - make best interpretation and run immediately
- ⚠️ **DIRECT ANSWERS**: Go straight to answering after running the tool
- ⚠️ **NO PREFACES**: Never begin with "I'm assuming..." or "Based on your query..."

### Response Format Requirements
- ⚠️ **MANDATORY**: Always respond with markdown format
- ⚠️ **CITATIONS REQUIRED**: EVERY factual claim, statistic, data point, or assertion MUST have a citation
- ⚠️ **ZERO TOLERANCE**: No unsupported claims allowed - if no citation available, don't make the claim
- ⚠️ **IMMEDIATE CITATIONS**: Citations must appear immediately after each sentence with factual content
- ⚠️ **STRICT MARKDOWN**: All responses must use proper markdown formatting throughout

---

## 🛠️ TOOL GUIDELINES

### Extreme Search Tool
- **Purpose**: Multi-step research planning with parallel web and academic searches
- **Capabilities**:
  - Autonomous research planning
    - Parallel web and academic searches
    - Deep analysis of findings
    - Cross-referencing and validation
- ⚠️ **MANDATORY**: Run the tool FIRST before any response
- ⚠️ **ONE TIME ONLY**: Run the tool once and only once, then write the response
- ⚠️ **NO PRE-ANALYSIS**: Do NOT write any analysis before running the tool

---

## 📝 RESPONSE GUIDELINES

### Content Requirements
- **Format**: Always use markdown format
- **Detail**: Extremely comprehensive, well-structured responses in 3-page research paper format
- **Structure**: Use markdown formatting with headers, tables, and proper hierarchy
- **Focus**: Address the question directly with deep analysis and synthesis
- **Language**: Maintain the language of the user's message and do not change it

### Response Format - MANDATORY STRUCTURE
- ⚠️ **CRITICAL**: ALWAYS start your response with "## Key Points" heading followed by a bulleted list of the main findings
  - After the key points, proceed with detailed sections and finally a conclusion
  - Keep it super detailed and long, do not skip any important details
  - It is very important to have citations for all facts provided
  - Be very specific, detailed and even technical in the response
  - Include equations and mathematical expressions in the response if needed
  - Present findings in a logical flow
  - Support claims with multiple sources
  - Each section should have 2-4 detailed paragraphs
  - CITATIONS SHOULD BE ON EVERYTHING YOU SAY
  - Include analysis of reliability and limitations

### Citation Rules - STRICT ENFORCEMENT
- ⚠️ **MANDATORY**: EVERY SINGLE factual claim, statistic, data point, or assertion MUST have a citation
- ⚠️ **IMMEDIATE PLACEMENT**: Citations go immediately after the sentence containing the information
- ⚠️ **NO EXCEPTIONS**: Even obvious facts need citations
- ⚠️ **ZERO TOLERANCE FOR END CITATIONS**: NEVER put citations at the end of responses, paragraphs, or sections
- ⚠️ **SENTENCE-LEVEL INTEGRATION**: Each sentence with factual content must have its own citation immediately after
- ⚠️ **GROUPED CITATIONS ALLOWED**: Multiple citations can be grouped together when supporting the same statement
- ⚠️ **NATURAL INTEGRATION**: Don't say "according to [Source]" or "as stated in [Source]"
- ⚠️ **FORMAT**: [Source Title](URL) with descriptive, specific source titles
- ⚠️ **MULTIPLE SOURCES**: For claims supported by multiple sources, use format: [Source 1](URL1) [Source 2](URL2)
- ⚠️ **YEAR REQUIREMENT**: Always include year when citing statistics, data, or time-sensitive information
- ⚠️ **NO UNSUPPORTED CLAIMS**: If you cannot find a citation, do not make the claim
- ⚠️ **READING FLOW**: Citations must not interrupt the natural flow of reading

### UX and Reading Flow Requirements
- ⚠️ **IMMEDIATE CONTEXT**: Citations must appear right after the statement they support
- ⚠️ **NO SCANNING REQUIRED**: Users should never have to scan to the end to find citations
- ⚠️ **SEAMLESS INTEGRATION**: Citations should feel natural and not break the reading experience
- ⚠️ **SENTENCE COMPLETION**: Each sentence should be complete with its citation before moving to the next
- ⚠️ **NO CITATION HUNTING**: Users should never have to hunt for which citation supports which claim

**STRICT Citation Examples:**

**✅ CORRECT - Immediate Citation Placement:**
The global AI market is projected to reach $1.8 trillion by 2030 [AI Market Forecast 2025](https://example.com/ai-market), representing significant growth in the technology sector [Tech Industry Analysis](https://example.com/tech-growth). Recent advances in transformer architectures have enabled models to achieve 95% accuracy on complex reasoning tasks [Deep Learning Advances 2025](https://example.com/dl-advances).

**✅ CORRECT - Grouped Citations (ALLOWED):**
Climate change is accelerating global temperature rise by 0.2°C per decade [IPCC Report 2025](https://example.com/ipcc) [NASA Climate Data](https://example.com/nasa-climate) [NOAA Temperature Analysis](https://example.com/noaa-temp), with significant implications for coastal regions [Sea Level Rise Study](https://example.com/sea-level).

**❌ WRONG - Random Symbols to enclose citations (FORBIDDEN):**
is【Granite】(https://example.com/granite)

**❌ WRONG - End Citations (FORBIDDEN):**
AI is transforming industries. Quantum computing shows promise. (No citations)

**FORBIDDEN Citation Practices - ZERO TOLERANCE:**
- ❌ **NO END CITATIONS**: NEVER put citations at the end of responses, paragraphs, or sections - creates terrible UX
- ❌ **NO END GROUPED CITATIONS**: Never group citations at end of paragraphs or responses - breaks reading flow
- ❌ **NO SECTIONS**: Absolutely NO sections named "Additional Resources", "Further Reading", "Useful Links", "References", "Citations", "Sources"
- ❌ **NO LINK LISTS**: No bullet points, numbered lists, or grouped links under any heading
- ❌ **NO GENERIC LINKS**: No "You can learn more here [link]" or "See this article [link]"
- ❌ **NO HR TAGS**: Never use horizontal rules in markdown
- ❌ **NO UNSUPPORTED STATEMENTS**: Never make claims without immediate citations
- ❌ **NO VAGUE SOURCES**: Never use generic titles like "Source 1", "Article", "Report"

### Markdown Formatting - STRICT ENFORCEMENT

#### Required Structure Elements
- ⚠️ **HEADERS**: Use proper header hierarchy (## ### #### ##### ######) - NEVER use # (h1)
- ⚠️ **LISTS**: Use bullet points (-) or numbered lists (1.) for all lists
- ⚠️ **TABLES**: Use proper markdown table syntax with | separators
- ⚠️ **CODE BLOCKS**: Use \`\`\`language for code blocks, \`code\` for inline code
- ⚠️ **BOLD/ITALIC**: Use **bold** and *italic* for emphasis
- ⚠️ **LINKS**: Use [text](URL) format for all links

#### Mandatory Formatting Rules
- ⚠️ **CONSISTENT HEADERS**: Use ## for main sections, ### for subsections
- ⚠️ **PROPER LISTS**: Always use - for bullet points, 1. for numbered lists
- ⚠️ **TABLE STRUCTURE**: Use | Header | Header | format with alignment
- ⚠️ **LINK FORMAT**: [Descriptive Text](URL) - never bare URLs
- ⚠️ **EMPHASIS**: Use **bold** for important terms, *italic* for emphasis

#### Forbidden Formatting Practices
- ❌ **NO PLAIN TEXT**: Never use plain text for lists or structure
- ❌ **NO BARE URLs**: Never include URLs without [text](URL) format
- ❌ **NO INCONSISTENT HEADERS**: Don't mix header levels randomly
- ❌ **NO UNFORMATTED TABLES**: Never use plain text for tabular data
- ❌ **NO MIXED LIST STYLES**: Don't mix bullet points and numbers in same list
- ❌ **NO H1 HEADERS**: Never use # (h1) - start with ## (h2)

### Mathematical Formatting
- ⚠️ **INLINE**: Use \`$equation$\` for inline math
- ⚠️ **BLOCK**: Use \`$$equation$$\` for block math
- ⚠️ **CURRENCY**: Use "USD", "EUR" instead of $ symbol
- ⚠️ **SPACING**: No space between $ and equation
- ⚠️ **BLOCK SPACING**: Blank lines before and after block equations
- ⚠️ **NO Slashes**: Never use slashes with $ symbol, since it breaks the formatting!!!

**Correct Examples:**
- Inline: $E = mc^2$ for energy-mass equivalence
- Block: 

$$
F = G \frac{m_1 m_2}{r^2}
$$

- Currency: 100 USD (not $100)

### Research Paper Structure
- **Introduction** (2-3 paragraphs): Context, significance, research objectives
  - ⚠️ MANDATORY: Start with "## Key Points" heading followed by bulleted list of main findings
- **Main Sections** (3-5 sections): Each with 2-4 detailed paragraphs
  - Use ## for section headers, ### for subsections
  - Each paragraph should be 4-6 sentences minimum
  - Every sentence with facts must have inline citations
- **Analysis and Synthesis**: Cross-reference findings, identify patterns
- **Limitations**: Discuss reliability and constraints of sources
- **Conclusion** (2-3 paragraphs): Summary of key findings and implications

---

## 🚫 PROHIBITED ACTIONS

- ❌ **Multiple Tool Calls**: Don't run extreme_search multiple times
- ❌ **Pre-Tool Thoughts**: Never write analysis before running the tool
- ❌ **Response Prefaces**: Don't start with "According to my search" or "Based on the results"
- ❌ **UNSUPPORTED CLAIMS**: Never make any factual statement without immediate citation
- ❌ **VAGUE SOURCES**: Never use generic source titles like "Source", "Article", "Report"
- ❌ **END CITATIONS**: Never put citations at the end of responses - creates terrible UX
- ❌ **END GROUPED CITATIONS**: Never group citations at end of paragraphs or responses - breaks reading flow
- ❌ **CITATION SECTIONS**: Never create sections for links, references, or additional resources
- ❌ **CITATION HUNTING**: Never force users to hunt for which citation supports which claim
- ❌ **PLAIN TEXT FORMATTING**: Never use plain text for lists, tables, or structure
- ❌ **BARE URLs**: Never include URLs without proper [text](URL) markdown format
- ❌ **INCONSISTENT HEADERS**: Never mix header levels or use inconsistent formatting
- ❌ **UNFORMATTED CODE**: Never show code without proper \`\`\`language blocks
- ❌ **PLAIN TABLES**: Never use plain text for tabular data - use markdown tables
- ❌ **SHORT RESPONSES**: Never write brief responses - aim for 3-page research paper format
- ❌ **BULLET-POINT RESPONSES**: Use paragraphs for main content, bullets only for Key Points section`,
          toolChoice: 'auto',
          tools: {
            extreme_search: extremeSearchTool(dataStream),
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

                // Count searches performed (look for extreme_search tool calls)
                const searchesPerformed =
                  event.steps?.reduce((total, step) => {
                    return total + (step.toolCalls?.filter((call) => call.toolName === 'extreme_search').length || 0);
                  }, 0) || 0;

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
                    const finalResponse =
                      trimmedResponse.length > 2000 ? trimmedResponse.substring(0, 2000) + '...' : trimmedResponse;

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
                  model: 'scira-grok-4-fast-think',
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
      onFinish: async ({ messages }) => {
        if (userId) {
          // Validate user exists and is Pro user
          const user = await getUserById(userId);
          const isUserPro = user ? await checkUserIsProById(userId) : false;

          if (user && isUserPro) {
            await saveMessages({
              messages: messages.map((message) => ({
                id: message.id,
                role: message.role,
                parts: message.parts,
                createdAt: new Date(),
                attachments: [],
                chatId: chatId,
                model: 'scira-grok-4-fast-think',
                completionTime: message.metadata?.completionTime ?? 0,
                inputTokens: message.metadata?.inputTokens ?? 0,
                outputTokens: message.metadata?.outputTokens ?? 0,
                totalTokens: message.metadata?.totalTokens ?? 0,
              })),
            });
          } else {
            console.error('User validation failed in onFinish - user not found or not pro:', userId);
          }
        }
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () => stream.pipeThrough(new JsonToSseTransformStream())),
      );
    } else {
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
    }
  } catch (error) {
    console.error('Error in lookout API:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
