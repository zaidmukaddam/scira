import { NextRequest, NextResponse } from 'next/server';
import { serverEnv } from '@/env/server';
import { saveInstallation, slackApiCall } from '@/lib/slack/utils';
import type { SlackOAuthV2Response } from '@/lib/slack/types';

export async function GET(request: NextRequest) {
  console.log('[SLACK OAUTH] Handling OAuth redirect');

  try {
    // Get code from query params
    const code = request.nextUrl.searchParams.get('code');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      console.error('[SLACK OAUTH] OAuth error:', error);
      return NextResponse.redirect(new URL('/slack-install-error?error=' + error, request.url));
    }

    if (!code) {
      console.error('[SLACK OAUTH] No code provided');
      return NextResponse.redirect(new URL('/slack-install-error?error=no_code', request.url));
    }

    // Exchange code for access token
    const oauthResponse = await exchangeCodeForToken(code);

    console.log('[SLACK OAUTH] OAuth response:', JSON.stringify(oauthResponse, null, 2));

    if (!oauthResponse.ok) {
      console.error('[SLACK OAUTH] OAuth exchange failed:', oauthResponse.error);
      return NextResponse.redirect(new URL('/slack-install-error?error=' + oauthResponse.error, request.url));
    }

    // Save installation to database
    try {
      await saveInstallation(oauthResponse);
      console.log('[SLACK OAUTH] Installation saved successfully');
    } catch (saveError) {
      console.error('[SLACK OAUTH] Failed to save installation:', saveError);
      // Still redirect to success since OAuth worked, but log the error
    }

    console.log('[SLACK OAUTH] Installation successful for team:', oauthResponse.team?.id);

    // Redirect to success page
    return NextResponse.redirect(new URL('/slack-install-success', request.url));
  } catch (error) {
    console.error('[SLACK OAUTH] Unexpected error:', error);
    return NextResponse.redirect(new URL('/slack-install-error?error=unexpected', request.url));
  }
}

async function exchangeCodeForToken(code: string): Promise<SlackOAuthV2Response> {
  if (!serverEnv.SLACK_CLIENT_ID || !serverEnv.SLACK_CLIENT_SECRET || !serverEnv.SLACK_REDIRECT_URI) {
    throw new Error('Slack OAuth configuration missing');
  }

  const params = new URLSearchParams({
    client_id: serverEnv.SLACK_CLIENT_ID,
    client_secret: serverEnv.SLACK_CLIENT_SECRET,
    code: code,
    redirect_uri: serverEnv.SLACK_REDIRECT_URI,
  });

  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  return response.json();
}
