/**
 * VEO-1 — Object Generator
 *
 * Generates VEO objects with:
 * - Multi-source entropy aggregation
 * - ECS scoring
 * - Provider signing (when configured)
 * - Blockchain anchoring (when configured + requested)
 */

import crypto from 'crypto';
import { VerifiableEntropyObject, EntropyPolicy } from './types.js';
import { calculateEntropyConfidence } from './ecs.js';
import { sha256Hex } from './verify.js';
import {
  fetchDrandEntropy,
  fetchBitcoinBlockEntropy,
  fetchPolygonBlockEntropy,
} from './sources.js';
import { signVEOObject, isSigningConfigured } from './signing.js';
import {
  isAnchoringConfigured as isAnchorActive,
  anchorVEO,
} from './anchor.js';

function objectId(): string {
  return 'veo_' + crypto.randomBytes(16).toString('hex');
}

function aggregateEntropy(inputs: string[]): string {
  return sha256Hex(inputs.map(x => x.toLowerCase()).join('|'));
}

export { isAnchorActive as isAnchoringConfigured };

export class AnchorNotAvailableError extends Error {
  code = 'ANCHOR_REQUIRED_BUT_NOT_AVAILABLE';
  constructor() {
    super('Blockchain anchoring is required by policy but not configured or unavailable');
    this.name = 'AnchorNotAvailableError';
  }
}

export async function generateVEOObject(policy?: EntropyPolicy): Promise<VerifiableEntropyObject> {
  const anchorRequired = policy?.anchor_required === true;

  // Fail fast if anchor required but not configured
  if (anchorRequired && !isAnchorActive()) {
    throw new AnchorNotAvailableError();
  }

  // Fetch entropy from all three sources concurrently
  const sourceResults = await Promise.all([
    fetchDrandEntropy(),
    fetchBitcoinBlockEntropy(),
    fetchPolygonBlockEntropy(),
  ]);

  const issuedAt = new Date();
  const entropy = aggregateEntropy(sourceResults.map(s => s.entropy));
  const entropy_hash = sha256Hex(entropy);

  const sources = sourceResults.map(s => s.record);
  const confidence = calculateEntropyConfidence({
    sources,
    issuedAt,
    manipulationResistance: sources.length >= 3 ? 900 : 750,
    verificationSuccess: 850,
    availability: 800,
  });

  const id = objectId();

  // Determine object class upfront (before signing)
  const willAnchor = anchorRequired && isAnchorActive();

  // Build base object (unsigned, unanchored)
  const veo: VerifiableEntropyObject = {
    standard: 'VEO-1',
    version: '1.0',
    object_id: id,
    object_class: willAnchor ? 'VEO-1C' : 'VEO-1B',
    entropy,
    entropy_hash,
    issued_at: issuedAt.toISOString(),
    expires_at: null,
    provider: 'OpenRNG',
    sources,
    aggregation: {
      method: 'sha256_concat',
      input_order: sources.map(s => s.source_id),
      aggregation_hash: entropy_hash,
    },
    confidence,
    proof: {
      proof_type: 'none',
      proof_status: 'unsigned',
      verification_endpoint: 'https://api.openrng.io/v2/entropy/verify',
    },
    anchor: null,
    lineage: null,
    policy: policy ?? null,
  };

  // Step 1: Sign if configured (before anchoring — signing doesn't include tx hash)
  veo.proof = await signVEOObject(veo);

  // Step 2: Anchor if required + configured
  if (anchorRequired && isAnchorActive()) {
    const anchorPkg = await anchorVEO(entropy_hash, id);
    veo.anchor = anchorPkg;
  }

  return veo;
}
