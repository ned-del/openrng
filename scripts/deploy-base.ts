/**
 * Deploy MerkleAnchor to Base Mainnet
 * Usage: DEPLOYER_PRIVATE_KEY=0x... npx hardhat run scripts/deploy-base.ts --network base
 */
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying MerkleAnchor to Base Mainnet");
  console.log("Deployer:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  
  if (balance === 0n) {
    console.error("ERROR: No ETH balance on Base mainnet.");
    process.exit(1);
  }

  const MerkleAnchor = await ethers.getContractFactory("MerkleAnchor");
  console.log("Deploying...");
  
  const contract = await MerkleAnchor.deploy();
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  const receipt = await ethers.provider.getTransactionReceipt(
    contract.deploymentTransaction()!.hash
  );
  
  console.log("\n✅ MerkleAnchor deployed to Base Mainnet!");
  console.log("   Contract address:", address);
  console.log("   Tx hash:", contract.deploymentTransaction()!.hash);
  console.log("   Gas used:", receipt?.gasUsed.toString());
  console.log("   Basescan:", `https://basescan.org/address/${address}`);
  console.log("\n📝 Update Hetzner .env:");
  console.log(`   MERKLE_ANCHOR_CONTRACT=${address}`);
  console.log(`   BASE_RPC_URL=https://mainnet.base.org`);
  console.log(`   ANCHOR_CHAIN=base`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
