/**
 * Scenario 3: Multi-Client
 * 50 concurrent "agents" each doing 20 req/sec = 1,000 total
 * Track per-client fairness
 */

import { OpenRNG } from '@openrng/sdk';
import { createMetrics, summarize, printSummary, sleep, ENDPOINT, API_KEY, MetricsCollector, Summary, percentile } from '../lib';
import fs from 'fs';
import path from 'path';

const NUM_CLIENTS = 50;
const RPS_PER_CLIENT = 20;
const DURATION_SEC = 30;

export async function runMultiClient(): Promise<Summary> {
  console.log(`\n👥 Scenario 3: Multi-Client — ${NUM_CLIENTS} agents × ${RPS_PER_CLIENT} req/s = ${NUM_CLIENTS * RPS_PER_CLIENT} total\n`);

  // Create clients
  const clients: { rng: OpenRNG; metrics: MetricsCollector; id: string }[] = [];
  for (let i = 0; i < NUM_CLIENTS; i++) {
    const id = `stress-agent-${String(i).padStart(3, '0')}`;
    clients.push({
      id,
      rng: new OpenRNG({
        agentId: id,
        endpoint: ENDPOINT,
        apiKey: API_KEY,
        vertical: 'agent',
        maxRetries: 1,
        timeoutMs: 5000,
      }),
      metrics: createMetrics(),
    });
  }

  // Warm up first few to trigger auto-registration
  console.log('  Warming up clients...');
  for (const c of clients.slice(0, 5)) {
    try { await c.rng.number({ min: 1, max: 100 }); } catch {}
  }
  await sleep(8000);

  const globalMetrics = createMetrics();
  const endTime = Date.now() + DURATION_SEC * 1000;
  const intervalMs = 1000 / RPS_PER_CLIENT;

  async function clientWorker(client: typeof clients[0]) {
    while (Date.now() < endTime) {
      const start = Date.now();
      try {
        await client.rng.number({ min: 1, max: 1000000 });
        const latency = Date.now() - start;
        client.metrics.latencies.push(latency);
        client.metrics.successes++;
        globalMetrics.latencies.push(latency);
        globalMetrics.successes++;
      } catch (err: any) {
        client.metrics.errors++;
        globalMetrics.errors++;
        if (err.code === 'POOL_EXHAUSTED') {
          client.metrics.poolExhausted++;
          globalMetrics.poolExhausted++;
        }
      }

      const elapsed = Date.now() - start;
      const wait = Math.max(0, intervalMs - elapsed);
      if (wait > 0) await sleep(wait);
    }
  }

  const progressInterval = setInterval(() => {
    const elapsed = (Date.now() - globalMetrics.startTime) / 1000;
    const rps = Math.round(globalMetrics.successes / elapsed);
    process.stdout.write(`\r  Progress: ${Math.round(elapsed)}s — ${globalMetrics.successes} req — ${rps} req/s — ${globalMetrics.errors} errors`);
  }, 2000);

  const workers = clients.map(c => clientWorker(c));
  await Promise.all(workers);
  clearInterval(progressInterval);
  console.log('');

  // Fairness analysis
  const perClientCounts = clients.map(c => c.metrics.successes);
  const avgPerClient = perClientCounts.reduce((a, b) => a + b, 0) / NUM_CLIENTS;
  const minCount = perClientCounts.reduce((a, b) => a < b ? a : b, Infinity);
  const maxCount = perClientCounts.reduce((a, b) => a > b ? a : b, 0);
  const fairnessRatio = minCount / maxCount;

  console.log(`\n  Fairness analysis:`);
  console.log(`    Avg per client:     ${Math.round(avgPerClient)}`);
  console.log(`    Min tokens:         ${minCount}`);
  console.log(`    Max tokens:         ${maxCount}`);
  console.log(`    Fairness ratio:     ${fairnessRatio.toFixed(3)} (min/max, 1.0 = perfect)`);

  // Cleanup
  clients.forEach(c => c.rng.destroy());

  const errorRate = globalMetrics.errors / (globalMetrics.successes + globalMetrics.errors);
  const p99 = percentile(globalMetrics.latencies, 99);

  const summary = summarize('Scenario 3: Multi-Client (50 agents × 20 req/s)', globalMetrics, {
    'p99 < 50ms': { target: '<50ms', actual: `${p99}ms`, passed: p99 < 50 },
    'Error rate < 0.1%': { target: '<0.1%', actual: `${(errorRate * 100).toFixed(3)}%`, passed: errorRate < 0.001 },
    'Fairness > 0.5': { target: '>0.5', actual: fairnessRatio.toFixed(3), passed: fairnessRatio > 0.5 },
  });

  printSummary(summary);

  const fullResult = { ...summary, fairness: { avgPerClient: Math.round(avgPerClient), minCount, maxCount, fairnessRatio } };
  fs.writeFileSync(
    path.join(__dirname, '../results/scenario3-multi-client-v2.json'),
    JSON.stringify(fullResult, null, 2),
  );

  return summary;
}

if (require.main === module) {
  runMultiClient().catch(console.error);
}
