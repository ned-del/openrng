# VEO-1 Adoption Kit

## For developers evaluating OpenRNG for production use.

---

## 1. What You Get

When you call `GET /v2/entropy`, you don't get a random number. You get a **Verifiable Entropy Object**:

```json
{
  "standard": "VEO-1",
  "entropy": "0xbc7393...",
  "entropy_hash": "0x2339cf...",
  "sources": [
    { "source_id": "drand-mainnet", "source_reference": "drand-round-29833357" },
    { "source_id": "bitcoin", "source_reference": "block-955166" },
    { "source_id": "polygon", "source_reference": "block-40714568" }
  ],
  "confidence": { "score": 871, "grade": "AA", "source_status": "live" },
  "proof": { "proof_status": "cryptographically_signed", "provider_address": "0xD4F7..." },
  "anchor": null
}
```

This object is:

- **Self-verifying** — hash is reproducible, signature is recoverable
- **Source-transparent** — you can see exactly where the entropy came from
- **Quality-scored** — ECS tells you how trustworthy it is
- **Independently verifiable** — verify.openrng.io or your own code, no trust required

---

## 2. Integration Options

### Option A: Direct API (simplest)

```bash
curl https://api.openrng.io/v2/entropy
```

No SDK, no dependencies. Parse the JSON, use the entropy, store the VEO for audit.

### Option B: SDK (coming soon)

```typescript
import { OpenRNG } from '@openrng/sdk';

const rng = new OpenRNG();
const veo = await rng.getEntropy({ policy: 'ai-grade' });
const verified = await rng.verify(veo);
```

### Option C: Verify Only

Already generating your own entropy? Wrap it in VEO format and use our verification:

```bash
curl -X POST https://api.openrng.io/v2/entropy/verify \
  -H "Content-Type: application/json" \
  -d '{"entropy_object": {...}}'
```

---

## 3. Choose Your Trust Level

| Policy | ECS | Sources | Anchor | Use Case |
|--------|-----|---------|--------|----------|
| `simulation-grade` | 700+ | 1+ | No | Testing, simulation |
| `ai-grade` | 800+ | 2+ | No | AI agents, tool selection |
| `gaming-grade` | 850+ | 2+ | Yes | Games, competitions |
| `casino-grade` | 900+ | 3+ | Yes | Regulated gaming |
| `enterprise-grade` | 950+ | 3+ | Yes | Finance, compliance |

```bash
curl https://api.openrng.io/v2/entropy?policy=ai-grade
```

If the system can't meet your policy, it fails — never returns degraded entropy at a higher trust level.

---

## 4. Verification Checklist

After receiving a VEO, verify:

- [ ] `standard === "VEO-1"` — correct protocol
- [ ] `SHA-256(entropy) === entropy_hash` — hash integrity
- [ ] Signature recovers to known provider address — provider attestation
- [ ] `confidence.score >= your_threshold` — quality requirement
- [ ] `sources.length >= your_minimum` — source diversity
- [ ] If anchored: on-chain readback confirms merkle root — blockchain proof

Client-side verification: [verify.openrng.io](https://verify.openrng.io)

---

## 5. Storage Recommendation

Store the entire VEO object, not just the entropy value. The VEO is your audit trail.

```sql
CREATE TABLE entropy_log (
  id SERIAL PRIMARY KEY,
  veo_object_id TEXT UNIQUE NOT NULL,
  veo JSONB NOT NULL,
  verification_level TEXT,
  ecs_score INTEGER,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  context TEXT  -- what was this entropy used for?
);
```

---

## 6. When Things Go Wrong

| Scenario | What Happens |
|----------|-------------|
| Source down | Fallback to crypto.randomBytes, ECS penalized, `source_status: "degraded"` |
| All sources down | ECS capped at 650, grade B max, `source_status: "fallback_only"` |
| Policy can't be met | Error: `ANCHOR_REQUIRED_BUT_NOT_AVAILABLE` — never silent degradation |
| Signature invalid | `verification_level: "invalid"`, `VEO_SIGNATURE_INVALID` |
| Hash mismatch | `verification_level: "invalid"`, `VEO_HASH_MISMATCH` — object was tampered |

---

## 7. FAQ

**Q: Why not just use `crypto.randomUUID()`?**
A: Because you can't prove where it came from, how fresh it is, or whether it was manipulated. VEO carries its own proof.

**Q: Is this slower than native RNG?**
A: API call adds ~200-500ms (network + source fetching). If you need sub-millisecond, batch VEOs and consume from a local pool.

**Q: Do I need to verify every VEO?**
A: For audit-critical paths, yes. For non-critical use, you can trust the ECS score and verify periodically.

**Q: What happens if OpenRNG goes down?**
A: Your stored VEOs remain independently verifiable forever. The signatures and anchors don't depend on OpenRNG being online.

**Q: Is this production-ready?**
A: VEO-1 v1.0 is frozen. Protocol hash is published. 74 tests pass. Golden fixtures exist. Real Polygon transactions on Amoy testnet. The protocol is stable; the network is bootstrapping.
