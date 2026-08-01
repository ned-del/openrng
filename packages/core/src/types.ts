/**
 * VEO-2 — Verifiable Execution Object
 * TypeScript type definitions
 */

/** Object classes */
export type VEOClass = 'VEO-2A' | 'VEO-2B' | 'VEO-2C' | 'VEO-2D';

/** Execution Confidence Grade */
export type VEOGrade = 'AAA' | 'AA' | 'A' | 'B' | 'C' | 'LOW';

/** Lifecycle states */
export type VEOLifecycleState = 'created' | 'signed' | 'anchored' | 'indexed' | 'verified';

/** A tool call made during execution */
export interface ToolCall {
  tool_id: string;
  input_hash?: string;
  output_hash?: string;
  latency_ms?: number;
  status?: 'success' | 'error' | 'timeout';
}

/** Cost information */
export interface CostRecord {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  cost_usd?: number;
  currency?: string;
}

/** Cryptographic proof */
export interface ProofRecord {
  algorithm: string;
  provider_signature?: string;
  provider_public_key?: string;
  vdf_epoch?: number;
  vdf_output?: string;
  vdf_iterations?: number;
  merkle_path?: Array<{ hash: string; position: 'left' | 'right' }>;
  merkle_root?: string;
}

/** Execution Confidence Score */
export interface ConfidenceRecord {
  score: number;        // 0-1000
  grade: VEOGrade;
  provenance?: number;
  integrity?: number;
  reproducibility?: number;
  governance?: number;
  observability?: number;
  timeliness?: number;
}

/** Blockchain anchor */
export interface AnchorRecord {
  chain: string;        // e.g. "polygon-amoy", "ethereum"
  tx_hash: string;
  block_number?: number;
  contract_address?: string;
  merkle_root?: string;
  anchored_at: string;  // ISO 8601
  explorer_url?: string;
}

/** Human approval record */
export interface HumanApproval {
  approver_id: string;
  role?: string;
  decision: 'approved' | 'rejected' | 'escalated';
  timestamp: string;    // ISO 8601
  comment?: string;
  signature?: string;
}

/** Policy assertion */
export interface PolicyAssertion {
  assertion_id: string;
  description: string;
  result: 'pass' | 'fail' | 'warn' | 'skip';
  details?: string;
}

/** Policy record */
export interface PolicyRecord {
  policy_id: string;
  policy_version?: string;
  assertions: PolicyAssertion[];
  enforced: boolean;
  evaluated_at: string; // ISO 8601
}

/** Lifecycle tracking */
export interface LifecycleRecord {
  state: VEOLifecycleState;
  created_at: string;
  signed_at?: string;
  anchored_at?: string;
  indexed_at?: string;
  verified_at?: string;
}

/** Lineage reference */
export interface LineageRecord {
  parent_ids?: string[];
  child_ids?: string[];
  root_id?: string;
  depth?: number;
}

/** Entropy source record (backward compat with VEO-1) */
export interface SourceRecord {
  source_id: string;
  source_type: string;
  source_reference?: string;
  timestamp: string;
  entropy_hash?: string;
  signature?: string;
}

/** Execution details */
export interface ExecutionRecord {
  prompt_hash: string;
  output_hash: string;
  model_id: string;
  model_version?: string;
  provider?: string;
  tool_calls?: ToolCall[];
  cost?: CostRecord;
  latency_ms?: number;
  parameters?: Record<string, unknown>;
}

/**
 * VEO-2: Verifiable Execution Object
 */
export interface VEO {
  /** Always "VEO" */
  standard: 'VEO';
  /** Always "2.0" */
  version: '2.0';
  /** Unique object ID (UUID or hash) */
  object_id: string;
  /** Object class */
  object_class: VEOClass;
  /** ISO 8601 timestamp */
  issued_at: string;
  /** Optional expiry */
  expires_at?: string | null;

  /** Provider identity */
  provider: {
    provider_id: string;
    name?: string;
    public_key?: string;
  };

  // ─── Execution (VEO-2 new) ───
  /** Execution details — prompt, model, output, cost */
  execution?: ExecutionRecord;

  // ─── Entropy (VEO-1 compat) ───
  /** Raw entropy value (hex) — from VEO-1 */
  entropy?: string;
  /** SHA-256 of entropy */
  entropy_hash?: string;
  /** Entropy sources */
  sources?: SourceRecord[];
  /** Aggregation method */
  aggregation?: string | null;

  // ─── Proof ───
  proof?: ProofRecord;

  // ─── Confidence ───
  confidence: ConfidenceRecord;

  // ─── Lifecycle ───
  lifecycle?: LifecycleRecord;

  // ─── Lineage ───
  lineage?: LineageRecord;

  // ─── Governance (VEO-2D) ───
  human_approvals?: HumanApproval[];
  policy?: PolicyRecord;

  // ─── Anchor (VEO-2C, 2D) ───
  anchor?: AnchorRecord;

  // ─── Extensibility ───
  metadata?: Record<string, unknown>;
}

/** Options for creating a VEO */
export interface CreateVEOOptions {
  object_class?: VEOClass;
  provider_id: string;
  provider_name?: string;
  execution?: Partial<ExecutionRecord>;
  entropy?: string;
  confidence?: Partial<ConfidenceRecord>;
  lineage?: LineageRecord;
  metadata?: Record<string, unknown>;
}
