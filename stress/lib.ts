/**
 * Shared utilities for stress tests
 */

export interface MetricsCollector {
  latencies: number[];
  errors: number;
  successes: number;
  poolExhausted: number;
  startTime: number;
}

export function createMetrics(): MetricsCollector {
  return {
    latencies: [],
    errors: 0,
    successes: 0,
    poolExhausted: 0,
    startTime: Date.now(),
  };
}

export function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * p / 100) - 1;
  return sorted[Math.max(0, idx)];
}

export interface Summary {
  scenario: string;
  totalRequests: number;
  successes: number;
  errors: number;
  errorRate: string;
  poolExhausted: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  avgMs: number;
  maxMs: number;
  durationSec: number;
  reqPerSec: number;
  targets: Record<string, { target: string; actual: string; passed: boolean }>;
}

export function summarize(name: string, m: MetricsCollector, targets?: Record<string, { target: string; actual: string; passed: boolean }>): Summary {
  const duration = (Date.now() - m.startTime) / 1000;
  const avg = m.latencies.length > 0 ? m.latencies.reduce((a, b) => a + b, 0) / m.latencies.length : 0;
  return {
    scenario: name,
    totalRequests: m.successes + m.errors,
    successes: m.successes,
    errors: m.errors,
    errorRate: ((m.errors / (m.successes + m.errors)) * 100).toFixed(3) + '%',
    poolExhausted: m.poolExhausted,
    p50Ms: percentile(m.latencies, 50),
    p95Ms: percentile(m.latencies, 95),
    p99Ms: percentile(m.latencies, 99),
    avgMs: Math.round(avg * 100) / 100,
    maxMs: m.latencies.length > 0 ? m.latencies.reduce((a, b) => a > b ? a : b, 0) : 0,
    durationSec: Math.round(duration * 10) / 10,
    reqPerSec: Math.round(m.successes / duration),
    targets: targets || {},
  };
}

export function printSummary(s: Summary): void {
  console.log('');
  console.log(`═══════════════════════════════════════════════`);
  console.log(`  ${s.scenario}`);
  console.log(`═══════════════════════════════════════════════`);
  console.log(`  Total requests:    ${s.totalRequests}`);
  console.log(`  Successes:         ${s.successes}`);
  console.log(`  Errors:            ${s.errors} (${s.errorRate})`);
  console.log(`  Pool exhaustions:  ${s.poolExhausted}`);
  console.log(`  Duration:          ${s.durationSec}s`);
  console.log(`  Throughput:        ${s.reqPerSec} req/s`);
  console.log(`  Latency p50:       ${s.p50Ms}ms`);
  console.log(`  Latency p95:       ${s.p95Ms}ms`);
  console.log(`  Latency p99:       ${s.p99Ms}ms`);
  console.log(`  Latency avg:       ${s.avgMs}ms`);
  console.log(`  Latency max:       ${s.maxMs}ms`);
  console.log('');
  if (Object.keys(s.targets).length > 0) {
    console.log('  Targets:');
    for (const [key, t] of Object.entries(s.targets)) {
      const icon = t.passed ? '✅' : '❌';
      console.log(`    ${icon} ${key}: ${t.actual} (target: ${t.target})`);
    }
  }
  console.log('═══════════════════════════════════════════════');
}

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export const ENDPOINT = process.env.OPENRNG_ENDPOINT || 'http://localhost:3000';
export const API_KEY = process.env.OPENRNG_API_KEY || 'test-secret-key-32chars-minimum!!';
