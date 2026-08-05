/**
 * @fairseal/commit — Cryptographic primitives
 * 
 * SHA-256 hashing and HMAC derivation using Node.js built-in crypto.
 * No external dependencies.
 */

import { createHash, createHmac, randomBytes } from 'node:crypto';

/**
 * SHA-256 hash of a UTF-8 string, returned as hex.
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * SHA-256 hash of a buffer, returned as hex.
 */
export function sha256Bytes(input: Uint8Array): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * HMAC-SHA256(key, data), both as hex strings. Returns hex.
 */
export function hmacSha256(keyHex: string, dataHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  return createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Generate a canonical hash for a selection rule.
 * The rule must be canonical JSON (deterministic key order).
 */
export function hashRule(rule: string): string {
  return sha256(rule);
}

/**
 * Generate a canonical hash for input identifiers.
 * Inputs are sorted lexicographically and joined with newlines.
 */
export function hashInputs(inputs: string[]): string {
  const sorted = [...inputs].sort();
  return sha256(sorted.join('\n'));
}

/**
 * Generate a commitment hash.
 * commitHash = SHA-256(beacon ‖ targetRound ‖ ruleHash ‖ inputsHash ‖ salt)
 * 
 * The separator '‖' is implemented as ':' to keep the hash deterministic
 * and avoid ambiguity.
 */
export function computeCommitHash(
  beacon: string,
  targetRound: number,
  ruleHash: string,
  inputsHash: string,
  saltHex: string,
): string {
  const preimage = [beacon, targetRound.toString(), ruleHash, inputsHash, saltHex].join(':');
  return sha256(preimage);
}

/**
 * Generate a random salt (32 bytes, returned as hex).
 */
export function generateSalt(): Uint8Array {
  return randomBytes(32);
}

/**
 * Convert Uint8Array to hex string.
 */
export function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

/**
 * Convert hex string to Uint8Array.
 */
export function fromHex(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

/**
 * Derive the selection output from beacon randomness and commitment data.
 * output = HMAC-SHA256(beacon.randomness, ruleHash ‖ inputsHash)
 */
export function deriveOutput(beaconRandomness: string, ruleHash: string, inputsHash: string): string {
  const data = sha256(ruleHash + ':' + inputsHash);
  return hmacSha256(beaconRandomness, data);
}
