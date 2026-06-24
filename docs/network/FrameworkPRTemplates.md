# Framework PR/Issue Templates

## 1. LangGraph

**Title:** `[Feature] Verifiable entropy for agent routing decisions`

**Body:**
```markdown
## Problem

When LangGraph routes between agents or selects tools, the routing 
decision often involves randomness. There's no audit trail for which 
path was chosen or whether the selection was fair.

## Proposal

Add optional support for Verifiable Entropy Objects (VEO-1) as a 
routing entropy source. Each routing decision would produce an 
auditable proof.

Example usage:

```python
from langgraph import StateGraph
from openrng import VEOClient

rng = VEOClient()

def route_task(state):
    veo = rng.get_entropy(policy="ai-grade")
    agents = ["researcher", "writer", "reviewer"]
    index = int(veo["entropy"][2:10], 16) % len(agents)
    
    # Decision is auditable via veo["object_id"]
    return {"next": agents[index], "entropy_proof": veo["object_id"]}
```

## Why

- Each routing decision carries a cryptographic receipt
- Entropy Confidence Score (0-1000) quantifies quality
- Provider signature is independently verifiable
- Optional blockchain anchoring for regulated use cases
- Audit mode can re-derive any past decision

## Demo

Working demo with 3 agents + 5 tasks + audit mode:
https://github.com/ned-del/openrng/tree/main/examples/agent-arbiter

Verifier: https://verify.openrng.io
Protocol: VEO-1 v1.0 (frozen)

Happy to contribute a PR with the integration.
```

---

## 2. CrewAI

**Title:** `[Feature] Auditable task assignment with verifiable entropy`

**Body:**
```markdown
## Problem

When CrewAI assigns tasks to agents, or when agents make decisions
involving randomness (tool selection, delegation), the randomness
has no audit trail.

## Proposal

Support VEO-1 (Verifiable Entropy Objects) as an optional entropy
source for task assignment and agent decisions.

```python
from crewai import Crew, Agent, Task
from openrng import VEOClient

rng = VEOClient()

# Each task assignment produces a verifiable proof
def assign_with_proof(task, agents):
    veo = rng.get_entropy(policy="ai-grade")
    index = int(veo["entropy"][2:10], 16) % len(agents)
    return agents[index], veo["object_id"]
```

Each assignment is:
- Backed by entropy from 3 independent sources (drand, Bitcoin, Polygon)
- Scored for quality (ECS 0-1000)
- Cryptographically signed
- Re-derivable and auditable

## Demo

https://github.com/ned-del/openrng/tree/main/examples/agent-arbiter

Protocol spec: https://github.com/ned-del/openrng/blob/main/docs/rfc/RFC-0001-VEO1.md
```

---

## 3. AutoGen (Microsoft)

**Title:** `[Feature] Verifiable randomness for multi-agent conversations`

**Body:**
```markdown
## Problem

AutoGen's multi-agent conversations involve non-deterministic decisions:
speaker selection, tool choice, conversation routing. These decisions
are not auditable.

## Proposal

Add optional VEO-1 (Verifiable Entropy Object) support for auditable
randomness in multi-agent systems.

```python
from autogen import GroupChat
from openrng import VEOClient

rng = VEOClient()

def verifiable_speaker_selection(last_speaker, groupchat):
    veo = rng.get_entropy(policy="ai-grade")
    agents = groupchat.agents
    index = int(veo["entropy"][2:10], 16) % len(agents)
    
    # Log the proof
    print(f"Selected {agents[index].name} | VEO: {veo['object_id']} | ECS: {veo['confidence']['score']}")
    return agents[index]
```

When speaker selection is random, each decision now has:
- Entropy from 3 independent sources
- Confidence score (0-1000)
- Cryptographic signature
- Verifiable at verify.openrng.io

## Use Case

Multi-agent debates, competitive simulations, and any scenario where
fairness of agent selection matters.

## Demo

https://github.com/ned-del/openrng/tree/main/examples/agent-arbiter

Verifier: https://verify.openrng.io
```

---

## Outreach Sequence

| Week | Framework | Action |
|------|-----------|--------|
| 1 | LangGraph | Open issue |
| 1 | CrewAI | Open issue |
| 2 | AutoGen | Open issue |
| 3 | Most engaged | Offer to write PR |
| 4 | Follow up | Respond to feedback |
