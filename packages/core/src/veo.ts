/**
 * VEO-2 — Object creation and hashing
 */

import { createHash } from 'crypto';
import type { VEO, CreateVEOOptions, VEOClass } from './types';
import { VEO_STANDARD, VEO_VERSION } from './constants';

/** Generate a unique VEO object ID */
function generateObjectId(): string {
  const timestamp = Date.now().toString(36);
  const random = createHash('sha256')
    .update(Math.random().toString() + Date.now().toString() + process.hrtime.bigint().toString())
    .digest('hex')
    .substring(0, 24);
  return `veo-${timestamp}-${random}`;
}

/** Deterministic JSON canonicalization (sorted keys, no undefined) */
export function canonicalize(obj: unknown): string {
  if (obj === null) return 'null';
  if (obj === undefined) return 'null';
  if (typeof obj === 'string') return JSON.stringify(obj);
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  if (typeof obj === 'object') {
    const sorted = Object.keys(obj as Record<string, unknown>)
      .sort()
      .filter(k => (obj as Record<string, unknown>)[k] !== undefined)
      .map(k => JSON.stringify(k) + ':' + canonicalize((obj as Record<string, unknown>)[k]));
    return '{' + sorted.join(',') + '}';
  }
  return String(obj);
}

/** Compute SHA-256 hash of a VEO object (canonical form) */
export function createVEOHash(veo: VEO): string {
  const canonical = canonicalize(veo);
  return createHash('sha256').update(canonical).digest('hex');
}

/** Create a new VEO-2 object */
export function createVEO(options: CreateVEOOptions): VEO {
  const now = new Date().toISOString();
  const objectClass: VEOClass = options.object_class || 'VEO-2A';

  const veo: VEO = {
    standard: VEO_STANDARD,
    version: VEO_VERSION,
    object_id: generateObjectId(),
    object_class: objectClass,
    issued_at: now,
    provider: {
      provider_id: options.provider_id,
      name: options.provider_name,
    },
    confidence: {
      score: options.confidence?.score ?? 500,
      grade: options.confidence?.grade ?? 'B',
      ...options.confidence,
    },
    lifecycle: {
      state: 'created',
      created_at: now,
    },
  };

  // Add execution record if provided
  if (options.execution) {
    veo.execution = {
      prompt_hash: options.execution.prompt_hash || '',
      output_hash: options.execution.output_hash || '',
      model_id: options.execution.model_id || 'unknown',
      ...options.execution,
    };
  }

  // Add entropy if provided (VEO-1 compat)
  if (options.entropy) {
    veo.entropy = options.entropy;
    veo.entropy_hash = createHash('sha256').update(options.entropy).digest('hex');
  }

  // Add lineage if provided
  if (options.lineage) {
    veo.lineage = options.lineage;
  }

  // Add metadata if provided
  if (options.metadata) {
    veo.metadata = options.metadata;
  }

  return veo;
}
