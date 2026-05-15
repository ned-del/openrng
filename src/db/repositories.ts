/**
 * OpenRNG — Database Repositories
 *
 * CRUD operations for batches, tokens, and clients.
 * All operations are no-ops when the database is not connected.
 */

import { Pool } from 'pg';
import { getPool, isDatabaseConnected } from './index';
import { MerkleBatch, RNToken } from '../rng/engine';
import { logger } from '../utils/logger';

// ============================================================
// CLIENT REPOSITORY
// ============================================================

export interface ClientRecord {
  client_id: string;
  name: string;
  vertical: string;
  refill_threshold: number;
  created_at: Date;
}

export async function upsertClient(params: {
  clientId: string;
  name?: string;
  vertical: string;
  refillThreshold?: number;
}): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    await pool.query(
      `INSERT INTO clients (client_id, name, vertical, refill_threshold)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (client_id) DO UPDATE SET
         vertical = EXCLUDED.vertical,
         refill_threshold = EXCLUDED.refill_threshold`,
      [params.clientId, params.name || params.clientId, params.vertical, params.refillThreshold || 0.35]
    );
    return true;
  } catch (err: any) {
    logger.error(`DB: failed to upsert client ${params.clientId}: ${err.message}`);
    return false;
  }
}

export async function getClient(clientId: string): Promise<ClientRecord | null> {
  const pool = getPool();
  if (!pool) return null;

  try {
    const result = await pool.query('SELECT * FROM clients WHERE client_id = $1', [clientId]);
    return result.rows[0] || null;
  } catch (err: any) {
    logger.error(`DB: failed to get client ${clientId}: ${err.message}`);
    return null;
  }
}

// ============================================================
// BATCH REPOSITORY
// ============================================================

export async function insertBatch(batch: MerkleBatch, clientId: string): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    await pool.query(
      `INSERT INTO batches (batch_id, merkle_root, vdf_output, rn_gen_param, block_param,
         batch_size, client_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (batch_id) DO NOTHING`,
      [
        batch.batchId, batch.merkleRoot, batch.vdfOutput, batch.rnGenParam,
        batch.blockParam, batch.batchSize, clientId, batch.status, batch.createdAt,
      ]
    );
    return true;
  } catch (err: any) {
    logger.error(`DB: failed to insert batch ${batch.batchId}: ${err.message}`);
    return false;
  }
}

export async function updateBatchAnchored(
  batchId: string,
  txHash: string,
  blockNumber: number
): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    await pool.query(
      `UPDATE batches SET
         status = 'ready',
         anchor_tx_hash = $2,
         anchor_block_number = $3,
         anchored_at = NOW()
       WHERE batch_id = $1`,
      [batchId, txHash, blockNumber]
    );
    return true;
  } catch (err: any) {
    logger.error(`DB: failed to update batch anchor ${batchId}: ${err.message}`);
    return false;
  }
}

export async function getBatch(batchId: string): Promise<any | null> {
  const pool = getPool();
  if (!pool) return null;

  try {
    const result = await pool.query('SELECT * FROM batches WHERE batch_id = $1', [batchId]);
    return result.rows[0] || null;
  } catch (err: any) {
    logger.error(`DB: failed to get batch ${batchId}: ${err.message}`);
    return null;
  }
}

// ============================================================
// TOKEN REPOSITORY
// ============================================================

export async function insertTokensBulk(
  tokens: Array<{ leafHash: string; nodeId: string; nodeIndex: number; batchId: string; value: number }>
): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  if (tokens.length === 0) return true;

  try {
    // Use a single multi-value INSERT for efficiency
    const chunkSize = 1000;
    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);
      const values: any[] = [];
      const placeholders: string[] = [];

      chunk.forEach((t, idx) => {
        const offset = idx * 5;
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
        values.push(t.leafHash, t.nodeId, t.nodeIndex, t.batchId, t.value);
      });

      await pool.query(
        `INSERT INTO tokens (leaf_hash, node_id, node_index, batch_id, value)
         VALUES ${placeholders.join(', ')}
         ON CONFLICT (leaf_hash) DO NOTHING`,
        values
      );
    }

    logger.debug(`DB: inserted ${tokens.length} tokens`);
    return true;
  } catch (err: any) {
    logger.error(`DB: failed to insert tokens: ${err.message}`);
    return false;
  }
}

export async function getToken(leafHash: string): Promise<any | null> {
  const pool = getPool();
  if (!pool) return null;

  try {
    const result = await pool.query(
      'SELECT * FROM tokens WHERE leaf_hash = $1',
      [leafHash]
    );
    return result.rows[0] || null;
  } catch (err: any) {
    logger.error(`DB: failed to get token ${leafHash}: ${err.message}`);
    return null;
  }
}

export async function markTokenConsumed(
  leafHash: string,
  consumedBy: string
): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    const result = await pool.query(
      `UPDATE tokens SET consumed = TRUE, consumed_at = NOW(), consumed_by = $2
       WHERE leaf_hash = $1 AND consumed = FALSE`,
      [leafHash, consumedBy]
    );
    return (result.rowCount ?? 0) > 0;
  } catch (err: any) {
    logger.error(`DB: failed to mark token consumed: ${err.message}`);
    return false;
  }
}

export async function getTokensByBatch(batchId: string): Promise<any[]> {
  const pool = getPool();
  if (!pool) return [];

  try {
    const result = await pool.query(
      'SELECT * FROM tokens WHERE batch_id = $1 ORDER BY node_index',
      [batchId]
    );
    return result.rows;
  } catch (err: any) {
    logger.error(`DB: failed to get tokens for batch ${batchId}: ${err.message}`);
    return [];
  }
}
