/**
 * OpenRNG SDK Type Definitions — v0.2.0
 * Updated to match the Decision Engine API
 */

// ── Configuration ─────────────────────────────────────────

export interface OpenRNGConfig {
  /** API key for authentication (e.g. 'orn_xxx') */
  apiKey?: string;
  /** OpenRNG server URL (default: https://api.openrng.io) */
  baseUrl?: string;
  /** @deprecated Use baseUrl instead */
  endpoint?: string;
  /** Unique agent/client identifier */
  agentId?: string;
  /** Client vertical */
  vertical?: 'slot' | 'game' | 'lottery' | 'agent' | 'npc';
  /** Agent name for registration */
  agentName?: string;
  /** Framework identifier */
  framework?: 'langchain' | 'crewai' | 'autogpt' | 'openclaw' | 'custom';
  /** Max retries on failure */
  maxRetries?: number;
  /** Base delay for exponential backoff (ms) */
  retryBaseDelayMs?: number;
  /** Request timeout (ms) */
  timeoutMs?: number;
}

// ── Legacy token-based types (kept for backward compat) ───

export interface Proof {
  leafHash: string;
  merkleRoot: string;
  batchId: string;
  drandRound?: number;
  polygonTx: string | null;
  polygonScan: string | null;
  anchorBlock?: number;
}

export interface NumberResult {
  value: number;
  proof: Proof;
}

export interface ChooseResult<T = string> {
  choice: T;
  index: number;
  value: number;
  proof: Proof;
}

export interface ShuffleResult<T = any> {
  result: T[];
  proofs: Proof[];
}

export interface DiceResult {
  rolls: number[];
  total: number;
  proofs: Proof[];
}

export interface FlipResult {
  result: boolean;
  proof: Proof;
}

export interface BatchResult {
  values: number[];
  proofs: Proof[];
}

export interface VerifyResult {
  valid: boolean;
  onChain: boolean;
  batchId: string;
  polygonScan: string | null;
}

export interface NumberOptions {
  min?: number;
  max?: number;
}

export interface ChooseOptions {
  weights?: number[];
}

// ── Decision Engine API types ─────────────────────────────

/** GET /health */
export interface HealthResponse {
  status: string;
  uptime: number;
  database: string;
  vdf: string;
}

/** GET /api/v1/entropy */
export interface EntropyResponse {
  entropy: string;
  entropy_hash: string;
  source: string;
  epoch: number;
  timestamp: number;
  veo_class: string;
  verify_url: string;
}

/** GET /api/v1/games */
export interface GameCatalog {
  games: GameType[];
  raw_rng: {
    description: string;
    endpoint: string;
  };
}

export interface GameType {
  type: string;
  name: string;
  description: string;
  bet_types: string[];
  house_edge: string;
  endpoint: string;
}

/** POST /api/v1/games/sicbo/bet or /api/v1/games/dice/bet */
export interface BetResponse {
  accepted: boolean;
  bet_id: string;
  game_id: string;
  resolves_at_epoch: number;
  message: string;
}

export interface BetOptions {
  /** Client seed for provable fairness */
  clientSeed?: string;
  /** Player ID */
  playerId?: string;
  /** Bet value for total/exact (e.g. target number) */
  value?: number;
  /** Combo values (e.g. [1,2] for dice combo) */
  values?: number[];
}

/** POST /api/v1/rng/generate */
export interface RngGenerateResponse {
  accepted: boolean;
  request_id: string;
  poll_url: string;
}

/** GET /api/v1/games/:id — pending */
export interface GamePending {
  status: 'pending';
  message?: string;
}

/** GET /api/v1/games/:id — resolved */
export interface GameResolved {
  status: 'resolved';
  result: {
    betId: string;
    gameId: string;
    outcome: GameOutcome;
    won: boolean;
    payout: string;
    multiplier: number;
    proof: GameProof;
    verifyUrl: string;
    replayUrl: string;
  };
  replay: ReplayStep[];
}

export interface GameOutcome {
  die1?: number;
  die2?: number;
  die3?: number;
  total?: number;
  doubles?: number[];
  isTriple?: boolean;
  tripleValue?: number | null;
  /** Raw RNG result */
  value?: string;
  rngValue?: string;
}

export interface GameProof {
  vdfEpoch: number;
  vdfOutput: string;
  clientSeed: string;
  gameId: string;
  rngValue: string;
  derivation: string;
  merklePath: any[];
  merkleRoot: string;
  polygonTx: string | null;
}

export interface ReplayStep {
  step: number;
  action: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export type GameResult = GamePending | GameResolved;

/** GET /api/v1/verify/:id */
export interface VerifyGameResponse {
  game_id: string;
  verified: boolean;
  proof: GameProof;
  replay_steps: ReplayStep[];
}

/** GET /api/v1/recent */
export interface RecentResponse {
  games: RecentGame[];
}

export interface RecentGame {
  game_id: string;
  game_type: string;
  player_id: string;
  bet_type: string;
  amount: string;
  outcome: GameOutcome;
  won: boolean;
  payout: string;
  multiplier: string;
  resolved_at: string;
}

/** GET /api/v1/stats */
export interface StatsResponse {
  pendingBets: number;
  resolvedGames: number;
  totalBets: string;
  totalPayout: string;
  currentEpoch: number;
  epoch: {
    epoch: number;
    output: string;
    previousOutput: string;
    timestamp: number;
    proof: string;
  };
}

/** GET / (root) */
export interface ServiceInfo {
  service: string;
  description: string;
  version: string;
  status: string;
  links: Record<string, string>;
  database: string;
  vdf_engine: {
    status: string;
    epoch: {
      epoch: number;
      output: string;
      previousOutput: string;
      timestamp: number;
      proof: string;
    };
    computation_time: string;
  };
  uptime: number;
}
