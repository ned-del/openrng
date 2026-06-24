# FILE: OPENRNG_VEO1_AGENT_BRIEF.md

# OpenRNG VEO-1 Agent Execution Brief

## Mission

Implement **VEO-1: Verifiable Entropy Object Standard** into OpenRNG.

The goal is to evolve OpenRNG from a random number API into a **Verifiable Entropy Infrastructure** layer.

The agent should push this into the OpenRNG codebase and, where available, integrate with the existing smart contract anchoring flow.

---

## Strategic Direction

OpenRNG should build as:

**AWS for Entropy**

Sell first as:

**Chainlink for Randomness**

Long-term category:

**Trust Infrastructure for AI Decisions**

---

## Core Primitive

### VEO-1 — Verifiable Entropy Object

A VEO-1 object is a cryptographically verifiable representation of uncertainty, including:

- entropy payload
- entropy hash
- entropy source metadata
- provenance
- Entropy Confidence Score
- verification metadata
- optional blockchain anchor
- optional lineage / parent entropy object references

OpenRNG should not merely return a random number.

It should return a proof-carrying entropy object.

---

## Implementation Objective

Create:

```text
GET /v2/entropy
POST /v2/entropy/verify
```

Minimum viable implementation:

- Produce a VEO-1B Composite Entropy Object
- Use at least 2–3 entropy sources where available
- Compute entropy hash
- Compute Entropy Confidence Score
- Sign object if provider signing key exists
- Add blockchain anchor if existing smart contract flow is available
- Verify returned object through `/v2/entropy/verify`

---

## Suggested First Entropy Sources

Start simple:

1. drand beacon
2. Bitcoin latest block hash
3. Polygon latest block hash

If external APIs are not available, implement adapters with clear TODOs and fallback to currently available OpenRNG entropy source.

---

## VEO-1 Object Classes

### VEO-1A — Raw Source Entropy Object

Single-source entropy object.

Examples:

- drand
- Bitcoin block hash
- Polygon block hash
- QRNG
- hardware RNG

### VEO-1B — Composite Entropy Object

Multi-source entropy object.

This should be the first main product.

### VEO-1C — Anchored Entropy Object

VEO-1 object with blockchain anchor or Merkle proof.

Use for gaming, lottery, casino, regulated workflows.

### VEO-1D — Decision Entropy Object

Reserved for future Patent #4 / Verifiable Decision Object expansion.

---

## Entropy Confidence Score

Use ECS instead of generic `quality_score`.

Range:

```text
0–1000
```

Default weights:

| Factor | Weight |
|---|---:|
| freshness | 20% |
| diversity | 15% |
| independence | 20% |
| manipulation_resistance | 20% |
| verification_success | 15% |
| availability | 10% |

Grades:

| Score | Grade |
|---:|---|
| 900–1000 | AAA |
| 800–899 | AA |
| 700–799 | A |
| 600–699 | B |
| 500–599 | C |
| below 500 | LOW |

---

## Consumer Policies

Implement presets:

### simulation-grade

```json
{
  "min_ecs": 700,
  "min_sources": 1,
  "anchor_required": false
}
```

### ai-grade

```json
{
  "min_ecs": 800,
  "min_sources": 2,
  "anchor_required": false
}
```

### gaming-grade

```json
{
  "min_ecs": 850,
  "min_sources": 2,
  "anchor_required": true
}
```

### casino-grade

```json
{
  "min_ecs": 900,
  "min_sources": 3,
  "anchor_required": true
}
```

### enterprise-grade

```json
{
  "min_ecs": 950,
  "min_sources": 3,
  "anchor_required": true,
  "audit_required": true
}
```

---

## Smart Contract Integration

If OpenRNG already has a contract for anchoring Merkle roots or entropy hashes:

1. Compute `entropy_hash`
2. Optionally compute or reuse `merkle_root`
3. Anchor hash/root through existing contract
4. Add anchor metadata to the VEO-1 object:

```json
{
  "anchor_type": "blockchain",
  "chain": "polygon-amoy",
  "contract": "0x...",
  "transaction_hash": "0x...",
  "merkle_root": "0x...",
  "anchor_timestamp": "..."
}
```

If live anchoring is not available in this pass, return `anchor: null` and include `anchor_status: "not_anchored"`.

---

## Acceptance Criteria

The implementation is acceptable when:

1. `GET /v2/entropy` returns a valid VEO-1 object.
2. `POST /v2/entropy/verify` verifies that object.
3. ECS is computed deterministically from available metadata.
4. Entropy hash is reproducible.
5. At least one source adapter works.
6. Smart contract anchoring is integrated if existing infrastructure is available.
7. Tests exist for object generation, hashing, ECS, and verification.

---

## Patent Alignment

Patent #3 should center around:

1. Verifiable Entropy Object
2. Entropy Confidence Score
3. Entropy Routing Engine
4. Entropy Provenance Graph

Patent #4 should later center around:

1. Verifiable Decision Object
2. Decision Replay Infrastructure
3. Entropy-backed AI Decisions
4. Multi-Agent Fairness Verification

---

## North Star

OpenRNG transforms randomness from a disposable value into a verifiable digital object.


---

# FILE: VEO-1_SPEC_v1.0.md

# VEO-1 Technical Specification v1.0

## Verifiable Entropy Object Standard

### Abstract

VEO-1 defines a standard format for representing entropy as a verifiable digital object.

A Verifiable Entropy Object includes entropy payload, source provenance, verification metadata, confidence scoring, optional blockchain anchoring, and lineage references.

The purpose of VEO-1 is to transform randomness from a disposable output into a portable, auditable, and independently verifiable unit of uncertainty.

---

## Core Definition

A Verifiable Entropy Object is:

> A cryptographically verifiable representation of uncertainty, including entropy payload, provenance, confidence metrics, verification metadata, and trust assertions.

---

## Required Fields

```json
{
  "standard": "VEO-1",
  "version": "1.0",
  "object_id": "veo_...",
  "object_class": "VEO-1B",
  "entropy": "0x...",
  "entropy_hash": "0x...",
  "issued_at": "2026-06-24T00:00:00Z",
  "provider": "OpenRNG",
  "sources": [],
  "proof": {},
  "confidence": {}
}
```

---

## Recommended Full Object

```json
{
  "standard": "VEO-1",
  "version": "1.0",
  "object_id": "veo_01J...",
  "object_class": "VEO-1B",
  "entropy": "0x8f3a...",
  "entropy_hash": "0xdef...",
  "issued_at": "2026-06-24T00:00:00Z",
  "expires_at": null,
  "provider": "OpenRNG",
  "sources": [
    {
      "source_id": "drand-mainnet",
      "source_type": "randomness_beacon",
      "source_reference": "drand-round-123456",
      "timestamp": "2026-06-24T00:00:00Z",
      "entropy_hash": "0xabc...",
      "signature": "0x..."
    },
    {
      "source_id": "bitcoin",
      "source_type": "blockchain_block_hash",
      "source_reference": "block-900000",
      "timestamp": "2026-06-24T00:00:02Z",
      "entropy_hash": "0x123..."
    },
    {
      "source_id": "polygon",
      "source_type": "blockchain_block_hash",
      "source_reference": "block-78900000",
      "timestamp": "2026-06-24T00:00:03Z",
      "entropy_hash": "0x456..."
    }
  ],
  "aggregation": {
    "method": "sha256_concat",
    "input_order": ["drand-mainnet", "bitcoin", "polygon"],
    "aggregation_hash": "0xaaa..."
  },
  "confidence": {
    "score": 872,
    "grade": "AA",
    "freshness": 910,
    "diversity": 890,
    "independence": 830,
    "manipulation_resistance": 920,
    "verification_success": 880,
    "availability": 780
  },
  "proof": {
    "proof_type": "provider_signature",
    "signature_algorithm": "secp256k1",
    "provider_public_key": "0x...",
    "provider_signature": "0x...",
    "verification_endpoint": "https://api.openrng.io/v2/entropy/verify"
  },
  "anchor": {
    "anchor_type": "blockchain",
    "chain": "polygon-amoy",
    "contract": "0x...",
    "transaction_hash": "0x...",
    "merkle_root": "0x...",
    "anchor_timestamp": "2026-06-24T00:00:05Z"
  },
  "lineage": {
    "parent_object_ids": ["veo_01A...", "veo_01B...", "veo_01C..."],
    "lineage_hash": "0x..."
  },
  "policy": {
    "policy_name": "casino-grade",
    "min_ecs": 900,
    "min_sources": 3,
    "anchor_required": true
  }
}
```

---

## Verification Flow

A verifier should:

1. Confirm `standard` equals `VEO-1`.
2. Confirm schema validity.
3. Recalculate `entropy_hash`.
4. Verify source references.
5. Verify provider signature if present.
6. Verify freshness and expiration.
7. Verify aggregation method.
8. Verify ECS fields.
9. Verify optional blockchain anchor.
10. Verify optional lineage hash.
11. Confirm object satisfies required consumer policy.


---

# FILE: veo-1.schema.json

{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://openrng.io/schemas/veo-1.schema.json",
  "title": "VEO-1 Verifiable Entropy Object",
  "type": "object",
  "required": [
    "standard",
    "version",
    "object_id",
    "object_class",
    "entropy",
    "entropy_hash",
    "issued_at",
    "provider",
    "sources",
    "proof",
    "confidence"
  ],
  "properties": {
    "standard": {
      "const": "VEO-1"
    },
    "version": {
      "type": "string"
    },
    "object_id": {
      "type": "string"
    },
    "object_class": {
      "type": "string",
      "enum": [
        "VEO-1A",
        "VEO-1B",
        "VEO-1C",
        "VEO-1D"
      ]
    },
    "entropy": {
      "type": "string",
      "pattern": "^0x[0-9a-fA-F]+$"
    },
    "entropy_hash": {
      "type": "string",
      "pattern": "^0x[0-9a-fA-F]+$"
    },
    "issued_at": {
      "type": "string",
      "format": "date-time"
    },
    "expires_at": {
      "type": [
        "string",
        "null"
      ],
      "format": "date-time"
    },
    "provider": {
      "type": "string"
    },
    "sources": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": [
          "source_id",
          "source_type",
          "timestamp",
          "entropy_hash"
        ],
        "properties": {
          "source_id": {
            "type": "string"
          },
          "source_type": {
            "type": "string"
          },
          "source_reference": {
            "type": "string"
          },
          "timestamp": {
            "type": "string",
            "format": "date-time"
          },
          "entropy_hash": {
            "type": "string"
          },
          "signature": {
            "type": "string"
          }
        },
        "additionalProperties": true
      }
    },
    "aggregation": {
      "type": "object"
    },
    "confidence": {
      "type": "object",
      "required": [
        "score",
        "grade"
      ],
      "properties": {
        "score": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000
        },
        "grade": {
          "type": "string",
          "enum": [
            "AAA",
            "AA",
            "A",
            "B",
            "C",
            "LOW"
          ]
        },
        "freshness": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000
        },
        "diversity": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000
        },
        "independence": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000
        },
        "manipulation_resistance": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000
        },
        "verification_success": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000
        },
        "availability": {
          "type": "integer",
          "minimum": 0,
          "maximum": 1000
        }
      },
      "additionalProperties": true
    },
    "proof": {
      "type": "object"
    },
    "anchor": {
      "type": [
        "object",
        "null"
      ]
    },
    "lineage": {
      "type": [
        "object",
        "null"
      ]
    },
    "policy": {
      "type": [
        "object",
        "null"
      ]
    }
  },
  "additionalProperties": true
}

---

# FILE: openrng-api-v2.md

# OpenRNG API v2 — VEO-1 Endpoints

## GET /v2/entropy

Returns a VEO-1 object.

### Query Parameters

| Parameter | Type | Description |
|---|---|---|
| policy | string | simulation-grade, ai-grade, gaming-grade, casino-grade, enterprise-grade |
| min_ecs | number | minimum Entropy Confidence Score |
| min_sources | number | minimum source count |
| anchor_required | boolean | require blockchain anchor |
| max_latency_ms | number | maximum allowed latency |

### Example

```http
GET /v2/entropy?policy=gaming-grade&min_sources=2
```

### Response

```json
{
  "standard": "VEO-1",
  "version": "1.0",
  "object_id": "veo_...",
  "object_class": "VEO-1B",
  "entropy": "0x...",
  "entropy_hash": "0x...",
  "issued_at": "...",
  "provider": "OpenRNG",
  "sources": [],
  "confidence": {
    "score": 850,
    "grade": "AA"
  },
  "proof": {}
}
```

---

## POST /v2/entropy/verify

Verifies a VEO-1 object.

### Request

```json
{
  "entropy_object": {}
}
```

### Response

```json
{
  "valid": true,
  "checks": {
    "schema": true,
    "hash": true,
    "signature": true,
    "sources": true,
    "confidence": true,
    "anchor": true,
    "lineage": true,
    "policy": true
  },
  "errors": []
}
```

---

## Suggested Error Codes

| Code | Meaning |
|---|---|
| VEO_SCHEMA_INVALID | object does not satisfy schema |
| VEO_HASH_MISMATCH | entropy_hash cannot be reproduced |
| VEO_SIGNATURE_INVALID | provider signature invalid |
| VEO_SOURCE_INVALID | source reference cannot be verified |
| VEO_ECS_TOO_LOW | entropy confidence score below policy |
| VEO_ANCHOR_MISSING | anchor required but missing |
| VEO_ANCHOR_INVALID | anchor reference cannot be verified |
| VEO_EXPIRED | object expired |


---

# FILE: typescript-interfaces.ts

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


---

# FILE: entropy-confidence-score.ts

import { EntropyConfidence, EntropySourceRecord, VEOGrade } from "./typescript-interfaces";

export interface ECSInput {
  sources: EntropySourceRecord[];
  issuedAt: Date;
  now?: Date;
  verificationSuccess?: number; // 0-1000
  availability?: number; // 0-1000
  manipulationResistance?: number; // 0-1000
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1000, Math.round(n)));
}

export function gradeForScore(score: number): VEOGrade {
  if (score >= 900) return "AAA";
  if (score >= 800) return "AA";
  if (score >= 700) return "A";
  if (score >= 600) return "B";
  if (score >= 500) return "C";
  return "LOW";
}

export function calculateEntropyConfidence(input: ECSInput): EntropyConfidence {
  const now = input.now ?? new Date();
  const ageMs = Math.max(0, now.getTime() - input.issuedAt.getTime());
  const ageSeconds = ageMs / 1000;

  // Freshness decays linearly over 10 minutes for v0.1.
  const freshness = clamp(1000 - (ageSeconds / 600) * 1000);

  const uniqueSources = new Set(input.sources.map(s => s.source_id)).size;
  const diversity = clamp(Math.min(uniqueSources / 3, 1) * 1000);

  // For v0.1, independence is approximated by unique source_type count.
  const uniqueTypes = new Set(input.sources.map(s => s.source_type)).size;
  const independence = clamp(Math.min(uniqueTypes / 3, 1) * 1000);

  const manipulation_resistance = clamp(input.manipulationResistance ?? (uniqueSources >= 3 ? 900 : uniqueSources === 2 ? 800 : 650));
  const verification_success = clamp(input.verificationSuccess ?? 850);
  const availability = clamp(input.availability ?? 800);

  const score = clamp(
    freshness * 0.20 +
    diversity * 0.15 +
    independence * 0.20 +
    manipulation_resistance * 0.20 +
    verification_success * 0.15 +
    availability * 0.10
  );

  return {
    score,
    grade: gradeForScore(score),
    freshness,
    diversity,
    independence,
    manipulation_resistance,
    verification_success,
    availability
  };
}


---

# FILE: verify-entropy-object.ts

import crypto from "crypto";
import { VerifiableEntropyObject, EntropyPolicy } from "./typescript-interfaces";

export interface VerifyResult {
  valid: boolean;
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
  errors: string[];
}

export function sha256Hex(input: string): string {
  return "0x" + crypto.createHash("sha256").update(input).digest("hex");
}

export function computeEntropyHash(entropy: string): string {
  return sha256Hex(entropy.toLowerCase());
}

export function verifyEntropyObject(obj: VerifiableEntropyObject, policy?: EntropyPolicy): VerifyResult {
  const errors: string[] = [];

  const checks = {
    schema: true,
    hash: true,
    signature: null as boolean | null,
    sources: true,
    confidence: true,
    anchor: null as boolean | null,
    lineage: null as boolean | null,
    policy: true
  };

  if (obj.standard !== "VEO-1") {
    checks.schema = false;
    errors.push("VEO_SCHEMA_INVALID: standard must be VEO-1");
  }

  if (!obj.entropy || !obj.entropy_hash || !obj.sources || !obj.confidence) {
    checks.schema = false;
    errors.push("VEO_SCHEMA_INVALID: required fields missing");
  }

  const expectedHash = computeEntropyHash(obj.entropy);
  if (expectedHash !== obj.entropy_hash.toLowerCase()) {
    checks.hash = false;
    errors.push("VEO_HASH_MISMATCH");
  }

  if (!Array.isArray(obj.sources) || obj.sources.length < 1) {
    checks.sources = false;
    errors.push("VEO_SOURCE_INVALID: no sources");
  }

  if (obj.confidence.score < 0 || obj.confidence.score > 1000) {
    checks.confidence = false;
    errors.push("VEO_CONFIDENCE_INVALID");
  }

  if (policy?.min_ecs !== undefined && obj.confidence.score < policy.min_ecs) {
    checks.policy = false;
    errors.push("VEO_ECS_TOO_LOW");
  }

  if (policy?.min_sources !== undefined && obj.sources.length < policy.min_sources) {
    checks.policy = false;
    errors.push("VEO_SOURCE_COUNT_TOO_LOW");
  }

  if (policy?.anchor_required) {
    checks.anchor = Boolean(obj.anchor);
    if (!obj.anchor) errors.push("VEO_ANCHOR_MISSING");
  }

  // Signature / anchor / lineage verification should be wired to actual OpenRNG keys and contract reads.
  // Keep as null if not configured.
  if (obj.proof?.provider_signature) {
    checks.signature = true; // TODO: implement with provider public key.
  }

  if (obj.lineage) {
    checks.lineage = true; // TODO: recompute lineage_hash when parent objects are available.
  }

  const valid = Object.values(checks).every(v => v === true || v === null) && errors.length === 0;

  return { valid, checks, errors };
}


---

# FILE: source-adapters.stub.ts

import crypto from "crypto";
import { EntropySourceRecord } from "./typescript-interfaces";
import { sha256Hex } from "./verify-entropy-object";

export interface SourceAdapterResult {
  entropy: string;
  record: EntropySourceRecord;
}

export async function fetchDrandEntropy(): Promise<SourceAdapterResult> {
  // TODO: replace with live drand API integration.
  const entropy = "0x" + crypto.randomBytes(32).toString("hex");
  return {
    entropy,
    record: {
      source_id: "drand-mainnet",
      source_type: "randomness_beacon",
      source_reference: "TODO_LIVE_DRAND_ROUND",
      timestamp: new Date().toISOString(),
      entropy_hash: sha256Hex(entropy)
    }
  };
}

export async function fetchBitcoinBlockEntropy(): Promise<SourceAdapterResult> {
  // TODO: replace with live Bitcoin block hash source.
  const entropy = "0x" + crypto.randomBytes(32).toString("hex");
  return {
    entropy,
    record: {
      source_id: "bitcoin",
      source_type: "blockchain_block_hash",
      source_reference: "TODO_LIVE_BITCOIN_BLOCK",
      timestamp: new Date().toISOString(),
      entropy_hash: sha256Hex(entropy)
    }
  };
}

export async function fetchPolygonBlockEntropy(): Promise<SourceAdapterResult> {
  // TODO: replace with ethers.js provider.getBlock("latest").hash.
  const entropy = "0x" + crypto.randomBytes(32).toString("hex");
  return {
    entropy,
    record: {
      source_id: "polygon",
      source_type: "blockchain_block_hash",
      source_reference: "TODO_LIVE_POLYGON_BLOCK",
      timestamp: new Date().toISOString(),
      entropy_hash: sha256Hex(entropy)
    }
  };
}


---

# FILE: generate-veo-object.ts

import crypto from "crypto";
import { VerifiableEntropyObject, EntropyPolicy } from "./typescript-interfaces";
import { calculateEntropyConfidence } from "./entropy-confidence-score";
import { sha256Hex } from "./verify-entropy-object";
import { fetchDrandEntropy, fetchBitcoinBlockEntropy, fetchPolygonBlockEntropy } from "./source-adapters.stub";

function objectId(): string {
  return "veo_" + crypto.randomBytes(16).toString("hex");
}

function aggregateEntropy(inputs: string[]): string {
  return sha256Hex(inputs.map(x => x.toLowerCase()).join("|"));
}

export async function generateVEOObject(policy?: EntropyPolicy): Promise<VerifiableEntropyObject> {
  const sourceResults = await Promise.all([
    fetchDrandEntropy(),
    fetchBitcoinBlockEntropy(),
    fetchPolygonBlockEntropy()
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
    availability: 800
  });

  return {
    standard: "VEO-1",
    version: "1.0",
    object_id: objectId(),
    object_class: policy?.anchor_required ? "VEO-1C" : "VEO-1B",
    entropy,
    entropy_hash,
    issued_at: issuedAt.toISOString(),
    expires_at: null,
    provider: "OpenRNG",
    sources,
    aggregation: {
      method: "sha256_concat",
      input_order: sources.map(s => s.source_id),
      aggregation_hash: entropy_hash
    },
    confidence,
    proof: {
      proof_type: "provider_signature",
      signature_algorithm: "secp256k1",
      provider_public_key: process.env.OPENRNG_PROVIDER_PUBLIC_KEY ?? "TODO",
      provider_signature: "TODO_SIGN_CANONICAL_OBJECT",
      verification_endpoint: "https://api.openrng.io/v2/entropy/verify"
    },
    anchor: null,
    lineage: null,
    policy: policy ?? null
  };
}


---

# FILE: express-routes.stub.ts

import express from "express";
import { generateVEOObject } from "./generate-veo-object";
import { verifyEntropyObject } from "./verify-entropy-object";
import { EntropyPolicy } from "./typescript-interfaces";

export const veoRouter = express.Router();

const policyPresets: Record<string, EntropyPolicy> = {
  "simulation-grade": { policy_name: "simulation-grade", min_ecs: 700, min_sources: 1, anchor_required: false },
  "ai-grade": { policy_name: "ai-grade", min_ecs: 800, min_sources: 2, anchor_required: false },
  "gaming-grade": { policy_name: "gaming-grade", min_ecs: 850, min_sources: 2, anchor_required: true },
  "casino-grade": { policy_name: "casino-grade", min_ecs: 900, min_sources: 3, anchor_required: true },
  "enterprise-grade": { policy_name: "enterprise-grade", min_ecs: 950, min_sources: 3, anchor_required: true, audit_required: true }
};

function policyFromQuery(query: any): EntropyPolicy | undefined {
  const preset = query.policy ? policyPresets[String(query.policy)] : undefined;
  return {
    ...(preset ?? {}),
    min_ecs: query.min_ecs ? Number(query.min_ecs) : preset?.min_ecs,
    min_sources: query.min_sources ? Number(query.min_sources) : preset?.min_sources,
    anchor_required: query.anchor_required ? String(query.anchor_required) === "true" : preset?.anchor_required,
    max_latency_ms: query.max_latency_ms ? Number(query.max_latency_ms) : preset?.max_latency_ms
  };
}

veoRouter.get("/v2/entropy", async (req, res, next) => {
  try {
    const policy = policyFromQuery(req.query);
    const obj = await generateVEOObject(policy);
    res.json(obj);
  } catch (err) {
    next(err);
  }
});

veoRouter.post("/v2/entropy/verify", express.json(), async (req, res, next) => {
  try {
    const entropyObject = req.body.entropy_object ?? req.body;
    const policy = req.body.policy;
    const result = verifyEntropyObject(entropyObject, policy);
    res.json(result);
  } catch (err) {
    next(err);
  }
});


---

# FILE: smart-contract-integration-notes.md

# Smart Contract Integration Notes

## Existing Context

OpenRNG has mentioned a Polygon Amoy testnet contract:

```text
0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8
```

The agent should inspect the actual ABI and contract methods before implementation.

---

## Intended Anchor Flow

1. Generate VEO-1 object.
2. Compute `entropy_hash`.
3. If batching is available, insert entropy hash as a Merkle leaf.
4. Compute or retrieve Merkle root.
5. Submit Merkle root or entropy hash to the existing OpenRNG anchoring contract.
6. Store returned transaction hash.
7. Add anchor package to VEO-1 object.

---

## Anchor Package

```json
{
  "anchor_type": "blockchain",
  "chain": "polygon-amoy",
  "contract": "0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8",
  "transaction_hash": "0x...",
  "merkle_root": "0x...",
  "anchor_timestamp": "..."
}
```

---

## Verification Flow

The verifier should:

1. Read transaction or contract state.
2. Confirm stored root/hash equals VEO-1 anchor value.
3. Confirm chain and contract match expected OpenRNG configuration.
4. Mark `checks.anchor = true`.

---

## Important

Do not deploy a new contract unless necessary.

Prefer reusing current OpenRNG anchoring contract.


---

# FILE: README.md

# OpenRNG VEO-1 Agent Package

This package contains the execution brief, technical specification, schema, API design, and TypeScript scaffolding for implementing:

## VEO-1 — Verifiable Entropy Object Standard

### Files

- `OPENRNG_VEO1_AGENT_BRIEF.md` — main instruction document for an AI agent
- `VEO-1_SPEC_v1.0.md` — technical specification
- `veo-1.schema.json` — JSON schema
- `openrng-api-v2.md` — API design
- `typescript-interfaces.ts` — TypeScript interfaces
- `entropy-confidence-score.ts` — ECS calculator
- `verify-entropy-object.ts` — verification logic
- `source-adapters.stub.ts` — entropy source adapter stubs
- `generate-veo-object.ts` — object generation scaffold
- `express-routes.stub.ts` — Express route scaffold
- `smart-contract-integration-notes.md` — blockchain anchoring guidance

### Agent Task

Drop this package into an AI coding agent with access to:

- OpenRNG repository
- API infrastructure
- smart contract ABI
- Polygon Amoy RPC / keys if needed

Ask the agent to implement `/v2/entropy` and `/v2/entropy/verify`.

### North Star

OpenRNG transforms randomness from a disposable value into a verifiable digital object.
