import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/env/server';
import { db } from '@/lib/db';
import type {
  SlackInstallation,
  SlackOAuthV2Response,
  SlackConversationsHistoryResponse,
  SlackConversationsInfoResponse,
  SlackChatPostMessageResponse,
  SlackHistoryMessage,
} from './types';

// Initialize Supabase client if available
let supabase: ReturnType<typeof createClient> | null = null;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl && serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(supabaseUrl, serverEnv.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Verify Slack request signature
 */
export function verifySlackSignature(signature: string | null, timestamp: string | null, body: string): boolean {
  if (!signature || !timestamp) {
    console.error('[SLACK] Missing signature or timestamp');
    return false;
  }

  const signingSecret = serverEnv.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    console.error('[SLACK] Missing SLACK_SIGNING_SECRET');
    return false;
  }

  // Check timestamp to prevent replay attacks (5 minutes)
  const time = Math.floor(Date.now() / 1000);
  if (Math.abs(time - parseInt(timestamp)) > 60 * 5) {
    console.error('[SLACK] Request timestamp too old');
    return false;
  }

  // Compute expected signature
  const sigBasestring = `v0:${timestamp}:${body}`;
  const expectedSig = 'v0=' + crypto.createHmac('sha256', signingSecret).update(sigBasestring).digest('hex');

  // Compare signatures
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
}

/**
 * Get bot token for a team
 */
export async function getBotToken(teamId: string): Promise<string | null> {
  // Try Supabase first if available
  if (supabase) {
    const { data, error } = await (supabase as any)
      .from('slack_installations')
      .select('bot_token')
      .eq('team_id', teamId)
      .single();

    if (!error && data && 'bot_token' in data) {
      return data.bot_token as string;
    }
  }

  // Fallback: Use environment variable for single team (development)
  if (process.env.SLACK_BOT_TOKEN) {
    return process.env.SLACK_BOT_TOKEN;
  }

  console.error('[SLACK] Failed to get bot token for team:', teamId);
  return null;
}

/**
 * Save or update Slack installation
 */
export async function saveInstallation(oauthResponse: SlackOAuthV2Response): Promise<void> {
  if (!oauthResponse.ok || !oauthResponse.team) {
    throw new Error('Invalid OAuth response');
  }

  const installation: SlackInstallation = {
    team_id: oauthResponse.team.id,
    team_name: oauthResponse.team.name,
    enterprise_id: oauthResponse.enterprise?.id,
    bot_user_id: oauthResponse.bot_user_id!,
    bot_token: oauthResponse.access_token!,
    installed_by_user_id: oauthResponse.authed_user?.id,
    scopes: oauthResponse.scope,
  };

  console.log('[SLACK] Saving installation:', {
    team_id: installation.team_id,
    team_name: installation.team_name,
    bot_user_id: installation.bot_user_id,
    has_token: !!installation.bot_token,
  });

  // Try Supabase first if available
  if (supabase) {
    const { data, error } = await (supabase as any)
      .from('slack_installations')
      .upsert(installation, {
        onConflict: 'team_id',
      })
      .select();

    if (error) {
      console.error('[SLACK] Failed to save installation:', error);
      throw error;
    }

    console.log('[SLACK] Installation saved:', data);
    return;
  }

  // Fallback: Log installation (in production, you'd want to use a database table)
  console.log('[SLACK] Installation would be saved:', installation);
  console.warn('[SLACK] No Supabase configured - installation not persisted');
}

/**
 * Check if bot is a member of a channel
 */
export async function isBotInChannel(token: string, channelId: string): Promise<boolean> {
  try {
    const response = await slackApiCall<SlackConversationsInfoResponse>(token, 'conversations.info', {
      channel: channelId,
    });

    if (!response.ok) {
      console.log(`[SLACK] Failed to get channel info: ${response.error}`);
      return false;
    }

    return response.channel?.is_member === true;
  } catch (error) {
    console.error('[SLACK] Error checking channel membership:', error);
    return false;
  }
}

/**
 * Make authenticated Slack API call
 */
export async function slackApiCall<T = any>(
  token: string,
  method: string,
  params: Record<string, any> = {},
): Promise<T> {
  const url = `https://slack.com/api/${method}`;

  // For GET requests, use query params
  if (
    method.startsWith('conversations.history') ||
    method.startsWith('conversations.info') ||
    method.startsWith('users.info') ||
    method.startsWith('users.profile')
  ) {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(`${url}?${queryParams}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.json();
  }

  // For POST requests
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  return response.json();
}

/**
 * Post message to Slack
 */
export async function postMessage(
  token: string,
  channel: string,
  text: string,
  options: {
    thread_ts?: string;
    blocks?: any[];
    unfurl_links?: boolean;
    unfurl_media?: boolean;
  } = {},
): Promise<SlackChatPostMessageResponse> {
  return slackApiCall<SlackChatPostMessageResponse>(token, 'chat.postMessage', {
    channel,
    text,
    ...options,
  });
}

/**
 * Update Slack message
 */
export async function updateMessage(
  token: string,
  channel: string,
  ts: string,
  text: string,
  options: {
    blocks?: any[];
  } = {},
): Promise<SlackChatPostMessageResponse> {
  return slackApiCall<SlackChatPostMessageResponse>(token, 'chat.update', {
    channel,
    ts,
    text,
    ...options,
  });
}

/**
 * Post ephemeral message (visible only to one user)
 */
export async function postEphemeral(
  token: string,
  channel: string,
  user: string,
  text: string,
  options: {
    blocks?: any[];
  } = {},
): Promise<{ ok: boolean; message_ts?: string }> {
  return slackApiCall(token, 'chat.postEphemeral', {
    channel,
    user,
    text,
    ...options,
  });
}

/**
 * Get channel info
 */
export async function getChannelInfo(token: string, channelId: string): Promise<SlackConversationsInfoResponse> {
  return slackApiCall<SlackConversationsInfoResponse>(token, 'conversations.info', { channel: channelId });
}

/**
 * Get channel history with pagination
 */
export async function* getChannelHistory(
  token: string,
  channelId: string,
  options: {
    oldest?: string;
    latest?: string;
    limit?: number;
  } = {},
): AsyncGenerator<SlackHistoryMessage[], void, unknown> {
  let cursor: string | undefined;

  do {
    const response = await slackApiCall<SlackConversationsHistoryResponse>(token, 'conversations.history', {
      channel: channelId,
      cursor,
      limit: options.limit || 100,
      ...(options.oldest && { oldest: options.oldest }),
      ...(options.latest && { latest: options.latest }),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error}`);
    }

    if (response.messages && response.messages.length > 0) {
      yield response.messages;
    }

    cursor = response.response_metadata?.next_cursor;
  } while (cursor);
}

/**
 * Normalize Slack message text
 */
export function normalizeMessageText(text: string): string {
  // Expand user mentions <@U123> to readable format
  text = text.replace(/<@(\w+)>/g, '@user');

  // Expand channel mentions <#C123|channel-name> to #channel-name
  text = text.replace(/<#\w+\|([^>]+)>/g, '#$1');

  // Expand links <http://example.com|Example> to Example (http://example.com)
  text = text.replace(/<(https?:\/\/[^|>]+)\|([^>]+)>/g, '$2 ($1)');

  // Remove remaining link brackets <http://example.com>
  text = text.replace(/<(https?:\/\/[^>]+)>/g, '$1');

  // Clean up extra whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}
