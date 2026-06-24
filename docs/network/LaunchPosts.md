# Launch Posts — Agent Arbiter First

## Show HN

**Title:**
```
Show HN: OpenRNG – Every random decision gets a cryptographic receipt
```

**Body:**
```
We built a protocol where random numbers come with proof.

Three AI agents compete for tasks. Instead of Math.random() picking the winner, 
each assignment is backed by a Verifiable Entropy Object (VEO) — a cryptographic 
container that carries:

  - The entropy (from drand beacon + Bitcoin block hash + Polygon block hash)
  - An Entropy Confidence Score (871/1000, grade AA)
  - A secp256k1 provider signature
  - An optional Polygon blockchain anchor

Run it yourself in 2 minutes:

  git clone https://github.com/ned-del/openrng.git
  cd openrng/examples/agent-arbiter
  npx ts-node arbiter.ts --audit

The --audit flag re-derives every assignment from the stored entropy and 
cryptographically verifies every object. If anyone claims an assignment was 
unfair, the VEO proves otherwise.

Verify any object in your browser (client-side, no server):
  https://verify.openrng.io

The difference:

  With Math.random():
    "Agent-beta was assigned. Trust me."

  With VEO-1:
    "Agent-beta was assigned. 
     Entropy from drand + Bitcoin + Polygon. 
     ECS: 871 (AA). Signed by 0xD4F7...
     Verify it yourself: verify.openrng.io"

The protocol (VEO-1 v1.0) is frozen — RFC, JSON schema, golden test fixtures, 
74 tests passing. We're not asking you to trust us. We're asking you to verify.

Code: https://github.com/ned-del/openrng
Whitepaper: https://github.com/ned-del/openrng/blob/main/docs/whitepaper/OpenRNG_Whitepaper_v1.md
```

---

## Twitter/X Thread

```
1/ We built a protocol where every random decision gets a cryptographic receipt.

3 AI agents. 5 tasks. Every assignment verifiable.

git clone https://github.com/ned-del/openrng
cd openrng/examples/agent-arbiter
npx ts-node arbiter.ts --audit

Here's what happens ↓

2/ Each task assignment fetches a Verifiable Entropy Object from 3 independent sources:

  • drand randomness beacon
  • Bitcoin latest block hash  
  • Polygon latest block hash

Aggregated, scored, signed. Not Math.random().

3/ The --audit flag is the point.

It re-derives every assignment from the stored entropy. Cryptographically verifies every object.

  Re-derived agent: agent-gamma ✓ MATCH
  Verification: cryptographically_verified
  Hash: ✓ | Signature: ✓ | Sources: ✓

4/ Each object carries an Entropy Confidence Score (0–1000):

  871/1000 — Grade AA
  3 live sources, 0 fallbacks
  Source status: live

Not all entropy is equal. ECS tells you exactly how trustworthy yours is.

5/ Verify any object in your browser — no server involved:

  verify.openrng.io

Your browser recovers the signer's address from the secp256k1 signature and checks the SHA-256 hash. Zero trust required.

6/ With Math.random():
  "Agent-beta was assigned. Trust me."

With VEO-1:
  "Agent-beta was assigned. Here's the proof. Verify it yourself."

The assignment is the same. The proof is the difference.

Protocol frozen. RFC published. 74 tests passing.

github.com/ned-del/openrng
```

---

## LinkedIn (optional)

```
Every AI agent that makes a random decision has a trust problem.

Which tool to use? Which task to take? Which response to sample?

The answer is always: Math.random(). And the proof is always: "trust me."

We built OpenRNG — a protocol that gives every random decision a cryptographic receipt.

The demo: 3 agents, 5 tasks. Every assignment backed by a Verifiable Entropy Object 
with source provenance, quality scoring, and a signature you can verify yourself.

  git clone https://github.com/ned-del/openrng
  cd openrng/examples/agent-arbiter
  npx ts-node arbiter.ts --audit

The protocol is frozen. The verifier is live: verify.openrng.io

Not better random numbers. Better trust infrastructure for random numbers.
```
