/**
 * @fairseal/commit — Trustless committed selections
 * 
 * Types for the commitment protocol: commit to a rule before
 * the entropy is knowable, then verify the selection was fair.
 */

// ─── Beacon ────────────────────────────────────────────────

export interface BeaconConfig {
  /** Beacon identifier, e.g. "drand:quicknet" */
  id: string;
  /** Chain hash for the beacon network */
  chainHash: string;
  /** Round period in seconds */
  period: number;
  /** Genesis time (Unix seconds) */
  genesisTime: number;
  /** BLS public key (hex) for signature verification */
  publicKey: string;
  /** Relay URLs for fetching beacon rounds */
  relays: string[];
}

export interface BeaconRound {
  round: number;
  randomness: string;    // hex
  signature: string;     // hex (BLS signature)
}

export interface BeaconSource {
  readonly config: BeaconConfig;
  /** Compute the round number for a given Unix timestamp */
  getRound(unixSeconds: number): number;
  /** Compute the wall-clock time a round will be available */
  getRoundTime(round: number): number;
  /** Fetch a specific beacon round from relays */
  fetchBeacon(round: number): Promise<BeaconRound>;
  /** Verify a beacon round's BLS signature */
  verifyBeacon(beacon: BeaconRound): Promise<boolean>;
}

// ─── Commitment ────────────────────────────────────────────

export interface CommitmentOptions {
  /** Canonical JSON of the selection rule */
  rule: string;
  /** Candidate set or input identifiers */
  inputs: string[];
  /** Seconds from now until reveal (mapped to targetRound) */
  revealAfter: number;
  /** Beacon identifier (default: "drand:quicknet") */
  beacon?: string;
  /** Random salt (generated if omitted) */
  salt?: Uint8Array;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface Commitment {
  /** Unique commitment ID (hex, derived from commitHash) */
  id: string;
  /** Beacon identifier */
  beacon: string;
  /** Target beacon round (commitment is valid if anchored before this round) */
  targetRound: number;
  /** SHA-256 of the canonical rule */
  ruleHash: string;
  /** SHA-256 of the sorted, joined inputs */
  inputsHash: string;
  /** SHA-256(beacon ‖ targetRound ‖ ruleHash ‖ inputsHash ‖ salt) */
  commitHash: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** Random salt (hex) */
  salt: string;
  /** The original rule (needed for resolution) */
  rule: string;
  /** The original inputs (needed for resolution) */
  inputs: string[];
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

// ─── Anchor ────────────────────────────────────────────────

export type PrecedenceType = 'onchain' | 'counterparty-signed' | 'unattested';

export interface AnchorProof {
  /** On-chain transaction hash */
  txHash: string;
  /** Block number containing the anchor tx */
  blockNumber: number;
  /** Block timestamp (Unix seconds) */
  blockTimestamp: number;
  /** Chain ID (e.g. 8453 for Base, 84532 for Base Sepolia) */
  chainId: number;
  /** Precedence type */
  precedence: PrecedenceType;
}

// ─── Resolution ────────────────────────────────────────────

export interface Resolution {
  /** The beacon round used */
  beaconRound: number;
  /** The beacon's BLS signature (hex) */
  beaconSignature: string;
  /** Beacon randomness (hex) */
  beaconRandomness: string;
  /** Whether the BLS signature was verified */
  verified: boolean;
  /** HMAC-SHA256(beacon.randomness, ruleHash ‖ inputsHash) */
  output: string;
  /** The derived selection result (rule applied to output) */
  selection: unknown;
}

// ─── Receipt ───────────────────────────────────────────────

export interface CSReceipt {
  /** Receipt format version */
  version: '1.0.0';
  /** The original commitment */
  commitment: Commitment;
  /** Anchor proof (if anchored) */
  anchor?: AnchorProof;
  /** Resolution (if resolved) */
  resolution?: Resolution;
  /** Precedence type */
  precedence: PrecedenceType;
  /** Attestation tier */
  attestation: 'self-anchored' | 'fairseal' | 'unattested';
}

// ─── Verification ──────────────────────────────────────────

export type VerificationStatus = 'VALID' | 'PARTIAL' | 'INVALID';

export interface VerificationResult {
  /** Overall verification status */
  status: VerificationStatus;
  /** Individual check results */
  checks: {
    /** Commitment hash matches recomputed hash */
    commitmentIntegrity: boolean;
    /** Anchor timestamp precedes target round time */
    precedenceVerified: boolean;
    /** Beacon BLS signature is valid */
    beaconVerified: boolean;
    /** Output matches HMAC derivation from beacon + commitment */
    outputVerified: boolean;
    /** Selection matches rule applied to output */
    selectionVerified: boolean;
  };
  /** Human-readable reason if not VALID */
  reason?: string;
}
