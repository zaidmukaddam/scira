import { NextResponse } from 'next/server';

function getAppOrigin(request: Request) {
  const oauthOrigin = process.env.MCP_OAUTH_CALLBACK_ORIGIN?.trim();
  if (oauthOrigin) return oauthOrigin.replace(/\/+$/, '');
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return new URL(request.url).origin.replace(/\/+$/, '');
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ serverId: string }> },
) {
  const { serverId } = await params;
  const origin = getAppOrigin(request);
  const callbackUri = `${origin}/api/mcp/oauth/callback`;
  const clientId = `${origin}/api/mcp/oauth/client-metadata/${serverId}`;

  return NextResponse.json({
    client_id: clientId,
    client_name: 'Scira AI',
    client_uri: origin,
    redirect_uris: [callbackUri],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  });
}
