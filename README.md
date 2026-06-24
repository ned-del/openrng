# OpenRNG

**The Verifiable Entropy Network**

Transform randomness from a disposable value into a verifiable digital object.

[![VEO-1 v1.0](https://img.shields.io/badge/VEO--1-v1.0%20Frozen-7c6aef)](docs/rfc/RFC-0001-VEO1.md)
[![Tests](https://img.shields.io/badge/tests-74%2F74-3ecf8e)](tests/)
[![Polygon Amoy](https://img.shields.io/badge/anchor-Polygon%20Amoy-8247e5)](https://amoy.polygonscan.com/address/0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8)

---

## Demo: Agent Arbiter

Three AI agents compete for tasks. Every assignment is backed by a Verifiable Entropy Object.

```
  ┌─ Assignment #1 ────────────────────────────────────
  │ Task:    Summarize Q2 earnings report
  │ Agent:   agent-gamma
  │ ECS:     🟢 871 (AA)  🔏 signed
  │ Entropy: 0x7a681b5578f41577...
  │ VEO:     veo_a81714b0f24a09b2310703c7d5e1c578
  │ Verify:  https://verify.openrng.io
  └──────────────────────────────────────────────────────────
```

Audit mode re-derives every assignment and cryptographically verifies every entropy object:

```
  Auditing: "Summarize Q2 earnings report"
  Claimed agent: agent-gamma
  Re-derived agent: agent-gamma ✓ MATCH
  Verification: cryptographically_verified
  Hash: ✓ | Signature: ✓ | Sources: ✓
```

**With `Math.random()`:** "Agent-gamma was assigned. Trust me."
**With VEO-1:** "Agent-gamma was assigned. Entropy from drand + Bitcoin + Polygon. ECS: 871 (AA). Signed by `0xD4F7...` — [verify it yourself](https://verify.openrng.io)."

The assignment is the same. The proof is the difference.

→ [Run it](examples/agent-arbiter/) · [Try the API](#quickstart) · [Read the whitepaper](docs/whitepaper/OpenRNG_Whitepaper_v1.md)

---

## What is OpenRNG?

OpenRNG is a **Verifiable Entropy Network** — infrastructure that sources entropy from multiple independent providers, measures its quality, signs it cryptographically, optionally anchors it to blockchain, and packages it as a standardized verifiable object.

Traditional RNG returns a number. OpenRNG returns a **proof-carrying entropy object**.

```
Random Number Generator:  →  0x8f3a...

OpenRNG:                  →  {
                               entropy: "0x8f3a...",
                               sources: [drand, bitcoin, polygon],
                               confidence: { score: 871, grade: "AA" },
                               proof: { signature: "0x...", verified: true },
                               anchor: { chain: "polygon", tx: "0x..." }
                             }
```

---

## What is VEO-1?

**VEO-1** (Verifiable Entropy Object) is a standard format for representing entropy as a verifiable digital object.

Every VEO carries:

| Layer | What It Contains |
|-------|------------------|
| **Payload** | Entropy value + SHA-256 hash |
| **Provenance** | Source IDs, types, references, timestamps |
| **Confidence** | ECS score (0–1000), grade (AAA–LOW), 6 dimensions |
| **Proof** | secp256k1 EIP-191 provider signature |
| **Anchor** | Polygon smart contract transaction (optional) |

**Object classes:**

| Class | Description |
|-------|-------------|
| VEO-1A | Single-source entropy |
| VEO-1B | Multi-source composite entropy |
| VEO-1C | Blockchain-anchored entropy |
| VEO-1D | Decision entropy (reserved) |

---

## Quickstart

### Get entropy

```bash
curl https://api.openrng.io/v2/entropy
```

### Get entropy with a policy

```bash
curl https://api.openrng.io/v2/entropy?policy=ai-grade
```

### Verify an object

```bash
curl -X POST https://api.openrng.io/v2/entropy/verify \
  -H "Content-Type: application/json" \
  -d '{"entropy_object": {...}}'
```

### SDK (coming soon)

```typescript
const veo = await openrng.getEntropy({ policy: 'ai-grade' });
const result = await openrng.verify(veo);

console.log(result.verification_level);
// "cryptographically_verified"
```

[Full Developer Quickstart →](docs/dev/Quickstart.md)

---

## Verification

Five verification levels, from basic to maximum trust:

| Level | Meaning |
|-------|---------|
| `structurally_valid_unsigned` | Hash valid, no signature |
| `cryptographically_verified` | Hash + provider signature verified |
| `anchored_verified` | Hash + signature + blockchain anchor verified |
| `policy_failed` | Valid object, policy not met |
| `invalid` | Verification failed |

**Verify any VEO in your browser:** [verify.openrng.io](https://verify.openrng.io)

---

## Entropy Confidence Score (ECS)

Every VEO includes an ECS — a quantitative measure of entropy quality.

| Grade | Score | Use Case |
|-------|-------|----------|
| AAA | 900–1000 | Casino, regulatory, enterprise |
| AA | 800–899 | AI agents, gaming, finance |
| A | 700–799 | Simulation, testing |
| B | 600–699 | Degraded sources |
| C/LOW | <600 | Development only |

Six dimensions: freshness · diversity · independence · manipulation resistance · verification success · availability

---

## Explorer

**[verify.openrng.io](https://verify.openrng.io)** — Public VEO verification tool

- Paste any VEO-1 object
- Client-side hash + signature verification
- ECS visualization with dimension breakdown
- Source provenance inspection
- Anchor links to PolygonScan
- Zero backend — runs entirely in your browser

---

## Architecture

```
Entropy Sources (drand · Bitcoin · Polygon)
        ↓
   Verification → Scoring (ECS) → Aggregation
        ↓
   Provider Signing (secp256k1 EIP-191)
        ↓
   Blockchain Anchoring (Polygon)
        ↓
   VEO-1 — Verifiable Entropy Object
```

---

## Roadmap

### ✅ VEO-1 v1.0 (Frozen)
- Multi-source entropy (drand, Bitcoin, Polygon)
- Entropy Confidence Score (ECS v1)
- Provider signing (secp256k1 EIP-191)
- Blockchain anchoring (Polygon Amoy)
- 5 verification levels
- Public verifier (verify.openrng.io)
- RFC-0001, JSON schema, golden fixtures

### 🔜 Next
- `@openrng/sdk` — TypeScript SDK
- VEO-1A single-source generation
- Batch anchoring (multiple VEOs per transaction)
- Additional entropy sources (QRNG, additional beacons)
- Polygon mainnet deployment

### 🔮 Future
- VDO-1 — Verifiable Decision Objects
- Entropy Routing Engine
- Multi-provider federation
- AI agent framework integrations

---

## Protocol

| Document | Link |
|----------|------|
| Whitepaper | [OpenRNG Whitepaper v1](docs/whitepaper/OpenRNG_Whitepaper_v1.md) |
| RFC-0001 | [VEO-1 Specification](docs/rfc/RFC-0001-VEO1.md) |
| ECS v1 | [Entropy Confidence Score](docs/rfc/ECS-v1.md) |
| JSON Schema | [veo-1.schema.json](docs/rfc/veo-1.schema.json) |
| Category | [Verifiable Entropy](docs/category/VerifiableEntropy.md) |
| Quickstart | [Developer Guide](docs/dev/Quickstart.md) |
| Release Notes | [VEO-1.0 Release](docs/releases/VEO-1.0-RELEASE.md) |

**Protocol Hash:** `0xcb21de7f1661548b85a8d9249cf2c1d939de93e1ce17ab22444238e3a466b7f7`

---

## Contract

**MerkleAnchor:** [`0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8`](https://amoy.polygonscan.com/address/0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8)
**Chain:** Polygon Amoy Testnet

---

## License

MIT
