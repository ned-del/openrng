# OpenRNG: The Verifiable Entropy Network

**Whitepaper v1**
**June 2026**

---

## Abstract

Every random number has a trust problem.

Traditional systems return a value and discard the process that created it. The consumer receives a number but cannot verify where it came from, whether it was manipulated, or whether it remains trustworthy. In a world of autonomous AI agents, regulated gaming, decentralized finance, and high-stakes simulation, this is no longer acceptable.

OpenRNG introduces **Verifiable Entropy** — a new category of infrastructure that transforms randomness from a disposable output into a portable, auditable, and independently verifiable digital object.

The core primitive is the **VEO-1** (Verifiable Entropy Object), a cryptographic container that carries its entropy payload alongside source provenance, confidence metrics, provider signatures, and optional blockchain anchors. Any party can independently verify a VEO without trusting the provider.

This paper describes the architecture, protocol, and vision behind OpenRNG and the Verifiable Entropy Network.

---

## Chapter 1 — The Randomness Problem

Every system that makes decisions under uncertainty depends on randomness. Slot machines, AI agents, Monte Carlo simulations, cryptographic protocols, load balancers, game engines — all of them consume random numbers.

The standard interaction is simple:

```
Request → Random Number → Use → Discard
```

The number arrives. The system uses it. The process that created it is gone.

This model has worked for decades. But it breaks under three conditions that are becoming the norm, not the exception:

### 1.1 — Accountability

When a casino pays out $2 million on a jackpot, regulators need to verify that the winning number was genuinely random — not planted, not predicted, not replayed. Current systems produce audit logs, but logs are written by the same system they're supposed to audit. The randomness itself carries no proof.

### 1.2 — Autonomy

When an AI agent makes a decision — selecting a response, choosing a tool, routing a query — the decision involves randomness. But the agent's operator, the user, and downstream systems have no way to verify that the randomness was fair. As agents act on behalf of humans with real consequences, "trust the provider" stops being sufficient.

### 1.3 — Adversarial Environments

In decentralized systems, no single party should control the randomness. Blockchain protocols, fair-launch mechanisms, and multi-party computations all require randomness that is not only unpredictable but *provably* unpredictable — by anyone, including the provider.

The common thread: **a random number is not enough.** Consumers need to know *where* the randomness came from, *how* it was generated, and *whether* it can be trusted.

Traditional RNG cannot answer these questions because it was never designed to. The random number is the product, but the process is invisible.

---

## Chapter 2 — The Entropy Problem

Randomness is a property of an output. Entropy is the measure of uncertainty in a source.

The distinction matters.

A random number can come from a single pseudo-random generator seeded with a predictable value. It looks random. It passes statistical tests. But if the seed is known, every output is predetermined.

Entropy, by contrast, describes the irreducible uncertainty in the physical or computational process that produces the value. A hardware random number generator sampling thermal noise has high entropy. A PRNG seeded with the current timestamp has low entropy. The outputs may be statistically indistinguishable, but their trustworthiness is fundamentally different.

### 2.1 — The Real Question

The future problem is not:

> *How do I generate randomness?*

Every language, every operating system, every cloud provider has a random number generator. Generation is solved.

The real question is:

> *How do I trust randomness?*

Trust requires evidence. Evidence requires structure. Structure requires a standard.

### 2.2 — Entropy as Infrastructure

Today, entropy is treated as a utility — something consumed and forgotten, like electricity from a socket. Nobody asks where their random numbers come from, just as nobody asks which power plant generated their electricity.

But electricity has meters, grids, and regulatory infrastructure. Randomness has none.

OpenRNG proposes that entropy should become infrastructure: sourced from multiple independent providers, measured for quality, cryptographically signed, optionally anchored to immutable ledgers, and packaged in a standard format that any party can independently verify.

Randomness is a value. Entropy is infrastructure.

---

## Chapter 3 — Verifiable Entropy Objects

### 3.1 — The Core Primitive

A **Verifiable Entropy Object (VEO)** is a cryptographic container for entropy that includes everything needed to verify its origin, quality, and integrity.

**Definition:**

> A VEO is a cryptographically verifiable representation of uncertainty, including entropy payload, source provenance, confidence metrics, verification metadata, and trust assertions.

Where a traditional RNG returns:

```
0x8f3a...
```

OpenRNG returns:

```json
{
  "standard": "VEO-1",
  "entropy": "0x8f3a...",
  "entropy_hash": "0xdef...",
  "sources": [...],
  "confidence": { "score": 871, "grade": "AA" },
  "proof": { "provider_signature": "0x..." },
  "anchor": { "transaction_hash": "0x...", "chain": "polygon" }
}
```

The entropy is no longer a disposable value. It is a **verifiable digital object**.

### 3.2 — Object Anatomy

Every VEO carries five layers of information:

**Payload** — The entropy itself: a cryptographic hash derived from one or more independent sources.

**Provenance** — Where the entropy came from. Each source is recorded with its identifier, type, reference (e.g., drand round number, Bitcoin block height), timestamp, and individual hash.

**Confidence** — A quantitative assessment of entropy quality: the Entropy Confidence Score (ECS), measuring freshness, source diversity, independence, manipulation resistance, and verification success.

**Proof** — Cryptographic attestation by the provider. The VEO is canonicalized, hashed, and signed using secp256k1 EIP-191. Any party can recover the signer's address and verify the signature without trusting the provider.

**Anchor** — Optional blockchain anchoring. The entropy hash is written to an on-chain smart contract. Any party can read the contract and confirm the entropy existed at a specific block height and timestamp.

### 3.3 — Object Classes

VEO-1 defines four object classes:

| Class | Name | Description |
|-------|------|-------------|
| **VEO-1A** | Raw Source | Single-source entropy (drand beacon, block hash, QRNG) |
| **VEO-1B** | Composite | Multi-source aggregated entropy |
| **VEO-1C** | Anchored | Composite entropy with blockchain anchor |
| **VEO-1D** | Decision | Reserved for Verifiable Decision Objects |

The class system allows consumers to select the trust level appropriate for their use case. A simulation may accept VEO-1B. A regulated casino requires VEO-1C.

---

## Chapter 4 — Entropy Confidence Score

### 4.1 — Why Scoring Matters

Not all entropy is equal.

Entropy from a public randomness beacon (drand) combined with a Bitcoin block hash and a Polygon block hash is more trustworthy than entropy from a single `Math.random()` call. But without a scoring system, consumers cannot distinguish them.

The **Entropy Confidence Score (ECS)** is a 0–1000 quantitative measure of entropy quality, computed from six dimensions:

### 4.2 — Dimensions

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| **Freshness** | 20% | How recently the entropy was generated |
| **Diversity** | 15% | Number of unique independent sources |
| **Independence** | 20% | Variety of source types (beacon, blockchain, hardware) |
| **Manipulation Resistance** | 20% | Difficulty of controlling the output |
| **Verification Success** | 15% | Success rate of source verification |
| **Availability** | 10% | Source availability at generation time |

### 4.3 — Grades

| Score | Grade | Meaning |
|-------|-------|---------|
| 900–1000 | **AAA** | Maximum confidence — multiple independent verified sources |
| 800–899 | **AA** | High confidence — suitable for most applications |
| 700–799 | **A** | Good confidence — adequate for non-critical use |
| 600–699 | **B** | Moderate confidence — some sources degraded |
| 500–599 | **C** | Low confidence — significant source limitations |
| <500 | **LOW** | Insufficient confidence for production use |

### 4.4 — Fallback Transparency

When a live entropy source is unavailable, the system falls back to cryptographic randomness (`crypto.randomBytes`). This is secure but not independently verifiable.

ECS penalizes fallback usage explicitly:
- Each fallback source reduces `verification_success` and `manipulation_resistance`
- If all sources fall back, ECS is capped at 650 (grade B)
- The confidence metadata reports `fallback_count`, `live_source_count`, and `source_status`

This means ECS never lies. A high score means real, independently verifiable entropy. A low score means the system is honest about its limitations.

### 4.5 — Consumer Policies

Consumers can request entropy at specific quality levels:

| Policy | Min ECS | Min Sources | Anchor Required |
|--------|---------|-------------|-----------------|
| simulation-grade | 700 | 1 | No |
| ai-grade | 800 | 2 | No |
| gaming-grade | 850 | 2 | Yes |
| casino-grade | 900 | 3 | Yes |
| enterprise-grade | 950 | 3 | Yes |

If the system cannot meet the requested policy, it fails honestly rather than returning degraded entropy at a higher trust level.

---

## Chapter 5 — The Verifiable Entropy Network

### 5.1 — Architecture

OpenRNG is not a single random number generator. It is a **Verifiable Entropy Network (VEN)** — an infrastructure layer that sources, verifies, scores, aggregates, and routes entropy.

```
┌──────────────────────────────────────────┐
│            Entropy Sources               │
│  drand · Bitcoin · Polygon · QRNG · ...  │
└──────────────┬───────────────────────────┘
               │
        ┌──────▼──────┐
        │ Verification │  ← source integrity checks
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │   Scoring    │  ← ECS computation
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │ Aggregation  │  ← SHA-256 concat
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │   Signing    │  ← secp256k1 EIP-191
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │  Anchoring   │  ← Polygon smart contract
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │    VEO-1     │  ← Verifiable Entropy Object
        └─────────────┘
```

### 5.2 — Source Layer

The network currently integrates three independent entropy sources:

- **drand** — The League of Entropy's public randomness beacon, producing verifiable random values every 3 seconds via threshold BLS signatures across globally distributed nodes.
- **Bitcoin** — The latest block hash from the Bitcoin network, representing proof-of-work entropy that no single party can control.
- **Polygon** — The latest block hash from the Polygon network, providing independent blockchain-derived entropy.

The architecture is designed for source extensibility. Future sources may include quantum random number generators (QRNG), additional beacon networks, satellite-derived entropy, and hardware random number generators.

### 5.3 — Aggregation

Multiple sources are combined using deterministic SHA-256 concatenation:

```
entropy = SHA-256(source1 | source2 | source3)
```

The aggregation method, input order, and resulting hash are recorded in the VEO. Any verifier can reproduce the aggregation and confirm the result.

### 5.4 — Trust Model

The VEN operates on a **trust-minimized** model:

- No single source controls the output
- Source failure degrades ECS transparently, not silently
- Provider signing is independently verifiable
- Blockchain anchoring creates an immutable timestamp
- The verification page (verify.openrng.io) allows any party to verify any VEO without trusting OpenRNG

---

## Chapter 6 — Entropy Provenance Graph

### 6.1 — Lineage

Every VEO can reference its parent entropy objects, creating an **Entropy Provenance Graph** — a directed acyclic graph of entropy lineage.

```
VEO-1C (anchored composite)
 └── VEO-1B (composite)
      ├── VEO-1A (drand beacon)
      ├── VEO-1A (Bitcoin block hash)
      └── VEO-1A (Polygon block hash)
```

### 6.2 — Analogy

The Entropy Provenance Graph is to randomness what a Git commit history is to code.

A Git commit proves that specific code existed at a specific time, authored by a specific person, with a specific parent history. A VEO proves that specific entropy existed at a specific time, sourced from specific providers, with a specific parent lineage.

Both are hash-linked chains of verifiable objects. Both allow anyone to audit the history. Both make tampering detectable.

### 6.3 — Applications

Provenance enables:

- **Audit trails** — Regulators can trace a casino's winning number back to its constituent entropy sources
- **Replay** — Given the same source inputs, the same VEO can be reconstructed and verified
- **Dispute resolution** — If a party claims unfairness, the entropy lineage provides cryptographic evidence
- **Compliance** — Regulated industries can prove their randomness meets specific standards

---

## Chapter 7 — Verification

### 7.1 — Verification Levels

VEO-1 defines five verification levels, representing increasing degrees of trust:

| Level | Meaning |
|-------|---------|
| **structurally_valid_unsigned** | Schema and entropy hash are valid. No provider signature. No anchor. |
| **cryptographically_verified** | Schema and hash valid. Provider signature verified via address recovery. |
| **anchored_verified** | All above, plus blockchain anchor verified via on-chain contract readback. |
| **policy_failed** | Object may be valid, but does not meet the consumer's requested policy. |
| **invalid** | Schema, hash, signature, or anchor verification failed. Do not trust. |

### 7.2 — Signature Verification

OpenRNG signs VEOs using secp256k1 EIP-191 (`personal_sign`).

The process:

1. **Canonicalize** — Build a deterministic JSON representation of the VEO (deep-sorted keys, excluded self-referential fields, null anchor)
2. **Hash** — SHA-256 the canonical payload
3. **Sign** — EIP-191 personal sign the hash with the provider's private key
4. **Verify** — Any party can recover the signer's Ethereum address from the signature and compare it to the provider's published address

The signature proves that OpenRNG attests to this specific entropy object. Tampering with any field — entropy, sources, confidence, timestamps — invalidates the signature.

### 7.3 — Blockchain Anchoring

For use cases requiring the highest trust level, VEOs can be anchored to the Polygon blockchain via the MerkleAnchor smart contract.

The process:

1. Compute the entropy hash
2. Submit the hash to the on-chain contract
3. Wait for block confirmations
4. Read back the stored hash and confirm it matches
5. Record the transaction hash, block number, and timestamp in the VEO

The anchor proves that this specific entropy existed at this specific block height. The proof is independent of OpenRNG — anyone can query the contract directly.

### 7.4 — Public Verification

**verify.openrng.io** is a client-side verification tool that performs full VEO verification in the browser:

- Hash verification via Web Crypto API
- Signature verification via ethers.js (address recovery)
- ECS visualization
- Source inspection
- Anchor links to block explorer

No data is sent to any server. Verification is entirely local.

---

## Chapter 8 — Future: Verifiable Decisions

### 8.1 — From Entropy to Decisions

VEO-1 verifies entropy. The next layer verifies *decisions made with that entropy*.

A **Verifiable Decision Object (VDO-1)** would capture:

- The decision that was made
- The entropy that influenced it
- The algorithm that processed it
- The context in which it occurred
- A cryptographic proof linking all four

### 8.2 — Why This Matters

**AI Agents** — As autonomous agents make real-world decisions (financial transactions, content moderation, resource allocation), stakeholders need to verify that the randomness driving those decisions was fair and unmanipulated.

**Robotics** — Autonomous systems making physical-world decisions under uncertainty need auditable randomness. A warehouse robot choosing a path, a drone selecting a survey pattern, a self-driving vehicle resolving an ambiguous sensor reading — all involve entropy that should be verifiable after the fact.

**Simulation** — Monte Carlo simulations in finance, climate modeling, and drug discovery depend on entropy quality. VDOs would allow results to be traced back to their entropy sources, enabling reproducibility and peer review.

**Autonomous Systems** — Multi-agent systems where agents interact, negotiate, and compete require fairness guarantees. If every agent's random decisions are backed by verifiable entropy, disputes can be resolved cryptographically rather than by authority.

### 8.3 — The Vision

The full stack:

```
VEO-1   →  Verifiable Entropy    →  "Was the randomness fair?"
VDO-1   →  Verifiable Decisions  →  "Was the decision honest?"
VEN     →  Verifiable Network    →  "Is the infrastructure trustworthy?"
```

OpenRNG is building the foundation. VEO-1 is the first layer. The rest follows.

---

## Conclusion

Randomness is not a feature. It is infrastructure.

For decades, systems have consumed random numbers and discarded the process that created them. This was acceptable when the stakes were low and the consumers were human-supervised. Neither condition holds in the emerging landscape of autonomous agents, regulated gaming, decentralized finance, and high-stakes simulation.

OpenRNG proposes a new category: **Verifiable Entropy**. Not better random numbers — better *trust infrastructure* for random numbers.

The VEO-1 standard transforms entropy from a disposable value into a portable, auditable, independently verifiable digital object. The Entropy Confidence Score quantifies quality. Provider signing creates accountability. Blockchain anchoring creates immutability. The Verifiable Entropy Network sources, verifies, and routes entropy at infrastructure scale.

The protocol is frozen. The foundation is built. What comes next is what gets built on top of it.

---

**Protocol:** VEO-1 v1.0 (Frozen)
**Contract:** `0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8` (Polygon Amoy)
**Verify:** [verify.openrng.io](https://verify.openrng.io)
**Protocol Hash:** `0xcb21de7f1661548b85a8d9249cf2c1d939de93e1ce17ab22444238e3a466b7f7`
