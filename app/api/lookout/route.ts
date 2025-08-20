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
import { v4 as uuidv4 } from 'uuid';
import { CronExpressionParser } from 'cron-parser';
import { sendLookoutCompletionEmail } from '@/lib/email';
import { db } from '@/lib/db';
import { subscription, payment } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Import extreme search tool
import { extremeSearchTool } from '@/lib/tools';

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

    // Check for Dodo payments (Indian users)
    const dodoPayments = await db.select().from(payment).where(eq(payment.userId, userId));

    const successfulDodoPayments = dodoPayments
      .filter((p) => p.status === 'succeeded')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (successfulDodoPayments.length > 0) {
      const mostRecentPayment = successfulDodoPayments[0];
      const paymentDate = new Date(mostRecentPayment.createdAt);
      const subscriptionEndDate = new Date(paymentDate);
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1); // 1 month duration
      return subscriptionEndDate > new Date();
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
    const chatId = uuidv4();
    const streamId = 'stream-' + uuidv4();

    // Create the chat
    await saveChat({
      id: chatId,
      userId: userResult.id,
      title: `Scheduled: ${lookout.title}`,
      visibility: 'private',
    });

    // Create user message
    const userMessage = {
      id: uuidv4(),
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
            model: 'scira-grok-4',
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
    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const streamStartTime = Date.now();

        // Start streaming
        const result = streamText({
          model: scira.languageModel('scira-grok-4'),
          messages: convertToModelMessages([userMessage]),
          stopWhen: stepCountIs(2),
          maxRetries: 10,
          experimental_activeTools: ['extreme_search'],
          system: ` You are an advanced research assistant focused on deep analysis and comprehensive understanding with focus to be backed by citations in a research paper format.
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
  - ⚠️ MANDATORY: Always start your response with "Key Points" heading followed by a bulleted list of the main findings
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
  - Maintain the language of the user's message and do not change it
  - Avoid referencing citations directly, make them part of statements`,
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
            messageMetadata({ part }) {
              if (part.type === 'finish') {
                console.log('Finish part: ', part);
                const processingTime = (Date.now() - streamStartTime) / 1000;
                return {
                  model: 'scira-grok-4',
                  completionTime: processingTime,
                  inputTokens: part.totalUsage.inputTokens,
                  outputTokens: part.totalUsage.outputTokens,
                  totalTokens: part.totalUsage.totalTokens,
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
                model: 'scira-grok-4',
                completionTime: null,
                inputTokens: null,
                outputTokens: null,
                totalTokens: null,
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
