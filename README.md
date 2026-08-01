# OpenRNG

**Every AI decision, provable and replayable.**

OpenRNG is the trust and observability layer for autonomous AI systems. It records, proves, and explains AI decisions using the [VEO-2 standard](docs/rfc/RFC-0002-VEO2.md) (Verifiable Execution Objects).

[![@openrng/core](https://img.shields.io/npm/v/@openrng/core?label=%40openrng%2Fcore&color=3ecf8e)](https://www.npmjs.com/package/@openrng/core)
[![@openrng/auto](https://img.shields.io/npm/v/@openrng/auto?label=%40openrng%2Fauto&color=3b82f6)](https://www.npmjs.com/package/@openrng/auto)
[![VEO-2](https://img.shields.io/badge/VEO--2-Draft-7c6aef)](docs/rfc/RFC-0002-VEO2.md)
[![Tests](https://img.shields.io/badge/tests-32%20passing-3ecf8e)](#)
[![Polygon Amoy](https://img.shields.io/badge/anchor-Polygon%20Amoy-8247e5)](https://amoy.polygonscan.com/address/0xA79E149C35Ad47Ed270Bf4b16B80170eBF7B88F8)

---

## Quick Start

```bash
npm install @openrng/core @openrng/auto
```

### Auto-instrument any AI SDK (zero code changes)

```typescript
import OpenAI from 'openai';
import { auto } from '@openrng/auto';

const client = auto(new OpenAI());

// Every AI call now emits a Verifiable Execution Object.
// The response is unchanged — VEOs are captured in the background.
const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'What is the capital of France?' }],
});
```

### Create and sign VEOs directly

```typescript
import { capture, signVEO, verifySignature, generateSigningKeys } from '@openrng/core';

// Generate Ed25519 keys (asymmetric — verifier can't forge)
const keys = generateSigningKeys();

// Capture an AI decision
const veo = capture({
  provider: 'my-service',
  prompt: 'Should we approve this loan?',
  output: 'Approved based on credit score 720.',
  model: 'gpt-4o',
  latencyMs: 412,
  cost: { total_tokens: 890, cost_usd: 0.018 },
  confidence: 870,
});

// Sign it
const signed = signVEO(veo, keys.privateKey);

// Anyone can verify with the public key
verifySignature(signed, keys.publicKey); // true

// Self-verify (consistency check using embedded key)
verifySignature(signed); // true

// Tampered VEOs are rejected
const tampered = { ...signed, execution: { ...signed.execution, output_hash: 'EVIL' } };
verifySignature(tampered, keys.publicKey); // false
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

### VEO Lifecycle

```
capture → sign → anchor → verify → replay → observe → govern
```

---

## Packages

| Package | Version | Purpose |
|---|---|---|
| [`@openrng/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@openrng/core)](https://www.npmjs.com/package/@openrng/core) | VEO-2 types, creation, Ed25519 signing, validation |
| [`@openrng/auto`](packages/auto) | [![npm](https://img.shields.io/npm/v/@openrng/auto)](https://www.npmjs.com/package/@openrng/auto) | Auto-instrument AI SDK calls |
| `@openrng/verify` | *coming soon* | Anchor-bound verification |
| `@openrng/replay` | *coming soon* | Decision replay and debugging |
| `@openrng/observe` | *coming soon* | Observability and analytics |
| `@openrng/govern` | *coming soon* | Governance and compliance |

---

## Live Infrastructure

| Service | URL | Status |
|---|---|---|
| **API** | [api.openrng.io](https://api.openrng.io) | Operational — 200+ CCU, <200ms |
| **Docs** | [api.openrng.io/docs](https://api.openrng.io/docs) | API documentation |
| **Play** | [play.openrng.io](https://play.openrng.io) | Provably fair Sic Bo demo |
| **Verify** | [verify.openrng.io](https://verify.openrng.io) | Independent game verification |

---

## VEO-2 Standard

The [VEO-2 RFC](docs/rfc/RFC-0002-VEO2.md) defines the Verifiable Execution Object standard — a format for recording, proving, and explaining AI decisions.

- [RFC-0002: VEO-2 Specification](docs/rfc/RFC-0002-VEO2.md)
- [JSON Schema](schemas/veo-2.schema.json)
- [Example VEO Objects](docs/rfc/veo-2-examples/)

### Trust Model

- **`capture()`** — records execution with auto content hashing
- **`signVEO()`** — Ed25519 asymmetric signing (verifier can't forge)
- **`verifySignature(veo, key)`** — provenance check (was this signed by a trusted entity?)
- **`verifySignature(veo)`** — consistency check only (self-verify, not provenance)
- **`trustedKeys`** — allowlist-based verification with fail-closed semantics

Client-side capture produces tamper-evident records after signing. Initial contents are as trustworthy as the process that created them. Full provenance requires anchoring (blockchain-bound key identity) — see `@openrng/verify`.

---

## Architecture

```
OpenRNG (company)
  └── VEO (open standard — Verifiable Execution Objects)
       └── @openrng/* (SDK packages)
            └── OpenRNG Cloud (enterprise platform — coming)
```

### Origin: Provably Fair Randomness

OpenRNG started as a verifiable random number generator for gaming, using VDF (Verifiable Delay Function) + Merkle trees + Polygon blockchain anchoring. The [casino demo](https://play.openrng.io) and [5-patent portfolio](docs/STRATEGIC-BRIEF-20260801.md) evolved into a broader mission: making all AI execution provable.

---

## Patents

| # | Coverage |
|---|---|
| 1 | Trustworthy entropy (Merkle batch RNG) |
| 2 | Verifiable execution (VDF anti-preview) |
| 3 | Entropy as infrastructure |
| 4 | Decision coordination and lineage |
| 5 | Runtime trust and governance ("Trust Health") |

PCT/CN2026/086184 — ISR favorable (all Category A, no prior art threats).

---

## Development

```bash
git clone https://github.com/ned-del/openrng.git
cd openrng

# Core SDK
cd packages/core && npm install && npm run build && npm test

# Auto-instrumentation
cd packages/auto && npm install && npm run build && npm test

# API server (requires PostgreSQL, .env config)
npm install && npm run dev
```

---

## License

MIT

---

**OpenRNG — Open infrastructure for verifiable AI execution**

[Website](https://openrng.io) · [API](https://api.openrng.io) · [npm](https://www.npmjs.com/package/@openrng/core) · [Play Demo](https://play.openrng.io) · [Verify](https://verify.openrng.io)
