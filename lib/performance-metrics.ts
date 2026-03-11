// Performance metrics tracking for search API
interface PerformanceMetric {
  phase: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export class PerformanceTracker {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private requestId: string;
  private requestStartTime: number;

  constructor(requestId: string) {
    this.requestId = requestId;
    this.requestStartTime = Date.now();
  }

  startPhase(phase: string, metadata?: Record<string, any>) {
    this.metrics.set(phase, {
      phase,
      startTime: Date.now(),
      metadata,
    });
  }

  endPhase(phase: string, additionalMetadata?: Record<string, any>) {
    const metric = this.metrics.get(phase);
    if (!metric) {
      console.warn(`[PERF] Phase ${phase} was not started`);
      return;
    }

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;
    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }
  }

  getPhaseTime(phase: string): number {
    const metric = this.metrics.get(phase);
    return metric?.duration || 0;
  }

  getTotalTime(): number {
    return Date.now() - this.requestStartTime;
  }

  logSummary() {
    const totalTime = this.getTotalTime();
    console.log(`\n📊 [PERF] Request ${this.requestId} Performance Summary:`);
    console.log(`Total time: ${totalTime}ms`);

    // Sort phases by start time
    const sortedMetrics = Array.from(this.metrics.values()).sort((a, b) => a.startTime - b.startTime);

    // Log each phase
    for (const metric of sortedMetrics) {
      if (metric.duration) {
        const percentage = ((metric.duration / totalTime) * 100).toFixed(1);
        console.log(`  - ${metric.phase}: ${metric.duration}ms (${percentage}%)`);
        if (metric.metadata) {
          Object.entries(metric.metadata).forEach(([key, value]) => {
            console.log(`    • ${key}: ${value}`);
          });
        }
      }
    }

    // Calculate setup vs execution time
    const setupPhases = ['auth_check', 'location_lookup', 'config_load', 'tool_loading'];
    const setupTime = setupPhases.reduce((sum, phase) => sum + this.getPhaseTime(phase), 0);
    const executionTime = totalTime - setupTime;

    console.log(`\n  Setup: ${setupTime}ms (${((setupTime / totalTime) * 100).toFixed(1)}%)`);
    console.log(`  Execution: ${executionTime}ms (${((executionTime / totalTime) * 100).toFixed(1)}%)`);
  }

  // Get metrics for monitoring/analytics
  getMetrics() {
    return {
      requestId: this.requestId,
      totalTime: this.getTotalTime(),
      phases: Object.fromEntries(
        Array.from(this.metrics.entries()).map(([key, value]) => [
          key,
          {
            duration: value.duration || 0,
            metadata: value.metadata,
          },
        ]),
      ),
    };
  }
}

// Global performance stats aggregator
class PerformanceStatsAggregator {
  private stats: Map<string, number[]> = new Map();
  private readonly maxSamples = 100;

  recordPhase(phase: string, duration: number) {
    if (!this.stats.has(phase)) {
      this.stats.set(phase, []);
    }

    const samples = this.stats.get(phase)!;
    samples.push(duration);

    // Keep only the last N samples
    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }

  getStats(phase: string) {
    const samples = this.stats.get(phase) || [];
    if (samples.length === 0) return null;

    const sorted = [...samples].sort((a, b) => a - b);
    const sum = samples.reduce((a, b) => a + b, 0);

    return {
      count: samples.length,
      avg: Math.round(sum / samples.length),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p50: sorted[Math.floor(samples.length * 0.5)],
      p95: sorted[Math.floor(samples.length * 0.95)],
      p99: sorted[Math.floor(samples.length * 0.99)],
    };
  }

  logAggregateStats() {
    console.log('\n📈 Aggregate Performance Stats (last 100 requests):');
    for (const [phase, samples] of this.stats.entries()) {
      const stats = this.getStats(phase);
      if (stats) {
        console.log(`  ${phase}:`);
        console.log(`    Avg: ${stats.avg}ms, P50: ${stats.p50}ms, P95: ${stats.p95}ms, P99: ${stats.p99}ms`);
      }
    }
  }
}

export const globalPerfStats = new PerformanceStatsAggregator();
