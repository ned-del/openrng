/**
 * Build verification URLs for proofs
 */

import type { Proof } from '@openrng/sdk';

/** PolygonScan URL if the batch has been anchored on-chain */
export function getVerifyUrl(proof: Proof): string | null {
  const url = proof.polygonScan;
  // Filter out mock/pending URLs from dev mode
  if (!url || url.endsWith('/pending') || url.includes('pending...')) return null;
  return url;
}

/** Build a local verification info string for the proof */
export function getVerifyText(proof: Proof): string {
  const lines = [
    `Leaf: ${proof.leafHash}`,
    `Merkle Root: ${proof.merkleRoot}`,
    `Batch: ${proof.batchId}`,
  ];
  if (proof.polygonTx && !proof.polygonTx.includes('pending')) {
    lines.push(`Polygon TX: ${proof.polygonTx}`);
  }
  return lines.join('\n');
}

/** Truncate a hash for display: abc...xyz */
export function truncateHash(hash: string, chars = 4): string {
  if (hash.length <= chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}…${hash.slice(-chars)}`;
}
