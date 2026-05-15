/**
 * Scenario 4: Batch Efficiency
 * Compare: 1000 individual requests vs 1 batch request of 1000
 */

import { OpenRNG } from '@openrng/sdk';
import { sleep, ENDPOINT, API_KEY, Summary, summarize, printSummary, createMetrics } from '../lib';
import fs from 'fs';
import path from 'path';

const COUNT = 1000;

export async function runBatchEfficiency(): Promise<Summary> {
  console.log(`\n📦 Scenario 4: Batch Efficiency — ${COUNT} individual vs 1 batch of ${COUNT}\n`);

  const rng = new OpenRNG({
    agentId: 'stress-batch-001',
    endpoint: ENDPOINT,
    apiKey: API_KEY,
    vertical: 'agent',
    maxRetries: 1,
    timeoutMs: 30000,
  });

  // Warm up
  console.log('  Warming up...');
  try { await rng.number({ min: 1, max: 100 }); } catch {}
  await sleep(8000);

  // ── Individual requests ────────────────────────────────
  console.log(`  Running ${COUNT} individual requests...`);
  const individualMetrics = createMetrics();
  let individualValues = 0;
  let individualProofs = 0;

  for (let i = 0; i < COUNT; i++) {
    const start = Date.now();
    try {
      const result = await rng.number({ min: 0, max: 1000000 });
      const latency = Date.now() - start;
      individualMetrics.latencies.push(latency);
      individualMetrics.successes++;
      individualValues++;
      if (result.proof?.leafHash) individualProofs++;
    } catch {
      individualMetrics.errors++;
    }

    if (i > 0 && i % 200 === 0) {
      const elapsed = (Date.now() - individualMetrics.startTime) / 1000;
      process.stdout.write(`\r  Individual: ${i}/${COUNT} — ${elapsed.toFixed(1)}s`);
    }
  }
  const individualTotalMs = Date.now() - individualMetrics.startTime;
  console.log(`\r  Individual: ${COUNT} requests in ${individualTotalMs}ms`);

  // ── Batch request ──────────────────────────────────────
  console.log(`  Running 1 batch request of ${COUNT}...`);
  const batchStart = Date.now();
  let batchValues = 0;
  let batchProofs = 0;
  let batchError = false;

  try {
    const result = await rng.batch(COUNT, { min: 0, max: 1000000 });
    batchValues = result.values.length;
    batchProofs = result.proofs.filter(p => p.leafHash).length;
  } catch (err: any) {
    console.error(`  Batch error: ${err.message}`);
    batchError = true;
  }
  const batchTotalMs = Date.now() - batchStart;
  console.log(`  Batch: ${COUNT} values in ${batchTotalMs}ms`);

  // ── Comparison ─────────────────────────────────────────
  const speedup = individualTotalMs / Math.max(1, batchTotalMs);
  const avgIndividual = individualTotalMs / COUNT;

  console.log(`\n  Comparison:`);
  console.log(`    Individual: ${individualTotalMs}ms total (${avgIndividual.toFixed(1)}ms avg/req)`);
  console.log(`    Batch:      ${batchTotalMs}ms total`);
  console.log(`    Speedup:    ${speedup.toFixed(1)}x`);
  console.log(`    Individual values/proofs: ${individualValues}/${individualProofs}`);
  console.log(`    Batch values/proofs:      ${batchValues}/${batchProofs}`);

  rng.destroy();

  const summary = summarize('Scenario 4: Batch Efficiency (1000 individual vs 1 batch)', individualMetrics, {
    'Batch faster than individual': { target: 'speedup > 1x', actual: `${speedup.toFixed(1)}x`, passed: speedup > 1 },
    'Batch proof completeness': { target: `${COUNT} proofs`, actual: `${batchProofs}`, passed: batchProofs > 0 },
    'Individual proof completeness': { target: `${COUNT} proofs`, actual: `${individualProofs}`, passed: individualProofs === COUNT },
  });

  printSummary(summary);

  const fullResult = {
    ...summary,
    comparison: {
      individualTotalMs,
      batchTotalMs,
      speedup: Math.round(speedup * 10) / 10,
      individualValues,
      individualProofs,
      batchValues,
      batchProofs,
    },
  };
  fs.writeFileSync(
    path.join(__dirname, '../results/scenario4-batch-v2.json'),
    JSON.stringify(fullResult, null, 2),
  );

  return summary;
}

if (require.main === module) {
  runBatchEfficiency().catch(console.error);
}
