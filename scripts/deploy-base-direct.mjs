/**
 * Direct ethers.js deploy to Base Mainnet (no Hardhat runtime needed)
 * Run: node scripts/deploy-base-direct.mjs
 */
import { readFileSync } from 'fs';
import { ethers } from '../node_modules/ethers/dist/ethers.js';

const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY;
if (!DEPLOYER_KEY) {
  console.error('Set DEPLOYER_PRIVATE_KEY env var');
  process.exit(1);
}

const artifact = JSON.parse(
  readFileSync(new URL('../artifacts/contracts/MerkleAnchor.sol/MerkleAnchor.json', import.meta.url))
);

async function main() {
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  const wallet = new ethers.Wallet(DEPLOYER_KEY, provider);

  const network = await provider.getNetwork();
  console.log('Network:', network.name, 'chainId:', network.chainId.toString());
  console.log('Deployer:', wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');

  if (balance === 0n) {
    console.error('No ETH balance');
    process.exit(1);
  }

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  
  console.log('Deploying MerkleAnchor to Base mainnet...');
  const contract = await factory.deploy();
  console.log('Tx submitted:', contract.deploymentTransaction().hash);
  
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  const receipt = await provider.getTransactionReceipt(contract.deploymentTransaction().hash);
  
  console.log('\n✅ MerkleAnchor deployed to Base Mainnet!');
  console.log('   Contract address:', address);
  console.log('   Tx hash:', contract.deploymentTransaction().hash);
  console.log('   Gas used:', receipt?.gasUsed?.toString());
  console.log('   Block:', receipt?.blockNumber);
  console.log('   Basescan:', `https://basescan.org/address/${address}`);
  console.log('   Basescan tx:', `https://basescan.org/tx/${contract.deploymentTransaction().hash}`);
  
  // Verify owner is deployer
  const ownerAddr = await contract.owner();
  console.log('\n   Owner:', ownerAddr);
  console.log('   Owner matches deployer:', ownerAddr.toLowerCase() === wallet.address.toLowerCase());
}

main().catch(e => { console.error('Deploy failed:', e.message); process.exit(1); });
