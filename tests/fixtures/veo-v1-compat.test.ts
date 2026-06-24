/**
 * VEO-1 v1.0 — Golden Fixture Compatibility Tests
 *
 * These tests MUST remain permanent. They verify that the frozen VEO-1.0
 * protocol produces consistent results across code changes.
 */

import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { sha256Hex, computeEntropyHash, verifyEntropyObject } from '../../src/veo/verify.js';
import { canonicalizeVEOForSigning } from '../../src/veo/canonicalize.js';
import { verifyProviderSignature } from '../../src/veo/signing.js';
import { VerifiableEntropyObject } from '../../src/veo/types.js';

// ── Load Fixtures ──────────────────────────────────────────

const fixturesDir = path.join(__dirname, '.');
const signedFixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'veo_v1_fixture.json'), 'utf-8'));
const unsignedFixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'veo_v1_unsigned_fixture.json'), 'utf-8'));
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../../docs/rfc/veo-1.schema.json'), 'utf-8'));

const signedVEO: VerifiableEntropyObject = signedFixture.object;
const unsignedVEO: VerifiableEntropyObject = unsignedFixture.object;

// ── Schema Validation ──────────────────────────────────────

describe('VEO-1.0 Fixture — Schema Validation', () => {
  let validate: any;

  beforeAll(() => {
    const ajv = new Ajv({ allErrors: true, strict: false, validateSchema: false });
    addFormats(ajv);
    validate = ajv.compile(schema);
  });

  test('signed fixture passes schema validation', () => {
    const valid = validate(signedVEO);
    if (!valid) console.log('Schema errors:', validate.errors);
    expect(valid).toBe(true);
  });

  test('unsigned fixture passes schema validation', () => {
    const valid = validate(unsignedVEO);
    if (!valid) console.log('Schema errors:', validate.errors);
    expect(valid).toBe(true);
  });
});

// ── Hash Verification ──────────────────────────────────────

describe('VEO-1.0 Fixture — Hash Verification', () => {
  test('signed fixture hash is reproducible', () => {
    const computed = computeEntropyHash(signedVEO.entropy);
    expect(computed).toBe(signedVEO.entropy_hash.toLowerCase());
  });

  test('unsigned fixture hash is reproducible', () => {
    const computed = computeEntropyHash(unsignedVEO.entropy);
    expect(computed).toBe(unsignedVEO.entropy_hash.toLowerCase());
  });
});

// ── Canonicalization ────────────────────────────────────────

describe('VEO-1.0 Fixture — Canonicalization', () => {
  test('signed fixture canonical hash matches stored hash', () => {
    const canonical = canonicalizeVEOForSigning(signedVEO);
    const hash = sha256Hex(canonical);
    expect(hash).toBe(signedFixture._meta.canonical_hash);
  });

  test('unsigned fixture canonical hash matches stored hash', () => {
    const canonical = canonicalizeVEOForSigning(unsignedVEO);
    const hash = sha256Hex(canonical);
    expect(hash).toBe(unsignedFixture._meta.canonical_hash);
  });

  test('canonicalization is deterministic', () => {
    const a = canonicalizeVEOForSigning(signedVEO);
    const b = canonicalizeVEOForSigning(signedVEO);
    expect(a).toBe(b);
  });
});

// ── Signature Verification ─────────────────────────────────

describe('VEO-1.0 Fixture — Signature Verification', () => {
  test('signed fixture signature verifies', () => {
    const result = verifyProviderSignature(signedVEO);
    expect(result).toBe(true);
  });

  test('unsigned fixture has no signature', () => {
    const result = verifyProviderSignature(unsignedVEO);
    expect(result).toBeNull();
  });
});

// ── Full Verification ──────────────────────────────────────

describe('VEO-1.0 Fixture — Full Verification', () => {
  test('signed fixture verifies as cryptographically_verified', async () => {
    const result = await verifyEntropyObject(signedVEO);
    expect(result.valid).toBe(true);
    expect(result.verification_level).toBe('cryptographically_verified');
    expect(result.checks.schema).toBe(true);
    expect(result.checks.hash).toBe(true);
    expect(result.checks.signature).toBe(true);
  });

  test('unsigned fixture verifies as structurally_valid_unsigned', async () => {
    const result = await verifyEntropyObject(unsignedVEO);
    expect(result.valid).toBe(true);
    expect(result.verification_level).toBe('structurally_valid_unsigned');
    expect(result.checks.schema).toBe(true);
    expect(result.checks.hash).toBe(true);
    expect(result.checks.signature).toBeNull();
  });
});

// ── Mutation Detection ─────────────────────────────────────

describe('VEO-1.0 Fixture — Mutation Detection', () => {
  test('mutated entropy fails hash check', async () => {
    const mutated = { ...signedVEO, entropy: '0xdeadbeef1234' };
    const result = await verifyEntropyObject(mutated);
    expect(result.valid).toBe(false);
    expect(result.checks.hash).toBe(false);
    expect(result.errors).toContain('VEO_HASH_MISMATCH');
  });

  test('mutated entropy fails signature check on signed fixture', () => {
    const mutated = { ...signedVEO, entropy: '0xdeadbeef1234' };
    const result = verifyProviderSignature(mutated);
    expect(result).toBe(false);
  });

  test('mutated entropy_hash fails verification', async () => {
    const mutated = { ...signedVEO, entropy_hash: '0x' + '00'.repeat(32) };
    const result = await verifyEntropyObject(mutated);
    expect(result.valid).toBe(false);
    expect(result.verification_level).toBe('invalid');
  });

  test('wrong standard fails schema check', async () => {
    const mutated = { ...signedVEO, standard: 'VEO-2' as any };
    const result = await verifyEntropyObject(mutated);
    expect(result.valid).toBe(false);
    expect(result.checks.schema).toBe(false);
  });
});

// ── Required Fields ────────────────────────────────────────

describe('VEO-1.0 Fixture — Required Fields Present', () => {
  const requiredFields = [
    'standard', 'version', 'object_id', 'object_class',
    'entropy', 'entropy_hash', 'issued_at', 'provider',
    'sources', 'proof', 'confidence',
  ];

  for (const field of requiredFields) {
    test(`signed fixture has required field: ${field}`, () => {
      expect(signedVEO).toHaveProperty(field);
    });

    test(`unsigned fixture has required field: ${field}`, () => {
      expect(unsignedVEO).toHaveProperty(field);
    });
  }
});
