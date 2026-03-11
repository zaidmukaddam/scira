import { NextRequest, NextResponse } from 'next/server';
import { Daytona } from '@daytonaio/sdk';
import { serverEnv } from '@/env/server';

// This endpoint should be called by Vercel Cron every 5 minutes
// Already configured in vercel.json

export async function GET(request: NextRequest) {
  try {
    // Verify this is from Vercel Cron (check authorization header)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!serverEnv.DAYTONA_API_KEY) {
      return NextResponse.json({
        success: true,
        message: 'Daytona API key not configured, skipping cleanup',
      });
    }

    console.log('🧹 Starting scheduled sandbox cleanup...');

    const daytona = new Daytona({
      apiKey: serverEnv.DAYTONA_API_KEY,
      target: 'us',
    });

    const sandboxesResult = await daytona.list();
    // Handle paginated result - check if it has a data property or is an array
    const sandboxes = Array.isArray(sandboxesResult) ? sandboxesResult : (sandboxesResult as any).data || [];
    console.log(`📊 Found ${sandboxes.length} total sandboxes`);

    const targetPoolSize = parseInt(process.env.SANDBOX_POOL_SIZE || '3');

    // Group by state
    const started = sandboxes.filter((s: any) => s.state === 'started');
    const stopped = sandboxes.filter((s: any) => s.state === 'stopped');
    const archived = sandboxes.filter((s: any) => s.state === 'archived');
    const errored = sandboxes.filter((s: any) => s.state === 'error');

    console.log(
      `📈 States: ${started.length} started, ${stopped.length} stopped, ${archived.length} archived, ${errored.length} error`,
    );

    let deleted = 0;

    // Delete stopped, archived, and error sandboxes
    for (const sandbox of [...stopped, ...archived, ...errored]) {
      try {
        await sandbox.delete();
        deleted++;
        console.log(`✅ Deleted ${sandbox.state} sandbox ${sandbox.id}`);
      } catch (error: any) {
        console.log(`⚠️ Failed to delete sandbox ${sandbox.id}: ${error.message}`);
      }
    }

    // Delete excess started sandboxes (keep only targetPoolSize)
    if (started.length > targetPoolSize) {
      const excess = started.slice(targetPoolSize);
      console.log(`🗑️ Deleting ${excess.length} excess started sandboxes`);

      for (const sandbox of excess) {
        try {
          await sandbox.stop();
          await new Promise((resolve) => setTimeout(resolve, 2000));
          await sandbox.delete();
          deleted++;
          console.log(`✅ Deleted excess sandbox ${sandbox.id}`);
        } catch (error: any) {
          console.log(`⚠️ Failed to delete excess sandbox ${sandbox.id}: ${error.message}`);
        }
      }
    }

    const remainingResult = await daytona.list();
    const remaining = Array.isArray(remainingResult) ? remainingResult : (remainingResult as any).data || [];

    return NextResponse.json({
      success: true,
      deleted,
      remaining: remaining.length,
      target: targetPoolSize,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Sandbox cleanup failed:', error);
    return NextResponse.json({ error: 'Cleanup failed', message: error.message }, { status: 500 });
  }
}

// Prevent static optimization
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max execution
