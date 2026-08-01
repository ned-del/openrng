/**
 * @openrng/sdk v0.2.0 — Verifiable Entropy for games & AI agents
 */

export { VEOClient } from './veo';
export type { VEOObject, VEOVerifyResult, VEOStatus, VEOPolicy, GetEntropyOptions } from './veo';
export { OpenRNG } from './openrng';
export {
  OpenRNGError,
  PoolExhaustedError,
  RateLimitError,
  AuthenticationError,
  ConnectionError,
} from './errors';
export type {
  // Config
  OpenRNGConfig,
  // Legacy types (v0.1)
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
  // Decision Engine types (v0.2)
  HealthResponse,
  EntropyResponse,
  GameCatalog,
  GameType,
  BetResponse,
  BetOptions,
  RngGenerateResponse,
  GameResult,
  GamePending,
  GameResolved,
  GameOutcome,
  GameProof,
  ReplayStep,
  VerifyGameResponse,
  RecentResponse,
  RecentGame,
  StatsResponse,
  ServiceInfo,
} from './types';
