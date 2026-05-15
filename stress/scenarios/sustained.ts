/**
 * Scenario 1: Sustained Load
 * 1,000 requests/second for 60 seconds
 * Single client, sequential token requests
 */

import { OpenRNG } from '@openrng/sdk';
import { createMetrics, summarize, printSummary, sleep, ENDPOINT, API_KEY, Summary } from '../lib';
import fs from 'fs';
import path from 'path';

const TARGET_RPS = 1000;
const DURATION_SEC = 60;
const CONCURRENCY = 200; // high concurrency to saturate I/O and achieve target RPS

export async function runSustained(): Promise<Summary> {
  console.log(`\n🏃 Scenario 1: Sustained Load — ${TARGET_RPS} req/s for ${DURATION_SEC}s\n`);

  const rng = new OpenRNG({
    agentId: 'stress-sustained-001',
    endpoint: ENDPOINT,
    apiKey: API_KEY,
    vertical: 'agent',
    maxRetries: 1,
    timeoutMs: 5000,
  });

  // Warm up — let the pool fill
  console.log('  Warming up pool...');
  try { await rng.number({ min: 1, max: 100 }); } catch {}
  await sleep(8000);

  const metrics = createMetrics();
  const endTime = Date.now() + DURATION_SEC * 1000;
  const intervalMs = 1000 / (TARGET_RPS / CONCURRENCY);
  let lastReport = Date.now();

  async function worker() {
    while (Date.now() < endTime) {
      const start = Date.now();
      try {
        const result = await rng.number({ min: 1, max: 1000000 });
        const latency = Date.now() - start;
        metrics.latencies.push(latency);
        metrics.successes++;
        if (result.value === undefined) metrics.poolExhausted++;
      } catch (err: any) {
        metrics.errors++;
        if (err.code === 'POOL_EXHAUSTED') metrics.poolExhausted++;
      }

      // Pace to target RPS
      const elapsed = Date.now() - start;
      const wait = Math.max(0, intervalMs - elapsed);
      if (wait > 0) await sleep(wait);
    }
  }

  // Progress reporter
  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - metrics.startTime) / 1000;
    const rps = Math.round(metrics.successes / elapsed);
    process.stdout.write(`\r  Progress: ${Math.round(elapsed)}s — ${metrics.successes} req — ${rps} req/s — ${metrics.errors} errors`);
  }, 2000);

  // Launch workers
  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  clearInterval(progressInterval);
  console.log('');

  rng.destroy();

  const errorRate = metrics.errors / (metrics.successes + metrics.errors);
  const p99 = metrics.latencies.length > 0 ?
    [...metrics.latencies].sort((a, b) => a - b)[Math.ceil(metrics.latencies.length * 0.99) - 1] : 0;

  const summary = summarize('Scenario 1: Sustained Load (1K req/s × 60s)', metrics, {
    'p99 < 10ms': { target: '<10ms', actual: `${p99}ms`, passed: p99 < 10 },
    'Error rate < 0.1%': { target: '<0.1%', actual: `${(errorRate * 100).toFixed(3)}%`, passed: errorRate < 0.001 },
    'Zero pool exhaustions': { target: '0', actual: `${metrics.poolExhausted}`, passed: metrics.poolExhausted === 0 },
  });

  printSummary(summary);

  fs.writeFileSync(
    path.join(__dirname, '../results/scenario1-sustained-v2.json'),
    JSON.stringify(summary, null, 2),
  );

  return summary;
}

if (require.main === module) {
  runSustained().catch(console.error);
}
