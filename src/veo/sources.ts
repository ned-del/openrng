/**
 * VEO-1 — Entropy Source Adapters
 *
 * Real integrations for drand, Bitcoin, and Polygon entropy sources.
 * Each adapter fetches live data with crypto.randomBytes fallback on failure.
 *
 * Audit fix #4: Tracks last successful fetch time + reference per source.
 */

import crypto from 'crypto';
import { ethers } from 'ethers';
import { EntropySourceRecord } from './types.js';
import { sha256Hex } from './verify.js';
import { DrandClient } from '../rng/drand.js';
import { logger } from '../utils/logger.js';

export interface SourceAdapterResult {
  entropy: string;
  record: EntropySourceRecord;
}

// ── Source status tracking ──────────────────────────────────

export type SourceStatusValue = 'live' | 'fallback' | 'failed' | 'unknown';

export interface SourceStatusEntry {
  status: SourceStatusValue;
  last_success_at: string | null;
  last_reference: string | null;
  last_error: string | null;
  last_checked_at: string | null;
}

const sourceStatusMap: Record<string, SourceStatusEntry> = {
  'drand-mainnet': {
    status: 'unknown',
    last_success_at: null,
    last_reference: null,
    last_error: null,
    last_checked_at: null,
  },
  bitcoin: {
    status: 'unknown',
    last_success_at: null,
    last_reference: null,
    last_error: null,
    last_checked_at: null,
  },
  polygon: {
    status: 'unknown',
    last_success_at: null,
    last_reference: null,
    last_error: null,
    last_checked_at: null,
  },
};

function markSuccess(sourceId: string, reference: string): void {
  const entry = sourceStatusMap[sourceId];
  if (entry) {
    entry.status = 'live';
    entry.last_success_at = new Date().toISOString();
    entry.last_reference = reference;
    entry.last_checked_at = new Date().toISOString();
  }
}

function markFallback(sourceId: string, error: string): void {
  const entry = sourceStatusMap[sourceId];
  if (entry) {
    entry.status = 'fallback';
    entry.last_error = error;
    entry.last_checked_at = new Date().toISOString();
  }
}

export function getSourceStatus(): Record<string, SourceStatusEntry> {
  return { ...sourceStatusMap };
}

/** Compute global source status from individual statuses */
export function getGlobalSourceStatus(): 'live' | 'degraded' | 'fallback_only' | 'failed' | 'unknown' {
  const entries = Object.values(sourceStatusMap);
  const checked = entries.filter(e => e.status !== 'unknown');
  if (checked.length === 0) return 'unknown';
  const liveCount = checked.filter(e => e.status === 'live').length;
  if (liveCount === checked.length) return 'live';
  if (liveCount === 0) return 'fallback_only';
  return 'degraded';
}

// ── Shared drand client instance ────────────────────────────
const drandClient = new DrandClient();

/**
 * Fetch entropy from the drand randomness beacon.
 */
export async function fetchDrandEntropy(): Promise<SourceAdapterResult> {
  try {
    const beacon = await drandClient.getLatestBeacon();
    if (beacon && drandClient.verifyBeaconIntegrity(beacon)) {
      const entropy = '0x' + beacon.randomness;
      const ref = `drand-round-${beacon.round}`;
      markSuccess('drand-mainnet', ref);
      return {
        entropy,
        record: {
          source_id: 'drand-mainnet',
          source_type: 'randomness_beacon',
          source_reference: ref,
          timestamp: new Date().toISOString(),
          entropy_hash: sha256Hex(entropy),
          signature: '0x' + beacon.signature,
        },
      };
    }
    throw new Error('drand beacon unavailable or integrity check failed');
  } catch (err: any) {
    logger.warn(`VEO drand adapter: fallback to crypto.randomBytes — ${err.message}`);
    markFallback('drand-mainnet', err.message);
    const entropy = '0x' + crypto.randomBytes(32).toString('hex');
    return {
      entropy,
      record: {
        source_id: 'drand-mainnet',
        source_type: 'randomness_beacon',
        source_reference: 'fallback-crypto-random',
        timestamp: new Date().toISOString(),
        entropy_hash: sha256Hex(entropy),
      },
    };
  }
}

/**
 * Fetch entropy from the latest Bitcoin block hash.
 */
export async function fetchBitcoinBlockEntropy(): Promise<SourceAdapterResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch('https://blockstream.info/api/blocks/tip/hash', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blockHash = (await response.text()).trim();
    const entropy = blockHash.startsWith('0x') ? blockHash : '0x' + blockHash;

    let blockRef = 'bitcoin-latest';
    try {
      const heightResp = await fetch('https://blockstream.info/api/blocks/tip/height', {
        signal: AbortSignal.timeout(3000),
      });
      if (heightResp.ok) {
        const height = (await heightResp.text()).trim();
        blockRef = `block-${height}`;
      }
    } catch {
      // Non-critical
    }

    markSuccess('bitcoin', blockRef);
    return {
      entropy,
      record: {
        source_id: 'bitcoin',
        source_type: 'blockchain_block_hash',
        source_reference: blockRef,
        timestamp: new Date().toISOString(),
        entropy_hash: sha256Hex(entropy),
      },
    };
  } catch (err: any) {
    logger.warn(`VEO Bitcoin adapter: fallback to crypto.randomBytes — ${err.message}`);
    markFallback('bitcoin', err.message);
    const entropy = '0x' + crypto.randomBytes(32).toString('hex');
    return {
      entropy,
      record: {
        source_id: 'bitcoin',
        source_type: 'blockchain_block_hash',
        source_reference: 'fallback-crypto-random',
        timestamp: new Date().toISOString(),
        entropy_hash: sha256Hex(entropy),
      },
    };
  }
}

/**
 * Fetch entropy from the latest Polygon block hash.
 */
export async function fetchPolygonBlockEntropy(): Promise<SourceAdapterResult> {
  try {
    const rpcUrl = process.env.POLYGON_RPC_URL;
    if (!rpcUrl) throw new Error('POLYGON_RPC_URL not configured');

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const block = await provider.getBlock('latest');
    if (!block || !block.hash) throw new Error('Could not fetch latest Polygon block');

    const entropy = block.hash;
    const ref = `block-${block.number}`;
    markSuccess('polygon', ref);
    return {
      entropy,
      record: {
        source_id: 'polygon',
        source_type: 'blockchain_block_hash',
        source_reference: ref,
        timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
        entropy_hash: sha256Hex(entropy),
      },
    };
  } catch (err: any) {
    logger.warn(`VEO Polygon adapter: fallback to crypto.randomBytes — ${err.message}`);
    markFallback('polygon', err.message);
    const entropy = '0x' + crypto.randomBytes(32).toString('hex');
    return {
      entropy,
      record: {
        source_id: 'polygon',
        source_type: 'blockchain_block_hash',
        source_reference: 'fallback-crypto-random',
        timestamp: new Date().toISOString(),
        entropy_hash: sha256Hex(entropy),
      },
    };
  }
}
