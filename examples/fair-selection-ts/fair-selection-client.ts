/**
 * Same result as fair-selection.ts — but using the @openrng/client SDK wrapper.
 * All the commit/poll/verify/derive logic is handled for you.
 *
 * Run: npx tsx fair-selection-client.ts
 */

import { OpenRNGClient } from '../../packages/client/src/index.js';

const client = new OpenRNGClient();

const result = await client.fairSelect({
  candidates: ['alice', 'bob', 'charlie', 'diana', 'evan'],
  domain: 'grant-round-12',
  epochOffset: 3,
});

// Publish receipt BEFORE announcing winner for maximum auditability
console.log('🔗 Shareable receipt (publish this first!):', JSON.stringify(result.receipt, null, 2));

console.log(`\n🏆 Winner: ${result.winner} (index ${result.winnerIndex})`);
console.log(`✅ Verified: ${result.proof.note}`);
console.log(`🔍 Public proof: ${result.proof.verifyUrl}`);
