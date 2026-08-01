/**
 * VEO-2 — Validation
 */

import type { VEO, VEOClass } from './types';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate a VEO-2 object */
export function validateVEO(obj: unknown): ValidationResult {
  const errors: string[] = [];

  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['VEO must be an object'] };
  }

  const veo = obj as Record<string, unknown>;

  // Required fields
  if (veo.standard !== 'VEO') errors.push('standard must be "VEO"');
  if (veo.version !== '2.0') errors.push('version must be "2.0"');
  if (!veo.object_id || typeof veo.object_id !== 'string') errors.push('object_id is required');
  if (!veo.issued_at || typeof veo.issued_at !== 'string') errors.push('issued_at is required');
  if (!veo.provider || typeof veo.provider !== 'object') errors.push('provider is required');
  if (!veo.confidence || typeof veo.confidence !== 'object') errors.push('confidence is required');

  // Object class
  const validClasses: VEOClass[] = ['VEO-2A', 'VEO-2B', 'VEO-2C', 'VEO-2D'];
  if (!validClasses.includes(veo.object_class as VEOClass)) {
    errors.push(`object_class must be one of: ${validClasses.join(', ')}`);
  }

  // Class-specific validation
  const cls = veo.object_class as VEOClass;

  if (cls === 'VEO-2B') {
    const lineage = veo.lineage as Record<string, unknown> | undefined;
    if (!lineage?.child_ids || !Array.isArray(lineage.child_ids) || lineage.child_ids.length === 0) {
      errors.push('VEO-2B (Composite) requires lineage.child_ids with at least one entry');
    }
  }

  if (cls === 'VEO-2C') {
    if (!veo.anchor || typeof veo.anchor !== 'object') {
      errors.push('VEO-2C (Anchored) requires an anchor record');
    }
  }

  if (cls === 'VEO-2D') {
    const hasApprovals = Array.isArray(veo.human_approvals) && (veo.human_approvals as unknown[]).length > 0;
    const policy = veo.policy as Record<string, unknown> | undefined;
    const hasPolicy = policy?.enforced === true;
    if (!hasApprovals && !hasPolicy) {
      errors.push('VEO-2D (Governed) requires human_approvals or an enforced policy');
    }
  }

  // Confidence score range
  const conf = veo.confidence as Record<string, unknown> | undefined;
  if (conf) {
    const score = conf.score as number;
    if (typeof score !== 'number' || score < 0 || score > 1000) {
      errors.push('confidence.score must be a number between 0 and 1000');
    }
  }

  // Must have either execution or entropy
  if (!veo.execution && !veo.entropy) {
    errors.push('VEO must have either an execution record or entropy value');
  }

  return { valid: errors.length === 0, errors };
}

/** Quick boolean check */
export function isValidVEO(obj: unknown): obj is VEO {
  return validateVEO(obj).valid;
}
