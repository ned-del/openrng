/**
 * @fairseal/commit — BLS12-381 signature verification for drand beacons
 * 
 * Cryptographic verification of drand quicknet beacon signatures.
 * Uses @noble/curves (audited, zero-dependency BLS12-381).
 * 
 * Scheme: bls-unchained-g1-rfc9380
 * - Signatures on G1 (48 bytes compressed)
 * - Public key on G2 (96 bytes compressed)  
 * - Message: SHA-256(round as 8-byte big-endian) → hash-to-curve G1
 * - Verification: e(sig, G2_generator) == e(H(SHA-256(round)), pubkey)
 * - Randomness derivation: randomness = SHA-256(signature)
 */

import { createHash } from 'node:crypto';

// Dynamic import for @noble/curves (handles ESM/CJS compatibility)
let _bls: any = null;
async function getBLS() {
  if (!_bls) {
    // Use dynamic import with .js extension for package exports compatibility
    _bls = await import('@noble/curves/bls12-381');
  }
  return _bls.bls12_381;
}

/** Domain Separation Tag for drand quicknet hash-to-curve */
const DRAND_QUICKNET_DST = 'BLS_SIG_BLS12381G1_XMD:SHA-256_SSWU_RO_NUL_';

/**
 * Verify a drand beacon round's BLS12-381 signature cryptographically.
 * 
 * This is REAL cryptographic verification — not a relay cross-check.
 * It verifies the BLS pairing equation against the chain's public key.
 * No trust in any server required.
 * 
 * @param round - The beacon round number
 * @param signatureHex - BLS signature (hex, 48 bytes compressed G1 point)
 * @param randomnessHex - Claimed randomness (hex)
 * @param publicKeyHex - Chain's public key (hex, 96 bytes compressed G2 point)
 * @returns true if cryptographically valid
 */
export async function verifyDrandBeacon(
  round: number,
  signatureHex: string,
  randomnessHex: string,
  publicKeyHex: string,
): Promise<boolean> {
  try {
    const bls12_381 = await getBLS();

    // 1. Construct message: SHA-256(round as 8-byte big-endian)
    const roundBytes = Buffer.alloc(8);
    roundBytes.writeBigUInt64BE(BigInt(round));
    const msgHash = createHash('sha256').update(roundBytes).digest();

    // 2. Parse signature (G1) and public key (G2)
    const sigPoint = bls12_381.G1.Point.fromHex(signatureHex);
    const pkPoint = bls12_381.G2.Point.fromHex(publicKeyHex);

    // 3. Hash message to G1 curve point using DST
    const msgPoint = bls12_381.G1.hashToCurve(msgHash, { DST: DRAND_QUICKNET_DST });

    // 4. BLS pairing check: e(sig, G2_generator) == e(H(msg), pk)
    const g2gen = bls12_381.G2.Point.BASE;
    const p1 = bls12_381.pairing(sigPoint, g2gen);
    const p2 = bls12_381.pairing(msgPoint, pkPoint);
    const valid = bls12_381.fields.Fp12.eql(p1, p2);

    if (!valid) return false;

    // 5. Verify randomness = SHA-256(signature_bytes)
    const sigBytes = Buffer.from(signatureHex, 'hex');
    const expectedRandomness = createHash('sha256').update(sigBytes).digest('hex');
    
    return expectedRandomness === randomnessHex;
  } catch {
    return false;
  }
}
