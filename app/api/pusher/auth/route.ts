export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { pusher } from '@/lib/pusher';
import { assertAdmin } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(req: NextRequest) {
  const hdrs = await headers();
  const adminUser = await assertAdmin({ headers: hdrs });
  if (!adminUser) {
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

  const isPresence = channelName.startsWith('presence-');

  try {
    const authResponse = isPresence
      ? pusher.authenticate(socketId, channelName, {
          user_id: adminUser.id,
          user_info: { name: adminUser.name, role: adminUser.role },
        } as any)
      : pusher.authenticate(socketId, channelName);

    return new NextResponse(JSON.stringify(authResponse), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return NextResponse.json({ error: 'auth_failed' }, { status: 500 });
  }
}
