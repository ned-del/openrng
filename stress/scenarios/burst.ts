/**
 * Scenario 2: Burst Load
 * Ramp from 0 → 5,000 req/sec over 10 seconds
 * Hold at 5,000 for 30 seconds
 */

import { OpenRNG } from '@openrng/sdk';
import { createMetrics, summarize, printSummary, sleep, ENDPOINT, API_KEY, Summary } from '../lib';
import fs from 'fs';
import path from 'path';

const PEAK_RPS = 5000;
const RAMP_SEC = 10;
const HOLD_SEC = 30;
const CONCURRENCY = 100;

export async function runBurst(): Promise<Summary> {
  console.log(`\n🚀 Scenario 2: Burst Load — ramp to ${PEAK_RPS} req/s, hold ${HOLD_SEC}s\n`);

  const rng = new OpenRNG({
    agentId: 'stress-burst-001',
    endpoint: ENDPOINT,
    apiKey: API_KEY,
    vertical: 'agent',
    maxRetries: 1,
    timeoutMs: 5000,
  });

  // Warm up
  console.log('  Warming up pool...');
  try { await rng.number({ min: 1, max: 100 }); } catch {}
  await sleep(8000);

  const metrics = createMetrics();
  const totalDuration = (RAMP_SEC + HOLD_SEC) * 1000;
  const endTime = Date.now() + totalDuration;
  let lastReport = Date.now();

  function getCurrentTargetRPS(): number {
    const elapsed = (Date.now() - metrics.startTime) / 1000;
    if (elapsed < RAMP_SEC) {
      return Math.floor((elapsed / RAMP_SEC) * PEAK_RPS);
    }
    return PEAK_RPS;
  }

  async function worker() {
    while (Date.now() < endTime) {
      const currentRPS = getCurrentTargetRPS();
      const intervalMs = currentRPS > 0 ? 1000 / (currentRPS / CONCURRENCY) : 100;

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

      const elapsed = Date.now() - start;
      const wait = Math.max(0, intervalMs - elapsed);
      if (wait > 0) await sleep(wait);
    }
  }

  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - metrics.startTime) / 1000;
    const rps = Math.round(metrics.successes / elapsed);
    const targetRps = getCurrentTargetRPS();
    process.stdout.write(`\r  Progress: ${Math.round(elapsed)}s — ${metrics.successes} req — ${rps} actual/${targetRps} target req/s — ${metrics.errors} errors`);
  }, 2000);

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  clearInterval(progressInterval);
  console.log('');

  rng.destroy();

  const errorRate = metrics.errors / (metrics.successes + metrics.errors);
  const p99 = metrics.latencies.length > 0 ?
    [...metrics.latencies].sort((a, b) => a - b)[Math.ceil(metrics.latencies.length * 0.99) - 1] : 0;

  const summary = summarize('Scenario 2: Burst Load (0→5K req/s, hold 30s)', metrics, {
    'p99 < 50ms': { target: '<50ms', actual: `${p99}ms`, passed: p99 < 50 },
    'Error rate < 0.1%': { target: '<0.1%', actual: `${(errorRate * 100).toFixed(3)}%`, passed: errorRate < 0.001 },
  });

  printSummary(summary);

  fs.writeFileSync(
    path.join(__dirname, '../results/scenario2-burst-v2.json'),
    JSON.stringify(summary, null, 2),
  );

  return summary;
}

if (require.main === module) {
  runBurst().catch(console.error);
}
