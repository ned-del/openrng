# VEO-1 Reference Applications

Five reference apps demonstrating VEO-1 in real-world scenarios. Each is a standalone, runnable example designed to be forked and adapted.

---

## 1. Fair Coin — Verifiable Coin Flip

**What:** A web app where two parties flip a coin. The flip uses VEO entropy. Both parties can verify the result was fair.

**Why it matters:** The simplest possible demonstration that randomness can carry proof.

**Architecture:**
```
User clicks "Flip" → GET /v2/entropy → Extract entropy → Derive heads/tails
                                      → Store VEO → Display verification link
```

**Key code:**
```typescript
const veo = await fetch('https://api.openrng.io/v2/entropy').then(r => r.json());
const bit = parseInt(veo.entropy.slice(2, 4), 16) % 2;
const result = bit === 0 ? 'Heads' : 'Tails';

// Anyone can verify: paste the VEO at verify.openrng.io
console.log(`Result: ${result} | Verify: ${veo.object_id}`);
```

**Stack:** HTML + vanilla JS. No backend. Fetches directly from OpenRNG API.

**Demo value:** "Even a coin flip can be cryptographically verified."

---

## 2. Agent Arbiter — Fair Multi-Agent Task Assignment

**What:** A multi-agent system where tasks are assigned to agents using VEO entropy. Assignment decisions are auditable.

**Why it matters:** AI agent frameworks need provably fair task routing. This shows how.

**Architecture:**
```
Task Queue → GET /v2/entropy?policy=ai-grade → Derive agent assignment
          → Log VEO with task_id → Verify assignment was fair
```

**Key code:**
```typescript
const agents = ['agent-alpha', 'agent-beta', 'agent-gamma'];
const veo = await openrng.getEntropy({ policy: 'ai-grade' });
const index = parseInt(veo.entropy.slice(2, 10), 16) % agents.length;
const assigned = agents[index];

// Log decision with proof
await db.insert({
  task_id: task.id,
  assigned_agent: assigned,
  veo_object_id: veo.object_id,
  ecs_score: veo.confidence.score,
  entropy: veo.entropy,
});
```

**Stack:** TypeScript, Node.js. Works with LangChain, CrewAI, or standalone.

**Demo value:** "Every agent decision carries a verifiable entropy receipt."

---

## 3. Lottery Machine — Auditable Number Draw

**What:** A lottery draw that selects N numbers from a range. Every draw is anchored to Polygon.

**Why it matters:** Regulated gaming requires auditable randomness. This is the simplest implementation.

**Architecture:**
```
Draw Request → GET /v2/entropy?policy=gaming-grade → Derive numbers
            → VEO-1C anchored to Polygon → PolygonScan link for public audit
```

**Key code:**
```typescript
const veo = await fetch('https://api.openrng.io/v2/entropy?policy=gaming-grade')
  .then(r => r.json());

// VEO-1C: anchored to blockchain
console.log('Anchor tx:', veo.anchor.transaction_hash);
console.log('PolygonScan:', `https://amoy.polygonscan.com/tx/${veo.anchor.transaction_hash}`);

// Derive 6 numbers from 1-49
const numbers = [];
for (let i = 0; i < 6; i++) {
  const segment = veo.entropy.slice(2 + i * 8, 10 + i * 8);
  numbers.push((parseInt(segment, 16) % 49) + 1);
}
```

**Stack:** TypeScript. Can be a CLI tool or web app.

**Demo value:** "Every lottery draw has a blockchain receipt."

---

## 4. Entropy Explorer — Real-Time VEO Stream

**What:** A live dashboard showing VEO objects being generated in real-time. Displays sources, ECS scores, signatures, and anchor status.

**Why it matters:** Makes the abstract concept of Verifiable Entropy tangible and visual.

**Architecture:**
```
Poll /v2/entropy every 10s → Render VEO card → Show ECS bars
                           → Animate source status → Link to verify.openrng.io
```

**Features:**
- Live VEO stream with auto-refresh
- ECS dimension bars (freshness, diversity, independence, etc.)
- Source status indicators (live/fallback)
- Signature verification badge
- Click any VEO to open in verify.openrng.io

**Stack:** React or vanilla JS. Static site.

**Demo value:** "Watch verifiable entropy being generated in real-time."

---

## 5. VEO Webhook — Entropy-as-a-Service Integration

**What:** A webhook service that delivers VEO objects to registered endpoints on a schedule or on-demand.

**Why it matters:** Shows how VEO integrates into existing architectures without code changes to the consumer.

**Architecture:**
```
Register webhook → Scheduler triggers → GET /v2/entropy
                → POST VEO to consumer endpoint → Consumer stores + uses
```

**Key code:**
```typescript
// Webhook registration
app.post('/webhooks/register', (req, res) => {
  const { url, policy, interval_seconds } = req.body;
  scheduler.add({ url, policy, interval: interval_seconds });
  res.json({ status: 'registered', next_delivery: new Date() });
});

// Delivery
async function deliver(webhook) {
  const veo = await fetch(`https://api.openrng.io/v2/entropy?policy=${webhook.policy}`)
    .then(r => r.json());
  await fetch(webhook.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'entropy.delivered', veo }),
  });
}
```

**Stack:** Express, node-cron. Deployable to Railway or any Node host.

**Demo value:** "Verifiable entropy delivered to your system automatically."

---

## Implementation Priority

| # | App | Effort | Impact | Build Order |
|---|-----|--------|--------|-------------|
| 1 | Fair Coin | 2 hours | High (simplest demo) | First |
| 2 | Agent Arbiter | 4 hours | Very High (target market) | Second |
| 4 | Entropy Explorer | 6 hours | High (visual, shareable) | Third |
| 3 | Lottery Machine | 4 hours | Medium (needs anchor) | Fourth |
| 5 | VEO Webhook | 4 hours | Medium (integration pattern) | Fifth |

Total: ~20 hours of development for 5 reference apps that cover consumer, agent, gaming, visualization, and integration use cases.
