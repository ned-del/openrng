/**
 * Deploy MerkleAnchor to Polygon Amoy testnet
 * Usage: node scripts/deploy.js
 */
require('dotenv/config');
const { ethers } = require('ethers');
const solc = require('solc');
const fs = require('fs');
const path = require('path');

async function main() {
  // 1. Compile contract
  console.log('Compiling MerkleAnchor.sol...');
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'contracts', 'MerkleAnchor.sol'),
    'utf8'
  );

  const input = {
    language: 'Solidity',
    sources: { 'MerkleAnchor.sol': { content: source } },
    settings: {
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
      optimizer: { enabled: true, runs: 200 },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errs = output.errors.filter(e => e.severity === 'error');
    if (errs.length > 0) {
      console.error('Compilation errors:');
      errs.forEach(e => console.error(e.formattedMessage));
      process.exit(1);
    }
    // Warnings are ok
    output.errors.filter(e => e.severity === 'warning').forEach(w =>
      console.warn('Warning:', w.message)
    );
  }

  const compiled = output.contracts['MerkleAnchor.sol']['MerkleAnchor'];
  const abi = compiled.abi;
  const bytecode = compiled.evm.bytecode.object;
  console.log('✅ Compiled successfully');

  // 2. Connect to Polygon Amoy
  const provider = new ethers.JsonRpcProvider(
    process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology'
  );
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

  console.log('Deployer:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'MATIC');

  if (balance === 0n) {
    console.error('No MATIC! Get test tokens from https://faucet.polygon.technology/');
    process.exit(1);
  }

  // 3. Deploy
  console.log('Deploying to Polygon Amoy testnet...');
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();

  console.log('Tx submitted:', contract.deploymentTransaction().hash);
  console.log('Waiting for confirmation...');

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log('\n════════════════════════════════════════');
  console.log('  ✅ MerkleAnchor deployed!');
  console.log('════════════════════════════════════════');
  console.log('  Contract:', address);
  console.log('  Explorer:', `https://amoy.polygonscan.com/address/${address}`);
  console.log('  Tx:', `https://amoy.polygonscan.com/tx/${contract.deploymentTransaction().hash}`);
  console.log('\n  Update .env:');
  console.log(`  MERKLE_ANCHOR_CONTRACT=${address}`);
  console.log('════════════════════════════════════════');

  // 4. Save ABI for future use
  fs.writeFileSync(
    path.join(__dirname, '..', 'contracts', 'MerkleAnchor.json'),
    JSON.stringify({ abi, address }, null, 2)
  );
  console.log('\nABI saved to contracts/MerkleAnchor.json');
}

main().catch(err => {
  console.error('Deploy failed:', err.message);
  process.exit(1);
});
