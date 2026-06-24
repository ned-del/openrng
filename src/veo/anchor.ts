/**
 * VEO-1 — Blockchain Anchoring
 *
 * Anchors VEO entropy_hash to Polygon via MerkleAnchor contract.
 * Uses the existing contract at 0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8.
 */

import { ethers, Contract, Wallet, JsonRpcProvider } from 'ethers';
import crypto from 'crypto';
import { AnchorPackage } from './types.js';
import { logger } from '../utils/logger.js';

const MERKLE_ANCHOR_ABI = [
  'function anchorBatch(string batchId, bytes32 merkleRoot, uint256 batchSize, string clientId) external returns (uint256 blockNumber)',
  'function getBatchRoot(string batchId) external view returns (bytes32 root, uint256 blockNumber, uint256 timestamp, uint256 batchSize)',
  'function batchExists(string batchId) external view returns (bool)',
];

// ── Anchor state tracking ───────────────────────────────────

let lastAnchorTx: string | null = null;
let lastAnchorAt: string | null = null;

export function getLastAnchorInfo(): { tx: string | null; at: string | null } {
  return { tx: lastAnchorTx, at: lastAnchorAt };
}

// ── Config ──────────────────────────────────────────────────

let anchorWallet: Wallet | null = null;
let anchorContract: Contract | null = null;
let anchorProvider: JsonRpcProvider | null = null;
let anchorReady = false;

// Nonce queue to prevent collisions
let txProcessing = false;
const txQueue: Array<{
  params: { batchId: string; merkleRoot: string; batchSize: number; clientId: string };
  resolve: (result: AnchorResult) => void;
  reject: (error: Error) => void;
}> = [];

interface AnchorResult {
  txHash: string;
  blockNumber: number;
  batchId: string;
  merkleRoot: string;
  timestamp: Date;
}

function initAnchor(): boolean {
  if (anchorReady) return true;

  const rpcUrl = process.env.POLYGON_RPC_URL;
  const privKey = process.env.DEPLOYER_PRIVATE_KEY;
  const contract = process.env.OPENRNG_ANCHOR_CONTRACT || process.env.MERKLE_ANCHOR_CONTRACT;
  const isProd = process.env.NODE_ENV === 'production';

  if (!rpcUrl || !privKey || !contract) return false;
  if (privKey === '0xyour-private-key-here' || privKey === 'TODO') return false;
  if (!isProd) return false;

  try {
    anchorProvider = new JsonRpcProvider(rpcUrl);
    anchorWallet = new Wallet(privKey, anchorProvider);
    anchorContract = new Contract(contract, MERKLE_ANCHOR_ABI, anchorWallet);
    anchorReady = true;
    logger.info(`VEO anchor: configured contract=${contract} chain=polygon-amoy`);
    return true;
  } catch (err: any) {
    logger.error(`VEO anchor: init failed — ${err.message}`);
    return false;
  }
}

export function isAnchoringConfigured(): boolean {
  return initAnchor();
}

export function getContractAddress(): string | null {
  return process.env.OPENRNG_ANCHOR_CONTRACT || process.env.MERKLE_ANCHOR_CONTRACT || null;
}

export function getChain(): string {
  return process.env.POLYGON_CHAIN_ID === '137' ? 'polygon-mainnet' : 'polygon-amoy';
}

/**
 * Anchor a VEO entropy_hash to the blockchain.
 * Uses entropy_hash as a single-leaf Merkle root.
 */
export async function anchorVEO(entropyHash: string, objectId: string): Promise<AnchorPackage> {
  if (!initAnchor() || !anchorContract || !anchorWallet) {
    throw new Error('Anchoring not configured');
  }

  const batchId = `veo-${objectId}-${crypto.randomBytes(4).toString('hex')}`;
  // Use entropy_hash as single-leaf Merkle root
  const merkleRoot = entropyHash.startsWith('0x') ? entropyHash : '0x' + entropyHash;
  // Pad to bytes32
  const rootBytes32 = ethers.zeroPadValue(merkleRoot, 32);

  const result = await enqueueAnchorTx({
    batchId,
    merkleRoot: rootBytes32,
    batchSize: 1,
    clientId: 'openrng-veo',
  });

  // Read back to verify
  const [storedRoot, blockNumber, timestamp] = await anchorContract.getBatchRoot(batchId);
  const storedRootHex = ethers.hexlify(storedRoot);

  if (storedRootHex.toLowerCase() !== rootBytes32.toLowerCase()) {
    throw new Error(`Anchor readback mismatch: stored=${storedRootHex} expected=${rootBytes32}`);
  }

  lastAnchorTx = result.txHash;
  lastAnchorAt = new Date().toISOString();

  const contractAddr = getContractAddress()!;
  return {
    anchor_type: 'blockchain',
    anchor_status: 'anchored',
    chain: getChain(),
    contract: contractAddr,
    transaction_hash: result.txHash,
    block_number: result.blockNumber,
    batch_id: batchId,
    batch_size: 1,
    merkle_root: rootBytes32,
    anchor_timestamp: new Date(Number(timestamp) * 1000).toISOString(),
  };
}

/**
 * Verify an anchor by reading contract state.
 */
export async function verifyAnchorOnChain(anchor: AnchorPackage): Promise<{
  valid: boolean;
  error?: string;
}> {
  const rpcUrl = process.env.POLYGON_RPC_URL;
  const contractAddr = anchor.contract;

  if (!rpcUrl || !contractAddr) {
    return { valid: false, error: 'Cannot verify: no RPC URL or contract address' };
  }

  try {
    const provider = new JsonRpcProvider(rpcUrl);
    const contract = new Contract(contractAddr, MERKLE_ANCHOR_ABI, provider);

    const batchId = (anchor as any).batch_id;
    if (!batchId) {
      return { valid: false, error: 'No batch_id in anchor package' };
    }

    const exists = await contract.batchExists(batchId);
    if (!exists) {
      return { valid: false, error: 'Batch not found on chain' };
    }

    const [storedRoot] = await contract.getBatchRoot(batchId);
    const storedRootHex = ethers.hexlify(storedRoot);
    const expectedRoot = anchor.merkle_root;

    if (!expectedRoot || storedRootHex.toLowerCase() !== expectedRoot.toLowerCase()) {
      return { valid: false, error: `Root mismatch: chain=${storedRootHex} expected=${expectedRoot}` };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: `On-chain verification failed: ${err.message}` };
  }
}

// ── Nonce queue (serialize txs) ─────────────────────────────

function enqueueAnchorTx(params: {
  batchId: string;
  merkleRoot: string;
  batchSize: number;
  clientId: string;
}): Promise<AnchorResult> {
  return new Promise((resolve, reject) => {
    txQueue.push({ params, resolve, reject });
    processQueue();
  });
}

async function processQueue(): Promise<void> {
  if (txProcessing || txQueue.length === 0) return;
  txProcessing = true;

  while (txQueue.length > 0) {
    const item = txQueue.shift()!;
    try {
      const result = await sendAnchorTx(item.params);
      item.resolve(result);
    } catch (err: any) {
      item.reject(err);
    }
  }

  txProcessing = false;
}

async function sendAnchorTx(params: {
  batchId: string;
  merkleRoot: string;
  batchSize: number;
  clientId: string;
}): Promise<AnchorResult> {
  if (!anchorContract) throw new Error('Anchor contract not initialized');

  const { batchId, merkleRoot, batchSize, clientId } = params;
  logger.info(`VEO anchor: submitting ${batchId} root=${merkleRoot.slice(0, 14)}...`);

  const gasEstimate = await anchorContract.anchorBatch.estimateGas(
    batchId, merkleRoot, batchSize, clientId
  );

  const tx = await anchorContract.anchorBatch(
    batchId, merkleRoot, batchSize, clientId,
    { gasLimit: (gasEstimate * BigInt(120)) / BigInt(100) }
  );

  logger.info(`VEO anchor: tx submitted ${tx.hash} — waiting for 2 confirmations...`);
  const receipt = await tx.wait(2);

  logger.info(`VEO anchor: confirmed block #${receipt.blockNumber} tx=${receipt.hash}`);

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    batchId,
    merkleRoot,
    timestamp: new Date(),
  };
}
