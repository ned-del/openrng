/**
 * Provably Fair Selection in ~30 Lines
 * Using OpenRNG commit/reveal — prove the winner wasn't chosen after the fact.
 *
 * Run: npx tsx fair-selection.ts
 */

import { createHash } from 'node:crypto';

const BASE_URL  = 'https://x402.openrng.io/v1/rng';
const candidates = ['alice', 'bob', 'charlie', 'diana', 'evan'];
const domain     = 'grant-round-12';

// ── Step 1: Hash the candidate set (commit to it before seeing any randomness) ──
const candidateSetHash = createHash('sha256').update(candidates.join(',')).digest('hex');

// ── Step 2: Commit to a future epoch ──
const commitRes  = await fetch(`${BASE_URL}/commit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ epoch_offset: 3, candidate_set_hash: candidateSetHash, domain }),
});
const commitment = await commitRes.json() as any;
console.log('📋 Commitment receipt:', { id: commitment.commitment_id, epoch: commitment.committed_epoch });

// ── Step 3: Share this receipt publicly BEFORE randomness is revealed ──
// Anyone holding this can later verify the candidates were locked at commit time.
console.log('🔗 Shareable proof-of-commit:', JSON.stringify({ id: commitment.commitment_id, candidateSetHash, domain }));

// ── Step 4: Wait for epoch maturity (VDF runs sequentially — nobody could preview it) ──
console.log(`⏳ Waiting ~${commitment.estimated_ready_seconds}s for epoch ${commitment.committed_epoch}…`);
await new Promise(r => setTimeout(r, (commitment.estimated_ready_seconds + 2) * 1000));

// ── Step 5: Reveal and verify locally ──
const revealRes = await fetch(`${BASE_URL}/reveal/${commitment.commitment_id}`);
const reveal    = await revealRes.json() as any;

const ok = reveal.verification.commitment_hash_verified && reveal.verification.temporal_valid;
if (!ok) throw new Error('Verification failed — this result is invalid, reject it.');
console.log('✅ Verified:', reveal.verification.temporal_note);

// ── Step 6: Derive winner from verified randomness ──
const idx    = Number(BigInt('0x' + reveal.value) % BigInt(candidates.length));
const winner = candidates[idx];
console.log(`🏆 Winner: ${winner} (index ${idx} of ${candidates.length})`);
console.log(`🔍 Anyone can verify independently: ${reveal.verification.verify_url}`);
