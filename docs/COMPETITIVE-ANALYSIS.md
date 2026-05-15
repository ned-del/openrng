# OpenRNG — Competitive Analysis

## The Landscape

Verifiable randomness is a real market, but every existing solution is designed for **on-chain smart contracts**, not for **off-chain applications like AI agents, game servers, and SaaS backends**. This is OpenRNG's gap.

---

## Competitors

### 1. Chainlink VRF

**What it is:** The 800-pound gorilla. Verifiable Random Function for smart contracts on Ethereum, Polygon, Arbitrum, etc.

**How it works:** Your smart contract requests randomness → Chainlink node generates a random number with a VRF proof → callback delivers the result on-chain.

| Aspect | Details |
|---|---|
| **Target** | Smart contracts (Solidity) |
| **Cost** | 0.25 LINK per request (~$4 on Ethereum mainnet) + gas. Cheaper on L2s ($0.01-0.10). |
| **Latency** | 2-10 blocks (30s-2min on Ethereum, faster on L2s) |
| **Integration** | Solidity import, subscription management, LINK token funding |
| **Strengths** | Most trusted, widest chain support, battle-tested, extensive documentation |
| **Weaknesses** | Smart-contract-only, expensive, slow, requires LINK token management, complex subscription model |

**OpenRNG advantage:** Chainlink VRF is unusable by AI agents or game servers that aren't smart contracts. An AI agent running in Python/TypeScript can't import a Solidity contract. OpenRNG is a REST API with `npm install` — works anywhere.

---

### 2. Pyth Entropy

**What it is:** Random number generation from the Pyth Network (known for price feeds). Commit-reveal protocol on EVM chains.

**How it works:** Your contract commits a user random number → Pyth provider reveals their random number → XOR of both = final random value.

| Aspect | Details |
|---|---|
| **Target** | Smart contracts (EVM) |
| **Cost** | Provider fee + protocol fee per request (paid in native gas token, varies by chain) |
| **Latency** | 1-3 blocks (commit + reveal) |
| **Integration** | Solidity SDK, on-chain only |
| **Strengths** | Part of Pyth ecosystem, commit-reveal is cryptographically sound, low cost on cheap chains |
| **Weaknesses** | Smart-contract-only, newer/less proven than Chainlink, no off-chain API |

**OpenRNG advantage:** Same as Chainlink — on-chain only. Also, Pyth Entropy requires users to provide their own random commitment, adding complexity. OpenRNG is one API call.

---

### 3. ARPA Randcast

**What it is:** On-chain VRF service powered by ARPA's threshold BLS signature network. Targets gaming and NFTs.

| Aspect | Details |
|---|---|
| **Target** | Smart contracts |
| **Cost** | Varies by chain + ARPA token staking |
| **Latency** | Depends on ARPA network response time |
| **Integration** | Solidity SDK |
| **Strengths** | Threshold signature (no single point of failure), gaming-focused features (dice, shuffle, etc.) |
| **Weaknesses** | Small market share, limited chain support, on-chain only, ARPA token required |

**OpenRNG advantage:** Randcast has similar feature set (dice, shuffle, choose) but locked to smart contracts. OpenRNG's SDK offers the same functions via TypeScript API.

---

### 4. Supra dVRF

**What it is:** Distributed VRF from Supra (oracle network). Claims sub-second latency.

| Aspect | Details |
|---|---|
| **Target** | Smart contracts on Supra's supported chains |
| **Cost** | Varies, paid in SUPRA token |
| **Latency** | Claims ~2.5s |
| **Integration** | Solidity SDK |
| **Strengths** | Fast, distributed (Byzantine fault tolerant) |
| **Weaknesses** | Smaller ecosystem, requires SUPRA token, on-chain only |

---

### 5. Gelato VRF

**What it is:** Free VRF service from Gelato, powered by drand. Uses EIP-712 signatures.

| Aspect | Details |
|---|---|
| **Target** | Smart contracts |
| **Cost** | Free (Gelato subsidizes) |
| **Latency** | ~30s |
| **Integration** | Solidity SDK |
| **Strengths** | Free, uses drand (same beacon as OpenRNG), simple |
| **Weaknesses** | Limited to Gelato-supported chains, smart-contract-only, no SLA |

**Interesting:** Gelato also uses drand as their entropy source — validates our architectural choice.

---

### 6. drand (Direct)

**What it is:** The distributed randomness beacon itself. Free, public, run by the League of Entropy (Cloudflare, Protocol Labs, etc.).

| Aspect | Details |
|---|---|
| **Target** | Anyone (HTTP API) |
| **Cost** | Free |
| **Latency** | ~3s rounds (quicknet) |
| **Integration** | HTTP GET to public endpoints |
| **Strengths** | Free, decentralized, publicly verifiable, battle-tested, backed by Cloudflare |
| **Weaknesses** | Raw beacon only — no application logic, no Merkle proofs, no per-token verification, no SDK, no audit trail |

**OpenRNG advantage:** drand is our entropy SOURCE, not our competitor. Using drand directly means:
- You get one random value per 3-second round (not per-token)
- No Merkle proofs (you can't verify individual tokens)
- No audit trail (no database, no history)
- No SDK (you're building everything yourself)
- No range mapping, no weighted choice, no shuffle

OpenRNG turns drand's raw beacon into a **productized API** with per-token proofs, an SDK, and an audit trail.

---

### 7. RANDOM.ORG

**What it is:** The OG random number API. Uses atmospheric noise. Has a "Signed API" for verification.

| Aspect | Details |
|---|---|
| **Target** | Any application (REST API) |
| **Cost** | Free tier (1M bits/day), paid plans from $30/mo |
| **Latency** | ~100-500ms |
| **Integration** | HTTP API, multiple language clients |
| **Strengths** | Established (20+ years), simple API, lottery certifications |
| **Weaknesses** | Centralized (you trust random.org), no blockchain verification, atmospheric noise is opaque, signature verification is their proprietary system |

**OpenRNG advantage:** RANDOM.ORG is "trust us." OpenRNG is "verify on-chain." RANDOM.ORG's signed API uses their own RSA signatures — you verify against their public key, which they control. OpenRNG's proofs are anchored on Polygon — verification is trustless.

---

## Competitive Matrix

| Feature | Chainlink VRF | Pyth Entropy | ARPA | Supra | Gelato | drand | RANDOM.ORG | **OpenRNG** |
|---|---|---|---|---|---|---|---|---|
| **Off-chain API** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **On-chain proofs** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **TypeScript SDK** | ❌ | ❌ | ❌ | ❌ | ❌ | Partial | ❌ | ✅ |
| **AI agent ready** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ✅ |
| **Latency** | 30s-2min | 5-30s | 10-30s | ~2.5s | ~30s | ~3s | ~200ms | **< 2ms** |
| **Cost/request** | $0.01-4.00 | Gas fee | Token + gas | Token + gas | Free | Free | $0.001+ | **Free tier** |
| **Audit trail** | On-chain | On-chain | On-chain | On-chain | On-chain | ❌ | Proprietary | ✅ DB + chain |
| **Verification** | On-chain | On-chain | On-chain | On-chain | On-chain | BLS sig | RSA sig | **Merkle + chain** |
| **No wallet needed** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **npm install** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Batch tokens** | 1 per tx | 1 per tx | 1 per tx | 1 per tx | 1 per tx | 1 per round | ✅ | **65K per tx** |

---

## OpenRNG's Unique Position

**We're the only solution that combines all three:**

1. **Off-chain API** — REST endpoint, `npm install`, works in any language
2. **On-chain verification** — Merkle proofs anchored on Polygon, trustless verification
3. **AI agent focus** — SDK with `rng.choose()`, `rng.shuffle()`, framework integrations (LangChain, CrewAI)

Every other player forces you to either:
- Write Solidity (Chainlink, Pyth, ARPA, Supra, Gelato)
- Trust a centralized party (RANDOM.ORG)
- Build everything yourself (drand direct)

**We're drand's application layer for the off-chain world.**

---

## Positioning for Different Audiences

### AI Agent Developers
"Provably fair decisions with `npm install`. No wallet, no Solidity, no token purchase. Just an API key."

→ Competitors: None. RANDOM.ORG is the closest but has no blockchain verification.

### Game Studios (Server-Side)
"Verifiable loot drops and slot results without rewriting your backend in Solidity. REST API with on-chain proofs."

→ Competitors: RANDOM.ORG (no blockchain), or forcing everything on-chain with Chainlink (expensive, slow).

### Web3/DeFi (On-Chain)
"If you need pure on-chain VRF, use Chainlink. If you need a high-throughput RNG API with on-chain anchoring for your backend/agents, use OpenRNG."

→ We don't compete directly with Chainlink here. Different use case.

---

## Risks & Honest Weaknesses

1. **Not fully decentralized** — OpenRNG runs the generation server. Anyone can verify, but we're the single generator. Chainlink has a network of nodes.
   - *Mitigation:* Roadmap includes verifier network + open-source self-hosting.

2. **No formal certification yet** — Can't sell to regulated casinos without GLI/BMM certification.
   - *Mitigation:* Architecture supports it. Certification is a business decision, not a technical gap.

3. **Testnet only** — Currently anchoring to Polygon Amoy (testnet). Production would use Polygon mainnet.
   - *Mitigation:* Switching to mainnet is a config change, not an architecture change.

4. **New & unproven** — Zero track record vs Chainlink's years of operation.
   - *Mitigation:* Open-source, transparent proofs, patent-backed architecture.

---

## Key Takeaway

The verifiable randomness market is dominated by on-chain solutions for smart contracts. **Nobody is serving the off-chain world** — AI agents, game servers, SaaS backends, API consumers. That's a market with orders of magnitude more potential users than Solidity developers.

OpenRNG doesn't need to beat Chainlink. It needs to serve the 99% of developers who will never write a smart contract but still need provably fair randomness.
