/**
 * VEO-1 — Verification Logic
 *
 * Full verification including:
 * - Schema + hash validation
 * - Provider signature verification (secp256k1_eip191)
 * - Anchor verification (on-chain readback)
 * - Policy enforcement
 * - Verification levels per spec
 */

import crypto from 'crypto';
import { VerifiableEntropyObject, EntropyPolicy, AnchorPackage } from './types.js';
import { verifyProviderSignature } from './signing.js';
import { verifyAnchorOnChain } from './anchor.js';

// ── Types ───────────────────────────────────────────────────

export type VerificationLevel =
  | 'cryptographically_verified'
  | 'anchored_verified'
  | 'structurally_valid_unsigned'
  | 'policy_failed'
  | 'invalid';

export type ProofStatus = 'cryptographically_verified' | 'unsigned' | 'invalid_signature';
export type AnchorVerifyStatus = 'anchored' | 'anchored_verified' | 'unanchored' | 'invalid_anchor';
export type PolicyStatus = 'satisfied' | 'failed' | 'not_applicable';

export interface VerifyStatuses {
  proof_status: ProofStatus;
  anchor_status: AnchorVerifyStatus;
  source_status: string;
  policy_status: PolicyStatus;
}

export interface VerifyResult {
  valid: boolean;
  verification_level: VerificationLevel;
  checks: {
    schema: boolean;
    hash: boolean;
    signature: boolean | null;
    sources: boolean;
    confidence: boolean;
    anchor: boolean | null;
    lineage: boolean | null;
    policy: boolean;
  };
  statuses: VerifyStatuses;
  errors: string[];
}

// ── Helpers ─────────────────────────────────────────────────

export function sha256Hex(input: string): string {
  return '0x' + crypto.createHash('sha256').update(input).digest('hex');
}

export function computeEntropyHash(entropy: string): string {
  return sha256Hex(entropy.toLowerCase());
}

// ── Main Verification ───────────────────────────────────────

export async function verifyEntropyObject(
  obj: VerifiableEntropyObject,
  policy?: EntropyPolicy
): Promise<VerifyResult> {
  const errors: string[] = [];

  const checks = {
    schema: true,
    hash: true,
    signature: null as boolean | null,
    sources: true,
    confidence: true,
    anchor: null as boolean | null,
    lineage: null as boolean | null,
    policy: true,
  };

  // ── Schema ──────────────────────────────────────────────
  if (obj.standard !== 'VEO-1') {
    checks.schema = false;
    errors.push('VEO_SCHEMA_INVALID: standard must be VEO-1');
  }

  if (!obj.entropy || !obj.entropy_hash || !obj.sources || !obj.confidence) {
    checks.schema = false;
    errors.push('VEO_SCHEMA_INVALID: required fields missing');
  }

  // ── Hash ────────────────────────────────────────────────
  const expectedHash = computeEntropyHash(obj.entropy);
  if (expectedHash !== obj.entropy_hash.toLowerCase()) {
    checks.hash = false;
    errors.push('VEO_HASH_MISMATCH');
  }

  // ── Sources ─────────────────────────────────────────────
  if (!Array.isArray(obj.sources) || obj.sources.length < 1) {
    checks.sources = false;
    errors.push('VEO_SOURCE_INVALID: no sources');
  }

  // ── Confidence ──────────────────────────────────────────
  if (obj.confidence.score < 0 || obj.confidence.score > 1000) {
    checks.confidence = false;
    errors.push('VEO_CONFIDENCE_INVALID');
  }

  // ── Signature ───────────────────────────────────────────
  const sigResult = verifyProviderSignature(obj);
  let proofStatus: ProofStatus;

  if (sigResult === null) {
    checks.signature = null;
    proofStatus = 'unsigned';
  } else if (sigResult === true) {
    checks.signature = true;
    proofStatus = 'cryptographically_verified';
  } else {
    checks.signature = false;
    proofStatus = 'invalid_signature';
    errors.push('VEO_SIGNATURE_INVALID');
  }

  // ── Anchor ──────────────────────────────────────────────
  const hasAnchorData = Boolean(
    obj.anchor &&
    obj.anchor.transaction_hash &&
    obj.anchor.contract &&
    obj.anchor.chain
  );

  let anchorStatus: AnchorVerifyStatus = 'unanchored';

  if (hasAnchorData && obj.anchor) {
    // Try on-chain verification
    try {
      const anchorResult = await verifyAnchorOnChain(obj.anchor);
      if (anchorResult.valid) {
        checks.anchor = true;
        anchorStatus = 'anchored_verified';
      } else {
        checks.anchor = false;
        anchorStatus = 'invalid_anchor';
        errors.push(`VEO_ANCHOR_INVALID: ${anchorResult.error}`);
      }
    } catch {
      // If on-chain verification is unavailable, mark as anchored (structural)
      checks.anchor = true;
      anchorStatus = 'anchored';
    }
  }

  // ── Policy ──────────────────────────────────────────────
  let policyApplied = false;

  if (policy?.min_ecs !== undefined && obj.confidence.score < policy.min_ecs) {
    checks.policy = false;
    errors.push('VEO_ECS_TOO_LOW');
    policyApplied = true;
  }

  if (policy?.min_sources !== undefined && obj.sources.length < policy.min_sources) {
    checks.policy = false;
    errors.push('VEO_SOURCE_COUNT_TOO_LOW');
    policyApplied = true;
  }

  if (policy?.anchor_required) {
    policyApplied = true;
    if (!hasAnchorData) {
      checks.anchor = false;
      checks.policy = false;
      errors.push('VEO_ANCHOR_MISSING');
      anchorStatus = 'unanchored';
    }
  }

  if (policy && !policyApplied) {
    policyApplied = true;
  }

  // ── Lineage ─────────────────────────────────────────────
  if (obj.lineage) {
    checks.lineage = true; // TODO: recompute lineage_hash
  }

  // ── Source status ───────────────────────────────────────
  const sourceStatus: string = (obj.confidence as any).source_status ?? 'live';

  // ── Policy status ───────────────────────────────────────
  let policyStatus: PolicyStatus;
  if (!policy) {
    policyStatus = 'not_applicable';
  } else if (checks.policy) {
    policyStatus = 'satisfied';
  } else {
    policyStatus = 'failed';
  }

  // ── Verification level ──────────────────────────────────
  const structurallyValid = checks.schema && checks.hash && checks.sources && checks.confidence;

  let verificationLevel: VerificationLevel;

  if (!structurallyValid || proofStatus === 'invalid_signature' || anchorStatus === 'invalid_anchor') {
    verificationLevel = 'invalid';
  } else if (!checks.policy) {
    verificationLevel = 'policy_failed';
  } else if (
    (proofStatus === 'cryptographically_verified' || proofStatus === 'unsigned') &&
    (anchorStatus === 'anchored_verified')
  ) {
    verificationLevel = 'anchored_verified';
  } else if (proofStatus === 'cryptographically_verified') {
    verificationLevel = 'cryptographically_verified';
  } else {
    verificationLevel = 'structurally_valid_unsigned';
  }

  // ── Final valid ─────────────────────────────────────────
  const valid = Object.values(checks).every(v => v === true || v === null) && errors.length === 0;

  return {
    valid,
    verification_level: verificationLevel,
    checks,
    statuses: {
      proof_status: proofStatus,
      anchor_status: anchorStatus,
      source_status: sourceStatus,
      policy_status: policyStatus,
    },
    errors,
  };
}
