# Provably Fair Selection — TypeScript

> **Prove the outcome wasn't chosen after the fact.**

A complete, runnable example of commit/reveal randomness using Fairseal. In ~30 lines, you can run a selection where no one — including the operator — could have known the winner before the candidates were locked.

## Quick Start

```bash
npm install
npx tsx fair-selection.ts
```

**Expected output:**

```
📋 Commitment receipt: { id: 'a1b2c3d4-...', epoch: 340326 }
🔗 Shareable proof-of-commit: {"id":"a1b2c3d4-...","candidateSetHash":"55b67b...","domain":"grant-round-12"}
⏳ Waiting ~7s for epoch 340326…
✅ Verified: Valid: epoch computed AFTER commitment - VDF security guarantee holds
🏆 Winner: charlie (index 2 of 5)
🔍 Anyone can verify independently: https://verify.openrng.io/340326
```

---

## What It Proves

| Claim | Proof mechanism |
|---|---|
| Candidates were fixed before randomness | `candidateSetHash` committed on-chain before epoch computed |
| Operator couldn't rig the output | VDF sequential computation — even operator can't fast-forward |
| This specific randomness was used | `commitment_hash_verified: true` — hash locked at commit time |
| Randomness came AFTER the commitment | `temporal_valid: true` — epoch sequence enforced |

---

## How the Commit/Reveal Protocol Works

```
1. You hash your candidate list         →  candidateSetHash
2. You POST a commitment                →  commitment_id + committed_epoch
3. The VDF starts computing epoch N     →  sequential, can't be skipped or previewed
4. [Publish commitment_id publicly]     →  anyone can audit what you committed to
5. After epoch matures, you reveal      →  value + cryptographic proof
6. Local verification                   →  commitment_hash + temporal order both verified
7. Derive winner: BigInt(value) % N     →  deterministic, reproducible by anyone
```

The key guarantee: you published `commitment_id` (step 4) **before** the VDF finished (step 3). Anyone who saved your commitment receipt can verify the epoch came after.

---

## How to Verify Independently

Given a `commitment_id`, anyone can:

1. Check the public receipt: `GET https://x402.openrng.io/v1/rng/reveal/<id>`
2. Confirm `temporal_valid: true` — epoch computed after commitment
3. Confirm `commitment_hash_verified: true` — candidate hash matched
4. Visit `verify_url` for the on-chain anchor

Or use the Fairseal verifier: [verify.fairseal.io](https://verify.fairseal.io)

---

## Using the SDK Wrapper (1 line)

If you want the same flow without boilerplate, use `@fairseal/client` (planned; currently `@openrng/client`):

```typescript
// fair-selection-client.ts
import { OpenRNGClient } from '../../packages/client/src';

const client = new OpenRNGClient();
const result = await client.fairSelect({
  candidates: ['alice', 'bob', 'charlie', 'diana', 'evan'],
  domain: 'grant-round-12',
  epochOffset: 3,
});

console.log('Winner:', result.winner);
console.log('Proof:', result.proof.verifyUrl);
console.log('Receipt:', result.receipt);
```

---

## Candidate Set Hashing

The canonical hash is `SHA256(candidates.join(','))`.

Important: the **order** matters. `['alice', 'bob']` and `['bob', 'alice']` produce different hashes. Your published candidate list must be in the same order you committed with, or verification fails.
