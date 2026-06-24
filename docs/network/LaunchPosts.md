# Launch Posts — Final

## Show HN

**Title:**
```
Show HN: Agent Arbiter — Random AI Task Assignment You Can Verify
```

**Body:**
```
Hi HN,

I built Agent Arbiter, a small demo that assigns tasks to AI agents
using verifiable entropy instead of Math.random().

The assignment itself is simple: 3 agents, 5 tasks.

The difference is that every assignment comes with a signed
Verifiable Entropy Object (VEO-1), including:

- entropy from drand beacon + Bitcoin block hash + Polygon block hash
- Entropy Confidence Score (871/1000, grade AA)
- secp256k1 EIP-191 provider signature
- optional Polygon blockchain anchor

Run it in 2 minutes:

  git clone https://github.com/ned-del/openrng.git
  cd openrng/examples/agent-arbiter
  npx ts-node arbiter.ts --audit

The --audit flag re-derives every assignment from the stored entropy
and cryptographically verifies every object:

  Re-derived agent: agent-gamma ✓ MATCH
  Verification: cryptographically_verified
  Hash: ✓ | Signature: ✓ | Sources: ✓

With Math.random():
  "Agent-beta was assigned. Trust me."

With VEO-1:
  "Agent-beta was assigned.
   Entropy from drand + Bitcoin + Polygon.
   ECS: 871 (AA). Signed by 0xD4F7...
   Verify it yourself."

The assignment is the same. The proof is the difference.

Verify any object in your browser (client-side, no server):
  https://verify.openrng.io

The protocol (VEO-1 v1.0) is frozen — RFC, JSON schema, 74 tests
passing. No token, no DAO. Just infrastructure for verifiable entropy.

I'm exploring whether this is useful for AI agents, games, lotteries,
simulations, and other systems where random decisions need audit trails.

Repo: https://github.com/ned-del/openrng
Whitepaper: https://github.com/ned-del/openrng/blob/main/docs/whitepaper/OpenRNG_Whitepaper_v1.md
Verifier: https://verify.openrng.io

Feedback welcome.
```

---

## Twitter/X Thread

```
1/ I built a demo where 3 AI agents compete for tasks.

Every assignment is backed by a cryptographic proof — not Math.random().

Run it yourself:

git clone https://github.com/ned-del/openrng
cd openrng/examples/agent-arbiter
npx ts-node arbiter.ts --audit

2/ Each task assignment pulls entropy from 3 independent sources:

• drand randomness beacon (League of Entropy)
• Bitcoin latest block hash
• Polygon latest block hash

Combined into one signed Verifiable Entropy Object.

3/ --audit is the point.

It re-derives every assignment from the stored entropy.
Then cryptographically verifies every object.

Re-derived agent: agent-gamma ✓ MATCH
Verification: cryptographically_verified
Hash: ✓ | Signature: ✓ | Sources: ✓

4/ Every object carries an Entropy Confidence Score:

871/1000 — Grade AA
3 live sources, 0 fallbacks
Signed by the provider's secp256k1 key

Not all randomness is equal. ECS tells you how trustworthy yours is.

5/ Verify any object in your browser — no server involved:

verify.openrng.io

Your browser recovers the signer's address and checks the SHA-256 hash. Zero trust required.

6/ With Math.random():
"Agent-beta was assigned. Trust me."

With VEO-1:
"Agent-beta was assigned. Here's the proof."

The assignment is the same. The proof is the difference.

No token. No DAO. Just verifiable entropy.

github.com/ned-del/openrng

7/ This matters for:

• AI agents making autonomous decisions
• Games and lotteries needing auditable randomness
• Multi-agent systems requiring fairness guarantees
• Simulations needing reproducible entropy
• Any system where "trust me" isn't good enough

8/ The protocol (VEO-1 v1.0) is frozen.

RFC published. JSON schema frozen. 74 tests passing.
Real Polygon transactions on-chain.

If you're building something that needs auditable random decisions,
I'd like to hear what you need.
```

---

## LinkedIn

```
Every AI agent that makes a random decision has a trust problem.

Which tool to use? Which task to take? Which response to sample?
The answer is Math.random(). The proof is "trust me."

I built Agent Arbiter — a small demo showing what changes when
random decisions come with cryptographic proof.

3 agents, 5 tasks. Each assignment is backed by a Verifiable
Entropy Object: entropy from drand + Bitcoin + Polygon, a
confidence score, and a provider signature anyone can verify.

The --audit flag re-derives every assignment and cryptographically
verifies every entropy object. If anyone claims the assignment was
unfair, the proof says otherwise.

The assignment is the same. The proof is the difference.

Try it:
  git clone https://github.com/ned-del/openrng
  cd openrng/examples/agent-arbiter
  npx ts-node arbiter.ts --audit

Verify any object: verify.openrng.io

As AI systems take on more real-world responsibility, the random
decisions behind them need audit trails. Not better randomness —
better trust infrastructure for randomness.

No token. No speculation. Just a frozen protocol and a working demo.

#AI #Infrastructure #OpenSource #Entropy #TrustInfrastructure
```
