/**
 * OpenRNG Blockchain Anchor
 *
 * Writes Merkle root hashes to Polygon (Amoy testnet).
 * Each batch anchor = 1 transaction = proof for N tokens.
 *
 * Contract: MerkleAnchor.sol — stores root hashes immutably.
 * Anyone can verify any token by fetching the root from chain.
 */

import { ethers, Contract, Wallet, JsonRpcProvider } from 'ethers';
import { logger } from '../utils/logger.js';

// ============================================================
// CONTRACT ABI
// Only what we need — anchor and read roots
// ============================================================

const MERKLE_ANCHOR_ABI = [
  // Write root hash for a batch
  'function anchorBatch(string batchId, bytes32 merkleRoot, uint256 batchSize, string clientId) external returns (uint256 blockNumber)',

  // Read root hash for verification
  'function getBatchRoot(string batchId) external view returns (bytes32 root, uint256 blockNumber, uint256 timestamp, uint256 batchSize)',

  // Check if batch exists
  'function batchExists(string batchId) external view returns (bool)',

  // Events
  'event BatchAnchored(string indexed batchId, bytes32 merkleRoot, uint256 blockNumber, uint256 timestamp, string clientId)',
];

// ============================================================
// SOLIDITY CONTRACT SOURCE
// Deploy this first using: npx hardhat deploy
// ============================================================

export const MERKLE_ANCHOR_CONTRACT_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MerkleAnchor
 * @notice Immutable on-chain registry of OpenRNG Merkle batch roots.
 *         Each anchored root proves a batch of N tokens was generated
 *         via VDF+Merkle process before any token was consumed.
 *         Patent: Method and System for Gaming Random Number Generation
 */
contract MerkleAnchor {

    struct BatchRecord {
        bytes32 merkleRoot;
        uint256 blockNumber;
        uint256 timestamp;
        uint256 batchSize;
        string  clientId;
        bool    exists;
    }

    mapping(string => BatchRecord) private batches;
    address public immutable owner;
    uint256 public totalBatchesAnchored;
    uint256 public totalTokensAnchored;

    event BatchAnchored(
        string  indexed batchId,
        bytes32 merkleRoot,
        uint256 blockNumber,
        uint256 timestamp,
        string  clientId
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function anchorBatch(
        string  calldata batchId,
        bytes32 merkleRoot,
        uint256 batchSize,
        string  calldata clientId
    ) external onlyOwner returns (uint256) {
        require(!batches[batchId].exists, "Batch already anchored");
        require(merkleRoot != bytes32(0), "Invalid root");
        require(batchSize > 0, "Invalid batch size");

        batches[batchId] = BatchRecord({
            merkleRoot:  merkleRoot,
            blockNumber: block.number,
            timestamp:   block.timestamp,
            batchSize:   batchSize,
            clientId:    clientId,
            exists:      true
        });

        totalBatchesAnchored++;
        totalTokensAnchored += batchSize;

        emit BatchAnchored(batchId, merkleRoot, block.number, block.timestamp, clientId);
        return block.number;
    }

    function getBatchRoot(string calldata batchId)
        external view
        returns (bytes32 root, uint256 blockNumber, uint256 timestamp, uint256 batchSize)
    {
        BatchRecord storage r = batches[batchId];
        require(r.exists, "Batch not found");
        return (r.merkleRoot, r.blockNumber, r.timestamp, r.batchSize);
    }

    function batchExists(string calldata batchId) external view returns (bool) {
        return batches[batchId].exists;
    }

    function getStats() external view returns (uint256 totalBatches, uint256 totalTokens) {
        return (totalBatchesAnchored, totalTokensAnchored);
    }
}
`;

// ============================================================
// ANCHOR CLIENT
// ============================================================

export interface AnchorResult {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  timestampMs: number;
  batchId: string;
  merkleRoot: string;
  polygonScanUrl: string;
}

export interface BatchVerification {
  exists: boolean;
  merkleRoot: string;
  blockNumber: number;
  timestamp: Date;
  batchSize: number;
  polygonScanUrl: string;
}

export class PolygonAnchor {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private contract: Contract;
  private readonly chainId: number;
  private readonly isTestnet: boolean;

  // Transaction queue — serializes anchor txs to prevent nonce collisions
  private txQueue: Array<{
    params: { batchId: string; merkleRoot: string; batchSize: number; clientId: string };
    resolve: (result: AnchorResult) => void;
    reject: (error: Error) => void;
  }> = [];
  private txProcessing = false;

  constructor(config: {
    rpcUrl: string;
    privateKey: string;
    contractAddress: string;
    chainId?: number;
  }) {
    this.chainId = config.chainId || 80002; // Amoy testnet
    this.isTestnet = this.chainId === 80002;

    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.wallet = new Wallet(config.privateKey, this.provider);
    this.contract = new Contract(
      config.contractAddress,
      MERKLE_ANCHOR_ABI,
      this.wallet
    );

    logger.info(
      `Blockchain: connected to ${this.isTestnet ? 'Polygon Amoy TESTNET' : 'Polygon Mainnet'} ` +
      `chainId=${this.chainId}`
    );
  }

  /**
   * Anchor a Merkle root to Polygon.
   * Cost: ~0.001 MATIC on Amoy testnet (free from faucet)
   * Cost on mainnet: ~$0.001-0.01 depending on gas price
   */
  /**
   * Queue an anchor transaction. All txs are serialized to prevent nonce collisions.
   */
  async anchorBatch(params: {
    batchId: string;
    merkleRoot: string;
    batchSize: number;
    clientId: string;
  }): Promise<AnchorResult> {
    return new Promise<AnchorResult>((resolve, reject) => {
      this.txQueue.push({ params, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.txProcessing || this.txQueue.length === 0) return;
    this.txProcessing = true;

    while (this.txQueue.length > 0) {
      const item = this.txQueue.shift()!;
      try {
        const result = await this.sendAnchorTx(item.params);
        item.resolve(result);
      } catch (err: any) {
        item.reject(err);
      }
    }

    this.txProcessing = false;
  }

  /**
   * Actually send one anchor tx to Polygon.
   * Called sequentially from processQueue — never concurrently.
   */
  private async sendAnchorTx(params: {
    batchId: string;
    merkleRoot: string;
    batchSize: number;
    clientId: string;
  }): Promise<AnchorResult> {
    const { batchId, merkleRoot, batchSize, clientId } = params;

    logger.info(`Anchoring batch ${batchId} root=${merkleRoot.slice(0, 12)}... to Polygon (queue depth: ${this.txQueue.length})`);

    // Convert hex root to bytes32
    const rootBytes = ethers.hexlify(
      ethers.getBytes('0x' + merkleRoot.slice(0, 64).padEnd(64, '0'))
    );

    const startMs = Date.now();

    try {
      // Estimate gas first
      const gasEstimate = await this.contract.anchorBatch.estimateGas(
        batchId, rootBytes, batchSize, clientId
      );

      // Submit transaction with 20% gas buffer
      const tx = await this.contract.anchorBatch(
        batchId, rootBytes, batchSize, clientId,
        { gasLimit: (gasEstimate * BigInt(120)) / BigInt(100) }
      );

      logger.info(`Tx submitted: ${tx.hash} — waiting for confirmation...`);

      // Wait for 2 confirmations
      const receipt = await tx.wait(2);
      const timestampMs = Date.now() - startMs;

      const result: AnchorResult = {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        timestampMs,
        batchId,
        merkleRoot,
        polygonScanUrl: this.getExplorerUrl(receipt.hash),
      };

      logger.info(
        `Batch ${batchId} anchored: block #${receipt.blockNumber} ` +
        `tx=${receipt.hash.slice(0, 12)}... gas=${receipt.gasUsed} time=${timestampMs}ms`
      );

      return result;

    } catch (error: any) {
      logger.error(`Anchor failed for batch ${batchId}: ${error.message}`);
      throw new Error(`Blockchain anchor failed: ${error.message}`);
    }
  }

  /**
   * Verify a batch root on-chain.
   * Anyone can call this — this is the public verification endpoint.
   */
  async verifyBatch(batchId: string): Promise<BatchVerification> {
    try {
      const [root, blockNumber, timestamp, batchSize] =
        await this.contract.getBatchRoot(batchId);

      // Convert bytes32 back to hex string
      const merkleRoot = ethers.hexlify(root).slice(2);

      return {
        exists: true,
        merkleRoot,
        blockNumber: Number(blockNumber),
        timestamp: new Date(Number(timestamp) * 1000),
        batchSize: Number(batchSize),
        polygonScanUrl: this.getExplorerUrl(null, Number(blockNumber)),
      };

    } catch (error: any) {
      if (error.message?.includes('Batch not found')) {
        return {
          exists: false,
          merkleRoot: '',
          blockNumber: 0,
          timestamp: new Date(0),
          batchSize: 0,
          polygonScanUrl: '',
        };
      }
      throw error;
    }
  }

  async getWalletBalance(): Promise<string> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return ethers.formatEther(balance);
  }

  async getNetworkInfo(): Promise<{ name: string; chainId: number; blockNumber: number }> {
    const network = await this.provider.getNetwork();
    const blockNumber = await this.provider.getBlockNumber();
    return {
      name: this.isTestnet ? 'Polygon Amoy Testnet' : 'Polygon Mainnet',
      chainId: Number(network.chainId),
      blockNumber,
    };
  }

  private getExplorerUrl(txHash: string | null, blockNumber?: number): string {
    const base = this.isTestnet
      ? 'https://amoy.polygonscan.com'
      : 'https://polygonscan.com';

    if (txHash) return `${base}/tx/${txHash}`;
    if (blockNumber) return `${base}/block/${blockNumber}`;
    return base;
  }
}

// ============================================================
// MOCK ANCHOR (for development without real wallet)
// ============================================================

export class MockPolygonAnchor {
  private blockNumber: number = 10000;
  private anchored: Map<string, { root: string; block: number; ts: Date }> = new Map();

  async anchorBatch(params: {
    batchId: string;
    merkleRoot: string;
    batchSize: number;
    clientId: string;
  }): Promise<AnchorResult> {
    // Simulate 2-4 second chain confirmation
    await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));

    this.blockNumber += Math.floor(Math.random() * 3) + 1;
    const txHash = '0x' + Buffer.from(
      params.batchId + Date.now().toString()
    ).toString('hex').slice(0, 64).padEnd(64, '0');

    this.anchored.set(params.batchId, {
      root: params.merkleRoot,
      block: this.blockNumber,
      ts: new Date(),
    });

    logger.info(
      `[MOCK] Batch ${params.batchId} anchored: ` +
      `block #${this.blockNumber} tx=${txHash.slice(0, 14)}...`
    );

    return {
      txHash,
      blockNumber: this.blockNumber,
      gasUsed: '45000',
      timestampMs: 2500,
      batchId: params.batchId,
      merkleRoot: params.merkleRoot,
      polygonScanUrl: `https://amoy.polygonscan.com/tx/${txHash}`,
    };
  }

  async verifyBatch(batchId: string): Promise<BatchVerification> {
    const record = this.anchored.get(batchId);
    if (!record) return { exists: false, merkleRoot: '', blockNumber: 0, timestamp: new Date(0), batchSize: 0, polygonScanUrl: '' };
    return {
      exists: true,
      merkleRoot: record.root,
      blockNumber: record.block,
      timestamp: record.ts,
      batchSize: 65536,
      polygonScanUrl: `https://amoy.polygonscan.com/block/${record.block}`,
    };
  }

  async getWalletBalance(): Promise<string> { return '10.0 (mock)'; }
  async getNetworkInfo() { return { name: 'Mock Polygon Amoy', chainId: 80002, blockNumber: this.blockNumber }; }
}
