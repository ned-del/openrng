/**
 * @fairseal/commit — Commitment creation
 * 
 * Creates a cryptographic commitment to a selection rule,
 * bound to a future drand beacon round.
 */

import type { Commitment, CommitmentOptions } from './types.js';
import { getBeaconSource } from './beacon.js';
import { computeCommitHash, generateSalt, hashInputs, hashRule, toHex } from './crypto.js';

/**
 * Create a commitment to a selection rule, bound to a future beacon round.
 * 
 * The commitment hash proves what rule and inputs were selected BEFORE
 * the beacon output is knowable. The targetRound is computed from
 * `revealAfter` seconds in the future.
 * 
 * @example
 * ```typescript
 * const commitment = createCommitment({
 *   rule: JSON.stringify({ type: 'uniform', pick: 1 }),
 *   inputs: ['alice', 'bob', 'charlie'],
 *   revealAfter: 30, // reveal after 30 seconds
 * });
 * ```
 */
export function createCommitment(opts: CommitmentOptions): Commitment {
  const {
    rule,
    inputs,
    revealAfter,
    beacon: beaconId = 'drand:quicknet',
    salt: providedSalt,
    metadata,
  } = opts;

  // Validate inputs
  if (!rule || typeof rule !== 'string') {
    throw new Error('rule must be a non-empty string (canonical JSON)');
  }
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error('inputs must be a non-empty array of strings');
  }
  if (typeof revealAfter !== 'number' || revealAfter < 1) {
    throw new Error('revealAfter must be a positive number of seconds');
  }

  // Get the beacon source
  const beacon = getBeaconSource(beaconId);

  // Compute the target round
  const nowSeconds = Math.floor(Date.now() / 1000);
  const revealTime = nowSeconds + revealAfter;
  const targetRound = beacon.getRound(revealTime);

  // Compute hashes
  const ruleHash = hashRule(rule);
  const inputsHash = hashInputs(inputs);

  // Generate or use provided salt
  const salt = providedSalt ?? generateSalt();
  const saltHex = toHex(salt);

  // Compute commitment hash
  const commitHash = computeCommitHash(beaconId, targetRound, ruleHash, inputsHash, saltHex);

  // Derive commitment ID (first 16 bytes of commitHash)
  const id = commitHash.slice(0, 32);

  return {
    id,
    beacon: beaconId,
    targetRound,
    ruleHash,
    inputsHash,
    commitHash,
    createdAt: new Date().toISOString(),
    salt: saltHex,
    rule,
    inputs,
    metadata,
  };
}
