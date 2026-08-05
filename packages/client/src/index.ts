/**
 * @fairseal/client — One-line provably fair selection
 *
 * const client = new OpenRNGClient();
 * const result = await client.fairSelect({ candidates: ['alice', 'bob', 'charlie'] });
 * // result.winner, result.receipt, result.proof
 */

import { createHash } from 'node:crypto';

const DEFAULT_BASE_URL = 'https://x402.openrng.io/v1/rng';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OpenRNGClientOptions {
  /** Override API base URL (default: https://x402.openrng.io/v1/rng) */
  baseUrl?: string;
  /** How often to poll for reveal (default: 2000ms) */
  pollIntervalMs?: number;
  /** Max poll attempts before giving up (default: 30) */
  maxPollAttempts?: number;
}

export interface FairSelectOptions {
  /** The candidates to choose from (order matters — must match what you publish) */
  candidates: string[];
  /** Label for this draw (logged with commitment, helps with auditing) */
  domain?: string;
  /** How many epochs ahead to commit to (default: 3, ~21s) */
  epochOffset?: number;
}

export interface FairSelectResult {
  /** The winning candidate */
  winner: string;
  /** Zero-based index of the winner in the original candidates array */
  winnerIndex: number;
  /**
   * Shareable commitment receipt — publish this BEFORE revealing the winner.
   * Anyone with this can verify the candidates were locked before randomness was known.
   */
  receipt: {
    id: string;
    epoch: number;
    candidateSetHash: string;
    commitTime: string;
    domain: string;
  };
  /** Cryptographic proof from the VDF + verification status */
  proof: {
    /** The raw random value (hex) used to select the winner */
    value: string;
    /** Public verification URL — anyone can check this independently */
    verifyUrl: string;
    /** true = epoch was computed AFTER the commitment (temporal order verified) */
    temporalValid: boolean;
    /** true = candidate hash matches what was committed */
    commitHashVerified: boolean;
    /** Human-readable summary of the verification result */
    note: string;
  };
}

// ─── Commit/Reveal API shapes ─────────────────────────────────────────────────

interface CommitResponse {
  commitment_id: string;
  committed_epoch: number;
  current_epoch: number;
  commitment_time: string;
  commitment_hash: string;
  status: string;
  estimated_ready_seconds: number;
  reveal_url: string;
}

interface RevealResponse {
  value: string;
  proof: {
    vdf_output: string;
    previous_output: string;
    computed_at: string;
  };
  verification: {
    commitment_hash_verified: boolean;
    temporal_valid: boolean;
    temporal_note: string;
    verify_url: string;
    note: string;
  };
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class OpenRNGClient {
  private baseUrl: string;
  private pollIntervalMs: number;
  private maxPollAttempts: number;

  constructor(options: OpenRNGClientOptions = {}) {
    this.baseUrl         = options.baseUrl ?? DEFAULT_BASE_URL;
    this.pollIntervalMs  = options.pollIntervalMs ?? 2000;
    this.maxPollAttempts = options.maxPollAttempts ?? 30;
  }

  /**
   * Run a provably fair selection using OpenRNG commit/reveal.
   *
   * Protocol:
   *   1. Hash the candidate set (deterministic, reproducible)
   *   2. Commit to a future VDF epoch
   *   3. Poll until epoch matures (VDF sequential — nobody previewed it)
   *   4. Verify commitment hash + temporal order locally
   *   5. Derive winner: BigInt(value) % candidates.length
   *
   * Share `result.receipt` publicly before step 3 for maximum auditability.
   */
  async fairSelect(opts: FairSelectOptions): Promise<FairSelectResult> {
    const {
      candidates,
      domain      = 'openrng-fair-select',
      epochOffset = 3,
    } = opts;

    if (candidates.length === 0) {
      throw new Error('candidates must be non-empty');
    }

    // Step 1: Hash the candidate set
    const candidateSetHash = createHash('sha256')
      .update(candidates.join(','))
      .digest('hex');

    // Step 2: Commit to a future epoch
    const commitRes = await fetch(`${this.baseUrl}/commit`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ epoch_offset: epochOffset, candidate_set_hash: candidateSetHash, domain }),
    });
    if (!commitRes.ok) {
      throw new Error(`Commit failed: ${commitRes.status} ${await commitRes.text()}`);
    }
    const commitment = (await commitRes.json()) as CommitResponse;

    // Step 3: Poll for reveal
    const reveal = await this.pollReveal(commitment.commitment_id, commitment.estimated_ready_seconds);

    // Step 4: Verify locally
    if (!reveal.verification.commitment_hash_verified) {
      throw new Error('Commitment hash mismatch — reject this result.');
    }
    if (!reveal.verification.temporal_valid) {
      throw new Error('Temporal order invalid — epoch was NOT computed after commitment. Reject this result.');
    }

    // Step 5: Derive winner
    const idx = Number(BigInt('0x' + reveal.value) % BigInt(candidates.length));

    return {
      winner:      candidates[idx],
      winnerIndex: idx,
      receipt: {
        id:               commitment.commitment_id,
        epoch:            commitment.committed_epoch,
        candidateSetHash,
        commitTime:       commitment.commitment_time,
        domain,
      },
      proof: {
        value:              reveal.value,
        verifyUrl:          reveal.verification.verify_url,
        temporalValid:      reveal.verification.temporal_valid,
        commitHashVerified: reveal.verification.commitment_hash_verified,
        note:               reveal.verification.temporal_note,
      },
    };
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private async pollReveal(id: string, estimatedSeconds: number): Promise<RevealResponse> {
    // Wait out the estimated VDF computation time before first poll
    await this.sleep(Math.max(estimatedSeconds * 1000, 3000));

    for (let attempt = 0; attempt < this.maxPollAttempts; attempt++) {
      const res = await fetch(`${this.baseUrl}/reveal/${id}`);
      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.value) return data as RevealResponse;
      }
      await this.sleep(this.pollIntervalMs);
    }
    throw new Error(`Reveal timed out for commitment ${id} after ${this.maxPollAttempts} attempts.`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
