export interface HealthCheckResult {
  service: string;
  category: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  error?: string;
  details?: any;
  message?: string;
  lastChecked?: Date;
}

// Main function that runs all checks
export async function runAllHealthChecks(includeFullSearchTests = false): Promise<HealthCheckResult[]> {
  console.log('[Health Checks] Starting comprehensive health checks...');

  // Basic health checks
  const checks = await Promise.all([checkDatabase(), checkWebApp(), checkSearchAPI(), checkMemoryUsage()]);

  console.log(`[Health Checks] Completed ${checks.length} checks`);
  return checks;
}

// Check Database Connection
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const { db } = await import('@/lib/db');
    const { user } = await import('@/lib/db/schema');

    // Run a simple query
    await db.select().from(user).limit(1);

    return {
      service: 'Database',
      category: 'Core',
      status: 'healthy',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      service: 'Database',
      category: 'Core',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Check Web Application
async function checkWebApp(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3000';
    const response = await fetch(appUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return {
      service: 'Web Application',
      category: 'Core',
      status: 'healthy',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      service: 'Web Application',
      category: 'Core',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Check Search API
async function checkSearchAPI(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${appUrl}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'test' }],
        model: 'llama-3.3',
        group: 'web',
      }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return {
      service: 'Search API',
      category: 'Core',
      status: 'healthy',
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      service: 'Search API',
      category: 'Core',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Check Memory Usage
async function checkMemoryUsage(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      const heapTotalMB = usage.heapTotal / 1024 / 1024;
      const rssMB = usage.rss / 1024 / 1024;

      // Warn if memory usage is high
      const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100;

      return {
        service: 'Memory Usage',
        category: 'System',
        status: memoryUsagePercent > 90 ? 'degraded' : 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          heapUsedMB: heapUsedMB.toFixed(2),
          heapTotalMB: heapTotalMB.toFixed(2),
          rssMB: rssMB.toFixed(2),
          memoryUsagePercent: memoryUsagePercent.toFixed(2),
        },
      };
    }

    return {
      service: 'Memory Usage',
      category: 'System',
      status: 'healthy',
      responseTime: Date.now() - startTime,
      details: { message: 'Memory usage not available' },
    };
  } catch (error) {
    return {
      service: 'Memory Usage',
      category: 'System',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
