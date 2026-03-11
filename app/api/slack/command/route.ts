import { NextRequest, NextResponse } from 'next/server';
import {
  verifySlackSignature,
  getBotToken,
  postEphemeral,
  postMessage,
  slackApiCall,
  isBotInChannel,
} from '@/lib/slack/utils';
import { handleSlackQuestion } from '@/lib/slack/answer-service';
import type { SlackCommandPayload } from '@/lib/slack/types';
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
      console.error('[SLACK COMMAND] Invalid signature');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Parse form data
    const formData = new URLSearchParams(body);
    const payload: SlackCommandPayload = {
      token: formData.get('token') || '',
      team_id: formData.get('team_id') || '',
      team_domain: formData.get('team_domain') || '',
      channel_id: formData.get('channel_id') || '',
      channel_name: formData.get('channel_name') || '',
      user_id: formData.get('user_id') || '',
      user_name: formData.get('user_name') || '',
      command: formData.get('command') || '',
      text: formData.get('text') || '',
      api_app_id: formData.get('api_app_id') || '',
      is_enterprise_install: formData.get('is_enterprise_install') || '',
      response_url: formData.get('response_url') || '',
      trigger_id: formData.get('trigger_id') || '',
    };

    // Get bot token
    const token = await getBotToken(payload.team_id);
    if (!token) {
      return NextResponse.json({
        response_type: 'ephemeral',
        text: 'Bot not properly installed. Please reinstall the app.',
      });
    }

    // Check if user is Pro before processing
    const proCheck = await checkUserIsPro(payload.user_id, token);
    if (!proCheck.isPro) {
      return NextResponse.json({
        response_type: 'ephemeral',
        text: proCheck.message,
      });
    }

    // Check if bot is in the channel (skip for DMs)
    const isDM = payload.channel_name === 'directmessage';
    if (!isDM) {
      const isInChannel = await isBotInChannel(token, payload.channel_id);
      if (!isInChannel) {
        return NextResponse.json({
          response_type: 'ephemeral',
          text: `🚫 **I need to be added to this channel first!**\n\nTo use SCX.ai in <#${payload.channel_id}>, I need to be a member of the channel.\n\n**How to add me:**\n• Type \`/invite @SCX.ai\` in this channel\n• Or click the channel name → "Integrations" → "Add apps" → Select "SCX.ai"\n\nOnce I'm added, you can use \`/scx\` to:\n• Ask general questions\n• Analyze channel conversations\n• Summarize discussions\n• Extract insights and action items`,
        });
      }
    }

    // Parse command text
    const text = payload.text.trim();

    // Handle special commands
    if (text === 'help' || text === '') {
      return NextResponse.json({
        response_type: 'ephemeral',
        text: formatHelpMessage(),
      });
    }

    // Everything else is treated as a question
    return handleAskCommand(payload, text, token);
  } catch (error) {
    console.error('[SLACK COMMAND] Error handling command:', error);
    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'An error occurred processing your command. Please try again.',
    });
  }
}

async function checkUserIsPro(slackUserId: string, botToken: string): Promise<{ isPro: boolean; message?: string }> {
  try {
    // Get Slack user info to find email
    const slackUserInfo = await slackApiCall(botToken, 'users.info', {
      user: slackUserId,
    });

    if (!slackUserInfo.ok) {
      return {
        isPro: false,
        message: `⚠️ Unable to verify your Pro status. Error: ${slackUserInfo.error}`,
      };
    }

    if (!slackUserInfo.user?.profile?.email) {
      return {
        isPro: false,
        message: `📧 **Email Required**\n\nTo use SCX.ai in Slack, we need to verify your Pro status using your email.\n\n**Please add your email to your Slack profile:**\n1. Click your profile picture in Slack\n2. Select "Profile"\n3. Click "Edit Profile"\n4. Add your email address\n5. Save and try again`,
      };
    }

    const email = slackUserInfo.user.profile.email;

    // Check if user exists in our database
    const users = await db.select().from(user).where(eq(user.email, email));

    if (!users.length) {
      return {
        isPro: false,
        message: `🔒 **Pro Subscription Required**\n\nTo use SCX.ai in Slack, you need an active Pro subscription.\n\n**Get started:**\n1. Sign up at https://scx.ai\n2. Subscribe to Pro\n3. Try again in Slack\n\nYour Slack email (${email}) will be linked to your account.`,
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

async function handleAskCommand(payload: SlackCommandPayload, text: string, token: string) {
  // Post immediate acknowledgment
  const ackResponse = await postMessage(token, payload.channel_id, '🤔 Thinking...', {
    thread_ts: undefined,
  });

  if (!ackResponse.ok || !ackResponse.ts) {
    return NextResponse.json({
      response_type: 'ephemeral',
      text: 'Failed to post acknowledgment. Please try again.',
    });
  }

  // Get answer
  const answer = await handleSlackQuestion({
    question: text,
    teamId: payload.team_id,
    channelId: payload.channel_id,
    userId: payload.user_id,
    botToken: token,
  });

  // Update the acknowledgment message with the answer
  await postMessage(token, payload.channel_id, answer, {
    thread_ts: ackResponse.ts,
    unfurl_links: false,
    unfurl_media: false,
  });

  // Return empty response (we already posted the message)
  return new NextResponse('', { status: 200 });
}

function formatHelpMessage(): string {
  return `🤖 **SCX.ai Slack Commands**

**Basic Usage:**
• \`/scx [your question]\` - Ask me anything!

**Examples:**
• \`/scx What's the weather in Sydney?\`
• \`/scx Summarize the discussion in this channel\`
• \`/scx What did we decide about the project?\`

**Features:**
• Ask general questions
• Analyze channel conversations
• Summarize discussions
• Extract insights and action items
• Get real-time information (weather, currency, etc.)

**Note:** I need to be added to channels to analyze conversations. Use \`/invite @SCX.ai\` to add me.

For more information, visit https://scx.ai`;
}
