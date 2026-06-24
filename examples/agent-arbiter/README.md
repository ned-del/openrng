# Agent Arbiter

Three AI agents compete for tasks. Every assignment is backed by a Verifiable Entropy Object.

This is the difference between "trust me" and "verify it yourself."

## Run

```bash
# Assign 5 tasks to 3 agents
npx ts-node arbiter.ts

# Assign + audit every assignment
npx ts-node arbiter.ts --audit
```

Set `OPENRNG_API` to point at your OpenRNG instance:

```bash
OPENRNG_API=https://api.openrng.io npx ts-node arbiter.ts
```

## What Happens

1. Five tasks need to be assigned to three agents
2. For each task, a VEO is fetched from OpenRNG
3. The entropy determines which agent gets the task
4. Every assignment records: entropy, ECS score, provider signature, anchor status

## Audit Mode

`--audit` re-derives every assignment from the stored entropy and verifies each VEO:

- Re-computes which agent should have been assigned
- Verifies hash integrity
- Verifies provider signature
- Shows blockchain anchor link if available

If anyone claims an assignment was unfair, the VEO proves otherwise.

## The Point

```
With Math.random():
  "Agent-beta was assigned. Trust me."

With VEO-1:
  "Agent-beta was assigned.
   Entropy from drand + Bitcoin + Polygon.
   ECS: 871 (AA). Signed by 0xD4F7...
   Verify: verify.openrng.io"
```

Same assignment. Different trust model.
