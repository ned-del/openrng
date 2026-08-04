# Committed Selection Receipt (CSR) Specification

**Title:** Committed Selection Receipt (CSR) v0.1  
**Author:** Fairseal (formerly OpenRNG)  
**Version:** csr-0.1  
**Status:** Draft  
**Date:** 2026-08-03

---

## Overview

A **Committed Selection Receipt (CSR)** is a tamper-evident, offline-verifiable proof that a random selection was determined by a future epoch of the Fairseal oracle before any participant could know the outcome. The receipt binds a selection commitment to a specific future block, anchors that commitment on-chain, and later reveals the outcome with a cryptographic proof that the selection was fixed at commitment time.

The CSR standard exists to make the phrase "provably fair" mean something auditable by anyone, without trusting the operator.

---

## Receipt Structure (JSON)

```json
{
  "version": "csr-0.1",
  "receipt_id": "<sha256 of canonical receipt body>",
  "committed_at": "<ISO-8601 UTC timestamp>",
  "epoch": {
    "chain": "base",
    "target_block": 123456789,
    "anchor_tx": "0x..."
  },
  "commitment": {
    "seed_hash": "0x<keccak256(operator_seed || client_salt)>",
    "merkle_root": "0x...",
    "merkle_proof": ["0x...", "0x..."]
  },
  "client_salt": {
    "provided": true,
    "salt_hash": "0x<keccak256(client_salt)>"
  },
  "selection": {
    "pool_size": 1000,
    "n_winners": 1,
    "indices": [42],
    "candidates_hash": "0x<keccak256(canonicalized candidates list)>"
  },
  "reveal": {
    "block_hash": "0x...",
    "seed": "0x<keccak256(block_hash || operator_seed || client_salt)>",
    "reveal_tx": "0x..."
  },
  "operator": {
    "contract": "0x<MerkleAnchor contract address>",
    "operator_id": "<operator slug, no PII>"
  }
}
```

---

## Canonical Fields

| Field | Type | Description |
|---|---|---|
| `version` | string | Protocol version. Must be `"csr-0.1"`. |
| `receipt_id` | hex string | SHA-256 of the RFC 8785 canonical receipt body (excluding this field). |
| `committed_at` | ISO-8601 | Wall-clock time the commitment was submitted. Not trusted for ordering — the anchor block is authoritative. |
| `epoch.chain` | string | Chain identifier. Must be `"base"` for mainnet receipts. |
| `epoch.target_block` | uint | The future block whose hash will be used as entropy. Must be ≥ current block + minimum epoch distance. |
| `epoch.anchor_tx` | hex string | Transaction hash of the on-chain commitment. Verifiers use this to confirm the commitment preceded the epoch block. |
| `commitment.seed_hash` | hex string | `keccak256(operator_seed ‖ client_salt)` committed before reveal. Binds both operator and client contributions. |
| `commitment.merkle_root` | hex string | Root of the Merkle tree anchored on-chain. |
| `commitment.merkle_proof` | hex array | Sibling hashes proving this leaf is in the anchored tree. |
| `client_salt.provided` | bool | Whether the client contributed a salt. False = operator-only entropy. |
| `client_salt.salt_hash` | hex string | `keccak256(client_salt)`. The raw salt is revealed at verification time. |
| `selection.pool_size` | uint | Total number of candidates in the pool. |
| `selection.n_winners` | uint | Number of selections made. |
| `selection.indices` | uint array | Zero-based indices of selected candidates. |
| `selection.candidates_hash` | hex string | `keccak256` of the RFC 8785 canonical candidates array. Commits to the exact pool. |
| `reveal.block_hash` | hex string | Actual block hash of `epoch.target_block`, fetched after finalization. |
| `reveal.seed` | hex string | Final seed: `keccak256(block_hash ‖ operator_seed ‖ client_salt)`. |
| `reveal.reveal_tx` | hex string | Transaction recording the reveal on-chain (optional for light receipts). |
| `operator.contract` | address | MerkleAnchor contract used. Verifiers can inspect this contract's source. |
| `operator.operator_id` | string | Operator slug. No PII. |

---

## Serialization Rules (RFC 8785 / JCS)

All canonical forms used for hashing must comply with **RFC 8785 JSON Canonicalization Scheme (JCS)**:

1. **Keys** are sorted lexicographically (Unicode code point order).
2. **Strings** are UTF-8 encoded, with the standard JSON escape sequences.
3. **Numbers** follow IEEE 754 double-precision representation.
4. **No insignificant whitespace** (no spaces, no newlines).
5. **Arrays** preserve insertion order.
6. **`null`** values are permitted; `undefined` fields are omitted.
7. Hex strings use **lowercase** `0x`-prefixed notation.

**Canonical body for `receipt_id`:** Serialize the entire receipt JSON (minus the `receipt_id` field itself) under JCS, then compute `SHA-256` of the UTF-8 bytes.

**Canonical body for `candidates_hash`:** Serialize the candidates array as a JCS-compliant JSON array where each candidate object's fields are sorted alphabetically.

---

## Receipt Hash Computation

```
canonical_body  = JCS(receipt_without_receipt_id)
receipt_id      = SHA-256(canonical_body).hex()
```

Any verifier can reproduce `receipt_id` from the public receipt JSON.

---

## Selection Computation (Seed Derivation)

```
# Step 1: Derive seed
seed = keccak256(block_hash ‖ operator_seed ‖ client_salt)

# Step 2: Expand with rejection sampling (no modulo bias)
For i = 0, 1, 2, ...:
    candidate_i = keccak256(seed ‖ i.to_bytes(4, 'big')) mod pool_size
    if candidate_i not in already_selected:
        add to winners
        if |winners| == n_winners: break
```

Rejection sampling eliminates modulo bias for non-power-of-two pool sizes. The expansion function is deterministic and reproducible offline.

---

## client_salt Mechanism

The `client_salt` is a value contributed by the requester (game player, DAO voter, etc.) at commitment time. Its purpose is **seed-grinding mitigation**: even if an operator controls `operator_seed`, they cannot enumerate outcomes without knowing the client's salt.

**Protocol:**
1. Client generates `client_salt = random_bytes(32)`.
2. Client sends `keccak256(client_salt)` to the operator at commitment time (salt is secret).
3. Operator commits `seed_hash = keccak256(operator_seed ‖ client_salt)` on-chain.
4. At reveal time, client reveals `client_salt`; the final seed incorporates it.
5. Receipt records `client_salt.salt_hash` and `client_salt.provided`.

**Trust guarantee:** An operator who doesn't know `client_salt` cannot pre-screen epoch blocks for favorable outcomes.

---

## Security Guarantees

1. **Commitment binding:** The operator cannot change the selection after the epoch block is chosen; `anchor_tx` proves the commitment predates the block.
2. **Epoch unpredictability:** Base block hashes are not predictable before the block is mined.
3. **Client entropy injection:** `client_salt` ensures that a malicious operator with pre-known `operator_seed` cannot grind seeds across multiple epoch candidates.
4. **No modulo bias:** Rejection sampling ensures uniform distribution over any pool size.
5. **Offline verifiability:** All inputs to the selection are recorded in the receipt; a verifier needs only an RPC endpoint (or local Base node) to confirm `block_hash`.
6. **Merkle inclusion proof:** `commitment.merkle_proof` proves this commitment is part of the on-chain anchored batch without trusting the operator's API.
7. **Candidates commitment:** `candidates_hash` prevents post-hoc alteration of the eligible pool.
8. **Replay resistance:** `receipt_id` is globally unique; the same epoch block cannot be reused for a different selection without producing a different `receipt_id`.

---

## Non-Guarantees

1. **Not a guarantee of candidate correctness:** The CSR proves the selection was fair given the committed pool; it does not verify that the pool itself was accurate (e.g., that all candidates were eligible).
2. **Not a VRF:** The oracle is not a verifiable random function in the cryptographic sense. Security depends on Base's block hash unpredictability.
3. **Not protected against Base sequencer censorship:** A colluding sequencer could theoretically delay the reveal block, but cannot choose its hash.
4. **Not an on-chain lottery contract:** The selection computation happens off-chain; only commitments and Merkle roots are anchored.
5. **Not suitable for high-value financial lotteries without additional audit:** For prizes above ~$50K, a dedicated on-chain VRF (e.g., Chainlink VRF) may be more appropriate.
6. **Not protected against client_salt omission by bad actor operators:** If the operator strips the client salt from the commitment, the client must verify the `seed_hash` themselves at commit time.
7. **Not a KYC/eligibility proof:** The receipt proves selection was fair, not that the winner is eligible under any external rule set.
8. **Not immutable without anchor:** A receipt without a valid `anchor_tx` is unverifiable; the operator's API is trusted in that case.

---

## Offline Verification (No API Required)

Given a receipt JSON and access to any Base RPC endpoint:

1. **Validate schema:** Check all required fields are present and types match this spec.
2. **Reproduce `receipt_id`:** Compute `SHA-256(JCS(receipt_without_receipt_id))` and compare.
3. **Fetch anchor transaction:** Call `eth_getTransactionByHash(epoch.anchor_tx)` on Base RPC. Confirm `blockNumber < epoch.target_block`.
4. **Fetch epoch block hash:** Call `eth_getBlockByNumber(epoch.target_block)`. Extract `hash`.
5. **Verify `reveal.block_hash`:** Must match the RPC result.
6. **Verify Merkle proof:** Reconstruct the leaf hash and walk `commitment.merkle_proof` to confirm it reaches `commitment.merkle_root`. Confirm `merkle_root` is emitted in the anchor transaction's logs.
7. **Recompute seed:** `keccak256(block_hash ‖ operator_seed ‖ client_salt)`. Compare to `reveal.seed`. *(Requires knowing `operator_seed` and `client_salt` — operator must publish these at reveal.)*
8. **Recompute selection:** Run the rejection-sampling algorithm with `reveal.seed` and `selection.pool_size`. Confirm `selection.indices` matches.
9. **Verify candidates_hash:** Recompute `keccak256(JCS(candidates_array))` from the published candidates list. Compare to `selection.candidates_hash`.

If all 9 steps pass, the selection is verified offline. No trust in the operator's server is required.

---

## ERC-8004 Mapping

CSR is designed to be compatible with (and to inform) ERC-8004 (draft: Committed Random Selection Standard). Field mapping:

| CSR Field | ERC-8004 Equivalent |
|---|---|
| `epoch.target_block` | `commitBlock` |
| `epoch.anchor_tx` | `commitmentTx` |
| `commitment.seed_hash` | `commitHash` |
| `commitment.merkle_root` | `batchRoot` |
| `reveal.block_hash` | `revealBlockHash` |
| `reveal.seed` | `derivedSeed` |
| `selection.indices` | `selectedIndices` |
| `receipt_id` | `receiptDigest` |

---

## Future Extensions

### Selection Intent

A **Selection Intent** is a pre-commitment layer above the CSR. It allows parties to record *why* a selection is being made before any entropy is available:

```json
{
  "intent_id": "<hash>",
  "intent_type": "raffle | dao_vote | nft_drop | agent_assignment",
  "created_at": "<ISO-8601>",
  "rules_hash": "<keccak256 of eligibility rules>",
  "csr_id": "<receipt_id once fulfilled>"
}
```

The Intent is signed and recorded before the CSR is initiated, enabling auditors to confirm the selection was not post-hoc defined to favor a particular outcome.

### Eligibility Receipt

An **Eligibility Receipt** is a companion document proving each candidate in the pool met the eligibility criteria at snapshot time:

```json
{
  "eligibility_id": "<hash>",
  "snapshot_block": 123456000,
  "criteria_hash": "<hash of eligibility rules>",
  "candidates_merkle_root": "<root of eligible addresses>",
  "csr_candidates_hash": "<must match selection.candidates_hash>"
}
```

Together, Intent + Eligibility Receipt + CSR form a complete provenance chain: *why* a selection happened, *who* was eligible, and *how* the winner was chosen fairly.

---

*This specification is maintained by Fairseal (formerly OpenRNG). Feedback welcome via GitHub Issues.*
