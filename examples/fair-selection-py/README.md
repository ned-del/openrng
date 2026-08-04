# Provably Fair Selection — Python

> **Prove the outcome wasn't chosen after the fact.**

A complete, runnable example of commit/reveal randomness using Fairseal. In ~30 lines of pure Python (stdlib only), you can run a selection where no one — including the operator — could have known the winner before the candidates were locked.

## Quick Start

```bash
python3 fair_selection.py
```

No pip install needed. Uses only Python stdlib (`hashlib`, `json`, `time`, `urllib`).

**Expected output:**

```
📋 Commitment receipt: id=a1b2c3d4-...  epoch=340326
🔗 Shareable proof-of-commit: {"id":"a1b2c3d4-...","candidateSetHash":"55b67b...","domain":"grant-round-12"}
⏳ Waiting 9s for epoch 340326…
✅ Verified: Valid: epoch computed AFTER commitment - VDF security guarantee holds
🏆 Winner: diana (index 3 of 5)
🔍 Anyone can verify independently: https://verify.openrng.io/340326
```

---

## What It Proves

| Claim | Proof mechanism |
|---|---|
| Candidates were fixed before randomness | `candidateSetHash` committed on-chain before epoch computed |
| Operator couldn't rig the output | VDF sequential computation — even operator can't fast-forward |
| This specific randomness was used | `commitment_hash_verified: True` — hash locked at commit time |
| Randomness came AFTER the commitment | `temporal_valid: True` — epoch sequence enforced |

---

## How the Protocol Works

```
1. Hash your candidate list             →  SHA256(candidates.join(','))
2. POST a commitment                    →  commitment_id + committed_epoch
3. VDF computes epoch N sequentially    →  can't be skipped or previewed by anyone
4. [Publish commitment_id publicly]     →  anyone can audit what you committed to
5. After epoch matures, reveal          →  value + cryptographic proof
6. Local verification (two asserts)     →  commitment_hash + temporal order both checked
7. Derive winner: int(value, 16) % N    →  deterministic, reproducible by anyone
```

---

## How to Verify Independently

```bash
curl https://x402.openrng.io/v1/rng/reveal/<commitment_id>
```

Check:
- `verification.temporal_valid: true` — epoch was computed AFTER your commitment
- `verification.commitment_hash_verified: true` — candidate hash matched
- Visit `verification.verify_url` for on-chain anchor

---

## Candidate Set Hashing

The canonical hash is `hashlib.sha256(','.join(candidates).encode()).hexdigest()`.

**Order matters.** Publish your candidate list in the exact order it was hashed, or verification fails.
