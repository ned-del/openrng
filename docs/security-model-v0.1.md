# Fairseal Formal Threat Model

**Version:** security-model-0.1  
**Status:** Draft  
**Date:** 2026-08-03

---

## Trust Boundary Statement

Three graduated trust formulations, from weakest to strongest:

**Tier 1 (Minimal trust — current mainnet):**
> "Fairseal is secure against any single party who does not control both the future Base block hash and the operator's pre-committed seed simultaneously."

**Tier 2 (Honest operator assumption):**
> "If the operator commits before the epoch block is mined and does not withhold reveals, the selection outcome was unpredictable and unalterable by any party at commitment time."

**Tier 3 (Full client-salt deployment):**
> "With client_salt enabled, an adversary controlling the operator's seed cannot enumerate favorable epoch blocks without also knowing the client's secret — reducing grinding to a computationally infeasible search."

**Honest current trust boundary (plaintext):**
Fairseal today requires trusting that the operator (1) does not know future Base block hashes before they are mined, (2) commits before the epoch block, (3) does not selectively abort reveals. All three behaviors are enforced and auditable on-chain. The operator cannot fake a receipt; they can only refuse to produce one.

---

## Definition of "Future Epoch"

A **future epoch** is a Base mainnet block `B` such that:

- `B > current_block + MIN_EPOCH_DISTANCE` (minimum safe distance, currently 2 blocks ≈ ~4 seconds)
- The commitment transaction is included in a block with `blockNumber < B`
- `B` has not yet been mined when the commitment transaction is submitted

The epoch block hash `H(B)` is produced by Base's PoS mechanism and is not predictable by the operator, any user, or any third party before it is finalized. An epoch block is considered **finalized** when the Base chain considers it irreversible (typically after 2 epochs, ~64 blocks on L2).

---

## Adversary Classes

### A1 — Malicious Requester

**Profile:** An end user or API caller who controls their own selection request. May be a game player, DAO participant, or automated agent.

| | Detail |
|---|---|
| **Attacks** | Replay attacks (reusing a valid receipt for a second claim); pool manipulation (submitting fraudulent candidate lists); timing manipulation (triggering requests to hit favorable blocks they somehow predict) |
| **Mitigations** | `receipt_id` includes timestamp and epoch; replays produce different receipts. `candidates_hash` commits the pool at request time; operator must verify pool integrity. Epoch selection is operator-controlled with minimum safe distance. |
| **Residual Risk** | A requester with oracle access to future Base blocks (not credible under current PoS) could time requests. |
| **Planned Fix** | Selection Intent with signed eligibility snapshot eliminates pool manipulation. |

### A2 — Malicious Operator

**Profile:** The service operator controls the seed generation, the reveal timing, and the API. This is the primary threat model for users.

| | Detail |
|---|---|
| **Attacks** | **Seed grinding:** Generate many `operator_seed` values, wait for epoch blocks, precompute outcomes, choose a favorable seed-epoch pair. **Commitment backdating:** Submit commitment after the epoch block is mined (so they already know the hash). **Selective abort:** Commit but refuse to reveal, preventing the winner from collecting. **Operator withholding:** Never publish `operator_seed` or `client_salt`, making receipts unverifiable. |
| **Mitigations** | **Seed grinding:** `client_salt` forces the operator to also know the client's secret — grinding complexity increases to `2^256`. **Backdating:** `anchor_tx` block number is public; verifiers confirm `anchor_tx.blockNumber < epoch.target_block`. **Selective abort:** On-chain reveal obligation; missed reveals are auditable as missing `reveal_tx` entries. **Withholding:** `reveal.seed` and `reveal.block_hash` must be published with the receipt; verifiers can re-derive independently. |
| **Residual Risk** | Operator can selectively abort (refuse to reveal) at cost of reputation; no on-chain slash currently. |
| **Planned Fix** | Staking/slashing contract for operators; permissioned but auditable operator registry. |

### A3 — Colluding Operator + Requester

**Profile:** Operator and requester cooperate to fix outcomes for other participants (e.g., a rigged raffle).

| | Detail |
|---|---|
| **Attacks** | Operator pre-shares `operator_seed` with requester. Together they iterate epoch blocks until they find one that selects a target candidate. Epoch is then submitted as "fair." |
| **Mitigations** | `client_salt` from an independent third party (e.g., a DAO multisig or the other participants) makes this infeasible without their cooperation. All receipts are publicly auditable on-chain. Statistical analysis across many receipts detects systematic win-rate anomalies. |
| **Residual Risk** | Without third-party `client_salt`, collusion is possible if participants do not check receipts. |
| **Planned Fix** | Third-party salt coordinators; public receipt registry with anomaly detection. |

### A4 — Network / Infrastructure Adversary

**Profile:** Controls network routing, DNS, or intermediate infrastructure between the operator API and clients.

| | Detail |
|---|---|
| **Attacks** | MITM substitution of receipt data. DNS spoofing to redirect verification requests to a rogue RPC. Replay of stale receipts across different contexts. |
| **Mitigations** | `receipt_id` is a cryptographic hash of the full receipt body; any alteration invalidates it. On-chain anchor is the source of truth — an adversary cannot forge a blockchain transaction. Clients should verify against a trusted Base RPC (e.g., a local node). |
| **Residual Risk** | Clients using untrusted RPCs could be fed false block hashes. |
| **Planned Fix** | @fairseal/core SDK ships with a multi-RPC consensus verification mode (planned; currently @openrng/core). |

---

## Threat Table

| Threat | Category | Severity | Mitigation Status | Notes |
|---|---|---|---|---|
| **Cherry-picking** | A2 | High | ✅ Mitigated (anchor_tx ordering) | Anchor proves commitment before epoch |
| **Seed grinding** | A2/A3 | High | ⚠️ Partially mitigated (client_salt) | client_salt optional today; should be default |
| **Commitment backdating** | A2 | Critical | ✅ Mitigated (on-chain ordering) | anchor_tx blockNumber is auditable |
| **Selective abort** | A2 | Medium | ⚠️ Auditable, not slashable | Missing reveal_tx is publicly visible |
| **Operator withholding** | A2 | Medium | ⚠️ Reputational only | Seed must be published at reveal |
| **Epoch reassignment** | A2 | High | ✅ Mitigated (epoch.target_block fixed) | Cannot change target after anchor |
| **Precomputed ambiguity** | A3 | Medium | ✅ Mitigated (deterministic algorithm) | Selection is deterministic from seed |
| **Modulo bias** | A2 | Low | ✅ Mitigated (rejection sampling) | Implemented in SDK v1.x+ |
| **L2 reorg** | Network | Low | ℹ️ Epoch distance provides buffer | 2-block minimum distance |
| **Replay** | A1/A4 | Low | ✅ Mitigated (receipt_id uniqueness) | receipt_id includes epoch and candidates |
| **Testnet anchoring** | A2 | Critical | ✅ Fixed (mainnet-only in prod) | Testnet hashes have no economic security |
| **Base sequencer censorship** | Network | Low | ℹ️ Cannot choose hash, only delay | Operator can retry with next block |
| **Pool manipulation** | A1 | Medium | ⚠️ Planned (candidates_hash) | Eligibility Receipt extension planned |

---

## Open Risks (Current as of csr-0.1)

1. **No staking/slashing for selective abort.** Operators can commit and refuse to reveal with no on-chain penalty. Mitigation is reputational and requires clients to monitor `reveal_tx` completion.

2. **client_salt is optional.** The seed grinding attack is partially addressed but depends on the operator enabling client_salt. It should be default-on.

3. **No eligibility proof.** The receipt proves fair selection from the committed pool but does not prove the pool was correct. A malicious operator could include ineligible candidates.

4. **No GLI-19 certification path defined.** For regulated gambling markets, the protocol would need third-party audit. The CSR format is compatible with this but no certification path exists yet.

5. **Base sequencer single point of failure.** The protocol depends on Base not having a colluding sequencer. Sequencer decentralization is in Optimism's roadmap but not yet live.

---

*Maintained by Fairseal (formerly OpenRNG). Report issues via GitHub Security Advisory.*
