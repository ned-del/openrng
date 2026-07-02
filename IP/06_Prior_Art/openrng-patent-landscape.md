# OpenRNG Patent Landscape Analysis
**Date:** 2026-05-16
**Purpose:** Identify existing patents that could block or conflict with OpenRNG's original patent + VDF CIP

---

## ⚠️ HIGH RISK — Directly Relevant Patents

### 1. US12401532B2 / US20230318857A1 — Chainlink (GRANTED)
- **Title:** Method and Apparatus for Producing Verifiable Randomness Within a Decentralized Computing Network
- **Assignee:** SmartContract Chainlink Limited SEZC
- **Inventor:** Sergey Nazarov (+ Breidenbach, Cachin, Coventry)
- **Priority Date:** 2020-05-11
- **Status:** ✅ GRANTED (Aug 26, 2025)
- **Key Claims:** Distributed VRF with leader/follower nodes generating randomness shares, combined with blockchain verification
- **Explicitly mentions:** "can be combined with Verifiable Delay Functions (VDF)" — they've written VDF into their disclosure even if their primary mechanism is VRF
- **Risk to OpenRNG:** **HIGH** — This is the biggest potential blocker. Chainlink's patent covers verifiable randomness on blockchain with cryptographic proofs. Their mention of VDF combination in the disclosure could be used to argue OpenRNG's VDF integration falls within their claims. Need attorney to carefully compare claim language.
- **Differentiation angle:** Chainlink uses distributed oracle network + VRF (secret key based). OpenRNG uses centralized server + VDF (time-based) + Merkle batching. Different architecture, different cryptographic primitive, different trust model.

### 2. US10291408B2 / US20180183601A1 — Amazon (GRANTED)
- **Title:** Generation of Merkle Trees as Proof-of-Work
- **Assignee:** Amazon Technologies Inc
- **Priority Date:** 2016-12-23
- **Status:** ✅ GRANTED (May 14, 2019)
- **Key Claims:** Generating leaf nodes of a Merkle tree using PRNG-generated secret key values, with digital signatures
- **Risk to OpenRNG:** **MEDIUM** — Covers Merkle tree generation from pseudo-random values. OpenRNG's batch generation (seed → N leaf hashes → Merkle tree) has structural similarities. However, Amazon's patent is about proof-of-work challenges, not RNG token serving.
- **Differentiation angle:** Amazon's patent is about PoW mining challenges. OpenRNG's Merkle trees serve a completely different purpose (random token verification, not work proof). Different use case, different pipeline.

---

## ⚡ MEDIUM RISK — Partially Overlapping

### 3. US20220410017A1 — nChain / Craig Wright (ABANDONED)
- **Title:** Provably Fair Games Using a Blockchain
- **Assignee:** nChain Licensing AG
- **Priority Date:** 2019-11-27
- **Status:** ❌ ABANDONED
- **Key Claims:** Cryptographic hash chains for provably fair gaming, server-generated salted hash values, multi-party contribution to final randomness
- **Risk to OpenRNG:** **LOW** — Abandoned patent, so no enforcement risk. However, the disclosure is public prior art and covers provably fair gaming + blockchain + hash-based verification. Could be cited by examiner as prior art during prosecution.
- **Differentiation angle:** nChain uses interactive commit-reveal between players/server. OpenRNG is non-interactive — pre-generated batches, no player input to randomness.

### 4. WO2017053754A1 — Spur Trail Investments (CEASED)
- **Title:** System and Method for Provably Fair Gaming
- **Assignee:** Spur Trail Investments Inc
- **Priority Date:** 2015-09-23
- **Status:** ❌ CEASED
- **Key Claims:** Hash-based provably fair gaming with multi-party salt contribution, blockchain verification
- **Risk to OpenRNG:** **LOW** — Ceased/expired. Prior art only. Covers generic provably fair gaming with hash verification. Does not include Merkle batching, VDF, or pre-generated pools.

### 5. US9063807B2 — Provably Fair RNG (GRANTED)
- **Title:** Method and Structure for Provably Fair Random Number Generator
- **Status:** ✅ GRANTED
- **Key Claims:** Fairness checker and correction logic for hardware RNG
- **Risk to OpenRNG:** **LOW** — Hardware-focused fairness checking. Completely different architecture from OpenRNG's software/blockchain approach.

---

## 📚 Prior Art (Not Patents, But Citable)

### 6. Boneh et al. — "Verifiable Delay Functions" (2018)
- **Source:** IACR ePrint 2018/601
- **Risk:** Academic prior art on VDF primitives. Examiner may cite this to argue VDF itself is not novel. Your CIP must be careful to claim the *system integration* (VDF → batch → Merkle → anchor), not the VDF primitive.

### 7. drand Protocol — League of Entropy
- **Source:** Open source (Cloudflare, Protocol Labs, etc.)
- **Risk:** drand is a distributed randomness beacon. You use it as an entropy input. Examiner could argue "obtaining entropy from a distributed beacon" is prior art. Claims should focus on what happens *after* entropy is obtained.

### 8. Tezos VDF Integration (Nomadic Labs, 2022)
- **Source:** Kathmandu protocol upgrade
- **Risk:** Tezos uses VDF to improve random seed generation for consensus. Different purpose (block proposer selection vs. token generation), but shows VDF + blockchain combination is known.

### 9. StarkWare VeeDo — STARK-based VDF Service
- **Source:** Medium post + implementation
- **Risk:** VDF computation with STARK proof verification on Ethereum. Demonstrates VDF + on-chain verification is an established pattern.

---

## 🔑 Summary: What Could Block You

| Patent | Owner | Status | Risk | Blocking Element |
|--------|-------|--------|------|-----------------|
| US12401532B2 | Chainlink | GRANTED | **HIGH** | Verifiable randomness + blockchain + mentions VDF |
| US10291408B2 | Amazon | GRANTED | **MEDIUM** | Merkle tree from PRNG leaves |
| US20220410017A1 | nChain | ABANDONED | LOW | Prior art: provably fair gaming + blockchain |
| WO2017053754A1 | Spur Trail | CEASED | LOW | Prior art: provably fair gaming hash chains |
| Boneh VDF paper | Academic | N/A | MEDIUM | VDF primitive is prior art |
| drand | Open source | N/A | LOW | Randomness beacon is prior art |
| Tezos/StarkWare | Open source | N/A | LOW | VDF + blockchain combination is known |

---

## 🛡️ Recommended Strategy for Patent Attorney

1. **Priority #1: Deep-dive Chainlink US12401532B2 claims** — Read the full granted claims. Their VDF mention in the disclosure is concerning. If their claims are narrowly scoped to distributed VRF with oracle networks, OpenRNG's centralized VDF + Merkle batch is probably safe. If claims are broad enough to cover "any verifiable randomness on blockchain," there's a problem.

2. **Emphasize the novel combination** — Individual components (VDF, Merkle trees, blockchain anchoring) are known. The novelty is:
   - VDF seed → deterministic batch generation (not single-request)
   - Merkle tree for batch efficiency (one tx proves 65,536 tokens)
   - Pre-generated pool with sub-2ms serving (latency innovation)
   - Complete proof included with each token (no callback needed)

3. **Claim narrowly but specifically** — Don't try to claim "VDF for randomness" broadly. Claim the specific pipeline: VDF → seed derivation → batch leaf generation → Merkle tree → on-chain anchoring → pool serving with proof. This specific combination is likely not covered by existing patents.

4. **Consider design-around for Chainlink** — If Chainlink's claims are broad, ensure OpenRNG's architecture is structurally different:
   - Centralized generation (not distributed oracle) ✅
   - VDF (not VRF) ✅
   - Batch/pool model (not per-request on-chain) ✅
   - Merkle proof path (not VRF proof) ✅

5. **File provisional ASAP** — Lock in priority date before anyone else files on VDF + Merkle batch combination.

---

*Note: This is a web-search-based landscape analysis, not a formal patent opinion. A patent attorney should conduct a proper freedom-to-operate (FTO) analysis with full claim review.*
