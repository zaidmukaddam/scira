import { NextResponse } from 'next/server';
import { runAllHealthChecks } from '@/lib/monitoring/health-checks';

export async function GET(request: Request) {
  try {
    // Check if monitoring is enabled
    if (process.env.MONITORING_ENABLED !== 'true') {
      return NextResponse.json(
        {
          status: 'disabled',
          message: 'Monitoring is disabled',
        },
        { status: 503 },
      );
    }

    // Run all health checks
    const checks = await runAllHealthChecks();
    const overallHealth = checks.every((c) => c.status === 'healthy');

    return NextResponse.json(
      {
        status: overallHealth ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        region: 'Global',
        checks: checks,
      },
      {
        status: overallHealth ? 200 : 503,
      },
    );
  } catch (error) {
    console.error('Health check failed:', error);
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
