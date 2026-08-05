import { bls12_381 } from '@noble/curves/bls12-381';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

const CHAIN = '52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971';
const PK = '83cf0f2896adee7eb8b5f01fcad3912212c437e0073e911fb90022d3e760183c8c4b450b6a0a6c3ac6a5776a2d1064510d1fec758c921cc22b0e17e63aaf4bcb5ed66304de9cf809bd274ca73bab4af5a6e9c76a4bc09e76eae8991ef5ece45a';

async function main() {
  const resp = await fetch(`https://api.drand.sh/${CHAIN}/public/latest`);
  const data = await resp.json() as { round: number; randomness: string; signature: string };
  console.log('Round:', data.round);

  // Round as 8-byte big-endian
  const msg = new Uint8Array(8);
  const view = new DataView(msg.buffer);
  view.setUint32(0, Math.floor(data.round / 0x100000000));
  view.setUint32(4, data.round & 0xFFFFFFFF);

  const sig = hexToBytes(data.signature);
  const pk = hexToBytes(PK);

  // Test verifyShortSignature (G1 sig, G2 pubkey) - quicknet scheme
  const DST = 'BLS_SIG_BLS12381G1_XMD:SHA-256_SSWU_RO_NUL_';
  
  try {
    const v = bls12_381.verifyShortSignature(sig, msg, pk, { DST });
    console.log('BLS verify (raw round bytes):', v);
  } catch(e: any) { console.log('raw verify error:', e.message); }

  // Also try with sha256 of msg
  try {
    const v2 = bls12_381.verifyShortSignature(sig, sha256(msg), pk, { DST });
    console.log('BLS verify (sha256(round)):', v2);
  } catch(e: any) { console.log('sha256 verify error:', e.message); }

  // Verify randomness = sha256(signature)
  const rand = bytesToHex(sha256(sig));
  console.log('randomness = sha256(sig):', rand === data.randomness);
}

main().catch(e => console.error(e));
