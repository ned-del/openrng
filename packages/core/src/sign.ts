/**
 * VEO-2 — Signing and verification
 *
 * Default: Ed25519 (asymmetric) — anyone can verify without forging
 * Optional: HMAC-SHA256 (symmetric) — lightweight, shared-secret mode
 */

import { createHash, createHmac, generateKeyPairSync, createPublicKey, sign, verify, KeyObject } from 'crypto';
import type { VEO } from './types';
import { createVEOHash } from './veo';

// ─── Content Hashing ───

/** Hash any string content (prompt, output, etc.) */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/** Hash binary/buffer content */
export function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

// ─── Key Generation ───

export interface KeyPair {
  publicKey: string;   // PEM format
  privateKey: string;  // PEM format
}

/** Generate an Ed25519 key pair for signing VEOs */
export function generateSigningKeys(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

// ─── Ed25519 Signing (default — asymmetric) ───

/** Sign a VEO with Ed25519 (asymmetric — verifier can't forge) */
export function signVEO(veo: VEO, privateKey: string, publicKey?: string): VEO {
  const contentHash = createVEOHash(veo);
  const signature = sign(null, Buffer.from(contentHash), privateKey).toString('hex');

  // Extract public key from private key if not provided
  let pubKeyHex: string | undefined;
  if (publicKey) {
    pubKeyHex = extractPublicKeyHex(publicKey);
  } else {
    try {
      const keyObj = createPublicKey(privateKey);
      pubKeyHex = keyObj.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex');
    } catch { /* optional */ }
  }

  const signed: VEO = JSON.parse(JSON.stringify(veo)); // deep clone
  signed.proof = {
    ...signed.proof,
    algorithm: 'Ed25519',
    provider_signature: signature,
    provider_public_key: pubKeyHex,
  };
  signed.lifecycle = {
    ...signed.lifecycle!,
    state: 'signed',
    signed_at: new Date().toISOString(),
  };
  signed.metadata = {
    ...signed.metadata,
    _content_hash: contentHash,
  };

  return signed;
}

/** Extract raw 32-byte Ed25519 public key hex from PEM */
function extractPublicKeyHex(pem: string): string {
  try {
    const keyObj = createPublicKey(pem);
    return keyObj.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex');
  } catch {
    return pem; // assume already hex
  }
}

export interface VerifyOptions {
  /** Trusted public keys (PEM or hex). If provided, embedded key must match one. */
  trustedKeys?: string[];
}

/**
 * Verify a VEO's Ed25519 signature and content integrity.
 *
 * With explicit key: verifies provenance ("was this signed by THIS entity?").
 * With trustedKeys: verifies the embedded key is in your allowlist.
 * Without key (zero-arg): verifies INTERNAL CONSISTENCY only — proves the VEO
 * hasn't been modified since signing, but NOT who signed it. Any competent
 * attacker can produce a VEO that passes zero-arg verification.
 *
 * For third-party verification, always provide a trusted key or trustedKeys.
 * For full provenance verification, use blockchain-anchored VEOs (@openrng/verify).
 */
export function verifySignature(veo: VEO, publicKeyOrOpts?: string | VerifyOptions): boolean {
  if (!veo.proof?.provider_signature) return false;

  // Parse arguments
  let explicitKey: string | undefined;
  let trustedKeys: string[] | undefined;

  if (typeof publicKeyOrOpts === 'string') {
    explicitKey = publicKeyOrOpts;
  } else if (publicKeyOrOpts && typeof publicKeyOrOpts === 'object') {
    trustedKeys = publicKeyOrOpts.trustedKeys;
  }

  // Resolve public key: explicit > embedded > fail
  const embeddedKey = veo.proof.provider_public_key;
  let resolvedKey = explicitKey || embeddedKey;
  if (!resolvedKey) return false;

  // If trustedKeys provided (even empty), enforce it — fail closed
  if (trustedKeys !== undefined) {
    if (trustedKeys.length === 0) return false; // empty allowlist = trust no one
    if (!embeddedKey) return false;
    const embeddedHex = /^[a-f0-9]{64}$/i.test(embeddedKey) ? embeddedKey : extractPublicKeyHex(embeddedKey);
    const isAllowed = trustedKeys.some(tk => {
      const tkHex = /^[a-f0-9]{64}$/i.test(tk) ? tk : extractPublicKeyHex(tk);
      return tkHex === embeddedHex;
    });
    if (!isAllowed) return false;
  }

  // If it's raw hex (32 bytes = 64 hex chars), reconstruct PEM
  if (/^[a-f0-9]{64}$/i.test(resolvedKey)) {
    try {
      const prefix = Buffer.from('302a300506032b6570032100', 'hex');
      const keyBuf = Buffer.concat([prefix, Buffer.from(resolvedKey, 'hex')]);
      const pem = '-----BEGIN PUBLIC KEY-----\n' + keyBuf.toString('base64') + '\n-----END PUBLIC KEY-----';
      resolvedKey = pem;
    } catch { return false; }
  }

  const storedHash = (veo.metadata as any)?._content_hash;
  if (!storedHash) return false;

  // Step 1: Verify signature using public key
  const algorithm = veo.proof.algorithm || 'Ed25519';

  if (algorithm === 'Ed25519') {
    try {
      const sigValid = verify(
        null,
        Buffer.from(storedHash),
        resolvedKey,
        Buffer.from(veo.proof.provider_signature, 'hex'),
      );
      if (!sigValid) return false;
    } catch {
      return false;
    }
  } else if (algorithm === 'HMAC-SHA256') {
    // Legacy symmetric mode
    const expected = createHmac('sha256', resolvedKey!)
      .update(storedHash)
      .digest('hex');
    if (expected !== veo.proof.provider_signature) return false;
  } else {
    return false;
  }

  // Step 2: Verify content integrity (hash matches actual content)
  const stripped = JSON.parse(JSON.stringify(veo)); // deep clone — never mutate input
  delete stripped.proof.provider_signature;
  delete stripped.proof.algorithm;
  delete stripped.proof.provider_public_key;
  stripped.lifecycle.state = 'created';
  delete stripped.lifecycle.signed_at;
  delete stripped.metadata._content_hash;
  if (Object.keys(stripped.proof).length === 0) delete stripped.proof;
  if (stripped.metadata && Object.keys(stripped.metadata).length === 0) delete stripped.metadata;

  const recomputedHash = createVEOHash(stripped as VEO);
  return recomputedHash === storedHash;
}

// ─── HMAC Signing (legacy — symmetric, lightweight) ───

/** Sign a VEO with HMAC-SHA256 (symmetric — shared secret) */
export function signVEOHmac(veo: VEO, secretKey: string): VEO {
  const contentHash = createVEOHash(veo);
  const signature = createHmac('sha256', secretKey)
    .update(contentHash)
    .digest('hex');

  const signed: VEO = JSON.parse(JSON.stringify(veo)); // deep clone
  signed.proof = {
    ...signed.proof,
    algorithm: 'HMAC-SHA256',
    provider_signature: signature,
  };
  signed.lifecycle = {
    ...signed.lifecycle!,
    state: 'signed',
    signed_at: new Date().toISOString(),
  };
  signed.metadata = {
    ...signed.metadata,
    _content_hash: contentHash,
  };

  return signed;
}

/** Verify content integrity (no key needed — just checks hash) */
export function verifyIntegrity(veo: VEO): boolean {
  const storedHash = (veo.metadata as any)?._content_hash;
  if (!storedHash) return false;

  // Deep clone — never mutate input
  const stripped = JSON.parse(JSON.stringify(veo));
  delete stripped.proof?.provider_signature;
  delete stripped.proof?.algorithm;
  delete stripped.proof?.provider_public_key;
  if (stripped.lifecycle) {
    stripped.lifecycle.state = 'created';
    delete stripped.lifecycle.signed_at;
  }
  if (stripped.metadata) {
    delete stripped.metadata._content_hash;
    if (Object.keys(stripped.metadata).length === 0) delete stripped.metadata;
  }
  if (stripped.proof && Object.keys(stripped.proof).length === 0) delete stripped.proof;

  const recomputed = createVEOHash(stripped as VEO);
  return recomputed === storedHash;
}
