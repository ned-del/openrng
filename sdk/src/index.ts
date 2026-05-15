/**
 * @openrng/sdk — Verifiable random numbers for AI agents
 */

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
