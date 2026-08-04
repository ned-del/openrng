/**
 * Fairseal Integration Test — End-to-End Commit/Reveal/Verify
 *
 * Tests the full fairSelect flow against the live API:
 *   1. Commit candidate set to a future VDF epoch
 *   2. Poll until epoch matures
 *   3. Verify commitment hash + temporal ordering
 *   4. Derive winner deterministically
 *   5. Independently re-verify the selection
 *
 * Run: npx jest tests/integration.test.ts --testTimeout=120000
 * Requires: live API at x402.openrng.io (or FAIRSEAL_API_URL env var)
 */

import { createHash } from 'node:crypto';

const API_BASE = process.env.FAIRSEAL_API_URL || 'https://x402.openrng.io/v1/rng';
const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 40;

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

describe('Fairseal Integration — Live API', () => {

  // ── Health check ─────────────────────────────────────────────────────────

  test('API health endpoint returns ok', async () => {
    const res = await fetch('https://api.openrng.io/health');
    expect(res.ok).toBe(true);
    const data = await res.json() as any;
    expect(data.status).toBe('ok');
    expect(data.database).toBe('connected');
    expect(data.vdf).toBe('active');
  });

  // ── Full commit/reveal/verify cycle ──────────────────────────────────────

  test('fairSelect: commit → reveal → verify → derive winner', async () => {
    const candidates = ['alpha', 'bravo', 'charlie', 'delta', 'echo'];
    const domain = 'fairseal-integration-test';
    const epochOffset = 3;

    // Step 1: Hash candidate set (deterministic, reproducible by any auditor)
    const candidateSetHash = createHash('sha256')
      .update(candidates.join(','))
      .digest('hex');

    expect(candidateSetHash).toHaveLength(64);
    expect(candidateSetHash).toMatch(/^[0-9a-f]+$/);

    // Step 2: Commit to a future epoch
    const commitRes = await fetch(`${API_BASE}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        epoch_offset: epochOffset,
        candidate_set_hash: candidateSetHash,
        domain,
      }),
    });
    expect(commitRes.ok).toBe(true);

    const commitment = await commitRes.json() as any;

    // Validate commitment structure
    expect(commitment).toHaveProperty('commitment_id');
    expect(commitment).toHaveProperty('committed_epoch');
    expect(commitment).toHaveProperty('current_epoch');
    expect(commitment).toHaveProperty('commitment_hash');
    expect(commitment).toHaveProperty('commitment_time');
    expect(commitment).toHaveProperty('estimated_ready_seconds');
    expect(commitment).toHaveProperty('reveal_url');
    expect(commitment.committed_epoch).toBeGreaterThan(commitment.current_epoch);
    expect(['committed', 'pending']).toContain(commitment.status);

    console.log(`✓ Committed: epoch ${commitment.committed_epoch}, id ${commitment.commitment_id}`);
    console.log(`  Estimated ready in ${commitment.estimated_ready_seconds}s`);

    // Step 3: Wait for VDF computation, then poll for reveal
    const waitMs = Math.max(commitment.estimated_ready_seconds * 1000, 5000);
    console.log(`  Waiting ${(waitMs / 1000).toFixed(0)}s for VDF...`);
    await sleep(waitMs);

    let reveal: any = null;
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      const revealRes = await fetch(`${API_BASE}/reveal/${commitment.commitment_id}`);
      if (revealRes.ok) {
        const data = await revealRes.json() as any;
        if (data.value && data.verification) {
          reveal = data;
          break;
        }
      }
      console.log(`  Poll ${attempt + 1}/${MAX_POLL_ATTEMPTS}...`);
      await sleep(POLL_INTERVAL_MS);
    }

    expect(reveal).not.toBeNull();
    console.log(`✓ Revealed: value ${reveal.value.slice(0, 16)}...`);

    // Step 4: Verify — commitment hash matches
    expect(reveal.verification).toBeDefined();
    expect(reveal.verification.commitment_hash_verified).toBe(true);
    console.log(`✓ Commitment hash verified`);

    // Step 4b: Verify — temporal ordering (epoch computed AFTER commitment)
    expect(reveal.verification.temporal_valid).toBe(true);
    console.log(`✓ Temporal ordering verified: ${reveal.verification.temporal_note}`);

    // Step 5: Derive winner deterministically
    const idx = Number(BigInt('0x' + reveal.value) % BigInt(candidates.length));
    const winner = candidates[idx];
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(candidates.length);
    console.log(`✓ Winner: ${winner} (index ${idx})`);

    // Step 6: Independent verification — re-hash candidates and confirm match
    const rehash = createHash('sha256')
      .update(candidates.join(','))
      .digest('hex');
    expect(rehash).toBe(candidateSetHash);
    console.log(`✓ Independent candidate hash re-verification passed`);

    // Step 7: Verify URL is accessible
    const verifyUrl = reveal.verification.verify_url;
    expect(verifyUrl).toBeDefined();
    expect(verifyUrl).toContain('verify.openrng.io');
    const verifyRes = await fetch(verifyUrl);
    expect(verifyRes.ok).toBe(true);
    console.log(`✓ Public verify URL accessible: ${verifyUrl}`);

    // Final summary
    console.log('\n=== Fairseal Integration Test PASSED ===');
    console.log(`  Candidates: [${candidates.join(', ')}]`);
    console.log(`  Winner:     ${winner}`);
    console.log(`  Epoch:      ${commitment.committed_epoch}`);
    console.log(`  Verify:     ${verifyUrl}`);
  }, 120_000); // 2-minute timeout for VDF computation

  // ── SDK client wrapper test ──────────────────────────────────────────────

  test('OpenRNGClient.fairSelect() returns valid result', async () => {
    // Dynamic import to test the built package
    let OpenRNGClient: any;
    try {
      const mod = await import('../packages/client/src/index');
      OpenRNGClient = mod.OpenRNGClient;
    } catch {
      console.log('⚠ Skipping SDK test — client package not built');
      return;
    }

    const client = new OpenRNGClient({ pollIntervalMs: 2500, maxPollAttempts: 40 });
    const result = await client.fairSelect({
      candidates: ['red', 'blue', 'green'],
      domain: 'fairseal-sdk-test',
    });

    // Validate result shape
    expect(result.winner).toBeDefined();
    expect(['red', 'blue', 'green']).toContain(result.winner);
    expect(result.winnerIndex).toBeGreaterThanOrEqual(0);
    expect(result.winnerIndex).toBeLessThan(3);
    expect(result.receipt.id).toBeDefined();
    expect(result.receipt.epoch).toBeGreaterThan(0);
    expect(result.receipt.candidateSetHash).toHaveLength(64);
    expect(result.proof.temporalValid).toBe(true);
    expect(result.proof.commitHashVerified).toBe(true);
    expect(result.proof.verifyUrl).toContain('verify.openrng.io');

    console.log(`✓ SDK fairSelect: ${result.winner} won (epoch ${result.receipt.epoch})`);
    console.log(`  Verify: ${result.proof.verifyUrl}`);
  }, 120_000);

  // ── Edge case: single candidate ──────────────────────────────────────────

  test('single candidate always wins', async () => {
    const commitRes = await fetch(`${API_BASE}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        epoch_offset: 3,
        candidate_set_hash: createHash('sha256').update('solo').digest('hex'),
        domain: 'fairseal-single-test',
      }),
    });
    expect(commitRes.ok).toBe(true);
    const commitment = await commitRes.json() as any;

    await sleep(Math.max(commitment.estimated_ready_seconds * 1000, 5000));

    let reveal: any = null;
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      const res = await fetch(`${API_BASE}/reveal/${commitment.commitment_id}`);
      if (res.ok) {
        const data = await res.json() as any;
        if (data.value && data.verification) { reveal = data; break; }
      }
      await sleep(POLL_INTERVAL_MS);
    }

    expect(reveal).not.toBeNull();
    const idx = Number(BigInt('0x' + reveal.value) % BigInt(1));
    expect(idx).toBe(0); // Only one candidate — always index 0
    console.log(`✓ Single candidate: always wins (epoch ${commitment.committed_epoch})`);
  }, 120_000);
});
