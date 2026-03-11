import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdminEmail } from '@/lib/auth-utils';
import { runAllHealthChecks } from '@/lib/monitoring/health-checks';

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const session = await getSession();
    if (!session?.user || !isAdminEmail(session.user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[SERVICE HEALTH] Starting health checks...');

    // Run all health checks
    const healthResults = await runAllHealthChecks(true);

    // Format response
    const services = healthResults.map((result) => ({
      name: result.service,
      status: result.status,
      message: result.message || result.error || 'OK',
      responseTime: result.responseTime,
      lastChecked: result.lastChecked || new Date(),
      details: result.details,
    }));

    // Calculate overall status
    const allHealthy = services.every((s) => s.status === 'healthy');
    const overallStatus = allHealthy ? 'healthy' : 'degraded';

    return NextResponse.json({
      overallStatus,
      timestamp: new Date().toISOString(),
      services,
      summary: {
        total: services.length,
        healthy: services.filter((s) => s.status === 'healthy').length,
        degraded: services.filter((s) => s.status === 'degraded').length,
        down: services.filter((s) => s.status === 'unhealthy').length,
      },
    });
  } catch (error) {
    console.error('[SERVICE HEALTH] Error:', error);
    return NextResponse.json({ error: 'Failed to check service health' }, { status: 500 });
  }
}
