import { NextRequest, NextResponse } from 'next/server';
import {
  verifySlackSignature,
  getBotToken,
  postMessage,
  postEphemeral,
  isBotInChannel,
  slackApiCall,
} from '@/lib/slack/utils';
import { handleSlackQuestion } from '@/lib/slack/answer-service';
import type { SlackEventWrapper, SlackEvent } from '@/lib/slack/types';
import { db } from '@/lib/db';
import { user, subscription } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Get request body as text for signature verification
    const body = await request.text();

    // Verify Slack signature
    const signature = request.headers.get('x-slack-signature');
    const timestamp = request.headers.get('x-slack-request-timestamp');

    if (!verifySlackSignature(signature, timestamp, body)) {
      console.error('[SLACK EVENTS] Invalid signature');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Parse body
    const payload: SlackEventWrapper = JSON.parse(body);

    // Handle URL verification challenge
    if (payload.type === 'url_verification') {
      console.log('[SLACK EVENTS] Handling URL verification');
      return NextResponse.json({ challenge: payload.challenge });
    }

    // Handle events
    if (payload.type === 'event_callback' && payload.event) {
      // Immediately acknowledge receipt (within 3s)
      processEventAsync(payload);
      return new NextResponse('OK', { status: 200 });
    }

    // Unknown event type
    console.warn('[SLACK EVENTS] Unknown event type:', payload.type);
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('[SLACK EVENTS] Error handling event:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function processEventAsync(payload: SlackEventWrapper) {
  try {
    const event = payload.event!;
    const teamId = payload.team_id!;

    // Handle app_mention events
    if (event.type === 'app_mention' && event.text && event.user && event.channel) {
      await handleAppMention(teamId, event);
    }
  } catch (error) {
    console.error('[SLACK EVENTS] Error processing event:', error);
  }
}

async function handleAppMention(teamId: string, event: SlackEvent) {
  const token = await getBotToken(teamId);
  if (!token) {
    console.error('[SLACK EVENTS] No bot token found for team:', teamId);
    return;
  }

  const channel = event.channel!;
  const user = event.user!;
  const text = event.text!;
  const threadTs = event.thread_ts || event.ts!;

  try {
    // Check if user is Pro
    const proCheck = await checkUserIsPro(user, token);
    if (!proCheck.isPro) {
      await postEphemeral(token, channel, user, proCheck.message!);
      return;
    }

    // Check if bot is in the channel
    const isInChannel = await isBotInChannel(token, channel);
    if (!isInChannel) {
      await postEphemeral(
        token,
        channel,
        user,
        `🚫 **I need to be added to this channel first!**\n\nTo use SCX.ai in <#${channel}>, I need to be a member of the channel.\n\n**How to add me:**\n• Type \`/invite @SCX.ai\` in this channel\n• Or click the channel name → "Integrations" → "Add apps" → Select "SCX.ai"\n\nOnce I'm added, you can mention me to:\n• Ask general questions\n• Analyze channel conversations\n• Summarize discussions\n• Extract insights and action items`,
      );
      return;
    }

    // Post immediate acknowledgment
    const ackMessage = await postMessage(token, channel, '🤔 Thinking...', {
      thread_ts: threadTs,
    });

    if (!ackMessage.ok || !ackMessage.ts) {
      throw new Error('Failed to post acknowledgment');
    }

    // Remove bot mention from text to get the actual question
    const question = text.replace(/<@\w+>/g, '').trim();

    if (!question) {
      await postMessage(
        token,
        channel,
        "G'day! Ask me anything about the messages in this channel. Try mentioning me with a question!",
        {
          thread_ts: threadTs,
        },
      );
      return;
    }

    // Get answer using our answer service
    const answer = await handleSlackQuestion({
      question,
      teamId,
      channelId: channel,
      userId: user,
      threadTs,
      botToken: token,
    });

    // Update the acknowledgment message with the answer
    await postMessage(token, channel, answer, {
      thread_ts: threadTs,
      unfurl_links: false,
      unfurl_media: false,
    });
  } catch (error) {
    console.error('[SLACK EVENTS] Error handling app mention:', error);
    await postMessage(token, channel, 'Sorry, I encountered an error processing your question. Please try again.', {
      thread_ts: threadTs,
    });
  }
}

async function checkUserIsPro(slackUserId: string, botToken: string): Promise<{ isPro: boolean; message?: string }> {
  try {
    const slackUserInfo = await slackApiCall(botToken, 'users.info', {
      user: slackUserId,
    });

    if (!slackUserInfo.ok || !slackUserInfo.user?.profile?.email) {
      return {
        isPro: false,
        message: `📧 **Email Required**\n\nTo use SCX.ai in Slack, we need to verify your Pro status using your email.\n\n**Please add your email to your Slack profile.**`,
      };
    }

    const email = slackUserInfo.user.profile.email;

    // Check if user exists in our database
    const users = await db.select().from(user).where(eq(user.email, email));

    if (!users.length) {
      return {
        isPro: false,
        message: `🔒 **Pro Subscription Required**\n\nTo use SCX.ai in Slack, you need an active Pro subscription.\n\n**Get started:**\n1. Sign up at https://scx.ai\n2. Subscribe to Pro\n3. Try again in Slack`,
      };
    }

    const targetUser = users[0];

    // Check if user has Pro subscription
    const subscriptions = await db
      .select()
      .from(subscription)
      .where(and(eq(subscription.userId, targetUser.id), eq(subscription.status, 'active')))
      .limit(1);

    const isProUser = subscriptions.length > 0;

    if (!isProUser) {
      return {
        isPro: false,
        message: `🔒 **Pro Subscription Required**\n\nTo use SCX.ai in Slack, you need an active Pro subscription.\n\n**Upgrade to Pro:**\n1. Visit https://scx.ai\n2. Subscribe to Pro\n3. Try again in Slack`,
      };
    }

    return { isPro: true };
  } catch (error) {
    console.error('[SLACK PRO CHECK] Error:', error);
    return {
      isPro: false,
      message: '⚠️ Unable to verify your Pro status. Please try again later.',
    };
  }
}
