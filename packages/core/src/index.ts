/**
 * @openrng/core — VEO-2 types, schema, and shared primitives
 *
 * VEO = Verifiable Execution Object
 * Every AI decision, provable and replayable.
 */

export type { VEO, VEOClass, ExecutionRecord, ToolCall, CostRecord, ProofRecord, ConfidenceRecord, AnchorRecord, HumanApproval, PolicyRecord, PolicyAssertion, LifecycleRecord, LineageRecord, SourceRecord, CreateVEOOptions } from './types';
export type { CaptureOptions } from './capture';
export { createVEO, createVEOHash, canonicalize } from './veo';
export { validateVEO, isValidVEO } from './validate';
export { signVEO, signVEOHmac, verifySignature, verifyIntegrity, hashContent, hashBuffer, generateSigningKeys } from './sign';
export type { KeyPair } from './sign';
export { capture } from './capture';
export { VEO_VERSION, VEO_STANDARD, VEO_CLASSES } from './constants';
