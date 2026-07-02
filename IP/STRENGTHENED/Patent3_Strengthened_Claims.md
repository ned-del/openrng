# Patent #3 — Portable Trust Assertion: Strengthened Claims

## Previous Score: 7.0/10 → Target: 8.5/10

## Strengthening Rationale
- "Entropy receipt" framing too close to generic digital certificates
- Reframe around Trust Assertion Record (TAR) — a specific composite data structure
- Must plant continuation anchors for Patents #4 and #5
- Five-Layer Trust Stack must appear in specification

---

## Independent Claim 1 — Trust Assertion Record (TAR)

A computer-implemented method for creating persistent trust evidence for consumed entropy, comprising:

(a) upon consumption of a verifiable entropy value by a consumer application, generating a Trust Assertion Record (TAR) data structure comprising:
  (i) an entropy hash derived from the consumed value;
  (ii) a source provenance chain identifying each entropy source that contributed to the value, including source type, source identifier, and temporal reference;
  (iii) an Entropy Confidence Score (ECS) computed at the time of consumption;
  (iv) a Merkle proof path from the entropy value's leaf node to the batch root hash;
  (v) a blockchain anchor reference comprising a transaction hash and block number on a distributed ledger; and
  (vi) a consumer binding signature cryptographically linking the TAR to the consuming entity;

(b) serializing the TAR into a self-contained, portable format that includes all information necessary for independent verification; and

(c) enabling any third party to verify the TAR's integrity, provenance, and blockchain anchor without cooperation from the original entropy provider or the consuming entity.

## Independent Claim 2 — Five-Layer Trust Stack

A system for organizing computational trust evidence into a hierarchical verification structure, comprising:

Layer 1 — Entropy Layer: raw entropy values with source provenance and VDF verification;
Layer 2 — Commitment Layer: Merkle tree construction and blockchain anchoring of batch root hashes;
Layer 3 — Assertion Layer: Trust Assertion Records binding consumed entropy to consumer context with quality scores;
Layer 4 — Delegation Layer: trust lineage records preserving assertion chain across computational delegation boundaries;
Layer 5 — Health Layer: continuous monitoring metrics tracking trust quality degradation over time;

wherein each layer builds upon and references artifacts from the layer below, and wherein any layer's artifacts are independently verifiable without access to the layers above.

## Independent Claim 3 — Cross-System Trust Portability

A method for transferring computational trust evidence between independent systems, comprising:

(a) generating a Trust Assertion Record (TAR) in a first computational system;

(b) transmitting the TAR to a second computational system that has no trust relationship with the first system;

(c) the second system independently verifying the TAR by:
  (i) recomputing the entropy hash from the included data;
  (ii) verifying the Merkle proof path against the included batch root hash;
  (iii) confirming the batch root hash exists on the referenced distributed ledger at the referenced block number; and
  (iv) validating the consumer binding signature;

wherein the verification requires no communication with the first system, no shared secrets, and no trusted third party.

## Dependent Claims

4. The method of claim 1, wherein the Trust Assertion Record further comprises a temporal decay indicator reflecting the elapsed time since entropy generation, enabling consumers to assess freshness degradation.

5. The method of claim 1, wherein the consumer binding signature is generated using an asymmetric cryptographic key pair, and the TAR includes the public key or a deterministic identifier thereof.

6. The system of claim 2, wherein Layer 4 (Delegation Layer) comprises trust lineage records that cryptographically link a child trust assertion to a parent trust assertion, recording any trust quality change at the delegation boundary.

7. The system of claim 2, wherein Layer 5 (Health Layer) comprises continuous measurements of trust-specific metrics including entropy source diversity, ECS drift rate, anchoring latency, and trust chain depth.

8. The method of claim 3, further comprising: the second system incorporating the verified TAR into its own trust assertion chain, thereby extending trust provenance across organizational boundaries.

## Specification Additions

### Distinction from X.509 Certificates and Standard Digital Receipts

The Trust Assertion Record (TAR) is structurally and functionally distinct from X.509 certificates, blockchain transaction receipts, and standard audit log entries.

An X.509 certificate attests to an identity binding (public key ↔ entity name) and requires a certificate authority hierarchy for verification. A TAR attests to an entropy quality binding (entropy value ↔ source provenance ↔ quality score ↔ blockchain commitment) and requires no authority hierarchy — verification is fully independent.

A blockchain transaction receipt proves that a transaction occurred. A TAR proves that a specific entropy value, with specific quality properties, was generated from specific sources, committed to a blockchain before consumption, and consumed by a specific entity. The TAR carries the complete verification path within itself.

Standard audit logs record events after the fact and are written by the system being audited. TARs are generated at consumption time by the trust infrastructure and are independently verifiable by third parties who have no relationship with the audited system.

### Five-Layer Trust Stack — Continuation Anchor

[This paragraph anchors priority for Patents #4 and #5]

The Five-Layer Trust Stack described herein establishes a hierarchical framework wherein trust evidence at each layer is independently verifiable and builds upon the layer below. While the present patent claims primarily address Layers 1-3 (Entropy, Commitment, and Assertion), the specification discloses the complete five-layer architecture including Layer 4 (trust delegation across computational boundaries) and Layer 5 (continuous trust health monitoring) as contemplated embodiments of the broader trust infrastructure. Implementations of Layers 4 and 5 are the subject of continuation applications.
