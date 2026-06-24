/**
 * VEO-1 Tests — Full signing + anchoring coverage
 */

import { ethers } from 'ethers';
import { calculateEntropyConfidence, gradeForScore } from '../ecs.js';
import { sha256Hex, computeEntropyHash, verifyEntropyObject } from '../verify.js';
import { generateVEOObject, AnchorNotAvailableError, isAnchoringConfigured } from '../generator.js';
import { canonicalizeVEOForSigning } from '../canonicalize.js';
import { verifyProviderSignature, signVEOObject, isSigningConfigured } from '../signing.js';
import { EntropySourceRecord, VerifiableEntropyObject, EntropyPolicy } from '../types.js';

// ── Helpers ─────────────────────────────────────────────────

function makeSources(count: number, fallbackCount: number = 0): EntropySourceRecord[] {
  const ids = ['drand-mainnet', 'bitcoin', 'polygon'];
  const types = ['randomness_beacon', 'blockchain_block_hash', 'blockchain_block_hash'];
  return Array.from({ length: count }, (_, i) => ({
    source_id: ids[i % ids.length],
    source_type: types[i % types.length],
    source_reference: i < (count - fallbackCount) ? `live-ref-${i}` : 'fallback-crypto-random',
    timestamp: new Date().toISOString(),
    entropy_hash: sha256Hex('0x' + 'ab'.repeat(32)),
  }));
}

function makeValidVEO(overrides?: Partial<VerifiableEntropyObject>): VerifiableEntropyObject {
  const entropy = '0x' + 'ab'.repeat(32);
  return {
    standard: 'VEO-1',
    version: '1.0',
    object_id: 'veo_test123',
    object_class: 'VEO-1B',
    entropy,
    entropy_hash: computeEntropyHash(entropy),
    issued_at: new Date().toISOString(),
    provider: 'OpenRNG',
    sources: makeSources(3),
    confidence: { score: 871, grade: 'AA', source_status: 'live' },
    proof: { proof_type: 'none', proof_status: 'unsigned' },
    anchor: null,
    lineage: null,
    policy: null,
    ...overrides,
  };
}

// ── Canonicalization Tests ──────────────────────────────────

describe('Canonicalization', () => {
  test('produces deterministic output', () => {
    const veo = makeValidVEO();
    const a = canonicalizeVEOForSigning(veo);
    const b = canonicalizeVEOForSigning(veo);
    expect(a).toBe(b);
  });

  test('output is valid JSON with sorted keys', () => {
    const veo = makeValidVEO();
    const canonical = canonicalizeVEOForSigning(veo);
    const parsed = JSON.parse(canonical);
    const keys = Object.keys(parsed);
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
  });

  test('excludes provider_signature and provider_public_key', () => {
    const veo = makeValidVEO({
      proof: {
        proof_type: 'provider_signature',
        provider_signature: '0xfakesig',
        provider_public_key: '0xfakekey',
        provider_address: '0xfakeaddr',
      },
    });
    const canonical = canonicalizeVEOForSigning(veo);
    expect(canonical).not.toContain('provider_signature');
    expect(canonical).not.toContain('provider_public_key');
  });

  test('preserves null values', () => {
    const veo = makeValidVEO();
    const canonical = canonicalizeVEOForSigning(veo);
    expect(canonical).toContain('"anchor":null');
    expect(canonical).toContain('"lineage":null');
  });

  test('anchor is always null in canonical (signed before anchoring)', () => {
    const veo = makeValidVEO({
      anchor: {
        anchor_type: 'blockchain',
        chain: 'polygon-amoy',
        contract: '0xtest',
        transaction_hash: '0xshouldbeexcluded',
        merkle_root: '0xroot123',
        anchor_timestamp: '2026-01-01T00:00:00Z',
      },
    });
    const canonical = canonicalizeVEOForSigning(veo);
    expect(canonical).toContain('"anchor":null');
    expect(canonical).not.toContain('transaction_hash');
    expect(canonical).not.toContain('polygon-amoy');
  });
});

// ── ECS Tests ───────────────────────────────────────────────

describe('ECS Calculator', () => {
  test('score is in valid range 0–1000', () => {
    const result = calculateEntropyConfidence({ sources: makeSources(3), issuedAt: new Date() });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1000);
  });

  test('grade mapping is correct', () => {
    expect(gradeForScore(950)).toBe('AAA');
    expect(gradeForScore(850)).toBe('AA');
    expect(gradeForScore(750)).toBe('A');
    expect(gradeForScore(650)).toBe('B');
    expect(gradeForScore(550)).toBe('C');
    expect(gradeForScore(400)).toBe('LOW');
  });

  test('1 fallback penalizes verification_success and manipulation_resistance', () => {
    const allLive = calculateEntropyConfidence({ sources: makeSources(3, 0), issuedAt: new Date() });
    const oneFb = calculateEntropyConfidence({ sources: makeSources(3, 1), issuedAt: new Date() });
    expect(oneFb.verification_success).toBe(allLive.verification_success! - 100);
    expect(oneFb.manipulation_resistance).toBe(allLive.manipulation_resistance! - 50);
  });

  test('all fallback: ECS capped at 650, grade capped at B', () => {
    const allFb = calculateEntropyConfidence({ sources: makeSources(3, 3), issuedAt: new Date() });
    expect(allFb.score).toBeLessThanOrEqual(650);
    expect(['B', 'C', 'LOW']).toContain(allFb.grade);
  });

  test('confidence includes fallback_count, live_source_count, source_status', () => {
    const result = calculateEntropyConfidence({ sources: makeSources(3, 1), issuedAt: new Date() });
    expect(result.fallback_count).toBe(1);
    expect(result.live_source_count).toBe(2);
    expect(result.source_status).toBe('degraded');
  });
});

// ── Hash Tests ──────────────────────────────────────────────

describe('Entropy Hash', () => {
  test('sha256Hex is deterministic', () => {
    expect(sha256Hex('test')).toBe(sha256Hex('test'));
    expect(sha256Hex('test')).toMatch(/^0x[0-9a-f]{64}$/);
  });

  test('computeEntropyHash is case-insensitive', () => {
    expect(computeEntropyHash('0xABCD')).toBe(computeEntropyHash('0xabcd'));
  });
});

// ── Signing Tests ───────────────────────────────────────────

describe('Provider Signing', () => {
  const testWallet = ethers.Wallet.createRandom();

  beforeEach(() => {
    process.env.OPENRNG_PROVIDER_PRIVATE_KEY = testWallet.privateKey;
    process.env.OPENRNG_PROVIDER_PUBLIC_KEY = testWallet.signingKey.publicKey;
    process.env.OPENRNG_PROVIDER_ADDRESS = testWallet.address;
  });

  afterEach(() => {
    delete process.env.OPENRNG_PROVIDER_PRIVATE_KEY;
    delete process.env.OPENRNG_PROVIDER_PUBLIC_KEY;
    delete process.env.OPENRNG_PROVIDER_ADDRESS;
  });

  test('signVEOObject produces real signature', async () => {
    const veo = makeValidVEO();
    // Reset cached wallet for fresh test
    (await import('../signing.js')).isSigningConfigured();
    const proof = await signVEOObject(veo);
    expect(proof.proof_status).toBe('cryptographically_signed');
    expect(proof.provider_signature).toMatch(/^0x/);
    expect(proof.provider_signature!.length).toBeGreaterThan(20);
    expect(proof.signature_algorithm).toBe('secp256k1_eip191');
  });

  test('verifyProviderSignature returns true for valid signature', async () => {
    const veo = makeValidVEO();
    veo.proof = await signVEOObject(veo);
    const result = verifyProviderSignature(veo);
    expect(result).toBe(true);
  });

  test('verifyProviderSignature returns false for tampered entropy', async () => {
    const veo = makeValidVEO();
    veo.proof = await signVEOObject(veo);
    // Tamper after signing
    veo.entropy = '0xdeadbeef';
    const result = verifyProviderSignature(veo);
    expect(result).toBe(false);
  });

  test('verifyProviderSignature returns null for unsigned object', () => {
    const veo = makeValidVEO();
    const result = verifyProviderSignature(veo);
    expect(result).toBeNull();
  });
});

// ── Verification Tests ──────────────────────────────────────

describe('Verify Entropy Object', () => {
  test('unsigned valid object → structurally_valid_unsigned', async () => {
    const obj = makeValidVEO();
    const result = await verifyEntropyObject(obj);
    expect(result.valid).toBe(true);
    expect(result.verification_level).toBe('structurally_valid_unsigned');
    expect(result.statuses.proof_status).toBe('unsigned');
    expect(result.statuses.anchor_status).toBe('unanchored');
    expect(result.statuses.policy_status).toBe('not_applicable');
  });

  test('tampered entropy → invalid + VEO_HASH_MISMATCH', async () => {
    const obj = makeValidVEO({ entropy: '0xdeadbeef' });
    const result = await verifyEntropyObject(obj);
    expect(result.valid).toBe(false);
    expect(result.verification_level).toBe('invalid');
    expect(result.errors).toContain('VEO_HASH_MISMATCH');
  });

  test('policy failed → policy_failed level', async () => {
    const obj = makeValidVEO();
    obj.confidence.score = 100;
    const result = await verifyEntropyObject(obj, { min_ecs: 900 });
    expect(result.verification_level).toBe('policy_failed');
    expect(result.statuses.policy_status).toBe('failed');
  });

  test('anchor required but missing → policy_failed', async () => {
    const obj = makeValidVEO();
    const result = await verifyEntropyObject(obj, { anchor_required: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('VEO_ANCHOR_MISSING');
    expect(result.verification_level).toBe('policy_failed');
  });

  test('TODO signature → unsigned', async () => {
    const obj = makeValidVEO({
      proof: {
        proof_type: 'provider_signature',
        provider_public_key: 'TODO',
        provider_signature: 'TODO_SIGN_CANONICAL_OBJECT',
      },
    });
    const result = await verifyEntropyObject(obj);
    expect(result.checks.signature).toBeNull();
    expect(result.statuses.proof_status).toBe('unsigned');
  });

  test('signed object verifies as cryptographically_verified', async () => {
    const wallet = ethers.Wallet.createRandom();
    process.env.OPENRNG_PROVIDER_PRIVATE_KEY = wallet.privateKey;
    process.env.OPENRNG_PROVIDER_PUBLIC_KEY = wallet.signingKey.publicKey;
    process.env.OPENRNG_PROVIDER_ADDRESS = wallet.address;

    try {
      const obj = makeValidVEO();
      obj.proof = await signVEOObject(obj);
      const result = await verifyEntropyObject(obj);
      expect(result.valid).toBe(true);
      expect(result.checks.signature).toBe(true);
      expect(result.statuses.proof_status).toBe('cryptographically_verified');
      expect(result.verification_level).toBe('cryptographically_verified');
    } finally {
      delete process.env.OPENRNG_PROVIDER_PRIVATE_KEY;
      delete process.env.OPENRNG_PROVIDER_PUBLIC_KEY;
      delete process.env.OPENRNG_PROVIDER_ADDRESS;
    }
  });

  test('bad signature → invalid + VEO_SIGNATURE_INVALID', async () => {
    const obj = makeValidVEO({
      proof: {
        proof_type: 'provider_signature',
        signature_algorithm: 'secp256k1_eip191',
        provider_address: '0x0000000000000000000000000000000000000001',
        provider_signature: '0x' + 'ab'.repeat(65),
      },
    });
    const result = await verifyEntropyObject(obj);
    expect(result.valid).toBe(false);
    expect(result.checks.signature).toBe(false);
    expect(result.statuses.proof_status).toBe('invalid_signature');
    expect(result.verification_level).toBe('invalid');
    expect(result.errors).toContain('VEO_SIGNATURE_INVALID');
  });
});

// ── Generator Tests ─────────────────────────────────────────

describe('Generator', () => {
  test('unsigned mode: proof_status unsigned when no signing key', async () => {
    delete process.env.OPENRNG_PROVIDER_PRIVATE_KEY;
    const obj = await generateVEOObject();
    expect(obj.proof.proof_status).toBe('unsigned');
    expect(obj.proof.proof_type).toBe('none');
    expect(obj.object_class).toBe('VEO-1B');
  });

  test('anchor_required throws when not configured', async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      await expect(
        generateVEOObject({ anchor_required: true })
      ).rejects.toThrow(AnchorNotAvailableError);
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  test('isAnchoringConfigured returns false in dev mode', () => {
    expect(isAnchoringConfigured()).toBe(false);
  });
});
