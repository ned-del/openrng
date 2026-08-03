# OpenRNG

**Prove the outcome wasn't chosen after the fact.**

OpenRNG is the trust and observability layer for autonomous AI systems. It makes AI decisions — and any selection process — provably fair and independently verifiable.

[![@openrng/core](https://img.shields.io/npm/v/@openrng/core?label=%40openrng%2Fcore&color=3ecf8e)](https://www.npmjs.com/package/@openrng/core)
[![@openrng/auto](https://img.shields.io/npm/v/@openrng/auto?label=%40openrng%2Fauto&color=3b82f6)](https://www.npmjs.com/package/@openrng/auto)
[![VEO-2](https://img.shields.io/badge/VEO--2-Draft-7c6aef)](docs/rfc/RFC-0002-VEO2.md)
[![Tests](https://img.shields.io/badge/tests-32%20passing-3ecf8e)](#)
[![Polygon Amoy](https://img.shields.io/badge/anchor-Polygon%20Amoy-8247e5)](https://amoy.polygonscan.com/address/0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8)

---

## Provably Fair Selection in ~30 Lines

The fastest path to trustworthy randomness. Commit to your candidates before the randomness exists — then prove it.

```typescript
// TypeScript — run: npx tsx fair-selection.ts
import { createHash } from 'node:crypto';

const BASE_URL   = 'https://x402.openrng.io/v1/rng';
const candidates = ['alice', 'bob', 'charlie', 'diana', 'evan'];
const domain     = 'grant-round-12';

// 1. Hash the candidate set BEFORE any randomness is involved
const candidateSetHash = createHash('sha256').update(candidates.join(',')).digest('hex');

// 2. Commit to a future VDF epoch
const commitRes  = await fetch(`${BASE_URL}/commit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ epoch_offset: 3, candidate_set_hash: candidateSetHash, domain }),
});
const commitment = await commitRes.json() as any;
console.log('📋 Receipt:', { id: commitment.commitment_id, epoch: commitment.committed_epoch });

// 3. Share this publicly — anyone can verify candidates were locked before randomness
console.log('🔗 Proof-of-commit:', JSON.stringify({ id: commitment.commitment_id, candidateSetHash }));

// 4. Wait for epoch maturity (VDF sequential — nobody could preview it)
await new Promise(r => setTimeout(r, (commitment.estimated_ready_seconds + 2) * 1000));

// 5. Reveal and verify locally
const revealRes = await fetch(`${BASE_URL}/reveal/${commitment.commitment_id}`);
const reveal    = await revealRes.json() as any;
if (!reveal.verification.commitment_hash_verified || !reveal.verification.temporal_valid)
  throw new Error('Verification failed — reject this result.');
console.log('✅ Verified:', reveal.verification.temporal_note);

// 6. Derive winner
const idx    = Number(BigInt('0x' + reveal.value) % BigInt(candidates.length));
console.log(`🏆 Winner: ${candidates[idx]} — verify: ${reveal.verification.verify_url}`);
```

**[Full TypeScript tutorial →](examples/fair-selection-ts/)** · **[Python tutorial →](examples/fair-selection-py/)**

---

## Or in One Line with the SDK

```bash
npm install @openrng/client   # coming to npm
```

```typescript
import { OpenRNGClient } from '@openrng/client';

const client = new OpenRNGClient();
const result = await client.fairSelect({
  candidates: ['alice', 'bob', 'charlie', 'diana', 'evan'],
  domain: 'grant-round-12',
  epochOffset: 3,
});

console.log(result.winner);           // 'charlie'
console.log(result.proof.verifyUrl);  // https://verify.openrng.io/340386
console.log(result.receipt);          // { id, epoch, candidateSetHash, commitTime }
```

**[SDK source →](packages/client/)** · **[Full API docs →](packages/client/README.md)**

---

## What It Proves

| Claim | How |
|---|---|
| Candidates were fixed before randomness | `candidateSetHash` committed on-chain before VDF epoch runs |
| Operator couldn't predict or rig the output | VDF sequential computation — even the operator can't fast-forward |
| This specific randomness determined the winner | `commitment_hash_verified: true` |
| Randomness was generated AFTER commitment | `temporal_valid: true` — epoch sequence enforced |

Anyone can verify the full chain at **[verify.openrng.io](https://verify.openrng.io)**.

---

## Quick Start

```bash
# TypeScript (30 lines, zero extra deps)
cd examples/fair-selection-ts && npm install && npx tsx fair-selection.ts

# Python (30 lines, stdlib only)
cd examples/fair-selection-py && python3 fair_selection.py
```

---

## VEO-2: Verifiable AI Execution

Beyond randomness, OpenRNG records, proves, and explains AI decisions using the [VEO-2 standard](docs/rfc/RFC-0002-VEO2.md) (Verifiable Execution Objects).

```typescript
import OpenAI from 'openai';
import { auto } from '@openrng/auto';

const client = auto(new OpenAI());
// Every AI call now emits a Verifiable Execution Object.
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'What is the capital of France?' }],
});
```

```typescript
import { capture, signVEO, verifySignature, generateSigningKeys } from '@openrng/core';

const keys   = generateSigningKeys();
const veo    = capture({ provider: 'my-service', prompt: '...', output: '...', model: 'gpt-4o' });
const signed = signVEO(veo, keys.privateKey);

verifySignature(signed, keys.publicKey); // true — prove it came from you
verifySignature(signed);                 // true — prove it hasn't been modified
```

---

## What is a VEO?

A **Verifiable Execution Object** is a signed, tamper-evident record of any AI execution. It captures what happened, proves it hasn't been modified, and makes it independently verifiable.

### Object Classes

| Class | Name | Use Case |
|---|---|---|
| **VEO-2A** | Raw Execution | Single AI call (chat, completion, inference) |
| **VEO-2B** | Composite | Multi-step chains, agent pipelines |
| **VEO-2C** | Anchored | With blockchain proof / Merkle anchor |
| **VEO-2D** | Governed | With policy assertions, human approvals |

---

## Packages

| Package | Version | Purpose |
|---|---|---|
| [`@openrng/client`](packages/client) | `0.1.0` | One-line provably fair selection (SDK wrapper) |
| [`@openrng/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@openrng/core)](https://www.npmjs.com/package/@openrng/core) | VEO-2 types, creation, Ed25519 signing, validation |
| [`@openrng/auto`](packages/auto) | [![npm](https://img.shields.io/npm/v/@openrng/auto)](https://www.npmjs.com/package/@openrng/auto) | Auto-instrument AI SDK calls |
| `@openrng/verify` | *coming soon* | Anchor-bound verification |
| `@openrng/replay` | *coming soon* | Decision replay and debugging |

---

## Examples

| Example | Language | What it shows |
|---|---|---|
| [`fair-selection-ts`](examples/fair-selection-ts/) | TypeScript | 30-line commit/reveal, full protocol |
| [`fair-selection-py`](examples/fair-selection-py/) | Python | Same in stdlib Python |
| [`agent-arbiter`](examples/agent-arbiter/) | TypeScript | Three AI agents compete for tasks |
| [`game-loot`](examples/game-loot/) | TypeScript | Game loot drops backed by VEO |
| [`langchain`](examples/langchain/) | TypeScript | LangChain integration |

---

## Live Infrastructure

| Service | URL | Status |
|---|---|---|
| **API** | [api.openrng.io](https://api.openrng.io) | Operational — 200+ CCU, <200ms |
| **RNG API** | [x402.openrng.io/v1/rng](https://x402.openrng.io/v1/rng) | Commit/reveal endpoint |
| **Docs** | [api.openrng.io/docs](https://api.openrng.io/docs) | API documentation |
| **Play** | [play.openrng.io](https://play.openrng.io) | Provably fair Sic Bo demo |
| **Verify** | [verify.openrng.io](https://verify.openrng.io) | Independent verification |

---

## How Commit/Reveal Works

```
1. You hash your candidate list         →  candidateSetHash = SHA256(list)
2. You POST a commitment                →  commitment_id + committed_epoch
3. VDF computes epoch N sequentially   →  can't be skipped, can't be previewed
4. [Publish commitment_id publicly]    →  anyone can audit what you committed to
5. Epoch matures, you reveal           →  value + cryptographic proof
6. Local verification                  →  commitment_hash ✓ + temporal order ✓
7. Derive winner: BigInt(value) % N    →  deterministic, reproducible by anyone
```

The security guarantee: the VDF is *sequentially* computed. Nobody — including the service operator — can compute epoch N faster than the VDF clock allows. Your commitment was recorded before the clock finished. Therefore: the output was unknowable when you committed.

---

## Development

```bash
git clone https://github.com/ned-del/openrng.git
cd openrng

# Run the 30-line tutorial (proves everything works)
cd examples/fair-selection-ts && npm install && npx tsx fair-selection.ts

# Build the client SDK
cd packages/client && npm install && npm run build

# Core SDK
cd packages/core && npm install && npm run build && npm test

# Auto-instrumentation
cd packages/auto && npm install && npm run build && npm test
```

---

## VEO-2 Standard

The [VEO-2 RFC](docs/rfc/RFC-0002-VEO2.md) defines the Verifiable Execution Object standard.

- [RFC-0002: VEO-2 Specification](docs/rfc/RFC-0002-VEO2.md)
- [JSON Schema](schemas/veo-2.schema.json)
- [Example VEO Objects](docs/rfc/veo-2-examples/)

---

## Patents

PCT/CN2026/086184 — ISR favorable (all Category A, no prior art threats).

| # | Coverage |
|---|---|
| 1 | Trustworthy entropy (Merkle batch RNG) |
| 2 | Verifiable execution (VDF anti-preview) |
| 3 | Entropy as infrastructure |
| 4 | Decision coordination and lineage |
| 5 | Runtime trust and governance ("Trust Health") |

---

## License

MIT

---

**OpenRNG — Open infrastructure for verifiable AI execution**

[Website](https://openrng.io) · [API](https://api.openrng.io) · [npm](https://www.npmjs.com/package/@openrng/core) · [Play Demo](https://play.openrng.io) · [Verify](https://verify.openrng.io)
