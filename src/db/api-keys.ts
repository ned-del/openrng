/**
 * OpenRNG — API Key Repository
 *
 * Self-service API key management. Keys are stored in the api_keys table
 * and checked by the requireAuth middleware.
 */

import crypto from 'crypto';
import { getPool, isDatabaseConnected } from './index';
import { logger } from '../utils/logger';

// ============================================================
// Types
// ============================================================

export interface ApiKeyRecord {
  id: number;
  key_hash: string;
  key_prefix: string;
  email: string;
  name: string;
  agent_name: string | null;
  framework: string | null;
  tier: string;
  rate_limit: number;
  active: boolean;
  created_at: Date;
  last_used_at: Date | null;
}

// ============================================================
// Key Generation
// ============================================================

/**
 * Generate a 64-char hex API key.
 * Returns { raw, hash, prefix } — raw is returned to the user once,
 * hash is stored in the database, prefix is for display/lookup.
 */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = crypto.randomBytes(32).toString('hex'); // 64 hex chars
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, 8); // first 8 chars for identification
  return { raw, hash, prefix };
}

/**
 * Hash a raw API key for lookup.
 */
export function hashApiKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ============================================================
// Repository Functions
// ============================================================

/**
 * Count how many keys an email has registered.
 */
export async function countKeysByEmail(email: string): Promise<number> {
  const pool = getPool();
  if (!pool) return 0;

  try {
    const result = await pool.query(
      'SELECT COUNT(*)::int AS count FROM api_keys WHERE email = $1',
      [email],
    );
    return result.rows[0]?.count || 0;
  } catch (err: any) {
    logger.error(`DB: failed to count keys for ${email}: ${err.message}`);
    return 0;
  }
}

/**
 * Insert a new API key.
 */
export async function insertApiKey(params: {
  keyHash: string;
  keyPrefix: string;
  email: string;
  name: string;
  agentName?: string;
  framework?: string;
}): Promise<boolean> {
  const pool = getPool();
  if (!pool) return false;

  try {
    await pool.query(
      `INSERT INTO api_keys (key_hash, key_prefix, email, name, agent_name, framework, tier, rate_limit)
       VALUES ($1, $2, $3, $4, $5, $6, 'free', 100)`,
      [
        params.keyHash,
        params.keyPrefix,
        params.email,
        params.name,
        params.agentName || null,
        params.framework || null,
      ],
    );
    return true;
  } catch (err: any) {
    logger.error(`DB: failed to insert API key for ${params.email}: ${err.message}`);
    return false;
  }
}

/**
 * Look up an API key by its hash. Returns the key record if active, null otherwise.
 */
export async function getApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null> {
  const pool = getPool();
  if (!pool) return null;

  try {
    const result = await pool.query(
      'SELECT * FROM api_keys WHERE key_hash = $1 AND active = TRUE',
      [keyHash],
    );
    return result.rows[0] || null;
  } catch (err: any) {
    logger.error(`DB: failed to look up API key: ${err.message}`);
    return null;
  }
}

/**
 * Update the last_used_at timestamp for a key (fire-and-forget).
 */
export async function touchApiKey(keyHash: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;

  try {
    await pool.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1',
      [keyHash],
    );
  } catch {
    // Non-critical — don't log noise
  }
}
