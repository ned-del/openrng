# OpenRNG Developer Quickstart

## Run Agent Arbiter (2 minutes)

The fastest way to see VEO-1 in action. Three AI agents compete for tasks — every assignment is cryptographically verifiable.

```bash
git clone https://github.com/ned-del/openrng.git
cd openrng/examples/agent-arbiter
npx ts-node arbiter.ts
```

Add `--audit` to re-derive every assignment and verify every entropy object:

```bash
npx ts-node arbiter.ts --audit
```

Output:

```
  Task:    Summarize Q2 earnings report
  Agent:   agent-gamma
  ECS:     🟢 871 (AA)  🔏 signed
  Entropy: 0x7a681b5578f41577...
  Verify:  https://verify.openrng.io

  Auditing: "Summarize Q2 earnings report"
  Re-derived agent: agent-gamma ✓ MATCH
  Verification: cryptographically_verified
  Hash: ✓ | Signature: ✓ | Sources: ✓
```

By default it hits `localhost:3000`. Point at any OpenRNG instance:

```bash
OPENRNG_API=https://api.openrng.io npx ts-node arbiter.ts --audit
```

---

## Get a Verifiable Entropy Object

```bash
curl https://api.openrng.io/api/v1/entropy
```

Response:

```json
{
  "standard": "VEO-1",
  "version": "1.0",
  "object_id": "veo_ccf251f69c62b1b0457bc124b3c4cbeb",
  "object_class": "VEO-1B",
  "entropy": "0xbc7393649329d0b716bb2b08185485b6...",
  "entropy_hash": "0x2339cfba2ac751fc40b274e769610...",
  "sources": [
    { "source_id": "drand-mainnet", "source_reference": "drand-round-29833357" },
    { "source_id": "bitcoin", "source_reference": "block-955166" },
    { "source_id": "polygon", "source_reference": "block-40714568" }
  ],
  "confidence": {
    "score": 871,
    "grade": "AA",
    "source_status": "live"
  },
  "proof": {
    "proof_status": "cryptographically_signed",
    "provider_address": "0xD4F78bB8d4693b47FACe745B8819A159eE1bbBde"
  }
}
```

This is not just a random number. It's a **Verifiable Entropy Object** — carrying its sources, confidence score, and cryptographic signature.

---

## Verify an Object

```bash
curl -X POST https://api.openrng.io/api/v1/verify \
  -H "Content-Type: application/json" \
  -d '{"entropy_object": <paste VEO here>}'
```

Response:

```json
{
  "valid": true,
  "verification_level": "cryptographically_verified",
  "checks": {
    "schema": true,
    "hash": true,
    "signature": true,
    "sources": true,
    "confidence": true
  },
  "statuses": {
    "proof_status": "cryptographically_verified",
    "anchor_status": "unanchored",
    "source_status": "live"
  }
}
```

Or verify client-side at [verify.openrng.io](https://verify.openrng.io) — no server required.

---

## Request a Specific Trust Level

Use policy presets:

```bash
# AI-grade: min 800 ECS, 2+ sources
curl https://api.openrng.io/api/v1/entropy?policy=ai-grade

# Gaming-grade: min 850 ECS, 2+ sources, blockchain anchor required
curl https://api.openrng.io/api/v1/entropy?policy=gaming-grade

# Casino-grade: min 900 ECS, 3+ sources, blockchain anchor required
curl https://api.openrng.io/api/v1/entropy?policy=casino-grade
```

If the system cannot meet the requested policy, it returns an error — never degraded entropy at a higher trust level.

---

## SDK Usage (Coming Soon)

```typescript
import { OpenRNG } from '@openrng/sdk';

const rng = new OpenRNG({ apiKey: 'your-key' });

// Get a verifiable entropy object
const veo = await rng.getEntropy({ policy: 'ai-grade' });

// Use the entropy
console.log(veo.entropy);        // "0xbc7393..."
console.log(veo.confidence.score); // 871
console.log(veo.confidence.grade); // "AA"

// Verify it
const result = await rng.verify(veo);
console.log(result.verification_level); // "cryptographically_verified"
console.log(result.checks.signature);   // true
```

---

## Verification Levels

| Level | What It Means |
|-------|---------------|
| `structurally_valid_unsigned` | Hash matches. No signature. Basic trust. |
| `cryptographically_verified` | Hash + signature valid. Provider attests to this object. |
| `anchored_verified` | Hash + signature + blockchain anchor verified on-chain. Highest trust. |
| `policy_failed` | Object is valid but doesn't meet your requested policy. |
| `invalid` | Something is wrong. Don't trust this object. |

---

## Entropy Confidence Score (ECS)

Every VEO includes an ECS: a 0–1000 score measuring entropy quality.

| Grade | Score | Suitable For |
|-------|-------|-------------|
| AAA | 900+ | Casino, regulatory, enterprise |
| AA | 800–899 | AI agents, gaming, finance |
| A | 700–799 | Simulation, testing |
| B | 600–699 | Non-critical, degraded sources |
| C/LOW | <600 | Development only |

ECS dimensions: freshness, diversity, independence, manipulation resistance, verification success, availability.

---

## Blockchain Anchoring

Anchored VEOs (VEO-1C) have their entropy hash written to a smart contract on Polygon.

- **Contract:** [`0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8`](https://amoy.polygonscan.com/address/0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8)
- **Chain:** Polygon Amoy (testnet)
- **Verification:** Call `getBatchRoot(batchId)` to confirm the stored hash matches

Anyone can verify anchored entropy without trusting OpenRNG.

---

## Check System Status

```bash
curl https://api.openrng.io/health
```

Returns live source health, signing status, anchoring status, and contract info.

---

## Next Steps

- [Read the Whitepaper](/docs/whitepaper/OpenRNG_Whitepaper_v1.md)
- [Verify a VEO](https://verify.openrng.io)
- [View the RFC](/docs/rfc/RFC-0001-VEO1.md)
- [GitHub](https://github.com/openrng/openrng)
