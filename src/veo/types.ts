/**
 * VEO-1 — Verifiable Entropy Object Standard
 * TypeScript type definitions
 */

export type VEOObjectClass = "VEO-1A" | "VEO-1B" | "VEO-1C" | "VEO-1D";

export type VEOGrade = "AAA" | "AA" | "A" | "B" | "C" | "LOW";

export interface EntropySourceRecord {
  source_id: string;
  source_type: string;
  source_reference?: string;
  timestamp: string;
  entropy_hash: string;
  signature?: string;
  [key: string]: unknown;
}

export interface EntropyConfidence {
  score: number;
  grade: VEOGrade;
  freshness?: number;
  diversity?: number;
  independence?: number;
  manipulation_resistance?: number;
  verification_success?: number;
  availability?: number;
  [key: string]: unknown;
}

export interface ProofPackage {
  proof_type?: string;
  signature_algorithm?: string;
  provider_public_key?: string;
  provider_signature?: string;
  verification_endpoint?: string;
  [key: string]: unknown;
}

export interface AnchorPackage {
  anchor_type: "blockchain" | "merkle" | "timestamp" | string;
  chain?: string;
  contract?: string;
  transaction_hash?: string;
  merkle_root?: string;
  anchor_timestamp?: string;
  [key: string]: unknown;
}

export interface LineagePackage {
  parent_object_ids?: string[];
  lineage_hash?: string;
  [key: string]: unknown;
}

export interface EntropyPolicy {
  policy_name?: string;
  min_ecs?: number;
  min_sources?: number;
  anchor_required?: boolean;
  audit_required?: boolean;
  max_latency_ms?: number;
  allowed_sources?: string[];
  [key: string]: unknown;
}

export interface VerifiableEntropyObject {
  standard: "VEO-1";
  version: string;
  object_id: string;
  object_class: VEOObjectClass;
  entropy: string;
  entropy_hash: string;
  issued_at: string;
  expires_at?: string | null;
  provider: string;
  sources: EntropySourceRecord[];
  aggregation?: Record<string, unknown>;
  confidence: EntropyConfidence;
  proof: ProofPackage;
  anchor?: AnchorPackage | null;
  lineage?: LineagePackage | null;
  policy?: EntropyPolicy | null;
}
