/**
 * VEO-1 — Canonical Object Signing Payload
 *
 * Produces a deterministic JSON string from a VEO object for signing.
 * - Deep sorts object keys alphabetically
 * - Removes undefined values
 * - Preserves null values
 * - Excludes proof.provider_signature, proof.provider_public_key,
 *   proof.verification_endpoint, anchor.transaction_hash,
 *   anchor.anchor_timestamp, anchor.block_number
 */

import { VerifiableEntropyObject } from './types.js';

/**
 * Deep sort all object keys alphabetically and remove undefined values.
 */
function deepSortKeys(obj: unknown): unknown {
  if (obj === null) return null;
  if (obj === undefined) return undefined;
  if (Array.isArray(obj)) return obj.map(deepSortKeys);
  if (typeof obj !== 'object') return obj;

  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  for (const key of keys) {
    const val = (obj as Record<string, unknown>)[key];
    if (val === undefined) continue; // skip undefined
    sorted[key] = deepSortKeys(val);
  }
  return sorted;
}

/**
 * Build the canonical signing payload from a VEO object.
 *
 * Excludes fields that are populated after signing or are the signature itself.
 */
export function canonicalizeVEOForSigning(veo: VerifiableEntropyObject): string {
  // Build a clean copy excluding signature-specific and post-anchor fields
  const canonical: Record<string, unknown> = {
    standard: veo.standard,
    version: veo.version,
    object_id: veo.object_id,
    object_class: veo.object_class,
    entropy: veo.entropy,
    entropy_hash: veo.entropy_hash,
    issued_at: veo.issued_at,
    expires_at: veo.expires_at ?? null,
    provider: veo.provider,
    sources: veo.sources,
    aggregation: veo.aggregation ?? null,
    confidence: veo.confidence,
    lineage: veo.lineage ?? null,
    policy: veo.policy ?? null,
  };

  // Anchor is always null in the signing payload because:
  // 1. The signature is computed before anchoring happens
  // 2. Anchor contains post-signing data (tx_hash, timestamp, block_number)
  // 3. The canonical form must match what was signed at generation time
  canonical.anchor = null;

  return JSON.stringify(deepSortKeys(canonical));
}
