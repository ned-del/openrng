#!/usr/bin/env npx ts-node
/**
 * OpenRNG — Game Loot Demo
 *
 * Demonstrates the commit-reveal pattern for provably fair item drops.
 * Run: npx ts-node demo.ts
 *
 * Works in standalone mode (no server needed) to demonstrate the pattern.
 * Connect to OpenRNG for real cryptographic proofs.
 */

import { createHash } from 'crypto';
import { LootTable } from './loot-table';

// ============================================================
// SETUP: Define a loot table (game publishes this)
// ============================================================

const bossLoot = new LootTable({
  name: 'Shadow Dragon Drops',
  version: '2.1.0',
  items: [
    { id: 'iron-sword',       name: 'Iron Sword',              rarity: 'common',    weight: 40 },
    { id: 'health-potion',    name: 'Greater Health Potion',    rarity: 'common',    weight: 30 },
    { id: 'steel-shield',     name: 'Enchanted Steel Shield',   rarity: 'uncommon',  weight: 15 },
    { id: 'dragon-helm',      name: 'Dragon Scale Helm',        rarity: 'rare',      weight: 8 },
    { id: 'shadow-plate',     name: 'Shadow Plate Armor',       rarity: 'epic',      weight: 5 },
    { id: 'fire-sword',       name: 'Legendary Sword of Fire',  rarity: 'legendary', weight: 2 },
  ],
});

console.log('════════════════════════════════════════════════════');
console.log('  OpenRNG — Verifiable Game Loot Demo');
console.log('════════════════════════════════════════════════════');
console.log('');

// ============================================================
// STEP 1: Game publishes loot table commitment
// ============================================================

console.log('📋 STEP 1: Game publishes loot table');
console.log('');
console.log(`  Table: ${bossLoot.name} v${bossLoot.version}`);
console.log(`  Commitment: ${bossLoot.commitment}`);
console.log('');
console.log('  Drop rates:');
for (const p of bossLoot.getProbabilities()) {
  const bar = '█'.repeat(Math.round(parseFloat(p.probability) / 2));
  console.log(`    ${p.rarity.padEnd(10)} ${p.probability.padStart(6)} ${bar} ${p.name}`);
}
console.log('');
console.log('  → This commitment is published before any drops happen.');
console.log('  → Changing drop rates = new commitment = visible to players.');
console.log('');

// ============================================================
// STEP 2: Simulate RNG tokens (in production, these come from OpenRNG)
// ============================================================

console.log('══════════════════════════════════════════════════');
console.log('');
console.log('⚔️  STEP 2: Player kills Shadow Dragon — 5 drops');
console.log('');

// Simulate 5 OpenRNG tokens (in production: await rng.number({ min: 0, max: 1 }))
const simulatedTokens = [0.12, 0.73, 0.42, 0.96, 0.985];

for (let i = 0; i < simulatedTokens.length; i++) {
  const rngValue = simulatedTokens[i];

  // Simulated proof (in production: real Merkle proof from OpenRNG)
  const mockLeafHash = createHash('sha256').update(`leaf-${i}-${rngValue}`).digest('hex');
  const mockProof = {
    leafHash: mockLeafHash,
    batchId: `batch-demo-${i}`,
    merkleRoot: createHash('sha256').update(`root-${i}`).digest('hex'),
    polygonScan: `https://amoy.polygonscan.com/tx/0xdemo${i}...`,
  };

  // Resolve drop
  const drop = bossLoot.resolve(rngValue);
  const rarityEmoji: Record<string, string> = {
    common: '⬜', uncommon: '🟩', rare: '🟦', epic: '🟪', legendary: '🟧'
  };

  console.log(`  Drop #${i + 1}: RNG=${rngValue.toFixed(3)} → ${rarityEmoji[drop.item.rarity]} ${drop.item.name} (${drop.item.rarity})`);
  console.log(`          Range: [${drop.rangeStart.toFixed(3)}, ${drop.rangeEnd.toFixed(3)}) — proof: ${mockLeafHash.slice(0, 12)}...`);
}

console.log('');

// ============================================================
// STEP 3: Unidentified item flow
// ============================================================

console.log('══════════════════════════════════════════════════');
console.log('');
console.log('❓ STEP 3: Unidentified item — commit before reveal');
console.log('');

const mysteryValue = 0.985;
const mysteryProof = {
  leafHash: createHash('sha256').update(`mystery-leaf`).digest('hex'),
  batchId: 'batch-mystery-001',
  merkleRoot: createHash('sha256').update('mystery-root').digest('hex'),
  polygonScan: 'https://amoy.polygonscan.com/tx/0xmystery...',
};

// Create unidentified drop
const unidentified = bossLoot.createUnidentifiedDrop(mysteryValue, mysteryProof);

console.log('  Player receives unidentified drop:');
console.log(`    Drop ID:    ${unidentified.dropId}`);
console.log(`    Status:     ${unidentified.status}`);
console.log(`    RNG Proof:  ${unidentified.proof.leafHash.slice(0, 16)}... (verifiable on Polygon)`);
console.log(`    Reveal Hash: ${unidentified.revealHash.slice(0, 16)}... (commits to item)`);
console.log(`    Table:      ${unidentified.lootTableCommitment.slice(0, 30)}...`);
console.log('');
console.log('  → Player can TRADE this item safely.');
console.log('  → Buyer verifies: RNG proof is real, table commitment is valid.');
console.log('  → Nobody knows what item it is yet — but the result is already locked in.');
console.log('');

// Reveal
const revealed = bossLoot.reveal(unidentified);
console.log('  🔓 Item identified!');
console.log(`    → ${revealed.revealed.item.name} (${revealed.revealed.item.rarity})`);
console.log(`    → Range: [${revealed.revealed.rangeStart.toFixed(3)}, ${revealed.revealed.rangeEnd.toFixed(3)})`);
console.log('');

// ============================================================
// STEP 4: Independent verification
// ============================================================

console.log('══════════════════════════════════════════════════');
console.log('');
console.log('✅ STEP 4: Anyone can verify the drop');
console.log('');

const verification = bossLoot.verify(
  revealed.revealed.item.id,
  unidentified.rngValue,
  bossLoot.commitment
);

console.log(`  Table commitment valid:  ${verification.tableValid ? '✅' : '❌'}`);
console.log(`  Mapping valid:           ${verification.mappingValid ? '✅' : '❌'}`);
console.log(`  RNG value:               ${verification.details.rngValue}`);
console.log(`  Expected item:           ${verification.details.expectedItem}`);
console.log(`  Claimed item:            ${verification.details.claimedItem}`);
console.log(`  Match:                   ${verification.details.expectedItem === verification.details.claimedItem ? '✅ VERIFIED' : '❌ MISMATCH'}`);
console.log('');

// ============================================================
// STEP 5: Tamper detection
// ============================================================

console.log('══════════════════════════════════════════════════');
console.log('');
console.log('🚨 STEP 5: Tamper detection — what if someone lies?');
console.log('');

// Try to claim a legendary when you got a common
const tamperCheck = bossLoot.verify(
  'fire-sword',       // claimed: legendary
  0.12,               // actual RNG value → should be common
  bossLoot.commitment
);

console.log('  Attacker claims: "I got Legendary Sword of Fire" (RNG=0.12)');
console.log(`  Table commitment valid:  ${tamperCheck.tableValid ? '✅' : '❌'}`);
console.log(`  Mapping valid:           ${tamperCheck.mappingValid ? '✅' : '❌ CAUGHT'}`);
console.log(`  Expected item:           ${tamperCheck.details.expectedItem} (${bossLoot.resolve(0.12).item.name})`);
console.log(`  Claimed item:            ${tamperCheck.details.claimedItem} (Legendary Sword of Fire)`);
console.log(`  Verdict:                 ${tamperCheck.mappingValid ? 'Valid' : '🚨 FRAUD DETECTED — mapping mismatch'}`);
console.log('');
console.log('══════════════════════════════════════════════════');
console.log('');
console.log('In production, connect to OpenRNG for real Merkle proofs:');
console.log('  const rng = new OpenRNG({ endpoint: "https://api.openrng.io", ... })');
console.log('  const token = await rng.number({ min: 0, max: 1 })');
console.log('  const drop = lootTable.resolve(token.value)');
console.log('  // → fully verifiable on Polygon');
console.log('');
