/**
 * OpenRNG SDK v0.2.0 — Decision Engine Client
 *
 * Supports both the legacy token pool API and the new Decision Engine API
 * (games, betting, raw RNG, verification).
 *
 * Usage:
 *   const rng = new OpenRNG({ apiKey: 'orn_xxx' })
 *   const bet = await rng.placeSicBoBet('big', 10)
 *   const result = await rng.waitForResult(bet.game_id)
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
  HealthResponse,
  EntropyResponse,
  GameCatalog,
  BetResponse,
  BetOptions,
  RngGenerateResponse,
  GameResult,
  GameResolved,
  VerifyGameResponse,
  RecentResponse,
  StatsResponse,
  ServiceInfo,
} from './types';

// ── Legacy internal types ────────────────────────────────

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
  private readonly config: OpenRNGConfig;
  private readonly http: HttpClient;
  private initialized: boolean = false;

  constructor(config: OpenRNGConfig = {}) {
    this.config = {
      ...config,
      // Normalize: support both baseUrl and legacy endpoint
      baseUrl: config.baseUrl || config.endpoint || 'https://api.openrng.io',
    };
    this.http = new HttpClient({
      ...this.config,
      // Pass baseUrl as endpoint for HttpClient compat
      endpoint: this.config.baseUrl!,
    });
  }

  // ══════════════════════════════════════════════════════════
  //  Decision Engine API (v0.2.0)
  // ══════════════════════════════════════════════════════════

  /**
   * GET / — Service info
   */
  async getServiceInfo(): Promise<ServiceInfo> {
    return this.http.request<ServiceInfo>({ method: 'GET', path: '/' });
  }

  /**
   * GET /health — Health check
   */
  async getHealth(): Promise<HealthResponse> {
    return this.http.request<HealthResponse>({ method: 'GET', path: '/health' });
  }

  /**
   * GET /api/v1/entropy — Current VDF entropy
   */
  async getEntropy(): Promise<EntropyResponse> {
    return this.http.request<EntropyResponse>({ method: 'GET', path: '/api/v1/entropy' });
  }

  /**
   * GET /api/v1/games — List available game types
   */
  async getGames(): Promise<GameCatalog> {
    return this.http.request<GameCatalog>({ method: 'GET', path: '/api/v1/games' });
  }

  /**
   * POST /api/v1/games/sicbo/bet — Place a Sic Bo bet
   *
   * @param betType - big | small | odd | even | total | single | double | triple | anyTriple | combo
   * @param amount - Bet amount
   * @param opts - Optional: clientSeed, playerId, value, values
   */
  async placeSicBoBet(betType: string, amount: number, opts?: BetOptions): Promise<BetResponse> {
    return this.http.request<BetResponse>({
      method: 'POST',
      path: '/api/v1/games/sicbo/bet',
      body: {
        bet_type: betType,
        amount,
        client_seed: opts?.clientSeed,
        player_id: opts?.playerId,
        value: opts?.value,
        values: opts?.values,
      },
    });
  }

  /**
   * POST /api/v1/games/dice/bet — Place a Dice bet
   *
   * @param betType - exact | over7 | under7 | odd | even
   * @param amount - Bet amount
   * @param opts - Optional: clientSeed, playerId, value
   */
  async placeDiceBet(betType: string, amount: number, opts?: BetOptions): Promise<BetResponse> {
    return this.http.request<BetResponse>({
      method: 'POST',
      path: '/api/v1/games/dice/bet',
      body: {
        bet_type: betType,
        amount,
        client_seed: opts?.clientSeed,
        player_id: opts?.playerId,
        value: opts?.value,
      },
    });
  }

  /**
   * POST /api/v1/rng/generate — Generate raw verified entropy
   *
   * @param clientSeed - Optional client seed for derivation
   */
  async generateRng(clientSeed?: string): Promise<RngGenerateResponse> {
    return this.http.request<RngGenerateResponse>({
      method: 'POST',
      path: '/api/v1/rng/generate',
      body: clientSeed ? { client_seed: clientSeed } : {},
    });
  }

  /**
   * GET /api/v1/games/:id — Get game status/result
   */
  async getGame(gameId: string): Promise<GameResult> {
    return this.http.request<GameResult>({ method: 'GET', path: `/api/v1/games/${gameId}` });
  }

  /**
   * GET /api/v1/verify/:id — Verify a game's proof
   */
  async verifyGame(gameId: string): Promise<VerifyGameResponse> {
    return this.http.request<VerifyGameResponse>({ method: 'GET', path: `/api/v1/verify/${gameId}` });
  }

  /**
   * GET /api/v1/recent — Recent resolved games
   */
  async getRecent(): Promise<RecentResponse> {
    return this.http.request<RecentResponse>({ method: 'GET', path: '/api/v1/recent' });
  }

  /**
   * GET /api/v1/stats — Platform statistics
   */
  async getStats(): Promise<StatsResponse> {
    return this.http.request<StatsResponse>({ method: 'GET', path: '/api/v1/stats' });
  }

  /**
   * Poll getGame() until the game resolves or timeout.
   *
   * @param gameId - Game ID to poll
   * @param timeoutMs - Max wait time (default: 30000ms)
   * @param intervalMs - Poll interval (default: 2000ms)
   * @returns Resolved game result
   * @throws Error if timeout exceeded
   */
  async waitForResult(gameId: string, timeoutMs: number = 30000, intervalMs: number = 2000): Promise<GameResolved> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const result = await this.getGame(gameId);
      if (result.status === 'resolved') {
        return result as GameResolved;
      }
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Game ${gameId} did not resolve within ${timeoutMs}ms`);
  }

  // ══════════════════════════════════════════════════════════
  //  Legacy Token Pool API (v0.1.0 compat)
  // ══════════════════════════════════════════════════════════

  private async ensureInit(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
  }

  /**
   * Get a random number in [min, max] with cryptographic proof
   * @deprecated Use generateRng() for the Decision Engine API
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
   * @deprecated Use generateRng() for the Decision Engine API
   */
  async choose<T>(items: T[], opts: ChooseOptions = {}): Promise<ChooseResult<T>> {
    await this.ensureInit();

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
      const totalWeight = opts.weights.reduce((a, b) => a + b, 0);
      const normalized = opts.weights.map(w => w / totalWeight);
      let cumulative = 0;
      index = items.length - 1;
      for (let i = 0; i < normalized.length; i++) {
        cumulative += normalized[i];
        if (normalizedValue < cumulative) {
          index = i;
          break;
        }
      }
    } else {
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
   * @deprecated Use generateRng() for the Decision Engine API
   */
  async shuffle<T>(items: T[]): Promise<ShuffleResult<T>> {
    await this.ensureInit();

    const n = items.length;
    if (n <= 1) return { result: [...items], proofs: [] };

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
   * @deprecated Use placeDiceBet() for the Decision Engine API
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
   * @deprecated Use generateRng() for the Decision Engine API
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
   * @deprecated Use generateRng() for the Decision Engine API
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

  // ── Static verification (legacy) ─────────────────────────

  /**
   * Verify a proof against the OpenRNG server (no auth required)
   * @deprecated Use verifyGame(gameId) for the Decision Engine API
   */
  static async verify(
    proof: Proof,
    endpoint?: string
  ): Promise<VerifyResult> {
    const baseUrl = (endpoint || 'https://api.openrng.io').replace(/\/$/, '');

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
