/**
 * @openrng/sdk — VEO-1 Client
 *
 * Usage:
 *   import { VEOClient } from '@openrng/sdk';
 *   const veo = new VEOClient();
 *   const entropy = await veo.getEntropy();
 *   const result = await veo.verify(entropy);
 */

export interface VEOObject {
  standard: 'VEO-1';
  version: string;
  object_id: string;
  object_class: string;
  entropy: string;
  entropy_hash: string;
  issued_at: string;
  expires_at?: string | null;
  provider: string;
  sources: Array<{
    source_id: string;
    source_type: string;
    source_reference?: string;
    timestamp: string;
    entropy_hash: string;
    signature?: string;
  }>;
  aggregation?: Record<string, unknown> | null;
  confidence: {
    score: number;
    grade: string;
    freshness?: number;
    diversity?: number;
    independence?: number;
    manipulation_resistance?: number;
    verification_success?: number;
    availability?: number;
    fallback_count?: number;
    live_source_count?: number;
    source_status?: string;
  };
  proof: Record<string, unknown>;
  anchor?: Record<string, unknown> | null;
  lineage?: Record<string, unknown> | null;
  policy?: Record<string, unknown> | null;
}

export interface VEOVerifyResult {
  valid: boolean;
  verification_level: string;
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
  statuses: {
    proof_status: string;
    anchor_status: string;
    source_status: string;
    policy_status: string;
  };
  errors: string[];
}

export interface VEOStatus {
  service: string;
  version: string;
  status: string;
  sources: Record<string, unknown>;
  signing: Record<string, unknown>;
  anchoring: Record<string, unknown>;
}

export type VEOPolicy =
  | 'simulation-grade'
  | 'ai-grade'
  | 'gaming-grade'
  | 'casino-grade'
  | 'enterprise-grade';

export interface GetEntropyOptions {
  policy?: VEOPolicy;
  min_ecs?: number;
  min_sources?: number;
  anchor_required?: boolean;
}

export class VEOClient {
  private readonly baseUrl: string;

  constructor(options?: { endpoint?: string }) {
    this.baseUrl = (options?.endpoint || 'https://api.openrng.io').replace(/\/$/, '');
  }

  /**
   * Get a Verifiable Entropy Object.
   */
  async getEntropy(options?: GetEntropyOptions): Promise<VEOObject> {
    const params = new URLSearchParams();
    if (options?.policy) params.set('policy', options.policy);
    if (options?.min_ecs) params.set('min_ecs', String(options.min_ecs));
    if (options?.min_sources) params.set('min_sources', String(options.min_sources));
    if (options?.anchor_required) params.set('anchor_required', 'true');

    const qs = params.toString();
    const url = `${this.baseUrl}/v2/entropy${qs ? '?' + qs : ''}`;

    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({} as any));
      throw new Error((body as any).error || `OpenRNG API error: ${res.status}`);
    }
    return res.json() as Promise<VEOObject>;
  }

  /**
   * Verify a VEO object via the API.
   */
  async verify(veo: VEOObject, policy?: Record<string, unknown>): Promise<VEOVerifyResult> {
    const res = await fetch(`${this.baseUrl}/v2/entropy/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entropy_object: veo, policy }),
    });
    if (!res.ok) throw new Error(`OpenRNG verify error: ${res.status}`);
    return res.json() as Promise<VEOVerifyResult>;
  }

  /**
   * Get system status.
   */
  async getStatus(): Promise<VEOStatus> {
    const res = await fetch(`${this.baseUrl}/v2/entropy/status`);
    if (!res.ok) throw new Error(`OpenRNG status error: ${res.status}`);
    return res.json() as Promise<VEOStatus>;
  }
}
