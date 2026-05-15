/**
 * OpenRNG REST API
 *
 * Endpoints:
 * POST /v1/tokens/request   — get verified RN tokens
 * POST /v1/tokens/verify    — verify any token against chain
 * GET  /v1/batch/:batchId   — get batch info + root hash
 * GET  /v1/health           — system health check
 * POST /v1/clients/register — register a new client tenant
 * GET  /v1/stats            — operator dashboard stats
 */

import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PoolManager } from '../rng/pool-manager';
import { MerkleTreeBuilder } from '../rng/engine';
import { isDatabaseConnected } from '../db/index';
import * as repo from '../db/repositories';
import { logger } from '../utils/logger';

// ============================================================
// REQUEST SCHEMAS (Zod validation)
// ============================================================

const TokenRequestSchema = z.object({
  client_id: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(10000).default(1),
  range: z.object({
    min: z.number().int().min(0),
    max: z.number().int().max(10_000_000),
  }).optional(),
  vertical: z.enum(['slot', 'game', 'lottery', 'agent', 'npc']).optional(),
  idempotency_key: z.string().optional(),
});

const VerifyRequestSchema = z.object({
  leaf_hash: z.string().length(64),
  batch_id: z.string().min(1),
});

const RegisterClientSchema = z.object({
  client_id: z.string().min(1).max(64),
  name: z.string().min(1).max(128),
  vertical: z.enum(['slot', 'game', 'lottery', 'agent', 'npc']),
  refill_threshold: z.number().min(0.1).max(0.8).optional(),
  agent_name: z.string().max(128).optional(),
  framework: z.enum(['langchain', 'crewai', 'autogpt', 'openclaw', 'custom']).optional(),
});

const BatchTokenRequestSchema = z.object({
  client_id: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(10000),
  range: z.object({
    min: z.number().int().min(0),
    max: z.number().int().max(10_000_000),
  }).optional(),
  vertical: z.enum(['slot', 'game', 'lottery', 'agent', 'npc']).optional(),
});

// ============================================================
// ROUTER FACTORY
// ============================================================

export function createRouter(poolManager: PoolManager) {
  const router = express.Router();

  // ── Auth middleware ──────────────────────────────────────
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['x-api-key'] as string;
    if (!key || key !== process.env.API_SECRET) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    next();
  };

  // ============================================================
  // GET /v1/health
  // Public — no auth required
  // ============================================================
  router.get('/health', async (_req, res) => {
    try {
      const stats = poolManager.getStats();
      const healthy = stats.clients.every(c => c.fillPercent > 5);

      res.json({
        status: healthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        pool: {
          clients: stats.clients.length,
          totalAnchors: stats.totalAnchors,
          p99LatencyMs: stats.p99LatencyMs,
        },
        blockchain: 'polygon-amoy-testnet',
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // ============================================================
  // POST /v1/clients/register
  // Register a new tenant
  // ============================================================
  router.post('/clients/register', requireAuth, (req, res) => {
    const parsed = RegisterClientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { client_id, vertical, refill_threshold } = parsed.data;

    try {
      poolManager.registerClient({
        clientId: client_id,
        name: parsed.data.name,
        vertical,
        refillThreshold: refill_threshold,
      });

      res.status(201).json({
        client_id,
        vertical,
        status: 'registered',
        pool_status: 'warming',
        message: 'Client registered. Pool pre-warming — first tokens available in ~10s.',
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ============================================================
  // Auto-registration helper
  // If a client_id doesn't exist, auto-register it
  // ============================================================
  const ensureClient = (clientId: string, vertical?: string, agentName?: string, framework?: string) => {
    if (!poolManager.hasClient(clientId)) {
      poolManager.registerClient({
        clientId,
        name: agentName || clientId,
        vertical: (vertical as any) || 'agent',
        agentName,
        framework,
      });
      logger.info(`Auto-registered client: ${clientId} vertical=${vertical || 'agent'}`);
    }
  };

  // ============================================================
  // Helper: add rate limit headers to response
  // ============================================================
  const addRateLimitHeaders = (res: Response, clientId: string) => {
    const info = poolManager.getRateLimitInfo(clientId);
    res.set('X-RateLimit-Limit', String(info.limit));
    res.set('X-RateLimit-Remaining', String(info.remaining));
    res.set('X-RateLimit-Reset', String(Math.ceil(info.resetMs / 1000)));
  };

  // ============================================================
  // POST /v1/tokens/request
  // Primary endpoint — returns tokens with Merkle proofs
  // ============================================================
  router.post('/tokens/request', requireAuth, async (req, res) => {
    const parsed = TokenRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { client_id, quantity, range, vertical, idempotency_key } = parsed.data;

    // Auto-register if unknown (defaults to shared pool for agent/npc)
    ensureClient(client_id, vertical);

    try {
      const result = await poolManager.getTokens({
        clientId: client_id,
        quantity,
        range,
        vertical,
      });

      // Add rate limit headers
      addRateLimitHeaders(res, client_id);

      res.json({
        tokens: result.tokens.map(t => ({
          value: t.value,
          leaf_hash: t.leafHash,
          node_id: t.nodeId,
          batch_id: t.batchId,
          merkle_proof: t.proof ? {
            root: t.proof.root,
            proof_path: t.proof.proofPath,
            leaf_index: t.proof.leafIndex,
            anchor_tx: t.proof.anchorTxHash,
            anchor_block: t.proof.anchorBlockNumber,
            polygon_scan: t.proof.anchorTxHash
              ? `https://amoy.polygonscan.com/tx/${t.proof.anchorTxHash}`
              : null,
          } : null,
        })),
        meta: {
          quantity_requested: quantity,
          quantity_served: result.tokens.length,
          latency_ms: result.latencyMs,
          served_from_pool: result.servedFromPool,
          idempotency_key: idempotency_key || null,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (err: any) {
      if (err.code === 'RATE_LIMITED') {
        addRateLimitHeaders(res, client_id);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: err.message,
          retry_after_ms: err.retryAfterMs,
          retry_after_sec: Math.ceil(err.retryAfterMs / 1000),
        });
      }
      logger.error(`Token request failed for ${client_id}: ${err.message}`);
      res.status(500).json({ error: 'Token generation failed', message: err.message });
    }
  });

  // ============================================================
  // POST /v1/tokens/batch
  // Bulk token request — more efficient than N individual calls
  // ============================================================
  router.post('/tokens/batch', requireAuth, async (req, res) => {
    const parsed = BatchTokenRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { client_id, quantity, range, vertical } = parsed.data;

    // Auto-register if unknown
    ensureClient(client_id, vertical);

    try {
      const result = await poolManager.getTokens({
        clientId: client_id,
        quantity,
        range,
        vertical,
      });

      // Add rate limit headers
      addRateLimitHeaders(res, client_id);

      // Return compact batch format
      res.json({
        values: result.tokens.map(t => t.value),
        proofs: result.tokens.map(t => ({
          leaf_hash: t.leafHash,
          batch_id: t.batchId,
          merkle_root: t.proof?.root || null,
          anchor_tx: t.proof?.anchorTxHash || null,
          polygon_scan: t.proof?.anchorTxHash
            ? `https://amoy.polygonscan.com/tx/${t.proof.anchorTxHash}`
            : null,
        })),
        meta: {
          quantity_requested: quantity,
          quantity_served: result.tokens.length,
          latency_ms: result.latencyMs,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (err: any) {
      if (err.code === 'RATE_LIMITED') {
        addRateLimitHeaders(res, client_id);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: err.message,
          retry_after_ms: err.retryAfterMs,
          retry_after_sec: Math.ceil(err.retryAfterMs / 1000),
        });
      }
      logger.error(`Batch token request failed for ${client_id}: ${err.message}`);
      res.status(500).json({ error: 'Batch token generation failed', message: err.message });
    }
  });

  // ============================================================
  // POST /v1/tokens/verify
  // Verify any token against its on-chain Merkle root
  // Public — verification should be open to anyone
  // ============================================================
  router.post('/tokens/verify', async (req, res) => {
    const parsed = VerifyRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }

    const { leaf_hash, batch_id } = parsed.data;

    try {
      // Try DB-backed verification first
      if (isDatabaseConnected()) {
        const token = await repo.getToken(leaf_hash);
        if (!token) {
          return res.status(404).json({
            verified: false,
            error: 'Token not found',
            leaf_hash,
            batch_id,
          });
        }

        if (token.batch_id !== batch_id) {
          return res.status(400).json({
            verified: false,
            error: 'Token does not belong to specified batch',
            leaf_hash,
            batch_id,
          });
        }

        const batch = await repo.getBatch(batch_id);
        if (!batch) {
          return res.status(404).json({
            verified: false,
            error: 'Batch not found',
            batch_id,
          });
        }

        // Reconstruct proof from in-memory batch if available
        const memBatch = (poolManager as any).generator?.getBatch(batch_id);
        let proofValid: boolean | null = null;
        let proofPath: any[] | null = null;

        if (memBatch && memBatch.levels) {
          proofPath = MerkleTreeBuilder.getProof(memBatch.leaves, token.node_index, memBatch.levels);
          proofValid = MerkleTreeBuilder.verifyProof(leaf_hash, proofPath, memBatch.merkleRoot);
        }

        return res.json({
          verified: true,
          leaf_hash,
          batch_id,
          token: {
            node_id: token.node_id,
            node_index: token.node_index,
            value: token.value,
            consumed: token.consumed,
            consumed_at: token.consumed_at,
            consumed_by: token.consumed_by,
          },
          batch: {
            merkle_root: batch.merkle_root,
            status: batch.status,
            anchor_tx_hash: batch.anchor_tx_hash,
            anchor_block_number: batch.anchor_block_number,
            polygon_scan: batch.anchor_tx_hash
              ? `https://amoy.polygonscan.com/tx/${batch.anchor_tx_hash}`
              : null,
          },
          proof: proofValid !== null ? {
            valid: proofValid,
            proof_path: proofPath,
          } : { note: 'Proof reconstruction requires in-memory batch data' },
          polygon_contract: process.env.MERKLE_ANCHOR_CONTRACT,
          timestamp: new Date().toISOString(),
        });
      }

      // Fallback: in-memory only verification
      res.json({
        leaf_hash,
        batch_id,
        database: false,
        note: 'Database not available. Full verification requires PostgreSQL.',
        polygon_contract: process.env.MERKLE_ANCHOR_CONTRACT,
        timestamp: new Date().toISOString(),
      });

    } catch (err: any) {
      res.status(500).json({ error: 'Verification failed', message: err.message });
    }
  });

  // ============================================================
  // GET /v1/stats
  // Operator dashboard
  // ============================================================
  router.get('/stats', requireAuth, (_req, res) => {
    const stats = poolManager.getStats();
    res.json({
      ...stats,
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================
  // GET /v1/batch/:batchId
  // Get batch metadata + PolygonScan link
  // ============================================================
  router.get('/batch/:batchId', requireAuth, (req, res) => {
    const { batchId } = req.params;
    const stats = poolManager.getStats();

    res.json({
      batch_id: batchId,
      polygon_scan: `https://amoy.polygonscan.com/address/${process.env.MERKLE_ANCHOR_CONTRACT}`,
      note: 'Use getBatchRoot(batchId) on the contract to verify the Merkle root on-chain',
      stats: stats.generatorStats,
    });
  });

  return router;
}
