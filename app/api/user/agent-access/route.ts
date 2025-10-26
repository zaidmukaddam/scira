export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getUserAgentAccess } from '@/lib/db/queries';

export async function GET(_req: NextRequest) {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const access = await getUserAgentAccess(session.user.id);
    return NextResponse.json(access);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get agent access' }, { status: 500 });
  }
}
