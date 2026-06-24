# PROVISIONAL PATENT APPLICATION

# Method and System for Generating, Scoring, Signing, Anchoring, and Verifying Verifiable Entropy Objects

---

## CROSS-REFERENCE TO RELATED APPLICATIONS

This application is related to U.S. Patent Application [Patent #1 Serial Number — "Method and System for Gaming Random Number Generation"], filed [date], which describes a Merkle-tree-based random number generation and verification system with blockchain anchoring.

This application is also related to U.S. Patent Application [Patent #2 Serial Number — VDF Integration], filed/pending [date], which describes a Verifiable Delay Function pipeline integrated with the Merkle batch system.

The present invention extends the prior applications by introducing a structured, self-describing, cryptographically verifiable entropy object format, a multi-dimensional entropy quality scoring system, deterministic canonicalization for provider signing, and a multi-level verification framework.

---

## FIELD OF THE INVENTION

The present invention relates to systems and methods for generating, representing, evaluating, cryptographically signing, blockchain-anchoring, and independently verifying entropy as a structured digital object. More specifically, the invention relates to a Verifiable Entropy Object (VEO) standard, an Entropy Confidence Score (ECS) system, a canonical signing protocol for entropy attestation, and a verification framework that distinguishes structural validity from cryptographic verification from blockchain-anchored verification.

---

## BACKGROUND OF THE INVENTION

### The Problem with Traditional Random Number Generation

Conventional random number generators (RNGs), including hardware RNGs, pseudo-random number generators (PRNGs), and cryptographic random number generators (CSPRNGs), produce numerical values as their output. Once generated, these values carry no metadata about their origin, generation process, source quality, or integrity guarantees. The generation process is discarded. The consumer of the random number must trust the generator implicitly.

This model is increasingly insufficient for modern applications where random or non-deterministic decisions have significant consequences:

1. **AI Agent Systems**: Autonomous AI agents make decisions involving randomness — tool selection, response sampling, task routing, resource allocation. These decisions cannot be audited for fairness because the randomness carries no provenance.

2. **Regulated Gaming**: Casino and lottery systems are required by regulators to prove that random outcomes were generated fairly. Current systems rely on audit logs produced by the same system being audited, creating a circular trust dependency.

3. **Decentralized Systems**: Blockchain protocols, fair-launch mechanisms, and multi-party computations require randomness that is verifiably uncontrollable by any single party, including the generator.

4. **Scientific Simulation**: Monte Carlo simulations, stochastic modeling, and experimental protocols require reproducible and auditable entropy sources.

### Limitations of Existing Approaches

**Verifiable Random Functions (VRFs):** VRFs such as Chainlink VRF prove that a specific output was derived from a specific input using a specific key. However, VRFs prove derivation, not entropy quality. They typically use a single entropy source, do not quantify confidence, do not carry source provenance metadata, require on-chain callback mechanisms, and do not support offline verification.

**Quantum Random Number Generators (QRNGs):** QRNGs produce high-quality entropy from quantum mechanical processes. However, QRNG services return raw numerical values without structured provenance, quality scoring, or independent verification capability. The consumer must trust the QRNG provider.

**Public Randomness Beacons:** Systems such as drand (League of Entropy) produce publicly verifiable random values. However, these are single-source systems that do not aggregate entropy from multiple independent sources, do not score entropy quality, and do not produce self-describing verifiable objects.

There exists a need for a system that transforms entropy from a disposable numerical output into a structured, self-describing, multi-source, quality-scored, cryptographically signed, optionally blockchain-anchored, and independently verifiable digital object.

---

## SUMMARY OF THE INVENTION

The present invention provides:

1. **A Verifiable Entropy Object (VEO) format** — a structured digital object that encapsulates entropy payload, source provenance records, aggregation metadata, quality scoring, cryptographic proof, optional blockchain anchoring, and lineage references.

2. **An Entropy Confidence Score (ECS) system** — a multi-dimensional, weighted quantitative assessment of entropy quality, producing a score from 0 to 1000 across six independently computed dimensions with defined grade boundaries and fallback penalty rules.

3. **A canonical signing protocol** — a deterministic method for transforming a VEO into a signing payload through deep key sorting, field inclusion/exclusion rules, and stable serialization, enabling secp256k1 EIP-191 provider signatures that any party can independently verify.

4. **A multi-level verification framework** — a structured verification output that distinguishes among five levels of trust: structural validity, cryptographic verification, blockchain-anchored verification, policy failure, and invalidity.

5. **A consumer policy system** — predefined and custom policy presets that specify minimum entropy quality, source count, and anchoring requirements, with honest failure when requirements cannot be met.

6. **An entropy provenance graph** — a lineage mechanism where each entropy object may reference parent objects, creating a directed acyclic graph of entropy derivation that enables full audit trails.

---

## DETAILED DESCRIPTION OF THE INVENTION

### 1. Verifiable Entropy Object (VEO)

#### 1.1 Definition

A Verifiable Entropy Object (VEO) is defined as:

> A cryptographically verifiable representation of uncertainty, including entropy payload, source provenance, confidence metrics, verification metadata, and trust assertions.

#### 1.2 Object Classes

The invention defines a classification system for entropy objects based on their trust characteristics:

- **VEO-1A (Raw Source Entropy Object):** Contains entropy from a single source (e.g., a randomness beacon round, a blockchain block hash, a quantum random number generator output).

- **VEO-1B (Composite Entropy Object):** Contains entropy aggregated from two or more independent sources using a deterministic aggregation function.

- **VEO-1C (Anchored Entropy Object):** A composite entropy object that has been anchored to an immutable ledger (e.g., a blockchain smart contract), providing a timestamp proof that the entropy existed at a specific point in time.

- **VEO-1D (Decision Entropy Object):** An entropy object that is linked to a specific decision or action, enabling verification that a particular decision was derived from specific entropy.

#### 1.3 Required Fields

Each VEO contains the following required fields:

| Field | Description |
|-------|-------------|
| `standard` | Protocol identifier (e.g., "VEO-1") |
| `version` | Protocol version |
| `object_id` | Unique object identifier |
| `object_class` | Classification (VEO-1A through VEO-1D) |
| `entropy` | Hexadecimal-encoded entropy payload |
| `entropy_hash` | SHA-256 hash of the entropy payload |
| `issued_at` | ISO 8601 generation timestamp |
| `provider` | Generating provider identifier |
| `sources` | Array of entropy source records |
| `proof` | Cryptographic proof package |
| `confidence` | Entropy Confidence Score |

#### 1.4 Entropy Source Records

Each source record contains:
- Source identifier (e.g., "drand-mainnet")
- Source type classification (e.g., "randomness_beacon", "blockchain_block_hash")
- Source reference (e.g., "drand-round-29830144", "block-955153")
- Fetch timestamp
- Individual source entropy hash
- Optional source-provided signature

#### 1.5 Multi-Source Aggregation

When multiple sources are used, the system aggregates entropy deterministically:

```
aggregated_entropy = SHA-256(lowercase(source_1_entropy) | delimiter | lowercase(source_2_entropy) | delimiter | ... | lowercase(source_N_entropy))
```

The aggregation record includes: method identifier, input ordering, and aggregation hash. Any verifier can reproduce the aggregation from the individual source records.

---

### 2. Entropy Confidence Score (ECS)

#### 2.1 Purpose

The ECS quantifies entropy quality as a single integer score from 0 to 1000, enabling consumers to programmatically evaluate whether an entropy object meets their requirements without inspecting individual sources.

#### 2.2 Dimensions

The ECS is computed from six independently calculated dimensions, each producing a sub-score from 0 to 1000:

| Dimension | Weight | Measurement |
|-----------|--------|-------------|
| **Freshness** | 20% | Time elapsed since generation. Decays linearly over a configurable window (default: 10 minutes). |
| **Diversity** | 15% | Ratio of unique live source identifiers to a target count (default: 3). |
| **Independence** | 20% | Ratio of unique source type categories to a target count. |
| **Manipulation Resistance** | 20% | Assessment of the difficulty of controlling the output. Higher for multi-source entropy from independent systems. |
| **Verification Success** | 15% | Rate of successful source verification at generation time. |
| **Availability** | 10% | Source availability at generation time. |

#### 2.3 Computation

```
ECS = clamp(
  freshness × 0.20 +
  diversity × 0.15 +
  independence × 0.20 +
  manipulation_resistance × 0.20 +
  verification_success × 0.15 +
  availability × 0.10
)
```

Where `clamp(n) = max(0, min(1000, round(n)))`.

#### 2.4 Grade Boundaries

| Score Range | Grade |
|-------------|-------|
| 900–1000 | AAA |
| 800–899 | AA |
| 700–799 | A |
| 600–699 | B |
| 500–599 | C |
| 0–499 | LOW |

#### 2.5 Fallback Penalty System

When a source adapter fails to retrieve live external entropy and falls back to local cryptographic randomness:

- **1 fallback source:** `verification_success` reduced by 100; `manipulation_resistance` reduced by 50.
- **2 fallback sources:** `verification_success` reduced by 250; `manipulation_resistance` reduced by 150; `diversity` reduced by 150.
- **All sources fallback:** All above penalties applied; total ECS capped at 650; grade cannot exceed B.

The ECS metadata reports `fallback_count`, `live_source_count`, and `source_status` (live / degraded / fallback_only / failed), ensuring the score never misrepresents entropy quality.

---

### 3. Canonical Signing Protocol

#### 3.1 Purpose

Before a provider signs a VEO, the object must be transformed into a deterministic canonical form. This ensures that the same VEO always produces the same signing payload, regardless of JSON field ordering or serialization implementation.

#### 3.2 Canonicalization Rules

1. **Deep sort** all object keys alphabetically at every nesting level.
2. **Remove** values that are `undefined`.
3. **Preserve** values that are `null` explicitly.
4. **Apply stable JSON serialization** to the sorted structure.
5. The same VEO input must always produce the same canonical byte string.

#### 3.3 Field Inclusion

The canonical signing payload includes the following fields from the VEO:

```
standard, version, object_id, object_class, entropy, entropy_hash,
issued_at, expires_at, provider, sources, aggregation, confidence,
lineage, policy
```

The `anchor` field is always set to `null` in the canonical payload because the signature is computed before blockchain anchoring occurs.

#### 3.4 Field Exclusion

The following fields are excluded from the canonical payload:

- All fields within the `proof` object (the signature cannot include itself)
- All fields within the `anchor` object (transaction hash, block number, and timestamp are only known after anchoring)

#### 3.5 Signing Process

```
canonical_payload = canonicalize(veo)
payload_hash = SHA-256(canonical_payload)
signature = EIP-191_personal_sign(payload_hash, provider_private_key)
```

The provider's Ethereum address is recoverable from the signature, enabling any party to verify the signature without access to the private key.

---

### 4. Multi-Level Verification Framework

#### 4.1 Verification Levels

The system defines five verification levels representing increasing degrees of trust:

| Level | Requirements |
|-------|-------------|
| **Structurally Valid Unsigned** | Schema valid; entropy hash matches; no provider signature; no anchor. |
| **Cryptographically Verified** | Schema valid; hash matches; provider signature is valid (signer address recovered and matched). |
| **Anchored Verified** | Schema valid; hash matches; signature valid if present; blockchain anchor verified via on-chain contract readback. |
| **Policy Failed** | Object may be structurally valid but does not meet the consumer's requested policy requirements. |
| **Invalid** | One or more verification checks failed (schema, hash, signature, or anchor). |

#### 4.2 Verification Checks

The verification output includes individual check results:

| Check | Values | Description |
|-------|--------|-------------|
| `schema` | true/false | VEO structure and required fields present |
| `hash` | true/false | `SHA-256(entropy) === entropy_hash` |
| `signature` | true/false/null | Provider signature verification via address recovery |
| `sources` | true/false | Source records present and well-formed |
| `confidence` | true/false | ECS score within valid range |
| `anchor` | true/false/null | On-chain root matches VEO anchor metadata |
| `policy` | true/false | Consumer policy requirements satisfied |

#### 4.3 Signature Verification Process

1. Reconstruct the canonical signing payload from the VEO.
2. Compute SHA-256 of the canonical payload.
3. Recover the signer's Ethereum address from the EIP-191 signature.
4. Compare recovered address to the `provider_address` field.
5. If match: `signature = true`. If mismatch: `signature = false`. If no signature present: `signature = null`.

#### 4.4 Anchor Verification Process

1. Query the blockchain smart contract using the `batch_id` from the anchor metadata.
2. Confirm batch exists on-chain.
3. Retrieve stored Merkle root from the contract.
4. Compare stored root to the `merkle_root` in the VEO anchor metadata.
5. If match: `anchor = true`. If mismatch: `anchor = false`.

---

### 5. Consumer Policy System

#### 5.1 Policy Presets

The system provides predefined policy presets that consumers may invoke by name:

| Preset | Min ECS | Min Sources | Anchor Required |
|--------|---------|-------------|-----------------|
| simulation-grade | 700 | 1 | No |
| ai-grade | 800 | 2 | No |
| gaming-grade | 850 | 2 | Yes |
| casino-grade | 900 | 3 | Yes |
| enterprise-grade | 950 | 3 | Yes |

#### 5.2 Honest Failure

When the system cannot satisfy a requested policy (e.g., anchor required but blockchain anchoring is not configured), the system returns an explicit error rather than returning a degraded entropy object at a higher trust level. This prevents false trust assertions.

---

### 6. Entropy Provenance Graph

#### 6.1 Lineage

Each VEO may reference parent entropy objects by their object identifiers. This creates a directed acyclic graph of entropy lineage:

```
VEO-1C (anchored composite)
  └── VEO-1B (composite)
       ├── VEO-1A (source: drand beacon)
       ├── VEO-1A (source: Bitcoin block hash)
       └── VEO-1A (source: Polygon block hash)
```

A lineage hash is computed over the sorted parent object identifiers, enabling verification that the claimed lineage has not been altered.

#### 6.2 Applications

- **Audit trail:** Trace a final entropy value back through every source that contributed to it.
- **Replay:** Given the same source inputs and aggregation parameters, reconstruct and verify a VEO.
- **Dispute resolution:** Provide cryptographic evidence of the entropy derivation chain.

---

### 7. Blockchain Anchoring

#### 7.1 Anchor Process

For applications requiring the highest trust level, the entropy hash is anchored to a blockchain smart contract:

1. Compute the `entropy_hash` of the VEO.
2. Use the entropy hash as a Merkle leaf (single-leaf anchoring for individual VEOs; batch anchoring for efficiency).
3. Submit the Merkle root to the on-chain anchoring contract.
4. Wait for block confirmations.
5. Read back the stored root from the contract and confirm it matches.
6. Record the transaction hash, block number, batch identifier, and on-chain timestamp in the VEO anchor metadata.
7. Upgrade the object class to VEO-1C.

#### 7.2 Anchor Metadata

The anchor package records:
- Anchor type (e.g., "blockchain")
- Chain identifier (e.g., "polygon")
- Contract address
- Transaction hash
- Block number
- Batch identifier
- Batch size
- Merkle root
- On-chain timestamp

#### 7.3 Independent Verification

Any party can verify an anchor by:
1. Querying the smart contract directly using the batch identifier.
2. Comparing the on-chain root to the root recorded in the VEO.
3. No trust in the VEO provider is required.

---

## CLAIMS

### Independent Claims

**Claim 1.** A computer-implemented method for generating a verifiable entropy object, comprising:
(a) obtaining entropy from a plurality of independent entropy sources;
(b) computing an individual entropy hash for each source;
(c) aggregating the entropy from the plurality of sources using a deterministic aggregation function;
(d) computing an aggregated entropy hash;
(e) computing an Entropy Confidence Score from a plurality of weighted dimensions including freshness, diversity, independence, manipulation resistance, verification success, and availability;
(f) assigning a grade classification based on the computed score;
(g) constructing a structured digital object containing the aggregated entropy, the aggregated hash, the individual source records, the confidence score, and metadata; and
(h) outputting the structured digital object as a Verifiable Entropy Object.

**Claim 2.** A computer-implemented method for computing an Entropy Confidence Score, comprising:
(a) computing a freshness score based on time elapsed since entropy generation;
(b) computing a diversity score based on the number of unique independent entropy sources;
(c) computing an independence score based on the number of unique entropy source type categories;
(d) computing a manipulation resistance score based on the difficulty of controlling the aggregated output;
(e) computing a verification success score based on the rate of successful source verification;
(f) computing an availability score based on source availability at generation time;
(g) applying a weighted sum of the computed dimension scores to produce a composite score;
(h) applying penalty rules when one or more sources have fallen back to local cryptographic randomness; and
(i) assigning a grade classification based on defined score boundaries.

**Claim 3.** A computer-implemented method for signing a verifiable entropy object, comprising:
(a) constructing a canonical signing payload by deep-sorting all object keys alphabetically, removing undefined values, preserving null values, excluding self-referential signature fields and post-anchor transaction fields, and applying stable JSON serialization;
(b) computing a cryptographic hash of the canonical payload;
(c) generating a digital signature over the hash using a provider private key; and
(d) embedding the signature, provider public key, provider address, and canonical hash in the object's proof package.

**Claim 4.** A computer-implemented method for verifying a verifiable entropy object at multiple trust levels, comprising:
(a) validating the object schema and required field presence;
(b) recomputing the entropy hash and comparing it to the stored hash;
(c) if a provider signature is present, reconstructing the canonical signing payload, computing its hash, recovering the signer address from the signature, and comparing it to the claimed provider address;
(d) if a blockchain anchor is present, querying the on-chain smart contract to retrieve the stored root hash and comparing it to the anchor metadata in the object;
(e) evaluating the object against an optional consumer policy specifying minimum confidence score, minimum source count, and anchoring requirements; and
(f) assigning a verification level selected from the group consisting of: structurally valid unsigned, cryptographically verified, anchored verified, policy failed, and invalid.

**Claim 5.** A computer-implemented system for verifiable entropy generation, comprising:
(a) a plurality of entropy source adapters, each configured to retrieve entropy from an independent external source and produce a source record;
(b) an aggregation module that deterministically combines entropy from the plurality of source adapters;
(c) a scoring module that computes an Entropy Confidence Score across a plurality of weighted dimensions;
(d) a signing module that produces a deterministic canonical representation of the entropy object and generates a cryptographic signature;
(e) an anchoring module that writes the entropy hash to a blockchain smart contract and records the transaction metadata; and
(f) a verification module that independently verifies the entropy hash, provider signature, and blockchain anchor at multiple trust levels.

### Dependent Claims

**Claim 6.** The method of Claim 1, further comprising classifying the verifiable entropy object into one of a plurality of object classes based on its trust characteristics, wherein the classes include: raw source (single source), composite (multi-source), anchored (blockchain-anchored), and decision-linked (associated with a specific decision or action).

**Claim 7.** The method of Claim 2, wherein the penalty rules comprise reducing specific dimension scores by defined amounts based on the number of sources that have fallen back to local cryptographic randomness, and capping the total score and grade when all sources are in fallback.

**Claim 8.** The method of Claim 3, wherein the canonical signing payload always sets the anchor field to null because the signature is computed before blockchain anchoring occurs, and the anchor transaction metadata is not known at signing time.

**Claim 9.** The method of Claim 4, wherein the consumer policy system returns an explicit error when requirements cannot be satisfied, rather than returning a degraded entropy object at a higher trust level.

**Claim 10.** The method of Claim 1, further comprising recording parent object identifiers in a lineage field, computing a lineage hash over the parent identifiers, and enabling construction of a directed acyclic graph of entropy provenance.

**Claim 11.** The system of Claim 5, wherein the plurality of entropy source adapters includes at least one public randomness beacon, at least one blockchain block hash source, and a fallback adapter that generates local cryptographic randomness with an associated quality penalty.

**Claim 12.** The method of Claim 4, wherein the blockchain anchor verification comprises querying a smart contract function that returns the stored Merkle root for a given batch identifier, and comparing the returned root to the Merkle root recorded in the entropy object's anchor metadata.

---

## ABSTRACT

A method and system for generating, scoring, signing, anchoring, and verifying Verifiable Entropy Objects (VEOs). The system obtains entropy from multiple independent sources, aggregates it deterministically, computes a multi-dimensional Entropy Confidence Score (ECS) that quantifies quality across freshness, diversity, independence, manipulation resistance, verification success, and availability dimensions, and packages the result as a structured digital object with source provenance records. The system provides a canonical signing protocol that transforms VEOs into deterministic payloads for cryptographic signing, enabling independent signature verification through address recovery. Optionally, the entropy hash is anchored to a blockchain smart contract for immutable timestamping. A multi-level verification framework distinguishes structural validity from cryptographic verification from blockchain-anchored verification from policy failure from invalidity. Consumer policies specify minimum quality requirements with honest failure when requirements cannot be met. The system transforms entropy from a disposable numerical output into a portable, auditable, and independently verifiable digital object.

---

## DRAWINGS (DESCRIPTIONS FOR FIGURES)

### Figure 1 — System Architecture

```
┌──────────────────────────────────────────┐
│            Entropy Sources               │
│  Source A · Source B · Source C · ...     │
└──────────────┬───────────────────────────┘
               │ Source Records
        ┌──────▼──────┐
        │ Aggregation  │ SHA-256 deterministic combination
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │  ECS Scoring │ 6-dimension weighted scoring
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │ VEO Assembly │ Structured object construction
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │   Signing    │ Canonical payload → SHA-256 → EIP-191
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │  Anchoring   │ Smart contract → readback → VEO-1C
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │ VEO Output   │ Complete verifiable entropy object
        └─────────────┘
```

### Figure 2 — Entropy Confidence Score Computation

```
Sources → Freshness (20%)
       → Diversity (15%)
       → Independence (20%)               → Weighted Sum → Clamp → Score (0-1000)
       → Manipulation Resistance (20%)                           → Grade (AAA-LOW)
       → Verification Success (15%)
       → Availability (10%)

Fallback Detection → Penalty Rules → Score Adjustment
```

### Figure 3 — Verification Flow

```
Input: VEO Object
  │
  ├── Schema Check ──────────────── pass/fail
  ├── Hash Check (SHA-256) ──────── pass/fail
  ├── Signature Check ───────────── pass/fail/null
  │     └── Canonicalize → Hash → Recover Address → Compare
  ├── Anchor Check ──────────────── pass/fail/null
  │     └── Query Contract → Compare Root
  ├── Policy Check ──────────────── pass/fail
  │
  └── Verification Level Assignment:
        structurally_valid_unsigned
        cryptographically_verified
        anchored_verified
        policy_failed
        invalid
```

### Figure 4 — Entropy Provenance Graph

```
VEO-1C (object_id: veo_003, anchored)
  ├── lineage: [veo_001, veo_002, veo_003_raw]
  │
  └── VEO-1B (object_id: veo_002, composite)
       ├── VEO-1A (source: drand beacon round 29830144)
       ├── VEO-1A (source: Bitcoin block 955153)
       └── VEO-1A (source: Polygon block 40708144)
```

### Figure 5 — Object Class Hierarchy

```
VEO-1A ──→ VEO-1B ──→ VEO-1C ──→ VEO-1D
(raw)      (composite) (anchored)  (decision)
  │            │           │           │
single      multi-      blockchain   linked to
source      source      anchored     specific
            aggregated  + signed     decision
```

---

## INVENTOR(S)

[Ned — full legal name]

---

## FILING NOTES FOR ATTORNEY

1. **Priority:** File as US provisional immediately. This locks the priority date before public disclosure via Hacker News and public GitHub repository.

2. **Related applications:** Cross-reference Patent #1 (Merkle batch system) and Patent #2 (VDF integration). This application extends both by adding the VEO format, ECS scoring, canonical signing, and multi-level verification.

3. **Prior art to distinguish:**
   - Chainlink VRF (US12401532B2): Proves derivation from a single source; does not score quality, does not produce a structured self-describing object, requires on-chain callback.
   - drand: Public randomness beacon; single source, no aggregation, no scoring, no structured object format.
   - NIST SP 800-90B: Entropy estimation for physical sources; does not define a verifiable object format or scoring system.

4. **Key novel elements:**
   - The VEO as a structured, self-describing, verifiable entropy container (not just a value)
   - ECS as a multi-dimensional, weighted, fallback-penalized scoring system
   - The canonical signing protocol with deep key sorting and anchor-null rule
   - The five-level verification framework
   - The consumer policy system with honest failure
   - The entropy provenance graph (lineage)

5. **Implementation evidence:** Working implementation exists at github.com/ned-del/openrng with 74 passing tests, frozen RFC, JSON schema, golden test fixtures, live Polygon Amoy testnet contract, and a public verification tool at verify.openrng.io.

6. **International considerations:** If PCT filing is desired, file before any intentional public disclosure. The GitHub repository may already constitute prior art in some jurisdictions. Provisional filing establishes US priority date regardless.
