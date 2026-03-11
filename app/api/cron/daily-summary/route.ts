import { NextRequest, NextResponse } from 'next/server';
import { runAllHealthChecks } from '@/lib/monitoring/health-checks';
import { sendHealthCheckSummary } from '@/lib/monitoring/email-alerts';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if monitoring is enabled
    if (process.env.MONITORING_ENABLED !== 'true') {
      return NextResponse.json({
        status: 'disabled',
        message: 'Monitoring is disabled',
      });
    }

    console.log('[CRON] Running daily health check summary...');

    // Run all health checks with full search tests
    const checks = await runAllHealthChecks(true);

    // Always send summary email
    const recipientEmail = process.env.MONITORING_EMAIL;
    if (recipientEmail) {
      await sendHealthCheckSummary(checks, recipientEmail);
      console.log('[CRON] Sent daily summary email');
    }

    return NextResponse.json({
      status: 'completed',
      timestamp: new Date().toISOString(),
      totalChecks: checks.length,
      healthy: checks.filter((c) => c.status === 'healthy').length,
      degraded: checks.filter((c) => c.status === 'degraded').length,
      unhealthy: checks.filter((c) => c.status === 'unhealthy').length,
      checks: checks,
    });
  } catch (error) {
    console.error('[CRON] Daily summary failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Daily summary failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
