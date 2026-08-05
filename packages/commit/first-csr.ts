import { createCommitment } from './src/commitment';
import { resolveCommitment, createReceipt } from './src/resolve';
import { verifyReceipt } from './src/verify';
import { DrandBeaconSource } from './src/beacon';

async function main() {
  const beacon = new DrandBeaconSource();
  const now = Math.floor(Date.now() / 1000);
  
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   🦭 FAIRSEAL — FIRST LIVE CSR                  ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Current drand round: ${beacon.getRound(now)}\n`);

  // ── Step 1: Commit ─────────────────────────────────────────
  console.log('━━━ Step 1: Creating commitment ━━━');
  const commitment = createCommitment({
    rule: JSON.stringify({ type: 'uniform', pick: 1 }),
    inputs: ['alice', 'bob', 'charlie', 'dave', 'eve'],
    revealAfter: 12,
  });

  const roundTime = beacon.getRoundTime(commitment.targetRound);
  console.log(`  ID:           ${commitment.id}`);
  console.log(`  Target round: ${commitment.targetRound}`);
  console.log(`  Commit hash:  ${commitment.commitHash}`);
  console.log(`  Inputs:       ${commitment.inputs.join(', ')}`);
  console.log(`  Rule:         ${commitment.rule}`);
  
  const waitSec = Math.max(roundTime - Math.floor(Date.now() / 1000) + 1, 3);
  console.log(`  Waiting ${waitSec}s for beacon round...\n`);

  // ── Step 2: Wait ───────────────────────────────────────────
  console.log('━━━ Step 2: Waiting for drand beacon... ━━━');
  await new Promise(r => setTimeout(r, waitSec * 1000));
  console.log('  Done.\n');

  // ── Step 3: Resolve ────────────────────────────────────────
  console.log('━━━ Step 3: Resolving commitment ━━━');
  const resolution = await resolveCommitment(commitment);
  console.log(`  Beacon round:      ${resolution.beaconRound}`);
  console.log(`  Beacon randomness: ${resolution.beaconRandomness}`);
  console.log(`  Beacon verified:   ${resolution.verified}`);
  console.log(`  HMAC output:       ${resolution.output}`);
  console.log(`  ✨ SELECTION:      ${JSON.stringify(resolution.selection)}\n`);

  // ── Step 4: Receipt ────────────────────────────────────────
  console.log('━━━ Step 4: Creating receipt ━━━');
  const receipt = createReceipt(commitment, resolution);
  console.log(`  Precedence:  ${receipt.precedence}`);
  console.log(`  Attestation: ${receipt.attestation}\n`);

  // ── Step 5: Verify ─────────────────────────────────────────
  console.log('━━━ Step 5: Independent verification ━━━');
  const result = await verifyReceipt(receipt);
  console.log(`  Commitment integrity: ${result.checks.commitmentIntegrity ? '✅' : '❌'}`);
  console.log(`  Beacon verified:      ${result.checks.beaconVerified ? '✅' : '❌'}`);
  console.log(`  Output verified:      ${result.checks.outputVerified ? '✅' : '❌'}`);
  console.log(`  Selection verified:   ${result.checks.selectionVerified ? '✅' : '❌'}`);
  console.log(`  Precedence:           ${result.checks.precedenceVerified ? '✅' : '⚠️  unattested (no on-chain anchor)'}`);
  console.log(`  STATUS:               ${result.status}\n`);

  // ── Result ─────────────────────────────────────────────────
  const allCrypto = result.checks.commitmentIntegrity && result.checks.beaconVerified && 
                    result.checks.outputVerified && result.checks.selectionVerified;
  console.log('╔══════════════════════════════════════════════════╗');
  if (allCrypto) {
    console.log('║  🦭 FIRST CSR ISSUED SUCCESSFULLY                ║');
    console.log('║  Committed before knowable. Verified trustlessly.║');
  } else {
    console.log('║  ❌ VERIFICATION FAILED                          ║');
  }
  console.log('╚══════════════════════════════════════════════════╝');
  
  console.log('\n━━━ Full Receipt ━━━');
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
