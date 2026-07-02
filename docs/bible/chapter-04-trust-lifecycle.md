# Chapter 4 — The Trust Lifecycle

_The operational heartbeat of Computational Trust Infrastructure._

---

## 4.1 — Why a Lifecycle?

Every infrastructure category has a lifecycle — a canonical sequence of operations that defines how the infrastructure is used, not just what it is.

- **TLS** has a lifecycle: handshake → key exchange → encrypted session → termination.
- **OAuth** has a lifecycle: authorization request → user consent → token issuance → resource access → token refresh → revocation.
- **DNS** has a lifecycle: query → recursive resolution → caching → TTL expiry → re-resolution.

These lifecycles are what make infrastructure *operational*. Without them, a technology is just a specification. With them, it becomes something engineers build systems around.

Computational Trust Infrastructure is no different. The Trust Stack (Chapter 3) defines the architecture — the layers, their responsibilities, their interfaces. The Trust Lifecycle defines how those layers operate in sequence to produce, propagate, and verify trust.

If the Trust Stack is the anatomy of the system, the Trust Lifecycle is its physiology.

---

## 4.2 — The Eight Stages

The Trust Lifecycle consists of eight stages. Not every use case requires all eight. The lifecycle is designed to be **truncatable** — simpler use cases use fewer stages, and the system remains valid at every truncation point.

```
┌──────────────────────────────────────────────────────────────────────┐
│                        THE TRUST LIFECYCLE                          │
│                                                                      │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐  │
│   │          │     │          │     │          │     │          │  │
│   │  REQUIRE │────▶│ GENERATE │────▶│ AUTHORIZE│────▶│ EXECUTE  │  │
│   │          │     │          │     │          │     │          │  │
│   └──────────┘     └──────────┘     └──────────┘     └──────────┘  │
│                                                           │         │
│                                                           ▼         │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐  │
│   │          │     │          │     │          │     │          │  │
│   │  AUDIT   │◀────│  GOVERN  │◀────│COORDINATE│◀────│ EVIDENCE │  │
│   │          │     │          │     │          │     │          │  │
│   └──────────┘     └──────────┘     └──────────┘     └──────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

Each stage transforms a trust state. Each transition produces a verifiable artifact. The lifecycle is not a pipeline — it is a state machine with defined invariants at every stage.

---

### Stage 1: REQUIRE

**Question:** *What trust does this computation need?*

**Description:**
A system — an AI agent, a game server, a clinical trial platform, a financial algorithm — encounters a decision point that requires non-deterministic input. Before generating anything, the system must articulate what kind of trust it needs.

This is not merely "I need a random number." It is a structured trust requirement:

- **Quality threshold:** What minimum Entropy Confidence Score (ECS) is acceptable? A casino game may require AAA (≥900). A chatbot A/B test may accept A (≥700).
- **Source constraints:** Which entropy sources are acceptable? A healthcare application may require hardware RNG and exclude blockchain-derived entropy. A DeFi protocol may require on-chain sources exclusively.
- **Verification level:** Does the consumer need structural validity, cryptographic verification, or blockchain-anchored verification?
- **Latency budget:** How quickly must the trust primitive be delivered? Sub-2ms for real-time gaming? Sub-100ms for API-driven agent decisions?
- **Anchoring requirement:** Must the entropy be immutably recorded on-chain, or is provider signing sufficient?
- **Regulatory context:** Is this computation subject to GLI-19 (gaming), EU AI Act (AI systems), HIPAA (healthcare), or other regulatory frameworks?

**Input:** Application context, regulatory environment, consumer policy
**Output:** A **Trust Requirement Object (TRO)** — a structured declaration of what the consumer needs

**Trust Stack Layer:** Initiator (external to the stack)

**Artifact:**
```json
{
  "requirement_id": "treq_8f3a...",
  "min_ecs": 800,
  "min_sources": 3,
  "source_constraints": {
    "required_types": ["distributed_beacon", "blockchain"],
    "excluded_types": []
  },
  "verification_level": "cryptographically_verified",
  "anchor_required": true,
  "max_latency_ms": 50,
  "regulatory_context": ["EU_AI_ACT"],
  "issued_at": "2026-06-27T08:42:00.000Z"
}
```

**Invariant:** A Trust Requirement Object is immutable once issued. If requirements change, a new TRO must be created. This ensures audit trails can always trace back to the original requirement.

---

### Stage 2: GENERATE

**Question:** *Where does the raw trust material come from?*

**Description:**
The Trust Source layer (Layer 1 of the Trust Stack) produces raw entropy by aggregating multiple independent sources. This is not simply calling `Math.random()` — it is a structured, measurable, multi-source aggregation process.

The generation process:

1. **Source Collection:** Query independent entropy sources in parallel. Current sources: drand (distributed randomness beacon), Bitcoin block hashes (proof-of-work entropy), Polygon block hashes (proof-of-stake entropy). Future sources: QRNG hardware, additional beacons, federated source networks.

2. **Source Verification:** Each source response is independently verified. drand signatures are checked against the League of Entropy public key. Blockchain hashes are verified against chain state. Failed verifications are recorded but do not halt generation — they reduce the confidence score.

3. **Entropy Aggregation:** Verified source entropies are combined using a deterministic aggregation function (currently: concatenation + SHA-256). The aggregation method is recorded in the output.

4. **Quality Scoring:** The Entropy Confidence Score (ECS) is computed across six dimensions:

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| Freshness | 20% | Time since generation — decays linearly over 10 minutes |
| Diversity | 15% | Ratio of unique live source IDs to target |
| Independence | 20% | Ratio of unique live source types to target |
| Manipulation Resistance | 20% | Resistance to single-source manipulation |
| Verification Success | 15% | Proportion of sources that passed verification |
| Availability | 10% | Source availability at generation time |

The six dimensions produce a composite score (0–1000) and a grade (AAA through LOW).

5. **Policy Check:** The generated entropy is evaluated against the Trust Requirement Object. If the ECS score falls below the required threshold, or if source constraints are not met, the system may:
   - Retry with additional sources (if latency budget permits)
   - Return with a degradation flag and explanation
   - Reject the request with a structured error

**Input:** Trust Requirement Object
**Output:** Raw scored entropy with full source provenance

**Trust Stack Layer:** Layer 1 — Trust Source (OpenRNG Core)

**Key Property:** Generation is deterministic given the same source inputs. This means any auditor who has access to the source records can independently re-derive the aggregated entropy and verify the ECS score.

---

### Stage 3: AUTHORIZE

**Question:** *Is this consumer allowed to use this trust primitive, under these conditions?*

**Description:**
The Trust Authorization layer (Layer 2 — Lockbox) enforces policy on who can consume trust primitives and under what conditions. Authorization is not just access control — it is policy-gated consumption with attestation.

Authorization decisions include:

- **Identity verification:** Is the consumer authenticated? What is their authorization level?
- **Rate limiting:** Has the consumer exceeded their entropy consumption quota?
- **Policy compliance:** Does the consumer's use case match the entropy grade being requested? (Preventing a consumer from using LOW-grade entropy in a AAA-required context.)
- **Usage attestation:** Recording that this specific consumer consumed this specific trust primitive at this specific time — creating an irrefutable consumption record.
- **Delegation chains:** Can a consumer delegate their authorization to a sub-agent? Under what conditions?

**Input:** Consumer identity, Trust Requirement Object, generated entropy metadata
**Output:** Authorization token with policy compliance proof

**Trust Stack Layer:** Layer 2 — Trust Authorization (Lockbox)

**Invariant:** Every consumption event is attested. There is no "anonymous" entropy consumption in a trust infrastructure. Even free-tier consumers have a consumption record.

**Key Distinction from OAuth/RBAC:**
Traditional authorization asks: "Is this user allowed to access this resource?"
Trust Authorization asks: "Is this consumer allowed to use this trust primitive, and can we prove they used it correctly?"

The difference is the attestation. OAuth grants access and forgets. Lockbox grants access and *records proof of correct usage*.

---

### Stage 4: EXECUTE

**Question:** *What computation was performed using the trust primitive?*

**Description:**
The consumer uses the authorized trust primitive in their computation. This is the stage where trust meets the real world:

- An AI agent uses the entropy to select which tool to call
- A casino game uses it to determine a spin outcome
- A clinical trial platform uses it to randomize patient assignments
- A multi-agent system uses it to allocate tasks fairly

The Execute stage is, by design, **outside the Trust Stack's direct control**. The Trust Stack does not dictate how entropy is used — it provides the primitive and records the evidence. The consumer's computation is their responsibility.

However, the Execute stage does produce metadata that feeds into the next stage:

- **Decision context:** What was the entropy used for?
- **Decision outcome:** What was the result?
- **Decision timestamp:** When was the computation executed?
- **Decision participants:** Which agents or systems were involved?

**Input:** Authorized trust primitive, consumer's computational context
**Output:** Computation result + execution metadata

**Trust Stack Layer:** Consumer application (external to the stack)

**Design Decision:** The Trust Stack intentionally does not enforce how entropy is used. This is critical for adoption — consumers should not need to restructure their applications to use verifiable entropy. The stack provides the primitive; the consumer provides the computation; the Evidence stage captures what happened.

---

### Stage 5: EVIDENCE

**Question:** *Can we package what happened into a verifiable, portable proof?*

**Description:**
The Trust Evidence layer (Layer 3 — VEO) transforms the raw computation into a standardized, self-describing, independently verifiable object. This is the stage where entropy becomes *evidence*.

The Verifiable Entropy Object (VEO-1) is the core output:

```json
{
  "standard": "VEO-1",
  "version": "1.0",
  "object_id": "veo_a81714b0f24a09b2310703c7d5e1c578",
  "object_class": "VEO-1C",
  "entropy": "0x7a681b5578f41577...",
  "entropy_hash": "0x3f8b...",
  "issued_at": "2026-06-27T08:42:01.234Z",
  "provider": "OpenRNG",
  "sources": [
    {
      "source_id": "drand-mainnet",
      "source_type": "distributed_beacon",
      "source_reference": "drand-round-29830144",
      "timestamp": "2026-06-27T08:42:00.100Z",
      "entropy_hash": "0x..."
    },
    {
      "source_id": "bitcoin-mainnet",
      "source_type": "blockchain",
      "source_reference": "block-950123",
      "timestamp": "2026-06-27T08:35:12.000Z",
      "entropy_hash": "0x..."
    },
    {
      "source_id": "polygon-mainnet",
      "source_type": "blockchain",
      "source_reference": "block-72841592",
      "timestamp": "2026-06-27T08:42:00.500Z",
      "entropy_hash": "0x..."
    }
  ],
  "confidence": {
    "score": 871,
    "grade": "AA",
    "freshness": 950,
    "diversity": 1000,
    "independence": 1000,
    "manipulation_resistance": 800,
    "verification_success": 1000,
    "availability": 667
  },
  "proof": {
    "proof_type": "provider_signature",
    "signature_algorithm": "secp256k1-eip191",
    "provider_public_key": "0x04...",
    "provider_signature": "0x..."
  },
  "anchor": {
    "anchor_type": "merkle",
    "chain": "polygon-amoy",
    "contract": "0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8",
    "transaction_hash": "0x...",
    "merkle_root": "0x..."
  }
}
```

The Evidence stage performs four operations:

1. **Object Construction:** Assemble the VEO from entropy payload, source records, ECS score, and metadata. Apply the VEO-1 schema for structural validity.

2. **Canonical Signing:** Transform the VEO into a deterministic signing payload through deep key sorting and stable serialization. Sign with the provider's secp256k1 private key using EIP-191 personal sign. This produces a signature that any party can verify against the provider's public key — no callback required, no trusted third party, no network access.

3. **Blockchain Anchoring (optional):** Anchor the VEO's hash to an immutable ledger. Current implementation: Merkle batch anchoring on Polygon — multiple VEOs are batched into a Merkle tree, and a single on-chain transaction records the Merkle root. This provides:
   - Temporal proof: the VEO existed at or before the anchor timestamp
   - Immutability: the anchor cannot be altered after confirmation
   - Efficiency: one transaction anchors up to 65,536 VEOs

4. **Verification Level Assignment:** Each VEO is assigned one of five verification levels:

| Level | Meaning | Requirements |
|-------|---------|--------------|
| `structurally_valid_unsigned` | Hash valid, no signature | Entropy hash matches payload |
| `cryptographically_verified` | Hash + provider signature verified | Hash valid + signature valid against provider key |
| `anchored_verified` | Hash + signature + blockchain anchor verified | All above + Merkle proof valid against on-chain root |
| `policy_failed` | Valid object, policy not met | Object is valid but ECS or source constraints not met |
| `invalid` | Verification failed | Hash mismatch, signature invalid, or structural error |

**Input:** Raw entropy + source provenance + ECS score + authorization attestation
**Output:** VEO-1 — a complete, self-describing, independently verifiable trust evidence object

**Trust Stack Layer:** Layer 3 — Trust Evidence (VEO)

**Key Property:** A VEO is *self-verifying*. Given only the VEO object and the provider's public key, any party — anywhere, at any time, with no network access — can verify:
- The entropy hash matches the entropy payload (integrity)
- The provider signature is valid (authenticity)
- The ECS score is reproducible from the source records (quality)
- The Merkle proof validates against the on-chain root (temporal anchoring)

This is what makes VEO fundamentally different from an audit log. An audit log says "we recorded that this happened." A VEO says "here is the cryptographic proof — verify it yourself."

---

### Stage 6: COORDINATE

**Question:** *How does trust flow between multiple agents and systems?*

**Description:**
In single-agent, single-system use cases, the lifecycle can stop at Stage 5 (Evidence). But modern AI systems are increasingly multi-agent: swarms of autonomous agents collaborate, delegate, and hand off tasks. When Agent A assigns a task to Agent B based on verifiable entropy, Agent B needs to trust that the assignment was fair — and Agent C (the auditor) needs to verify the entire chain.

Trust Coordination solves the horizontal trust propagation problem:

1. **Trust Chain Construction:** When a VEO is used to make a decision that spawns child computations, the child VEOs reference the parent via the `lineage` field. This creates a directed acyclic graph (DAG) of trust — every decision can be traced back to its root entropy.

```
   VEO-root (task allocation entropy)
       ├── VEO-child-1 (Agent A's sub-task entropy)
       │       └── VEO-grandchild-1 (Agent A's tool selection)
       └── VEO-child-2 (Agent B's sub-task entropy)
               └── VEO-grandchild-2 (Agent B's tool selection)
```

2. **Multi-Agent Trust Consensus:** When multiple agents must agree on a shared random value — for example, jointly selecting a leader or allocating a shared resource — Trust Coordination provides a protocol for combining individual VEOs into a consensus VEO that all parties can independently verify.

3. **Cross-System Trust Handoff:** When trust needs to cross organizational boundaries — for example, an enterprise AI system delegating to a third-party agent service — Trust Coordination defines how trust assertions are packaged, transmitted, and verified across trust boundaries.

4. **Trust Propagation Rules:**
   - Trust does not amplify: a child VEO's ECS cannot exceed its parent's
   - Trust degrades transparently: if a child uses fewer sources, the degradation is recorded
   - Trust is traceable: every VEO in a chain can be independently verified without trusting intermediate nodes

**Input:** Multiple VEOs from different participants, coordination policies
**Output:** Coordinated trust assertions, trust graphs, multi-party trust proofs

**Trust Stack Layer:** Layer 4 — Trust Coordination

**Key Distinction:** Trust Coordination is not an orchestrator. It does not control agents or decide what they do. It is a *protocol for trust transmission* — like TCP is a protocol for data transmission. TCP doesn't decide what data to send; it ensures data arrives correctly. Trust Coordination doesn't decide what agents do; it ensures trust propagates correctly.

---

### Stage 7: GOVERN

**Question:** *Does this trust chain comply with policy and regulation?*

**Description:**
The Trust Runtime layer (Layer 5) provides continuous governance over the trust infrastructure. While Authorization (Stage 3) enforces policy at the point of consumption, Governance enforces policy across the entire lifecycle — retroactively, continuously, and against evolving requirements.

Governance functions include:

1. **Runtime Policy Enforcement:**
   - Maximum trust chain depth (e.g., no VEO lineage deeper than 5 levels)
   - Minimum ECS score for specific use cases (e.g., all gaming-context VEOs must be ≥ AAA)
   - Source rotation requirements (e.g., no single source may be used more than 70% of the time over any 24-hour window)
   - Anchoring frequency requirements (e.g., all VEOs above a certain value threshold must be anchored within 60 seconds)

2. **Compliance Mapping:**
   - EU AI Act Article 14 (Human Oversight) → Trust Lifecycle audit trail satisfies transparency requirements
   - NIST AI RMF GOVERN function → Trust Runtime provides the governance layer
   - GLI-19 (Gaming Laboratories International) → VEO verification satisfies RNG certification requirements
   - ISO 42001 (AI Management System) → Trust Lifecycle provides the process framework

3. **Anomaly Detection:**
   - ECS score drift: are average scores declining over time? (possible source degradation)
   - Source concentration: is one source dominating? (possible independence violation)
   - Consumption patterns: are specific consumers using entropy in unexpected patterns? (possible misuse)

4. **Trust Health Metrics:**
   - System-wide average ECS over time
   - Source availability and diversity trends
   - Verification success rates
   - Mean time between anchoring
   - Trust chain depth distribution

**Input:** Trust Stack telemetry, regulatory requirements, organizational policies
**Output:** Compliance attestations, trust health reports, policy violation alerts

**Trust Stack Layer:** Layer 5 — Trust Runtime

**Key Distinction from Stage 3 (Authorize):**
- Authorization is **pre-execution** and **per-request**: "Can this consumer use this primitive right now?"
- Governance is **continuous** and **cross-lifecycle**: "Is the entire trust infrastructure operating within policy?"

Authorization is a gate. Governance is a monitor.

---

### Stage 8: AUDIT

**Question:** *Can an independent third party verify everything that happened?*

**Description:**
The final stage — and the reason the entire lifecycle exists. Every previous stage is designed to make this stage possible: independent, after-the-fact, third-party verification of the entire trust chain.

An auditor — a regulator, a counterparty, a compliance team, a consumer — can:

1. **Verify any individual VEO:**
   - Recompute the entropy hash from the payload → integrity check
   - Verify the provider signature against the public key → authenticity check
   - Recompute the ECS score from the source records → quality check
   - Validate the Merkle proof against the on-chain root → temporal check

2. **Traverse a trust chain:**
   - Follow lineage references from any VEO to its root
   - Verify every VEO in the chain independently
   - Confirm that trust degradation rules were respected at each step
   - Reconstruct the complete decision tree from root entropy to final outcomes

3. **Verify policy compliance:**
   - Check that every VEO met the Trust Requirement Object at time of issuance
   - Verify that authorization attestations are valid
   - Confirm that governance policies were enforced across the lifecycle

4. **Produce an audit report:**
   - Structured, machine-readable audit output
   - Pass/fail for each verification dimension
   - Trust chain visualization
   - Anomaly flags

**Input:** One or more VEOs, provider public keys, on-chain anchor data
**Output:** Verification results, audit reports, compliance attestations

**Trust Stack Layer:** External (any party with access to the VEO)

**The Critical Property:** Audit requires *zero trust in the operator*. The auditor does not need to trust OpenRNG, the consumer, or any intermediate party. Every verification is performed independently using cryptographic proofs and public blockchain data. This is what makes Computational Trust fundamentally different from traditional audit logging.

---

## 4.3 — Lifecycle Profiles

Not every use case requires all eight stages. The Trust Lifecycle is designed to support **profiles** — predefined truncations for common use cases.

### Profile: Minimal (3 stages)
**Use case:** Development, testing, low-stakes decisions

```
REQUIRE → GENERATE → EVIDENCE
```

- No authorization (open access)
- No coordination (single agent)
- No governance (no policy enforcement)
- Audit is optional and self-serve
- VEO may be unsigned (`structurally_valid_unsigned`)

### Profile: Standard (5 stages)
**Use case:** Production AI agents, enterprise applications

```
REQUIRE → GENERATE → AUTHORIZE → EXECUTE → EVIDENCE
```

- Authorization with API key and rate limiting
- Single-system execution
- VEO is signed (`cryptographically_verified`)
- No multi-agent coordination
- Governance via runtime monitoring (passive)

### Profile: Regulated (6 stages)
**Use case:** Gaming, finance, healthcare

```
REQUIRE → GENERATE → AUTHORIZE → EXECUTE → EVIDENCE → AUDIT
```

- Full authorization with usage attestation
- VEO is signed and anchored (`anchored_verified`)
- Governance policies enforced at runtime
- Regulatory compliance mapping active
- Third-party audit enabled

### Profile: Autonomous (Full 8 stages)
**Use case:** Multi-agent swarms, cross-organizational AI, autonomous robotics

```
REQUIRE → GENERATE → AUTHORIZE → EXECUTE → EVIDENCE → COORDINATE → GOVERN → AUDIT
```

- Full trust chain construction
- Multi-agent trust consensus
- Cross-boundary trust handoff
- Continuous governance
- Complete audit trail with lineage traversal

**Design Principle:** Profiles are not restrictions — they are entry points. A consumer can start with Minimal and progressively adopt more stages as their trust requirements grow. The lifecycle is additive, not all-or-nothing.

---

## 4.4 — Lifecycle Invariants

Regardless of which profile is used, the following invariants always hold:

1. **Every stage produces a verifiable artifact.** There are no "trust me" steps. If a stage was executed, its output can be independently verified.

2. **No stage requires trusting the previous stage's operator.** Each artifact carries its own proof. A Stage 5 VEO can be verified without trusting the Stage 2 authorizer or the Stage 1 generator.

3. **The lifecycle is re-entrant.** A VEO from one lifecycle instance can be an input to another lifecycle instance. This enables composability: complex trust chains are built from simple, individually verifiable units.

4. **Partial lifecycles are valid.** Stopping at Stage 3 (after Authorization) is a valid, complete interaction. The system does not require all stages to produce value.

5. **Trust does not amplify across stages.** A child VEO cannot claim higher trust than its parent. Trust can only degrade or remain constant — never increase — as it flows through the lifecycle.

6. **Lifecycle metadata is append-only.** Once a stage's artifact is produced, it is immutable. Corrections require a new lifecycle instance with a reference to the previous one.

7. **Time moves forward.** Each stage's timestamp must be equal to or later than the previous stage's. Temporal ordering is enforced and verifiable.

---

## 4.5 — The Lifecycle as a Category-Defining Primitive

The Trust Lifecycle is not a feature of OpenRNG. It is the **defining characteristic of the Computational Trust category**.

Consider the parallels:

| Infrastructure | Defining Lifecycle |
|---|---|
| **TLS** | Handshake → Key Exchange → Encrypted Session → Termination |
| **OAuth** | Auth Request → User Consent → Token → Access → Refresh → Revoke |
| **DNS** | Query → Resolution → Cache → TTL Expiry → Re-resolve |
| **Computational Trust** | Require → Generate → Authorize → Execute → Evidence → Coordinate → Govern → Audit |

Each of these lifecycles is so fundamental that the entire ecosystem builds around it. Developers don't think about TLS's lifecycle consciously — they just know that HTTPS "works." But the lifecycle is what makes it work.

The goal for Computational Trust is the same: in five years, developers should not think about the Trust Lifecycle consciously. They should just know that when they call `openrng.getEntropy({ policy: 'ai-grade' })`, the lifecycle is executing — from requirement to evidence to audit readiness — invisibly, reliably, and verifiably.

The lifecycle is what transforms OpenRNG from a product into infrastructure.

---

## 4.6 — Visual Summary

```
THE TRUST LIFECYCLE — COMPLETE VIEW

 Consumer                 Trust Stack                    External
─────────           ─────────────────────           ──────────────

 ┌─────────┐
 │ REQUIRE │ ─ ─ ─ ─ ┐
 └─────────┘         │
                      ▼
              ┌──────────────┐
              │   GENERATE   │  Layer 1: Trust Source
              │  (OpenRNG)   │  Multi-source · ECS scoring
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │  AUTHORIZE   │  Layer 2: Trust Authorization
              │  (Lockbox)   │  Policy · Attestation
              └──────┬───────┘
                     │
 ┌─────────┐         │
 │ EXECUTE │ ◀ ─ ─ ─ ┘
 └────┬────┘
      │
      │ execution metadata
      ▼
              ┌──────────────┐
              │  EVIDENCE    │  Layer 3: Trust Evidence
              │   (VEO)      │  Sign · Score · Anchor
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │ COORDINATE   │  Layer 4: Trust Coordination
              │              │  Propagate · Consensus
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │   GOVERN     │  Layer 5: Trust Runtime
              │              │  Policy · Compliance
              └──────┬───────┘
                     │
                     ▼
                                                   ┌─────────┐
                                            ─ ─ ─ ▶│  AUDIT  │
                                                   └─────────┘
                                                   Third-party
                                                   verification
```

---

*This chapter defines the operational core of Computational Trust Infrastructure. Every patent, specification, SDK, and enterprise integration derives from this lifecycle. If you understand the eight stages and their invariants, you understand the entire platform.*

---

**Next:** [Chapter 3 — The OpenRNG Trust Stack](chapter-03-trust-stack.md) (detailed architecture of each layer)
