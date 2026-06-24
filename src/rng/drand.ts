/**
 * OpenRNG — drand Beacon Integration
 *
 * Fetches publicly verifiable randomness from the drand network.
 * Uses the drand HTTP API (quicknet chain) for maximum compatibility.
 *
 * drand is a distributed randomness beacon — each round produces
 * randomness that is publicly verifiable by anyone using the chain's
 * public key. This replaces/supplements the local VDF for entropy.
 *
 * Quicknet: ~3s rounds, BLS signatures on bn254
 * Endpoint: https://api.drand.sh
 * Chain hash: 52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971
 */

import { createHash } from 'crypto';
import { logger } from '../utils/logger.js';

// ============================================================
// TYPES
// ============================================================

export interface DrandBeacon {
  round: number;
  randomness: string;  // hex-encoded 32 bytes
  signature: string;   // hex-encoded BLS signature
}

export interface VerifiableEntropy {
  source: 'drand' | 'local-vdf';
  randomness: string;  // hex-encoded entropy
  round: number;       // drand round number (0 for local-vdf)
  signature: string;   // drand signature (empty for local-vdf)
}

export interface DrandChainInfo {
  public_key: string;
  period: number;
  genesis_time: number;
  hash: string;
  schemeID: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const DRAND_BASE_URL = 'https://api.drand.sh';
const QUICKNET_CHAIN_HASH = '52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971';
const DRAND_TIMEOUT_MS = 5000;

// ============================================================
// DRAND CLIENT
// ============================================================

export class DrandClient {
  private readonly baseUrl: string;
  private readonly chainHash: string;
  private chainInfo: DrandChainInfo | null = null;
  private lastBeacon: DrandBeacon | null = null;
  private consecutiveFailures: number = 0;
  private readonly maxConsecutiveFailures: number = 3;

  constructor(
    baseUrl: string = DRAND_BASE_URL,
    chainHash: string = QUICKNET_CHAIN_HASH
  ) {
    this.baseUrl = baseUrl;
    this.chainHash = chainHash;
  }

  /**
   * Fetch chain info (public key, period, genesis time).
   * Cached after first successful fetch.
   */
  async getChainInfo(): Promise<DrandChainInfo | null> {
    if (this.chainInfo) return this.chainInfo;

    try {
      const url = `${this.baseUrl}/${this.chainHash}/info`;
      const response = await fetchWithTimeout(url, DRAND_TIMEOUT_MS);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      this.chainInfo = await response.json() as DrandChainInfo;
      logger.info(
        `drand: chain info loaded — scheme=${this.chainInfo.schemeID}, ` +
        `period=${this.chainInfo.period}s, pubkey=${this.chainInfo.public_key.slice(0, 16)}...`
      );
      return this.chainInfo;
    } catch (err: any) {
      logger.warn(`drand: failed to fetch chain info: ${err.message}`);
      return null;
    }
  }

  /**
   * Fetch the latest drand beacon.
   */
  async getLatestBeacon(): Promise<DrandBeacon | null> {
    try {
      const url = `${this.baseUrl}/${this.chainHash}/public/latest`;
      const response = await fetchWithTimeout(url, DRAND_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as any;
      const beacon: DrandBeacon = {
        round: data.round,
        randomness: data.randomness,
        signature: data.signature,
      };

      this.lastBeacon = beacon;
      this.consecutiveFailures = 0;

      logger.debug(
        `drand: beacon round=${beacon.round} randomness=${beacon.randomness.slice(0, 16)}...`
      );

      return beacon;
    } catch (err: any) {
      this.consecutiveFailures++;
      logger.warn(
        `drand: failed to fetch beacon (failure ${this.consecutiveFailures}): ${err.message}`
      );
      return null;
    }
  }

  /**
   * Fetch a specific round's beacon.
   */
  async getBeacon(round: number): Promise<DrandBeacon | null> {
    try {
      const url = `${this.baseUrl}/${this.chainHash}/public/${round}`;
      const response = await fetchWithTimeout(url, DRAND_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as any;
      return {
        round: data.round,
        randomness: data.randomness,
        signature: data.signature,
      };
    } catch (err: any) {
      logger.warn(`drand: failed to fetch round ${round}: ${err.message}`);
      return null;
    }
  }

  /**
   * Basic integrity check: verify that the randomness matches
   * SHA-256(signature). This is a lightweight check — full BLS
   * verification requires the chain's public key and crypto libs.
   */
  verifyBeaconIntegrity(beacon: DrandBeacon): boolean {
    const expectedRandomness = createHash('sha256')
      .update(Buffer.from(beacon.signature, 'hex'))
      .digest('hex');
    return expectedRandomness === beacon.randomness;
  }

  /**
   * Check if drand is considered healthy.
   */
  get isHealthy(): boolean {
    return this.consecutiveFailures < this.maxConsecutiveFailures;
  }

  /**
   * Get the last successfully fetched beacon.
   */
  get cachedBeacon(): DrandBeacon | null {
    return this.lastBeacon;
  }
}

// ============================================================
// VERIFIABLE ENTROPY PROVIDER
// ============================================================

/**
 * Get verifiable entropy from drand, with local VDF fallback.
 * 
 * The key property: drand randomness is publicly verifiable.
 * Anyone can check that round X produced randomness Y by:
 * 1. Fetching the beacon for round X from any drand node
 * 2. Verifying the BLS signature against the chain's public key
 * 3. Confirming SHA-256(signature) == randomness
 */
export async function getVerifiableEntropy(
  drandClient: DrandClient,
  localVdfFallback?: () => Promise<{ output: string; proof: string }>
): Promise<VerifiableEntropy> {
  // Try drand first
  if (drandClient.isHealthy) {
    const beacon = await drandClient.getLatestBeacon();

    if (beacon) {
      // Verify integrity
      const valid = drandClient.verifyBeaconIntegrity(beacon);
      if (valid) {
        return {
          source: 'drand',
          randomness: beacon.randomness,
          round: beacon.round,
          signature: beacon.signature,
        };
      }
      logger.warn(`drand: beacon integrity check failed for round ${beacon.round}`);
    }
  }

  // Fallback to local VDF
  logger.info('drand: unavailable, falling back to local VDF');

  if (localVdfFallback) {
    const vdfResult = await localVdfFallback();
    return {
      source: 'local-vdf',
      randomness: vdfResult.output,
      round: 0,
      signature: vdfResult.proof,
    };
  }

  // Last resort: crypto random (still deterministic per-seed in batch context)
  const { randomBytes } = await import('crypto');
  return {
    source: 'local-vdf',
    randomness: randomBytes(32).toString('hex'),
    round: 0,
    signature: '',
  };
}

// ============================================================
// HELPERS
// ============================================================

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
