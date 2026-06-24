/**
 * OpenRNG Core Engine
 * Patent: Method and System for Gaming Random Number Generation
 *
 * Implements the hybrid VDF + Merkle batch architecture:
 * 1. drand beacon (or local VDF fallback) generates a tamper-proof seed (anti-preview)
 * 2. Seed feeds Merkle batch of N leaf node hashes
 * 3. Root hash anchored to Polygon blockchain
 * 4. Tokens dispensed from pool at <2ms latency
 */

import { createHash, randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import type { DrandClient } from './drand.js';

// ============================================================
// TYPES
// ============================================================

export interface RNToken {
  leafHash: string;       // SHA-256(rnGenParam + nodeId)
  nodeId: string;         // unique node identifier
  nodeIndex: number;      // position in batch
  batchId: string;        // parent batch
  value: number;          // derived numeric value (0-1)
  consumed: boolean;
  consumedAt?: Date;
  consumedBy?: string;    // clientId
}

export interface MerkleBatch {
  batchId: string;
  rnGenParam: string;     // SHA-256(vdfOutput + blockParam)
  blockParam: string;     // from Chain 1 (entropy source)
  vdfOutput: string;      // anti-preview seed
  leaves: string[];       // leaf node hashes
  merkleRoot: string;     // root hash → anchored to Chain 2
  levels: string[][];     // full tree for proof generation
  nodeIds: string[];
  batchSize: number;
  createdAt: Date;
  anchoredAt?: Date;
  anchorTxHash?: string;  // Polygon transaction hash
  anchorBlockNumber?: number;
  tokensConsumed: number;
  status: 'generating' | 'anchoring' | 'ready' | 'depleted';
}

export interface MerkleProof {
  leafHash: string;
  leafIndex: number;
  proofPath: Array<{ hash: string; position: 'left' | 'right' }>;
  root: string;
  batchId: string;
  anchorTxHash?: string;
  anchorBlockNumber?: number;
  valid: boolean;
}

export interface TokenRequest {
  clientId: string;
  quantity: number;
  range?: { min: number; max: number };
  vertical?: 'slot' | 'game' | 'lottery' | 'agent' | 'npc';
}

export interface TokenResponse {
  tokens: Array<{
    value: number;
    leafHash: string;
    nodeId: string;
    batchId: string;
    proof: MerkleProof;
  }>;
  latencyMs: number;
  servedFromPool: boolean;
}

// ============================================================
// MERKLE TREE BUILDER
// ============================================================

export class MerkleTreeBuilder {

  static sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  static async buildTree(leaves: string[]): Promise<{ root: string; levels: string[][] }> {
    let level = [...leaves];
    const levels: string[][] = [level];

    while (level.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || level[i]; // duplicate if odd
        next.push(this.sha256(left + right));
      }
      level = next;
      levels.push(level);
    }

    return { root: level[0], levels };
  }

  static getProof(
    leaves: string[],
    targetIndex: number,
    levels: string[][]
  ): Array<{ hash: string; position: 'left' | 'right' }> {
    const proof: Array<{ hash: string; position: 'left' | 'right' }> = [];
    let idx = targetIndex;

    for (let li = 0; li < levels.length - 1; li++) {
      const level = levels[li];
      const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      const sibling = level[Math.min(siblingIdx, level.length - 1)];
      proof.push({
        hash: sibling,
        position: idx % 2 === 0 ? 'right' : 'left'
      });
      idx = Math.floor(idx / 2);
    }

    return proof;
  }

  static verifyProof(
    leafHash: string,
    proof: Array<{ hash: string; position: 'left' | 'right' }>,
    root: string
  ): boolean {
    let current = leafHash;
    for (const step of proof) {
      if (step.position === 'right') {
        current = this.sha256(current + step.hash);
      } else {
        current = this.sha256(step.hash + current);
      }
    }
    return current === root;
  }
}

// ============================================================
// VDF ENGINE
// ============================================================

/**
 * Simulates a Verifiable Delay Function with configurable time T.
 *
 * In production, replace with a real VDF implementation:
 * - Wesolowski VDF: https://eprint.iacr.org/2018/623
 * - Pietrzak VDF: https://eprint.iacr.org/2018/627
 * - Or use a VDF service like drand.love (public randomness beacon)
 *
 * The key property: result cannot be known until T seconds of
 * sequential computation complete — even by the system operator.
 * This closes the "insider preview" vulnerability in pure Merkle systems.
 */
export class VDFEngine {
  private readonly tSeconds: number;
  private readonly iterations: number;

  constructor(tSeconds: number = 4) {
    this.tSeconds = tSeconds;
    // In production: iterations = sequential squarings in RSA group
    // Here: we simulate delay with iterative hashing (same sequential property)
    this.iterations = tSeconds * 10000;
  }

  async compute(seed: string): Promise<{
    output: string;
    proof: string;
    computeTimeMs: number;
  }> {
    const start = Date.now();
    logger.info(`VDF: starting computation T=${this.tSeconds}s seed=${seed.slice(0, 12)}...`);

    // Sequential hash chain — cannot be parallelised
    // Production: replace with actual VDF squaring
    let current = seed;
    for (let i = 0; i < this.iterations; i++) {
      current = MerkleTreeBuilder.sha256(current + i.toString());
    }

    const computeTimeMs = Date.now() - start;
    const proof = MerkleTreeBuilder.sha256(current + seed); // VDF proof

    logger.info(`VDF: complete in ${computeTimeMs}ms output=${current.slice(0, 12)}...`);

    return { output: current, proof, computeTimeMs };
  }

  verify(seed: string, output: string, proof: string): boolean {
    // In production: verify VDF proof in O(log T) time
    const expectedProof = MerkleTreeBuilder.sha256(output + seed);
    return expectedProof === proof;
  }
}

// ============================================================
// TOKEN POOL
// ============================================================

export class TokenPool {
  private tokens: Map<string, RNToken[]> = new Map(); // batchId → tokens
  private available: RNToken[] = [];
  private _availableCount: number = 0;
  private _totalInjected: number = 0;
  private _consumeIdx: number = 0;  // pointer into available array for O(1) consume
  private readonly batchSize: number;

  constructor(batchSize: number = 65536) {
    this.batchSize = batchSize;
  }

  injectBatch(batch: MerkleBatch): void {
    const batchTokens: RNToken[] = batch.leaves.map((leafHash, i) => ({
      leafHash,
      nodeId: batch.nodeIds[i],
      nodeIndex: i,
      batchId: batch.batchId,
      value: parseInt(leafHash.slice(0, 8), 16) / 0xffffffff,
      consumed: false,
    }));

    this.tokens.set(batch.batchId, batchTokens);
    // Compact the array if we've consumed a lot
    if (this._consumeIdx > 0) {
      this.available = this.available.slice(this._consumeIdx);
      this._consumeIdx = 0;
    }
    this.available.push(...batchTokens);
    this._availableCount += batchTokens.length;
    this._totalInjected += batchTokens.length;
    logger.info(`Pool: injected ${batchTokens.length} tokens from batch ${batch.batchId}`);
  }

  consume(clientId: string, quantity: number = 1): RNToken[] {
    const end = Math.min(this._consumeIdx + quantity, this.available.length);
    const toConsume = this.available.slice(this._consumeIdx, end);

    for (const t of toConsume) {
      t.consumed = true;
      t.consumedAt = new Date();
      t.consumedBy = clientId;
    }

    this._consumeIdx = end;
    this._availableCount -= toConsume.length;

    return toConsume;
  }

  get depth(): number {
    return this._availableCount;
  }

  get fillPercent(): number {
    return this._totalInjected > 0 ? (this._availableCount / this._totalInjected) * 100 : 0;
  }
}

// ============================================================
// BATCH GENERATOR (CORE ENGINE)
// ============================================================

export class BatchGenerator extends EventEmitter {
  private readonly batchSize: number;
  private readonly vdfEngine: VDFEngine;
  private drandClient: DrandClient | null = null;
  private activeBatches: Map<string, MerkleBatch> = new Map();
  private completedBatches: MerkleBatch[] = [];
  private blockCounter: number = Math.floor(Math.random() * 10000) + 1000;

  constructor(batchSize: number = 65536, vdfT: number = 4, drandClient?: DrandClient) {
    super();
    this.batchSize = batchSize;
    this.vdfEngine = new VDFEngine(vdfT);
    this.drandClient = drandClient || null;
  }

  /**
   * Generate a complete batch:
   * 1. Fetch entropy from Chain 1 (simulated — in production: real block hash)
   * 2. Run VDF on entropy seed → anti-preview output
   * 3. Combine VDF output with block param → RN generation parameter
   * 4. Generate N leaf hashes using RN gen param + unique node IDs
   * 5. Build Merkle tree
   * 6. Return batch ready for Chain 2 anchoring
   */
  async generateBatch(clientId: string): Promise<MerkleBatch> {
    const batchId = `batch-${randomBytes(8).toString('hex')}`;
    logger.info(`Batch ${batchId}: starting generation for client ${clientId}`);

    // Step 1: Entropy from Chain 1 (in production: fetch real block hash)
    this.blockCounter += Math.floor(Math.random() * 3) + 1;
    const blockParam = MerkleTreeBuilder.sha256(
      `chain1-block-${this.blockCounter}-${Date.now()}-${randomBytes(16).toString('hex')}`
    );

    // Step 2: Get entropy — drand beacon (preferred) or local VDF fallback
    let vdfOutput: string;
    let computeTimeMs: number;
    let entropySource: 'drand' | 'local-vdf' = 'local-vdf';

    if (this.drandClient) {
      const { getVerifiableEntropy } = await import('./drand.js');
      const vdfSeed = MerkleTreeBuilder.sha256(blockParam + randomBytes(32).toString('hex'));
      const entropy = await getVerifiableEntropy(
        this.drandClient,
        async () => {
          const result = await this.vdfEngine.compute(vdfSeed);
          return { output: result.output, proof: result.proof };
        }
      );
      vdfOutput = entropy.randomness;
      entropySource = entropy.source;
      computeTimeMs = 0; // drand is near-instant
      if (entropy.source === 'drand') {
        logger.info(`Batch ${batchId}: using drand beacon round=${entropy.round}`);
      }
    } else {
      const vdfSeed = MerkleTreeBuilder.sha256(blockParam + randomBytes(32).toString('hex'));
      const result = await this.vdfEngine.compute(vdfSeed);
      vdfOutput = result.output;
      computeTimeMs = result.computeTimeMs;
    }

    // Step 3: RN generation parameter (VDF output + block param)
    const rnGenParam = MerkleTreeBuilder.sha256(vdfOutput + blockParam);

    // Step 4: Generate N leaf node hashes
    const nodeIds = Array.from({ length: this.batchSize }, (_, i) =>
      `node-${String(i).padStart(6, '0')}-${batchId.slice(6, 14)}`
    );
    const leaves = nodeIds.map(nodeId =>
      MerkleTreeBuilder.sha256(rnGenParam + nodeId)
    );

    // Step 5: Build Merkle tree
    const { root: merkleRoot, levels } = await MerkleTreeBuilder.buildTree(leaves);

    const batch: MerkleBatch = {
      batchId,
      rnGenParam,
      blockParam,
      vdfOutput,
      leaves,
      merkleRoot,
      levels,
      nodeIds,
      batchSize: this.batchSize,
      createdAt: new Date(),
      tokensConsumed: 0,
      status: 'anchoring',
    };

    this.activeBatches.set(batchId, batch);
    this.emit('batchGenerated', batch);

    logger.info(
      `Batch ${batchId}: generated ${this.batchSize} tokens, ` +
      `root=${merkleRoot.slice(0, 12)}..., entropy=${entropySource}, took ${computeTimeMs}ms`
    );

    return batch;
  }

  confirmAnchor(batchId: string, txHash: string, blockNumber: number): void {
    const batch = this.activeBatches.get(batchId);
    if (!batch) return;

    batch.anchoredAt = new Date();
    batch.anchorTxHash = txHash;
    batch.anchorBlockNumber = blockNumber;
    batch.status = 'ready';

    this.completedBatches.push(batch);
    this.activeBatches.delete(batchId);
    this.emit('batchReady', batch);

    logger.info(
      `Batch ${batchId}: anchored at block #${blockNumber} ` +
      `tx=${txHash.slice(0, 12)}...`
    );
  }

  getProof(batch: MerkleBatch, tokenIndex: number): MerkleProof {
    const leafHash = batch.leaves[tokenIndex];
    const proofPath = MerkleTreeBuilder.getProof(batch.leaves, tokenIndex, batch.levels);
    const valid = MerkleTreeBuilder.verifyProof(leafHash, proofPath, batch.merkleRoot);

    return {
      leafHash,
      leafIndex: tokenIndex,
      proofPath,
      root: batch.merkleRoot,
      batchId: batch.batchId,
      anchorTxHash: batch.anchorTxHash,
      anchorBlockNumber: batch.anchorBlockNumber,
      valid,
    };
  }

  getBatch(batchId: string): MerkleBatch | undefined {
    return this.activeBatches.get(batchId) ||
      this.completedBatches.find(b => b.batchId === batchId);
  }

  get stats() {
    return {
      activeBatches: this.activeBatches.size,
      completedBatches: this.completedBatches.length,
      totalTokensGenerated: this.completedBatches.reduce((a, b) => a + b.batchSize, 0),
    };
  }
}
