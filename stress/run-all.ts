/**
 * OpenRNG Stress Test Runner — runs all 4 scenarios sequentially
 */

import { runSustained } from './scenarios/sustained';
import { runBurst } from './scenarios/burst';
import { runMultiClient } from './scenarios/multi-client';
import { runBatchEfficiency } from './scenarios/batch-efficiency';
import { Summary } from './lib';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log('║       OpenRNG Stress Test Suite v0.1.0        ║');
  console.log('╚═══════════════════════════════════════════════╝');
  console.log('');

  const results: Summary[] = [];

  try {
    // Scenario 1: Sustained load
    results.push(await runSustained());
  } catch (err: any) {
    console.error(`Scenario 1 failed: ${err.message}`);
  }

  try {
    // Scenario 2: Burst load
    results.push(await runBurst());
  } catch (err: any) {
    console.error(`Scenario 2 failed: ${err.message}`);
  }

  try {
    // Scenario 3: Multi-client
    results.push(await runMultiClient());
  } catch (err: any) {
    console.error(`Scenario 3 failed: ${err.message}`);
  }

  try {
    // Scenario 4: Batch efficiency
    results.push(await runBatchEfficiency());
  } catch (err: any) {
    console.error(`Scenario 4 failed: ${err.message}`);
  }

  // Final summary
  console.log('\n\n╔═══════════════════════════════════════════════╗');
  console.log('║            FINAL RESULTS SUMMARY              ║');
  console.log('╚═══════════════════════════════════════════════╝');

  let allPassed = true;
  for (const s of results) {
    console.log(`\n  ${s.scenario}:`);
    console.log(`    Throughput: ${s.reqPerSec} req/s | p99: ${s.p99Ms}ms | Errors: ${s.errorRate}`);
    for (const [key, t] of Object.entries(s.targets)) {
      const icon = t.passed ? '✅' : '❌';
      console.log(`    ${icon} ${key}: ${t.actual} (target: ${t.target})`);
      if (!t.passed) allPassed = false;
    }
  }

  console.log(`\n  Overall: ${allPassed ? '✅ ALL TARGETS MET' : '⚠️  SOME TARGETS MISSED'}\n`);

  // Save combined results
  fs.writeFileSync(
    path.join(__dirname, 'results/all-results-v2.json'),
    JSON.stringify(results, null, 2),
  );
  console.log('  Results saved to stress/results/ (v2)\n');
}

main().catch(console.error);
