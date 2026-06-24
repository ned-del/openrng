# First Consumer Outreach Package

## Outreach Channels

### 1. Hacker News — Show HN Post

**Title:**
```
Show HN: OpenRNG – Verifiable Entropy Objects (randomness with cryptographic proof)
```

**Body:**
```
We built a protocol that transforms random numbers into verifiable digital objects.

Instead of returning `0x8f3a...`, OpenRNG returns a VEO — a Verifiable Entropy Object 
that carries its entropy payload, source provenance (drand beacon, Bitcoin block hash, 
Polygon block hash), an Entropy Confidence Score (0–1000), a secp256k1 provider 
signature, and an optional Polygon blockchain anchor.

Any party can independently verify a VEO without trusting us.

Try it:
  curl https://api.openrng.io/v2/entropy

Verify any object in your browser:
  https://verify.openrng.io

Why: AI agents making autonomous decisions, regulated gaming, multi-agent systems, 
and decentralized protocols all need randomness they can prove is fair. Traditional 
RNG returns a value and discards the process. VEO carries the proof.

The protocol (VEO-1 v1.0) is frozen. Whitepaper, RFC, JSON schema, and golden 
test fixtures are published. 74 tests passing.

Code: https://github.com/ned-del/openrng
Whitepaper: [link]
```

---

### 2. Twitter/X Thread

**Thread:**

```
1/ We just shipped VEO-1 — the first standard for Verifiable Entropy Objects.

Instead of returning a random number, OpenRNG returns a cryptographic object 
that proves where its randomness came from.

Thread on why this matters ↓

2/ The problem: every system that makes decisions under uncertainty uses randomness. 
AI agents, games, simulations, DeFi. But none of them can prove their randomness 
was fair, fresh, or unmanipulated.

A random number is not enough. You need a receipt.

3/ A VEO carries:
- Entropy payload + hash
- Source provenance (drand, Bitcoin, Polygon)
- Entropy Confidence Score (0–1000)
- secp256k1 provider signature
- Optional Polygon blockchain anchor

All independently verifiable. Zero trust required.

4/ Try it right now:

curl https://api.openrng.io/v2/entropy

Then verify the object in your browser:
verify.openrng.io

Your browser recovers the signer's address and confirms the hash. No server involved.

5/ We call this category "Verifiable Entropy" — distinct from RNG, VRF, and QRNG.

Not better random numbers. Better trust infrastructure for random numbers.

Whitepaper: [link]
Protocol: VEO-1 v1.0 (frozen)
Code: github.com/ned-del/openrng

6/ What's next: @openrng/sdk on npm, LangChain integration, and the first 
external production consumer.

If you're building AI agents, games, or anything that needs auditable randomness — 
we'd love to talk.
```

---

### 3. GitHub Issue Templates

#### For AI Agent Frameworks (LangChain, CrewAI, etc.)

**Title:** `[Proposal] Verifiable Entropy integration via OpenRNG VEO-1`

**Body:**
```markdown
## Summary

Proposing integration with OpenRNG for verifiable entropy in agent decision-making.

## Problem

When agents make random decisions (tool selection, response sampling, task routing), 
there's no audit trail for the randomness. Users and operators can't verify decisions 
were fair.

## Proposed Solution

Integrate VEO-1 (Verifiable Entropy Objects) as an optional entropy source:

```python
from langchain_openrng import OpenRNGEntropy

entropy = OpenRNGEntropy(policy="ai-grade")
# Returns a VEO with:
# - entropy value
# - source provenance (drand, Bitcoin, Polygon)
# - confidence score (0-1000)  
# - cryptographic signature
# - optional blockchain anchor
```

Each decision using VEO entropy becomes independently verifiable via 
verify.openrng.io or client-side signature recovery.

## Implementation

Happy to contribute a PR. The integration is ~100 lines:
1. Call `GET /v2/entropy?policy=ai-grade`
2. Use `veo.entropy` for the random decision
3. Log `veo.object_id` with the decision for audit

## Links

- Protocol: https://github.com/ned-del/openrng
- Verifier: https://verify.openrng.io  
- Whitepaper: [link]
- VEO-1 spec: [link]
```

---

### 4. Direct Outreach Template

**For framework maintainers, agent builders, game developers:**

```
Subject: Verifiable entropy for [their project]

Hi [name],

I've been following [project] — [specific thing about their work].

We built OpenRNG, a protocol that turns random numbers into verifiable 
digital objects. Instead of `Math.random()`, you get a cryptographic 
container with source provenance, quality scoring, and a signature that 
anyone can verify.

The 30-second demo:
  curl https://api.openrng.io/v2/entropy | jq .

Then paste the result at verify.openrng.io — your browser verifies the 
signature without any server.

We think this would be valuable for [specific use case in their project]. 
I wrote a working integration — happy to open a PR if you're interested.

[name]
```

---

### 5. Reddit Posts

**r/MachineLearning:**
```
Title: Provably fair randomness for AI agent decisions — VEO-1

We built a protocol where every random number comes with a cryptographic 
proof of where it came from...
```

**r/ethereum:**
```
Title: VEO-1: Verifiable Entropy Objects — randomness anchored to Polygon

Smart contract at 0xA79E... stores entropy hashes on-chain. Any party 
can verify an entropy object was generated before it was used...
```

**r/LocalLLaMA:**
```
Title: How do you audit randomness in autonomous agent pipelines?

When your agent chain uses random sampling for tool selection or 
response generation, can you prove the randomness was fair? We built 
a protocol for that...
```

---

## Outreach Sequence

| Week | Action | Channel |
|------|--------|---------|
| 1 | Publish SDK to npm | npm |
| 1 | Show HN post | Hacker News |
| 1 | Twitter thread | X |
| 2 | Reddit posts (3 subreddits) | Reddit |
| 2 | GitHub issues on top 3 frameworks | GitHub |
| 3 | Direct DMs to 10 framework maintainers | Twitter/Discord |
| 3 | Working PR to LangChain | GitHub |
| 4 | Follow up with engaged trial users | Email/DM |
| 6 | Co-author case study with first consumer | Blog |

---

## Measurement

Track:
- HN upvotes + comment sentiment
- GitHub stars + issue engagement
- API key registrations
- API request volume
- SDK npm downloads
- Framework PR status
- First production integration date
