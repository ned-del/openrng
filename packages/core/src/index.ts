/**
 * @openrng/core — VEO-2 types, schema, and shared primitives
 *
 * VEO = Verifiable Execution Object
 * Every AI decision, provable and replayable.
 */

export type { VEO, VEOClass, ExecutionRecord, ToolCall, CostRecord, ProofRecord, ConfidenceRecord, AnchorRecord, HumanApproval, PolicyRecord, PolicyAssertion, LifecycleRecord, LineageRecord, SourceRecord, CreateVEOOptions } from './types';
export { createVEO, createVEOHash, canonicalize } from './veo';
export { validateVEO, isValidVEO } from './validate';
export { VEO_VERSION, VEO_STANDARD, VEO_CLASSES } from './constants';
