export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getUserAgentAccess } from '@/lib/db/queries';
import { getServerSession } from '@/lib/auth';

export async function GET(_req: NextRequest) {
  const session = await getServerSession();
  
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
