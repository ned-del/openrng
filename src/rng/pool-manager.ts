/**
 * OpenRNG Pool Manager v2 — Shared + Dedicated Pool Architecture
 *
 * TWO pool modes:
 * 1. Shared Pool (default for agent/npc verticals)
 *    - One large pool serves ALL free-tier agents
 *    - Pre-warmed at startup (3 batches = 196,608 tokens)
 *    - Per-agent rate limiting (100 req/min free tier)
 *    - New agents get tokens INSTANTLY
 *
 * 2. Dedicated Pool (for slot/game/lottery verticals, or Pro/Enterprise)
 *    - Per-client pool (original behavior)
 *    - Only for gaming verticals or explicit opt-in
 *
 * Key design decisions from stress test findings:
 * - 3 parallel VDF workers minimum
 * - 42% refill threshold for slot clients
 * - 30% refill threshold for shared pool
 * - 8 concurrent batches during burst
 */

import { EventEmitter } from 'events';
import { BatchGenerator, TokenPool, MerkleBatch, MerkleTreeBuilder, RNToken, TokenRequest, TokenResponse } from '../rng/engine.js';
import { PolygonAnchor, MockPolygonAnchor } from '../blockchain/anchor.js';
import { DrandClient } from '../rng/drand.js';
import { isDatabaseConnected } from '../db/index.js';
import * as repo from '../db/repositories.js';
import { logger } from '../utils/logger.js';
import { features } from '../config.js';
import { createHash, randomBytes } from 'crypto';

// ============================================================
// CLIENT POOL (Dedicated mode)
// ============================================================

interface ClientPool {
  clientId: string;
  vertical: string;
  pool: TokenPool;
  batchSize: number;
  refillThreshold: number;   // 0.0 - 1.0
  inBurst: boolean;
  tokensIssued: number;
  lastRefillAt: Date;
  activeBatchIds: Set<string>;
  useSharedPool: boolean;    // if true, tokens come from shared pool
}

// ============================================================
// RATE LIMITER
// ============================================================

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// ============================================================
// VDF WORKER
// ============================================================

interface VDFWorker {
  id: number;
  busy: boolean;
  currentBatchId: string | null;
  cyclesCompleted: number;
  assignedClientId: string | null;
}

// ============================================================
// SHARED POOL CONSTANTS
// ============================================================

const SHARED_POOL_CLIENT_ID = '__shared_pool__';
const SHARED_POOL_PRE_WARM_BATCHES = parseInt(process.env.SHARED_POOL_BATCHES || '8');
const SHARED_POOL_REFILL_THRESHOLD = 0.50;  // trigger refill at 50% (aggressive)
const SHARED_POOL_CRITICAL_THRESHOLD = 0.20;  // emergency multi-batch refill at 20%
const DEFAULT_RATE_LIMIT = 100;  // 100 req/min free tier
const RATE_LIMIT_WINDOW_MS = 60_000;  // 1 minute

// Verticals that use the shared pool by default
const SHARED_POOL_VERTICALS = new Set(['agent', 'npc']);

// ============================================================
// POOL MANAGER
// ============================================================

export class PoolManager extends EventEmitter {
  private clients: Map<string, ClientPool> = new Map();
  private generator: BatchGenerator;
  private anchor: PolygonAnchor | MockPolygonAnchor;
  private vdfWorkers: VDFWorker[];
  private refillQueue: Array<{ clientId: string; priority: number }> = [];
  private isProcessingQueue: boolean = false;

  // Shared pool
  private sharedPool: TokenPool;
  private sharedPoolBatchIds: Set<string> = new Set();
  private sharedPoolTotalInjected: number = 0;
  private sharedPoolTokensIssued: number = 0;

  // Per-agent rate limiting
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private rateLimitMax: number = DEFAULT_RATE_LIMIT;

  // Batch size
  private batchSize: number;

  // Stats
  private totalAnchors: number = 0;
  private totalTokensIssued: number = 0;
  private p99Latencies: number[] = [];

  constructor(config: {
    batchSize?: number;
    vdfT?: number;
    vdfWorkers?: number;
    anchor: PolygonAnchor | MockPolygonAnchor;
    useDrand?: boolean;
    rateLimitPerMin?: number;
  }) {
    super();

    const {
      batchSize = 65536,
      vdfT = 4,
      vdfWorkers = 3,
      anchor,
      useDrand = false,
      rateLimitPerMin = DEFAULT_RATE_LIMIT,
    } = config;

    this.batchSize = batchSize;
    this.rateLimitMax = rateLimitPerMin;

    const drandClient = useDrand ? new DrandClient() : undefined;
    this.generator = new BatchGenerator(batchSize, vdfT, drandClient);
    this.anchor = anchor;

    // Initialize shared pool
    this.sharedPool = new TokenPool(batchSize);

    // Initialize VDF worker pool
    this.vdfWorkers = Array.from({ length: vdfWorkers }, (_, i) => ({
      id: i,
      busy: false,
      currentBatchId: null,
      cyclesCompleted: 0,
      assignedClientId: null,
    }));

    // Wire batch events
    this.generator.on('batchGenerated', (batch: MerkleBatch) => {
      this.handleBatchGenerated(batch);
    });

    this.generator.on('batchReady', (batch: MerkleBatch) => {
      this.handleBatchReady(batch);
    });

    logger.info(
      `PoolManager v2 initialized: ${vdfWorkers} VDF workers, ` +
      `batchSize=${batchSize}, T=${vdfT}s, ` +
      `sharedPool=enabled, rateLimit=${rateLimitPerMin}/min`
    );
  }

  // ============================================================
  // SHARED POOL PRE-WARMING
  // ============================================================

  async preWarmSharedPool(): Promise<void> {
    logger.info(`Shared pool: pre-warming ${SHARED_POOL_PRE_WARM_BATCHES} batches (${SHARED_POOL_PRE_WARM_BATCHES * this.batchSize} tokens)...`);

    const promises: Promise<void>[] = [];
    for (let i = 0; i < SHARED_POOL_PRE_WARM_BATCHES; i++) {
      promises.push(this.generateSharedPoolBatch(`pre-warm-${i}`));
    }

    await Promise.all(promises);

    logger.info(
      `Shared pool: pre-warm complete — ${this.sharedPool.depth} tokens ready, ` +
      `${this.sharedPoolBatchIds.size} active batches`
    );
  }

  private async generateSharedPoolBatch(reason: string): Promise<void> {
    try {
      logger.info(`Shared pool: generating batch (reason=${reason})`);
      const batch = await this.generator.generateBatch(SHARED_POOL_CLIENT_ID);
      this.sharedPoolBatchIds.add(batch.batchId);

      // Persist shared pool client + batch to DB
      if (isDatabaseConnected()) {
        // Ensure the shared pool pseudo-client exists
        await repo.upsertClient({
          clientId: SHARED_POOL_CLIENT_ID,
          name: 'Shared Pool',
          vertical: 'agent',
        }).catch(() => {}); // ignore if already exists

        await repo.insertBatch(batch, SHARED_POOL_CLIENT_ID);
        // Skip bulk token insert during pre-warm — too slow for 65K rows
        // Tokens will be tracked in-memory from the pool
      }

      // Inject tokens into shared pool IMMEDIATELY (don't wait for anchor)
      this.generator.confirmAnchor(batch.batchId, 'pending', 0);
      // handleBatchReady will fire and inject into the pool

      // Anchor to Polygon ASYNC — tokens are already usable
      this.anchorBatchAsync(batch.batchId, batch.merkleRoot, batch.batchSize, SHARED_POOL_CLIENT_ID);
    } catch (err: any) {
      logger.error(`Shared pool batch failed: ${err.message}`);
    }
  }

  private checkSharedPoolRefill(): void {
    const totalCapacity = this.sharedPoolTotalInjected || (this.batchSize * SHARED_POOL_PRE_WARM_BATCHES);
    const fillRatio = this.sharedPool.depth / Math.max(1, totalCapacity);

    // Count existing shared pool refill entries in queue
    const pendingRefills = this.refillQueue.filter(q => q.clientId === SHARED_POOL_CLIENT_ID).length;
    const activeRefills = this.sharedPoolBatchIds.size;
    const totalPending = pendingRefills + activeRefills;

    if (fillRatio < SHARED_POOL_CRITICAL_THRESHOLD && totalPending < 3) {
      // Emergency: queue up to 3 batches
      const toQueue = 3 - totalPending;
      for (let i = 0; i < toQueue; i++) {
        this.refillQueue.push({ clientId: SHARED_POOL_CLIENT_ID, priority: 10 });
      }
      this.refillQueue.sort((a, b) => b.priority - a.priority);
      logger.info(`Shared pool: CRITICAL refill — queued ${toQueue} batches (fill=${(fillRatio * 100).toFixed(1)}%)`);

      if (!this.isProcessingQueue) {
        this.processRefillQueue();
      }
    } else if (fillRatio < SHARED_POOL_REFILL_THRESHOLD && totalPending < 1) {
      this.refillQueue.push({ clientId: SHARED_POOL_CLIENT_ID, priority: 8 });
      this.refillQueue.sort((a, b) => b.priority - a.priority);
      logger.info(`Shared pool: refill queued (fill=${(fillRatio * 100).toFixed(1)}%)`);

      if (!this.isProcessingQueue) {
        this.processRefillQueue();
      }
    }
  }

  // ============================================================
  // ASYNC ANCHOR (fire-and-forget with retry)
  // ============================================================

  private async anchorBatchAsync(
    batchId: string, merkleRoot: string, batchSize: number, clientId: string, retries = 3
  ): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const anchorResult = await this.anchor.anchorBatch({ batchId, merkleRoot, batchSize, clientId });
        this.generator.confirmAnchor(batchId, anchorResult.txHash, anchorResult.blockNumber);
        if (isDatabaseConnected()) {
          await repo.updateBatchAnchored(batchId, anchorResult.txHash, anchorResult.blockNumber).catch(() => {});
        }
        this.totalAnchors++;
        this.emit('anchorComplete', { batchId, clientId, txHash: anchorResult.txHash, blockNumber: anchorResult.blockNumber, polygonScanUrl: anchorResult.polygonScanUrl });
        logger.info(`Async anchor success: ${batchId} (attempt ${attempt})`);
        return;
      } catch (err: any) {
        logger.warn(`Async anchor attempt ${attempt}/${retries} failed for ${batchId}: ${err.message}`);
        if (attempt < retries) await new Promise(r => setTimeout(r, 5000 * attempt));
      }
    }
    logger.error(`Async anchor gave up for ${batchId} after ${retries} attempts. Tokens still usable, no on-chain proof yet.`);
  }

  // ============================================================
  // RATE LIMITING
  // ============================================================

  private checkRateLimit(agentId: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    let entry = this.rateLimits.get(agentId);

    if (!entry || (now - entry.windowStart) >= RATE_LIMIT_WINDOW_MS) {
      // New window
      entry = { count: 0, windowStart: now };
      this.rateLimits.set(agentId, entry);
    }

    const remaining = Math.max(0, this.rateLimitMax - entry.count);
    const resetMs = entry.windowStart + RATE_LIMIT_WINDOW_MS - now;

    if (entry.count >= this.rateLimitMax) {
      return { allowed: false, remaining: 0, resetMs };
    }

    entry.count++;
    return { allowed: true, remaining: remaining - 1, resetMs };
  }

  getRateLimitInfo(agentId: string): { remaining: number; resetMs: number; limit: number } {
    const now = Date.now();
    const entry = this.rateLimits.get(agentId);

    if (!entry || (now - entry.windowStart) >= RATE_LIMIT_WINDOW_MS) {
      return { remaining: this.rateLimitMax, resetMs: RATE_LIMIT_WINDOW_MS, limit: this.rateLimitMax };
    }

    return {
      remaining: Math.max(0, this.rateLimitMax - entry.count),
      resetMs: entry.windowStart + RATE_LIMIT_WINDOW_MS - now,
      limit: this.rateLimitMax,
    };
  }

  // ============================================================
  // CLIENT REGISTRATION
  // ============================================================

  hasClient(clientId: string): boolean {
    return this.clients.has(clientId);
  }

  registerClient(params: {
    clientId: string;
    name?: string;
    vertical: 'slot' | 'game' | 'lottery' | 'agent' | 'npc';
    initialPoolSize?: number;
    refillThreshold?: number;
    agentName?: string;
    framework?: string;
    dedicatedPool?: boolean;  // force dedicated pool even for agent/npc
  }): void {
    const { clientId, vertical, dedicatedPool } = params;
    const useSharedPool = !dedicatedPool && SHARED_POOL_VERTICALS.has(vertical);

    // Persist client to DB if available
    if (isDatabaseConnected()) {
      repo.upsertClient({
        clientId,
        name: params.name || clientId,
        vertical,
        refillThreshold: params.refillThreshold,
      }).catch(err => logger.error(`DB: client upsert failed: ${err.message}`));
    }

    // Threshold tuned by stress test:
    // Slot clients need 42% (high burst multiplier)
    // Others can use 35%
    const defaultThreshold = vertical === 'slot' ? 0.42 : 0.35;

    const pool: ClientPool = {
      clientId,
      vertical,
      pool: useSharedPool ? this.sharedPool : new TokenPool(this.batchSize),
      batchSize: this.batchSize,
      refillThreshold: params.refillThreshold ?? defaultThreshold,
      inBurst: false,
      tokensIssued: 0,
      lastRefillAt: new Date(),
      activeBatchIds: new Set(),
      useSharedPool,
    };

    this.clients.set(clientId, pool);

    if (useSharedPool) {
      logger.info(`Client registered: ${clientId} (${vertical}) → SHARED POOL`);
    } else {
      logger.info(`Client registered: ${clientId} (${vertical}) → DEDICATED POOL threshold=${defaultThreshold}`);
      // Pre-warm dedicated pool
      this.triggerRefill(clientId, 'initial');
    }
  }

  // ============================================================
  // TOKEN DISPENSING
  // ============================================================

  async getTokens(request: TokenRequest): Promise<TokenResponse> {
    const start = Date.now();
    const clientPool = this.clients.get(request.clientId);

    if (!clientPool) {
      throw new Error(`Client ${request.clientId} not registered`);
    }

    // Shared pool path
    if (clientPool.useSharedPool) {
      return this.getTokensFromShared(request, clientPool, start);
    }

    // Dedicated pool path (original behavior)
    return this.getTokensFromDedicated(request, clientPool, start);
  }

  private async getTokensFromShared(
    request: TokenRequest,
    clientPool: ClientPool,
    start: number
  ): Promise<TokenResponse> {
    // Rate limit check
    const rateCheck = this.checkRateLimit(request.clientId);
    if (!rateCheck.allowed) {
      const err: any = new Error(`Rate limit exceeded for ${request.clientId}`);
      err.code = 'RATE_LIMITED';
      err.retryAfterMs = rateCheck.resetMs;
      err.remaining = 0;
      err.resetMs = rateCheck.resetMs;
      throw err;
    }

    // Consume from shared pool
    const tokens = this.sharedPool.consume(request.clientId, request.quantity);

    if (tokens.length < request.quantity) {
      logger.warn(
        `Shared pool insufficient: wanted ${request.quantity}, got ${tokens.length}`
      );
      this.checkSharedPoolRefill();

      // On-demand fallback: generate remaining tokens synchronously
      if (features.onDemandFallback) {
        const remaining = request.quantity - tokens.length;
        const onDemandTokens = await this.generateOnDemand(request.clientId, remaining);
        tokens.push(...onDemandTokens);
      }
    } else {
      // Proactively check refill threshold
      this.checkSharedPoolRefill();
    }

    // Track per-agent stats
    clientPool.tokensIssued += tokens.length;
    this.sharedPoolTokensIssued += tokens.length;
    this.totalTokensIssued += tokens.length;

    const latencyMs = Date.now() - start;
    this.p99Latencies.push(latencyMs);
    if (this.p99Latencies.length > 10000) this.p99Latencies.shift();

    const response = this.buildResponse(tokens, request, latencyMs);

    // Persist consumed tokens to DB async (non-blocking)
    this.persistConsumedTokens(tokens, request.clientId);

    return response;
  }

  private async getTokensFromDedicated(
    request: TokenRequest,
    clientPool: ClientPool,
    start: number
  ): Promise<TokenResponse> {
    const tokens = clientPool.pool.consume(request.clientId, request.quantity);

    if (tokens.length < request.quantity) {
      logger.warn(
        `Pool insufficient for ${request.clientId}: ` +
        `wanted ${request.quantity}, got ${tokens.length}`
      );
      this.triggerRefill(request.clientId, 'exhaustion');

      // On-demand fallback: generate remaining tokens synchronously
      if (features.onDemandFallback) {
        const remaining = request.quantity - tokens.length;
        const onDemandTokens = await this.generateOnDemand(request.clientId, remaining);
        tokens.push(...onDemandTokens);
      }
    }

    // Check if refill needed
    const fillPct = clientPool.pool.fillPercent;
    if (fillPct < clientPool.refillThreshold * 100) {
      this.triggerRefill(request.clientId, 'threshold');
    }

    clientPool.tokensIssued += tokens.length;
    this.totalTokensIssued += tokens.length;

    const latencyMs = Date.now() - start;
    this.p99Latencies.push(latencyMs);
    if (this.p99Latencies.length > 10000) this.p99Latencies.shift();

    const response = this.buildResponse(tokens, request, latencyMs);

    // Persist consumed tokens to DB async (non-blocking)
    this.persistConsumedTokens(tokens, request.clientId);

    return response;
  }

  // ============================================================
  // PERSIST CONSUMED TOKENS (async, non-blocking)
  // Only writes tokens when they're actually served — not during pre-warm
  // ============================================================

  private async persistConsumedTokens(tokens: RNToken[], clientId: string): Promise<void> {
    if (!isDatabaseConnected() || tokens.length === 0) return;

    try {
      const records = tokens.map(t => ({
        leafHash: t.leafHash,
        nodeId: t.nodeId,
        nodeIndex: t.nodeIndex,
        batchId: t.batchId,
        value: t.value,
      }));

      await repo.insertTokensBulk(records);
    } catch (err: any) {
      logger.warn(`DB: failed to persist ${tokens.length} consumed tokens for ${clientId}: ${err.message}`);
    }
  }

  private buildResponse(tokens: RNToken[], request: TokenRequest, latencyMs: number): TokenResponse {
    const range = request.range ?? { min: 0, max: 1000000 };
    const rangeSize = range.max - range.min;

    const responseTokens = tokens.map(token => {
      const batch = this.generator.getBatch(token.batchId);
      const proof = batch
        ? this.generator.getProof(batch, token.nodeIndex)
        : null;

      return {
        value: Math.floor(token.value * rangeSize) + range.min,
        leafHash: token.leafHash,
        nodeId: token.nodeId,
        batchId: token.batchId,
        proof: proof!,
      };
    });

    return {
      tokens: responseTokens,
      latencyMs,
      servedFromPool: tokens.length > 0,
    };
  }

  // ============================================================
  // REFILL PIPELINE
  // ============================================================

  private triggerRefill(clientId: string, reason: string): void {
    // Don't queue duplicates
    if (this.refillQueue.some(q => q.clientId === clientId)) return;

    const priority = reason === 'exhaustion' ? 10 : reason === 'threshold' ? 5 : 1;
    this.refillQueue.push({ clientId, priority });
    this.refillQueue.sort((a, b) => b.priority - a.priority);

    logger.debug(`Refill queued for ${clientId} reason=${reason} priority=${priority}`);

    if (!this.isProcessingQueue) {
      this.processRefillQueue();
    }
  }

  private async processRefillQueue(): Promise<void> {
    this.isProcessingQueue = true;

    while (this.refillQueue.length > 0) {
      const freeWorker = this.vdfWorkers.find(w => !w.busy);
      if (!freeWorker) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      const next = this.refillQueue.shift();
      if (!next) break;

      freeWorker.busy = true;
      freeWorker.assignedClientId = next.clientId;

      if (next.clientId === SHARED_POOL_CLIENT_ID) {
        // Shared pool refill
        this.generateSharedPoolBatch('threshold-refill')
          .then(() => {
            freeWorker.busy = false;
            freeWorker.currentBatchId = null;
            freeWorker.assignedClientId = null;
            freeWorker.cyclesCompleted++;
            if (this.refillQueue.length > 0 && !this.isProcessingQueue) {
              this.processRefillQueue();
            }
          })
          .catch(err => {
            logger.error(`Shared pool refill failed: ${err.message}`);
            freeWorker.busy = false;
            freeWorker.currentBatchId = null;
            freeWorker.assignedClientId = null;
          });
      } else {
        // Dedicated pool refill
        this.runBatchForClient(next.clientId, freeWorker)
          .catch(err => logger.error(`Batch failed for ${next.clientId}: ${err.message}`));
      }
    }

    this.isProcessingQueue = false;
  }

  private async runBatchForClient(
    clientId: string,
    worker: VDFWorker
  ): Promise<void> {
    const clientPool = this.clients.get(clientId);
    if (!clientPool) { worker.busy = false; return; }

    try {
      logger.info(`Worker ${worker.id}: generating batch for ${clientId}`);

      const batch = await this.generator.generateBatch(clientId);
      worker.currentBatchId = batch.batchId;
      clientPool.activeBatchIds.add(batch.batchId);

      if (isDatabaseConnected()) {
        await repo.insertBatch(batch, clientId);
        const tokenRecords = batch.leaves.map((leafHash, i) => ({
          leafHash,
          nodeId: batch.nodeIds[i],
          nodeIndex: i,
          batchId: batch.batchId,
          value: parseInt(leafHash.slice(0, 8), 16) / 0xffffffff,
        }));
        await repo.insertTokensBulk(tokenRecords);
      }

      // Inject tokens into pool IMMEDIATELY (don't block on anchor)
      this.generator.confirmAnchor(batch.batchId, 'pending', 0);
      worker.cyclesCompleted++;

      // Anchor to Polygon ASYNC — tokens already usable
      logger.info(`Worker ${worker.id}: async anchoring batch ${batch.batchId} to Polygon`);
      this.anchorBatchAsync(batch.batchId, batch.merkleRoot, batch.batchSize, clientId);

    } finally {
      worker.busy = false;
      worker.currentBatchId = null;
      worker.assignedClientId = null;

      if (this.refillQueue.length > 0 && !this.isProcessingQueue) {
        this.processRefillQueue();
      }
    }
  }

  private handleBatchGenerated(batch: MerkleBatch): void {
    logger.debug(`Batch generated: ${batch.batchId} root=${batch.merkleRoot.slice(0, 12)}...`);
    this.emit('batchGenerated', batch);
  }

  private handleBatchReady(batch: MerkleBatch): void {
    // Check if this is a shared pool batch
    if (this.sharedPoolBatchIds.has(batch.batchId)) {
      this.sharedPool.injectBatch(batch);
      this.sharedPoolBatchIds.delete(batch.batchId);
      this.sharedPoolTotalInjected += batch.batchSize;
      logger.info(
        `Shared pool injected: +${batch.batchSize} tokens ` +
        `(pool depth: ${this.sharedPool.depth})`
      );
      this.emit('poolRefilled', {
        clientId: SHARED_POOL_CLIENT_ID,
        batchId: batch.batchId,
        depth: this.sharedPool.depth,
      });
      return;
    }

    // Find which dedicated client this batch belongs to
    for (const [clientId, clientPool] of this.clients.entries()) {
      if (clientPool.activeBatchIds.has(batch.batchId)) {
        clientPool.pool.injectBatch(batch);
        clientPool.activeBatchIds.delete(batch.batchId);
        clientPool.lastRefillAt = new Date();
        logger.info(
          `Pool injected for ${clientId}: +${batch.batchSize} tokens ` +
          `(pool depth: ${clientPool.pool.depth})`
        );
        this.emit('poolRefilled', { clientId, batchId: batch.batchId, depth: clientPool.pool.depth });
        break;
      }
    }
  }

  // ============================================================
  // ON-DEMAND GENERATION (fallback when pool exhausted)
  // ============================================================

  private async generateOnDemand(clientId: string, quantity: number): Promise<RNToken[]> {
    const start = Date.now();
    const batchId = `ondemand-${randomBytes(8).toString('hex')}`;

    // Generate leaf hashes for just the requested quantity
    const rnGenParam = createHash('sha256')
      .update(randomBytes(64).toString('hex') + Date.now().toString())
      .digest('hex');

    const nodeIds = Array.from({ length: quantity }, (_, i) =>
      `node-${String(i).padStart(6, '0')}-${batchId.slice(9, 17)}`
    );

    const leaves = nodeIds.map(nodeId =>
      MerkleTreeBuilder.sha256(rnGenParam + nodeId)
    );

    // Build a small Merkle tree so proofs are valid
    const { root: merkleRoot, levels } = await MerkleTreeBuilder.buildTree(leaves);

    const batch: MerkleBatch = {
      batchId,
      rnGenParam,
      blockParam: createHash('sha256').update(randomBytes(32)).digest('hex'),
      vdfOutput: rnGenParam, // simplified for on-demand
      leaves,
      merkleRoot,
      levels,
      nodeIds,
      batchSize: quantity,
      createdAt: new Date(),
      tokensConsumed: 0,
      status: 'ready',
    };

    // Register batch in generator so proofs can be retrieved later
    this.generator.confirmAnchor(batchId, 'on-demand', 0);
    // Store in completed batches via a direct generateBatch-like flow isn't possible,
    // so we store it as a completed batch by emitting batchReady
    // Instead, directly put it in the generator's memory:
    (this.generator as any).completedBatches.push(batch);

    const tokens: RNToken[] = leaves.map((leafHash, i) => ({
      leafHash,
      nodeId: nodeIds[i],
      nodeIndex: i,
      batchId,
      value: parseInt(leafHash.slice(0, 8), 16) / 0xffffffff,
      consumed: true,
      consumedAt: new Date(),
      consumedBy: clientId,
    }));

    const elapsed = Date.now() - start;
    logger.warn(
      `Pool exhausted for ${clientId}, generating on-demand (${quantity} tokens, ~${elapsed}ms)`
    );

    // Anchor on-demand batch async (non-blocking)
    this.anchorBatchAsync(batchId, merkleRoot, quantity, clientId);

    // Trigger pool refill so this doesn't happen again
    this.checkSharedPoolRefill();

    return tokens;
  }

  // ============================================================
  // STATS
  // ============================================================

  getStats() {
    const clientStats = Array.from(this.clients.entries()).map(([id, cp]) => ({
      clientId: id,
      vertical: cp.vertical,
      poolMode: cp.useSharedPool ? 'shared' : 'dedicated',
      poolDepth: cp.useSharedPool ? this.sharedPool.depth : cp.pool.depth,
      fillPercent: cp.useSharedPool ? this.getSharedPoolFillPercent() : cp.pool.fillPercent,
      tokensIssued: cp.tokensIssued,
      activeBatches: cp.activeBatchIds.size,
    }));

    const sortedLatencies = [...this.p99Latencies].sort((a, b) => a - b);
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] ?? 0;

    return {
      totalAnchors: this.totalAnchors,
      totalTokensIssued: this.totalTokensIssued,
      p99LatencyMs: p99,
      sharedPool: {
        depth: this.sharedPool.depth,
        totalInjected: this.sharedPoolTotalInjected,
        tokensIssued: this.sharedPoolTokensIssued,
        fillPercent: this.getSharedPoolFillPercent(),
        activeBatches: this.sharedPoolBatchIds.size,
      },
      vdfWorkers: this.vdfWorkers.map(w => ({
        id: w.id,
        busy: w.busy,
        cyclesCompleted: w.cyclesCompleted,
        currentClient: w.assignedClientId,
      })),
      refillQueueDepth: this.refillQueue.length,
      clients: clientStats,
      generatorStats: this.generator.stats,
    };
  }

  private getSharedPoolFillPercent(): number {
    if (this.sharedPoolTotalInjected === 0) return 0;
    return (this.sharedPool.depth / this.sharedPoolTotalInjected) * 100;
  }
}
