# RFC-0002: Verifiable Execution Object Standard (VEO-2)

```
Status:   DRAFT
Version:  2.0
Date:     2026-08-01
Protocol: OpenRNG VEO-2
Author:   OpenRNG Team
Replaces: RFC-0001 (VEO-1) — backward compatible
```

---

## 1. Purpose

VEO-2 extends the Verifiable Entropy Object standard (VEO-1) into a general-purpose **Verifiable Execution Object** standard for autonomous AI systems.

Where VEO-1 made randomness auditable, VEO-2 makes **any AI execution** — a single LLM call, a multi-agent pipeline, a governed financial decision — into a portable, cryptographically verifiable, independently auditable digital object.

VEO-2 is the trust layer for autonomous AI. Every decision, every tool call, every output becomes a first-class object with provenance, confidence, cost, and optional human oversight baked in.

### Design Goals

1. **Universality** — Represent any AI execution, from a single chat completion to a multi-agent orchestration with human-in-the-loop governance.
2. **Backward Compatibility** — Every valid VEO-1 object is a valid VEO-2A object with minimal transformation (see Section 14).
3. **Trust Infrastructure** — Provide the primitives for AI observability, auditability, and compliance without mandating specific AI frameworks or providers.
4. **Lifecycle Awareness** — Define execution objects as stateful entities with a clear lifecycle from creation through verification.

---

## 2. Core Definition

A Verifiable Execution Object is:

> A cryptographically verifiable representation of an AI execution, including execution payload, model provenance, confidence metrics, cost accounting, verification metadata, trust assertions, and optional governance records.

---

## 3. Object Classes

VEO-2 defines four object classes. These supersede VEO-1 classes.

| Class    | Name                    | Description |
|----------|-------------------------|-------------|
| VEO-2A   | Raw Execution Record    | Single AI execution (one model call — prompt, output, latency, cost) |
| VEO-2B   | Composite Execution     | Multi-step chain or agent pipeline (references child VEO-2A objects) |
| VEO-2C   | Anchored Execution      | Execution object with blockchain proof or Merkle anchor |
| VEO-2D   | Governed Execution      | Execution with policy assertions, human approvals, and/or confidence thresholds |

### Class Relationships

- **VEO-2A** is the atomic unit. All other classes build on or reference VEO-2A objects.
- **VEO-2B** is a DAG of VEO-2A (or nested VEO-2B) objects linked via `parent_ids` / `child_ids`.
- **VEO-2C** extends any class (2A, 2B, or 2D) with a blockchain anchor. An object becomes VEO-2C only when a confirmed on-chain anchor exists.
- **VEO-2D** extends any class (2A, 2B, or 2C) with governance records. An object is VEO-2D when it includes `human_approvals` or `policy` with enforcement assertions.

### Classification Rules

An object's `object_class` is determined by its highest applicable class:

1. If `human_approvals` is non-empty OR `policy.enforced` is `true` → **VEO-2D**
2. Else if `anchor` is present and `anchor.anchor_status` is `"anchored"` → **VEO-2C**
3. Else if `child_ids` is non-empty → **VEO-2B**
4. Else → **VEO-2A**

A VEO-2D object with an anchor is still classified VEO-2D (the anchor is additive metadata, not a class override).

---

## 4. Required Fields

The following fields are required in every VEO-2 object:

| Field          | Type     | Description |
|----------------|----------|-------------|
| `standard`     | string   | MUST be `"VEO-2"` |
| `version`      | string   | Protocol version (e.g., `"2.0"`) |
| `object_id`    | string   | Unique identifier (format: `veo_` + 32 hex chars) |
| `object_class` | string   | One of: `VEO-2A`, `VEO-2B`, `VEO-2C`, `VEO-2D` |
| `issued_at`    | string   | ISO 8601 timestamp of object creation |
| `provider`     | string   | Provider/platform identifier (e.g., `"OpenRNG"`, `"Acme AI"`) |
| `execution`    | object   | Execution payload (see Section 5) |
| `proof`        | object   | Provider proof/signature package (same as VEO-1 Section 10) |
| `confidence`   | object   | Execution Confidence Score (ECS v2, see Section 9) |

### Execution-Specific Required Fields

Within the `execution` object (Section 5), the following are always required:

| Field          | Type     | Description |
|----------------|----------|-------------|
| `model_id`     | string   | Model identifier (e.g., `"gpt-4o-2024-08-06"`, `"claude-opus-4-20250514"`) |
| `prompt_hash`  | string   | SHA-256 hash of the input prompt/messages (`0x...`) |
| `output_hash`  | string   | SHA-256 hash of the execution output (`0x...`) |
| `latency_ms`   | number   | Execution latency in milliseconds |
| `started_at`   | string   | ISO 8601 timestamp of execution start |
| `completed_at` | string   | ISO 8601 timestamp of execution completion |

### Optional Fields (Top-Level)

| Field              | Type          | Description |
|--------------------|---------------|-------------|
| `expires_at`       | string\|null  | Expiration timestamp |
| `anchor`           | object\|null  | Blockchain anchor package (see Section 11) |
| `lineage`          | object\|null  | Parent object references |
| `parent_ids`       | array\|null   | VEO object_ids of parent executions |
| `child_ids`        | array\|null   | VEO object_ids of child executions |
| `human_approvals`  | array\|null   | Human approval records (see Section 10) |
| `policy`           | object\|null  | Governance policy applied (see Section 10) |
| `lifecycle`        | object\|null  | Current lifecycle state (see Section 8) |
| `tags`             | array\|null   | Freeform string tags for categorization |
| `metadata`         | object\|null  | Arbitrary provider-specific metadata |

### Optional Fields (Execution Object)

| Field          | Type          | Description |
|----------------|---------------|-------------|
| `prompt`       | string\|null  | Raw prompt text or serialized messages (OPTIONAL — may be omitted for privacy) |
| `output`       | string\|null  | Raw output text (OPTIONAL — may be omitted for privacy) |
| `tool_calls`   | array\|null   | Tool/function calls made during execution (see Section 6) |
| `cost`         | object\|null  | Cost accounting (see Section 7) |
| `tokens`       | object\|null  | Token usage breakdown |
| `parameters`   | object\|null  | Model parameters (temperature, top_p, etc.) |
| `error`        | object\|null  | Error details if execution failed |

Required fields MUST NOT be removed or renamed in VEO-2.x. New optional fields MAY be added if backward compatible.

---

## 5. Execution Object

The `execution` object captures the AI execution payload.

```json
{
  "model_id": "gpt-4o-2024-08-06",
  "prompt_hash": "0x9f86d081884c7d659a2feaa0c55ad015...",
  "output_hash": "0xa591a6d40bf420404a011733cfb7b190...",
  "latency_ms": 1847,
  "started_at": "2026-08-01T05:00:00.000Z",
  "completed_at": "2026-08-01T05:00:01.847Z",
  "prompt": "Summarize Q2 revenue trends...",
  "output": "Q2 revenue increased 12% YoY...",
  "tool_calls": [],
  "cost": { ... },
  "tokens": { "input": 150, "output": 89, "total": 239 },
  "parameters": { "temperature": 0.7, "max_tokens": 1024 }
}
```

### Prompt Hash

The `prompt_hash` field MUST be computed as:

```
prompt_hash = "0x" + SHA-256(UTF-8(prompt_content))
```

Where `prompt_content` is the serialized input. For chat-style APIs, this is `JSON.stringify(messages)` with keys sorted alphabetically. For simple text prompts, this is the raw string.

### Output Hash

The `output_hash` field follows the same pattern:

```
output_hash = "0x" + SHA-256(UTF-8(output_content))
```

---

## 6. Tool Calls

When an AI execution includes tool/function calls, each call MUST be recorded:

| Field            | Type     | Required | Description |
|------------------|----------|----------|-------------|
| `tool_id`        | string   | Yes      | Tool/function name |
| `tool_type`      | string   | Yes      | Category: `"function"`, `"api"`, `"browser"`, `"code_execution"`, `"file_io"`, `"other"` |
| `input_hash`     | string   | Yes      | SHA-256 of the tool input |
| `output_hash`    | string   | Yes      | SHA-256 of the tool output |
| `input`          | any      | No       | Raw tool input (may be omitted for privacy) |
| `output`         | any      | No       | Raw tool output (may be omitted for privacy) |
| `latency_ms`     | number   | No       | Tool call latency |
| `status`         | string   | Yes      | `"success"`, `"error"`, `"timeout"` |
| `timestamp`      | string   | Yes      | ISO 8601 timestamp |

---

## 7. Cost Accounting

The optional `cost` object within `execution` tracks compute costs:

| Field          | Type     | Required | Description |
|----------------|----------|----------|-------------|
| `currency`     | string   | Yes      | ISO 4217 currency code (e.g., `"USD"`) |
| `total`        | number   | Yes      | Total cost |
| `input_cost`   | number   | No       | Cost for input/prompt tokens |
| `output_cost`  | number   | No       | Cost for output/completion tokens |
| `tool_cost`    | number   | No       | Cost for tool executions |
| `anchor_cost`  | number   | No       | Cost for blockchain anchoring |

---

## 8. VEO Lifecycle

A VEO-2 object progresses through a defined lifecycle represented as a state machine:

```
created → signed → anchored → indexed → verified
           │                      │
           └──────────────────────┘
                (may skip)
```

### States

| State       | Description |
|-------------|-------------|
| `created`   | Object constructed with all required fields; not yet signed |
| `signed`    | Provider signature applied via `proof` |
| `anchored`  | Blockchain anchor confirmed; `object_class` may upgrade to VEO-2C |
| `indexed`   | Object stored in a searchable registry/index |
| `verified`  | Independent verification completed successfully |

### Transitions

- `created → signed`: Provider applies cryptographic signature.
- `signed → anchored`: Blockchain anchor transaction confirmed. (May be skipped.)
- `signed → indexed` or `anchored → indexed`: Object registered in a VEO index. (May be skipped.)
- Any state `→ verified`: Independent verifier confirms integrity.

The `lifecycle` field records the current state:

```json
{
  "state": "signed",
  "transitions": [
    { "from": "created", "to": "signed", "timestamp": "2026-08-01T05:00:02.000Z", "actor": "OpenRNG" }
  ]
}
```

---

## 9. Execution Confidence Score (ECS v2)

ECS v2 replaces the Entropy Confidence Score from VEO-1 with a broader **Execution Confidence Score** that measures execution quality and trustworthiness.

### Score Range

ECS v2 maintains the 0–1000 range and letter-grade system from ECS v1.

| Grade | Range     | Description |
|-------|-----------|-------------|
| A+    | 950–1000  | Highest trust — anchored, governed, multi-source |
| A     | 900–949   | High trust — signed, multi-verification |
| B     | 800–899   | Good trust — standard execution with provenance |
| C     | 700–799   | Acceptable — minimal verification |
| D     | 500–699   | Low trust — limited provenance or failed checks |
| F     | 0–499     | Untrusted — missing critical verification |

### Dimensions

ECS v2 scores across six dimensions (weights sum to 1.0):

| Dimension          | Weight | Description |
|--------------------|--------|-------------|
| `provenance`       | 0.25   | Model identification, provider trust, source verifiability |
| `integrity`        | 0.25   | Hash verification, signature validity, data consistency |
| `reproducibility`  | 0.15   | Deterministic parameters, seed availability, replay capability |
| `governance`       | 0.15   | Human oversight, policy enforcement, approval records |
| `observability`    | 0.10   | Completeness of metadata, tool call records, cost tracking |
| `timeliness`       | 0.10   | Freshness of execution, latency appropriateness, anchor delay |

### Confidence Object

```json
{
  "score": 870,
  "grade": "B",
  "version": "ECS-v2",
  "dimensions": {
    "provenance": 220,
    "integrity": 240,
    "reproducibility": 120,
    "governance": 100,
    "observability": 95,
    "timeliness": 95
  }
}
```

### Backward Compatibility with ECS v1

VEO-1 entropy-specific dimensions (`source_count`, `source_diversity`, `freshness`, `cryptographic_proof`, `protocol_compliance`) map to ECS v2 dimensions as follows:

- `source_count` + `source_diversity` → `provenance`
- `freshness` → `timeliness`
- `cryptographic_proof` → `integrity`
- `protocol_compliance` → `observability`

The `governance` and `reproducibility` dimensions are new in ECS v2.

---

## 10. Governance

### Human Approvals

When human oversight is part of the execution, each approval MUST be recorded:

| Field          | Type     | Required | Description |
|----------------|----------|----------|-------------|
| `approver_id`  | string   | Yes      | Identifier of the human approver |
| `approver_role`| string   | No       | Role (e.g., `"compliance_officer"`, `"team_lead"`) |
| `decision`     | string   | Yes      | `"approved"`, `"rejected"`, `"escalated"`, `"conditional"` |
| `timestamp`    | string   | Yes      | ISO 8601 timestamp of the approval |
| `reason`       | string   | No       | Free-text reason for the decision |
| `conditions`   | array    | No       | Conditions attached to a conditional approval |
| `signature`    | string   | No       | Cryptographic signature of the approver |

### Policy Object

The `policy` object defines governance constraints applied to the execution:

| Field                    | Type     | Required | Description |
|--------------------------|----------|----------|-------------|
| `policy_id`              | string   | Yes      | Unique policy identifier |
| `policy_name`            | string   | Yes      | Human-readable policy name |
| `enforced`               | boolean  | Yes      | Whether the policy was actively enforced |
| `min_confidence`         | number   | No       | Minimum ECS score required |
| `max_cost`               | number   | No       | Maximum allowed cost |
| `require_human_approval` | boolean  | No       | Whether human approval is required |
| `require_anchor`         | boolean  | No       | Whether blockchain anchoring is required |
| `allowed_models`         | array    | No       | Whitelist of permitted model IDs |
| `assertions`             | array    | No       | Policy assertion results |

### Policy Assertions

Each entry in `assertions` records a policy check:

```json
{
  "rule": "max_cost_usd",
  "expected": 0.50,
  "actual": 0.23,
  "passed": true
}
```

---

## 11. Blockchain Anchoring

Blockchain anchoring follows the same mechanism as VEO-1 Section 11, with the following changes:

- The anchored hash is computed over the canonical VEO-2 signing payload (see Section 12).
- The `object_class` upgrades to `VEO-2C` only when no governance records exist. If governance records exist, the object remains `VEO-2D` with anchor data populated.
- Batch anchoring is supported: multiple VEO-2 objects may share a single Merkle tree anchor.

### Anchor Package

Same fields as VEO-1 Section 11, with an additional optional field:

| Field              | Type   | Description |
|--------------------|--------|-------------|
| `merkle_proof`     | array  | Merkle proof path for batch-anchored objects |

All other anchor fields remain as defined in VEO-1.

---

## 12. Canonical VEO-2 Signing Payload

The canonical form follows the same rules as VEO-1 Section 9, with the expanded field set:

### Fields Included

```
standard, version, object_id, object_class, issued_at, expires_at,
provider, execution, confidence, lineage, parent_ids, child_ids,
human_approvals, policy, tags, lifecycle, anchor
```

The `anchor` field is ALWAYS `null` in the canonical signing payload (same rationale as VEO-1).

### Fields Excluded

- `proof.*` (self-referential)
- `metadata` (arbitrary, not part of trust assertions)

---

## 13. Verification Levels

VEO-2 extends VEO-1 verification levels:

| Level                          | Meaning |
|--------------------------------|---------|
| `structurally_valid_unsigned`  | Schema valid; hashes verified; no signature, no anchor |
| `cryptographically_verified`  | Schema valid; hashes verified; provider signature valid |
| `anchored_verified`           | Schema valid; signature valid if present; anchor verified on-chain |
| `governed_verified`           | All above checks pass; governance records present and valid |
| `policy_failed`               | Object may be structurally valid but policy requirements not met |
| `invalid`                     | Schema, hash, signature, anchor, or governance verification failed |

The new level `governed_verified` is the highest trust level, applicable only to VEO-2D objects with complete governance records.

---

## 14. Backward Compatibility

### VEO-1 → VEO-2 Migration

Every valid VEO-1 object can be represented as a VEO-2A object:

| VEO-1 Field      | VEO-2 Mapping |
|-------------------|---------------|
| `standard`        | `"VEO-2"` |
| `object_class`    | `"VEO-2A"` (VEO-1A/1B) or `"VEO-2C"` (VEO-1C) |
| `entropy`         | `execution.output` = entropy value |
| `entropy_hash`    | `execution.output_hash` = entropy_hash |
| `sources`         | `execution.tool_calls` (one per source) |
| `aggregation`     | `metadata.aggregation` |
| `confidence`      | ECS v1 scores map to ECS v2 (see Section 9) |

### Compatibility Rules

- VEO-2 implementations SHOULD accept VEO-1 objects and auto-upgrade them.
- VEO-1 required fields that do not exist in VEO-2 are moved to `metadata.veo1_compat`.
- The `entropy` and `entropy_hash` fields MAY appear in VEO-2 objects within `metadata` for backward compatibility.
- VEO-2A objects with `metadata.veo1_compat` set are understood to be migrated VEO-1 objects.

---

## 15. Consumer Policies

VEO-2 extends VEO-1 policies with AI-specific presets:

| Policy              | min_ecs | require_human_approval | require_anchor | max_latency_ms | allowed_classes |
|----------------------|---------|------------------------|----------------|----------------|-----------------|
| observability-grade  | 600     | false                  | false          | —              | 2A, 2B          |
| ai-standard          | 750     | false                  | false          | 30000          | 2A, 2B          |
| ai-production        | 850     | false                  | true           | 10000          | 2A, 2B, 2C      |
| governed-grade       | 900     | true                   | true           | —              | 2D              |
| regulated-grade      | 950     | true                   | true           | —              | 2C, 2D          |

VEO-1 policies (`simulation-grade`, `gaming-grade`, etc.) remain valid for backward-compatible entropy use cases.

---

## 16. Future Versioning

- VEO-2.1, VEO-2.2, etc.: backward-compatible additions.
- VEO-3.0: breaking changes to required fields, canonicalization, or verification levels.
- ECS v3: changes to scoring weights, dimensions, or grade boundaries.
- Planned extensions:
  - **VEO-2E**: Federated Execution — cross-organization execution with multi-party signatures.
  - **VEO Streams**: Real-time VEO emission for streaming AI outputs.
  - **VEO Registries**: Standardized APIs for VEO indexing and search.

---

## 17. References

- OpenRNG Repository: `~/openrng/`
- VEO-1 Specification: [RFC-0001-VEO1.md](./RFC-0001-VEO1.md)
- ECS v1 Specification: [ECS-v1.md](./ECS-v1.md)
- VEO-2 JSON Schema: [../../schemas/veo-2.schema.json](../../schemas/veo-2.schema.json)
- VEO-2 Examples: [veo-2-examples/](./veo-2-examples/)
- MerkleAnchor Contract: `0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8` (Polygon Amoy)
