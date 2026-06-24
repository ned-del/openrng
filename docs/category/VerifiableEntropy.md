# Verifiable Entropy: A New Category

## What is Verifiable Entropy?

**Verifiable Entropy** is entropy that carries its own proof.

It is a distinct category of infrastructure — separate from Random Number Generation, Verifiable Random Functions, Quantum Random Number Generators, and Randomness APIs.

A Verifiable Entropy system does not merely produce a random value. It produces a **verifiable digital object** that includes the entropy payload, source provenance, quality metrics, cryptographic proof, and optional immutable anchoring.

---

## Why a New Category?

### Random Number Generation (RNG)

Traditional RNG returns a number. The process that created it is discarded. The consumer cannot verify where it came from, whether it was manipulated, or how fresh it is.

**What RNG provides:** A value.
**What RNG doesn't provide:** Proof.

### Verifiable Random Functions (VRF)

VRFs (e.g., Chainlink VRF) prove that a specific output was derived from a specific input using a specific key. This is valuable for on-chain randomness, but VRFs prove *derivation*, not *entropy quality*. A VRF can be perfectly verifiable while using a single source of entropy with no quality measurement.

**What VRF provides:** Proof of derivation.
**What VRF doesn't provide:** Source provenance, quality scoring, multi-source aggregation, or offline verification.

### Quantum Random Number Generators (QRNG)

QRNGs produce high-quality entropy from quantum mechanical processes. The entropy source is excellent, but QRNG services typically return raw numbers without provenance metadata, quality scoring, or cryptographic verification. The consumer must trust the QRNG provider.

**What QRNG provides:** High-quality entropy.
**What QRNG doesn't provide:** Verifiable objects, confidence scoring, or provider-independent verification.

### Randomness APIs

Services like random.org, AWS CloudHSM, and OS-level `/dev/urandom` provide convenient access to randomness. They are utilities — the randomness equivalent of a power socket. The consumer gets a value and trusts the provider.

**What APIs provide:** Convenient access.
**What APIs don't provide:** Structured proof, quality metrics, or independent verification.

---

## The Category Difference

| Capability | RNG | VRF | QRNG | API | **Verifiable Entropy** |
|------------|-----|-----|------|-----|------------------------|
| Returns a random value | ✓ | ✓ | ✓ | ✓ | ✓ |
| Source provenance | ✗ | Partial | ✗ | ✗ | **✓** |
| Multi-source aggregation | ✗ | ✗ | ✗ | ✗ | **✓** |
| Quality scoring (ECS) | ✗ | ✗ | ✗ | ✗ | **✓** |
| Cryptographic signing | ✗ | ✓ | ✗ | ✗ | **✓** |
| Blockchain anchoring | ✗ | ✓ | ✗ | ✗ | **✓** |
| Offline verification | ✗ | ✗ | ✗ | ✗ | **✓** |
| Consumer policies | ✗ | ✗ | ✗ | ✗ | **✓** |
| Fallback transparency | ✗ | ✗ | ✗ | ✗ | **✓** |
| Standardized object format | ✗ | ✗ | ✗ | ✗ | **✓** |
| Provenance graph / lineage | ✗ | ✗ | ✗ | ✗ | **✓** |

---

## The Core Insight

Every existing category answers the question:

> *How do I get a random number?*

Verifiable Entropy answers a different question:

> *How do I prove that randomness is trustworthy?*

This is not an incremental improvement to RNG. It is a new layer of infrastructure.

- **RNG** is a utility.
- **VRF** is a cryptographic primitive.
- **QRNG** is a source technology.
- **Verifiable Entropy** is an infrastructure layer that sits above all three, packaging their output into standardized, verifiable, scored, signed, anchorable objects.

---

## Who Needs This Category?

**AI Agent Builders** — Agents making decisions with real-world consequences need auditable randomness. Verifiable Entropy provides proof that the randomness driving agent decisions was fair, fresh, and unmanipulated.

**Gaming & Casino Operators** — Regulated industries require provable randomness with audit trails. VEO-1C (anchored objects) provide blockchain-timestamped proof that can satisfy regulatory requirements.

**DeFi & Web3 Protocols** — Decentralized systems require randomness that no single party controls. Multi-source aggregation with on-chain anchoring provides this without trusting a central provider.

**Enterprise & Compliance** — Industries with audit requirements (finance, insurance, healthcare) need randomness they can trace back to its sources and prove was not tampered with.

**Simulation & Research** — Reproducible research requires auditable entropy. VEO provenance enables peers to verify the randomness underlying published results.

---

## Defining Characteristics

A system qualifies as Verifiable Entropy if it:

1. **Returns a structured object**, not just a value
2. **Records source provenance** for every entropy component
3. **Scores entropy quality** quantitatively
4. **Signs the object** cryptographically
5. **Supports independent verification** without trusting the provider
6. **Fails honestly** rather than returning degraded entropy at a higher trust level

OpenRNG's VEO-1 is the first implementation of this category.
