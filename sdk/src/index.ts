/**
 * @openrng/sdk — Verifiable Entropy for AI agents
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
