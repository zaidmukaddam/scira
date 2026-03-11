import { NextRequest, NextResponse } from 'next/server';
import { runAllHealthChecks } from '@/lib/monitoring/health-checks';
import { sendUnhealthyServiceAlert } from '@/lib/monitoring/email-alerts';

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

    console.log('[CRON] Running scheduled health check...');

    // Run all health checks
    const checks = await runAllHealthChecks();
    const unhealthy = checks.filter((c) => c.status === 'unhealthy');
    const degraded = checks.filter((c) => c.status === 'degraded');

    // Only send email if there are issues
    if (unhealthy.length > 0 || degraded.length > 0) {
      const recipientEmail = process.env.MONITORING_EMAIL;
      if (recipientEmail) {
        await sendUnhealthyServiceAlert(checks, recipientEmail);
        console.log('[CRON] Sent alert email for unhealthy services');
      }
    } else {
      console.log('[CRON] All services healthy, no alert sent');
    }

    return NextResponse.json({
      status: 'completed',
      timestamp: new Date().toISOString(),
      totalChecks: checks.length,
      healthy: checks.filter((c) => c.status === 'healthy').length,
      degraded: degraded.length,
      unhealthy: unhealthy.length,
      checks: checks,
    });
  } catch (error) {
    console.error('[CRON] Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
