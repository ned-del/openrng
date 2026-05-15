/**
 * OpenRNG SDK — Main class
 *
 * Usage:
 *   const rng = new OpenRNG({ agentId: 'my-agent', endpoint: 'http://localhost:3000' })
 *   const result = await rng.number({ min: 1, max: 100 })
 */

import { HttpClient } from './client';
import type {
  OpenRNGConfig,
  Proof,
  NumberResult,
  ChooseResult,
  ShuffleResult,
  DiceResult,
  FlipResult,
  BatchResult,
  VerifyResult,
  NumberOptions,
  ChooseOptions,
} from './types';

interface RawToken {
  value: number;
  leaf_hash: string;
  node_id: string;
  batch_id: string;
  merkle_proof: {
    root: string;
    proof_path: any[];
    leaf_index: number;
    anchor_tx: string | null;
    anchor_block: number | null;
    polygon_scan: string | null;
  } | null;
}

interface TokenResponse {
  tokens: RawToken[];
  meta: {
    quantity_requested: number;
    quantity_served: number;
    latency_ms: number;
    served_from_pool: boolean;
    timestamp: string;
  };
}

interface BatchTokenResponse {
  values: number[];
  proofs: Array<{
    leaf_hash: string;
    batch_id: string;
    merkle_root: string | null;
    anchor_tx: string | null;
    polygon_scan: string | null;
  }>;
  meta: {
    quantity_requested: number;
    quantity_served: number;
    latency_ms: number;
    timestamp: string;
  };
}

function tokenToProof(token: RawToken): Proof {
  return {
    leafHash: token.leaf_hash,
    merkleRoot: token.merkle_proof?.root || '',
    batchId: token.batch_id,
    polygonTx: token.merkle_proof?.anchor_tx || null,
    polygonScan: token.merkle_proof?.polygon_scan || null,
    anchorBlock: token.merkle_proof?.anchor_block || undefined,
  };
}

function batchProofToProof(p: BatchTokenResponse['proofs'][0]): Proof {
  return {
    leafHash: p.leaf_hash,
    merkleRoot: p.merkle_root || '',
    batchId: p.batch_id,
    polygonTx: p.anchor_tx || null,
    polygonScan: p.polygon_scan || null,
  };
}

export class OpenRNG {
  private readonly config: Required<Pick<OpenRNGConfig, 'agentId' | 'endpoint' | 'vertical'>> & OpenRNGConfig;
  private readonly http: HttpClient;
  private initialized: boolean = false;

  constructor(config: OpenRNGConfig) {
    this.config = {
      ...config,
      vertical: config.vertical || 'agent',
    };
    this.http = new HttpClient(config);
  }

  // ── Lazy init: auto-register on first call ──────────────────

  private async ensureInit(): Promise<void> {
    if (this.initialized) return;
    // The server auto-registers clients, so just mark as initialized.
    // First token request will trigger auto-registration server-side.
    this.initialized = true;
  }

  // ── Core API ───────────────────────────────────────────────

  /**
   * Get a random number in [min, max] with cryptographic proof
   */
  async number(opts: NumberOptions = {}): Promise<NumberResult> {
    await this.ensureInit();

    const min = opts.min ?? 0;
    const max = opts.max ?? 1000000;

    const resp = await this.http.request<TokenResponse>({
      method: 'POST',
      path: '/v1/tokens/request',
      body: {
        client_id: this.config.agentId,
        quantity: 1,
        range: { min, max },
        vertical: this.config.vertical,
      },
    });

    const token = resp.tokens[0];
    return {
      value: token.value,
      proof: tokenToProof(token),
    };
  }

  /**
   * Weighted random choice from an array
   */
  async choose<T>(items: T[], opts: ChooseOptions = {}): Promise<ChooseResult<T>> {
    await this.ensureInit();

    // Get a raw number 0-1000000 and normalize
    const resp = await this.http.request<TokenResponse>({
      method: 'POST',
      path: '/v1/tokens/request',
      body: {
        client_id: this.config.agentId,
        quantity: 1,
        range: { min: 0, max: 1000000 },
        vertical: this.config.vertical,
      },
    });

    const token = resp.tokens[0];
    const normalizedValue = token.value / 1000000;

    let index: number;
    if (opts.weights && opts.weights.length === items.length) {
      // Weighted selection
      const totalWeight = opts.weights.reduce((a, b) => a + b, 0);
      const normalized = opts.weights.map(w => w / totalWeight);
      let cumulative = 0;
      index = items.length - 1; // default to last
      for (let i = 0; i < normalized.length; i++) {
        cumulative += normalized[i];
        if (normalizedValue < cumulative) {
          index = i;
          break;
        }
      }
    } else {
      // Uniform selection
      index = Math.floor(normalizedValue * items.length);
      if (index >= items.length) index = items.length - 1;
    }

    return {
      choice: items[index],
      index,
      value: normalizedValue,
      proof: tokenToProof(token),
    };
  }

  /**
   * Fisher-Yates shuffle with one proof per swap
   */
  async shuffle<T>(items: T[]): Promise<ShuffleResult<T>> {
    await this.ensureInit();

    const n = items.length;
    if (n <= 1) return { result: [...items], proofs: [] };

    // Need n-1 random numbers for Fisher-Yates
    const resp = await this.http.request<TokenResponse>({
      method: 'POST',
      path: '/v1/tokens/request',
      body: {
        client_id: this.config.agentId,
        quantity: n - 1,
        range: { min: 0, max: 1000000 },
        vertical: this.config.vertical,
      },
    });

    const result = [...items];
    const proofs: Proof[] = [];

    for (let i = n - 1; i > 0; i--) {
      const token = resp.tokens[n - 1 - i];
      const j = token.value % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
      proofs.push(tokenToProof(token));
    }

    return { result, proofs };
  }

  /**
   * Roll dice: e.g. dice(2, 6) = 2d6
   */
  async dice(count: number, sides: number): Promise<DiceResult> {
    await this.ensureInit();

    const resp = await this.http.request<TokenResponse>({
      method: 'POST',
      path: '/v1/tokens/request',
      body: {
        client_id: this.config.agentId,
        quantity: count,
        range: { min: 1, max: sides },
        vertical: this.config.vertical,
      },
    });

    const rolls = resp.tokens.map(t => t.value);
    const proofs = resp.tokens.map(t => tokenToProof(t));

    return {
      rolls,
      total: rolls.reduce((a, b) => a + b, 0),
      proofs,
    };
  }

  /**
   * Coin flip — boolean decision with proof
   */
  async flip(): Promise<FlipResult> {
    await this.ensureInit();

    const resp = await this.http.request<TokenResponse>({
      method: 'POST',
      path: '/v1/tokens/request',
      body: {
        client_id: this.config.agentId,
        quantity: 1,
        range: { min: 0, max: 1 },
        vertical: this.config.vertical,
      },
    });

    const token = resp.tokens[0];
    return {
      result: token.value === 1,
      proof: tokenToProof(token),
    };
  }

  /**
   * Batch request — efficient bulk random numbers
   */
  async batch(count: number, opts: NumberOptions = {}): Promise<BatchResult> {
    await this.ensureInit();

    const min = opts.min ?? 0;
    const max = opts.max ?? 1000000;

    const resp = await this.http.request<BatchTokenResponse>({
      method: 'POST',
      path: '/v1/tokens/batch',
      body: {
        client_id: this.config.agentId,
        quantity: count,
        range: { min, max },
        vertical: this.config.vertical,
      },
    });

    return {
      values: resp.values,
      proofs: resp.proofs.map(batchProofToProof),
    };
  }

  // ── Static verification ───────────────────────────────────

  /**
   * Verify a proof against the OpenRNG server (no auth required)
   */
  static async verify(
    proof: Proof,
    endpoint?: string
  ): Promise<VerifyResult> {
    const baseUrl = (endpoint || 'http://localhost:3000').replace(/\/$/, '');

    const resp = await fetch(`${baseUrl}/v1/tokens/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leaf_hash: proof.leafHash,
        batch_id: proof.batchId,
      }),
    });

    const data = await resp.json() as any;

    return {
      valid: data.verified === true,
      onChain: !!data.batch?.anchor_tx_hash,
      batchId: proof.batchId,
      polygonScan: data.batch?.polygon_scan || proof.polygonScan || null,
    };
  }

  /**
   * Destroy the client and close connections
   */
  destroy(): void {
    this.http.destroy();
  }
}
