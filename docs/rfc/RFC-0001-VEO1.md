# RFC-0001: Verifiable Entropy Object Standard (VEO-1)

```
Status:   Frozen
Version:  1.0
Date:     2026-06-24
Protocol: OpenRNG VEO-1
Author:   OpenRNG Team
```

---

## 1. Purpose

VEO-1 defines a standard format for representing entropy as a verifiable digital object.

A Verifiable Entropy Object includes entropy payload, source provenance, verification metadata, confidence scoring, optional provider signing, optional blockchain anchoring, and lineage references.

The purpose of VEO-1 is to transform randomness from a disposable output into a portable, auditable, and independently verifiable unit of uncertainty.

---

## 2. Core Definition

A Verifiable Entropy Object is:

> A cryptographically verifiable representation of uncertainty, including entropy payload, provenance, confidence metrics, verification metadata, and trust assertions.

---

## 3. Object Classes

VEO-1 defines four object classes. These are frozen protocol constants.

| Class    | Name                        | Description |
|----------|-----------------------------|-------------|
| VEO-1A   | Raw Source Entropy Object   | Single-source entropy (drand, Bitcoin block hash, QRNG, hardware RNG) |
| VEO-1B   | Composite Entropy Object    | Multi-source aggregated entropy |
| VEO-1C   | Anchored Entropy Object     | Entropy object with blockchain anchor or Merkle proof |
| VEO-1D   | Decision Entropy Object     | Reserved for future VDO-1 (Verifiable Decision Object) expansion |

Object class identifiers MUST NOT be renamed without a protocol version bump.

VEO-1C MUST only be assigned when a real blockchain anchor transaction exists and has been confirmed. Policy requirements alone do not qualify an object for VEO-1C classification.

---

## 4. Required Fields

The following fields are required in every VEO-1 object:

| Field          | Type     | Description |
|----------------|----------|-------------|
| `standard`     | string   | MUST be `"VEO-1"` |
| `version`      | string   | Protocol version (e.g., `"1.0"`) |
| `object_id`    | string   | Unique identifier (format: `veo_` + 32 hex chars) |
| `object_class` | string   | One of: `VEO-1A`, `VEO-1B`, `VEO-1C`, `VEO-1D` |
| `entropy`      | string   | Hex-encoded entropy payload (`0x...`) |
| `entropy_hash` | string   | SHA-256 hash of entropy (`0x...`) |
| `issued_at`    | string   | ISO 8601 timestamp |
| `provider`     | string   | Provider identifier (e.g., `"OpenRNG"`) |
| `sources`      | array    | Array of `EntropySourceRecord` objects (min 1) |
| `proof`        | object   | Provider proof/signature package |
| `confidence`   | object   | Entropy Confidence Score (ECS) |

### Optional Fields

| Field          | Type          | Description |
|----------------|---------------|-------------|
| `expires_at`   | string\|null  | Expiration timestamp |
| `aggregation`  | object\|null  | Aggregation method metadata |
| `anchor`       | object\|null  | Blockchain anchor package |
| `lineage`      | object\|null  | Parent object references |
| `policy`       | object\|null  | Consumer policy applied |

Required fields MUST NOT be removed or renamed in VEO-1.x. New optional fields MAY be added if backward compatible.

---

## 5. Entropy Hash

The `entropy_hash` field MUST be computed as:

```
entropy_hash = "0x" + SHA-256(lowercase(entropy))
```

The hash MUST be reproducible: given the same entropy value, the same hash MUST always be produced. Case normalization (lowercase) MUST be applied before hashing.

---

## 6. Source Records

Each entry in the `sources` array MUST include:

| Field            | Type   | Required | Description |
|------------------|--------|----------|-------------|
| `source_id`      | string | Yes      | Unique source identifier |
| `source_type`    | string | Yes      | Source category |
| `source_reference` | string | No    | Specific reference (e.g., `drand-round-29830144`) |
| `timestamp`      | string | Yes      | ISO 8601 fetch timestamp |
| `entropy_hash`   | string | Yes      | SHA-256 hash of individual source entropy |
| `signature`      | string | No       | Source-provided signature |

When a source fetch fails, the adapter MAY fall back to `crypto.randomBytes` with `source_reference` set to `"fallback-crypto-random"`. Fallback usage MUST be reflected in the ECS (see Section 8).

---

## 7. Aggregation

When multiple sources are used, entropy MUST be aggregated deterministically.

Default method: `sha256_concat`

```
aggregated_entropy = SHA-256(lowercase(source1) + "|" + lowercase(source2) + "|" + ...)
```

The `aggregation` field records:

| Field              | Type   | Description |
|--------------------|--------|-------------|
| `method`           | string | Aggregation algorithm |
| `input_order`      | array  | Source IDs in aggregation order |
| `aggregation_hash` | string | Hash of the aggregated entropy |

---

## 8. Entropy Confidence Score (ECS v1)

See: [ECS-v1.md](./ECS-v1.md)

ECS is a 0–1000 score measuring entropy quality. The confidence object MUST include `score` and `grade`. Dimension sub-scores and fallback metadata are recommended.

---

## 9. Canonical VEO Signing Payload

Before signing, a deterministic canonical form MUST be computed.

### Rules

1. Deep sort all object keys alphabetically at every nesting level.
2. Remove `undefined` values.
3. Preserve `null` values explicitly.
4. Use stable `JSON.stringify` on the sorted structure.
5. The same VEO input MUST always produce the same canonical string.
6. Canonicalization rule changes REQUIRE a protocol version bump.

### Fields Included

```
standard, version, object_id, object_class, entropy, entropy_hash,
issued_at, expires_at, provider, sources, aggregation, confidence,
lineage, policy, anchor
```

The `anchor` field is ALWAYS `null` in the canonical signing payload because the signature is computed before anchoring occurs.

### Fields Excluded

The following are excluded because they are either self-referential or populated after signing:

- `proof.provider_signature`
- `proof.provider_public_key`
- `proof.provider_address`
- `proof.verification_endpoint`
- `proof.proof_type`
- `proof.proof_status`
- `proof.signature_algorithm`
- `proof.canonical_hash`
- `anchor` (always null — anchor data is post-signing)

---

## 10. Provider Signing

### When Configured

If the provider has a signing key (`OPENRNG_PROVIDER_PRIVATE_KEY`), the VEO MUST be signed using secp256k1 EIP-191 (`personal_sign`) over the SHA-256 hash of the canonical payload.

```
canonical = canonicalizeVEOForSigning(veo)
payloadHash = SHA-256(canonical)
signature = wallet.signMessage(payloadHash)
```

The proof object MUST include:

| Field                  | Value |
|------------------------|-------|
| `proof_type`           | `"provider_signature"` |
| `proof_status`         | `"cryptographically_signed"` |
| `signature_algorithm`  | `"secp256k1_eip191"` |
| `provider_public_key`  | Provider's public key |
| `provider_address`     | Provider's Ethereum address |
| `provider_signature`   | EIP-191 signature |
| `canonical_hash`       | SHA-256 hash of canonical payload |

### When Not Configured

```json
{
  "proof_type": "none",
  "proof_status": "unsigned"
}
```

### Verification

A verifier MUST:

1. Rebuild the canonical payload from the VEO object.
2. Compute SHA-256 of the canonical payload.
3. Recover the signer address from the EIP-191 signature.
4. Compare recovered address to `proof.provider_address`.

If the signature is a placeholder (e.g., `"TODO"`), verification MUST return `signature: null`, NOT `signature: true`.

---

## 11. Blockchain Anchoring

### When Configured

If anchoring is active (`NODE_ENV=production` + `DEPLOYER_PRIVATE_KEY` + contract address):

1. Compute `entropy_hash`.
2. Use `entropy_hash` as a single-leaf Merkle root (v1.0).
3. Generate a `batch_id`.
4. Call `anchorBatch(batchId, merkleRoot, batchSize, clientId)` on the MerkleAnchor contract.
5. Wait for 2 block confirmations.
6. Read back `getBatchRoot(batchId)` and confirm stored root matches.
7. Populate the anchor package.
8. Set `object_class` to `VEO-1C`.

### Anchor Package

| Field              | Type   | Description |
|--------------------|--------|-------------|
| `anchor_type`      | string | `"blockchain"` |
| `anchor_status`    | string | `"anchored"` |
| `chain`            | string | Chain identifier (e.g., `"polygon-amoy"`) |
| `contract`         | string | Contract address |
| `transaction_hash` | string | Anchor transaction hash |
| `block_number`     | number | Confirmation block number |
| `batch_id`         | string | On-chain batch identifier |
| `batch_size`       | number | Number of leaves (1 for single-leaf) |
| `merkle_root`      | string | Anchored Merkle root (bytes32) |
| `anchor_timestamp` | string | On-chain timestamp |

### When Not Configured

If `anchor_required` policy is requested but anchoring is not available:

```json
{
  "valid": false,
  "error": "ANCHOR_REQUIRED_BUT_NOT_AVAILABLE",
  "details": { "anchoring_status": "disabled_missing_key" }
}
```

### Anchor Verification

A verifier MAY verify the anchor by:

1. Calling `batchExists(batchId)` on the contract.
2. Calling `getBatchRoot(batchId)` and comparing the returned root to `anchor.merkle_root`.

---

## 12. Verification Levels

The following verification levels are frozen protocol constants:

| Level                          | Meaning |
|--------------------------------|---------|
| `structurally_valid_unsigned`  | Schema + hash valid; no signature, no anchor |
| `cryptographically_verified`  | Schema + hash valid; provider signature valid |
| `anchored_verified`           | Schema + hash valid; signature valid if present; anchor verified on-chain |
| `policy_failed`               | Object may be structurally valid but policy requirements not met |
| `invalid`                     | Schema, hash, signature, or anchor verification failed |

### Verification Output

```json
{
  "valid": true,
  "verification_level": "cryptographically_verified",
  "checks": {
    "schema": true,
    "hash": true,
    "signature": true,
    "sources": true,
    "confidence": true,
    "anchor": null,
    "lineage": null,
    "policy": true
  },
  "statuses": {
    "proof_status": "cryptographically_verified",
    "anchor_status": "unanchored",
    "source_status": "live",
    "policy_status": "not_applicable"
  },
  "errors": []
}
```

---

## 13. Consumer Policies

Five preset policies are defined:

| Policy             | min_ecs | min_sources | anchor_required |
|--------------------|---------|-------------|-----------------|
| simulation-grade   | 700     | 1           | false           |
| ai-grade           | 800     | 2           | false           |
| gaming-grade       | 850     | 2           | true            |
| casino-grade       | 900     | 3           | true            |
| enterprise-grade   | 950     | 3           | true            |

---

## 14. Backward Compatibility

- Required fields MUST NOT be removed or renamed in VEO-1.x.
- New optional fields MAY be added.
- Object class identifiers MUST NOT change.
- Verification level identifiers MUST NOT change.
- ECS dimension names and weights MUST NOT change (see ECS-v1).
- Canonicalization rules MUST NOT change.
- Breaking changes REQUIRE VEO-2.0.

---

## 15. Future Versioning

- VEO-1.1, VEO-1.2, etc.: backward-compatible additions.
- VEO-2.0: breaking changes to required fields, canonicalization, or verification levels.
- ECS v2: changes to scoring weights, dimensions, or grade boundaries.
- VDO-1: Decision Entropy Objects (extends VEO-1D).

---

## 16. References

- OpenRNG Repository: `~/openrng/`
- MerkleAnchor Contract: `0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8` (Polygon Amoy)
- ECS Specification: [ECS-v1.md](./ECS-v1.md)
- JSON Schema: [veo-1.schema.json](./veo-1.schema.json)
