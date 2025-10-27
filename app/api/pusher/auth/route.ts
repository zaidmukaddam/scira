export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { pusher } from '@/lib/pusher';
import { assertAdmin, auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  const currentUser = (session as any)?.user;
  
  if (!currentUser) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const contentType = req.headers.get('content-type') || '';
  let socketId = '';
  let channelName = '';

  if (contentType.includes('application/json')) {
    const body = await req.json();
    socketId = body.socket_id || body.socketId || '';
    channelName = body.channel_name || body.channelName || '';
  } else {
    const form = await req.formData();
    socketId = String(form.get('socket_id') || '');
    channelName = String(form.get('channel_name') || '');
  }

  if (!socketId || !channelName) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  if (channelName.startsWith('private-admin-') || channelName.startsWith('presence-admin-')) {
    const adminUser = await assertAdmin({ headers: hdrs });
    if (!adminUser) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  if (channelName.startsWith('private-user-')) {
    const userId = channelName.replace('private-user-', '');
    if (userId !== currentUser.id) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const isPresence = channelName.startsWith('presence-');

  try {
    if (!pusher) {
      console.error('Pusher not initialized');
      return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }

    const authResponse = isPresence
      ? pusher.authenticate(socketId, channelName, {
          user_id: currentUser.id,
          user_info: { name: currentUser.name, role: currentUser.role },
        } as any)
      : pusher.authenticate(socketId, channelName);

    return new NextResponse(JSON.stringify(authResponse), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('Pusher auth error:', e);
    return NextResponse.json({ error: 'auth_failed', details: String(e) }, { status: 500 });
  }
}
