import { createCommitment } from './src/commitment';
import { resolveCommitment, createReceipt } from './src/resolve';
import { verifyReceipt } from './src/verify';
import { DrandBeaconSource } from './src/beacon';

async function bench() {
  console.log('🦭 Fairseal Performance Benchmark\n');

  // ── 1. Commitment Creation (pure local crypto) ──
  const runs = 1000;
  const start1 = performance.now();
  for (let i = 0; i < runs; i++) {
    createCommitment({
      rule: JSON.stringify({ type: 'weighted', table: 'celestial-v3', rates: { SSR: 0.006, SR: 0.051, R: 0.200, N: 0.743 } }),
      inputs: ['player_' + i, 'session_abc', 'pull_' + i],
      revealAfter: 10,
    });
  }
  const elapsed1 = performance.now() - start1;
  console.log(`Commitment creation (${runs} runs):`);
  console.log(`  Total: ${elapsed1.toFixed(1)}ms`);
  console.log(`  Per commit: ${(elapsed1 / runs).toFixed(3)}ms`);
  console.log(`  Throughput: ${Math.floor(runs / (elapsed1 / 1000))}/sec\n`);

  // ── 2. Beacon Fetch (network round-trip to drand) ──
  const beacon = new DrandBeaconSource();
  const now = Math.floor(Date.now() / 1000);
  const currentRound = beacon.getRound(now);

  const fetchRuns = 5;
  const times: number[] = [];
  for (let i = 0; i < fetchRuns; i++) {
    const s = performance.now();
    await beacon.fetchBeacon(currentRound - i);
    times.push(performance.now() - s);
  }
  console.log(`Beacon fetch (${fetchRuns} runs, live drand):`);
  console.log(`  Times: ${times.map(t => t.toFixed(0) + 'ms').join(', ')}`);
  console.log(`  Avg: ${(times.reduce((a, b) => a + b) / times.length).toFixed(0)}ms`);
  console.log(`  Min: ${Math.min(...times).toFixed(0)}ms\n`);

  // ── 3. Full Round-Trip (commit → wait → resolve) ──
  console.log('Full round-trip (commit → beacon → resolve):');
  const c = createCommitment({
    rule: JSON.stringify({ type: 'uniform', pick: 1 }),
    inputs: ['a', 'b', 'c', 'd', 'e'],
    revealAfter: 6,
  });
  const roundTime = beacon.getRoundTime(c.targetRound);
  const waitSec = Math.max(roundTime - Math.floor(Date.now() / 1000) + 1, 3);
  console.log(`  Commit: <1ms`);
  console.log(`  Wait for beacon: ${waitSec}s (drand round interval)`);

  await new Promise(r => setTimeout(r, waitSec * 1000));

  const s3 = performance.now();
  const resolution = await resolveCommitment(c);
  const resolveTime = performance.now() - s3;
  console.log(`  Resolve (fetch + derive): ${resolveTime.toFixed(0)}ms`);

  // ── 4. Receipt Creation ──
  const s4 = performance.now();
  const receipt = createReceipt(c, resolution);
  const receiptTime = performance.now() - s4;
  console.log(`  Receipt creation: ${receiptTime.toFixed(3)}ms`);

  // ── 5. Verification (with BLS) ──
  const s5 = performance.now();
  const result = await verifyReceipt(receipt);
  const verifyTime = performance.now() - s5;
  console.log(`  Verification (BLS): ${verifyTime.toFixed(0)}ms`);
  console.log(`  Status: ${result.status}\n`);

  // ── 6. Receipt Size ──
  const receiptJson = JSON.stringify(receipt);
  console.log(`Receipt size: ${receiptJson.length} bytes (${(receiptJson.length / 1024).toFixed(1)} KB)\n`);

  // ── Summary ──
  console.log('═══ PERFORMANCE SUMMARY ═══');
  console.log(`Commit:        ${(elapsed1 / runs).toFixed(3)}ms  (${Math.floor(runs / (elapsed1 / 1000))}/sec)`);
  console.log(`Beacon fetch:  ${(times.reduce((a, b) => a + b) / times.length).toFixed(0)}ms avg`);
  console.log(`Resolve:       ${resolveTime.toFixed(0)}ms`);
  console.log(`Verify (BLS):  ${verifyTime.toFixed(0)}ms`);
  console.log(`Receipt size:  ${(receiptJson.length / 1024).toFixed(1)} KB`);
  console.log(`Min wait:      3s (drand quicknet round interval)`);
}

bench().catch(e => { console.error(e); process.exit(1); });
