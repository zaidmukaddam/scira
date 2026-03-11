import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdminEmail } from '@/lib/auth-utils';
import { Daytona } from '@daytonaio/sdk';
import { serverEnv } from '@/env/server';

// GET /api/admin/sandbox-pool - Get pool status
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getSession();
    if (!session?.user || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!serverEnv.DAYTONA_API_KEY) {
      return NextResponse.json({
        error: 'Daytona API key not configured',
        sandboxes: [],
        total: 0,
      });
    }

    const daytona = new Daytona({
      apiKey: serverEnv.DAYTONA_API_KEY,
      target: 'us',
    });

    const sandboxesResult = await daytona.list();
    // Handle paginated result - check if it has a data property or is an array
    const sandboxes = Array.isArray(sandboxesResult) ? sandboxesResult : (sandboxesResult as any).data || [];

    // Group by state
    const started = sandboxes.filter((s: any) => s.state === 'started');
    const stopped = sandboxes.filter((s: any) => s.state === 'stopped');
    const archived = sandboxes.filter((s: any) => s.state === 'archived');
    const errored = sandboxes.filter((s: any) => s.state === 'error');

    const status = {
      total: sandboxes.length,
      started: started.length,
      stopped: stopped.length,
      archived: archived.length,
      errored: errored.length,
      ready: started.length, // In serverless mode, started = ready
      currentSize: sandboxes.length,
      targetSize: parseInt(process.env.SANDBOX_POOL_SIZE || '3'),
      sandboxes: sandboxes.map((s: any) => ({
        id: s.id,
        state: s.state,
        createdAt: s.createdAt,
      })),
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting pool status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/sandbox-pool - Manage pool
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getSession();
    if (!session?.user || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!serverEnv.DAYTONA_API_KEY) {
      return NextResponse.json(
        {
          error: 'Daytona API key not configured',
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const action = body.action;

    const daytona = new Daytona({
      apiKey: serverEnv.DAYTONA_API_KEY,
      target: 'us',
    });

    if (action === 'cleanup') {
      // Clean up stopped/archived/error sandboxes
      const sandboxesResult = await daytona.list();
      const sandboxes = Array.isArray(sandboxesResult) ? sandboxesResult : (sandboxesResult as any).data || [];
      const toDelete = sandboxes.filter(
        (s: any) => s.state === 'stopped' || s.state === 'archived' || s.state === 'error',
      );

      let deleted = 0;
      for (const sandbox of toDelete) {
        try {
          await sandbox.delete();
          deleted++;
        } catch (error: any) {
          console.error(`Failed to delete sandbox ${sandbox.id}:`, error);
        }
      }

      const remainingResult = await daytona.list();
      const remaining = Array.isArray(remainingResult) ? remainingResult : (remainingResult as any).data || [];
      return NextResponse.json({
        message: `Cleaned up ${deleted} sandboxes`,
        remaining: remaining.length,
      });
    } else if (action === 'list') {
      const sandboxesResult = await daytona.list();
      const sandboxes = Array.isArray(sandboxesResult) ? sandboxesResult : (sandboxesResult as any).data || [];
      return NextResponse.json({
        sandboxes: sandboxes.map((s: any) => ({
          id: s.id,
          state: s.state,
          createdAt: s.createdAt,
        })),
        total: sandboxes.length,
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error managing pool:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
