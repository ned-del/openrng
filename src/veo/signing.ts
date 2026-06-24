/**
 * VEO-1 — Provider Signing & Verification
 *
 * Uses secp256k1 / EIP-191 signing via ethers v6.
 * Signs the SHA-256 hash of the canonical VEO payload.
 */

import { ethers } from 'ethers';
import { VerifiableEntropyObject, ProofPackage } from './types.js';
import { canonicalizeVEOForSigning } from './canonicalize.js';
import { sha256Hex } from './verify.js';
import { logger } from '../utils/logger.js';

// ── Signing config cache ────────────────────────────────────

let cachedWallet: ethers.Wallet | null = null;
let cachedAddress: string | null = null;
let cachedPublicKey: string | null = null;
let cachedKeyFingerprint: string | null = null;

/** Reset cached wallet (for testing) */
export function resetSigningCache(): void {
  cachedWallet = null;
  cachedAddress = null;
  cachedPublicKey = null;
  cachedKeyFingerprint = null;
}

function getSigningWallet(): ethers.Wallet | null {
  const currentKey = process.env.OPENRNG_PROVIDER_PRIVATE_KEY || '';
  // Invalidate cache if env changed
  if (cachedKeyFingerprint !== null && cachedKeyFingerprint !== currentKey) {
    resetSigningCache();
  }
  if (cachedWallet) return cachedWallet;
  cachedKeyFingerprint = currentKey;

  const privKey = process.env.OPENRNG_PROVIDER_PRIVATE_KEY;
  if (!privKey || privKey === 'TODO' || privKey.length < 10) return null;

  try {
    cachedWallet = new ethers.Wallet(privKey);
    cachedAddress = cachedWallet.address;
    cachedPublicKey = process.env.OPENRNG_PROVIDER_PUBLIC_KEY || cachedWallet.signingKey.publicKey;
    logger.info(`VEO signing: configured provider=${cachedAddress}`);
    return cachedWallet;
  } catch (err: any) {
    logger.error(`VEO signing: invalid provider key — ${err.message}`);
    return null;
  }
}

export function isSigningConfigured(): boolean {
  return getSigningWallet() !== null;
}

export function getProviderAddress(): string | null {
  getSigningWallet();
  return cachedAddress;
}

export function getProviderPublicKey(): string | null {
  getSigningWallet();
  return cachedPublicKey;
}

/**
 * Sign a VEO object. Mutates the proof field in place.
 * Returns the signed proof package.
 */
export async function signVEOObject(veo: VerifiableEntropyObject): Promise<ProofPackage> {
  const wallet = getSigningWallet();
  if (!wallet) {
    return {
      proof_type: 'none',
      proof_status: 'unsigned',
      verification_endpoint: 'https://api.openrng.io/v2/entropy/verify',
    };
  }

  const canonical = canonicalizeVEOForSigning(veo);
  const payloadHash = sha256Hex(canonical);

  // EIP-191 personal sign over the payload hash
  const signature = await wallet.signMessage(payloadHash);

  return {
    proof_type: 'provider_signature',
    proof_status: 'cryptographically_signed',
    signature_algorithm: 'secp256k1_eip191',
    provider_public_key: cachedPublicKey!,
    provider_address: cachedAddress!,
    provider_signature: signature,
    canonical_hash: payloadHash,
    verification_endpoint: 'https://api.openrng.io/v2/entropy/verify',
  };
}

/**
 * Verify a provider signature on a VEO object.
 *
 * Returns:
 *   true  — signature valid
 *   false — signature invalid
 *   null  — no signature present
 */
export function verifyProviderSignature(veo: VerifiableEntropyObject): boolean | null {
  const sig = veo.proof?.provider_signature;
  const address = veo.proof?.provider_address as string | undefined;

  // No signature
  if (!sig || sig === 'TODO_SIGN_CANONICAL_OBJECT' || sig === 'TODO' || sig === '') {
    return null;
  }

  // Must have an address to verify against
  if (!address || address === 'TODO') {
    return null;
  }

  try {
    const canonical = canonicalizeVEOForSigning(veo);
    const payloadHash = sha256Hex(canonical);

    // Recover the signer address from the EIP-191 signed message
    const recoveredAddress = ethers.verifyMessage(payloadHash, sig);

    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (err: any) {
    logger.warn(`VEO signature verification failed: ${err.message}`);
    return false;
  }
}
