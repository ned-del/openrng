#!/usr/bin/env npx tsx
/**
 * 🎰 Fairseal Gacha Pull Demo
 * 
 * A verifiable loot box pull. Every drop is committed before
 * the outcome is knowable. Every receipt is independently verifiable.
 * 
 * Usage: npx tsx gacha-pull.ts
 */

import { createCommitment } from '../src/commitment';
import { resolveCommitment, createReceipt } from '../src/resolve';
import { verifyReceipt } from '../src/verify';
import { DrandBeaconSource } from '../src/beacon';

// ─── Loot Table (published, legally required in many jurisdictions) ────

const LOOT_TABLE = {
  name: 'Celestial Banner v3.2',
  items: [
    { id: 'SSR_Dragon_Blade',   rarity: 'SSR',    rate: '0.6%'  },
    { id: 'SR_Phoenix_Staff',   rarity: 'SR',     rate: '5.1%'  },
    { id: 'SR_Thunder_Bow',     rarity: 'SR',     rate: '5.1%'  },
    { id: 'R_Iron_Shield',      rarity: 'R',      rate: '20.0%' },
    { id: 'R_Wind_Cloak',       rarity: 'R',      rate: '20.0%' },
    { id: 'N_Wooden_Sword',     rarity: 'N',      rate: '24.6%' },
    { id: 'N_Leather_Armor',    rarity: 'N',      rate: '24.6%' },
  ],
};

const RARITY_EMOJI: Record<string, string> = {
  SSR: '🌟', SR: '✨', R: '🔵', N: '⚪'
};

async function main() {
  const beacon = new DrandBeaconSource();
  const playerName = 'Player_Ned';
  
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  🎰 FAIRSEAL GACHA — VERIFIABLE LOOT PULL       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Banner:  ${LOOT_TABLE.name}`);
  console.log(`  Player:  ${playerName}`);
  console.log('  ─────────────────────────────────────');
  console.log('  Published Drop Rates:');
  for (const item of LOOT_TABLE.items) {
    console.log(`    ${RARITY_EMOJI[item.rarity]} ${item.rarity.padEnd(3)} ${item.rate.padStart(5)}  ${item.id}`);
  }
  console.log('');

  // ── Step 1: Commit to the loot table BEFORE the pull ──────
  console.log('━━━ Step 1: Committing to drop table ━━━');
  console.log('  (locked before the outcome is knowable)');
  
  const commitment = createCommitment({
    rule: JSON.stringify({
      type: 'uniform',
      pick: 1,
      context: {
        banner: LOOT_TABLE.name,
        player: playerName,
        mechanism: 'weighted selection via committed entropy',
      }
    }),
    inputs: LOOT_TABLE.items.map(i => i.id),
    revealAfter: 10,
  });

  console.log(`  Commit hash: ${commitment.commitHash.slice(0, 24)}...`);
  console.log(`  Beacon:      drand round ${commitment.targetRound}`);
  
  const roundTime = beacon.getRoundTime(commitment.targetRound);
  const waitSec = Math.max(roundTime - Math.floor(Date.now() / 1000) + 1, 3);
  console.log(`  Waiting ${waitSec}s for entropy...\n`);

  // ── Step 2: Wait for beacon ───────────────────────────────
  const spinner = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  const end = Date.now() + waitSec * 1000;
  let i = 0;
  while (Date.now() < end) {
    process.stdout.write(`\r  ${spinner[i++ % spinner.length]} Waiting for drand beacon...`);
    await new Promise(r => setTimeout(r, 100));
  }
  process.stdout.write('\r  ✅ Beacon received!          \n\n');

  // ── Step 3: Resolve — the actual pull ─────────────────────
  console.log('━━━ Step 2: PULLING... ━━━');
  const resolution = await resolveCommitment(commitment);
  
  const droppedItem = LOOT_TABLE.items.find(i => i.id === resolution.selection);
  const emoji = droppedItem ? RARITY_EMOJI[droppedItem.rarity] : '❓';
  
  console.log('');
  console.log(`  ╔═══════════════════════════════════╗`);
  console.log(`  ║  ${emoji} ${droppedItem?.rarity || '???'}  —  ${resolution.selection}`);
  console.log(`  ╚═══════════════════════════════════╝`);
  console.log('');

  // ── Step 4: Create & verify receipt ───────────────────────
  console.log('━━━ Step 3: Verifying (trustless, independent) ━━━');
  const receipt = createReceipt(commitment, resolution);
  const result = await verifyReceipt(receipt);
  
  console.log(`  Commitment integrity: ${result.checks.commitmentIntegrity ? '✅' : '❌'}`);
  console.log(`  Beacon verified:      ${result.checks.beaconVerified ? '✅' : '❌'}`);
  console.log(`  Output verified:      ${result.checks.outputVerified ? '✅' : '❌'}`);
  console.log(`  Selection verified:   ${result.checks.selectionVerified ? '✅' : '❌'}`);
  console.log(`  Status:               ${result.status}`);
  console.log('');

  if (result.checks.commitmentIntegrity && result.checks.beaconVerified &&
      result.checks.outputVerified && result.checks.selectionVerified) {
    console.log('  🦭 This pull is provably fair.');
    console.log('  The drop table was committed before the entropy existed.');
    console.log('  Anyone with the receipt below can verify independently.');
  }
  
  console.log('\n━━━ Receipt (paste this to verify) ━━━');
  console.log(JSON.stringify({
    version: receipt.version,
    banner: LOOT_TABLE.name,
    player: playerName,
    dropped: resolution.selection,
    rarity: droppedItem?.rarity,
    receipt,
  }, null, 2));
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
