import { createCommitment } from './src/commitment';
import { resolveCommitment, createReceipt } from './src/resolve';
import { verifyReceipt } from './src/verify';

async function main() {
  console.log('🦭 Live BLS Verification Test');
  
  const c = createCommitment({
    rule: JSON.stringify({ type: 'uniform', pick: 1 }),
    inputs: ['alpha', 'bravo', 'charlie'],
    revealAfter: 6,
  });
  
  console.log('Commitment:', c.commitHash.slice(0, 20) + '...');
  console.log('Target round:', c.targetRound);
  
  // Wait
  const { DrandBeaconSource } = await import('./src/beacon');
  const b = new DrandBeaconSource();
  const wait = Math.max(b.getRoundTime(c.targetRound) - Math.floor(Date.now()/1000) + 1, 3) * 1000;
  console.log(`Waiting ${Math.ceil(wait/1000)}s...`);
  await new Promise(r => setTimeout(r, wait));
  
  // Resolve
  const res = await resolveCommitment(c);
  console.log('Selection:', res.selection);
  console.log('Beacon verified (BLS):', res.verified);
  
  // Verify receipt
  const receipt = createReceipt(c, res);
  const result = await verifyReceipt(receipt);
  
  console.log('');
  console.log('Commitment integrity:', result.checks.commitmentIntegrity ? '✅' : '❌');
  console.log('Beacon BLS verified:', result.checks.beaconVerified ? '✅' : '❌');
  console.log('Output verified:', result.checks.outputVerified ? '✅' : '❌');
  console.log('Selection verified:', result.checks.selectionVerified ? '✅' : '❌');
  console.log('Status:', result.status);
  
  if (result.checks.beaconVerified) {
    console.log('\n🦭 REAL BLS12-381 CRYPTOGRAPHIC VERIFICATION PASSED');
    console.log('   No relay trust needed. Math only.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
