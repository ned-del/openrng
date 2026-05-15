/**
 * OpenRNG SDK Type Definitions
 */

export interface OpenRNGConfig {
  /** Unique agent/client identifier */
  agentId: string;
  /** OpenRNG server URL */
  endpoint: string;
  /** API key (optional for free tier) */
  apiKey?: string;
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
