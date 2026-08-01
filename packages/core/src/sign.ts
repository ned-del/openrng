/**
 * VEO-2 — Signing and content hashing
 */

import { createHash, createHmac } from 'crypto';
import type { VEO } from './types';
import { createVEOHash } from './veo';

/** Hash any string content (prompt, output, etc.) */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/** Hash binary/buffer content */
export function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/** Sign a VEO with HMAC-SHA256 (symmetric key) */
export function signVEO(veo: VEO, secretKey: string): VEO {
  // Sign the VEO hash (content before signature is added)
  const contentHash = createVEOHash(veo);
  const signature = createHmac('sha256', secretKey)
    .update(contentHash)
    .digest('hex');

  return {
    ...veo,
    proof: {
      ...veo.proof,
      algorithm: 'HMAC-SHA256',
      provider_signature: signature,
    },
    lifecycle: {
      ...veo.lifecycle!,
      state: 'signed',
      signed_at: new Date().toISOString(),
    },
    metadata: {
      ...veo.metadata,
      _content_hash: contentHash,
    },
  };
}

/** Verify a VEO's HMAC-SHA256 signature AND content integrity */
export function verifySignature(veo: VEO, secretKey: string): boolean {
  if (!veo.proof?.provider_signature) return false;
  if (veo.proof.algorithm !== 'HMAC-SHA256') return false;

  const storedHash = (veo.metadata as any)?._content_hash;
  if (!storedHash) return false;

  // Step 1: Verify signature matches stored hash
  const expectedSig = createHmac('sha256', secretKey)
    .update(storedHash)
    .digest('hex');
  if (expectedSig !== veo.proof.provider_signature) return false;

  // Step 2: Verify content integrity (stored hash matches actual content)
  const stripped = JSON.parse(JSON.stringify(veo));
  delete stripped.proof.provider_signature;
  delete stripped.proof.algorithm;
  stripped.lifecycle.state = 'created';
  delete stripped.lifecycle.signed_at;
  delete stripped.metadata._content_hash;
  if (Object.keys(stripped.proof).length === 0) delete stripped.proof;

  const recomputedHash = createVEOHash(stripped as VEO);
  return recomputedHash === storedHash;
}

/** Verify that a VEO's content hasn't been tampered with (re-hash and compare) */
export function verifyIntegrity(veo: VEO): boolean {
  const contentHash = (veo.metadata as any)?._content_hash;
  if (!contentHash) return false;

  // Strip signature fields and re-hash
  const original: any = { ...veo };
  delete original.proof?.provider_signature;
  delete original.proof?.algorithm;
  if (original.lifecycle) {
    original.lifecycle = { ...original.lifecycle, state: 'created' };
    delete original.lifecycle.signed_at;
  }
  if (original.metadata) {
    original.metadata = { ...original.metadata };
    delete original.metadata._content_hash;
  }

  const recomputed = createVEOHash(original as VEO);
  return recomputed === contentHash;
}
