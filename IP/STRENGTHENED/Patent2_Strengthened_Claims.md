# Patent #2 — Dual Temporal Integrity: Strengthened Claims

## Previous Score: 8.0/10 → Target: 9.5/10

## Strengthening Rationale
- Need explicit Chainlink differentiation in claims (their model is request→generate→respond; ours is generate→commit→serve)
- Dual-path pipeline must be in independent claims, not just specification
- §101 defense via VDF hardware bottleneck

---

## Independent Claim 1 — Pre-Committed Entropy Pool

A computer-implemented method for providing verifiable random values, comprising:

(a) generating, by a processor executing a verifiable delay function (VDF) requiring a minimum sequential computation time that cannot be parallelized, a batch of entropy values prior to receipt of any consumer request for said values;

(b) constructing a Merkle tree data structure having leaf nodes derived from the batch of entropy values, said Merkle tree having a root hash;

(c) anchoring the root hash to a distributed ledger by submitting a transaction containing the root hash to a blockchain network, thereby creating an immutable commitment to the batch at a deterministic block height and timestamp;

(d) storing the batch of entropy values in an in-memory pool data structure;

(e) upon receiving a consumer request for a random value, serving an entropy value from the in-memory pool with sub-millisecond latency, without invoking any additional random value generation computation; and

(f) providing, with the served entropy value, a Merkle proof path enabling independent verification that the served value was committed to the distributed ledger prior to the consumer request.

## Independent Claim 2 — Dual-Path Pipeline

A system for verifiable random number generation, comprising:

a processor configured to execute a verifiable delay function (VDF);
a memory storing an entropy pool;
a network interface connected to a blockchain network;

wherein the system operates a dual-path pipeline comprising:

(a) a fast path: serving pre-generated entropy values from the in-memory pool to consumer requests with latency not exceeding 2 milliseconds; and

(b) a slow path: asynchronously anchoring Merkle root hashes of entropy batches to the blockchain network, wherein anchoring latency does not delay entropy value serving;

wherein the fast path and slow path operate concurrently and independently, such that consumer-facing latency is decoupled from blockchain confirmation time.

## Independent Claim 3 — Multi-Source Entropy Aggregation with Pre-Commitment

A method for generating tamper-resistant random values, comprising:

(a) obtaining entropy from a plurality of independent sources including at least one public randomness beacon and at least one time-locked computation;

(b) combining the obtained entropy sources to produce composite entropy values;

(c) computing an Entropy Confidence Score (ECS) for each composite value based on at least: source diversity count, source independence verification, temporal freshness, and manipulation resistance assessment;

(d) committing the composite entropy values to a blockchain prior to any consumption request;

(e) serving committed values upon request with the associated ECS score and Merkle verification path.

## Dependent Claims

4. The method of claim 1, wherein the verifiable delay function comprises iterative sequential hashing using SHA-256, requiring a computation time of at least T seconds that cannot be reduced by parallel processing.

5. The method of claim 1, wherein the public randomness beacon comprises a drand distributed randomness beacon, and the entropy value is derived from a combination of the VDF output and a drand beacon round value.

6. The method of claim 1, further comprising: replenishing the in-memory pool by generating a replacement batch when pool depth falls below a configurable threshold, wherein the replacement batch is generated and committed to the distributed ledger before the pool is exhausted.

7. The system of claim 2, wherein the fast path maintains a pool depth sufficient to serve a configurable burst rate of consumer requests without pool exhaustion.

8. The method of claim 3, wherein the Entropy Confidence Score is a value between 0 and 1000 computed from weighted dimensions including: freshness decay (temporal distance from generation), source count, cross-source independence verification, blockchain anchor confirmation status, and VDF computation verification.

## Specification Additions

### Distinction from Prior Art — Chainlink VRF (US12401532B2)

The present invention is architecturally distinct from request-response verifiable randomness systems such as Chainlink VRF. In Chainlink VRF, randomness generation is triggered BY a consumer request — the sequence is: request → generate → verify → respond. The random value does not exist until the consumer asks for it.

In the present system, the sequence is inverted: generate → commit → anchor → serve. Random values are generated, organized into Merkle batches, and cryptographically committed to a blockchain BEFORE any consumer request is received. When a consumer requests a value, it is served from a pre-existing pool — the value provably existed before the request, as demonstrated by the blockchain anchor timestamp.

This temporal inversion provides a fundamentally different security property: neither the provider nor the consumer can influence value selection, because the values are committed before the consumer's identity or request timing is known.

Additionally, the dual-path pipeline architecture (sub-millisecond serving from memory concurrent with asynchronous blockchain anchoring) represents a specific engineering tradeoff between verification latency and serving latency that is not present in request-response systems where verification necessarily precedes serving.

### §101 Technical Improvement Statement

The VDF computation at the core of entropy generation constitutes a specific improvement to computer functionality. Unlike general-purpose pseudo-random number generation (PRNG) which can be computed instantaneously, the VDF requires sequential hash computations that impose a minimum wall-clock time regardless of available computational resources. This hardware-bound time constraint is not an abstract concept but a physical limitation of sequential computation that cannot be parallelized, providing a concrete technical mechanism for ensuring temporal separation between generation and consumption.
