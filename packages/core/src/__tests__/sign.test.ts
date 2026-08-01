import { capture, signVEO, verifySignature, verifyIntegrity, generateSigningKeys, signVEOHmac } from '../index';

describe('VEO Signing', () => {
  const keys = generateSigningKeys();
  const baseVEO = () => capture({
    provider: 'test',
    prompt: 'What is 2+2?',
    output: '4',
    model: 'gpt-4o',
    confidence: 800,
  });

  test('Ed25519 round-trip: create → sign → verify === true', () => {
    const veo = baseVEO();
    const signed = signVEO(veo, keys.privateKey);
    expect(verifySignature(signed, keys.publicKey)).toBe(true);
  });

  test('Ed25519 double-verify: verify twice without mutation', () => {
    const veo = baseVEO();
    const signed = signVEO(veo, keys.privateKey);
    expect(verifySignature(signed, keys.publicKey)).toBe(true);
    expect(verifySignature(signed, keys.publicKey)).toBe(true); // must not mutate
  });

  test('Ed25519 wrong key rejects', () => {
    const veo = baseVEO();
    const signed = signVEO(veo, keys.privateKey);
    const otherKeys = generateSigningKeys();
    expect(verifySignature(signed, otherKeys.publicKey)).toBe(false);
  });

  test('Ed25519 tamper detection', () => {
    const veo = baseVEO();
    const signed = signVEO(veo, keys.privateKey);
    const tampered = JSON.parse(JSON.stringify(signed));
    tampered.execution.output_hash = 'TAMPERED';
    expect(verifySignature(tampered, keys.publicKey)).toBe(false);
  });

  test('Ed25519 verifier cannot forge (asymmetric)', () => {
    // Public key alone cannot create valid signatures
    const veo = baseVEO();
    expect(() => signVEO(veo, keys.publicKey)).toThrow();
  });

  test('HMAC round-trip: create → sign → verify === true', () => {
    const veo = baseVEO();
    const signed = signVEOHmac(veo, 'shared-secret');
    expect(verifySignature(signed, 'shared-secret')).toBe(true);
  });

  test('HMAC double-verify without mutation', () => {
    const veo = baseVEO();
    const signed = signVEOHmac(veo, 'secret');
    expect(verifySignature(signed, 'secret')).toBe(true);
    expect(verifySignature(signed, 'secret')).toBe(true);
  });

  test('verifyIntegrity: passes for untampered', () => {
    const veo = baseVEO();
    const signed = signVEO(veo, keys.privateKey);
    expect(verifyIntegrity(signed)).toBe(true);
  });

  test('verifyIntegrity: fails for tampered', () => {
    const veo = baseVEO();
    const signed = signVEO(veo, keys.privateKey);
    const tampered = JSON.parse(JSON.stringify(signed));
    tampered.execution.model_id = 'evil-model';
    expect(verifyIntegrity(tampered)).toBe(false);
  });

  test('verifyIntegrity: does not mutate input', () => {
    const veo = baseVEO();
    const signed = signVEO(veo, keys.privateKey);
    const before = JSON.stringify(signed);
    verifyIntegrity(signed);
    verifyIntegrity(signed);
    expect(JSON.stringify(signed)).toBe(before);
  });

  test('signVEO does not mutate input', () => {
    const veo = baseVEO();
    const before = JSON.stringify(veo);
    signVEO(veo, keys.privateKey);
    expect(JSON.stringify(veo)).toBe(before);
  });

  test('Ed25519 embedded public key: verify without explicit key', () => {
    const veo = baseVEO();
    const signed = signVEO(veo, keys.privateKey, keys.publicKey);
    expect(signed.proof?.provider_public_key).toBeDefined();
    // Verify using embedded key (no explicit key passed)
    expect(verifySignature(signed)).toBe(true);
  });

  test('Ed25519 embedded key: tampered VEO still fails', () => {
    const veo = baseVEO();
    const signed = signVEO(veo, keys.privateKey, keys.publicKey);
    const tampered = JSON.parse(JSON.stringify(signed));
    tampered.execution.output_hash = 'EVIL';
    expect(verifySignature(tampered)).toBe(false);
  });

  test('Ed25519 auto-extracts public key from private key', () => {
    const veo = baseVEO();
    const signed = signVEO(veo, keys.privateKey); // no explicit public key
    expect(signed.proof?.provider_public_key).toBeDefined();
    expect(signed.proof!.provider_public_key!.length).toBe(64); // 32 bytes hex
  });

  // ─── FORGE TESTS (documenting security boundaries) ───

  test('EXPECTED: zero-arg verify accepts attacker-forged VEO (consistency only, NOT provenance)', () => {
    // This test documents that zero-arg verifySignature() proves internal
    // consistency, NOT identity. An attacker can create a VEO with their own
    // key and it will self-verify. This is by design — zero-arg is a
    // consistency check. For provenance, use explicit keys or trustedKeys.
    const attackerKeys = generateSigningKeys();
    const forged = capture({ provider: 'legitimate-corp', prompt: 'evil', output: 'forged', model: 'gpt-4o' });
    const forgedSigned = signVEO(forged, attackerKeys.privateKey);
    // Zero-arg: passes (consistency only — this is expected!)
    expect(verifySignature(forgedSigned)).toBe(true);
    // Explicit legitimate key: FAILS (provenance check works)
    expect(verifySignature(forgedSigned, keys.publicKey)).toBe(false);
  });

  test('trustedKeys rejects VEO signed by untrusted key', () => {
    const attackerKeys = generateSigningKeys();
    const forged = capture({ provider: 'legit', prompt: 'x', output: 'y', model: 'z' });
    const forgedSigned = signVEO(forged, attackerKeys.privateKey);
    // trustedKeys with legitimate key rejects attacker's VEO
    expect(verifySignature(forgedSigned, { trustedKeys: [keys.publicKey] })).toBe(false);
  });

  test('trustedKeys accepts VEO signed by trusted key', () => {
    const veo = baseVEO();
    const signed = signVEO(veo, keys.privateKey);
    expect(verifySignature(signed, { trustedKeys: [keys.publicKey] })).toBe(true);
  });

  test('trustedKeys works with multiple keys', () => {
    const otherKeys = generateSigningKeys();
    const veo = baseVEO();
    const signed = signVEO(veo, keys.privateKey);
    // Accepted when our key is in the list
    expect(verifySignature(signed, { trustedKeys: [otherKeys.publicKey, keys.publicKey] })).toBe(true);
    // Rejected when our key is NOT in the list
    expect(verifySignature(signed, { trustedKeys: [otherKeys.publicKey] })).toBe(false);
  });
});
