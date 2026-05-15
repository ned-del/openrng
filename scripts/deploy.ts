/**
 * Deploy MerkleAnchor to Polygon Amoy testnet
 * Usage: npx hardhat run scripts/deploy.ts --network amoy
 */
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying MerkleAnchor with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "MATIC");
  
  if (balance === 0n) {
    console.error("ERROR: No MATIC balance. Get test MATIC from https://faucet.polygon.technology/");
    process.exit(1);
  }

  const MerkleAnchor = await ethers.getContractFactory("MerkleAnchor");
  console.log("Deploying...");
  
  const contract = await MerkleAnchor.deploy();
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log("\n✅ MerkleAnchor deployed!");
  console.log("   Contract address:", address);
  console.log("   PolygonScan:", `https://amoy.polygonscan.com/address/${address}`);
  console.log("\n📝 Update your .env:");
  console.log(`   MERKLE_ANCHOR_CONTRACT=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
