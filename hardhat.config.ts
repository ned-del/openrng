import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";

import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
    },
    amoy: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};

export default config;
