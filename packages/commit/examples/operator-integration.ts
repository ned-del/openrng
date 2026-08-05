#!/usr/bin/env npx tsx
/**
 * 🎮 Operator Integration Example
 * 
 * Shows how a game operator integrates Fairseal with their OWN
 * weighted loot table algorithm. Fairseal doesn't touch your game logic —
 * it proves your commitment was made before the outcome.
 * 
 * Usage: npx tsx operator-integration.ts
 */

import { createCommitment, resolveCommitment, createReceipt, verifyReceipt } from '../src/index';

// ═══════════════════════════════════════════════════════════
// YOUR GAME LOGIC — Fairseal doesn't touch any of this
// ═══════════════════════════════════════════════════════════

/** Your published loot table (mandated by law in CN/TW/JP, Apple/Google policy) */
const LOOT_TABLE = {
  version: 'celestial-banner-v3.2',
  rates: [
    { rarity: 'SSR', rate: 0.006, items: ['Dragon_Blade'] },
    { rarity: 'SR',  rate: 0.051, items: ['Phoenix_Staff', 'Thunder_Bow'] },
    { rarity: 'R',   rate: 0.200, items: ['Iron_Shield', 'Wind_Cloak'] },
    { rarity: 'N',   rate: 0.743, items: ['Wooden_Sword', 'Leather_Armor'] },
  ],
};

/** Your weighted selection algorithm — deterministic given entropy */
function weightedPull(table: typeof LOOT_TABLE, entropyHex: string): { rarity: string; item: string } {
  // Convert entropy to a number between 0 and 1
  const entropy = BigInt('0x' + entropyHex);
  const roll = Number(entropy % 1000000n) / 1000000;

  // Walk the probability ranges
  let cumulative = 0;
  for (const tier of table.rates) {
    cumulative += tier.rate;
    if (roll < cumulative) {
      // Pick item within tier (also deterministic)
      const itemIndex = Number(entropy / 1000000n % BigInt(tier.items.length));
      return { rarity: tier.rarity, item: tier.items[itemIndex] };
    }
  }

  // Fallback (should never happen if rates sum to 1.0)
  const last = table.rates[table.rates.length - 1];
  return { rarity: last.rarity, item: last.items[0] };
}

// ═══════════════════════════════════════════════════════════
// FAIRSEAL INTEGRATION — 4 lines in your game server
// ═══════════════════════════════════════════════════════════

async function handleGachaPull(playerId: string, pullNumber: number) {
  // ── 1. Commit (before the pull) ────────────────────────────
  const commitment = createCommitment({
    rule: JSON.stringify(LOOT_TABLE),  // your entire table, hashed & locked
    inputs: [playerId, pullNumber.toString(), Date.now().toString()],
    revealAfter: 6,                    // 6 seconds (2 drand rounds)
  });

  console.log(`  Committed: ${commitment.commitHash.slice(0, 20)}...`);
  console.log(`  Waiting for drand round ${commitment.targetRound}...`);

  // ── 2. Wait for beacon ─────────────────────────────────────
  const { DrandBeaconSource } = await import('../src/beacon');
  const beacon = new DrandBeaconSource();
  const roundTime = beacon.getRoundTime(commitment.targetRound);
  const waitMs = Math.max((roundTime - Math.floor(Date.now() / 1000) + 1) * 1000, 2000);
  await new Promise(r => setTimeout(r, waitMs));

  // ── 3. Resolve (get verifiable entropy) ────────────────────
  const resolution = await resolveCommitment(commitment);
  console.log(`  Beacon randomness: ${resolution.beaconRandomness.slice(0, 20)}...`);

  // ── 4. YOUR algorithm determines the drop ──────────────────
  const drop = weightedPull(LOOT_TABLE, resolution.beaconRandomness);
  console.log(`  Drop: ${drop.rarity} — ${drop.item}`);

  // ── 5. Package receipt for the player ──────────────────────
  const receipt = createReceipt(commitment, resolution);

  return { drop, receipt };
}

// ═══════════════════════════════════════════════════════════
// PLAYER VERIFICATION — independent, trustless
// ═══════════════════════════════════════════════════════════

async function playerVerifies(receipt: ReturnType<typeof createReceipt>) {
  const result = await verifyReceipt(receipt);
  return result;
}

// ═══════════════════════════════════════════════════════════
// DEMO
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('🎮 Operator Integration Demo');
  console.log('════════════════════════════════════════');
  console.log(`Loot table: ${LOOT_TABLE.version}`);
  console.log(`Published rates: SSR ${LOOT_TABLE.rates[0].rate * 100}% | SR ${LOOT_TABLE.rates[1].rate * 100}% | R ${LOOT_TABLE.rates[2].rate * 100}% | N ${LOOT_TABLE.rates[3].rate * 100}%`);
  console.log('');

  // Simulate 3 pulls from a player
  for (let pull = 1; pull <= 3; pull++) {
    console.log(`── Pull #${pull} ──────────────────────────────`);
    
    const { drop, receipt } = await handleGachaPull('player_ned_42069', pull);

    // Player independently verifies
    const proof = await playerVerifies(receipt);
    console.log(`  Verified: commitment=${proof.checks.commitmentIntegrity ? '✅' : '❌'} beacon=${proof.checks.beaconVerified ? '✅' : '❌'} output=${proof.checks.outputVerified ? '✅' : '❌'}`);
    console.log(`  Status: ${proof.status}`);
    console.log('');
  }

  console.log('════════════════════════════════════════');
  console.log('✅ All pulls committed before entropy, verified trustlessly.');
  console.log('   The player can re-run weightedPull() with the same');
  console.log('   beacon randomness to confirm the drop matches.');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
